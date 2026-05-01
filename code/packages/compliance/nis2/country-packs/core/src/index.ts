import {
  changedLegalLogicDefaultStatus,
  type RegulatorySourceActivationStatus,
  type RegulatorySourceRecord
} from "@puresoc/regulatory-sources";
import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  resolveLegalCaveatMessage,
  resolvePureSocLocale,
  type PureSocLocale
} from "@puresoc/shared";

export {
  LEGAL_CAVEAT_MESSAGE_KEY,
  PURESOC_LEGAL_CAVEAT,
  resolveLegalCaveatMessage,
  resolvePureSocLocale,
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

export interface CountryPackLocalizedMessage {
  locale: PureSocLocale;
  messageKey: string;
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
  legalCaveatFallbackUsed: boolean;
  legalCaveatLocale: PureSocLocale;
  legalCaveatMessageKey: typeof LEGAL_CAVEAT_MESSAGE_KEY;
  locale: PureSocLocale;
  notificationType: CountryPackNotificationType;
  payload: TPayload;
  payloadSchemaKey: string;
  payloadSchemaVersion: string;
  sourceMappedFields: readonly CountryPackNotificationSourceMappedField[];
  sourceReferences: readonly unknown[];
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
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatMessageKey: LEGAL_CAVEAT_MESSAGE_KEY,
    locale,
    notificationType: input.notificationType,
    payload: input.payload,
    payloadSchemaKey: input.payloadSchemaKey,
    payloadSchemaVersion: input.payloadSchemaVersion,
    sourceMappedFields: input.sourceMappedFields ?? [],
    sourceReferences: input.sourceReferences ?? []
  };
};

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
