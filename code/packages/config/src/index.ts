import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import type { BillingRuntimeConfig } from "@puresoc/billing-core";

export interface PureSocConfig {
  app: {
    env: string;
    publicBaseUrl: string;
    apiBaseUrl: string;
    legalCaveat: string;
  };
  auth: {
    localEnabled: boolean;
    authBrokerEnabled: boolean;
    sessionCookieSecure: boolean;
    providers: string[];
    socialLogin: {
      stateTtlMs: number;
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
    microsoft365: {
      enabled: boolean;
      writeScopesAllowed: boolean;
    };
  };
  compliance: {
    defaultJurisdiction: string;
    countryPackMode: string;
    sourceActivationDefault: string;
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
    };
  };
  billing: BillingRuntimeConfig;
}

export interface LoadConfigOptions {
  defaultsDir?: string;
  env?: NodeJS.ProcessEnv;
}

const readJson = <T>(defaultsDir: string, name: string): T => {
  const filePath = resolve(defaultsDir, `${name}.json`);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
};

const readBoolean = (value: string | undefined, fallback: boolean) =>
  value === undefined ? fallback : value === "true";

export const loadConfig = (options: LoadConfigOptions = {}): PureSocConfig => {
  const env = options.env ?? process.env;
  const defaultsDir = options.defaultsDir ?? env.PURESOC_CONFIG_DIR ?? resolve(process.cwd(), "config/defaults");

  const config: PureSocConfig = {
    app: readJson<PureSocConfig["app"]>(defaultsDir, "app"),
    auth: readJson<PureSocConfig["auth"]>(defaultsDir, "auth"),
    connectors: readJson<PureSocConfig["connectors"]>(defaultsDir, "connectors"),
    compliance: readJson<PureSocConfig["compliance"]>(defaultsDir, "compliance"),
    reports: readJson<PureSocConfig["reports"]>(defaultsDir, "reports"),
    storage: readJson<PureSocConfig["storage"]>(defaultsDir, "storage"),
    billing: readJson<PureSocConfig["billing"]>(defaultsDir, "billing")
  };

  return {
    ...config,
    app: {
      ...config.app,
      env: env.PURESOC_APP_ENV ?? config.app.env,
      publicBaseUrl: env.PURESOC_PUBLIC_BASE_URL ?? config.app.publicBaseUrl,
      apiBaseUrl: env.PURESOC_API_BASE_URL ?? config.app.apiBaseUrl,
      legalCaveat: PURESOC_LEGAL_CAVEAT
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
    }
  };
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
