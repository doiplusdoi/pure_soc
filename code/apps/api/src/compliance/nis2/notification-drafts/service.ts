import { randomUUID } from "node:crypto";

import { AuditWriter } from "@puresoc/audit";
import { AuthError } from "@puresoc/auth-core";
import {
  validateNotificationDraftPayloadEnvelopeContract,
  type NotificationDraftContract,
  type NotificationDraftPayloadEnvelopeContract,
  type NotificationDraftRepository,
  type RoNis2NotificationDraftContract
} from "@puresoc/database";
import type { RequestContext } from "../../../http";

export interface NotificationDraftCompanionBuilder {
  build(input: {
    actorUserId: string;
    metadata: Record<string, unknown>;
    notificationDraft: NotificationDraftContract;
    nowIso: string;
    payload: NotificationDraftPayloadEnvelopeContract;
    sourceReferences: string[];
  }): RoNis2NotificationDraftContract | null;
}

export interface NotificationDraftApiServiceOptions {
  auditWriter: AuditWriter;
  companionBuilders?: NotificationDraftCompanionBuilder[];
  now?: () => Date;
  repository: NotificationDraftRepository;
}

export interface CreateNotificationDraftInput extends RequestContext {
  actorUserId: string;
  assessmentId?: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  payload: unknown;
  sourceReferences?: string[];
  status?: NotificationDraftContract["status"];
}

export class NotificationDraftApiService {
  constructor(private readonly options: NotificationDraftApiServiceOptions) {}

  async createNotificationDraft(input: CreateNotificationDraftInput): Promise<{
    notificationDraft: NotificationDraftContract;
    roNis2CompanionDraft?: RoNis2NotificationDraftContract;
  }> {
    const payload = parseNotificationDraftPayload(input.payload);
    const nowIso = (this.options.now?.() ?? new Date()).toISOString();
    const sourceReferences =
      input.sourceReferences && input.sourceReferences.length > 0
        ? uniqueStrings(input.sourceReferences)
        : sourceReferenceKeys(payload.sourceReferences);
    const notificationDraft: NotificationDraftContract = {
      id: randomUUID(),
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      jurisdiction: payload.jurisdiction,
      notificationType: payload.notificationType as NotificationDraftContract["notificationType"],
      status: input.status ?? "draft",
      payload,
      sourceReferences,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const savedNotificationDraft = await this.options.repository.saveNotificationDraft(notificationDraft);
    const roNis2CompanionDraft = await this.createCompanionDraft({
      actorUserId: input.actorUserId,
      metadata: input.metadata ?? {},
      notificationDraft: savedNotificationDraft,
      nowIso,
      payload,
      sourceReferences
    });

    await this.options.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "notification_draft",
      targetId: savedNotificationDraft.id,
      action: "notification_draft.created",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        companionType: roNis2CompanionDraft ? "ro_nis2" : null,
        jurisdiction: savedNotificationDraft.jurisdiction,
        notificationType: savedNotificationDraft.notificationType,
        payloadSchemaKey: savedNotificationDraft.payload.payloadSchemaKey,
        status: savedNotificationDraft.status
      }
    });

    return stripUndefined({
      notificationDraft: savedNotificationDraft,
      roNis2CompanionDraft
    });
  }

  async getNotificationDraft(input: {
    notificationDraftId: string;
    organizationId: string;
  }): Promise<{
    notificationDraft: NotificationDraftContract;
    roNis2CompanionDraft?: RoNis2NotificationDraftContract;
  }> {
    const notificationDraft = await this.options.repository.findNotificationDraftForOrganization(input);
    if (!notificationDraft) {
      throw new AuthError("invalid_request", "Notification draft was not found for this organization.", 404);
    }

    const roNis2CompanionDraft =
      await this.options.repository.findRoNis2CompanionDraftByNotificationDraftForOrganization(input);

    return stripUndefined({
      notificationDraft,
      roNis2CompanionDraft: roNis2CompanionDraft ?? undefined
    });
  }

  async listNotificationDrafts(input: {
    jurisdiction?: string;
    organizationId: string;
    status?: NotificationDraftContract["status"];
  }): Promise<NotificationDraftContract[]> {
    return this.options.repository.listNotificationDraftsForOrganization(input);
  }

  private async createCompanionDraft(input: {
    actorUserId: string;
    metadata: Record<string, unknown>;
    notificationDraft: NotificationDraftContract;
    nowIso: string;
    payload: NotificationDraftPayloadEnvelopeContract;
    sourceReferences: string[];
  }): Promise<RoNis2NotificationDraftContract | undefined> {
    for (const builder of this.options.companionBuilders ?? []) {
      const companionDraft = builder.build(input);
      if (companionDraft) {
        return this.options.repository.saveRoNis2CompanionDraft(companionDraft);
      }
    }

    return undefined;
  }
}

export const parseNotificationDraftPayload = (payload: unknown): NotificationDraftPayloadEnvelopeContract => {
  const validation = validateNotificationDraftPayloadEnvelopeContract(payload);
  if (!validation.valid || !validation.payload) {
    throw new AuthError("invalid_request", `Invalid notification draft payload: ${validation.issues.join("; ")}`, 400);
  }

  return validation.payload;
};

const sourceReferenceKeys = (sourceReferences: Record<string, unknown>[]): string[] =>
  uniqueStrings(
    sourceReferences
      .map((reference) => {
        if (typeof reference.sourceRecordId === "string" && reference.sourceRecordId.length > 0) {
          return reference.sourceRecordId;
        }
        if (typeof reference.sheet === "string" && typeof reference.cell === "string") {
          return `${reference.sheet}!${reference.cell}`;
        }
        if (typeof reference.workbookRange === "string" && reference.workbookRange.length > 0) {
          return reference.workbookRange;
        }
        return JSON.stringify(reference);
      })
      .filter((value): value is string => value.length > 0)
  );

const uniqueStrings = (values: readonly string[]): string[] => [...new Set(values.filter((value) => value.length > 0))];

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
