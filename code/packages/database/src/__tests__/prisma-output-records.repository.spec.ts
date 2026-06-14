import { describe, expect, it } from "vitest";

import {
  InMemoryOutputRecordRepository,
  PrismaOutputRecordRepository,
  type DashboardSnapshotRecordContract,
  type GeneratedReportRecordContract,
  type PrismaOutputRecordClient,
  type ReportExportRecordContract,
  type StoredAnalysisRecordContract
} from "../index";
import { createStoredAnalysisDashboardSnapshot } from "@puresoc/dashboards";
import { createReportShell } from "@puresoc/reports";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const ASSESSMENT_ID = "33333333-3333-4333-8333-333333333333";
const ACTOR_ID = "44444444-4444-4444-8444-444444444444";
const EVIDENCE_ID = "55555555-5555-4555-8555-555555555555";
const RECORDED_AT = "2026-05-01T09:00:00.000Z";

describe("output record repositories", () => {
  it("keeps the in-memory output adapter organization-scoped and deterministic", async () => {
    const repository = new InMemoryOutputRecordRepository();
    const analysis = storedAnalysisFixture();
    const report = generatedReportFixture();
    const reportExport = reportExportFixture(report.id);
    const oldSnapshot = dashboardSnapshotFixture("66666666-6666-4666-8666-666666666666", "2026-05-01T08:00:00.000Z");
    const newSnapshot = dashboardSnapshotFixture("77777777-7777-4777-8777-777777777777", "2026-05-01T10:00:00.000Z");

    await repository.saveStoredAnalysis(analysis);
    await repository.saveGeneratedReport(report);
    await repository.saveReportExport(reportExport);
    await repository.saveDashboardSnapshot(oldSnapshot);
    await repository.saveDashboardSnapshot(newSnapshot);

    await expect(repository.findStoredAnalysis(ORG_A, ASSESSMENT_ID)).resolves.toEqual(analysis);
    await expect(repository.findStoredAnalysis(ORG_B, ASSESSMENT_ID)).resolves.toBeNull();
    await expect(repository.findGeneratedReport(ORG_A, report.id)).resolves.toEqual(report);
    await expect(repository.findGeneratedReport(ORG_B, report.id)).resolves.toBeNull();
    await expect(repository.findReportExport(ORG_A, reportExport.id)).resolves.toEqual(reportExport);
    await expect(repository.findReportExport(ORG_B, reportExport.id)).resolves.toBeNull();
    await expect(repository.listReportExportsForReport(ORG_A, report.id)).resolves.toEqual([reportExport]);
    await expect(repository.listReportExportsForReport(ORG_B, report.id)).resolves.toEqual([]);
    await expect(repository.findLatestDashboardSnapshot(ORG_A, ASSESSMENT_ID)).resolves.toMatchObject({
      id: newSnapshot.id,
      organizationId: ORG_A
    });
    await expect(repository.listDashboardSnapshots(ORG_A, { since: "2026-05-01T00:00:00.000Z" })).resolves.toEqual([
      oldSnapshot,
      newSnapshot
    ]);
    await expect(repository.listLatestStoredAnalyses()).resolves.toEqual([analysis]);
  });

  it("persists stored analyses, generated reports, and dashboard snapshots through Prisma delegates", async () => {
    const client = new FakePrismaOutputRecordClient();
    const repository = new PrismaOutputRecordRepository(client as unknown as PrismaOutputRecordClient);
    const analysis = storedAnalysisFixture();
    const report = generatedReportFixture();
    const reportExport = reportExportFixture(report.id);
    const oldSnapshot = dashboardSnapshotFixture("66666666-6666-4666-8666-666666666666", "2026-05-01T08:00:00.000Z");
    const newSnapshot = dashboardSnapshotFixture("77777777-7777-4777-8777-777777777777", "2026-05-01T10:00:00.000Z");

    client.complianceResultSnapshot.rows.push({
      organizationId: ORG_A,
      assessmentId: ASSESSMENT_ID,
      jurisdiction: "EU",
      catalogVersion: "2026.04",
      recordedAt: new Date(RECORDED_AT),
      resultSetJson: {
        checklistItems: [{ id: "manual-task-preserved" }]
      }
    });

    await repository.saveStoredAnalysis(analysis);
    await repository.saveGeneratedReport(report);
    await repository.saveReportExport(reportExport);
    await repository.saveDashboardSnapshot(oldSnapshot);
    await repository.saveDashboardSnapshot(newSnapshot);

    const storedSnapshotJson = client.complianceResultSnapshot.rows[0]?.resultSetJson as Record<string, unknown>;
    expect(storedSnapshotJson.evidenceArtifacts).toEqual(analysis.evidenceArtifacts);
    expect(storedSnapshotJson.checklistItems).toEqual([{ id: "manual-task-preserved" }]);

    await expect(repository.findStoredAnalysis(ORG_A, ASSESSMENT_ID)).resolves.toEqual(analysis);
    await expect(repository.findStoredAnalysis(ORG_B, ASSESSMENT_ID)).resolves.toBeNull();
    await expect(repository.findGeneratedReport(ORG_A, report.id)).resolves.toEqual(report);
    await expect(repository.findGeneratedReport(ORG_B, report.id)).resolves.toBeNull();
    await expect(repository.findReportExport(ORG_A, reportExport.id)).resolves.toEqual(reportExport);
    await expect(repository.findReportExport(ORG_B, reportExport.id)).resolves.toBeNull();
    await expect(repository.listReportExportsForReport(ORG_A, report.id)).resolves.toEqual([reportExport]);
    await expect(repository.listReportExportsForReport(ORG_B, report.id)).resolves.toEqual([]);
    await expect(repository.findLatestDashboardSnapshot(ORG_A, ASSESSMENT_ID)).resolves.toMatchObject({
      id: newSnapshot.id,
      snapshot: {
        readinessScoreLabel: "PureSOC internal readiness"
      }
    });
    await expect(repository.listDashboardSnapshots(ORG_A, { since: "2026-05-01T00:00:00.000Z" })).resolves.toEqual([
      oldSnapshot,
      newSnapshot
    ]);
    await expect(repository.listLatestStoredAnalyses()).resolves.toEqual([analysis]);

    expect(client.generatedReport.lastFindFirstWhere).toEqual({
      id: report.id,
      organizationId: ORG_B
    });
  });
});

const storedAnalysisFixture = (): StoredAnalysisRecordContract => ({
  organizationId: ORG_A,
  assessmentId: ASSESSMENT_ID,
  jurisdiction: "EU",
  catalogVersion: "2026.04",
  recordedAt: RECORDED_AT,
  results: [
    {
      id: `${ASSESSMENT_ID}:nis2.risk.policy:EU`,
      organizationId: ORG_A,
      assessmentId: ASSESSMENT_ID,
      controlId: "nis2.risk.policy",
      controlCode: "NIS2-EU-RISK-001",
      jurisdiction: "EU",
      status: "passing",
      confidence: "high",
      providerSignalIds: [],
      evidenceArtifactIds: [EVIDENCE_ID],
      checklistRunItemIds: [],
      summary: "Risk policy evidence is present.",
      matchedFindings: [],
      missingEvidence: [],
      manualTasks: [],
      countryPackWarnings: [],
      sourceReferences: [{ sourceRecordId: "nis2-directive", article: "21" }],
      evidenceCompleteness: {
        required: 1,
        present: 1,
        missing: 0,
        ratio: 1
      },
      evaluatedAt: RECORDED_AT
    }
  ],
  gaps: [],
  recommendations: [],
  readinessPlan: {
    id: `${ASSESSMENT_ID}:readiness-plan`,
    organizationId: ORG_A,
    assessmentId: ASSESSMENT_ID,
    title: "PureSOC internal readiness plan",
    targetReadinessPercent: 100,
    status: "draft",
    generatedAt: RECORDED_AT,
    items: []
  },
  evidenceArtifacts: [
    {
      id: EVIDENCE_ID,
      organizationId: ORG_A,
      controlId: "nis2.risk.policy",
      jurisdiction: "EU",
      sourceType: "manual_upload",
      title: "Risk policy",
      storageUri: "object://private/evidence/risk-policy.pdf",
      contentHashSha256: "abc123",
      mimeType: "application/pdf",
      sizeBytes: 12,
      scanStatus: "clean",
      createdAt: RECORDED_AT,
      links: []
    }
  ]
});

const generatedReportFixture = (): GeneratedReportRecordContract => {
  const reportData = {
    ...createReportShell(ORG_A, "EU"),
    assessmentId: ASSESSMENT_ID,
    generatedAt: RECORDED_AT,
    sourceReferences: [{ sourceRecordId: "nis2-directive", jurisdiction: "EU", article: "21" }]
  };

  return {
    id: "88888888-8888-4888-8888-888888888888",
    organizationId: ORG_A,
    assessmentId: ASSESSMENT_ID,
    reportType: "internal_readiness",
    jurisdiction: "EU",
    status: "ready",
    legalCaveat: reportData.legalCaveat,
    sourceReferences: ["nis2-directive"],
    reportData,
    evidenceArtifactId: EVIDENCE_ID,
    contentHashSha256: "f".repeat(64),
    createdBy: ACTOR_ID,
    createdAt: RECORDED_AT
  };
};

const reportExportFixture = (generatedReportId: string): ReportExportRecordContract => ({
  id: "99999999-9999-4999-8999-999999999999",
  organizationId: ORG_A,
  generatedReportId,
  exportFormat: "json",
  status: "ready",
  contentHashSha256: "abc123",
  createdAt: RECORDED_AT
});

const dashboardSnapshotFixture = (id: string, createdAt: string): DashboardSnapshotRecordContract => ({
  id,
  organizationId: ORG_A,
  assessmentId: ASSESSMENT_ID,
  snapshotType: "readiness_overview",
  source: "stored_analysis",
  snapshot: {
    ...createStoredAnalysisDashboardSnapshot(ORG_A),
    assessmentId: ASSESSMENT_ID,
    generatedAt: createdAt
  },
  createdAt
});

class FakePrismaOutputRecordClient {
  readonly complianceResultSnapshot = new FakeDelegate();
  readonly dashboardSnapshot = new FakeDelegate();
  readonly generatedReport = new FakeDelegate();
  readonly reportExport = new FakeDelegate();
}

class FakeDelegate {
  readonly rows: Array<Record<string, unknown>> = [];
  lastFindFirstWhere: Record<string, unknown> | undefined;
  lastFindUniqueWhere: Record<string, unknown> | undefined;

  async upsert(input: {
    where: Record<string, unknown>;
    update: Record<string, unknown>;
    create: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const existing = this.findByWhere(input.where);
    if (existing) {
      Object.assign(existing, input.update);
      return existing;
    }

    const row = {
      ...input.create
    };
    this.rows.push(row);
    return row;
  }

  async findFirst(input: {
    orderBy?: { createdAt?: "asc" | "desc"; recordedAt?: "asc" | "desc" };
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown> | null> {
    this.lastFindFirstWhere = input.where;
    const rows = this.rows.filter((row) => matchesWhere(row, input.where));
    if (input.orderBy?.createdAt === "desc") {
      rows.sort((left, right) => toDate(right.createdAt).getTime() - toDate(left.createdAt).getTime());
    }
    if (input.orderBy?.recordedAt === "desc") {
      rows.sort((left, right) => toDate(right.recordedAt).getTime() - toDate(left.recordedAt).getTime());
    }

    return rows[0] ?? null;
  }

  async findMany(input: {
    orderBy?: { createdAt?: "asc" | "desc"; recordedAt?: "asc" | "desc" };
    where: Record<string, unknown>;
  }): Promise<Array<Record<string, unknown>>> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where ?? {}));
    if (input.orderBy?.createdAt === "asc") {
      rows.sort((left, right) => toDate(left.createdAt).getTime() - toDate(right.createdAt).getTime());
    }
    if (input.orderBy?.createdAt === "desc") {
      rows.sort((left, right) => toDate(right.createdAt).getTime() - toDate(left.createdAt).getTime());
    }
    if (input.orderBy?.recordedAt === "asc") {
      rows.sort((left, right) => toDate(left.recordedAt).getTime() - toDate(right.recordedAt).getTime());
    }
    if (input.orderBy?.recordedAt === "desc") {
      rows.sort((left, right) => toDate(right.recordedAt).getTime() - toDate(left.recordedAt).getTime());
    }

    return rows;
  }

  async findUnique(input: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null> {
    this.lastFindUniqueWhere = input.where;
    return this.findByWhere(input.where) ?? null;
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

    if (field === "createdAt" && isRecord(expected)) {
      const value = toDate(row.createdAt).getTime();
      if (expected.gte !== undefined && value < toDate(expected.gte).getTime()) {
        return false;
      }
      if (expected.lte !== undefined && value > toDate(expected.lte).getTime()) {
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

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
