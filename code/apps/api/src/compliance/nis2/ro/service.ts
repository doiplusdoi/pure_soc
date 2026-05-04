import { randomUUID } from "node:crypto";

import { AuthError } from "@puresoc/auth-core";
import {
  RO_NIS2_SOURCE_VERSION,
  buildRoNis2OnboardingProgress,
  classifyRoNis2Entity,
  roNis2OnboardingSchema,
  toRoNis2ClassificationInput,
  type Nis2Classification,
  type RoNis2OnboardingAnswers,
  type RoNis2OnboardingProgress,
  type RoNis2OnboardingStatus,
  type RoNis2OnboardingStepKey
} from "@puresoc/country-pack-ro";
import type {
  RoNis2ClassificationRunRecord,
  RoNis2OnboardingProgressRecord,
  RoNis2ReadinessRepository
} from "@puresoc/database";

export interface RoNis2ReadinessApiServiceOptions {
  now?: () => Date;
  repository: RoNis2ReadinessRepository;
}

export interface SaveRoNis2OnboardingProgressInput {
  actorUserId: string;
  answers: Record<string, unknown>;
  assessmentId?: string;
  completedSteps?: string[];
  currentStep?: string;
  onboardingProgressId?: string;
  organizationId: string;
  status?: string;
}

export interface RoNis2ReadinessState {
  classificationRun: RoNis2ClassificationRunRecord | null;
  progress: RoNis2OnboardingProgressRecord | null;
}

const onboardingStepKeys = new Set(roNis2OnboardingSchema.map((step) => step.key));
const onboardingStatuses = new Set<RoNis2OnboardingStatus>([
  "draft",
  "in_progress",
  "ready_for_classification",
  "classification_complete",
  "ready_for_notification_export"
]);

export class RoNis2ReadinessApiService {
  private readonly now: () => Date;
  private readonly repository: RoNis2ReadinessRepository;

  constructor(options: RoNis2ReadinessApiServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.repository = options.repository;
  }

  async getReadinessState(organizationId: string): Promise<RoNis2ReadinessState> {
    const progress = await this.repository.findLatestOnboardingProgressForOrganization(organizationId);
    const classificationRun = progress
      ? await this.repository.findLatestClassificationRunForOrganization({
          organizationId,
          onboardingProgressId: progress.id
        })
      : null;

    return {
      classificationRun,
      progress
    };
  }

  async saveOnboardingProgress(
    input: SaveRoNis2OnboardingProgressInput
  ): Promise<RoNis2OnboardingProgressRecord> {
    const existing = input.onboardingProgressId
      ? await this.repository.findOnboardingProgressForOrganization({
          organizationId: input.organizationId,
          onboardingProgressId: input.onboardingProgressId
        })
      : await this.repository.findLatestOnboardingProgressForOrganization(input.organizationId);
    const nowIso = this.now().toISOString();
    const answers = normalizeAnswers(input.answers);
    const progress = buildRoNis2OnboardingProgress({
      answers,
      completedSteps: normalizeCompletedSteps(input.completedSteps) ?? inferCompletedSteps(answers),
      currentStep: normalizeCurrentStep(input.currentStep) ?? inferCurrentStep(answers),
      savedAt: nowIso,
      status: normalizeStatus(input.status) ?? inferStatus(answers)
    });

    return this.repository.saveOnboardingProgress({
      id: existing?.id ?? randomUUID(),
      organizationId: input.organizationId,
      assessmentId: input.assessmentId ?? existing?.assessmentId ?? randomUUID(),
      businessProfileId: existing?.businessProfileId,
      answers: progress.answers as Record<string, unknown>,
      completedSteps: progress.completedSteps,
      currentStep: progress.currentStep,
      frameworkKey: progress.frameworkKey,
      jurisdiction: progress.jurisdiction,
      missingRequiredFields: progress.missingRequiredFields,
      savedAt: progress.savedAt,
      savedBy: input.actorUserId,
      sourceMapLinks: progress.sourceMapLinks as unknown as Record<string, unknown>[],
      sourceVersion: progress.sourceVersion,
      status: progress.status,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso
    });
  }

  async classifyLatestOnboarding(input: {
    actorUserId: string;
    organizationId: string;
  }): Promise<{
    classification: Nis2Classification;
    classificationRun: RoNis2ClassificationRunRecord;
    progress: RoNis2OnboardingProgressRecord;
  }> {
    const progress = await this.requireLatestProgress(input.organizationId);
    const classificationInput = toRoNis2ClassificationInput(progress.answers as RoNis2OnboardingAnswers);
    const classification = classifyRoNis2Entity(classificationInput);
    const nowIso = this.now().toISOString();
    const classificationRun = await this.repository.saveClassificationRun({
      id: randomUUID(),
      organizationId: input.organizationId,
      assessmentId: progress.assessmentId,
      onboardingProgressId: progress.id,
      input: classificationInput as Record<string, unknown>,
      result: classification.result,
      article9Required: classification.article9Required,
      notificationRecommended: classification.notificationRecommended,
      reasons: classification.reasons,
      matchedRules: classification.matchedRules,
      missingRequiredFields: classification.missingRequiredFields,
      reasonSourceMapLinks: classification.reasonSourceMapLinks as unknown as Record<string, unknown>[],
      sourceMapLinks: classification.sourceMapLinks as unknown as Record<string, unknown>[],
      sourceVersion: classification.sourceVersion,
      classifiedAt: nowIso
    });

    return {
      classification,
      classificationRun,
      progress
    };
  }

  async requireLatestProgress(organizationId: string): Promise<RoNis2OnboardingProgressRecord> {
    const progress = await this.repository.findLatestOnboardingProgressForOrganization(organizationId);
    if (!progress) {
      throw new AuthError("invalid_request", "Romania onboarding progress was not found for this organization.", 404);
    }

    return progress;
  }

  async getLatestClassificationForProgress(
    organizationId: string,
    onboardingProgressId: string
  ): Promise<RoNis2ClassificationRunRecord | null> {
    return this.repository.findLatestClassificationRunForOrganization({
      organizationId,
      onboardingProgressId
    });
  }
}

export const emptyRoNis2OnboardingProgress = (nowIso = new Date().toISOString()): RoNis2OnboardingProgress => ({
  answers: {},
  completedSteps: [],
  currentStep: "organization_identity",
  frameworkKey: "nis2",
  jurisdiction: "RO",
  missingRequiredFields: roNis2OnboardingSchema.flatMap((step) => step.requiredFieldPaths),
  savedAt: nowIso,
  sourceMapLinks: [],
  sourceVersion: RO_NIS2_SOURCE_VERSION,
  status: "draft"
});

const normalizeAnswers = (value: Record<string, unknown>): RoNis2OnboardingAnswers => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as RoNis2OnboardingAnswers;
};

const normalizeCompletedSteps = (steps: string[] | undefined): RoNis2OnboardingStepKey[] | undefined => {
  if (!steps) {
    return undefined;
  }

  return steps.filter((step): step is RoNis2OnboardingStepKey => onboardingStepKeys.has(step as RoNis2OnboardingStepKey));
};

const normalizeCurrentStep = (step: string | undefined): RoNis2OnboardingStepKey | undefined =>
  step && onboardingStepKeys.has(step as RoNis2OnboardingStepKey) ? (step as RoNis2OnboardingStepKey) : undefined;

const normalizeStatus = (status: string | undefined): RoNis2OnboardingStatus | undefined =>
  status && onboardingStatuses.has(status as RoNis2OnboardingStatus) ? (status as RoNis2OnboardingStatus) : undefined;

const inferCompletedSteps = (answers: RoNis2OnboardingAnswers): RoNis2OnboardingStepKey[] =>
  roNis2OnboardingSchema
    .filter(
      (step) =>
        step.requiredFieldPaths.length > 0 && step.requiredFieldPaths.every((fieldPath) => hasValueAtPath({ answers }, fieldPath))
    )
    .map((step) => step.key);

const inferCurrentStep = (answers: RoNis2OnboardingAnswers): RoNis2OnboardingStepKey => {
  const nextStep = roNis2OnboardingSchema.find((step) =>
    step.requiredFieldPaths.some((fieldPath) => !hasValueAtPath({ answers }, fieldPath))
  );

  return nextStep?.key ?? "preliminary_classification";
};

const inferStatus = (answers: RoNis2OnboardingAnswers): RoNis2OnboardingStatus => {
  const progress = buildRoNis2OnboardingProgress({
    answers,
    completedSteps: inferCompletedSteps(answers),
    currentStep: inferCurrentStep(answers),
    status: "in_progress"
  });

  return progress.missingRequiredFields.length === 0 ? "ready_for_classification" : "in_progress";
};

const hasValueAtPath = (value: unknown, fieldPath: string): boolean => {
  const found = fieldPath.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, value);

  if (Array.isArray(found)) {
    return found.length > 0;
  }

  return found !== undefined && found !== null && found !== "";
};
