import {
  buildCountryPackStatus,
  euNis2BasePack,
  type CountryPackStatus,
  type Nis2CountryPackDefinition
} from "@puresoc/country-packs-core";
import { buildRomaniaNis2OnboardingCountryPack } from "./field-mapping";

export const romaniaCountryPackStatus: CountryPackStatus = buildCountryPackStatus({
  countryCode: "RO",
  countryName: "Romania",
  countryPackStatus: "planned_full_pack",
  lastSourceReviewedAt: null,
  nextReviewDueAt: null
});

export const romaniaNis2CountryPackDefinition: Nis2CountryPackDefinition = {
  countryCode: "RO",
  displayName: "Romania DNSC NIS2 demo pack",
  packVersion: "2026.06.demo",
  effectiveDate: "2024-12-30",
  status: "demo",
  extendsBasePackVersion: euNis2BasePack.packVersion,
  supportedUiLanguages: ["en", "ro"],
  authorityGuidance: ["DNSC source metadata and imported workbook-derived mappings back the Romania readiness workflow."],
  officialSources: [
    {
      id: "ro-dnsc-nis2-tool-v2-1",
      title: "DNSC NIS2RO tool v2.1",
      url: "https://www.dnsc.ro/vezi/document/nis2ro-tool-v-2-1",
      retrievedAt: "2026-06-19",
      trustLevel: "primary",
      notes: "Workbook-derived mappings are stored as generated seed/source-map data under code/data/regulatory/countries/ro."
    },
    {
      id: "ro-nis2-act-oug-155-2024-en-translation",
      title: "Romanian NIS2 Act OUG 155/2024 English translation",
      url: "https://www.dnsc.ro/vezi/document/romanian-nis2-act-oug-155-2024-en-translation-v2025",
      retrievedAt: "2026-06-19",
      trustLevel: "primary",
      notes: "Used as official source metadata only until legal review activates national logic."
    },
    {
      id: "ro-dnsc-home",
      title: "DNSC",
      url: "https://dnsc.ro/",
      retrievedAt: "2026-06-19",
      trustLevel: "primary"
    }
  ],
  nationalTerminology: {
    essentialEntity: "Entitate esentiala",
    importantEntity: "Entitate importanta",
    authority: "DNSC"
  },
  registrationGuidance: [
    "PureSOC generates readiness guidance and notification drafts only.",
    "Direct DNSC submission is not implemented."
  ],
  operationalDifferences: [
    {
      area: "classification",
      key: "ro.dnsc.workbook_classifier",
      title: "Workbook-backed classifier",
      summary:
        "Romania uses the imported DNSC workbook for service, relationship-with-Romania, Article 9, and notification-draft signals; activation remains legal-review gated.",
      reviewStatus: "review_required",
      sourceIds: ["ro-dnsc-nis2-tool-v2-1", "ro-nis2-act-oug-155-2024-en-translation"]
    },
    {
      area: "registration",
      key: "ro.dnsc.notification_draft_only",
      title: "Notification draft is local export only",
      summary:
        "PureSOC can build a source-mapped Romania notification draft from saved onboarding data, but it does not submit to DNSC or certify the result.",
      reviewStatus: "review_required",
      sourceIds: ["ro-dnsc-nis2-tool-v2-1", "ro-dnsc-home"]
    }
  ],
  sectorRules: ["digital_infrastructure", "ict_service_management", "health", "food", "manufacturing", "public_administration"],
  sizeThresholds: ["Romania size and relationship rules are imported from the DNSC workbook and remain review-required."],
  specialInclusionRules: ["Article 9 criticality, Romania establishment, and selected service types affect the current Romania classifier."],
  dynamicQuestions: [
    {
      key: "ro.nis2.selected_services",
      label: "Which Romania NIS2 service types does the customer provide?",
      answerType: "multi_choice",
      sourceIds: ["ro-dnsc-nis2-tool-v2-1"]
    },
    {
      key: "ro.nis2.article9_criticality",
      label: "Could disruption create national or regional criticality under Article 9 context?",
      answerType: "boolean",
      sourceIds: ["ro-dnsc-nis2-tool-v2-1", "ro-nis2-act-oug-155-2024-en-translation"]
    },
    {
      key: "ro.nis2.dnsc_prior_contact",
      label: "Has the customer already communicated with DNSC about NIS2 classification or registration?",
      answerType: "boolean",
      sourceIds: ["ro-dnsc-home"]
    }
  ],
  classificationRules: [
    {
      id: "ro-workbook-classifier",
      version: "2026.06",
      outcome: "legal_review_required",
      plainLanguage: "Romania classification is produced by the workbook-derived classifier and remains review-required until activation.",
      confidence: "medium",
      legalReviewRequired: true,
      match: {},
      sourceIds: ["ro-dnsc-nis2-tool-v2-1", "ro-nis2-act-oug-155-2024-en-translation"]
    }
  ],
  reportLanguage: {
    classificationDisclaimer: "Romania output is a readiness assessment and not legal advice or certification.",
    readinessDisclaimer: "Romania legal copy and classification logic remain review-required until approved."
  },
  disclaimers: ["Romania pack status is demo/review-required. DNSC submission is not performed by PureSOC."]
};

export const romaniaNis2OnboardingCountryPack = buildRomaniaNis2OnboardingCountryPack(
  romaniaNis2CountryPackDefinition
);

export {
  classifyRoNis2Entity,
  type Nis2Classification,
  type Nis2ClassificationResult,
  RO_NIS2_NONE_SERVICE_CODE,
  RO_NIS2_SOURCE_VERSION,
  type RoNis2Article9Input,
  type RoNis2ClassificationInput,
  type RoNis2EntitySize,
  type RoNis2ReasonSourceMapLink,
  type RoNis2RelationshipInput,
  type RoNis2SourceMapLink,
  type RoNis2SourceReference
} from "./classification.service";
export {
  backfillRoNis2NotificationDraftPayload,
  buildRoNis2NotificationDraftEnvelope,
  buildRoNis2NotificationDraft,
  notificationDraftHasSourceMappedFields,
  RO_NIS2_NOTIFICATION_LEGAL_CAVEAT,
  RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY,
  RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_VERSION,
  RO_NIS2_NOTIFICATION_SUBMISSION_NOTICE,
  toRoNis2NotificationDraftEnvelope,
  type RoNis2NotificationDraftBackfillResult,
  type RoNis2NotificationDraftEnvelope,
  type RoNis2NotificationDraftEnvelopePayload,
  type RoNis2NotificationDraftField,
  type RoNis2NotificationDraftJson,
  type RoNis2NotificationDraftStatus
} from "./notification-draft.types";
export {
  buildRoNis2OnboardingProgress,
  roNis2OnboardingSchema,
  toRoNis2ClassificationInput,
  validateRoNis2OnboardingProgress,
  type RoNis2ActivityAnswers,
  type RoNis2AddressAnswers,
  type RoNis2ContactAnswers,
  type RoNis2EntityIdentityAnswers,
  type RoNis2NetworkAnswers,
  type RoNis2OnboardingAnswers,
  type RoNis2OnboardingProgress,
  type RoNis2OnboardingStatus,
  type RoNis2OnboardingStepKey,
  type RoNis2OnboardingStepSchema,
  type RoNis2OnboardingValidation,
  type RoNis2PersonAnswers,
  type RoNis2SizeAnswers
} from "./onboarding.schema";
export { buildRomaniaNis2OnboardingCountryPack } from "./field-mapping";
export type { Nis2CountryPackOnboardingContract } from "@puresoc/country-packs-core";
export {
  roNis2NotificationMappings,
  roNis2ServiceCatalogGroups,
  roNis2ServiceCatalogOptions,
  type RoNis2NotificationMapping,
  type RoNis2ServiceCatalogGroup,
  type RoNis2ServiceCatalogOption
} from "./runtime-model";
