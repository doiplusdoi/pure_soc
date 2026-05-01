import { randomUUID } from "node:crypto";

import {
  aggregateDashboardFromStoredAnalysis,
  type DashboardSnapshotContract
} from "@puresoc/dashboards";
import type { OutputRecordRepository } from "@puresoc/database";
import type { DashboardSnapshotRecord } from "../output-records";

export type DashboardRepository = Pick<OutputRecordRepository, "findStoredAnalysis" | "saveDashboardSnapshot">;

export interface DashboardApiServiceOptions {
  repository: DashboardRepository;
  now?: () => Date;
}

export class DashboardApiService {
  private readonly repository: DashboardRepository;
  private readonly now: () => Date;

  constructor(options: DashboardApiServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
  }

  async createReadinessSnapshot(input: {
    organizationId: string;
    assessmentId: string;
    countryPackCompleteness?: number;
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
}
