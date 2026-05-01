import { randomUUID } from "node:crypto";

import { RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY } from "@puresoc/country-pack-ro";
import type { NotificationDraftCompanionBuilder } from "../notification-drafts/service";

export const createRoNis2NotificationDraftCompanionBuilder = (): NotificationDraftCompanionBuilder => ({
  build(input) {
    if (
      input.payload.frameworkKey !== "nis2" ||
      input.payload.jurisdiction !== "RO" ||
      input.payload.notificationType !== "country_registration" ||
      input.payload.payloadSchemaKey !== RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY
    ) {
      return null;
    }

    const metadata = isRecord(input.metadata.roNis2) ? input.metadata.roNis2 : input.metadata;

    return {
      id: randomUUID(),
      organizationId: input.notificationDraft.organizationId,
      assessmentId: input.notificationDraft.assessmentId,
      onboardingProgressId: optionalString(metadata.onboardingProgressId),
      classificationRunId: optionalString(metadata.classificationRunId),
      notificationDraftId: input.notificationDraft.id,
      status: input.notificationDraft.status,
      payload: input.payload,
      sourceReferences: input.sourceReferences,
      legalCaveat: input.payload.legalCaveat,
      createdBy: input.actorUserId,
      createdAt: input.nowIso,
      updatedAt: input.nowIso
    };
  }
});

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
