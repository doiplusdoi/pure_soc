import {
  InMemoryJobQueue,
  JobRegistry,
  JobRuntime,
  createBullMqReadyJobQueueAdapter,
  type JobDispatchResult,
  type JobQueueAdapter
} from "@puresoc/jobs";
import type { PureSocConfig } from "@puresoc/config";
import { createPrismaClient, InMemoryNotificationRepository, PrismaNotificationRepository } from "@puresoc/database";
import {
  InMemoryRegulatorySourceRepository,
  type RegulatorySourceMetadataCheckClient,
  type RegulatorySourceMonitorRunResult,
  type RegulatorySourceRepository
} from "@puresoc/regulatory-sources";
import {
  DisabledNotificationTransport,
  NotificationService,
  SlackWebhookNotificationTransport,
  SmtpNotificationTransport,
  TeamsWebhookNotificationTransport,
  type NotificationChannelType,
  type NotificationRepository,
  type NotificationTransport
} from "@puresoc/notifications";

import { regulatorySourceMonitorJobName, runRegulatorySourceMonitorJob } from "./regulatory-source-monitor";
import {
  notificationDeadlineScanJobName,
  runNotificationDeadlineScanJob,
  type NotificationDeadlineScanResult
} from "./notifications";

export interface RegulatorySourceMonitorScheduledJob {
  reason: "startup" | "interval" | "manual";
  scheduledAt: string;
}

export interface SchedulerRuntimeDependencies {
  config: Pick<PureSocConfig, "app" | "jobs" | "compliance" | "notifications">;
  repository?: RegulatorySourceRepository;
  metadataClient?: RegulatorySourceMetadataCheckClient;
  notificationRepository?: NotificationRepository;
  notificationTransports?: Partial<Record<NotificationChannelType, NotificationTransport>>;
  queue?: JobQueueAdapter;
  now?: () => Date;
  idFactory?: () => string;
}

export interface SchedulerRuntime {
  runtime: JobRuntime;
  enqueueRegulatorySourceMonitorJob: (
    input?: Partial<RegulatorySourceMonitorScheduledJob>
  ) => Promise<JobDispatchResult<RegulatorySourceMonitorScheduledJob>>;
  enqueueNotificationDeadlineScanJob: (
    input?: Partial<NotificationDeadlineScanScheduledJob>
  ) => Promise<JobDispatchResult<NotificationDeadlineScanScheduledJob>>;
}

export interface NotificationDeadlineScanScheduledJob {
  reason: "startup" | "interval" | "manual";
  scheduledAt: string;
}

export const createSchedulerRuntime = (dependencies: SchedulerRuntimeDependencies): SchedulerRuntime => {
  const now = dependencies.now ?? (() => new Date());
  const repository = dependencies.repository ?? new InMemoryRegulatorySourceRepository();
  const notificationRepository =
    dependencies.notificationRepository ?? createSchedulerNotificationRepository(dependencies.config);
  const notificationDelivery = new NotificationService({
    repository: notificationRepository,
    transports: dependencies.notificationTransports ?? createSchedulerNotificationTransports(dependencies.config),
    now
  });
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
  }).register<NotificationDeadlineScanScheduledJob, NotificationDeadlineScanResult>({
    name: notificationDeadlineScanJobName,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    retryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    idempotencyKey: (payload) => `${payload.reason}:${payload.scheduledAt}`,
    handler: () =>
      runNotificationDeadlineScanJob({
        repository: notificationRepository,
        notifications: notificationDelivery,
        scanIntervalMs: dependencies.config.notifications.scheduler.deadlineScanIntervalMs,
        now
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
    },
    enqueueNotificationDeadlineScanJob: (input = {}) => {
      const scheduledAt = input.scheduledAt ?? now().toISOString();
      return runtime.dispatch({
        name: notificationDeadlineScanJobName,
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
        },
        claimLeaseMs: dependencies.config.jobs.redis.claimLeaseMs,
        redisCommand: {
          maxAttempts: dependencies.config.jobs.redis.commandMaxAttempts,
          backoffMs: dependencies.config.jobs.redis.commandRetryBackoffMs
        }
      })
    : new InMemoryJobQueue({ now, idFactory: dependencies.idFactory });

const createSchedulerNotificationRepository = (
  config: Pick<PureSocConfig, "app">
): NotificationRepository =>
  config.app.persistenceMode === "prisma"
    ? new PrismaNotificationRepository(createPrismaClient() as never)
    : new InMemoryNotificationRepository();

const createSchedulerNotificationTransports = (
  config: Pick<PureSocConfig, "notifications">
): Partial<Record<NotificationChannelType, NotificationTransport>> => ({
  email: config.notifications.smtp.enabled
    ? new SmtpNotificationTransport({
        host: config.notifications.smtp.host,
        port: config.notifications.smtp.port,
        secure: config.notifications.smtp.secure,
        startTls: config.notifications.smtp.startTls,
        username: config.notifications.smtp.username,
        password: config.notifications.smtp.password,
        from: config.notifications.smtp.from,
        timeoutMs: config.notifications.smtp.timeoutMs
      })
    : new DisabledNotificationTransport("SMTP notification delivery is not configured."),
  slack_webhook: new SlackWebhookNotificationTransport({
    timeoutMs: config.notifications.webhooks.timeoutMs
  }),
  teams_webhook: new TeamsWebhookNotificationTransport({
    timeoutMs: config.notifications.webhooks.timeoutMs
  })
});

export const runSchedulerTick = async (scheduler: SchedulerRuntime): Promise<{
  enqueued: number;
  processed: number;
}> => {
  const dispatch = await scheduler.enqueueRegulatorySourceMonitorJob({
    reason: "manual"
  });
  const notificationDispatch = await scheduler.enqueueNotificationDeadlineScanJob({
    reason: "manual"
  });
  const result = await scheduler.runtime.runUntilIdle();

  return {
    enqueued:
      (dispatch.status === "enqueued" ? 1 : 0) + (notificationDispatch.status === "enqueued" ? 1 : 0),
    processed: result.processedCount
  };
};
