import type { ActionRun, ActionWorkerJobMetadata } from "@puresoc/recommendations";

export interface RemediationActionExecutionJob extends ActionWorkerJobMetadata {
  attempt: number;
  queuedFrom: "api_approval_flow";
}

export const createRemediationActionExecutionJob = (
  run: ActionRun,
  input: {
    queuedByUserId: string;
    queuedAt: string;
    providerConnectionWriteEnabledChecked: boolean;
  }
): RemediationActionExecutionJob => ({
  jobName: "actions.execute",
  actionRunId: run.id,
  organizationId: run.organizationId,
  providerConnectionId: run.providerConnectionId,
  providerKey: run.providerKey,
  actionKey: run.actionKey,
  queuedByUserId: input.queuedByUserId,
  queuedAt: input.queuedAt,
  attempt: 0,
  queuedFrom: "api_approval_flow",
  safetyGates: {
    preflightPassed: true,
    approvalGranted: true,
    preStateSnapshotSaved: true,
    providerWriteEnabledChecked: input.providerConnectionWriteEnabledChecked
  }
});

export const assertRemediationJobHasSafetyGates = (job: RemediationActionExecutionJob): void => {
  if (
    job.safetyGates.preflightPassed !== true ||
    job.safetyGates.approvalGranted !== true ||
    job.safetyGates.preStateSnapshotSaved !== true
  ) {
    throw new Error("Remediation action execution jobs must carry all safety gate confirmations.");
  }
};
