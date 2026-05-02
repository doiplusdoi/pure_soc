import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig,
  type ExternalSmokeReadinessReport
} from "@puresoc/config";
import {
  authDeploymentSmokeConfigFromEnv,
  authDeploymentSmokeReadinessPreflightFromReport,
  runAuthDeploymentSmoke,
  type AuthDeploymentSmokeReadinessPreflight,
  type AuthDeploymentSmokeReport
} from "@puresoc/api";

export const buildAuthDeploymentSmokeReportFromEnv = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<AuthDeploymentSmokeReport> => {
  const config = loadConfig({ env });
  const readinessReport = createExternalSmokeReadinessReport({
    config,
    env,
    startupValidationIssues: collectStartupConfigIssues(config)
  });

  return runAuthDeploymentSmoke({
    appConfig: config,
    smokeConfig: authDeploymentSmokeConfigFromEnv(env, config),
    readiness: authDeploymentReadinessPreflight(readinessReport),
    env
  });
};

export const runAuthDeploymentSmokeCli = async (): Promise<void> => {
  const report = await buildAuthDeploymentSmokeReportFromEnv();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.exitCode;
};

const authDeploymentReadinessPreflight = (
  report: ExternalSmokeReadinessReport
): AuthDeploymentSmokeReadinessPreflight => {
  const authDeploymentCheck = report.checks.find((check) => check.id === "auth_deployment_browser");
  if (!authDeploymentCheck) {
    throw new Error("M42 readiness report did not include auth_deployment_browser.");
  }
  return authDeploymentSmokeReadinessPreflightFromReport(report);
};

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("auth-deployment-smoke.ts")) {
  runAuthDeploymentSmokeCli().catch((error: unknown) => {
    process.stderr.write(`${safeCliError(error)}\n`);
    process.exitCode = 1;
  });
}

const safeCliError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Auth deployment smoke failed.";
};
