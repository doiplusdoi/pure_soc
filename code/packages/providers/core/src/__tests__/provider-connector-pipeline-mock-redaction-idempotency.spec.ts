import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createMockConnector, type MockProviderScenarioKey } from "../../../mock/src/index";
import {
  InMemoryProviderResourceStore,
  ProviderConnectorError,
  ProviderStoreIsolationError,
  redactProviderSecrets,
  runProviderConnectorPipeline
} from "../index";

const fixedNow = () => new Date("2026-04-28T10:00:00.000Z");

const createConnectedStore = async (scenarioKey: MockProviderScenarioKey = "missing_mfa") => {
  const store = new InMemoryProviderResourceStore({ now: fixedNow });
  const connector = createMockConnector({ scenarioKey, now: fixedNow });
  const connection = await store.createConnection({
    organizationId: "org_1",
    providerKey: connector.providerKey,
    displayName: `Mock ${scenarioKey}`,
    metadata: { scenarioKey }
  });

  return { store, connector, connection };
};

describe("provider connector pipeline mock redaction idempotency", () => {
  it("implements the provider connection lifecycle contract without live provider calls", async () => {
    const connector = createMockConnector({ scenarioKey: "healthy_tenant", now: fixedNow });
    const redirect = await connector.beginConnection({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/callback",
      state: "state_123",
      requestedPermissionBundles: ["mock_read_baseline"]
    });

    expect(redirect.url).toContain("state_123");

    const completion = await connector.completeConnection({
      organizationId: "org_1",
      actorUserId: "user_1",
      redirectUri: "https://app.example.test/callback",
      state: "state_123",
      authorizationCode: "mock_code"
    });

    expect(completion.connection.providerKey).toBe("mock");
    expect(completion.connection.writeEnabled).toBe(false);
    expect(completion.capabilities.every((capability) => capability.providerKey === "mock")).toBe(true);
    expect(Object.hasOwn(completion.tenantProfile?.normalizedJson ?? {}, "rawJson")).toBe(false);
  });

  it("stores raw resources, normalized resources, findings, and recommendations in order", async () => {
    const { store, connector, connection } = await createConnectedStore("missing_mfa");

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id
    });

    expect(result.syncRun.status).toBe("succeeded");
    expect(result.rawResources.some((resource) => resource.rawJson.mfaEnabled === false)).toBe(true);
    expect(result.normalizedResources.some((resource) => resource.normalizedJson.mfaEnabled === false)).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.recommendations).toHaveLength(1);
    expect(result.findings[0]?.normalizedResourceId).toBeDefined();
    expect(result.recommendations[0]?.sourceFindingId).toBe(result.findings[0]?.id);
    expect(result.recommendations[0]?.automationMode).toBe("guided");
  });

  it("upserts provider resources idempotently by external ID", async () => {
    const { store, connector, connection } = await createConnectedStore("missing_mfa");

    const first = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id
    });
    const second = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id
    });

    const firstAdminRaw = first.rawResources.find((resource) => resource.externalId === "admin_1");
    const secondAdminRaw = second.rawResources.find((resource) => resource.externalId === "admin_1");
    const firstAdminNormalized = first.normalizedResources.find((resource) => resource.externalId === "admin_1");
    const secondAdminNormalized = second.normalizedResources.find((resource) => resource.externalId === "admin_1");

    expect(secondAdminRaw?.id).toBe(firstAdminRaw?.id);
    expect(secondAdminNormalized?.id).toBe(firstAdminNormalized?.id);
    expect(await store.listRawResources("org_1", connection.id)).toHaveLength(3);
    expect(await store.listNormalizedResources("org_1", connection.id)).toHaveLength(3);
    expect(await store.listRecommendations("org_1", connection.id)).toHaveLength(1);
  });

  it("keeps one unavailable module from failing the whole sync", async () => {
    const { store, connector, connection } = await createConnectedStore("no_intune_license");

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id
    });

    expect(result.syncRun.status).toBe("partial");
    expect(result.modules.find((module) => module.moduleKey === "intune-devices")?.status).toBe("unavailable_license");
    expect(result.modules.find((module) => module.moduleKey === "intune-devices")?.missingLicenses).toEqual(["INTUNE_A"]);
    expect(result.rawResources.length).toBeGreaterThan(0);
  });

  it("stores pagination fixture telemetry", async () => {
    const { store, connector, connection } = await createConnectedStore("paginated_users");

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id
    });

    const identityModule = result.modules.find((module) => module.moduleKey === "identity-posture");
    expect(identityModule?.pagesRead).toBe(2);
    expect(result.rawResources.filter((resource) => resource.externalResourceType === "user")).toHaveLength(2);
  });

  it("stores retry and throttle fixture telemetry", async () => {
    const { store, connector, connection } = await createConnectedStore("throttled_graph");

    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id,
      maxRetries: 3
    });

    const identityModule = result.modules.find((module) => module.moduleKey === "identity-posture");
    expect(identityModule?.status).toBe("succeeded");
    expect(identityModule?.retryCount).toBe(2);
  });

  it("redacts provider tokens, OAuth codes, auth headers, and client secrets", () => {
    const rawSecret = "live_secret_value";
    const redacted = redactProviderSecrets({
      accessToken: rawSecret,
      oauthCode: "oauth_code_value",
      headers: {
        authorization: "Bearer token_value"
      },
      nested: {
        clientSecret: "client_secret_value"
      },
      retained: "safe"
    });

    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain(rawSecret);
    expect(serialized).not.toContain("oauth_code_value");
    expect(serialized).not.toContain("Bearer token_value");
    expect(serialized).not.toContain("client_secret_value");
    expect(serialized).toContain("safe");

    const error = new ProviderConnectorError("mock_failure", "Mock failure", {
      refreshToken: "refresh_secret"
    });
    expect(JSON.stringify(error)).not.toContain("refresh_secret");
  });

  it("rejects provider sync attempts that request live write behavior", async () => {
    const { store, connector, connection } = await createConnectedStore("healthy_tenant");

    await expect(
      runProviderConnectorPipeline({
        connector,
        store,
        organizationId: "org_1",
        providerConnectionId: connection.id,
        allowProviderWrites: true
      })
    ).rejects.toMatchObject({ code: "provider_writes_disabled" });
  });

  it("rejects cross-organization provider-resource access", async () => {
    const { store, connector, connection } = await createConnectedStore("healthy_tenant");
    const result = await runProviderConnectorPipeline({
      connector,
      store,
      organizationId: "org_1",
      providerConnectionId: connection.id
    });

    await expect(store.getRawResourceForOrganization("org_2", result.rawResources[0]?.id ?? "")).rejects.toBeInstanceOf(
      ProviderStoreIsolationError
    );
  });

  it("keeps generic compliance code from importing Microsoft provider code", () => {
    const workspaceRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
    const complianceRoot = join(workspaceRoot, "packages", "compliance");
    const files = collectTypeScriptFiles(complianceRoot);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/from\s+["'][^"']*(providers\/microsoft365|provider-microsoft365)/);
    }
  });
});

const collectTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
