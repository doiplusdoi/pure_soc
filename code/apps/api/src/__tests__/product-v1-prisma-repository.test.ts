import { describe, expect, it } from "vitest";

import { PrismaProductV1Repository, type ProductV1PrismaClient } from "../product-v1/prisma-repository";
import { ProductV1Service } from "../product-v1/service";

describe("product v1 Prisma repository", () => {
  it("persists setup, relationship, support, operation, and aggregate records across service instances", async () => {
    const client = new FakeProductV1PrismaClient();
    const service = createService(client);

    const firstOperation = await service.createOperation({
      organizationId: "org_a",
      kind: "sync",
      idempotencyKey: "sync-once",
      status: "running"
    });
    await service.updateOperation({
      ...firstOperation,
      status: "succeeded",
      result: { syncRunId: "sync_1" }
    });
    await service.saveSetupStep({
      organizationId: "org_a",
      step: "organization",
      data: { name: "Asterion Tools" }
    });
    const relationship = await service.createRelationship({
      partnerId: "partner_a",
      customerOrganizationId: "org_a",
      invitedByUserId: "user_partner"
    });
    await service.transitionRelationship({
      relationshipId: relationship.id,
      nextState: "ACTIVE",
      actorUserId: "user_customer"
    });
    await service.createAssignment({
      partnerId: "partner_a",
      relationshipId: relationship.id,
      customerOrganizationId: "org_a",
      assigneeType: "user",
      assigneeId: "user_partner",
      scopes: ["security.read"],
      createdByUserId: "user_partner"
    });
    const supportSession = await service.createSupportSession({
      organizationId: "org_a",
      actorUserId: "user_customer",
      reason: "debug setup",
      policyBasis: "customer_approved",
      ttlMinutes: 30
    });
    await service.endSupportSession({ supportSessionId: supportSession.id, reason: "resolved" });
    await service.createIncident({
      organizationId: "org_a",
      title: "Suspicious sign-in",
      awarenessTime: "2026-06-24T10:00:00.000Z"
    });
    await service.createFinding({
      organizationId: "org_b",
      title: "Other tenant gap",
      severity: "low",
      status: "open",
      ownerUserId: null,
      sourceType: "manual"
    });
    const fileObject = await service.createFileObject({
      organizationId: "org_a",
      purpose: "uploaded_evidence",
      filename: "baseline.json",
      mimeType: "application/json",
      sizeBytes: 42,
      checksumSha256: "a".repeat(64),
      storage: { provider: "minio", bucket: "evidence", key: "org_a/baseline.json" },
      scanStatus: "clean",
      retentionClass: "evidence",
      sourceReferences: ["nis2-eu-article-21"],
      createdByUserId: "user_customer"
    });
    const snapshot = await service.createReportSnapshot({
      organizationId: "org_a",
      templateKey: "security_baseline",
      locale: "en",
      legalCaveat: "PureSOC internal readiness output is not a legal opinion.",
      legalCaveatLocale: "en",
      legalCaveatFallbackUsed: false,
      sourceReferences: ["nis2-eu-article-21"],
      content: { summary: "Internal readiness snapshot" },
      createdByUserId: "user_customer"
    });
    const supplierReview = await service.createSupplierReview({
      organizationId: "org_a",
      supplierId: "supplier_1",
      status: "scheduled",
      outcome: "not_assessed",
      ownerUserId: "user_customer",
      reviewDueAt: "2026-10-01T00:00:00.000Z",
      completedAt: null,
      evidenceFileObjectIds: [fileObject.id],
      riskIds: ["risk_1"],
      notes: "Annual supplier review"
    });
    const policyReview = await service.createPolicyReview({
      organizationId: "org_a",
      policyDocumentId: "policy_1",
      status: "scheduled",
      reviewerUserId: "user_customer",
      reviewDueAt: "2026-09-01T00:00:00.000Z",
      completedAt: null,
      comments: null
    });
    await service.createPolicyAcknowledgement({
      organizationId: "org_a",
      policyDocumentId: "policy_1",
      acknowledgedByUserId: "user_customer",
      status: "pending",
      dueAt: "2026-09-15T00:00:00.000Z",
      acknowledgedAt: null
    });
    await service.createGovernanceActivity({
      organizationId: "org_a",
      activityType: "supplier_review",
      title: "Supplier risk review",
      status: "planned",
      ownerUserId: "user_customer",
      dueAt: "2026-10-05T00:00:00.000Z",
      completedAt: null,
      linkedRiskIds: ["risk_1"],
      linkedPolicyIds: ["policy_1"],
      linkedSupplierIds: ["supplier_1"]
    });
    await service.createGovernanceCalendarEvent({
      organizationId: "org_a",
      title: "Supplier risk review deadline",
      eventType: "deadline",
      startsAt: "2026-10-05T09:00:00.000Z",
      dueAt: "2026-10-05T17:00:00.000Z",
      status: "scheduled",
      ownerUserId: "user_customer",
      sourceResourceType: "supplier_review",
      sourceResourceId: supplierReview.id,
      recurrence: "quarterly"
    });
    await service.createAttestation({
      organizationId: "org_a",
      title: "Management attestation",
      scope: "nis2-governance",
      status: "open",
      attestedByUserId: null,
      dueAt: "2026-11-01T00:00:00.000Z",
      submittedAt: null,
      evidenceFileObjectIds: [fileObject.id],
      sourceReferences: ["nis2-eu-article-20"]
    });
    await service.createTrainingRecord({
      organizationId: "org_a",
      subject: "Incident reporting awareness",
      assigneeUserId: "user_customer",
      personId: null,
      status: "assigned",
      assignedAt: "2026-06-24T09:00:00.000Z",
      dueAt: "2026-11-01T00:00:00.000Z",
      completedAt: null,
      evidenceFileObjectIds: [fileObject.id]
    });
    const internalEvent = await service.createInternalEvent({
      organizationId: "org_a",
      eventType: "product_v1.finding.updated",
      aggregateType: "finding",
      aggregateId: "finding_1",
      idempotencyKey: "event-once",
      payload: { status: "in_progress" }
    });

    const restarted = createService(client);
    await expect(
      restarted.createOperation({
        organizationId: "org_a",
        kind: "sync",
        idempotencyKey: "sync-once",
        status: "running"
      })
    ).resolves.toMatchObject({
      id: firstOperation.id,
      status: "succeeded",
      result: { syncRunId: "sync_1" }
    });
    await expect(restarted.getSetupState("org_a")).resolves.toMatchObject({
      completedSteps: ["organization"],
      stepData: { organization: { name: "Asterion Tools" } }
    });
    await expect(restarted.listRelationshipsForPartner("partner_a")).resolves.toMatchObject([
      { id: relationship.id, state: "ACTIVE" }
    ]);
    await expect(
      restarted.hasActiveAssignment({
        partnerId: "partner_a",
        organizationId: "org_a",
        userId: "user_partner",
        requiredScope: "security.read"
      })
    ).resolves.toBe(true);
    await expect(restarted.getSupportSession(supportSession.id)).resolves.toMatchObject({
      status: "ended",
      endReason: "resolved"
    });
    await expect(restarted.listIncidents("org_a")).resolves.toMatchObject([
      {
        reportingClock: {
          earlyWarningDueAt: "2026-06-25T10:00:00.000Z",
          incidentNotificationDueAt: "2026-06-27T10:00:00.000Z"
        }
      }
    ]);
    await expect(restarted.listFindings("org_a")).resolves.toEqual([]);
    await expect(restarted.listFindings("org_b")).resolves.toHaveLength(1);
    await expect(restarted.getFileObject(fileObject.id)).resolves.toMatchObject({
      id: fileObject.id,
      retentionClass: "evidence",
      scanStatus: "clean"
    });
    await expect(restarted.listReportSnapshots("org_a")).resolves.toMatchObject([
      {
        id: snapshot.reportSnapshot.id,
        immutable: true,
        fileObjectId: snapshot.fileObject.id,
        sourceReferences: ["nis2-eu-article-21"]
      }
    ]);
    await expect(restarted.listSupplierReviews("org_a")).resolves.toMatchObject([
      { id: supplierReview.id, supplierId: "supplier_1", riskIds: ["risk_1"], evidenceFileObjectIds: [fileObject.id] }
    ]);
    await expect(restarted.listPolicyReviews("org_a")).resolves.toMatchObject([
      { id: policyReview.id, policyDocumentId: "policy_1", status: "scheduled" }
    ]);
    await expect(restarted.listPolicyAcknowledgements("org_a")).resolves.toHaveLength(1);
    await expect(restarted.listGovernanceActivities("org_a")).resolves.toMatchObject([
      { activityType: "supplier_review", linkedRiskIds: ["risk_1"], linkedPolicyIds: ["policy_1"] }
    ]);
    await expect(restarted.listGovernanceCalendarEvents("org_a")).resolves.toMatchObject([
      { eventType: "deadline", recurrence: "quarterly", sourceResourceId: supplierReview.id }
    ]);
    await expect(restarted.listAttestations("org_a")).resolves.toMatchObject([
      { scope: "nis2-governance", sourceReferences: ["nis2-eu-article-20"] }
    ]);
    await expect(restarted.listTrainingRecords("org_a")).resolves.toMatchObject([
      { subject: "Incident reporting awareness", evidenceFileObjectIds: [fileObject.id] }
    ]);
    await expect(
      restarted.updateStoredRecord("supplier_review", "org_a", supplierReview.id, {
        status: "completed",
        outcome: "acceptable",
        completedAt: "2026-10-01T12:00:00.000Z"
      })
    ).resolves.toMatchObject({
      before: { status: "scheduled", outcome: "not_assessed" },
      after: { status: "completed", outcome: "acceptable", completedAt: "2026-10-01T12:00:00.000Z" }
    });
    await expect(
      restarted.updateStoredRecord("supplier_review", "org_b", supplierReview.id, {
        status: "canceled"
      })
    ).rejects.toThrow("Unknown product v1 supplier_review");
    await expect(
      restarted.createInternalEvent({
        organizationId: "org_a",
        eventType: "product_v1.finding.updated",
        aggregateType: "finding",
        aggregateId: "finding_1",
        idempotencyKey: "event-once",
        payload: { status: "ignored_retry_payload" }
      })
    ).resolves.toMatchObject({
      id: internalEvent.id,
      payload: { status: "in_progress" }
    });
    await expect(restarted.listInternalEvents("org_a")).resolves.toMatchObject([
      {
        id: internalEvent.id,
        outboxStatus: "pending",
        attempts: 0
      }
    ]);
    await expect(
      restarted.updateInternalEventStatus({
        organizationId: "org_a",
        eventId: internalEvent.id,
        outboxStatus: "failed",
        failureReason: "publisher_timeout",
        nextAttemptAt: "2026-06-24T09:05:00.000Z"
      })
    ).resolves.toMatchObject({
      outboxStatus: "failed",
      attempts: 1,
      failureReason: "publisher_timeout",
      nextAttemptAt: "2026-06-24T09:05:00.000Z"
    });
  });
});

const createService = (client: FakeProductV1PrismaClient): ProductV1Service =>
  new ProductV1Service(new PrismaProductV1Repository(client as unknown as ProductV1PrismaClient), {
    now: () => new Date("2026-06-24T09:00:00.000Z"),
    idFactory: sequenceIdFactory()
  });

const sequenceIdFactory = () => {
  let next = 0;
  return () => {
    next += 1;
    return String(next).padStart(4, "0");
  };
};

class FakeProductV1PrismaClient {
  readonly productV1StateRecord = new FakeProductV1StateRecordDelegate();
}

class FakeProductV1StateRecordDelegate {
  readonly rows: Array<Record<string, unknown>> = [];

  async create(input: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const row = {
      ...input.data,
      createdAt: input.data.createdAt ?? new Date("2026-06-24T09:00:00.000Z"),
      updatedAt: input.data.updatedAt ?? new Date("2026-06-24T09:00:00.000Z")
    };
    this.rows.push(row);
    return row;
  }

  async findFirst(input: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null> {
    return this.rows.find((row) => matchesWhere(row, input.where)) ?? null;
  }

  async findMany(input: {
    orderBy?: Record<string, "asc" | "desc">;
    where?: Record<string, unknown>;
  } = {}): Promise<Array<Record<string, unknown>>> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where ?? {}));
    sortRows(rows, input.orderBy);
    return rows;
  }

  async findUnique(input: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null> {
    return this.rows.find((row) => matchesWhere(row, input.where)) ?? null;
  }

  async update(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const row = this.rows.find((candidate) => matchesWhere(candidate, input.where));
    if (!row) {
      throw new Error("Fake product v1 state row not found.");
    }
    Object.assign(row, input.data);
    return row;
  }
}

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown>): boolean =>
  Object.entries(where).every(([key, expected]) => row[key] === expected);

const sortRows = (rows: Array<Record<string, unknown>>, orderBy?: Record<string, "asc" | "desc">): void => {
  const entry = Object.entries(orderBy ?? {})[0];
  if (!entry) {
    return;
  }
  const [field, direction] = entry;
  rows.sort((left, right) => {
    const leftTime = new Date(String(left[field])).getTime();
    const rightTime = new Date(String(right[field])).getTime();
    return direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });
};
