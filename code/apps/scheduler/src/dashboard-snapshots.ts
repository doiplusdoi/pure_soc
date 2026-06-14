import { randomUUID } from "node:crypto";

import { aggregateDashboardFromStoredAnalysis, type DashboardSnapshotContract } from "@puresoc/dashboards";
import type { OutputRecordRepository, StoredAnalysisRecordContract } from "@puresoc/database";
import type { ProviderResourceStore } from "@puresoc/providers-core";

export const dashboardSnapshotJobName = "dashboards.createDailySnapshots";

export interface DashboardSnapshotScheduledJob {
  reason: "startup" | "interval" | "manual";
  scheduledAt: string;
}

export interface DashboardSnapshotJobResult {
  jobName: typeof dashboardSnapshotJobName;
  dailyDate: string;
  analyzedOrganizationCount: number;
  createdCount: number;
  skippedExistingCount: number;
  records: Array<{
    action: "created" | "skipped_existing";
    assessmentId: string;
    organizationId: string;
    snapshotId?: string;
  }>;
}

export type DashboardSnapshotRepository = Pick<
  OutputRecordRepository,
  "listLatestStoredAnalyses" | "listDashboardSnapshots" | "saveDashboardSnapshot"
>;

export const runDashboardSnapshotJob = async (input: {
  repository: DashboardSnapshotRepository;
  providerStore?: Pick<ProviderResourceStore, "listConnections">;
  now?: () => Date;
  idFactory?: () => string;
}): Promise<DashboardSnapshotJobResult> => {
  const now = input.now ?? (() => new Date());
  const idFactory = input.idFactory ?? randomUUID;
  const generatedAt = now().toISOString();
  const dailyDate = utcDateKey(generatedAt);
  const dayRange = utcDayRange(generatedAt);
  const analyses = await input.repository.listLatestStoredAnalyses();
  const records: DashboardSnapshotJobResult["records"] = [];

  for (const analysis of analyses) {
    const existing = await input.repository.listDashboardSnapshots(analysis.organizationId, {
      assessmentId: analysis.assessmentId,
      since: dayRange.since,
      until: dayRange.until
    });
    if (existing.length > 0) {
      records.push({
        action: "skipped_existing",
        organizationId: analysis.organizationId,
        assessmentId: analysis.assessmentId,
        snapshotId: existing[existing.length - 1]?.id
      });
      continue;
    }

    const snapshot = await buildDailySnapshot({
      analysis,
      generatedAt,
      providerStore: input.providerStore
    });
    const saved = await input.repository.saveDashboardSnapshot({
      id: idFactory(),
      organizationId: analysis.organizationId,
      assessmentId: analysis.assessmentId,
      snapshotType: snapshot.snapshotType,
      source: "stored_analysis",
      snapshot,
      createdAt: generatedAt
    });

    records.push({
      action: "created",
      organizationId: analysis.organizationId,
      assessmentId: analysis.assessmentId,
      snapshotId: saved.id
    });
  }

  return {
    jobName: dashboardSnapshotJobName,
    dailyDate,
    analyzedOrganizationCount: analyses.length,
    createdCount: records.filter((record) => record.action === "created").length,
    skippedExistingCount: records.filter((record) => record.action === "skipped_existing").length,
    records
  };
};

const buildDailySnapshot = async (input: {
  analysis: StoredAnalysisRecordContract;
  generatedAt: string;
  providerStore?: Pick<ProviderResourceStore, "listConnections">;
}): Promise<DashboardSnapshotContract> =>
  aggregateDashboardFromStoredAnalysis({
    organizationId: input.analysis.organizationId,
    assessmentId: input.analysis.assessmentId,
    generatedAt: input.generatedAt,
    providerConnectionHealth: await countHealthyProviderConnections(input.providerStore, input.analysis.organizationId),
    controlResults: input.analysis.results,
    gaps: input.analysis.gaps,
    recommendations: input.analysis.recommendations,
    evidenceArtifacts: input.analysis.evidenceArtifacts
  });

const countHealthyProviderConnections = async (
  providerStore: Pick<ProviderResourceStore, "listConnections"> | undefined,
  organizationId: string
): Promise<number> => {
  if (!providerStore) {
    return 0;
  }

  const connections = await providerStore.listConnections(organizationId);
  return connections.filter((connection) => connection.status === "connected" && connection.readEnabled).length;
};

const utcDateKey = (value: string): string => new Date(value).toISOString().slice(0, 10);

const utcDayRange = (value: string): { since: string; until: string } => {
  const parsed = new Date(value);
  const since = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  const until = new Date(since.getTime() + 86_400_000 - 1);

  return {
    since: since.toISOString(),
    until: until.toISOString()
  };
};
