import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import {
  BillingError,
  requireBillingPlan,
  stripePriceIdsForPlan,
  type BillingRuntimeConfig,
  type BillingCheckoutSession,
  type BillingCheckoutSessionInput,
  type BillingPortalSession,
  type BillingPortalSessionInput,
  type BillingProvider,
  type BillingProviderCustomer,
  type BillingProviderCustomerInput,
  type BillingWebhookEvent,
  type BillingWebhookInput,
  stringValue
} from "@puresoc/billing-core";

export interface StripeApiClient {
  post(path: string, params: Record<string, unknown>, secretKey: string): Promise<Record<string, unknown>>;
}

export interface StripeBillingProviderOptions {
  secretKey?: string | null;
  webhookSecret?: string | null;
  apiBaseUrl?: string;
  webhookToleranceSeconds?: number;
  now?: () => Date;
  client?: StripeApiClient;
}

export class FetchStripeApiClient implements StripeApiClient {
  constructor(private readonly apiBaseUrl = "https://api.stripe.com/v1") {}

  async post(path: string, params: Record<string, unknown>, secretKey: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: toStripeForm(params)
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BillingError("stripe_request_failed", safeStripeErrorMessage(payload), response.status);
    }

    return payload;
  }
}

export const createStripeBillingProvider = (options: StripeBillingProviderOptions): BillingProvider => {
  const client = options.client ?? new FetchStripeApiClient(options.apiBaseUrl);
  const now = options.now ?? (() => new Date());
  const webhookToleranceSeconds = options.webhookToleranceSeconds ?? 300;

  const requireSecretKey = (): string => {
    if (!options.secretKey) {
      throw new BillingError("stripe_not_configured", "Stripe billing is not configured.", 503);
    }

    return options.secretKey;
  };

  const requireWebhookSecret = (): string => {
    if (!options.webhookSecret) {
      throw new BillingError("stripe_webhook_not_configured", "Stripe webhook verification is not configured.", 503);
    }

    return options.webhookSecret;
  };

  return {
    providerKey: "stripe",
    entitlementsReplaceRbac: false,

    async createCustomer(input: BillingProviderCustomerInput): Promise<BillingProviderCustomer> {
      const payload = await client.post(
        "/customers",
        {
          email: input.email ?? undefined,
          name: input.name ?? undefined,
          metadata: {
            organization_id: input.organizationId,
            ...(input.metadata ?? {})
          }
        },
        requireSecretKey()
      );

      const externalCustomerId = stringValue(payload.id);
      if (!externalCustomerId) {
        throw new BillingError("stripe_invalid_response", "Stripe customer response did not include an ID.", 502);
      }

      return {
        providerKey: "stripe",
        externalCustomerId,
        billingEmail: stringValue(payload.email) ?? input.email ?? null,
        metadata: {
          livemode: payload.livemode === true
        }
      };
    },

    async createCheckoutSession(input: BillingCheckoutSessionInput): Promise<BillingCheckoutSession> {
      const payload = await client.post(
        "/checkout/sessions",
        {
          mode: "subscription",
          customer: input.externalCustomerId,
          client_reference_id: input.organizationId,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          line_items: [
            {
              price: input.priceId,
              quantity: 1
            }
          ],
          metadata: {
            organization_id: input.organizationId,
            plan_key: input.planKey
          },
          subscription_data: {
            metadata: {
              organization_id: input.organizationId,
              plan_key: input.planKey
            }
          }
        },
        requireSecretKey()
      );

      const id = stringValue(payload.id);
      if (!id) {
        throw new BillingError("stripe_invalid_response", "Stripe checkout response did not include an ID.", 502);
      }

      return {
        providerKey: "stripe",
        id,
        url: stringValue(payload.url),
        expiresAt: timestampToIso(payload.expires_at),
        metadata: {
          mode: payload.mode,
          livemode: payload.livemode === true
        }
      };
    },

    async createPortalSession(input: BillingPortalSessionInput): Promise<BillingPortalSession> {
      const payload = await client.post(
        "/billing_portal/sessions",
        {
          customer: input.externalCustomerId,
          return_url: input.returnUrl
        },
        requireSecretKey()
      );

      const id = stringValue(payload.id);
      if (!id) {
        throw new BillingError("stripe_invalid_response", "Stripe portal response did not include an ID.", 502);
      }

      return {
        providerKey: "stripe",
        id,
        url: stringValue(payload.url)
      };
    },

    async verifyWebhookSignature(input: BillingWebhookInput): Promise<BillingWebhookEvent> {
      const rawBody = Buffer.isBuffer(input.rawBody) ? input.rawBody : Buffer.from(input.rawBody);
      const header = Array.isArray(input.signatureHeader)
        ? input.signatureHeader.join(",")
        : input.signatureHeader ?? "";
      const timestamp = parseStripeSignatureHeader(header).timestamp;
      const signatures = parseStripeSignatureHeader(header).signatures;

      if (!timestamp || signatures.length === 0) {
        throw invalidSignatureError();
      }

      const ageSeconds = Math.abs(now().getTime() / 1000 - timestamp);
      if (ageSeconds > webhookToleranceSeconds) {
        throw invalidSignatureError();
      }

      const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
      const expected = createHmac("sha256", requireWebhookSecret()).update(signedPayload).digest("hex");
      const valid = signatures.some((signature) => safeCompareHex(signature, expected));

      if (!valid) {
        throw invalidSignatureError();
      }

      const event = JSON.parse(rawBody.toString("utf8")) as Partial<BillingWebhookEvent>;
      if (!event.id || !event.type || !event.data || typeof event.data !== "object") {
        throw new BillingError("stripe_invalid_webhook_payload", "Stripe webhook payload is not a supported event.", 400);
      }

      return {
        id: event.id,
        type: event.type,
        created: typeof event.created === "number" ? event.created : null,
        livemode: typeof event.livemode === "boolean" ? event.livemode : null,
        data: {
          object:
            event.data.object && typeof event.data.object === "object" && !Array.isArray(event.data.object)
              ? (event.data.object as Record<string, unknown>)
              : {}
        }
      };
    }
  };
};

export const toStripeForm = (params: Record<string, unknown>): URLSearchParams => {
  const form = new URLSearchParams();
  appendStripeParams(form, "", params);
  return form;
};

const appendStripeParams = (form: URLSearchParams, prefix: string, value: unknown): void => {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      appendStripeParams(form, `${prefix}[${index}]`, entry);
    });
    return;
  }

  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      appendStripeParams(form, prefix ? `${prefix}[${key}]` : key, entry);
    }
    return;
  }

  form.append(prefix, String(value));
};

export const parseStripeSignatureHeader = (header: string): { timestamp: number | null; signatures: string[] } => {
  const parts = header
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [key, ...value] = part.split("=");
      return [key, value.join("=")] as const;
    });

  return {
    timestamp: Number(parts.find(([key]) => key === "t")?.[1] ?? Number.NaN) || null,
    signatures: parts.filter(([key]) => key === "v1").map(([, value]) => value)
  };
};

const safeCompareHex = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const timestampToIso = (value: unknown): string | null => {
  if (typeof value !== "number") {
    return null;
  }

  return new Date(value * 1000).toISOString();
};

const invalidSignatureError = () =>
  new BillingError("stripe_webhook_signature_invalid", "Stripe webhook signature verification failed.", 400);

const safeStripeErrorMessage = (payload: Record<string, unknown>): string => {
  const error = payload.error;
  if (!error || typeof error !== "object" || Array.isArray(error)) {
    return "Stripe request failed.";
  }

  const message = stringValue((error as { message?: unknown }).message);
  return message ? `Stripe request failed: ${message}` : "Stripe request failed.";
};

export const stripeTestModeSmokeSchemaVersion = "puresoc.stripe_test_mode_smoke.v1" as const;
export const stripeTestModeSmokeCommand = "pnpm stripe:smoke:test-mode" as const;

export type StripeTestModeSmokeStatus = "dry_run_passed" | "blocked" | "passed" | "failed";
export type StripeTestModeSmokeOperationStatus = "planned" | "skipped" | "passed" | "failed";

export interface StripeTestModeSmokeEnvironmentRequirement {
  label: string;
  env: string[];
  sensitive: boolean;
  requiredFor: "configuration" | "secret" | "disposable_smoke";
  configured: boolean;
}

export interface StripeTestModeSmokeGuardrail {
  id: string;
  status: "satisfied" | "required" | "unsafe" | "not_applicable";
  summary: string;
  env?: string[];
}

export interface StripeTestModeSmokeReadinessPreflight {
  checkId: "stripe_test_mode_billing";
  status: string;
  mode: "dry_run" | "live_candidate";
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  requiredEnvironment: StripeTestModeSmokeEnvironmentRequirement[];
  configuredEnvironmentVariables: string[];
  blockers: string[];
  guardrails: StripeTestModeSmokeGuardrail[];
}

export interface StripeTestModeSmokeOperation {
  id: string;
  label: string;
  stripeApiPath: string | null;
  performsNetworkInLiveMode: boolean;
  status: StripeTestModeSmokeOperationStatus;
  metadata: Record<string, unknown>;
}

export interface StripeTestModeSmokeReport {
  schemaVersion: typeof stripeTestModeSmokeSchemaVersion;
  command: typeof stripeTestModeSmokeCommand;
  status: StripeTestModeSmokeStatus;
  exitCode: 0 | 1;
  mode: "dry_run" | "live_candidate";
  readinessStatus: string;
  liveNetworkCallsMade: boolean;
  secretValuesReturned: false;
  checkoutUrlsReturned: false;
  portalUrlsReturned: false;
  fullStripeObjectIdsReturned: false;
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  configuredEnvironmentVariables: string[];
  missingEnvironmentVariables: string[];
  blockers: string[];
  guardrails: StripeTestModeSmokeGuardrail[];
  plannedOperations: StripeTestModeSmokeOperation[];
  summary: string;
}

export interface RunStripeTestModeSmokeOptions {
  config: BillingRuntimeConfig;
  readiness: StripeTestModeSmokeReadinessPreflight;
  env?: NodeJS.ProcessEnv;
  client?: StripeApiClient;
  now?: () => Date;
  idFactory?: () => string;
}

export const runStripeTestModeSmoke = async (
  options: RunStripeTestModeSmokeOptions
): Promise<StripeTestModeSmokeReport> => {
  const env = options.env ?? process.env;
  const liveRequested =
    env.PURESOC_EXTERNAL_SMOKE_MODE === "live_candidate" || options.readiness.mode === "live_candidate";
  const plannedOperations = createPlannedStripeSmokeOperations();
  const common = smokeReportCommon(options, plannedOperations);

  if (!liveRequested) {
    return {
      ...common,
      status: "dry_run_passed",
      exitCode: 0,
      mode: "dry_run",
      liveNetworkCallsMade: false,
      summary:
        "Dry run only. Stripe test-mode customer, Checkout, Portal, and webhook-signature operations are planned but were not executed."
    };
  }

  const liveBlockers = collectStripeLiveSmokeBlockers(options);
  if (liveBlockers.length > 0) {
    return {
      ...common,
      status: "blocked",
      exitCode: 1,
      mode: "live_candidate",
      liveNetworkCallsMade: false,
      blockers: sortedUnique([...common.blockers, ...liveBlockers]),
      plannedOperations: plannedOperations.map((operation) => ({
        ...operation,
        status: "skipped"
      })),
      summary: "Live Stripe test-mode smoke refused to run because one or more guardrails are not satisfied."
    };
  }

  return runLiveStripeSmoke(options, common, plannedOperations);
};

const runLiveStripeSmoke = async (
  options: RunStripeTestModeSmokeOptions,
  common: Omit<StripeTestModeSmokeReport, "status" | "exitCode" | "mode" | "liveNetworkCallsMade" | "summary">,
  plannedOperations: StripeTestModeSmokeOperation[]
): Promise<StripeTestModeSmokeReport> => {
  const now = options.now ?? (() => new Date());
  const smokeId = sanitizeSmokeId(options.idFactory?.() ?? randomUUID());
  const organizationId = `org_puresoc_m43_${smokeId}`;
  const priceId = stripePriceIdsForPlan(options.config, options.config.defaultPlanKey)[0] ?? "";
  const secretKey = options.config.stripe.secretKey ?? "";
  const webhookSecret = options.config.stripe.webhookSecret ?? "";
  const provider = createStripeBillingProvider({
    secretKey,
    webhookSecret,
    apiBaseUrl: options.config.stripe.apiBaseUrl,
    client: options.client,
    now
  });
  let operations = plannedOperations;

  try {
    const customer = await provider.createCustomer({
      organizationId,
      email: `puresoc-m43-smoke+${smokeId}@example.invalid`,
      name: "PureSOC M43 disposable Stripe smoke",
      metadata: {
        smoke: "puresoc_m43",
        organization_id: organizationId
      }
    });
    operations = markOperation(operations, "stripe.customer.create", "passed", {
      objectIdPrefix: stripeObjectPrefix(customer.externalCustomerId),
      livemode: customer.metadata.livemode === true ? true : false
    });

    const checkoutSession = await provider.createCheckoutSession({
      organizationId,
      externalCustomerId: customer.externalCustomerId,
      planKey: options.config.defaultPlanKey,
      priceId,
      successUrl: options.config.stripe.checkoutSuccessUrl,
      cancelUrl: options.config.stripe.checkoutCancelUrl
    });
    operations = markOperation(operations, "stripe.checkout_session.create", "passed", {
      objectIdPrefix: stripeObjectPrefix(checkoutSession.id),
      livemode: checkoutSession.metadata.livemode === true ? true : false,
      urlReturnedToOutput: false
    });

    const portalSession = await provider.createPortalSession({
      organizationId,
      externalCustomerId: customer.externalCustomerId,
      returnUrl: options.config.stripe.portalReturnUrl
    });
    operations = markOperation(operations, "stripe.billing_portal_session.create", "passed", {
      objectIdPrefix: stripeObjectPrefix(portalSession.id),
      urlReturnedToOutput: false
    });

    const webhookPayload = JSON.stringify({
      id: `evt_puresoc_m43_${smokeId}`,
      type: "checkout.session.completed",
      created: Math.floor(now().getTime() / 1000),
      livemode: false,
      data: {
        object: {
          id: `cs_test_puresoc_m43_${smokeId}`,
          object: "checkout.session",
          customer: customer.externalCustomerId,
          client_reference_id: organizationId,
          metadata: {
            organization_id: organizationId
          }
        }
      }
    });
    const timestamp = Math.floor(now().getTime() / 1000);
    const event = await provider.verifyWebhookSignature({
      rawBody: webhookPayload,
      signatureHeader: signStripeSmokePayload(webhookPayload, timestamp, webhookSecret)
    });
    operations = markOperation(operations, "stripe.webhook_signature.verify", "passed", {
      eventType: event.type,
      livemode: event.livemode === true ? true : false
    });

    return {
      ...common,
      status: "passed",
      exitCode: 0,
      mode: "live_candidate",
      liveNetworkCallsMade: true,
      plannedOperations: operations,
      summary:
        "Stripe test-mode smoke completed against an explicitly confirmed disposable/test target. Output is sanitized and omits Checkout/Portal URLs and full Stripe object IDs."
    };
  } catch (error) {
    const failedOperationId = operations.find((operation) => operation.status === "planned")?.id;
    if (failedOperationId) {
      operations = markOperation(operations, failedOperationId, "failed", safeSmokeErrorMetadata(error));
    }

    return {
      ...common,
      status: "failed",
      exitCode: 1,
      mode: "live_candidate",
      liveNetworkCallsMade: true,
      blockers: sortedUnique([...common.blockers, "stripe_test_mode_smoke_failed"]),
      plannedOperations: operations.map((operation) =>
        operation.status === "planned"
          ? {
              ...operation,
              status: "skipped"
            }
          : operation
      ),
      summary: "Stripe test-mode smoke attempted live/test operations but did not complete. Failure metadata is secret-free."
    };
  }
};

const smokeReportCommon = (
  options: RunStripeTestModeSmokeOptions,
  plannedOperations: StripeTestModeSmokeOperation[]
): Omit<StripeTestModeSmokeReport, "status" | "exitCode" | "mode" | "liveNetworkCallsMade" | "summary"> => ({
  schemaVersion: stripeTestModeSmokeSchemaVersion,
  command: stripeTestModeSmokeCommand,
  readinessStatus: options.readiness.status,
  secretValuesReturned: false,
  checkoutUrlsReturned: false,
  portalUrlsReturned: false,
  fullStripeObjectIdsReturned: false,
  target: {
    kind: options.readiness.target.kind,
    disposableConfirmation: options.readiness.target.disposableConfirmation
  },
  configuredEnvironmentVariables: [...options.readiness.configuredEnvironmentVariables].sort(),
  missingEnvironmentVariables: missingEnvironmentVariables(options.readiness.requiredEnvironment),
  blockers: sortedUnique(options.readiness.blockers),
  guardrails: options.readiness.guardrails,
  plannedOperations
});

const collectStripeLiveSmokeBlockers = (options: RunStripeTestModeSmokeOptions): string[] => {
  const env = options.env ?? process.env;
  const blockers = new Set<string>();

  if (options.readiness.status !== "ready_for_disposable_smoke") {
    blockers.add(`readiness_status_not_ready:${options.readiness.status}`);
  }

  if (env.PURESOC_EXTERNAL_SMOKE_MODE !== "live_candidate") {
    blockers.add("external_smoke_mode_not_live_candidate");
  }

  if (!isSafeDisposableTarget(options.readiness.target.kind) || !options.readiness.target.disposableConfirmation) {
    blockers.add("external_smoke_disposable_target_not_confirmed");
  }

  if (env.PURESOC_EXTERNAL_SMOKE_STRIPE !== "true") {
    blockers.add("stripe_external_smoke_opt_in_missing");
  }

  if (options.config.provider !== "stripe") {
    blockers.add("billing_provider_not_stripe");
  }

  if (!options.config.stripe.secretKey) {
    blockers.add("stripe_secret_key_missing");
  } else if (options.config.stripe.secretKey.startsWith("sk_live")) {
    blockers.add("stripe_live_mode_secret_key_detected");
  } else if (!options.config.stripe.secretKey.startsWith("sk_test_")) {
    blockers.add("stripe_test_mode_secret_key_required");
  }

  if (!options.config.stripe.webhookSecret) {
    blockers.add("stripe_webhook_secret_missing");
  }

  try {
    requireBillingPlan(options.config, options.config.defaultPlanKey);
  } catch {
    blockers.add("billing_default_plan_not_configured");
  }

  const priceIds = stripePriceIdsForPlan(options.config, options.config.defaultPlanKey);
  if (priceIds.length === 0) {
    blockers.add("stripe_default_plan_price_id_missing");
  }

  for (const [planKey, ids] of Object.entries(options.config.stripe.priceIdsByPlan)) {
    if (ids.some((id) => id.includes("configure"))) {
      blockers.add(`placeholder_price_id:${planKey}`);
    }
  }

  if (options.config.stripe.apiBaseUrl !== "https://api.stripe.com/v1") {
    blockers.add("stripe_api_base_url_not_official");
  }

  return [...blockers].sort();
};

const createPlannedStripeSmokeOperations = (): StripeTestModeSmokeOperation[] => [
  {
    id: "stripe.customer.create",
    label: "Create a synthetic Stripe test-mode customer with PureSOC smoke metadata.",
    stripeApiPath: "/v1/customers",
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      outputIncludesFullCustomerId: false
    }
  },
  {
    id: "stripe.checkout_session.create",
    label: "Create a subscription Checkout Session for the configured default plan price.",
    stripeApiPath: "/v1/checkout/sessions",
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      outputIncludesCheckoutUrl: false
    }
  },
  {
    id: "stripe.billing_portal_session.create",
    label: "Create a Customer Portal Session for the synthetic customer.",
    stripeApiPath: "/v1/billing_portal/sessions",
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      outputIncludesPortalUrl: false
    }
  },
  {
    id: "stripe.webhook_signature.verify",
    label: "Verify a synthetic Stripe webhook payload with the configured webhook secret.",
    stripeApiPath: null,
    performsNetworkInLiveMode: false,
    status: "planned",
    metadata: {
      rawBodyPreserved: true
    }
  }
];

const markOperation = (
  operations: StripeTestModeSmokeOperation[],
  id: string,
  status: StripeTestModeSmokeOperationStatus,
  metadata: Record<string, unknown>
): StripeTestModeSmokeOperation[] =>
  operations.map((operation) =>
    operation.id === id
      ? {
          ...operation,
          status,
          metadata: {
            ...operation.metadata,
            ...metadata
          }
        }
      : operation
  );

const signStripeSmokePayload = (payload: string, timestamp: number, webhookSecret: string): string => {
  const signature = createHmac("sha256", webhookSecret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
};

const missingEnvironmentVariables = (
  requirements: StripeTestModeSmokeEnvironmentRequirement[]
): string[] =>
  [...new Set(requirements.filter((requirement) => !requirement.configured).flatMap((requirement) => requirement.env))]
    .filter(Boolean)
    .sort();

const sortedUnique = (values: string[]): string[] => [...new Set(values.filter(Boolean))].sort();

const isSafeDisposableTarget = (targetKind: string): boolean =>
  targetKind === "local" ||
  targetKind === "development" ||
  targetKind === "test" ||
  targetKind === "ci" ||
  targetKind === "disposable";

const stripeObjectPrefix = (id: string | null | undefined): string | null => {
  if (!id) {
    return null;
  }

  if (id.startsWith("cs_test_")) {
    return "cs_test";
  }

  return id.split("_")[0] ?? null;
};

const safeSmokeErrorMetadata = (error: unknown): Record<string, unknown> => {
  if (error instanceof BillingError) {
    return {
      errorCode: error.code,
      statusCode: error.statusCode
    };
  }

  return {
    errorCode: "unexpected_error"
  };
};

const sanitizeSmokeId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "smoke";
