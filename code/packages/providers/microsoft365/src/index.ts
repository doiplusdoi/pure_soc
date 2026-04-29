import { randomUUID } from "node:crypto";

import {
  assertReadOnlyProviderOperation,
  emptyProviderModuleSyncResult,
  ProviderConnectorError,
  redactProviderSecrets,
  type CloudProviderConnector,
  type CompleteConnectionInput,
  type ConnectionRedirect,
  type ProviderCapabilityRecord,
  type ProviderConnectionRecord,
  type ProviderConnectionResult,
  type ProviderCredentialInput,
  type ProviderFindingInput,
  type ProviderModuleSyncResult,
  type ProviderNormalizedResourceInput,
  type ProviderPermissionBundleInput,
  type ProviderRawResourceInput,
  type SyncInput,
  type TenantProfileInput
} from "../../core/src/index";
import { createLocalMicrosoft365TokenCipher, type Microsoft365TokenCipher } from "./crypto";
import { MicrosoftGraphClient, type MicrosoftGraphHttpClient } from "./graph-client";
import {
  microsoft365DefaultReadModules,
  microsoft365ModuleRequirements,
  microsoft365PermissionBundles,
  microsoft365ProviderKey,
  microsoft365ReadModules,
  normalizeMicrosoft365RequestedBundles,
  permissionsForMicrosoft365Bundles,
  missingPermissions,
  type Microsoft365ModuleKey,
  type Microsoft365ReadPermissionBundleKey
} from "./permissions";

export {
  microsoft365DefaultReadModules,
  microsoft365ModuleRequirements,
  microsoft365PermissionBundles,
  microsoft365ProviderKey,
  microsoft365ReadModules,
  microsoft365ReadPermissionBundles,
  microsoft365WritePermissionBundles,
  normalizeMicrosoft365RequestedBundles,
  permissionsForMicrosoft365Bundles,
  type Microsoft365ModuleKey,
  type Microsoft365PermissionBundleKey,
  type Microsoft365ReadPermissionBundleKey,
  type Microsoft365WritePermissionBundleKey
} from "./permissions";
export { MicrosoftGraphClient, type MicrosoftGraphHttpClient, type MicrosoftGraphResponse } from "./graph-client";
export { createLocalMicrosoft365TokenCipher, type Microsoft365TokenCipher } from "./crypto";

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
const defaultTokenKey = "local-dev-provider-token-key-change-me";

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
  const tokenCipher =
    options.tokenCipher ??
    createLocalMicrosoft365TokenCipher({ masterKey: process.env.PURESOC_PROVIDER_TOKEN_KEY ?? defaultTokenKey });
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
    providerKey: microsoft365ProviderKey,
    beginConnection: async (input): Promise<ConnectionRedirect> => {
      if (!options.clientId) {
        throw new ProviderConnectorError("microsoft365_client_id_missing", "Microsoft 365 client ID is not configured.");
      }

      const requestedBundles = normalizeMicrosoft365RequestedBundles(input.requestedPermissionBundles);
      const url = new URL(`${authorityHost}/common/adminconsent`);
      url.searchParams.set("client_id", options.clientId);
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
      const requested = new Set(input.requestedModules ?? microsoft365DefaultReadModules);
      const modules = microsoft365ReadModules.filter((moduleKey) => requested.has(moduleKey));
      const detectedLicenses = new Set<string>();
      const results: ProviderModuleSyncResult[] = [];

      for (const moduleKey of modules) {
        const requirement = microsoft365ModuleRequirements[moduleKey];
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
    path: "/security/incidents",
    accessToken: input.credential.accessToken,
    maxRetries: input.maxRetries
  });
  const rawResources = incidents.items.map((incident) => raw(input, "incident", stringValue(incident.id), incident));
  const normalizedResources = incidents.items.map((incident) =>
    normalized(input, "incident", stringValue(incident.id), "cloud_incident", {
      title: stringValue(incident.displayName) || stringValue(incident.title),
      severity: severityValue(incident.severity),
      status: stringValue(incident.status)
    })
  );

  return succeeded(input, rawResources, normalizedResources, incidents.pagesRead, incidents.retryCount);
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
  findings: ProviderFindingInput[] = []
): ProviderModuleSyncResult => ({
  moduleKey: input.moduleKey,
  status: "succeeded",
  missingPermissions: [],
  missingLicenses: [],
  rawResources,
  normalizedResources,
  findings,
  recommendations: [],
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
