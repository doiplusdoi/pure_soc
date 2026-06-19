export {
  generateStructuredRecommendations,
  type GenerateStructuredRecommendationsInput,
  type ProviderRecommendationLike
} from "./generator";
export {
  evaluateMicrosoft365Capabilities,
  formatCapabilities,
  microsoft365BusinessPremiumSourceReferences,
  microsoft365CapabilityCatalogVersion,
  microsoft365CapabilityLabels,
  microsoft365PlanMappings,
  type Microsoft365CapabilityEvaluation,
  type Microsoft365CapabilityEvaluationInput,
  type Microsoft365SecurityCapability,
  type Microsoft365SubscriptionInput
} from "./capability-catalog";
export {
  generateRecommendationSnapshot,
  type GenerateRecommendationSnapshotInput,
  type RecommendationContextInput,
  type RecommendationGenerationSnapshotResult,
  type RecommendationMicrosoft365Context
} from "./dynamic-generator";
export {
  InMemoryRemediationActionRepository,
  isV1ForbiddenExecutableActionKey,
  maxActionRunIdempotencyKeyLength,
  normalizeActionRunIdempotencyKey,
  RemediationActionError,
  RemediationActionLifecycle,
  v1ForbiddenExecutableActionKeys,
  type ActionApprovalState,
  type ActionApprovalStatus,
  type ActionChecklistTask,
  type ActionDiff,
  type ActionEvidenceTask,
  type ActionFollowupTasks,
  type ActionPreflightCheck,
  type ActionPreflightResult,
  type ActionPreflightStatus,
  type ActionRun,
  type ActionRunStatus,
  type ActionSnapshotMetadata,
  type ActionTemplate,
  type ActionVerificationCheck,
  type ActionVerificationResult,
  type ActionVerificationStatus,
  type ActionWorkerJobMetadata,
  type CreateActionRunInput,
  type CreateActionTemplateInput,
  type QueueActionRunInput,
  type RemediationActionErrorCode,
  type RemediationActionRepository
} from "./actions";
export {
  recommendationToDashboardSignal,
  recommendationToReadinessPlanItemInput,
  recommendationToReportFinding,
  type RecommendationAutomationMode,
  type RecommendationCapabilityDiagnostics,
  type RecommendationContract,
  type RecommendationDashboardSignal,
  type RecommendationDecisionMetadata,
  type RecommendationEvidenceSourceType,
  type RecommendationEvidenceUsed,
  type RecommendationOpportunityMetadata,
  type RecommendationPlanItemInput,
  type RecommendationReportFinding,
  type RecommendationRuleMetadata,
  type RecommendationSeverity,
  type RecommendationSnapshot,
  type RecommendationType
} from "./recommendation.types";
