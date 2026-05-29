import {
  RO_NIS2_SOURCE_VERSION,
  type RoNis2Article9Input,
  type RoNis2ClassificationInput,
  type RoNis2EntitySize,
  type RoNis2RelationshipInput,
  type RoNis2SourceMapLink
} from "./classification.service";

export type RoNis2OnboardingStepKey =
  | "organization_identity"
  | "entity_address_contact"
  | "activity_nace"
  | "entity_size"
  | "services"
  | "relationship_with_romania"
  | "cybersecurity_responsible"
  | "permanent_monitoring_contact"
  | "network_system_data"
  | "article9"
  | "law294"
  | "attached_documents"
  | "legal_representative"
  | "preliminary_classification"
  | "notification_export";

export type RoNis2OnboardingStatus =
  | "draft"
  | "in_progress"
  | "ready_for_classification"
  | "classification_complete"
  | "ready_for_notification_export";

export interface RoNis2AddressAnswers {
  apartmentOrRoom?: string;
  blockOrBuilding?: string;
  city?: string;
  country?: string;
  county?: string;
  district?: string;
  floor?: string;
  number?: string;
  postalCode?: string;
  street?: string;
}

export interface RoNis2ContactAnswers {
  email?: string;
  mobilePhone?: string;
  phone?: string;
  websiteUrl?: string;
}

export interface RoNis2PersonAnswers {
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
}

export interface RoNis2EntityIdentityAnswers {
  cui?: string;
  legalName?: string;
  nationalRegistrationNumber?: string;
}

export interface RoNis2ActivityAnswers {
  mainNaceCode?: string;
  secondaryNaceCodes?: string[];
}

export interface RoNis2SizeAnswers {
  annualTurnoverEur?: number;
  balanceSheetTotalEur?: number;
  employeeCount?: number;
  sizeCategory?: RoNis2EntitySize;
}

export interface RoNis2NetworkAnswers {
  publicIpRanges?: string[];
  systemsDescription?: string;
}

export interface RoNis2OnboardingAnswers {
  activity?: RoNis2ActivityAnswers;
  address?: RoNis2AddressAnswers;
  article9?: RoNis2Article9Input;
  attachedDocumentIds?: string[];
  contact?: RoNis2ContactAnswers;
  cybersecurityResponsible?: RoNis2PersonAnswers;
  entity?: RoNis2EntityIdentityAnswers;
  legalRepresentative?: RoNis2PersonAnswers;
  network?: RoNis2NetworkAnswers;
  permanentMonitoringContact?: RoNis2PersonAnswers;
  relationship?: RoNis2RelationshipInput;
  selectedServiceTypeCodes?: string[];
  size?: RoNis2SizeAnswers;
}

export interface RoNis2OnboardingStepSchema {
  key: RoNis2OnboardingStepKey;
  requiredFieldPaths: readonly string[];
  sourceMapIds: readonly string[];
}

export interface RoNis2OnboardingProgress {
  answers: RoNis2OnboardingAnswers;
  completedSteps: RoNis2OnboardingStepKey[];
  currentStep: RoNis2OnboardingStepKey;
  frameworkKey: "nis2";
  jurisdiction: "RO";
  missingRequiredFields: string[];
  savedAt: string;
  sourceMapLinks: RoNis2SourceMapLink[];
  sourceVersion: string;
  status: RoNis2OnboardingStatus;
}

export interface RoNis2OnboardingValidation {
  missingRequiredFields: string[];
  validForStatus: boolean;
}

const entityFieldLink = (targetKey: string, sourceMapId: string, cell: string): RoNis2SourceMapLink => ({
  sourceMapId,
  sourceReferences: [{ cell, sheet: "Entity data" }],
  targetCollection: "entity_fields",
  targetKey,
  workbookRange: `Entity data!${cell}`
});

const entityFieldRangeLink = (targetKey: string, sourceMapId: string, range: string): RoNis2SourceMapLink => ({
  sourceMapId,
  sourceReferences: [{ range, sheet: "Entity data" }],
  targetCollection: "entity_fields",
  targetKey,
  workbookRange: `Entity data!${range}`
});

const questionLink = (
  targetCollection: string,
  targetKey: string,
  sourceMapId: string,
  cell: string
): RoNis2SourceMapLink => ({
  sourceMapId,
  sourceReferences: [{ cell, sheet: "Entity assessment" }],
  targetCollection,
  targetKey,
  workbookRange: `Entity assessment!${cell}`
});

const FIELD_SOURCE_LINKS: Record<string, RoNis2SourceMapLink> = {
  "answers.activity.mainNaceCode": entityFieldLink(
    "entity_field_32_main_nace_code",
    "ro-nis2-entity_fields-entity_field_32_main_nace_code",
    "D32"
  ),
  "answers.activity.secondaryNaceCodes": entityFieldLink(
    "entity_field_33_secondary_nace_code_s",
    "ro-nis2-entity_fields-entity_field_33_secondary_nace_code_s",
    "D33"
  ),
  "answers.address.apartmentOrRoom": entityFieldLink(
    "entity_field_25_apartment_office_room_other",
    "ro-nis2-entity_fields-entity_field_25_apartment_office_room_other",
    "D25"
  ),
  "answers.address.blockOrBuilding": entityFieldLink(
    "entity_field_22_block_building_other",
    "ro-nis2-entity_fields-entity_field_22_block_building_other",
    "D22"
  ),
  "answers.address.city": entityFieldLink("entity_field_18_city_town", "ro-nis2-entity_fields-entity_field_18_city_town", "D18"),
  "answers.address.country": entityFieldLink("entity_field_16_country", "ro-nis2-entity_fields-entity_field_16_country", "D16"),
  "answers.address.county": entityFieldLink("entity_field_17_county", "ro-nis2-entity_fields-entity_field_17_county", "D17"),
  "answers.address.district": entityFieldLink("entity_field_19_district", "ro-nis2-entity_fields-entity_field_19_district", "D19"),
  "answers.address.floor": entityFieldLink("entity_field_24_floor", "ro-nis2-entity_fields-entity_field_24_floor", "D24"),
  "answers.address.number": entityFieldLink("entity_field_21_number", "ro-nis2-entity_fields-entity_field_21_number", "D21"),
  "answers.address.postalCode": entityFieldLink("entity_field_26_postal_code", "ro-nis2-entity_fields-entity_field_26_postal_code", "D26"),
  "answers.address.street": entityFieldLink("entity_field_20_street", "ro-nis2-entity_fields-entity_field_20_street", "D20"),
  "answers.article9.nationalOrRegionalCriticality": questionLink(
    "article9_questions",
    "article9_172_9d_the_entity_is_critical_due_to_its_specific_importance_at_national_or_regional_level_for_the_sector_or_type_of_services_concerned_or_for_other_interdependent_sectors",
    "ro-nis2-article9_questions-article9_172_9d_the_entity_is_critical_due_to_its_specific_importance_at_national_or_regional_level_for_the_sector_or_type_of_services_concerned_or_for_other_interdependent_sectors",
    "D172"
  ),
  "answers.article9.publicSafetySecurityOrHealthImpact": questionLink(
    "article9_questions",
    "article9_170_9b_disruption_of_the_service_provided_by_the_entity_could_have_a_significant_impact_on_public_safety_public_security_or_public_health",
    "ro-nis2-article9_questions-article9_170_9b_disruption_of_the_service_provided_by_the_entity_could_have_a_significant_impact_on_public_safety_public_security_or_public_health",
    "D170"
  ),
  "answers.article9.soleProviderEssentialService": questionLink(
    "article9_questions",
    "article9_169_9a_the_entity_is_the_sole_provider_of_a_service_that_is_essential_to_supporting_critical_societal_and_economic_activities",
    "ro-nis2-article9_questions-article9_169_9a_the_entity_is_the_sole_provider_of_a_service_that_is_essential_to_supporting_critical_societal_and_economic_activities",
    "D169"
  ),
  "answers.article9.systemicRisk": questionLink(
    "article9_questions",
    "article9_171_9c_disruption_to_the_service_provided_by_the_entity_could_generate_significant_systemic_risk_particularly_for_sectors_where_such_disruption_could_have_a_cross_border_impact",
    "ro-nis2-article9_questions-article9_171_9c_disruption_to_the_service_provided_by_the_entity_could_generate_significant_systemic_risk_particularly_for_sectors_where_such_disruption_could_have_a_cross_border_impact",
    "D171"
  ),
  "answers.attachedDocumentIds": entityFieldRangeLink(
    "entity_field_74_76_attached_documents",
    "ro-nis2-entity_fields-entity_field_74_attached_documents_certifying_the_company_s_classification_according_to_the_size_criterion",
    "D74:D76"
  ),
  "answers.contact.email": entityFieldLink("entity_field_27_email_address", "ro-nis2-entity_fields-entity_field_27_email_address", "D27"),
  "answers.contact.mobilePhone": entityFieldLink(
    "entity_field_30_mobile_phone_number",
    "ro-nis2-entity_fields-entity_field_30_mobile_phone_number",
    "D30"
  ),
  "answers.contact.phone": entityFieldLink(
    "entity_field_29_telephone_number",
    "ro-nis2-entity_fields-entity_field_29_telephone_number",
    "D29"
  ),
  "answers.contact.websiteUrl": entityFieldLink("entity_field_28_website_url", "ro-nis2-entity_fields-entity_field_28_website_url", "D28"),
  "answers.cybersecurityResponsible.email": entityFieldLink(
    "entity_field_41_email_address",
    "ro-nis2-entity_fields-entity_field_41_email_address",
    "D41"
  ),
  "answers.cybersecurityResponsible.name": entityFieldRangeLink(
    "entity_field_38_39_cybersecurity_responsible_name",
    "ro-nis2-entity_fields-entity_field_38_surname",
    "D38:D39"
  ),
  "answers.cybersecurityResponsible.phone": entityFieldLink(
    "entity_field_42_mobile_phone_number",
    "ro-nis2-entity_fields-entity_field_42_mobile_phone_number",
    "D42"
  ),
  "answers.cybersecurityResponsible.role": entityFieldLink("entity_field_40_role", "ro-nis2-entity_fields-entity_field_40_role", "D40"),
  "answers.entity.cui": entityFieldLink(
    "entity_field_13_unique_identification_code_cui",
    "ro-nis2-entity_fields-entity_field_13_unique_identification_code_cui",
    "D13"
  ),
  "answers.entity.legalName": entityFieldLink(
    "entity_field_12_name_of_the_entity",
    "ro-nis2-entity_fields-entity_field_12_name_of_the_entity",
    "D12"
  ),
  "answers.entity.nationalRegistrationNumber": entityFieldLink(
    "entity_field_14_national_registration_number",
    "ro-nis2-entity_fields-entity_field_14_national_registration_number",
    "D14"
  ),
  "answers.legalRepresentative.email": entityFieldLink("entity_field_69_email", "ro-nis2-entity_fields-entity_field_69_email", "D69"),
  "answers.legalRepresentative.name": entityFieldRangeLink(
    "entity_field_66_67_legal_representative_name",
    "ro-nis2-entity_fields-entity_field_66_last_name",
    "D66:D67"
  ),
  "answers.legalRepresentative.phone": entityFieldLink(
    "entity_field_70_phone_number",
    "ro-nis2-entity_fields-entity_field_70_phone_number",
    "D70"
  ),
  "answers.legalRepresentative.role": entityFieldLink(
    "entity_field_83_role",
    "ro-nis2-entity_fields-entity_field_83_role",
    "D83"
  ),
  "answers.network.publicIpRanges": entityFieldLink(
    "entity_field_54_public_ip_address_ranges",
    "ro-nis2-entity_fields-entity_field_54_public_ip_address_ranges",
    "D54"
  ),
  "answers.permanentMonitoringContact.email": entityFieldLink("entity_field_52_email", "ro-nis2-entity_fields-entity_field_52_email", "D52"),
  "answers.permanentMonitoringContact.name": entityFieldRangeLink(
    "entity_field_46_47_monitoring_contact_name",
    "ro-nis2-entity_fields-entity_field_46_last_name",
    "D46:D47"
  ),
  "answers.permanentMonitoringContact.phone": entityFieldLink(
    "entity_field_50_mobile_phone_number",
    "ro-nis2-entity_fields-entity_field_50_mobile_phone_number",
    "D50"
  ),
  "answers.permanentMonitoringContact.role": entityFieldLink("entity_field_48_role", "ro-nis2-entity_fields-entity_field_48_role", "D48"),
  "answers.relationship.criticalEntityInRomaniaLaw294": questionLink(
    "law294_questions",
    "law294_153_is_was_the_entity_identified_as_a_critical_entity_in_romania_in_accordance_with_the_provisions_of_law_no_294_2024",
    "ro-nis2-law294_questions-law294_153_is_was_the_entity_identified_as_a_critical_entity_in_romania_in_accordance_with_the_provisions_of_law_no_294_2024",
    "D153"
  ),
  "answers.relationship.establishedInRomania": questionLink(
    "relationship_questions",
    "relationship_150_is_the_entity_established_in_romania",
    "ro-nis2-relationship_questions-relationship_150_is_the_entity_established_in_romania",
    "D150"
  ),
  "answers.relationship.mainOfficeInRomania": questionLink(
    "relationship_questions",
    "relationship_151_is_the_entity_has_its_main_office_in_romania",
    "ro-nis2-relationship_questions-relationship_151_is_the_entity_has_its_main_office_in_romania",
    "D151"
  ),
  "answers.relationship.providesServicesInAnotherEuMemberState": questionLink(
    "relationship_questions",
    "relationship_160_do_you_provide_services_in_another_eu_member_state",
    "ro-nis2-relationship_questions-relationship_160_do_you_provide_services_in_another_eu_member_state",
    "D160"
  ),
  "answers.relationship.providesServicesInRomania": questionLink(
    "relationship_questions",
    "relationship_159_do_you_provide_services_in_romania",
    "ro-nis2-relationship_questions-relationship_159_do_you_provide_services_in_romania",
    "D159"
  ),
  "answers.relationship.publicAdministrationEstablishedByRomania": questionLink(
    "relationship_questions",
    "relationship_152_is_your_entity_a_public_administration_entity_established_by_romania",
    "ro-nis2-relationship_questions-relationship_152_is_your_entity_a_public_administration_entity_established_by_romania",
    "D152"
  ),
  "answers.selectedServiceTypeCodes": {
    sourceMapId: "ro-nis2-service_options-none_of_oug_155_2024_services",
    sourceReferences: [{ range: "D66:D142", sheet: "Entity assessment" }],
    targetCollection: "service_options",
    targetKey: "selected_service_type_codes",
    workbookRange: "Entity assessment!D66:D142"
  },
  "answers.size.sizeCategory": {
    sourceMapId: "ro-nis2-helper_lists-size_category_3",
    sourceReferences: [{ range: "D21:D22", sheet: "Entity assessment" }],
    targetCollection: "helper_lists",
    targetKey: "size_categories",
    workbookRange: "Entity assessment!D21:D22"
  }
};

export const roNis2OnboardingSchema: readonly RoNis2OnboardingStepSchema[] = [
  {
    key: "organization_identity",
    requiredFieldPaths: ["answers.entity.legalName", "answers.entity.cui", "answers.entity.nationalRegistrationNumber"],
    sourceMapIds: [
      FIELD_SOURCE_LINKS["answers.entity.legalName"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.entity.cui"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.entity.nationalRegistrationNumber"].sourceMapId
    ]
  },
  {
    key: "entity_address_contact",
    requiredFieldPaths: [
      "answers.address.country",
      "answers.address.county",
      "answers.address.city",
      "answers.address.street",
      "answers.contact.email"
    ],
    sourceMapIds: [
      FIELD_SOURCE_LINKS["answers.address.country"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.address.county"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.address.city"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.address.street"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.contact.email"].sourceMapId
    ]
  },
  {
    key: "activity_nace",
    requiredFieldPaths: ["answers.activity.mainNaceCode"],
    sourceMapIds: [FIELD_SOURCE_LINKS["answers.activity.mainNaceCode"].sourceMapId]
  },
  {
    key: "entity_size",
    requiredFieldPaths: ["answers.size.sizeCategory"],
    sourceMapIds: [FIELD_SOURCE_LINKS["answers.size.sizeCategory"].sourceMapId]
  },
  {
    key: "services",
    requiredFieldPaths: ["answers.selectedServiceTypeCodes"],
    sourceMapIds: [FIELD_SOURCE_LINKS["answers.selectedServiceTypeCodes"].sourceMapId]
  },
  {
    key: "relationship_with_romania",
    requiredFieldPaths: [
      "answers.relationship.establishedInRomania",
      "answers.relationship.mainOfficeInRomania",
      "answers.relationship.providesServicesInRomania",
      "answers.relationship.providesServicesInAnotherEuMemberState"
    ],
    sourceMapIds: [
      FIELD_SOURCE_LINKS["answers.relationship.establishedInRomania"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.relationship.mainOfficeInRomania"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.relationship.providesServicesInRomania"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.relationship.providesServicesInAnotherEuMemberState"].sourceMapId
    ]
  },
  {
    key: "cybersecurity_responsible",
    requiredFieldPaths: [
      "answers.cybersecurityResponsible.name",
      "answers.cybersecurityResponsible.role",
      "answers.cybersecurityResponsible.email",
      "answers.cybersecurityResponsible.phone"
    ],
    sourceMapIds: [
      FIELD_SOURCE_LINKS["answers.cybersecurityResponsible.name"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.cybersecurityResponsible.role"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.cybersecurityResponsible.email"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.cybersecurityResponsible.phone"].sourceMapId
    ]
  },
  {
    key: "permanent_monitoring_contact",
    requiredFieldPaths: [
      "answers.permanentMonitoringContact.name",
      "answers.permanentMonitoringContact.email",
      "answers.permanentMonitoringContact.phone"
    ],
    sourceMapIds: [
      FIELD_SOURCE_LINKS["answers.permanentMonitoringContact.name"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.permanentMonitoringContact.email"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.permanentMonitoringContact.phone"].sourceMapId
    ]
  },
  {
    key: "network_system_data",
    requiredFieldPaths: ["answers.network.publicIpRanges"],
    sourceMapIds: [FIELD_SOURCE_LINKS["answers.network.publicIpRanges"].sourceMapId]
  },
  {
    key: "article9",
    requiredFieldPaths: [],
    sourceMapIds: [
      FIELD_SOURCE_LINKS["answers.article9.soleProviderEssentialService"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.article9.publicSafetySecurityOrHealthImpact"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.article9.systemicRisk"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.article9.nationalOrRegionalCriticality"].sourceMapId
    ]
  },
  {
    key: "law294",
    requiredFieldPaths: ["answers.relationship.criticalEntityInRomaniaLaw294"],
    sourceMapIds: [FIELD_SOURCE_LINKS["answers.relationship.criticalEntityInRomaniaLaw294"].sourceMapId]
  },
  {
    key: "attached_documents",
    requiredFieldPaths: [],
    sourceMapIds: [FIELD_SOURCE_LINKS["answers.attachedDocumentIds"].sourceMapId]
  },
  {
    key: "legal_representative",
    requiredFieldPaths: [
      "answers.legalRepresentative.name",
      "answers.legalRepresentative.role",
      "answers.legalRepresentative.email",
      "answers.legalRepresentative.phone"
    ],
    sourceMapIds: [
      FIELD_SOURCE_LINKS["answers.legalRepresentative.name"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.legalRepresentative.role"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.legalRepresentative.email"].sourceMapId,
      FIELD_SOURCE_LINKS["answers.legalRepresentative.phone"].sourceMapId
    ]
  },
  { key: "preliminary_classification", requiredFieldPaths: [], sourceMapIds: [] },
  { key: "notification_export", requiredFieldPaths: [], sourceMapIds: [] }
];

export const buildRoNis2OnboardingProgress = (input: {
  answers: RoNis2OnboardingAnswers;
  completedSteps?: RoNis2OnboardingStepKey[];
  currentStep?: RoNis2OnboardingStepKey;
  savedAt?: string;
  status?: RoNis2OnboardingStatus;
}): RoNis2OnboardingProgress => {
  const progress: RoNis2OnboardingProgress = {
    answers: input.answers,
    completedSteps: input.completedSteps ?? [],
    currentStep: input.currentStep ?? "organization_identity",
    frameworkKey: "nis2",
    jurisdiction: "RO",
    missingRequiredFields: [],
    savedAt: input.savedAt ?? new Date().toISOString(),
    sourceMapLinks: sourceMapLinksForAnswers(input.answers),
    sourceVersion: RO_NIS2_SOURCE_VERSION,
    status: input.status ?? "draft"
  };
  const validation = validateRoNis2OnboardingProgress(progress);

  return {
    ...progress,
    missingRequiredFields: validation.missingRequiredFields
  };
};

export const validateRoNis2OnboardingProgress = (progress: RoNis2OnboardingProgress): RoNis2OnboardingValidation => {
  const requiredPaths = roNis2OnboardingSchema.flatMap((step) => step.requiredFieldPaths);
  const missingRequiredFields = requiredPaths.filter((fieldPath) => !hasValueAtPath(progress, fieldPath));
  const validForStatus =
    progress.status === "draft" ||
    progress.status === "in_progress" ||
    (progress.sourceVersion === RO_NIS2_SOURCE_VERSION && missingRequiredFields.length === 0);

  return {
    missingRequiredFields,
    validForStatus
  };
};

export const toRoNis2ClassificationInput = (answers: RoNis2OnboardingAnswers): RoNis2ClassificationInput => ({
  article9: answers.article9,
  relationship: answers.relationship,
  selectedServiceTypeCodes: answers.selectedServiceTypeCodes,
  sizeCategory: answers.size?.sizeCategory
});

const sourceMapLinksForAnswers = (answers: RoNis2OnboardingAnswers): RoNis2SourceMapLink[] =>
  Object.entries(FIELD_SOURCE_LINKS)
    .filter(([fieldPath]) => hasValueAtPath({ answers }, fieldPath))
    .map(([, link]) => link);

const hasValueAtPath = (value: unknown, fieldPath: string): boolean => {
  const found = fieldPath.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, value);

  if (Array.isArray(found)) {
    return found.length > 0;
  }

  return found !== undefined && found !== null && found !== "";
};
