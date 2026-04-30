import {
  uniqueSourceReferences,
  type ComplianceGap,
  type SourceReference
} from "../../compliance/core/src/index";

import type {
  RecommendationAutomationMode,
  RecommendationContract,
  RecommendationSeverity,
  RecommendationType
} from "./recommendation.types";

export interface GenerateStructuredRecommendationsInput {
  organizationId: string;
  gaps: readonly ComplianceGap[];
  providerRecommendations?: readonly ProviderRecommendationLike[];
}

export interface ProviderRecommendationLike {
  id: string;
  organizationId: string;
  sourceFindingId?: string;
  controlId?: string;
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
  status: RecommendationContract["status"];
  sourceReferences?: Record<string, unknown>[];
}

export const generateStructuredRecommendations = (
  input: GenerateStructuredRecommendationsInput
): RecommendationContract[] =>
  input.gaps.map((gap, index) => {
    const providerRecommendation = input.providerRecommendations?.find(
      (candidate) => candidate.controlId === gap.controlId && candidate.jurisdiction === gap.jurisdiction
    );

    if (providerRecommendation) {
      return {
        id: providerRecommendation.id,
        organizationId: input.organizationId,
        sourceFindingId: providerRecommendation.sourceFindingId,
        controlId: gap.controlId,
        jurisdiction: gap.jurisdiction,
        title: providerRecommendation.title,
        summary: providerRecommendation.summary,
        severity: providerRecommendation.severity,
        confidence: providerRecommendation.confidence,
        recommendationType: providerRecommendation.recommendationType,
        automationMode: providerRecommendation.automationMode,
        requiredPermissions: providerRecommendation.requiredPermissions,
        requiredLicense: providerRecommendation.requiredLicense,
        expectedChange: providerRecommendation.expectedChange,
        blastRadius: providerRecommendation.blastRadius,
        manualFallback: providerRecommendation.manualFallback,
        evidenceRequired: providerRecommendation.evidenceRequired,
        status: providerRecommendation.status,
        sourceReferences: uniqueSourceReferences([
          ...gap.sourceReferences,
          ...sourceReferencesFromUnknown(providerRecommendation.sourceReferences)
        ])
      };
    }

    return recommendationFromGap(input.organizationId, gap, index);
  });

const recommendationFromGap = (
  organizationId: string,
  gap: ComplianceGap,
  index: number
): RecommendationContract => {
  const recommendationType = recommendationTypeForGap(gap);
  const automationMode = automationModeForGap(gap);

  return {
    id: [gap.assessmentId, gap.controlId, "recommendation", index + 1].join(":"),
    organizationId,
    controlId: gap.controlId,
    jurisdiction: gap.jurisdiction,
    title: gap.recommendedActions[0] ?? "Review internal readiness gap",
    summary: gap.summary,
    severity: gap.severity,
    confidence: gap.confidence,
    recommendationType,
    automationMode,
    requiredPermissions: gap.providerSignals.length > 0 ? ["provider_read_context"] : [],
    requiredLicense: [],
    expectedChange: expectedChangeForGap(gap),
    blastRadius: automationMode === "manual" ? "Manual process or evidence update only." : "Guided configuration review.",
    manualFallback: "Create a manual checklist item and attach evidence before closing the gap.",
    evidenceRequired: gap.missingEvidence.length > 0 || gap.manualTasks.length > 0,
    status: "proposed",
    sourceReferences: uniqueSourceReferences(gap.sourceReferences)
  };
};

const recommendationTypeForGap = (gap: ComplianceGap): RecommendationType => {
  if (gap.missingEvidence.length > 0) {
    return "evidence_upload";
  }

  if (gap.countryPackWarnings.length > 0) {
    return "guided";
  }

  if (gap.providerSignals.length > 0) {
    return "technical";
  }

  if (gap.manualTasks.length > 0) {
    return "process";
  }

  return "manual";
};

const automationModeForGap = (gap: ComplianceGap): RecommendationAutomationMode => {
  if (gap.providerSignals.length > 0) {
    return "guided";
  }

  return "manual";
};

const expectedChangeForGap = (gap: ComplianceGap): string => {
  if (gap.missingEvidence.length > 0) {
    return "Required control evidence is linked to the readiness assessment.";
  }

  if (gap.providerSignals.length > 0) {
    return "The provider-neutral finding is reviewed and the control result can be reevaluated.";
  }

  if (gap.countryPackWarnings.length > 0) {
    return "Country-pack limitation is reviewed and retained as an explicit readiness warning.";
  }

  return "Manual readiness task is completed and retained as evidence.";
};

const sourceReferencesFromUnknown = (sourceReferences: readonly Record<string, unknown>[] = []): SourceReference[] =>
  sourceReferences
    .filter((reference): reference is Record<string, unknown> & { sourceRecordId: string } => {
      return typeof reference.sourceRecordId === "string";
    })
    .map((reference) => ({
      sourceRecordId: reference.sourceRecordId,
      article: typeof reference.article === "string" ? reference.article : undefined,
      paragraph: typeof reference.paragraph === "string" ? reference.paragraph : undefined,
      annex: typeof reference.annex === "string" ? reference.annex : undefined,
      nationalReference: typeof reference.nationalReference === "string" ? reference.nationalReference : undefined,
      sourceUrl: typeof reference.sourceUrl === "string" ? reference.sourceUrl : undefined,
      sourceVersion: typeof reference.sourceVersion === "string" ? reference.sourceVersion : undefined,
      label: typeof reference.label === "string" ? reference.label : undefined
    }));
