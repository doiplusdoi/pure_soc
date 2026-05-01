import {
  InMemoryJobQueue,
  JobRegistry,
  JobRuntime,
  createBullMqReadyJobQueueAdapter,
  type JobDispatchResult,
  type JobQueueAdapter
} from "@puresoc/jobs";
import type { PureSocConfig } from "@puresoc/config";
import {
  InMemoryRegulatorySourceRepository,
  type RegulatorySourceMetadataCheckClient,
  type RegulatorySourceMonitorRunResult,
  type RegulatorySourceRepository
} from "@puresoc/regulatory-sources";

import { regulatorySourceMonitorJobName, runRegulatorySourceMonitorJob } from "./regulatory-source-monitor";

export interface RegulatorySourceMonitorScheduledJob {
  reason: "startup" | "interval" | "manual";
  scheduledAt: string;
}

export interface SchedulerRuntimeDependencies {
  config: Pick<PureSocConfig, "jobs" | "compliance">;
  repository?: RegulatorySourceRepository;
  metadataClient?: RegulatorySourceMetadataCheckClient;
  queue?: JobQueueAdapter;
  now?: () => Date;
  idFactory?: () => string;
}

export interface SchedulerRuntime {
  runtime: JobRuntime;
  enqueueRegulatorySourceMonitorJob: (
    input?: Partial<RegulatorySourceMonitorScheduledJob>
  ) => Promise<JobDispatchResult<RegulatorySourceMonitorScheduledJob>>;
}

export const createSchedulerRuntime = (dependencies: SchedulerRuntimeDependencies): SchedulerRuntime => {
  const now = dependencies.now ?? (() => new Date());
  const repository = dependencies.repository ?? new InMemoryRegulatorySourceRepository();
  const queue = dependencies.queue ?? createSchedulerQueue(dependencies, now);
  const registry = new JobRegistry().register<RegulatorySourceMonitorScheduledJob, RegulatorySourceMonitorRunResult>({
    name: regulatorySourceMonitorJobName,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    retryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    idempotencyKey: (payload) => `${payload.reason}:${payload.scheduledAt}`,
    handler: () =>
      runRegulatorySourceMonitorJob({
        repository,
        metadataClient: dependencies.metadataClient,
        config: dependencies.config.compliance.sourceMonitor,
        now,
        idFactory: dependencies.idFactory
      })
  });

  const runtime = new JobRuntime({
    registry,
    queue,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    defaultRetryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    now
  });

  return {
    runtime,
    enqueueRegulatorySourceMonitorJob: (input = {}) => {
      const scheduledAt = input.scheduledAt ?? now().toISOString();
      return runtime.dispatch({
        name: regulatorySourceMonitorJobName,
        payload: {
          reason: input.reason ?? "manual",
          scheduledAt
        },
        idempotencyKey: `${input.reason ?? "manual"}:${scheduledAt}`
      });
    }
  };
};

const createSchedulerQueue = (
  dependencies: SchedulerRuntimeDependencies,
  now: () => Date
): JobQueueAdapter =>
  dependencies.config.jobs.queueProvider === "bullmq"
    ? createBullMqReadyJobQueueAdapter({
        queueName: "puresoc-scheduler",
        redisUrl: dependencies.config.jobs.redisUrl,
        defaultJobOptions: {
          attempts: dependencies.config.jobs.defaultMaxAttempts,
          backoffMs: dependencies.config.jobs.retryBackoffMs,
          removeOnComplete: true
        }
      })
    : new InMemoryJobQueue({ now, idFactory: dependencies.idFactory });

export const runSchedulerTick = async (scheduler: SchedulerRuntime): Promise<{
  enqueued: number;
  processed: number;
}> => {
  const dispatch = await scheduler.enqueueRegulatorySourceMonitorJob({
    reason: "manual"
  });
  const result = await scheduler.runtime.runUntilIdle();

  return {
    enqueued: dispatch.status === "enqueued" ? 1 : 0,
    processed: result.processedCount
  };
};
