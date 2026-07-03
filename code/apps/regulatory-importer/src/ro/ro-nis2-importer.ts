import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import {
  cellColumn,
  cellRow,
  columnNumber,
  compareCellRefs,
  readXlsxWorkbook,
  type XlsxSheet,
  type XlsxWorkbook
} from "./xlsx-lite";
import type {
  RoNis2ClassificationFormulaSignal,
  RoNis2ClassificationRule,
  RoNis2Field,
  RoNis2GeneratedArtifacts,
  RoNis2GeneratedSourceMap,
  RoNis2GuidanceText,
  RoNis2HelperListEntry,
  RoNis2ImportReport,
  RoNis2Location,
  RoNis2NotificationDraftMapping,
  RoNis2Question,
  RoNis2Seed,
  RoNis2ServiceCategory,
  RoNis2ServiceOption,
  RoNis2ServiceSector,
  RoNis2ServiceSubsector,
  RoNis2SourceMapEntry,
  RoNis2SourceReference,
  RoNis2WorkbookVersions
} from "./types";

export const RO_NIS2_SCHEMA_VERSION = "0.1.0";
export const RO_NIS2_SOURCE_WORKBOOK = "nis2ro-tool-v-2-1.xlsx";
export const RO_NIS2_SOURCE_MAP_THRESHOLD = 0.98;
export const REQUIRED_RO_NIS2_SHEETS = [
  "Entity data",
  "Entity assessment",
  "Notification form",
  "Liste",
  "Ajutor",
  "Algoritm clasificare"
] as const;
type RoNis2CanonicalSheetName = (typeof REQUIRED_RO_NIS2_SHEETS)[number];

export interface RoNis2WorkbookProfile {
  canonicalSheetNames: Record<RoNis2CanonicalSheetName, readonly string[]>;
  detectedVersion: string;
  profileKey: "ro_nis2_v2_1_english" | "ro_nis2_v2_3_romanian";
  sourceTitle: string;
}

export const RO_NIS2_WORKBOOK_PROFILES: readonly RoNis2WorkbookProfile[] = [
  {
    canonicalSheetNames: {
      "Entity data": ["Entity data"],
      "Entity assessment": ["Entity assessment"],
      "Notification form": ["Notification form"],
      Liste: ["Liste"],
      Ajutor: ["Ajutor"],
      "Algoritm clasificare": ["Algoritm clasificare"]
    },
    detectedVersion: "v2.1_eng_45915",
    profileKey: "ro_nis2_v2_1_english",
    sourceTitle: "NIS2@RO Tool workbook v2.1"
  },
  {
    canonicalSheetNames: {
      "Entity data": ["Date entitate"],
      "Entity assessment": ["Evaluare entitate"],
      "Notification form": ["Formular notificare"],
      Liste: ["Liste"],
      Ajutor: ["Ajutor"],
      "Algoritm clasificare": ["Algoritm clasificare"]
    },
    detectedVersion: "v2.3_46066",
    profileKey: "ro_nis2_v2_3_romanian",
    sourceTitle: "NIS2@RO source workbook v2.3"
  }
] as const;

const DEFAULT_WORKBOOK_PATH = join(process.cwd(), "data/regulatory/countries/ro", RO_NIS2_SOURCE_WORKBOOK);
const DEFAULT_OUTPUT_DIRECTORY = join(process.cwd(), "data/regulatory/countries/ro");

interface ImportOptions {
  outputDirectory?: string;
  workbookPath?: string;
}

interface RequiredSheetValidation {
  missing: string[];
  passed: boolean;
  present: string[];
}

interface DetectedRoWorkbookProfile {
  profile: RoNis2WorkbookProfile;
  sheetByCanonicalName: Record<RoNis2CanonicalSheetName, string>;
}

interface ListeEntityType {
  code: string;
  label: string;
  row: number;
  sectorCode?: string;
  subsectorCode?: string;
}

class SourceMapBuilder {
  private readonly ids = new Set<string>();

  readonly mappings: RoNis2SourceMapEntry[] = [];

  add(
    targetCollection: string,
    targetKey: string,
    source: RoNis2SourceReference[],
    kind: string,
    label?: string
  ): string {
    const baseId = `ro-nis2-${slugify(targetCollection)}-${slugify(targetKey)}`;
    let id = baseId;
    let suffix = 2;

    while (this.ids.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    this.ids.add(id);
    this.mappings.push({
      id,
      kind,
      label,
      source,
      targetCollection,
      targetKey
    });

    return id;
  }
}

export const importRoNis2Workbook = (options: ImportOptions = {}): RoNis2GeneratedArtifacts => {
  const workbookPath = options.workbookPath ?? DEFAULT_WORKBOOK_PATH;
  const workbook = readXlsxWorkbook(workbookPath);
  const detectedProfile = detectRoNis2WorkbookProfile(workbook.sheetNames);
  const requiredSheetValidation = validateRoRequiredSheetNames(workbook.sheetNames);

  if (!requiredSheetValidation.passed) {
    throw new Error(`Romania NIS2 workbook is missing required sheets: ${requiredSheetValidation.missing.join(", ")}`);
  }

  const sourceMapBuilder = new SourceMapBuilder();
  const normalizer = valueNormalizerForProfile(detectedProfile.profile);
  const entityData = normalizeSheet(requireSheet(workbook, detectedProfile.sheetByCanonicalName["Entity data"]), normalizer);
  const entityAssessment = normalizeSheet(requireSheet(workbook, detectedProfile.sheetByCanonicalName["Entity assessment"]), normalizer);
  const notificationForm = normalizeSheet(requireSheet(workbook, detectedProfile.sheetByCanonicalName["Notification form"]), normalizer);
  const liste = normalizeSheet(requireSheet(workbook, detectedProfile.sheetByCanonicalName.Liste), normalizer);
  const algorithm = normalizeSheet(requireSheet(workbook, detectedProfile.sheetByCanonicalName["Algoritm clasificare"]), normalizer);
  const workbookVersions = extractWorkbookVersions(entityData, entityAssessment);
  const detectedVersion =
    detectedProfile.profile.profileKey === "ro_nis2_v2_3_romanian"
      ? detectSourceVersion(detectedProfile.profile, workbookVersions)
      : undefined;
  const workbookHash = sha256File(workbookPath);
  const serviceCatalog = extractServiceCatalog(liste, entityAssessment, sourceMapBuilder);
  const classificationRules = extractClassificationRules(algorithm, sourceMapBuilder);
  const classificationFormulaSignals = extractFormulaSignals(
    algorithm,
    "classification_formula_signals",
    "classification_formula",
    sourceMapBuilder
  );
  const sourceWorkbook = basename(workbookPath);

  const seed: RoNis2Seed = {
    activationStatus: "review_required",
    classification: {
      formulaSignals: classificationFormulaSignals,
      rules: classificationRules
    },
    country: "ro",
    countryPackStatus: "full_pack_ready_after_validation",
    entityFields: extractEntityFields(entityData, sourceMapBuilder),
    frameworkKey: "nis2",
    generatedBy: "apps/regulatory-importer/src/ro",
    detectedVersion,
    guidance: extractGuidance(liste, entityAssessment, sourceMapBuilder),
    helperLists: extractHelperLists(liste, sourceMapBuilder),
    jurisdiction: "RO",
    locations: extractLocations(liste, sourceMapBuilder),
    notificationDraftMapping: extractNotificationDraftMapping(notificationForm, sourceMapBuilder),
    packVersion: buildPackVersion(workbookVersions),
    questions: {
      article9: extractQuestions(entityAssessment, [169, 170, 171, 172], "article9", sourceMapBuilder),
      law294: extractQuestions(entityAssessment, [153], "law294", sourceMapBuilder),
      relationshipWithRomania: extractQuestions(entityAssessment, [150, 151, 152, 159, 160], "relationship", sourceMapBuilder)
    },
    schemaVersion: RO_NIS2_SCHEMA_VERSION,
    serviceCatalog,
    source: {
      contentHashSha256: workbookHash,
      localFilePath: `data/regulatory/countries/ro/${sourceWorkbook}`,
      sourceType: "internal_excel_seed",
      title: detectedProfile.profile.sourceTitle,
      trustLevel: "internal_seed"
    },
    validationStatus: "validated",
    workbook: {
      detectedSheets: workbook.sheetNames,
      requiredSheets: [...REQUIRED_RO_NIS2_SHEETS],
      versions: workbookVersions
    }
  };

  const totalMappableItems = countMappableItems(seed);
  const mappedItems = sourceMapBuilder.mappings.length;
  const coverageRatio = roundRatio(mappedItems / totalMappableItems);
  const sourceMap: RoNis2GeneratedSourceMap = {
    country: "ro",
    coverage: {
      mappedItems,
      passed: coverageRatio >= RO_NIS2_SOURCE_MAP_THRESHOLD,
      ratio: coverageRatio,
      threshold: RO_NIS2_SOURCE_MAP_THRESHOLD,
      totalMappableItems
    },
    mappings: sourceMapBuilder.mappings,
    schemaVersion: RO_NIS2_SCHEMA_VERSION,
    detectedVersion,
    sourceWorkbook,
    sourceWorkbookHashSha256: workbookHash,
    workbookVersions
  };

  const report: RoNis2ImportReport = {
    country: "ro",
    detectedVersion,
    limitations: [
      "The importer preserves workbook formulas and cached values but does not recalculate Excel formulas.",
      "Workbook data-validation/drop-down metadata is represented through visible helper tables and source-mapped cells.",
      "Romania legal logic remains review_required and is not activated automatically by the import."
    ],
    requiredSheetValidation,
    schemaVersion: RO_NIS2_SCHEMA_VERSION,
    sourceMapCoverage: sourceMap.coverage,
    sourceWorkbook,
    sourceWorkbookHashSha256: workbookHash,
    status: "validated",
    summary: {
      article9Questions: seed.questions.article9.length,
      classificationFormulaSignals: seed.classification.formulaSignals.length,
      classificationRules: seed.classification.rules.length,
      entityFields: seed.entityFields.length,
      locations: seed.locations.length,
      notificationDraftMappings: seed.notificationDraftMapping.length,
      relationshipQuestions: seed.questions.relationshipWithRomania.length,
      serviceOptions: seed.serviceCatalog.options.length
    },
    validationChecks: buildValidationChecks(seed, sourceMap, requiredSheetValidation),
    workbookVersions
  };

  return { report, seed, sourceMap };
};

export const writeRoNis2GeneratedArtifacts = (options: ImportOptions = {}): RoNis2GeneratedArtifacts => {
  const outputDirectory = options.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
  const artifacts = importRoNis2Workbook(options);

  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "ro-nis2.seed.generated.json"), stableStringify(artifacts.seed));
  writeFileSync(join(outputDirectory, "ro-nis2-source-map.generated.json"), stableStringify(artifacts.sourceMap));
  writeFileSync(join(outputDirectory, "ro-nis2-import-report.generated.json"), stableStringify(artifacts.report));

  return artifacts;
};

export const validateRoRequiredSheetNames = (sheetNames: readonly string[]): RequiredSheetValidation => {
  const profile = detectRoNis2WorkbookProfile(sheetNames, { throwOnMissing: false });
  const present = REQUIRED_RO_NIS2_SHEETS.flatMap((sheet) => {
    const actualName = profile?.sheetByCanonicalName[sheet];
    return actualName ? [actualName] : [];
  });
  const missing = REQUIRED_RO_NIS2_SHEETS.filter((sheet) => !profile?.sheetByCanonicalName[sheet]);

  return {
    missing,
    passed: missing.length === 0,
    present
  };
};

export const detectRoNis2WorkbookProfile = (
  sheetNames: readonly string[],
  options: { throwOnMissing?: boolean } = {}
): DetectedRoWorkbookProfile => {
  const throwOnMissing = options.throwOnMissing ?? true;
  const sheetNameSet = new Set(sheetNames);
  const candidates = RO_NIS2_WORKBOOK_PROFILES.map((profile) => {
    const sheetByCanonicalName = Object.fromEntries(
      REQUIRED_RO_NIS2_SHEETS.map((canonicalName) => [
        canonicalName,
        profile.canonicalSheetNames[canonicalName].find((sheetName) => sheetNameSet.has(sheetName))
      ])
    ) as Record<RoNis2CanonicalSheetName, string | undefined>;
    const presentCount = Object.values(sheetByCanonicalName).filter(Boolean).length;

    return {
      profile,
      presentCount,
      sheetByCanonicalName
    };
  }).sort((left, right) => right.presentCount - left.presentCount);
  const best = candidates[0];
  if (!best || best.presentCount === 0) {
    if (throwOnMissing) {
      throw new Error("Romania NIS2 workbook profile could not be detected.");
    }
    return {
      profile: RO_NIS2_WORKBOOK_PROFILES[0]!,
      sheetByCanonicalName: {} as Record<RoNis2CanonicalSheetName, string>
    };
  }

  const missing = REQUIRED_RO_NIS2_SHEETS.filter((canonicalName) => !best.sheetByCanonicalName[canonicalName]);
  if (missing.length > 0 && throwOnMissing) {
    throw new Error(`Romania NIS2 workbook is missing required sheets: ${missing.join(", ")}`);
  }

  return {
    profile: best.profile,
    sheetByCanonicalName: best.sheetByCanonicalName as Record<RoNis2CanonicalSheetName, string>
  };
};

export const normalizeRoNis2WorkbookValue = (value: string): string => {
  const normalized = normalizeWhitespace(value);
  const canonical = normalized.normalize("NFKC").toLocaleLowerCase("ro-RO");
  const mapped = new Map<string, string>([
    ["da", "yes"],
    ["nu", "no"],
    ["selectați", ""],
    ["selectati", ""],
    ["mică și micro", "small_micro"],
    ["mica si micro", "small_micro"],
    ["mijlocie", "medium"],
    ["mare", "large"],
    ["mediu", "medium"],
    ["ridicat", "high"]
  ]).get(canonical);

  return mapped ?? normalized;
};

export const stableStringify = (value: unknown): string => `${stableJson(value, 0)}\n`;

const extractWorkbookVersions = (entityData: XlsxSheet, entityAssessment: XlsxSheet): RoNis2WorkbookVersions => ({
  entityAssessment: parseVersion(entityAssessment.getCell("D2")),
  entityData: parseVersion(entityData.getCell("F2"))
});

const extractEntityFields = (sheet: XlsxSheet, sourceMap: SourceMapBuilder): RoNis2Field[] => {
  const rows: Array<{ category: string; required?: boolean; row: number }> = [
    { row: 12, category: "entity_identification", required: true },
    { row: 13, category: "entity_identification", required: true },
    { row: 14, category: "entity_identification", required: true },
    ...range(16, 30).map((row) => ({ row, category: "entity_contact", required: row >= 16 && row <= 20 })),
    { row: 32, category: "activity", required: true },
    { row: 33, category: "activity" },
    ...range(37, 42).map((row) => ({ row, category: "cybersecurity_responsible", required: row === 37 })),
    ...range(44, 52).map((row) => ({ row, category: "permanent_monitoring_contact", required: row === 45 })),
    { row: 54, category: "network_and_systems", required: true },
    { row: 56, category: "eu_presence", required: true },
    { row: 57, category: "eu_presence" },
    { row: 58, category: "eu_presence" },
    ...range(60, 70).map((row) => ({ row, category: "non_eu_representative", required: row === 60 })),
    ...range(72, 76).map((row) => ({ row, category: "attached_documents", required: row === 72 })),
    { row: 78, category: "entity_size", required: true },
    ...range(81, 84).map((row) => ({ row, category: "entity_representation", required: true }))
  ];

  return rows.flatMap(({ category, required = false, row }) => {
    const promptCell = `C${row}`;
    const alternatePromptCell = `D${row}`;
    const prompt = normalizeWhitespace(sheet.getCell(promptCell));
    const alternatePrompt = normalizeWhitespace(sheet.getCell(alternatePromptCell));
    const label = isUnsetPlaceholder(prompt) && alternatePrompt ? alternatePrompt : prompt;

    if (!label || isSectionHeading(label)) {
      return [];
    }

    const answerCell = isUnsetPlaceholder(prompt) && alternatePrompt ? promptCell : alternatePromptCell;
    const key = uniqueWorkbookKey("entity_field", label, row);
    const sourceMapId = sourceMap.add(
      "entity_fields",
      key,
      [sourceCell(sheet, promptCell), alternatePrompt ? sourceCell(sheet, alternatePromptCell) : undefined].filter(
        isDefined
      ),
      "field",
      label
    );

    return [
      {
        answerCell,
        category,
        key,
        label,
        promptCell,
        required,
        sourceMapId
      }
    ];
  });
};

const extractServiceCatalog = (
  liste: XlsxSheet,
  assessment: XlsxSheet,
  sourceMap: SourceMapBuilder
): RoNis2Seed["serviceCatalog"] => {
  const categories = extractServiceCategories(liste, sourceMap);
  const sectors = extractServiceSectors(liste, sourceMap);
  const subsectors = extractServiceSubsectors(liste, sourceMap);
  const listeEntityTypes = extractListeEntityTypes(liste);
  const options = extractServiceOptions(assessment, liste, sectors, subsectors, listeEntityTypes, sourceMap);

  return {
    categories,
    options,
    sectors,
    subsectors
  };
};

const extractServiceCategories = (sheet: XlsxSheet, sourceMap: SourceMapBuilder): RoNis2ServiceCategory[] =>
  range(3, 116).flatMap((row) => {
    const code = normalizeWhitespace(sheet.getCell(`R${row}`));
    const label = normalizeWhitespace(sheet.getCell(`Q${row}`));

    if (!code || !label || !isHighLevelCategory(label)) {
      return [];
    }

    const sourceMapId = sourceMap.add(
      "service_categories",
      code,
      [sourceCell(sheet, `Q${row}`), sourceCell(sheet, `R${row}`)],
      "service_category",
      label
    );

    return [{ code, label, sourceMapId }];
  });

const extractServiceSectors = (sheet: XlsxSheet, sourceMap: SourceMapBuilder): RoNis2ServiceSector[] => {
  const helperSectors = range(3, 20).flatMap((row) => {
    const code = normalizeWhitespace(sheet.getCell(`AP${row}`));
    const label = normalizeWhitespace(sheet.getCell(`AQ${row}`));

    if (!code || !label) {
      return [];
    }

    return [{ code, label, sourceCells: [`AP${row}`, `AQ${row}`] }];
  });

  const hierarchySectors = range(3, 116).flatMap((row) => {
    const code = normalizeWhitespace(sheet.getCell(`S${row}`));
    const label = normalizeWhitespace(sheet.getCell(`Q${row}`));
    const typeCode = normalizeWhitespace(sheet.getCell(`U${row}`));

    if (!code || typeCode || !label || !isSectorHeading(label)) {
      return [];
    }

    return [{ code, label, sourceCells: [`Q${row}`, `S${row}`] }];
  });

  return uniqueBy([...helperSectors, ...hierarchySectors], (sector) => sector.code)
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((sector) => ({
      categoryCode: sector.code.startsWith("2") ? "2" : "1",
      code: sector.code,
      label: sector.label,
      sourceMapId: sourceMap.add(
        "service_sectors",
        sector.code,
        sector.sourceCells.map((cell) => sourceCell(sheet, cell)),
        "service_sector",
        sector.label
      )
    }));
};

const extractServiceSubsectors = (sheet: XlsxSheet, sourceMap: SourceMapBuilder): RoNis2ServiceSubsector[] =>
  range(3, 20).flatMap((row) => {
    const code = normalizeWhitespace(sheet.getCell(`AS${row}`));
    const label = normalizeWhitespace(sheet.getCell(`AT${row}`));

    if (!code || !label) {
      return [];
    }

    return [
      {
        code,
        label,
        sectorCode: code.slice(0, 3),
        sourceMapId: sourceMap.add(
          "service_subsectors",
          code,
          [sourceCell(sheet, `AS${row}`), sourceCell(sheet, `AT${row}`)],
          "service_subsector",
          label
        )
      }
    ];
  });

const extractListeEntityTypes = (sheet: XlsxSheet): ListeEntityType[] =>
  range(3, 116).flatMap((row) => {
    const code = normalizeWhitespace(sheet.getCell(`U${row}`));
    const label = normalizeWhitespace(sheet.getCell(`Q${row}`));

    if (!code || !label) {
      return [];
    }

    return [
      {
        code,
        label,
        row,
        sectorCode: normalizeWhitespace(sheet.getCell(`S${row}`)) || undefined,
        subsectorCode: normalizeWhitespace(sheet.getCell(`T${row}`)) || undefined
      }
    ];
  });

const extractServiceOptions = (
  assessment: XlsxSheet,
  liste: XlsxSheet,
  sectors: readonly RoNis2ServiceSector[],
  subsectors: readonly RoNis2ServiceSubsector[],
  listeEntityTypes: readonly ListeEntityType[],
  sourceMap: SourceMapBuilder
): RoNis2ServiceOption[] => {
  const sectorByLabel = new Map(sectors.map((sector) => [normalizeKey(sector.label), sector]));
  const subsectorsByLabel = groupBy(subsectors, (subsector) => normalizeKey(subsector.label));
  const entityTypesByLabel = groupBy(listeEntityTypes, (entityType) => normalizeKey(entityType.label));
  let currentSectorCode: string | undefined;
  let currentSubsectorCode: string | undefined;

  return range(28, 142).flatMap((row) => {
    const label = normalizeWhitespace(assessment.getCell(`C${row}`));
    const response = normalizeWhitespace(assessment.getCell(`D${row}`));

    if (!label) {
      return [];
    }

    const sector = sectorByLabel.get(normalizeKey(label));
    if (sector) {
      currentSectorCode = sector.code;
      currentSubsectorCode = undefined;
      return [];
    }

    const subsector = pickSubsector(subsectorsByLabel.get(normalizeKey(label)) ?? [], currentSectorCode);
    if (subsector && !isNoValue(response)) {
      currentSubsectorCode = subsector.code;
      return [];
    }

    if (!isNoValue(response)) {
      return [];
    }

    const matchedEntityType =
      row === 142
        ? undefined
        : matchEntityType(label, currentSectorCode, currentSubsectorCode, entityTypesByLabel, listeEntityTypes);
    const code = row === 142 ? "none_of_oug_155_2024_services" : (matchedEntityType?.code ?? `assessment_c${row}`);
    const source = [sourceCell(assessment, `C${row}`), sourceCell(assessment, `D${row}`)];

    if (matchedEntityType) {
      source.push(sourceCell(liste, `Q${matchedEntityType.row}`), sourceCell(liste, `U${matchedEntityType.row}`));
    }

    const sourceMapId = sourceMap.add("service_options", code, source, "service_option", label);

    return [
      {
        code,
        label,
        optionCell: `C${row}`,
        responseCell: `D${row}`,
        sectorCode: row === 142 ? undefined : (matchedEntityType?.sectorCode ?? currentSectorCode),
        sourceMapId,
        subsectorCode: row === 142 ? undefined : (matchedEntityType?.subsectorCode ?? currentSubsectorCode)
      }
    ];
  });
};

const extractQuestions = (
  sheet: XlsxSheet,
  rows: readonly number[],
  collection: "article9" | "law294" | "relationship",
  sourceMap: SourceMapBuilder
): RoNis2Question[] =>
  rows.map((row) => {
    const label = normalizeWhitespace(sheet.getCell(`C${row}`));
    const key = uniqueWorkbookKey(collection, label, row);
    const answerType = collection === "article9" && (row === 170 || row === 171) ? "impact_select" : "yes_no";
    const sourceMapId = sourceMap.add(
      `${collection}_questions`,
      key,
      [sourceCell(sheet, `C${row}`), sourceCell(sheet, `D${row}`)],
      "question",
      label
    );

    return {
      answerCell: `D${row}`,
      answerType,
      key,
      label,
      promptCell: `C${row}`,
      sourceMapId
    };
  });

const extractNotificationDraftMapping = (
  sheet: XlsxSheet,
  sourceMap: SourceMapBuilder
): RoNis2NotificationDraftMapping[] =>
  [...sheet.cells.values()]
    .filter((cell) => cell.formula)
    .sort((left, right) => compareCellRefs(left.ref, right.ref))
    .map((cell) => {
      const row = cellRow(cell.ref);
      const targetColumn = cellColumn(cell.ref);
      const label = normalizeWhitespace(sheet.getCell(`C${row}`)) || undefined;
      const sourceReferences = parseFormulaSourceReferences(cell.formula ?? "");
      const key = `notification_${targetColumn.toLowerCase()}${row}`;
      const sourceMapId = sourceMap.add(
        "notification_draft_mapping",
        key,
        [sourceCell(sheet, cell.ref), ...sourceReferences],
        "notification_formula",
        label
      );

      return {
        formula: cell.formula ?? "",
        key,
        label,
        sourceMapId,
        sourceReferences,
        targetCell: cell.ref
      };
    });

const extractClassificationRules = (
  sheet: XlsxSheet,
  sourceMap: SourceMapBuilder
): RoNis2ClassificationRule[] =>
  range(2, 12).flatMap((row) => {
    if (row === 10) {
      return [];
    }

    const condition = normalizeWhitespace(sheet.getCell(`D${row}`));
    const priority = normalizeWhitespace(sheet.getCell(`B${row}`)) || normalizeWhitespace(sheet.getCell(`C${row}`));

    if (!condition && !priority) {
      return [];
    }

    const resultCells = Object.fromEntries(
      ["E", "F", "G", "H", "I", "J", "K", "L", "M"]
        .map((column) => [`${column}${row}`, normalizeWhitespace(sheet.getCell(`${column}${row}`))])
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    );
    const key = uniqueWorkbookKey("classification_rule", condition || `row_${row}`, row);
    const sourceMapId = sourceMap.add(
      "classification_rules",
      key,
      [{ sheet: sheet.name, range: `B${row}:M${row}` }],
      "classification_rule",
      condition
    );

    return [
      {
        condition,
        key,
        priority: priority || undefined,
        resultCells,
        row,
        sourceMapId,
        sourceRange: `B${row}:M${row}`
      }
    ];
  });

const extractFormulaSignals = (
  sheet: XlsxSheet,
  targetCollection: string,
  keyPrefix: string,
  sourceMap: SourceMapBuilder
): RoNis2ClassificationFormulaSignal[] =>
  [...sheet.cells.values()]
    .filter((cell) => cell.formula)
    .sort((left, right) => compareCellRefs(left.ref, right.ref))
    .map((cell) => {
      const sourceReferences = parseFormulaSourceReferences(cell.formula ?? "");
      const key = `${keyPrefix}_${cell.ref.toLowerCase()}`;
      const sourceMapId = sourceMap.add(
        targetCollection,
        key,
        [sourceCell(sheet, cell.ref), ...sourceReferences],
        "formula_signal",
        cell.ref
      );

      return {
        formula: cell.formula ?? "",
        key,
        sourceMapId,
        sourceReferences,
        targetCell: cell.ref
      };
    });

const extractLocations = (sheet: XlsxSheet, sourceMap: SourceMapBuilder): RoNis2Location[] =>
  range(3, 50).flatMap((row) => {
    const county = normalizeWhitespace(sheet.getCell(`J${row}`));
    const residence = normalizeWhitespace(sheet.getCell(`K${row}`));
    const code = normalizeWhitespace(sheet.getCell(`L${row}`));

    if (!county || !code) {
      return [];
    }

    const sourceMapId = sourceMap.add(
      "locations",
      code,
      ["J", "K", "L", "M", "N", "O"].map((column) => sourceCell(sheet, `${column}${row}`)),
      "location",
      county
    );

    return [
      {
        code,
        county,
        countyId: normalizeWhitespace(sheet.getCell(`N${row}`)),
        districtCode: normalizeWhitespace(sheet.getCell(`O${row}`)),
        regionCode: normalizeWhitespace(sheet.getCell(`M${row}`)),
        residence,
        sourceMapId
      }
    ];
  });

const extractHelperLists = (
  sheet: XlsxSheet,
  sourceMap: SourceMapBuilder
): RoNis2Seed["helperLists"] => ({
  classificationOptions: [
    ...extractRectangularHelperList(sheet, "classification_select", range(3, 6), ["AC", "AD", "AE", "AF", "AG", "AH"], sourceMap),
    ...extractRectangularHelperList(sheet, "article9_helper", range(9, 12), ["AC", "AD", "AK", "AL", "AM", "AN"], sourceMap)
  ],
  resultStates: extractRectangularHelperList(sheet, "result_state", range(3, 9), ["G", "H"], sourceMap),
  sizeCategories: extractRectangularHelperList(sheet, "size_category", range(3, 6), ["Y", "Z", "AA"], sourceMap),
  sizeThresholds: extractRectangularHelperList(sheet, "size_threshold", range(3, 6), ["C", "D", "E", "F"], sourceMap),
  yesNo: extractRectangularHelperList(sheet, "yes_no", range(3, 6), ["B"], sourceMap)
});

const extractRectangularHelperList = (
  sheet: XlsxSheet,
  keyPrefix: string,
  rows: readonly number[],
  columns: readonly string[],
  sourceMap: SourceMapBuilder
): RoNis2HelperListEntry[] =>
  rows.flatMap((row) => {
    const value = Object.fromEntries(
      columns
        .map((column) => [column, normalizeWhitespace(sheet.getCell(`${column}${row}`))])
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    );

    if (Object.keys(value).length === 0) {
      return [];
    }

    const key = `${keyPrefix}_${row}`;
    const sourceMapId = sourceMap.add(
      "helper_lists",
      key,
      columns.map((column) => sourceCell(sheet, `${column}${row}`)),
      "helper_list",
      key
    );

    return [{ key, sourceMapId, value }];
  });

const extractGuidance = (
  liste: XlsxSheet,
  assessment: XlsxSheet,
  sourceMap: SourceMapBuilder
): RoNis2GuidanceText[] => [
  ...["W3", "W4", "W5"].flatMap((cell) => guidanceFromCell(liste, cell, sourceMap)),
  ...["C185", "C186"].flatMap((cell) => guidanceFromCell(assessment, cell, sourceMap))
];

const guidanceFromCell = (sheet: XlsxSheet, cell: string, sourceMap: SourceMapBuilder): RoNis2GuidanceText[] => {
  const text = normalizeWhitespace(sheet.getCell(cell));

  if (!text) {
    return [];
  }

  const key = uniqueWorkbookKey("guidance", text.slice(0, 80), cellRow(cell));
  const sourceMapId = sourceMap.add("guidance", key, [sourceCell(sheet, cell)], "guidance_text", key);

  return [{ key, sourceCell: `${sheet.name}!${cell}`, sourceMapId, text }];
};

const buildValidationChecks = (
  seed: RoNis2Seed,
  sourceMap: RoNis2GeneratedSourceMap,
  sheetValidation: RequiredSheetValidation
): RoNis2ImportReport["validationChecks"] => [
  {
    key: "required_sheets",
    message: "All required Romania workbook sheets are present.",
    passed: sheetValidation.passed
  },
  {
    key: "workbook_versions",
    message: "Entity data and entity assessment workbook versions were extracted.",
    passed: Boolean(seed.workbook.versions.entityData && seed.workbook.versions.entityAssessment)
  },
  {
    key: "entity_fields",
    message: "Entity, contact, activity, network, document, and representation fields were extracted.",
    passed: seed.entityFields.length >= 45
  },
  {
    key: "service_options",
    message: "Service/entity type options were extracted from the workbook.",
    passed: seed.serviceCatalog.options.length >= 60
  },
  {
    key: "classification_rules",
    message: "Classification rules and formula signals were source-mapped.",
    passed: seed.classification.rules.length >= 8 && seed.classification.formulaSignals.length >= 20
  },
  {
    key: "notification_mapping",
    message: "Notification draft formulas were source-mapped.",
    passed: seed.notificationDraftMapping.length >= 40
  },
  {
    key: "source_map_coverage",
    message: "Generated mappable seed items meet the source-map coverage threshold.",
    passed: sourceMap.coverage.passed
  }
];

const countMappableItems = (seed: RoNis2Seed): number =>
  seed.entityFields.length +
  seed.serviceCatalog.categories.length +
  seed.serviceCatalog.sectors.length +
  seed.serviceCatalog.subsectors.length +
  seed.serviceCatalog.options.length +
  seed.questions.relationshipWithRomania.length +
  seed.questions.law294.length +
  seed.questions.article9.length +
  seed.notificationDraftMapping.length +
  seed.classification.rules.length +
  seed.classification.formulaSignals.length +
  seed.locations.length +
  seed.helperLists.yesNo.length +
  seed.helperLists.sizeThresholds.length +
  seed.helperLists.sizeCategories.length +
  seed.helperLists.resultStates.length +
  seed.helperLists.classificationOptions.length +
  seed.guidance.length;

const matchEntityType = (
  label: string,
  sectorCode: string | undefined,
  subsectorCode: string | undefined,
  entityTypesByLabel: ReadonlyMap<string, readonly ListeEntityType[]>,
  entityTypes: readonly ListeEntityType[]
): ListeEntityType | undefined => {
  const exactMatches = entityTypesByLabel.get(normalizeKey(label)) ?? [];
  const contextualExactMatches = exactMatches.filter(
    (entityType) =>
      (!sectorCode || entityType.sectorCode === sectorCode) &&
      (!subsectorCode || entityType.subsectorCode === subsectorCode)
  );

  if (contextualExactMatches.length === 1) {
    return contextualExactMatches[0];
  }

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const contextualMatches = entityTypes.filter(
    (entityType) =>
      entityType.sectorCode === sectorCode && (!subsectorCode || entityType.subsectorCode === subsectorCode)
  );

  return contextualMatches.length === 1 ? contextualMatches[0] : undefined;
};

const pickSubsector = (
  subsectors: readonly RoNis2ServiceSubsector[],
  currentSectorCode: string | undefined
): RoNis2ServiceSubsector | undefined => {
  if (subsectors.length === 1) {
    return subsectors[0];
  }

  return subsectors.find((subsector) => subsector.sectorCode === currentSectorCode);
};

const parseFormulaSourceReferences = (formula: string): RoNis2SourceReference[] => {
  const references = new Map<string, RoNis2SourceReference>();
  const addReference = (sheet: string, startColumn: string, startRow: string, endColumn?: string, endRow?: string) => {
    const location = endColumn && endRow ? `${startColumn}${startRow}:${endColumn}${endRow}` : `${startColumn}${startRow}`;
    const key = `${sheet}!${location}`;

    references.set(key, endColumn && endRow ? { sheet, range: location } : { sheet, cell: location });
  };

  for (const match of formula.matchAll(/'([^']+)'!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?/g)) {
    addReference(match[1], match[2], match[3], match[4], match[5]);
  }

  for (const match of formula.matchAll(/\b([A-Za-z][A-Za-z0-9_ ]*)!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?/g)) {
    addReference(match[1], match[2], match[3], match[4], match[5]);
  }

  return [...references.values()].sort((left, right) => {
    const leftLocation = left.cell ?? left.range ?? "";
    const rightLocation = right.cell ?? right.range ?? "";
    return left.sheet === right.sheet ? leftLocation.localeCompare(rightLocation) : left.sheet.localeCompare(right.sheet);
  });
};

const sourceCell = (sheet: XlsxSheet, cell: string): RoNis2SourceReference => {
  const workbookCell = sheet.cells.get(cell);

  return {
    cell,
    formula: workbookCell?.formula,
    sheet: sheet.name,
    value: workbookCell?.value
  };
};

const requireSheet = (workbook: XlsxWorkbook, name: string): XlsxSheet => {
  const sheet = workbook.getSheet(name);

  if (!sheet) {
    throw new Error(`Required workbook sheet not found: ${name}`);
  }

  return sheet;
};

const normalizeSheet = (sheet: XlsxSheet, normalizeValue: (value: string) => string): XlsxSheet => {
  if (normalizeValue("") === "") {
    const probe = "Da";
    if (normalizeValue(probe) === probe) {
      return sheet;
    }
  }

  const cells = new Map(
    [...sheet.cells.entries()].map(([ref, cell]) => [
      ref,
      {
        ...cell,
        value: normalizeValue(cell.value)
      }
    ])
  );

  return {
    ...sheet,
    cells,
    getCell(ref: string) {
      return cells.get(ref)?.value ?? "";
    },
    getFormula(ref: string) {
      return cells.get(ref)?.formula;
    }
  };
};

const valueNormalizerForProfile = (profile: RoNis2WorkbookProfile): ((value: string) => string) =>
  profile.profileKey === "ro_nis2_v2_3_romanian" ? normalizeRoNis2WorkbookValue : normalizeWhitespace;

const parseVersion = (value: string): string => normalizeWhitespace(value.replace(/^(Versiunea|Version):\s*/i, ""));

const detectSourceVersion = (profile: RoNis2WorkbookProfile, versions: RoNis2WorkbookVersions): string => {
  const version = [versions.entityData, versions.entityAssessment].find((candidate) => /v2\.3_46066/i.test(candidate));
  return version ? version.toLowerCase() : profile.detectedVersion;
};

const buildPackVersion = (versions: RoNis2WorkbookVersions): string =>
  `ro-nis2-${slugify(versions.entityData)}-${slugify(versions.entityAssessment)}`;

const sha256File = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

const uniqueWorkbookKey = (prefix: string, label: string, row: number): string => `${prefix}_${row}_${slugify(label)}`;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const isNoValue = (value: string): boolean => ["No", "Nu", "no"].includes(value) || normalizeRoNis2WorkbookValue(value) === "no";

const isUnsetPlaceholder = (value: string): boolean =>
  value === "Select" || value === "Selectați" || normalizeRoNis2WorkbookValue(value) === "";

const normalizeKey = (value: string): string => slugify(value).replace(/^providers?_of_/, "").replace(/_providers?$/, "");

const slugify = (value: string): string => {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

  return slug || "item";
};

const isSectionHeading = (label: string): boolean =>
  [
    "GENERAL INFORMATION",
    "SPECIFIC DATA",
    "ENTITY REPRESENTATION",
    "ATTACHED DOCUMENTS",
    "Data regarding the activity carried out by the entity",
    "Data concerning computer networks and systems",
    "Data concerning the presence in the EU"
  ].includes(label);

const isHighLevelCategory = (label: string): boolean =>
  label.includes("SECTORS OF HIGH CRITICALITY") || label.includes("OTHER CRITICAL SECTORS");

const isSectorHeading = (label: string): boolean =>
  label === label.toUpperCase() && !isHighLevelCategory(label) && !["Nomenclator NIS2"].includes(label);

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_unused, index) => start + index);

const uniqueBy = <T>(items: readonly T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  }

  return output;
};

const groupBy = <T>(items: readonly T[], getKey: (item: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
};

const roundRatio = (value: number): number => Number(value.toFixed(4));

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

const stableJson = (value: unknown, depth: number): string => {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return `[\n${value.map((item) => `${nextIndent}${stableJson(item, depth + 1)}`).join(",\n")}\n${indent}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter((entry): entry is [string, Exclude<unknown, undefined>] => entry[1] !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    if (entries.length === 0) {
      return "{}";
    }

    return `{\n${entries
      .map(([key, entryValue]) => `${nextIndent}${JSON.stringify(key)}: ${stableJson(entryValue, depth + 1)}`)
      .join(",\n")}\n${indent}}`;
  }

  return JSON.stringify(value);
};
