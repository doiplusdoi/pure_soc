import { randomUUID } from "node:crypto";

import {
  assertReadOnlyProviderOperation,
  emptyProviderModuleSyncResult,
  InMemoryProviderResourceStore,
  ProviderConnectorError,
  redactProviderSecrets,
  runProviderConnectorPipeline,
  type CloudProviderConnector,
  type CompleteConnectionInput,
  type ConnectionRedirect,
  type ProviderPipelineResult,
  type ProviderCapabilityRecord,
  type ProviderConnectionRecord,
  type ProviderConnectionResult,
  type ProviderCredentialInput,
  type ProviderFindingInput,
  type ProviderModuleSyncResult,
  type ProviderNormalizedResourceInput,
  type ProviderPermissionBundleInput,
  type ProviderRawResourceInput,
  type ProviderRecommendationInput,
  type ProviderResourceStore,
  type SyncInput,
  type TenantProfileInput
} from "@puresoc/providers-core";
import {
  createMicrosoft365TokenCipherFromEnv,
  type Microsoft365TokenCipher
} from "./crypto";
import { MicrosoftGraphClient, type MicrosoftGraphHttpClient } from "./graph-client";
import {
  microsoft365DeferredReadModules,
  microsoft365DefaultReadModules,
  microsoft365ModuleRequirements,
  microsoft365PermissionBundles,
  microsoft365ProviderKey,
  microsoft365ReadModules,
  microsoft365ReadPermissionBundles,
  microsoft365WritePermissionBundles,
  normalizeMicrosoft365RequestedBundles,
  permissionsForMicrosoft365Bundles,
  missingPermissions,
  type Microsoft365CloudEnvironment,
  type Microsoft365ModuleKey,
  type Microsoft365ReadPermissionBundleKey
} from "./permissions";

export {
  microsoft365DeferredReadModules,
  microsoft365DefaultReadModules,
  microsoft365ModuleRequirements,
  microsoft365PermissionBundles,
  microsoft365ProviderKey,
  microsoft365ReadModules,
  microsoft365ReadPermissionBundles,
  microsoft365WritePermissionBundles,
  normalizeMicrosoft365RequestedBundles,
  permissionsForMicrosoft365Bundles,
  type Microsoft365CloudEnvironment,
  type Microsoft365DeferredReadModuleKey,
  type Microsoft365ModuleKey,
  type Microsoft365PermissionBundleKey,
  type Microsoft365ReadPermissionBundleKey,
  type Microsoft365WritePermissionBundleKey
} from "./permissions";
export { MicrosoftGraphClient, type MicrosoftGraphHttpClient, type MicrosoftGraphResponse } from "./graph-client";
export {
  createFakeMicrosoft365SecretManagerTokenKeyProvider,
  createLocalMicrosoft365TokenCipher,
  createLocalMicrosoft365TokenKeyProvider,
  createMicrosoft365TokenKeyProviderFromConfig,
  createMicrosoft365TokenCipherFromEnv,
  describeMicrosoft365TokenKeyProvider,
  localDevMicrosoft365TokenKeyId,
  localDevMicrosoft365TokenMasterKey,
  microsoft365FakeSecretManagerTokenKeyProviderKind,
  microsoft365LocalTokenKeyProviderKind,
  microsoft365SupportedTokenKeyProviderKinds,
  microsoft365TokenKeyCustodySummarySchemaVersion,
  parseMicrosoft365TokenPreviousKeys,
  type CreateFakeMicrosoft365SecretManagerTokenKeyProviderOptions,
  type CreateMicrosoft365TokenKeyProviderFromConfigOptions,
  type Microsoft365FakeSecretManagerTokenCipherKey,
  type Microsoft365TokenCipher,
  type Microsoft365TokenCipherKey,
  type Microsoft365TokenKeyCustodyCapabilities,
  type Microsoft365TokenKeyCustodyBoundary,
  type Microsoft365TokenKeyCustodySummary,
  type Microsoft365TokenKeyProvider,
  type Microsoft365TokenKeyProviderKind,
  type Microsoft365TokenKeyVersionMetadata,
  type Microsoft365TokenRotationReadinessSummary
} from "./crypto";
export {
  createMicrosoft365ProviderTokenCustodyDeploymentReadiness,
  microsoft365ProviderTokenCustodyDeploymentReadinessSchemaVersion,
  microsoft365ProviderTokenCustodyTargetKinds,
  type CreateMicrosoft365ProviderTokenCustodyDeploymentReadinessInput,
  type Microsoft365ProviderTokenCustodyDeploymentReadiness,
  type Microsoft365ProviderTokenCustodyDeploymentReadinessStatus,
  type Microsoft365ProviderTokenCustodyTargetKind
} from "./custody-readiness";
export {
  createMicrosoft365ProviderTokenRotationRunbook,
  microsoft365ProviderTokenRotationRunbookSchemaVersion,
  type Microsoft365ProviderTokenRotationRunbook,
  type Microsoft365ProviderTokenRotationRunbookOperatorPhase,
  type Microsoft365ProviderTokenRotationRunbookStage
} from "./rotation-runbook";
export {
  microsoft365ProviderTokenRotationSmokeSchemaVersion,
  runMicrosoft365ProviderTokenRotationSmoke,
  type Microsoft365ProviderTokenRotationSmokeResult
} from "./rotation-smoke";
export { createMicrosoft365DisabledActionExecutor } from "./action-executor";
export {
  getMicrosoft365ExternalSmokeReadinessMetadata,
  microsoft365ExternalSmokeReadinessMetadataSchemaVersion,
  type Microsoft365ExternalSmokeReadinessMetadata
} from "./readiness";

export interface Microsoft365TokenResponse {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt?: string;
  tenantId?: string;
  grantedPermissions?: string[];
}

export interface Microsoft365TokenClientInput {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  authorityHost: string;
}

export type Microsoft365TokenClient = (input: Microsoft365TokenClientInput) => Promise<Microsoft365TokenResponse>;

export interface Microsoft365StoredCredential {
  tenantId: string;
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  grantedPermissions: string[];
  requestedPermissionBundles: Microsoft365ReadPermissionBundleKey[];
  consentedAt: string;
  cloudEnvironment?: Microsoft365CloudEnvironment;
}

export interface Microsoft365CredentialResolverInput {
  organizationId: string;
  providerConnectionId: string;
}

export type Microsoft365CredentialResolver = (
  input: Microsoft365CredentialResolverInput
) => Promise<Microsoft365StoredCredential>;

export interface CreateMicrosoft365ConnectorOptions {
  clientId: string;
  clientSecret?: string;
  authorityHost?: string;
  graphClient?: MicrosoftGraphClient;
  graphHttpClient?: MicrosoftGraphHttpClient;
  tokenClient?: Microsoft365TokenClient;
  tokenCipher?: Microsoft365TokenCipher;
  credentialResolver?: Microsoft365CredentialResolver;
  staticCredential?: Microsoft365StoredCredential;
  now?: () => Date;
  idFactory?: () => string;
}

const defaultAuthorityHost = "https://login.microsoftonline.com";
const defaultAdminConsentTenant = "organizations";
const graphDefaultScope = "https://graph.microsoft.com/.default";

export const createFetchMicrosoft365TokenClient = (): Microsoft365TokenClient => async (input) => {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials"
  });
  const response = await fetch(`${input.authorityHost}/${input.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new ProviderConnectorError("microsoft365_token_exchange_failed", "Microsoft 365 token exchange failed.", {
      status: response.status,
      payload: redactProviderSecrets(payload)
    });
  }

  return {
    accessToken: stringValue(payload.access_token),
    tokenType: stringValue(payload.token_type) || "Bearer",
    expiresIn: numberValue(payload.expires_in)
  };
};

export const createMicrosoft365Connector = (
  options: CreateMicrosoft365ConnectorOptions
): CloudProviderConnector => {
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? randomUUID;
  const authorityHost = options.authorityHost ?? defaultAuthorityHost;
  const tokenClient = options.tokenClient ?? createFetchMicrosoft365TokenClient();
  const tokenCipher = options.tokenCipher ?? createMicrosoft365TokenCipherFromEnv();
  const graphClient =
    options.graphClient ??
    new MicrosoftGraphClient({
      httpClient: options.graphHttpClient
    });

  const resolveCredential = async (input: Microsoft365CredentialResolverInput): Promise<Microsoft365StoredCredential> => {
    if (options.credentialResolver) {
      return options.credentialResolver(input);
    }

    if (options.staticCredential) {
      return options.staticCredential;
    }

    throw new ProviderConnectorError(
      "microsoft365_credential_missing",
      "Microsoft 365 encrypted credential is not available for sync."
    );
  };

  return {
    providerKey: microsoft365ProviderKey as typeof microsoft365ProviderKey,
    beginConnection: async (input): Promise<ConnectionRedirect> => {
      if (!options.clientId) {
        throw new ProviderConnectorError("microsoft365_client_id_missing", "Microsoft 365 client ID is not configured.");
      }

      const requestedBundles = normalizeMicrosoft365RequestedBundles(input.requestedPermissionBundles);
      const url = new URL(`${authorityHost}/${defaultAdminConsentTenant}/v2.0/adminconsent`);
      url.searchParams.set("client_id", options.clientId);
      url.searchParams.set("scope", graphDefaultScope);
      url.searchParams.set("state", input.state);
      url.searchParams.set("redirect_uri", input.redirectUri);

      return {
        url: url.toString(),
        state: input.state,
        expiresAt: new Date(now().getTime() + 10 * 60_000).toISOString()
      };
    },
    completeConnection: async (input: CompleteConnectionInput): Promise<ProviderConnectionResult> => {
      const metadata = input.metadata ?? {};
      const tenantId = stringValue(metadata.tenantId);
      const adminConsent = metadata.adminConsent === true || metadata.adminConsent === "True";
      const requestedBundles = normalizeMicrosoft365RequestedBundles(
        arrayOfStrings(metadata.requestedPermissionBundles)
      );

      if (!adminConsent) {
        throw new ProviderConnectorError("microsoft365_admin_consent_denied", "Microsoft 365 admin consent was not granted.");
      }

      if (!tenantId) {
        throw new ProviderConnectorError("microsoft365_tenant_missing", "Microsoft 365 callback did not include a tenant ID.");
      }

      if (!options.clientSecret) {
        throw new ProviderConnectorError(
          "microsoft365_client_secret_missing",
          "Microsoft 365 client secret is not configured for token exchange."
        );
      }

      const token = await tokenClient({
        tenantId,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        authorityHost
      });
      const grantedPermissions = [...new Set(token.grantedPermissions ?? decodeJwtRoles(token.accessToken))].sort();
      const tokenTenantId = token.tenantId ?? decodeJwtTenantId(token.accessToken);

      if (tokenTenantId && tokenTenantId !== tenantId) {
        throw new ProviderConnectorError("microsoft365_tenant_mismatch", "Microsoft 365 token tenant did not match callback tenant.", {
          callbackTenantId: tenantId,
          tokenTenantId
        });
      }

      const expiresAt = token.expiresAt ?? new Date(now().getTime() + (token.expiresIn ?? 3600) * 1000).toISOString();
      const credentialPayload: Microsoft365StoredCredential = {
        tenantId,
        accessToken: token.accessToken,
        tokenType: token.tokenType ?? "Bearer",
        expiresAt,
        grantedPermissions,
        requestedPermissionBundles: requestedBundles,
        consentedAt: now().toISOString()
      };
      const tenantProfile = await getTenantProfileFromGraph({
        graphClient,
        accessToken: token.accessToken,
        organizationId: input.organizationId,
        providerConnectionId: idFactory(),
        tenantId,
        maxRetries: 3
      });
      const providerConnectionId = tenantProfile.providerConnectionId;
      const connection = connectionFor({
        id: providerConnectionId,
        organizationId: input.organizationId,
        tenantId,
        tenantName: tenantProfile.normalizedJson.displayName,
        requestedBundles,
        grantedPermissions,
        now
      });

      return {
        connection,
        grantedPermissionBundles: requestedBundles.filter((bundleKey) =>
          permissionsForMicrosoft365Bundles([bundleKey]).every((permission) => grantedPermissions.includes(permission))
        ),
        permissionBundles: buildPermissionBundleInputs({
          organizationId: input.organizationId,
          providerConnectionId,
          requestedBundles,
          grantedPermissions
        }),
        credentials: [
          {
            organizationId: input.organizationId,
            providerConnectionId,
            providerKey: microsoft365ProviderKey,
            credentialType: "oauth_token",
            encryptedPayload: tokenCipher.encrypt(credentialPayload),
            expiresAt,
            rotationRequired: false
          }
        ],
        capabilities: buildCapabilities({
          idFactory,
          organizationId: input.organizationId,
          providerConnectionId,
          grantedPermissions,
          detectedLicenses: [],
          now
        }),
        tenantProfile
      };
    },
    getTenantProfile: async (input: TenantProfileInput) => {
      const credential = await resolveCredential(input);
      return getTenantProfileFromGraph({
        graphClient,
        accessToken: credential.accessToken,
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        tenantId: credential.tenantId,
        maxRetries: 3
      });
    },
    syncReadOnlyModules: async (input: SyncInput): Promise<ProviderModuleSyncResult[]> => {
      assertReadOnlyProviderOperation({
        operation: "microsoft365_sync",
        allowProviderWrites: input.allowProviderWrites,
        providerKey: microsoft365ProviderKey
      });

      const credential = await resolveCredential(input);
      const requestedModules = input.requestedModules ?? [...microsoft365DefaultReadModules];
      const requested = new Set(requestedModules);
      const supportedModules = new Set<string>(microsoft365ReadModules);
      const modules = microsoft365ReadModules.filter((moduleKey) => requested.has(moduleKey));
      const detectedLicenses = new Set<string>();
      const results: ProviderModuleSyncResult[] = [];

      for (const moduleKey of modules) {
        const requirement = microsoft365ModuleRequirements[moduleKey];
        const nationalCloudStatus = nationalCloudUnsupportedResult(moduleKey, credential);
        if (nationalCloudStatus) {
          results.push(nationalCloudStatus);
          continue;
        }

        const missing = missingPermissions(requirement.permissionsRequired, credential.grantedPermissions);
        if (missing.length > 0) {
          results.push({
            ...emptyProviderModuleSyncResult(moduleKey, "missing_permission", "Microsoft Graph permission was not granted."),
            missingPermissions: missing
          });
          continue;
        }

        const missingLicenses = requirement.licenseRequired.filter((license) => !detectedLicenses.has(license));
        if (moduleKey !== "licensing" && missingLicenses.length > 0) {
          results.push({
            ...emptyProviderModuleSyncResult(moduleKey, "unavailable_license", "Required Microsoft 365 license was not detected."),
            missingLicenses
          });
          continue;
        }

        const result = await runMicrosoft365Module({
          moduleKey,
          graphClient,
          input,
          credential,
          maxRetries: input.maxRetries ?? 3
        });
        results.push(result);

        if (moduleKey === "licensing") {
          for (const resource of result.normalizedResources) {
            const servicePlans = arrayOfStrings(resource.normalizedJson.servicePlans);
            for (const servicePlan of servicePlans) {
              detectedLicenses.add(servicePlan);
            }
          }
        }
      }

      const unsupportedRequested = new Set<string>();
      for (const requestedModule of requestedModules) {
        if (supportedModules.has(requestedModule) || unsupportedRequested.has(requestedModule)) {
          continue;
        }

        unsupportedRequested.add(requestedModule);
        const knownDeferred = microsoft365DeferredReadModules.includes(
          requestedModule as (typeof microsoft365DeferredReadModules)[number]
        );
        results.push(
          emptyProviderModuleSyncResult(
            requestedModule,
            "unsupported_api",
            knownDeferred
              ? "Microsoft Graph-first posture module is deferred until a reliable read-only signal is selected."
              : "Requested Microsoft 365 module is not supported by this connector."
          )
        );
      }

      return results;
    },
    evaluateControls: async () => [],
    getRecommendedActions: async () => []
  };
};

interface ConnectionForInput {
  id: string;
  organizationId: string;
  tenantId: string;
  tenantName: string;
  requestedBundles: Microsoft365ReadPermissionBundleKey[];
  grantedPermissions: string[];
  now: () => Date;
}

const connectionFor = (input: ConnectionForInput): ProviderConnectionRecord => ({
  id: input.id,
  organizationId: input.organizationId,
  providerKey: microsoft365ProviderKey,
  displayName: `Microsoft 365: ${input.tenantName}`,
  externalTenantId: input.tenantId,
  externalTenantName: input.tenantName,
  status: "connected",
  readEnabled: true,
  writeEnabled: false,
  metadata: {
    requestedPermissionBundles: input.requestedBundles,
    grantedPermissions: input.grantedPermissions,
    consentedAt: input.now().toISOString()
  },
  createdAt: input.now().toISOString(),
  updatedAt: input.now().toISOString()
});

const buildPermissionBundleInputs = (input: {
  organizationId: string;
  providerConnectionId: string;
  requestedBundles: Microsoft365ReadPermissionBundleKey[];
  grantedPermissions: string[];
}): ProviderPermissionBundleInput[] =>
  input.requestedBundles.map((bundleKey) => {
    const permissionsRequired = microsoft365PermissionBundles[bundleKey].permissions;
    const permissionsGranted = permissionsRequired.filter((permission) => input.grantedPermissions.includes(permission));

    return {
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey: microsoft365ProviderKey,
      bundleKey,
      permissionsRequired,
      permissionsGranted,
      enabled: permissionsGranted.length === permissionsRequired.length
    };
  });

const buildCapabilities = (input: {
  idFactory: () => string;
  organizationId: string;
  providerConnectionId: string;
  grantedPermissions: string[];
  detectedLicenses: string[];
  now: () => Date;
}): ProviderCapabilityRecord[] =>
  microsoft365ReadModules.map((moduleKey) => {
    const requirement = microsoft365ModuleRequirements[moduleKey];
    const missing = missingPermissions(requirement.permissionsRequired, input.grantedPermissions);
    const missingLicenses = requirement.licenseRequired.filter((license) => !input.detectedLicenses.includes(license));
    const status =
      missing.length > 0 ? "missing_permission" : missingLicenses.length > 0 ? "unavailable_license" : "succeeded";

    return {
      id: input.idFactory(),
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey: microsoft365ProviderKey,
      moduleKey,
      capabilityKey: `${moduleKey}.read`,
      available: status === "succeeded",
      licenseRequired: requirement.licenseRequired,
      licenseDetected: requirement.licenseRequired.filter((license) => input.detectedLicenses.includes(license)),
      permissionsRequired: requirement.permissionsRequired,
      permissionsGranted: requirement.permissionsRequired.filter((permission) =>
        input.grantedPermissions.includes(permission)
      ),
      status,
      statusReason:
        status === "missing_permission"
          ? "Microsoft Graph permission is missing."
          : status === "unavailable_license"
            ? "Microsoft 365 license is not yet detected."
            : undefined,
      updatedAt: input.now().toISOString()
    };
  });

interface RunModuleInput {
  moduleKey: Microsoft365ModuleKey;
  graphClient: MicrosoftGraphClient;
  input: SyncInput;
  credential: Microsoft365StoredCredential;
  maxRetries: number;
}

const runMicrosoft365Module = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  try {
    if (input.moduleKey === "tenant-profile") {
      return await syncTenantProfile(input);
    }

    if (input.moduleKey === "licensing") {
      return await syncLicensing(input);
    }

    if (input.moduleKey === "users-groups-roles") {
      return await syncUsersGroupsRoles(input);
    }

    if (input.moduleKey === "applications") {
      return await syncApplications(input);
    }

    if (input.moduleKey === "conditional-access") {
      return await syncConditionalAccess(input);
    }

    if (input.moduleKey === "entra-audit-logs") {
      return await syncEntraAuditLogs(input);
    }

    if (input.moduleKey === "entra-sign-in-logs") {
      return await syncEntraSignInLogs(input);
    }

    if (input.moduleKey === "secure-score") {
      return await syncSecureScore(input);
    }

    if (input.moduleKey === "intune-devices") {
      return await syncIntuneDevices(input);
    }

    if (input.moduleKey === "defender-xdr") {
      return await syncDefenderXdr(input);
    }

    return emptyProviderModuleSyncResult(input.moduleKey, "unsupported_api", "Microsoft 365 module is not implemented.");
  } catch (error) {
    return moduleErrorResult(input.moduleKey, error);
  }
};

const nationalCloudUnsupportedResult = (
  moduleKey: Microsoft365ModuleKey,
  credential: Microsoft365StoredCredential
): ProviderModuleSyncResult | undefined => {
  const cloudEnvironment = credential.cloudEnvironment ?? "global";
  const requirement = microsoft365ModuleRequirements[moduleKey];

  if (requirement.unsupportedNationalClouds?.includes(cloudEnvironment)) {
    return emptyProviderModuleSyncResult(
      moduleKey,
      "unsupported_api",
      `Microsoft Graph module ${moduleKey} is not available in the configured ${cloudEnvironment} national cloud.`
    );
  }

  return undefined;
};

const moduleErrorResult = (moduleKey: Microsoft365ModuleKey, error: unknown): ProviderModuleSyncResult => {
  if (error instanceof ProviderConnectorError && error.code === "microsoft365_graph_revoked_consent") {
    return emptyProviderModuleSyncResult(moduleKey, "revoked_consent", "Microsoft Graph consent is revoked.");
  }

  if (error instanceof ProviderConnectorError && error.code === "microsoft365_graph_rate_limited") {
    return emptyProviderModuleSyncResult(moduleKey, "rate_limited", "Microsoft Graph throttling exceeded retry budget.");
  }

  if (error instanceof ProviderConnectorError && error.code === "microsoft365_graph_forbidden") {
    return emptyProviderModuleSyncResult(moduleKey, "missing_permission", "Microsoft Graph rejected the request.");
  }

  return {
    ...emptyProviderModuleSyncResult(moduleKey, "failed", "Microsoft 365 module failed."),
    error: redactProviderSecrets(error instanceof Error ? { name: error.name, message: error.message } : error) as Record<
      string,
      unknown
    >
  };
};

const syncTenantProfile = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const profile = await readTenantProfilePages(input);
  const rawResources = [
    raw(input, "organization", profile.tenantId, profile.organization),
    ...profile.domainsRaw.map((domain) => raw(input, "domain", stringValue(domain.id) || stringValue(domain.name), domain))
  ];
  const normalizedResources = [
    normalized(input, "organization", profile.tenantId, "cloud_tenant", {
      tenantId: profile.tenantId,
      displayName: profile.displayName,
      domains: profile.domains
    })
  ];

  return succeeded(input, rawResources, normalizedResources, profile.pagesRead, profile.retryCount);
};

const syncLicensing = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const result = await input.graphClient.list({
    path: "/subscribedSkus",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const rawResources = result.items.map((sku) => raw(input, "subscribedSku", skuExternalId(sku), sku));
  const normalizedResources = result.items.map((sku) =>
    normalized(input, "subscribedSku", skuExternalId(sku), "cloud_license", {
      skuPartNumber: stringValue(sku.skuPartNumber),
      servicePlans: servicePlansFromSku(sku)
    })
  );

  return succeeded(input, rawResources, normalizedResources, result.pagesRead, result.retryCount);
};

const syncUsersGroupsRoles = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const users = await input.graphClient.list({
    path: "/users?$select=id,userPrincipalName,displayName,accountEnabled,userType,assignedLicenses,signInActivity",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const groups = await input.graphClient.list({
    path: "/groups?$select=id,displayName,groupTypes,securityEnabled,mailEnabled",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const roles = await input.graphClient.list({
    path: "/directoryRoles",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const roleMemberIds = new Map<string, string[]>();
  let roleMemberPages = 0;
  let roleMemberRetries = 0;

  for (const role of roles.items) {
    const roleId = stringValue(role.id);
    if (!roleId) {
      continue;
    }
    const members = await input.graphClient.list({
      path: `/directoryRoles/${roleId}/members?$select=id,displayName,userPrincipalName`,
      accessToken: input.credential.accessToken,
      maxRetries: input.maxRetries
    });
    roleMemberIds.set(roleId, members.items.map((member) => stringValue(member.id)).filter(Boolean));
    roleMemberPages += members.pagesRead;
    roleMemberRetries += members.retryCount;
  }

  const rawResources = [
    ...users.items.map((user) => raw(input, "user", stringValue(user.id), user)),
    ...groups.items.map((group) => raw(input, "group", stringValue(group.id), group)),
    ...roles.items.map((role) => raw(input, "directoryRole", stringValue(role.id), role))
  ];
  const normalizedResources = [
    ...users.items.map((user) =>
      normalized(input, "user", stringValue(user.id), "cloud_user", {
        userPrincipalName: stringValue(user.userPrincipalName),
        displayName: stringValue(user.displayName),
        accountEnabled: booleanValue(user.accountEnabled, true),
        userType: stringValue(user.userType).toLowerCase() === "guest" ? "guest" : "member",
        lastSignInAt: stringValue(asRecord(user.signInActivity).lastSignInDateTime) || undefined
      })
    ),
    ...groups.items.map((group) =>
      normalized(input, "group", stringValue(group.id), "cloud_group", {
        displayName: stringValue(group.displayName),
        groupType: arrayOfStrings(group.groupTypes).join(",") || (booleanValue(group.securityEnabled) ? "security" : "group")
      })
    ),
    ...roles.items.map((role) =>
      normalized(input, "directoryRole", stringValue(role.id), "cloud_admin_role", {
        roleName: stringValue(role.displayName),
        assignedPrincipalIds: roleMemberIds.get(stringValue(role.id)) ?? [],
        privileged: isPrivilegedRoleName(stringValue(role.displayName))
      })
    )
  ];

  return succeeded(
    input,
    rawResources,
    normalizedResources,
    users.pagesRead + groups.pagesRead + roles.pagesRead + roleMemberPages,
    users.retryCount + groups.retryCount + roles.retryCount + roleMemberRetries
  );
};

const syncApplications = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const applications = await input.graphClient.list({
    path: "/applications?$select=id,appId,displayName,passwordCredentials,keyCredentials,requiredResourceAccess",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const servicePrincipals = await input.graphClient.list({
    path: "/servicePrincipals?$select=id,appId,displayName,passwordCredentials,keyCredentials,appRoles,oauth2PermissionScopes",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const rawResources = [
    ...applications.items.map((application) => raw(input, "application", stringValue(application.id), application)),
    ...servicePrincipals.items.map((servicePrincipal) =>
      raw(input, "servicePrincipal", stringValue(servicePrincipal.id), servicePrincipal)
    )
  ];
  const normalizedResources = [
    ...applications.items.map((application) =>
      normalized(input, "application", stringValue(application.id), "cloud_application", {
        displayName: stringValue(application.displayName),
        appId: stringValue(application.appId),
        credentialExpiryAt: earliestCredentialExpiry(application),
        permissions: requiredResourceAccess(application)
      })
    ),
    ...servicePrincipals.items.map((servicePrincipal) =>
      normalized(input, "servicePrincipal", stringValue(servicePrincipal.id), "cloud_application", {
        displayName: stringValue(servicePrincipal.displayName),
        appId: stringValue(servicePrincipal.appId),
        credentialExpiryAt: earliestCredentialExpiry(servicePrincipal),
        permissions: []
      })
    )
  ];

  return succeeded(
    input,
    rawResources,
    normalizedResources,
    applications.pagesRead + servicePrincipals.pagesRead,
    applications.retryCount + servicePrincipals.retryCount
  );
};

const syncConditionalAccess = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const policies = await input.graphClient.list({
    path: "/identity/conditionalAccess/policies",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const rawResources = policies.items.map((policy) => raw(input, "conditionalAccessPolicy", stringValue(policy.id), policy));
  const normalizedResources = policies.items.map((policy) =>
    normalized(input, "conditionalAccessPolicy", stringValue(policy.id), "cloud_policy", {
      displayName: stringValue(policy.displayName),
      policyType: "conditional_access",
      enabled: stringValue(policy.state).toLowerCase() === "enabled",
      state: stringValue(policy.state),
      conditions: asRecord(policy.conditions),
      grantControls: asRecord(policy.grantControls),
      sessionControls: asRecord(policy.sessionControls)
    })
  );

  return succeeded(input, rawResources, normalizedResources, policies.pagesRead, policies.retryCount);
};

const syncEntraAuditLogs = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const audits = await input.graphClient.list({
    path:
      "/auditLogs/directoryAudits?$top=50&$select=id,activityDateTime,activityDisplayName,category,result,initiatedBy,targetResources",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const rawResources = audits.items.map((event) => raw(input, "directoryAudit", stringValue(event.id), event));
  const normalizedResources = audits.items.map((event) =>
    normalized(input, "directoryAudit", stringValue(event.id), "cloud_audit_event", {
      eventType: stringValue(event.activityDisplayName) || stringValue(event.category) || "directory_audit",
      actor: auditActor(event),
      occurredAt: stringValue(event.activityDateTime),
      result: stringValue(event.result),
      category: stringValue(event.category)
    })
  );

  return succeeded(input, rawResources, normalizedResources, audits.pagesRead, audits.retryCount);
};

const syncEntraSignInLogs = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const signIns = await input.graphClient.list({
    path:
      "/auditLogs/signIns?$top=50&$select=id,createdDateTime,userPrincipalName,userDisplayName,appDisplayName,ipAddress,conditionalAccessStatus,riskLevelAggregated,status",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const rawResources = signIns.items.map((event) => raw(input, "signIn", stringValue(event.id), event));
  const normalizedResources = signIns.items.map((event) =>
    normalized(input, "signIn", stringValue(event.id), "cloud_audit_event", {
      eventType: "sign_in",
      actor: stringValue(event.userPrincipalName) || stringValue(event.userDisplayName),
      occurredAt: stringValue(event.createdDateTime),
      result: signInResult(event),
      application: stringValue(event.appDisplayName),
      conditionalAccessStatus: stringValue(event.conditionalAccessStatus),
      riskLevel: stringValue(event.riskLevelAggregated)
    })
  );

  return succeeded(input, rawResources, normalizedResources, signIns.pagesRead, signIns.retryCount);
};

const syncSecureScore = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const secureScores = await input.graphClient.list({
    path: "/security/secureScores?$top=1",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const rawResources = secureScores.items.map((score) => raw(input, "secureScore", scoreExternalId(score), score));
  const normalizedResources = secureScores.items.map((score) =>
    normalized(input, "secureScore", scoreExternalId(score), "cloud_secure_score", {
      currentScore: numberValue(score.currentScore),
      maxScore: numberValue(score.maxScore)
    })
  );

  return succeeded(input, rawResources, normalizedResources, secureScores.pagesRead, secureScores.retryCount);
};

const syncIntuneDevices = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const devices = await input.graphClient.list({
    path: "/deviceManagement/managedDevices?$select=id,deviceName,complianceState,managementAgent",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const rawResources = devices.items.map((device) => raw(input, "managedDevice", stringValue(device.id), device));
  const normalizedResources = devices.items.map((device) =>
    normalized(input, "managedDevice", stringValue(device.id), "cloud_device", {
      displayName: stringValue(device.deviceName),
      complianceState: stringValue(device.complianceState),
      managed: true
    })
  );

  return succeeded(input, rawResources, normalizedResources, devices.pagesRead, devices.retryCount);
};

const syncDefenderXdr = async (input: RunModuleInput): Promise<ProviderModuleSyncResult> => {
  const incidents = await input.graphClient.list({
    path: "/security/incidents?$top=50",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const alerts = await input.graphClient.list({
    path: "/security/alerts_v2?$top=50",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const incidentResources = incidents.items.map((incident) => raw(input, "incident", stringValue(incident.id), incident));
  const alertResources = alerts.items.map((alert) => raw(input, "securityAlert", stringValue(alert.id), alert));
  const normalizedIncidents = incidents.items.map((incident) =>
    normalized(input, "incident", stringValue(incident.id), "cloud_incident", {
      title: stringValue(incident.displayName) || stringValue(incident.title),
      severity: severityValue(incident.severity),
      status: stringValue(incident.status),
      assignedTo: stringValue(incident.assignedTo),
      incidentWebUrl: stringValue(incident.incidentWebUrl),
      lastUpdateDateTime: stringValue(incident.lastUpdateDateTime)
    })
  );
  const normalizedAlerts = alerts.items.map((alert) =>
    normalized(input, "securityAlert", stringValue(alert.id), "cloud_security_alert", {
      title: stringValue(alert.title) || stringValue(alert.displayName),
      severity: severityValue(alert.severity),
      status: stringValue(alert.status),
      serviceSource: stringValue(alert.serviceSource),
      incidentId: stringValue(alert.incidentId),
      alertWebUrl: stringValue(alert.alertWebUrl),
      lastUpdateDateTime: stringValue(alert.lastUpdateDateTime)
    })
  );
  const incidentFindings = incidents.items.filter(isOpenHighSeveritySecurityItem).map((incident) =>
    defenderIncidentFinding(input, incident)
  );
  const alertFindings = alerts.items.filter(isOpenHighSeveritySecurityItem).map((alert) => defenderAlertFinding(input, alert));
  const recommendations = incidentFindings.map((finding) => ({
    organizationId: input.input.organizationId,
    providerConnectionId: input.input.providerConnectionId,
    providerKey: microsoft365ProviderKey,
    moduleKey: input.moduleKey,
    sourceFindingKey: finding.findingKey,
    jurisdiction: "EU",
    title: "Triage high severity Defender incident",
    summary: "Review the open high severity Defender incident and attach triage evidence to the NIS2 incident-handling control.",
    severity: "high" as const,
    confidence: "high" as const,
    recommendationType: "incident_reporting" as const,
    automationMode: "manual" as const,
    requiredPermissions: ["SecurityIncident.Read.All"],
    requiredLicense: ["DEFENDER_XDR"],
    evidenceRequired: true
  }));

  return succeeded(
    input,
    [...incidentResources, ...alertResources],
    [...normalizedIncidents, ...normalizedAlerts],
    incidents.pagesRead + alerts.pagesRead,
    incidents.retryCount + alerts.retryCount,
    [...incidentFindings, ...alertFindings],
    recommendations
  );
};

const getTenantProfileFromGraph = async (input: {
  graphClient: MicrosoftGraphClient;
  accessToken: string;
  organizationId: string;
  providerConnectionId: string;
  tenantId: string;
  maxRetries: number;
}) => {
  const profile = await readTenantProfilePages({
    moduleKey: "tenant-profile",
    graphClient: input.graphClient,
    input: {
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      syncRunId: "tenant-validation",
      startedAt: new Date().toISOString(),
      maxRetries: input.maxRetries
    },
    credential: {
      tenantId: input.tenantId,
      accessToken: input.accessToken,
      tokenType: "Bearer",
      expiresAt: new Date().toISOString(),
      grantedPermissions: [],
      requestedPermissionBundles: ["m365_read_baseline"],
      consentedAt: new Date().toISOString()
    },
    maxRetries: input.maxRetries
  });

  if (profile.tenantId !== input.tenantId) {
    throw new ProviderConnectorError("microsoft365_tenant_validation_failed", "Microsoft Graph tenant did not match callback tenant.", {
      callbackTenantId: input.tenantId,
      graphTenantId: profile.tenantId
    });
  }

  return {
    id: input.providerConnectionId,
    organizationId: input.organizationId,
    providerConnectionId: input.providerConnectionId,
    providerKey: microsoft365ProviderKey,
    externalId: profile.tenantId,
    externalResourceType: "organization",
    rawResourceId: undefined,
    resourceType: "cloud_tenant" as const,
    sourceModule: "tenant-profile",
    normalizedJson: {
      tenantId: profile.tenantId,
      displayName: profile.displayName,
      domains: profile.domains
    },
    contentHash: profile.tenantId,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString()
  };
};

const readTenantProfilePages = async (input: RunModuleInput) => {
  const organizations = await input.graphClient.list({
    path: "/organization",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const domains = await input.graphClient.list({
    path: "/domains",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const organization = organizations.items[0] ?? {};
  const tenantId = stringValue(organization.id) || input.credential.tenantId;
  const organizationDomains = arrayOfStrings(organization.verifiedDomains);
  const domainNames = domains.items.map((domain) => stringValue(domain.id) || stringValue(domain.name)).filter(Boolean);

  return {
    tenantId,
    displayName: stringValue(organization.displayName) || tenantId,
    domains: [...new Set([...organizationDomains, ...domainNames])],
    organization,
    domainsRaw: domains.items,
    pagesRead: organizations.pagesRead + domains.pagesRead,
    retryCount: organizations.retryCount + domains.retryCount
  };
};

const succeeded = (
  input: RunModuleInput,
  rawResources: ProviderRawResourceInput[],
  normalizedResources: ProviderNormalizedResourceInput[],
  pagesRead: number,
  retryCount: number,
  findings: ProviderFindingInput[] = [],
  recommendations: ProviderRecommendationInput[] = []
): ProviderModuleSyncResult => ({
  moduleKey: input.moduleKey,
  status: "succeeded",
  missingPermissions: [],
  missingLicenses: [],
  rawResources,
  normalizedResources,
  findings,
  recommendations,
  pagesRead,
  retryCount
});

const raw = (
  input: RunModuleInput,
  externalResourceType: string,
  externalId: string,
  rawJson: Record<string, unknown>
): ProviderRawResourceInput => ({
  organizationId: input.input.organizationId,
  providerConnectionId: input.input.providerConnectionId,
  providerKey: microsoft365ProviderKey,
  externalResourceType,
  externalId,
  sourceModule: input.moduleKey,
  syncRunId: input.input.syncRunId,
  rawJson
});

const normalized = (
  input: RunModuleInput,
  externalResourceType: string,
  externalId: string,
  resourceType: ProviderNormalizedResourceInput["resourceType"],
  normalizedJson: Record<string, unknown>
): ProviderNormalizedResourceInput => ({
  organizationId: input.input.organizationId,
  providerConnectionId: input.input.providerConnectionId,
  providerKey: microsoft365ProviderKey,
  externalResourceType,
  externalId,
  resourceType,
  sourceModule: input.moduleKey,
  syncRunId: input.input.syncRunId,
  normalizedJson
});

const decodeJwtPayload = (jwt: string): Record<string, unknown> => {
  const [, payload] = jwt.split(".");
  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const decodeJwtRoles = (jwt: string): string[] => arrayOfStrings(decodeJwtPayload(jwt).roles);

const decodeJwtTenantId = (jwt: string): string => stringValue(decodeJwtPayload(jwt).tid);

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const stringValue = (value: unknown): string => (typeof value === "string" ? value : "");

const numberValue = (value: unknown): number => (typeof value === "number" ? value : 0);

const booleanValue = (value: unknown, defaultValue = false): boolean =>
  typeof value === "boolean" ? value : defaultValue;

const arrayOfStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  return [];
};

const auditActor = (event: Record<string, unknown>): string => {
  const initiatedBy = asRecord(event.initiatedBy);
  const user = asRecord(initiatedBy.user);
  const app = asRecord(initiatedBy.app);

  return (
    stringValue(user.userPrincipalName) ||
    stringValue(user.displayName) ||
    stringValue(app.displayName) ||
    stringValue(app.appId)
  );
};

const signInResult = (event: Record<string, unknown>): string => {
  const status = asRecord(event.status);
  const errorCode = status.errorCode;

  if (typeof errorCode === "number") {
    return errorCode === 0 ? "success" : "failure";
  }

  return stringValue(status.failureReason) ? "failure" : "unknown";
};

const isOpenHighSeveritySecurityItem = (item: Record<string, unknown>): boolean => {
  const severity = severityValue(item.severity);
  const status = stringValue(item.status).toLowerCase();

  return (
    (severity === "high" || severity === "critical") &&
    status !== "resolved" &&
    status !== "redirected" &&
    status !== "dismissed"
  );
};

const defenderIncidentFinding = (input: RunModuleInput, incident: Record<string, unknown>): ProviderFindingInput => {
  const incidentId = stringValue(incident.id);
  const severity = severityValue(incident.severity);
  const title = stringValue(incident.displayName) || stringValue(incident.title) || `Defender incident ${incidentId}`;

  return {
    organizationId: input.input.organizationId,
    providerConnectionId: input.input.providerConnectionId,
    providerKey: microsoft365ProviderKey,
    moduleKey: input.moduleKey,
    findingKey: `microsoft365.defender.high_severity_incident.${incidentId}`,
    title: "Open high severity Defender incident",
    summary: `Microsoft Defender XDR reports an open ${severity} incident: ${title}.`,
    severity,
    status: "open",
    resourceExternalId: incidentId,
    resourceType: "cloud_incident",
    evidence: {
      signalKey: "high_severity_incident",
      incidentId,
      status: stringValue(incident.status),
      severity,
      incidentWebUrl: stringValue(incident.incidentWebUrl),
      lastUpdateDateTime: stringValue(incident.lastUpdateDateTime)
    }
  };
};

const defenderAlertFinding = (input: RunModuleInput, alert: Record<string, unknown>): ProviderFindingInput => {
  const alertId = stringValue(alert.id);
  const severity = severityValue(alert.severity);
  const title = stringValue(alert.title) || stringValue(alert.displayName) || `Defender alert ${alertId}`;

  return {
    organizationId: input.input.organizationId,
    providerConnectionId: input.input.providerConnectionId,
    providerKey: microsoft365ProviderKey,
    moduleKey: input.moduleKey,
    findingKey: `microsoft365.defender.high_severity_alert.${alertId}`,
    title: "Open high severity Defender alert",
    summary: `Microsoft Defender XDR reports an open ${severity} alert: ${title}.`,
    severity,
    status: "open",
    resourceExternalId: alertId,
    resourceType: "cloud_security_alert",
    evidence: {
      signalKey: "high_severity_alert",
      alertId,
      incidentId: stringValue(alert.incidentId),
      status: stringValue(alert.status),
      severity,
      alertWebUrl: stringValue(alert.alertWebUrl),
      lastUpdateDateTime: stringValue(alert.lastUpdateDateTime)
    }
  };
};

const servicePlansFromSku = (sku: Record<string, unknown>): string[] =>
  Array.isArray(sku.servicePlans)
    ? sku.servicePlans
        .map((servicePlan) => stringValue(asRecord(servicePlan).servicePlanName))
        .filter(Boolean)
    : [];

const skuExternalId = (sku: Record<string, unknown>): string =>
  stringValue(sku.skuId) || stringValue(sku.id) || stringValue(sku.skuPartNumber);

const scoreExternalId = (score: Record<string, unknown>): string => stringValue(score.id) || "current-secure-score";

const isPrivilegedRoleName = (roleName: string): boolean =>
  /administrator|privileged|security|compliance/i.test(roleName);

const earliestCredentialExpiry = (application: Record<string, unknown>): string | undefined => {
  const credentials = [
    ...(Array.isArray(application.passwordCredentials) ? application.passwordCredentials : []),
    ...(Array.isArray(application.keyCredentials) ? application.keyCredentials : [])
  ];
  const expiries = credentials
    .map((credential) => stringValue(asRecord(credential).endDateTime))
    .filter(Boolean)
    .sort();

  return expiries[0];
};

const requiredResourceAccess = (application: Record<string, unknown>): string[] =>
  Array.isArray(application.requiredResourceAccess)
    ? application.requiredResourceAccess
        .map((entry) => stringValue(asRecord(entry).resourceAppId))
        .filter(Boolean)
    : [];

const severityValue = (value: unknown): "informational" | "low" | "medium" | "high" | "critical" => {
  const severity = stringValue(value).toLowerCase();
  return severity === "low" || severity === "medium" || severity === "high" || severity === "critical"
    ? severity
    : "informational";
};

export const microsoft365ReadOnlySmokeSchemaVersion = "puresoc.microsoft365.read_only_smoke.v1" as const;
export const microsoft365ReadOnlySmokeCommand = "pnpm microsoft365:smoke:read-only" as const;

export type Microsoft365ReadOnlySmokeStatus = "dry_run_passed" | "blocked" | "passed" | "failed";
export type Microsoft365ReadOnlySmokeOperationStatus = "planned" | "skipped" | "passed" | "failed";

export interface Microsoft365ReadOnlySmokeEnvironmentRequirement {
  label: string;
  env: string[];
  sensitive: boolean;
  requiredFor: "configuration" | "secret" | "disposable_smoke";
  configured: boolean;
}

export interface Microsoft365ReadOnlySmokeGuardrail {
  id: string;
  status: "satisfied" | "required" | "unsafe" | "not_applicable";
  summary: string;
  env?: string[];
}

export interface Microsoft365ReadOnlySmokeReadinessPreflight {
  checkId: "microsoft365_read_only_tenant";
  status: string;
  mode: "dry_run" | "live_candidate";
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  requiredEnvironment: Microsoft365ReadOnlySmokeEnvironmentRequirement[];
  configuredEnvironmentVariables: string[];
  blockers: string[];
  guardrails: Microsoft365ReadOnlySmokeGuardrail[];
  metadata: Record<string, unknown>;
}

export interface Microsoft365ReadOnlySmokeConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  authorityHost: string;
  graphBaseUrl: string;
  requestedModules: string[];
  requestedPermissionBundles: Microsoft365ReadPermissionBundleKey[];
  maxRetries: number;
}

export interface Microsoft365ReadOnlySmokeOperation {
  id: string;
  label: string;
  graphPathPattern: string | null;
  performsNetworkInLiveMode: boolean;
  status: Microsoft365ReadOnlySmokeOperationStatus;
  metadata: Record<string, unknown>;
}

export interface Microsoft365ReadOnlySmokeReport {
  schemaVersion: typeof microsoft365ReadOnlySmokeSchemaVersion;
  command: typeof microsoft365ReadOnlySmokeCommand;
  status: Microsoft365ReadOnlySmokeStatus;
  exitCode: 0 | 1;
  mode: "dry_run" | "live_candidate";
  readinessStatus: string;
  liveNetworkCallsMade: boolean;
  secretValuesReturned: false;
  tokenValuesReturned: false;
  endpointUrlsReturned: false;
  tenantPayloadsReturned: false;
  providerWritesEnabled: false;
  writeScopesRequested: false;
  writeBundlesEnabled: false;
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  configuredEnvironmentVariables: string[];
  missingEnvironmentVariables: string[];
  blockers: string[];
  guardrails: Microsoft365ReadOnlySmokeGuardrail[];
  plannedOperations: Microsoft365ReadOnlySmokeOperation[];
  permissionMetadata: {
    providerKey: typeof microsoft365ProviderKey;
    readPermissionBundleKeys: string[];
    readModuleKeys: string[];
    deferredReadModules: string[];
    writePermissionBundlesDisabled: string[];
    allReadBundlesMarkedReadOnly: boolean;
  };
  runtimeMetadata: {
    authorityHostClass: Microsoft365SmokeEndpointClass;
    graphBaseUrlClass: Microsoft365SmokeEndpointClass;
    requestedModuleCount: number;
    requestedPermissionBundleCount: number;
    maxRetries: number;
    credentialEnvelopeUsed: boolean;
    providerStore: "in_memory_provider_neutral";
    providerWriteExecution: "disabled";
  };
  summary: string;
}

export interface RunMicrosoft365ReadOnlySmokeOptions {
  config: Microsoft365ReadOnlySmokeConfig;
  readiness: Microsoft365ReadOnlySmokeReadinessPreflight;
  env?: NodeJS.ProcessEnv;
  tokenClient?: Microsoft365TokenClient;
  graphHttpClient?: MicrosoftGraphHttpClient;
  tokenCipher?: Microsoft365TokenCipher;
  store?: ProviderResourceStore;
  now?: () => Date;
  idFactory?: () => string;
}

type Microsoft365SmokeEndpointClass = "official_microsoft_public_cloud" | "empty" | "custom";

export const microsoft365ReadOnlySmokeConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env
): Microsoft365ReadOnlySmokeConfig => ({
  clientId: firstConfiguredEnv(env, ["MICROSOFT365_CLIENT_ID", "M365_CLIENT_ID"]),
  clientSecret: firstConfiguredEnv(env, ["MICROSOFT365_CLIENT_SECRET", "M365_CLIENT_SECRET"]),
  tenantId: firstConfiguredEnv(env, ["PURESOC_MICROSOFT365_SMOKE_TENANT_ID", "MICROSOFT365_TENANT_ID", "M365_TENANT_ID"]),
  authorityHost: "https://login.microsoftonline.com",
  graphBaseUrl: "https://graph.microsoft.com/v1.0",
  requestedModules: [...microsoft365ReadModules],
  requestedPermissionBundles: [...microsoft365ReadPermissionBundles],
  maxRetries: 3
});

export const runMicrosoft365ReadOnlySmoke = async (
  options: RunMicrosoft365ReadOnlySmokeOptions
): Promise<Microsoft365ReadOnlySmokeReport> => {
  const env = options.env ?? process.env;
  const liveRequested =
    env.PURESOC_EXTERNAL_SMOKE_MODE === "live_candidate" || options.readiness.mode === "live_candidate";
  const plannedOperations = createPlannedMicrosoft365SmokeOperations(options.config);
  const common = microsoft365SmokeReportCommon(options, plannedOperations);

  if (!liveRequested) {
    return {
      ...common,
      status: "dry_run_passed",
      exitCode: 0,
      mode: "dry_run",
      liveNetworkCallsMade: false,
      summary:
        "Dry run only. Microsoft 365 app-only token, encrypted credential envelope, provider-neutral storage, and read-only Graph module operations are planned but were not executed."
    };
  }

  const liveBlockers = collectMicrosoft365LiveSmokeBlockers(options);
  if (liveBlockers.length > 0) {
    return {
      ...common,
      status: "blocked",
      exitCode: 1,
      mode: "live_candidate",
      liveNetworkCallsMade: false,
      blockers: sortedUnique([...common.blockers, ...liveBlockers]),
      plannedOperations: plannedOperations.map((operation) => ({
        ...operation,
        status: "skipped"
      })),
      summary: "Live Microsoft 365 read-only smoke refused to run because one or more guardrails are not satisfied."
    };
  }

  return runLiveMicrosoft365ReadOnlySmoke(options, common, plannedOperations);
};

const runLiveMicrosoft365ReadOnlySmoke = async (
  options: RunMicrosoft365ReadOnlySmokeOptions,
  common: Omit<
    Microsoft365ReadOnlySmokeReport,
    "status" | "exitCode" | "mode" | "liveNetworkCallsMade" | "summary"
  >,
  plannedOperations: Microsoft365ReadOnlySmokeOperation[]
): Promise<Microsoft365ReadOnlySmokeReport> => {
  const now = options.now ?? (() => new Date());
  const smokeId = sanitizeMicrosoft365SmokeId(options.idFactory?.() ?? randomUUID());
  const organizationId = `org_puresoc_m45_${smokeId}`;
  const providerConnectionId = `m365_connection_m45_${smokeId}`;
  const tokenClient = options.tokenClient ?? createFetchMicrosoft365TokenClient();
  const tokenCipher = options.tokenCipher ?? createMicrosoft365TokenCipherFromEnv(options.env);
  const graphClient = new MicrosoftGraphClient({
    baseUrl: options.config.graphBaseUrl,
    httpClient: options.graphHttpClient
  });
  const store =
    options.store ??
    new InMemoryProviderResourceStore({
      now,
      idFactory: () => `m45_${sanitizeMicrosoft365SmokeId(randomUUID())}`
    });
  let operations = plannedOperations;

  try {
    operations = markMicrosoft365SmokeOperation(operations, "microsoft365.permission_metadata.validate", "passed", {
      readPermissionBundles: options.config.requestedPermissionBundles,
      readModuleCount: options.config.requestedModules.length,
      writeBundlesEnabled: false,
      writeScopesRequested: false
    });

    const token = await tokenClient({
      tenantId: options.config.tenantId,
      clientId: options.config.clientId,
      clientSecret: options.config.clientSecret,
      authorityHost: options.config.authorityHost
    });
    const grantedPermissions = [...new Set(token.grantedPermissions ?? decodeJwtRoles(token.accessToken))].sort();
    const tokenTenantId = token.tenantId ?? decodeJwtTenantId(token.accessToken);
    if (tokenTenantId && tokenTenantId !== options.config.tenantId) {
      throw new ProviderConnectorError("microsoft365_smoke_tenant_mismatch", "Microsoft 365 smoke token tenant mismatch.", {
        tokenTenantConfigured: true,
        callbackTenantConfigured: true
      });
    }
    operations = markMicrosoft365SmokeOperation(operations, "microsoft365.token.acquire_app_only", "passed", {
      tokenType: token.tokenType ?? "Bearer",
      expiresAtConfigured: Boolean(token.expiresAt || token.expiresIn),
      grantedPermissionCount: grantedPermissions.length,
      tokenReturnedToOutput: false,
      clientSecretReturnedToOutput: false
    });

    const credential: Microsoft365StoredCredential = {
      tenantId: options.config.tenantId,
      accessToken: token.accessToken,
      tokenType: token.tokenType ?? "Bearer",
      expiresAt: token.expiresAt ?? new Date(now().getTime() + (token.expiresIn ?? 3600) * 1000).toISOString(),
      grantedPermissions,
      requestedPermissionBundles: options.config.requestedPermissionBundles,
      consentedAt: now().toISOString()
    };
    const encryptedPayload = tokenCipher.encrypt(credential);
    const decryptedCredential = tokenCipher.decrypt<Microsoft365StoredCredential>(encryptedPayload);
    operations = markMicrosoft365SmokeOperation(operations, "microsoft365.credential_envelope.encrypt", "passed", {
      encryptedEnvelopeCreated: true,
      decryptedForReadOnlyPipeline: true,
      encryptedEnvelopeReturnedToOutput: false,
      accessTokenReturnedToOutput: false,
      refreshTokenStored: false
    });

    const connection = await store.createConnection({
      id: providerConnectionId,
      organizationId,
      providerKey: microsoft365ProviderKey,
      displayName: "Microsoft 365: PureSOC M45 disposable smoke",
      externalTenantId: options.config.tenantId,
      externalTenantName: "PureSOC M45 disposable smoke tenant",
      status: "connected",
      readEnabled: true,
      writeEnabled: false,
      metadata: {
        smoke: "puresoc_m45",
        requestedPermissionBundles: options.config.requestedPermissionBundles,
        grantedPermissionCount: grantedPermissions.length
      }
    });
    await store.upsertCredential({
      organizationId,
      providerConnectionId: connection.id,
      providerKey: microsoft365ProviderKey,
      credentialType: "oauth_token",
      encryptedPayload,
      expiresAt: credential.expiresAt,
      rotationRequired: false
    });
    for (const bundle of buildPermissionBundleInputs({
      organizationId,
      providerConnectionId: connection.id,
      requestedBundles: options.config.requestedPermissionBundles,
      grantedPermissions
    })) {
      await store.upsertPermissionBundle(bundle);
    }
    operations = markMicrosoft365SmokeOperation(operations, "microsoft365.provider_storage.seed_connection", "passed", {
      providerKey: microsoft365ProviderKey,
      readEnabled: connection.readEnabled,
      writeEnabled: connection.writeEnabled,
      credentialEnvelopePersisted: true,
      organizationScoped: true,
      tenantIdReturnedToOutput: false
    });

    const connector = createMicrosoft365Connector({
      clientId: options.config.clientId,
      graphClient,
      staticCredential: decryptedCredential,
      now
    });
    const pipelineResult = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId,
      providerConnectionId: connection.id,
      requestedModules: options.config.requestedModules,
      maxRetries: options.config.maxRetries,
      allowProviderWrites: false
    });
    operations = markMicrosoft365SmokeOperation(
      operations,
      "microsoft365.graph.read_only_modules",
      "passed",
      providerPipelineSmokeMetadata(pipelineResult)
    );

    return {
      ...common,
      status: "passed",
      exitCode: 0,
      mode: "live_candidate",
      liveNetworkCallsMade: true,
      plannedOperations: operations,
      summary:
        "Microsoft 365 read-only smoke completed against an explicitly confirmed disposable/test tenant. Output is sanitized and omits tokens, tenant payloads, endpoint URLs, and raw Graph data."
    };
  } catch (error) {
    const failedOperationId = operations.find((operation) => operation.status === "planned")?.id;
    if (failedOperationId) {
      operations = markMicrosoft365SmokeOperation(operations, failedOperationId, "failed", safeMicrosoft365SmokeErrorMetadata(error));
    }

    return {
      ...common,
      status: "failed",
      exitCode: 1,
      mode: "live_candidate",
      liveNetworkCallsMade: true,
      blockers: sortedUnique([...common.blockers, "microsoft365_read_only_smoke_failed"]),
      plannedOperations: operations.map((operation) =>
        operation.status === "planned"
          ? {
              ...operation,
              status: "skipped"
            }
          : operation
      ),
      summary:
        "Microsoft 365 read-only smoke attempted disposable Graph operations but did not complete. Failure metadata is generic and secret-free."
    };
  }
};

const microsoft365SmokeReportCommon = (
  options: RunMicrosoft365ReadOnlySmokeOptions,
  plannedOperations: Microsoft365ReadOnlySmokeOperation[]
): Omit<Microsoft365ReadOnlySmokeReport, "status" | "exitCode" | "mode" | "liveNetworkCallsMade" | "summary"> => ({
  schemaVersion: microsoft365ReadOnlySmokeSchemaVersion,
  command: microsoft365ReadOnlySmokeCommand,
  readinessStatus: options.readiness.status,
  secretValuesReturned: false,
  tokenValuesReturned: false,
  endpointUrlsReturned: false,
  tenantPayloadsReturned: false,
  providerWritesEnabled: false,
  writeScopesRequested: false,
  writeBundlesEnabled: false,
  target: {
    kind: options.readiness.target.kind,
    disposableConfirmation: options.readiness.target.disposableConfirmation
  },
  configuredEnvironmentVariables: [...options.readiness.configuredEnvironmentVariables].sort(),
  missingEnvironmentVariables: missingMicrosoft365SmokeEnvironmentVariables(options.readiness.requiredEnvironment),
  blockers: sortedUnique(options.readiness.blockers),
  guardrails: options.readiness.guardrails,
  plannedOperations,
  permissionMetadata: microsoft365SmokePermissionMetadata(options.readiness.metadata),
  runtimeMetadata: {
    authorityHostClass: classifyMicrosoft365SmokeEndpoint(options.config.authorityHost, "https://login.microsoftonline.com"),
    graphBaseUrlClass: classifyMicrosoft365SmokeEndpoint(options.config.graphBaseUrl, "https://graph.microsoft.com/v1.0"),
    requestedModuleCount: options.config.requestedModules.length,
    requestedPermissionBundleCount: options.config.requestedPermissionBundles.length,
    maxRetries: options.config.maxRetries,
    credentialEnvelopeUsed: true,
    providerStore: "in_memory_provider_neutral",
    providerWriteExecution: "disabled"
  }
});

const collectMicrosoft365LiveSmokeBlockers = (options: RunMicrosoft365ReadOnlySmokeOptions): string[] => {
  const env = options.env ?? process.env;
  const blockers = new Set<string>();
  const permissionMetadata = microsoft365SmokePermissionMetadata(options.readiness.metadata);

  if (options.readiness.status !== "ready_for_disposable_smoke") {
    blockers.add(`readiness_status_not_ready:${options.readiness.status}`);
  }

  if (env.PURESOC_EXTERNAL_SMOKE_MODE !== "live_candidate") {
    blockers.add("external_smoke_mode_not_live_candidate");
  }

  if (!isSafeMicrosoft365SmokeTarget(options.readiness.target.kind) || !options.readiness.target.disposableConfirmation) {
    blockers.add("external_smoke_disposable_target_not_confirmed");
  }

  if (env.PURESOC_EXTERNAL_SMOKE_MICROSOFT365 !== "true") {
    blockers.add("microsoft365_external_smoke_opt_in_missing");
  }

  if (!nonEmpty(options.config.clientId)) {
    blockers.add("microsoft365_client_id_missing");
  }

  if (!nonEmpty(options.config.clientSecret)) {
    blockers.add("microsoft365_client_secret_missing");
  }

  if (!nonEmpty(options.config.tenantId)) {
    blockers.add("microsoft365_tenant_id_missing");
  }

  if (classifyMicrosoft365SmokeEndpoint(options.config.authorityHost, "https://login.microsoftonline.com") !== "official_microsoft_public_cloud") {
    blockers.add("microsoft365_authority_host_not_official_public_cloud");
  }

  if (classifyMicrosoft365SmokeEndpoint(options.config.graphBaseUrl, "https://graph.microsoft.com/v1.0") !== "official_microsoft_public_cloud") {
    blockers.add("microsoft365_graph_base_url_not_official_public_cloud");
  }

  if (!permissionMetadata.allReadBundlesMarkedReadOnly) {
    blockers.add("microsoft365_read_bundle_metadata_not_read_only");
  }

  for (const writeBundle of microsoft365WritePermissionBundles) {
    if (!permissionMetadata.writePermissionBundlesDisabled.includes(writeBundle)) {
      blockers.add(`microsoft365_write_bundle_not_reported_disabled:${writeBundle}`);
    }
  }

  const requestedModuleSet = new Set(microsoft365ReadModules);
  for (const moduleKey of options.config.requestedModules) {
    if (!requestedModuleSet.has(moduleKey as Microsoft365ModuleKey)) {
      blockers.add(`microsoft365_requested_module_not_read_only:${moduleKey}`);
    }
  }

  const requestedBundleSet = new Set(microsoft365ReadPermissionBundles);
  for (const bundleKey of options.config.requestedPermissionBundles) {
    if (!requestedBundleSet.has(bundleKey)) {
      blockers.add(`microsoft365_requested_bundle_not_read_only:${bundleKey}`);
    }
  }

  return [...blockers].sort();
};

const createPlannedMicrosoft365SmokeOperations = (
  config: Microsoft365ReadOnlySmokeConfig
): Microsoft365ReadOnlySmokeOperation[] => [
  {
    id: "microsoft365.permission_metadata.validate",
    label: "Validate read-only permission bundle metadata and disabled write-bundle reporting.",
    graphPathPattern: null,
    performsNetworkInLiveMode: false,
    status: "planned",
    metadata: {
      requestedPermissionBundles: config.requestedPermissionBundles,
      writeBundlesEnabled: false,
      writeScopesRequested: false
    }
  },
  {
    id: "microsoft365.token.acquire_app_only",
    label: "Acquire an app-only Microsoft Graph token for the approved disposable/test tenant.",
    graphPathPattern: null,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      authorityHostClass: classifyMicrosoft365SmokeEndpoint(config.authorityHost, "https://login.microsoftonline.com"),
      scopeResource: "microsoft_graph_default",
      grantType: "client_credentials",
      tokenReturnedToOutput: false,
      clientSecretReturnedToOutput: false
    }
  },
  {
    id: "microsoft365.credential_envelope.encrypt",
    label: "Create and validate a local encrypted provider credential envelope without returning it.",
    graphPathPattern: null,
    performsNetworkInLiveMode: false,
    status: "planned",
    metadata: {
      encryptedEnvelopeReturnedToOutput: false,
      accessTokenReturnedToOutput: false,
      refreshTokenStored: false
    }
  },
  {
    id: "microsoft365.provider_storage.seed_connection",
    label: "Seed provider-neutral in-memory connection, permission-bundle, and credential records.",
    graphPathPattern: null,
    performsNetworkInLiveMode: false,
    status: "planned",
    metadata: {
      providerKey: microsoft365ProviderKey,
      organizationScoped: true,
      writeEnabled: false,
      tenantIdReturnedToOutput: false
    }
  },
  {
    id: "microsoft365.graph.read_only_modules",
    label: "Run read-only Microsoft Graph modules through the provider-neutral connector pipeline.",
    graphPathPattern: microsoft365SmokeGraphPathSummary(config.requestedModules),
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      graphBaseUrlClass: classifyMicrosoft365SmokeEndpoint(config.graphBaseUrl, "https://graph.microsoft.com/v1.0"),
      requestedModules: config.requestedModules,
      rawTenantPayloadsReturnedToOutput: false,
      userEmailsReturnedToOutput: false,
      providerWritesEnabled: false
    }
  }
];

const microsoft365SmokePermissionMetadata = (metadata: Record<string, unknown>) => {
  const permissionMetadata = asRecord(metadata.permissionMetadata);
  const readPermissionBundlesRaw = Array.isArray(permissionMetadata.readPermissionBundles)
    ? permissionMetadata.readPermissionBundles.map(asRecord)
    : [];
  const readModulesRaw = Array.isArray(permissionMetadata.readModules)
    ? permissionMetadata.readModules.map(asRecord)
    : [];
  const deferredReadModules = arrayOfStrings(permissionMetadata.deferredReadModules);
  const writePermissionBundlesDisabled = arrayOfStrings(permissionMetadata.writePermissionBundlesDisabled);

  return {
    providerKey: microsoft365ProviderKey as "microsoft365",
    readPermissionBundleKeys: readPermissionBundlesRaw
      .map((bundle) => stringValue(bundle.bundleKey))
      .filter(Boolean)
      .sort(),
    readModuleKeys: readModulesRaw.map((module) => stringValue(module.moduleKey)).filter(Boolean).sort(),
    deferredReadModules: [...deferredReadModules].sort(),
    writePermissionBundlesDisabled: [...writePermissionBundlesDisabled].sort(),
    allReadBundlesMarkedReadOnly:
      readPermissionBundlesRaw.length > 0 && readPermissionBundlesRaw.every((bundle) => bundle.readOnly === true)
  };
};

const providerPipelineSmokeMetadata = (result: ProviderPipelineResult): Record<string, unknown> => ({
  syncRunStatus: result.syncRun.status,
  moduleStatuses: Object.fromEntries(result.modules.map((module) => [module.moduleKey, module.status])),
  moduleStatusCounts: result.modules.reduce<Record<string, number>>((counts, module) => {
    counts[module.status] = (counts[module.status] ?? 0) + 1;
    return counts;
  }, {}),
  rawResourceCount: result.rawResources.length,
  normalizedResourceCount: result.normalizedResources.length,
  findingCount: result.findings.length,
  recommendationCount: result.recommendations.length,
  rawTenantPayloadsReturnedToOutput: false,
  userEmailsReturnedToOutput: false,
  endpointUrlsReturnedToOutput: false,
  providerWritesEnabled: false
});

const markMicrosoft365SmokeOperation = (
  operations: Microsoft365ReadOnlySmokeOperation[],
  id: string,
  status: Microsoft365ReadOnlySmokeOperationStatus,
  metadata: Record<string, unknown>
): Microsoft365ReadOnlySmokeOperation[] =>
  operations.map((operation) =>
    operation.id === id
      ? {
          ...operation,
          status,
          metadata: {
            ...operation.metadata,
            ...metadata
          }
        }
      : operation
  );

const missingMicrosoft365SmokeEnvironmentVariables = (
  requirements: Microsoft365ReadOnlySmokeEnvironmentRequirement[]
): string[] =>
  [...new Set(requirements.filter((requirement) => !requirement.configured).flatMap((requirement) => requirement.env))]
    .filter(Boolean)
    .sort();

const microsoft365SmokeGraphPathSummary = (requestedModules: string[]): string => {
  const paths = new Set<string>();

  for (const moduleKey of requestedModules) {
    if (moduleKey === "tenant-profile") {
      paths.add("/organization");
      paths.add("/domains");
    }
    if (moduleKey === "licensing") {
      paths.add("/subscribedSkus");
    }
    if (moduleKey === "users-groups-roles") {
      paths.add("/users");
      paths.add("/groups");
      paths.add("/directoryRoles");
    }
    if (moduleKey === "applications") {
      paths.add("/applications");
      paths.add("/servicePrincipals");
    }
    if (moduleKey === "conditional-access") {
      paths.add("/identity/conditionalAccess/policies");
    }
    if (moduleKey === "entra-audit-logs") {
      paths.add("/auditLogs/directoryAudits");
    }
    if (moduleKey === "entra-sign-in-logs") {
      paths.add("/auditLogs/signIns");
    }
    if (moduleKey === "secure-score") {
      paths.add("/security/secureScores");
    }
    if (moduleKey === "intune-devices") {
      paths.add("/deviceManagement/managedDevices");
    }
    if (moduleKey === "defender-xdr") {
      paths.add("/security/incidents");
      paths.add("/security/alerts_v2");
    }
  }

  return [...paths].sort().join(", ");
};

const safeMicrosoft365SmokeErrorMetadata = (error: unknown): Record<string, unknown> => {
  if (error instanceof ProviderConnectorError) {
    return {
      errorCode: error.code
    };
  }

  return {
    errorCode: "unexpected_error"
  };
};

const classifyMicrosoft365SmokeEndpoint = (value: string, expected: string): Microsoft365SmokeEndpointClass => {
  if (!nonEmpty(value)) {
    return "empty";
  }

  try {
    return new URL(value).toString().replace(/\/+$/g, "") === expected ? "official_microsoft_public_cloud" : "custom";
  } catch {
    return "custom";
  }
};

const firstConfiguredEnv = (env: NodeJS.ProcessEnv, names: string[]): string => {
  for (const name of names) {
    const value = env[name];
    if (nonEmpty(value)) {
      return value;
    }
  }

  return "";
};

const sortedUnique = (values: string[]): string[] => [...new Set(values.filter(Boolean))].sort();

const isSafeMicrosoft365SmokeTarget = (targetKind: string): boolean =>
  targetKind === "local" ||
  targetKind === "development" ||
  targetKind === "test" ||
  targetKind === "ci" ||
  targetKind === "disposable";

const sanitizeMicrosoft365SmokeId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "smoke";

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
