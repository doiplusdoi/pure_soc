import { describe, expect, it } from "vitest";

import { PrismaComplianceResultRepository, type PrismaComplianceResultClient } from "../index";
import type { ComplianceResultSet } from "../../../compliance/core/src/index";
import type { RecommendationContract } from "../../../recommendations/src/index";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const ASSESSMENT_ID = "33333333-3333-4333-8333-333333333333";
const ACTOR_ID = "44444444-4444-4444-8444-444444444444";
const RECORDED_AT = "2026-04-30T09:00:00.000Z";

describe("PrismaComplianceResultRepository", () => {
  it("persists and reloads compliance result sets through the Prisma adapter boundary", async () => {
    const client = new FakePrismaComplianceResultClient();
    const repository = new PrismaComplianceResultRepository(client as unknown as PrismaComplianceResultClient);
    const record = resultSetFixture();

    await expect(repository.saveComplianceResults(record)).resolves.toEqual(record);

    expect(client.complianceControlResult.rows).toHaveLength(1);
    expect(client.complianceGap.rows).toHaveLength(1);
    expect(client.providerRecommendation.rows).toHaveLength(1);
    expect(client.readinessPlan.rows).toHaveLength(1);
    expect(client.readinessPlanItem.rows).toHaveLength(1);
    expect(client.complianceResultSnapshot.rows).toHaveLength(1);
    expect(client.providerRecommendation.rows[0]).toMatchObject({
      organizationId: ORG_A,
      assessmentId: ASSESSMENT_ID,
      providerKey: "puresoc",
      moduleKey: "compliance",
      sourceFindingId: null,
      sourceFindingIds: ["finding_mfa"]
    });
    expect(client.complianceGap.rows[0].controlResultId).toBe(client.complianceControlResult.rows[0].id);
    expect(client.readinessPlanItem.rows[0].providerRecommendationId).toBe(client.providerRecommendation.rows[0].id);

    await expect(
      repository.findComplianceResults({ organizationId: ORG_A, assessmentId: ASSESSMENT_ID })
    ).resolves.toEqual(record);
  });

  it("keeps organization-scoped reads and replacement deletes inside the selected organization", async () => {
    const client = new FakePrismaComplianceResultClient();
    const repository = new PrismaComplianceResultRepository(client as unknown as PrismaComplianceResultClient);

    await repository.saveComplianceResults(resultSetFixture());

    await expect(
      repository.findComplianceResults({ organizationId: ORG_B, assessmentId: ASSESSMENT_ID })
    ).resolves.toBeNull();

    expect(client.complianceResultSnapshot.lastFindUniqueWhere).toEqual({
      organizationId_assessmentId: {
        organizationId: ORG_B,
        assessmentId: ASSESSMENT_ID
      }
    });
    for (const delegate of [
      client.providerRecommendation,
      client.complianceGap,
      client.complianceControlResult,
      client.readinessPlan
    ]) {
      expect(delegate.deleteManyCalls[0]?.where).toMatchObject({
        organizationId: ORG_A,
        assessmentId: ASSESSMENT_ID
      });
    }
  });
});

const resultSetFixture = (): ComplianceResultSet<RecommendationContract> => ({
  organizationId: ORG_A,
  assessmentId: ASSESSMENT_ID,
  jurisdiction: "EU",
  catalogVersion: "2026.04",
  recordedAt: RECORDED_AT,
  results: [
    {
      id: `${ASSESSMENT_ID}:nis2.access-control.mfa:EU`,
      organizationId: ORG_A,
      assessmentId: ASSESSMENT_ID,
      controlId: "nis2.access-control.mfa",
      controlCode: "NIS2-EU-MFA-001",
      jurisdiction: "EU",
      status: "failing",
      confidence: "high",
      providerSignalIds: ["finding_mfa"],
      evidenceArtifactIds: [],
      checklistRunItemIds: ["manual_mfa"],
      summary: "Admin MFA coverage is incomplete.",
      matchedFindings: [
        {
          id: "finding_mfa",
          providerKey: "microsoft365",
          moduleKey: "entra",
          findingKey: "mfa.admin.missing",
          title: "Admin MFA missing",
          summary: "One admin account lacks MFA.",
          severity: "high",
          evidence: { adminCount: 1 }
        }
      ],
      missingEvidence: [
        {
          requirementKey: "mfa-policy",
          title: "MFA policy evidence",
          sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }]
        }
      ],
      manualTasks: [
        {
          id: "manual_mfa",
          organizationId: ORG_A,
          assessmentId: ASSESSMENT_ID,
          controlId: "nis2.access-control.mfa",
          templateId: "admin-access-review",
          itemKey: "confirm-admin-mfa",
          title: "Confirm admin MFA coverage",
          status: "assigned",
          ownerUserId: ACTOR_ID,
          evidenceArtifactIds: [],
          sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }]
        }
      ],
      countryPackWarnings: [],
      sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }],
      evidenceCompleteness: {
        required: 1,
        present: 0,
        missing: 1,
        ratio: 0
      },
      evaluatedAt: RECORDED_AT
    }
  ],
  gaps: [
    {
      id: `${ASSESSMENT_ID}:nis2.access-control.mfa:gap`,
      organizationId: ORG_A,
      assessmentId: ASSESSMENT_ID,
      jurisdiction: "EU",
      controlId: "nis2.access-control.mfa",
      controlCode: "NIS2-EU-MFA-001",
      status: "failing",
      severity: "high",
      confidence: "high",
      summary: "Admin MFA coverage is incomplete.",
      findingIds: ["finding_mfa"],
      findings: ["One admin account lacks MFA."],
      missingEvidence: ["MFA policy evidence"],
      recommendedActions: ["Close high-severity finding for NIS2-EU-MFA-001"],
      providerSignals: ["mfa.admin.missing"],
      manualTaskIds: ["manual_mfa"],
      manualTasks: ["Confirm admin MFA coverage"],
      countryPackWarnings: [],
      sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }]
    }
  ],
  recommendations: [
    {
      id: "rec_mfa",
      organizationId: ORG_A,
      sourceFindingId: "finding_mfa",
      sourceFindingIds: ["finding_mfa"],
      manualTaskIds: ["manual_mfa"],
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      title: "Close high-severity finding for NIS2-EU-MFA-001",
      summary: "Admin MFA coverage is incomplete.",
      severity: "high",
      confidence: "high",
      recommendationType: "guided",
      automationMode: "guided",
      requiredPermissions: ["Policy.Read.All"],
      requiredLicense: ["entra_id_p1"],
      expectedChange: "Admins have MFA enforced.",
      blastRadius: "Privileged users",
      manualFallback: "Document compensating controls.",
      evidenceRequired: true,
      status: "proposed",
      sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }]
    }
  ],
  readinessPlan: {
    id: `${ASSESSMENT_ID}:readiness-plan`,
    organizationId: ORG_A,
    assessmentId: ASSESSMENT_ID,
    title: "PureSOC internal readiness plan",
    targetReadinessPercent: 100,
    status: "draft",
    generatedAt: RECORDED_AT,
    items: [
      {
        id: `${ASSESSMENT_ID}:readiness-plan:1:nis2.access-control.mfa`,
        organizationId: ORG_A,
        readinessPlanId: `${ASSESSMENT_ID}:readiness-plan`,
        controlId: "nis2.access-control.mfa",
        providerRecommendationId: "rec_mfa",
        jurisdiction: "EU",
        gapSummary: "Admin MFA coverage is incomplete.",
        recommendedAction: "Close high-severity finding for NIS2-EU-MFA-001",
        actionType: "guided",
        ownerUserId: ACTOR_ID,
        dueDate: "2026-05-07",
        automationAvailable: false,
        evidenceRequired: true,
        findingIds: ["finding_mfa"],
        manualTaskIds: ["manual_mfa"],
        dependencies: ["Policy.Read.All", "entra_id_p1"],
        status: "proposed",
        legalReviewRequired: false,
        sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }]
      }
    ]
  },
  checklistItems: [
    {
      id: "manual_mfa",
      organizationId: ORG_A,
      assessmentId: ASSESSMENT_ID,
      controlId: "nis2.access-control.mfa",
      templateId: "admin-access-review",
      itemKey: "confirm-admin-mfa",
      title: "Confirm admin MFA coverage",
      status: "assigned",
      ownerUserId: ACTOR_ID,
      evidenceArtifactIds: [],
      sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }]
    }
  ]
});

class FakePrismaComplianceResultClient {
  readonly complianceResultSnapshot = new FakeDelegate("snapshot");
  readonly complianceControlResult = new FakeDelegate("control-result");
  readonly complianceGap = new FakeDelegate("gap");
  readonly providerRecommendation = new FakeDelegate("recommendation");
  readonly readinessPlan = new FakeDelegate("plan");
  readonly readinessPlanItem = new FakeDelegate("plan-item");

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

class FakeDelegate {
  readonly rows: Array<Record<string, unknown>> = [];
  readonly deleteManyCalls: Array<{ where: Record<string, unknown> }> = [];
  lastFindUniqueWhere: Record<string, unknown> | undefined;
  private sequence = 0;

  constructor(private readonly prefix: string) {}

  async create(input: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const row = {
      id: `${this.prefix}-${++this.sequence}`,
      ...input.data
    };
    this.rows.push(row);
    return row;
  }

  async upsert(input: {
    where: Record<string, unknown>;
    update: Record<string, unknown>;
    create: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const existing = this.findByWhere(input.where);
    if (existing) {
      Object.assign(existing, input.update, { updatedAt: new Date("2026-04-30T10:00:00.000Z") });
      return existing;
    }

    return this.create({ data: input.create });
  }

  async findUnique(input: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null> {
    this.lastFindUniqueWhere = input.where;
    return this.findByWhere(input.where) ?? null;
  }

  async findMany(input: {
    where: Record<string, unknown>;
    select?: Record<string, boolean>;
  }): Promise<Array<Record<string, unknown>>> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where));
    if (!input.select) {
      return rows;
    }

    return rows.map((row) =>
      Object.fromEntries(Object.entries(input.select ?? {}).filter(([, enabled]) => enabled).map(([key]) => [key, row[key]]))
    );
  }

  async deleteMany(input: { where: Record<string, unknown> }): Promise<{ count: number }> {
    this.deleteManyCalls.push(input);
    const before = this.rows.length;
    const kept = this.rows.filter((row) => !matchesWhere(row, input.where));
    this.rows.splice(0, this.rows.length, ...kept);
    return { count: before - kept.length };
  }

  private findByWhere(where: Record<string, unknown>): Record<string, unknown> | undefined {
    return this.rows.find((row) => matchesWhere(row, where));
  }
}

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown>): boolean => {
  for (const [field, expected] of Object.entries(where)) {
    if (field === "organizationId_assessmentId" && isRecord(expected)) {
      if (row.organizationId !== expected.organizationId || row.assessmentId !== expected.assessmentId) {
        return false;
      }
      continue;
    }

    if (isRecord(expected) && Array.isArray(expected.in)) {
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

