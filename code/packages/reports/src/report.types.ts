import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  PURESOC_LEGAL_CAVEAT,
  type ActionableSeverity,
  type PureSocLocale,
  type SourceReference
} from "@puresoc/shared";

export type ReportType =
  | "internal_readiness"
  | "country_classification"
  | "romania_notification_draft"
  | "provider_posture"
  | "evidence_package"
  | "incident_draft";

export type ReportExportFormat = "json" | "pdf" | "csv";

export interface ReportSourceReference extends SourceReference {
  title?: string;
  jurisdiction: string;
  sourceLocation?: string;
  fieldKey?: string;
}

export interface ReportRecommendationSummary {
  controlId: string;
  jurisdiction: string;
  title: string;
  severity: ActionableSeverity;
  summary: string;
  requiredEvidence: boolean;
  sourceReferences?: ReportSourceReference[];
}

export interface ReportControlResultSummary {
  controlId: string;
  controlCode?: string;
  jurisdiction: string;
  status: string;
  confidence: string;
  summary: string;
  evidenceArtifactIds: string[];
  providerSignalIds: string[];
  evidenceCompleteness?: {
    required: number;
    present: number;
    missing: number;
    ratio: number;
  };
  sourceReferences: ReportSourceReference[];
}

export interface ReportGapSummary {
  controlId: string;
  controlCode?: string;
  jurisdiction: string;
  severity: ActionableSeverity;
  summary: string;
  missingEvidence: string[];
  recommendedActions: string[];
  sourceReferences: ReportSourceReference[];
}

export interface ReportEvidenceSummary {
  id: string;
  title: string;
  sourceType: string;
  controlId?: string;
  jurisdiction?: string;
  contentHashSha256: string;
  mimeType: string;
  scanStatus?: string;
  createdAt: string;
  linkedSourceRecordId?: string;
}

export interface ReportReadinessPlanSummary {
  id: string;
  title: string;
  targetReadinessPercent: number;
  status: string;
  items: Array<{
    id: string;
    controlId?: string;
    jurisdiction: string;
    recommendedAction: string;
    actionType: string;
    evidenceRequired: boolean;
    legalReviewRequired: boolean;
    status: string;
    sourceReferences: ReportSourceReference[];
  }>;
}

export interface InternalReadinessReport {
  schemaVersion: "puresoc.report.internal_readiness.v1";
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  reportType: "internal_readiness";
  generatedAt: string;
  legalCaveat: string;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: typeof LEGAL_CAVEAT_MESSAGE_KEY;
  locale: PureSocLocale;
  sourceReferences: ReportSourceReference[];
  controlResults: ReportControlResultSummary[];
  gaps: ReportGapSummary[];
  recommendations: ReportRecommendationSummary[];
  readinessPlan?: ReportReadinessPlanSummary;
  evidence: ReportEvidenceSummary[];
  provenance: {
    source: "stored_analysis";
    catalogVersion?: string;
    analysisRecordedAt?: string;
  };
}

export interface RomaniaNotificationDraftExport {
  schemaVersion: "puresoc.export.ro_notification_draft.v1";
  organizationId: string;
  assessmentId?: string;
  jurisdiction: "RO";
  reportType: "romania_notification_draft";
  generatedAt: string;
  legalCaveat: string;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: typeof LEGAL_CAVEAT_MESSAGE_KEY;
  locale: PureSocLocale;
  status: "draft" | "ready_for_review" | "exported" | "superseded";
  payload: Record<string, unknown>;
  sourceMappedFields: Array<{
    fieldKey: string;
    value: unknown;
    sourceReferences: ReportSourceReference[];
  }>;
  sourceReferences: ReportSourceReference[];
  provenance: {
    source: "stored_analysis";
    classificationRunId?: string;
    onboardingProgressId?: string;
    notificationDraftId?: string;
  };
}

export const createReportShell = (organizationId: string, jurisdiction = "eu"): InternalReadinessReport => ({
  schemaVersion: "puresoc.report.internal_readiness.v1",
  organizationId,
  assessmentId: "unassigned",
  jurisdiction,
  reportType: "internal_readiness",
  generatedAt: new Date(0).toISOString(),
  legalCaveat: PURESOC_LEGAL_CAVEAT,
  legalCaveatFallbackUsed: false,
  legalCaveatLocale: "en",
  legalCaveatMessageKey: LEGAL_CAVEAT_MESSAGE_KEY,
  locale: "en",
  controlResults: [],
  gaps: [],
  sourceReferences: [],
  recommendations: [],
  evidence: [],
  provenance: {
    source: "stored_analysis"
  }
});
