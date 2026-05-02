import { randomUUID } from "node:crypto";

import { loadConfig } from "@puresoc/config";
import {
  JobRegistry,
  JobRuntime,
  createBullMqReadyJobQueueAdapter,
  type BullMqReadyJobQueueAdapter
} from "@puresoc/jobs";
import {
  InMemoryProviderResourceStore,
  emptyProviderModuleSyncResult,
  type CloudProviderConnector,
  type SyncInput
} from "@puresoc/providers-core";
import { InMemoryRegulatorySourceRepository, type RegulatorySourceRecord } from "@puresoc/regulatory-sources";
import type { ActionRun } from "@puresoc/recommendations";

import { createRemediationActionExecutionJob, type RemediationActionExecutionJob } from "../apps/worker/src/actions";
import { createWorkerRuntime } from "../apps/worker/src/runtime";
import { createSchedulerRuntime } from "../apps/scheduler/src/runtime";
import { createConnectorRunnerRuntime } from "../apps/connector-runner/src/runtime";

const disposableConfirmationVariable = "PURESOC_REDIS_SMOKE_CONFIRM_DISPOSABLE";

const main = async (): Promise<void> => {
  const redisUrl = redisSmokeUrl();
  requireDisposableRedisUrl(redisUrl);

  const runId = randomUUID();
  const queuePrefix = `puresoc-m32-smoke-${runId}`;
  const queues: BullMqReadyJobQueueAdapter[] = [];
  const checks: string[] = [];

  const createQueue = (role: string): BullMqReadyJobQueueAdapter => {
    const queue = createBullMqReadyJobQueueAdapter({
      queueName: `${queuePrefix}-${role}`,
      redisUrl,
      defaultJobOptions: {
        attempts: 2,
        backoffMs: 0,
        removeOnComplete: false
      }
    });
    queues.push(queue);
    return queue;
  };

  log(`Target Redis: ${redactRedisUrl(redisUrl)}`);
  log(`Queue prefix: ${queuePrefix}`);

  try {
    await createQueue("ping").ping();
    checks.push("redis:ping");

    await runCoreQueueSmoke(createQueue("core"));
    checks.push("core:enqueue-claim-complete-retry-idempotency-shutdown");

    await runWorkerSmoke(createQueue("worker"), redisUrl);
    checks.push("worker:remediation-safety-metadata-only");

    await runSchedulerSmoke(createQueue("scheduler"), redisUrl);
    checks.push("scheduler:regulatory-monitor-fake-metadata");

    await runConnectorRunnerSmoke(createQueue("connector-runner"), redisUrl);
    checks.push("connector-runner:read-only-provider-sync");

    log(`M32 live Redis/BullMQ smoke passed: ${checks.join(", ")}`);
  } finally {
    for (const queue of queues.reverse()) {
      try {
        await queue.deleteQueueKeys();
        await queue.close();
      } catch (error) {
        log(`Cleanup warning for ${queue.options.queueName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
};

const runCoreQueueSmoke = async (queue: BullMqReadyJobQueueAdapter): Promise<void> => {
  let flakyCalls = 0;
  const runtime = new JobRuntime({
    registry: new JobRegistry()
      .register<{ subject: string }, { ok: true }>({
        name: "m32.flaky",
        defaultMaxAttempts: 2,
        retryBackoffMs: 0,
        idempotencyKey: (payload) => payload.subject,
        handler: ({ payload }) => {
          flakyCalls += 1;
          if (flakyCalls === 1) {
            throw new Error(`temporary outage for ${payload.subject}`);
          }

          return { ok: true };
        }
      })
      .register<{ id: string }, { stopped: true }>({
        name: "m32.shutdown",
        handler: ({ requestShutdown }) => {
          requestShutdown();
          return { stopped: true };
        }
      }),
    queue,
    defaultRetryBackoffMs: 0
  });

  const first = await runtime.dispatch({
    name: "m32.flaky",
    payload: { subject: "tenant-live-redis" }
  });
  const duplicate = await runtime.dispatch({
    name: "m32.flaky",
    payload: { subject: "tenant-live-redis" }
  });

  assert(first.status === "enqueued", "Core Redis queue did not enqueue the first idempotent job.");
  assert(duplicate.status === "duplicate", "Core Redis queue did not deduplicate by idempotency key.");
  assert(duplicate.duplicateOfJobId === first.job.id, "Duplicate dispatch did not reference the first job ID.");
  assert(first.job.idempotencyKey === "tenant-live-redis", "Idempotency key was not preserved on the job record.");

  const retry = await runtime.runNext();
  assert(retry?.status === "retry_scheduled", "Retryable Redis job did not enter retry_scheduled state.");
  assert(retry.job.retry?.retryable === true, "Retry metadata was not persisted as retryable.");

  const completed = await runtime.runNext();
  assert(completed?.status === "succeeded", "Retryable Redis job did not complete on the second attempt.");
  assert(completed.job.attemptsMade === 2, "Redis job attempts were not persisted across retry.");

  const beforeShutdown = await queue.list();
  assert(
    beforeShutdown.some((job) => job.id === first.job.id && job.status === "succeeded"),
    "Completed Redis job was not readable after completion."
  );

  await runtime.dispatch({
    name: "m32.shutdown",
    payload: { id: "first-shutdown-job" }
  });
  await runtime.dispatch({
    name: "m32.shutdown",
    payload: { id: "second-shutdown-job" }
  });

  const shutdown = await runtime.runUntilIdle({ maxJobs: 10 });
  assert(shutdown.status === "shutdown_requested", "Redis-backed runtime did not honor graceful shutdown.");
  assert(shutdown.processedCount === 1, "Graceful shutdown should stop after the current job.");
};

const runWorkerSmoke = async (queue: BullMqReadyJobQueueAdapter, redisUrl: string): Promise<void> => {
  const worker = createWorkerRuntime({
    config: smokeConfig(redisUrl),
    queue
  });
  const safeJob = createRemediationActionExecutionJob(actionRunFixture(), {
    queuedByUserId: "operator_m32",
    queuedAt: "2026-05-02T10:00:00.000Z",
    providerConnectionWriteEnabledChecked: false
  });

  const dispatch = await worker.dispatchRemediationActionJob(safeJob);
  const result = await worker.runtime.runNext();
  assert(dispatch.status === "enqueued", "Worker safety job was not enqueued.");
  assert(result?.status === "succeeded", "Worker safety job did not succeed.");
  assert(
    result.job.result?.providerWriteExecution === "disabled",
    "Worker smoke must not enable provider write execution."
  );

  const unsafeJob = {
    ...safeJob,
    actionRunId: "action_run_m32_unsafe",
    safetyGates: {
      preflightPassed: false,
      approvalGranted: true,
      preStateSnapshotSaved: true,
      providerWriteEnabledChecked: false
    }
  } as unknown as RemediationActionExecutionJob;

  await worker.dispatchRemediationActionJob(unsafeJob);
  const failed = await worker.runtime.runNext();
  assert(failed?.status === "failed", "Unsafe worker job should fail.");
  assert(failed.failure?.retryable === false, "Unsafe worker job must not retry.");
};

const runSchedulerSmoke = async (queue: BullMqReadyJobQueueAdapter, redisUrl: string): Promise<void> => {
  const repository = new InMemoryRegulatorySourceRepository();
  await seedActiveSource(repository, sourceRecord("source_m32_live_redis"));

  const scheduler = createSchedulerRuntime({
    config: smokeConfig(redisUrl, {
      REGULATORY_SOURCE_MONITOR_ENABLED: "true"
    }),
    repository,
    metadataClient: {
      async check() {
        return {
          outcome: "unreachable",
          statusCode: 503,
          errorCode: "m32_fake_metadata_client"
        };
      }
    },
    queue,
    now: () => new Date("2026-05-02T11:00:00.000Z")
  });

  const dispatch = await scheduler.enqueueRegulatorySourceMonitorJob({
    reason: "manual",
    scheduledAt: "2026-05-02T11:00:00.000Z"
  });
  const result = await scheduler.runtime.runUntilIdle();

  assert(dispatch.status === "enqueued", "Scheduler monitor job was not enqueued.");
  assert(result.processedCount === 1, "Scheduler monitor job was not processed.");
  assert(result.results[0]?.job.result?.reviewTaskCount === 1, "Scheduler smoke did not create a bounded review task.");
};

const runConnectorRunnerSmoke = async (queue: BullMqReadyJobQueueAdapter, redisUrl: string): Promise<void> => {
  let observedAllowProviderWrites: boolean | undefined;
  const store = new InMemoryProviderResourceStore({
    now: () => new Date("2026-05-02T12:00:00.000Z")
  });
  const connection = await store.createConnection({
    organizationId: "org_m32_connector",
    providerKey: "mock",
    displayName: "M32 Redis mock connector"
  });
  const connectorRunner = createConnectorRunnerRuntime({
    config: smokeConfig(redisUrl),
    store,
    connectorRegistry: {
      mock: connectorFixture((input) => {
        observedAllowProviderWrites = input.allowProviderWrites;
      })
    },
    queue
  });

  const dispatch = await connectorRunner.dispatchProviderSyncJob({
    organizationId: "org_m32_connector",
    providerConnectionId: connection.id,
    providerKey: "mock"
  });
  const result = await connectorRunner.runtime.runNext();

  assert(dispatch.status === "enqueued", "Connector-runner provider sync job was not enqueued.");
  assert(result?.status === "succeeded", "Read-only provider sync job did not succeed.");
  assert(observedAllowProviderWrites === false, "Connector-runner smoke must keep provider writes disabled.");

  await connectorRunner.runtime.dispatch({
    name: "provider.sync",
    payload: {
      name: "provider.sync",
      organizationId: "org_m32_connector",
      providerConnectionId: connection.id,
      providerKey: "mock",
      requestedModules: ["unsafe-read-only-check"],
      readOnly: false
    }
  });
  const rejected = await connectorRunner.runtime.runNext();
  assert(rejected?.status === "failed", "Non-read-only provider sync payload should fail.");
  assert(rejected.failure?.retryable === false, "Non-read-only provider sync payload must not retry.");
};

const smokeConfig = (redisUrl: string, env: NodeJS.ProcessEnv = {}) =>
  loadConfig({
    env: {
      ...env,
      PURESOC_JOB_QUEUE_PROVIDER: "bullmq",
      PURESOC_REDIS_URL: redisUrl,
      PURESOC_JOB_DEFAULT_MAX_ATTEMPTS: "2",
      PURESOC_JOB_RETRY_BACKOFF_MS: "0",
      PURESOC_CONNECTOR_RUNNER_ALLOW_PROVIDER_WRITES: "false"
    }
  });

const actionRunFixture = (): ActionRun => ({
  id: "action_run_m32_safe",
  organizationId: "org_m32_worker",
  providerConnectionId: "provider_connection_m32_worker",
  controlId: "nis2.access-control.mfa",
  jurisdiction: "EU",
  providerKey: "mock",
  actionKey: "m32_no_write_safety_validation",
  actionType: "technical",
  automationMode: "preflightable",
  title: "M32 no-write safety validation",
  riskLevel: "medium",
  licenseRequired: [],
  permissionsRequired: [],
  preconditions: {},
  expectedChange: "Safety metadata is validated only.",
  blastRadius: "No provider changes occur.",
  rollbackStrategy: "No rollback is needed because no write occurs.",
  manualFallback: "Complete manually and attach evidence.",
  evidenceRequired: true,
  highRiskForbiddenInV1: false,
  status: "queued",
  approval: {
    status: "approved"
  },
  preflightStatus: "passed",
  verificationStatus: "not_run",
  evidenceArtifactIds: ["evidence_m32_pre"],
  checklistTaskIds: [],
  sourceReferences: [],
  createdAt: "2026-05-02T09:59:00.000Z",
  updatedAt: "2026-05-02T10:00:00.000Z"
});

const connectorFixture = (onSync: (input: SyncInput) => void): CloudProviderConnector => ({
  providerKey: "mock",
  beginConnection: async () => {
    throw new Error("not used by M32 smoke");
  },
  completeConnection: async () => {
    throw new Error("not used by M32 smoke");
  },
  getTenantProfile: async () => {
    throw new Error("not used by M32 smoke");
  },
  syncReadOnlyModules: async (input) => {
    onSync(input);
    return [emptyProviderModuleSyncResult("mock.m32.redis")];
  },
  evaluateControls: async () => [],
  getRecommendedActions: async () => []
});

const sourceRecord = (id: string): RegulatorySourceRecord => ({
  id,
  frameworkKey: "nis2",
  jurisdiction: "EU",
  sourceType: "directive",
  title: `M32 source ${id}`,
  url: `https://example.test/${id}`,
  localFilePath: null,
  publicationDate: null,
  lastCheckedAt: "2026-05-01T09:00:00.000Z",
  versionLabel: "2026-05",
  authorityName: "European Commission",
  trustLevel: "primary",
  status: "active",
  activationStatus: "active",
  activeVersionId: `version_${id}`,
  notes: null
});

const seedActiveSource = async (
  repository: InMemoryRegulatorySourceRepository,
  source: RegulatorySourceRecord
): Promise<void> => {
  await repository.upsertSource(source);
  await repository.saveSourceVersion({
    id: source.activeVersionId ?? `version_${source.id}`,
    sourceId: source.id,
    versionLabel: source.versionLabel ?? "2026-05",
    contentHashSha256: "sha256-m32-current",
    activationStatus: "active",
    validationStatus: "validated",
    metadataJson: {},
    importValidationReportJson: {},
    activatedAt: "2026-05-01T09:00:00.000Z",
    activatedBy: "reviewer_m32",
    supersededAt: null,
    supersededByVersionId: null,
    createdAt: "2026-05-01T08:00:00.000Z"
  });
};

const redisSmokeUrl = (): string =>
  process.env.PURESOC_REDIS_URL ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379/0";

const requireDisposableRedisUrl = (redisUrl: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(redisUrl);
  } catch {
    throw new Error("REDIS_URL/ PURESOC_REDIS_URL must be a valid redis:// URL.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "redis", "puresoc-redis"]);
  if (localHosts.has(parsed.hostname)) {
    return;
  }

  if (process.env[disposableConfirmationVariable] === "true") {
    return;
  }

  throw new Error(
    `Refusing to run live Redis smoke against non-local host ${parsed.hostname}. ` +
      `Set ${disposableConfirmationVariable}=true only after confirming the Redis target is disposable.`
  );
};

const redactRedisUrl = (redisUrl: string): string => {
  try {
    const parsed = new URL(redisUrl);
    if (parsed.password) {
      parsed.password = "redacted";
    }
    return parsed.toString();
  } catch {
    return "redis://<invalid>";
  }
};

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
