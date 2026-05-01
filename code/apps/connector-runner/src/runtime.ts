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
import { InMemoryProviderResourceStore, type CloudProviderConnector, type ProviderResourceStore } from "@puresoc/providers-core";

import {
  createProviderSyncJob,
  runConnectorRunnerJob,
  type ConnectorRunnerJob,
  type ConnectorRunnerJobDependencies
} from "./provider-sync";

export interface ConnectorRunnerRuntimeDependencies {
  config: Pick<PureSocConfig, "jobs">;
  store?: ProviderResourceStore;
  connectorRegistry?: Record<string, CloudProviderConnector>;
  queue?: JobQueueAdapter;
  now?: () => Date;
  idFactory?: () => string;
}

export interface ConnectorRunnerRuntime {
  runtime: JobRuntime;
  dispatchProviderSyncJob: (
    job: Omit<ConnectorRunnerJob, "name" | "readOnly">
  ) => Promise<JobDispatchResult<ConnectorRunnerJob>>;
}

export const createConnectorRunnerRuntime = (
  dependencies: ConnectorRunnerRuntimeDependencies
): ConnectorRunnerRuntime => {
  const store = dependencies.store ?? new InMemoryProviderResourceStore();
  const connectorRegistry = dependencies.connectorRegistry ?? {};
  const queue = dependencies.queue ?? createConnectorRunnerQueue(dependencies);
  const jobDependencies: ConnectorRunnerJobDependencies = {
    store,
    connectorRegistry
  };
  const registry = new JobRegistry().register<ConnectorRunnerJob, Awaited<ReturnType<typeof runConnectorRunnerJob>>>({
    name: "provider.sync",
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    retryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    idempotencyKey: (payload) =>
      [payload.organizationId, payload.providerConnectionId, payload.providerKey, payload.requestedModules?.join(",") ?? "all"].join(
        ":"
      ),
    handler: ({ payload }) => {
      if (payload.readOnly !== true || dependencies.config.jobs.connectorRunner.allowProviderWrites) {
        throw new JobRuntimeError(
          "provider_sync_requires_read_only",
          "Connector-runner jobs must remain read-only until provider write execution is explicitly implemented.",
          {
            retryable: false,
            details: {
              providerKey: payload.providerKey,
              providerConnectionId: payload.providerConnectionId
            }
          }
        );
      }

      return runConnectorRunnerJob(payload, jobDependencies);
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
    dispatchProviderSyncJob: (job) =>
      runtime.dispatch({
        name: "provider.sync",
        payload: createProviderSyncJob(job)
      })
  };
};

const createConnectorRunnerQueue = (dependencies: ConnectorRunnerRuntimeDependencies): JobQueueAdapter =>
  dependencies.config.jobs.queueProvider === "bullmq"
    ? createBullMqReadyJobQueueAdapter({
        queueName: "puresoc-connector-runner",
        redisUrl: dependencies.config.jobs.redisUrl,
        defaultJobOptions: {
          attempts: dependencies.config.jobs.defaultMaxAttempts,
          backoffMs: dependencies.config.jobs.retryBackoffMs,
          removeOnComplete: true
        }
      })
    : new InMemoryJobQueue({ now: dependencies.now, idFactory: dependencies.idFactory });

export const startConnectorRunnerRuntimeLoop = async (
  dependencies: ConnectorRunnerRuntimeDependencies,
  logger: (event: Record<string, unknown>) => void = console.log
): Promise<void> => {
  const connectorRunner = createConnectorRunnerRuntime(dependencies);

  logger({
    service: "puresoc-connector-runner",
    status: dependencies.config.jobs.connectorRunner.enabled ? "runtime_started" : "runtime_disabled",
    queueProvider: dependencies.config.jobs.queueProvider,
    queueKind: connectorRunner.runtime.queueKind,
    registeredJobs: connectorRunner.runtime.registeredJobNames,
    providerWriteExecution: "disabled"
  });

  if (!dependencies.config.jobs.connectorRunner.enabled) {
    return;
  }

  await runJobRuntimeLoop(connectorRunner.runtime, {
    pollIntervalMs: dependencies.config.jobs.pollIntervalMs,
    logger
  });
};
