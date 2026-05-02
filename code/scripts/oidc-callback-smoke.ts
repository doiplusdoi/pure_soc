import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig,
  type ExternalSmokeReadinessReport
} from "@puresoc/config";
import {
  oidcCallbackSmokeConfigFromEnv,
  oidcCallbackSmokeReadinessPreflightFromReport,
  runOidcCallbackSmoke,
  type OidcCallbackSmokeReadinessPreflight,
  type OidcCallbackSmokeReport
} from "@puresoc/api";

export const buildOidcCallbackSmokeReportFromEnv = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<OidcCallbackSmokeReport> => {
  const config = loadConfig({ env });
  const readinessReport = createExternalSmokeReadinessReport({
    config,
    env,
    startupValidationIssues: collectStartupConfigIssues(config)
  });
  const smokeConfig = oidcCallbackSmokeConfigFromEnv(env, config);

  return runOidcCallbackSmoke({
    appConfig: config,
    smokeConfig,
    readiness: oidcReadinessPreflight(readinessReport, smokeConfig.selectedProviderKey),
    env
  });
};

export const runOidcCallbackSmokeCli = async (): Promise<void> => {
  const report = await buildOidcCallbackSmokeReportFromEnv();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.exitCode;
};

const oidcReadinessPreflight = (
  report: ExternalSmokeReadinessReport,
  selectedProviderKey: Parameters<typeof oidcCallbackSmokeReadinessPreflightFromReport>[1]
): OidcCallbackSmokeReadinessPreflight => {
  for (const providerKey of ["microsoft_entra", "google", "github"] as const) {
    const check = report.checks.find((entry) => entry.id === `oidc_${providerKey}_callback`);
    if (!check) {
      throw new Error(`M42 readiness report did not include oidc_${providerKey}_callback.`);
    }
  }

  return oidcCallbackSmokeReadinessPreflightFromReport(report, selectedProviderKey);
};

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("oidc-callback-smoke.ts")) {
  runOidcCallbackSmokeCli().catch((error: unknown) => {
    process.stderr.write(`${safeCliError(error)}\n`);
    process.exitCode = 1;
  });
}

const safeCliError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "OIDC/social callback smoke failed.";
};
