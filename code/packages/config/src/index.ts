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
    providers: string[];
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
      authBrokerEnabled: readBoolean(env.PURESOC_AUTH_BROKER_ENABLED, config.auth.authBrokerEnabled)
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
