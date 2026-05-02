import { randomUUID } from "node:crypto";
import { createConnection, type Socket } from "node:net";

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
  readonly kind = "bullmq";
  readonly options: BullMqReadyJobQueueOptions;
  private readonly redis: RedisCommandClient;
  private readonly keyPrefix: string;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(
    options: BullMqReadyJobQueueOptions & {
      now?: () => Date;
      idFactory?: () => string;
      commandClient?: RedisCommandClient;
    }
  ) {
    this.options = options;
    this.redis = options.commandClient ?? new RedisCommandClient(options.redisUrl);
    this.keyPrefix = `puresoc:jobs:${sanitizeRedisKeySegment(options.queueName)}`;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async enqueue<Payload>(input: EnqueueJobInput<Payload>): Promise<JobDispatchResult<Payload>> {
    const duplicateIndexKey = input.idempotencyKey
      ? this.idempotencyIndexKey(input.name, input.idempotencyKey)
      : null;

    if (duplicateIndexKey) {
      const duplicateJobId = await this.redis.getString(duplicateIndexKey);
      const duplicate = duplicateJobId ? await this.get(duplicateJobId) : null;
      if (duplicate) {
        return {
          status: "duplicate",
          job: duplicate as JobRecord<Payload>,
          duplicateOfJobId: duplicate.id
        };
      }
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
      metadata: {
        ...(input.metadata ?? {}),
        queueProvider: "bullmq"
      }
    };

    if (duplicateIndexKey) {
      const reserved = await this.redis.setIfNotExists(duplicateIndexKey, job.id);
      if (!reserved) {
        const duplicateJobId = await this.redis.getString(duplicateIndexKey);
        const duplicate = duplicateJobId ? await this.get(duplicateJobId) : null;
        if (duplicate) {
          return {
            status: "duplicate",
            job: duplicate as JobRecord<Payload>,
            duplicateOfJobId: duplicate.id
          };
        }
      }
    }

    await this.saveJob(job);
    await this.redis.zadd(this.jobsKey(), Date.parse(job.queuedAt), job.id);
    await this.redis.zadd(this.availableKey(), Date.parse(job.availableAt), job.id);

    return {
      status: "enqueued",
      job: cloneJob(job)
    };
  }

  async claimNext(registeredJobNames: readonly string[]): Promise<JobRecord | null> {
    const registered = new Set(registeredJobNames);
    const now = this.now();
    const candidateIds = await this.redis.zrangeByScore(this.availableKey(), "-inf", now.getTime());
    const candidates = await this.getMany(candidateIds);
    const claimable = candidates
      .filter((job): job is JobRecord => {
        if (!job || !registered.has(job.name)) {
          return false;
        }

        return (job.status === "queued" || job.status === "retry_scheduled") && Date.parse(job.availableAt) <= now.getTime();
      })
      .sort((left, right) => right.priority - left.priority || left.queuedAt.localeCompare(right.queuedAt));

    const job = claimable[0];
    if (!job) {
      return null;
    }

    const timestamp = now.toISOString();
    const running: JobRecord = {
      ...job,
      status: "running",
      startedAt: timestamp,
      attemptsMade: job.attemptsMade + 1,
      failure: undefined,
      retry: {
        attempt: job.attemptsMade + 1,
        maxAttempts: job.maxAttempts,
        retryable: true,
        backoffMs: 0
      }
    };

    await this.redis.zrem(this.availableKey(), running.id);
    await this.saveJob(running);

    return cloneJob(running);
  }

  async complete<Result>(jobId: string, result: Result): Promise<JobRecord<unknown, Result>> {
    const job = await this.requireJob(jobId);
    const timestamp = this.timestamp();
    const completed: JobRecord<unknown, Result> = {
      ...job,
      status: "succeeded",
      completedAt: timestamp,
      result,
      failure: undefined,
      retry: {
        attempt: job.attemptsMade,
        maxAttempts: job.maxAttempts,
        retryable: false,
        backoffMs: 0
      }
    };

    await this.redis.zrem(this.availableKey(), jobId);
    await this.saveJob(completed);

    return cloneJob(completed);
  }

  async fail(jobId: string, failure: JobFailureMetadata, retry?: JobRetryMetadata): Promise<JobRecord> {
    const job = await this.requireJob(jobId);
    const failed: JobRecord = {
      ...job,
      failure,
      failedAt: failure.failedAt,
      retry: retry ?? {
        attempt: job.attemptsMade,
        maxAttempts: job.maxAttempts,
        retryable: false,
        backoffMs: 0
      }
    };

    if (retry?.retryable && retry.nextAttemptAt) {
      failed.status = "retry_scheduled";
      failed.availableAt = retry.nextAttemptAt;
      await this.redis.zadd(this.availableKey(), Date.parse(retry.nextAttemptAt), jobId);
    } else {
      failed.status = "failed";
      failed.completedAt = failure.failedAt;
      await this.redis.zrem(this.availableKey(), jobId);
    }

    await this.saveJob(failed);

    return cloneJob(failed);
  }

  async get(jobId: string): Promise<JobRecord | null> {
    const serialized = await this.redis.getString(this.jobKey(jobId));
    if (!serialized) {
      return null;
    }

    return cloneJob(JSON.parse(serialized) as JobRecord);
  }

  async list(): Promise<JobRecord[]> {
    const jobIds = await this.redis.zrange(this.jobsKey(), 0, -1);
    const jobs = await this.getMany(jobIds);
    return jobs.filter((job): job is JobRecord => Boolean(job)).map(cloneJob);
  }

  async close(): Promise<void> {
    await this.redis.close();
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async deleteQueueKeys(): Promise<number> {
    const keys = await this.redis.scanKeys(`${this.keyPrefix}:*`);
    if (keys.length === 0) {
      return 0;
    }

    return this.redis.del(keys);
  }

  private async requireJob(jobId: string): Promise<JobRecord> {
    const job = await this.get(jobId);
    if (!job) {
      throw new JobRuntimeError("job_not_found", `Job ${jobId} was not found.`, { retryable: false });
    }

    return job;
  }

  private async getMany(jobIds: readonly string[]): Promise<Array<JobRecord | null>> {
    if (jobIds.length === 0) {
      return [];
    }

    const values = await this.redis.mget(jobIds.map((jobId) => this.jobKey(jobId)));
    return values.map((value) => (value ? (JSON.parse(value) as JobRecord) : null));
  }

  private async saveJob(job: JobRecord): Promise<void> {
    await this.redis.set(this.jobKey(job.id), JSON.stringify(job));
  }

  private jobKey(jobId: string): string {
    return `${this.keyPrefix}:job:${jobId}`;
  }

  private jobsKey(): string {
    return `${this.keyPrefix}:jobs`;
  }

  private availableKey(): string {
    return `${this.keyPrefix}:available`;
  }

  private idempotencyIndexKey(name: string, idempotencyKey: string): string {
    return `${this.keyPrefix}:idempotency:${sanitizeRedisKeySegment(name)}:${sanitizeRedisKeySegment(idempotencyKey)}`;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

export const createBullMqReadyJobQueueAdapter = (options: BullMqReadyJobQueueOptions): BullMqReadyJobQueueAdapter =>
  new BullMqReadyJobQueueAdapter(options);

type RedisReply = string | number | null | RedisReply[];

class RedisReplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisReplyError";
  }
}

interface ParsedRedisUrl {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: number;
}

export class RedisCommandClient {
  private readonly connection: ParsedRedisUrl;
  private closed = false;

  constructor(redisUrl: string) {
    this.connection = parseRedisUrl(redisUrl);
  }

  async ping(): Promise<string> {
    return assertRedisString(await this.command(["PING"]));
  }

  async getString(key: string): Promise<string | null> {
    const result = await this.command(["GET", key]);
    return result === null ? null : assertRedisString(result);
  }

  async set(key: string, value: string): Promise<void> {
    const result = await this.command(["SET", key, value]);
    if (assertRedisString(result) !== "OK") {
      throw new RedisReplyError(`Redis SET failed for ${key}.`);
    }
  }

  async setIfNotExists(key: string, value: string): Promise<boolean> {
    const result = await this.command(["SET", key, value, "NX"]);
    return result === "OK";
  }

  async mget(keys: readonly string[]): Promise<Array<string | null>> {
    if (keys.length === 0) {
      return [];
    }

    const result = await this.command(["MGET", ...keys]);
    if (!Array.isArray(result)) {
      throw new RedisReplyError("Redis MGET did not return an array.");
    }

    return result.map((item) => (item === null ? null : assertRedisString(item)));
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return assertRedisNumber(await this.command(["ZADD", key, score, member]));
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const result = await this.command(["ZRANGE", key, start, stop]);
    return assertRedisStringArray(result);
  }

  async zrangeByScore(key: string, min: string | number, max: string | number): Promise<string[]> {
    const result = await this.command(["ZRANGEBYSCORE", key, min, max]);
    return assertRedisStringArray(result);
  }

  async zrem(key: string, member: string): Promise<number> {
    return assertRedisNumber(await this.command(["ZREM", key, member]));
  }

  async scanKeys(match: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      const result = await this.command(["SCAN", cursor, "MATCH", match, "COUNT", 100]);
      if (!Array.isArray(result) || result.length !== 2) {
        throw new RedisReplyError("Redis SCAN did not return a cursor and key array.");
      }

      cursor = assertRedisString(result[0]);
      keys.push(...assertRedisStringArray(result[1]));
    } while (cursor !== "0");

    return keys;
  }

  async del(keys: readonly string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    return assertRedisNumber(await this.command(["DEL", ...keys]));
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  private async command(parts: ReadonlyArray<string | number>): Promise<RedisReply> {
    if (this.closed) {
      throw new JobRuntimeError("redis_client_closed", "Redis queue client is closed.", { retryable: false });
    }

    const commands = this.connectionCommands(parts);
    return executeRedisCommands(this.connection, commands);
  }

  private connectionCommands(parts: ReadonlyArray<string | number>): Array<ReadonlyArray<string | number>> {
    const commands: Array<ReadonlyArray<string | number>> = [];

    if (this.connection.password) {
      if (this.connection.username) {
        commands.push(["AUTH", this.connection.username, this.connection.password]);
      } else {
        commands.push(["AUTH", this.connection.password]);
      }
    }

    if (this.connection.database !== undefined) {
      commands.push(["SELECT", this.connection.database]);
    }

    commands.push(parts);
    return commands;
  }
}

const executeRedisCommands = async (
  connection: ParsedRedisUrl,
  commands: Array<ReadonlyArray<string | number>>
): Promise<RedisReply> => {
  const socket = await connectRedisSocket(connection);
  let buffer = Buffer.alloc(0);
  const replies: RedisReply[] = [];

  try {
    socket.write(Buffer.concat(commands.map(encodeRedisCommand)));

    for await (const chunk of socket) {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);

      while (true) {
        const parsed = parseRedisReply(buffer);
        if (!parsed) {
          break;
        }

        buffer = buffer.subarray(parsed.nextOffset);
        if (parsed.reply instanceof RedisReplyError) {
          throw parsed.reply;
        }

        replies.push(parsed.reply);
        if (replies.length === commands.length) {
          socket.end();
          return replies[replies.length - 1] ?? null;
        }
      }
    }
  } finally {
    socket.destroy();
  }

  throw new JobRuntimeError("redis_connection_closed", "Redis closed the connection before returning a command reply.", {
    retryable: true
  });
};

const connectRedisSocket = async (connection: ParsedRedisUrl): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const socket = createConnection({
      host: connection.host,
      port: connection.port
    });

    const cleanup = () => {
      socket.off("connect", onConnect);
      socket.off("error", onError);
    };
    const onConnect = () => {
      cleanup();
      resolve(socket);
    };
    const onError = (error: Error) => {
      cleanup();
      socket.destroy();
      reject(error);
    };

    socket.once("connect", onConnect);
    socket.once("error", onError);
  });

const encodeRedisCommand = (parts: ReadonlyArray<string | number>): Buffer => {
  const chunks = [`*${parts.length}\r\n`];

  for (const part of parts) {
    const value = String(part);
    chunks.push(`$${Buffer.byteLength(value)}\r\n${value}\r\n`);
  }

  return Buffer.from(chunks.join(""));
};

const parseRedisReply = (
  buffer: Buffer,
  offset = 0
): { reply: RedisReply | RedisReplyError; nextOffset: number } | null => {
  if (offset >= buffer.length) {
    return null;
  }

  const prefix = String.fromCharCode(buffer[offset] ?? 0);

  if (prefix === "+" || prefix === "-" || prefix === ":") {
    const end = buffer.indexOf("\r\n", offset, "utf8");
    if (end < 0) {
      return null;
    }

    const value = buffer.subarray(offset + 1, end).toString("utf8");
    if (prefix === "+") {
      return { reply: value, nextOffset: end + 2 };
    }

    if (prefix === "-") {
      return { reply: new RedisReplyError(value), nextOffset: end + 2 };
    }

    return { reply: Number(value), nextOffset: end + 2 };
  }

  if (prefix === "$") {
    const end = buffer.indexOf("\r\n", offset, "utf8");
    if (end < 0) {
      return null;
    }

    const length = Number(buffer.subarray(offset + 1, end).toString("utf8"));
    if (length === -1) {
      return { reply: null, nextOffset: end + 2 };
    }

    const valueStart = end + 2;
    const valueEnd = valueStart + length;
    if (buffer.length < valueEnd + 2) {
      return null;
    }

    return {
      reply: buffer.subarray(valueStart, valueEnd).toString("utf8"),
      nextOffset: valueEnd + 2
    };
  }

  if (prefix === "*") {
    const end = buffer.indexOf("\r\n", offset, "utf8");
    if (end < 0) {
      return null;
    }

    const length = Number(buffer.subarray(offset + 1, end).toString("utf8"));
    if (length === -1) {
      return { reply: null, nextOffset: end + 2 };
    }

    const items: RedisReply[] = [];
    let nextOffset = end + 2;
    for (let index = 0; index < length; index += 1) {
      const parsed = parseRedisReply(buffer, nextOffset);
      if (!parsed) {
        return null;
      }

      if (parsed.reply instanceof RedisReplyError) {
        return parsed;
      }

      items.push(parsed.reply);
      nextOffset = parsed.nextOffset;
    }

    return { reply: items, nextOffset };
  }

  throw new RedisReplyError(`Unsupported Redis reply prefix: ${prefix}`);
};

const parseRedisUrl = (redisUrl: string): ParsedRedisUrl => {
  let parsed: URL;
  try {
    parsed = new URL(redisUrl);
  } catch {
    throw new JobRuntimeError("redis_url_invalid", "Redis queue URL is not a valid URL.", { retryable: false });
  }

  if (parsed.protocol !== "redis:") {
    throw new JobRuntimeError("redis_url_unsupported_protocol", "Only redis:// URLs are supported by the job queue smoke adapter.", {
      retryable: false,
      details: {
        protocol: parsed.protocol
      }
    });
  }

  const databaseSegment = parsed.pathname.replace(/^\//, "");
  const database = databaseSegment.length > 0 ? Number(databaseSegment) : undefined;
  if (database !== undefined && (!Number.isSafeInteger(database) || database < 0)) {
    throw new JobRuntimeError("redis_database_invalid", "Redis database index must be a non-negative integer.", {
      retryable: false
    });
  }

  return {
    host: parsed.hostname || "127.0.0.1",
    port: parsed.port ? Number(parsed.port) : 6379,
    username: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    database
  };
};

const sanitizeRedisKeySegment = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .slice(0, 160);

const assertRedisString = (value: RedisReply): string => {
  if (typeof value !== "string") {
    throw new RedisReplyError("Expected Redis string reply.");
  }

  return value;
};

const assertRedisNumber = (value: RedisReply): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RedisReplyError("Expected Redis numeric reply.");
  }

  return value;
};

const assertRedisStringArray = (value: RedisReply): string[] => {
  if (!Array.isArray(value)) {
    throw new RedisReplyError("Expected Redis array reply.");
  }

  return value.map((item) => assertRedisString(item));
};

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
