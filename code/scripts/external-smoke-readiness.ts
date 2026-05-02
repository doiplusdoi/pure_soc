import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig
} from "@puresoc/config";
import { getMicrosoft365ExternalSmokeReadinessMetadata } from "@puresoc/provider-microsoft365";

export const buildExternalSmokeReadinessReportFromEnv = (env: NodeJS.ProcessEnv = process.env) => {
  const config = loadConfig({ env });
  return createExternalSmokeReadinessReport({
    config,
    env,
    startupValidationIssues: collectStartupConfigIssues(config),
    metadata: {
      microsoft365: getMicrosoft365ExternalSmokeReadinessMetadata()
    }
  });
};

export const runExternalSmokeReadinessCli = () => {
  const report = buildExternalSmokeReadinessReportFromEnv();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
};

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("external-smoke-readiness.ts")) {
  runExternalSmokeReadinessCli();
}
