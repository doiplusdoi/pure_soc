import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import type { BillingRuntimeConfig } from "@puresoc/billing-core";

export interface PureSocConfig {
  app: {
    env: string;
    persistenceMode: "memory" | "prisma";
    publicBaseUrl: string;
    apiBaseUrl: string;
    legalCaveat: string;
  };
  api: {
    requestLimits: {
      jsonBodyMaxBytes: number;
      stripeWebhookRawBodyMaxBytes: number;
      evidenceUploadMaxBytes: number;
    };
    security: {
      trustedOrigins: string[];
      originProtection: {
        enabled: boolean;
        requireOriginOrReferer: boolean;
        exemptRouteFamilies: string[];
      };
    };
    rateLimits: {
      enabled: boolean;
      default: ApiRateLimitRuleConfig;
      routeFamilies: Record<string, ApiRateLimitRuleConfig>;
    };
  };
  auth: {
    localEnabled: boolean;
    authBrokerEnabled: boolean;
    sessionCookieSecure: boolean;
    providers: string[];
    socialLogin: {
      stateTtlMs: number;
      transientStateEncryptionKey: string;
      providers: Record<
        "microsoft_entra" | "google" | "github",
        {
          enabled: boolean;
          mode: "oidc" | "oauth_profile";
          issuer: string;
          authorizationEndpoint: string;
          tokenEndpoint: string;
          jwksUri: string;
          profileEndpoint: string;
          emailEndpoint: string;
          clientId: string;
          clientSecret: string;
          redirectUri: string;
          scopes: string[];
          pkceRequired: boolean;
          nonceRequired: boolean;
        }
      >;
    };
  };
  connectors: {
    readOnlyByDefault: boolean;
    providerTokenKeyProvider: string;
    providerTokenEncryptionKeyId: string;
    providerTokenEncryptionKey: string;
    providerTokenEncryptionPreviousKeys: ProviderTokenEncryptionKeyConfig[];
    microsoft365: {
      enabled: boolean;
      writeScopesAllowed: boolean;
    };
  };
  compliance: {
    defaultJurisdiction: string;
    countryPackMode: string;
    sourceActivationDefault: string;
    sourceMonitor: {
      enabled: boolean;
      requestTimeoutMs: number;
      staleAfterDays: number;
      reviewTaskOrganizationId: string | null;
    };
  };
  reports: {
    legalCaveatRequired: boolean;
    renderer: string;
    defaultExportFormat: "json" | "pdf";
    storeGeneratedReportsAsEvidence: boolean;
  };
  storage: {
    objectStorage: {
      provider: "memory" | "s3";
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    };
    uploadScanner: {
      mode: "noop" | "mock" | "http";
      endpoint: string;
      mockStatus: "pending" | "clean" | "infected" | "failed" | "skipped";
      allowNoopInProduction: boolean;
      timeoutMs: number;
    };
  };
  billing: BillingRuntimeConfig;
  jobs: {
    queueProvider: "memory" | "bullmq";
    redisUrl: string;
    defaultMaxAttempts: number;
    retryBackoffMs: number;
    pollIntervalMs: number;
    shutdownGraceMs: number;
    redis: {
      commandMaxAttempts: number;
      commandRetryBackoffMs: number;
      claimLeaseMs: number;
      staleRunningJobRecoveryMs: number;
      completedJobRetentionMs: number;
      failedJobRetentionMs: number;
    };
    worker: {
      enabled: boolean;
    };
    scheduler: {
      enabled: boolean;
      runOnStartup: boolean;
      intervalMs: number;
    };
    connectorRunner: {
      enabled: boolean;
      allowProviderWrites: boolean;
    };
  };
}

export interface ApiRateLimitRuleConfig {
  windowMs: number;
  maxRequests: number;
}

export interface ProviderTokenEncryptionKeyConfig {
  id: string;
  key: string;
}

export interface LoadConfigOptions {
  defaultsDir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface StartupConfigValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface StartupConfigValidationOptions {
  serviceName?: string;
}

export class StartupConfigValidationError extends Error {
  readonly issues: StartupConfigValidationIssue[];

  constructor(issues: StartupConfigValidationIssue[]) {
    super(`Invalid PureSOC startup configuration: ${issues.map((issue) => issue.code).join(", ")}`);
    this.name = "StartupConfigValidationError";
    this.issues = issues;
  }
}

export const localDevProviderTokenKey = "local-dev-provider-token-key-change-me" as const;
export const localProviderTokenKeyProvider = "local-env-key-ring" as const;
export const localDevOidcTransientStateKey = "local-dev-oidc-transient-state-key-change-me" as const;

const readJson = <T>(defaultsDir: string, name: string): T => {
  const filePath = resolve(defaultsDir, `${name}.json`);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
};

const readBoolean = (value: string | undefined, fallback: boolean) =>
  value === undefined ? fallback : value === "true";

const readPositiveInteger = (value: string | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readOptionalString = (value: string | undefined, fallback: string | null): string | null => {
  if (value === undefined) {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readStringList = (value: string | undefined, fallback: string[]): string[] => {
  if (value === undefined) {
    return fallback;
  }

  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const readProviderTokenPreviousKeys = (
  value: string | undefined,
  fallback: ProviderTokenEncryptionKeyConfig[]
): ProviderTokenEncryptionKeyConfig[] => {
  if (value === undefined) {
    return fallback;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex < 0) {
        return {
          id: entry,
          key: ""
        };
      }

      return {
        id: entry.slice(0, separatorIndex).trim(),
        key: entry.slice(separatorIndex + 1).trim()
      };
    });
};

const readPersistenceMode = (
  value: string | undefined,
  fallback: PureSocConfig["app"]["persistenceMode"]
): PureSocConfig["app"]["persistenceMode"] => (value === "prisma" ? "prisma" : fallback);

const readJobQueueProvider = (
  value: string | undefined,
  fallback: PureSocConfig["jobs"]["queueProvider"]
): PureSocConfig["jobs"]["queueProvider"] => (value === "bullmq" ? "bullmq" : fallback);

export const loadConfig = (options: LoadConfigOptions = {}): PureSocConfig => {
  const env = options.env ?? process.env;
  const defaultsDir = options.defaultsDir ?? env.PURESOC_CONFIG_DIR ?? resolve(process.cwd(), "config/defaults");

  const config: PureSocConfig = {
    app: readJson<PureSocConfig["app"]>(defaultsDir, "app"),
    api: readJson<PureSocConfig["api"]>(defaultsDir, "api"),
    auth: readJson<PureSocConfig["auth"]>(defaultsDir, "auth"),
    connectors: readJson<PureSocConfig["connectors"]>(defaultsDir, "connectors"),
    compliance: readJson<PureSocConfig["compliance"]>(defaultsDir, "compliance"),
    reports: readJson<PureSocConfig["reports"]>(defaultsDir, "reports"),
    storage: readJson<PureSocConfig["storage"]>(defaultsDir, "storage"),
    billing: readJson<PureSocConfig["billing"]>(defaultsDir, "billing"),
    jobs: readJson<PureSocConfig["jobs"]>(defaultsDir, "jobs")
  };

  return {
    ...config,
    app: {
      ...config.app,
      env: env.PURESOC_APP_ENV ?? config.app.env,
      persistenceMode: readPersistenceMode(env.PURESOC_PERSISTENCE_MODE, config.app.persistenceMode),
      publicBaseUrl: env.PURESOC_PUBLIC_BASE_URL ?? config.app.publicBaseUrl,
      apiBaseUrl: env.PURESOC_API_BASE_URL ?? config.app.apiBaseUrl,
      legalCaveat: PURESOC_LEGAL_CAVEAT
    },
    api: {
      ...config.api,
      requestLimits: {
        ...config.api.requestLimits,
        jsonBodyMaxBytes: readPositiveInteger(
          env.PURESOC_API_MAX_JSON_BODY_BYTES,
          config.api.requestLimits.jsonBodyMaxBytes
        ),
        stripeWebhookRawBodyMaxBytes: readPositiveInteger(
          env.PURESOC_STRIPE_WEBHOOK_MAX_RAW_BODY_BYTES,
          config.api.requestLimits.stripeWebhookRawBodyMaxBytes
        ),
        evidenceUploadMaxBytes: readPositiveInteger(
          env.PURESOC_EVIDENCE_MAX_UPLOAD_BYTES,
          config.api.requestLimits.evidenceUploadMaxBytes
        )
      },
      security: {
        ...config.api.security,
        trustedOrigins: normalizeOrigins([
          ...readStringList(env.PURESOC_API_TRUSTED_ORIGINS, config.api.security.trustedOrigins),
          env.PURESOC_PUBLIC_BASE_URL ?? config.app.publicBaseUrl,
          env.PURESOC_API_BASE_URL ?? config.app.apiBaseUrl
        ]),
        originProtection: {
          ...config.api.security.originProtection,
          enabled: readBoolean(
            env.PURESOC_API_ORIGIN_PROTECTION_ENABLED,
            config.api.security.originProtection.enabled
          ),
          requireOriginOrReferer: readBoolean(
            env.PURESOC_API_REQUIRE_ORIGIN_OR_REFERER,
            config.api.security.originProtection.requireOriginOrReferer
          ),
          exemptRouteFamilies: readStringList(
            env.PURESOC_API_ORIGIN_EXEMPT_ROUTE_FAMILIES,
            config.api.security.originProtection.exemptRouteFamilies
          )
        }
      },
      rateLimits: {
        ...config.api.rateLimits,
        enabled: readBoolean(env.PURESOC_API_RATE_LIMIT_ENABLED, config.api.rateLimits.enabled),
        default: {
          windowMs: readPositiveInteger(
            env.PURESOC_API_RATE_LIMIT_WINDOW_MS,
            config.api.rateLimits.default.windowMs
          ),
          maxRequests: readPositiveInteger(
            env.PURESOC_API_RATE_LIMIT_MAX_REQUESTS,
            config.api.rateLimits.default.maxRequests
          )
        },
        routeFamilies: withRateLimitEnvOverrides(config.api.rateLimits.routeFamilies, env)
      }
    },
    auth: {
      ...config.auth,
      localEnabled: readBoolean(env.PURESOC_AUTH_LOCAL_ENABLED, config.auth.localEnabled),
      authBrokerEnabled: readBoolean(env.PURESOC_AUTH_BROKER_ENABLED, config.auth.authBrokerEnabled),
      sessionCookieSecure: readBoolean(
        env.PURESOC_AUTH_COOKIE_SECURE ?? env.AUTH_COOKIE_SECURE,
        config.auth.sessionCookieSecure
      ),
      socialLogin: {
        ...config.auth.socialLogin,
        transientStateEncryptionKey:
          env.PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY ?? config.auth.socialLogin.transientStateEncryptionKey,
        providers: {
          microsoft_entra: withSocialLoginEnvOverrides(
            "PURESOC_AUTH_MICROSOFT_ENTRA",
            config.auth.socialLogin.providers.microsoft_entra,
            env
          ),
          google: withSocialLoginEnvOverrides("PURESOC_AUTH_GOOGLE", config.auth.socialLogin.providers.google, env),
          github: withSocialLoginEnvOverrides("PURESOC_AUTH_GITHUB", config.auth.socialLogin.providers.github, env)
        }
      }
    },
    connectors: {
      ...config.connectors,
      providerTokenKeyProvider:
        env.PURESOC_PROVIDER_TOKEN_KEY_PROVIDER ??
        config.connectors.providerTokenKeyProvider,
      providerTokenEncryptionKeyId:
        env.PURESOC_PROVIDER_TOKEN_KEY_ID ??
        config.connectors.providerTokenEncryptionKeyId,
      providerTokenEncryptionKey:
        env.PURESOC_PROVIDER_TOKEN_KEY ??
        env.PROVIDER_TOKEN_KEY ??
        config.connectors.providerTokenEncryptionKey,
      providerTokenEncryptionPreviousKeys: readProviderTokenPreviousKeys(
        env.PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS,
        config.connectors.providerTokenEncryptionPreviousKeys
      )
    },
    compliance: {
      ...config.compliance,
      sourceMonitor: {
        ...config.compliance.sourceMonitor,
        enabled: readBoolean(
          env.PURESOC_REGULATORY_SOURCE_MONITOR_ENABLED ?? env.REGULATORY_SOURCE_MONITOR_ENABLED,
          config.compliance.sourceMonitor.enabled
        ),
        requestTimeoutMs: readPositiveInteger(
          env.PURESOC_REGULATORY_SOURCE_MONITOR_TIMEOUT_MS ?? env.REGULATORY_SOURCE_MONITOR_TIMEOUT_MS,
          config.compliance.sourceMonitor.requestTimeoutMs
        ),
        staleAfterDays: readPositiveInteger(
          env.PURESOC_REGULATORY_SOURCE_MONITOR_STALE_AFTER_DAYS ?? env.REGULATORY_SOURCE_MONITOR_STALE_AFTER_DAYS,
          config.compliance.sourceMonitor.staleAfterDays
        ),
        reviewTaskOrganizationId: readOptionalString(
          env.PURESOC_REGULATORY_SOURCE_MONITOR_REVIEW_ORGANIZATION_ID ??
            env.REGULATORY_SOURCE_MONITOR_REVIEW_ORGANIZATION_ID,
          config.compliance.sourceMonitor.reviewTaskOrganizationId
        )
      }
    },
    reports: {
      ...config.reports,
      defaultExportFormat:
        env.PURESOC_REPORT_DEFAULT_EXPORT_FORMAT === "pdf" ? "pdf" : config.reports.defaultExportFormat,
      storeGeneratedReportsAsEvidence: readBoolean(
        env.PURESOC_REPORT_STORE_GENERATED_AS_EVIDENCE,
        config.reports.storeGeneratedReportsAsEvidence
      )
    },
    storage: {
      ...config.storage,
      objectStorage: {
        ...config.storage.objectStorage,
        provider:
          env.PURESOC_OBJECT_STORAGE_PROVIDER === "s3" ? "s3" : config.storage.objectStorage.provider,
        endpoint: env.PURESOC_OBJECT_STORAGE_ENDPOINT ?? config.storage.objectStorage.endpoint,
        region: env.PURESOC_OBJECT_STORAGE_REGION ?? config.storage.objectStorage.region,
        bucket: env.PURESOC_OBJECT_STORAGE_BUCKET ?? config.storage.objectStorage.bucket,
        accessKeyId:
          env.PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID ??
          env.MINIO_ACCESS_KEY ??
          config.storage.objectStorage.accessKeyId,
        secretAccessKey:
          env.PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY ??
          env.MINIO_SECRET_KEY ??
          config.storage.objectStorage.secretAccessKey,
        forcePathStyle: readBoolean(
          env.PURESOC_OBJECT_STORAGE_FORCE_PATH_STYLE,
          config.storage.objectStorage.forcePathStyle
        )
      },
      uploadScanner: {
        ...config.storage.uploadScanner,
        mode:
          env.PURESOC_UPLOAD_SCANNER_MODE === "mock" || env.PURESOC_UPLOAD_SCANNER_MODE === "http"
            ? env.PURESOC_UPLOAD_SCANNER_MODE
            : config.storage.uploadScanner.mode,
        endpoint: env.PURESOC_UPLOAD_SCANNER_ENDPOINT ?? config.storage.uploadScanner.endpoint,
        mockStatus:
          env.PURESOC_UPLOAD_SCANNER_MOCK_STATUS === "infected" ||
          env.PURESOC_UPLOAD_SCANNER_MOCK_STATUS === "failed" ||
          env.PURESOC_UPLOAD_SCANNER_MOCK_STATUS === "skipped" ||
          env.PURESOC_UPLOAD_SCANNER_MOCK_STATUS === "pending"
            ? env.PURESOC_UPLOAD_SCANNER_MOCK_STATUS
            : config.storage.uploadScanner.mockStatus,
        allowNoopInProduction: readBoolean(
          env.PURESOC_UPLOAD_SCANNER_ALLOW_NOOP_IN_PRODUCTION,
          config.storage.uploadScanner.allowNoopInProduction
        ),
        timeoutMs: readPositiveInteger(
          env.PURESOC_UPLOAD_SCANNER_TIMEOUT_MS,
          config.storage.uploadScanner.timeoutMs
        )
      }
    },
    billing: {
      ...config.billing,
      provider: (env.PURESOC_BILLING_PROVIDER as PureSocConfig["billing"]["provider"] | undefined) ?? config.billing.provider,
      stripe: {
        ...config.billing.stripe,
        secretKey: env.STRIPE_SECRET_KEY ?? config.billing.stripe.secretKey,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? config.billing.stripe.webhookSecret,
        priceIdsByPlan: {
          ...config.billing.stripe.priceIdsByPlan,
          base: env.STRIPE_PRICE_ID_BASE
            ? [env.STRIPE_PRICE_ID_BASE]
            : config.billing.stripe.priceIdsByPlan.base,
          pro: env.STRIPE_PRICE_ID_PRO
            ? [env.STRIPE_PRICE_ID_PRO]
            : config.billing.stripe.priceIdsByPlan.pro,
          msp: env.STRIPE_PRICE_ID_MSP
            ? [env.STRIPE_PRICE_ID_MSP]
            : config.billing.stripe.priceIdsByPlan.msp
        }
      }
    },
    jobs: {
      ...config.jobs,
      queueProvider: readJobQueueProvider(env.PURESOC_JOB_QUEUE_PROVIDER, config.jobs.queueProvider),
      redisUrl: env.PURESOC_REDIS_URL ?? env.REDIS_URL ?? config.jobs.redisUrl,
      defaultMaxAttempts: readPositiveInteger(
        env.PURESOC_JOB_DEFAULT_MAX_ATTEMPTS,
        config.jobs.defaultMaxAttempts
      ),
      retryBackoffMs: readPositiveInteger(env.PURESOC_JOB_RETRY_BACKOFF_MS, config.jobs.retryBackoffMs),
      pollIntervalMs: readPositiveInteger(env.PURESOC_JOB_POLL_INTERVAL_MS, config.jobs.pollIntervalMs),
      shutdownGraceMs: readPositiveInteger(env.PURESOC_JOB_SHUTDOWN_GRACE_MS, config.jobs.shutdownGraceMs),
      redis: {
        ...config.jobs.redis,
        commandMaxAttempts: readPositiveInteger(
          env.PURESOC_JOB_REDIS_COMMAND_MAX_ATTEMPTS,
          config.jobs.redis.commandMaxAttempts
        ),
        commandRetryBackoffMs: readPositiveInteger(
          env.PURESOC_JOB_REDIS_COMMAND_RETRY_BACKOFF_MS,
          config.jobs.redis.commandRetryBackoffMs
        ),
        claimLeaseMs: readPositiveInteger(env.PURESOC_JOB_REDIS_CLAIM_LEASE_MS, config.jobs.redis.claimLeaseMs),
        staleRunningJobRecoveryMs: readPositiveInteger(
          env.PURESOC_JOB_REDIS_STALE_RUNNING_RECOVERY_MS,
          config.jobs.redis.staleRunningJobRecoveryMs
        ),
        completedJobRetentionMs: readPositiveInteger(
          env.PURESOC_JOB_REDIS_COMPLETED_RETENTION_MS,
          config.jobs.redis.completedJobRetentionMs
        ),
        failedJobRetentionMs: readPositiveInteger(
          env.PURESOC_JOB_REDIS_FAILED_RETENTION_MS,
          config.jobs.redis.failedJobRetentionMs
        )
      },
      worker: {
        ...config.jobs.worker,
        enabled: readBoolean(env.PURESOC_WORKER_ENABLED, config.jobs.worker.enabled)
      },
      scheduler: {
        ...config.jobs.scheduler,
        enabled: readBoolean(env.PURESOC_SCHEDULER_ENABLED, config.jobs.scheduler.enabled),
        runOnStartup: readBoolean(env.PURESOC_SCHEDULER_RUN_ON_STARTUP, config.jobs.scheduler.runOnStartup),
        intervalMs: readPositiveInteger(env.PURESOC_SCHEDULER_INTERVAL_MS, config.jobs.scheduler.intervalMs)
      },
      connectorRunner: {
        ...config.jobs.connectorRunner,
        enabled: readBoolean(env.PURESOC_CONNECTOR_RUNNER_ENABLED, config.jobs.connectorRunner.enabled),
        allowProviderWrites: readBoolean(
          env.PURESOC_CONNECTOR_RUNNER_ALLOW_PROVIDER_WRITES,
          config.jobs.connectorRunner.allowProviderWrites
        )
      }
    }
  };
};

export const collectStartupConfigIssues = (
  config: PureSocConfig,
  _options: StartupConfigValidationOptions = {}
): StartupConfigValidationIssue[] => {
  const issues: StartupConfigValidationIssue[] = [];
  const isProduction = config.app.env === "production";

  if (isProduction && !config.auth.sessionCookieSecure) {
    issues.push({
      code: "production_secure_cookie_required",
      path: "auth.sessionCookieSecure",
      message: "Production startup requires PURESOC_AUTH_COOKIE_SECURE=true."
    });
  }

  if (config.billing.provider === "stripe") {
    if (!nonEmpty(config.billing.stripe.secretKey)) {
      issues.push({
        code: "stripe_secret_key_required",
        path: "billing.stripe.secretKey",
        message: "Stripe billing requires STRIPE_SECRET_KEY at startup."
      });
    }

    if (!nonEmpty(config.billing.stripe.webhookSecret)) {
      issues.push({
        code: "stripe_webhook_secret_required",
        path: "billing.stripe.webhookSecret",
        message: "Stripe billing requires STRIPE_WEBHOOK_SECRET at startup."
      });
    }
  }

  if (config.storage.objectStorage.provider === "s3") {
    for (const [path, code, message] of [
      [
        "storage.objectStorage.endpoint",
        "s3_endpoint_required",
        "S3 object storage requires PURESOC_OBJECT_STORAGE_ENDPOINT."
      ],
      ["storage.objectStorage.region", "s3_region_required", "S3 object storage requires PURESOC_OBJECT_STORAGE_REGION."],
      ["storage.objectStorage.bucket", "s3_bucket_required", "S3 object storage requires PURESOC_OBJECT_STORAGE_BUCKET."],
      [
        "storage.objectStorage.accessKeyId",
        "s3_access_key_required",
        "S3 object storage requires PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID."
      ],
      [
        "storage.objectStorage.secretAccessKey",
        "s3_secret_key_required",
        "S3 object storage requires PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY."
      ]
    ] as const) {
      const value = valueAtPath(config, path);
      if (!nonEmpty(value)) {
        issues.push({ code, path, message });
      }
    }
  }

  if (config.storage.uploadScanner.mode === "http" && !nonEmpty(config.storage.uploadScanner.endpoint)) {
    issues.push({
      code: "upload_scanner_endpoint_required",
      path: "storage.uploadScanner.endpoint",
      message: "HTTP upload scanning requires PURESOC_UPLOAD_SCANNER_ENDPOINT."
    });
  }

  if (isProduction && config.storage.uploadScanner.mode === "noop" && !config.storage.uploadScanner.allowNoopInProduction) {
    issues.push({
      code: "production_upload_scanner_required",
      path: "storage.uploadScanner.mode",
      message: "Production startup requires a non-noop upload scanner or an explicit override."
    });
  }

  if (config.connectors.providerTokenKeyProvider !== localProviderTokenKeyProvider) {
    issues.push({
      code: "provider_token_key_provider_unsupported",
      path: "connectors.providerTokenKeyProvider",
      message:
        "Provider token key custody currently supports only local-env-key-ring; external KMS/secret-manager adapters remain deferred."
    });
  }

  if (!nonEmpty(config.connectors.providerTokenEncryptionKeyId)) {
    issues.push({
      code: "provider_token_key_id_required",
      path: "connectors.providerTokenEncryptionKeyId",
      message: "Provider token encryption requires PURESOC_PROVIDER_TOKEN_KEY_ID."
    });
  }

  const providerTokenKeyIds = [
    config.connectors.providerTokenEncryptionKeyId,
    ...config.connectors.providerTokenEncryptionPreviousKeys.map((key) => key.id)
  ];
  const duplicateProviderTokenKeyId = providerTokenKeyIds.find(
    (keyId, index) => nonEmpty(keyId) && providerTokenKeyIds.indexOf(keyId) !== index
  );
  if (duplicateProviderTokenKeyId) {
    issues.push({
      code: "provider_token_key_id_duplicate",
      path: "connectors.providerTokenEncryptionPreviousKeys",
      message: `Provider token encryption key ID must be unique: ${duplicateProviderTokenKeyId}.`
    });
  }

  const invalidPreviousKey = config.connectors.providerTokenEncryptionPreviousKeys.find(
    (key) => !nonEmpty(key.id) || !nonEmpty(key.key)
  );
  if (invalidPreviousKey) {
    issues.push({
      code: "provider_token_previous_key_invalid",
      path: "connectors.providerTokenEncryptionPreviousKeys",
      message: "Previous provider token keys must use id=key pairs."
    });
  }

  const duplicatePreviousKeyValue = config.connectors.providerTokenEncryptionPreviousKeys.find(
    (key, index, keys) => nonEmpty(key.key) && keys.findIndex((entry) => entry.key === key.key) !== index
  );
  if (duplicatePreviousKeyValue) {
    issues.push({
      code: "provider_token_previous_key_duplicate",
      path: "connectors.providerTokenEncryptionPreviousKeys",
      message: "Previous provider token keys must not reuse the same key material."
    });
  }

  if (
    nonEmpty(config.connectors.providerTokenEncryptionKey) &&
    config.connectors.providerTokenEncryptionPreviousKeys.some(
      (key) => key.key === config.connectors.providerTokenEncryptionKey
    )
  ) {
    issues.push({
      code: "provider_token_previous_key_reuses_active",
      path: "connectors.providerTokenEncryptionPreviousKeys",
      message: "Previous provider token keys must not reuse the active key material."
    });
  }

  if (
    isProduction &&
    (!nonEmpty(config.connectors.providerTokenEncryptionKey) ||
      config.connectors.providerTokenEncryptionKey === localDevProviderTokenKey)
  ) {
    issues.push({
      code: "provider_token_key_required",
      path: "connectors.providerTokenEncryptionKey",
      message: "Production startup requires a non-default PURESOC_PROVIDER_TOKEN_KEY."
    });
  }

  if (
    isProduction &&
    config.connectors.providerTokenEncryptionPreviousKeys.some((key) => key.key === localDevProviderTokenKey)
  ) {
    issues.push({
      code: "provider_token_previous_key_default",
      path: "connectors.providerTokenEncryptionPreviousKeys",
      message: "Production startup cannot include the local-dev provider token key in previous keys."
    });
  }

  if (
    isProduction &&
    config.app.persistenceMode === "prisma" &&
    (!nonEmpty(config.auth.socialLogin.transientStateEncryptionKey) ||
      config.auth.socialLogin.transientStateEncryptionKey === localDevOidcTransientStateKey)
  ) {
    issues.push({
      code: "oidc_transient_state_key_required",
      path: "auth.socialLogin.transientStateEncryptionKey",
      message: "Production Prisma-mode OIDC callbacks require PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY."
    });
  }

  if (config.jobs.queueProvider === "bullmq" && !nonEmpty(config.jobs.redisUrl)) {
    issues.push({
      code: "job_redis_url_required",
      path: "jobs.redisUrl",
      message: "BullMQ job queues require PURESOC_REDIS_URL."
    });
  }

  if (config.jobs.connectorRunner.allowProviderWrites) {
    issues.push({
      code: "provider_job_writes_disabled",
      path: "jobs.connectorRunner.allowProviderWrites",
      message: "Provider write execution remains disabled until GAP-030 is implemented."
    });
  }

  return issues;
};

export const validateConfigForStartup = (
  config: PureSocConfig,
  options: StartupConfigValidationOptions = {}
): PureSocConfig => {
  const issues = collectStartupConfigIssues(config, options);
  if (issues.length > 0) {
    throw new StartupConfigValidationError(issues);
  }

  return config;
};

const withSocialLoginEnvOverrides = <
  T extends PureSocConfig["auth"]["socialLogin"]["providers"]["microsoft_entra"]
>(
  prefix: string,
  provider: T,
  env: NodeJS.ProcessEnv
): T => {
  const scopes = env[`${prefix}_SCOPES`];

  return {
    ...provider,
    enabled: readBoolean(env[`${prefix}_ENABLED`], provider.enabled),
    issuer: env[`${prefix}_ISSUER`] ?? provider.issuer,
    authorizationEndpoint: env[`${prefix}_AUTHORIZATION_ENDPOINT`] ?? provider.authorizationEndpoint,
    tokenEndpoint: env[`${prefix}_TOKEN_ENDPOINT`] ?? provider.tokenEndpoint,
    jwksUri: env[`${prefix}_JWKS_URI`] ?? provider.jwksUri,
    profileEndpoint: env[`${prefix}_PROFILE_ENDPOINT`] ?? provider.profileEndpoint,
    emailEndpoint: env[`${prefix}_EMAIL_ENDPOINT`] ?? provider.emailEndpoint,
    clientId: env[`${prefix}_CLIENT_ID`] ?? provider.clientId,
    clientSecret: env[`${prefix}_CLIENT_SECRET`] ?? provider.clientSecret,
    redirectUri: env[`${prefix}_REDIRECT_URI`] ?? provider.redirectUri,
    scopes: scopes ? scopes.split(/[,\s]+/).filter(Boolean) : provider.scopes,
    pkceRequired: readBoolean(env[`${prefix}_PKCE_REQUIRED`], provider.pkceRequired),
    nonceRequired: readBoolean(env[`${prefix}_NONCE_REQUIRED`], provider.nonceRequired)
  };
};

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const normalizeOrigins = (values: string[]): string[] => {
  const origins = new Set<string>();

  for (const value of values) {
    const origin = toOrigin(value);
    if (origin) {
      origins.add(origin);
    }
  }

  return [...origins].sort();
};

const toOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const withRateLimitEnvOverrides = (
  routeFamilies: Record<string, ApiRateLimitRuleConfig>,
  env: NodeJS.ProcessEnv
): Record<string, ApiRateLimitRuleConfig> =>
  Object.fromEntries(
    Object.entries(routeFamilies).map(([family, rule]) => {
      const envKeyPrefix = `PURESOC_API_RATE_LIMIT_${family.toUpperCase()}`
        .replace(/[^A-Z0-9_]/g, "_")
        .replace(/_+/g, "_");

      return [
        family,
        {
          windowMs: readPositiveInteger(env[`${envKeyPrefix}_WINDOW_MS`], rule.windowMs),
          maxRequests: readPositiveInteger(env[`${envKeyPrefix}_MAX_REQUESTS`], rule.maxRequests)
        }
      ];
    })
  );

const valueAtPath = (config: PureSocConfig, path: string): unknown =>
  path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, config);
