import type { ExternalSmokeTargetSelection } from "@puresoc/config";

import { buildExternalSmokeReadinessReportFromEnv } from "./external-smoke-readiness";

export const buildExternalSmokeTargetSelectionFromEnv = (
  env: NodeJS.ProcessEnv = process.env
): ExternalSmokeTargetSelection => buildExternalSmokeReadinessReportFromEnv(env).targetSelection;

export const runExternalSmokeTargetSelectionCli = () => {
  const selection = buildExternalSmokeTargetSelectionFromEnv();
  process.stdout.write(`${JSON.stringify(selection, null, 2)}\n`);
};

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("external-smoke-target-selection.ts")) {
  runExternalSmokeTargetSelectionCli();
}
