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
import type { JsonResult } from "../../../http";

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
