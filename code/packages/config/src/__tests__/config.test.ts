import { describe, expect, it } from "vitest";

import { loadConfig } from "../index";

describe("loadConfig", () => {
  it("loads checked-in defaults", () => {
    const config = loadConfig({ env: {} });

    expect(config.app.env).toBe("development");
    expect(config.auth.localEnabled).toBe(true);
    expect(config.connectors.readOnlyByDefault).toBe(true);
    expect(config.reports.legalCaveatRequired).toBe(true);
    expect(config.storage.objectStorage.provider).toBe("memory");
    expect(config.storage.uploadScanner.mode).toBe("noop");
  });

  it("applies environment overrides without mutating legal caveat policy", () => {
    const config = loadConfig({
      env: {
        PURESOC_APP_ENV: "staging",
        PURESOC_AUTH_LOCAL_ENABLED: "false",
        PURESOC_BILLING_PROVIDER: "stripe",
        PURESOC_OBJECT_STORAGE_PROVIDER: "s3",
        PURESOC_OBJECT_STORAGE_BUCKET: "evidence-test",
        PURESOC_UPLOAD_SCANNER_MODE: "mock",
        PURESOC_UPLOAD_SCANNER_MOCK_STATUS: "failed"
      }
    });

    expect(config.app.env).toBe("staging");
    expect(config.auth.localEnabled).toBe(false);
    expect(config.billing.provider).toBe("stripe");
    expect(config.storage.objectStorage.provider).toBe("s3");
    expect(config.storage.objectStorage.bucket).toBe("evidence-test");
    expect(config.storage.uploadScanner.mode).toBe("mock");
    expect(config.storage.uploadScanner.mockStatus).toBe("failed");
    expect(config.app.legalCaveat).toContain("not a legal opinion");
  });
});
