import { describe, expect, it } from "vitest";

import { validateNis2CountryPackDefinition } from "@puresoc/country-packs-core";
import {
  buildRoNis2OnboardingProgress,
  romaniaNis2CountryPackDefinition,
  roNis2ServiceCatalogGroups,
  roNis2ServiceCatalogOptions,
  roNis2OnboardingSchema,
  toRoNis2ClassificationInput,
  validateRoNis2OnboardingProgress
} from "../index";

describe("ro onboarding schema", () => {
  it("validates the Romania NIS2 country-pack definition", () => {
    expect(validateNis2CountryPackDefinition(romaniaNis2CountryPackDefinition)).toEqual({
      valid: true,
      issues: []
    });
    expect(romaniaNis2CountryPackDefinition).toMatchObject({
      countryCode: "RO",
      status: "demo",
      extendsBasePackVersion: "2026.06.demo"
    });
    expect(romaniaNis2CountryPackDefinition.officialSources.map((source) => source.url)).toEqual(
      expect.arrayContaining([
        "https://www.dnsc.ro/vezi/document/nis2ro-tool-v-2-1",
        "https://www.dnsc.ro/vezi/document/romanian-nis2-act-oug-155-2024-en-translation-v2025"
      ])
    );
  });

  it("keeps the Romania onboarding steps source-mapped", () => {
    expect(roNis2OnboardingSchema.map((step) => step.key)).toEqual([
      "organization_identity",
      "entity_address_contact",
      "activity_nace",
      "entity_size",
      "services",
      "relationship_with_romania",
      "cybersecurity_responsible",
      "permanent_monitoring_contact",
      "network_system_data",
      "article9",
      "law294",
      "attached_documents",
      "legal_representative",
      "preliminary_classification",
      "notification_export"
    ]);
    expect(roNis2OnboardingSchema.find((step) => step.key === "relationship_with_romania")?.sourceMapIds).toContain(
      "ro-nis2-relationship_questions-relationship_160_do_you_provide_services_in_another_eu_member_state"
    );
  });

  it("builds a saved partial progress shape without requiring completion", () => {
    const progress = buildRoNis2OnboardingProgress({
      answers: {
        entity: {
          legalName: "Example SA"
        }
      },
      completedSteps: [],
      currentStep: "organization_identity",
      savedAt: "2026-04-28T00:00:00.000Z",
      status: "in_progress"
    });
    const validation = validateRoNis2OnboardingProgress(progress);

    expect(progress.jurisdiction).toBe("RO");
    expect(progress.frameworkKey).toBe("nis2");
    expect(progress.sourceVersion).toContain("Entity data V2.1");
    expect(progress.sourceMapLinks.map((link) => link.sourceMapId)).toContain(
      "ro-nis2-entity_fields-entity_field_12_name_of_the_entity"
    );
    expect(progress.missingRequiredFields).toContain("answers.entity.cui");
    expect(validation.validForStatus).toBe(true);
  });

  it("loads the full generated Romania service catalog for runtime selection", () => {
    expect(roNis2ServiceCatalogOptions).toHaveLength(77);
    expect(roNis2ServiceCatalogGroups.length).toBeGreaterThan(10);
    expect(roNis2ServiceCatalogOptions.map((option) => option.code)).toContain("none_of_oug_155_2024_services");
    expect(roNis2ServiceCatalogOptions.find((option) => option.code === "108004")).toMatchObject({
      label: "Cloud computing service providers",
      sectorLabel: "Digital infrastructure"
    });
  });

  it("derives classification input from onboarding answers", () => {
    const classificationInput = toRoNis2ClassificationInput({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      size: {
        sizeCategory: "medium"
      }
    });

    expect(classificationInput).toEqual({
      article9: undefined,
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });
  });
});
