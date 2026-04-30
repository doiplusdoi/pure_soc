import { describe, expect, it } from "vitest";

import {
  billingEntitlementKeys,
  createEntitlementRecordsForPlan,
  mapStripeSubscriptionStatus,
  planKeyForStripePriceId,
  subscriptionStatusAllowsEntitlements,
  type BillingRuntimeConfig
} from "../index";

const config: BillingRuntimeConfig = {
  provider: "stripe",
  defaultPlanKey: "base",
  noneProviderPlanKey: "base",
  stripe: {
    apiBaseUrl: "https://api.stripe.com/v1",
    secretKey: null,
    webhookSecret: null,
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
      entitlementKeys: ["nis2_eu_portal", "m365_baseline_scan"]
    },
    {
      key: "pro",
      displayName: "Pro",
      entitlementKeys: ["nis2_eu_portal", "m365_baseline_scan", "pdf_reports", "api_access"]
    }
  ]
};

describe("billing entitlement and subscription status contracts", () => {
  it("calculates entitlements from configured plans without replacing RBAC", () => {
    const entitlements = createEntitlementRecordsForPlan({
      organizationId: "org_1",
      config,
      planKey: "pro",
      source: "stripe:sub_123:active",
      now: new Date("2026-04-30T12:00:00.000Z"),
      idFactory: () => "fixed-id"
    });

    expect(entitlements).toHaveLength(billingEntitlementKeys.length);
    expect(entitlements.filter((entitlement) => entitlement.enabled).map((entitlement) => entitlement.entitlementKey))
      .toEqual(["nis2_eu_portal", "m365_baseline_scan", "pdf_reports", "api_access"]);
    expect(entitlements.every((entitlement) => entitlement.source === "stripe:sub_123:active")).toBe(true);
  });

  it("maps Stripe prices and current subscription statuses explicitly", () => {
    expect(planKeyForStripePriceId(config, "price_pro")).toBe("pro");
    expect(planKeyForStripePriceId(config, "price_unknown")).toBeNull();

    expect(mapStripeSubscriptionStatus("trialing")).toBe("trialing");
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("past_due");
    expect(mapStripeSubscriptionStatus("incomplete_expired")).toBe("incomplete_expired");
    expect(mapStripeSubscriptionStatus("paused")).toBe("paused");
    expect(mapStripeSubscriptionStatus("future_status")).toBe("incomplete");
  });

  it("only treats active, trialing, none, and offline active states as entitlement-bearing", () => {
    expect(subscriptionStatusAllowsEntitlements("active")).toBe(true);
    expect(subscriptionStatusAllowsEntitlements("trialing")).toBe(true);
    expect(subscriptionStatusAllowsEntitlements("none")).toBe(true);
    expect(subscriptionStatusAllowsEntitlements("offline_active")).toBe(true);
    expect(subscriptionStatusAllowsEntitlements("past_due")).toBe(false);
    expect(subscriptionStatusAllowsEntitlements("unpaid")).toBe(false);
    expect(subscriptionStatusAllowsEntitlements("canceled")).toBe(false);
  });
});
