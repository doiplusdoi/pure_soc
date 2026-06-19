import { randomUUID } from "node:crypto";

import { AuthError } from "@puresoc/auth-core";
import type { ComplianceControlResult, ComplianceGap, ReadinessPlan, SourceReference } from "@puresoc/compliance-core";
import {
  classifyWithNis2CountryPack,
  demoCountryPackDefinitions,
  type Nis2CountryPackClassificationInput,
  type Nis2CountryPackDefinition,
  type Nis2CountryPackStructuredClassification,
  type Nis2OfficialSourceReference
} from "@puresoc/country-packs-core";
import { romaniaNis2CountryPackDefinition } from "@puresoc/country-pack-ro";
import type {
  Nis2ClassificationRunRecord,
  Nis2OnboardingProgressRecord,
  Nis2OnboardingRepository,
  OutputRecordRepository
} from "@puresoc/database";
import { generateRecommendationSnapshot } from "@puresoc/recommendations";
import type { InternalReadinessReportVersionContext } from "../../reports/service";

export const NIS2_COUNTRY_ONBOARDING_SCHEMA_VERSION = "puresoc.nis2.country_onboarding.v1";

export interface Nis2OnboardingScreenDefinition {
  key: string;
  label: string;
  summary: string;
  requiredFieldPaths: readonly string[];
}

export const nis2CountryOnboardingScreens: readonly Nis2OnboardingScreenDefinition[] = [
  {
    key: "company_contacts",
    label: "Company and contacts",
    summary: "Legal identity, primary contact, and security owner.",
    requiredFieldPaths: [
      "company.legalName",
      "company.countryCode",
      "contacts.primaryName",
      "contacts.primaryEmail",
      "contacts.securityName",
      "contacts.securityEmail"
    ]
  },
  {
    key: "business_profile",
    label: "Business profile",
    summary: "Sector, services, countries served, and approximate size.",
    requiredFieldPaths: [
      "business.sector",
      "business.mainProductsServices",
      "business.countriesServed",
      "business.employeeCount"
    ]
  },
  {
    key: "nis2_scope",
    label: "NIS2 scope",
    summary: "Country-pack scope signals and preliminary applicability.",
    requiredFieldPaths: ["scope.activities", "scope.publicAdministration", "scope.telecomProvider"]
  },
  {
    key: "operational_dependencies",
    label: "Operational dependencies",
    summary: "Microsoft 365, cloud, suppliers, continuity, and incident handling context.",
    requiredFieldPaths: [
      "dependencies.microsoft365Usage",
      "dependencies.criticalSuppliers",
      "dependencies.backupArrangements",
      "dependencies.businessContinuity",
      "dependencies.incidentResponse"
    ]
  },
  {
    key: "governance_controls",
    label: "Governance and controls",
    summary: "Plain-language Article 21 control coverage.",
    requiredFieldPaths: [
      "governance.riskManagement",
      "governance.identityControls",
      "governance.mfa",
      "governance.supplyChainSecurity"
    ]
  },
  {
    key: "review_generate",
    label: "Review and assessment",
    summary: "Assumptions, source caveat, and report trigger.",
    requiredFieldPaths: ["review.legalCaveatAcknowledged"]
  }
];

export const nis2CountryPackDefinitions = [
  ...demoCountryPackDefinitions,
  romaniaNis2CountryPackDefinition
] satisfies readonly Nis2CountryPackDefinition[];

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
    const completedScreens = normalizeCompletedScreens(input.completedScreens) ?? inferCompletedScreens(answers);
    const missingRequiredFields = missingRequiredFieldPaths(answers);
    const currentScreen = normalizeCurrentScreen(input.currentScreen) ?? inferCurrentScreen(answers);

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
      sourceVersion: sourceVersionFor(countryPack),
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
    classification: Nis2CountryPackStructuredClassification;
    classificationRun: Nis2ClassificationRunRecord;
    progress: Nis2OnboardingProgressRecord;
  }> {
    const countryPack = findNis2CountryPackDefinition(input.countryCode);
    const progress = await this.requireLatestProgress({
      countryCode: countryPack.countryCode,
      organizationId: input.organizationId
    });
    const classificationInput = classificationInputFromAnswers(progress.answers);
    const classification = classifyWithNis2CountryPack(countryPack, classificationInput);
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
      sourceVersion: sourceVersionFor(countryPack),
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
      catalogVersion: sourceVersionFor(countryPack),
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

const classificationInputFromAnswers = (answers: Record<string, unknown>): Nis2CountryPackClassificationInput => ({
  employeeCount: numberAtPath(answers, "business.employeeCount"),
  publicAdministration: booleanAtPath(answers, "scope.publicAdministration"),
  sector: stringAtPath(answers, "business.sector") ?? stringAtPath(answers, "scope.sector"),
  services: stringsAtPath(answers, "scope.activities"),
  telecomProvider: booleanAtPath(answers, "scope.telecomProvider")
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

const sourceVersionFor = (countryPack: Nis2CountryPackDefinition): string =>
  `${NIS2_COUNTRY_ONBOARDING_SCHEMA_VERSION}; ${countryPack.countryCode} country pack ${countryPack.packVersion}`;

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

const inferCompletedScreens = (answers: Record<string, unknown>): string[] =>
  nis2CountryOnboardingScreens
    .filter((screen) => screen.requiredFieldPaths.every((fieldPath) => hasRequiredValueAtPath(answers, fieldPath)))
    .map((screen) => screen.key);

const inferCurrentScreen = (answers: Record<string, unknown>): string => {
  const nextScreen = nis2CountryOnboardingScreens.find((screen) =>
    screen.requiredFieldPaths.some((fieldPath) => !hasRequiredValueAtPath(answers, fieldPath))
  );

  return nextScreen?.key ?? "review_generate";
};

const missingRequiredFieldPaths = (answers: Record<string, unknown>): string[] =>
  nis2CountryOnboardingScreens.flatMap((screen) =>
    screen.requiredFieldPaths.filter((fieldPath) => !hasRequiredValueAtPath(answers, fieldPath))
  );

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

const normalizeCompletedScreens = (screens: string[] | undefined): string[] | undefined => {
  if (!screens) {
    return undefined;
  }
  const validScreens = new Set(nis2CountryOnboardingScreens.map((screen) => screen.key));
  return screens.filter((screen) => validScreens.has(screen));
};

const normalizeCurrentScreen = (screen: string | undefined): string | undefined => {
  const validScreens = new Set(nis2CountryOnboardingScreens.map((candidate) => candidate.key));
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
    if (found === "true" || found === "yes") {
      return true;
    }
    if (found === "false" || found === "no") {
      return false;
    }
  }

  return undefined;
};

const getPath = (value: Record<string, unknown>, fieldPath: string): unknown =>
  fieldPath.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, value);

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
