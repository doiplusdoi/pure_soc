import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import type { BillingRuntimeConfig } from "@puresoc/billing-core";
import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { resolveRoutePolicy } from "../middleware";
import {
  FixedWindowRateLimiter,
  InMemoryFixedWindowRateLimiter,
  type RateLimitStore
} from "../rate-limit";
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
      entitlementKeys: ["nis2_eu_portal", "evidence_vault"]
    },
    {
      key: "pro",
      displayName: "Pro",
      entitlementKeys: ["nis2_eu_portal", "evidence_vault", "pdf_reports"]
    }
  ]
};

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("api middleware rate limits and origin protection", () => {
  let server: ReturnType<typeof startApiServer> | undefined;
  let baseUrl = "";
  let services: ReturnType<typeof createApiServices>;

  afterEach(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("tracks fixed-window limits deterministically", () => {
    let now = new Date("2026-05-01T10:00:00.000Z");
    const limiter = new InMemoryFixedWindowRateLimiter({
      now: () => now
    });

    expect(limiter.check({ key: "auth:ip:test", windowMs: 1000, maxRequests: 2 })).toMatchObject({
      allowed: true,
      remaining: 1
    });
    expect(limiter.check({ key: "auth:ip:test", windowMs: 1000, maxRequests: 2 })).toMatchObject({
      allowed: true,
      remaining: 0
    });
    expect(limiter.check({ key: "auth:ip:test", windowMs: 1000, maxRequests: 2 })).toMatchObject({
      allowed: false,
      retryAfterSeconds: 1
    });

    now = new Date("2026-05-01T10:00:01.001Z");

    expect(limiter.check({ key: "auth:ip:test", windowMs: 1000, maxRequests: 2 })).toMatchObject({
      allowed: true,
      remaining: 1
    });
  });

  it("keeps the rate-limit store boundary compatible with async shared stores", async () => {
    const store: RateLimitStore = {
      kind: "test-shared-store",
      async consume(input) {
        return {
          allowed: true,
          key: input.key,
          remaining: input.maxRequests - 1,
          resetAt: "2026-05-01T10:01:00.000Z",
          retryAfterSeconds: 60
        };
      }
    };
    const limiter = new FixedWindowRateLimiter(store);

    await expect(limiter.check({ key: "auth:ip:test", windowMs: 60_000, maxRequests: 10 })).resolves.toMatchObject({
      allowed: true,
      key: "auth:ip:test",
      remaining: 9
    });
    expect(limiter.storeKind).toBe("test-shared-store");
  });

  it("classifies high-risk route families for shared middleware policy", () => {
    expect(resolveRoutePolicy("POST", "/billing/stripe/webhook")).toMatchObject({
      routeFamily: "webhook",
      rateLimitFamily: "webhook"
    });
    expect(resolveRoutePolicy("POST", "/auth/oidc/google/callback")).toMatchObject({
      routeFamily: "oidc_callback",
      rateLimitFamily: "oidc"
    });
    expect(
      resolveRoutePolicy("POST", "/organizations/org_1/provider-connections/microsoft365/consent/callback")
    ).toMatchObject({
      routeFamily: "provider_callback",
      rateLimitFamily: "provider",
      organizationId: "org_1"
    });
    expect(resolveRoutePolicy("POST", "/organizations/org_1/evidence/upload")).toMatchObject({
      routeFamily: "evidence",
      rateLimitFamily: "evidence",
      organizationId: "org_1"
    });
  });

  it("rejects untrusted origins before JSON body parsing or route side effects", async () => {
    boot({
      PURESOC_API_MAX_JSON_BODY_BYTES: "16",
      PURESOC_API_TRUSTED_ORIGINS: "https://app.example.test"
    });

    const response = await fetch(`${baseUrl}/organizations/org_origin/evidence/upload`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example.test"
      },
      body: JSON.stringify({
        title: "Oversized body that would fail parsing if middleware consumed it late",
        content: "x".repeat(128)
      })
    });

    expect(response.status).toBe(403);
    const body = await readJson<{ error: { code: string; routeFamily: string } }>(response);
    expect(body.error).toMatchObject({
      code: "origin_not_allowed",
      routeFamily: "evidence"
    });
    expect(services.repository.evidenceArtifacts.size).toBe(0);
  });

  it("rejects missing Origin or Referer when strict browser CSRF posture is configured", async () => {
    boot({
      PURESOC_API_REQUIRE_ORIGIN_OR_REFERER: "true",
      PURESOC_API_MAX_JSON_BODY_BYTES: "16",
      PURESOC_API_TRUSTED_ORIGINS: "https://app.example.test"
    });

    const response = await fetch(`${baseUrl}/organizations/org_origin/evidence/upload`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Oversized body that would fail parsing if middleware consumed it late",
        content: "x".repeat(128)
      })
    });

    expect(response.status).toBe(403);
    const body = await readJson<{ error: { code: string; routeFamily: string } }>(response);
    expect(body.error).toMatchObject({
      code: "origin_required",
      routeFamily: "evidence"
    });
    expect(services.repository.evidenceArtifacts.size).toBe(0);
  });

  it("allows trusted same-origin state-changing requests", async () => {
    boot({
      PURESOC_API_TRUSTED_ORIGINS: "https://app.example.test"
    });

    const response = await postJson(
      "/auth/register",
      {
        email: "trusted-origin@example.test",
        password,
        displayName: "Trusted Origin"
      },
      {
        origin: "https://app.example.test"
      }
    );

    expect(response.status).toBe(201);
  });

  it("allows trusted Referer state-changing requests when strict Origin/Referer posture is configured", async () => {
    boot({
      PURESOC_API_REQUIRE_ORIGIN_OR_REFERER: "true",
      PURESOC_API_TRUSTED_ORIGINS: "https://app.example.test"
    });

    const response = await postJson(
      "/auth/register",
      {
        email: "trusted-referer@example.test",
        password,
        displayName: "Trusted Referer"
      },
      {
        referer: "https://app.example.test/onboarding"
      }
    );

    expect(response.status).toBe(201);
  });

  it("rate-limits configured route families before route handling", async () => {
    boot({
      PURESOC_API_RATE_LIMIT_AUTH_MAX_REQUESTS: "1"
    });

    const firstResponse = await postJson("/auth/register", {
      email: "first-rate-limit@example.test",
      password,
      displayName: "First"
    });
    expect(firstResponse.status).toBe(201);

    const secondResponse = await postJson("/auth/register", {
      email: "second-rate-limit@example.test",
      password,
      displayName: "Second"
    });

    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("retry-after")).toBe("60");
    const body = await readJson<{ error: { code: string; routeFamily: string } }>(secondResponse);
    expect(body.error).toMatchObject({
      code: "rate_limit_exceeded",
      routeFamily: "auth"
    });
    expect(services.auditSink.findByAction("local_account_created")).toHaveLength(1);
  });

  it("ignores spoofed forwarded client IP headers by default", async () => {
    boot({
      PURESOC_API_RATE_LIMIT_AUTH_MAX_REQUESTS: "1"
    });

    const firstResponse = await postJson(
      "/auth/register",
      {
        email: "untrusted-forwarded-one@example.test",
        password,
        displayName: "Forwarded One"
      },
      {
        "x-forwarded-for": "198.51.100.10"
      }
    );
    expect(firstResponse.status).toBe(201);

    const secondResponse = await postJson(
      "/auth/register",
      {
        email: "untrusted-forwarded-two@example.test",
        password,
        displayName: "Forwarded Two"
      },
      {
        "x-forwarded-for": "198.51.100.11"
      }
    );

    expect(secondResponse.status).toBe(429);
    const serialized = await secondResponse.text();
    expect(serialized).toContain("rate_limit_exceeded");
    expect(serialized).not.toContain("198.51.100.10");
    expect(serialized).not.toContain("198.51.100.11");
    expect(serialized).not.toContain("x-forwarded-for");
  });

  it("uses forwarded client IPs only when the socket remote address matches explicit trusted proxies", async () => {
    boot({
      PURESOC_API_RATE_LIMIT_AUTH_MAX_REQUESTS: "1",
      PURESOC_API_TRUST_FORWARDED_HEADERS: "true",
      PURESOC_API_TRUSTED_PROXY_IPS: "127.0.0.1 ::1",
      PURESOC_API_TRUSTED_PROXY_HOPS: "1"
    });

    const firstResponse = await postJson(
      "/auth/register",
      {
        email: "trusted-forwarded-one@example.test",
        password,
        displayName: "Forwarded One"
      },
      {
        "x-forwarded-for": "198.51.100.20, 203.0.113.9"
      }
    );
    expect(firstResponse.status).toBe(201);

    const secondResponse = await postJson(
      "/auth/register",
      {
        email: "trusted-forwarded-two@example.test",
        password,
        displayName: "Forwarded Two"
      },
      {
        "x-forwarded-for": "198.51.100.21, 203.0.113.9"
      }
    );
    expect(secondResponse.status).toBe(201);

    const thirdResponse = await postJson(
      "/auth/register",
      {
        email: "trusted-forwarded-three@example.test",
        password,
        displayName: "Forwarded Three"
      },
      {
        "x-forwarded-for": "198.51.100.20, 203.0.113.9"
      }
    );
    expect(thirdResponse.status).toBe(429);
  });

  it("preserves Stripe webhook raw-body verification while exempting webhook origins", async () => {
    boot(
      {
        PURESOC_API_TRUSTED_ORIGINS: "https://app.example.test"
      },
      stripeBillingConfig
    );
    const owner = await registerAndLogin("webhook-origin@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const payload = JSON.stringify(stripeSubscriptionEvent("evt_origin_exempt", organization.id));

    const response = await fetch(`${baseUrl}/billing/stripe/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": sign(payload),
        origin: "https://evil.example.test"
      },
      body: payload
    });

    expect(response.status).toBe(200);
    await expect(readJson<{ received: boolean; duplicate: boolean }>(response)).resolves.toMatchObject({
      received: true,
      duplicate: false
    });
    expect(services.repository.billingEvents.size).toBe(1);
  });

  it("preserves OIDC callback Origin exemption under strict browser CSRF posture", async () => {
    boot({
      PURESOC_API_REQUIRE_ORIGIN_OR_REFERER: "true",
      PURESOC_API_TRUSTED_ORIGINS: "https://app.example.test"
    });

    const response = await postJson(
      "/auth/oidc/google/callback",
      {},
      {
        origin: "https://evil.example.test"
      }
    );

    expect(response.status).toBe(400);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("invalid_request");
  });

  const boot = (env: NodeJS.ProcessEnv = {}, billingConfig: BillingRuntimeConfig | undefined = undefined) => {
    services = createApiServices({
      now: () => new Date("2026-04-30T12:00:00.000Z"),
      config: loadConfig({ env }),
      ...(billingConfig ? { billingConfig } : {})
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  };

  const postJson = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers
      },
      body: JSON.stringify(body)
    });

  const registerAndLogin = async (email: string) => {
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: "Middleware User"
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

  const createOrganization = async (cookie: string) => {
    const response = await fetch(`${baseUrl}/organizations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie
      },
      body: JSON.stringify({
        name: "Webhook Middleware Org",
        primaryCountryCode: "RO"
      })
    });
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };
});

const stripeSubscriptionEvent = (eventId: string, organizationId: string): Record<string, unknown> => ({
  id: eventId,
  type: "customer.subscription.updated",
  created: 1_777_550_400,
  livemode: false,
  data: {
    object: {
      id: "sub_123",
      object: "subscription",
      customer: "cus_123",
      status: "active",
      items: {
        data: [
          {
            price: {
              id: "price_pro",
              product: "prod_pro"
            }
          }
        ]
      },
      metadata: {
        organization_id: organizationId
      }
    }
  }
});

const sign = (payload: string): string => {
  const timestamp = 1_777_550_400;
  const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
};
