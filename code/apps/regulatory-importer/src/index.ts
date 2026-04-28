export const regulatoryImporterAppRole = "puresoc-regulatory-importer";

export {
  importRoNis2Workbook,
  REQUIRED_RO_NIS2_SHEETS,
  RO_NIS2_SCHEMA_VERSION,
  RO_NIS2_SOURCE_MAP_THRESHOLD,
  RO_NIS2_SOURCE_WORKBOOK,
  stableStringify,
  validateRoRequiredSheetNames,
  writeRoNis2GeneratedArtifacts
} from "./ro/ro-nis2-importer";
export type {
  RoNis2GeneratedArtifacts,
  RoNis2GeneratedSourceMap,
  RoNis2ImportReport,
  RoNis2Seed,
  RoNis2SourceMapEntry,
  RoNis2SourceReference
} from "./ro/types";
