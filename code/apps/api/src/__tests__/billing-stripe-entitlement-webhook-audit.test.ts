import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BillingRuntimeConfig } from "@puresoc/billing-core";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const stripeBillingConfig: BillingRuntimeConfig = {
  provider: "stripe",
  defaultPlanKey: "base",
  noneProviderPlanKey: "base",
  stripe: {
    apiBaseUrl: "https://api.stripe.com/v1",
    secretKey: "sk_test_safe",
    webhookSecret: "whsec_test",
    checkoutSuccessUrl: "https://app.example.test/billing/success",
    checkoutCancelUrl: "https://app.example.test/billing/cancel",
    portalReturnUrl: "https://app.example.test/billing",
    priceIdsByPlan: {
      base: ["price_base"],
      pro: ["price_pro"]
    }
  },
  plans: [
    {
      key: "base",
      displayName: "Base",
      entitlementKeys: ["nis2_eu_portal", "m365_baseline_scan", "evidence_vault", "manual_checklists"]
    },
    {
      key: "pro",
      displayName: "Pro",
      entitlementKeys: [
        "nis2_eu_portal",
        "nis2_country_packs",
        "nis2_ro_full_pack",
        "m365_baseline_scan",
        "evidence_vault",
        "manual_checklists",
        "pdf_reports",
        "api_access"
      ]
    }
  ]
};

const noneBillingConfig: BillingRuntimeConfig = {
  ...stripeBillingConfig,
  provider: "none",
  stripe: {
    ...stripeBillingConfig.stripe,
    webhookSecret: "whsec_test"
  }
};

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("api billing stripe entitlement webhook audit integration", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const boot = (billingConfig: BillingRuntimeConfig) => {
    services = createApiServices({
      now: () => new Date("2026-04-30T12:00:00.000Z"),
      billingConfig
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  };

  const postJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {})
      },
      body: JSON.stringify(body)
    });

  const registerAndLogin = async (email: string) => {
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: "Billing User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  const createOrganization = async (cookie: string, name = "Billing Org") => {
    const response = await postJson(
      "/organizations",
      {
        name,
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  it("allows BILLING_PROVIDER=none checkout bypass and calculates base entitlements", async () => {
    boot(noneBillingConfig);
    const owner = await registerAndLogin("billing-none@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await postJson(
      `/organizations/${organization.id}/billing/stripe/checkout`,
      {
        planKey: "pro"
      },
      owner.cookie
    );

    expect(response.status).toBe(201);
    const body = await readJson<{
      providerKey: string;
      billingBypassed: boolean;
      entitlements: Array<{ entitlementKey: string; enabled: boolean; source: string }>;
    }>(response);

    expect(body).toMatchObject({
      providerKey: "none",
      billingBypassed: true
    });
    expect(body.entitlements.filter((entitlement) => entitlement.enabled).map((entitlement) => entitlement.entitlementKey))
      .toEqual(["evidence_vault", "m365_baseline_scan", "manual_checklists", "nis2_eu_portal"]);
    expect(body.entitlements.every((entitlement) => entitlement.source === "billing_provider_none")).toBe(true);
    expect(services.auditSink.findByAction("billing_changed")).toHaveLength(1);
  });

  it("rejects cross-organization billing access through RBAC", async () => {
    boot(noneBillingConfig);
    const owner = await registerAndLogin("billing-owner@example.test");
    const other = await registerAndLogin("billing-other@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await postJson(
      `/organizations/${organization.id}/billing/stripe/checkout`,
      {
        planKey: "base"
      },
      other.cookie
    );

    expect(response.status).toBe(403);
  });

  it("rejects Stripe webhook events with invalid signatures", async () => {
    boot(stripeBillingConfig);
    const payload = JSON.stringify(stripeSubscriptionEvent("evt_invalid", "active", "org_invalid"));

    const response = await postRawWebhook(payload, "t=1777550400,v1=bad");

    expect(response.status).toBe(400);
    const body = await readJson<{ error: { code: string; message: string } }>(response);
    expect(body.error.code).toBe("stripe_webhook_signature_invalid");
    expect(JSON.stringify(body)).not.toContain("whsec_test");
    expect(services.memoryRepositories.billingRepository.billingEvents.size).toBe(0);
  });

  it("handles Stripe subscription transitions idempotently and audits billing changes", async () => {
    boot(stripeBillingConfig);
    const owner = await registerAndLogin("billing-webhook-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const activePayload = JSON.stringify(stripeSubscriptionEvent("evt_active", "active", organization.id));

    const activeResponse = await postRawWebhook(activePayload, sign(activePayload));
    expect(activeResponse.status).toBe(200);
    await expect(readJson<{ received: boolean; duplicate: boolean }>(activeResponse)).resolves.toMatchObject({
      received: true,
      duplicate: false
    });

    const duplicateResponse = await postRawWebhook(activePayload, sign(activePayload));
    expect(duplicateResponse.status).toBe(200);
    await expect(readJson<{ duplicate: boolean }>(duplicateResponse)).resolves.toMatchObject({
      duplicate: true
    });

    const subscriptions = await services.memoryRepositories.billingRepository.listBillingSubscriptions(organization.id);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).toMatchObject({
      subscriptionStatus: "active",
      externalPriceId: "price_pro"
    });
    expect(await enabledEntitlementKeys(organization.id)).toEqual([
      "api_access",
      "evidence_vault",
      "m365_baseline_scan",
      "manual_checklists",
      "nis2_country_packs",
      "nis2_eu_portal",
      "nis2_ro_full_pack",
      "pdf_reports"
    ]);

    const failedInvoicePayload = JSON.stringify(invoicePaymentEvent("evt_invoice_failed", "invoice.payment_failed"));
    const failedInvoiceResponse = await postRawWebhook(failedInvoicePayload, sign(failedInvoicePayload));
    expect(failedInvoiceResponse.status).toBe(200);

    const updatedSubscriptions = await services.memoryRepositories.billingRepository.listBillingSubscriptions(
      organization.id
    );
    expect(updatedSubscriptions[0]?.subscriptionStatus).toBe("past_due");
    expect(await enabledEntitlementKeys(organization.id)).toEqual([]);

    expect(services.auditSink.findByAction("billing_changed")).toHaveLength(2);
    expect(services.memoryRepositories.billingRepository.billingEvents.size).toBe(2);
    expect(JSON.stringify(services.auditSink.records)).not.toContain("whsec_test");
    expect(JSON.stringify(services.auditSink.records)).not.toContain("sk_test_safe");
  });

  const postRawWebhook = (payload: string, signature: string) =>
    fetch(`${baseUrl}/billing/stripe/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature
      },
      body: payload
    });

  const enabledEntitlementKeys = async (organizationId: string) =>
    (await services.memoryRepositories.billingRepository.listBillingEntitlements(organizationId))
      .filter((entitlement) => entitlement.enabled)
      .map((entitlement) => entitlement.entitlementKey)
      .sort();
});

const stripeSubscriptionEvent = (
  eventId: string,
  status: string,
  organizationId: string
): Record<string, unknown> => ({
  id: eventId,
  type: "customer.subscription.updated",
  created: 1_777_550_400,
  livemode: false,
  data: {
    object: {
      id: "sub_123",
      object: "subscription",
      customer: "cus_123",
      status,
      current_period_start: 1_777_550_400,
      current_period_end: 1_780_142_400,
      cancel_at_period_end: false,
      metadata: {
        organization_id: organizationId,
        plan_key: "pro"
      },
      items: {
        data: [
          {
            price: {
              id: "price_pro",
              product: "prod_pro"
            }
          }
        ]
      }
    }
  }
});

const invoicePaymentEvent = (eventId: string, type: string): Record<string, unknown> => ({
  id: eventId,
  type,
  created: 1_777_550_401,
  livemode: false,
  data: {
    object: {
      id: "in_123",
      object: "invoice",
      customer: "cus_123",
      subscription: "sub_123"
    }
  }
});

const sign = (payload: string): string => {
  const timestamp = 1_777_550_400;
  const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
};
