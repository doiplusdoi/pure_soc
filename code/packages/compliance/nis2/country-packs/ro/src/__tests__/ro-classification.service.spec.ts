import { describe, expect, it } from "vitest";

import { classifyRoNis2Entity, RO_NIS2_NONE_SERVICE_CODE } from "../classification.service";

describe("ro classification service", () => {
  it("returns insufficient data with missing required fields", () => {
    const result = classifyRoNis2Entity({});

    expect(result.result).toBe("insufficient_data");
    expect(result.missingRequiredFields).toEqual(["sizeCategory", "selectedServiceTypeCodes"]);
    expect(result.notificationRecommended).toBe(false);
  });

  it("returns out of scope when Romania relationship conditions are not met", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: false
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });

    expect(result.result).toBe("out_of_scope");
    expect(result.reasons).toHaveLength(1);
    expect(result.reasonSourceMapLinks[0]?.sourceMapLinks[0]?.sourceMapId).toBe(
      "ro-nis2-classification_rules-classification_rule_9_energie_transport_bancar_financiar_sanatate_potabila_uzate_spatial_ixp"
    );
  });

  it("returns voluntary registration possible for the none-of-listed-services workbook option", () => {
    const result = classifyRoNis2Entity({
      selectedServiceTypeCodes: [RO_NIS2_NONE_SERVICE_CODE]
    });

    expect(result.result).toBe("voluntary_registration_possible");
    expect(result.notificationRecommended).toBe(false);
    expect(result.sourceMapLinks.map((link) => link.sourceMapId)).toContain(
      "ro-nis2-service_options-none_of_oug_155_2024_services"
    );
  });

  it("classifies important entity by sector and size", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });

    expect(result.result).toBe("important_entity");
    expect(result.notificationRecommended).toBe(true);
    expect(result.matchedRules).toContain("Algoritm clasificare!I9");
  });

  it("classifies qualified trust providers as essential when established in Romania", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["108008"],
      sizeCategory: "small_micro"
    });

    expect(result.result).toBe("essential_entity");
    expect(result.notificationRecommended).toBe(true);
    expect(result.matchedRules).toContain("Algoritm clasificare!K3:M3");
    expect(result.reasonSourceMapLinks[0]?.sourceMapLinks[0]?.sourceMapId).toBe(
      "ro-nis2-classification_rules-classification_rule_3_prestatori_calificati"
    );
  });

  it("classifies DNS and TLD providers with a Romanian main office as essential", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        mainOfficeInRomania: true
      },
      selectedServiceTypeCodes: ["108003"],
      sizeCategory: "small_micro"
    });

    expect(result.result).toBe("essential_entity");
    expect(result.matchedRules).toContain("Algoritm clasificare!K4:M4");
  });

  it("classifies non-qualified trust providers by size", () => {
    const small = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["108007"],
      sizeCategory: "small_micro"
    });
    const large = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["108007"],
      sizeCategory: "large"
    });

    expect(small.result).toBe("important_entity");
    expect(large.result).toBe("essential_entity");
  });

  it("classifies telecom providers that provide services in Romania", () => {
    const small = classifyRoNis2Entity({
      relationship: {
        providesServicesInRomania: true
      },
      selectedServiceTypeCodes: ["108009"],
      sizeCategory: "small_micro"
    });
    const medium = classifyRoNis2Entity({
      relationship: {
        providesServicesInRomania: true
      },
      selectedServiceTypeCodes: ["108009"],
      sizeCategory: "medium"
    });

    expect(small.result).toBe("important_entity");
    expect(medium.result).toBe("essential_entity");
  });

  it("classifies medium managed security service providers as essential", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        mainOfficeInRomania: true
      },
      selectedServiceTypeCodes: ["109002"],
      sizeCategory: "medium"
    });

    expect(result.result).toBe("essential_entity");
    expect(result.matchedRules).toContain("Algoritm clasificare!K7");
  });

  it("requires Article 9 answers for small cloud/data-centre/CDN/managed-service entities", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        mainOfficeInRomania: true
      },
      selectedServiceTypeCodes: ["108004"],
      sizeCategory: "small_micro"
    });

    expect(result.result).toBe("insufficient_data");
    expect(result.article9Required).toBe(true);
    expect(result.missingRequiredFields).toEqual(["article9"]);
    expect(result.sourceMapLinks.map((link) => link.sourceMapId)).toContain(
      "ro-nis2-classification_rules-classification_rule_8_furnizorii_de_servicii_de_cloud_computing_furnizorii_de_servicii_de_centre_de_date_furnizorii_de_retele_de_furnizare_de_continut_furnizorii_de_servicii_gestionate"
    );
  });

  it("uses Article 9 answers to classify small high-criticality entities", () => {
    const result = classifyRoNis2Entity({
      article9: {
        publicSafetySecurityOrHealthImpact: "medium"
      },
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "small_micro"
    });

    expect(result.result).toBe("important_entity");
    expect(result.article9Required).toBe(true);
    expect(result.matchedRules).toEqual(
      expect.arrayContaining(["Algoritm clasificare!F9", "Algoritm clasificare!L14:L17"])
    );
    expect(result.reasonSourceMapLinks.at(-1)?.sourceMapLinks.map((link) => link.sourceMapId)).toEqual(
      expect.arrayContaining([
        "ro-nis2-classification_formula_signals-classification_formula_l14",
        "ro-nis2-article9_questions-article9_170_9b_disruption_of_the_service_provided_by_the_entity_could_have_a_significant_impact_on_public_safety_public_security_or_public_health"
      ])
    );
  });

  it("classifies large cloud, data centre, CDN, and managed-service providers as essential", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        mainOfficeInRomania: true
      },
      selectedServiceTypeCodes: ["108005", "108006", "109001"],
      sizeCategory: "large"
    });

    expect(result.result).toBe("essential_entity");
    expect(result.matchedRules).toContain("Algoritm clasificare!K8");
  });

  it("classifies Annex 2 services as important for medium and large entities", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["201001"],
      sizeCategory: "medium"
    });

    expect(result.result).toBe("important_entity");
    expect(result.matchedRules).toContain("Algoritm clasificare!H11:J11");
  });

  it("uses Article 9 escalation for online providers", () => {
    const result = classifyRoNis2Entity({
      article9: {
        nationalOrRegionalCriticality: true
      },
      relationship: {
        mainOfficeInRomania: true
      },
      selectedServiceTypeCodes: ["206001"]
    });

    expect(result.result).toBe("essential_entity");
    expect(result.article9Required).toBe(true);
    expect(result.matchedRules).toEqual(expect.arrayContaining(["Algoritm clasificare!C12:K17", "Algoritm clasificare!M14:M17"]));
  });

  it("classifies public administration established by Romania as essential", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        publicAdministrationEstablishedByRomania: true
      },
      selectedServiceTypeCodes: ["110001"]
    });

    expect(result.result).toBe("essential_entity");
    expect(result.matchedRules).toContain("Algoritm clasificare!M2");
    expect(result.sourceMapLinks.map((link) => link.sourceMapId)).toContain(
      "ro-nis2-classification_rules-classification_rule_2_administratie_publica_centrala_ro"
    );
  });

  it("classifies Law 294/2024 critical entities as essential", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        criticalEntityInRomaniaLaw294: true
      },
      selectedServiceTypeCodes: ["101101"]
    });

    expect(result.result).toBe("essential_entity");
    expect(result.notificationRecommended).toBe(true);
    expect(result.sourceMapLinks.map((link) => link.sourceMapId)).toEqual(
      expect.arrayContaining([
        "ro-nis2-law294_questions-law294_153_is_was_the_entity_identified_as_a_critical_entity_in_romania_in_accordance_with_the_provisions_of_law_no_294_2024",
        "ro-nis2-classification_formula_signals-classification_formula_m2"
      ])
    );
  });
});
