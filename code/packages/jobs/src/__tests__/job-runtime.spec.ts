import { describe, expect, it } from "vitest";

import {
  BullMqReadyJobQueueAdapter,
  InMemoryJobQueue,
  JobRegistry,
  JobRuntime,
  JobRuntimeError,
  createBullMqReadyJobQueueAdapter
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
