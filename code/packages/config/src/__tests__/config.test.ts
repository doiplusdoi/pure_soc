import { describe, expect, it } from "vitest";

import { loadConfig } from "../index";

describe("loadConfig", () => {
  it("loads checked-in defaults", () => {
    const config = loadConfig({ env: {} });

    expect(config.app.env).toBe("development");
    expect(config.api.requestLimits.jsonBodyMaxBytes).toBe(15_728_640);
    expect(config.api.requestLimits.stripeWebhookRawBodyMaxBytes).toBe(1_048_576);
    expect(config.api.requestLimits.evidenceUploadMaxBytes).toBe(10_485_760);
    expect(config.auth.localEnabled).toBe(true);
    expect(config.auth.sessionCookieSecure).toBe(false);
    expect(config.connectors.readOnlyByDefault).toBe(true);
    expect(config.compliance.sourceMonitor).toEqual({
      enabled: false,
      requestTimeoutMs: 5000,
      staleAfterDays: 90,
      reviewTaskOrganizationId: null
    });
    expect(config.reports.legalCaveatRequired).toBe(true);
    expect(config.storage.objectStorage.provider).toBe("memory");
    expect(config.storage.uploadScanner.mode).toBe("noop");
    expect(config.storage.uploadScanner.timeoutMs).toBe(10_000);
  });

  it("applies environment overrides without mutating legal caveat policy", () => {
    const config = loadConfig({
      env: {
        PURESOC_APP_ENV: "staging",
        PURESOC_API_MAX_JSON_BODY_BYTES: "1024",
        PURESOC_STRIPE_WEBHOOK_MAX_RAW_BODY_BYTES: "2048",
        PURESOC_EVIDENCE_MAX_UPLOAD_BYTES: "512",
        PURESOC_AUTH_LOCAL_ENABLED: "false",
        PURESOC_AUTH_COOKIE_SECURE: "true",
        PURESOC_BILLING_PROVIDER: "stripe",
        PURESOC_OBJECT_STORAGE_PROVIDER: "s3",
        PURESOC_OBJECT_STORAGE_BUCKET: "evidence-test",
        PURESOC_UPLOAD_SCANNER_MODE: "mock",
        PURESOC_UPLOAD_SCANNER_MOCK_STATUS: "failed",
        PURESOC_UPLOAD_SCANNER_TIMEOUT_MS: "2500",
        REGULATORY_SOURCE_MONITOR_ENABLED: "true",
        REGULATORY_SOURCE_MONITOR_TIMEOUT_MS: "1500",
        REGULATORY_SOURCE_MONITOR_STALE_AFTER_DAYS: "30",
        REGULATORY_SOURCE_MONITOR_REVIEW_ORGANIZATION_ID: "org_regulatory_ops"
      }
    });

    expect(config.app.env).toBe("staging");
    expect(config.api.requestLimits.jsonBodyMaxBytes).toBe(1024);
    expect(config.api.requestLimits.stripeWebhookRawBodyMaxBytes).toBe(2048);
    expect(config.api.requestLimits.evidenceUploadMaxBytes).toBe(512);
    expect(config.auth.localEnabled).toBe(false);
    expect(config.auth.sessionCookieSecure).toBe(true);
    expect(config.billing.provider).toBe("stripe");
    expect(config.storage.objectStorage.provider).toBe("s3");
    expect(config.storage.objectStorage.bucket).toBe("evidence-test");
    expect(config.storage.uploadScanner.mode).toBe("mock");
    expect(config.storage.uploadScanner.mockStatus).toBe("failed");
    expect(config.storage.uploadScanner.timeoutMs).toBe(2500);
    expect(config.compliance.sourceMonitor).toEqual({
      enabled: true,
      requestTimeoutMs: 1500,
      staleAfterDays: 30,
      reviewTaskOrganizationId: "org_regulatory_ops"
    });
    expect(config.app.legalCaveat).toContain("not a legal opinion");
  });

  it("falls back when numeric limit overrides are invalid", () => {
    const config = loadConfig({
      env: {
        PURESOC_API_MAX_JSON_BODY_BYTES: "0",
        PURESOC_STRIPE_WEBHOOK_MAX_RAW_BODY_BYTES: "not-a-number",
        PURESOC_EVIDENCE_MAX_UPLOAD_BYTES: "-1",
        PURESOC_UPLOAD_SCANNER_TIMEOUT_MS: "1.5",
        REGULATORY_SOURCE_MONITOR_TIMEOUT_MS: "0",
        REGULATORY_SOURCE_MONITOR_STALE_AFTER_DAYS: "soon"
      }
    });

    expect(config.api.requestLimits.jsonBodyMaxBytes).toBe(15_728_640);
    expect(config.api.requestLimits.stripeWebhookRawBodyMaxBytes).toBe(1_048_576);
    expect(config.api.requestLimits.evidenceUploadMaxBytes).toBe(10_485_760);
    expect(config.storage.uploadScanner.timeoutMs).toBe(10_000);
    expect(config.compliance.sourceMonitor.requestTimeoutMs).toBe(5000);
    expect(config.compliance.sourceMonitor.staleAfterDays).toBe(90);
  });
});
