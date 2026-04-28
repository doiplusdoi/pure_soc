export type RecommendationSeverity = "low" | "medium" | "high" | "critical";

export type RecommendationAutomationMode = "manual" | "guided" | "preflightable" | "executable_later";

export type RecommendationType =
  | "manual"
  | "guided"
  | "technical"
  | "process"
  | "evidence_upload"
  | "country_registration"
  | "incident_reporting";

export interface RecommendationContract {
  id: string;
  organizationId: string;
  sourceFindingId?: string;
  controlId: string;
  jurisdiction: string;
  title: string;
  summary: string;
  severity: RecommendationSeverity;
  confidence: "low" | "medium" | "high";
  recommendationType: RecommendationType;
  automationMode: RecommendationAutomationMode;
  requiredPermissions: string[];
  requiredLicense: string[];
  expectedChange?: string;
  blastRadius?: string;
  manualFallback?: string;
  evidenceRequired: boolean;
  status: "proposed" | "accepted" | "planned" | "completed" | "dismissed";
}

export interface RecommendationPlanItemInput {
  organizationId: string;
  providerRecommendationId: string;
  controlId: string;
  jurisdiction: string;
  gapSummary: string;
  recommendedAction: string;
  actionType: RecommendationType;
  automationAvailable: boolean;
  evidenceRequired: boolean;
  dependencies: string[];
  legalReviewRequired: boolean;
}

export interface RecommendationReportFinding {
  controlId: string;
  jurisdiction: string;
  title: string;
  severity: RecommendationSeverity;
  summary: string;
  requiredEvidence: boolean;
}

export interface RecommendationDashboardSignal {
  key: string;
  severity: RecommendationSeverity;
  automationMode: RecommendationAutomationMode;
  evidenceRequired: boolean;
}

export const recommendationToReadinessPlanItemInput = (
  recommendation: RecommendationContract
): RecommendationPlanItemInput => ({
  organizationId: recommendation.organizationId,
  providerRecommendationId: recommendation.id,
  controlId: recommendation.controlId,
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
    recommendation.recommendationType === "incident_reporting"
});

export const recommendationToReportFinding = (
  recommendation: RecommendationContract
): RecommendationReportFinding => ({
  controlId: recommendation.controlId,
  jurisdiction: recommendation.jurisdiction,
  title: recommendation.title,
  severity: recommendation.severity,
  summary: recommendation.summary,
  requiredEvidence: recommendation.evidenceRequired
});

export const recommendationToDashboardSignal = (
  recommendation: RecommendationContract
): RecommendationDashboardSignal => ({
  key: recommendation.id,
  severity: recommendation.severity,
  automationMode: recommendation.automationMode,
  evidenceRequired: recommendation.evidenceRequired
});

