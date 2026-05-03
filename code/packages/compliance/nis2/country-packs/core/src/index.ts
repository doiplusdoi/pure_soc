import {
  changedLegalLogicDefaultStatus,
  type RegulatorySourceActivationStatus,
  type RegulatorySourceRecord
} from "@puresoc/regulatory-sources";
import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  isPureSocLocale,
  resolveLegalCaveatMessage,
  resolvePureSocLocale,
  type PureSocMessageFallbackReason,
  type PureSocMessageReviewStatus,
  type PureSocLocale
} from "@puresoc/shared";

export {
  LEGAL_CAVEAT_MESSAGE_KEY,
  PURESOC_LEGAL_CAVEAT,
  definePureSocMessageCatalog,
  resolvePureSocMessage,
  resolveLegalCaveatMessage,
  resolvePureSocLocale,
  type LocalizedMessageResolution,
  type LegalCaveatMessageResolution,
  type PureSocMessageCatalog,
  type PureSocMessageCatalogEntry,
  type PureSocMessageFallbackReason,
  type PureSocMessageReviewStatus,
  type PureSocLocale
} from "@puresoc/shared";

export type EuCountryCode =
  | "AT"
  | "BE"
  | "BG"
  | "HR"
  | "CY"
  | "CZ"
  | "DK"
  | "EE"
  | "FI"
  | "FR"
  | "DE"
  | "GR"
  | "HU"
  | "IE"
  | "IT"
  | "LV"
  | "LT"
  | "LU"
  | "MT"
  | "NL"
  | "PL"
  | "PT"
  | "RO"
  | "SK"
  | "SI"
  | "ES"
  | "SE";

export type CountryPackCompleteness =
  | "baseline_only"
  | "official_sources_identified"
  | "registration_rules_partial"
  | "classification_rules_partial"
  | "incident_rules_partial"
  | "full_pack_ready"
  | "requires_legal_review"
  | "deprecated";

export type CountryPackImplementationStatus = CountryPackCompleteness | "planned_full_pack";

export interface SectorCatalog {
  sectors: readonly string[];
}

export interface BusinessProfile {
  headquartersCountryCode?: EuCountryCode | string;
  mainOfficeCountryCode?: EuCountryCode | string;
  serviceCountryCodes?: readonly string[];
  naceCodes?: readonly string[];
  providedDigitalServices?: readonly string[];
}

export interface RegistrationRule {
  ruleKey: string;
  status: "unsupported" | "available" | "requires_legal_review";
  sourceRecordIds: readonly string[];
}

export interface ClassificationInput {
  businessProfile: BusinessProfile;
  answers?: Record<string, unknown>;
}

export interface ClassificationResult {
  classification: "unknown" | "not_applicable" | "essential" | "important" | "country_specific";
  requiresLegalReview: boolean;
  sourceRecordIds: readonly string[];
}

export interface IncidentContext {
  countryCode: EuCountryCode | string;
  incidentType?: string;
  becameAwareAt?: string;
}

export interface IncidentReportingRule {
  ruleKey: string;
  defaultTiming?: string;
  countryOverride: boolean;
  sourceRecordIds: readonly string[];
}

export interface AuthorityLookupInput {
  countryCode: EuCountryCode | string;
}

export interface NationalAuthority {
  name: string;
  role: "competent_authority" | "csirt" | "single_point_of_contact" | "registration_portal";
  sourceRecordIds: readonly string[];
}

export interface EvidenceRequirementInput {
  controlCode?: string;
  countryCode?: EuCountryCode | string;
}

export interface EvidenceRequirement {
  requirementKey: string;
  title: string;
  sourceRecordIds: readonly string[];
}

export interface ComplianceControlOverlay {
  controlCode: string;
  status: "not_available" | "draft" | "active";
  sourceRecordIds: readonly string[];
}

export interface UnsupportedCountryFeature {
  featureKey:
    | "registration_rules"
    | "classification_rules"
    | "incident_reporting_overrides"
    | "national_authorities"
    | "local_control_overlay"
    | "full_pack_pending";
  reason: string;
}

export type CountryPackNotificationType = "country_registration" | "incident_reporting" | "readiness_update";

export type CountryPackNotificationDraftStatus = "draft" | "ready_for_review" | "exported" | "superseded";

export const countryPackNotificationTypes: readonly CountryPackNotificationType[] = [
  "country_registration",
  "incident_reporting",
  "readiness_update"
];

export interface CountryPackLocalizedMessage {
  fallbackReason?: PureSocMessageFallbackReason;
  fallbackUsed?: boolean;
  locale: PureSocLocale;
  messageKey: string;
  requestedLocale?: string;
  reviewStatus?: PureSocMessageReviewStatus;
  sourceMapId?: string;
  text: string;
}

export interface CountryPackNotificationSourceMappedField {
  fieldKey: string;
  label: CountryPackLocalizedMessage;
  sourceMapId: string;
  sourceReferences: readonly unknown[];
  value: unknown;
}

export interface CountryPackNotificationDraftEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  frameworkKey: "nis2";
  jurisdiction: EuCountryCode | string;
  legalCaveat: string;
  legalCaveatFallbackReason?: PureSocMessageFallbackReason;
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: typeof LEGAL_CAVEAT_MESSAGE_KEY;
  legalCaveatRequestedLocale?: string;
  legalCaveatReviewStatus?: PureSocMessageReviewStatus;
  locale: PureSocLocale;
  notificationType: CountryPackNotificationType;
  payload: TPayload;
  payloadSchemaKey: string;
  payloadSchemaVersion: string;
  sourceMappedFields: readonly CountryPackNotificationSourceMappedField[];
  sourceReferences: readonly unknown[];
}

export type CountryPackNotificationEnvelopeValidationCode =
  | "empty_array"
  | "invalid_boolean"
  | "invalid_legal_caveat"
  | "invalid_locale"
  | "invalid_notification_type"
  | "invalid_schema_key"
  | "invalid_schema_version"
  | "missing_object"
  | "missing_string";

export interface CountryPackNotificationEnvelopeValidationIssue {
  code: CountryPackNotificationEnvelopeValidationCode;
  message: string;
  path: string;
}

export interface CountryPackNotificationEnvelopeValidationResult {
  envelope?: CountryPackNotificationDraftEnvelope<Record<string, unknown>>;
  issues: CountryPackNotificationEnvelopeValidationIssue[];
  valid: boolean;
}

export interface CountryPackNotificationEnvelopeValidationOptions {
  allowEmptySourceMappedFields?: boolean;
  allowEmptySourceReferences?: boolean;
}

export class CountryPackNotificationEnvelopeValidationError extends Error {
  constructor(readonly issues: readonly CountryPackNotificationEnvelopeValidationIssue[]) {
    super(`Invalid country-pack notification draft envelope: ${issues.map((issue) => issue.message).join("; ")}`);
    this.name = "CountryPackNotificationEnvelopeValidationError";
  }
}

export const countryPackNotificationPayloadSchemaKey = (input: {
  countryCode: EuCountryCode | string;
  frameworkKey: "nis2";
  majorVersion: number;
  notificationKind: string;
}): string =>
  [
    input.countryCode.toLowerCase(),
    input.frameworkKey,
    input.notificationKind.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase(),
    `v${input.majorVersion}`
  ].join(".");

export const buildCountryPackNotificationDraftEnvelope = <TPayload extends Record<string, unknown>>(input: {
  jurisdiction: EuCountryCode | string;
  locale?: string | null;
  notificationType: CountryPackNotificationType;
  payload: TPayload;
  payloadSchemaKey: string;
  payloadSchemaVersion: string;
  sourceMappedFields?: readonly CountryPackNotificationSourceMappedField[];
  sourceReferences?: readonly unknown[];
}): CountryPackNotificationDraftEnvelope<TPayload> => {
  const locale = resolvePureSocLocale(input.locale).locale;
  const legalCaveat = resolveLegalCaveatMessage(input.locale);

  return {
    frameworkKey: "nis2",
    jurisdiction: input.jurisdiction,
    legalCaveat: legalCaveat.text,
    legalCaveatFallbackReason: legalCaveat.fallbackReason,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatMessageKey: LEGAL_CAVEAT_MESSAGE_KEY,
    legalCaveatRequestedLocale: legalCaveat.requestedLocale,
    legalCaveatReviewStatus: legalCaveat.reviewStatus,
    locale,
    notificationType: input.notificationType,
    payload: input.payload,
    payloadSchemaKey: input.payloadSchemaKey,
    payloadSchemaVersion: input.payloadSchemaVersion,
    sourceMappedFields: input.sourceMappedFields ?? [],
    sourceReferences: input.sourceReferences ?? []
  };
};

export const validateCountryPackNotificationDraftEnvelope = (
  value: unknown,
  options: CountryPackNotificationEnvelopeValidationOptions = {}
): CountryPackNotificationEnvelopeValidationResult => {
  const issues: CountryPackNotificationEnvelopeValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      issues: [
        {
          code: "missing_object",
          message: "Notification draft payload must be an object envelope.",
          path: "$"
        }
      ],
      valid: false
    };
  }

  const frameworkKey = readRequiredString(value, "frameworkKey", issues);
  if (frameworkKey && frameworkKey !== "nis2") {
    issues.push({
      code: "missing_string",
      message: "frameworkKey must be nis2.",
      path: "$.frameworkKey"
    });
  }

  readRequiredString(value, "jurisdiction", issues);
  const notificationType = readRequiredString(value, "notificationType", issues);
  if (notificationType && !countryPackNotificationTypes.includes(notificationType as CountryPackNotificationType)) {
    issues.push({
      code: "invalid_notification_type",
      message: `notificationType must be one of ${countryPackNotificationTypes.join(", ")}.`,
      path: "$.notificationType"
    });
  }

  const payloadSchemaKey = readRequiredString(value, "payloadSchemaKey", issues);
  if (payloadSchemaKey && !/^[a-z]{2}\.nis2\.[a-z0-9]+(?:_[a-z0-9]+)*\.v[1-9][0-9]*$/.test(payloadSchemaKey)) {
    issues.push({
      code: "invalid_schema_key",
      message: "payloadSchemaKey must follow {country}.nis2.{notification_kind}.v{major}.",
      path: "$.payloadSchemaKey"
    });
  }

  const payloadSchemaVersion = readRequiredString(value, "payloadSchemaVersion", issues);
  if (payloadSchemaVersion && !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(payloadSchemaVersion)) {
    issues.push({
      code: "invalid_schema_version",
      message: "payloadSchemaVersion must be a semantic version string.",
      path: "$.payloadSchemaVersion"
    });
  }

  const locale = readLocale(value, "locale", issues);
  const legalCaveatLocale = readLocale(value, "legalCaveatLocale", issues);
  const legalCaveatMessageKey = readRequiredString(value, "legalCaveatMessageKey", issues);
  const legalCaveat = readRequiredString(value, "legalCaveat", issues);

  if (typeof value.legalCaveatFallbackUsed !== "boolean") {
    issues.push({
      code: "invalid_boolean",
      message: "legalCaveatFallbackUsed must be a boolean.",
      path: "$.legalCaveatFallbackUsed"
    });
  }

  if (legalCaveatMessageKey && legalCaveatMessageKey !== LEGAL_CAVEAT_MESSAGE_KEY) {
    issues.push({
      code: "invalid_legal_caveat",
      message: `legalCaveatMessageKey must be ${LEGAL_CAVEAT_MESSAGE_KEY}.`,
      path: "$.legalCaveatMessageKey"
    });
  }

  if (locale && legalCaveatLocale && legalCaveat) {
    const expectedCaveat = resolveLegalCaveatMessage(locale);
    if (legalCaveatLocale !== expectedCaveat.resolvedLocale) {
      issues.push({
        code: "invalid_legal_caveat",
        message: "legalCaveatLocale must match the resolved legal caveat locale.",
        path: "$.legalCaveatLocale"
      });
    }
    if (value.legalCaveatFallbackUsed !== expectedCaveat.fallbackUsed) {
      issues.push({
        code: "invalid_legal_caveat",
        message: "legalCaveatFallbackUsed must match the requested locale fallback state.",
        path: "$.legalCaveatFallbackUsed"
      });
    }
    if (legalCaveat !== expectedCaveat.text) {
      issues.push({
        code: "invalid_legal_caveat",
        message: "legalCaveat must match the keyed PureSOC legal caveat text.",
        path: "$.legalCaveat"
      });
    }
  }

  if (!isRecord(value.payload)) {
    issues.push({
      code: "missing_object",
      message: "payload must be an object.",
      path: "$.payload"
    });
  }

  validateSourceMappedFields(value.sourceMappedFields, issues, options);
  validateSourceReferences(value.sourceReferences, "$.sourceReferences", issues, !options.allowEmptySourceReferences);

  return {
    envelope:
      issues.length === 0 ? (value as unknown as CountryPackNotificationDraftEnvelope<Record<string, unknown>>) : undefined,
    issues,
    valid: issues.length === 0
  };
};

export const parseCountryPackNotificationDraftEnvelope = (
  value: unknown,
  options: CountryPackNotificationEnvelopeValidationOptions = {}
): CountryPackNotificationDraftEnvelope<Record<string, unknown>> => {
  const result = validateCountryPackNotificationDraftEnvelope(value, options);
  if (!result.valid || !result.envelope) {
    throw new CountryPackNotificationEnvelopeValidationError(result.issues);
  }

  return result.envelope;
};

const readRequiredString = (
  value: Record<string, unknown>,
  key: string,
  issues: CountryPackNotificationEnvelopeValidationIssue[],
  path = `$.${key}`
): string | undefined => {
  const entry = value[key];
  if (typeof entry !== "string" || entry.trim().length === 0) {
    issues.push({
      code: "missing_string",
      message: `${key} must be a non-empty string.`,
      path
    });
    return undefined;
  }

  return entry;
};

const readLocale = (
  value: Record<string, unknown>,
  key: string,
  issues: CountryPackNotificationEnvelopeValidationIssue[],
  path = `$.${key}`
): PureSocLocale | undefined => {
  const entry = readRequiredString(value, key, issues, path);
  if (!entry) {
    return undefined;
  }

  if (!isPureSocLocale(entry)) {
    issues.push({
      code: "invalid_locale",
      message: `${key} must be a supported PureSOC locale.`,
      path
    });
    return undefined;
  }

  return entry;
};

const validateSourceMappedFields = (
  value: unknown,
  issues: CountryPackNotificationEnvelopeValidationIssue[],
  options: CountryPackNotificationEnvelopeValidationOptions
) => {
  if (!Array.isArray(value)) {
    issues.push({
      code: "missing_object",
      message: "sourceMappedFields must be an array.",
      path: "$.sourceMappedFields"
    });
    return;
  }

  if (!options.allowEmptySourceMappedFields && value.length === 0) {
    issues.push({
      code: "empty_array",
      message: "sourceMappedFields must include at least one source-mapped field.",
      path: "$.sourceMappedFields"
    });
  }

  value.forEach((field, index) => {
    if (!isRecord(field)) {
      issues.push({
        code: "missing_object",
        message: "sourceMappedFields entries must be objects.",
        path: `$.sourceMappedFields[${index}]`
      });
      return;
    }

    readRequiredString(field, "fieldKey", issues, `$.sourceMappedFields[${index}].fieldKey`);
    readRequiredString(field, "sourceMapId", issues, `$.sourceMappedFields[${index}].sourceMapId`);
    validateSourceReferences(field.sourceReferences, `$.sourceMappedFields[${index}].sourceReferences`, issues, true);

    if (!isRecord(field.label)) {
      issues.push({
        code: "missing_object",
        message: "sourceMappedFields label must be an object.",
        path: `$.sourceMappedFields[${index}].label`
      });
      return;
    }

    readLocale(field.label, "locale", issues, `$.sourceMappedFields[${index}].label.locale`);
    readRequiredString(field.label, "messageKey", issues, `$.sourceMappedFields[${index}].label.messageKey`);
    readRequiredString(field.label, "text", issues, `$.sourceMappedFields[${index}].label.text`);
  });
};

const validateSourceReferences = (
  value: unknown,
  path: string,
  issues: CountryPackNotificationEnvelopeValidationIssue[],
  requireNonEmpty: boolean
) => {
  if (!Array.isArray(value)) {
    issues.push({
      code: "missing_object",
      message: `${path} must be an array.`,
      path
    });
    return;
  }

  if (requireNonEmpty && value.length === 0) {
    issues.push({
      code: "empty_array",
      message: `${path} must include at least one source reference.`,
      path
    });
  }

  value.forEach((reference, index) => {
    if (!isRecord(reference)) {
      issues.push({
        code: "missing_object",
        message: `${path}[${index}] must be an object.`,
        path: `${path}[${index}]`
      });
    }
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export interface Nis2CountryPack {
  countryCode: EuCountryCode;
  packVersion: string;
  completeness: CountryPackCompleteness;
  sourceRecords: RegulatorySourceRecord[];

  getApplicableSectors(): SectorCatalog;
  getRegistrationRules(input: BusinessProfile): RegistrationRule[];
  getClassification(input: ClassificationInput): Promise<ClassificationResult>;
  getIncidentReportingRules(input: IncidentContext): IncidentReportingRule[];
  getAuthorities(input: AuthorityLookupInput): NationalAuthority[];
  getEvidenceRequirements(input: EvidenceRequirementInput): EvidenceRequirement[];
  getLocalControlsOverlay(): ComplianceControlOverlay[];
  getUnsupportedFeatures(): UnsupportedCountryFeature[];
}

export interface MemberStateSeedLike {
  countryCode: string;
  countryName?: string;
  name?: string;
  countryPackStatus: CountryPackImplementationStatus;
  lastSourceReviewedAt: string | null;
  nextReviewDueAt: string | null;
}

export interface CountryPackStatus {
  countryCode: string;
  countryName: string;
  packVersion: string;
  countryPackStatus: CountryPackImplementationStatus;
  completeness: CountryPackCompleteness;
  sourceActivationDefault: RegulatorySourceActivationStatus;
  lastSourceReviewedAt: string | null;
  nextReviewDueAt: string | null;
  unsupportedFeatures: UnsupportedCountryFeature[];
}

export const baselineOnlyUnsupportedFeatures: UnsupportedCountryFeature[] = [
  {
    featureKey: "registration_rules",
    reason: "National registration workflow has not been researched for this country pack."
  },
  {
    featureKey: "classification_rules",
    reason: "National classification rules have not been researched for this country pack."
  },
  {
    featureKey: "incident_reporting_overrides",
    reason: "National incident reporting overrides have not been researched for this country pack."
  },
  {
    featureKey: "national_authorities",
    reason: "Competent authority and CSIRT routing still require official-source review."
  },
  {
    featureKey: "local_control_overlay",
    reason: "Local control overlays have not been source-mapped for this country pack."
  }
];

export const plannedFullPackUnsupportedFeatures: UnsupportedCountryFeature[] = [
  {
    featureKey: "full_pack_pending",
    reason: "A full country pack is planned, but activation still requires source validation and review."
  }
];

export const buildCountryPackStatus = (memberState: MemberStateSeedLike): CountryPackStatus => {
  const countryPackStatus = memberState.countryPackStatus;

  return {
    countryCode: memberState.countryCode,
    countryName: memberState.countryName ?? memberState.name ?? memberState.countryCode,
    packVersion: "0.1.0",
    countryPackStatus,
    completeness: toCompleteness(countryPackStatus),
    sourceActivationDefault: changedLegalLogicDefaultStatus,
    lastSourceReviewedAt: memberState.lastSourceReviewedAt,
    nextReviewDueAt: memberState.nextReviewDueAt,
    unsupportedFeatures: unsupportedFeaturesFor(countryPackStatus)
  };
};

export const buildCountryPackStatuses = (memberStates: readonly MemberStateSeedLike[]): CountryPackStatus[] =>
  memberStates.map(buildCountryPackStatus);

const toCompleteness = (status: CountryPackImplementationStatus): CountryPackCompleteness =>
  status === "planned_full_pack" ? "official_sources_identified" : status;

const unsupportedFeaturesFor = (status: CountryPackImplementationStatus): UnsupportedCountryFeature[] => {
  if (status === "full_pack_ready") {
    return [];
  }

  if (status === "planned_full_pack") {
    return plannedFullPackUnsupportedFeatures;
  }

  if (status === "baseline_only" || status === "official_sources_identified") {
    return baselineOnlyUnsupportedFeatures;
  }

  return [
    {
      featureKey: "full_pack_pending",
      reason: "Country-pack data is partial and requires review before unsupported features can be cleared."
    }
  ];
};
