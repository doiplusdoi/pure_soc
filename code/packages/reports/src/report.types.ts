import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  PURESOC_LEGAL_CAVEAT,
  type ActionableSeverity,
  type PureSocMessageFallbackReason,
  type PureSocMessageReviewStatus,
  type PureSocLocale,
  type SourceReference
} from "@puresoc/shared";

export type ReportType =
  | "gap_report"
  | "executive_summary"
  | "internal_readiness"
  | "country_classification"
  | "romania_notification_draft"
  | "provider_posture"
  | "evidence_package"
  | "incident_draft";

export type ReportExportFormat = "json" | "pdf" | "csv" | "binary_evidence_package";

export type InternalReadinessCsvTableName =
  | "metadata"
  | "control_results"
  | "gaps"
  | "recommendations"
  | "readiness_plan_items"
  | "evidence"
  | "source_references";

export interface ReportBranding {
  organizationName?: string;
  legalName?: string | null;
  logoDataUrl?: string | null;
}

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
  provenance?: InternalReadinessFindingProvenance[];
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
  provenance?: InternalReadinessFindingProvenance[];
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
  provenance?: InternalReadinessFindingProvenance[];
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

export type InternalReadinessReportTriggerType =
  | "onboarding_completed"
  | "manual_regenerate"
  | "microsoft_sync_completed";

export interface InternalReadinessReportClassificationSnapshot {
  confidence?: string;
  countryCode?: string;
  explanation?: string;
  legalReviewRequired: boolean;
  missingInformation?: readonly string[];
  result: string;
}

export interface InternalReadinessReportVersionMetadata {
  calibrationReviewStatus?: string;
  calibrationVersion?: string;
  countryPackVersion?: string;
  inputSnapshot: {
    assessmentId: string;
    classificationResult?: InternalReadinessReportClassificationSnapshot;
    controlResultCount: number;
    evidenceArtifactCount: number;
    gapCount: number;
    recommendationCount: number;
  };
  immutable: true;
  methodologyVersion: string;
  onboardingSchemaVersion?: string;
  previousReportId?: string;
  rendererVersion: string;
  reportVersion: 1 | 2;
  triggerType: InternalReadinessReportTriggerType;
}

export interface InternalReadinessReportConcepts {
  applicability: {
    confidence: string;
    legalReviewRequired: boolean;
    result: string;
    summary: string;
  };
  evidenceConfidence: {
    methodologyVersion: string;
    missingEvidenceCount: number;
    result: "low" | "medium" | "high";
    summary: string;
    value: number;
  };
  priority: {
    criticalGapCount: number;
    highGapCount: number;
    result: "none" | "low" | "medium" | "high" | "critical";
    summary: string;
  };
  readiness: {
    applicableControlCount: number;
    methodologyVersion: string;
    missingInformationCount: number;
    result: "low" | "medium" | "high";
    summary: string;
    value: number;
  };
}

export interface InternalReadinessCalibrationMetadata {
  calibrationVersion: string;
  reviewStatus: string;
  status: string;
  sourceReferences: ReportSourceReference[];
  scoreSeparationPolicy: {
    readinessScore: string;
    evidenceConfidence: string;
    legalApplicability: string;
    sourceReferenceIds: string[];
    rationale: string;
  };
  factors: Array<{
    key: string;
    dimension: string;
    label: string;
    weight: number | null;
    treatment: string;
    reviewStatus: string;
    sourceReferenceIds: string[];
    rationale: string;
  }>;
}

export type InternalReadinessFindingProvenance =
  | "declared_by_customer"
  | "uploaded_evidence"
  | "verified_through_microsoft"
  | "inferred_by_rule"
  | "unavailable_permission"
  | "unavailable_product_or_license";

export interface InternalReadinessVerifiedObservation {
  id: string;
  controlId: string;
  title: string;
  summary: string;
  provenance: InternalReadinessFindingProvenance;
  providerKey?: string;
  providerConnectionId?: string;
  syncRunId?: string;
  moduleKey?: string;
  observedAt: string;
  status: "verified_passing" | "verified_gap" | "unavailable" | "informational";
  readinessImpact: "improves" | "reduces" | "neutral";
  evidenceConfidenceImpact: "improves" | "reduces" | "neutral";
  sourceReferenceIds?: string[];
}

export interface InternalReadinessContradiction {
  id: string;
  controlId: string;
  declaredStatus: string;
  declaredSummary: string;
  verifiedStatus: string;
  verifiedSummary: string;
  effectiveStatus: string;
  readinessDelta: number;
  evidenceConfidenceDelta: number;
  provenance: InternalReadinessFindingProvenance;
  providerKey?: string;
  providerConnectionId?: string;
  syncRunId?: string;
  moduleKey?: string;
  observedAt: string;
}

export interface InternalReadinessReportComparison {
  previousReportId: string;
  readinessDelta: number;
  evidenceConfidenceDelta: number;
  changedControlAreas: Array<{
    controlId: string;
    previousStatus: string;
    currentStatus: string;
    readinessDelta: number;
    evidenceConfidenceDelta: number;
  }>;
  newVerifiedFindings: string[];
  resolvedUnknowns: string[];
  contradictions: string[];
  newRecommendations: string[];
}

export interface InternalReadinessVerifiedEvidence {
  providerKey: string;
  providerConnectionId: string;
  syncRunId?: string;
  generatedAt: string;
  observations: InternalReadinessVerifiedObservation[];
  contradictions: InternalReadinessContradiction[];
  unavailableSignals: InternalReadinessVerifiedObservation[];
}

export interface InternalReadinessReport {
  schemaVersion: "puresoc.report.internal_readiness.v1";
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  reportType: "internal_readiness";
  generatedAt: string;
  legalCaveat: string;
  legalCaveatFallbackReason?: PureSocMessageFallbackReason;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: typeof LEGAL_CAVEAT_MESSAGE_KEY;
  legalCaveatRequestedLocale?: string;
  legalCaveatReviewStatus?: PureSocMessageReviewStatus;
  locale: PureSocLocale;
  reportBranding?: ReportBranding;
  version: InternalReadinessReportVersionMetadata;
  concepts: InternalReadinessReportConcepts;
  calibration: InternalReadinessCalibrationMetadata;
  sourceReferences: ReportSourceReference[];
  controlResults: ReportControlResultSummary[];
  gaps: ReportGapSummary[];
  recommendations: ReportRecommendationSummary[];
  readinessPlan?: ReportReadinessPlanSummary;
  evidence: ReportEvidenceSummary[];
  verifiedEvidence?: InternalReadinessVerifiedEvidence;
  comparison?: InternalReadinessReportComparison;
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
  legalCaveatFallbackReason?: PureSocMessageFallbackReason;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: typeof LEGAL_CAVEAT_MESSAGE_KEY;
  legalCaveatRequestedLocale?: string;
  legalCaveatReviewStatus?: PureSocMessageReviewStatus;
  locale: PureSocLocale;
  reportBranding?: ReportBranding;
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

export interface InternalReadinessCsvExport {
  schemaVersion: "puresoc.export.internal_readiness_csv.v1";
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  reportType: "internal_readiness";
  exportFormat: "csv";
  generatedAt: string;
  legalCaveat: string;
  legalCaveatFallbackReason?: PureSocMessageFallbackReason;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: typeof LEGAL_CAVEAT_MESSAGE_KEY;
  legalCaveatRequestedLocale?: string;
  legalCaveatReviewStatus?: PureSocMessageReviewStatus;
  locale: PureSocLocale;
  sourceReferences: ReportSourceReference[];
  tableNames: InternalReadinessCsvTableName[];
  rowCount: number;
  csv: string;
}

export interface EvidencePackageBundleFileSummary {
  path: string;
  role: "manifest" | "report_json" | "report_csv" | "evidence_artifact";
  mimeType: string;
  sizeBytes: number;
  contentHashSha256: string;
  evidenceArtifactId?: string;
}

export interface EvidencePackageLimitSummary {
  maxEvidenceFiles: number;
  maxEvidenceFileBytes: number;
  maxBundleBytes: number;
}

export interface InternalReadinessEvidencePackageManifest {
  schemaVersion: "puresoc.export.internal_readiness_evidence_package_manifest.v1";
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  reportType: "evidence_package";
  exportFormat: "binary_evidence_package";
  generatedAt: string;
  legalCaveat: string;
  legalCaveatFallbackReason?: PureSocMessageFallbackReason;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: typeof LEGAL_CAVEAT_MESSAGE_KEY;
  legalCaveatRequestedLocale?: string;
  legalCaveatReviewStatus?: PureSocMessageReviewStatus;
  locale: PureSocLocale;
  sourceReferences: ReportSourceReference[];
  exportLimits: EvidencePackageLimitSummary;
  files: EvidencePackageBundleFileSummary[];
  evidenceArtifacts: ReportEvidenceSummary[];
  provenance: {
    source: "stored_analysis";
    internalReadinessReportSchemaVersion: InternalReadinessReport["schemaVersion"];
  };
}

export interface InternalReadinessEvidencePackageExport {
  schemaVersion: "puresoc.export.internal_readiness_evidence_package.v1";
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  reportType: "evidence_package";
  exportFormat: "binary_evidence_package";
  generatedAt: string;
  mimeType: "application/x-tar";
  fileName: string;
  sizeBytes: number;
  contentHashSha256: string;
  manifest: InternalReadinessEvidencePackageManifest;
  manifestJson: string;
  bundle: Uint8Array;
}

const shellCalibrationSources: ReportSourceReference[] = [
  {
    sourceRecordId: "eu-nis2-directive-2022-2555",
    title: "Directive (EU) 2022/2555",
    jurisdiction: "EU",
    sourceUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng",
    sourceVersion: "OJ L 333, 27.12.2022"
  },
  {
    sourceRecordId: "eu-implementing-regulation-2024-2690",
    title: "Commission Implementing Regulation (EU) 2024/2690",
    jurisdiction: "EU",
    sourceUrl: "https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/eng",
    sourceVersion: "2024/2690"
  }
];

const shellCalibration: InternalReadinessCalibrationMetadata = {
  calibrationVersion: "nis2-readiness-calibration.v1",
  reviewStatus: "requires_product_legal_review",
  status: "requires_product_legal_review",
  sourceReferences: shellCalibrationSources,
  scoreSeparationPolicy: {
    readinessScore: "Readiness summarizes the current internal control status and does not decide legal applicability.",
    evidenceConfidence: "Evidence confidence summarizes whether claims are backed by uploaded or provider-verified evidence.",
    legalApplicability: "Legal applicability remains a separate country-pack classification output that requires legal review.",
    sourceReferenceIds: ["eu-nis2-directive-2022-2555"],
    rationale: "The NIS2 source model separates readiness, evidence confidence, and applicability."
  },
  factors: []
};

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
  legalCaveatReviewStatus: "source_approved",
  locale: "en",
  version: {
    immutable: true,
    inputSnapshot: {
      assessmentId: "unassigned",
      controlResultCount: 0,
      evidenceArtifactCount: 0,
      gapCount: 0,
      recommendationCount: 0
    },
    methodologyVersion: "puresoc.readiness.declared.v1",
    rendererVersion: "puresoc-report-renderer-json.v1",
    reportVersion: 1,
    triggerType: "manual_regenerate"
  },
  calibration: shellCalibration,
  concepts: {
    applicability: {
      confidence: "low",
      legalReviewRequired: true,
      result: "not_assessed",
      summary: "Applicability was not assessed for this empty report shell."
    },
    readiness: {
      applicableControlCount: 0,
      methodologyVersion: "puresoc.readiness.declared.v1",
      missingInformationCount: 0,
      result: "low",
      summary: "No applicable controls were available for readiness calculation.",
      value: 0
    },
    evidenceConfidence: {
      methodologyVersion: "puresoc.readiness.declared.v1",
      missingEvidenceCount: 0,
      result: "low",
      summary: "No evidence requirements were available for confidence calculation.",
      value: 0
    },
    priority: {
      criticalGapCount: 0,
      highGapCount: 0,
      result: "none",
      summary: "No gaps were available for priority calculation."
    }
  },
  controlResults: [],
  gaps: [],
  sourceReferences: shellCalibrationSources,
  recommendations: [],
  evidence: [],
  provenance: {
    source: "stored_analysis"
  }
});
