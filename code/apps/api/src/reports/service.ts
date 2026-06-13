import { createHash, randomUUID } from "node:crypto";

import type { AuditWriter } from "@puresoc/audit";
import type { OutputRecordRepository } from "@puresoc/database";
import {
  buildPdfReportHtml,
  buildInternalReadinessEvidencePackageExport,
  buildInternalReadinessCsvExport,
  buildInternalReadinessReport,
  buildRomaniaNotificationDraftExport,
  INTERNAL_READINESS_EVIDENCE_PACKAGE_MIME_TYPE,
  normalizeEvidencePackageLimits,
  ReportExportError,
  stableJsonExport,
  type EvidencePackageEvidenceFileInput,
  type EvidencePackageLimitConfig,
  type InternalReadinessCsvExport,
  type InternalReadinessEvidencePackageExport,
  type InternalReadinessReport,
  type RomaniaNotificationDraftExport,
  type StoredRomaniaNotificationDraftInput
} from "@puresoc/reports";
import type { EvidenceApiService } from "../evidence/service";
import type { GeneratedReportRecord, StoredAnalysisRecord } from "../output-records";

export type ReportRepository = Pick<
  OutputRecordRepository,
  "findLatestStoredAnalysis" | "findStoredAnalysis" | "saveGeneratedReport" | "saveReportExport"
>;

export interface ReportApiServiceOptions {
  repository: ReportRepository;
  evidence?: EvidenceApiService;
  auditWriter?: AuditWriter;
  renderer?: ReportRendererClient;
  pdfRenderer?: ReportPdfRendererClient;
  storeGeneratedReportsAsEvidence?: boolean;
  evidencePackageLimits?: EvidencePackageLimitConfig;
  now?: () => Date;
}

export interface ReportRendererClient {
  render(input: {
    format: "json" | "pdf";
    reportData: Record<string, unknown>;
    renderedAt?: string;
  }): Promise<RenderedReportArtifact> | RenderedReportArtifact;
}

export interface ReportPdfRendererClient {
  renderPdf(input: {
    html: string;
    filename: string;
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
  private readonly pdfRenderer?: ReportPdfRendererClient;
  private readonly storeGeneratedReportsAsEvidence: boolean;
  private readonly evidencePackageLimits?: EvidencePackageLimitConfig;
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
    this.pdfRenderer = options.pdfRenderer;
    this.storeGeneratedReportsAsEvidence = options.storeGeneratedReportsAsEvidence ?? false;
    this.evidencePackageLimits = options.evidencePackageLimits;
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

  async buildInternalReadinessCsvExport(input: {
    organizationId: string;
    assessmentId: string;
    actorUserId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{
    report: GeneratedReportRecord;
    csvExport: InternalReadinessCsvExport;
    exportCsv: string;
    csvArtifactId?: string;
  }> {
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
    const csvExport = buildInternalReadinessCsvExport(reportData);
    const csvExportContentHashSha256 = createHash("sha256").update(csvExport.csv).digest("hex");
    const csvArtifactId = await this.storeCsvExportEvidence({
      reportId: report.id,
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      reportType: "internal_readiness",
      jurisdiction: analysis.jurisdiction,
      csvExport,
      createdBy: input.actorUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
    await this.repository.saveReportExport({
      id: randomUUID(),
      organizationId: input.organizationId,
      generatedReportId: report.id,
      exportFormat: "csv",
      status: "ready",
      contentHashSha256: csvExportContentHashSha256,
      createdAt: this.now().toISOString()
    });

    return {
      report,
      csvExport,
      exportCsv: csvExport.csv,
      csvArtifactId
    };
  }

  async buildInternalReadinessEvidencePackage(input: {
    organizationId: string;
    assessmentId: string;
    actorUserId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{
    report: GeneratedReportRecord;
    packageExport: Omit<InternalReadinessEvidencePackageExport, "bundle">;
    bundleBase64: string;
    packageArtifactId?: string;
  }> {
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
    const evidencePackageLimits = normalizeEvidencePackageLimits(this.evidencePackageLimits);
    if (reportData.evidence.length > evidencePackageLimits.maxEvidenceFiles) {
      throw new ReportExportError(
        "evidence_package_too_many_evidence_files",
        `Evidence package includes ${reportData.evidence.length} evidence files, exceeding the configured maximum of ${evidencePackageLimits.maxEvidenceFiles}.`
      );
    }
    const evidenceFiles = await this.collectEvidencePackageFiles({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      evidence: reportData.evidence,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
    const packageExport = buildInternalReadinessEvidencePackageExport({
      report: reportData,
      evidenceFiles,
      limits: evidencePackageLimits
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
    const packageArtifactId = await this.storeEvidencePackageExportEvidence({
      reportId: report.id,
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      reportType: "evidence_package",
      jurisdiction: analysis.jurisdiction,
      packageExport,
      createdBy: input.actorUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
    await this.repository.saveReportExport({
      id: randomUUID(),
      organizationId: input.organizationId,
      generatedReportId: report.id,
      exportFormat: "binary_evidence_package",
      status: "ready",
      contentHashSha256: packageExport.contentHashSha256,
      createdAt: this.now().toISOString()
    });

    const { bundle, ...safePackageExport } = packageExport;
    void bundle;

    return {
      report,
      packageExport: safePackageExport,
      bundleBase64: Buffer.from(packageExport.bundle).toString("base64"),
      packageArtifactId
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

  async buildGapReportPdf(input: {
    organizationId: string;
    assessmentId?: string;
    actorUserId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{
    report: GeneratedReportRecord;
    pdf: {
      filename: string;
      mimeType: string;
      contentHashSha256: string;
      body: Uint8Array;
    };
    pdfArtifactId?: string;
  }> {
    const analysis = input.assessmentId
      ? await this.requireStoredAnalysis(input.organizationId, input.assessmentId)
      : await this.requireLatestStoredAnalysis(input.organizationId);
    const reportData = buildInternalReadinessReport({
      organizationId: input.organizationId,
      assessmentId: analysis.assessmentId,
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

    return this.persistPdfReport({
      organizationId: input.organizationId,
      assessmentId: analysis.assessmentId,
      reportType: "gap_report",
      jurisdiction: analysis.jurisdiction,
      reportData,
      template: "gap_report",
      filename: `puresoc-gap-report-${analysis.assessmentId}.pdf`,
      title: "NIS2 Gap Report",
      createdBy: input.actorUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
  }

  async buildRomaniaNotificationDraftPdf(input: {
    organizationId: string;
    actorUserId: string;
    draft: StoredRomaniaNotificationDraftInput;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{
    report: GeneratedReportRecord;
    pdf: {
      filename: string;
      mimeType: string;
      contentHashSha256: string;
      body: Uint8Array;
    };
    pdfArtifactId?: string;
  }> {
    if (input.draft.organizationId !== input.organizationId) {
      throw new Error("Romania notification draft input contains records from another organization.");
    }

    const reportData = buildRomaniaNotificationDraftExport({
      ...input.draft,
      generatedAt: input.draft.generatedAt ?? this.now().toISOString()
    });

    return this.persistPdfReport({
      organizationId: input.organizationId,
      assessmentId: input.draft.assessmentId,
      reportType: "romania_notification_draft",
      jurisdiction: "RO",
      reportData,
      template: "romania_notification_draft",
      filename: `puresoc-romania-notification-draft-${input.draft.notificationDraftId ?? "latest"}.pdf`,
      title: "Romanian NIS2 Notification Draft",
      createdBy: input.actorUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
  }

  private async requireStoredAnalysis(organizationId: string, assessmentId: string): Promise<StoredAnalysisRecord> {
    const analysis = await this.repository.findStoredAnalysis(organizationId, assessmentId);
    if (!analysis) {
      throw new Error("Stored analysis record was not found for this organization and assessment.");
    }

    return analysis;
  }

  private async requireLatestStoredAnalysis(organizationId: string): Promise<StoredAnalysisRecord> {
    const analysis = await this.repository.findLatestStoredAnalysis(organizationId);
    if (!analysis) {
      throw new Error("Stored analysis record was not found for this organization.");
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
      contentHashSha256: rendered.contentHashSha256,
      createdBy: input.createdBy,
      createdAt: this.now().toISOString()
    });
    await this.repository.saveReportExport({
      id: randomUUID(),
      organizationId: input.organizationId,
      generatedReportId: report.id,
      exportFormat: rendered.format,
      status: "ready",
      contentHashSha256: rendered.contentHashSha256,
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

  private async persistPdfReport(input: {
    organizationId: string;
    assessmentId?: string;
    reportType: string;
    jurisdiction?: string;
    reportData: InternalReadinessReport | RomaniaNotificationDraftExport;
    template: "gap_report" | "romania_notification_draft";
    filename: string;
    title: string;
    createdBy: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{
    report: GeneratedReportRecord;
    pdf: {
      filename: string;
      mimeType: string;
      contentHashSha256: string;
      body: Uint8Array;
    };
    pdfArtifactId?: string;
  }> {
    if (!this.pdfRenderer) {
      throw new ReportExportError("pdf_renderer_not_configured", "PDF renderer is not configured.", 503);
    }

    const reportId = randomUUID();
    const html = buildPdfReportHtml({
      template: input.template,
      reportData: input.reportData,
      title: input.title
    });
    const rendered = await this.pdfRenderer.renderPdf({
      html,
      filename: input.filename,
      renderedAt: input.reportData.generatedAt
    });
    const pdfArtifactId = await this.storeReportEvidence({
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
      evidenceArtifactId: pdfArtifactId,
      contentHashSha256: rendered.contentHashSha256,
      createdBy: input.createdBy,
      createdAt: this.now().toISOString()
    });
    await this.repository.saveReportExport({
      id: randomUUID(),
      organizationId: input.organizationId,
      generatedReportId: report.id,
      exportFormat: "pdf",
      status: "ready",
      contentHashSha256: rendered.contentHashSha256,
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
        evidenceArtifactId: pdfArtifactId,
        format: "pdf",
        contentHashSha256: rendered.contentHashSha256
      }
    });

    const downloaded = await this.downloadStoredPdfForResponse({
      organizationId: input.organizationId,
      actorUserId: input.createdBy,
      pdfArtifactId,
      rendered,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return {
      report,
      pdf: {
        filename: input.filename,
        mimeType: downloaded.mimeType,
        contentHashSha256: downloaded.contentHashSha256,
        body: downloaded.body
      },
      pdfArtifactId
    };
  }

  private async downloadStoredPdfForResponse(input: {
    organizationId: string;
    actorUserId: string;
    pdfArtifactId?: string;
    rendered: RenderedReportArtifact;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<Pick<RenderedReportArtifact, "body" | "mimeType" | "contentHashSha256">> {
    if (!this.evidence || !input.pdfArtifactId) {
      return {
        body: input.rendered.body,
        mimeType: input.rendered.mimeType,
        contentHashSha256: input.rendered.contentHashSha256
      };
    }

    const download = await this.evidence.download({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      evidenceArtifactId: input.pdfArtifactId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return {
      body: download.body,
      mimeType: download.mimeType,
      contentHashSha256: download.contentHashSha256
    };
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
      title: `${input.reportType} ${input.reportId} ${input.rendered.format.toUpperCase()} export`,
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
          relation: input.rendered.format === "json" ? "generated_report_export" : "generated_report_pdf_export"
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

  private async storeCsvExportEvidence(input: {
    reportId: string;
    organizationId: string;
    assessmentId?: string;
    reportType: string;
    jurisdiction?: string;
    csvExport: InternalReadinessCsvExport;
    createdBy: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<string | undefined> {
    if (!this.evidence || !this.storeGeneratedReportsAsEvidence) {
      return undefined;
    }

    const body = Buffer.from(input.csvExport.csv, "utf8");
    const contentHashSha256 = createHash("sha256").update(body).digest("hex");
    const sourceReferences = input.csvExport.sourceReferences.map((reference) => reference.sourceRecordId);
    const upload = await this.evidence.upload({
      organizationId: input.organizationId,
      actorUserId: input.createdBy,
      title: `${input.reportType} ${input.reportId} CSV export`,
      content: body.toString("base64"),
      contentEncoding: "base64",
      mimeType: "text/csv",
      sourceType: "generated_report",
      sourceProvider: "puresoc-report-csv-builder",
      jurisdiction: input.jurisdiction,
      linkedAssessmentId: input.assessmentId,
      linkedSourceRecordId: sourceReferences[0],
      links: [
        {
          targetType: "report",
          targetId: input.reportId,
          relation: "generated_report_csv_export"
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
        format: input.csvExport.exportFormat,
        mimeType: "text/csv",
        contentHashSha256,
        rowCount: input.csvExport.rowCount,
        tableNames: input.csvExport.tableNames
      }
    });

    return upload.artifact.id;
  }

  private async collectEvidencePackageFiles(input: {
    organizationId: string;
    actorUserId: string;
    evidence: readonly InternalReadinessReport["evidence"][number][];
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<EvidencePackageEvidenceFileInput[]> {
    if (!this.evidence) {
      return [];
    }

    const files: EvidencePackageEvidenceFileInput[] = [];
    for (const artifact of input.evidence) {
      const download = await this.evidence.download({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        evidenceArtifactId: artifact.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent
      });
      files.push({
        artifactId: artifact.id,
        title: artifact.title,
        mimeType: download.mimeType || artifact.mimeType,
        body: download.body,
        contentHashSha256: download.contentHashSha256
      });
    }

    return files;
  }

  private async storeEvidencePackageExportEvidence(input: {
    reportId: string;
    organizationId: string;
    assessmentId?: string;
    reportType: string;
    jurisdiction?: string;
    packageExport: InternalReadinessEvidencePackageExport;
    createdBy: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<string | undefined> {
    if (!this.evidence || !this.storeGeneratedReportsAsEvidence) {
      return undefined;
    }

    const sourceReferences = input.packageExport.manifest.sourceReferences.map((reference) => reference.sourceRecordId);
    const upload = await this.evidence.upload({
      organizationId: input.organizationId,
      actorUserId: input.createdBy,
      title: `${input.reportType} ${input.reportId} evidence package`,
      content: Buffer.from(input.packageExport.bundle).toString("base64"),
      contentEncoding: "base64",
      mimeType: INTERNAL_READINESS_EVIDENCE_PACKAGE_MIME_TYPE,
      sourceType: "generated_report",
      sourceProvider: "puresoc-evidence-package-builder",
      jurisdiction: input.jurisdiction,
      linkedAssessmentId: input.assessmentId,
      linkedSourceRecordId: sourceReferences[0],
      links: [
        {
          targetType: "report",
          targetId: input.reportId,
          relation: "generated_report_evidence_package"
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
        format: input.packageExport.exportFormat,
        mimeType: input.packageExport.mimeType,
        contentHashSha256: input.packageExport.contentHashSha256,
        fileCount: input.packageExport.manifest.files.length,
        evidenceArtifactCount: input.packageExport.manifest.evidenceArtifacts.length
      }
    });

    return upload.artifact.id;
  }
}
