import { describe, expect, it } from "vitest";

import { AuditWriter, InMemoryAuditSink } from "@puresoc/audit";
import { InMemoryProviderResourceStore } from "@puresoc/providers-core";
import {
  createLocalMicrosoft365TokenCipher,
  createMicrosoft365Connector,
  permissionsForMicrosoft365Bundles,
  type Microsoft365StoredCredential
} from "@puresoc/provider-microsoft365";
import type { MicrosoftGraphHttpClient } from "@puresoc/provider-microsoft365";
import { Microsoft365ProviderConnectionService } from "../service";

const fixedNow = () => new Date("2026-04-28T10:00:00.000Z");
const tenantId = "11111111-1111-1111-1111-111111111111";
const baselinePermissions = permissionsForMicrosoft365Bundles(["m365_read_baseline"]);
const securityPermissions = permissionsForMicrosoft365Bundles(["m365_security_read"]);

const jwt = (roles: string[]): string => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tid: tenantId, roles })).toString("base64url");
  return `${header}.${payload}.signature`;
};

const graphHttpClient: MicrosoftGraphHttpClient = async (request) => {
  const url = new URL(request.url);

  if (url.pathname === "/v1.0/organization") {
    return {
      status: 200,
      body: {
        value: [{ id: tenantId, displayName: "Contoso PureSOC", verifiedDomains: ["contoso.onmicrosoft.com"] }]
      }
    };
  }

  if (url.pathname === "/v1.0/domains") {
    return {
      status: 200,
      body: {
        value: [{ id: "contoso.com", name: "contoso.com", isVerified: true }]
      }
    };
  }

  if (url.pathname === "/v1.0/security/secureScores") {
    return {
      status: 200,
      body: {
        value: [{ id: "score_1", currentScore: 80, maxScore: 100 }]
      }
    };
  }

  throw new Error(`Unhandled Graph fixture path: ${url.pathname}`);
};

describe("microsoft365 API consent and health service", () => {
  it("validates callback state, stores encrypted permission bundles, and reports health", async () => {
    const store = new InMemoryProviderResourceStore({ now: fixedNow });
    const auditSink = new InMemoryAuditSink();
    const auditWriter = new AuditWriter({ sink: auditSink, now: fixedNow });
    const tokenCipher = createLocalMicrosoft365TokenCipher({ masterKey: "api-test-master-key" });
    const accessToken = jwt([...baselinePermissions, ...securityPermissions]);
    const service = new Microsoft365ProviderConnectionService({
      store,
      auditWriter,
      now: fixedNow,
      stateFactory: () => "state_api_1",
      tokenCipher,
      createConnector: ({ credentialResolver, tokenCipher: connectorCipher }) =>
        createMicrosoft365Connector({
          clientId: "client-id",
          clientSecret: "client-secret",
          graphHttpClient,
          credentialResolver,
          tokenCipher: connectorCipher,
          tokenClient: async () => ({
            accessToken,
            tokenType: "Bearer",
            expiresIn: 3600,
            tenantId,
            grantedPermissions: [...baselinePermissions, ...securityPermissions]
          }),
          idFactory: () => "m365_api_connection_1",
          now: fixedNow
        })
    });

    const begin = await service.beginConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/m365/callback",
      requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"]
    });
    expect(begin.url).toContain("state_api_1");

    await expect(
      service.completeConsent({
        organizationId: "org_1",
        actorUserId: "user_1",
        state: "wrong_state",
        tenantId,
        adminConsent: true
      })
    ).rejects.toMatchObject({ code: "invalid_request" });

    const completed = await service.completeConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      state: begin.state,
      tenantId,
      adminConsent: true,
      redirectUri: "https://app.example.test/m365/callback"
    });
    const credentials = await store.listCredentials("org_1", completed.connection.id);
    const permissionBundles = await store.listPermissionBundles("org_1", completed.connection.id);
    const health = await service.getHealth("org_1", completed.connection.id);

    expect(credentials[0]?.encryptedPayload).not.toContain(accessToken);
    expect(tokenCipher.decrypt<Microsoft365StoredCredential>(credentials[0]?.encryptedPayload ?? "").accessToken).toBe(
      accessToken
    );
    expect(permissionBundles.find((bundle) => bundle.bundleKey === "m365_security_read")?.enabled).toBe(true);
    expect(completed.tenantProfileSync.modules[0]?.status).toBe("succeeded");
    expect(health.status).toBe("connected");
    expect(health.moduleStatuses.find((module) => module.moduleKey === "tenant-profile")?.status).toBe("succeeded");
    expect(auditSink.findByAction("provider_consent_completed")).toHaveLength(1);
    expect(JSON.stringify(auditSink.records)).not.toContain(accessToken);
  });
});
