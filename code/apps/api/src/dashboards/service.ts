import { randomUUID } from "node:crypto";

import {
  aggregateDashboardFromStoredAnalysis,
  type DashboardSnapshotContract
} from "@puresoc/dashboards";
import type { OutputRecordRepository } from "@puresoc/database";
import type { DashboardSnapshotRecord } from "../output-records";

export type DashboardRepository = Pick<OutputRecordRepository, "findStoredAnalysis" | "saveDashboardSnapshot">;
export type DashboardReadRepository = Pick<OutputRecordRepository, "findLatestDashboardSnapshot" | "listDashboardSnapshots">;

export interface DashboardSnapshotHistoryPoint {
  date: string;
  overall_score: number;
  critical_gaps: number;
  high_gaps: number;
}

export interface DashboardApiServiceOptions {
  repository: DashboardRepository & DashboardReadRepository;
  now?: () => Date;
}

export class DashboardApiService {
  private readonly repository: DashboardRepository & DashboardReadRepository;
  private readonly now: () => Date;

  constructor(options: DashboardApiServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
  }

  async createReadinessSnapshot(input: {
    organizationId: string;
    assessmentId: string;
    countryPackCompleteness?: number;
    providerConnectionHealth?: number;
  }): Promise<{ record: DashboardSnapshotRecord; snapshot: DashboardSnapshotContract }> {
    const analysis = await this.repository.findStoredAnalysis(input.organizationId, input.assessmentId);
    if (!analysis) {
      throw new Error("Stored analysis record was not found for this organization and assessment.");
    }

    const snapshot = aggregateDashboardFromStoredAnalysis({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      generatedAt: this.now().toISOString(),
      countryPackCompleteness: input.countryPackCompleteness,
      providerConnectionHealth: input.providerConnectionHealth,
      controlResults: analysis.results,
      gaps: analysis.gaps,
      recommendations: analysis.recommendations,
      evidenceArtifacts: analysis.evidenceArtifacts
    });
    const record = await this.repository.saveDashboardSnapshot({
      id: randomUUID(),
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      snapshotType: snapshot.snapshotType,
      source: "stored_analysis",
      snapshot,
      createdAt: this.now().toISOString()
    });

    return {
      record,
      snapshot
    };
  }

  async getLatestReadinessSnapshot(input: {
    organizationId: string;
    assessmentId?: string;
  }): Promise<{ record: DashboardSnapshotRecord; snapshot: DashboardSnapshotContract }> {
    const record = await this.repository.findLatestDashboardSnapshot(input.organizationId, input.assessmentId);
    if (!record) {
      throw new Error("Dashboard snapshot was not found for this organization.");
    }

    return {
      record,
      snapshot: record.snapshot
    };
  }

  async listReadinessSnapshotHistory(input: {
    organizationId: string;
    assessmentId?: string;
    days?: number;
  }): Promise<{ snapshots: DashboardSnapshotHistoryPoint[] }> {
    const days = normalizeDays(input.days);
    const since = startOfUtcDay(addUtcDays(this.now(), -(days - 1))).toISOString();
    const records = await this.repository.listDashboardSnapshots(input.organizationId, {
      assessmentId: input.assessmentId,
      since
    });
    const latestByDate = new Map<string, DashboardSnapshotRecord>();
    for (const record of records) {
      latestByDate.set(utcDateKey(record.createdAt), record);
    }

    return {
      snapshots: [...latestByDate.values()]
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map(toHistoryPoint)
    };
  }
}

const normalizeDays = (days: number | undefined): number => {
  if (!Number.isFinite(days ?? Number.NaN)) {
    return 90;
  }

  return Math.max(1, Math.min(365, Math.round(days ?? 90)));
};

const toHistoryPoint = (record: DashboardSnapshotRecord): DashboardSnapshotHistoryPoint => {
  const metrics = record.snapshot.trendMetrics;
  return {
    date: utcDateKey(record.createdAt),
    overall_score: clampMetric(metrics?.overallScore ?? record.snapshot.readinessScores.overallInternalReadiness),
    critical_gaps: nonNegativeInteger(metrics?.gapCountBySeverity?.critical),
    high_gaps: nonNegativeInteger(metrics?.gapCountBySeverity?.high)
  };
};

const utcDateKey = (value: string): string => new Date(value).toISOString().slice(0, 10);

const addUtcDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const startOfUtcDay = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const clampMetric = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const nonNegativeInteger = (value: number | undefined): number => Math.max(0, Math.round(value ?? 0));
