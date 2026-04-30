import type { ActionableSeverity, FindingSeverity } from "../../../shared/src/index";

export type ComplianceStatus =
  | "not_started"
  | "not_applicable"
  | "passing"
  | "failing"
  | "partial"
  | "unsupported"
  | "needs_evidence"
  | "accepted_risk";

export type { ActionableSeverity, FindingSeverity };

export type GapSeverity = ActionableSeverity;

export type Confidence = "low" | "medium" | "high";

export type ControlImplementationType = "technical" | "process" | "hybrid";

export type ControlApplicability = "all" | "essential" | "important" | "conditional" | "digital_relevant_entities";

export type ChecklistState =
  | "template_created"
  | "task_generated"
  | "assigned"
  | "in_progress"
  | "blocked"
  | "completed"
  | "evidence_required"
  | "evidence_attached"
  | "approved"
  | "overdue"
  | "requires_legal_review";

export interface SourceReference {
  sourceRecordId: string;
  article?: string;
  paragraph?: string;
  annex?: string;
  nationalReference?: string;
  sourceUrl?: string;
  sourceVersion?: string;
  label?: string;
}

export interface EvidenceRequirement {
  requirementKey: string;
  title: string;
  description?: string;
  sourceReferences: SourceReference[];
}

export interface ProviderControlMapping {
  providerKey: string;
  moduleKey: string;
  signalKeys: string[];
  recommendationKeys: string[];
  canAutoEvaluate: boolean;
  canAutoRemediate: false;
  licenseRequirements: string[];
  permissionRequirements: string[];
}

export interface ComplianceControl {
  id: string;
  frameworkKey: "nis2";
  jurisdictionScope: "EU" | "COUNTRY" | "EU_OVERLAY";
  jurisdiction: string;
  code: string;
  title: string;
  description: string;
  controlGroup: string;
  legalReferences: SourceReference[];
  applicability: ControlApplicability;
  implementationType: ControlImplementationType;
  evidenceRequired: EvidenceRequirement[];
  providerMappings: ProviderControlMapping[];
  manualChecklistTemplateIds: string[];
  version: string;
  sourceReferences: SourceReference[];
}

export interface ManualChecklistTemplateItem {
  key: string;
  title: string;
  description?: string;
}

export interface ManualChecklistTemplate {
  id: string;
  title: string;
  frequency: "weekly" | "monthly" | "quarterly" | "semiannual" | "annual" | string;
  items: ManualChecklistTemplateItem[];
}

export interface ControlCatalog {
  schemaVersion: string;
  frameworkKey: "nis2";
  catalogVersion: string;
  jurisdiction: string;
  jurisdictionScope: "EU" | "COUNTRY" | "EU_OVERLAY";
  controls: ComplianceControl[];
  manualChecklistTemplates: ManualChecklistTemplate[];
}

export interface EvidenceArtifactState {
  id: string;
  controlId?: string;
  requirementKey?: string;
  jurisdiction?: string;
  title?: string;
  sourceReferences?: SourceReference[];
}

export interface ManualChecklistItemState {
  id: string;
  organizationId: string;
  assessmentId: string;
  controlId: string;
  templateId: string;
  itemKey: string;
  title: string;
  description?: string;
  status: ChecklistState;
  ownerUserId?: string;
  evidenceArtifactIds: string[];
  sourceReferences: SourceReference[];
}

export interface CountryPackWarning {
  countryCode: string;
  featureKey: string;
  reason: string;
  sourceReferences: SourceReference[];
}

export interface ProviderSignalSummary {
  id: string;
  providerKey: string;
  moduleKey: string;
  findingKey: string;
  title: string;
  summary: string;
  severity: FindingSeverity;
  evidence: Record<string, unknown>;
}

export interface EvidenceCompleteness {
  required: number;
  present: number;
  missing: number;
  ratio: number;
}

export interface ComplianceControlResult {
  id: string;
  organizationId: string;
  assessmentId: string;
  controlId: string;
  controlCode: string;
  jurisdiction: string;
  status: ComplianceStatus;
  confidence: Confidence;
  providerSignalIds: string[];
  evidenceArtifactIds: string[];
  checklistRunItemIds: string[];
  summary: string;
  matchedFindings: ProviderSignalSummary[];
  missingEvidence: EvidenceRequirement[];
  manualTasks: ManualChecklistItemState[];
  countryPackWarnings: CountryPackWarning[];
  sourceReferences: SourceReference[];
  evidenceCompleteness: EvidenceCompleteness;
  evaluatedAt: string;
}

export interface ComplianceGap {
  id: string;
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  controlId: string;
  controlCode: string;
  status: ComplianceStatus;
  severity: GapSeverity;
  confidence: Confidence;
  summary: string;
  findingIds: string[];
  findings: string[];
  missingEvidence: string[];
  recommendedActions: string[];
  providerSignals: string[];
  manualTaskIds: string[];
  manualTasks: string[];
  countryPackWarnings: string[];
  sourceReferences: SourceReference[];
}

export type RecommendationActionType =
  | "manual"
  | "guided"
  | "technical"
  | "process"
  | "evidence_upload"
  | "country_registration"
  | "incident_reporting";

export interface ReadinessPlan {
  id: string;
  organizationId: string;
  assessmentId: string;
  title: string;
  targetReadinessPercent: 100;
  status: "draft" | "active" | "completed" | "superseded";
  generatedAt: string;
  items: ReadinessPlanItem[];
}

export interface ReadinessPlanItem {
  id: string;
  organizationId: string;
  readinessPlanId: string;
  controlId: string;
  providerRecommendationId?: string;
  jurisdiction: string;
  gapSummary: string;
  recommendedAction: string;
  actionType: RecommendationActionType;
  ownerUserId: string;
  dueDate: string;
  automationAvailable: boolean;
  evidenceRequired: boolean;
  findingIds: string[];
  manualTaskIds: string[];
  dependencies: string[];
  status: "proposed" | "accepted" | "planned" | "completed" | "dismissed";
  legalReviewRequired: boolean;
  sourceReferences: SourceReference[];
}
