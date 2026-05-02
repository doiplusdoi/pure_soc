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
}

export interface RateLimiter {
  readonly storeKind: string;
  check(input: RateLimitCheckInput): RateLimitDecision | Promise<RateLimitDecision>;
}

interface RateLimitWindow {
  count: number;
  startedAtMs: number;
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
