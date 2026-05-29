import {
  buildCountryPackNotificationDraftEnvelope,
  countryPackNotificationPayloadSchemaKey,
  definePureSocMessageCatalog,
  parseCountryPackNotificationDraftEnvelope,
  resolveLegalCaveatMessage,
  resolvePureSocLocale,
  resolvePureSocMessage,
  type CountryPackNotificationDraftEnvelope,
  type PureSocMessageFallbackReason,
  type PureSocMessageReviewStatus,
  type PureSocLocale
} from "@puresoc/country-packs-core";
import {
  RO_NIS2_SOURCE_VERSION,
  type Nis2Classification,
  type RoNis2SourceMapLink,
  type RoNis2SourceReference
} from "./classification.service";
import type { RoNis2OnboardingAnswers } from "./onboarding.schema";
import {
  roNis2NotificationMappings,
  roNis2ServiceCatalogOptions,
  type RoNis2NotificationMapping
} from "./runtime-model";

export type RoNis2NotificationDraftStatus = "draft" | "ready_for_review" | "exported" | "superseded";

export interface RoNis2NotificationDraftField {
  key: string;
  label: string;
  labelFallbackReason?: PureSocMessageFallbackReason;
  labelFallbackUsed: boolean;
  labelLocale: PureSocLocale;
  labelMessageKey: string;
  labelRequestedLocale?: string;
  labelReviewStatus: PureSocMessageReviewStatus;
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
  legalCaveatFallbackReason?: PureSocMessageFallbackReason;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: string;
  legalCaveatRequestedLocale?: string;
  legalCaveatReviewStatus: PureSocMessageReviewStatus;
  locale: PureSocLocale;
  notificationType: "ro_nis2_registration_notification";
  payloadSchemaKey: string;
  payloadSchemaVersion: string;
  sourceMapLinks: RoNis2SourceMapLink[];
  sourceVersion: string;
  status: RoNis2NotificationDraftStatus;
  submission: {
    notice: string;
    noticeFallbackReason?: PureSocMessageFallbackReason;
    noticeFallbackUsed: boolean;
    noticeLocale: PureSocLocale;
    noticeMessageKey: string;
    noticeRequestedLocale?: string;
    noticeReviewStatus: PureSocMessageReviewStatus;
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
  "PureSOC prepares an internal Romania NIS2 notification draft for reviewer export. PureSOC does not submit this draft to DNSC.";

export const RO_NIS2_NOTIFICATION_SUBMISSION_NOTICE_MESSAGE_KEY =
  "country_pack.ro.nis2.notification.submission.notice.v1";

export const RO_NIS2_NOTIFICATION_LEGAL_CAVEAT = resolveLegalCaveatMessage("en").text;

const NOTIFICATION_MAPPINGS: readonly RoNis2NotificationMapping[] = roNis2NotificationMappings;

const roNis2NotificationMessageCatalog = definePureSocMessageCatalog([
  ...NOTIFICATION_MAPPINGS.map((mapping) => ({
    messageKey: mapping.labelMessageKey,
    messageKind: "country_pack_notification" as const,
    reviewStatusByLocale: {
      en: "source_approved" as const
    },
    translations: {
      en: mapping.label
    }
  })),
  {
    messageKey: RO_NIS2_NOTIFICATION_SUBMISSION_NOTICE_MESSAGE_KEY,
    messageKind: "country_pack_notification" as const,
    reviewStatusByLocale: {
      en: "source_approved" as const
    },
    translations: {
      en: RO_NIS2_NOTIFICATION_SUBMISSION_NOTICE
    }
  }
]);

const resolveRoNis2NotificationMessage = (messageKey: string, locale?: string | null) =>
  resolvePureSocMessage({
    catalog: roNis2NotificationMessageCatalog,
    locale,
    messageKey
  });

const NOTIFICATION_ANSWER_PATHS: Record<string, string> = {
  notification_c9: "entity.legalName",
  notification_c10: "entity.cui",
  notification_c11: "entity.nationalRegistrationNumber",
  notification_c14: "address.postalCode",
  notification_c15: "contact.email",
  notification_c16: "contact.websiteUrl",
  notification_c17: "contact.phone",
  notification_c18: "contact.mobilePhone",
  notification_c20: "activity.mainNaceCode",
  notification_c21: "activity.secondaryNaceCodes",
  notification_c25: "size.employeeCount",
  notification_d25: "size.employeeCount",
  notification_c26: "size.annualTurnoverEur",
  notification_d26: "size.annualTurnoverEur",
  notification_c27: "size.balanceSheetTotalEur",
  notification_d27: "size.balanceSheetTotalEur",
  notification_c28: "size.sizeCategory",
  notification_d28: "size.sizeCategory",
  notification_c60: "cybersecurityResponsible.name",
  notification_c61: "cybersecurityResponsible.role",
  notification_c62: "cybersecurityResponsible.email",
  notification_c63: "cybersecurityResponsible.phone",
  notification_c69: "permanentMonitoringContact.name",
  notification_c72: "permanentMonitoringContact.phone",
  notification_c73: "permanentMonitoringContact.phone",
  notification_c74: "permanentMonitoringContact.email",
  notification_c78: "network.publicIpRanges",
  notification_c89: "legalRepresentative.name",
  notification_c90: "legalRepresentative.email",
  notification_c91: "legalRepresentative.phone",
  notification_c92: "legalRepresentative.role",
  notification_d97: "article9.soleProviderEssentialService",
  notification_d98: "article9.publicSafetySecurityOrHealthImpact",
  notification_d99: "article9.systemicRisk",
  notification_d100: "article9.nationalOrRegionalCriticality",
  notification_d104: "relationship.criticalEntityInRomaniaLaw294",
  notification_d107: "attachedDocumentIds",
  notification_d108: "attachedDocumentIds",
  notification_c110: "attachedDocumentIds",
  notification_c112: "attachedDocumentIds",
  notification_c114: "attachedDocumentIds",
  notification_c120: "legalRepresentative.name",
  notification_c121: "legalRepresentative.role"
};

export const buildRoNis2NotificationDraft = (input: {
  answers: RoNis2OnboardingAnswers;
  classification: Nis2Classification;
  generatedAt?: string;
  locale?: string | null;
  status?: RoNis2NotificationDraftStatus;
}): RoNis2NotificationDraftJson => {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const locale = resolvePureSocLocale(input.locale).locale;
  const legalCaveat = resolveLegalCaveatMessage(input.locale);
  const submissionNotice = resolveRoNis2NotificationMessage(
    RO_NIS2_NOTIFICATION_SUBMISSION_NOTICE_MESSAGE_KEY,
    input.locale
  );
  const fields = NOTIFICATION_MAPPINGS.map((mapping) => {
    const label = resolveRoNis2NotificationMessage(mapping.labelMessageKey, input.locale);

    return {
      key: mapping.key,
      label: label.text,
      labelFallbackReason: label.fallbackReason,
      labelFallbackUsed: label.fallbackUsed,
      labelLocale: label.resolvedLocale,
      labelMessageKey: mapping.labelMessageKey,
      labelRequestedLocale: label.requestedLocale,
      labelReviewStatus: label.reviewStatus,
      sourceMapId: mapping.sourceMapId,
      sourceReferences: mapping.sourceReferences,
      targetCell: mapping.targetCell,
      value: resolveNotificationMappingValue(mapping.key, input.answers, input.classification, generatedAt)
    };
  });
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
    generatedAt,
    jurisdiction: "RO",
    legalCaveat: legalCaveat.text,
    legalCaveatFallbackReason: legalCaveat.fallbackReason,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatMessageKey: legalCaveat.messageKey,
    legalCaveatRequestedLocale: legalCaveat.requestedLocale,
    legalCaveatReviewStatus: legalCaveat.reviewStatus,
    locale,
    notificationType: "ro_nis2_registration_notification",
    payloadSchemaKey: RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY,
    payloadSchemaVersion: RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_VERSION,
    sourceMapLinks,
    sourceVersion: RO_NIS2_SOURCE_VERSION,
    status: input.status ?? "draft",
    submission: {
      notice: submissionNotice.text,
      noticeFallbackReason: submissionNotice.fallbackReason,
      noticeFallbackUsed: submissionNotice.fallbackUsed,
      noticeLocale: submissionNotice.resolvedLocale,
      noticeMessageKey: RO_NIS2_NOTIFICATION_SUBMISSION_NOTICE_MESSAGE_KEY,
      noticeRequestedLocale: submissionNotice.requestedLocale,
      noticeReviewStatus: submissionNotice.reviewStatus,
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
    locale: draft.legalCaveatRequestedLocale ?? draft.locale,
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
        fallbackReason: field.labelFallbackReason,
        fallbackUsed: field.labelFallbackUsed,
        locale: field.labelLocale,
        messageKey: field.labelMessageKey,
        requestedLocale: field.labelRequestedLocale,
        reviewStatus: field.labelReviewStatus,
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

const resolveNotificationMappingValue = (
  key: string,
  answers: RoNis2OnboardingAnswers,
  classification: Nis2Classification,
  generatedAt: string
): string | number | boolean | null => {
  const answerPath = NOTIFICATION_ANSWER_PATHS[key];
  if (answerPath) {
    return formatNotificationValue(answerPath, getAnswerValue(answers, answerPath));
  }

  switch (key) {
    case "notification_c8":
      return answers.entity?.legalName ?? null;
    case "notification_c13":
      return formatAddress(answers.address);
    case "notification_d32":
      return selectedServiceSectors(answers).length;
    case "notification_c33":
      return selectedServiceSectors(answers).join(", ") || null;
    case "notification_d39":
      return selectedServiceSubsectors(answers).length;
    case "notification_c40":
      return selectedServiceSubsectors(answers).join(", ") || null;
    case "notification_d46":
      return answers.selectedServiceTypeCodes?.length ?? 0;
    case "notification_c47":
    case "notification_d47":
      return selectedServiceLabels(answers).join(", ") || null;
    case "notification_c59":
      return Boolean(answers.cybersecurityResponsible?.name || answers.cybersecurityResponsible?.email);
    case "notification_d59":
      return "Designated cybersecurity contact";
    case "notification_c68":
      return sameMonitoringAndCybersecurityContact(answers);
    case "notification_d68":
      return "Monitoring contact matches cybersecurity contact";
    case "notification_d71":
      return [
        answers.permanentMonitoringContact?.email,
        answers.permanentMonitoringContact?.phone
      ].filter(Boolean).length;
    case "notification_d77":
      return answers.network?.publicIpRanges?.length ?? 0;
    case "notification_d81":
      return answers.relationship?.providesServicesInAnotherEuMemberState ? 1 : 0;
    case "notification_c83":
    case "notification_c85":
      return null;
    case "notification_c88":
    case "notification_d88":
      return answers.legalRepresentative?.name ? null : "Not applicable";
    case "notification_c97":
      return "Article 9 self-assessment";
    case "notification_c107":
      return (answers.attachedDocumentIds?.length ?? 0) > 0;
    case "notification_c108":
      return "Number of attached documents";
    case "notification_c109":
    case "notification_c111":
    case "notification_c113":
      return answers.attachedDocumentIds?.join(", ") ?? null;
    case "notification_c117":
      return answers.entity?.legalName
        ? `${answers.entity.legalName} preliminary classification`
        : "Preliminary classification";
    case "notification_d117":
      return classification.result;
    case "notification_d122":
      return generatedAt.slice(0, 10);
    default:
      return null;
  }
};

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

const serviceOptionByCode = new Map(roNis2ServiceCatalogOptions.map((option) => [option.code, option]));

const selectedServiceOptions = (answers: RoNis2OnboardingAnswers) =>
  (answers.selectedServiceTypeCodes ?? []).map((code) => serviceOptionByCode.get(code)).filter((option) => option !== undefined);

const selectedServiceLabels = (answers: RoNis2OnboardingAnswers): string[] =>
  selectedServiceOptions(answers).map((option) => option.label);

const selectedServiceSectors = (answers: RoNis2OnboardingAnswers): string[] => [
  ...new Set(selectedServiceOptions(answers).map((option) => option.sectorLabel).filter((label): label is string => Boolean(label)))
];

const selectedServiceSubsectors = (answers: RoNis2OnboardingAnswers): string[] => [
  ...new Set(
    selectedServiceOptions(answers).map((option) => option.subsectorLabel).filter((label): label is string => Boolean(label))
  )
];

const formatAddress = (address: RoNis2OnboardingAnswers["address"]): string | null => {
  if (!address) {
    return null;
  }

  const parts = [
    address.street,
    address.number ? `no. ${address.number}` : undefined,
    address.blockOrBuilding,
    address.floor ? `floor ${address.floor}` : undefined,
    address.apartmentOrRoom,
    address.district,
    address.city,
    address.county,
    address.country,
    address.postalCode
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
};

const sameMonitoringAndCybersecurityContact = (answers: RoNis2OnboardingAnswers): boolean =>
  Boolean(
    answers.cybersecurityResponsible?.email &&
      answers.permanentMonitoringContact?.email &&
      answers.cybersecurityResponsible.email === answers.permanentMonitoringContact.email
  );

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
  const requestedLocale =
    typeof payload.legalCaveatRequestedLocale === "string" ? payload.legalCaveatRequestedLocale : locale;
  const legalCaveat = resolveLegalCaveatMessage(requestedLocale);

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
  if (payload.legalCaveatFallbackReason !== undefined && payload.legalCaveatFallbackReason !== legalCaveat.fallbackReason) {
    issues.push("legacy payload legal caveat fallback reason must match the requested locale.");
  }
  if (payload.legalCaveatRequestedLocale !== undefined && payload.legalCaveatRequestedLocale !== legalCaveat.requestedLocale) {
    issues.push("legacy payload legal caveat requested locale must match the message resolver.");
  }
  if (payload.legalCaveatReviewStatus !== undefined && payload.legalCaveatReviewStatus !== legalCaveat.reviewStatus) {
    issues.push("legacy payload legal caveat review status must match the message resolver.");
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
