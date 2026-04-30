import { randomUUID } from "node:crypto";

import { PURESOC_LEGAL_CAVEAT } from "../../../../packages/shared/src/index";
import {
  buildInternalReadinessReport,
  buildRomaniaNotificationDraftExport,
  stableJsonExport,
  type InternalReadinessReport,
  type RomaniaNotificationDraftExport,
  type StoredRomaniaNotificationDraftInput
} from "../../../../packages/reports/src/index";
import type { GeneratedReportRecord, StoredAnalysisRecord } from "../output-records";

export interface ReportRepository {
  findStoredAnalysis(organizationId: string, assessmentId: string): Promise<StoredAnalysisRecord | null>;
  saveGeneratedReport(record: GeneratedReportRecord): Promise<GeneratedReportRecord>;
}

export interface ReportApiServiceOptions {
  repository: ReportRepository;
  now?: () => Date;
}

export class ReportApiService {
  private readonly repository: ReportRepository;
  private readonly now: () => Date;

  constructor(options: ReportApiServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
  }

  async buildInternalReadinessReport(input: {
    organizationId: string;
    assessmentId: string;
    actorUserId: string;
  }): Promise<{ report: GeneratedReportRecord; exportJson: string }> {
    const analysis = await this.requireStoredAnalysis(input.organizationId, input.assessmentId);
    const reportData = buildInternalReadinessReport({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      jurisdiction: analysis.jurisdiction,
      generatedAt: this.now().toISOString(),
      catalogVersion: analysis.catalogVersion,
      analysisRecordedAt: analysis.recordedAt,
      controlResults: analysis.results,
      gaps: analysis.gaps,
      recommendations: analysis.recommendations,
      readinessPlan: analysis.readinessPlan,
      evidence: analysis.evidenceArtifacts
    });
    const report = await this.persistReport({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      reportType: "internal_readiness",
      jurisdiction: analysis.jurisdiction,
      reportData,
      createdBy: input.actorUserId
    });

    return {
      report,
      exportJson: stableJsonExport(reportData)
    };
  }

  async buildRomaniaNotificationDraft(input: {
    organizationId: string;
    actorUserId: string;
    draft: StoredRomaniaNotificationDraftInput;
  }): Promise<{ report: GeneratedReportRecord; exportJson: string }> {
    if (input.draft.organizationId !== input.organizationId) {
      throw new Error("Romania notification draft input contains records from another organization.");
    }

    const reportData = buildRomaniaNotificationDraftExport({
      ...input.draft,
      generatedAt: input.draft.generatedAt ?? this.now().toISOString()
    });
    const report = await this.persistReport({
      organizationId: input.organizationId,
      assessmentId: input.draft.assessmentId,
      reportType: "romania_notification_draft",
      jurisdiction: "RO",
      reportData,
      createdBy: input.actorUserId
    });

    return {
      report,
      exportJson: stableJsonExport(reportData)
    };
  }

  private async requireStoredAnalysis(organizationId: string, assessmentId: string): Promise<StoredAnalysisRecord> {
    const analysis = await this.repository.findStoredAnalysis(organizationId, assessmentId);
    if (!analysis) {
      throw new Error("Stored analysis record was not found for this organization and assessment.");
    }

    return analysis;
  }

  private async persistReport(input: {
    organizationId: string;
    assessmentId?: string;
    reportType: string;
    jurisdiction?: string;
    reportData: InternalReadinessReport | RomaniaNotificationDraftExport;
    createdBy: string;
  }): Promise<GeneratedReportRecord> {
    return this.repository.saveGeneratedReport({
      id: randomUUID(),
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      reportType: input.reportType,
      jurisdiction: input.jurisdiction,
      status: "ready",
      legalCaveat: PURESOC_LEGAL_CAVEAT,
      sourceReferences: input.reportData.sourceReferences.map((reference) => reference.sourceRecordId),
      reportData: input.reportData,
      createdBy: input.createdBy,
      createdAt: this.now().toISOString()
    });
  }
}
