import { createHash } from "node:crypto";

import type { PureSocConfig } from "@puresoc/config";
import {
  RedisCommandClient,
  type RedisCommandClientOptions,
  type RedisQueueCommandClient,
  type RedisReply
} from "@puresoc/jobs";

export interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitCheckInput extends RateLimitRule {
  key: string;
}

export interface RateLimitDecision {
  allowed: boolean;
  key: string;
  remaining: number;
  resetAt: string;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  readonly kind: string;
  consume(input: RateLimitCheckInput): RateLimitDecision | Promise<RateLimitDecision>;
  reset?(key?: string): void | Promise<void>;
  close?(): void | Promise<void>;
}

export interface RateLimiter {
  readonly storeKind: string;
  check(input: RateLimitCheckInput): RateLimitDecision | Promise<RateLimitDecision>;
}

interface RateLimitWindow {
  count: number;
  startedAtMs: number;
}

export class RateLimitStoreError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "RateLimitStoreError";
    this.code = code;
    this.retryable = options.retryable ?? true;
  }
}

export class InMemoryFixedWindowRateLimitStore implements RateLimitStore {
  readonly kind = "memory";

  private readonly windows = new Map<string, RateLimitWindow>();
  private readonly now: () => Date;

  constructor(options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  consume(input: RateLimitCheckInput): RateLimitDecision {
    assertRule(input);

    const nowMs = this.now().getTime();
    const existing = this.windows.get(input.key);
    const window =
      existing && nowMs - existing.startedAtMs < input.windowMs
        ? existing
        : {
            count: 0,
            startedAtMs: nowMs
          };

    const resetAtMs = window.startedAtMs + input.windowMs;

    if (window.count >= input.maxRequests) {
      this.windows.set(input.key, window);
      return {
        allowed: false,
        key: input.key,
        remaining: 0,
        resetAt: new Date(resetAtMs).toISOString(),
        retryAfterSeconds: retryAfterSeconds(nowMs, resetAtMs)
      };
    }

    window.count += 1;
    this.windows.set(input.key, window);

    return {
      allowed: true,
      key: input.key,
      remaining: Math.max(input.maxRequests - window.count, 0),
      resetAt: new Date(resetAtMs).toISOString(),
      retryAfterSeconds: retryAfterSeconds(nowMs, resetAtMs)
    };
  }

  reset(key?: string): void {
    if (key) {
      this.windows.delete(key);
      return;
    }

    this.windows.clear();
  }
}

export class FixedWindowRateLimiter implements RateLimiter {
  readonly storeKind: string;

  constructor(private readonly store: RateLimitStore) {
    this.storeKind = store.kind;
  }

  check(input: RateLimitCheckInput): RateLimitDecision | Promise<RateLimitDecision> {
    return this.store.consume(input);
  }
}

export interface RedisFixedWindowRateLimitStoreOptions {
  redisUrl: string;
  keyPrefix?: string;
  now?: () => Date;
  commandClient?: Pick<RedisQueueCommandClient, "eval" | "scanKeys" | "del" | "close">;
  redisCommand?: RedisCommandClientOptions;
}

export class RedisFixedWindowRateLimitStore implements RateLimitStore {
  readonly kind = "redis";

  private readonly keyPrefix: string;
  private readonly now: () => Date;
  private readonly commandClient: Pick<RedisQueueCommandClient, "eval" | "scanKeys" | "del" | "close">;

  constructor(options: RedisFixedWindowRateLimitStoreOptions) {
    this.keyPrefix = sanitizeRedisKeySegment(options.keyPrefix ?? "puresoc:api-rate-limit");
    this.now = options.now ?? (() => new Date());
    this.commandClient =
      options.commandClient ??
      new RedisCommandClient(options.redisUrl, {
        ...options.redisCommand
      });
  }

  async consume(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    assertRule(input);

    const nowMs = this.now().getTime();
    const redisKey = this.redisKey(input.key);

    try {
      const [count, ttlMs, allowedFlag] = parseRedisFixedWindowReply(
        await this.commandClient.eval(redisFixedWindowScript, [redisKey], [input.windowMs, input.maxRequests])
      );
      const safeTtlMs = ttlMs > 0 ? ttlMs : input.windowMs;
      const resetAtMs = nowMs + safeTtlMs;
      const allowed = allowedFlag === 1;

      return {
        allowed,
        key: input.key,
        remaining: allowed ? Math.max(input.maxRequests - count, 0) : 0,
        resetAt: new Date(resetAtMs).toISOString(),
        retryAfterSeconds: retryAfterSeconds(nowMs, resetAtMs)
      };
    } catch (error) {
      throw new RateLimitStoreError(
        "rate_limit_store_unavailable",
        "Redis API rate-limit store is unavailable.",
        {
          cause: error
        }
      );
    }
  }

  async reset(key?: string): Promise<void> {
    if (key) {
      await this.commandClient.del([this.redisKey(key)]);
      return;
    }

    const keys = await this.commandClient.scanKeys(`${this.keyPrefix}:*`);
    if (keys.length > 0) {
      await this.commandClient.del(keys);
    }
  }

  async close(): Promise<void> {
    await this.commandClient.close();
  }

  private redisKey(key: string): string {
    return `${this.keyPrefix}:${createHash("sha256").update(key).digest("hex").slice(0, 32)}`;
  }
}

export class InMemoryFixedWindowRateLimiter extends FixedWindowRateLimiter {
  private readonly inMemoryStore: InMemoryFixedWindowRateLimitStore;

  constructor(options: { now?: () => Date } = {}) {
    const store = new InMemoryFixedWindowRateLimitStore(options);
    super(store);
    this.inMemoryStore = store;
  }

  override check(input: RateLimitCheckInput): RateLimitDecision {
    return this.inMemoryStore.consume(input);
  }

  reset(key?: string): void {
    this.inMemoryStore.reset(key);
  }
}

export const createApiRateLimiter = (options: {
  config: PureSocConfig["api"]["rateLimits"];
  now?: () => Date;
}): RateLimiter => {
  if (options.config.store.provider === "memory") {
    return new InMemoryFixedWindowRateLimiter({ now: options.now });
  }

  if (options.config.store.provider === "redis") {
    return new FixedWindowRateLimiter(
      new RedisFixedWindowRateLimitStore({
        redisUrl: options.config.store.redisUrl,
        keyPrefix: options.config.store.redisKeyPrefix,
        now: options.now,
        redisCommand: {
          maxAttempts: options.config.store.redisCommandMaxAttempts,
          backoffMs: options.config.store.redisCommandRetryBackoffMs
        }
      })
    );
  }

  throw new RateLimitStoreError("rate_limit_store_provider_unsupported", "API rate-limit store provider is unsupported.", {
    retryable: false
  });
};

const retryAfterSeconds = (nowMs: number, resetAtMs: number): number =>
  Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));

const assertRule = (rule: RateLimitRule): void => {
  if (!Number.isSafeInteger(rule.windowMs) || rule.windowMs <= 0) {
    throw new Error("Rate-limit windowMs must be a positive safe integer.");
  }

  if (!Number.isSafeInteger(rule.maxRequests) || rule.maxRequests <= 0) {
    throw new Error("Rate-limit maxRequests must be a positive safe integer.");
  }
};

const redisFixedWindowScript = `
local key = KEYS[1]
local window_ms = tonumber(ARGV[1])
local max_requests = tonumber(ARGV[2])
local current = redis.call("GET", key)

if not current then
  redis.call("SET", key, "1", "PX", window_ms)
  return {1, window_ms, 1}
end

local count = tonumber(current)
local ttl_ms = redis.call("PTTL", key)

if ttl_ms < 0 then
  redis.call("SET", key, "1", "PX", window_ms)
  return {1, window_ms, 1}
end

if count >= max_requests then
  return {count, ttl_ms, 0}
end

count = redis.call("INCR", key)
ttl_ms = redis.call("PTTL", key)
if ttl_ms < 0 then
  redis.call("PEXPIRE", key, window_ms)
  ttl_ms = window_ms
end

return {count, ttl_ms, 1}
`.trim();

const parseRedisFixedWindowReply = (reply: RedisReply): [number, number, 0 | 1] => {
  if (!Array.isArray(reply) || reply.length !== 3) {
    throw new RateLimitStoreError("rate_limit_redis_reply_invalid", "Redis API rate-limit reply was invalid.", {
      retryable: true
    });
  }

  const [count, ttlMs, allowedFlag] = reply;
  if (
    typeof count !== "number" ||
    typeof ttlMs !== "number" ||
    (allowedFlag !== 0 && allowedFlag !== 1)
  ) {
    throw new RateLimitStoreError("rate_limit_redis_reply_invalid", "Redis API rate-limit reply was invalid.", {
      retryable: true
    });
  }

  return [count, ttlMs, allowedFlag];
};

const sanitizeRedisKeySegment = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160);

  return sanitized.length > 0 ? sanitized : "puresoc:api-rate-limit";
};
