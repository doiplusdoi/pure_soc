import { describe, expect, it } from "vitest";

import {
  PrismaProviderResourceStore,
  type PrismaProviderResourceClient
} from "../index";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const CONNECTION_ID = "33333333-3333-4333-8333-333333333333";
const SYNC_RUN_ID = "44444444-4444-4444-8444-444444444444";
const RAW_ID = "55555555-5555-4555-8555-555555555555";
const NORMALIZED_ID = "66666666-6666-4666-8666-666666666666";
const FINDING_ID = "77777777-7777-4777-8777-777777777777";
const RECOMMENDATION_ID = "88888888-8888-4888-8888-888888888888";
const NOW = new Date("2026-05-02T11:00:00.000Z");

describe("Prisma provider resource store", () => {
  it("persists provider connection telemetry and round-trips the provider-neutral contract", async () => {
    const client = new FakePrismaProviderResourceClient();
    const store = new PrismaProviderResourceStore(client as unknown as PrismaProviderResourceClient, {
      now: () => NOW,
      idFactory: createIdFactory([
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        SYNC_RUN_ID,
        "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        RAW_ID,
        NORMALIZED_ID,
        FINDING_ID,
        RECOMMENDATION_ID
      ])
    });

    const connection = await store.createConnection({
      id: CONNECTION_ID,
      organizationId: ORG_A,
      providerKey: "mock",
      displayName: "Persisted mock",
      externalTenantId: "mock_tenant",
      externalTenantName: "Mock Tenant",
      metadata: {
        scenarioKey: "missing_mfa"
      }
    });
    const credential = await store.upsertCredential({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock",
      credentialType: "oauth_token",
      encryptedPayload: "encrypted-envelope:key-id",
      expiresAt: "2026-05-02T12:00:00.000Z",
      rotationRequired: false
    });
    const permissionBundle = await store.upsertPermissionBundle({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock",
      bundleKey: "mock_read_baseline",
      permissionsRequired: ["Directory.Read.All"],
      permissionsGranted: ["Directory.Read.All"],
      enabled: true
    });
    const capability = await store.upsertCapability({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock",
      moduleKey: "identity-posture",
      capabilityKey: "identity-posture.read",
      available: false,
      licenseRequired: [],
      licenseDetected: [],
      permissionsRequired: ["Directory.Read.All"],
      permissionsGranted: [],
      status: "missing_permission",
      statusReason: "Directory read permission was not granted."
    });
    const syncRun = await store.createSyncRun({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock"
    });
    await store.upsertSyncModule({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      syncRunId: syncRun.id,
      providerKey: "mock",
      moduleKey: "identity-posture",
      status: "missing_permission",
      missingPermissions: ["Directory.Read.All"],
      missingLicenses: [],
      statusReason: "Permission missing.",
      pagesRead: 0,
      retryCount: 1
    });
    const raw = await store.upsertRawResource({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock",
      externalId: "admin_1",
      externalResourceType: "user",
      sourceModule: "identity-posture",
      syncRunId: syncRun.id,
      rawJson: {
        id: "admin_1",
        mfaEnabled: false
      },
      observedAt: "2026-05-02T11:00:00.000Z"
    });
    const rawUpdated = await store.upsertRawResource({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock",
      externalId: "admin_1",
      externalResourceType: "user",
      sourceModule: "identity-posture",
      syncRunId: syncRun.id,
      rawJson: {
        id: "admin_1",
        mfaEnabled: true
      },
      observedAt: "2026-05-02T11:05:00.000Z"
    });
    const normalized = await store.upsertNormalizedResource({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock",
      rawResourceId: raw.id,
      externalId: "admin_1",
      externalResourceType: "user",
      resourceType: "cloud_user",
      sourceModule: "identity-posture",
      syncRunId: syncRun.id,
      normalizedJson: {
        userPrincipalName: "admin@example.test",
        mfaEnabled: false
      }
    });
    const finding = await store.upsertFinding({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock",
      moduleKey: "identity-posture",
      findingKey: "mock.identity.admin_mfa_missing.admin_1",
      title: "Admin account is missing MFA",
      summary: "A privileged user account does not have MFA enabled.",
      severity: "high",
      status: "open",
      normalizedResourceId: normalized.id,
      resourceExternalId: "admin_1",
      resourceType: "cloud_user",
      syncRunId: syncRun.id,
      evidence: {
        signalKey: "admin_mfa_missing"
      }
    });
    const recommendation = await store.upsertRecommendation({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      sourceFindingId: finding.id,
      sourceFindingKey: finding.findingKey,
      providerKey: "mock",
      moduleKey: "identity-posture",
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      title: "Enable MFA for privileged users",
      summary: "Require MFA for privileged users.",
      severity: "high",
      confidence: "high",
      recommendationType: "technical",
      automationMode: "guided",
      requiredPermissions: ["Directory.Read.All"],
      requiredLicense: [],
      evidenceRequired: true,
      sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }]
    });
    const completed = await store.completeSyncRun(syncRun.id, "partial", { modules: 1 }, { code: "missing_permission" });

    expect(connection.createdAt).toBe("2026-05-02T11:00:00.000Z");
    expect(credential).toMatchObject({
      providerKey: "mock",
      encryptedPayload: "encrypted-envelope:key-id"
    });
    expect(JSON.stringify(client.providerCredential.rows)).not.toContain("plain-access-token");
    expect(permissionBundle.enabled).toBe(true);
    expect(capability.status).toBe("missing_permission");
    expect(completed).toMatchObject({
      status: "partial",
      summary: { modules: 1 },
      error: { code: "missing_permission" }
    });
    expect(rawUpdated.id).toBe(raw.id);
    expect(rawUpdated.firstSeenAt).toBe("2026-05-02T11:00:00.000Z");
    expect(rawUpdated.lastSeenAt).toBe("2026-05-02T11:05:00.000Z");

    await expect(store.listConnections(ORG_A)).resolves.toMatchObject([{ id: CONNECTION_ID }]);
    await expect(store.listCredentials(ORG_A, connection.id)).resolves.toMatchObject([{ providerKey: "mock" }]);
    await expect(store.listPermissionBundles(ORG_A, connection.id)).resolves.toHaveLength(1);
    await expect(store.listCapabilities(ORG_A, connection.id)).resolves.toMatchObject([
      { capabilityKey: "identity-posture.read" }
    ]);
    await expect(store.listSyncModulesForConnection(ORG_A, connection.id)).resolves.toMatchObject([
      {
        moduleKey: "identity-posture",
        status: "missing_permission",
        retryCount: 1
      }
    ]);
    await expect(store.listRawResources(ORG_A, connection.id)).resolves.toMatchObject([{ id: RAW_ID }]);
    await expect(store.listNormalizedResources(ORG_A, connection.id)).resolves.toMatchObject([
      {
        id: NORMALIZED_ID,
        rawResourceId: RAW_ID,
        resourceType: "cloud_user"
      }
    ]);
    await expect(store.listFindings(ORG_A, connection.id)).resolves.toMatchObject([
      {
        id: FINDING_ID,
        resourceExternalId: "admin_1",
        resourceType: "cloud_user",
        evidence: { signalKey: "admin_mfa_missing" }
      }
    ]);
    await expect(store.listRecommendations(ORG_A, connection.id)).resolves.toMatchObject([
      {
        id: RECOMMENDATION_ID,
        sourceFindingKey: "mock.identity.admin_mfa_missing.admin_1",
        sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }]
      }
    ]);
    await expect(
      store.upsertRecommendation({
        ...recommendation,
        summary: "Updated summary."
      })
    ).resolves.toMatchObject({
      id: RECOMMENDATION_ID,
      summary: "Updated summary."
    });
  });

  it("rejects cross-organization provider state reads", async () => {
    const client = new FakePrismaProviderResourceClient();
    const store = new PrismaProviderResourceStore(client as unknown as PrismaProviderResourceClient, {
      now: () => NOW,
      idFactory: createIdFactory([CONNECTION_ID, SYNC_RUN_ID, RAW_ID])
    });
    const connection = await store.createConnection({
      id: CONNECTION_ID,
      organizationId: ORG_A,
      providerKey: "mock",
      displayName: "Org A mock"
    });
    const syncRun = await store.createSyncRun({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock"
    });
    const raw = await store.upsertRawResource({
      organizationId: ORG_A,
      providerConnectionId: connection.id,
      providerKey: "mock",
      externalId: "tenant_mock_1",
      externalResourceType: "tenant",
      sourceModule: "tenant-profile",
      syncRunId: syncRun.id,
      rawJson: { id: "tenant_mock_1" }
    });

    await expect(store.getConnectionForOrganization(ORG_B, connection.id)).rejects.toMatchObject({
      code: "cross_organization_provider_resource"
    });
    await expect(store.getRawResourceForOrganization(ORG_B, raw.id)).rejects.toMatchObject({
      code: "cross_organization_provider_resource"
    });
    await expect(store.listFindings(ORG_B, connection.id)).rejects.toMatchObject({
      code: "cross_organization_provider_resource"
    });
  });
});

class FakePrismaProviderResourceClient {
  readonly providerCapability = new FakeDelegate();
  readonly providerConnection = new FakeDelegate();
  readonly providerCredential = new FakeDelegate();
  readonly providerFinding = new FakeDelegate();
  readonly providerNormalizedResource = new FakeDelegate();
  readonly providerPermissionBundle = new FakeDelegate();
  readonly providerRawResource = new FakeDelegate();
  readonly providerRecommendation = new FakeDelegate();
  readonly providerSyncModule = new FakeDelegate();
  readonly providerSyncRun = new FakeDelegate();
}

class FakeDelegate {
  readonly rows: Array<Record<string, unknown>> = [];

  async create(input: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const row = materialize(input.data);
    this.rows.push(row);
    return row;
  }

  async findUnique(input: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null> {
    return this.rows.find((row) => matchesWhere(row, input.where)) ?? null;
  }

  async findFirst(input: {
    orderBy?: Record<string, "asc" | "desc">;
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown> | null> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where));
    sortRows(rows, input.orderBy);
    return rows[0] ?? null;
  }

  async findMany(input: {
    orderBy?: Record<string, "asc" | "desc">;
    where?: Record<string, unknown>;
  } = {}): Promise<Array<Record<string, unknown>>> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where ?? {}));
    sortRows(rows, input.orderBy);
    return rows;
  }

  async update(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const row = this.rows.find((candidate) => matchesWhere(candidate, input.where));
    if (!row) {
      throw new Error("Fake row not found");
    }

    Object.assign(row, materialize(input.data, false));
    return row;
  }
}

const materialize = (data: Record<string, unknown>, includeDefaults = true): Record<string, unknown> => {
  const row = {
    ...data
  };
  if (includeDefaults) {
    row.createdAt ??= NOW;
    row.updatedAt ??= NOW;
    row.startedAt ??= NOW;
    row.firstSeenAt ??= NOW;
    row.lastSeenAt ??= NOW;
  }
  return row;
};

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown>): boolean => {
  for (const [field, expected] of Object.entries(where)) {
    if (isRecord(expected) && "in" in expected && Array.isArray(expected.in)) {
      if (!expected.in.includes(row[field])) {
        return false;
      }
      continue;
    }

    if (row[field] !== expected) {
      return false;
    }
  }

  return true;
};

const sortRows = (rows: Array<Record<string, unknown>>, orderBy?: Record<string, "asc" | "desc">): void => {
  const entry = Object.entries(orderBy ?? {})[0];
  if (!entry) {
    return;
  }

  const [field, direction] = entry;
  rows.sort((left, right) => {
    const leftTime = toDate(left[field]).getTime();
    const rightTime = toDate(right[field]).getTime();
    return direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });
};

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createIdFactory = (ids: string[]) => {
  let index = 0;
  return () => ids[index++] ?? `99999999-9999-4999-8999-${String(index).padStart(12, "0")}`;
};
