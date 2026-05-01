import { randomUUID } from "node:crypto";

export type JobName = string;

export type JobStatus = "queued" | "running" | "retry_scheduled" | "succeeded" | "failed";

export type JobDispatchStatus = "enqueued" | "duplicate";

export type JobExecutionStatus = "succeeded" | "retry_scheduled" | "failed";

export interface JobFailureMetadata {
  code: string;
  message: string;
  retryable: boolean;
  failedAt: string;
  details?: Record<string, unknown>;
}

export interface JobRetryMetadata {
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  backoffMs: number;
  nextAttemptAt?: string;
}

export interface JobRecord<Payload = unknown, Result = unknown> {
  id: string;
  name: JobName;
  payload: Payload;
  status: JobStatus;
  attemptsMade: number;
  maxAttempts: number;
  priority: number;
  queuedAt: string;
  availableAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
  result?: Result;
  failure?: JobFailureMetadata;
  retry?: JobRetryMetadata;
}

export interface EnqueueJobInput<Payload = unknown> {
  name: JobName;
  payload: Payload;
  idempotencyKey?: string;
  maxAttempts: number;
  priority?: number;
  runAfter?: string;
  metadata?: Record<string, unknown>;
}

export interface JobDispatchResult<Payload = unknown> {
  status: JobDispatchStatus;
  job: JobRecord<Payload>;
  duplicateOfJobId?: string;
}

export interface JobQueueAdapter {
  readonly kind: string;
  enqueue<Payload>(input: EnqueueJobInput<Payload>): Promise<JobDispatchResult<Payload>>;
  claimNext(registeredJobNames: readonly string[]): Promise<JobRecord | null>;
  complete<Result>(jobId: string, result: Result): Promise<JobRecord<unknown, Result>>;
  fail(jobId: string, failure: JobFailureMetadata, retry?: JobRetryMetadata): Promise<JobRecord>;
  get(jobId: string): Promise<JobRecord | null>;
  list(): Promise<JobRecord[]>;
}

export interface JobHandlerContext<Payload = unknown> {
  job: JobRecord<Payload>;
  payload: Payload;
  attempt: number;
  requestShutdown: () => void;
  shutdownRequested: () => boolean;
}

export type JobHandler<Payload = unknown, Result = unknown> = (
  context: JobHandlerContext<Payload>
) => Promise<Result> | Result;

export interface JobDefinition<Payload = unknown, Result = unknown> {
  name: JobName;
  defaultMaxAttempts?: number;
  retryBackoffMs?: number;
  idempotencyKey?: (payload: Payload) => string | undefined;
  handler: JobHandler<Payload, Result>;
}

export interface JobRuntimeOptions {
  registry: JobRegistry;
  queue: JobQueueAdapter;
  defaultMaxAttempts?: number;
  defaultRetryBackoffMs?: number;
  now?: () => Date;
}

export interface JobRuntimeDispatchInput<Payload = unknown> {
  name: JobName;
  payload: Payload;
  idempotencyKey?: string;
  maxAttempts?: number;
  priority?: number;
  runAfter?: string;
  metadata?: Record<string, unknown>;
}

export interface JobExecutionSummary<Result = unknown> {
  status: JobExecutionStatus;
  job: JobRecord<unknown, Result>;
  failure?: JobFailureMetadata;
}

export interface JobRuntimeDrainResult {
  status: "idle" | "shutdown_requested" | "max_jobs_reached";
  processedCount: number;
  results: JobExecutionSummary[];
}

export interface JobRuntimeDrainOptions {
  maxJobs?: number;
}

export interface JobRuntimeLoopOptions {
  pollIntervalMs: number;
  logger?: (event: Record<string, unknown>) => void;
}

export class JobRuntimeError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, options: { retryable?: boolean; details?: Record<string, unknown> } = {}) {
    super(message);
    this.name = "JobRuntimeError";
    this.code = code;
    this.retryable = options.retryable ?? true;
    this.details = options.details;
  }
}

export class JobRegistry {
  private readonly definitions = new Map<string, JobDefinition>();

  register<Payload, Result>(definition: JobDefinition<Payload, Result>): this {
    if (this.definitions.has(definition.name)) {
      throw new JobRuntimeError("duplicate_job_definition", `Job ${definition.name} is already registered.`, {
        retryable: false
      });
    }

    this.definitions.set(definition.name, definition as JobDefinition);
    return this;
  }

  get<Payload = unknown, Result = unknown>(name: JobName): JobDefinition<Payload, Result> {
    const definition = this.definitions.get(name);
    if (!definition) {
      throw new JobRuntimeError("unknown_job_definition", `Job ${name} is not registered.`, {
        retryable: false
      });
    }

    return definition as JobDefinition<Payload, Result>;
  }

  has(name: JobName): boolean {
    return this.definitions.has(name);
  }

  names(): string[] {
    return [...this.definitions.keys()].sort();
  }
}

export class InMemoryJobQueue implements JobQueueAdapter {
  readonly kind = "memory";

  private readonly jobs = new Map<string, JobRecord>();
  private readonly order: string[] = [];
  private readonly idempotencyIndex = new Map<string, string>();
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: { now?: () => Date; idFactory?: () => string } = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async enqueue<Payload>(input: EnqueueJobInput<Payload>): Promise<JobDispatchResult<Payload>> {
    const duplicateIndexKey = input.idempotencyKey ? this.toIdempotencyIndexKey(input.name, input.idempotencyKey) : null;
    const duplicateJobId = duplicateIndexKey ? this.idempotencyIndex.get(duplicateIndexKey) : undefined;
    const duplicate = duplicateJobId ? this.jobs.get(duplicateJobId) : undefined;

    if (duplicate) {
      return {
        status: "duplicate",
        job: cloneJob(duplicate) as JobRecord<Payload>,
        duplicateOfJobId: duplicate.id
      };
    }

    const timestamp = this.timestamp();
    const job: JobRecord<Payload> = {
      id: this.idFactory(),
      name: input.name,
      payload: input.payload,
      status: "queued",
      attemptsMade: 0,
      maxAttempts: input.maxAttempts,
      priority: input.priority ?? 0,
      queuedAt: timestamp,
      availableAt: input.runAfter ?? timestamp,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ?? {}
    };

    this.jobs.set(job.id, job as JobRecord);
    this.order.push(job.id);

    if (duplicateIndexKey) {
      this.idempotencyIndex.set(duplicateIndexKey, job.id);
    }

    return {
      status: "enqueued",
      job: cloneJob(job)
    };
  }

  async claimNext(registeredJobNames: readonly string[]): Promise<JobRecord | null> {
    const registered = new Set(registeredJobNames);
    const timestamp = this.timestamp();
    const claimable = this.order
      .map((id) => this.jobs.get(id))
      .filter((job): job is JobRecord => {
        if (!job || !registered.has(job.name)) {
          return false;
        }

        return (job.status === "queued" || job.status === "retry_scheduled") && job.availableAt <= timestamp;
      })
      .sort((left, right) => right.priority - left.priority || left.queuedAt.localeCompare(right.queuedAt));

    const job = claimable[0];
    if (!job) {
      return null;
    }

    job.status = "running";
    job.startedAt = timestamp;
    job.attemptsMade += 1;
    job.failure = undefined;
    job.retry = {
      attempt: job.attemptsMade,
      maxAttempts: job.maxAttempts,
      retryable: true,
      backoffMs: 0
    };

    return cloneJob(job);
  }

  async complete<Result>(jobId: string, result: Result): Promise<JobRecord<unknown, Result>> {
    const job = this.requireJob(jobId);
    const timestamp = this.timestamp();

    job.status = "succeeded";
    job.completedAt = timestamp;
    job.result = result;
    job.failure = undefined;
    job.retry = {
      attempt: job.attemptsMade,
      maxAttempts: job.maxAttempts,
      retryable: false,
      backoffMs: 0
    };

    return cloneJob(job) as JobRecord<unknown, Result>;
  }

  async fail(jobId: string, failure: JobFailureMetadata, retry?: JobRetryMetadata): Promise<JobRecord> {
    const job = this.requireJob(jobId);

    job.failure = failure;
    job.failedAt = failure.failedAt;
    job.retry = retry ?? {
      attempt: job.attemptsMade,
      maxAttempts: job.maxAttempts,
      retryable: false,
      backoffMs: 0
    };

    if (retry?.retryable && retry.nextAttemptAt) {
      job.status = "retry_scheduled";
      job.availableAt = retry.nextAttemptAt;
    } else {
      job.status = "failed";
      job.completedAt = failure.failedAt;
    }

    return cloneJob(job);
  }

  async get(jobId: string): Promise<JobRecord | null> {
    const job = this.jobs.get(jobId);
    return job ? cloneJob(job) : null;
  }

  async list(): Promise<JobRecord[]> {
    return this.order.map((id) => this.jobs.get(id)).filter((job): job is JobRecord => Boolean(job)).map(cloneJob);
  }

  private requireJob(jobId: string): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new JobRuntimeError("job_not_found", `Job ${jobId} was not found.`, { retryable: false });
    }

    return job;
  }

  private toIdempotencyIndexKey(name: string, idempotencyKey: string): string {
    return `${name}:${idempotencyKey}`;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

export class JobRuntime {
  private readonly registry: JobRegistry;
  private readonly queue: JobQueueAdapter;
  private readonly defaultMaxAttempts: number;
  private readonly defaultRetryBackoffMs: number;
  private readonly now: () => Date;
  private shutdown = false;

  constructor(options: JobRuntimeOptions) {
    this.registry = options.registry;
    this.queue = options.queue;
    this.defaultMaxAttempts = options.defaultMaxAttempts ?? 3;
    this.defaultRetryBackoffMs = options.defaultRetryBackoffMs ?? 1000;
    this.now = options.now ?? (() => new Date());
  }

  get queueKind(): string {
    return this.queue.kind;
  }

  get registeredJobNames(): string[] {
    return this.registry.names();
  }

  get shutdownRequested(): boolean {
    return this.shutdown;
  }

  requestShutdown(): void {
    this.shutdown = true;
  }

  async dispatch<Payload>(input: JobRuntimeDispatchInput<Payload>): Promise<JobDispatchResult<Payload>> {
    const definition = this.registry.get<Payload>(input.name);
    const idempotencyKey = input.idempotencyKey ?? definition.idempotencyKey?.(input.payload);

    return this.queue.enqueue({
      name: input.name,
      payload: input.payload,
      idempotencyKey,
      maxAttempts: input.maxAttempts ?? definition.defaultMaxAttempts ?? this.defaultMaxAttempts,
      priority: input.priority,
      runAfter: input.runAfter,
      metadata: input.metadata
    });
  }

  async runNext(): Promise<JobExecutionSummary | null> {
    if (this.shutdown) {
      return null;
    }

    const job = await this.queue.claimNext(this.registry.names());
    if (!job) {
      return null;
    }

    const definition = this.registry.get(job.name);

    try {
      const result = await definition.handler({
        job,
        payload: job.payload,
        attempt: job.attemptsMade,
        requestShutdown: () => this.requestShutdown(),
        shutdownRequested: () => this.shutdown
      });
      const completed = await this.queue.complete(job.id, result);

      return {
        status: "succeeded",
        job: completed
      };
    } catch (error) {
      const failure = this.toFailure(error);
      const retryable = failure.retryable && job.attemptsMade < job.maxAttempts;
      const backoffMs = definition.retryBackoffMs ?? this.defaultRetryBackoffMs;
      const retry: JobRetryMetadata = {
        attempt: job.attemptsMade,
        maxAttempts: job.maxAttempts,
        retryable,
        backoffMs,
        nextAttemptAt: retryable ? this.addMilliseconds(backoffMs) : undefined
      };
      const failed = await this.queue.fail(job.id, failure, retry);

      return {
        status: retryable ? "retry_scheduled" : "failed",
        job: failed,
        failure
      };
    }
  }

  async runUntilIdle(options: JobRuntimeDrainOptions = {}): Promise<JobRuntimeDrainResult> {
    const maxJobs = options.maxJobs ?? 100;
    const results: JobExecutionSummary[] = [];

    while (!this.shutdown && results.length < maxJobs) {
      const result = await this.runNext();
      if (!result) {
        break;
      }

      results.push(result);
    }

    return {
      status: this.shutdown ? "shutdown_requested" : results.length >= maxJobs ? "max_jobs_reached" : "idle",
      processedCount: results.length,
      results
    };
  }

  private toFailure(error: unknown): JobFailureMetadata {
    const failedAt = this.now().toISOString();

    if (error instanceof JobRuntimeError) {
      return {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        failedAt,
        details: error.details
      };
    }

    return {
      code: "job_handler_failed",
      message: error instanceof Error ? error.message : String(error),
      retryable: true,
      failedAt
    };
  }

  private addMilliseconds(milliseconds: number): string {
    return new Date(this.now().getTime() + milliseconds).toISOString();
  }
}

export interface BullMqReadyJobQueueOptions {
  queueName: string;
  redisUrl: string;
  defaultJobOptions?: {
    attempts?: number;
    backoffMs?: number;
    removeOnComplete?: boolean;
  };
}

export class BullMqReadyJobQueueAdapter implements JobQueueAdapter {
  readonly kind = "bullmq_ready";
  readonly options: BullMqReadyJobQueueOptions;

  constructor(options: BullMqReadyJobQueueOptions) {
    this.options = options;
  }

  async enqueue<Payload>(_input: EnqueueJobInput<Payload>): Promise<JobDispatchResult<Payload>> {
    throw this.boundaryError();
  }

  async claimNext(_registeredJobNames: readonly string[]): Promise<JobRecord | null> {
    throw this.boundaryError();
  }

  async complete<Result>(_jobId: string, _result: Result): Promise<JobRecord<unknown, Result>> {
    throw this.boundaryError();
  }

  async fail(_jobId: string, _failure: JobFailureMetadata, _retry?: JobRetryMetadata): Promise<JobRecord> {
    throw this.boundaryError();
  }

  async get(_jobId: string): Promise<JobRecord | null> {
    throw this.boundaryError();
  }

  async list(): Promise<JobRecord[]> {
    throw this.boundaryError();
  }

  private boundaryError(): JobRuntimeError {
    return new JobRuntimeError(
      "bullmq_adapter_boundary_only",
      "BullMQ queue wiring is defined as an adapter boundary; live Redis calls are intentionally deferred.",
      {
        retryable: false,
        details: {
          queueName: this.options.queueName,
          redisUrlConfigured: this.options.redisUrl.trim().length > 0
        }
      }
    );
  }
}

export const createBullMqReadyJobQueueAdapter = (options: BullMqReadyJobQueueOptions): BullMqReadyJobQueueAdapter =>
  new BullMqReadyJobQueueAdapter(options);

export const runJobRuntimeLoop = async (
  runtime: JobRuntime,
  options: JobRuntimeLoopOptions
): Promise<JobRuntimeDrainResult> => {
  options.logger?.({
    event: "job_runtime_loop_started",
    queueKind: runtime.queueKind,
    registeredJobs: runtime.registeredJobNames
  });

  const results: JobExecutionSummary[] = [];

  while (!runtime.shutdownRequested) {
    const result = await runtime.runNext();
    if (result) {
      results.push(result);
      options.logger?.({
        event: "job_processed",
        jobId: result.job.id,
        jobName: result.job.name,
        status: result.status
      });
      continue;
    }

    await sleep(options.pollIntervalMs);
  }

  return {
    status: "shutdown_requested",
    processedCount: results.length,
    results
  };
};

const cloneJob = <Payload, Result>(job: JobRecord<Payload, Result>): JobRecord<Payload, Result> => ({
  ...job,
  metadata: { ...job.metadata },
  failure: job.failure ? { ...job.failure, details: job.failure.details ? { ...job.failure.details } : undefined } : undefined,
  retry: job.retry ? { ...job.retry } : undefined
});

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
