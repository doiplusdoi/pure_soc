import { describe, expect, it } from "vitest";

import { AuditWriter, InMemoryAuditSink } from "@puresoc/audit";
import { InMemoryProviderConsentStateStore } from "@puresoc/database";
import { InMemoryProviderResourceStore } from "@puresoc/providers-core";
import {
  createLocalMicrosoft365TokenCipher,
  createMicrosoft365Connector,
  microsoft365CoreDemoReadModules,
  permissionsForMicrosoft365Bundles,
  type Microsoft365CredentialResolver,
  type Microsoft365TokenCipher,
  type Microsoft365StoredCredential
} from "@puresoc/provider-microsoft365";
import type { MicrosoftGraphHttpClient } from "@puresoc/provider-microsoft365";
import { Microsoft365ProviderConnectionService } from "../service";

const fixedNow = () => new Date("2026-04-28T10:00:00.000Z");
const tenantId = "11111111-1111-1111-1111-111111111111";
const baselinePermissions = permissionsForMicrosoft365Bundles(["m365_read_baseline"]);
const securityPermissions = permissionsForMicrosoft365Bundles(["m365_security_read"]);
const remediationWritePermissions = permissionsForMicrosoft365Bundles(["m365_remediation_write"]);

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

const forbiddenGraphHttpClient: MicrosoftGraphHttpClient = async () => ({
  status: 403,
  body: { error: { code: "Authorization_RequestDenied" } }
});

describe("microsoft365 API consent and health service", () => {
  it("keeps Microsoft 365 onboarding service available and reports missing connector app configuration", async () => {
    const service = new Microsoft365ProviderConnectionService({
      auditWriter: new AuditWriter({
        sink: new InMemoryAuditSink(),
        now: fixedNow
      }),
      now: fixedNow,
      stateFactory: () => "state_missing_client",
      connectorApp: {
        clientId: ""
      }
    });

    await expect(
      service.beginConsent({
        organizationId: "org_default",
        actorUserId: "user_default",
        redirectUri: "https://app.example.test/providers/microsoft365/callback"
      })
    ).rejects.toMatchObject({
      code: "microsoft365_client_id_missing",
      message: "Microsoft 365 client ID is not configured."
    });
  });

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
    expect(JSON.stringify(completed)).not.toContain(accessToken);
    expect(permissionBundles.find((bundle) => bundle.bundleKey === "m365_security_read")?.enabled).toBe(true);
    expect(completed.tenantProfileSync.modules[0]?.status).toBe("succeeded");
    expect(health.status).toBe("connected");
    expect(health.moduleStatuses.find((module) => module.moduleKey === "tenant-profile")?.status).toBe("succeeded");
    expect(auditSink.findByAction("provider_consent_completed")).toHaveLength(1);
    expect(JSON.stringify(auditSink.records)).not.toContain(accessToken);
    expect(JSON.stringify(auditSink.records)).not.toContain("client-secret");
  });

  it("completes Microsoft admin consent after a fresh API service instance consumes persisted state", async () => {
    const store = new InMemoryProviderResourceStore({ now: fixedNow });
    const consentStates = new InMemoryProviderConsentStateStore({ now: fixedNow });
    const auditWriter = new AuditWriter({
      sink: new InMemoryAuditSink(),
      now: fixedNow
    });
    const tokenCipher = createLocalMicrosoft365TokenCipher({ masterKey: "api-test-master-key" });
    const accessToken = jwt(baselinePermissions);
    const createConnector = (input: {
      credentialResolver: Microsoft365CredentialResolver;
      tokenCipher: Microsoft365TokenCipher;
    }) =>
      createMicrosoft365Connector({
        clientId: "client-id",
        clientSecret: "client-secret",
        graphHttpClient,
        credentialResolver: input.credentialResolver,
        tokenCipher: input.tokenCipher,
        tokenClient: async () => ({
          accessToken,
          tokenType: "Bearer",
          expiresIn: 3600,
          tenantId,
          grantedPermissions: baselinePermissions
        }),
        idFactory: () => "m365_api_connection_persisted",
        now: fixedNow
      });

    const beginService = new Microsoft365ProviderConnectionService({
      store,
      consentStateStore: consentStates,
      auditWriter,
      now: fixedNow,
      stateFactory: () => "raw_state_that_must_not_be_stored",
      tokenCipher,
      createConnector
    });

    const begin = await beginService.beginConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      requestedPermissionBundles: ["m365_read_baseline"]
    });
    expect(JSON.stringify([...consentStates.states.values()])).not.toContain("raw_state_that_must_not_be_stored");

    const callbackService = new Microsoft365ProviderConnectionService({
      store,
      consentStateStore: consentStates,
      auditWriter,
      now: fixedNow,
      tokenCipher,
      createConnector
    });
    const completed = await callbackService.completeConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      state: begin.state,
      tenantId,
      adminConsent: true,
      redirectUri: "https://app.example.test/providers/microsoft365/callback"
    });

    await expect(
      callbackService.completeConsent({
        organizationId: "org_1",
        actorUserId: "user_1",
        state: begin.state,
        tenantId,
        adminConsent: true,
        redirectUri: "https://app.example.test/providers/microsoft365/callback"
      })
    ).rejects.toMatchObject({ code: "invalid_request" });
    expect(completed.connection.id).toBe("m365_api_connection_persisted");
    expect(completed.permissionBundles.find((bundle) => bundle.bundleKey === "m365_read_baseline")?.enabled).toBe(true);
  });

  it("accepts write-capable consent and records tenant-profile Graph 403 as module health", async () => {
    const store = new InMemoryProviderResourceStore({ now: fixedNow });
    const auditWriter = new AuditWriter({
      sink: new InMemoryAuditSink(),
      now: fixedNow
    });
    const tokenCipher = createLocalMicrosoft365TokenCipher({ masterKey: "api-test-master-key" });
    const grantedPermissions = [...baselinePermissions, ...remediationWritePermissions];
    const accessToken = jwt(grantedPermissions);
    const service = new Microsoft365ProviderConnectionService({
      store,
      auditWriter,
      now: fixedNow,
      stateFactory: () => "state_write_capable",
      tokenCipher,
      createConnector: ({ credentialResolver, tokenCipher: connectorCipher }) =>
        createMicrosoft365Connector({
          clientId: "client-id",
          clientSecret: "client-secret",
          graphHttpClient: forbiddenGraphHttpClient,
          credentialResolver,
          tokenCipher: connectorCipher,
          tokenClient: async () => ({
            accessToken,
            tokenType: "Bearer",
            expiresIn: 3600,
            tenantId,
            grantedPermissions
          }),
          idFactory: () => "m365_api_connection_write_capable",
          now: fixedNow
        })
    });

    const begin = await service.beginConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      requestedPermissionBundles: ["m365_remediation_write"]
    });
    const completed = await service.completeConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      state: begin.state,
      tenantId,
      adminConsent: true,
      redirectUri: "https://app.example.test/providers/microsoft365/callback"
    });
    const health = await service.getHealth("org_1", completed.connection.id);
    const findings = await store.listFindings("org_1", completed.connection.id);

    expect(completed.connection.writeEnabled).toBe(false);
    expect(completed.permissionBundles.find((bundle) => bundle.bundleKey === "m365_remediation_write")).toMatchObject({
      enabled: true,
      permissionsGranted: remediationWritePermissions
    });
    expect(completed.tenantProfileSync.modules[0]).toMatchObject({
      moduleKey: "tenant-profile",
      status: "missing_permission"
    });
    expect(health.status).toBe("degraded");
    expect(health.moduleStatuses.find((module) => module.moduleKey === "tenant-profile")?.status).toBe(
      "missing_permission"
    );
    expect(completed.tenantProfileSync.findings).toEqual([
      expect.objectContaining({
        findingKey: "microsoft365.module_health.tenant-profile.missing_permission",
        title: "Tenant Profile Graph permission missing",
        status: "open",
        severity: "low"
      })
    ]);
    expect(findings).toEqual([
      expect.objectContaining({
        findingKey: "microsoft365.module_health.tenant-profile.missing_permission",
        evidence: expect.objectContaining({
          moduleStatus: "missing_permission",
          recommendation: expect.stringContaining("grant admin consent again")
        })
      })
    ]);
  });

  it("does not burn pending Microsoft consent state for the wrong workspace session", async () => {
    const store = new InMemoryProviderResourceStore({ now: fixedNow });
    const consentStates = new InMemoryProviderConsentStateStore({ now: fixedNow });
    const auditWriter = new AuditWriter({
      sink: new InMemoryAuditSink(),
      now: fixedNow
    });
    const tokenCipher = createLocalMicrosoft365TokenCipher({ masterKey: "api-test-master-key" });
    const accessToken = jwt(baselinePermissions);
    const createConnector = (input: {
      credentialResolver: Microsoft365CredentialResolver;
      tokenCipher: Microsoft365TokenCipher;
    }) =>
      createMicrosoft365Connector({
        clientId: "client-id",
        clientSecret: "client-secret",
        graphHttpClient,
        credentialResolver: input.credentialResolver,
        tokenCipher: input.tokenCipher,
        tokenClient: async () => ({
          accessToken,
          tokenType: "Bearer",
          expiresIn: 3600,
          tenantId,
          grantedPermissions: baselinePermissions
        }),
        idFactory: () => "m365_api_connection_scoped",
        now: fixedNow
      });

    const service = new Microsoft365ProviderConnectionService({
      store,
      consentStateStore: consentStates,
      auditWriter,
      now: fixedNow,
      stateFactory: () => "workspace_bound_state",
      tokenCipher,
      createConnector
    });
    const begin = await service.beginConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      requestedPermissionBundles: ["m365_read_baseline"]
    });

    await expect(
      service.completeConsent({
        organizationId: "org_2",
        actorUserId: "user_1",
        state: begin.state,
        tenantId,
        adminConsent: true
      })
    ).rejects.toMatchObject({ code: "invalid_request" });

    const completed = await service.completeConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      state: begin.state,
      tenantId,
      adminConsent: true
    });

    expect(completed.connection.id).toBe("m365_api_connection_scoped");
  });

  it("runs fixture-mode consent and five-module sync without Microsoft connector app secrets", async () => {
    const store = new InMemoryProviderResourceStore({ now: fixedNow });
    const auditSink = new InMemoryAuditSink();
    const service = new Microsoft365ProviderConnectionService({
      store,
      auditWriter: new AuditWriter({
        sink: auditSink,
        now: fixedNow
      }),
      now: fixedNow,
      stateFactory: () => "fixture_api_state",
      tokenCipher: createLocalMicrosoft365TokenCipher({ masterKey: "api-fixture-master-key" }),
      connectorMode: "fixture",
      fixtureSet: "partner_demo"
    });

    const begin = await service.beginConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"]
    });
    const callback = new URL(begin.url);
    const completed = await service.completeConsent({
      organizationId: "org_1",
      actorUserId: "user_1",
      state: callback.searchParams.get("state") ?? "",
      tenantId: callback.searchParams.get("tenant") ?? "",
      adminConsent: callback.searchParams.get("admin_consent") === "True",
      redirectUri: "https://app.example.test/providers/microsoft365/callback"
    });
    const sync = await service.runSync({
      organizationId: "org_1",
      actorUserId: "user_1",
      providerConnectionId: completed.connection.id
    });
    const health = await service.getHealth("org_1", completed.connection.id);

    expect(begin.url).toContain("/providers/microsoft365/callback");
    expect(completed.connection.writeEnabled).toBe(false);
    expect(completed.connection.metadata.connectorMode).toBe("fixture");
    expect(sync.modules.map((module) => module.moduleKey)).toEqual([...microsoft365CoreDemoReadModules]);
    expect(sync.rawResources.some((resource) => resource.externalResourceType === "mfaRegistrationDetail")).toBe(true);
    expect(health.connectorMode).toBe("fixture");
    expect(health.effectiveConnectorMode).toBe("fixture");
    expect(health.moduleStatuses.map((module) => module.moduleKey).sort()).toEqual(
      [...microsoft365CoreDemoReadModules].sort()
    );
    expect(JSON.stringify(auditSink.records)).not.toContain("puresoc-fixture-no-secret");
  });
});
