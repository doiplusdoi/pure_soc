import {
  buildCommonNis2OnboardingCountryPack,
  type Nis2CountryPackDefinition,
  type Nis2CountryPackOnboardingContract,
  type Nis2CountrySpecificQuestion,
  type Nis2OnboardingFieldDefinition,
  type Nis2OnboardingServiceCatalog
} from "@puresoc/country-packs-core";
import { roNis2ServiceCatalogOptions } from "./runtime-model";

const roCountryScopeQuestions: readonly Nis2CountrySpecificQuestion[] = [
  question("relationship.establishedInRomania", "Entity established in Romania", "required"),
  question("relationship.mainOfficeInRomania", "Main office in Romania", "required"),
  question("relationship.providesServicesInRomania", "Provides services in Romania", "required"),
  question("relationship.providesServicesInAnotherEuMemberState", "Provides services in another EU member state", "recommended"),
  question("relationship.publicAdministrationEstablishedByRomania", "Romanian public administration body", "required"),
  question("relationship.criticalEntityInRomaniaLaw294", "Critical entity under Romanian Law 294/2024", "required"),
  question("article9.soleProviderEssentialService", "Sole provider of an essential service", "conditional"),
  question("article9.publicSafetySecurityOrHealthImpact", "Potential public safety, security, or health impact", "conditional", "select", [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
  ]),
  question("article9.systemicRisk", "Potential systemic or cross-border risk", "conditional", "select", [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
  ]),
  question("article9.nationalOrRegionalCriticality", "National or regional criticality", "conditional")
];

const roServiceCatalog: Nis2OnboardingServiceCatalog = {
  options: roNis2ServiceCatalogOptions.map((option) => ({
    categoryLabel: option.categoryLabel,
    code: option.code,
    groupLabel: option.sectorLabel ?? option.categoryLabel ?? "Romania service catalog",
    label: option.label,
    sectorCode: option.sectorCode,
    sectorLabel: option.sectorLabel
  })),
  summary: "Romania country-pack service options used for internal readiness classification."
};

const roServiceField: Nis2OnboardingFieldDefinition = {
  countryApplicability: ["RO"],
  fallbackLabel: "Relevant Romania NIS2 services",
  grouping: "services",
  internalSourceReferences: roNis2ServiceCatalogOptions.slice(0, 5).map((option) => ({
    code: option.code,
    label: option.label
  })),
  key: "selectedServiceTypeCodes",
  labelMessageKey: "nis2.onboarding.ro.selected_services.label",
  options: roServiceCatalog.options.map((option) => ({ value: option.code, label: option.label })),
  requiredPolicy: "required",
  screenKey: "services",
  type: "multi_select",
  validationHints: {
    helpText: "Select all services that match the organization."
  }
};

export const buildRomaniaNis2OnboardingCountryPack = (
  romaniaNis2CountryPackDefinition: Nis2CountryPackDefinition
): Nis2CountryPackOnboardingContract => {
  const base = buildCommonNis2OnboardingCountryPack(romaniaNis2CountryPackDefinition, {
    classificationAdapter: {
      key: "ro_workbook_backed",
      label: "Romania source-backed classifier",
      legalReviewRequired: true
    },
    countryNotes: [
      "Romania logic remains review required.",
      "Outputs are internal readiness support and notification draft preparation only."
    ],
    countrySpecificQuestions: roCountryScopeQuestions,
    notificationDraftCapabilities: {
      countryRegistrationDraft: true,
      directSubmission: false,
      notes: ["Notification drafts can be generated for review. Authority submission is not performed."]
    },
    safeSourceSummary: "Source-backed Romania country pack. Review required before external use.",
    serviceCatalog: roServiceCatalog,
    sourceReviewStatus: "review_required",
    unsupportedFeatures: [
      {
        featureKey: "incident_reporting_overrides",
        reason: "Incident reporting workflow remains outside this onboarding flow."
      },
      {
        featureKey: "full_pack_pending",
        reason: "Romania source-derived logic remains review required."
      }
    ]
  });

  return {
    ...base,
    fieldDefinitions: [
      ...base.fieldDefinitions.filter((fieldDefinition) => fieldDefinition.key !== "scope.activities"),
      roServiceField
    ]
  };
};

function question(
  key: string,
  fallbackLabel: string,
  requiredPolicy: Nis2CountrySpecificQuestion["requiredPolicy"],
  type: Nis2CountrySpecificQuestion["type"] = "boolean",
  options?: Nis2CountrySpecificQuestion["options"]
): Nis2CountrySpecificQuestion {
  return {
    fallbackLabel,
    key,
    labelMessageKey: `nis2.onboarding.ro.${key.replace(/[^a-zA-Z0-9]+/g, ".")}.label`.toLowerCase(),
    options,
    requiredPolicy,
    screenKey: "country-scope",
    type
  };
}
