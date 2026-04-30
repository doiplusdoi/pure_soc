import type { ActionableSeverity, FindingSeverity } from "@puresoc/shared";

export type ComplianceStatus =
  | "not_started"
  | "not_applicable"
  | "passing"
  | "failing"
  | "partial"
  | "unsupported"
  | "needs_evidence"
  | "accepted_risk";

export type Severity = FindingSeverity;

export type ActionableSeverityContract = ActionableSeverity;

export type AutomationMode = "manual" | "guided" | "preflightable" | "executable_later";

export interface ComplianceControlResultContract {
  id: string;
  organizationId: string;
  assessmentId: string;
  controlId: string;
  jurisdiction: string;
  status: ComplianceStatus;
  confidence: "low" | "medium" | "high";
  providerSignalIds: string[];
  evidenceArtifactIds: string[];
  checklistRunItemIds: string[];
  summary: string;
  evidenceCompleteness?: {
    required: number;
    present: number;
    missing: number;
    ratio: number;
  };
  sourceReferences?: Record<string, unknown>[];
  evaluatedAt: string;
}

export interface ComplianceGapContract {
  id: string;
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  controlId: string;
  status: ComplianceStatus;
  severity: ActionableSeverityContract;
  confidence: "low" | "medium" | "high";
  summary: string;
  findingIds: string[];
  findings: string[];
  missingEvidence: string[];
  recommendedActions: string[];
  providerSignals: string[];
  manualTaskIds: string[];
  manualTasks: string[];
  countryPackWarnings: string[];
  sourceReferences: Record<string, unknown>[];
}

export interface ReadinessPlanContract {
  id: string;
  organizationId: string;
  assessmentId: string;
  title: string;
  targetReadinessPercent: 100;
  status: "draft" | "active" | "completed" | "superseded";
}

export interface ReadinessPlanItemContract {
  id: string;
  organizationId: string;
  readinessPlanId: string;
  controlId?: string;
  providerRecommendationId?: string;
  findingIds: string[];
  manualTaskIds: string[];
  jurisdiction: string;
  gapSummary: string;
  recommendedAction: string;
  actionType:
    | "manual"
    | "guided"
    | "technical"
    | "process"
    | "evidence_upload"
    | "country_registration"
    | "incident_reporting";
  ownerUserId?: string;
  dueDate?: string;
  automationAvailable: boolean;
  evidenceRequired: boolean;
  dependencies: string[];
  status: "proposed" | "accepted" | "planned" | "completed" | "dismissed";
  legalReviewRequired: boolean;
  sourceReferences: Record<string, unknown>[];
}

export interface EvidenceArtifactContract {
  id: string;
  organizationId: string;
  controlId?: string;
  jurisdiction?: string;
  sourceType:
    | "provider_snapshot"
    | "manual_upload"
    | "generated_report"
    | "signed_document"
    | "checklist_completion"
    | "action_pre_state"
    | "action_post_state"
    | "audit_log_export"
    | "policy_document"
    | "risk_acceptance"
    | "regulatory_source_snapshot"
    | "country_registration_draft"
    | "incident_reporting_draft";
  sourceProvider?: string;
  providerConnectionId?: string;
  manualSourceLabel?: string;
  title: string;
  description?: string;
  storageUri: string;
  contentHashSha256: string;
  mimeType: string;
  scanStatus?: "pending" | "clean" | "infected" | "failed" | "skipped";
  createdBy?: string;
  createdAt: string;
  validFrom?: string;
  validUntil?: string;
  linkedAssessmentId?: string;
  linkedActionId?: string;
  linkedSourceRecordId?: string;
  exportGroupKey?: string;
  retentionPolicy?: string;
  retentionExpiresAt?: string;
}

export interface EvidenceLinkContract {
  id: string;
  organizationId: string;
  evidenceArtifactId: string;
  targetType:
    | "control"
    | "jurisdiction"
    | "regulatory_source"
    | "assessment"
    | "provider_sync_run"
    | "checklist_run"
    | "action_run"
    | "report"
    | "notification_draft";
  targetId: string;
  relation: string;
  createdAt: string;
}

export interface EvidenceAccessLogContract {
  id: string;
  organizationId: string;
  evidenceArtifactId: string;
  actorUserId?: string;
  action: "download" | "export";
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface GeneratedReportContract {
  id: string;
  organizationId: string;
  assessmentId?: string;
  reportType: string;
  jurisdiction?: string;
  legalCaveat: string;
  sourceReferences: string[];
  reportData: Record<string, unknown>;
  evidenceArtifactId?: string;
}

export interface DashboardSnapshotContract {
  id: string;
  organizationId: string;
  assessmentId?: string;
  snapshotType: string;
  source: "stored_analysis";
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationDraftContract {
  id: string;
  organizationId: string;
  assessmentId?: string;
  jurisdiction: string;
  notificationType: "country_registration" | "incident_reporting" | "readiness_update";
  status: "draft" | "ready_for_review" | "exported" | "superseded";
  payload: Record<string, unknown>;
  sourceReferences: string[];
}
