import type { RecommendationSummary } from "@puresoc/shared";

import { uniqueSourceReferences } from "./control-catalog";
import type { ComplianceGap, ReadinessPlan, ReadinessPlanItem, RecommendationActionType } from "./types";

export interface GenerateReadinessPlanInput {
  organizationId: string;
  assessmentId: string;
  gaps: readonly ComplianceGap[];
  recommendations?: readonly RecommendationSummary[];
  defaultOwnerUserId?: string;
  generatedAt?: string;
  title?: string;
}

export const generateReadinessPlan = (input: GenerateReadinessPlanInput): ReadinessPlan => {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const planId = [input.assessmentId, "readiness-plan"].join(":");
  const recommendations = input.recommendations ?? [];

  return {
    id: planId,
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    title: input.title ?? "100% internal readiness plan",
    targetReadinessPercent: 100,
    status: "draft",
    generatedAt,
    items: input.gaps.map((gap, index) =>
      readinessPlanItemForGap({
        planId,
        gap,
        index,
        recommendation: recommendations.find(
          (candidate) => candidate.controlId === gap.controlId && candidate.jurisdiction === gap.jurisdiction
        ),
        ownerUserId: input.defaultOwnerUserId ?? "unassigned",
        generatedAt
      })
    )
  };
};

const readinessPlanItemForGap = (input: {
  planId: string;
  gap: ComplianceGap;
  index: number;
  recommendation?: RecommendationSummary;
  ownerUserId: string;
  generatedAt: string;
}): ReadinessPlanItem => {
  const recommendation = input.recommendation;
  const dependencies = uniqueStrings([
    ...(recommendation?.requiredPermissions ?? []),
    ...(recommendation?.requiredLicense ?? []),
    ...(input.gap.missingEvidence.length > 0 ? ["evidence_upload"] : []),
    ...(input.gap.countryPackWarnings.length > 0 ? ["country_pack_source_review"] : [])
  ]);

  return {
    id: [input.planId, input.index + 1, input.gap.controlId].join(":"),
    organizationId: input.gap.organizationId,
    readinessPlanId: input.planId,
    controlId: input.gap.controlId,
    providerRecommendationId: recommendation?.id,
    jurisdiction: input.gap.jurisdiction,
    gapSummary: input.gap.summary,
    recommendedAction: recommendation?.title ?? input.gap.recommendedActions[0] ?? "Review control readiness",
    actionType: recommendation?.recommendationType ?? actionTypeForGap(input.gap),
    ownerUserId: input.ownerUserId,
    dueDate: dueDateForSeverity(input.generatedAt, input.gap.severity),
    automationAvailable:
      recommendation?.automationMode === "preflightable" || recommendation?.automationMode === "executable_later",
    evidenceRequired: recommendation?.evidenceRequired ?? input.gap.missingEvidence.length > 0,
    findingIds: uniqueStrings([
      ...input.gap.findingIds,
      ...(recommendation?.sourceFindingIds ?? []),
      ...(recommendation?.sourceFindingId ? [recommendation.sourceFindingId] : [])
    ]),
    manualTaskIds: uniqueStrings([...input.gap.manualTaskIds, ...(recommendation?.manualTaskIds ?? [])]),
    dependencies,
    status: recommendation?.status ?? "proposed",
    legalReviewRequired:
      input.gap.countryPackWarnings.length > 0 ||
      recommendation?.recommendationType === "country_registration" ||
      recommendation?.recommendationType === "incident_reporting",
    sourceReferences: uniqueSourceReferences([
      ...input.gap.sourceReferences,
      ...(recommendation?.sourceReferences ?? [])
    ])
  };
};

const actionTypeForGap = (gap: ComplianceGap): RecommendationActionType => {
  if (gap.missingEvidence.length > 0) {
    return "evidence_upload";
  }

  if (gap.providerSignals.length > 0) {
    return "technical";
  }

  return "process";
};

const dueDateForSeverity = (generatedAt: string, severity: ComplianceGap["severity"]): string => {
  const date = new Date(generatedAt);
  const days = severity === "critical" ? 7 : severity === "high" ? 14 : severity === "medium" ? 30 : 60;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const uniqueStrings = (values: readonly string[]): string[] => [...new Set(values.filter(Boolean))];
