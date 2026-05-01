import { regulatoryImporterAppRole, writeRoNis2GeneratedArtifacts } from "./index";

const shouldWrite = process.env.PURESOC_REGULATORY_IMPORTER_WRITE === "true";

if (shouldWrite) {
  const artifacts = writeRoNis2GeneratedArtifacts();
  console.log(
    JSON.stringify({
      service: regulatoryImporterAppRole,
      status: "generated",
      sourceMapCoverage: artifacts.sourceMap.coverage
    })
  );
} else {
  console.log(
    JSON.stringify({
      service: regulatoryImporterAppRole,
      status: "ready",
      runtime: "one_shot_importer",
      message: "Set PURESOC_REGULATORY_IMPORTER_WRITE=true to regenerate Romania seed artifacts."
    })
  );
}
