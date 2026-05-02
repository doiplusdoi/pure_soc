import { JobRuntimeError } from "@puresoc/jobs";
import {
  RemediationActionLifecycle,
  type ActionRun,
  type ActionSnapshotMetadata,
  type RemediationActionRepository
} from "@puresoc/recommendations";
import {
  ProviderActionExecutionError,
  redactProviderSecrets,
  type ProviderActionExecutor,
  type ProviderResourceStore
} from "@puresoc/providers-core";

import { assertRemediationJobHasSafetyGates, type RemediationActionExecutionJob } from "./actions";

export interface RemediationActionAuditWriter {
  write(input: {
    actorUserId?: string | null;
    organizationId?: string | null;
    targetType: string;
    targetId?: string | null;
    action: string;
    afterJson?: unknown;
  }): Promise<unknown>;
}

export interface WorkerActionExecutionResult {
  actionRunId: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: string;
  providerWriteExecution: "disabled" | "mock_executed" | "already_completed";
  safetyGateStatus: "validated";
  executionMode?: "fake";
  verificationStatus?: ActionRun["verificationStatus"];
  postStateEvidenceArtifactId?: string;
}

export interface RemediationActionExecutionDependencies {
  repository: RemediationActionRepository;
  providerStore: Pick<ProviderResourceStore, "getConnectionForOrganization">;
  actionExecutors: Record<string, ProviderActionExecutor | undefined>;
  auditWriter?: RemediationActionAuditWriter;
  now?: () => Date;
  idFactory?: () => string;
}

export const validateRemediationActionJobOnly = (
  job: RemediationActionExecutionJob
): WorkerActionExecutionResult => {
  assertRemediationJobHasSafetyGates(job);
  return {
    actionRunId: job.actionRunId,
    organizationId: job.organizationId,
    providerConnectionId: job.providerConnectionId,
    providerKey: job.providerKey,
    providerWriteExecution: "disabled",
    safetyGateStatus: "validated"
  };
};

export const executeRemediationActionJob = async (
  job: RemediationActionExecutionJob,
  dependencies: RemediationActionExecutionDependencies
): Promise<WorkerActionExecutionResult> => {
  assertRemediationJobHasSafetyGates(job);

  const now = dependencies.now ?? (() => new Date());
  const lifecycle = new RemediationActionLifecycle({
    repository: dependencies.repository,
    now
  });
  const run = await dependencies.repository.findActionRunForOrganization({
    organizationId: job.organizationId,
    actionRunId: job.actionRunId
  });

  if (!run) {
    throw new JobRuntimeError("action_run_not_found", "Action run was not found for worker execution.", {
      retryable: false,
      details: {
        actionRunId: job.actionRunId,
        organizationId: job.organizationId
      }
    });
  }

  if (run.status === "verified" || run.status === "closed") {
    return {
      actionRunId: run.id,
      organizationId: run.organizationId,
      providerConnectionId: run.providerConnectionId,
      providerKey: run.providerKey,
      providerWriteExecution: "already_completed",
      safetyGateStatus: "validated",
      verificationStatus: run.verificationStatus,
      postStateEvidenceArtifactId: run.postStateSnapshot?.evidenceArtifactId
    };
  }

  const failRun = async (
    code: string,
    message: string,
    options: { retryable?: boolean; details?: Record<string, unknown> } = {}
  ): Promise<never> => {
    const safeDetails = redactProviderSecrets(options.details ?? {}) as Record<string, unknown>;
    const failed = await lifecycle.fail({
      organizationId: run.organizationId,
      actionRunId: run.id,
      actorUserId: job.queuedByUserId,
      reason: message
    });
    await auditAction(dependencies.auditWriter, {
      run: failed,
      actorUserId: job.queuedByUserId,
      action: "action_failed",
      afterJson: {
        status: failed.status,
        failureReason: failed.failureReason,
        failureCode: code,
        details: safeDetails
      }
    });
    throw new JobRuntimeError(code, message, {
      retryable: options.retryable ?? false,
      details: {
        actionRunId: run.id,
        organizationId: run.organizationId,
        ...safeDetails
      }
    });
  };

  await assertRunSafetyOrFail(run, job, failRun);

  const connection = await dependencies.providerStore.getConnectionForOrganization(
    run.organizationId,
    run.providerConnectionId
  );
  if (connection.providerKey !== run.providerKey || connection.id !== run.providerConnectionId) {
    await failRun("provider_action_connection_mismatch", "Provider connection does not match the action run.", {
      details: {
        actionProviderKey: run.providerKey,
        connectionProviderKey: connection.providerKey
      }
    });
  }
  if (!connection.writeEnabled || job.safetyGates.providerWriteEnabledChecked !== true) {
    await failRun(
      "provider_action_write_not_enabled",
      "Provider connection write access must be enabled and checked before worker execution."
    );
  }

  const executor = dependencies.actionExecutors[run.providerKey];
  if (!executor) {
    return await failRun("provider_action_executor_disabled", "Provider action executor is disabled for this provider.", {
      details: {
        providerKey: run.providerKey,
        executionMode: "missing"
      }
    });
  }
  if (executor.executionMode === "disabled") {
    return await failRun("provider_action_executor_disabled", "Provider action executor is disabled for this provider.", {
      details: {
        providerKey: run.providerKey,
        executionMode: executor.executionMode
      }
    });
  }
  if (executor.providerKey !== run.providerKey) {
    return await failRun("provider_action_executor_mismatch", "Provider action executor does not match the action run.", {
      details: {
        actionProviderKey: run.providerKey,
        executorProviderKey: executor.providerKey
      }
    });
  }
  const actionExecutor = executor;

  await dependencies.repository.saveActionRun({
    ...run,
    status: "running",
    updatedAt: now().toISOString()
  });

  try {
    const validation = await actionExecutor.validateAction({
      organizationId: run.organizationId,
      providerConnectionId: run.providerConnectionId,
      actionRunId: run.id,
      actionKey: run.actionKey,
      parameters: run.preconditions
    });
    if (validation.status !== "passed") {
      return await failRun("provider_action_validation_failed", "Provider action validation failed before apply.", {
        details: {
          checks: validation.checks
        }
      });
    }

    const applyResult = await actionExecutor.applyAction({
      organizationId: run.organizationId,
      providerConnectionId: run.providerConnectionId,
      actionRunId: run.id,
      actionKey: run.actionKey,
      approvedBy: run.approval.approvedBy ?? job.queuedByUserId,
      approvedAt: run.approval.approvedAt ?? job.queuedAt,
      preStateEvidenceId: run.preStateSnapshot?.evidenceArtifactId ?? "",
      parameters: run.preconditions
    });
    if (applyResult.status !== "applied") {
      return await failRun("provider_action_apply_failed", "Provider action apply failed.", {
        details: {
          error: applyResult.error
        }
      });
    }

    const postStateSnapshot = await collectPostStateSnapshot({
      executor: actionExecutor,
      run,
      job,
      executedAt: applyResult.executedAt,
      idFactory: dependencies.idFactory
    });
    const runWithPostState = await lifecycle.attachSnapshot({
      organizationId: run.organizationId,
      actionRunId: run.id,
      snapshot: postStateSnapshot
    });
    await auditAction(dependencies.auditWriter, {
      run: runWithPostState,
      actorUserId: job.queuedByUserId,
      action: "action_applied",
      afterJson: {
        status: "running",
        executionMode: actionExecutor.executionMode,
        applyStatus: applyResult.status,
        executedAt: applyResult.executedAt,
        postStateEvidenceArtifactId: postStateSnapshot.evidenceArtifactId,
        providerResult: redactProviderSecrets({
          status: applyResult.status,
          postState: applyResult.postState
        })
      }
    });

    const verification = await actionExecutor.verifyAction({
      organizationId: run.organizationId,
      providerConnectionId: run.providerConnectionId,
      actionRunId: run.id,
      actionKey: run.actionKey,
      postStateEvidenceId: postStateSnapshot.evidenceArtifactId,
      parameters: run.preconditions
    });
    const verifiedRun = await lifecycle.recordVerification({
      organizationId: run.organizationId,
      actionRunId: run.id,
      actorUserId: "puresoc-worker",
      result: {
        status: verification.status,
        verifiedAt: verification.verifiedAt,
        verifiedBy: "puresoc-worker",
        checks: verification.checks.map((check) => ({
          ...check,
          evidenceArtifactIds: [postStateSnapshot.evidenceArtifactId]
        })),
        evidenceArtifactIds: [postStateSnapshot.evidenceArtifactId]
      }
    });
    await auditAction(dependencies.auditWriter, {
      run: verifiedRun,
      actorUserId: job.queuedByUserId,
      action: "action_verified",
      afterJson: {
        verificationStatus: verifiedRun.verificationStatus,
        evidenceArtifactIds: verifiedRun.verificationResult?.evidenceArtifactIds
      }
    });

    return {
      actionRunId: verifiedRun.id,
      organizationId: verifiedRun.organizationId,
      providerConnectionId: verifiedRun.providerConnectionId,
      providerKey: verifiedRun.providerKey,
      providerWriteExecution: "mock_executed",
      safetyGateStatus: "validated",
      executionMode: "fake",
      verificationStatus: verifiedRun.verificationStatus,
      postStateEvidenceArtifactId: postStateSnapshot.evidenceArtifactId
    };
  } catch (error) {
    if (error instanceof JobRuntimeError) {
      throw error;
    }

    if (error instanceof ProviderActionExecutionError) {
      return await failRun(error.code, error.message, {
        retryable: error.retryable,
        details: error.details
      });
    }

    return await failRun("provider_action_execution_failed", "Provider action execution failed.", {
      retryable: false,
      details: redactProviderSecrets(error instanceof Error ? { name: error.name, message: error.message } : error) as Record<
        string,
        unknown
      >
    });
  }
};

const assertRunSafetyOrFail = async (
  run: ActionRun,
  job: RemediationActionExecutionJob,
  failRun: (code: string, message: string, options?: { retryable?: boolean; details?: Record<string, unknown> }) => Promise<never>
): Promise<void> => {
  if (
    run.organizationId !== job.organizationId ||
    run.providerConnectionId !== job.providerConnectionId ||
    run.providerKey !== job.providerKey ||
    run.actionKey !== job.actionKey
  ) {
    await failRun("action_run_job_mismatch", "Worker job metadata does not match the persisted action run.");
  }

  if (
    run.preflightStatus !== "passed" ||
    run.preflightResult?.status !== "passed" ||
    run.approval.status !== "approved" ||
    !run.approval.approvedBy ||
    !run.approval.approvedAt ||
    !run.preStateSnapshot
  ) {
    await failRun(
      "action_run_safety_state_invalid",
      "Persisted action run is missing preflight, approval, or pre-state snapshot safety metadata."
    );
  }
};

const collectPostStateSnapshot = async (input: {
  executor: ProviderActionExecutor;
  run: ActionRun;
  job: RemediationActionExecutionJob;
  executedAt: string;
  idFactory?: () => string;
}): Promise<ActionSnapshotMetadata> => {
  const artifacts = await input.executor.collectActionEvidence({
    organizationId: input.run.organizationId,
    providerConnectionId: input.run.providerConnectionId,
    actionRunId: input.run.id,
    actionKey: input.run.actionKey,
    snapshotPhase: "post_state"
  });
  const artifact = artifacts.find((entry) => entry.sourceType === "action_post_state") ?? artifacts[0];

  if (!artifact) {
    throw new ProviderActionExecutionError(
      "provider_action_apply_failed",
      "Provider action did not produce post-state evidence metadata.",
      { retryable: false }
    );
  }

  const evidenceArtifactId = artifact.contentHashSha256
    ? `${input.run.id}:post_state:${artifact.contentHashSha256.slice(0, 16)}`
    : `${input.run.id}:post_state:${input.idFactory?.() ?? "worker"}`;

  return {
    evidenceArtifactId,
    sourceType: "action_post_state",
    contentHashSha256: artifact.contentHashSha256,
    capturedAt: input.executedAt,
    capturedBy: "puresoc-worker",
    providerConnectionId: input.run.providerConnectionId,
    resourceRefs: [`${input.run.providerKey}:${input.run.actionKey}`],
    description: artifact.title
  };
};

const auditAction = async (
  auditWriter: RemediationActionAuditWriter | undefined,
  input: {
    run: ActionRun;
    actorUserId?: string;
    action: string;
    afterJson: Record<string, unknown>;
  }
): Promise<void> => {
  await auditWriter?.write({
    actorUserId: input.actorUserId,
    organizationId: input.run.organizationId,
    targetType: "provider_action_run",
    targetId: input.run.id,
    action: input.action,
    afterJson: {
      status: input.run.status,
      recommendationId: input.run.recommendationId,
      controlId: input.run.controlId,
      providerConnectionId: input.run.providerConnectionId,
      providerKey: input.run.providerKey,
      actionKey: input.run.actionKey,
      ...(redactProviderSecrets(input.afterJson) as Record<string, unknown>)
    }
  });
};
