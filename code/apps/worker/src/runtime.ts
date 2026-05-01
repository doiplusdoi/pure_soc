import {
  InMemoryJobQueue,
  JobRegistry,
  JobRuntime,
  JobRuntimeError,
  createBullMqReadyJobQueueAdapter,
  runJobRuntimeLoop,
  type JobDispatchResult,
  type JobQueueAdapter
} from "@puresoc/jobs";
import type { PureSocConfig } from "@puresoc/config";

import { assertRemediationJobHasSafetyGates, type RemediationActionExecutionJob } from "./actions";

export const workerRuntimeJobNames = {
  executeAction: "actions.execute"
} as const;

export interface WorkerActionJobResult {
  actionRunId: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: string;
  providerWriteExecution: "disabled";
  safetyGateStatus: "validated";
}

export interface WorkerRuntimeDependencies {
  config: Pick<PureSocConfig, "jobs">;
  queue?: JobQueueAdapter;
  now?: () => Date;
  idFactory?: () => string;
}

export interface WorkerRuntime {
  runtime: JobRuntime;
  dispatchRemediationActionJob: (
    job: RemediationActionExecutionJob
  ) => Promise<JobDispatchResult<RemediationActionExecutionJob>>;
}

export const createWorkerRuntime = (dependencies: WorkerRuntimeDependencies): WorkerRuntime => {
  const queue = dependencies.queue ?? createWorkerQueue(dependencies);
  const registry = new JobRegistry().register<RemediationActionExecutionJob, WorkerActionJobResult>({
    name: workerRuntimeJobNames.executeAction,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    retryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    idempotencyKey: (payload) => payload.actionRunId,
    handler: ({ payload }) => {
      try {
        assertRemediationJobHasSafetyGates(payload);
      } catch (error) {
        throw new JobRuntimeError(
          "remediation_safety_gates_missing",
          error instanceof Error ? error.message : "Remediation safety gates are missing.",
          {
            retryable: false,
            details: {
              actionRunId: payload.actionRunId,
              organizationId: payload.organizationId
            }
          }
        );
      }

      return {
        actionRunId: payload.actionRunId,
        organizationId: payload.organizationId,
        providerConnectionId: payload.providerConnectionId,
        providerKey: payload.providerKey,
        providerWriteExecution: "disabled",
        safetyGateStatus: "validated"
      };
    }
  });

  const runtime = new JobRuntime({
    registry,
    queue,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    defaultRetryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    now: dependencies.now
  });

  return {
    runtime,
    dispatchRemediationActionJob: (job) =>
      runtime.dispatch({
        name: workerRuntimeJobNames.executeAction,
        payload: job,
        idempotencyKey: job.actionRunId
      })
  };
};

const createWorkerQueue = (dependencies: WorkerRuntimeDependencies): JobQueueAdapter =>
  dependencies.config.jobs.queueProvider === "bullmq"
    ? createBullMqReadyJobQueueAdapter({
        queueName: "puresoc-worker",
        redisUrl: dependencies.config.jobs.redisUrl,
        defaultJobOptions: {
          attempts: dependencies.config.jobs.defaultMaxAttempts,
          backoffMs: dependencies.config.jobs.retryBackoffMs,
          removeOnComplete: true
        }
      })
    : new InMemoryJobQueue({ now: dependencies.now, idFactory: dependencies.idFactory });

export const startWorkerRuntimeLoop = async (
  dependencies: WorkerRuntimeDependencies,
  logger: (event: Record<string, unknown>) => void = console.log
): Promise<void> => {
  const worker = createWorkerRuntime(dependencies);

  logger({
    service: "puresoc-worker",
    status: dependencies.config.jobs.worker.enabled ? "runtime_started" : "runtime_disabled",
    queueProvider: dependencies.config.jobs.queueProvider,
    queueKind: worker.runtime.queueKind,
    registeredJobs: worker.runtime.registeredJobNames,
    providerWriteExecution: "disabled"
  });

  if (!dependencies.config.jobs.worker.enabled) {
    return;
  }

  await runJobRuntimeLoop(worker.runtime, {
    pollIntervalMs: dependencies.config.jobs.pollIntervalMs,
    logger
  });
};
