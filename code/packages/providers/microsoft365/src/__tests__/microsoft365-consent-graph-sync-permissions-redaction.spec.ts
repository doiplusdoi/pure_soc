import { describe, expect, it } from "vitest";

import {
  InMemoryProviderResourceStore,
  ProviderConnectorError,
  runProviderConnectorPipeline,
  type ProviderResourceStore
} from "../../../core/src/index";
import {
  createLocalMicrosoft365TokenCipher,
  createMicrosoft365Connector,
  permissionsForMicrosoft365Bundles,
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

    if (path.startsWith("/v1.0/security/secureScores")) {
      return {
        status: 200,
        body: {
          value: [{ id: "score_1", currentScore: 72, maxScore: 100 }]
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

const createCredential = (roles: string[]): Microsoft365StoredCredential => ({
  tenantId,
  accessToken: jwt({ roles }),
  tokenType: "Bearer",
  expiresAt: "2026-04-28T11:00:00.000Z",
  grantedPermissions: roles,
  requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"],
  consentedAt: "2026-04-28T10:00:00.000Z"
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

    expect(url.pathname).toBe("/common/adminconsent");
    expect(url.searchParams.get("client_id")).toBe("client-id");
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

  it("syncs tenant, license, users, groups, roles, apps, and secure score through mocked Graph", async () => {
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
    expect(result.normalizedResources.some((resource) => resource.resourceType === "cloud_secure_score")).toBe(true);
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
