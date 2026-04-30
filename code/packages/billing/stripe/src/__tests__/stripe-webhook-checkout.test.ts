import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { BillingError } from "@puresoc/billing-core";
import { createStripeBillingProvider, toStripeForm, type StripeApiClient } from "../index";

describe("stripe billing provider webhook and checkout behavior", () => {
  it("creates Stripe checkout and portal requests with safe server-side parameters", async () => {
    const calls: Array<{ path: string; params: Record<string, unknown>; secretKey: string }> = [];
    const client: StripeApiClient = {
      async post(path, params, secretKey) {
        calls.push({ path, params, secretKey });
        if (path === "/customers") {
          return {
            id: "cus_123",
            email: "billing@example.test"
          };
        }
        if (path === "/checkout/sessions") {
          return {
            id: "cs_test_123",
            url: "https://checkout.stripe.test/session",
            expires_at: 1_777_555_200,
            mode: "subscription"
          };
        }
        return {
          id: "bps_123",
          url: "https://billing.stripe.test/session"
        };
      }
    };
    const provider = createStripeBillingProvider({
      secretKey: "sk_test_safe",
      webhookSecret: "whsec_safe",
      client
    });

    const customer = await provider.createCustomer({
      organizationId: "org_123",
      email: "billing@example.test"
    });
    const checkoutSession = await provider.createCheckoutSession({
      organizationId: "org_123",
      externalCustomerId: customer.externalCustomerId,
      planKey: "pro",
      priceId: "price_pro",
      successUrl: "https://app.example.test/success",
      cancelUrl: "https://app.example.test/cancel"
    });
    const portalSession = await provider.createPortalSession({
      organizationId: "org_123",
      externalCustomerId: customer.externalCustomerId,
      returnUrl: "https://app.example.test/billing"
    });

    expect(checkoutSession).toMatchObject({
      providerKey: "stripe",
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session"
    });
    expect(portalSession).toMatchObject({
      id: "bps_123"
    });
    expect(calls.map((call) => call.path)).toEqual([
      "/customers",
      "/checkout/sessions",
      "/billing_portal/sessions"
    ]);
    expect(calls[1]?.params).toMatchObject({
      mode: "subscription",
      customer: "cus_123",
      client_reference_id: "org_123",
      metadata: {
        organization_id: "org_123",
        plan_key: "pro"
      }
    });
  });

  it("encodes nested Stripe form fields for Checkout line items", () => {
    const form = toStripeForm({
      mode: "subscription",
      line_items: [
        {
          price: "price_base",
          quantity: 1
        }
      ],
      metadata: {
        organization_id: "org_123"
      }
    });

    expect(form.get("mode")).toBe("subscription");
    expect(form.get("line_items[0][price]")).toBe("price_base");
    expect(form.get("line_items[0][quantity]")).toBe("1");
    expect(form.get("metadata[organization_id]")).toBe("org_123");
  });

  it("rejects invalid webhook signatures and does not expose secrets in the error", async () => {
    const provider = createStripeBillingProvider({
      secretKey: "sk_test_safe",
      webhookSecret: "whsec_do_not_leak",
      now: () => new Date(1_777_555_200_000)
    });

    await expect(
      provider.verifyWebhookSignature({
        rawBody: "{}",
        signatureHeader: "t=1777555200,v1=bad"
      })
    ).rejects.toMatchObject({
      code: "stripe_webhook_signature_invalid",
      statusCode: 400
    });

    try {
      await provider.verifyWebhookSignature({
        rawBody: "{}",
        signatureHeader: "t=1777555200,v1=bad"
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BillingError);
      expect(JSON.stringify(error)).not.toContain("whsec_do_not_leak");
      expect((error as Error).message).not.toContain("whsec_do_not_leak");
    }
  });

  it("verifies valid webhook signatures against the unmodified raw body", async () => {
    const payload = JSON.stringify({
      id: "evt_123",
      type: "customer.subscription.updated",
      created: 1_777_555_200,
      livemode: false,
      data: {
        object: {
          id: "sub_123",
          object: "subscription",
          customer: "cus_123",
          status: "active"
        }
      }
    });
    const signature = sign(payload, 1_777_555_200, "whsec_test");
    const provider = createStripeBillingProvider({
      secretKey: "sk_test_safe",
      webhookSecret: "whsec_test",
      now: () => new Date(1_777_555_200_000)
    });

    await expect(
      provider.verifyWebhookSignature({
        rawBody: Buffer.from(payload),
        signatureHeader: signature
      })
    ).resolves.toMatchObject({
      id: "evt_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active"
        }
      }
    });
  });
});

const sign = (payload: string, timestamp: number, secret: string): string => {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
};
