import {
  buildCountryPackNotificationDraftEnvelope,
  countryPackNotificationPayloadSchemaKey,
  parseCountryPackNotificationDraftEnvelope,
  resolveLegalCaveatMessage,
  resolvePureSocLocale,
  type CountryPackNotificationDraftEnvelope,
  type PureSocLocale
} from "@puresoc/country-packs-core";
import {
  RO_NIS2_SOURCE_VERSION,
  type Nis2Classification,
  type RoNis2SourceMapLink,
  type RoNis2SourceReference
} from "./classification.service";
import type { RoNis2OnboardingAnswers } from "./onboarding.schema";

export type RoNis2NotificationDraftStatus = "draft" | "ready_for_review" | "exported" | "superseded";

export interface RoNis2NotificationDraftField {
  key: string;
  label: string;
  labelLocale: PureSocLocale;
  labelMessageKey: string;
  sourceMapId: string;
  sourceReferences: readonly RoNis2SourceReference[];
  targetCell: string;
  value: string | number | boolean | null;
}

export interface RoNis2NotificationDraftJson {
  classification: Pick<
    Nis2Classification,
    "article9Required" | "matchedRules" | "notificationRecommended" | "reasons" | "result" | "sourceVersion"
  >;
  fields: RoNis2NotificationDraftField[];
  frameworkKey: "nis2";
  generatedAt: string;
  jurisdiction: "RO";
  legalCaveat: string;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: string;
  locale: PureSocLocale;
  notificationType: "ro_nis2_registration_notification";
  payloadSchemaKey: string;
  payloadSchemaVersion: string;
  sourceMapLinks: RoNis2SourceMapLink[];
  sourceVersion: string;
  status: RoNis2NotificationDraftStatus;
  submission: {
    notice: string;
    submittedAt: null;
    submittedToDnsc: false;
  };
}

export interface RoNis2NotificationDraftEnvelopePayload extends Record<string, unknown> {
  classification: RoNis2NotificationDraftJson["classification"];
  fields: RoNis2NotificationDraftField[];
  generatedAt: string;
  legacyNotificationType: RoNis2NotificationDraftJson["notificationType"];
  sourceMapLinks: RoNis2SourceMapLink[];
  sourceVersion: string;
  status: RoNis2NotificationDraftStatus;
  submission: RoNis2NotificationDraftJson["submission"];
}

export type RoNis2NotificationDraftEnvelope =
  CountryPackNotificationDraftEnvelope<RoNis2NotificationDraftEnvelopePayload>;

export type RoNis2NotificationDraftBackfillResult =
  | {
      envelope: RoNis2NotificationDraftEnvelope;
      reasons: [];
      status: "already_generic" | "converted";
    }
  | {
      reasons: string[];
      status: "manual_review_required";
    };

export const RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY = countryPackNotificationPayloadSchemaKey({
  countryCode: "RO",
  frameworkKey: "nis2",
  majorVersion: 1,
  notificationKind: "registration_notification"
});

export const RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_VERSION = "1.0.0";

export const RO_NIS2_NOTIFICATION_SUBMISSION_NOTICE =
  "PureSOC prepares an internal Romania NIS2 notification-form draft from source-mapped workbook fields. PureSOC does not submit this draft to DNSC.";

export const RO_NIS2_NOTIFICATION_LEGAL_CAVEAT = resolveLegalCaveatMessage("en").text;

interface NotificationMapping {
  answerPath?: string;
  key: string;
  label: string;
  labelMessageKey: string;
  sourceMapId: string;
  sourceReferences: readonly RoNis2SourceReference[];
  targetCell: string;
  value?: string | number | boolean | null;
}

const notificationMapping = (
  key: string,
  label: string,
  sourceMapId: string,
  targetCell: string,
  sourceReferences: readonly RoNis2SourceReference[],
  answerPath?: string
): NotificationMapping => ({
  answerPath,
  key,
  label,
  labelMessageKey: `country_pack.ro.nis2.notification.${key}.label`,
  sourceMapId,
  sourceReferences,
  targetCell
});

const NOTIFICATION_MAPPINGS: readonly NotificationMapping[] = [
  notificationMapping(
    "notification_c9",
    "Name of the entity",
    "ro-nis2-notification_draft_mapping-notification_c9",
    "C9",
    [{ cell: "D12", sheet: "Entity data" }],
    "entity.legalName"
  ),
  notificationMapping(
    "notification_c10",
    "Unique Identification Code (CUI)",
    "ro-nis2-notification_draft_mapping-notification_c10",
    "C10",
    [
      { cell: "C13", sheet: "Entity data" },
      { cell: "D13", sheet: "Entity data" }
    ],
    "entity.cui"
  ),
  notificationMapping(
    "notification_c11",
    "National registration number",
    "ro-nis2-notification_draft_mapping-notification_c11",
    "C11",
    [
      { cell: "C14", sheet: "Entity data" },
      { cell: "D14", sheet: "Entity data" }
    ],
    "entity.nationalRegistrationNumber"
  ),
  notificationMapping(
    "notification_c13",
    "Headquarters address",
    "ro-nis2-notification_draft_mapping-notification_c13",
    "C13",
    [
      { cell: "D16", sheet: "Entity data" },
      { cell: "D17", sheet: "Entity data" },
      { cell: "D18", sheet: "Entity data" },
      { cell: "D20", sheet: "Entity data" }
    ],
    "address"
  ),
  notificationMapping(
    "notification_c15",
    "Email address",
    "ro-nis2-notification_draft_mapping-notification_c15",
    "C15",
    [{ cell: "D27", sheet: "Entity data" }],
    "contact.email"
  ),
  notificationMapping(
    "notification_c20",
    "Main NACE code",
    "ro-nis2-notification_draft_mapping-notification_c20",
    "C20",
    [{ cell: "D32", sheet: "Entity data" }],
    "activity.mainNaceCode"
  ),
  notificationMapping(
    "notification_d25",
    "Average annual number of employees",
    "ro-nis2-notification_draft_mapping-notification_d25",
    "D25",
    [{ cell: "D17", sheet: "Entity assessment" }],
    "size.employeeCount"
  ),
  notificationMapping(
    "notification_d28",
    "Size of the entity according to Law No. 346/2004",
    "ro-nis2-notification_draft_mapping-notification_d28",
    "D28",
    [
      { cell: "D20", sheet: "Entity assessment" },
      { cell: "D21", sheet: "Entity assessment" }
    ],
    "size.sizeCategory"
  ),
  notificationMapping(
    "notification_d104",
    "Critical entity answer under Law No. 294/2024",
    "ro-nis2-notification_draft_mapping-notification_d104",
    "D104",
    [{ cell: "D153", sheet: "Entity assessment" }],
    "relationship.criticalEntityInRomaniaLaw294"
  )
];

export const buildRoNis2NotificationDraft = (input: {
  answers: RoNis2OnboardingAnswers;
  classification: Nis2Classification;
  generatedAt?: string;
  locale?: string | null;
  status?: RoNis2NotificationDraftStatus;
}): RoNis2NotificationDraftJson => {
  const locale = resolvePureSocLocale(input.locale).locale;
  const legalCaveat = resolveLegalCaveatMessage(input.locale);
  const fields = NOTIFICATION_MAPPINGS.map((mapping) => ({
    key: mapping.key,
    label: mapping.label,
    labelLocale: "en" as const,
    labelMessageKey: mapping.labelMessageKey,
    sourceMapId: mapping.sourceMapId,
    sourceReferences: mapping.sourceReferences,
    targetCell: mapping.targetCell,
    value: mapping.answerPath ? formatNotificationValue(mapping.answerPath, getAnswerValue(input.answers, mapping.answerPath)) : mapping.value ?? null
  }));
  const sourceMapLinks = fields.map((field) => ({
    sourceMapId: field.sourceMapId,
    sourceReferences: field.sourceReferences,
    targetCollection: "notification_draft_mapping",
    targetKey: field.key,
    workbookRange: `Notification form!${field.targetCell}`
  }));

  return {
    classification: {
      article9Required: input.classification.article9Required,
      matchedRules: input.classification.matchedRules,
      notificationRecommended: input.classification.notificationRecommended,
      reasons: input.classification.reasons,
      result: input.classification.result,
      sourceVersion: input.classification.sourceVersion
    },
    fields,
    frameworkKey: "nis2",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    jurisdiction: "RO",
    legalCaveat: legalCaveat.text,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatMessageKey: legalCaveat.messageKey,
    locale,
    notificationType: "ro_nis2_registration_notification",
    payloadSchemaKey: RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY,
    payloadSchemaVersion: RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_VERSION,
    sourceMapLinks,
    sourceVersion: RO_NIS2_SOURCE_VERSION,
    status: input.status ?? "draft",
    submission: {
      notice: RO_NIS2_NOTIFICATION_SUBMISSION_NOTICE,
      submittedAt: null,
      submittedToDnsc: false
    }
  };
};

export const toRoNis2NotificationDraftEnvelope = (
  draft: RoNis2NotificationDraftJson
): RoNis2NotificationDraftEnvelope =>
  buildCountryPackNotificationDraftEnvelope({
    jurisdiction: "RO",
    locale: draft.locale,
    notificationType: "country_registration",
    payload: {
      classification: draft.classification,
      fields: draft.fields,
      generatedAt: draft.generatedAt,
      legacyNotificationType: draft.notificationType,
      sourceMapLinks: draft.sourceMapLinks,
      sourceVersion: draft.sourceVersion,
      status: draft.status,
      submission: draft.submission
    },
    payloadSchemaKey: draft.payloadSchemaKey,
    payloadSchemaVersion: draft.payloadSchemaVersion,
    sourceMappedFields: draft.fields.map((field) => ({
      fieldKey: field.key,
      label: {
        locale: field.labelLocale,
        messageKey: field.labelMessageKey,
        sourceMapId: field.sourceMapId,
        text: field.label
      },
      sourceMapId: field.sourceMapId,
      sourceReferences: field.sourceReferences,
      value: field.value
    })),
    sourceReferences: draft.sourceMapLinks.flatMap((link) => link.sourceReferences)
  });

export const buildRoNis2NotificationDraftEnvelope = (input: {
  answers: RoNis2OnboardingAnswers;
  classification: Nis2Classification;
  generatedAt?: string;
  locale?: string | null;
  status?: RoNis2NotificationDraftStatus;
}): RoNis2NotificationDraftEnvelope => toRoNis2NotificationDraftEnvelope(buildRoNis2NotificationDraft(input));

export const notificationDraftHasSourceMappedFields = (draft: RoNis2NotificationDraftJson): boolean =>
  draft.fields.length > 0 &&
  draft.fields.every((field) => field.sourceMapId.startsWith("ro-nis2-notification_draft_mapping-")) &&
  draft.sourceMapLinks.length === draft.fields.length &&
  draft.sourceMapLinks.every((link) => link.targetCollection === "notification_draft_mapping");

export const backfillRoNis2NotificationDraftPayload = (payload: unknown): RoNis2NotificationDraftBackfillResult => {
  const existingEnvelope = readExistingRoEnvelope(payload);
  if (existingEnvelope) {
    return {
      envelope: existingEnvelope,
      reasons: [],
      status: "already_generic"
    };
  }

  const validation = validateLegacyRoNotificationDraftJson(payload);
  if (validation.issues.length > 0 || !validation.draft) {
    return {
      reasons: validation.issues,
      status: "manual_review_required"
    };
  }

  return {
    envelope: toRoNis2NotificationDraftEnvelope(validation.draft),
    reasons: [],
    status: "converted"
  };
};

const getAnswerValue = (answers: RoNis2OnboardingAnswers, fieldPath: string): unknown =>
  fieldPath.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, answers);

const formatNotificationValue = (fieldPath: string, value: unknown): string | number | boolean | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (fieldPath === "address" && typeof value === "object") {
    const address = value as Record<string, unknown>;
    return [address.street, address.number, address.city, address.county, address.country].filter(Boolean).join(", ");
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return JSON.stringify(value);
};

const readExistingRoEnvelope = (payload: unknown): RoNis2NotificationDraftEnvelope | null => {
  try {
    const envelope = parseCountryPackNotificationDraftEnvelope(payload);
    return envelope.jurisdiction === "RO" &&
      envelope.notificationType === "country_registration" &&
      envelope.payloadSchemaKey === RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY
      ? (envelope as RoNis2NotificationDraftEnvelope)
      : null;
  } catch {
    return null;
  }
};

const validateLegacyRoNotificationDraftJson = (
  payload: unknown
): { draft?: RoNis2NotificationDraftJson; issues: string[] } => {
  const issues: string[] = [];
  if (!isRecord(payload)) {
    return {
      issues: ["payload must be a readable Romania notification draft object."]
    };
  }

  if (payload.frameworkKey !== "nis2") {
    issues.push("legacy payload frameworkKey must be nis2.");
  }
  if (payload.jurisdiction !== "RO") {
    issues.push("legacy payload jurisdiction must be RO.");
  }
  if (payload.notificationType !== "ro_nis2_registration_notification") {
    issues.push("legacy payload notificationType must be ro_nis2_registration_notification.");
  }
  if (payload.payloadSchemaKey !== RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY) {
    issues.push("legacy payload schema key must be the Romania registration notification schema.");
  }
  if (payload.payloadSchemaVersion !== RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_VERSION) {
    issues.push("legacy payload schema version is not supported for deterministic backfill.");
  }

  validateLegacyCaveat(payload, issues);
  validateLegacyClassification(payload.classification, issues);
  validateLegacyFields(payload.fields, issues);
  validateLegacySourceMapLinks(payload.sourceMapLinks, issues);

  if (!isRecord(payload.submission) || payload.submission.submittedToDnsc !== false) {
    issues.push("legacy payload submission metadata must prove the draft was not submitted to DNSC.");
  }
  if (typeof payload.generatedAt !== "string" || payload.generatedAt.length === 0) {
    issues.push("legacy payload generatedAt must be present.");
  }
  if (typeof payload.sourceVersion !== "string" || payload.sourceVersion.length === 0) {
    issues.push("legacy payload sourceVersion must be present.");
  }
  if (!isRoNis2NotificationDraftStatus(payload.status)) {
    issues.push("legacy payload status is not supported.");
  }

  if (issues.length > 0) {
    return { issues };
  }

  const draft = payload as unknown as RoNis2NotificationDraftJson;
  if (!notificationDraftHasSourceMappedFields(draft)) {
    return {
      issues: ["legacy payload source mapping is incomplete or does not target the notification draft mapping."]
    };
  }

  return {
    draft,
    issues: []
  };
};

const validateLegacyCaveat = (payload: Record<string, unknown>, issues: string[]): void => {
  const locale = typeof payload.locale === "string" ? payload.locale : "";
  const legalCaveat = resolveLegalCaveatMessage(locale);

  if (resolvePureSocLocale(locale).locale !== payload.locale) {
    issues.push("legacy payload locale must already be normalized to a supported PureSOC locale.");
  }
  if (payload.legalCaveat !== legalCaveat.text) {
    issues.push("legacy payload legal caveat must match the keyed PureSOC legal caveat text.");
  }
  if (payload.legalCaveatLocale !== legalCaveat.resolvedLocale) {
    issues.push("legacy payload legal caveat locale must match the keyed fallback locale.");
  }
  if (payload.legalCaveatMessageKey !== legalCaveat.messageKey) {
    issues.push("legacy payload legal caveat message key must match the PureSOC caveat key.");
  }
  if (payload.legalCaveatFallbackUsed !== legalCaveat.fallbackUsed) {
    issues.push("legacy payload legal caveat fallback flag must match the requested locale.");
  }
};

const validateLegacyClassification = (classification: unknown, issues: string[]): void => {
  if (!isRecord(classification)) {
    issues.push("legacy payload classification must be present.");
    return;
  }

  if (typeof classification.article9Required !== "boolean") {
    issues.push("legacy payload classification.article9Required must be a boolean.");
  }
  if (!Array.isArray(classification.matchedRules)) {
    issues.push("legacy payload classification.matchedRules must be an array.");
  }
  if (typeof classification.notificationRecommended !== "boolean") {
    issues.push("legacy payload classification.notificationRecommended must be a boolean.");
  }
  if (!Array.isArray(classification.reasons)) {
    issues.push("legacy payload classification.reasons must be an array.");
  }
  if (typeof classification.result !== "string" || classification.result.length === 0) {
    issues.push("legacy payload classification.result must be present.");
  }
  if (typeof classification.sourceVersion !== "string" || classification.sourceVersion.length === 0) {
    issues.push("legacy payload classification.sourceVersion must be present.");
  }
};

const validateLegacyFields = (fields: unknown, issues: string[]): void => {
  if (!Array.isArray(fields) || fields.length === 0) {
    issues.push("legacy payload fields must include source-mapped notification fields.");
    return;
  }

  fields.forEach((field, index) => {
    if (!isRecord(field)) {
      issues.push(`legacy payload fields[${index}] must be an object.`);
      return;
    }
    for (const key of ["key", "label", "labelLocale", "labelMessageKey", "sourceMapId", "targetCell"]) {
      if (typeof field[key] !== "string" || field[key].length === 0) {
        issues.push(`legacy payload fields[${index}].${key} must be present.`);
      }
    }
    if (!Array.isArray(field.sourceReferences) || field.sourceReferences.length === 0) {
      issues.push(`legacy payload fields[${index}].sourceReferences must include at least one source reference.`);
    }
  });
};

const validateLegacySourceMapLinks = (sourceMapLinks: unknown, issues: string[]): void => {
  if (!Array.isArray(sourceMapLinks) || sourceMapLinks.length === 0) {
    issues.push("legacy payload sourceMapLinks must include notification mapping provenance.");
    return;
  }

  sourceMapLinks.forEach((link, index) => {
    if (!isRecord(link)) {
      issues.push(`legacy payload sourceMapLinks[${index}] must be an object.`);
      return;
    }
    if (typeof link.sourceMapId !== "string" || link.sourceMapId.length === 0) {
      issues.push(`legacy payload sourceMapLinks[${index}].sourceMapId must be present.`);
    }
    if (link.targetCollection !== "notification_draft_mapping") {
      issues.push(`legacy payload sourceMapLinks[${index}] must target notification_draft_mapping.`);
    }
    if (!Array.isArray(link.sourceReferences) || link.sourceReferences.length === 0) {
      issues.push(`legacy payload sourceMapLinks[${index}].sourceReferences must include provenance.`);
    }
  });
};

const isRoNis2NotificationDraftStatus = (value: unknown): value is RoNis2NotificationDraftStatus =>
  value === "draft" || value === "ready_for_review" || value === "exported" || value === "superseded";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
