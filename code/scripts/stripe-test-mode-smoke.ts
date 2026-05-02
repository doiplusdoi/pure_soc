import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig,
  type ExternalSmokeReadinessCheck,
  type ExternalSmokeReadinessReport
} from "@puresoc/config";
import { getMicrosoft365ExternalSmokeReadinessMetadata } from "@puresoc/provider-microsoft365";
import {
  runStripeTestModeSmoke,
  type StripeTestModeSmokeReadinessPreflight,
  type StripeTestModeSmokeReport
} from "@puresoc/billing-stripe";

export const buildStripeTestModeSmokeReportFromEnv = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<StripeTestModeSmokeReport> => {
  const config = loadConfig({ env });
  const readinessReport = createExternalSmokeReadinessReport({
    config,
    env,
    startupValidationIssues: collectStartupConfigIssues(config),
    metadata: {
      microsoft365: getMicrosoft365ExternalSmokeReadinessMetadata()
    }
  });

  return runStripeTestModeSmoke({
    config: config.billing,
    readiness: stripeReadinessPreflight(readinessReport),
    env
  });
};

export const runStripeTestModeSmokeCli = async (): Promise<void> => {
  const report = await buildStripeTestModeSmokeReportFromEnv();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.exitCode;
};

const stripeReadinessPreflight = (
  report: ExternalSmokeReadinessReport
): StripeTestModeSmokeReadinessPreflight => {
  const stripeCheck = report.checks.find((check) => check.id === "stripe_test_mode_billing");
  assertStripeReadinessCheck(stripeCheck);

  return {
    checkId: "stripe_test_mode_billing",
    status: stripeCheck.status,
    mode: report.mode,
    target: {
      kind: report.target.kind,
      disposableConfirmation: report.target.disposableConfirmation
    },
    requiredEnvironment: stripeCheck.requiredEnvironment,
    configuredEnvironmentVariables: stripeCheck.configuredEnvironmentVariables,
    blockers: stripeCheck.blockers,
    guardrails: stripeCheck.guardrails
  };
};

const assertStripeReadinessCheck = (
  check: ExternalSmokeReadinessCheck | undefined
): asserts check is ExternalSmokeReadinessCheck => {
  if (!check) {
    throw new Error("M42 readiness report did not include stripe_test_mode_billing.");
  }
};

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("stripe-test-mode-smoke.ts")) {
  runStripeTestModeSmokeCli().catch((error: unknown) => {
    process.stderr.write(`${safeCliError(error)}\n`);
    process.exitCode = 1;
  });
}

const safeCliError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Stripe test-mode smoke failed.";
};
