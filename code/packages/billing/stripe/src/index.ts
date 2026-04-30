import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BillingError,
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
