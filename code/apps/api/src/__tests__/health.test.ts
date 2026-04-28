import { describe, expect, it } from "vitest";

import { getApiHealth } from "../health";

describe("getApiHealth", () => {
  it("returns a deterministic health shape", () => {
    const health = getApiHealth(new Date("2026-04-28T00:00:00.000Z"));

    expect(health).toEqual({
      service: "puresoc-api",
      status: "ok",
      environment: "development",
      checks: {
        config: "ok",
        providerWrites: "disabled"
      },
      timestamp: "2026-04-28T00:00:00.000Z"
    });
  });
});
