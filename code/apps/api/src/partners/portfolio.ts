import type { OutputRecordRepository, StoredAnalysisRecordContract } from "@puresoc/database";
import type { ProviderConnectionRecord, ProviderResourceStore, ProviderSyncModuleRecord } from "@puresoc/providers-core";
import type { RecommendationContract, RecommendationEvidenceUsed } from "@puresoc/recommendations";

import type {
  PartnerPortfolioOpportunityRecord,
  PartnerPortfolioReader,
  PartnerPortfolioTenantSnapshot
} from "./service";

export class RepositoryBackedPartnerPortfolioReader implements PartnerPortfolioReader {
  constructor(
    private readonly outputRepository: Pick<OutputRecordRepository, "findLatestStoredAnalysis">,
    private readonly providerStore: Pick<
      ProviderResourceStore,
      "listConnections" | "listSyncModulesForConnection"
    >
  ) {}

  async readTenantSnapshot(organizationId: string): Promise<PartnerPortfolioTenantSnapshot> {
    const [analysis, connections] = await Promise.all([
      this.outputRepository.findLatestStoredAnalysis(organizationId),
      this.providerStore.listConnections(organizationId)
    ]);
    const microsoftConnection = connections.find((connection) => connection.providerKey === "microsoft365");
    const microsoftModules = microsoftConnection
      ? await this.providerStore.listSyncModulesForConnection(organizationId, microsoftConnection.id)
      : [];
    const opportunities = opportunitiesFromRecommendations(analysis?.recommendations ?? []);
    const highPriorityGapCount = highPriorityGapCountFor(analysis);

    return {
      assessmentId: analysis?.assessmentId,
      assessmentCompleted: Boolean(analysis && analysis.readinessPlan.status !== "draft"),
      sector: sectorFromRecommendations(analysis?.recommendations ?? []),
      likelyClassification: classificationFromRecommendations(analysis?.recommendations ?? []),
      readinessPercent: readinessPercentFor(analysis),
      evidenceConfidencePercent: evidenceConfidencePercentFor(analysis),
      microsoftConnectionState: microsoftConnectionStateFor(microsoftConnection, microsoftModules),
      highPriorityGapCount,
      topRecommendationOrOpportunity: topRecommendationFor(opportunities, analysis?.recommendations ?? []),
      lastAssessmentOrSyncAt: latestIso([
        analysis?.recordedAt,
        microsoftConnection?.updatedAt,
        ...microsoftModules.map((module) => module.completedAt ?? module.startedAt)
      ]),
      opportunities
    };
  }
}

const opportunitiesFromRecommendations = (
  recommendations: readonly RecommendationContract[]
): PartnerPortfolioOpportunityRecord[] =>
  recommendations
    .filter((recommendation) => recommendation.opportunity)
    .map((recommendation) => ({
      opportunityType: recommendation.opportunity?.type ?? recommendation.recommendationType,
      priority: recommendation.opportunity?.priority ?? recommendation.severity,
      relevantMicrosoftCapabilityOrPlan: recommendation.opportunity?.relevantMicrosoftCapabilityOrPlan,
      affectedUsers: recommendation.opportunity?.affectedUsers,
      nis2Areas: recommendation.opportunity?.nis2Areas ?? [recommendation.controlId],
      evidenceSource: recommendation.opportunity?.evidenceSource ?? "Recommendation snapshot",
      nextAction: recommendation.opportunity?.nextAction ?? recommendation.title
    }));

const readinessPercentFor = (analysis: StoredAnalysisRecordContract | null): number | undefined => {
  if (!analysis) {
    return undefined;
  }

  const applicableResults = analysis.results.filter((result) => result.status !== "not_applicable");
  if (applicableResults.length === 0) {
    return undefined;
  }

  const score = applicableResults.reduce((sum, result) => {
    if (result.status === "passing") {
      return sum + 1;
    }

    if (result.status === "partial" || result.status === "accepted_risk") {
      return sum + 0.5;
    }

    if (result.status === "needs_evidence") {
      return sum + 0.25;
    }

    return sum;
  }, 0);

  return Math.round((score / applicableResults.length) * 100);
};

const evidenceConfidencePercentFor = (analysis: StoredAnalysisRecordContract | null): number | undefined => {
  if (!analysis || analysis.results.length === 0) {
    return undefined;
  }

  const confidenceScore = analysis.results.reduce((sum, result) => {
    if (result.confidence === "high") {
      return sum + 100;
    }

    if (result.confidence === "medium") {
      return sum + 60;
    }

    return sum + 30;
  }, 0);

  return Math.round(confidenceScore / analysis.results.length);
};

const microsoftConnectionStateFor = (
  connection: ProviderConnectionRecord | undefined,
  modules: readonly ProviderSyncModuleRecord[]
): PartnerPortfolioTenantSnapshot["microsoftConnectionState"] => {
  if (!connection) {
    return "disconnected";
  }

  if (connection.status !== "connected" || !connection.readEnabled) {
    return "error";
  }

  if (modules.some((module) => module.status === "failed" || module.status === "missing_permission")) {
    return "partial";
  }

  return "connected";
};

const highPriorityGapCountFor = (analysis: StoredAnalysisRecordContract | null): number => {
  if (!analysis) {
    return 0;
  }

  return (
    analysis.gaps.filter((gap) => gap.severity === "high" || gap.severity === "critical").length +
    analysis.recommendations.filter((recommendation) => recommendation.severity === "high" || recommendation.severity === "critical")
      .length
  );
};

const topRecommendationFor = (
  opportunities: readonly PartnerPortfolioOpportunityRecord[],
  recommendations: readonly RecommendationContract[]
): string | undefined =>
  opportunities.find((opportunity) => opportunity.priority === "critical" || opportunity.priority === "high")?.nextAction ??
  recommendations.find((recommendation) => recommendation.severity === "critical" || recommendation.severity === "high")?.title ??
  recommendations[0]?.title;

const sectorFromRecommendations = (recommendations: readonly RecommendationContract[]): string | undefined =>
  evidenceValue(recommendations, "Sector") ?? evidenceValue(recommendations, "Sector focus");

const classificationFromRecommendations = (recommendations: readonly RecommendationContract[]): string | undefined =>
  evidenceValue(recommendations, "Likely classification") ?? evidenceValue(recommendations, "Likely entity category");

const evidenceValue = (recommendations: readonly RecommendationContract[], label: string): string | undefined => {
  const evidence = recommendations
    .flatMap((recommendation) => recommendation.decision?.evidenceUsed ?? [])
    .find((entry: RecommendationEvidenceUsed) => entry.label === label);

  return evidence?.value;
};

const latestIso = (values: readonly (string | undefined)[]): string | undefined => {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...timestamps)).toISOString();
};
