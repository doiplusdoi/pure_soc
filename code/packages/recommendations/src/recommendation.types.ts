import type {
  ActionableSeverity,
  Confidence,
  RecommendationActionType,
  RecommendationAutomationMode,
  RecommendationStatus,
  RecommendationSummary,
  SourceReference
} from "@puresoc/shared";

export type RecommendationSeverity = ActionableSeverity;

export type { RecommendationAutomationMode };

export type RecommendationType = RecommendationActionType;

export type RecommendationEvidenceSourceType =
  | "business_context"
  | "capability_catalog"
  | "compliance_gap"
  | "existing_recommendation"
  | "microsoft_license"
  | "microsoft_security_signal";

export interface RecommendationRuleMetadata {
  id: string;
  version: string;
  catalogVersion?: string;
}

export interface RecommendationEvidenceUsed {
  type: RecommendationEvidenceSourceType;
  label: string;
  value?: string;
  sourceId?: string;
}

export interface RecommendationDecisionMetadata {
  finding: string;
  whyItMatters: string;
  evidenceUsed: RecommendationEvidenceUsed[];
  nis2ControlMappings: string[];
  countryMappings: string[];
  priority: RecommendationSeverity;
  recommendedAction: string;
  expectedReadinessEffect: string;
  requiredCapability: string;
  microsoftProductOrLicense?: string;
  partnerServiceOpportunity?: string;
  customerCta: string;
  partnerCta: string;
  disclaimer: string;
}

export interface RecommendationCapabilityDiagnostics {
  catalogVersion: string;
  knownSkuPartNumbers: string[];
  unknownSkuPartNumbers: string[];
  activeCapabilities: string[];
  missingCapabilities: string[];
  lowerBusinessPlanDetected: boolean;
  evaluatedUserCount?: number;
}

export interface RecommendationOpportunityMetadata {
  type: string;
  priority: RecommendationSeverity;
  relevantMicrosoftCapabilityOrPlan?: string;
  affectedUsers?: number;
  nis2Areas: string[];
  evidenceSource: string;
  nextAction: string;
}

export interface RecommendationActionOffer {
  actionKey: string;
  description: string;
  outputType: string;
  providerKey: string;
  providerMutation: false;
  title: string;
}

export interface RecommendationContract extends RecommendationSummary {
  id: string;
  organizationId: string;
  sourceFindingId?: string;
  sourceFindingIds: string[];
  manualTaskIds: string[];
  controlId: string;
  jurisdiction: string;
  title: string;
  summary: string;
  severity: RecommendationSeverity;
  confidence: Confidence;
  recommendationType: RecommendationType;
  automationMode: RecommendationAutomationMode;
  requiredPermissions: string[];
  requiredLicense: string[];
  expectedChange?: string;
  blastRadius?: string;
  manualFallback?: string;
  evidenceRequired: boolean;
  status: RecommendationStatus;
  sourceReferences?: SourceReference[];
  rule?: RecommendationRuleMetadata;
  decision?: RecommendationDecisionMetadata;
  opportunity?: RecommendationOpportunityMetadata;
  capabilityDiagnostics?: RecommendationCapabilityDiagnostics;
  actionOffer?: RecommendationActionOffer;
  snapshotId?: string;
}

export interface RecommendationSnapshot {
  id: string;
  organizationId: string;
  assessmentIds: string[];
  generatedAt: string;
  ruleVersions: RecommendationRuleMetadata[];
  catalogVersions: string[];
  inputSummary: {
    gapCount: number;
    countryCode?: string;
    sector?: string;
    subsector?: string;
    likelyEntityCategory?: string;
    employeeCount?: number;
    sizeRange?: string;
    operationalDependencies: string[];
    existingRecommendationCount: number;
  };
  diagnostics: {
    unknownMicrosoftSkuPartNumbers: string[];
    knownMicrosoftSkuPartNumbers: string[];
    activeCapabilities: string[];
    missingCapabilities: string[];
    lowerBusinessPlanDetected: boolean;
  };
  recommendations: RecommendationContract[];
}

export interface RecommendationPlanItemInput {
  organizationId: string;
  providerRecommendationId: string;
  controlId: string;
  findingIds: string[];
  manualTaskIds: string[];
  jurisdiction: string;
  gapSummary: string;
  recommendedAction: string;
  actionType: RecommendationType;
  automationAvailable: boolean;
  evidenceRequired: boolean;
  dependencies: string[];
  legalReviewRequired: boolean;
  ownerUserId?: string;
  dueDate?: string;
  status?: RecommendationContract["status"];
  sourceReferences?: SourceReference[];
}

export interface RecommendationReportFinding {
  controlId: string;
  jurisdiction: string;
  title: string;
  severity: RecommendationSeverity;
  summary: string;
  requiredEvidence: boolean;
  sourceReferences?: SourceReference[];
}

export interface RecommendationDashboardSignal {
  key: string;
  severity: RecommendationSeverity;
  automationMode: RecommendationAutomationMode;
  evidenceRequired: boolean;
  sourceReferenceCount?: number;
}

export const recommendationToReadinessPlanItemInput = (
  recommendation: RecommendationContract
): RecommendationPlanItemInput => ({
  organizationId: recommendation.organizationId,
  providerRecommendationId: recommendation.id,
  controlId: recommendation.controlId,
  findingIds: recommendation.sourceFindingIds,
  manualTaskIds: recommendation.manualTaskIds,
  jurisdiction: recommendation.jurisdiction,
  gapSummary: recommendation.summary,
  recommendedAction: recommendation.title,
  actionType: recommendation.recommendationType,
  automationAvailable:
    recommendation.automationMode === "preflightable" || recommendation.automationMode === "executable_later",
  evidenceRequired: recommendation.evidenceRequired,
  dependencies: [...recommendation.requiredPermissions, ...recommendation.requiredLicense],
  legalReviewRequired:
    recommendation.recommendationType === "country_registration" ||
    recommendation.recommendationType === "incident_reporting",
  status: recommendation.status,
  sourceReferences: recommendation.sourceReferences
});

export const recommendationToReportFinding = (
  recommendation: RecommendationContract
): RecommendationReportFinding => ({
  controlId: recommendation.controlId,
  jurisdiction: recommendation.jurisdiction,
  title: recommendation.title,
  severity: recommendation.severity,
  summary: recommendation.summary,
  requiredEvidence: recommendation.evidenceRequired,
  sourceReferences: recommendation.sourceReferences
});

export const recommendationToDashboardSignal = (
  recommendation: RecommendationContract
): RecommendationDashboardSignal => ({
  key: recommendation.id,
  severity: recommendation.severity,
  automationMode: recommendation.automationMode,
  evidenceRequired: recommendation.evidenceRequired,
  sourceReferenceCount: recommendation.sourceReferences?.length
});
