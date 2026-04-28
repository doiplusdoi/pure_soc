import { describe, expect, it } from "vitest";

import { loadConfig } from "../index";

describe("loadConfig", () => {
  it("loads checked-in defaults", () => {
    const config = loadConfig({ env: {} });

    expect(config.app.env).toBe("development");
    expect(config.auth.localEnabled).toBe(true);
    expect(config.connectors.readOnlyByDefault).toBe(true);
    expect(config.reports.legalCaveatRequired).toBe(true);
  });

  it("applies environment overrides without mutating legal caveat policy", () => {
    const config = loadConfig({
      env: {
        PURESOC_APP_ENV: "staging",
        PURESOC_AUTH_LOCAL_ENABLED: "false",
        PURESOC_BILLING_PROVIDER: "stripe"
      }
    });

    expect(config.app.env).toBe("staging");
    expect(config.auth.localEnabled).toBe(false);
    expect(config.billing.provider).toBe("stripe");
    expect(config.app.legalCaveat).toContain("not a legal opinion");
  });
});
