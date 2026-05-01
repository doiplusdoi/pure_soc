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
    expect(config.api.security.originProtection).toEqual({
      enabled: true,
      requireOriginOrReferer: false,
      exemptRouteFamilies: ["webhook", "oidc_callback", "provider_callback"]
    });
    expect(config.api.security.trustedOrigins).toEqual([
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://localhost:3000",
      "http://localhost:3001"
    ]);
    expect(config.api.rateLimits).toMatchObject({
      enabled: true,
      default: {
        windowMs: 60_000,
        maxRequests: 120
      },
      routeFamilies: {
        auth: {
          windowMs: 60_000,
          maxRequests: 60
        },
        tenant_read: {
          windowMs: 60_000,
          maxRequests: 240
        }
      }
    });
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
    expect(config.jobs).toEqual({
      queueProvider: "memory",
      redisUrl: "redis://puresoc-redis:6379/0",
      defaultMaxAttempts: 3,
      retryBackoffMs: 1000,
      pollIntervalMs: 1000,
      shutdownGraceMs: 5000,
      worker: {
        enabled: true
      },
      scheduler: {
        enabled: true,
        runOnStartup: false,
        intervalMs: 3_600_000
      },
      connectorRunner: {
        enabled: true,
        allowProviderWrites: false
      }
    });
  });

  it("applies environment overrides without mutating legal caveat policy", () => {
    const config = loadConfig({
      env: {
        PURESOC_APP_ENV: "staging",
        PURESOC_PERSISTENCE_MODE: "prisma",
        PURESOC_API_MAX_JSON_BODY_BYTES: "1024",
        PURESOC_STRIPE_WEBHOOK_MAX_RAW_BODY_BYTES: "2048",
        PURESOC_EVIDENCE_MAX_UPLOAD_BYTES: "512",
        PURESOC_API_TRUSTED_ORIGINS: "https://console.example.test, https://admin.example.test/path",
        PURESOC_API_ORIGIN_PROTECTION_ENABLED: "false",
        PURESOC_API_REQUIRE_ORIGIN_OR_REFERER: "true",
        PURESOC_API_ORIGIN_EXEMPT_ROUTE_FAMILIES: "webhook provider_callback",
        PURESOC_API_RATE_LIMIT_ENABLED: "false",
        PURESOC_API_RATE_LIMIT_WINDOW_MS: "30000",
        PURESOC_API_RATE_LIMIT_MAX_REQUESTS: "33",
        PURESOC_API_RATE_LIMIT_AUTH_MAX_REQUESTS: "7",
        PURESOC_API_RATE_LIMIT_AUTH_WINDOW_MS: "15000",
        PURESOC_API_RATE_LIMIT_TENANT_READ_MAX_REQUESTS: "99",
        PURESOC_AUTH_LOCAL_ENABLED: "false",
        PURESOC_AUTH_COOKIE_SECURE: "true",
        PURESOC_PROVIDER_TOKEN_KEY: "test-provider-token-key-with-enough-entropy",
        PURESOC_BILLING_PROVIDER: "stripe",
        PURESOC_OBJECT_STORAGE_PROVIDER: "s3",
        PURESOC_OBJECT_STORAGE_BUCKET: "evidence-test",
        PURESOC_UPLOAD_SCANNER_MODE: "mock",
        PURESOC_UPLOAD_SCANNER_MOCK_STATUS: "failed",
        PURESOC_UPLOAD_SCANNER_TIMEOUT_MS: "2500",
        PURESOC_JOB_QUEUE_PROVIDER: "bullmq",
        PURESOC_REDIS_URL: "redis://redis.example.test:6379/1",
        PURESOC_JOB_DEFAULT_MAX_ATTEMPTS: "5",
        PURESOC_JOB_RETRY_BACKOFF_MS: "2000",
        PURESOC_JOB_POLL_INTERVAL_MS: "250",
        PURESOC_JOB_SHUTDOWN_GRACE_MS: "3000",
        PURESOC_WORKER_ENABLED: "false",
        PURESOC_SCHEDULER_RUN_ON_STARTUP: "true",
        PURESOC_SCHEDULER_INTERVAL_MS: "60000",
        PURESOC_CONNECTOR_RUNNER_ENABLED: "false",
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
    expect(config.api.security.trustedOrigins).toEqual([
      "http://localhost:3000",
      "http://localhost:3001",
      "https://admin.example.test",
      "https://console.example.test"
    ]);
    expect(config.api.security.originProtection).toEqual({
      enabled: false,
      requireOriginOrReferer: true,
      exemptRouteFamilies: ["webhook", "provider_callback"]
    });
    expect(config.api.rateLimits.enabled).toBe(false);
    expect(config.api.rateLimits.default).toEqual({
      windowMs: 30_000,
      maxRequests: 33
    });
    expect(config.api.rateLimits.routeFamilies.auth).toEqual({
      windowMs: 15_000,
      maxRequests: 7
    });
    expect(config.api.rateLimits.routeFamilies.tenant_read?.maxRequests).toBe(99);
    expect(config.auth.localEnabled).toBe(false);
    expect(config.auth.sessionCookieSecure).toBe(true);
    expect(config.connectors.providerTokenEncryptionKey).toBe("test-provider-token-key-with-enough-entropy");
    expect(config.billing.provider).toBe("stripe");
    expect(config.storage.objectStorage.provider).toBe("s3");
    expect(config.storage.objectStorage.bucket).toBe("evidence-test");
    expect(config.storage.uploadScanner.mode).toBe("mock");
    expect(config.storage.uploadScanner.mockStatus).toBe("failed");
    expect(config.storage.uploadScanner.timeoutMs).toBe(2500);
    expect(config.jobs).toMatchObject({
      queueProvider: "bullmq",
      redisUrl: "redis://redis.example.test:6379/1",
      defaultMaxAttempts: 5,
      retryBackoffMs: 2000,
      pollIntervalMs: 250,
      shutdownGraceMs: 3000,
      worker: {
        enabled: false
      },
      scheduler: {
        enabled: true,
        runOnStartup: true,
        intervalMs: 60_000
      },
      connectorRunner: {
        enabled: false,
        allowProviderWrites: false
      }
    });
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
        PURESOC_JOB_DEFAULT_MAX_ATTEMPTS: "0",
        PURESOC_JOB_RETRY_BACKOFF_MS: "soon",
        PURESOC_JOB_POLL_INTERVAL_MS: "-1",
        PURESOC_JOB_SHUTDOWN_GRACE_MS: "1.5",
        PURESOC_SCHEDULER_INTERVAL_MS: "0",
        REGULATORY_SOURCE_MONITOR_TIMEOUT_MS: "0",
        REGULATORY_SOURCE_MONITOR_STALE_AFTER_DAYS: "soon"
      }
    });

    expect(config.api.requestLimits.jsonBodyMaxBytes).toBe(15_728_640);
    expect(config.api.requestLimits.stripeWebhookRawBodyMaxBytes).toBe(1_048_576);
    expect(config.api.requestLimits.evidenceUploadMaxBytes).toBe(10_485_760);
    expect(config.storage.uploadScanner.timeoutMs).toBe(10_000);
    expect(config.jobs.defaultMaxAttempts).toBe(3);
    expect(config.jobs.retryBackoffMs).toBe(1000);
    expect(config.jobs.pollIntervalMs).toBe(1000);
    expect(config.jobs.shutdownGraceMs).toBe(5000);
    expect(config.jobs.scheduler.intervalMs).toBe(3_600_000);
    expect(config.compliance.sourceMonitor.requestTimeoutMs).toBe(5000);
    expect(config.compliance.sourceMonitor.staleAfterDays).toBe(90);
  });

  it("falls back to memory persistence mode for unknown overrides", () => {
    const config = loadConfig({
      env: {
        PURESOC_PERSISTENCE_MODE: "filesystem",
        PURESOC_JOB_QUEUE_PROVIDER: "filesystem"
      }
    });

    expect(config.app.persistenceMode).toBe("memory");
    expect(config.jobs.queueProvider).toBe("memory");
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

  it("rejects job runtime settings that would imply provider writes or missing Redis wiring", () => {
    const config = loadConfig({
      env: {
        PURESOC_JOB_QUEUE_PROVIDER: "bullmq",
        PURESOC_REDIS_URL: "",
        PURESOC_CONNECTOR_RUNNER_ALLOW_PROVIDER_WRITES: "true"
      }
    });

    expect(collectStartupConfigIssues(config).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["job_redis_url_required", "provider_job_writes_disabled"])
    );
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
