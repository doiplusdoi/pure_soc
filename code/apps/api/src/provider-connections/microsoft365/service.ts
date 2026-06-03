import { randomUUID } from "node:crypto";

import type { LocalAuthAuditWriter } from "@puresoc/auth-local";
import {
  InMemoryProviderResourceStore,
  runProviderConnectorPipeline,
  type CloudProviderConnector,
  type ProviderCapabilityRecord,
  type ProviderConnectionRecord,
  type ProviderPermissionBundleRecord,
  type ProviderPipelineResult,
  type ProviderResourceStore,
  type ProviderSyncModuleRecord
} from "@puresoc/providers-core";
import {
  createMicrosoft365TokenCipherFromEnv,
  createMicrosoft365Connector,
  microsoft365DefaultReadModules,
  microsoft365ProviderKey,
  normalizeMicrosoft365RequestedBundles,
  type Microsoft365CredentialResolver,
  type Microsoft365StoredCredential,
  type Microsoft365TokenCipher
} from "@puresoc/provider-microsoft365";
import { AuthError } from "@puresoc/auth-core";
import { safeConnectionView, type ProviderConnectionView } from "../service";

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

export interface Microsoft365ConnectionHealth {
  connection: ProviderConnectionView;
  status: ProviderConnectionRecord["status"];
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
  connectorApp?: Microsoft365ConnectorAppConfig;
  createConnector?: (input: {
    credentialResolver: Microsoft365CredentialResolver;
    tokenCipher: Microsoft365TokenCipher;
  }) => CloudProviderConnector;
}

export interface Microsoft365ConnectorAppConfig {
  clientId: string;
  clientSecret?: string;
  authorityHost?: string;
}

interface PendingConsentState {
  organizationId: string;
  actorUserId: string;
  redirectUri: string;
  requestedPermissionBundles: string[];
  expiresAt: string;
}

const defaultTokenCipher = (): Microsoft365TokenCipher =>
  createMicrosoft365TokenCipherFromEnv();

export class Microsoft365ProviderConnectionService {
  readonly store: ProviderResourceStore;
  private readonly auditWriter: LocalAuthAuditWriter;
  private readonly now: () => Date;
  private readonly stateFactory: () => string;
  private readonly tokenCipherFactory: () => Microsoft365TokenCipher;
  private tokenCipher?: Microsoft365TokenCipher;
  private readonly createConnector: (input: {
    credentialResolver: Microsoft365CredentialResolver;
    tokenCipher: Microsoft365TokenCipher;
  }) => CloudProviderConnector;
  private readonly pendingStates = new Map<string, PendingConsentState>();

  constructor(options: Microsoft365ProviderConnectionServiceOptions) {
    this.store = options.store ?? new InMemoryProviderResourceStore({ now: options.now });
    this.auditWriter = options.auditWriter;
    this.now = options.now ?? (() => new Date());
    this.stateFactory = options.stateFactory ?? randomUUID;
    this.tokenCipher = options.tokenCipher;
    this.tokenCipherFactory = options.tokenCipherFactory ?? defaultTokenCipher;
    const connectorApp = options.connectorApp ?? { clientId: "" };
    this.createConnector =
      options.createConnector ??
      ((input) =>
        createMicrosoft365Connector({
          clientId: connectorApp.clientId,
          clientSecret: connectorApp.clientSecret,
          authorityHost: connectorApp.authorityHost,
          credentialResolver: input.credentialResolver,
          tokenCipher: input.tokenCipher
        }));
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

    this.pendingStates.set(state, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      redirectUri: input.redirectUri,
      requestedPermissionBundles,
      expiresAt: redirect.expiresAt ?? new Date(this.now().getTime() + 10 * 60_000).toISOString()
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
      expiresAt: redirect.expiresAt ?? null,
      requestedPermissionBundles
    };
  }

  async completeConsent(input: Microsoft365ConsentCallbackInput): Promise<{
    connection: ProviderConnectionView;
    permissionBundles: ProviderPermissionBundleRecord[];
    capabilities: ProviderCapabilityRecord[];
    tenantProfileSync: ProviderPipelineResult;
  }> {
    const pending = this.consumePendingState(input);
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
        requestedModules: input.requestedModules ?? microsoft365DefaultReadModules
      }
    });

    const result = await runProviderConnectorPipeline({
      connector: this.microsoftConnector(),
      store: this.store,
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      requestedModules: input.requestedModules,
      maxRetries: input.maxRetries
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_sync_run",
      targetId: result.syncRun.id,
      action: "scan_completed",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: microsoft365ProviderKey,
        status: result.syncRun.status,
        summary: result.syncRun.summary
      }
    });

    return result;
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
      permissionBundles,
      capabilities,
      moduleStatuses
    };
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

  private consumePendingState(input: Microsoft365ConsentCallbackInput): PendingConsentState {
    const pending = this.pendingStates.get(input.state);
    this.pendingStates.delete(input.state);

    if (!pending) {
      throw new AuthError("invalid_request", "Microsoft 365 consent state is invalid or expired.", 400);
    }

    if (pending.organizationId !== input.organizationId || pending.actorUserId !== input.actorUserId) {
      throw new AuthError("forbidden", "Microsoft 365 consent state does not belong to this session.", 403);
    }

    if (input.redirectUri && input.redirectUri !== pending.redirectUri) {
      throw new AuthError("invalid_request", "Microsoft 365 consent redirect URI does not match the pending state.", 400);
    }

    if (new Date(pending.expiresAt).getTime() < this.now().getTime()) {
      throw new AuthError("invalid_request", "Microsoft 365 consent state expired.", 400);
    }

    return pending;
  }
}

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
