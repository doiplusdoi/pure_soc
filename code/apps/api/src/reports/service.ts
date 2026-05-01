import { createHash, randomUUID } from "node:crypto";

import type { AuditWriter } from "@puresoc/audit";
import type { OutputRecordRepository } from "@puresoc/database";
import {
  buildInternalReadinessReport,
  buildRomaniaNotificationDraftExport,
  stableJsonExport,
  type InternalReadinessReport,
  type RomaniaNotificationDraftExport,
  type StoredRomaniaNotificationDraftInput
} from "@puresoc/reports";
import type { EvidenceApiService } from "../evidence/service";
import type { GeneratedReportRecord, StoredAnalysisRecord } from "../output-records";

export type ReportRepository = Pick<OutputRecordRepository, "findStoredAnalysis" | "saveGeneratedReport">;

export interface ReportApiServiceOptions {
  repository: ReportRepository;
  evidence?: EvidenceApiService;
  auditWriter?: AuditWriter;
  renderer?: ReportRendererClient;
  storeGeneratedReportsAsEvidence?: boolean;
  now?: () => Date;
}

export interface ReportRendererClient {
  render(input: {
    format: "json" | "pdf";
    reportData: Record<string, unknown>;
    renderedAt?: string;
  }): Promise<RenderedReportArtifact> | RenderedReportArtifact;
}

export interface RenderedReportArtifact {
  format: "json" | "pdf";
  mimeType: string;
  body: Uint8Array;
  contentHashSha256: string;
  renderer: string;
  renderedAt: string;
}

export class ReportApiService {
  private readonly repository: ReportRepository;
  private readonly evidence?: EvidenceApiService;
  private readonly auditWriter?: AuditWriter;
  private readonly renderer: ReportRendererClient;
  private readonly storeGeneratedReportsAsEvidence: boolean;
  private readonly now: () => Date;

  constructor(options: ReportApiServiceOptions) {
    this.repository = options.repository;
    this.evidence = options.evidence;
    this.auditWriter = options.auditWriter;
    this.renderer =
      options.renderer ??
      ({
        render: (input) => {
          const body = Buffer.from(stableJsonExport(input.reportData), "utf8");
          return {
            format: "json",
            mimeType: "application/json",
            body,
            contentHashSha256: createHash("sha256").update(body).digest("hex"),
            renderer: "puresoc-report-renderer",
            renderedAt: input.renderedAt ?? new Date(0).toISOString()
          };
        }
      } satisfies ReportRendererClient);
    this.storeGeneratedReportsAsEvidence = options.storeGeneratedReportsAsEvidence ?? false;
    this.now = options.now ?? (() => new Date());
  }

  async buildInternalReadinessReport(input: {
    organizationId: string;
    assessmentId: string;
    actorUserId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
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
      createdBy: input.actorUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
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
    ipAddress?: string | null;
    userAgent?: string | null;
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
      createdBy: input.actorUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
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
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<GeneratedReportRecord> {
    const reportId = randomUUID();
    const rendered = await this.renderer.render({
      format: "json",
      reportData: input.reportData as unknown as Record<string, unknown>,
      renderedAt: input.reportData.generatedAt
    });
    const evidenceArtifactId = await this.storeReportEvidence({
      reportId,
      rendered,
      ...input
    });
    const report = await this.repository.saveGeneratedReport({
      id: reportId,
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      reportType: input.reportType,
      jurisdiction: input.jurisdiction,
      status: "ready",
      legalCaveat: input.reportData.legalCaveat,
      sourceReferences: input.reportData.sourceReferences.map((reference) => reference.sourceRecordId),
      reportData: input.reportData,
      evidenceArtifactId,
      createdBy: input.createdBy,
      createdAt: this.now().toISOString()
    });

    await this.auditWriter?.write({
      actorUserId: input.createdBy,
      organizationId: input.organizationId,
      targetType: "generated_report",
      targetId: report.id,
      action: "report_generated",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        reportType: input.reportType,
        jurisdiction: input.jurisdiction,
        sourceReferenceCount: report.sourceReferences.length,
        evidenceArtifactId
      }
    });

    return report;
  }

  private async storeReportEvidence(input: {
    reportId: string;
    organizationId: string;
    assessmentId?: string;
    reportType: string;
    jurisdiction?: string;
    reportData: InternalReadinessReport | RomaniaNotificationDraftExport;
    createdBy: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    rendered: RenderedReportArtifact;
  }): Promise<string | undefined> {
    if (!this.evidence || !this.storeGeneratedReportsAsEvidence) {
      return undefined;
    }

    const sourceReferences = input.reportData.sourceReferences.map((reference) => reference.sourceRecordId);
    const upload = await this.evidence.upload({
      organizationId: input.organizationId,
      actorUserId: input.createdBy,
      title: `${input.reportType} ${input.reportId} JSON export`,
      content: Buffer.from(input.rendered.body).toString("base64"),
      contentEncoding: "base64",
      mimeType: input.rendered.mimeType,
      sourceType: "generated_report",
      sourceProvider: input.rendered.renderer,
      jurisdiction: input.jurisdiction,
      linkedAssessmentId: input.assessmentId,
      linkedSourceRecordId: sourceReferences[0],
      links: [
        {
          targetType: "report",
          targetId: input.reportId,
          relation: "generated_report_export"
        },
        ...sourceReferences.slice(1).map((sourceRecordId) => ({
          targetType: "regulatory_source" as const,
          targetId: sourceRecordId,
          relation: "source_reference"
        }))
      ],
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    await this.auditWriter?.write({
      actorUserId: input.createdBy,
      organizationId: input.organizationId,
      targetType: "report_export",
      targetId: upload.artifact.id,
      action: "report_export_created",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        reportId: input.reportId,
        reportType: input.reportType,
        format: input.rendered.format,
        mimeType: input.rendered.mimeType,
        contentHashSha256: input.rendered.contentHashSha256
      }
    });

    return upload.artifact.id;
  }
}
