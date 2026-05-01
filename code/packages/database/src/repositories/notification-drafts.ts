import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  isPureSocLocale,
  resolveLegalCaveatMessage
} from "@puresoc/shared";

import type {
  NotificationDraftContract,
  NotificationDraftPayloadEnvelopeContract,
  RoNis2NotificationDraftContract
} from "../contracts/outputs";

type DelegateArgs = Record<string, unknown>;

interface NotificationDraftDelegate<TRow> {
  findFirst(args: DelegateArgs): Promise<TRow | null>;
  findMany(args?: DelegateArgs): Promise<TRow[]>;
  upsert(args: DelegateArgs): Promise<TRow>;
}

type NotificationDraftRow = Omit<
  NotificationDraftContract,
  "assessmentId" | "createdAt" | "payload" | "sourceReferences" | "updatedAt"
> & {
  assessmentId?: string | null;
  createdAt: Date | string;
  payloadJson: unknown;
  sourceReferencesJson?: unknown;
  updatedAt: Date | string;
};

type RoNis2NotificationDraftRow = Omit<
  RoNis2NotificationDraftContract,
  | "assessmentId"
  | "classificationRunId"
  | "createdAt"
  | "createdBy"
  | "notificationDraftId"
  | "onboardingProgressId"
  | "payload"
  | "sourceReferences"
  | "updatedAt"
> & {
  assessmentId?: string | null;
  classificationRunId?: string | null;
  createdAt: Date | string;
  createdBy?: string | null;
  notificationDraftId?: string | null;
  onboardingProgressId?: string | null;
  payloadJson: unknown;
  sourceReferencesJson?: unknown;
  updatedAt: Date | string;
};

export interface NotificationDraftRepository {
  findNotificationDraftForOrganization(input: {
    notificationDraftId: string;
    organizationId: string;
  }): Promise<NotificationDraftContract | null>;
  findRoNis2CompanionDraftByNotificationDraftForOrganization(input: {
    notificationDraftId: string;
    organizationId: string;
  }): Promise<RoNis2NotificationDraftContract | null>;
  findRoNis2CompanionDraftForOrganization(input: {
    organizationId: string;
    roDraftId: string;
  }): Promise<RoNis2NotificationDraftContract | null>;
  listNotificationDraftsForOrganization(input: {
    jurisdiction?: string;
    organizationId: string;
    status?: NotificationDraftContract["status"];
  }): Promise<NotificationDraftContract[]>;
  saveNotificationDraft(record: NotificationDraftContract): Promise<NotificationDraftContract>;
  saveRoNis2CompanionDraft(record: RoNis2NotificationDraftContract): Promise<RoNis2NotificationDraftContract>;
}

export interface PrismaNotificationDraftClient {
  notificationDraft: NotificationDraftDelegate<NotificationDraftRow>;
  roNis2NotificationDraft: NotificationDraftDelegate<RoNis2NotificationDraftRow>;
}

export interface NotificationDraftEnvelopeContractValidationResult {
  issues: string[];
  payload?: NotificationDraftPayloadEnvelopeContract;
  valid: boolean;
}

export class PrismaNotificationDraftRepository implements NotificationDraftRepository {
  constructor(private readonly client: PrismaNotificationDraftClient) {}

  async saveNotificationDraft(record: NotificationDraftContract): Promise<NotificationDraftContract> {
    const payload = assertNotificationDraftEnvelopeContract(record.payload);
    const row = await this.client.notificationDraft.upsert({
      where: {
        id: record.id
      },
      update: toNotificationDraftData(record, payload),
      create: toNotificationDraftData(record, payload)
    });

    return fromNotificationDraftRow(row);
  }

  async findNotificationDraftForOrganization(input: {
    notificationDraftId: string;
    organizationId: string;
  }): Promise<NotificationDraftContract | null> {
    const row = await this.client.notificationDraft.findFirst({
      where: {
        id: input.notificationDraftId,
        organizationId: input.organizationId
      }
    });

    return row ? fromNotificationDraftRow(row) : null;
  }

  async listNotificationDraftsForOrganization(input: {
    jurisdiction?: string;
    organizationId: string;
    status?: NotificationDraftContract["status"];
  }): Promise<NotificationDraftContract[]> {
    const rows = await this.client.notificationDraft.findMany({
      where: stripUndefined({
        jurisdiction: input.jurisdiction,
        organizationId: input.organizationId,
        status: input.status
      }),
      orderBy: {
        updatedAt: "desc"
      }
    });

    return rows.map(fromNotificationDraftRow);
  }

  async saveRoNis2CompanionDraft(record: RoNis2NotificationDraftContract): Promise<RoNis2NotificationDraftContract> {
    const payload = assertNotificationDraftEnvelopeContract(record.payload);
    const row = await this.client.roNis2NotificationDraft.upsert({
      where: {
        id: record.id
      },
      update: toRoNis2CompanionDraftData(record, payload),
      create: toRoNis2CompanionDraftData(record, payload)
    });

    return fromRoNis2NotificationDraftRow(row);
  }

  async findRoNis2CompanionDraftForOrganization(input: {
    organizationId: string;
    roDraftId: string;
  }): Promise<RoNis2NotificationDraftContract | null> {
    const row = await this.client.roNis2NotificationDraft.findFirst({
      where: {
        id: input.roDraftId,
        organizationId: input.organizationId
      }
    });

    return row ? fromRoNis2NotificationDraftRow(row) : null;
  }

  async findRoNis2CompanionDraftByNotificationDraftForOrganization(input: {
    notificationDraftId: string;
    organizationId: string;
  }): Promise<RoNis2NotificationDraftContract | null> {
    const row = await this.client.roNis2NotificationDraft.findFirst({
      where: {
        notificationDraftId: input.notificationDraftId,
        organizationId: input.organizationId
      }
    });

    return row ? fromRoNis2NotificationDraftRow(row) : null;
  }
}

export class InMemoryNotificationDraftRepository implements NotificationDraftRepository {
  private readonly notificationDrafts = new Map<string, NotificationDraftContract>();
  private readonly roNis2CompanionDrafts = new Map<string, RoNis2NotificationDraftContract>();

  async saveNotificationDraft(record: NotificationDraftContract): Promise<NotificationDraftContract> {
    const payload = assertNotificationDraftEnvelopeContract(record.payload);
    const saved = cloneNotificationDraft({
      ...record,
      payload
    });
    this.notificationDrafts.set(saved.id, saved);
    return cloneNotificationDraft(saved);
  }

  async findNotificationDraftForOrganization(input: {
    notificationDraftId: string;
    organizationId: string;
  }): Promise<NotificationDraftContract | null> {
    const record = this.notificationDrafts.get(input.notificationDraftId);
    return record && record.organizationId === input.organizationId ? cloneNotificationDraft(record) : null;
  }

  async listNotificationDraftsForOrganization(input: {
    jurisdiction?: string;
    organizationId: string;
    status?: NotificationDraftContract["status"];
  }): Promise<NotificationDraftContract[]> {
    return [...this.notificationDrafts.values()]
      .filter(
        (record) =>
          record.organizationId === input.organizationId &&
          (input.jurisdiction === undefined || record.jurisdiction === input.jurisdiction) &&
          (input.status === undefined || record.status === input.status)
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(cloneNotificationDraft);
  }

  async saveRoNis2CompanionDraft(record: RoNis2NotificationDraftContract): Promise<RoNis2NotificationDraftContract> {
    const payload = assertNotificationDraftEnvelopeContract(record.payload);
    const saved = cloneRoNis2CompanionDraft({
      ...record,
      payload
    });
    this.roNis2CompanionDrafts.set(saved.id, saved);
    return cloneRoNis2CompanionDraft(saved);
  }

  async findRoNis2CompanionDraftForOrganization(input: {
    organizationId: string;
    roDraftId: string;
  }): Promise<RoNis2NotificationDraftContract | null> {
    const record = this.roNis2CompanionDrafts.get(input.roDraftId);
    return record && record.organizationId === input.organizationId ? cloneRoNis2CompanionDraft(record) : null;
  }

  async findRoNis2CompanionDraftByNotificationDraftForOrganization(input: {
    notificationDraftId: string;
    organizationId: string;
  }): Promise<RoNis2NotificationDraftContract | null> {
    const record =
      [...this.roNis2CompanionDrafts.values()].find(
        (candidate) =>
          candidate.organizationId === input.organizationId && candidate.notificationDraftId === input.notificationDraftId
      ) ?? null;
    return record ? cloneRoNis2CompanionDraft(record) : null;
  }
}

export const validateNotificationDraftPayloadEnvelopeContract = (
  payload: unknown
): NotificationDraftEnvelopeContractValidationResult => {
  const issues: string[] = [];
  if (!isRecord(payload)) {
    return {
      issues: ["payloadJson must be an object envelope."],
      valid: false
    };
  }

  const frameworkKey = requiredString(payload, "frameworkKey", issues);
  if (frameworkKey && frameworkKey !== "nis2") {
    issues.push("frameworkKey must be nis2.");
  }

  requiredString(payload, "jurisdiction", issues);
  const notificationType = requiredString(payload, "notificationType", issues);
  if (notificationType && !["country_registration", "incident_reporting", "readiness_update"].includes(notificationType)) {
    issues.push("notificationType is not supported by the generic notification draft contract.");
  }

  const payloadSchemaKey = requiredString(payload, "payloadSchemaKey", issues);
  if (payloadSchemaKey && !/^[a-z]{2}\.nis2\.[a-z0-9]+(?:_[a-z0-9]+)*\.v[1-9][0-9]*$/.test(payloadSchemaKey)) {
    issues.push("payloadSchemaKey must follow {country}.nis2.{notification_kind}.v{major}.");
  }

  const payloadSchemaVersion = requiredString(payload, "payloadSchemaVersion", issues);
  if (payloadSchemaVersion && !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(payloadSchemaVersion)) {
    issues.push("payloadSchemaVersion must be a semantic version string.");
  }

  const locale = requiredString(payload, "locale", issues);
  const legalCaveatLocale = requiredString(payload, "legalCaveatLocale", issues);
  const legalCaveat = requiredString(payload, "legalCaveat", issues);
  const legalCaveatMessageKey = requiredString(payload, "legalCaveatMessageKey", issues);

  if (locale && !isPureSocLocale(locale)) {
    issues.push("locale must be a supported PureSOC locale.");
  }
  if (legalCaveatLocale && !isPureSocLocale(legalCaveatLocale)) {
    issues.push("legalCaveatLocale must be a supported PureSOC locale.");
  }
  if (legalCaveatMessageKey && legalCaveatMessageKey !== LEGAL_CAVEAT_MESSAGE_KEY) {
    issues.push(`legalCaveatMessageKey must be ${LEGAL_CAVEAT_MESSAGE_KEY}.`);
  }
  if (typeof payload.legalCaveatFallbackUsed !== "boolean") {
    issues.push("legalCaveatFallbackUsed must be a boolean.");
  }
  if (locale && isPureSocLocale(locale) && legalCaveat && legalCaveatLocale) {
    const expectedCaveat = resolveLegalCaveatMessage(locale);
    if (legalCaveat !== expectedCaveat.text) {
      issues.push("legalCaveat must match the keyed PureSOC legal caveat text.");
    }
    if (legalCaveatLocale !== expectedCaveat.resolvedLocale) {
      issues.push("legalCaveatLocale must match the resolved legal caveat locale.");
    }
    if (payload.legalCaveatFallbackUsed !== expectedCaveat.fallbackUsed) {
      issues.push("legalCaveatFallbackUsed must match the requested locale fallback state.");
    }
  }

  if (!isRecord(payload.payload)) {
    issues.push("payload must be an object.");
  }

  if (!Array.isArray(payload.sourceReferences) || payload.sourceReferences.length === 0) {
    issues.push("sourceReferences must include at least one source reference.");
  } else if (!payload.sourceReferences.every(isRecord)) {
    issues.push("sourceReferences entries must be objects.");
  }

  if (!Array.isArray(payload.sourceMappedFields) || payload.sourceMappedFields.length === 0) {
    issues.push("sourceMappedFields must include at least one source-mapped field.");
  } else {
    for (const [index, field] of payload.sourceMappedFields.entries()) {
      if (!isRecord(field)) {
        issues.push(`sourceMappedFields[${index}] must be an object.`);
        continue;
      }
      requiredString(field, `sourceMappedFields[${index}].fieldKey`, issues, "fieldKey");
      requiredString(field, `sourceMappedFields[${index}].sourceMapId`, issues, "sourceMapId");
      if (!Array.isArray(field.sourceReferences) || field.sourceReferences.length === 0) {
        issues.push(`sourceMappedFields[${index}].sourceReferences must include at least one source reference.`);
      }
      if (!isRecord(field.label)) {
        issues.push(`sourceMappedFields[${index}].label must be an object.`);
      } else {
        const labelLocale = requiredString(field.label, `sourceMappedFields[${index}].label.locale`, issues, "locale");
        if (labelLocale && !isPureSocLocale(labelLocale)) {
          issues.push(`sourceMappedFields[${index}].label.locale must be a supported PureSOC locale.`);
        }
        requiredString(field.label, `sourceMappedFields[${index}].label.messageKey`, issues, "messageKey");
        requiredString(field.label, `sourceMappedFields[${index}].label.text`, issues, "text");
      }
    }
  }

  return {
    issues,
    payload: issues.length === 0 ? (payload as unknown as NotificationDraftPayloadEnvelopeContract) : undefined,
    valid: issues.length === 0
  };
};

const assertNotificationDraftEnvelopeContract = (payload: unknown): NotificationDraftPayloadEnvelopeContract => {
  const result = validateNotificationDraftPayloadEnvelopeContract(payload);
  if (!result.valid || !result.payload) {
    throw new Error(`Invalid notification draft payload envelope: ${result.issues.join("; ")}`);
  }

  return result.payload;
};

const toNotificationDraftData = (
  record: NotificationDraftContract,
  payload: NotificationDraftPayloadEnvelopeContract
): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    assessmentId: uuidOrNull(record.assessmentId),
    jurisdiction: record.jurisdiction,
    notificationType: record.notificationType,
    status: record.status,
    payloadJson: payload,
    sourceReferencesJson: record.sourceReferences,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

const toRoNis2CompanionDraftData = (
  record: RoNis2NotificationDraftContract,
  payload: NotificationDraftPayloadEnvelopeContract
): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    assessmentId: uuidOrNull(record.assessmentId),
    onboardingProgressId: uuidOrNull(record.onboardingProgressId),
    classificationRunId: uuidOrNull(record.classificationRunId),
    notificationDraftId: uuidOrNull(record.notificationDraftId),
    status: record.status,
    payloadJson: payload,
    sourceReferencesJson: record.sourceReferences,
    legalCaveat: record.legalCaveat,
    createdBy: uuidOrNull(record.createdBy),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

const fromNotificationDraftRow = (row: NotificationDraftRow): NotificationDraftContract => {
  const payload = assertNotificationDraftEnvelopeContract(row.payloadJson);
  return stripUndefined({
    id: row.id,
    organizationId: row.organizationId,
    assessmentId: row.assessmentId ?? undefined,
    jurisdiction: row.jurisdiction,
    notificationType: row.notificationType,
    status: row.status,
    payload,
    sourceReferences: stringArray(row.sourceReferencesJson),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  }) as NotificationDraftContract;
};

const fromRoNis2NotificationDraftRow = (row: RoNis2NotificationDraftRow): RoNis2NotificationDraftContract =>
  stripUndefined({
    id: row.id,
    organizationId: row.organizationId,
    assessmentId: row.assessmentId ?? undefined,
    onboardingProgressId: row.onboardingProgressId ?? undefined,
    classificationRunId: row.classificationRunId ?? undefined,
    notificationDraftId: row.notificationDraftId ?? undefined,
    status: row.status,
    payload: isRecord(row.payloadJson) ? row.payloadJson : {},
    sourceReferences: stringArray(row.sourceReferencesJson),
    legalCaveat: row.legalCaveat,
    createdBy: row.createdBy ?? undefined,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  }) as RoNis2NotificationDraftContract;

const requiredString = (
  record: Record<string, unknown>,
  label: string,
  issues: string[],
  key = label
): string | undefined => {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${label} must be a non-empty string.`);
    return undefined;
  }

  return value;
};

const stringArray = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isString) : []);

const toIso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());

const uuidOrNull = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
};

const isString = (value: unknown): value is string => typeof value === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;

const cloneNotificationDraft = (record: NotificationDraftContract): NotificationDraftContract =>
  JSON.parse(JSON.stringify(record)) as NotificationDraftContract;

const cloneRoNis2CompanionDraft = (record: RoNis2NotificationDraftContract): RoNis2NotificationDraftContract =>
  JSON.parse(JSON.stringify(record)) as RoNis2NotificationDraftContract;
