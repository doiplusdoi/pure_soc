import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig,
  type ExternalSmokeReadinessCheck,
  type ExternalSmokeReadinessReport
} from "@puresoc/config";
import { getMicrosoft365ExternalSmokeReadinessMetadata } from "@puresoc/provider-microsoft365";
import {
  runEvidenceRuntimeSmoke,
  type EvidenceRuntimeSmokeReadinessPreflight,
  type EvidenceRuntimeSmokeReport
} from "@puresoc/evidence";

export const buildEvidenceRuntimeSmokeReportFromEnv = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<EvidenceRuntimeSmokeReport> => {
  const config = loadConfig({ env });
  const readinessReport = createExternalSmokeReadinessReport({
    config,
    env,
    startupValidationIssues: collectStartupConfigIssues(config),
    metadata: {
      microsoft365: getMicrosoft365ExternalSmokeReadinessMetadata()
    }
  });

  return runEvidenceRuntimeSmoke({
    config,
    readiness: {
      objectStorageScanner: evidenceReadinessPreflight(readinessReport, "object_storage_scanner_runtime"),
      evidenceReports: evidenceReadinessPreflight(readinessReport, "evidence_report_runtime")
    },
    env
  });
};

export const runEvidenceRuntimeSmokeCli = async (): Promise<void> => {
  const report = await buildEvidenceRuntimeSmokeReportFromEnv();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.exitCode;
};

const evidenceReadinessPreflight = (
  report: ExternalSmokeReadinessReport,
  checkId: EvidenceRuntimeSmokeReadinessPreflight["checkId"]
): EvidenceRuntimeSmokeReadinessPreflight => {
  const check = report.checks.find((entry) => entry.id === checkId);
  assertEvidenceReadinessCheck(check, checkId);

  return {
    checkId,
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

const assertEvidenceReadinessCheck = (
  check: ExternalSmokeReadinessCheck | undefined,
  checkId: EvidenceRuntimeSmokeReadinessPreflight["checkId"]
): asserts check is ExternalSmokeReadinessCheck => {
  if (!check) {
    throw new Error(`M42 readiness report did not include ${checkId}.`);
  }
};

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("evidence-runtime-smoke.ts")) {
  runEvidenceRuntimeSmokeCli().catch((error: unknown) => {
    process.stderr.write(`${safeCliError(error)}\n`);
    process.exitCode = 1;
  });
}

const safeCliError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Evidence runtime smoke failed.";
};
