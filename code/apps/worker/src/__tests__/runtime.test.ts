import { describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import type { ActionRun } from "@puresoc/recommendations";

import { createRemediationActionExecutionJob, type RemediationActionExecutionJob } from "../actions";
import { createWorkerRuntime } from "../runtime";

describe("worker job runtime", () => {
  it("validates remediation safety metadata without executing provider writes", async () => {
    const worker = createWorkerRuntime({
      config: loadConfig({ env: {} }),
      idFactory: deterministicIds("worker_job")
    });
    const job = createRemediationActionExecutionJob(actionRunFixture(), {
      queuedByUserId: "operator_1",
      queuedAt: "2026-05-01T10:00:00.000Z",
      providerConnectionWriteEnabledChecked: false
    });

    const dispatch = await worker.dispatchRemediationActionJob(job);
    const result = await worker.runtime.runNext();

    expect(dispatch.status).toBe("enqueued");
    expect(result).toMatchObject({
      status: "succeeded",
      job: {
        status: "succeeded",
        result: {
          actionRunId: "action_run_worker_1",
          providerConnectionId: "provider_connection_worker_1",
          providerWriteExecution: "disabled",
          safetyGateStatus: "validated"
        }
      }
    });
  });

  it("fails unsafe remediation jobs without retrying", async () => {
    const worker = createWorkerRuntime({
      config: loadConfig({ env: {} }),
      idFactory: deterministicIds("worker_job")
    });
    const unsafeJob = {
      ...createRemediationActionExecutionJob(actionRunFixture(), {
        queuedByUserId: "operator_1",
        queuedAt: "2026-05-01T10:00:00.000Z",
        providerConnectionWriteEnabledChecked: false
      }),
      safetyGates: {
        preflightPassed: false,
        approvalGranted: true,
        preStateSnapshotSaved: true,
        providerWriteEnabledChecked: false
      }
    } as unknown as RemediationActionExecutionJob;

    await worker.dispatchRemediationActionJob(unsafeJob);
    const result = await worker.runtime.runNext();

    expect(result).toMatchObject({
      status: "failed",
      failure: {
        code: "remediation_safety_gates_missing",
        retryable: false
      },
      job: {
        status: "failed",
        retry: {
          retryable: false
        }
      }
    });
  });
});

const actionRunFixture = (): ActionRun => ({
  id: "action_run_worker_1",
  organizationId: "org_worker_runtime",
  providerConnectionId: "provider_connection_worker_1",
  controlId: "nis2.access-control.mfa",
  jurisdiction: "EU",
  providerKey: "mock",
  actionKey: "ca_report_only_legacy_auth_block",
  actionType: "technical",
  automationMode: "preflightable",
  title: "Prepare report-only legacy authentication block",
  riskLevel: "medium",
  licenseRequired: [],
  permissionsRequired: [],
  preconditions: {},
  expectedChange: "A report-only policy draft is prepared.",
  blastRadius: "No tenant enforcement occurs.",
  rollbackStrategy: "Discard draft.",
  manualFallback: "Complete manually and attach evidence.",
  evidenceRequired: true,
  highRiskForbiddenInV1: false,
  status: "queued",
  approval: {
    status: "approved"
  },
  preflightStatus: "passed",
  verificationStatus: "not_run",
  evidenceArtifactIds: ["evidence_pre"],
  checklistTaskIds: [],
  sourceReferences: [],
  createdAt: "2026-05-01T09:59:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z"
});

const deterministicIds = (prefix: string) => {
  let next = 0;
  return () => `${prefix}_${(next += 1).toString().padStart(3, "0")}`;
};
