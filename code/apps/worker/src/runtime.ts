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

import type { RemediationActionExecutionJob } from "./actions";
import {
  executeRemediationActionJob,
  validateRemediationActionJobOnly,
  type RemediationActionExecutionDependencies,
  type WorkerActionExecutionResult
} from "./action-execution";

export const workerRuntimeJobNames = {
  executeAction: "actions.execute"
} as const;

export interface WorkerRuntimeDependencies {
  config: Pick<PureSocConfig, "jobs">;
  queue?: JobQueueAdapter;
  actionExecution?: RemediationActionExecutionDependencies;
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
  const registry = new JobRegistry().register<RemediationActionExecutionJob, WorkerActionExecutionResult>({
    name: workerRuntimeJobNames.executeAction,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    retryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    idempotencyKey: (payload) => payload.actionRunId,
    handler: async ({ payload }) => {
      if (dependencies.actionExecution) {
        return executeRemediationActionJob(payload, dependencies.actionExecution);
      }

      try {
        return validateRemediationActionJobOnly(payload);
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
