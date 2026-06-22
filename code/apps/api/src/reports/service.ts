import { createHash, randomUUID } from "node:crypto";

import { AuthError } from "@puresoc/auth-core";
import type { AuditWriter } from "@puresoc/audit";
import type { OutputRecordRepository } from "@puresoc/database";
import type { ProviderNormalizedResource, ProviderResourceStore, ProviderSyncModuleRecord } from "@puresoc/providers-core";
import {
  generateRecommendationSnapshot,
  type Microsoft365SubscriptionInput,
  type RecommendationContract,
  type RecommendationContextInput
} from "@puresoc/recommendations";
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
  type BuildInternalReadinessVerifiedEvidenceInput,
  type EvidencePackageEvidenceFileInput,
  type EvidencePackageLimitConfig,
  type InternalReadinessCsvExport,
  type InternalReadinessEvidencePackageExport,
  type InternalReadinessReportClassificationSnapshot,
  type InternalReadinessReportTriggerType,
  type InternalReadinessReport,
  type InternalReadinessVerifiedObservation,
  type RomaniaNotificationDraftExport,
  type PdfReportTemplate,
  type StoredRomaniaNotificationDraftInput
} from "@puresoc/reports";
import type { EvidenceApiService } from "../evidence/service";
import type { GeneratedReportRecord, StoredAnalysisRecord } from "../output-records";

export type ReportRepository = Pick<
  OutputRecordRepository,
  | "findGeneratedReport"
  | "findLatestStoredAnalysis"
  | "findStoredAnalysis"
  | "saveGeneratedReport"
  | "saveReportExport"
  | "saveStoredAnalysis"
>;

export type ReportProviderResourceStore = Pick<
  ProviderResourceStore,
  "listNormalizedResources" | "listSyncModulesForConnection"
>;

export interface ReportApiServiceOptions {
  repository: ReportRepository;
  evidence?: EvidenceApiService;
  auditWriter?: AuditWriter;
  providerStore?: ReportProviderResourceStore;
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

export interface InternalReadinessReportVersionContext {
  classificationResult?: InternalReadinessReportClassificationSnapshot;
  countryPackVersion?: string;
  onboardingSchemaVersion?: string;
  previousReportId?: string;
  reportVersion?: 1 | 2;
  triggerType?: InternalReadinessReportTriggerType;
}

const generatedReportPdfConfig = (
  report: GeneratedReportRecord
): { filename: string; template: PdfReportTemplate; title: string } => {
  if (report.reportData.reportType === "internal_readiness") {
    const version = report.reportData.version.reportVersion;
    return {
      filename: `puresoc-internal-readiness-v${version}-${report.id}.pdf`,
      template: "gap_report",
      title: `NIS2 Internal Readiness Report v${version}`
    };
  }

  if (report.reportData.reportType === "romania_notification_draft") {
    return {
      filename: `puresoc-romania-notification-draft-${report.id}.pdf`,
      template: "romania_notification_draft",
      title: "Romanian NIS2 Notification Draft"
    };
  }

  throw new AuthError("invalid_request", "Generated report type does not support PDF rendering by ID.", 400);
};

export class ReportApiService {
  private readonly repository: ReportRepository;
  private readonly evidence?: EvidenceApiService;
  private readonly auditWriter?: AuditWriter;
  private readonly providerStore?: ReportProviderResourceStore;
  private readonly renderer: ReportRendererClient;
  private readonly pdfRenderer?: ReportPdfRendererClient;
  private readonly storeGeneratedReportsAsEvidence: boolean;
  private readonly evidencePackageLimits?: EvidencePackageLimitConfig;
  private readonly now: () => Date;

  constructor(options: ReportApiServiceOptions) {
    this.repository = options.repository;
    this.evidence = options.evidence;
    this.auditWriter = options.auditWriter;
    this.providerStore = options.providerStore;
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
    versionContext?: InternalReadinessReportVersionContext;
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
      evidence: analysis.evidenceArtifacts,
      ...input.versionContext
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

  async buildMicrosoft365VerifiedInternalReadinessReport(input: {
    organizationId: string;
    actorUserId: string;
    previousReportId: string;
    providerConnectionId: string;
    assessmentId?: string;
    versionContext?: InternalReadinessReportVersionContext;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ report: GeneratedReportRecord; exportJson: string }> {
    if (!this.providerStore) {
      throw new AuthError("invalid_request", "Provider resource store is not available for verified reports.", 400);
    }

    const previousReport = await this.repository.findGeneratedReport(input.organizationId, input.previousReportId);
    if (!previousReport) {
      throw new AuthError("invalid_request", "Previous internal readiness report was not found.", 404);
    }
    if (previousReport.reportData.reportType !== "internal_readiness") {
      throw new AuthError("invalid_request", "Previous report must be an internal readiness report.", 400);
    }

    const assessmentId = input.assessmentId ?? previousReport.assessmentId;
    if (!assessmentId) {
      throw new AuthError("invalid_request", "Missing assessmentId for verified internal readiness report.", 400);
    }

    const analysis = await this.requireStoredAnalysis(input.organizationId, assessmentId);
    const [normalizedResources, syncModules] = await Promise.all([
      this.providerStore.listNormalizedResources(input.organizationId, input.providerConnectionId),
      this.providerStore.listSyncModulesForConnection(input.organizationId, input.providerConnectionId)
    ]);
    const generatedAt = this.now().toISOString();
    const verifiedEvidence = buildMicrosoft365VerifiedEvidenceSnapshot({
      providerConnectionId: input.providerConnectionId,
      generatedAt,
      normalizedResources,
      syncModules,
      controlResults: analysis.results
    });
    const recommendations = recommendationsWithMicrosoft365Context({
      analysis,
      generatedAt,
      normalizedResources,
      organizationId: input.organizationId
    });
    await this.repository.saveStoredAnalysis({
      ...analysis,
      recordedAt: generatedAt,
      recommendations
    });
    const reportData = buildInternalReadinessReport({
      organizationId: input.organizationId,
      assessmentId,
      jurisdiction: analysis.jurisdiction,
      generatedAt,
      catalogVersion: analysis.catalogVersion,
      analysisRecordedAt: analysis.recordedAt,
      controlResults: analysis.results,
      gaps: analysis.gaps,
      recommendations,
      readinessPlan: analysis.readinessPlan,
      evidence: analysis.evidenceArtifacts,
      methodologyVersion: "puresoc.readiness.verified-microsoft.v1",
      ...input.versionContext,
      previousReportId: input.previousReportId,
      previousReport: previousReport.reportData,
      reportVersion: 2,
      triggerType: "microsoft_sync_completed",
      verifiedEvidence
    });
    const report = await this.persistReport({
      organizationId: input.organizationId,
      assessmentId,
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
    versionContext?: InternalReadinessReportVersionContext;
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
      evidence: analysis.evidenceArtifacts,
      ...input.versionContext
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
    versionContext?: InternalReadinessReportVersionContext;
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
      evidence: analysis.evidenceArtifacts,
      ...input.versionContext
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

  async downloadGeneratedReportPdf(input: {
    organizationId: string;
    reportId: string;
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
    if (!this.pdfRenderer) {
      throw new ReportExportError("pdf_renderer_not_configured", "PDF renderer is not configured.", 503);
    }

    const report = await this.repository.findGeneratedReport(input.organizationId, input.reportId);
    if (!report) {
      throw new AuthError("invalid_request", "Generated report was not found for this organization.", 404);
    }
    const pdfConfig = generatedReportPdfConfig(report);
    const html = buildPdfReportHtml({
      template: pdfConfig.template,
      reportData: report.reportData,
      title: pdfConfig.title,
      reportHash: report.contentHashSha256
    });
    const rendered = await this.pdfRenderer.renderPdf({
      html,
      filename: pdfConfig.filename,
      renderedAt: report.reportData.generatedAt
    });
    const pdfArtifactId = await this.storeReportEvidence({
      reportId: report.id,
      organizationId: input.organizationId,
      assessmentId: report.assessmentId,
      reportType: report.reportType,
      jurisdiction: report.jurisdiction,
      reportData: report.reportData,
      createdBy: input.actorUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      rendered
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
    const downloaded = await this.downloadStoredPdfForResponse({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      pdfArtifactId,
      rendered,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return {
      report,
      pdf: {
        filename: pdfConfig.filename,
        mimeType: downloaded.mimeType,
        contentHashSha256: downloaded.contentHashSha256,
        body: downloaded.body
      },
      pdfArtifactId
    };
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
        reportVersion: input.reportData.reportType === "internal_readiness" ? input.reportData.version.reportVersion : undefined,
        triggerType: input.reportData.reportType === "internal_readiness" ? input.reportData.version.triggerType : undefined,
        readinessValue: input.reportData.reportType === "internal_readiness" ? input.reportData.concepts.readiness.value : undefined,
        evidenceConfidenceValue:
          input.reportData.reportType === "internal_readiness" ? input.reportData.concepts.evidenceConfidence.value : undefined,
        previousReportId:
          input.reportData.reportType === "internal_readiness" ? input.reportData.version.previousReportId : undefined,
        readinessDelta:
          input.reportData.reportType === "internal_readiness" ? input.reportData.comparison?.readinessDelta : undefined,
        evidenceConfidenceDelta:
          input.reportData.reportType === "internal_readiness" ? input.reportData.comparison?.evidenceConfidenceDelta : undefined,
        contradictionCount:
          input.reportData.reportType === "internal_readiness"
            ? input.reportData.verifiedEvidence?.contradictions.length
            : undefined,
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

interface Microsoft365VerifiedEvidenceSnapshotInput {
  providerConnectionId: string;
  generatedAt: string;
  normalizedResources: readonly ProviderNormalizedResource[];
  syncModules: readonly ProviderSyncModuleRecord[];
  controlResults: StoredAnalysisRecord["results"];
}

const microsoft365ProviderKey = "microsoft365";

const buildMicrosoft365VerifiedEvidenceSnapshot = (
  input: Microsoft365VerifiedEvidenceSnapshotInput
): BuildInternalReadinessVerifiedEvidenceInput => {
  const latestModules = latestSyncModules(input.syncModules);
  const observations: InternalReadinessVerifiedObservation[] = [
    ...microsoft365MfaObservations(input, latestModules),
    ...microsoft365SecureScoreObservations(input, latestModules),
    ...microsoft365UnavailableObservations(input, latestModules)
  ];

  return {
    providerKey: microsoft365ProviderKey,
    providerConnectionId: input.providerConnectionId,
    syncRunId: latestSyncRunId([...latestModules.values()]),
    generatedAt: input.generatedAt,
    observations
  };
};

const recommendationsWithMicrosoft365Context = (input: {
  analysis: StoredAnalysisRecord;
  generatedAt: string;
  normalizedResources: readonly ProviderNormalizedResource[];
  organizationId: string;
}): RecommendationContract[] => {
  const generatedRecommendations = generateRecommendationSnapshot({
    organizationId: input.organizationId,
    gaps: input.analysis.gaps,
    context: microsoft365RecommendationContext({
      analysis: input.analysis,
      normalizedResources: input.normalizedResources
    }),
    existingRecommendations: input.analysis.recommendations,
    generatedAt: input.generatedAt
  }).recommendations;

  return mergeRecommendations(input.analysis.recommendations, generatedRecommendations);
};

const microsoft365RecommendationContext = (input: {
  analysis: StoredAnalysisRecord;
  normalizedResources: readonly ProviderNormalizedResource[];
}): RecommendationContextInput => {
  const subscriptions = microsoft365SubscriptionsFromResources(input.normalizedResources);
  const userCount = microsoft365UserCount(input.normalizedResources);
  const microsoft365: NonNullable<RecommendationContextInput["microsoft365"]> = {};

  if (subscriptions.length > 0) {
    microsoft365.subscriptions = subscriptions;
  }
  if (userCount !== undefined) {
    microsoft365.userCount = userCount;
  }

  return {
    countryCode: input.analysis.jurisdiction,
    evidenceConfidence: "medium",
    ...(Object.keys(microsoft365).length > 0 ? { microsoft365 } : {})
  };
};

const microsoft365SubscriptionsFromResources = (
  normalizedResources: readonly ProviderNormalizedResource[]
): Microsoft365SubscriptionInput[] => {
  const subscriptions: Microsoft365SubscriptionInput[] = [];

  for (const resource of normalizedResources) {
    if (resource.providerKey !== microsoft365ProviderKey || resource.resourceType !== "cloud_license") {
      continue;
    }
    const skuPartNumber = stringValue(resource.normalizedJson.skuPartNumber);
    if (!skuPartNumber) {
      continue;
    }
    const servicePlans = microsoft365ServicePlans(resource.normalizedJson.servicePlans);
    const consumedUnits = numberValueOrUndefined(resource.normalizedJson.consumedUnits);
    subscriptions.push({
      skuPartNumber,
      ...(consumedUnits !== undefined ? { consumedUnits } : {}),
      ...(servicePlans.length > 0 ? { servicePlans } : {})
    });
  }

  return subscriptions;
};

type Microsoft365ServicePlanInput = NonNullable<Microsoft365SubscriptionInput["servicePlans"]>[number];

const microsoft365ServicePlans = (value: unknown): Microsoft365ServicePlanInput[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const servicePlans: Microsoft365ServicePlanInput[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      servicePlans.push(entry);
      continue;
    }
    if (!isRecord(entry)) {
      continue;
    }
    const servicePlanName = stringValue(entry.servicePlanName);
    if (!servicePlanName) {
      continue;
    }
    const provisioningStatus = stringValue(entry.provisioningStatus);
    servicePlans.push({
      servicePlanName,
      ...(provisioningStatus ? { provisioningStatus } : {})
    });
  }

  return servicePlans;
};

const microsoft365UserCount = (normalizedResources: readonly ProviderNormalizedResource[]): number | undefined => {
  const userKeys = normalizedResources
    .filter((resource) => resource.providerKey === microsoft365ProviderKey && resource.resourceType === "cloud_user")
    .map((resource) => stringValue(resource.normalizedJson.userPrincipalName) || resource.externalId || resource.id)
    .filter(Boolean);

  return userKeys.length > 0 ? new Set(userKeys).size : undefined;
};

const mergeRecommendations = (
  existingRecommendations: readonly RecommendationContract[],
  generatedRecommendations: readonly RecommendationContract[]
): RecommendationContract[] => {
  const byId = new Map<string, RecommendationContract>();

  for (const recommendation of existingRecommendations) {
    byId.set(recommendation.id, recommendation);
  }
  for (const recommendation of generatedRecommendations) {
    if (!byId.has(recommendation.id)) {
      byId.set(recommendation.id, recommendation);
    }
  }

  return [...byId.values()];
};

const microsoft365MfaObservations = (
  input: Microsoft365VerifiedEvidenceSnapshotInput,
  latestModules: Map<string, ProviderSyncModuleRecord>
): InternalReadinessVerifiedObservation[] => {
  const module = latestModules.get("mfa-registration");
  if (module && module.status !== "succeeded" && module.status !== "partial") {
    return [];
  }

  const users = input.normalizedResources.filter(
    (resource) => resource.providerKey === microsoft365ProviderKey && resource.resourceType === "cloud_user" && resource.sourceModule === "mfa-registration"
  );
  if (users.length === 0) {
    return [];
  }

  const registered = users.filter((resource) => booleanValue(resource.normalizedJson.mfaRegistered)).length;
  const ratio = users.length === 0 ? 0 : registered / users.length;
  const status = ratio >= 0.95 ? "verified_passing" : "verified_gap";
  return [
    {
      id: "m365:mfa-registration:coverage",
      controlId: controlIdFor(input.controlResults, ["mfa"], "nis2.access-control.mfa"),
      title: "Microsoft MFA registration coverage",
      summary: `${registered} of ${users.length} Microsoft 365 users are registered for MFA (${Math.round(ratio * 100)}%).`,
      provenance: "verified_through_microsoft",
      providerKey: microsoft365ProviderKey,
      providerConnectionId: input.providerConnectionId,
      syncRunId: module?.syncRunId,
      moduleKey: "mfa-registration",
      observedAt: module?.completedAt ?? module?.startedAt ?? input.generatedAt,
      status,
      readinessImpact: status === "verified_gap" ? "reduces" : "improves",
      evidenceConfidenceImpact: "improves"
    }
  ];
};

const microsoft365SecureScoreObservations = (
  input: Microsoft365VerifiedEvidenceSnapshotInput,
  latestModules: Map<string, ProviderSyncModuleRecord>
): InternalReadinessVerifiedObservation[] => {
  const module = latestModules.get("secure-score");
  if (module && module.status !== "succeeded" && module.status !== "partial") {
    return [];
  }

  const secureScore = input.normalizedResources
    .filter((resource) => resource.providerKey === microsoft365ProviderKey && resource.resourceType === "cloud_secure_score")
    .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))[0];
  if (!secureScore) {
    return [];
  }

  const currentScore = numberValue(secureScore.normalizedJson.currentScore);
  const maxScore = numberValue(secureScore.normalizedJson.maxScore);
  const ratio = maxScore > 0 ? currentScore / maxScore : 0;
  const status = ratio >= 0.7 ? "verified_passing" : "verified_gap";
  return [
    {
      id: "m365:secure-score:current",
      controlId: controlIdFor(input.controlResults, ["secure-score", "security"], "nis2.security-posture.secure-score"),
      title: "Microsoft Secure Score",
      summary: `Microsoft Secure Score is ${currentScore} of ${maxScore} (${Math.round(ratio * 100)}%).`,
      provenance: "verified_through_microsoft",
      providerKey: microsoft365ProviderKey,
      providerConnectionId: input.providerConnectionId,
      syncRunId: module?.syncRunId,
      moduleKey: "secure-score",
      observedAt: module?.completedAt ?? module?.startedAt ?? secureScore.lastSeenAt,
      status,
      readinessImpact: status === "verified_gap" ? "reduces" : "improves",
      evidenceConfidenceImpact: "improves"
    }
  ];
};

const microsoft365UnavailableObservations = (
  input: Microsoft365VerifiedEvidenceSnapshotInput,
  latestModules: Map<string, ProviderSyncModuleRecord>
): InternalReadinessVerifiedObservation[] =>
  [...latestModules.values()]
    .filter((module) => module.status === "missing_permission" || module.status === "unavailable_license")
    .map((module) => ({
      id: `m365:${module.moduleKey}:unavailable`,
      controlId: controlIdForModule(input.controlResults, module.moduleKey),
      title: `Microsoft ${module.moduleKey} unavailable`,
      summary:
        module.status === "missing_permission"
          ? `Microsoft module ${module.moduleKey} could not be verified because required permission ${module.missingPermissions.join(", ") || "unknown"} was not granted.`
          : `Microsoft module ${module.moduleKey} could not be verified because required product/license ${module.missingLicenses.join(", ") || "unknown"} was not detected.`,
      provenance: module.status === "missing_permission" ? "unavailable_permission" : "unavailable_product_or_license",
      providerKey: microsoft365ProviderKey,
      providerConnectionId: input.providerConnectionId,
      syncRunId: module.syncRunId,
      moduleKey: module.moduleKey,
      observedAt: module.completedAt ?? module.startedAt ?? input.generatedAt,
      status: "unavailable",
      readinessImpact: "neutral",
      evidenceConfidenceImpact: "reduces"
    }));

const latestSyncModules = (modules: readonly ProviderSyncModuleRecord[]): Map<string, ProviderSyncModuleRecord> => {
  const latest = new Map<string, ProviderSyncModuleRecord>();
  for (const module of modules) {
    const existing = latest.get(module.moduleKey);
    if (!existing || moduleTimestamp(module).localeCompare(moduleTimestamp(existing)) > 0) {
      latest.set(module.moduleKey, module);
    }
  }

  return latest;
};

const latestSyncRunId = (modules: readonly ProviderSyncModuleRecord[]): string | undefined =>
  [...modules].sort((left, right) => moduleTimestamp(right).localeCompare(moduleTimestamp(left)))[0]?.syncRunId;

const moduleTimestamp = (module: ProviderSyncModuleRecord): string =>
  module.completedAt ?? module.startedAt ?? new Date(0).toISOString();

const controlIdForModule = (controls: StoredAnalysisRecord["results"], moduleKey: string): string => {
  if (moduleKey === "mfa-registration") {
    return controlIdFor(controls, ["mfa"], "nis2.access-control.mfa");
  }
  if (moduleKey === "secure-score") {
    return controlIdFor(controls, ["secure-score", "security"], "nis2.security-posture.secure-score");
  }
  if (moduleKey === "licensing") {
    return controlIdFor(controls, ["license", "asset"], "nis2.asset-inventory.licensing");
  }
  return controlIdFor(controls, [moduleKey], `microsoft365.${moduleKey}`);
};

const controlIdFor = (
  controls: StoredAnalysisRecord["results"],
  keywords: readonly string[],
  fallbackControlId: string
): string => {
  for (const keyword of keywords) {
    const control = controls.find((candidate) =>
      [candidate.controlId, candidate.controlCode ?? "", candidate.summary].join(" ").toLowerCase().includes(keyword)
    );
    if (control) {
      return control.controlId;
    }
  }

  return fallbackControlId;
};

const booleanValue = (value: unknown): boolean => value === true || value === "true";

const numberValue = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const numberValueOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const stringValue = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
