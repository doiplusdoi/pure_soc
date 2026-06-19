import { describe, expect, it } from "vitest";

import {
  InMemoryProviderResourceStore,
  ProviderConnectorError,
  runProviderConnectorPipeline,
  type ProviderResourceStore
} from "@puresoc/providers-core";
import {
  createLocalMicrosoft365TokenCipher,
  createMicrosoft365Connector,
  createMicrosoft365FixtureConnector,
  microsoft365CoreDemoReadModules,
  permissionsForMicrosoft365Bundles,
  type Microsoft365CloudEnvironment,
  type Microsoft365StoredCredential
} from "../index";
import type { MicrosoftGraphHttpClient } from "../graph-client";

const fixedNow = () => new Date("2026-04-28T10:00:00.000Z");
const tenantId = "11111111-1111-1111-1111-111111111111";
const graphBaseUrl = "https://graph.microsoft.com/v1.0";
const baselinePermissions = permissionsForMicrosoft365Bundles(["m365_read_baseline"]);
const securityPermissions = permissionsForMicrosoft365Bundles(["m365_security_read"]);
const intunePermissions = permissionsForMicrosoft365Bundles(["m365_intune_read"]);

type GraphScenario = "healthy" | "paginated" | "throttled" | "no_intune_license" | "revoked" | "server_error";

const jwt = (input: { tid?: string; roles: string[] }): string => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tid: input.tid ?? tenantId, roles: input.roles })).toString("base64url");
  return `${header}.${payload}.signature`;
};

const createFixtureGraphHttpClient = (scenario: GraphScenario): MicrosoftGraphHttpClient => {
  let userAttempts = 0;

  return async (request) => {
    if (request.method !== "GET") {
      throw new Error(`Unexpected Graph method: ${request.method}`);
    }

    if (scenario === "revoked") {
      return { status: 401, body: { error: { code: "InvalidAuthenticationToken" } } };
    }

    if (scenario === "server_error") {
      return {
        status: 500,
        body: {
          error: {
            message: "fixture failure",
            authorization: request.headers.authorization,
            accessToken: "fixture_access_token"
          }
        }
      };
    }

    const url = new URL(request.url);
    const path = `${url.pathname}${url.search}`;

    if (url.pathname === "/v1.0/organization") {
      return {
        status: 200,
        body: {
          value: [
            {
              id: tenantId,
              displayName: "Contoso PureSOC",
              verifiedDomains: ["contoso.onmicrosoft.com"]
            }
          ]
        }
      };
    }

    if (url.pathname === "/v1.0/domains") {
      return {
        status: 200,
        body: {
          value: [
            { id: "contoso.com", name: "contoso.com", isVerified: true },
            { id: "contoso.onmicrosoft.com", name: "contoso.onmicrosoft.com", isVerified: true }
          ]
        }
      };
    }

    if (url.pathname === "/v1.0/subscribedSkus") {
      const servicePlans =
        scenario === "no_intune_license"
          ? [{ servicePlanName: "EXCHANGE_S_STANDARD" }]
          : [
              { servicePlanName: "AAD_PREMIUM" },
              { servicePlanName: "INTUNE_A" },
              { servicePlanName: "DEFENDER_XDR" }
            ];
      return {
        status: 200,
        body: {
          value: [
            {
              skuId: "sku_e5",
              skuPartNumber: "ENTERPRISEPREMIUM",
              servicePlans
            }
          ]
        }
      };
    }

    if (url.pathname === "/v1.0/users" && scenario === "throttled" && userAttempts < 2) {
      userAttempts += 1;
      return { status: 429, headers: { "retry-after": "1" }, body: { error: { message: "retry later" } } };
    }

    if (url.pathname === "/v1.0/users") {
      if (scenario === "paginated" && url.searchParams.get("page") !== "2") {
        return {
          status: 200,
          body: {
            value: [user("user_page_1", "Page One")],
            "@odata.nextLink": `${graphBaseUrl}/users?page=2`
          }
        };
      }

      const users = scenario === "paginated" ? [user("user_page_2", "Page Two")] : [user("admin_1", "Admin User")];
      return { status: 200, body: { value: users } };
    }

    if (url.pathname === "/v1.0/groups") {
      return {
        status: 200,
        body: {
          value: [{ id: "group_1", displayName: "Security Team", groupTypes: [], securityEnabled: true }]
        }
      };
    }

    if (url.pathname === "/v1.0/directoryRoles") {
      return {
        status: 200,
        body: {
          value: [{ id: "role_global_admin", displayName: "Global Administrator" }]
        }
      };
    }

    if (url.pathname === "/v1.0/directoryRoles/role_global_admin/members") {
      return {
        status: 200,
        body: {
          value: [{ id: "admin_1", displayName: "Admin User", userPrincipalName: "admin@contoso.com" }]
        }
      };
    }

    if (path.startsWith("/v1.0/reports/authenticationMethods/userRegistrationDetails")) {
      return {
        status: 200,
        body: {
          value: [
            {
              id: "admin_1",
              userPrincipalName: "admin@contoso.com",
              userDisplayName: "Admin User",
              isMfaRegistered: true,
              isMfaCapable: true,
              isSsprRegistered: true,
              isSsprCapable: true,
              methodsRegistered: ["microsoftAuthenticatorPush"]
            },
            {
              id: "user_without_mfa",
              userPrincipalName: "user_without_mfa@contoso.com",
              userDisplayName: "User Without MFA",
              isMfaRegistered: false,
              isMfaCapable: false,
              isSsprRegistered: false,
              isSsprCapable: false,
              methodsRegistered: []
            }
          ]
        }
      };
    }

    if (url.pathname === "/v1.0/applications") {
      return {
        status: 200,
        body: {
          value: [
            {
              id: "app_1",
              appId: "client-app-1",
              displayName: "Line of Business App",
              passwordCredentials: [{ endDateTime: "2026-06-01T00:00:00.000Z" }],
              requiredResourceAccess: [{ resourceAppId: "00000003-0000-0000-c000-000000000000" }]
            }
          ]
        }
      };
    }

    if (url.pathname === "/v1.0/servicePrincipals") {
      return {
        status: 200,
        body: {
          value: [{ id: "sp_1", appId: "client-app-1", displayName: "Line of Business App SP" }]
        }
      };
    }

    if (path.startsWith("/v1.0/identity/conditionalAccess/policies")) {
      return {
        status: 200,
        body: {
          value: [
            {
              id: "ca_policy_1",
              displayName: "Require MFA for admins",
              state: "enabled",
              conditions: { users: { includeRoles: ["global-admin-role"] } },
              grantControls: { builtInControls: ["mfa"] }
            }
          ]
        }
      };
    }

    if (path.startsWith("/v1.0/auditLogs/directoryAudits")) {
      return {
        status: 200,
        body: {
          value: [
            {
              id: "audit_1",
              activityDateTime: "2026-04-28T09:55:00.000Z",
              activityDisplayName: "Add member to role",
              category: "RoleManagement",
              result: "success",
              initiatedBy: { user: { userPrincipalName: "admin@contoso.com" } },
              targetResources: [{ id: "admin_1", type: "User" }]
            }
          ]
        }
      };
    }

    if (path.startsWith("/v1.0/auditLogs/signIns")) {
      return {
        status: 200,
        body: {
          value: [
            {
              id: "signin_1",
              createdDateTime: "2026-04-28T09:50:00.000Z",
              userPrincipalName: "admin@contoso.com",
              userDisplayName: "Admin User",
              appDisplayName: "Microsoft Azure Portal",
              ipAddress: "203.0.113.10",
              conditionalAccessStatus: "success",
              riskLevelAggregated: "none",
              status: { errorCode: 0 }
            }
          ]
        }
      };
    }

    if (path.startsWith("/v1.0/security/secureScores")) {
      return {
        status: 200,
        body: {
          value: [{ id: "score_1", currentScore: 72, maxScore: 100 }]
        }
      };
    }

    if (path.startsWith("/v1.0/security/incidents")) {
      return {
        status: 200,
        body: {
          value: [
            {
              id: "incident_1",
              displayName: "Endpoint malware incident",
              severity: "high",
              status: "active",
              assignedTo: "security@contoso.com",
              incidentWebUrl: "https://security.microsoft.com/incidents/incident_1",
              lastUpdateDateTime: "2026-04-28T09:45:00.000Z"
            }
          ]
        }
      };
    }

    if (path.startsWith("/v1.0/security/alerts_v2")) {
      return {
        status: 200,
        body: {
          value: [
            {
              id: "alert_1",
              incidentId: "incident_1",
              title: "Suspicious PowerShell execution",
              severity: "high",
              status: "new",
              serviceSource: "microsoftDefenderForEndpoint",
              alertWebUrl: "https://security.microsoft.com/alerts/alert_1",
              lastUpdateDateTime: "2026-04-28T09:42:00.000Z"
            }
          ]
        }
      };
    }

    if (path.startsWith("/v1.0/deviceManagement/managedDevices")) {
      return {
        status: 200,
        body: {
          value: [{ id: "device_1", deviceName: "Laptop 1", complianceState: "compliant" }]
        }
      };
    }

    throw new Error(`Unhandled Graph fixture path: ${path}`);
  };
};

const user = (id: string, displayName: string) => ({
  id,
  userPrincipalName: `${id}@contoso.com`,
  displayName,
  accountEnabled: true,
  userType: "Member"
});

const createCredential = (
  roles: string[],
  options: { cloudEnvironment?: Microsoft365CloudEnvironment } = {}
): Microsoft365StoredCredential => ({
  tenantId,
  accessToken: jwt({ roles }),
  tokenType: "Bearer",
  expiresAt: "2026-04-28T11:00:00.000Z",
  grantedPermissions: roles,
  requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"],
  consentedAt: "2026-04-28T10:00:00.000Z",
  cloudEnvironment: options.cloudEnvironment
});

const createConnectedStore = async (input: {
  store?: ProviderResourceStore;
  credential: Microsoft365StoredCredential;
}) => {
  const store = input.store ?? new InMemoryProviderResourceStore({ now: fixedNow });
  const connection = await store.createConnection({
    id: "m365_connection_1",
    organizationId: "org_1",
    providerKey: "microsoft365",
    displayName: "Microsoft 365: Contoso",
    externalTenantId: tenantId,
    externalTenantName: "Contoso PureSOC",
    metadata: {
      grantedPermissions: input.credential.grantedPermissions
    }
  });

  return { store, connection };
};

describe("microsoft365 consent graph sync permissions redaction", () => {
  it("generates a read-only Microsoft admin-consent URL and rejects write bundles", async () => {
    expect(baselinePermissions).toEqual(expect.arrayContaining(["Policy.Read.All", "AuditLog.Read.All"]));
    expect(securityPermissions).toEqual(expect.arrayContaining(["SecurityAlert.Read.All"]));

    const connector = createMicrosoft365Connector({
      clientId: "client-id",
      clientSecret: "client-secret",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      now: fixedNow
    });

    const redirect = await connector.beginConnection({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/m365/callback",
      state: "state_123",
      requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"]
    });
    const url = new URL(redirect.url);

    expect(url.pathname).toBe("/organizations/v2.0/adminconsent");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("scope")).toBe("https://graph.microsoft.com/.default");
    expect(url.searchParams.get("state")).toBe("state_123");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.test/m365/callback");
    await expect(
      connector.beginConnection({
        organizationId: "org_1",
        actorUserId: "user_1",
        redirectUri: "https://app.example.test/m365/callback",
        state: "state_123",
        requestedPermissionBundles: ["m365_remediation_write"]
      })
    ).rejects.toMatchObject({ code: "microsoft365_write_bundle_disabled" });
  });

  it("validates callback tenant, encrypts token storage, and records permission bundles", async () => {
    const cipher = createLocalMicrosoft365TokenCipher({ masterKey: "test-master-key" });
    const accessToken = jwt({ roles: [...baselinePermissions, ...securityPermissions] });
    const connector = createMicrosoft365Connector({
      clientId: "client-id",
      clientSecret: "client-secret",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      tokenCipher: cipher,
      tokenClient: async () => ({
        accessToken,
        tokenType: "Bearer",
        expiresIn: 3600,
        tenantId,
        grantedPermissions: [...baselinePermissions, ...securityPermissions]
      }),
      idFactory: () => "m365_connection_1",
      now: fixedNow
    });

    const result = await connector.completeConnection({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/m365/callback",
      state: "state_123",
      metadata: {
        tenantId,
        adminConsent: true,
        requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"]
      }
    });

    expect(result.connection.writeEnabled).toBe(false);
    expect(result.tenantProfile?.normalizedJson.displayName).toBe("Contoso PureSOC");
    expect(result.permissionBundles?.find((bundle) => bundle.bundleKey === "m365_security_read")?.enabled).toBe(true);
    expect(result.credentials?.[0]?.encryptedPayload).not.toContain(accessToken);
    expect(cipher.decrypt<Microsoft365StoredCredential>(result.credentials?.[0]?.encryptedPayload ?? "").accessToken).toBe(
      accessToken
    );

    const mismatchedConnector = createMicrosoft365Connector({
      clientId: "client-id",
      clientSecret: "client-secret",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      tokenClient: async () => ({
        accessToken: jwt({ tid: "22222222-2222-2222-2222-222222222222", roles: baselinePermissions }),
        tenantId: "22222222-2222-2222-2222-222222222222",
        grantedPermissions: baselinePermissions
      }),
      now: fixedNow
    });
    await expect(
      mismatchedConnector.completeConnection({
        organizationId: "org_1",
        actorUserId: "user_1",
        redirectUri: "https://app.example.test/m365/callback",
        state: "state_123",
        metadata: { tenantId, adminConsent: true, requestedPermissionBundles: ["m365_read_baseline"] }
      })
    ).rejects.toMatchObject({ code: "microsoft365_tenant_mismatch" });
  });

  it("rejects live consent tokens that include Microsoft Graph write app roles", async () => {
    const connector = createMicrosoft365Connector({
      clientId: "client-id",
      clientSecret: "client-secret",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      tokenClient: async () => ({
        accessToken: jwt({ roles: [...baselinePermissions, "User.ReadWrite.All"] }),
        tokenType: "Bearer",
        expiresIn: 3600,
        tenantId,
        grantedPermissions: [...baselinePermissions, "User.ReadWrite.All"]
      }),
      now: fixedNow
    });

    await expect(
      connector.completeConnection({
        organizationId: "org_1",
        actorUserId: "user_1",
        redirectUri: "https://app.example.test/m365/callback",
        state: "state_123",
        metadata: {
          tenantId,
          adminConsent: true,
          requestedPermissionBundles: ["m365_read_baseline"]
        }
      })
    ).rejects.toMatchObject({
      code: "microsoft365_write_permission_granted_disabled",
      details: {
        writePermissions: ["User.ReadWrite.All"]
      }
    });
  });

  it("syncs tenant, license, identity, policy, audit, sign-in, app, and secure score modules through mocked Graph", async () => {
    const credential = createCredential([...baselinePermissions, ...securityPermissions]);
    const { store, connection } = await createConnectedStore({ credential });
    const connector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      staticCredential: credential,
      now: fixedNow
    });

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id
    });

    expect(result.syncRun.status).toBe("succeeded");
    expect(result.rawResources.some((resource) => resource.externalResourceType === "subscribedSku")).toBe(true);
    expect(result.normalizedResources.some((resource) => resource.resourceType === "cloud_user")).toBe(true);
    expect(result.normalizedResources.some((resource) => resource.resourceType === "cloud_application")).toBe(true);
    expect(result.normalizedResources.some((resource) => resource.resourceType === "cloud_policy")).toBe(true);
    expect(result.rawResources.some((resource) => resource.externalResourceType === "mfaRegistrationDetail")).toBe(true);
    expect(result.findings.some((finding) => finding.findingKey === "mfa_registration_gap")).toBe(true);
    expect(result.rawResources.some((resource) => resource.externalResourceType === "directoryAudit")).toBe(true);
    expect(result.rawResources.some((resource) => resource.externalResourceType === "signIn")).toBe(true);
    expect(result.normalizedResources.some((resource) => resource.resourceType === "cloud_secure_score")).toBe(true);
  });

  it("runs the five-module partner-demo fixture connector through the same pipeline without Microsoft credentials", async () => {
    const store = new InMemoryProviderResourceStore({ now: fixedNow });
    const cipher = createLocalMicrosoft365TokenCipher({ masterKey: "fixture-test-master-key" });
    const connector = createMicrosoft365FixtureConnector({
      tokenCipher: cipher,
      credentialResolver: async (input) => {
        const credential = (await store.listCredentials(input.organizationId, input.providerConnectionId))[0];
        return cipher.decrypt<Microsoft365StoredCredential>(credential?.encryptedPayload ?? "");
      },
      idFactory: () => "m365_fixture_connection_1",
      now: fixedNow
    });
    const redirect = await connector.beginConnection({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      state: "fixture_state",
      requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"]
    });
    const callbackUrl = new URL(redirect.url);
    const connectionResult = await connector.completeConnection({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      state: callbackUrl.searchParams.get("state") ?? "",
      metadata: {
        tenantId: callbackUrl.searchParams.get("tenant"),
        adminConsent: callbackUrl.searchParams.get("admin_consent"),
        requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"]
      }
    });

    await store.createConnection(connectionResult.connection);
    for (const credential of connectionResult.credentials ?? []) {
      await store.upsertCredential(credential);
    }
    for (const bundle of connectionResult.permissionBundles ?? []) {
      await store.upsertPermissionBundle(bundle);
    }

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connectionResult.connection.id,
      requestedModules: [...microsoft365CoreDemoReadModules]
    });

    expect(callbackUrl.origin).toBe("https://app.example.test");
    expect(connectionResult.connection.metadata.connectorMode).toBe("fixture");
    expect(result.modules.map((module) => module.moduleKey)).toEqual([...microsoft365CoreDemoReadModules]);
    expect(result.syncRun.status).toBe("succeeded");
    expect(result.rawResources.some((resource) => resource.externalResourceType === "mfaRegistrationDetail")).toBe(true);
    expect(result.normalizedResources.some((resource) => resource.resourceType === "cloud_secure_score")).toBe(true);
  });

  it("syncs Defender XDR incidents and alerts into provider-neutral resources, findings, and manual recommendations", async () => {
    const credential = createCredential([...baselinePermissions, ...securityPermissions]);
    const { store, connection } = await createConnectedStore({ credential });
    const connector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      staticCredential: credential,
      now: fixedNow
    });

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id,
      requestedModules: ["licensing", "defender-xdr"]
    });

    expect(result.modules.find((module) => module.moduleKey === "defender-xdr")?.status).toBe("succeeded");
    expect(result.rawResources.some((resource) => resource.externalResourceType === "incident")).toBe(true);
    expect(result.rawResources.some((resource) => resource.externalResourceType === "securityAlert")).toBe(true);
    expect(result.normalizedResources.some((resource) => resource.resourceType === "cloud_incident")).toBe(true);
    expect(result.normalizedResources.some((resource) => resource.resourceType === "cloud_security_alert")).toBe(true);
    expect(result.findings.map((finding) => finding.evidence.signalKey)).toEqual(
      expect.arrayContaining(["high_severity_incident", "high_severity_alert"])
    );
    expect(result.recommendations[0]).toMatchObject({
      title: "Triage high severity Defender incident",
      automationMode: "manual",
      requiredPermissions: ["SecurityIncident.Read.All"],
      requiredLicense: ["DEFENDER_XDR"]
    });
  });

  it("handles Graph pagination through nextLink fixtures", async () => {
    const credential = createCredential(baselinePermissions);
    const { store, connection } = await createConnectedStore({ credential });
    const connector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("paginated"),
      staticCredential: credential,
      now: fixedNow
    });

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id,
      requestedModules: ["users-groups-roles"]
    });

    expect(result.modules[0]?.pagesRead).toBeGreaterThan(3);
    expect(result.rawResources.filter((resource) => resource.externalResourceType === "user")).toHaveLength(2);
  });

  it("retries throttled Graph reads using fixture Retry-After responses", async () => {
    const credential = createCredential(baselinePermissions);
    const { store, connection } = await createConnectedStore({ credential });
    const connector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("throttled"),
      staticCredential: credential,
      now: fixedNow
    });

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id,
      requestedModules: ["users-groups-roles"],
      maxRetries: 3
    });

    expect(result.modules[0]?.status).toBe("succeeded");
    expect(result.modules[0]?.retryCount).toBe(2);
  });

  it("records missing permission, missing license, and revoked consent as module statuses", async () => {
    const permissionCredential = createCredential(baselinePermissions);
    const { store: permissionStore, connection: permissionConnection } = await createConnectedStore({
      credential: permissionCredential
    });
    const permissionConnector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      staticCredential: permissionCredential,
      now: fixedNow
    });
    const permissionResult = await runProviderConnectorPipeline({
      connector: permissionConnector,
      store: permissionStore,
      organizationId: "org_1",
      providerConnectionId: permissionConnection.id,
      requestedModules: ["secure-score"]
    });
    expect(permissionResult.modules[0]?.status).toBe("missing_permission");
    expect(permissionResult.modules[0]?.missingPermissions).toEqual(["SecurityEvents.Read.All"]);

    const licenseCredential = createCredential([...baselinePermissions, ...intunePermissions]);
    const { store: licenseStore, connection: licenseConnection } = await createConnectedStore({
      credential: licenseCredential
    });
    const licenseConnector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("no_intune_license"),
      staticCredential: licenseCredential,
      now: fixedNow
    });
    const licenseResult = await runProviderConnectorPipeline({
      connector: licenseConnector,
      store: licenseStore,
      organizationId: "org_1",
      providerConnectionId: licenseConnection.id,
      requestedModules: ["licensing", "intune-devices"]
    });
    expect(licenseResult.modules.find((module) => module.moduleKey === "intune-devices")?.status).toBe(
      "unavailable_license"
    );
    expect(licenseResult.modules.find((module) => module.moduleKey === "intune-devices")?.missingLicenses).toEqual([
      "INTUNE_A"
    ]);

    const revokedCredential = createCredential(baselinePermissions);
    const { store: revokedStore, connection: revokedConnection } = await createConnectedStore({
      credential: revokedCredential
    });
    const revokedConnector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("revoked"),
      staticCredential: revokedCredential,
      now: fixedNow
    });
    const revokedResult = await runProviderConnectorPipeline({
      connector: revokedConnector,
      store: revokedStore,
      organizationId: "org_1",
      providerConnectionId: revokedConnection.id,
      requestedModules: ["tenant-profile"]
    });
    expect(revokedResult.modules[0]?.status).toBe("revoked_consent");
  });

  it("records Defender missing alert permission, unsupported posture modules, national-cloud limits, and connector errors", async () => {
    const defenderMissingPermissionCredential = createCredential([
      ...baselinePermissions,
      "SecurityEvents.Read.All",
      "SecurityIncident.Read.All"
    ]);
    const { store: permissionStore, connection: permissionConnection } = await createConnectedStore({
      credential: defenderMissingPermissionCredential
    });
    const permissionConnector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      staticCredential: defenderMissingPermissionCredential,
      now: fixedNow
    });
    const permissionResult = await runProviderConnectorPipeline({
      connector: permissionConnector,
      store: permissionStore,
      organizationId: "org_1",
      providerConnectionId: permissionConnection.id,
      requestedModules: ["licensing", "defender-xdr"]
    });
    expect(permissionResult.modules.find((module) => module.moduleKey === "defender-xdr")?.status).toBe(
      "missing_permission"
    );
    expect(permissionResult.modules.find((module) => module.moduleKey === "defender-xdr")?.missingPermissions).toEqual([
      "SecurityAlert.Read.All"
    ]);

    const unsupportedCredential = createCredential(baselinePermissions);
    const { store: unsupportedStore, connection: unsupportedConnection } = await createConnectedStore({
      credential: unsupportedCredential
    });
    const unsupportedConnector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      staticCredential: unsupportedCredential,
      now: fixedNow
    });
    const unsupportedResult = await runProviderConnectorPipeline({
      connector: unsupportedConnector,
      store: unsupportedStore,
      organizationId: "org_1",
      providerConnectionId: unsupportedConnection.id,
      requestedModules: ["exchange-posture"]
    });
    expect(unsupportedResult.modules[0]).toMatchObject({
      moduleKey: "exchange-posture",
      status: "unsupported_api"
    });

    const chinaCredential = createCredential([...baselinePermissions, ...securityPermissions], { cloudEnvironment: "china" });
    const { store: chinaStore, connection: chinaConnection } = await createConnectedStore({ credential: chinaCredential });
    const chinaConnector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("healthy"),
      staticCredential: chinaCredential,
      now: fixedNow
    });
    const chinaResult = await runProviderConnectorPipeline({
      connector: chinaConnector,
      store: chinaStore,
      organizationId: "org_1",
      providerConnectionId: chinaConnection.id,
      requestedModules: ["secure-score", "defender-xdr"]
    });
    expect(chinaResult.modules.map((module) => module.status)).toEqual(["unsupported_api", "unsupported_api"]);
    expect(chinaResult.modules[0]?.statusReason).toContain("china");

    const failedCredential = createCredential(baselinePermissions);
    const { store: failedStore, connection: failedConnection } = await createConnectedStore({ credential: failedCredential });
    const failedConnector = createMicrosoft365Connector({
      clientId: "client-id",
      graphHttpClient: createFixtureGraphHttpClient("server_error"),
      staticCredential: failedCredential,
      now: fixedNow
    });
    const failedResult = await runProviderConnectorPipeline({
      connector: failedConnector,
      store: failedStore,
      organizationId: "org_1",
      providerConnectionId: failedConnection.id,
      requestedModules: ["tenant-profile"]
    });
    expect(failedResult.modules[0]?.status).toBe("failed");
    expect(JSON.stringify(failedResult)).not.toContain("fixture_access_token");
    expect(JSON.stringify(failedResult)).not.toContain(failedCredential.accessToken);
  });

  it("redacts OAuth codes, access tokens, authorization headers, and refresh tokens from errors", async () => {
    const error = new ProviderConnectorError("m365_test", "failure", {
      oauthCode: "code_secret",
      accessToken: "access_secret",
      refreshToken: "refresh_secret",
      headers: {
        authorization: "Bearer auth_secret"
      }
    });
    const serialized = JSON.stringify(error);

    expect(serialized).not.toContain("code_secret");
    expect(serialized).not.toContain("access_secret");
    expect(serialized).not.toContain("refresh_secret");
    expect(serialized).not.toContain("auth_secret");
  });
});
