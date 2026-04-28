import { writeRoNis2GeneratedArtifacts } from "../apps/regulatory-importer/src/index";

export const importRoNis2WorkbookStatus = "implemented_source_mapped_xlsx_importer";

export const runRoNis2WorkbookImport = () => writeRoNis2GeneratedArtifacts();

if (process.argv[1]?.endsWith("import-ro-nis2-workbook.ts")) {
  runRoNis2WorkbookImport();
}
