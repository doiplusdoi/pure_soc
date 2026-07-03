export type Nis2OnboardingCountryCode = "RO" | "PL" | "DE";

interface Nis2OnboardingSourceReference {
  id: string;
  title: string;
  url: string;
  retrievedAt: string;
  trustLevel: "primary" | "secondary";
  notes?: string;
}

interface Nis2OnboardingSourceDynamicQuestion {
  key: string;
  label: string;
  answerType: "boolean" | "choice" | "multi_choice" | "number" | "text";
  choices?: readonly string[];
  sourceIds: readonly string[];
}

interface Nis2OnboardingSourcePackDefinition {
  countryCode: string;
  displayName: string;
  packVersion: string;
  effectiveDate: string;
  status: "demo" | "reviewed" | "active" | "retired";
  extendsBasePackVersion?: string;
  supportedUiLanguages: readonly string[];
  authorityGuidance: readonly string[];
  officialSources: readonly Nis2OnboardingSourceReference[];
  nationalTerminology: Record<string, string>;
  registrationGuidance: readonly string[];
  sectorRules: readonly string[];
  sizeThresholds: readonly string[];
  specialInclusionRules: readonly string[];
  dynamicQuestions: readonly Nis2OnboardingSourceDynamicQuestion[];
  classificationRules: readonly unknown[];
  reportLanguage: {
    classificationDisclaimer: string;
    readinessDisclaimer: string;
  };
  disclaimers: readonly string[];
}

interface Nis2OnboardingUnsupportedCountryFeature {
  featureKey:
    | "registration_rules"
    | "classification_rules"
    | "incident_reporting_overrides"
    | "national_authorities"
    | "local_control_overlay"
    | "full_pack_pending";
  reason: string;
}

export type Nis2OnboardingSourceReviewStatus = "active" | "reviewed" | "review_required" | "demo";

export type Nis2OnboardingClassificationAdapterKey = "common_structured" | "ro_workbook_backed";

export type Nis2OnboardingFieldType =
  | "boolean"
  | "email"
  | "multi_select"
  | "number"
  | "select"
  | "textarea"
  | "text"
  | "url";

export type Nis2OnboardingRequiredPolicy = "required" | "conditional" | "recommended" | "optional";

export interface Nis2OnboardingFieldOption {
  label: string;
  value: string;
}

export interface Nis2OnboardingValidationHints {
  helpText?: string;
  max?: number;
  min?: number;
  pattern?: string;
  placeholder?: string;
}

export interface Nis2OnboardingScreenDefinition {
  key: string;
  position: number;
  routePath: string;
  summary: string;
  title: string;
}

export interface Nis2OnboardingFieldDefinition {
  countryApplicability: readonly (Nis2OnboardingCountryCode | "EU" | "all")[];
  fallbackLabel: string;
  grouping: string;
  internalSourceReferences?: readonly Record<string, unknown>[];
  key: string;
  labelMessageKey: string;
  options?: readonly Nis2OnboardingFieldOption[];
  requiredPolicy: Nis2OnboardingRequiredPolicy;
  screenKey: string;
  type: Nis2OnboardingFieldType;
  validationHints?: Nis2OnboardingValidationHints;
}

export interface Nis2CountrySpecificQuestion {
  fallbackLabel: string;
  key: string;
  labelMessageKey: string;
  options?: readonly Nis2OnboardingFieldOption[];
  requiredPolicy: Nis2OnboardingRequiredPolicy;
  screenKey: string;
  type: Nis2OnboardingFieldType;
}

export interface Nis2OnboardingServiceCatalogOption {
  categoryLabel?: string;
  code: string;
  groupLabel?: string;
  label: string;
  sectorCode?: string;
  sectorLabel?: string;
}

export interface Nis2OnboardingServiceCatalog {
  options: readonly Nis2OnboardingServiceCatalogOption[];
  summary: string;
}

export interface Nis2OnboardingClassificationAdapter {
  key: Nis2OnboardingClassificationAdapterKey;
  label: string;
  legalReviewRequired: boolean;
}

export interface Nis2OnboardingNotificationDraftCapabilities {
  countryRegistrationDraft: boolean;
  directSubmission: false;
  notes: readonly string[];
}

export interface Nis2CountryPackOnboardingContract {
  classificationAdapter: Nis2OnboardingClassificationAdapter;
  countryCode: Nis2OnboardingCountryCode;
  countryNotes: readonly string[];
  countrySpecificQuestions: readonly Nis2CountrySpecificQuestion[];
  displayName: string;
  fieldDefinitions: readonly Nis2OnboardingFieldDefinition[];
  notificationDraftCapabilities: Nis2OnboardingNotificationDraftCapabilities;
  onboardingScreens: readonly Nis2OnboardingScreenDefinition[];
  packVersion: string;
  safeSourceSummary: string;
  serviceCatalog: Nis2OnboardingServiceCatalog;
  sourceReviewStatus: Nis2OnboardingSourceReviewStatus;
  status: Nis2OnboardingSourcePackDefinition["status"];
  supportedUiLanguages: readonly string[];
  unsupportedFeatures: readonly Nis2OnboardingUnsupportedCountryFeature[];
}

export const nis2CommonOnboardingScreens: readonly Nis2OnboardingScreenDefinition[] = [
  {
    key: "company",
    position: 1,
    routePath: "/onboarding/company",
    title: "Company identity",
    summary: "Legal identity and registration context for the readiness workspace."
  },
  {
    key: "locations",
    position: 2,
    routePath: "/onboarding/locations",
    title: "Locations and jurisdiction",
    summary: "Registered location, operating countries, and the selected NIS2 country pack."
  },
  {
    key: "contacts",
    position: 3,
    routePath: "/onboarding/contacts",
    title: "Contacts and responsibility",
    summary: "Operational, security, and management owners for readiness work."
  },
  {
    key: "size",
    position: 4,
    routePath: "/onboarding/size",
    title: "Size and legal structure",
    summary: "Employee count, size band, and organization structure signals."
  },
  {
    key: "services",
    position: 5,
    routePath: "/onboarding/services",
    title: "Sectors and services",
    summary: "The services and sectors that drive NIS2 scoping."
  },
  {
    key: "country-scope",
    position: 6,
    routePath: "/onboarding/country-scope",
    title: "Country-specific scope",
    summary: "National personalization questions from the selected country pack."
  },
  {
    key: "systems",
    position: 7,
    routePath: "/onboarding/systems",
    title: "Systems and public IPs",
    summary: "Critical systems, public IP ranges, and operational dependencies."
  },
  {
    key: "providers",
    position: 8,
    routePath: "/onboarding/providers",
    title: "Providers and connectors",
    summary: "Connected providers and important third-party dependencies."
  },
  {
    key: "security-baseline",
    position: 9,
    routePath: "/onboarding/security-baseline",
    title: "Security baseline",
    summary: "Manual declarations for governance, identity, continuity, and supplier controls."
  },
  {
    key: "evidence",
    position: 10,
    routePath: "/onboarding/evidence",
    title: "Evidence and documents",
    summary: "Evidence notes and document references used by internal readiness reports."
  },
  {
    key: "review",
    position: 11,
    routePath: "/onboarding/review",
    title: "Review and run analyzer",
    summary: "Review missing fields, acknowledge the caveat, then run the readiness analyzer."
  }
];

export const nis2CommonOnboardingFieldDefinitions: readonly Nis2OnboardingFieldDefinition[] = [
  field("company.legalName", "Company legal name", "company", "company_identity", "text", "required", {
    placeholder: "Example SRL"
  }),
  field("company.registrationNumber", "Trade or registration number", "company", "company_identity", "text", "recommended"),
  field("company.taxId", "Tax or national ID", "company", "company_identity", "text", "recommended"),
  field("company.countryCode", "Country pack", "locations", "jurisdiction", "select", "required", undefined, [
    { value: "RO", label: "Romania" },
    { value: "PL", label: "Poland" },
    { value: "DE", label: "Germany" }
  ]),
  field("locations.headquartersCountry", "Headquarters country", "locations", "jurisdiction", "select", "required", undefined, [
    { value: "RO", label: "Romania" },
    { value: "PL", label: "Poland" },
    { value: "DE", label: "Germany" },
    { value: "other_eu", label: "Other EU country" },
    { value: "non_eu", label: "Outside the EU" }
  ]),
  field("locations.headquartersCity", "Headquarters city", "locations", "jurisdiction", "text", "required"),
  field("business.countriesServed", "Countries served", "locations", "jurisdiction", "textarea", "required", {
    helpText: "List EU countries where the organization provides services."
  }),
  field("contacts.primaryName", "Primary contact name", "contacts", "responsibility", "text", "required"),
  field("contacts.primaryEmail", "Primary contact email", "contacts", "responsibility", "email", "required"),
  field("contacts.securityName", "Security responsible name", "contacts", "responsibility", "text", "required"),
  field("contacts.securityEmail", "Security responsible email", "contacts", "responsibility", "email", "required"),
  field("contacts.managementOwnerName", "Management owner", "contacts", "responsibility", "text", "recommended"),
  field("business.employeeCount", "Employee count", "size", "size", "number", "required", {
    min: 0
  }),
  field("size.sizeCategory", "Size category", "size", "size", "select", "required", undefined, [
    { value: "small_micro", label: "Small or micro" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" }
  ]),
  field("size.legalStructure", "Legal structure", "size", "size", "select", "recommended", undefined, [
    { value: "standalone", label: "Standalone company" },
    { value: "group_parent", label: "Group parent" },
    { value: "subsidiary", label: "Subsidiary" },
    { value: "public_body", label: "Public body" },
    { value: "other", label: "Other" }
  ]),
  field("business.sector", "Primary sector", "services", "services", "select", "required"),
  field("business.mainProductsServices", "Main products or services", "services", "services", "textarea", "required"),
  field("scope.activities", "Relevant services", "services", "services", "multi_select", "required"),
  field("scope.publicAdministration", "Public administration or public body", "country-scope", "country_scope", "boolean", "required"),
  field("scope.telecomProvider", "Telecommunications provider", "country-scope", "country_scope", "boolean", "required"),
  field("systems.systemsDescription", "Critical systems", "systems", "systems", "textarea", "required"),
  field("systems.publicIpRanges", "Public IP ranges", "systems", "systems", "textarea", "recommended", {
    helpText: "Use one range per line where possible."
  }),
  field("providers.microsoft365Usage", "Microsoft 365 usage", "providers", "providers", "select", "required", undefined, [
    { value: "not_connected", label: "Not connected yet" },
    { value: "email_collaboration", label: "Email and collaboration" },
    { value: "identity_devices_security", label: "Identity, devices, and security" },
    { value: "not_used", label: "Not used" }
  ]),
  field("dependencies.criticalSuppliers", "Critical suppliers", "providers", "providers", "textarea", "recommended"),
  field("governance.riskManagement", "Risk management", "security-baseline", "security_baseline", "textarea", "required"),
  field("governance.identityControls", "Identity and access controls", "security-baseline", "security_baseline", "textarea", "required"),
  field("governance.mfa", "MFA coverage", "security-baseline", "security_baseline", "select", "required", undefined, [
    { value: "implemented", label: "Implemented" },
    { value: "partial", label: "Partially implemented" },
    { value: "planned", label: "Planned" },
    { value: "not_started", label: "Not started" }
  ]),
  field("governance.supplyChainSecurity", "Supplier security", "security-baseline", "security_baseline", "textarea", "required"),
  field("dependencies.backupArrangements", "Backup arrangements", "security-baseline", "security_baseline", "textarea", "required"),
  field("dependencies.businessContinuity", "Business continuity", "security-baseline", "security_baseline", "textarea", "required"),
  field("dependencies.incidentResponse", "Incident response", "security-baseline", "security_baseline", "textarea", "required"),
  field("evidence.declaredControlEvidence", "Evidence notes", "evidence", "evidence", "textarea", "recommended"),
  field("attachedDocumentIds", "Document references", "evidence", "evidence", "textarea", "optional"),
  field("review.legalCaveatAcknowledged", "Internal-readiness caveat acknowledged", "review", "review", "boolean", "required")
];

export const buildCommonNis2OnboardingCountryPack = (
  pack: Nis2OnboardingSourcePackDefinition,
  options: {
    classificationAdapter?: Nis2OnboardingClassificationAdapter;
    countryNotes?: readonly string[];
    countrySpecificQuestions?: readonly Nis2CountrySpecificQuestion[];
    extraFieldDefinitions?: readonly Nis2OnboardingFieldDefinition[];
    notificationDraftCapabilities?: Partial<Nis2OnboardingNotificationDraftCapabilities>;
    safeSourceSummary?: string;
    serviceCatalog?: Nis2OnboardingServiceCatalog;
    sourceReviewStatus?: Nis2OnboardingSourceReviewStatus;
    unsupportedFeatures?: readonly Nis2OnboardingUnsupportedCountryFeature[];
  } = {}
): Nis2CountryPackOnboardingContract => {
  const countryCode = toSupportedOnboardingCountry(pack.countryCode);
  const countrySpecificQuestions =
    options.countrySpecificQuestions ?? pack.dynamicQuestions.map((question) => countryQuestionFromDynamicQuestion(question));
  const countryQuestionFields = countrySpecificQuestions.map(questionToFieldDefinition);
  const serviceCatalog = options.serviceCatalog ?? serviceCatalogFromCountryPack(pack);
  const commonFields = nis2CommonOnboardingFieldDefinitions.map((definition) =>
    definition.key === "business.sector"
      ? { ...definition, options: sectorOptionsFromPack(pack) }
      : definition.key === "scope.activities"
        ? { ...definition, options: serviceCatalog.options.map((option) => ({ value: option.code, label: option.label })) }
        : definition
  );

  return {
    classificationAdapter:
      options.classificationAdapter ?? {
        key: "common_structured",
        label: "Common EU baseline classifier",
        legalReviewRequired: pack.status !== "active"
      },
    countryCode,
    countryNotes: options.countryNotes ?? pack.disclaimers,
    countrySpecificQuestions,
    displayName: pack.displayName,
    fieldDefinitions: [...commonFields, ...countryQuestionFields, ...(options.extraFieldDefinitions ?? [])],
    notificationDraftCapabilities: {
      countryRegistrationDraft: options.notificationDraftCapabilities?.countryRegistrationDraft ?? false,
      directSubmission: false,
      notes: options.notificationDraftCapabilities?.notes ?? ["Draft and export only. No authority submission is performed."]
    },
    onboardingScreens: nis2CommonOnboardingScreens,
    packVersion: pack.packVersion,
    safeSourceSummary: options.safeSourceSummary ?? "Source-backed country pack. Legal review may still be required.",
    serviceCatalog,
    sourceReviewStatus:
      options.sourceReviewStatus ?? (pack.status === "active" ? "active" : pack.status === "reviewed" ? "reviewed" : "review_required"),
    status: pack.status,
    supportedUiLanguages: pack.supportedUiLanguages,
    unsupportedFeatures:
      options.unsupportedFeatures ??
      [
        {
          featureKey: "full_pack_pending",
          reason: "National personalization remains partial until legal/product review activates the local pack."
        }
      ]
  };
};

export const requiredFieldKeysForScreen = (
  pack: Nis2CountryPackOnboardingContract,
  screenKey: string
): string[] =>
  pack.fieldDefinitions
    .filter((fieldDefinition) => fieldDefinition.screenKey === screenKey && fieldDefinition.requiredPolicy === "required")
    .map((fieldDefinition) => fieldDefinition.key);

export const requiredFieldKeysForPack = (pack: Nis2CountryPackOnboardingContract): string[] =>
  pack.onboardingScreens.flatMap((screen) => requiredFieldKeysForScreen(pack, screen.key));

export const sanitizeNis2OnboardingContractForCustomer = (
  pack: Nis2CountryPackOnboardingContract
): Omit<Nis2CountryPackOnboardingContract, "fieldDefinitions"> & {
  fieldDefinitions: Array<Omit<Nis2OnboardingFieldDefinition, "internalSourceReferences">>;
  missingImplementationTermsHidden: true;
} => ({
  ...pack,
  fieldDefinitions: pack.fieldDefinitions.map(({ internalSourceReferences: _internalSourceReferences, ...definition }) => definition),
  missingImplementationTermsHidden: true
});

function field(
  key: string,
  fallbackLabel: string,
  screenKey: string,
  grouping: string,
  type: Nis2OnboardingFieldType,
  requiredPolicy: Nis2OnboardingRequiredPolicy,
  validationHints?: Nis2OnboardingValidationHints,
  options?: readonly Nis2OnboardingFieldOption[]
): Nis2OnboardingFieldDefinition {
  return {
    countryApplicability: ["all"],
    fallbackLabel,
    grouping,
    key,
    labelMessageKey: `nis2.onboarding.${key.replace(/[^a-zA-Z0-9]+/g, ".")}.label`.toLowerCase(),
    options,
    requiredPolicy,
    screenKey,
    type,
    validationHints
  };
}

const countryQuestionFromDynamicQuestion = (question: Nis2OnboardingSourceDynamicQuestion): Nis2CountrySpecificQuestion => ({
  fallbackLabel: question.label,
  key: `countryScope.${question.key}`,
  labelMessageKey: `nis2.onboarding.country.${question.key.replace(/[^a-zA-Z0-9]+/g, ".")}.label`.toLowerCase(),
  options: question.choices?.map((choice) => ({ value: choice, label: titleize(choice) })),
  requiredPolicy: "recommended",
  screenKey: "country-scope",
  type: answerTypeToFieldType(question.answerType)
});

const questionToFieldDefinition = (question: Nis2CountrySpecificQuestion): Nis2OnboardingFieldDefinition => ({
  countryApplicability: ["all"],
  fallbackLabel: question.fallbackLabel,
  grouping: "country_scope",
  key: question.key,
  labelMessageKey: question.labelMessageKey,
  options: question.options,
  requiredPolicy: question.requiredPolicy,
  screenKey: question.screenKey,
  type: question.type
});

const answerTypeToFieldType = (answerType: Nis2OnboardingSourceDynamicQuestion["answerType"]): Nis2OnboardingFieldType => {
  if (answerType === "boolean") return "boolean";
  if (answerType === "multi_choice") return "multi_select";
  if (answerType === "number") return "number";
  if (answerType === "choice") return "select";
  return "text";
};

const serviceCatalogFromCountryPack = (pack: Nis2OnboardingSourcePackDefinition): Nis2OnboardingServiceCatalog => ({
  options: pack.sectorRules.map((sector) => ({
    code: sector,
    groupLabel: "EU baseline sectors",
    label: titleize(sector),
    sectorLabel: titleize(sector)
  })),
  summary: "Common EU baseline services and country-pack sector personalization."
});

const sectorOptionsFromPack = (pack: Nis2OnboardingSourcePackDefinition): Nis2OnboardingFieldOption[] =>
  pack.sectorRules.map((sector) => ({
    value: sector,
    label: titleize(sector)
  }));

const toSupportedOnboardingCountry = (countryCode: string): Nis2OnboardingCountryCode => {
  const normalized = countryCode.toUpperCase();
  if (normalized === "RO" || normalized === "PL" || normalized === "DE") {
    return normalized;
  }

  throw new Error(`Unsupported NIS2 onboarding country: ${countryCode}`);
};

const titleize = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
