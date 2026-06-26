import { createHash, randomUUID } from "node:crypto";

import type { LocalAuthAuditWriter } from "@puresoc/auth-local";
import {
  InMemoryProviderResourceStore,
  runProviderConnectorPipeline,
  type CloudProviderConnector,
  type ProviderCapabilityRecord,
  type ProviderConnectionRecord,
  type ProviderFindingInput,
  type ProviderPermissionBundleRecord,
  type ProviderPipelineResult,
  type ProviderResourceStore,
  type ProviderSyncModuleRecord,
  type ProviderSyncModuleStatus
} from "@puresoc/providers-core";
import type { ProviderFinding } from "@puresoc/providers-core";
import {
  createMicrosoft365TokenCipherFromEnv,
  createMicrosoft365Connector,
  createMicrosoft365FixtureConnector,
  microsoft365CoreDemoReadModules,
  microsoft365ProviderKey,
  normalizeMicrosoft365RequestedBundles,
  type Microsoft365CredentialResolver,
  type Microsoft365StoredCredential,
  type Microsoft365TokenCipher
} from "@puresoc/provider-microsoft365";
import { AuthError } from "@puresoc/auth-core";
import {
  InMemoryProviderConsentStateStore,
  type ProviderConsentStateRecord,
  type ProviderConsentStateStore
} from "@puresoc/database";
import { safeConnectionView, type ProviderConnectionView } from "../service";
import type { NotificationService } from "@puresoc/notifications";

export interface Microsoft365ConsentBeginInput {
  organizationId: string;
  actorUserId: string;
  redirectUri: string;
  requestedPermissionBundles?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface Microsoft365ConsentCallbackInput {
  organizationId: string;
  actorUserId: string;
  state: string;
  tenantId: string;
  adminConsent: boolean;
  redirectUri?: string;
  authorizationCode?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface Microsoft365RunSyncInput {
  organizationId: string;
  actorUserId: string;
  providerConnectionId: string;
  requestedModules?: string[];
  maxRetries?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface Microsoft365DisconnectInput {
  organizationId: string;
  actorUserId: string;
  providerConnectionId: string;
  reason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface Microsoft365ConnectionHealth {
  connection: ProviderConnectionView;
  status: ProviderConnectionRecord["status"];
  connectorMode: Microsoft365ConnectorMode;
  effectiveConnectorMode: "fixture" | "live";
  fixtureSet?: string;
  permissionBundles: ProviderPermissionBundleRecord[];
  capabilities: ProviderCapabilityRecord[];
  moduleStatuses: ProviderSyncModuleRecord[];
}

export interface Microsoft365ProviderConnectionServiceOptions {
  store?: ProviderResourceStore;
  auditWriter: LocalAuthAuditWriter;
  now?: () => Date;
  stateFactory?: () => string;
  tokenCipher?: Microsoft365TokenCipher;
  tokenCipherFactory?: () => Microsoft365TokenCipher;
  consentStateStore?: ProviderConsentStateStore;
  connectorApp?: Microsoft365ConnectorAppConfig;
  notifications?: Pick<NotificationService, "send">;
  createConnector?: (input: {
    credentialResolver: Microsoft365CredentialResolver;
    tokenCipher: Microsoft365TokenCipher;
  }) => CloudProviderConnector;
  connectorMode?: Microsoft365ConnectorMode;
  fixtureSet?: string;
  graphBaseUrl?: string;
  maxRetries?: number;
}

export interface Microsoft365ConnectorAppConfig {
  clientId: string;
  clientSecret?: string;
  authorityHost?: string;
}

export type Microsoft365ConnectorMode = "fixture" | "live" | "auto";

interface PendingConsentState {
  organizationId: string;
  actorUserId: string;
  redirectUri: string;
  requestedPermissionBundles: string[];
  expiresAt: string;
}

const moduleHealthFindingStatuses = new Set<ProviderSyncModuleStatus>([
  "partial",
  "failed",
  "unavailable_license",
  "missing_permission",
  "unsupported_api",
  "rate_limited",
  "revoked_consent"
]);

const defaultTokenCipher = (): Microsoft365TokenCipher =>
  createMicrosoft365TokenCipherFromEnv();

export class Microsoft365ProviderConnectionService {
  readonly store: ProviderResourceStore;
  private readonly auditWriter: LocalAuthAuditWriter;
  private readonly now: () => Date;
  private readonly stateFactory: () => string;
  private readonly tokenCipherFactory: () => Microsoft365TokenCipher;
  private readonly consentStateStore: ProviderConsentStateStore;
  private readonly notifications?: Pick<NotificationService, "send">;
  private tokenCipher?: Microsoft365TokenCipher;
  private readonly connectorMode: Microsoft365ConnectorMode;
  private readonly effectiveMode: "fixture" | "live";
  private readonly fixtureSet: string;
  private readonly graphBaseUrl?: string;
  private readonly maxRetries: number;
  private readonly createConnector: (input: {
    credentialResolver: Microsoft365CredentialResolver;
    tokenCipher: Microsoft365TokenCipher;
  }) => CloudProviderConnector;

  constructor(options: Microsoft365ProviderConnectionServiceOptions) {
    this.store = options.store ?? new InMemoryProviderResourceStore({ now: options.now });
    this.auditWriter = options.auditWriter;
    this.now = options.now ?? (() => new Date());
    this.stateFactory = options.stateFactory ?? randomUUID;
    this.tokenCipher = options.tokenCipher;
    this.tokenCipherFactory = options.tokenCipherFactory ?? defaultTokenCipher;
    this.consentStateStore =
      options.consentStateStore ??
      new InMemoryProviderConsentStateStore({
        now: this.now
      });
    this.notifications = options.notifications;
    const connectorApp = options.connectorApp ?? { clientId: "" };
    this.connectorMode = options.connectorMode ?? "live";
    this.fixtureSet = options.fixtureSet ?? "partner_demo";
    this.graphBaseUrl = options.graphBaseUrl;
    this.maxRetries = options.maxRetries ?? 3;
    this.effectiveMode = effectiveConnectorMode(this.connectorMode, connectorApp);
    this.createConnector =
      options.createConnector ??
      ((input) => {
        if (this.effectiveMode === "fixture") {
          return createMicrosoft365FixtureConnector({
            clientId: connectorApp.clientId || undefined,
            authorityHost: connectorApp.authorityHost,
            graphBaseUrl: this.graphBaseUrl,
            fixtureSet: this.fixtureSet,
            credentialResolver: input.credentialResolver,
            tokenCipher: input.tokenCipher,
            now: this.now
          });
        }

        return createMicrosoft365Connector({
          clientId: connectorApp.clientId,
          clientSecret: connectorApp.clientSecret,
          authorityHost: connectorApp.authorityHost,
          graphBaseUrl: this.graphBaseUrl,
          sourceMode: "live",
          credentialResolver: input.credentialResolver,
          tokenCipher: input.tokenCipher
        });
      });
  }

  async beginConsent(input: Microsoft365ConsentBeginInput): Promise<{
    url: string;
    state: string;
    expiresAt: string | null;
    requestedPermissionBundles: string[];
  }> {
    const state = this.stateFactory();
    const requestedPermissionBundles = normalizeMicrosoft365RequestedBundles(input.requestedPermissionBundles);
    const connector = this.microsoftConnector();
    const redirect = await connector.beginConnection({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      redirectUri: input.redirectUri,
      state,
      requestedPermissionBundles
    });

    const expiresAt = redirect.expiresAt ?? new Date(this.now().getTime() + 10 * 60_000).toISOString();
    await this.consentStateStore.saveConsentState({
      organizationId: input.organizationId,
      providerKey: microsoft365ProviderKey,
      stateHash: hashConsentState(state),
      actorUserId: input.actorUserId,
      redirectUri: input.redirectUri,
      requestedPermissionBundles,
      createdAt: this.now().toISOString(),
      expiresAt
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_connection",
      action: "provider_consent_started",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: microsoft365ProviderKey,
        requestedPermissionBundles
      }
    });

    return {
      url: redirect.url,
      state: redirect.state,
      expiresAt,
      requestedPermissionBundles
    };
  }

  async completeConsent(input: Microsoft365ConsentCallbackInput): Promise<{
    connection: ProviderConnectionView;
    permissionBundles: ProviderPermissionBundleRecord[];
    capabilities: ProviderCapabilityRecord[];
    tenantProfileSync: ProviderPipelineResult;
  }> {
    const pending = await this.consumePendingState(input);
    const connector = this.microsoftConnector();
    const result = await connector.completeConnection({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      redirectUri: pending.redirectUri,
      state: input.state,
      authorizationCode: input.authorizationCode,
      metadata: {
        tenantId: input.tenantId,
        adminConsent: input.adminConsent,
        requestedPermissionBundles: pending.requestedPermissionBundles
      }
    });
    const connection = await this.store.createConnection({
      id: result.connection.id,
      organizationId: result.connection.organizationId,
      providerKey: result.connection.providerKey,
      displayName: result.connection.displayName,
      externalTenantId: result.connection.externalTenantId,
      externalTenantName: result.connection.externalTenantName,
      status: result.connection.status,
      readEnabled: result.connection.readEnabled,
      writeEnabled: result.connection.writeEnabled,
      metadata: result.connection.metadata
    });
    const permissionBundles = [];
    const capabilities = [];

    for (const credential of result.credentials ?? []) {
      await this.store.upsertCredential(credential);
    }

    for (const bundle of result.permissionBundles ?? []) {
      permissionBundles.push(await this.store.upsertPermissionBundle(bundle));
    }

    for (const capability of result.capabilities) {
      capabilities.push(
        await this.store.upsertCapability({
          organizationId: capability.organizationId,
          providerConnectionId: capability.providerConnectionId,
          providerKey: capability.providerKey,
          moduleKey: capability.moduleKey,
          capabilityKey: capability.capabilityKey,
          available: capability.available,
          licenseRequired: capability.licenseRequired,
          licenseDetected: capability.licenseDetected,
          permissionsRequired: capability.permissionsRequired,
          permissionsGranted: capability.permissionsGranted,
          status: capability.status,
          statusReason: capability.statusReason
        })
      );
    }

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_connection",
      targetId: connection.id,
      action: "provider_consent_completed",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: microsoft365ProviderKey,
        tenantId: connection.externalTenantId,
        requestedPermissionBundles: pending.requestedPermissionBundles,
        grantedPermissionBundles: result.grantedPermissionBundles
      }
    });
    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_connection",
      targetId: connection.id,
      action: "provider_connected",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: microsoft365ProviderKey,
        writeEnabled: connection.writeEnabled
      }
    });

    const tenantProfileSync = await this.runSync({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      providerConnectionId: connection.id,
      requestedModules: ["tenant-profile"],
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return {
      connection: safeConnectionView(connection),
      permissionBundles,
      capabilities,
      tenantProfileSync
    };
  }

  async runSync(input: Microsoft365RunSyncInput): Promise<ProviderPipelineResult> {
    const connection = await this.store.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    if (connection.providerKey !== microsoft365ProviderKey) {
      throw new AuthError("invalid_request", "Provider connection is not a Microsoft 365 connection.", 400);
    }
    if (connection.status === "revoked" || connection.readEnabled !== true) {
      throw new AuthError("invalid_request", "Microsoft 365 connection is disconnected. Reconnect before running sync.", 400);
    }

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_connection",
      targetId: connection.id,
      action: "scan_started",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: microsoft365ProviderKey,
        requestedModules: input.requestedModules ?? [...microsoft365CoreDemoReadModules],
        connectorMode: this.connectorMode,
        effectiveConnectorMode: this.effectiveMode
      }
    });

    const requestedModules = input.requestedModules ?? [...microsoft365CoreDemoReadModules];
    const result = await runProviderConnectorPipeline({
      connector: this.microsoftConnector(),
      store: this.store,
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      requestedModules,
      maxRetries: input.maxRetries ?? this.maxRetries
    });
    const moduleHealthFindings = await this.reconcileModuleHealthFindings({
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      syncRunId: result.syncRun.id,
      modules: result.modules
    });
    const enrichedResult: ProviderPipelineResult = {
      ...result,
      findings: [...result.findings, ...moduleHealthFindings]
    };

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_sync_run",
      targetId: enrichedResult.syncRun.id,
      action: "scan_completed",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: microsoft365ProviderKey,
        connectorMode: this.connectorMode,
        effectiveConnectorMode: this.effectiveMode,
        status: enrichedResult.syncRun.status,
        summary: {
          ...enrichedResult.syncRun.summary,
          findings: enrichedResult.findings.length
        }
      }
    });
    await this.notifyNewOpenFindings(input.organizationId, enrichedResult.findings);

    return enrichedResult;
  }

  async disconnect(input: Microsoft365DisconnectInput): Promise<{
    connection: ProviderConnectionView;
    providerRevocation: "manual_admin_center_recommended";
  }> {
    const connection = await this.store.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    if (connection.providerKey !== microsoft365ProviderKey) {
      throw new AuthError("invalid_request", "Provider connection is not a Microsoft 365 connection.", 400);
    }

    const deletedCredentialCount = await this.store.deleteCredentialsForConnection(
      input.organizationId,
      input.providerConnectionId
    );
    const capabilities = await this.store.listCapabilities(input.organizationId, input.providerConnectionId);
    let unavailableCapabilityCount = 0;
    for (const capability of capabilities) {
      await this.store.upsertCapability({
        organizationId: capability.organizationId,
        providerConnectionId: capability.providerConnectionId,
        providerKey: capability.providerKey,
        moduleKey: capability.moduleKey,
        capabilityKey: capability.capabilityKey,
        available: false,
        licenseRequired: capability.licenseRequired,
        licenseDetected: capability.licenseDetected,
        permissionsRequired: capability.permissionsRequired,
        permissionsGranted: [],
        status: "revoked_consent",
        statusReason: "Microsoft 365 connection was disconnected."
      });
      unavailableCapabilityCount += 1;
    }
    const disconnected = await this.store.updateConnectionState({
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      status: "revoked",
      readEnabled: false,
      writeEnabled: false,
      metadataPatch: {
        disconnectedAt: this.now().toISOString(),
        disconnectReason: input.reason ?? "user_requested",
        providerRevocation: "manual_admin_center_recommended"
      }
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_connection",
      targetId: disconnected.id,
      action: "provider_disconnected",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: microsoft365ProviderKey,
        status: disconnected.status,
        readEnabled: disconnected.readEnabled,
        writeEnabled: disconnected.writeEnabled,
        storedCredentialCountDeleted: deletedCredentialCount,
        capabilitiesMarkedUnavailable: unavailableCapabilityCount,
        providerRevocation: "manual_admin_center_recommended"
      }
    });

    return {
      connection: safeConnectionView(disconnected),
      providerRevocation: "manual_admin_center_recommended"
    };
  }

  async getHealth(organizationId: string, providerConnectionId: string): Promise<Microsoft365ConnectionHealth> {
    const connection = await this.store.getConnectionForOrganization(organizationId, providerConnectionId);
    const permissionBundles = await this.store.listPermissionBundles(organizationId, providerConnectionId);
    const capabilities = await this.store.listCapabilities(organizationId, providerConnectionId);
    const moduleStatuses = latestModules(await this.store.listSyncModulesForConnection(organizationId, providerConnectionId));
    const status = connectionHealthStatus(connection, moduleStatuses, capabilities);

    return {
      connection: safeConnectionView(connection),
      status,
      connectorMode: this.connectorMode,
      effectiveConnectorMode: this.effectiveMode,
      fixtureSet: this.effectiveMode === "fixture" ? this.fixtureSet : undefined,
      permissionBundles,
      capabilities,
      moduleStatuses
    };
  }

  private async notifyNewOpenFindings(organizationId: string, findings: ProviderFinding[]): Promise<void> {
    if (!this.notifications) {
      return;
    }

    for (const finding of findings.filter((candidate) => candidate.status === "open" && candidate.firstSeenAt === candidate.lastSeenAt)) {
      await this.notifications.send(organizationId, "M365_DRIFT_DETECTED", {
        providerConnectionId: finding.providerConnectionId,
        findingId: finding.id,
        findingKey: finding.findingKey,
        findingTitle: finding.title,
        moduleKey: finding.moduleKey,
        severity: finding.severity
      });
    }
  }

  private async reconcileModuleHealthFindings(input: {
    organizationId: string;
    providerConnectionId: string;
    syncRunId: string;
    modules: ProviderSyncModuleRecord[];
  }): Promise<ProviderFinding[]> {
    const existingFindings = await this.store.listFindings(input.organizationId, input.providerConnectionId);
    const observedAt = this.now().toISOString();
    const currentOpenFindings: ProviderFinding[] = [];

    for (const module of input.modules) {
      const currentKey = moduleHealthFindingKey(module.moduleKey, module.status);
      const existingModuleHealthFindings = existingFindings.filter((finding) =>
        isModuleHealthFinding(finding, module.moduleKey)
      );

      for (const finding of existingModuleHealthFindings) {
        const shouldResolve =
          (finding.findingKey !== currentKey || !moduleHealthFindingStatuses.has(module.status)) &&
          finding.status !== "resolved";
        if (shouldResolve) {
          await this.store.upsertFinding({
            organizationId: input.organizationId,
            providerConnectionId: input.providerConnectionId,
            providerKey: microsoft365ProviderKey,
            moduleKey: module.moduleKey,
            findingKey: finding.findingKey,
            title: finding.title,
            summary: finding.summary,
            severity: finding.severity,
            status: "resolved",
            evidence: {
              ...finding.evidence,
              resolvedByModuleStatus: module.status,
              resolvedAt: observedAt
            },
            syncRunId: input.syncRunId,
            observedAt
          });
        }
      }

      if (!moduleHealthFindingStatuses.has(module.status)) {
        continue;
      }

      currentOpenFindings.push(
        await this.store.upsertFinding(
          moduleHealthFindingInput({
            organizationId: input.organizationId,
            providerConnectionId: input.providerConnectionId,
            syncRunId: input.syncRunId,
            module,
            observedAt
          })
        )
      );
    }

    return currentOpenFindings;
  }

  private microsoftConnector(): CloudProviderConnector {
    return this.createConnector({
      credentialResolver: this.resolveCredential,
      tokenCipher: this.getTokenCipher()
    });
  }

  private getTokenCipher(): Microsoft365TokenCipher {
    this.tokenCipher ??= this.tokenCipherFactory();
    return this.tokenCipher;
  }

  private readonly resolveCredential: Microsoft365CredentialResolver = async (input) => {
    const credentials = await this.store.listCredentials(input.organizationId, input.providerConnectionId);
    const credential = credentials.find((entry) => entry.credentialType === "oauth_token");
    if (!credential) {
      throw new AuthError("invalid_request", "Microsoft 365 credential is not available for this connection.", 400);
    }

    return this.getTokenCipher().decrypt<Microsoft365StoredCredential>(credential.encryptedPayload);
  };

  private async consumePendingState(input: Microsoft365ConsentCallbackInput): Promise<PendingConsentState> {
    const persisted = await this.consentStateStore.consumeConsentState({
      organizationId: input.organizationId,
      providerKey: microsoft365ProviderKey,
      stateHash: hashConsentState(input.state),
      actorUserId: input.actorUserId,
      consumedAt: this.now().toISOString()
    });
    const pending = persisted ? consentStateRecordToPendingState(persisted) : null;

    if (!pending) {
      throw new AuthError("invalid_request", "Microsoft 365 consent state is invalid or expired.", 400);
    }

    if (pending.organizationId !== input.organizationId || pending.actorUserId !== input.actorUserId) {
      throw new AuthError("forbidden", "Microsoft 365 consent state does not belong to this session.", 403);
    }

    if (new Date(pending.expiresAt).getTime() < this.now().getTime()) {
      throw new AuthError("invalid_request", "Microsoft 365 consent state expired.", 400);
    }

    return pending;
  }
}

const hashConsentState = (state: string): string => createHash("sha256").update(state, "utf8").digest("hex");

const isModuleHealthFinding = (finding: ProviderFinding, moduleKey: string): boolean =>
  finding.providerKey === microsoft365ProviderKey &&
  finding.moduleKey === moduleKey &&
  finding.findingKey.startsWith(`microsoft365.module_health.${moduleKey}.`);

const moduleHealthFindingKey = (moduleKey: string, status: ProviderSyncModuleStatus): string =>
  `microsoft365.module_health.${moduleKey}.${status}`;

const moduleHealthFindingInput = (input: {
  organizationId: string;
  providerConnectionId: string;
  syncRunId: string;
  module: ProviderSyncModuleRecord;
  observedAt: string;
}): ProviderFindingInput => {
  const { module } = input;
  const reason = module.statusReason ?? moduleHealthSummary(module);

  return {
    organizationId: input.organizationId,
    providerConnectionId: input.providerConnectionId,
    providerKey: microsoft365ProviderKey,
    moduleKey: module.moduleKey,
    findingKey: moduleHealthFindingKey(module.moduleKey, module.status),
    title: moduleHealthTitle(module.status, microsoft365ModuleLabel(module.moduleKey)),
    summary: moduleHealthSummary(module),
    severity: moduleHealthSeverity(module.status),
    status: "open",
    evidence: {
      signalKey: "microsoft365_module_health",
      moduleKey: module.moduleKey,
      moduleStatus: module.status,
      statusReason: reason,
      missingPermissions: module.missingPermissions,
      missingLicenses: module.missingLicenses,
      pagesRead: module.pagesRead,
      retryCount: module.retryCount,
      source: "provider_sync_modules",
      recommendation: moduleHealthRecommendation(module)
    },
    syncRunId: input.syncRunId,
    observedAt: input.observedAt
  };
};

const moduleHealthTitle = (status: ProviderSyncModuleStatus, label: string): string => {
  if (status === "missing_permission") {
    return `${label} Graph permission missing`;
  }
  if (status === "unavailable_license") {
    return `${label} license not detected`;
  }
  if (status === "unsupported_api") {
    return `${label} read module not supported`;
  }
  if (status === "revoked_consent") {
    return `${label} consent revoked`;
  }
  if (status === "rate_limited") {
    return `${label} throttled by Microsoft Graph`;
  }
  if (status === "partial") {
    return `${label} partially synced`;
  }
  return `${label} sync failed`;
};

const moduleHealthSummary = (module: ProviderSyncModuleRecord): string => {
  const label = microsoft365ModuleLabel(module.moduleKey);
  if (module.status === "missing_permission") {
    const permissions = module.missingPermissions.length > 0 ? module.missingPermissions.join(", ") : "required Graph permissions";
    return `Microsoft Graph did not grant ${permissions} for the ${label} read module.`;
  }
  if (module.status === "unavailable_license") {
    const licenses = module.missingLicenses.length > 0 ? module.missingLicenses.join(", ") : "the required Microsoft 365 license";
    return `${label} could not run because ${licenses} was not detected for this tenant.`;
  }
  if (module.status === "unsupported_api") {
    return `${label} is not available through the current read-only Microsoft Graph connector path.`;
  }
  if (module.status === "revoked_consent") {
    return `${label} could not run because Microsoft Graph consent appears to be revoked.`;
  }
  if (module.status === "rate_limited") {
    return `${label} could not complete before Microsoft Graph throttling exhausted the retry budget.`;
  }
  if (module.status === "partial") {
    return `${label} returned only partial read-only Microsoft Graph data.`;
  }
  return `${label} failed during the latest read-only Microsoft Graph sync.`;
};

const moduleHealthRecommendation = (module: ProviderSyncModuleRecord): string => {
  if (module.status === "missing_permission") {
    return "Review the PureSOC Microsoft Entra app registration, add the required Microsoft Graph application permissions, then grant admin consent again.";
  }
  if (module.status === "unavailable_license") {
    return "Confirm the required Microsoft 365 service plan is assigned before relying on this module for readiness evidence.";
  }
  if (module.status === "unsupported_api") {
    return "Treat this module as manual or guided evidence until a validated read-only Graph signal is implemented.";
  }
  if (module.status === "revoked_consent") {
    return "Reconnect Microsoft 365 and grant tenant-wide admin consent for the selected read-only bundle.";
  }
  if (module.status === "rate_limited") {
    return "Retry the read-only sync later and preserve the throttling signal as connector health evidence.";
  }
  return "Review connector health, retry the read-only sync, and attach manual evidence if the provider signal remains unavailable.";
};

const moduleHealthSeverity = (status: ProviderSyncModuleStatus): ProviderFinding["severity"] => {
  if (status === "revoked_consent" || status === "failed" || status === "rate_limited") {
    return "medium";
  }
  if (status === "unsupported_api") {
    return "informational";
  }
  return "low";
};

const microsoft365ModuleLabel = (moduleKey: string): string => {
  if (moduleKey === "mfa-registration") {
    return "MFA registration";
  }

  return moduleKey
    .split(/[-_.]/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

const effectiveConnectorMode = (
  connectorMode: Microsoft365ConnectorMode,
  connectorApp: Microsoft365ConnectorAppConfig
): "fixture" | "live" => {
  if (connectorMode === "fixture") {
    return "fixture";
  }

  if (connectorMode === "auto") {
    return connectorApp.clientId && connectorApp.clientSecret ? "live" : "fixture";
  }

  return "live";
};

const consentStateRecordToPendingState = (record: ProviderConsentStateRecord): PendingConsentState => ({
  organizationId: record.organizationId,
  actorUserId: record.actorUserId,
  redirectUri: record.redirectUri,
  requestedPermissionBundles: record.requestedPermissionBundles,
  expiresAt: record.expiresAt
});

const latestModules = (modules: ProviderSyncModuleRecord[]): ProviderSyncModuleRecord[] => {
  const latest = new Map<string, ProviderSyncModuleRecord>();

  for (const module of modules) {
    const existing = latest.get(module.moduleKey);
    if (!existing || (module.completedAt ?? module.startedAt) > (existing.completedAt ?? existing.startedAt)) {
      latest.set(module.moduleKey, module);
    }
  }

  return [...latest.values()].sort((left, right) => left.moduleKey.localeCompare(right.moduleKey));
};

const connectionHealthStatus = (
  connection: ProviderConnectionRecord,
  modules: ProviderSyncModuleRecord[],
  capabilities: ProviderCapabilityRecord[]
): ProviderConnectionRecord["status"] => {
  if (connection.status === "revoked" || modules.some((module) => module.status === "revoked_consent")) {
    return "revoked";
  }

  const degradedModule = modules.some((module) => !["succeeded", "skipped"].includes(module.status));
  void capabilities;
  return degradedModule ? "degraded" : connection.status;
};
