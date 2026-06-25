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
  createPrismaClient,
  InMemoryNotificationRepository,
  InMemoryOutputRecordRepository,
  PrismaNotificationRepository,
  PrismaOutputRecordRepository,
  PrismaProviderResourceStore,
  type OutputRecordRepository
} from "@puresoc/database";
import { InMemoryProviderResourceStore, type ProviderResourceStore } from "@puresoc/providers-core";
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
  notificationCategories,
  type NotificationChannelType,
  type NotificationCategory,
  type NotificationDeliveryPreferences,
  type NotificationDigestFrequency,
  type NotificationPreferenceProvider,
  type NotificationRepository,
  type NotificationTransport
} from "@puresoc/notifications";

import { regulatorySourceMonitorJobName, runRegulatorySourceMonitorJob } from "./regulatory-source-monitor";
import {
  notificationDigestDispatchJobName,
  notificationDeadlineScanJobName,
  notificationRetryDispatchJobName,
  runNotificationDigestDispatchJob,
  runNotificationDeadlineScanJob,
  runNotificationRetryDispatchJob,
  type NotificationDigestDispatchResult,
  type NotificationDeadlineScanResult,
  type NotificationRetryDispatchResult
} from "./notifications";
import {
  dashboardSnapshotJobName,
  runDashboardSnapshotJob,
  type DashboardSnapshotJobResult,
  type DashboardSnapshotScheduledJob
} from "./dashboard-snapshots";

export interface RegulatorySourceMonitorScheduledJob {
  reason: "startup" | "interval" | "manual";
  scheduledAt: string;
}

export interface SchedulerRuntimeDependencies {
  config: Pick<PureSocConfig, "app" | "jobs" | "compliance" | "notifications">;
  repository?: RegulatorySourceRepository;
  metadataClient?: RegulatorySourceMetadataCheckClient;
  outputRepository?: OutputRecordRepository;
  providerStore?: Pick<ProviderResourceStore, "listConnections">;
  notificationRepository?: NotificationRepository;
  notificationTransports?: Partial<Record<NotificationChannelType, NotificationTransport>>;
  notificationPreferenceProvider?: NotificationPreferenceProvider;
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
  enqueueNotificationDigestDispatchJob: (
    input?: Partial<NotificationDigestDispatchScheduledJob>
  ) => Promise<JobDispatchResult<NotificationDigestDispatchScheduledJob>>;
  enqueueNotificationRetryDispatchJob: (
    input?: Partial<NotificationRetryDispatchScheduledJob>
  ) => Promise<JobDispatchResult<NotificationRetryDispatchScheduledJob>>;
  enqueueDashboardSnapshotJob: (
    input?: Partial<DashboardSnapshotScheduledJob>
  ) => Promise<JobDispatchResult<DashboardSnapshotScheduledJob>>;
}

export interface NotificationDeadlineScanScheduledJob {
  reason: "startup" | "interval" | "manual";
  scheduledAt: string;
}

export interface NotificationDigestDispatchScheduledJob {
  reason: "startup" | "interval" | "manual";
  scheduledAt: string;
}

export interface NotificationRetryDispatchScheduledJob {
  reason: "startup" | "interval" | "manual";
  scheduledAt: string;
}

export const createSchedulerRuntime = (dependencies: SchedulerRuntimeDependencies): SchedulerRuntime => {
  const now = dependencies.now ?? (() => new Date());
  const repository = dependencies.repository ?? new InMemoryRegulatorySourceRepository();
  const outputRepository = dependencies.outputRepository ?? createSchedulerOutputRepository(dependencies.config);
  const providerStore = dependencies.providerStore ?? createSchedulerProviderStore(dependencies.config);
  const notificationRepository =
    dependencies.notificationRepository ?? createSchedulerNotificationRepository(dependencies.config);
  const notificationDelivery = new NotificationService({
    repository: notificationRepository,
    transports: dependencies.notificationTransports ?? createSchedulerNotificationTransports(dependencies.config),
    preferenceProvider:
      dependencies.notificationPreferenceProvider ?? createSchedulerNotificationPreferenceProvider(dependencies.config),
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
  }).register<NotificationDigestDispatchScheduledJob, NotificationDigestDispatchResult>({
    name: notificationDigestDispatchJobName,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    retryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    idempotencyKey: (payload) => `${payload.reason}:${payload.scheduledAt}`,
    handler: () =>
      runNotificationDigestDispatchJob({
        notifications: notificationDelivery
      })
  }).register<NotificationRetryDispatchScheduledJob, NotificationRetryDispatchResult>({
    name: notificationRetryDispatchJobName,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    retryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    idempotencyKey: (payload) => `${payload.reason}:${payload.scheduledAt}`,
    handler: () =>
      runNotificationRetryDispatchJob({
        notifications: notificationDelivery
      })
  }).register<DashboardSnapshotScheduledJob, DashboardSnapshotJobResult>({
    name: dashboardSnapshotJobName,
    defaultMaxAttempts: dependencies.config.jobs.defaultMaxAttempts,
    retryBackoffMs: dependencies.config.jobs.retryBackoffMs,
    idempotencyKey: (payload) => `${payload.reason}:${payload.scheduledAt}`,
    handler: () =>
      runDashboardSnapshotJob({
        repository: outputRepository,
        providerStore,
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
    },
    enqueueNotificationDigestDispatchJob: (input = {}) => {
      const scheduledAt = input.scheduledAt ?? now().toISOString();
      return runtime.dispatch({
        name: notificationDigestDispatchJobName,
        payload: {
          reason: input.reason ?? "manual",
          scheduledAt
        },
        idempotencyKey: `${input.reason ?? "manual"}:${scheduledAt}`
      });
    },
    enqueueNotificationRetryDispatchJob: (input = {}) => {
      const scheduledAt = input.scheduledAt ?? now().toISOString();
      return runtime.dispatch({
        name: notificationRetryDispatchJobName,
        payload: {
          reason: input.reason ?? "manual",
          scheduledAt
        },
        idempotencyKey: `${input.reason ?? "manual"}:${scheduledAt}`
      });
    },
    enqueueDashboardSnapshotJob: (input = {}) => {
      const scheduledAt = input.scheduledAt ?? now().toISOString();
      return runtime.dispatch({
        name: dashboardSnapshotJobName,
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

const createSchedulerOutputRepository = (
  config: Pick<PureSocConfig, "app">
): OutputRecordRepository =>
  config.app.persistenceMode === "prisma"
    ? new PrismaOutputRecordRepository(createPrismaClient() as never)
    : new InMemoryOutputRecordRepository();

const createSchedulerProviderStore = (
  config: Pick<PureSocConfig, "app">
): Pick<ProviderResourceStore, "listConnections"> =>
  config.app.persistenceMode === "prisma"
    ? new PrismaProviderResourceStore(createPrismaClient() as never)
    : new InMemoryProviderResourceStore();

interface ProductV1NotificationPreferencesRow {
  recordType: string;
  recordJson: unknown;
}

interface ProductV1NotificationPreferencesClient {
  productV1StateRecord: {
    findUnique(args: { where: { id: string } }): Promise<ProductV1NotificationPreferencesRow | null>;
  };
}

const createSchedulerNotificationPreferenceProvider = (
  config: Pick<PureSocConfig, "app">
): NotificationPreferenceProvider | undefined => {
  if (config.app.persistenceMode !== "prisma") {
    return undefined;
  }

  const client = createPrismaClient() as unknown as ProductV1NotificationPreferencesClient;
  return {
    getPreferences: async (organizationId) => {
      const row = await client.productV1StateRecord.findUnique({
        where: {
          id: notificationPreferencesRecordId(organizationId)
        }
      });
      if (!row || row.recordType !== "notification_preferences") {
        return null;
      }

      return notificationPreferencesFromRecord(row.recordJson);
    }
  };
};

const notificationPreferencesRecordId = (organizationId: string): string => `notification_preferences_${organizationId}`;

const notificationPreferencesFromRecord = (record: unknown): NotificationDeliveryPreferences | null => {
  if (!record || typeof record !== "object") {
    return null;
  }

  const value = record as Record<string, unknown>;
  return {
    digestFrequency: notificationDigestFrequency(value.digestFrequency),
    suppressedCategories: Array.isArray(value.suppressedCategories)
      ? value.suppressedCategories.filter(isNotificationCategory)
      : [],
    mutedUntil: typeof value.mutedUntil === "string" ? value.mutedUntil : null
  };
};

const notificationDigestFrequency = (value: unknown): NotificationDigestFrequency =>
  value === "daily" || value === "weekly" ? value : "off";

const isNotificationCategory = (value: unknown): value is NotificationCategory =>
  notificationCategories.includes(value as NotificationCategory);

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
  const notificationDigestDispatch = await scheduler.enqueueNotificationDigestDispatchJob({
    reason: "manual"
  });
  const notificationRetryDispatch = await scheduler.enqueueNotificationRetryDispatchJob({
    reason: "manual"
  });
  const dashboardSnapshotDispatch = await scheduler.enqueueDashboardSnapshotJob({
    reason: "manual"
  });
  const result = await scheduler.runtime.runUntilIdle();

  return {
    enqueued:
      (dispatch.status === "enqueued" ? 1 : 0) +
      (notificationDispatch.status === "enqueued" ? 1 : 0) +
      (notificationDigestDispatch.status === "enqueued" ? 1 : 0) +
      (notificationRetryDispatch.status === "enqueued" ? 1 : 0) +
      (dashboardSnapshotDispatch.status === "enqueued" ? 1 : 0),
    processed: result.processedCount
  };
};
