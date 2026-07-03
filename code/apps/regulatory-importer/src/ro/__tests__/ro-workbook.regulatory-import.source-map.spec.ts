import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  detectRoNis2WorkbookProfile,
  importRoNis2Workbook,
  normalizeRoNis2WorkbookValue,
  REQUIRED_RO_NIS2_SHEETS,
  RO_NIS2_SOURCE_MAP_THRESHOLD,
  stableStringify,
  validateRoRequiredSheetNames
} from "../ro-nis2-importer";

const workbookPath = join(process.cwd(), "data/regulatory/countries/ro/nis2ro-tool-v-2-1.xlsx");
const generatedSeedPath = join(process.cwd(), "data/regulatory/countries/ro/ro-nis2.seed.generated.json");

describe("regulatory-import ro-workbook source-map", () => {
  const artifacts = importRoNis2Workbook({ workbookPath });

  it("extracts workbook versions from the Romanian workbook", () => {
    expect(artifacts.seed.workbook.versions).toEqual({
      entityAssessment: "V2.0_45898",
      entityData: "V2.1 ENG_45915"
    });
    expect(artifacts.seed.packVersion).toContain("v2_1_eng_45915");
  });

  it("validates required sheet presence", () => {
    expect(artifacts.report.requiredSheetValidation).toMatchObject({
      missing: [],
      passed: true,
      present: [...REQUIRED_RO_NIS2_SHEETS]
    });

    expect(validateRoRequiredSheetNames(["Entity data", "Entity assessment"]).missing).toEqual([
      "Notification form",
      "Liste",
      "Ajutor",
      "Algoritm clasificare"
    ]);
  });

  it("detects the Romanian v2.3 workbook profile and normalizes localized values", () => {
    const romanianSheets = [
      "Date entitate",
      "Evaluare entitate",
      "Formular notificare",
      "Liste",
      "Ajutor",
      "Algoritm clasificare"
    ];

    expect(validateRoRequiredSheetNames(romanianSheets)).toMatchObject({
      missing: [],
      passed: true,
      present: romanianSheets
    });
    expect(detectRoNis2WorkbookProfile(romanianSheets).profile).toMatchObject({
      detectedVersion: "v2.3_46066",
      profileKey: "ro_nis2_v2_3_romanian"
    });
    expect(normalizeRoNis2WorkbookValue("Da")).toBe("yes");
    expect(normalizeRoNis2WorkbookValue("Nu")).toBe("no");
    expect(normalizeRoNis2WorkbookValue("Selectați")).toBe("");
    expect(normalizeRoNis2WorkbookValue("Mică și micro")).toBe("small_micro");
    expect(normalizeRoNis2WorkbookValue("Mijlocie")).toBe("medium");
    expect(normalizeRoNis2WorkbookValue("Mare")).toBe("large");
    expect(normalizeRoNis2WorkbookValue("MEDIU")).toBe("medium");
    expect(normalizeRoNis2WorkbookValue("RIDICAT")).toBe("high");
  });

  it("extracts key entity/contact/activity fields with source maps", () => {
    const labels = new Set(artifacts.seed.entityFields.map((field) => field.label));

    expect([...labels]).toEqual(
      expect.arrayContaining([
        "Name of the entity",
        "Unique Identification Code (CUI)",
        "Email address",
        "Main NACE code",
        "Public IP address ranges",
        "Are there any attached documents?"
      ])
    );

    const nameField = artifacts.seed.entityFields.find((field) => field.label === "Name of the entity");
    expect(nameField).toMatchObject({
      answerCell: "D12",
      promptCell: "C12",
      required: true
    });
    expect(artifacts.sourceMap.mappings.some((mapping) => mapping.id === nameField?.sourceMapId)).toBe(true);
  });

  it("extracts service sectors and service/entity type options", () => {
    expect(artifacts.seed.serviceCatalog.sectors.map((sector) => sector.label)).toEqual(
      expect.arrayContaining(["Energy", "Transport", "Digital providers", "Research"])
    );
    expect(artifacts.seed.serviceCatalog.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "108004",
          label: "Cloud computing service providers",
          sectorCode: "108"
        }),
        expect.objectContaining({
          code: "102501",
          label: "Public transport service operators",
          subsectorCode: "1025"
        }),
        expect.objectContaining({
          code: "none_of_oug_155_2024_services",
          label: "None of the services listed in OUG No. 155/2024"
        })
      ])
    );
  });

  it("extracts relationship, Article 9, notification, and classification mappings", () => {
    expect(artifacts.seed.questions.relationshipWithRomania.map((question) => question.label)).toEqual(
      expect.arrayContaining([
        "Is the entity established in Romania?",
        "Is your entity a public administration entity established by Romania?",
        "Do you provide services in Romania?"
      ])
    );
    expect(artifacts.seed.questions.article9.map((question) => question.label)).toEqual(
      expect.arrayContaining([
        "9a. The entity is the sole provider of a service that is essential to supporting critical societal and economic activities.",
        "9d. The entity is critical due to its specific importance at national or regional level for the sector or type of services concerned or for other interdependent sectors."
      ])
    );
    expect(artifacts.seed.notificationDraftMapping).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "notification_c8",
          targetCell: "C8"
        }),
        expect.objectContaining({
          key: "notification_d117",
          targetCell: "D117"
        })
      ])
    );
    expect(artifacts.seed.classification.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          condition: "DNS, TLD",
          sourceRange: "B4:M4"
        }),
        expect.objectContaining({
          condition: "Toate din Anexa 2",
          sourceRange: "B11:M11"
        })
      ])
    );
    expect(artifacts.seed.classification.formulaSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetCell: "M2"
        }),
        expect.objectContaining({
          targetCell: "J18"
        })
      ])
    );
  });

  it("meets the source-map coverage threshold", () => {
    expect(artifacts.sourceMap.coverage.threshold).toBe(RO_NIS2_SOURCE_MAP_THRESHOLD);
    expect(artifacts.sourceMap.coverage.passed).toBe(true);
    expect(artifacts.sourceMap.coverage.ratio).toBeGreaterThanOrEqual(RO_NIS2_SOURCE_MAP_THRESHOLD);
    expect(artifacts.sourceMap.mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetCollection: "service_options",
          targetKey: "108004"
        }),
        expect.objectContaining({
          targetCollection: "classification_formula_signals",
          targetKey: "classification_formula_m2"
        })
      ])
    );
  });

  it("produces deterministic generated seed output", () => {
    const generatedSeed = readFileSync(generatedSeedPath, "utf8");

    expect(generatedSeed).toBe(stableStringify(artifacts.seed));
  });
});
