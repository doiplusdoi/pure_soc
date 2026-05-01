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

interface RateLimitWindow {
  count: number;
  startedAtMs: number;
}

export class InMemoryFixedWindowRateLimiter {
  private readonly windows = new Map<string, RateLimitWindow>();
  private readonly now: () => Date;

  constructor(options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  check(input: RateLimitCheckInput): RateLimitDecision {
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
