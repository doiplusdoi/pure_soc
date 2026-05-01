import {
  countryPackNotificationPayloadSchemaKey,
  resolveLegalCaveatMessage,
  resolvePureSocLocale,
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

export const notificationDraftHasSourceMappedFields = (draft: RoNis2NotificationDraftJson): boolean =>
  draft.fields.length > 0 &&
  draft.fields.every((field) => field.sourceMapId.startsWith("ro-nis2-notification_draft_mapping-")) &&
  draft.sourceMapLinks.length === draft.fields.length &&
  draft.sourceMapLinks.every((link) => link.targetCollection === "notification_draft_mapping");

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
