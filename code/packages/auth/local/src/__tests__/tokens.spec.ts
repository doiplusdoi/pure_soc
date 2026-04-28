import { describe, expect, it } from "vitest";

import { createExpiringSecretToken, hashSecretToken, isTokenExpired, tokenHashMatches } from "../index";

describe("local auth token helpers", () => {
  it("stores only hashed expiring reset and verification tokens", () => {
    const createdAt = new Date("2026-04-28T10:00:00.000Z");
    const token = createExpiringSecretToken({
      now: createdAt,
      ttlMs: 60_000
    });

    expect(token.plaintextToken).not.toBe(token.tokenHash);
    expect(token.tokenHash).toBe(hashSecretToken(token.plaintextToken));
    expect(tokenHashMatches(token.tokenHash, token.plaintextToken)).toBe(true);
    expect(isTokenExpired(token, new Date("2026-04-28T10:00:59.999Z"))).toBe(false);
    expect(isTokenExpired(token, new Date("2026-04-28T10:01:00.000Z"))).toBe(true);
    expect(isTokenExpired({ ...token, usedAt: new Date("2026-04-28T10:00:10.000Z") }, createdAt)).toBe(true);
  });
});
