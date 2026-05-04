import {
  buildRoNis2NotificationDraft,
  buildRoNis2OnboardingProgress,
  classifyRoNis2Entity,
  roNis2OnboardingSchema,
  toRoNis2NotificationDraftEnvelope,
  type Nis2Classification,
  type RoNis2ClassificationInput,
  type RoNis2OnboardingAnswers
} from "@puresoc/country-pack-ro";
import { AuthError } from "@puresoc/auth-core";
import type { RoNis2ClassificationRunRecord } from "@puresoc/database";
import type { ApiServices } from "../../../auth/services";
import type { JsonResult } from "../../../http";
import { parseCookies, sessionCookieName, type RequestContext } from "../../../http";
import { requireOrganizationRole } from "../../../rbac";

export const roNis2ClassificationRoute = async (body: Record<string, unknown>): Promise<JsonResult> => ({
  statusCode: 200,
  body: {
    classification: classifyRoNis2Entity(body as RoNis2ClassificationInput)
  }
});

export const roNis2OnboardingSchemaRoute = async (): Promise<JsonResult> => ({
  statusCode: 200,
  body: {
    jurisdiction: "RO",
    frameworkKey: "nis2",
    schema: roNis2OnboardingSchema
  }
});

export const roNis2OnboardingProgressRoute = async (body: Record<string, unknown>): Promise<JsonResult> => ({
  statusCode: 200,
  body: {
    progress: buildRoNis2OnboardingProgress({
      answers: (body.answers ?? {}) as RoNis2OnboardingAnswers,
      completedSteps: Array.isArray(body.completedSteps) ? (body.completedSteps as never[]) : undefined,
      currentStep: typeof body.currentStep === "string" ? (body.currentStep as never) : undefined,
      savedAt: typeof body.savedAt === "string" ? body.savedAt : undefined,
      status: typeof body.status === "string" ? (body.status as never) : undefined
    })
  }
});

export const roNis2NotificationDraftRoute = async (body: Record<string, unknown>): Promise<JsonResult> => {
  const draft = buildRoNis2NotificationDraft({
      answers: (body.answers ?? {}) as RoNis2OnboardingAnswers,
      classification: body.classification as Nis2Classification,
      generatedAt: typeof body.generatedAt === "string" ? body.generatedAt : undefined,
      locale: typeof body.locale === "string" ? body.locale : undefined
  });

  return {
    statusCode: 200,
    body: {
      draft,
      notificationDraftEnvelope: toRoNis2NotificationDraftEnvelope(draft)
    }
  }
};

export const getOrganizationRoNis2OnboardingRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });

  const state = await services.roNis2Readiness.getReadinessState(organizationId);
  const notificationDrafts = await services.notificationDrafts.listNotificationDrafts({
    organizationId,
    jurisdiction: "RO"
  });

  return {
    statusCode: 200,
    body: {
      ...state,
      notificationDrafts,
      latestNotificationDraft: notificationDrafts[0] ?? null,
      legalActivation: {
        status: "review_required",
        productionActivated: false,
        reason: "Romania workbook-derived logic remains gated by regulatory source review and product/legal approval."
      }
    }
  };
};

export const saveOrganizationRoNis2OnboardingRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager"]
  });

  const progress = await services.roNis2Readiness.saveOnboardingProgress({
    actorUserId,
    organizationId,
    onboardingProgressId: optionalString(body.onboardingProgressId),
    assessmentId: optionalString(body.assessmentId),
    answers: optionalRecord(body.answers) ?? {},
    completedSteps: optionalStringArray(body.completedSteps),
    currentStep: optionalString(body.currentStep),
    status: optionalString(body.status)
  });

  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "ro_nis2_onboarding_progress",
    targetId: progress.id,
    action: "ro_nis2.onboarding.saved",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      completedStepCount: progress.completedSteps.length,
      currentStep: progress.currentStep,
      missingRequiredFieldCount: progress.missingRequiredFields.length,
      sourceVersion: progress.sourceVersion,
      status: progress.status
    }
  });

  return {
    statusCode: 200,
    body: {
      progress
    }
  };
};

export const classifyOrganizationRoNis2OnboardingRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });

  const result = await services.roNis2Readiness.classifyLatestOnboarding({
    actorUserId,
    organizationId
  });

  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "ro_nis2_classification_run",
    targetId: result.classificationRun.id,
    action: "ro_nis2.classification.created",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      article9Required: result.classification.article9Required,
      missingRequiredFieldCount: result.classification.missingRequiredFields.length,
      notificationRecommended: result.classification.notificationRecommended,
      result: result.classification.result,
      sourceVersion: result.classification.sourceVersion
    }
  });

  return {
    statusCode: 201,
    body: result
  };
};

export const createOrganizationRoNis2NotificationDraftFromOnboardingRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager"]
  });

  const progress = await services.roNis2Readiness.requireLatestProgress(organizationId);
  const latestClassification =
    (await services.roNis2Readiness.getLatestClassificationForProgress(organizationId, progress.id)) ??
    (await services.roNis2Readiness.classifyLatestOnboarding({
      actorUserId,
      organizationId
    })).classificationRun;
  const classification = classificationFromRun(latestClassification);
  const locale = optionalString(body.locale);
  const draft = buildRoNis2NotificationDraft({
    answers: progress.answers as RoNis2OnboardingAnswers,
    classification,
    locale,
    status: "ready_for_review"
  });
  const envelope = toRoNis2NotificationDraftEnvelope(draft);
  const created = await services.notificationDrafts.createNotificationDraft({
    actorUserId,
    organizationId,
    assessmentId: progress.assessmentId,
    status: draft.status,
    payload: envelope,
    sourceReferences: draft.sourceMapLinks.map((link) => link.sourceMapId),
    metadata: {
      roNis2: {
        classificationRunId: latestClassification.id,
        onboardingProgressId: progress.id
      }
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return {
    statusCode: 201,
    body: {
      draft,
      notificationDraftEnvelope: envelope,
      ...created
    }
  };
};

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

const classificationFromRun = (run: RoNis2ClassificationRunRecord): Nis2Classification => ({
  article9Required: run.article9Required,
  jurisdiction: "RO",
  matchedRules: run.matchedRules,
  missingRequiredFields: run.missingRequiredFields,
  notificationRecommended: run.notificationRecommended,
  reasonSourceMapLinks: run.reasonSourceMapLinks as never,
  reasons: run.reasons,
  result: run.result as Nis2Classification["result"],
  sourceMapLinks: run.sourceMapLinks as never,
  sourceVersion: run.sourceVersion
});

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const optionalStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new AuthError("invalid_request", "Expected a string array.", 400);
  }

  return value;
};

const optionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AuthError("invalid_request", "Expected an object.", 400);
  }

  return value as Record<string, unknown>;
};
