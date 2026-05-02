import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig,
  type ExternalSmokeReadinessCheck,
  type ExternalSmokeReadinessReport
} from "@puresoc/config";
import {
  getMicrosoft365ExternalSmokeReadinessMetadata,
  microsoft365ReadOnlySmokeConfigFromEnv,
  runMicrosoft365ReadOnlySmoke,
  type Microsoft365ReadOnlySmokeReadinessPreflight,
  type Microsoft365ReadOnlySmokeReport
} from "@puresoc/provider-microsoft365";

export const buildMicrosoft365ReadOnlySmokeReportFromEnv = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<Microsoft365ReadOnlySmokeReport> => {
  const config = loadConfig({ env });
  const readinessReport = createExternalSmokeReadinessReport({
    config,
    env,
    startupValidationIssues: collectStartupConfigIssues(config),
    metadata: {
      microsoft365: getMicrosoft365ExternalSmokeReadinessMetadata()
    }
  });

  return runMicrosoft365ReadOnlySmoke({
    config: microsoft365ReadOnlySmokeConfigFromEnv(env),
    readiness: microsoft365ReadinessPreflight(readinessReport),
    env
  });
};

export const runMicrosoft365ReadOnlySmokeCli = async (): Promise<void> => {
  const report = await buildMicrosoft365ReadOnlySmokeReportFromEnv();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.exitCode;
};

const microsoft365ReadinessPreflight = (
  report: ExternalSmokeReadinessReport
): Microsoft365ReadOnlySmokeReadinessPreflight => {
  const check = report.checks.find((entry) => entry.id === "microsoft365_read_only_tenant");
  assertMicrosoft365ReadinessCheck(check);

  return {
    checkId: "microsoft365_read_only_tenant",
    status: check.status,
    mode: report.mode,
    target: {
      kind: report.target.kind,
      disposableConfirmation: report.target.disposableConfirmation
    },
    requiredEnvironment: check.requiredEnvironment,
    configuredEnvironmentVariables: check.configuredEnvironmentVariables,
    blockers: check.blockers,
    guardrails: check.guardrails,
    metadata: check.metadata
  };
};

const assertMicrosoft365ReadinessCheck = (
  check: ExternalSmokeReadinessCheck | undefined
): asserts check is ExternalSmokeReadinessCheck => {
  if (!check) {
    throw new Error("M42 readiness report did not include microsoft365_read_only_tenant.");
  }
};

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("microsoft365-read-only-smoke.ts")) {
  runMicrosoft365ReadOnlySmokeCli().catch((error: unknown) => {
    process.stderr.write(`${safeCliError(error)}\n`);
    process.exitCode = 1;
  });
}

const safeCliError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Microsoft 365 read-only smoke failed.";
};
