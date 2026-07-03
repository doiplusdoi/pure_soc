import { randomUUID } from "node:crypto";

import { AuthError } from "@puresoc/auth-core";
import type { ComplianceControlResult, ComplianceGap, ReadinessPlan, SourceReference } from "@puresoc/compliance-core";
import {
  buildCommonNis2OnboardingCountryPack,
  buildNis2CountryPackOnboardingRegistry,
  classifyWithNis2CountryPack,
  germanyNis2DemoCountryPack,
  nis2CommonOnboardingScreens,
  polandNis2DemoCountryPack,
  requiredFieldKeysForPack,
  requiredFieldKeysForScreen,
  sanitizeNis2OnboardingContractForCustomer,
  type Nis2CountryPackOnboardingContract,
  type Nis2CountryPackClassificationInput,
  type Nis2CountryPackDefinition,
  type Nis2CountryPackStructuredClassification,
  type Nis2OfficialSourceReference
} from "@puresoc/country-packs-core";
import {
  classifyRoNis2Entity,
  romaniaNis2CountryPackDefinition,
  romaniaNis2OnboardingCountryPack,
  type RoNis2Article9Input,
  type RoNis2ClassificationInput,
  type RoNis2EntitySize,
  type RoNis2RelationshipInput
} from "@puresoc/country-pack-ro";
import type {
  Nis2ClassificationRunRecord,
  Nis2OnboardingProgressRecord,
  Nis2OnboardingRepository,
  OutputRecordRepository
} from "@puresoc/database";
import { generateRecommendationSnapshot } from "@puresoc/recommendations";
import type { InternalReadinessReportVersionContext } from "../../reports/service";

export const NIS2_COUNTRY_ONBOARDING_SCHEMA_VERSION = "puresoc.nis2.country_onboarding.v2";

export interface Nis2OnboardingScreenDefinition {
  key: string;
  label: string;
  routePath: string;
  summary: string;
  requiredFieldPaths: readonly string[];
}

export const nis2CountryOnboardingScreens: readonly Nis2OnboardingScreenDefinition[] = nis2CommonOnboardingScreens.map(
  (screen) => ({
    key: screen.key,
    label: screen.title,
    routePath: screen.routePath,
    summary: screen.summary,
    requiredFieldPaths: []
  })
);

export const nis2CountryPackDefinitions = [
  polandNis2DemoCountryPack,
  germanyNis2DemoCountryPack,
  romaniaNis2CountryPackDefinition
] satisfies readonly Nis2CountryPackDefinition[];

export const nis2CountryPackOnboardingRegistry = buildNis2CountryPackOnboardingRegistry([
  romaniaNis2OnboardingCountryPack,
  buildCommonNis2OnboardingCountryPack(polandNis2DemoCountryPack, {
    countryNotes: [
      "Poland personalization is a demo pack.",
      "Use the common EU baseline until a reviewed national pack is activated."
    ],
    safeSourceSummary: "Poland country personalization stub. Review required before external use.",
    sourceReviewStatus: "review_required"
  }),
  buildCommonNis2OnboardingCountryPack(germanyNis2DemoCountryPack, {
    countryNotes: [
      "Germany personalization is a demo pack.",
      "Use the common EU baseline until a reviewed national pack is activated."
    ],
    safeSourceSummary: "Germany country personalization stub. Review required before external use.",
    sourceReviewStatus: "review_required"
  })
]);

export interface Nis2OnboardingApiServiceOptions {
  now?: () => Date;
  outputRepository: OutputRecordRepository;
  repository: Nis2OnboardingRepository;
}

export interface SaveNis2OnboardingInput {
  actorUserId: string;
  answers: Record<string, unknown>;
  assessmentId?: string;
  completedScreens?: string[];
  countryCode: string;
  currentScreen?: string;
  onboardingProgressId?: string;
  organizationId: string;
  status?: string;
}

export interface Nis2OnboardingState {
  classificationRun: Nis2ClassificationRunRecord | null;
  progress: Nis2OnboardingProgressRecord | null;
}

export type Nis2OnboardingClassification = Nis2CountryPackStructuredClassification & {
  countrySpecificResult?: Record<string, unknown>;
  sourceVersion?: string;
};

export class Nis2OnboardingApiService {
  private readonly now: () => Date;
  private readonly outputRepository: OutputRecordRepository;
  private readonly repository: Nis2OnboardingRepository;

  constructor(options: Nis2OnboardingApiServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.outputRepository = options.outputRepository;
    this.repository = options.repository;
  }

  async getReadinessState(input: { countryCode: string; organizationId: string }): Promise<Nis2OnboardingState> {
    const countryCode = normalizeCountryCode(input.countryCode);
    const progress = await this.repository.findLatestOnboardingProgressForOrganization({
      countryCode,
      organizationId: input.organizationId
    });
    const classificationRun = progress
      ? await this.repository.findLatestClassificationRunForOrganization({
          countryCode,
          onboardingProgressId: progress.id,
          organizationId: input.organizationId
        })
      : null;

    return {
      classificationRun,
      progress
    };
  }

  async saveOnboardingProgress(input: SaveNis2OnboardingInput): Promise<Nis2OnboardingProgressRecord> {
    const countryPack = findNis2CountryPackDefinition(input.countryCode);
    const onboardingPack = findNis2OnboardingCountryPack(countryPack.countryCode);
    const existing = input.onboardingProgressId
      ? await this.repository.findOnboardingProgressForOrganization({
          onboardingProgressId: input.onboardingProgressId,
          organizationId: input.organizationId
        })
      : await this.repository.findLatestOnboardingProgressForOrganization({
          countryCode: countryPack.countryCode,
          organizationId: input.organizationId
        });
    const nowIso = this.now().toISOString();
    const answers = {
      ...deepMerge(existing?.answers ?? {}, normalizeAnswers(input.answers)),
      company: {
        ...(isRecord((existing?.answers ?? {}).company) ? (existing?.answers.company as Record<string, unknown>) : {}),
        ...(isRecord(input.answers.company) ? input.answers.company : {}),
        countryCode: countryPack.countryCode
      }
    };
    normalizeGovernanceAnswerKeys(answers);
    normalizeCountrySpecificAnswerAliases(answers, countryPack.countryCode);
    const completedScreens = normalizeCompletedScreens(input.completedScreens, onboardingPack) ?? inferCompletedScreens(answers, onboardingPack);
    const missingRequiredFields = missingRequiredFieldPaths(answers, onboardingPack);
    const currentScreen = normalizeCurrentScreen(input.currentScreen, onboardingPack) ?? inferCurrentScreen(answers, onboardingPack);

    return this.repository.saveOnboardingProgress({
      id: existing?.id ?? randomUUID(),
      organizationId: input.organizationId,
      assessmentId: input.assessmentId ?? existing?.assessmentId ?? randomUUID(),
      answers,
      completedScreens,
      countryCode: countryPack.countryCode,
      currentScreen,
      missingRequiredFields,
      savedBy: input.actorUserId,
      sourceReferences: countryPackSourceReferences(countryPack).map((source) => ({ ...source })),
      sourceVersion: sourceVersionFor(countryPack, onboardingPack),
      status: normalizeStatus(input.status) ?? (missingRequiredFields.length === 0 ? "ready_for_report" : "in_progress"),
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso
    });
  }

  async classifyLatestOnboarding(input: {
    actorUserId: string;
    countryCode: string;
    organizationId: string;
  }): Promise<{
    classification: Nis2OnboardingClassification;
    classificationRun: Nis2ClassificationRunRecord;
    progress: Nis2OnboardingProgressRecord;
  }> {
    const countryPack = findNis2CountryPackDefinition(input.countryCode);
    const onboardingPack = findNis2OnboardingCountryPack(countryPack.countryCode);
    const progress = await this.requireLatestProgress({
      countryCode: countryPack.countryCode,
      organizationId: input.organizationId
    });
    const classificationInput =
      onboardingPack.classificationAdapter.key === "ro_workbook_backed"
        ? roClassificationInputFromAnswers(progress.answers)
        : classificationInputFromAnswers(progress.answers);
    const classification: Nis2OnboardingClassification =
      onboardingPack.classificationAdapter.key === "ro_workbook_backed"
        ? classifyRomaniaOnboarding(countryPack, classificationInput as RoNis2ClassificationInput)
        : classifyWithNis2CountryPack(countryPack, classificationInput as Nis2CountryPackClassificationInput);
    const nowIso = this.now().toISOString();
    const classificationRun = await this.repository.saveClassificationRun({
      id: randomUUID(),
      organizationId: input.organizationId,
      assessmentId: progress.assessmentId,
      onboardingProgressId: progress.id,
      countryCode: countryPack.countryCode,
      input: classificationInput as Record<string, unknown>,
      result: classification.result,
      confidence: classification.confidence,
      legalReviewRequired: classification.legalReviewRequired,
      explanation: classification.explanation,
      assumptions: [...classification.assumptions],
      matchedRules: [...classification.matchedRules],
      missingInformation: [...classification.missingInformation],
      legalBasisReferences: classification.legalBasisReferences.map(toStoredSourceReference),
      sourceVersion: classification.sourceVersion ?? sourceVersionFor(countryPack, onboardingPack),
      classifiedAt: nowIso
    });

    return {
      classification,
      classificationRun,
      progress
    };
  }

  async requireLatestProgress(input: {
    countryCode: string;
    organizationId: string;
  }): Promise<Nis2OnboardingProgressRecord> {
    const countryCode = normalizeCountryCode(input.countryCode);
    const progress = await this.repository.findLatestOnboardingProgressForOrganization({
      countryCode,
      organizationId: input.organizationId
    });
    if (!progress) {
      throw new AuthError("invalid_request", "NIS2 onboarding progress was not found for this organization and country.", 404);
    }

    return progress;
  }

  async prepareInitialReportAnalysis(input: {
    actorUserId: string;
    countryCode: string;
    organizationId: string;
  }): Promise<{
    assessmentId: string;
    classificationRunCreated: boolean;
    classificationRun: Nis2ClassificationRunRecord;
    progress: Nis2OnboardingProgressRecord;
    versionContext: InternalReadinessReportVersionContext;
  }> {
    const countryPack = findNis2CountryPackDefinition(input.countryCode);
    const onboardingPack = findNis2OnboardingCountryPack(countryPack.countryCode);
    let progress = await this.requireLatestProgress({
      countryCode: countryPack.countryCode,
      organizationId: input.organizationId
    });
    if (progress.missingRequiredFields.length > 0) {
      throw new AuthError(
        "invalid_request",
        `Complete required NIS2 onboarding fields before generating a report: ${progress.missingRequiredFields.join(", ")}.`,
        400
      );
    }

    const existingClassification = await this.repository.findLatestClassificationRunForOrganization({
      countryCode: countryPack.countryCode,
      onboardingProgressId: progress.id,
      organizationId: input.organizationId
    });
    const classificationRunCreated = !existingClassification;
    const classificationRun =
      existingClassification ??
      (await this.classifyLatestOnboarding({
        actorUserId: input.actorUserId,
        countryCode: countryPack.countryCode,
        organizationId: input.organizationId
      })).classificationRun;
    progress = await this.requireLatestProgress({
      countryCode: countryPack.countryCode,
      organizationId: input.organizationId
    });
    const assessmentId = progress.assessmentId ?? randomUUID();
    const nowIso = this.now().toISOString();
    const sourceReferences = countryPackSourceReferences(countryPack);
    const controls = buildDeclaredControlResults({
      answers: progress.answers,
      assessmentId,
      countryPack,
      evaluatedAt: nowIso,
      organizationId: input.organizationId,
      sourceReferences
    });
    const gaps = buildGapsFromControls({
      controls,
      countryPack,
      sourceReferences
    });
    const recommendations = generateRecommendationSnapshot({
      organizationId: input.organizationId,
      gaps,
      context: {
        countryCode: countryPack.countryCode,
        employeeCount: numberAtPath(progress.answers, "business.employeeCount"),
        evidenceConfidence: "low",
        likelyEntityCategory: classificationRun.result,
        operationalDependencies: stringsAtPath(progress.answers, "dependencies.criticalSuppliers"),
        sector: stringAtPath(progress.answers, "business.sector")
      },
      generatedAt: nowIso
    }).recommendations;
    const readinessPlan = buildReadinessPlan({
      assessmentId,
      gaps,
      generatedAt: nowIso,
      organizationId: input.organizationId
    });

    await this.outputRepository.saveStoredAnalysis({
      organizationId: input.organizationId,
      assessmentId,
      jurisdiction: countryPack.countryCode,
      catalogVersion: sourceVersionFor(countryPack, onboardingPack),
      recordedAt: nowIso,
      results: controls,
      gaps,
      recommendations,
      readinessPlan,
      evidenceArtifacts: []
    });

    return {
      assessmentId,
      classificationRunCreated,
      classificationRun,
      progress,
      versionContext: {
        classificationResult: {
          confidence: classificationRun.confidence,
          countryCode: countryPack.countryCode,
          explanation: classificationRun.explanation,
          legalReviewRequired: classificationRun.legalReviewRequired,
          missingInformation: classificationRun.missingInformation,
          result: classificationRun.result
        },
        countryPackVersion: countryPack.packVersion,
        onboardingSchemaVersion: progress.sourceVersion,
        reportVersion: 1,
        triggerType: "onboarding_completed"
      }
    };
  }
}

export const findNis2CountryPackDefinition = (countryCode: string): Nis2CountryPackDefinition => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const countryPack = nis2CountryPackDefinitions.find((pack) => pack.countryCode === normalizedCountryCode);
  if (!countryPack) {
    throw new AuthError("invalid_request", "NIS2 country pack was not found.", 404);
  }

  return countryPack;
};

export const findNis2OnboardingCountryPack = (countryCode: string): Nis2CountryPackOnboardingContract => {
  try {
    return nis2CountryPackOnboardingRegistry.require(countryCode);
  } catch {
    throw new AuthError("invalid_request", "NIS2 onboarding country pack was not found.", 404);
  }
};

export const listSupportedNis2OnboardingCountryPacks = (): readonly Nis2CountryPackOnboardingContract[] =>
  nis2CountryPackOnboardingRegistry.list();

export const toCustomerOnboardingCountryPack = (countryCode: string) =>
  sanitizeNis2OnboardingContractForCustomer(findNis2OnboardingCountryPack(countryCode));

const buildDeclaredControlResults = (input: {
  answers: Record<string, unknown>;
  assessmentId: string;
  countryPack: Nis2CountryPackDefinition;
  evaluatedAt: string;
  organizationId: string;
  sourceReferences: SourceReference[];
}): ComplianceControlResult[] => {
  const dependencies = [
    stringAtPath(input.answers, "dependencies.businessContinuity"),
    stringAtPath(input.answers, "dependencies.backupArrangements"),
    stringAtPath(input.answers, "dependencies.incidentResponse")
  ].filter(Boolean);
  const supplierInputs = [
    stringsAtPath(input.answers, "dependencies.criticalSuppliers").join(", "),
    stringAtPath(input.answers, "governance.supplyChainSecurity")
  ].filter(Boolean);

  return [
    declaredControl({
      assessmentId: input.assessmentId,
      evaluatedAt: input.evaluatedAt,
      organizationId: input.organizationId,
      jurisdiction: input.countryPack.countryCode,
      controlId: "nis2.identity-access",
      controlCode: "NIS2-ART21-IAM",
      sourceReferences: input.sourceReferences,
      summary: "Declared identity and access-control readiness from onboarding answers.",
      status: statusFromDeclaredAnswer([
        stringAtPath(input.answers, "governance.identityControls"),
        stringAtPath(input.answers, "governance.mfa")
      ])
    }),
    declaredControl({
      assessmentId: input.assessmentId,
      evaluatedAt: input.evaluatedAt,
      organizationId: input.organizationId,
      jurisdiction: input.countryPack.countryCode,
      controlId: "nis2.incident-continuity",
      controlCode: "NIS2-ART21-BCIR",
      sourceReferences: input.sourceReferences,
      summary: dependencies.length > 0
        ? `Declared continuity and incident handling context: ${dependencies.join("; ")}.`
        : "Declared continuity and incident handling context is missing.",
      status: statusFromDeclaredAnswer(dependencies)
    }),
    declaredControl({
      assessmentId: input.assessmentId,
      evaluatedAt: input.evaluatedAt,
      organizationId: input.organizationId,
      jurisdiction: input.countryPack.countryCode,
      controlId: "nis2.supplier-risk",
      controlCode: "NIS2-ART21-SUPPLY",
      sourceReferences: input.sourceReferences,
      summary: supplierInputs.length > 0
        ? `Declared supply-chain risk context: ${supplierInputs.join("; ")}.`
        : "Declared supply-chain risk context is missing.",
      status: statusFromDeclaredAnswer(supplierInputs)
    })
  ];
};

const declaredControl = (input: {
  assessmentId: string;
  controlCode: string;
  controlId: string;
  evaluatedAt: string;
  jurisdiction: string;
  organizationId: string;
  sourceReferences: SourceReference[];
  status: ComplianceControlResult["status"];
  summary: string;
}): ComplianceControlResult => {
  const evidenceRequired = input.status === "passing" ? 1 : 2;
  const evidencePresent = input.status === "passing" ? 1 : 0;

  return {
    id: `${input.assessmentId}:${input.controlId}`,
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    controlId: input.controlId,
    controlCode: input.controlCode,
    jurisdiction: input.jurisdiction,
    status: input.status,
    confidence: "low",
    providerSignalIds: [],
    evidenceArtifactIds: [],
    checklistRunItemIds: [],
    summary: input.summary,
    matchedFindings: [],
    missingEvidence: input.status === "passing"
      ? []
      : [
          {
            requirementKey: `${input.controlId}.declared-evidence`,
            title: "Upload declared control evidence",
            description: "Attach policy, configuration, or process evidence before treating this control as verified.",
            sourceReferences: input.sourceReferences
          }
        ],
    manualTasks: [],
    countryPackWarnings: [],
    sourceReferences: input.sourceReferences,
    evidenceCompleteness: {
      required: evidenceRequired,
      present: evidencePresent,
      missing: evidenceRequired - evidencePresent,
      ratio: evidencePresent / evidenceRequired
    },
    evaluatedAt: input.evaluatedAt
  };
};

const buildGapsFromControls = (input: {
  controls: ComplianceControlResult[];
  countryPack: Nis2CountryPackDefinition;
  sourceReferences: SourceReference[];
}): ComplianceGap[] =>
  input.controls
    .filter((control) => control.status !== "passing")
    .map((control) => ({
      id: `${control.assessmentId}:${control.controlId}:gap`,
      organizationId: control.organizationId,
      assessmentId: control.assessmentId,
      jurisdiction: control.jurisdiction,
      controlId: control.controlId,
      controlCode: control.controlCode,
      status: control.status,
      severity: control.status === "needs_evidence" ? "high" : "medium",
      confidence: "low",
      summary: `${control.summary} This is declared onboarding evidence only for ${input.countryPack.displayName}.`,
      findingIds: [],
      findings: ["Saved onboarding answers need supporting evidence before this can be treated as verified readiness."],
      missingEvidence: control.missingEvidence.map((evidence) => evidence.title),
      recommendedActions: [
        "Attach policy or configuration evidence for this declared control.",
        "Review the country-pack source caveat with a qualified advisor before external use."
      ],
      providerSignals: [],
      manualTaskIds: [],
      manualTasks: [],
      countryPackWarnings: input.countryPack.status === "demo" ? ["Country pack is demo/legal-review gated."] : [],
      sourceReferences: input.sourceReferences
    }));

const buildReadinessPlan = (input: {
  assessmentId: string;
  gaps: ComplianceGap[];
  generatedAt: string;
  organizationId: string;
}): ReadinessPlan => ({
  id: `${input.assessmentId}:readiness-plan`,
  organizationId: input.organizationId,
  assessmentId: input.assessmentId,
  title: "Declared NIS2 readiness plan",
  targetReadinessPercent: 100,
  status: "draft",
  generatedAt: input.generatedAt,
  items: input.gaps.map((gap, index) => ({
    id: `${gap.id}:plan-item`,
    organizationId: input.organizationId,
    readinessPlanId: `${input.assessmentId}:readiness-plan`,
    controlId: gap.controlId,
    jurisdiction: gap.jurisdiction,
    gapSummary: gap.summary,
    recommendedAction: gap.recommendedActions[0] ?? "Attach supporting evidence.",
    actionType: index === 0 ? "evidence_upload" : "process",
    ownerUserId: "",
    dueDate: input.generatedAt,
    automationAvailable: false,
    evidenceRequired: true,
    findingIds: gap.findingIds,
    manualTaskIds: gap.manualTaskIds,
    dependencies: [],
    status: "proposed",
    legalReviewRequired: true,
    sourceReferences: gap.sourceReferences
  }))
});

const classifyRomaniaOnboarding = (
  countryPack: Nis2CountryPackDefinition,
  input: RoNis2ClassificationInput
): Nis2OnboardingClassification => {
  const classification = classifyRoNis2Entity(input);
  const result = (() => {
    if (classification.result === "essential_entity") return "likely_essential_entity";
    if (classification.result === "important_entity") return "likely_important_entity";
    if (classification.result === "out_of_scope" || classification.result === "voluntary_registration_possible") {
      return "probably_outside_scope";
    }
    return "legal_review_required";
  })();

  return {
    result,
    matchedRules: [...classification.matchedRules],
    legalBasisReferences: countryPack.officialSources,
    assumptions: [
      "Romania classification remains review required.",
      "The classifier uses saved service, size, Romania relationship, Article 9, and Law 294 answers."
    ],
    missingInformation: [...classification.missingRequiredFields],
    explanation:
      classification.reasons.length > 0
        ? classification.reasons.join(" ")
        : "Romania source-backed classifier returned no explanatory reason for the current inputs.",
    confidence: classification.result === "insufficient_data" ? "low" : "medium",
    legalReviewRequired: true,
    countrySpecificResult: {
      article9Required: classification.article9Required,
      notificationRecommended: classification.notificationRecommended,
      result: classification.result
    },
    sourceVersion: `${NIS2_COUNTRY_ONBOARDING_SCHEMA_VERSION}; ${classification.sourceVersion}`
  };
};

const classificationInputFromAnswers = (answers: Record<string, unknown>): Nis2CountryPackClassificationInput => ({
  employeeCount: numberAtPath(answers, "business.employeeCount"),
  publicAdministration: booleanAtPath(answers, "scope.publicAdministration"),
  sector: stringAtPath(answers, "business.sector") ?? stringAtPath(answers, "scope.sector"),
  services: stringsAtPath(answers, "scope.activities").length > 0 ? stringsAtPath(answers, "scope.activities") : stringsAtPath(answers, "selectedServiceTypeCodes"),
  telecomProvider: booleanAtPath(answers, "scope.telecomProvider")
});

const roClassificationInputFromAnswers = (answers: Record<string, unknown>): RoNis2ClassificationInput => ({
  article9: roArticle9InputFromAnswers(answers),
  relationship: roRelationshipInputFromAnswers(answers),
  selectedServiceTypeCodes: stringsAtPath(answers, "selectedServiceTypeCodes"),
  sizeCategory: roSizeCategoryAtPath(answers, "size.sizeCategory")
});

const roRelationshipInputFromAnswers = (answers: Record<string, unknown>): RoNis2RelationshipInput => ({
  criticalEntityInRomaniaLaw294: booleanAtPath(answers, "relationship.criticalEntityInRomaniaLaw294"),
  establishedInRomania: booleanAtPath(answers, "relationship.establishedInRomania"),
  mainOfficeInRomania: booleanAtPath(answers, "relationship.mainOfficeInRomania"),
  providesServicesInAnotherEuMemberState: booleanAtPath(answers, "relationship.providesServicesInAnotherEuMemberState"),
  providesServicesInRomania: booleanAtPath(answers, "relationship.providesServicesInRomania"),
  publicAdministrationEstablishedByRomania: booleanAtPath(answers, "relationship.publicAdministrationEstablishedByRomania")
});

const roArticle9InputFromAnswers = (answers: Record<string, unknown>): RoNis2Article9Input => ({
  nationalOrRegionalCriticality: booleanAtPath(answers, "article9.nationalOrRegionalCriticality"),
  publicSafetySecurityOrHealthImpact: roImpactAtPath(answers, "article9.publicSafetySecurityOrHealthImpact"),
  soleProviderEssentialService: booleanAtPath(answers, "article9.soleProviderEssentialService"),
  systemicRisk: roImpactAtPath(answers, "article9.systemicRisk")
});

const countryPackSourceReferences = (pack: Nis2CountryPackDefinition): SourceReference[] =>
  pack.officialSources.map(toStoredSourceReference);

const toStoredSourceReference = (source: Nis2OfficialSourceReference): SourceReference & Record<string, unknown> => ({
  sourceRecordId: source.id,
  label: source.title,
  nationalReference: source.trustLevel,
  sourceUrl: source.url,
  sourceVersion: source.retrievedAt
});

const sourceVersionFor = (
  countryPack: Nis2CountryPackDefinition,
  onboardingPack = findNis2OnboardingCountryPack(countryPack.countryCode)
): string =>
  `${NIS2_COUNTRY_ONBOARDING_SCHEMA_VERSION}; ${countryPack.countryCode} country pack ${countryPack.packVersion}; ${onboardingPack.sourceReviewStatus}`;

const statusFromDeclaredAnswer = (answers: readonly (string | undefined)[]): ComplianceControlResult["status"] => {
  const normalized = answers.join(" ").toLowerCase();
  if (/(implemented|yes|enabled|active|documented|tested)/.test(normalized)) {
    return "passing";
  }
  if (/(partial|planned|in progress|draft)/.test(normalized)) {
    return "partial";
  }

  return "needs_evidence";
};

const inferCompletedScreens = (
  answers: Record<string, unknown>,
  onboardingPack: Nis2CountryPackOnboardingContract
): string[] =>
  onboardingPack.onboardingScreens
    .filter((screen) => requiredFieldKeysForScreen(onboardingPack, screen.key).every((fieldPath) => hasRequiredValueAtPath(answers, fieldPath)))
    .map((screen) => screen.key);

const inferCurrentScreen = (
  answers: Record<string, unknown>,
  onboardingPack: Nis2CountryPackOnboardingContract
): string => {
  const nextScreen = onboardingPack.onboardingScreens.find((screen) =>
    requiredFieldKeysForScreen(onboardingPack, screen.key).some((fieldPath) => !hasRequiredValueAtPath(answers, fieldPath))
  );

  return nextScreen?.key ?? "review";
};

const missingRequiredFieldPaths = (
  answers: Record<string, unknown>,
  onboardingPack: Nis2CountryPackOnboardingContract
): string[] => requiredFieldKeysForPack(onboardingPack).filter((fieldPath) => !hasRequiredValueAtPath(answers, fieldPath));

const normalizeAnswers = (value: Record<string, unknown>): Record<string, unknown> =>
  isRecord(value) ? (JSON.parse(JSON.stringify(value)) as Record<string, unknown>) : {};

const normalizeGovernanceAnswerKeys = (answers: Record<string, unknown>): void => {
  const governance = answers.governance;
  if (!isRecord(governance) || !("accessControl" in governance)) {
    return;
  }
  if (governance.identityControls === undefined) {
    governance.identityControls = governance.accessControl;
  }
  delete governance.accessControl;
};

const normalizeCountrySpecificAnswerAliases = (answers: Record<string, unknown>, countryCode: string): void => {
  if (countryCode !== "RO") {
    return;
  }

  const selectedServices = stringsAtPath(answers, "selectedServiceTypeCodes");
  if (selectedServices.length > 0 && stringsAtPath(answers, "scope.activities").length === 0) {
    setPath(answers, "scope.activities", selectedServices);
  }

  const sizeCategory = stringAtPath(answers, "size.sizeCategory");
  if (sizeCategory && !stringAtPath(answers, "business.sizeCategory")) {
    setPath(answers, "business.sizeCategory", sizeCategory);
  }

  const publicIpRanges = stringsAtPath(answers, "systems.publicIpRanges");
  if (publicIpRanges.length > 0 && stringsAtPath(answers, "network.publicIpRanges").length === 0) {
    setPath(answers, "network.publicIpRanges", publicIpRanges);
  }
};

const normalizeCompletedScreens = (
  screens: string[] | undefined,
  onboardingPack: Nis2CountryPackOnboardingContract
): string[] | undefined => {
  if (!screens) {
    return undefined;
  }
  const validScreens = new Set(onboardingPack.onboardingScreens.map((screen) => screen.key));
  return screens.filter((screen) => validScreens.has(screen));
};

const normalizeCurrentScreen = (
  screen: string | undefined,
  onboardingPack: Nis2CountryPackOnboardingContract
): string | undefined => {
  const validScreens = new Set(onboardingPack.onboardingScreens.map((candidate) => candidate.key));
  return screen && validScreens.has(screen) ? screen : undefined;
};

const normalizeStatus = (status: string | undefined): string | undefined => {
  const validStatuses = new Set(["draft", "in_progress", "ready_for_classification", "classification_complete", "ready_for_report"]);
  return status && validStatuses.has(status) ? status : undefined;
};

const normalizeCountryCode = (countryCode: string): string => countryCode.trim().toUpperCase();

const hasRequiredValueAtPath = (value: Record<string, unknown>, fieldPath: string): boolean => {
  const found = getPath(value, fieldPath);
  if (fieldPath === "review.legalCaveatAcknowledged") {
    return found === true;
  }
  if (Array.isArray(found)) {
    return found.length > 0;
  }

  return found !== undefined && found !== null && found !== "";
};

const stringAtPath = (value: Record<string, unknown>, fieldPath: string): string | undefined => {
  const found = getPath(value, fieldPath);
  return typeof found === "string" && found.trim().length > 0 ? found.trim() : undefined;
};

const stringsAtPath = (value: Record<string, unknown>, fieldPath: string): string[] => {
  const found = getPath(value, fieldPath);
  if (Array.isArray(found)) {
    return found.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  }
  if (typeof found === "string" && found.trim().length > 0) {
    return found
      .split(/[\n,;]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const numberAtPath = (value: Record<string, unknown>, fieldPath: string): number | undefined => {
  const found = getPath(value, fieldPath);
  const numberValue = typeof found === "number" ? found : typeof found === "string" ? Number(found) : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const booleanAtPath = (value: Record<string, unknown>, fieldPath: string): boolean | undefined => {
  const found = getPath(value, fieldPath);
  if (typeof found === "boolean") {
    return found;
  }
  if (typeof found === "string") {
    const normalized = found.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes" || normalized === "da" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "no" || normalized === "nu" || normalized === "0") {
      return false;
    }
  }

  return undefined;
};

const roSizeCategoryAtPath = (value: Record<string, unknown>, fieldPath: string): RoNis2EntitySize | undefined => {
  const found = stringAtPath(value, fieldPath);
  const normalized = found?.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return undefined;
  if (["small_micro", "small", "micro", "mica si micro", "mică și micro"].includes(normalized)) return "small_micro";
  if (["medium", "mijlocie", "mediu"].includes(normalized)) return "medium";
  if (["large", "mare"].includes(normalized)) return "large";
  return undefined;
};

const roImpactAtPath = (
  value: Record<string, unknown>,
  fieldPath: string
): NonNullable<RoNis2Article9Input["publicSafetySecurityOrHealthImpact"]> | undefined => {
  const found = stringAtPath(value, fieldPath);
  const normalized = found?.toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") return normalized;
  if (normalized === "mediu") return "medium";
  if (normalized === "ridicat") return "high";
  return undefined;
};

const getPath = (value: Record<string, unknown>, fieldPath: string): unknown =>
  fieldPath.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, value);

const setPath = (value: Record<string, unknown>, fieldPath: string, nextValue: unknown): void => {
  const parts = fieldPath.split(".");
  let current = value;
  for (const part of parts.slice(0, -1)) {
    if (!isRecord(current[part])) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1] ?? fieldPath] = nextValue;
};

const deepMerge = (left: Record<string, unknown>, right: Record<string, unknown>): Record<string, unknown> => {
  const output = JSON.parse(JSON.stringify(left)) as Record<string, unknown>;
  for (const [key, value] of Object.entries(right)) {
    if (isRecord(value) && isRecord(output[key])) {
      output[key] = deepMerge(output[key] as Record<string, unknown>, value);
    } else {
      output[key] = value;
    }
  }

  return output;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
