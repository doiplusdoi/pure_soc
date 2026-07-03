export type RoNis2ActivationStatus = "draft" | "validated" | "review_required" | "active" | "superseded";

export interface RoNis2SourceReference {
  cell?: string;
  formula?: string;
  range?: string;
  sheet: string;
  value?: string;
}

export interface RoNis2SourceMapEntry {
  id: string;
  kind: string;
  label?: string;
  source: RoNis2SourceReference[];
  targetCollection: string;
  targetKey: string;
}

export interface RoNis2GeneratedSourceMap {
  country: "ro";
  coverage: {
    mappedItems: number;
    passed: boolean;
    ratio: number;
    threshold: number;
    totalMappableItems: number;
  };
  mappings: RoNis2SourceMapEntry[];
  schemaVersion: string;
  detectedVersion?: string;
  sourceWorkbook: string;
  sourceWorkbookHashSha256: string;
  workbookVersions: RoNis2WorkbookVersions;
}

export interface RoNis2WorkbookVersions {
  entityAssessment: string;
  entityData: string;
}

export interface RoNis2Field {
  answerCell?: string;
  category: string;
  key: string;
  label: string;
  promptCell: string;
  required: boolean;
  sourceMapId: string;
}

export interface RoNis2ServiceCategory {
  code: string;
  label: string;
  sourceMapId: string;
}

export interface RoNis2ServiceSector {
  categoryCode?: string;
  code: string;
  label: string;
  sourceMapId: string;
}

export interface RoNis2ServiceSubsector {
  code: string;
  label: string;
  sectorCode?: string;
  sourceMapId: string;
}

export interface RoNis2ServiceOption {
  code: string;
  label: string;
  optionCell: string;
  responseCell: string;
  sectorCode?: string;
  sourceMapId: string;
  subsectorCode?: string;
}

export interface RoNis2Question {
  answerCell: string;
  answerType: "select" | "yes_no" | "impact_select";
  key: string;
  label: string;
  promptCell: string;
  sourceMapId: string;
}

export interface RoNis2NotificationDraftMapping {
  formula: string;
  key: string;
  label?: string;
  sourceMapId: string;
  sourceReferences: RoNis2SourceReference[];
  targetCell: string;
}

export interface RoNis2ClassificationRule {
  condition: string;
  key: string;
  priority?: string;
  resultCells: Record<string, string>;
  row: number;
  sourceMapId: string;
  sourceRange: string;
}

export interface RoNis2ClassificationFormulaSignal {
  formula: string;
  key: string;
  sourceMapId: string;
  sourceReferences: RoNis2SourceReference[];
  targetCell: string;
}

export interface RoNis2Location {
  code: string;
  county: string;
  countyId: string;
  districtCode: string;
  regionCode: string;
  residence: string;
  sourceMapId: string;
}

export interface RoNis2HelperListEntry {
  key: string;
  sourceMapId: string;
  value: Record<string, string>;
}

export interface RoNis2GuidanceText {
  key: string;
  sourceMapId: string;
  sourceCell: string;
  text: string;
}

export interface RoNis2Seed {
  activationStatus: RoNis2ActivationStatus;
  classification: {
    formulaSignals: RoNis2ClassificationFormulaSignal[];
    rules: RoNis2ClassificationRule[];
  };
  country: "ro";
  countryPackStatus: "full_pack_ready_after_validation";
  entityFields: RoNis2Field[];
  frameworkKey: "nis2";
  generatedBy: string;
  guidance: RoNis2GuidanceText[];
  helperLists: {
    classificationOptions: RoNis2HelperListEntry[];
    resultStates: RoNis2HelperListEntry[];
    sizeCategories: RoNis2HelperListEntry[];
    sizeThresholds: RoNis2HelperListEntry[];
    yesNo: RoNis2HelperListEntry[];
  };
  jurisdiction: "RO";
  locations: RoNis2Location[];
  notificationDraftMapping: RoNis2NotificationDraftMapping[];
  packVersion: string;
  questions: {
    article9: RoNis2Question[];
    law294: RoNis2Question[];
    relationshipWithRomania: RoNis2Question[];
  };
  schemaVersion: string;
  detectedVersion?: string;
  serviceCatalog: {
    categories: RoNis2ServiceCategory[];
    options: RoNis2ServiceOption[];
    sectors: RoNis2ServiceSector[];
    subsectors: RoNis2ServiceSubsector[];
  };
  source: {
    contentHashSha256: string;
    localFilePath: string;
    sourceType: "internal_excel_seed";
    title: string;
    trustLevel: "internal_seed";
  };
  validationStatus: "validated";
  workbook: {
    detectedSheets: string[];
    requiredSheets: string[];
    versions: RoNis2WorkbookVersions;
  };
}

export interface RoNis2ImportReport {
  country: "ro";
  detectedVersion?: string;
  limitations: string[];
  requiredSheetValidation: {
    missing: string[];
    passed: boolean;
    present: string[];
  };
  schemaVersion: string;
  sourceMapCoverage: RoNis2GeneratedSourceMap["coverage"];
  sourceWorkbook: string;
  sourceWorkbookHashSha256: string;
  status: "validated";
  summary: {
    article9Questions: number;
    classificationFormulaSignals: number;
    classificationRules: number;
    entityFields: number;
    locations: number;
    notificationDraftMappings: number;
    relationshipQuestions: number;
    serviceOptions: number;
  };
  validationChecks: Array<{
    key: string;
    message: string;
    passed: boolean;
  }>;
  workbookVersions: RoNis2WorkbookVersions;
}

export interface RoNis2GeneratedArtifacts {
  report: RoNis2ImportReport;
  seed: RoNis2Seed;
  sourceMap: RoNis2GeneratedSourceMap;
}
