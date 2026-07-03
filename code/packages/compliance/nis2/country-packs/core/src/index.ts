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

export {
  buildCommonNis2OnboardingCountryPack,
  nis2CommonOnboardingFieldDefinitions,
  nis2CommonOnboardingScreens,
  requiredFieldKeysForPack,
  requiredFieldKeysForScreen,
  sanitizeNis2OnboardingContractForCustomer,
  type Nis2CountryPackOnboardingContract,
  type Nis2CountrySpecificQuestion,
  type Nis2OnboardingClassificationAdapter,
  type Nis2OnboardingClassificationAdapterKey,
  type Nis2OnboardingCountryCode,
  type Nis2OnboardingFieldDefinition,
  type Nis2OnboardingFieldOption,
  type Nis2OnboardingFieldType,
  type Nis2OnboardingNotificationDraftCapabilities,
  type Nis2OnboardingRequiredPolicy,
  type Nis2OnboardingScreenDefinition,
  type Nis2OnboardingServiceCatalog,
  type Nis2OnboardingServiceCatalogOption,
  type Nis2OnboardingSourceReviewStatus,
  type Nis2OnboardingValidationHints
} from "./onboarding-model";
export {
  buildNis2CountryPackOnboardingRegistry,
  type Nis2CountryPackOnboardingRegistry
} from "./country-pack-registry";

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

export type Nis2CountryPackLifecycleStatus = "demo" | "reviewed" | "active" | "retired";

export type Nis2StructuredClassificationOutcome =
  | "likely_essential_entity"
  | "likely_important_entity"
  | "possibly_in_scope"
  | "probably_outside_scope"
  | "legal_review_required";

export interface Nis2OfficialSourceReference {
  id: string;
  title: string;
  url: string;
  retrievedAt: string;
  trustLevel: "primary" | "secondary";
  notes?: string;
}

export interface Nis2DynamicQuestion {
  key: string;
  label: string;
  answerType: "boolean" | "choice" | "multi_choice" | "number" | "text";
  appliesToSectors?: readonly string[];
  choices?: readonly string[];
  sourceIds: readonly string[];
}

export interface Nis2CountryPackClassificationRule {
  id: string;
  version: string;
  outcome: Nis2StructuredClassificationOutcome;
  plainLanguage: string;
  confidence: "low" | "medium" | "high";
  legalReviewRequired: boolean;
  match: {
    minEmployees?: number;
    maxEmployees?: number;
    sectors?: readonly string[];
    services?: readonly string[];
    publicAdministration?: boolean;
    telecomProvider?: boolean;
  };
  sourceIds: readonly string[];
}

export type Nis2CountryPackOperationalDifferenceArea =
  | "authority_routing"
  | "classification"
  | "implementation_timeline"
  | "incident_reporting"
  | "registration"
  | "security_obligations";

export type Nis2CountryPackOperationalDifferenceReviewStatus =
  | "active"
  | "reviewed"
  | "review_required"
  | "source_identified";

export interface Nis2CountryPackOperationalDifference {
  area: Nis2CountryPackOperationalDifferenceArea;
  key: string;
  reviewStatus: Nis2CountryPackOperationalDifferenceReviewStatus;
  sourceIds: readonly string[];
  summary: string;
  title: string;
}

export interface Nis2CountryPackDefinition {
  countryCode: EuCountryCode | "EU";
  displayName: string;
  packVersion: string;
  effectiveDate: string;
  status: Nis2CountryPackLifecycleStatus;
  extendsBasePackVersion?: string;
  supportedUiLanguages: readonly string[];
  authorityGuidance: readonly string[];
  officialSources: readonly Nis2OfficialSourceReference[];
  nationalTerminology: Record<string, string>;
  registrationGuidance: readonly string[];
  operationalDifferences: readonly Nis2CountryPackOperationalDifference[];
  sectorRules: readonly string[];
  sizeThresholds: readonly string[];
  specialInclusionRules: readonly string[];
  dynamicQuestions: readonly Nis2DynamicQuestion[];
  classificationRules: readonly Nis2CountryPackClassificationRule[];
  reportLanguage: {
    classificationDisclaimer: string;
    readinessDisclaimer: string;
  };
  disclaimers: readonly string[];
}

export interface Nis2CountryPackValidationIssue {
  code: "empty_array" | "invalid_country" | "invalid_status" | "missing_source" | "missing_string";
  message: string;
  path: string;
}

export interface Nis2CountryPackValidationResult {
  issues: Nis2CountryPackValidationIssue[];
  valid: boolean;
}

export interface Nis2CountryPackClassificationInput {
  employeeCount?: number;
  publicAdministration?: boolean;
  sector?: string;
  services?: readonly string[];
  telecomProvider?: boolean;
}

export interface Nis2CountryPackStructuredClassification {
  result: Nis2StructuredClassificationOutcome;
  matchedRules: readonly string[];
  legalBasisReferences: readonly Nis2OfficialSourceReference[];
  assumptions: readonly string[];
  missingInformation: readonly string[];
  explanation: string;
  confidence: "low" | "medium" | "high";
  legalReviewRequired: boolean;
}

export const euNis2BasePack: Nis2CountryPackDefinition = {
  countryCode: "EU",
  displayName: "EU NIS2 baseline",
  packVersion: "2026.06.demo",
  effectiveDate: "2022-12-27",
  status: "active",
  supportedUiLanguages: ["en"],
  authorityGuidance: ["Directive (EU) 2022/2555 is the shared baseline; Member State rules decide national registration and classification details."],
  officialSources: [
    {
      id: "eu-nis2-directive-2022-2555",
      title: "Directive (EU) 2022/2555",
      url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng",
      retrievedAt: "2026-06-19",
      trustLevel: "primary",
      notes: "Official EU NIS2 directive source. Runtime legal logic remains country-pack owned."
    }
  ],
  nationalTerminology: {
    essentialEntity: "Essential entity",
    importantEntity: "Important entity"
  },
  registrationGuidance: ["Use the active Member State country pack for national registration paths."],
  operationalDifferences: [],
  sectorRules: [
    "energy",
    "transport",
    "health",
    "drinking_water",
    "waste_water",
    "digital_infrastructure",
    "ict_service_management",
    "public_administration",
    "space",
    "postal_services",
    "waste_management",
    "chemicals",
    "food",
    "manufacturing",
    "digital_providers",
    "research"
  ],
  sizeThresholds: ["EU baseline size concepts are country-applied; use national transposition and legal review."],
  specialInclusionRules: ["Public administration, critical dependency, sole-provider, telecom, trust, DNS, cloud, data centre, and managed-service facts can change applicability."],
  dynamicQuestions: [
    {
      key: "eu.nis2.sector",
      label: "Which NIS2 sector best matches the organization's real activity?",
      answerType: "choice",
      choices: ["food", "manufacturing", "ict_service_management", "digital_infrastructure", "health", "public_administration", "none_or_unknown"],
      sourceIds: ["eu-nis2-directive-2022-2555"]
    },
    {
      key: "eu.nis2.critical_dependency",
      label: "Would disruption create critical societal or economic dependency?",
      answerType: "boolean",
      sourceIds: ["eu-nis2-directive-2022-2555"]
    }
  ],
  classificationRules: [
    {
      id: "eu-demo-sector-possible-scope",
      version: "2026.06",
      outcome: "possibly_in_scope",
      plainLanguage: "The activity matches a NIS2 sector, but national law and size thresholds decide the likely category.",
      confidence: "low",
      legalReviewRequired: true,
      match: {
        sectors: ["food", "manufacturing", "ict_service_management", "digital_infrastructure", "health", "public_administration"]
      },
      sourceIds: ["eu-nis2-directive-2022-2555"]
    }
  ],
  reportLanguage: {
    classificationDisclaimer: "EU baseline classification is not a binding legal determination.",
    readinessDisclaimer: "Readiness outputs are internal assessment guidance, not legal advice or certification."
  },
  disclaimers: ["Use a reviewed national country pack before making legal or registration decisions."]
};

export const polandNis2DemoCountryPack: Nis2CountryPackDefinition = {
  countryCode: "PL",
  displayName: "Poland KSC NIS2 demo pack",
  packVersion: "2026.06.demo",
  effectiveDate: "2026-04-03",
  status: "demo",
  extendsBasePackVersion: euNis2BasePack.packVersion,
  supportedUiLanguages: ["en", "pl"],
  authorityGuidance: ["Polish KSC guidance describes key and important entities, self-identification, and S46/Wykaz KSC registration."],
  officialSources: [
    {
      id: "pl-ksc-amendment-overview-2026",
      title: "KSC amendment overview",
      url: "https://www.gov.pl/web/baza-wiedzy/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa",
      retrievedAt: "2026-07-02",
      trustLevel: "primary",
      notes: "Gov.pl overview dated 2026-04-14 says the amendment entered into force on 2026-04-03 and describes registration, adaptation, and audit deadlines."
    },
    {
      id: "pl-ksc-covered-entities-2026",
      title: "KSC covered entities guidance",
      url: "https://www.gov.pl/web/cyfryzacja/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc---kogo-obejmuje",
      retrievedAt: "2026-07-02",
      trustLevel: "primary",
      notes: "Gov.pl guidance dated 2026-04-20 describes sectors and 12-month adaptation period."
    },
    {
      id: "pl-ksc-self-identification-2026",
      title: "KSC self-identification guidance",
      url: "https://www.gov.pl/web/baza-wiedzy/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc---jak-dokonac-samoidentyfikacji",
      retrievedAt: "2026-07-02",
      trustLevel: "primary",
      notes: "Gov.pl guidance dated 2026-04-27 describes activity, PKD, and size as self-identification inputs."
    },
    {
      id: "pl-ksc-self-registration-2026",
      title: "KSC self-registration guidance",
      url: "https://www.gov.pl/web/baza-wiedzy/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc---uruchamiamy-samorejestracje-w-wykazie-podmiotow-kluczowych-i-podmiotow-waznych-sprawdz-jak-dokonac-wpisu",
      retrievedAt: "2026-07-02",
      trustLevel: "primary",
      notes: "Gov.pl guidance dated 2026-05-07 describes self-registration in Wykaz KSC."
    },
    {
      id: "pl-ksc-act-consolidated-2026",
      title: "Act on the national cybersecurity system, consolidated text",
      url: "https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20180001560/U/D20181560Lj.pdf",
      retrievedAt: "2026-07-02",
      trustLevel: "primary",
      notes: "ISAP/Kancelaria Sejmu consolidated text dated 2026-03-24. Stored as source metadata only until legal review activates national logic."
    }
  ],
  nationalTerminology: {
    essentialEntity: "Podmiot kluczowy",
    importantEntity: "Podmiot wazny",
    register: "Wykaz KSC"
  },
  registrationGuidance: [
    "Demo guidance: entities use self-identification and, where applicable, Wykaz KSC in System S46 registration.",
    "Self-registration is source-mapped as a May 7, 2026 to October 3, 2026 operational window, with statutory timing still requiring legal review.",
    "Do not treat this pack as legal advice until reviewed and activated."
  ],
  operationalDifferences: [
    {
      area: "implementation_timeline",
      key: "pl.ksc.effective_and_transition_dates",
      title: "KSC amendment date and transition obligations",
      summary:
        "Poland's KSC amendment entered into force on 2026-04-03. Existing qualifying entities are source-mapped with a 12-month SZBI adaptation path and a first-audit path for key entities, both still review-required in PureSOC.",
      reviewStatus: "review_required",
      sourceIds: ["pl-ksc-amendment-overview-2026"]
    },
    {
      area: "registration",
      key: "pl.ksc.wykaz_registration_window",
      title: "Wykaz KSC/S46 registration route",
      summary:
        "Self-registration in Wykaz KSC is available for applicable non-ex-officio entities from 2026-05-07 through 2026-10-03; the consolidated Act also contains a six-month application rule after criteria are met.",
      reviewStatus: "review_required",
      sourceIds: ["pl-ksc-self-registration-2026", "pl-ksc-act-consolidated-2026"]
    },
    {
      area: "registration",
      key: "pl.ksc.ex_officio_registration",
      title: "Ex officio entries use a different path",
      summary:
        "Public entities, telecommunications entrepreneurs, trust service providers, and former key-service operators are identified as ex-officio entry groups and should not be modeled as ordinary self-registration-only customers.",
      reviewStatus: "review_required",
      sourceIds: ["pl-ksc-self-identification-2026", "pl-ksc-self-registration-2026"]
    },
    {
      area: "classification",
      key: "pl.ksc.self_identification_inputs",
      title: "Self-identification depends on activity, PKD, size, and Art. 5",
      summary:
        "Polish guidance tells entities to evaluate real activity first, use PKD only as support, include linked and partner enterprises in size, and then analyze Art. 5 special cases.",
      reviewStatus: "review_required",
      sourceIds: ["pl-ksc-self-identification-2026", "pl-ksc-act-consolidated-2026"]
    },
    {
      area: "classification",
      key: "pl.ksc.telecom_all_sizes",
      title: "Telecommunications has explicit all-size handling",
      summary:
        "Polish guidance marks telecommunications entrepreneurs as subject to the Act regardless of size, with medium/large and small/micro routes mapped differently in the demo classifier.",
      reviewStatus: "review_required",
      sourceIds: ["pl-ksc-self-identification-2026"]
    },
    {
      area: "incident_reporting",
      key: "pl.ksc.s46_csirt_routing",
      title: "Wykaz KSC data feeds CSIRT and authority routing",
      summary:
        "Wykaz KSC/S46 is source-mapped as the collaboration and incident-obligation route, with data available to CSIRT MON, CSIRT NASK, CSIRT GOV, sector CSIRTs, and competent authorities.",
      reviewStatus: "review_required",
      sourceIds: ["pl-ksc-self-registration-2026", "pl-ksc-act-consolidated-2026"]
    }
  ],
  sectorRules: [
    "telecommunications",
    "energy",
    "transport",
    "banking_financial_market_infrastructure",
    "health",
    "drinking_water",
    "waste_water",
    "digital_infrastructure",
    "ict_service_management",
    "space",
    "public_administration",
    "postal_services",
    "waste_management",
    "chemicals",
    "food",
    "manufacturing",
    "digital_providers",
    "research"
  ],
  sizeThresholds: [
    "Use micro, small, medium, and large thresholds from official Polish self-identification guidance; group and partner enterprises may affect size.",
    "Telecommunications entrepreneurs are source-mapped as subject to the Act regardless of size, with legal review still required."
  ],
  specialInclusionRules: [
    "Telecommunications providers and public entities can require special handling.",
    "Art. 5 may include entities regardless of ordinary size thresholds. Legal review is required."
  ],
  dynamicQuestions: [
    {
      key: "pl.ksc.pkd_or_activity",
      label: "Which PKD code or real activity best describes the customer?",
      answerType: "text",
      sourceIds: ["pl-ksc-self-identification-2026"]
    },
    {
      key: "pl.ksc.telecom_provider",
      label: "Is the customer a telecommunications entrepreneur?",
      answerType: "boolean",
      sourceIds: ["pl-ksc-self-identification-2026"]
    },
    {
      key: "pl.ksc.self_registration_path",
      label: "Is the customer already entered in Wykaz KSC or expected to self-register?",
      answerType: "choice",
      choices: ["already_entered", "self_registration_expected", "ex_officio_entry_expected", "not_expected", "unknown"],
      sourceIds: ["pl-ksc-self-registration-2026"]
    },
    {
      key: "pl.ksc.art5_special_case",
      label: "Could Art. 5 or a sector-specific rule include the customer outside ordinary size logic?",
      answerType: "boolean",
      sourceIds: ["pl-ksc-self-identification-2026", "pl-ksc-act-consolidated-2026"]
    }
  ],
  classificationRules: [
    {
      id: "pl-demo-telecom-provider",
      version: "2026.06",
      outcome: "likely_important_entity",
      plainLanguage: "Polish guidance calls out telecommunications entrepreneurs as a special group, but size and Art. 5 analysis still need review.",
      confidence: "medium",
      legalReviewRequired: true,
      match: {
        maxEmployees: 49,
        telecomProvider: true
      },
      sourceIds: ["pl-ksc-self-identification-2026"]
    },
    {
      id: "pl-demo-telecom-medium-large-key",
      version: "2026.06",
      outcome: "likely_essential_entity",
      plainLanguage:
        "Polish guidance maps medium and large telecommunications entrepreneurs to the key-entity path, but the demo pack still requires legal review before activation.",
      confidence: "medium",
      legalReviewRequired: true,
      match: {
        minEmployees: 50,
        telecomProvider: true
      },
      sourceIds: ["pl-ksc-self-identification-2026"]
    },
    {
      id: "pl-demo-food-or-manufacturing",
      version: "2026.06",
      outcome: "possibly_in_scope",
      plainLanguage: "Food or manufacturing activity appears in the expanded KSC sector discussion, but this demo rule requires source review before activation.",
      confidence: "low",
      legalReviewRequired: true,
      match: {
        sectors: ["food", "manufacturing"]
      },
      sourceIds: ["pl-ksc-amendment-overview-2026", "pl-ksc-covered-entities-2026"]
    }
  ],
  reportLanguage: {
    classificationDisclaimer: "This is a demo KSC/NIS2 self-identification aid, not a legal classification.",
    readinessDisclaimer: "Readiness output remains internal guidance and must be reviewed before registration decisions."
  },
  disclaimers: ["Poland pack status is demo. All national conclusions require legal review before activation."]
};

export const germanyNis2DemoCountryPack: Nis2CountryPackDefinition = {
  countryCode: "DE",
  displayName: "Germany BSI NIS2 demo pack",
  packVersion: "2026.06.demo",
  effectiveDate: "2025-12-06",
  status: "demo",
  extendsBasePackVersion: euNis2BasePack.packVersion,
  supportedUiLanguages: ["en", "de"],
  authorityGuidance: ["BSI guidance and BSI portal registration/reporting paths are the demo source anchors."],
  officialSources: [
    {
      id: "de-bsi-regulated-companies",
      title: "BSI NIS-2 regulated companies page",
      url: "https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/nis-2-regulierte-unternehmen_node.html",
      retrievedAt: "2026-06-19",
      trustLevel: "primary",
      notes: "Official BSI source metadata retained for reviewed implementation."
    },
    {
      id: "de-bsi-portal-nis2-registration",
      title: "BSI portal NIS-2 registration information",
      url: "https://mip2.bsi.bund.de/en/info-nis2-registrierung/",
      retrievedAt: "2026-07-02",
      trustLevel: "primary",
      notes: "BSI portal page says requirements apply from 2025-12-06, NIS-2 registration is exclusively through the BSI portal, and MIP2 is not the NIS-2 registration route."
    },
    {
      id: "de-bsi-registration-instructions",
      title: "BSI NIS-2 registration instructions",
      url: "https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/NIS-2-Anleitung-Registrierung/Anleitung-Registrierung_node.html",
      retrievedAt: "2026-06-19",
      trustLevel: "primary",
      notes: "Official BSI registration-instruction source metadata retained for reviewed implementation."
    },
    {
      id: "de-mip2-faq-2026",
      title: "BSI MIP2 FAQ",
      url: "https://mip2.bsi.bund.de/en/faq/",
      retrievedAt: "2026-07-02",
      trustLevel: "primary",
      notes: "Official BSI MIP2 FAQ metadata for KRITIS/federal transition behaviors and portal limitations."
    },
    {
      id: "de-mip2-reporting-points-2026",
      title: "BSI MIP2 reporting points overview",
      url: "https://mip2.bsi.bund.de/en/meldestellen-uebersicht/",
      retrievedAt: "2026-07-02",
      trustLevel: "primary",
      notes: "Official BSI MIP2 reporting-point overview. NIS-2 BSI Portal route remains distinct from MIP2."
    },
    {
      id: "de-ec-nis2-country-page-2025",
      title: "European Commission NIS2 implementation in Germany",
      url: "https://digital-strategy.ec.europa.eu/en/policies/nis2-directive-germany",
      retrievedAt: "2026-07-02",
      trustLevel: "secondary",
      notes: "Commission country page was last updated on 2025-07-07 and is retained for authority contact metadata, not as current German operational law."
    }
  ],
  nationalTerminology: {
    essentialEntity: "Besonders wichtige Einrichtung",
    importantEntity: "Wichtige Einrichtung",
    bsiPortal: "BSI Portal",
    mip2: "MIP2"
  },
  registrationGuidance: [
    "Demo guidance: NIS-2 registration and reporting for covered companies and public authorities is source-mapped to the BSI Portal, not MIP2.",
    "MIP2 remains relevant for KRITIS operators and federal authorities during transition workflows.",
    "This pack does not submit registrations or reports."
  ],
  operationalDifferences: [
    {
      area: "implementation_timeline",
      key: "de.nis2.implementation_act_effective",
      title: "Implementation Act effective date",
      summary:
        "The BSI portal source says NIS-2 implementation requirements apply from 2025-12-06. PureSOC keeps this as demo metadata until German legal review activates the pack.",
      reviewStatus: "review_required",
      sourceIds: ["de-bsi-portal-nis2-registration"]
    },
    {
      area: "registration",
      key: "de.bsi.portal_exclusive_registration",
      title: "NIS-2 registration is through BSI Portal",
      summary:
        "BSI states that NIS-2 registration is carried out exclusively via the BSI Portal provided for that purpose and not via MIP2.",
      reviewStatus: "review_required",
      sourceIds: ["de-bsi-portal-nis2-registration"]
    },
    {
      area: "incident_reporting",
      key: "de.bsi.portal_reporting_route",
      title: "BSI Portal is the general NIS-2 reporting route",
      summary:
        "The BSI Portal source covers companies and public authorities for security-incident reports, while non-covered companies may voluntarily report incidents there.",
      reviewStatus: "review_required",
      sourceIds: ["de-bsi-portal-nis2-registration"]
    },
    {
      area: "authority_routing",
      key: "de.mip2.kritis_federal_transition",
      title: "KRITIS and federal authorities keep MIP2 transition paths",
      summary:
        "KRITIS operators and federal authorities continue using MIP2 as their primary reporting route during the transition; duplicate reporting via BSI Portal is not required.",
      reviewStatus: "review_required",
      sourceIds: ["de-bsi-portal-nis2-registration", "de-mip2-reporting-points-2026"]
    },
    {
      area: "authority_routing",
      key: "de.ec.bsi_single_authority_metadata",
      title: "BSI is the main authority contact in Commission metadata",
      summary:
        "The European Commission country page lists BSI as single point of contact, competent authority for OES/DSPs, and national CSIRT, but the page is stale and not sufficient for current operational rules.",
      reviewStatus: "source_identified",
      sourceIds: ["de-ec-nis2-country-page-2025"]
    }
  ],
  sectorRules: [
    "energy",
    "transport",
    "finance",
    "health",
    "drinking_water",
    "waste_water",
    "digital_infrastructure",
    "ict_service_management",
    "space",
    "public_administration",
    "postal_services",
    "waste_management",
    "chemicals",
    "food",
    "manufacturing",
    "digital_providers",
    "research"
  ],
  sizeThresholds: [
    "Use German implementation-act size and sector rules after legal review.",
    "PureSOC does not currently encode German 'important' versus 'especially important' thresholds as active logic."
  ],
  specialInclusionRules: [
    "Public authorities, KRITIS operators, federal authority routes, and BSI Portal/MIP2 transition rules require separate review."
  ],
  dynamicQuestions: [
    {
      key: "de.bsi.portal_route",
      label: "Does the customer expect to use the BSI Portal for NIS-2 registration or reporting?",
      answerType: "choice",
      choices: ["yes", "no", "unknown"],
      sourceIds: ["de-bsi-portal-nis2-registration"]
    },
    {
      key: "de.bsi.kritis_or_public",
      label: "Is the customer a KRITIS operator, federal authority, or public authority with a transition route?",
      answerType: "boolean",
      sourceIds: ["de-bsi-portal-nis2-registration", "de-mip2-reporting-points-2026"]
    },
    {
      key: "de.bsi.sector",
      label: "Which regulated sector best matches the customer?",
      answerType: "choice",
      choices: ["food", "manufacturing", "ict_service_management", "digital_infrastructure", "health", "public_administration", "other_or_unknown"],
      sourceIds: ["de-bsi-regulated-companies"]
    },
    {
      key: "de.bsi.bsi_portal_or_mip2",
      label: "Is the operational route BSI Portal, MIP2 KRITIS/federal transition, or still unknown?",
      answerType: "choice",
      choices: ["bsi_portal", "mip2_kritis_or_federal", "unknown"],
      sourceIds: ["de-bsi-portal-nis2-registration", "de-mip2-faq-2026"]
    }
  ],
  classificationRules: [
    {
      id: "de-demo-public-administration",
      version: "2026.06",
      outcome: "possibly_in_scope",
      plainLanguage: "Public-sector context may affect German NIS-2 routing, but the demo pack does not make a binding determination.",
      confidence: "low",
      legalReviewRequired: true,
      match: {
        publicAdministration: true
      },
      sourceIds: ["de-bsi-portal-nis2-registration"]
    },
    {
      id: "de-demo-food-manufacturing",
      version: "2026.06",
      outcome: "possibly_in_scope",
      plainLanguage: "Food or manufacturing activity should be reviewed against German NIS-2 sector and size rules.",
      confidence: "low",
      legalReviewRequired: true,
      match: {
        sectors: ["food", "manufacturing"]
      },
      sourceIds: ["de-bsi-regulated-companies"]
    }
  ],
  reportLanguage: {
    classificationDisclaimer: "This German demo pack is not a binding NIS-2 classification.",
    readinessDisclaimer: "Readiness output is internal planning guidance and not certification."
  },
  disclaimers: ["Germany pack status is demo. Registration guidance is metadata-only until legal review."]
};

export const demoCountryPackDefinitions = [
  euNis2BasePack,
  polandNis2DemoCountryPack,
  germanyNis2DemoCountryPack
] as const;

export const validateNis2CountryPackDefinition = (
  pack: Nis2CountryPackDefinition
): Nis2CountryPackValidationResult => {
  const issues: Nis2CountryPackValidationIssue[] = [];
  if (!pack.countryCode || (!isEuCountryCode(pack.countryCode) && pack.countryCode !== "EU")) {
    issues.push({
      code: "invalid_country",
      message: "countryCode must be EU or an EU Member State country code.",
      path: "$.countryCode"
    });
  }
  if (!pack.displayName) {
    issues.push({ code: "missing_string", message: "displayName is required.", path: "$.displayName" });
  }
  if (!pack.packVersion) {
    issues.push({ code: "missing_string", message: "packVersion is required.", path: "$.packVersion" });
  }
  if (!["demo", "reviewed", "active", "retired"].includes(pack.status)) {
    issues.push({ code: "invalid_status", message: "status is not supported.", path: "$.status" });
  }
  for (const [key, value] of Object.entries({
    officialSources: pack.officialSources,
    dynamicQuestions: pack.dynamicQuestions,
    classificationRules: pack.classificationRules,
    disclaimers: pack.disclaimers
  })) {
    if (value.length === 0) {
      issues.push({ code: "empty_array", message: `${key} must not be empty.`, path: `$.${key}` });
    }
  }
  const sourceIds = new Set(pack.officialSources.map((source) => source.id));
  for (const question of pack.dynamicQuestions) {
    for (const sourceId of question.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          code: "missing_source",
          message: `Question ${question.key} references missing source ${sourceId}.`,
          path: `$.dynamicQuestions.${question.key}.sourceIds`
        });
      }
    }
  }
  for (const rule of pack.classificationRules) {
    for (const sourceId of rule.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          code: "missing_source",
          message: `Rule ${rule.id} references missing source ${sourceId}.`,
          path: `$.classificationRules.${rule.id}.sourceIds`
        });
      }
    }
  }
  for (const difference of pack.operationalDifferences) {
    for (const sourceId of difference.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          code: "missing_source",
          message: `Operational difference ${difference.key} references missing source ${sourceId}.`,
          path: `$.operationalDifferences.${difference.key}.sourceIds`
        });
      }
    }
  }

  return {
    issues,
    valid: issues.length === 0
  };
};

export const classifyWithNis2CountryPack = (
  pack: Nis2CountryPackDefinition,
  input: Nis2CountryPackClassificationInput
): Nis2CountryPackStructuredClassification => {
  const matchedRules = pack.classificationRules.filter((rule) => matchesCountryPackRule(rule, input));
  const strongest = matchedRules[0];
  const missingInformation = [
    input.sector ? null : "sector",
    typeof input.employeeCount === "number" ? null : "employee_count"
  ].filter((value): value is string => Boolean(value));

  if (!strongest) {
    return {
      result: missingInformation.length > 0 ? "legal_review_required" : "probably_outside_scope",
      matchedRules: [],
      legalBasisReferences: pack.officialSources.slice(0, 1),
      assumptions: ["No demo country-pack rule matched the provided profile."],
      missingInformation,
      explanation:
        missingInformation.length > 0
          ? "The country pack needs more business context before it can return a useful preliminary result."
          : "No demo rule matched. This does not prove the entity is outside scope.",
      confidence: "low",
      legalReviewRequired: true
    };
  }

  const sourceById = new Map(pack.officialSources.map((source) => [source.id, source]));
  return {
    result: strongest.outcome,
    matchedRules: matchedRules.map((rule) => rule.id),
    legalBasisReferences: strongest.sourceIds.map((sourceId) => sourceById.get(sourceId)).filter(Boolean) as Nis2OfficialSourceReference[],
    assumptions: [`Pack status is ${pack.status}.`, "Classification language is preliminary and non-binding."],
    missingInformation,
    explanation: strongest.plainLanguage,
    confidence: strongest.confidence,
    legalReviewRequired: strongest.legalReviewRequired || pack.status !== "active"
  };
};

const matchesCountryPackRule = (
  rule: Nis2CountryPackClassificationRule,
  input: Nis2CountryPackClassificationInput
): boolean => {
  if (rule.match.publicAdministration !== undefined && rule.match.publicAdministration !== Boolean(input.publicAdministration)) {
    return false;
  }
  if (rule.match.telecomProvider !== undefined && rule.match.telecomProvider !== Boolean(input.telecomProvider)) {
    return false;
  }
  if (rule.match.minEmployees !== undefined && (input.employeeCount ?? -1) < rule.match.minEmployees) {
    return false;
  }
  if (rule.match.maxEmployees !== undefined && (input.employeeCount ?? Number.MAX_SAFE_INTEGER) > rule.match.maxEmployees) {
    return false;
  }
  if (rule.match.sectors && (!input.sector || !rule.match.sectors.includes(input.sector))) {
    return false;
  }
  if (rule.match.services) {
    const services = new Set(input.services ?? []);
    if (!rule.match.services.some((service) => services.has(service))) {
      return false;
    }
  }
  return true;
};

const isEuCountryCode = (value: string): value is EuCountryCode =>
  [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE"
  ].includes(value);

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
