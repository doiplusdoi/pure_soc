import {
  uniqueSourceReferences,
  type ComplianceGap
} from "@puresoc/compliance-core";

import {
  evaluateMicrosoft365Capabilities,
  formatCapabilities,
  microsoft365BusinessPremiumSourceReferences,
  microsoft365CapabilityCatalogVersion,
  type Microsoft365CapabilityEvaluation,
  type Microsoft365SecurityCapability,
  type Microsoft365SubscriptionInput
} from "./capability-catalog";
import {
  generateStructuredRecommendations,
  type GenerateStructuredRecommendationsInput
} from "./generator";
import type {
  RecommendationContract,
  RecommendationEvidenceUsed,
  RecommendationRuleMetadata,
  RecommendationSeverity,
  RecommendationSnapshot
} from "./recommendation.types";

export interface RecommendationMicrosoft365Context {
  subscriptions?: readonly Microsoft365SubscriptionInput[];
  verifiedCapabilities?: readonly Microsoft365SecurityCapability[];
  userCount?: number;
  securityFindings?: readonly string[];
}

export interface RecommendationContextInput {
  countryCode?: string;
  country?: string;
  sector?: string;
  subsector?: string;
  likelyEntityCategory?: string;
  employeeCount?: number;
  sizeRange?: string;
  businessAnswers?: Record<string, unknown>;
  operationalDependencies?: readonly string[];
  evidenceConfidence?: "low" | "medium" | "high" | number;
  microsoft365?: RecommendationMicrosoft365Context;
}

export interface GenerateRecommendationSnapshotInput extends GenerateStructuredRecommendationsInput {
  context?: RecommendationContextInput;
  existingRecommendations?: readonly RecommendationContract[];
  generatedAt?: string;
}

export interface RecommendationGenerationSnapshotResult {
  recommendations: RecommendationContract[];
  snapshot: RecommendationSnapshot;
}

const businessPremiumRule: RecommendationRuleMetadata = {
  id: "microsoft365.business-premium-evaluation",
  version: "2026-06-demo.v1",
  catalogVersion: microsoft365CapabilityCatalogVersion
};

const relevantGapKeywords = [
  "access",
  "authentication",
  "business continuity",
  "continuity",
  "device",
  "email",
  "endpoint",
  "identity",
  "incident",
  "mfa",
  "phishing",
  "risk",
  "supplier",
  "supply"
];

export const generateRecommendationSnapshot = (
  input: GenerateRecommendationSnapshotInput
): RecommendationGenerationSnapshotResult => {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const baseRecommendations = generateStructuredRecommendations({
    organizationId: input.organizationId,
    gaps: input.gaps,
    providerRecommendations: input.providerRecommendations
  });
  const capabilityEvaluation = evaluateMicrosoft365Capabilities(input.context?.microsoft365);
  const snapshotId = snapshotIdFor(input.organizationId, input.gaps, generatedAt);
  const existingRecommendations = [...baseRecommendations, ...(input.existingRecommendations ?? [])];
  const dynamicRecommendations = generateDynamicRecommendations({
    organizationId: input.organizationId,
    gaps: input.gaps,
    context: input.context,
    capabilityEvaluation,
    existingRecommendations,
    snapshotId
  });
  const recommendations = [...baseRecommendations, ...dynamicRecommendations];
  const ruleVersions = uniqueRules(recommendations);
  const snapshot: RecommendationSnapshot = {
    id: snapshotId,
    organizationId: input.organizationId,
    assessmentIds: uniqueStrings(input.gaps.map((gap) => gap.assessmentId)),
    generatedAt,
    ruleVersions,
    catalogVersions: uniqueStrings(ruleVersions.map((rule) => rule.catalogVersion).filter(Boolean)),
    inputSummary: {
      gapCount: input.gaps.length,
      countryCode: normalizedCountryCode(input.context),
      sector: input.context?.sector,
      subsector: input.context?.subsector,
      likelyEntityCategory: input.context?.likelyEntityCategory,
      employeeCount: input.context?.employeeCount,
      sizeRange: input.context?.sizeRange,
      operationalDependencies: [...(input.context?.operationalDependencies ?? [])],
      existingRecommendationCount: input.existingRecommendations?.length ?? 0
    },
    diagnostics: {
      unknownMicrosoftSkuPartNumbers: capabilityEvaluation.unknownSkuPartNumbers,
      knownMicrosoftSkuPartNumbers: capabilityEvaluation.knownSkuPartNumbers,
      activeCapabilities: capabilityEvaluation.activeCapabilities,
      missingCapabilities: capabilityEvaluation.missingCapabilities,
      lowerBusinessPlanDetected: capabilityEvaluation.lowerBusinessPlanSkuPartNumbers.length > 0
    },
    recommendations
  };

  return {
    recommendations: recommendations.map((recommendation) =>
      recommendation.snapshotId ? recommendation : { ...recommendation, snapshotId }
    ),
    snapshot: {
      ...snapshot,
      recommendations: recommendations.map((recommendation) =>
        recommendation.snapshotId ? recommendation : { ...recommendation, snapshotId }
      )
    }
  };
};

interface GenerateDynamicRecommendationsInput {
  organizationId: string;
  gaps: readonly ComplianceGap[];
  context?: RecommendationContextInput;
  capabilityEvaluation: Microsoft365CapabilityEvaluation;
  existingRecommendations: readonly RecommendationContract[];
  snapshotId: string;
}

const generateDynamicRecommendations = (
  input: GenerateDynamicRecommendationsInput
): RecommendationContract[] => {
  const businessPremiumRecommendation = generateBusinessPremiumRecommendation(input);

  return businessPremiumRecommendation ? [businessPremiumRecommendation] : [];
};

const generateBusinessPremiumRecommendation = (
  input: GenerateDynamicRecommendationsInput
): RecommendationContract | undefined => {
  const userCount = input.context?.microsoft365?.userCount ?? input.context?.employeeCount ?? input.capabilityEvaluation.evaluatedUserCount;
  const relevantGaps = input.gaps.filter(isRelevantNis2Gap);
  const missingCapabilities = input.capabilityEvaluation.missingCapabilities;
  const hasExistingRuleRecommendation = input.existingRecommendations.some(
    (recommendation) => recommendation.rule?.id === businessPremiumRule.id
  );
  const canEvaluateBusinessPremium =
    typeof userCount === "number" &&
    userCount > 0 &&
    userCount <= 300 &&
    input.capabilityEvaluation.lowerBusinessPlanSkuPartNumbers.length > 0 &&
    missingCapabilities.length > 0 &&
    relevantGaps.length > 0 &&
    !hasExistingRuleRecommendation;

  if (!canEvaluateBusinessPremium) {
    return undefined;
  }

  const priorityContext = priorityForContext(input.context, relevantGaps);
  const requiredCapability = formatCapabilities(missingCapabilities);
  const sourceFindingIds = uniqueStrings(relevantGaps.flatMap((gap) => gap.findingIds));
  const manualTaskIds = uniqueStrings(relevantGaps.flatMap((gap) => gap.manualTaskIds));
  const nis2ControlMappings = uniqueStrings(relevantGaps.map((gap) => gap.controlId));
  const countryCode = normalizedCountryCode(input.context);
  const evidenceUsed = buildEvidenceUsed(input, relevantGaps, userCount);
  const sectorFocus = sectorFocusForContext(input.context);
  const finding =
    `The latest Microsoft 365 context shows a lower business subscription and no verified coverage for ${requiredCapability}.`;
  const whyItMatters =
    `${sectorFocus.whyItMatters} These capabilities can support NIS2 readiness work for access control, device hygiene, endpoint protection, and phishing resistance when they are licensed, configured, and evidenced.`;
  const recommendedAction =
    `${sectorFocus.actionPrefix} Compare Microsoft security options, evaluate Microsoft 365 Business Premium, and add the selected configuration work to the readiness plan.`;
  const expectedReadinessEffect =
    "Estimated readiness effect: may improve evidence confidence for mapped identity, device, endpoint, and email-security controls after configuration and verification.";

  return {
    id: `${input.organizationId}:${businessPremiumRule.id}:${businessPremiumRule.version}`,
    organizationId: input.organizationId,
    sourceFindingId: sourceFindingIds[0],
    sourceFindingIds,
    manualTaskIds,
    controlId: relevantGaps[0]?.controlId ?? "nis2.identity-access",
    jurisdiction: relevantGaps[0]?.jurisdiction ?? countryCode ?? "EU",
    title: "Evaluate Microsoft 365 Business Premium for security capability coverage",
    summary:
      "Microsoft 365 Business Premium may cover missing identity, device-management, endpoint, and email-security capabilities for organizations up to 300 users. The license decision must be paired with configuration, evidence capture, and legal review.",
    severity: priorityContext.priority,
    confidence: input.capabilityEvaluation.knownSkuPartNumbers.length > 0 ? "medium" : "low",
    recommendationType: "guided",
    automationMode: "manual",
    requiredPermissions: [],
    requiredLicense: ["Microsoft 365 Business Premium"],
    expectedChange: expectedReadinessEffect,
    blastRadius: "Commercial and configuration evaluation only. PureSOC does not perform provider write actions for this recommendation.",
    manualFallback:
      "Review this readiness gap with the customer, document the licensing decision, and attach configuration evidence before closing mapped controls.",
    evidenceRequired: true,
    status: "proposed",
    sourceReferences: uniqueSourceReferences([
      ...relevantGaps.flatMap((gap) => gap.sourceReferences),
      ...microsoft365BusinessPremiumSourceReferences
    ]),
    rule: businessPremiumRule,
    decision: {
      finding,
      whyItMatters,
      evidenceUsed,
      nis2ControlMappings,
      countryMappings: countryCode ? [countryCode] : [],
      priority: priorityContext.priority,
      recommendedAction,
      expectedReadinessEffect,
      requiredCapability,
      microsoftProductOrLicense: "Microsoft 365 Business Premium",
      partnerServiceOpportunity: "Security capability assessment and Microsoft 365 Business Premium implementation planning",
      customerCta: missingCapabilities.includes("identity_policy")
        ? "Improve identity protection"
        : "Compare Microsoft security options",
      partnerCta: "Request partner proposal",
      disclaimer:
        "Readiness recommendation only; it is not legal advice, certification, or proof that a product satisfies NIS2 obligations."
    },
    opportunity: {
      type: "microsoft_security_capability_evaluation",
      priority: priorityContext.priority,
      relevantMicrosoftCapabilityOrPlan: "Microsoft 365 Business Premium",
      affectedUsers: userCount,
      nis2Areas: nis2ControlMappings,
      evidenceSource: "Microsoft 365 subscription context and NIS2 readiness gaps",
      nextAction: priorityContext.nextAction
    },
    capabilityDiagnostics: {
      catalogVersion: input.capabilityEvaluation.catalogVersion,
      knownSkuPartNumbers: input.capabilityEvaluation.knownSkuPartNumbers,
      unknownSkuPartNumbers: input.capabilityEvaluation.unknownSkuPartNumbers,
      activeCapabilities: input.capabilityEvaluation.activeCapabilities,
      missingCapabilities,
      lowerBusinessPlanDetected: input.capabilityEvaluation.lowerBusinessPlanSkuPartNumbers.length > 0,
      evaluatedUserCount: userCount
    },
    snapshotId: input.snapshotId
  };
};

const isRelevantNis2Gap = (gap: ComplianceGap): boolean => {
  const haystack = [
    gap.controlId,
    gap.controlCode,
    gap.summary,
    ...gap.findings,
    ...gap.recommendedActions,
    ...gap.missingEvidence,
    ...gap.providerSignals,
    ...gap.manualTasks
  ]
    .join(" ")
    .toLowerCase();

  return relevantGapKeywords.some((keyword) => haystack.includes(keyword));
};

const buildEvidenceUsed = (
  input: GenerateDynamicRecommendationsInput,
  relevantGaps: readonly ComplianceGap[],
  userCount: number
): RecommendationEvidenceUsed[] => {
  const evidenceUsed: Array<RecommendationEvidenceUsed | undefined> = [
    {
      type: "microsoft_license",
      label: "Known Microsoft 365 SKU",
      value: input.capabilityEvaluation.knownSkuPartNumbers.join(", "),
      sourceId: "microsoft365.subscribedSkus"
    },
    {
      type: "capability_catalog",
      label: "Missing mapped capabilities",
      value: formatCapabilities(input.capabilityEvaluation.missingCapabilities),
      sourceId: input.capabilityEvaluation.catalogVersion
    },
    {
      type: "business_context",
      label: "Affected users",
      value: String(userCount)
    },
    input.context?.sector
      ? {
          type: "business_context",
          label: "Sector",
          value: input.context.sector
        }
      : undefined,
    input.context?.likelyEntityCategory
      ? {
          type: "business_context",
          label: "Likely entity category",
          value: input.context.likelyEntityCategory
        }
      : undefined,
    {
      type: "business_context",
      label: "Sector focus",
      value: sectorFocusForContext(input.context).label
    },
    ...relevantGaps.map((gap) => ({
      type: "compliance_gap" as const,
      label: gap.summary,
      value: gap.controlId,
      sourceId: gap.id
    }))
  ];

  return evidenceUsed.filter((entry): entry is RecommendationEvidenceUsed => Boolean(entry));
};

const priorityForContext = (
  context: RecommendationContextInput | undefined,
  relevantGaps: readonly ComplianceGap[]
): { priority: RecommendationSeverity; nextAction: string } => {
  const sector = normalizeText(context?.sector);
  const dependencies = normalizeText((context?.operationalDependencies ?? []).join(" "));
  const hasCriticalGap = relevantGaps.some((gap) => gap.severity === "critical");

  if (sector.includes("managed service") || sector === "msp" || dependencies.includes("privileged access")) {
    return {
      priority: "critical",
      nextAction: "Review privileged access exposure and request partner proposal"
    };
  }

  if (sector.includes("pharma") || sector.includes("pharmaceutical") || dependencies.includes("regulated")) {
    return {
      priority: hasCriticalGap ? "critical" : "high",
      nextAction: "Review regulated process access and endpoint protection coverage"
    };
  }

  if (sector.includes("food") || dependencies.includes("supplier") || dependencies.includes("continuity")) {
    return {
      priority: hasCriticalGap ? "critical" : "high",
      nextAction: "Add supplier continuity and endpoint coverage review to the readiness plan"
    };
  }

  return {
    priority: hasCriticalGap ? "critical" : "medium",
    nextAction: "Compare Microsoft security options"
  };
};

const sectorFocusForContext = (
  context: RecommendationContextInput | undefined
): { label: string; whyItMatters: string; actionPrefix: string } => {
  const sector = normalizeText(context?.sector);
  const dependencies = normalizeText((context?.operationalDependencies ?? []).join(" "));

  if (sector.includes("managed service") || sector === "msp" || dependencies.includes("privileged access")) {
    return {
      label: "managed service provider privileged access and customer-impacting services",
      whyItMatters:
        "Managed service providers often hold privileged access and customer-impacting service dependencies.",
      actionPrefix: "Prioritize privileged access, incident handling, and supply-chain exposure."
    };
  }

  if (sector.includes("pharma") || sector.includes("pharmaceutical") || dependencies.includes("regulated")) {
    return {
      label: "pharmaceutical operational and regulated processes",
      whyItMatters:
        "Pharmaceutical manufacturers need dependable access controls around operational and regulated processes.",
      actionPrefix: "Prioritize regulated process access, supplier risk, and endpoint protection."
    };
  }

  if (sector.includes("food") || dependencies.includes("supplier") || dependencies.includes("continuity")) {
    return {
      label: "food distribution continuity and supplier dependencies",
      whyItMatters:
        "Food distributors depend on continuity, supplier coordination, and endpoint availability across operations.",
      actionPrefix: "Prioritize continuity, supplier dependencies, identity, and endpoint coverage."
    };
  }

  return {
    label: "general NIS2 readiness context",
    whyItMatters:
      "The mapped capabilities can support common NIS2 readiness work when implemented and evidenced.",
    actionPrefix: "Review this readiness gap."
  };
};

const normalizedCountryCode = (context: RecommendationContextInput | undefined): string | undefined =>
  (context?.countryCode ?? context?.country)?.trim().toUpperCase() || undefined;

const normalizeText = (value: string | undefined): string => (value ?? "").trim().toLowerCase();

const snapshotIdFor = (organizationId: string, gaps: readonly ComplianceGap[], generatedAt: string): string =>
  [organizationId, gaps[0]?.assessmentId ?? "manual", "recommendations", generatedAt.replace(/[^0-9A-Za-z]/g, "")].join(":");

const uniqueRules = (recommendations: readonly RecommendationContract[]): RecommendationRuleMetadata[] => {
  const rulesByKey = new Map<string, RecommendationRuleMetadata>();

  for (const recommendation of recommendations) {
    if (recommendation.rule) {
      rulesByKey.set(`${recommendation.rule.id}:${recommendation.rule.version}`, recommendation.rule);
    }
  }

  return [...rulesByKey.values()].sort((left, right) => left.id.localeCompare(right.id));
};

const uniqueStrings = (values: readonly (string | undefined)[]): string[] => [
  ...new Set(values.filter((value): value is string => Boolean(value)))
];
