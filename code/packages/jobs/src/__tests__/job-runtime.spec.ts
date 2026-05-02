import { describe, expect, it } from "vitest";

import {
  BullMqReadyJobQueueAdapter,
  InMemoryJobQueue,
  JobRegistry,
  JobRuntime,
  JobRuntimeError,
  RedisCommandClient,
  createBullMqReadyJobQueueAdapter,
  type RedisReply,
  type RedisQueueCommandClient
} from "../index";

describe("job runtime", () => {
  it("registers jobs, dispatches once, and deduplicates by idempotency key", async () => {
    const processed: string[] = [];
    const runtime = new JobRuntime({
      registry: new JobRegistry().register<{ tenantId: string }, { processed: true }>({
        name: "tenant.sync",
        idempotencyKey: (payload) => payload.tenantId,
        handler: ({ payload }) => {
          processed.push(payload.tenantId);
          return { processed: true };
        }
      }),
      queue: new InMemoryJobQueue({ idFactory: deterministicIds("job") })
    });

    const first = await runtime.dispatch({
      name: "tenant.sync",
      payload: { tenantId: "tenant_1" }
    });
    const duplicate = await runtime.dispatch({
      name: "tenant.sync",
      payload: { tenantId: "tenant_1" }
    });

    expect(first.status).toBe("enqueued");
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.duplicateOfJobId).toBe(first.job.id);

    const result = await runtime.runUntilIdle();

    expect(result).toMatchObject({
      status: "idle",
      processedCount: 1
    });
    expect(result.results[0]?.job.result).toEqual({ processed: true });
    expect(processed).toEqual(["tenant_1"]);
  });

  it("records retry and failure metadata before succeeding", async () => {
    let calls = 0;
    const runtime = new JobRuntime({
      registry: new JobRegistry().register<{ value: string }, { ok: true }>({
        name: "flaky.job",
        defaultMaxAttempts: 2,
        retryBackoffMs: 0,
        handler: () => {
          calls += 1;
          if (calls === 1) {
            throw new Error("temporary outage");
          }

          return { ok: true };
        }
      }),
      queue: new InMemoryJobQueue({ idFactory: deterministicIds("job") }),
      defaultRetryBackoffMs: 0
    });

    await runtime.dispatch({
      name: "flaky.job",
      payload: { value: "x" }
    });

    const first = await runtime.runNext();
    const second = await runtime.runNext();

    expect(first).toMatchObject({
      status: "retry_scheduled",
      failure: {
        code: "job_handler_failed",
        message: "temporary outage",
        retryable: true
      },
      job: {
        status: "retry_scheduled",
        attemptsMade: 1,
        retry: {
          attempt: 1,
          maxAttempts: 2,
          retryable: true,
          backoffMs: 0
        }
      }
    });
    expect(second).toMatchObject({
      status: "succeeded",
      job: {
        status: "succeeded",
        attemptsMade: 2,
        result: {
          ok: true
        }
      }
    });
  });

  it("does not retry non-retryable job runtime errors", async () => {
    const runtime = new JobRuntime({
      registry: new JobRegistry().register({
        name: "invalid.job",
        defaultMaxAttempts: 3,
        handler: () => {
          throw new JobRuntimeError("invalid_payload", "The payload is not safe to execute.", {
            retryable: false
          });
        }
      }),
      queue: new InMemoryJobQueue({ idFactory: deterministicIds("job") })
    });

    await runtime.dispatch({
      name: "invalid.job",
      payload: {}
    });

    const result = await runtime.runNext();

    expect(result).toMatchObject({
      status: "failed",
      failure: {
        code: "invalid_payload",
        retryable: false
      },
      job: {
        status: "failed",
        attemptsMade: 1,
        retry: {
          retryable: false
        }
      }
    });
  });

  it("honors graceful shutdown after the current job finishes", async () => {
    const processed: string[] = [];
    const runtime = new JobRuntime({
      registry: new JobRegistry().register<{ id: string }, { ok: true }>({
        name: "ordered.job",
        handler: ({ payload, requestShutdown }) => {
          processed.push(payload.id);
          requestShutdown();
          return { ok: true };
        }
      }),
      queue: new InMemoryJobQueue({ idFactory: deterministicIds("job") })
    });

    await runtime.dispatch({ name: "ordered.job", payload: { id: "first" } });
    await runtime.dispatch({ name: "ordered.job", payload: { id: "second" } });

    const result = await runtime.runUntilIdle({ maxJobs: 10 });

    expect(result).toMatchObject({
      status: "shutdown_requested",
      processedCount: 1
    });
    expect(processed).toEqual(["first"]);
  });

  it("redacts sensitive queue metadata and failure details before persistence", async () => {
    const runtime = new JobRuntime({
      registry: new JobRegistry().register({
        name: "sensitive.job",
        handler: () => {
          throw new JobRuntimeError("provider_failure", "Provider failed without serialized secrets.", {
            retryable: false,
            details: {
              authorization: "Bearer secret-token",
              safe: "visible",
              nested: {
                clientSecret: "client-secret"
              }
            }
          });
        }
      }),
      queue: new InMemoryJobQueue({ idFactory: deterministicIds("job") })
    });

    await runtime.dispatch({
      name: "sensitive.job",
      payload: { id: "payload-without-secrets" },
      metadata: {
        accessToken: "secret-token",
        safeLabel: "visible",
        nested: {
          refreshToken: "refresh-secret"
        }
      }
    });
    const result = await runtime.runNext();

    const serialized = JSON.stringify(result?.job);
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("refresh-secret");
    expect(serialized).not.toContain("client-secret");
    expect(result?.job.metadata).toMatchObject({
      safeLabel: "visible",
      redactedFieldCount: 1,
      nested: {
        redactedFieldCount: 1
      }
    });
    expect(result?.failure?.details).toMatchObject({
      safe: "visible",
      redactedFieldCount: 1,
      nested: {
        redactedFieldCount: 1
      }
    });
  });

  it("serializes Redis-backed claims so competing workers do not process the same job", async () => {
    const client = new FakeRedisCommandClient({ yieldBetweenCommands: true });
    const processed: string[] = [];
    const queueA = new BullMqReadyJobQueueAdapter({
      queueName: "m36-contention",
      redisUrl: "redis://127.0.0.1:6379/0",
      commandClient: client,
      idFactory: deterministicIds("redis_job"),
      claimLeaseMs: 5000
    });
    const queueB = new BullMqReadyJobQueueAdapter({
      queueName: "m36-contention",
      redisUrl: "redis://127.0.0.1:6379/0",
      commandClient: client,
      idFactory: deterministicIds("redis_job_b"),
      claimLeaseMs: 5000
    });
    const makeRuntime = (queue: BullMqReadyJobQueueAdapter) =>
      new JobRuntime({
        registry: new JobRegistry().register<{ id: string }, { processedBy: string }>({
          name: "shared.job",
          handler: ({ payload, job }) => {
            processed.push(`${payload.id}:${job.id}`);
            return { processedBy: job.id };
          }
        }),
        queue
      });
    const runtimeA = makeRuntime(queueA);
    const runtimeB = makeRuntime(queueB);

    const dispatch = await runtimeA.dispatch({
      name: "shared.job",
      payload: { id: "tenant-1" }
    });
    const results = await Promise.all([runtimeA.runNext(), runtimeB.runNext()]);

    expect(dispatch.status).toBe("enqueued");
    expect(results.filter((result) => result?.status === "succeeded")).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(processed).toEqual([`tenant-1:${dispatch.job.id}`]);
    expect(await queueA.get(dispatch.job.id)).toMatchObject({
      status: "succeeded",
      attemptsMade: 1
    });
  });

  it("recovers stale Redis running jobs and cleans retained terminal jobs", async () => {
    let now = new Date("2026-05-02T10:00:00.000Z");
    const client = new FakeRedisCommandClient();
    const queue = new BullMqReadyJobQueueAdapter({
      queueName: "m36-maintenance",
      redisUrl: "redis://127.0.0.1:6379/0",
      commandClient: client,
      idFactory: deterministicIds("redis_job"),
      now: () => now
    });

    const stuck = await queue.enqueue({
      name: "stuck.job",
      payload: { id: "stuck" },
      idempotencyKey: "stuck",
      maxAttempts: 2
    });
    const claimed = await queue.claimNext(["stuck.job"]);
    expect(claimed).toMatchObject({
      status: "running",
      attemptsMade: 1
    });

    now = new Date("2026-05-02T10:30:00.000Z");
    const recovery = await queue.recoverStaleRunningJobs({
      runningJobStaleAfterMs: 60_000,
      retryBackoffMs: 0,
      now
    });

    expect(recovery).toEqual({
      retriedJobIds: [stuck.job.id],
      failedJobIds: [],
      inspectedCount: 1
    });
    expect(await queue.get(stuck.job.id)).toMatchObject({
      status: "retry_scheduled",
      attemptsMade: 1,
      failure: {
        code: "stale_running_job_recovered",
        retryable: true
      }
    });

    const retried = await queue.claimNext(["stuck.job"]);
    expect(retried?.id).toBe(stuck.job.id);
    await queue.complete(stuck.job.id, { ok: true });

    const failed = await queue.enqueue({
      name: "failed.job",
      payload: { id: "failed" },
      idempotencyKey: "failed",
      maxAttempts: 1
    });
    await queue.claimNext(["failed.job"]);
    await queue.fail(failed.job.id, {
      code: "permanent",
      message: "Permanent failure.",
      retryable: false,
      failedAt: now.toISOString()
    });

    now = new Date("2026-05-04T10:30:00.000Z");
    const cleanup = await queue.cleanupTerminalJobs({
      completedJobRetentionMs: 1000,
      failedJobRetentionMs: 1000,
      now
    });

    expect(cleanup.removedJobIds.sort()).toEqual([failed.job.id, stuck.job.id].sort());
    expect(cleanup.removedCount).toBe(2);
    expect(await queue.list()).toEqual([]);

    const redispatch = await queue.enqueue({
      name: "stuck.job",
      payload: { id: "stuck-again" },
      idempotencyKey: "stuck",
      maxAttempts: 1
    });
    expect(redispatch.status).toBe("enqueued");
  });

  it("retries transient Redis command failures with bounded backoff", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const client = new RedisCommandClient("redis://127.0.0.1:6379/0", {
      maxAttempts: 2,
      backoffMs: 25,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
      },
      executor: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("ECONNRESET");
        }

        return "PONG";
      }
    });

    await expect(client.ping()).resolves.toBe("PONG");
    expect(calls).toBe(2);
    expect(sleeps).toEqual([25]);
  });

  it("exposes a Redis-backed BullMQ queue adapter for opt-in live smokes", () => {
    const adapter = createBullMqReadyJobQueueAdapter({
      queueName: "puresoc-jobs",
      redisUrl: "redis://puresoc-redis:6379/0",
      defaultJobOptions: {
        attempts: 3,
        backoffMs: 1000,
        removeOnComplete: true
      }
    });

    expect(adapter).toBeInstanceOf(BullMqReadyJobQueueAdapter);
    expect(adapter.kind).toBe("bullmq");
    expect(adapter.options.queueName).toBe("puresoc-jobs");
  });
});

const deterministicIds = (prefix: string) => {
  let next = 0;
  return () => `${prefix}_${(next += 1).toString().padStart(3, "0")}`;
};

class FakeRedisCommandClient implements RedisQueueCommandClient {
  private readonly strings = new Map<string, string>();
  private readonly sortedSets = new Map<string, Map<string, number>>();
  private readonly yieldBetweenCommands: boolean;

  constructor(options: { yieldBetweenCommands?: boolean } = {}) {
    this.yieldBetweenCommands = options.yieldBetweenCommands ?? false;
  }

  async ping(): Promise<string> {
    await this.tick();
    return "PONG";
  }

  async eval(): Promise<RedisReply> {
    await this.tick();
    throw new Error("Fake Redis job client does not implement EVAL.");
  }

  async getString(key: string): Promise<string | null> {
    await this.tick();
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.tick();
    this.strings.set(key, value);
  }

  async setIfNotExists(key: string, value: string): Promise<boolean> {
    await this.tick();
    if (this.strings.has(key)) {
      return false;
    }

    this.strings.set(key, value);
    return true;
  }

  async mget(keys: readonly string[]): Promise<Array<string | null>> {
    await this.tick();
    return keys.map((key) => this.strings.get(key) ?? null);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    await this.tick();
    const set = this.sortedSet(key);
    const existed = set.has(member);
    set.set(member, score);
    return existed ? 0 : 1;
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    await this.tick();
    const members = this.sortedMembers(key);
    const normalizedStop = stop < 0 ? members.length + stop : stop;
    return members.slice(start, normalizedStop + 1);
  }

  async zrangeByScore(key: string, min: string | number, max: string | number): Promise<string[]> {
    await this.tick();
    const minScore = min === "-inf" ? Number.NEGATIVE_INFINITY : Number(min);
    const maxScore = max === "+inf" ? Number.POSITIVE_INFINITY : Number(max);
    return this.sortedMembers(key).filter((member) => {
      const score = this.sortedSets.get(key)?.get(member) ?? Number.NaN;
      return score >= minScore && score <= maxScore;
    });
  }

  async zrem(key: string, member: string): Promise<number> {
    await this.tick();
    const set = this.sortedSets.get(key);
    if (!set) {
      return 0;
    }

    return set.delete(member) ? 1 : 0;
  }

  async scanKeys(match: string): Promise<string[]> {
    await this.tick();
    const prefix = match.endsWith("*") ? match.slice(0, -1) : match;
    return [...this.strings.keys(), ...this.sortedSets.keys()].filter((key) => key.startsWith(prefix)).sort();
  }

  async del(keys: readonly string[]): Promise<number> {
    await this.tick();
    let deleted = 0;
    for (const key of keys) {
      if (this.strings.delete(key)) {
        deleted += 1;
      }
      if (this.sortedSets.delete(key)) {
        deleted += 1;
      }
    }

    return deleted;
  }

  async close(): Promise<void> {
    await this.tick();
  }

  private sortedSet(key: string): Map<string, number> {
    const existing = this.sortedSets.get(key);
    if (existing) {
      return existing;
    }

    const created = new Map<string, number>();
    this.sortedSets.set(key, created);
    return created;
  }

  private sortedMembers(key: string): string[] {
    return [...(this.sortedSets.get(key)?.entries() ?? [])]
      .sort(([leftMember, leftScore], [rightMember, rightScore]) => leftScore - rightScore || leftMember.localeCompare(rightMember))
      .map(([member]) => member);
  }

  private async tick(): Promise<void> {
    if (this.yieldBetweenCommands) {
      await Promise.resolve();
    }
  }
}
