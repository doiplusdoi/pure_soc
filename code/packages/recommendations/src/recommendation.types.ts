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
