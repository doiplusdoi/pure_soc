import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";

const NOW = new Date("2026-05-02T11:30:00.000Z");
const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const ACTOR_ID = "33333333-3333-4333-8333-333333333333";
const ASSESSMENT_ID = "44444444-4444-4444-8444-444444444444";

describe("provider connections Prisma runtime persistence", () => {
  it("persists mock provider connections, telemetry, and compliance inputs through the Prisma store", async () => {
    const prismaClient = new FakePrismaClient();
    const config = loadConfig({
      env: {
        PURESOC_PERSISTENCE_MODE: "prisma"
      }
    });
    const services = createApiServices({
      config,
      prismaClient: prismaClient as never,
      now: () => NOW
    });

    expect(services.persistence.persistedContexts).toContain("provider_connections_and_telemetry");
    expect(services.persistence.memoryBackedContexts).not.toContain("provider_connections_and_telemetry");
    expect(services.persistence.memoryBackedContexts).toEqual(["oidc_transient_state"]);

    const created = await services.providerConnections.createMockConnection({
      organizationId: ORG_A,
      actorUserId: ACTOR_ID,
      scenarioKey: "missing_mfa"
    });
    const firstSync = await services.providerConnections.runSync({
      organizationId: ORG_A,
      actorUserId: ACTOR_ID,
      providerConnectionId: created.connection.id
    });
    const firstRawResourceCount = prismaClient.providerRawResource.rows.length;
    const firstFindingId = firstSync.findings[0]?.id;

    expect(firstSync.syncRun.status).toBe("succeeded");
    expect(firstSync.findings[0]?.findingKey).toBe("mock.identity.admin_mfa_missing.admin_1");
    expect(firstSync.recommendations[0]?.title).toBe("Enable MFA for privileged users");
    expect(prismaClient.providerConnection.rows).toHaveLength(1);
    expect(prismaClient.providerRawResource.rows.length).toBeGreaterThan(0);
    expect(prismaClient.providerNormalizedResource.rows.length).toBeGreaterThan(0);
    expect(prismaClient.providerFinding.rows).toHaveLength(1);
    expect(prismaClient.providerRecommendation.rows).toHaveLength(1);

    const restarted = createApiServices({
      config,
      prismaClient: prismaClient as never,
      now: () => new Date("2026-05-02T11:35:00.000Z")
    });
    await expect(restarted.providerConnections.listConnections(ORG_A)).resolves.toMatchObject({
      connections: [
        {
          id: created.connection.id,
          providerKey: "mock",
          metadata: {
            scenarioKey: "missing_mfa"
          }
        }
      ]
    });
    const firstSyncModules = await restarted.providerConnections.listModules(ORG_A, created.connection.id, firstSync.syncRun.id);
    expect(firstSyncModules.modules.some((module) => module.moduleKey === "identity-posture" && module.status === "succeeded")).toBe(
      true
    );

    const secondSync = await restarted.providerConnections.runSync({
      organizationId: ORG_A,
      actorUserId: ACTOR_ID,
      providerConnectionId: created.connection.id
    });
    expect(secondSync.findings[0]?.id).toBe(firstFindingId);
    expect(prismaClient.providerRawResource.rows).toHaveLength(firstRawResourceCount);

    const compliance = await restarted.compliance.evaluateAssessment({
      organizationId: ORG_A,
      assessmentId: ASSESSMENT_ID,
      providerConnectionId: created.connection.id,
      jurisdiction: "EU"
    });
    expect(compliance.recommendations.some((recommendation) => recommendation.title === "Enable MFA for privileged users")).toBe(
      true
    );
    expect(prismaClient.complianceResultSnapshot.rows).toHaveLength(1);

    await expect(
      restarted.providerConnections.runSync({
        organizationId: ORG_B,
        actorUserId: ACTOR_ID,
        providerConnectionId: created.connection.id
      })
    ).rejects.toMatchObject({ code: "cross_organization_provider_resource" });
  });
});

class FakePrismaClient {
  readonly auditLog = new FakeDelegate();
  readonly billingCustomer = new FakeDelegate();
  readonly billingEntitlement = new FakeDelegate();
  readonly billingEvent = new FakeDelegate();
  readonly billingSubscription = new FakeDelegate();
  readonly complianceControlResult = new FakeDelegate();
  readonly complianceGap = new FakeDelegate();
  readonly complianceResultSnapshot = new FakeDelegate();
  readonly dashboardSnapshot = new FakeDelegate();
  readonly emailVerificationToken = new FakeDelegate();
  readonly evidenceAccessLog = new FakeDelegate();
  readonly evidenceArtifact = new FakeDelegate();
  readonly evidenceLink = new FakeDelegate();
  readonly generatedReport = new FakeDelegate();
  readonly identityAccount = new FakeDelegate();
  readonly localCredential = new FakeDelegate();
  readonly notificationDraft = new FakeDelegate();
  readonly organization = new FakeDelegate();
  readonly organizationMember = new FakeDelegate();
  readonly passwordResetToken = new FakeDelegate();
  readonly providerActionRun = new FakeDelegate();
  readonly providerActionTemplate = new FakeDelegate();
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
  readonly readinessPlan = new FakeDelegate();
  readonly readinessPlanItem = new FakeDelegate();
  readonly regulatoryReviewDecision = new FakeDelegate();
  readonly regulatoryReviewTask = new FakeDelegate();
  readonly regulatorySource = new FakeDelegate();
  readonly regulatorySourceMap = new FakeDelegate();
  readonly regulatorySourceVersion = new FakeDelegate();
  readonly roNis2NotificationDraft = new FakeDelegate();
  readonly role = new FakeDelegate();
  readonly roleBinding = new FakeDelegate();
  readonly session = new FakeDelegate();
  readonly user = new FakeDelegate();

  async $transaction<T>(callback: (tx: FakePrismaClient) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

class FakeDelegate {
  readonly rows: Array<Record<string, unknown>> = [];

  async create(input: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const row = materialize(input.data);
    this.rows.push(row);
    return row;
  }

  async deleteMany(input: { where?: Record<string, unknown> } = {}): Promise<{ count: number }> {
    const before = this.rows.length;
    const keep = this.rows.filter((row) => !matchesWhere(row, input.where ?? {}));
    this.rows.splice(0, this.rows.length, ...keep);
    return {
      count: before - keep.length
    };
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
    select?: Record<string, boolean>;
    where?: Record<string, unknown>;
  } = {}): Promise<Array<Record<string, unknown>>> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where ?? {}));
    sortRows(rows, input.orderBy);
    if (!input.select) {
      return rows;
    }

    return rows.map((row) =>
      Object.fromEntries(Object.entries(input.select ?? {}).filter(([, selected]) => selected).map(([key]) => [key, row[key]]))
    );
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

  async updateMany(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<{ count: number }> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where));
    for (const row of rows) {
      Object.assign(row, materialize(input.data, false));
    }

    return {
      count: rows.length
    };
  }

  async upsert(input: {
    create: Record<string, unknown>;
    update: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const existing = this.rows.find((row) => matchesWhere(row, input.where));
    if (existing) {
      Object.assign(existing, materialize(input.update, false));
      return existing;
    }

    return this.create({
      data: input.create
    });
  }
}

const materialize = (data: Record<string, unknown>, includeDefaults = true): Record<string, unknown> => {
  const row = {
    ...data
  };
  if (includeDefaults) {
    row.id ??= randomUUID();
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
    if (field === "organizationId_assessmentId" && isRecord(expected)) {
      if (row.organizationId !== expected.organizationId || row.assessmentId !== expected.assessmentId) {
        return false;
      }
      continue;
    }

    if (isRecord(expected) && "in" in expected && Array.isArray(expected.in)) {
      if (!expected.in.includes(row[field])) {
        return false;
      }
      continue;
    }

    if (isRecord(expected) && "not" in expected) {
      if (row[field] === expected.not) {
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
    const leftValue = left[field];
    const rightValue = right[field];
    const leftTime = toDate(leftValue).getTime();
    const rightTime = toDate(rightValue).getTime();
    return direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });
};

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
