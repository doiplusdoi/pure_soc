import { describe, expect, it } from "vitest";

import type { BillingRuntimeConfig } from "@puresoc/billing-core";
import {
  runStripeTestModeSmoke,
  type StripeApiClient,
  type StripeTestModeSmokeReadinessPreflight
} from "../index";

const stripeBillingConfig = (overrides: Partial<BillingRuntimeConfig["stripe"]> = {}): BillingRuntimeConfig => ({
  provider: "stripe",
  defaultPlanKey: "base",
  noneProviderPlanKey: "base",
  stripe: {
    secretKey: "sk_test_do_not_print",
    webhookSecret: "whsec_do_not_print",
    apiBaseUrl: "https://api.stripe.com/v1",
    checkoutSuccessUrl: "https://app.example.test/billing/success",
    checkoutCancelUrl: "https://app.example.test/billing/cancel",
    portalReturnUrl: "https://app.example.test/billing",
    priceIdsByPlan: {
      base: ["price_test_base"],
      pro: ["price_test_pro"],
      msp: ["price_test_msp"]
    },
    ...overrides
  },
  plans: [
    {
      key: "base",
      displayName: "Base",
      entitlementKeys: ["nis2_eu_portal"]
    }
  ]
});

const readiness = (
  input: Partial<StripeTestModeSmokeReadinessPreflight> = {}
): StripeTestModeSmokeReadinessPreflight => ({
  checkId: "stripe_test_mode_billing",
  status: "configured_dry_run_only",
  mode: "dry_run",
  target: {
    kind: "unknown",
    disposableConfirmation: false
  },
  requiredEnvironment: [
    {
      label: "Stripe test secret key",
      env: ["STRIPE_SECRET_KEY"],
      sensitive: true,
      requiredFor: "secret",
      configured: true
    },
    {
      label: "Stripe webhook secret",
      env: ["STRIPE_WEBHOOK_SECRET"],
      sensitive: true,
      requiredFor: "secret",
      configured: true
    },
    {
      label: "Stripe Base price ID",
      env: ["STRIPE_PRICE_ID_BASE"],
      sensitive: false,
      requiredFor: "configuration",
      configured: true
    }
  ],
  configuredEnvironmentVariables: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID_BASE"],
  blockers: [],
  guardrails: [],
  ...input
});

describe("Stripe test-mode smoke harness", () => {
  it("defaults to a secret-free dry run and does not call Stripe", async () => {
    const calls: string[] = [];
    const client: StripeApiClient = {
      async post(path) {
        calls.push(path);
        throw new Error("client must not be called in dry-run mode");
      }
    };
    const report = await runStripeTestModeSmoke({
      config: stripeBillingConfig(),
      readiness: readiness({
        status: "blocked_missing_secret",
        requiredEnvironment: [
          {
            label: "Stripe test secret key",
            env: ["STRIPE_SECRET_KEY"],
            sensitive: true,
            requiredFor: "secret",
            configured: false
          }
        ],
        configuredEnvironmentVariables: [],
        blockers: ["missing_required_environment:STRIPE_SECRET_KEY"]
      }),
      env: {},
      client
    });

    expect(report.status).toBe("dry_run_passed");
    expect(report.exitCode).toBe(0);
    expect(report.liveNetworkCallsMade).toBe(false);
    expect(report.missingEnvironmentVariables).toEqual(["STRIPE_SECRET_KEY"]);
    expect(report.plannedOperations.map((operation) => operation.status)).toEqual([
      "planned",
      "planned",
      "planned",
      "planned"
    ]);
    expect(calls).toEqual([]);
    expect(JSON.stringify(report)).not.toContain("sk_test_do_not_print");
    expect(JSON.stringify(report)).not.toContain("whsec_do_not_print");
  });

  it("refuses live execution when readiness is not ready or a live-mode key is configured", async () => {
    const calls: string[] = [];
    const client: StripeApiClient = {
      async post(path) {
        calls.push(path);
        throw new Error("client must not be called when blocked");
      }
    };
    const report = await runStripeTestModeSmoke({
      config: stripeBillingConfig({
        secretKey: "sk_live_do_not_print"
      }),
      readiness: readiness({
        status: "unsafe_production_target",
        mode: "live_candidate",
        target: {
          kind: "test",
          disposableConfirmation: true
        },
        blockers: ["stripe_live_mode_secret_key_detected"]
      }),
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "test",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_STRIPE: "true"
      },
      client
    });

    expect(report.status).toBe("blocked");
    expect(report.exitCode).toBe(1);
    expect(report.liveNetworkCallsMade).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "readiness_status_not_ready:unsafe_production_target",
        "stripe_live_mode_secret_key_detected"
      ])
    );
    expect(report.plannedOperations.every((operation) => operation.status === "skipped")).toBe(true);
    expect(calls).toEqual([]);
    expect(JSON.stringify(report)).not.toContain("sk_live_do_not_print");
  });

  it("requires a Stripe test-mode secret key before live execution", async () => {
    const report = await runStripeTestModeSmoke({
      config: stripeBillingConfig({
        secretKey: "rk_test_do_not_print"
      }),
      readiness: readiness({
        status: "ready_for_disposable_smoke",
        mode: "live_candidate",
        target: {
          kind: "disposable",
          disposableConfirmation: true
        }
      }),
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_STRIPE: "true"
      },
      client: {
        async post() {
          throw new Error("client must not be called without sk_test credentials");
        }
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers).toContain("stripe_test_mode_secret_key_required");
    expect(JSON.stringify(report)).not.toContain("rk_test_do_not_print");
  });

  it("runs live-candidate operations with an injected fake client and redacts URLs and object IDs", async () => {
    const calls: Array<{ path: string; secretKey: string }> = [];
    const client: StripeApiClient = {
      async post(path, _params, secretKey) {
        calls.push({ path, secretKey });
        if (path === "/customers") {
          return {
            id: "cus_sensitive_full_id",
            email: "puresoc-smoke@example.invalid",
            livemode: false
          };
        }
        if (path === "/checkout/sessions") {
          return {
            id: "cs_test_sensitive_full_id",
            url: "https://checkout.stripe.com/c/pay/cs_test_sensitive_full_id",
            expires_at: 1_777_555_200,
            mode: "subscription",
            livemode: false
          };
        }
        return {
          id: "bps_sensitive_full_id",
          url: "https://billing.stripe.com/p/session/test_sensitive_full_id",
          livemode: false
        };
      }
    };
    const report = await runStripeTestModeSmoke({
      config: stripeBillingConfig(),
      readiness: readiness({
        status: "ready_for_disposable_smoke",
        mode: "live_candidate",
        target: {
          kind: "disposable",
          disposableConfirmation: true
        }
      }),
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_STRIPE: "true"
      },
      client,
      now: () => new Date(1_777_555_200_000),
      idFactory: () => "m43-test-smoke"
    });

    expect(report.status).toBe("passed");
    expect(report.exitCode).toBe(0);
    expect(report.liveNetworkCallsMade).toBe(true);
    expect(calls.map((call) => call.path)).toEqual([
      "/customers",
      "/checkout/sessions",
      "/billing_portal/sessions"
    ]);
    expect(calls.every((call) => call.secretKey === "sk_test_do_not_print")).toBe(true);
    expect(report.plannedOperations.map((operation) => operation.status)).toEqual([
      "passed",
      "passed",
      "passed",
      "passed"
    ]);

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("sk_test_do_not_print");
    expect(serialized).not.toContain("whsec_do_not_print");
    expect(serialized).not.toContain("cus_sensitive_full_id");
    expect(serialized).not.toContain("cs_test_sensitive_full_id");
    expect(serialized).not.toContain("bps_sensitive_full_id");
    expect(serialized).not.toContain("https://checkout.stripe.com");
    expect(serialized).not.toContain("https://billing.stripe.com");
  });
});
