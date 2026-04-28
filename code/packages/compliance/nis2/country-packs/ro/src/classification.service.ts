export type RoNis2EntitySize = "small_micro" | "medium" | "large";

export type Nis2ClassificationResult =
  | "insufficient_data"
  | "out_of_scope"
  | "voluntary_registration_possible"
  | "important_entity"
  | "essential_entity";

export interface RoNis2SourceReference {
  cell?: string;
  range?: string;
  sheet: string;
}

export interface RoNis2SourceMapLink {
  sourceMapId: string;
  sourceReferences: readonly RoNis2SourceReference[];
  targetCollection: string;
  targetKey: string;
  workbookRange?: string;
}

export interface RoNis2ReasonSourceMapLink {
  reason: string;
  sourceMapLinks: readonly RoNis2SourceMapLink[];
}

export interface RoNis2RelationshipInput {
  criticalEntityInRomaniaLaw294?: boolean;
  establishedInRomania?: boolean;
  mainOfficeInRomania?: boolean;
  providesServicesInAnotherEuMemberState?: boolean;
  providesServicesInRomania?: boolean;
  publicAdministrationEstablishedByRomania?: boolean;
}

export interface RoNis2Article9Input {
  nationalOrRegionalCriticality?: boolean;
  publicSafetySecurityOrHealthImpact?: "low" | "medium" | "high";
  soleProviderEssentialService?: boolean;
  systemicRisk?: "low" | "medium" | "high";
}

export interface RoNis2ClassificationInput {
  article9?: RoNis2Article9Input;
  relationship?: RoNis2RelationshipInput;
  selectedServiceTypeCodes?: readonly string[];
  sizeCategory?: RoNis2EntitySize;
}

export interface Nis2Classification {
  article9Required: boolean;
  jurisdiction: "RO";
  matchedRules: string[];
  missingRequiredFields: string[];
  notificationRecommended: boolean;
  reasonSourceMapLinks: RoNis2ReasonSourceMapLink[];
  reasons: string[];
  result: Nis2ClassificationResult;
  sourceMapLinks: RoNis2SourceMapLink[];
  sourceVersion: string;
}

export const RO_NIS2_SOURCE_VERSION = "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898";
export const RO_NIS2_NONE_SERVICE_CODE = "none_of_oug_155_2024_services";

const qualifiedTrustServices = new Set(["108008"]);
const dnsAndTldServices = new Set(["108003"]);
const nonQualifiedTrustServices = new Set(["108007"]);
const telecomServices = new Set(["108009", "108010"]);
const msspServices = new Set(["109002"]);
const cloudDataCdnManagedServices = new Set(["108004", "108005", "108006", "109001"]);
const highCriticalityServices = new Set([
  "101101",
  "101102",
  "101103",
  "101104",
  "101105",
  "101106",
  "101107",
  "101108",
  "101201",
  "101301",
  "101302",
  "101303",
  "101401",
  "101402",
  "101403",
  "101404",
  "101405",
  "101406",
  "101407",
  "101501",
  "102101",
  "102102",
  "102103",
  "102104",
  "102105",
  "102106",
  "102107",
  "102201",
  "102202",
  "102301",
  "102302",
  "102303",
  "102401",
  "102402",
  "102501",
  "103001",
  "104001",
  "104002",
  "104003",
  "105001",
  "105002",
  "105003",
  "105004",
  "105005",
  "105006",
  "105007",
  "106001",
  "107001",
  "108001",
  "108002",
  "111001"
]);
const annexTwoServices = new Set([
  "201001",
  "202001",
  "203001",
  "204001",
  "205101",
  "205201",
  "205301",
  "205401",
  "205501",
  "205601",
  "207001"
]);
const onlineProviderServices = new Set(["206001", "206002", "206003"]);

const sourceLink = (
  sourceMapId: string,
  targetCollection: string,
  targetKey: string,
  workbookRange: string,
  sourceReferences: readonly RoNis2SourceReference[]
): RoNis2SourceMapLink => ({
  sourceMapId,
  sourceReferences,
  targetCollection,
  targetKey,
  workbookRange
});

const sourceLinks = {
  annexTwoRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_11_toate_din_anexa_2",
    "classification_rules",
    "classification_rule_11_toate_din_anexa_2",
    "Algoritm clasificare!B11:M11",
    [{ range: "B11:M11", sheet: "Algoritm clasificare" }]
  ),
  article9EssentialFormula: sourceLink(
    "ro-nis2-classification_formula_signals-classification_formula_m14",
    "classification_formula_signals",
    "classification_formula_m14",
    "Algoritm clasificare!M14:M17",
    [
      { cell: "D169", sheet: "Entity assessment" },
      { cell: "D170", sheet: "Entity assessment" },
      { cell: "D171", sheet: "Entity assessment" },
      { cell: "D172", sheet: "Entity assessment" }
    ]
  ),
  article9ImportantFormula: sourceLink(
    "ro-nis2-classification_formula_signals-classification_formula_l14",
    "classification_formula_signals",
    "classification_formula_l14",
    "Algoritm clasificare!L14:L17",
    [
      { cell: "D169", sheet: "Entity assessment" },
      { cell: "D170", sheet: "Entity assessment" },
      { cell: "D171", sheet: "Entity assessment" },
      { cell: "D172", sheet: "Entity assessment" }
    ]
  ),
  article9NationalOrRegionalCriticality: sourceLink(
    "ro-nis2-article9_questions-article9_172_9d_the_entity_is_critical_due_to_its_specific_importance_at_national_or_regional_level_for_the_sector_or_type_of_services_concerned_or_for_other_interdependent_sectors",
    "article9_questions",
    "article9_172_9d_the_entity_is_critical_due_to_its_specific_importance_at_national_or_regional_level_for_the_sector_or_type_of_services_concerned_or_for_other_interdependent_sectors",
    "Entity assessment!D172",
    [{ cell: "D172", sheet: "Entity assessment" }]
  ),
  article9PublicSafety: sourceLink(
    "ro-nis2-article9_questions-article9_170_9b_disruption_of_the_service_provided_by_the_entity_could_have_a_significant_impact_on_public_safety_public_security_or_public_health",
    "article9_questions",
    "article9_170_9b_disruption_of_the_service_provided_by_the_entity_could_have_a_significant_impact_on_public_safety_public_security_or_public_health",
    "Entity assessment!D170",
    [{ cell: "D170", sheet: "Entity assessment" }]
  ),
  article9SoleProvider: sourceLink(
    "ro-nis2-article9_questions-article9_169_9a_the_entity_is_the_sole_provider_of_a_service_that_is_essential_to_supporting_critical_societal_and_economic_activities",
    "article9_questions",
    "article9_169_9a_the_entity_is_the_sole_provider_of_a_service_that_is_essential_to_supporting_critical_societal_and_economic_activities",
    "Entity assessment!D169",
    [{ cell: "D169", sheet: "Entity assessment" }]
  ),
  article9SystemicRisk: sourceLink(
    "ro-nis2-article9_questions-article9_171_9c_disruption_to_the_service_provided_by_the_entity_could_generate_significant_systemic_risk_particularly_for_sectors_where_such_disruption_could_have_a_cross_border_impact",
    "article9_questions",
    "article9_171_9c_disruption_to_the_service_provided_by_the_entity_could_generate_significant_systemic_risk_particularly_for_sectors_where_such_disruption_could_have_a_cross_border_impact",
    "Entity assessment!D171",
    [{ cell: "D171", sheet: "Entity assessment" }]
  ),
  cloudRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_8_furnizorii_de_servicii_de_cloud_computing_furnizorii_de_servicii_de_centre_de_date_furnizorii_de_retele_de_furnizare_de_continut_furnizorii_de_servicii_gestionate",
    "classification_rules",
    "classification_rule_8_furnizorii_de_servicii_de_cloud_computing_furnizorii_de_servicii_de_centre_de_date_furnizorii_de_retele_de_furnizare_de_continut_furnizorii_de_servicii_gestionate",
    "Algoritm clasificare!B8:M8",
    [{ range: "B8:M8", sheet: "Algoritm clasificare" }]
  ),
  criticalOrEssentialFormula: sourceLink(
    "ro-nis2-classification_formula_signals-classification_formula_m2",
    "classification_formula_signals",
    "classification_formula_m2",
    "Algoritm clasificare!M2",
    [
      { cell: "D152", sheet: "Entity assessment" },
      { cell: "D153", sheet: "Entity assessment" }
    ]
  ),
  dnsTldRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_4_dns_tld",
    "classification_rules",
    "classification_rule_4_dns_tld",
    "Algoritm clasificare!B4:M4",
    [{ range: "B4:M4", sheet: "Algoritm clasificare" }]
  ),
  highCriticalityRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_9_energie_transport_bancar_financiar_sanatate_potabila_uzate_spatial_ixp",
    "classification_rules",
    "classification_rule_9_energie_transport_bancar_financiar_sanatate_potabila_uzate_spatial_ixp",
    "Algoritm clasificare!B9:M9",
    [{ range: "B9:M9", sheet: "Algoritm clasificare" }]
  ),
  law294Question: sourceLink(
    "ro-nis2-law294_questions-law294_153_is_was_the_entity_identified_as_a_critical_entity_in_romania_in_accordance_with_the_provisions_of_law_no_294_2024",
    "law294_questions",
    "law294_153_is_was_the_entity_identified_as_a_critical_entity_in_romania_in_accordance_with_the_provisions_of_law_no_294_2024",
    "Entity assessment!D153",
    [{ cell: "D153", sheet: "Entity assessment" }]
  ),
  msspRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_7_mssp",
    "classification_rules",
    "classification_rule_7_mssp",
    "Algoritm clasificare!B7:M7",
    [{ range: "B7:M7", sheet: "Algoritm clasificare" }]
  ),
  noneServices: sourceLink(
    "ro-nis2-service_options-none_of_oug_155_2024_services",
    "service_options",
    RO_NIS2_NONE_SERVICE_CODE,
    "Entity assessment!D142",
    [{ cell: "D142", sheet: "Entity assessment" }]
  ),
  nonQualifiedTrustRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_5_prestatorii_necalificati",
    "classification_rules",
    "classification_rule_5_prestatorii_necalificati",
    "Algoritm clasificare!B5:M5",
    [{ range: "B5:M5", sheet: "Algoritm clasificare" }]
  ),
  onlineProviderRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_12_furnizorii_de_piete_online_de_motoare_de_cautare_online_si_de_platforme_de_servicii_de_socializare_in_retea",
    "classification_rules",
    "classification_rule_12_furnizorii_de_piete_online_de_motoare_de_cautare_online_si_de_platforme_de_servicii_de_socializare_in_retea",
    "Algoritm clasificare!B12:M12",
    [{ range: "B12:M12", sheet: "Algoritm clasificare" }]
  ),
  publicAdministrationRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_2_administratie_publica_centrala_ro",
    "classification_rules",
    "classification_rule_2_administratie_publica_centrala_ro",
    "Algoritm clasificare!B2:M2",
    [{ range: "B2:M2", sheet: "Algoritm clasificare" }]
  ),
  qualifiedTrustRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_3_prestatori_calificati",
    "classification_rules",
    "classification_rule_3_prestatori_calificati",
    "Algoritm clasificare!B3:M3",
    [{ range: "B3:M3", sheet: "Algoritm clasificare" }]
  ),
  telecomRule: sourceLink(
    "ro-nis2-classification_rules-classification_rule_6_telecomunicatii",
    "classification_rules",
    "classification_rule_6_telecomunicatii",
    "Algoritm clasificare!B6:M6",
    [{ range: "B6:M6", sheet: "Algoritm clasificare" }]
  )
} as const;

export const classifyRoNis2Entity = (input: RoNis2ClassificationInput): Nis2Classification => {
  const serviceCodes = new Set(input.selectedServiceTypeCodes ?? []);
  const missingRequiredFields: string[] = [];
  const reasons: string[] = [];
  const matchedRules: string[] = [];
  const reasonSourceMapLinks: RoNis2ReasonSourceMapLink[] = [];
  const sourceMapLinks = new Map<string, RoNis2SourceMapLink>();
  const relationship = input.relationship ?? {};
  const law294CriticalEntity = relationship.criticalEntityInRomaniaLaw294 === true;

  const addSourceLinks = (...links: RoNis2SourceMapLink[]) => {
    for (const link of links) {
      sourceMapLinks.set(link.sourceMapId, link);
    }
  };
  const addReason = (reason: string, links: readonly RoNis2SourceMapLink[]) => {
    reasons.push(reason);
    reasonSourceMapLinks.push({
      reason,
      sourceMapLinks: [...links]
    });
    addSourceLinks(...links);
  };
  const addMatchedRule = (rule: string, links: readonly RoNis2SourceMapLink[]) => {
    matchedRules.push(rule);
    addSourceLinks(...links);
  };

  if (!input.sizeCategory && requiresSizeCategory(serviceCodes, law294CriticalEntity)) {
    missingRequiredFields.push("sizeCategory");
  }

  if (serviceCodes.size === 0) {
    missingRequiredFields.push("selectedServiceTypeCodes");
  }

  if (missingRequiredFields.length > 0) {
    return buildClassification(
      "insufficient_data",
      reasons,
      matchedRules,
      missingRequiredFields,
      false,
      reasonSourceMapLinks,
      [...sourceMapLinks.values()]
    );
  }

  if (serviceCodes.has(RO_NIS2_NONE_SERVICE_CODE) && serviceCodes.size === 1 && !law294CriticalEntity) {
    addMatchedRule("Entity assessment!D142", [sourceLinks.noneServices]);
    addReason("The selected workbook option indicates no listed OUG No. 155/2024 service.", [sourceLinks.noneServices]);

    return buildClassification(
      "voluntary_registration_possible",
      reasons,
      matchedRules,
      [],
      false,
      reasonSourceMapLinks,
      [...sourceMapLinks.values()]
    );
  }

  const hasAnyService = (codes: ReadonlySet<string>) => [...serviceCodes].some((code) => codes.has(code));
  const addMissingRelationship = (field: keyof RoNis2RelationshipInput) => {
    if (relationship[field] === undefined) {
      missingRequiredFields.push(`relationship.${field}`);
    }
  };

  if (!law294CriticalEntity) {
    if (hasAnyService(highCriticalityServices) || hasAnyService(annexTwoServices) || hasAnyService(nonQualifiedTrustServices)) {
      addMissingRelationship("establishedInRomania");
    }

    if (
      hasAnyService(dnsAndTldServices) ||
      hasAnyService(cloudDataCdnManagedServices) ||
      hasAnyService(onlineProviderServices) ||
      hasAnyService(msspServices)
    ) {
      addMissingRelationship("mainOfficeInRomania");
    }

    if (hasAnyService(telecomServices)) {
      addMissingRelationship("providesServicesInRomania");
    }

    if (serviceCodes.has("110001")) {
      addMissingRelationship("publicAdministrationEstablishedByRomania");
    }
  }

  if (missingRequiredFields.length > 0) {
    return buildClassification(
      "insufficient_data",
      reasons,
      matchedRules,
      missingRequiredFields,
      false,
      reasonSourceMapLinks,
      [...sourceMapLinks.values()]
    );
  }

  let result: Nis2ClassificationResult = "out_of_scope";
  let article9Required = false;
  const promote = (next: Nis2ClassificationResult, rule: string, reason: string, links: readonly RoNis2SourceMapLink[]) => {
    addMatchedRule(rule, links);
    addReason(reason, links);
    if (classificationRank(next) > classificationRank(result)) {
      result = next;
    }
  };
  const requireArticle9 = (rule: string, links: readonly RoNis2SourceMapLink[]) => {
    article9Required = true;
    addMatchedRule(rule, links);
  };

  if (law294CriticalEntity) {
    promote(
      "essential_entity",
      "Algoritm clasificare!M2",
      "The entity is marked as a Romanian critical entity under Law No. 294/2024.",
      [sourceLinks.law294Question, sourceLinks.criticalOrEssentialFormula]
    );
  }

  if (serviceCodes.has("110001") && relationship.publicAdministrationEstablishedByRomania) {
    promote(
      "essential_entity",
      "Algoritm clasificare!M2",
      "Central public administration established by Romania is classified as essential.",
      [sourceLinks.publicAdministrationRule, sourceLinks.criticalOrEssentialFormula]
    );
  }

  if (hasAnyService(qualifiedTrustServices) && relationship.establishedInRomania) {
    promote(
      "essential_entity",
      "Algoritm clasificare!K3:M3",
      "Qualified trust service provider established in Romania is classified as essential.",
      [sourceLinks.qualifiedTrustRule]
    );
  }

  if (hasAnyService(dnsAndTldServices) && relationship.mainOfficeInRomania) {
    promote("essential_entity", "Algoritm clasificare!K4:M4", "DNS or TLD service with main office in Romania.", [
      sourceLinks.dnsTldRule
    ]);
  }

  if (hasAnyService(nonQualifiedTrustServices) && relationship.establishedInRomania) {
    promote(
      input.sizeCategory === "large" ? "essential_entity" : "important_entity",
      "Algoritm clasificare!I5:K5",
      "Non-qualified trust service provider classification depends on entity size.",
      [sourceLinks.nonQualifiedTrustRule]
    );
  }

  if (hasAnyService(telecomServices) && relationship.providesServicesInRomania) {
    promote(
      input.sizeCategory === "small_micro" ? "important_entity" : "essential_entity",
      "Algoritm clasificare!G6:K6",
      "Public electronic communications services are classified through the telecommunications rule.",
      [sourceLinks.telecomRule]
    );
  }

  if (hasAnyService(msspServices) && relationship.mainOfficeInRomania) {
    if (input.sizeCategory === "medium" || input.sizeCategory === "large") {
      promote(
        "essential_entity",
        "Algoritm clasificare!K7",
        "Managed security service providers with medium or large size and main office in Romania are classified as essential.",
        [sourceLinks.msspRule]
      );
    } else {
      requireArticle9("Algoritm clasificare!C7:E7", [sourceLinks.msspRule]);
    }
  }

  if (hasAnyService(cloudDataCdnManagedServices) && relationship.mainOfficeInRomania) {
    if (input.sizeCategory === "large") {
      promote("essential_entity", "Algoritm clasificare!K8", "Large cloud/data-centre/CDN/managed-service entity.", [
        sourceLinks.cloudRule
      ]);
    } else if (input.sizeCategory === "medium") {
      promote("important_entity", "Algoritm clasificare!I8", "Medium cloud/data-centre/CDN/managed-service entity.", [
        sourceLinks.cloudRule
      ]);
    } else {
      requireArticle9("Algoritm clasificare!F8", [sourceLinks.cloudRule]);
    }
  }

  if (hasAnyService(highCriticalityServices) && relationship.establishedInRomania) {
    if (input.sizeCategory === "large") {
      promote("essential_entity", "Algoritm clasificare!K9", "Large entity in a high-criticality sector.", [
        sourceLinks.highCriticalityRule
      ]);
    } else if (input.sizeCategory === "medium") {
      promote("important_entity", "Algoritm clasificare!I9", "Medium entity in a high-criticality sector.", [
        sourceLinks.highCriticalityRule
      ]);
    } else {
      requireArticle9("Algoritm clasificare!F9", [sourceLinks.highCriticalityRule]);
    }
  }

  if (hasAnyService(annexTwoServices) && relationship.establishedInRomania) {
    if (input.sizeCategory === "medium" || input.sizeCategory === "large") {
      promote("important_entity", "Algoritm clasificare!H11:J11", "Annex 2 service with medium or large size.", [
        sourceLinks.annexTwoRule
      ]);
    } else {
      requireArticle9("Algoritm clasificare!C11:E16", [sourceLinks.annexTwoRule]);
    }
  }

  if (hasAnyService(onlineProviderServices) && relationship.mainOfficeInRomania) {
    requireArticle9("Algoritm clasificare!C12:K17", [sourceLinks.onlineProviderRule]);
  }

  if (article9Required) {
    const article9Result = evaluateArticle9(input.article9);
    addSourceLinks(...article9Result.sourceMapLinks);

    if (article9Result.result === "missing") {
      return buildClassification(
        "insufficient_data",
        reasons,
        matchedRules,
        ["article9"],
        true,
        reasonSourceMapLinks,
        [...sourceMapLinks.values()]
      );
    }

    if (article9Result.result === "essential") {
      promote(
        "essential_entity",
        "Algoritm clasificare!M14:M17",
        "Article 9 answers indicate essential classification.",
        [sourceLinks.article9EssentialFormula, ...article9Result.sourceMapLinks]
      );
    } else if (article9Result.result === "important") {
      promote(
        "important_entity",
        "Algoritm clasificare!L14:L17",
        "Article 9 answers indicate important classification.",
        [sourceLinks.article9ImportantFormula, ...article9Result.sourceMapLinks]
      );
    }
  }

  if (result === "out_of_scope" && reasons.length === 0) {
    const links = evaluatedRuleLinks(serviceCodes);
    addReason("No source-mapped Romania classification rule matched the supplied service, size, and Romania relationship answers.", links);
  }

  return buildClassification(result, reasons, matchedRules, [], article9Required, reasonSourceMapLinks, [
    ...sourceMapLinks.values()
  ]);
};

const requiresSizeCategory = (serviceCodes: ReadonlySet<string>, law294CriticalEntity: boolean): boolean => {
  if (law294CriticalEntity || serviceCodes.has(RO_NIS2_NONE_SERVICE_CODE)) {
    return false;
  }

  if (serviceCodes.size === 0) {
    return true;
  }

  return [...serviceCodes].some(
    (code) =>
      nonQualifiedTrustServices.has(code) ||
      telecomServices.has(code) ||
      msspServices.has(code) ||
      cloudDataCdnManagedServices.has(code) ||
      highCriticalityServices.has(code) ||
      annexTwoServices.has(code)
  );
};

const evaluatedRuleLinks = (serviceCodes: ReadonlySet<string>): RoNis2SourceMapLink[] => {
  const links: RoNis2SourceMapLink[] = [];
  const hasAnyService = (codes: ReadonlySet<string>) => [...serviceCodes].some((code) => codes.has(code));

  if (serviceCodes.has("110001")) links.push(sourceLinks.publicAdministrationRule);
  if (hasAnyService(qualifiedTrustServices)) links.push(sourceLinks.qualifiedTrustRule);
  if (hasAnyService(dnsAndTldServices)) links.push(sourceLinks.dnsTldRule);
  if (hasAnyService(nonQualifiedTrustServices)) links.push(sourceLinks.nonQualifiedTrustRule);
  if (hasAnyService(telecomServices)) links.push(sourceLinks.telecomRule);
  if (hasAnyService(msspServices)) links.push(sourceLinks.msspRule);
  if (hasAnyService(cloudDataCdnManagedServices)) links.push(sourceLinks.cloudRule);
  if (hasAnyService(highCriticalityServices)) links.push(sourceLinks.highCriticalityRule);
  if (hasAnyService(annexTwoServices)) links.push(sourceLinks.annexTwoRule);
  if (hasAnyService(onlineProviderServices)) links.push(sourceLinks.onlineProviderRule);

  return links;
};

const evaluateArticle9 = (
  article9: RoNis2Article9Input | undefined
): {
  result: "essential" | "important" | "none" | "missing";
  sourceMapLinks: RoNis2SourceMapLink[];
} => {
  if (!article9) {
    return { result: "missing", sourceMapLinks: [] };
  }

  const sourceMapLinks: RoNis2SourceMapLink[] = [];

  if (article9.soleProviderEssentialService !== undefined) {
    sourceMapLinks.push(sourceLinks.article9SoleProvider);
  }

  if (article9.publicSafetySecurityOrHealthImpact !== undefined) {
    sourceMapLinks.push(sourceLinks.article9PublicSafety);
  }

  if (article9.systemicRisk !== undefined) {
    sourceMapLinks.push(sourceLinks.article9SystemicRisk);
  }

  if (article9.nationalOrRegionalCriticality !== undefined) {
    sourceMapLinks.push(sourceLinks.article9NationalOrRegionalCriticality);
  }

  if (sourceMapLinks.length === 0) {
    return { result: "missing", sourceMapLinks: [] };
  }

  if (
    article9.soleProviderEssentialService ||
    article9.nationalOrRegionalCriticality ||
    article9.publicSafetySecurityOrHealthImpact === "high" ||
    article9.systemicRisk === "high"
  ) {
    return { result: "essential", sourceMapLinks };
  }

  if (article9.publicSafetySecurityOrHealthImpact === "medium" || article9.systemicRisk === "medium") {
    return { result: "important", sourceMapLinks };
  }

  return { result: "none", sourceMapLinks };
};

const buildClassification = (
  result: Nis2ClassificationResult,
  reasons: string[],
  matchedRules: string[],
  missingRequiredFields: string[],
  article9Required: boolean,
  reasonSourceMapLinks: RoNis2ReasonSourceMapLink[],
  sourceMapLinks: RoNis2SourceMapLink[]
): Nis2Classification => ({
  article9Required,
  jurisdiction: "RO",
  matchedRules,
  missingRequiredFields,
  notificationRecommended: result === "essential_entity" || result === "important_entity",
  reasonSourceMapLinks,
  reasons,
  result,
  sourceMapLinks,
  sourceVersion: RO_NIS2_SOURCE_VERSION
});

const classificationRank = (result: Nis2ClassificationResult): number => {
  switch (result) {
    case "essential_entity":
      return 4;
    case "important_entity":
      return 3;
    case "voluntary_registration_possible":
      return 2;
    case "out_of_scope":
      return 1;
    case "insufficient_data":
      return 0;
  }
};
