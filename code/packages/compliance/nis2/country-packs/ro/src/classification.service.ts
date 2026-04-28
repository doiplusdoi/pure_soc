export type RoNis2EntitySize = "small_micro" | "medium" | "large";

export type Nis2ClassificationResult =
  | "insufficient_data"
  | "out_of_scope"
  | "voluntary_registration_possible"
  | "important_entity"
  | "essential_entity";

export interface RoNis2RelationshipInput {
  criticalEntityInRomaniaLaw294?: boolean;
  establishedInRomania?: boolean;
  mainOfficeInRomania?: boolean;
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
  reasons: string[];
  result: Nis2ClassificationResult;
  sourceVersion: string;
}

const SOURCE_VERSION = "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898";
const NONE_SERVICE_CODE = "none_of_oug_155_2024_services";

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

export const classifyRoNis2Entity = (input: RoNis2ClassificationInput): Nis2Classification => {
  const serviceCodes = new Set(input.selectedServiceTypeCodes ?? []);
  const missingRequiredFields: string[] = [];
  const reasons: string[] = [];
  const matchedRules: string[] = [];

  if (!input.sizeCategory) {
    missingRequiredFields.push("sizeCategory");
  }

  if (serviceCodes.size === 0) {
    missingRequiredFields.push("selectedServiceTypeCodes");
  }

  if (missingRequiredFields.length > 0) {
    return buildClassification("insufficient_data", reasons, matchedRules, missingRequiredFields, false);
  }

  if (serviceCodes.has(NONE_SERVICE_CODE)) {
    return buildClassification(
      "voluntary_registration_possible",
      ["Workbook option selected: none of the services listed in OUG No. 155/2024."],
      ["Entity assessment!C142:D142"],
      [],
      false
    );
  }

  const relationship = input.relationship ?? {};
  const hasAnyService = (codes: ReadonlySet<string>) => [...serviceCodes].some((code) => codes.has(code));
  const addMissingRelationship = (field: keyof RoNis2RelationshipInput) => {
    if (relationship[field] === undefined) {
      missingRequiredFields.push(`relationship.${field}`);
    }
  };

  if (hasAnyService(highCriticalityServices) || hasAnyService(annexTwoServices) || hasAnyService(nonQualifiedTrustServices)) {
    addMissingRelationship("establishedInRomania");
  }

  if (hasAnyService(dnsAndTldServices) || hasAnyService(cloudDataCdnManagedServices) || hasAnyService(onlineProviderServices)) {
    addMissingRelationship("mainOfficeInRomania");
  }

  if (hasAnyService(telecomServices)) {
    addMissingRelationship("providesServicesInRomania");
  }

  if (serviceCodes.has("110001")) {
    addMissingRelationship("publicAdministrationEstablishedByRomania");
  }

  if (missingRequiredFields.length > 0) {
    return buildClassification("insufficient_data", reasons, matchedRules, missingRequiredFields, false);
  }

  let result: Nis2ClassificationResult = "out_of_scope";
  let article9Required = false;
  const promote = (next: Nis2ClassificationResult, rule: string, reason: string) => {
    matchedRules.push(rule);
    reasons.push(reason);
    if (classificationRank(next) > classificationRank(result)) {
      result = next;
    }
  };

  if (serviceCodes.has("110001") && relationship.publicAdministrationEstablishedByRomania) {
    promote("essential_entity", "Algoritm clasificare!M2", "Central public administration established by Romania.");
  }

  if (hasAnyService(qualifiedTrustServices) && relationship.establishedInRomania) {
    promote("essential_entity", "Algoritm clasificare!K3:M3", "Qualified trust service provider established in Romania.");
  }

  if (hasAnyService(dnsAndTldServices) && relationship.mainOfficeInRomania) {
    promote("essential_entity", "Algoritm clasificare!K4:M4", "DNS or TLD service with main office in Romania.");
  }

  if (hasAnyService(nonQualifiedTrustServices) && relationship.establishedInRomania) {
    promote(
      input.sizeCategory === "large" ? "essential_entity" : "important_entity",
      "Algoritm clasificare!I5:K5",
      "Trust service provider classification depends on entity size."
    );
  }

  if (hasAnyService(telecomServices) && relationship.providesServicesInRomania) {
    promote(
      input.sizeCategory === "small_micro" ? "important_entity" : "essential_entity",
      "Algoritm clasificare!G6:K6",
      "Public electronic communications services are classified through the telecommunications rule."
    );
  }

  if (hasAnyService(cloudDataCdnManagedServices) && relationship.mainOfficeInRomania) {
    if (input.sizeCategory === "large") {
      promote("essential_entity", "Algoritm clasificare!K8", "Large cloud/data-centre/CDN/managed-service entity.");
    } else if (input.sizeCategory === "medium") {
      promote("important_entity", "Algoritm clasificare!I8", "Medium cloud/data-centre/CDN/managed-service entity.");
    } else {
      article9Required = true;
      matchedRules.push("Algoritm clasificare!F8");
    }
  }

  if (hasAnyService(highCriticalityServices) && relationship.establishedInRomania) {
    if (input.sizeCategory === "large") {
      promote("essential_entity", "Algoritm clasificare!K9", "Large entity in a high-criticality sector.");
    } else if (input.sizeCategory === "medium") {
      promote("important_entity", "Algoritm clasificare!I9", "Medium entity in a high-criticality sector.");
    } else {
      article9Required = true;
      matchedRules.push("Algoritm clasificare!F9");
    }
  }

  if (hasAnyService(msspServices)) {
    article9Required = true;
    matchedRules.push("Algoritm clasificare!C7:E7");
  }

  if (hasAnyService(annexTwoServices) && relationship.establishedInRomania) {
    if (input.sizeCategory === "medium" || input.sizeCategory === "large") {
      promote("important_entity", "Algoritm clasificare!H11:J11", "Annex 2 service with medium or large size.");
    } else {
      article9Required = true;
      matchedRules.push("Algoritm clasificare!C11:E16");
    }
  }

  if (hasAnyService(onlineProviderServices) && relationship.mainOfficeInRomania) {
    article9Required = true;
    matchedRules.push("Algoritm clasificare!C12:K17");
  }

  if (article9Required) {
    const article9Result = evaluateArticle9(input.article9);
    if (article9Result === "missing") {
      return buildClassification("insufficient_data", reasons, matchedRules, ["article9"], true);
    }

    if (article9Result === "essential") {
      promote("essential_entity", "Algoritm clasificare!M14:M16", "Article 9 answers indicate essential classification.");
    } else if (article9Result === "important") {
      promote("important_entity", "Algoritm clasificare!K14:E16", "Article 9 answers indicate important classification.");
    }
  }

  return buildClassification(result, reasons, matchedRules, [], article9Required);
};

const evaluateArticle9 = (article9: RoNis2Article9Input | undefined): "essential" | "important" | "none" | "missing" => {
  if (!article9) {
    return "missing";
  }

  const hasAnswered =
    article9.soleProviderEssentialService !== undefined ||
    article9.nationalOrRegionalCriticality !== undefined ||
    article9.publicSafetySecurityOrHealthImpact !== undefined ||
    article9.systemicRisk !== undefined;

  if (!hasAnswered) {
    return "missing";
  }

  if (
    article9.soleProviderEssentialService ||
    article9.nationalOrRegionalCriticality ||
    article9.publicSafetySecurityOrHealthImpact === "high" ||
    article9.systemicRisk === "high"
  ) {
    return "essential";
  }

  if (article9.publicSafetySecurityOrHealthImpact === "medium" || article9.systemicRisk === "medium") {
    return "important";
  }

  return "none";
};

const buildClassification = (
  result: Nis2ClassificationResult,
  reasons: string[],
  matchedRules: string[],
  missingRequiredFields: string[],
  article9Required: boolean
): Nis2Classification => ({
  article9Required,
  jurisdiction: "RO",
  matchedRules,
  missingRequiredFields,
  notificationRecommended: result === "essential_entity" || result === "important_entity",
  reasons,
  result,
  sourceVersion: SOURCE_VERSION
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
