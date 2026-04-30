import { describe, expect, it } from "vitest";

import { assertRemediationJobHasSafetyGates, createRemediationActionExecutionJob } from "../actions";

describe("worker remediation action job contract", () => {
  it("carries explicit safety-gate confirmations for future execution workers", () => {
    const job = createRemediationActionExecutionJob(
      {
        id: "action_run_1",
        organizationId: "org_worker_actions",
        providerConnectionId: "provider_connection_1",
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
        createdAt: "2026-04-30T12:00:00.000Z",
        updatedAt: "2026-04-30T12:00:00.000Z"
      },
      {
        queuedByUserId: "operator_1",
        queuedAt: "2026-04-30T12:01:00.000Z",
        providerConnectionWriteEnabledChecked: false
      }
    );

    expect(job).toMatchObject({
      jobName: "actions.execute",
      actionRunId: "action_run_1",
      attempt: 0,
      queuedFrom: "api_approval_flow",
      safetyGates: {
        preflightPassed: true,
        approvalGranted: true,
        preStateSnapshotSaved: true
      }
    });
    expect(() => assertRemediationJobHasSafetyGates(job)).not.toThrow();
  });
});
