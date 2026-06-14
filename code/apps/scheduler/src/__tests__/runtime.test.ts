import { describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { InMemoryOutputRecordRepository, type StoredAnalysisRecordContract } from "@puresoc/database";
import { InMemoryProviderResourceStore } from "@puresoc/providers-core";
import {
  InMemoryRegulatorySourceRepository,
  type RegulatorySourceMetadataCheckClient,
  type RegulatorySourceMetadataCheckResult,
  type RegulatorySourceRecord
} from "@puresoc/regulatory-sources";

import { createSchedulerRuntime } from "../runtime";

describe("scheduler job runtime", () => {
  it("dispatches the regulatory source monitor through the shared runtime", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_runtime"));
    const metadataClient = fakeMetadataClient({
      source_runtime: {
        outcome: "unreachable",
        statusCode: 503,
        errorCode: "http_status"
      }
    });
    const scheduler = createSchedulerRuntime({
      config: loadConfig({
        env: {
          REGULATORY_SOURCE_MONITOR_ENABLED: "true"
        }
      }),
      repository,
      metadataClient,
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      idFactory: deterministicIds("scheduler_job")
    });

    const dispatch = await scheduler.enqueueRegulatorySourceMonitorJob({
      reason: "startup",
      scheduledAt: "2026-05-01T10:00:00.000Z"
    });
    const result = await scheduler.runtime.runUntilIdle();

    expect(dispatch.status).toBe("enqueued");
    expect(result).toMatchObject({
      status: "idle",
      processedCount: 1
    });
    expect(result.results[0]?.job.result).toMatchObject({
      jobName: "regulatory.monitorCountrySources",
      enabled: true,
      checkedSourceCount: 1,
      reviewTaskCount: 1,
      results: [
        {
          sourceId: "source_runtime",
          action: "review_task_created",
          monitorStatus: "unreachable"
        }
      ]
    });
    expect(metadataClient.checkedSourceIds).toEqual(["source_runtime"]);
  });

  it("creates at most one daily dashboard snapshot per organization", async () => {
    const outputRepository = new InMemoryOutputRecordRepository();
    await outputRepository.saveStoredAnalysis(storedAnalysisRecord());
    const providerStore = new InMemoryProviderResourceStore({
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      idFactory: deterministicIds("provider")
    });
    await providerStore.createConnection({
      organizationId: ORG_ID,
      providerKey: "mock",
      displayName: "Healthy provider",
      status: "connected",
      readEnabled: true
    });
    await providerStore.createConnection({
      organizationId: ORG_ID,
      providerKey: "mock",
      displayName: "Degraded provider",
      status: "degraded",
      readEnabled: true
    });
    const scheduler = createSchedulerRuntime({
      config: loadConfig(),
      outputRepository,
      providerStore,
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      idFactory: deterministicIds("dashboard_snapshot")
    });

    await scheduler.enqueueDashboardSnapshotJob({
      reason: "manual",
      scheduledAt: "2026-05-01T10:00:00.000Z"
    });
    const firstRun = await scheduler.runtime.runUntilIdle();
    await scheduler.enqueueDashboardSnapshotJob({
      reason: "manual",
      scheduledAt: "2026-05-01T12:00:00.000Z"
    });
    const secondRun = await scheduler.runtime.runUntilIdle();
    const snapshots = await outputRepository.listDashboardSnapshots(ORG_ID);

    expect(firstRun.results[0]?.job.result).toMatchObject({
      jobName: "dashboards.createDailySnapshots",
      dailyDate: "2026-05-01",
      createdCount: 1,
      skippedExistingCount: 0
    });
    expect(secondRun.results[0]?.job.result).toMatchObject({
      createdCount: 0,
      skippedExistingCount: 1
    });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.snapshot.trendMetrics).toMatchObject({
      overallScore: 50,
      controlsCompliant: 1,
      controlsTotal: 2,
      providerConnectionHealth: 1,
      gapCountBySeverity: {
        critical: 1,
        high: 1
      }
    });
  });
});

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const ASSESSMENT_ID = "22222222-2222-4222-8222-222222222222";

const storedAnalysisRecord = (): StoredAnalysisRecordContract => ({
  organizationId: ORG_ID,
  assessmentId: ASSESSMENT_ID,
  jurisdiction: "EU",
  catalogVersion: "2026.04",
  recordedAt: "2026-05-01T09:00:00.000Z",
  results: [
    controlResult("nis2.risk.policy", "passing"),
    controlResult("nis2.access-control.mfa", "failing")
  ],
  gaps: [
    {
      id: `${ASSESSMENT_ID}:nis2.access-control.mfa:gap`,
      organizationId: ORG_ID,
      assessmentId: ASSESSMENT_ID,
      controlId: "nis2.access-control.mfa",
      controlCode: "NIS2.ACCESS-CONTROL.MFA",
      jurisdiction: "EU",
      status: "failing",
      severity: "critical",
      confidence: "high",
      summary: "MFA is not enforced for administrators.",
      findingIds: [],
      findings: [],
      missingEvidence: [],
      recommendedActions: [],
      providerSignals: [],
      manualTaskIds: [],
      manualTasks: [],
      countryPackWarnings: [],
      sourceReferences: []
    },
    {
      id: `${ASSESSMENT_ID}:nis2.incident.response:gap`,
      organizationId: ORG_ID,
      assessmentId: ASSESSMENT_ID,
      controlId: "nis2.incident.response",
      controlCode: "NIS2.INCIDENT.RESPONSE",
      jurisdiction: "EU",
      status: "needs_evidence",
      severity: "high",
      confidence: "medium",
      summary: "Incident response evidence is missing.",
      findingIds: [],
      findings: [],
      missingEvidence: [],
      recommendedActions: [],
      providerSignals: [],
      manualTaskIds: [],
      manualTasks: [],
      countryPackWarnings: [],
      sourceReferences: []
    }
  ],
  recommendations: [],
  readinessPlan: {
    id: `${ASSESSMENT_ID}:readiness-plan`,
    organizationId: ORG_ID,
    assessmentId: ASSESSMENT_ID,
    title: "PureSOC internal readiness plan",
    targetReadinessPercent: 100,
    status: "draft",
    generatedAt: "2026-05-01T09:00:00.000Z",
    items: []
  },
  evidenceArtifacts: []
});

const controlResult = (controlId: string, status: "failing" | "passing") => ({
  id: `${ASSESSMENT_ID}:${controlId}:EU`,
  organizationId: ORG_ID,
  assessmentId: ASSESSMENT_ID,
  controlId,
  controlCode: controlId.toUpperCase(),
  jurisdiction: "EU",
  status,
  confidence: "high" as const,
  providerSignalIds: [],
  evidenceArtifactIds: [],
  checklistRunItemIds: [],
  summary: `${controlId} ${status}`,
  matchedFindings: [],
  missingEvidence: [],
  manualTasks: [],
  countryPackWarnings: [],
  sourceReferences: [],
  evidenceCompleteness: {
    required: 1,
    present: status === "passing" ? 1 : 0,
    missing: status === "passing" ? 0 : 1,
    ratio: status === "passing" ? 1 : 0
  },
  evaluatedAt: "2026-05-01T09:00:00.000Z"
});

type FakeMetadataClient = RegulatorySourceMetadataCheckClient & {
  checkedSourceIds: string[];
};

const fakeMetadataClient = (results: Record<string, RegulatorySourceMetadataCheckResult>): FakeMetadataClient => {
  const checkedSourceIds: string[] = [];
  return {
    checkedSourceIds,
    async check(input) {
      checkedSourceIds.push(input.source.id);
      const result = results[input.source.id];
      if (!result) {
        throw new Error(`Missing fake metadata result for ${input.source.id}`);
      }

      return result;
    }
  };
};

const sourceRecord = (id: string): RegulatorySourceRecord => ({
  id,
  frameworkKey: "nis2",
  jurisdiction: "EU",
  sourceType: "directive",
  title: `Source ${id}`,
  url: `https://example.test/${id}`,
  localFilePath: null,
  publicationDate: null,
  lastCheckedAt: "2026-04-29T09:00:00.000Z",
  versionLabel: "2026-04",
  authorityName: "European Commission",
  trustLevel: "primary",
  status: "active",
  activationStatus: "active",
  activeVersionId: `version_${id}`,
  notes: null
});

const seedActiveSource = async (
  repository: InMemoryRegulatorySourceRepository,
  source: RegulatorySourceRecord
) => {
  await repository.upsertSource(source);
  await repository.saveSourceVersion({
    id: source.activeVersionId ?? `version_${source.id}`,
    sourceId: source.id,
    versionLabel: source.versionLabel ?? "2026-04",
    contentHashSha256: "sha256-current",
    activationStatus: "active",
    validationStatus: "validated",
    metadataJson: {},
    importValidationReportJson: {},
    activatedAt: "2026-04-29T09:00:00.000Z",
    activatedBy: "reviewer_1",
    supersededAt: null,
    supersededByVersionId: null,
    createdAt: "2026-04-29T08:00:00.000Z"
  });
};

const deterministicIds = (prefix: string) => {
  let next = 0;
  return () => `${prefix}_${(next += 1).toString().padStart(3, "0")}`;
};
