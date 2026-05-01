import { describe, expect, it } from "vitest";

import {
  collectStartupConfigIssues,
  loadConfig,
  validateConfigForStartup
} from "../index";

describe("loadConfig", () => {
  it("loads checked-in defaults", () => {
    const config = loadConfig({ env: {} });

    expect(config.app.env).toBe("development");
    expect(config.app.persistenceMode).toBe("memory");
    expect(config.api.requestLimits.jsonBodyMaxBytes).toBe(15_728_640);
    expect(config.api.requestLimits.stripeWebhookRawBodyMaxBytes).toBe(1_048_576);
    expect(config.api.requestLimits.evidenceUploadMaxBytes).toBe(10_485_760);
    expect(config.auth.localEnabled).toBe(true);
    expect(config.auth.sessionCookieSecure).toBe(false);
    expect(config.connectors.readOnlyByDefault).toBe(true);
    expect(config.connectors.providerTokenEncryptionKey).toBe("local-dev-provider-token-key-change-me");
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
        PURESOC_PERSISTENCE_MODE: "prisma",
        PURESOC_API_MAX_JSON_BODY_BYTES: "1024",
        PURESOC_STRIPE_WEBHOOK_MAX_RAW_BODY_BYTES: "2048",
        PURESOC_EVIDENCE_MAX_UPLOAD_BYTES: "512",
        PURESOC_AUTH_LOCAL_ENABLED: "false",
        PURESOC_AUTH_COOKIE_SECURE: "true",
        PURESOC_PROVIDER_TOKEN_KEY: "test-provider-token-key-with-enough-entropy",
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
    expect(config.app.persistenceMode).toBe("prisma");
    expect(config.api.requestLimits.jsonBodyMaxBytes).toBe(1024);
    expect(config.api.requestLimits.stripeWebhookRawBodyMaxBytes).toBe(2048);
    expect(config.api.requestLimits.evidenceUploadMaxBytes).toBe(512);
    expect(config.auth.localEnabled).toBe(false);
    expect(config.auth.sessionCookieSecure).toBe(true);
    expect(config.connectors.providerTokenEncryptionKey).toBe("test-provider-token-key-with-enough-entropy");
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

  it("falls back to memory persistence mode for unknown overrides", () => {
    const config = loadConfig({
      env: {
        PURESOC_PERSISTENCE_MODE: "filesystem"
      }
    });

    expect(config.app.persistenceMode).toBe("memory");
  });

  it("validates production-sensitive startup settings", () => {
    const config = loadConfig({
      env: {
        PURESOC_APP_ENV: "production",
        PURESOC_AUTH_COOKIE_SECURE: "false",
        PURESOC_BILLING_PROVIDER: "stripe",
        PURESOC_OBJECT_STORAGE_PROVIDER: "s3",
        PURESOC_OBJECT_STORAGE_ENDPOINT: "",
        PURESOC_OBJECT_STORAGE_BUCKET: "",
        PURESOC_UPLOAD_SCANNER_MODE: "http",
        PURESOC_UPLOAD_SCANNER_ENDPOINT: ""
      }
    });

    expect(collectStartupConfigIssues(config).map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "production_secure_cookie_required",
        "provider_token_key_required",
        "stripe_secret_key_required",
        "stripe_webhook_secret_required",
        "s3_endpoint_required",
        "s3_bucket_required",
        "upload_scanner_endpoint_required"
      ])
    );
    expect(() => validateConfigForStartup(config)).toThrow("Invalid PureSOC startup configuration");
  });

  it("accepts a production startup config when required secrets are configured", () => {
    const config = loadConfig({
      env: {
        PURESOC_APP_ENV: "production",
        PURESOC_AUTH_COOKIE_SECURE: "true",
        PURESOC_PROVIDER_TOKEN_KEY: "prod-provider-token-key-with-sufficient-entropy",
        PURESOC_BILLING_PROVIDER: "stripe",
        STRIPE_SECRET_KEY: "sk_test_configured",
        STRIPE_WEBHOOK_SECRET: "whsec_configured",
        PURESOC_OBJECT_STORAGE_PROVIDER: "s3",
        PURESOC_OBJECT_STORAGE_ENDPOINT: "https://objects.example.test",
        PURESOC_OBJECT_STORAGE_REGION: "eu-central-1",
        PURESOC_OBJECT_STORAGE_BUCKET: "puresoc-evidence",
        PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID: "access-key",
        PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY: "secret-key",
        PURESOC_UPLOAD_SCANNER_MODE: "http",
        PURESOC_UPLOAD_SCANNER_ENDPOINT: "http://scanner:3310/scan"
      }
    });

    expect(collectStartupConfigIssues(config)).toHaveLength(0);
    expect(validateConfigForStartup(config)).toBe(config);
  });
});
