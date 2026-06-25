import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";

import type { PureSocConfig } from "@puresoc/config";
import { parseCookies, readRequestContext, sessionCookieName, type JsonResult, type RequestContext } from "./http";
import { createApiRateLimiter, type RateLimiter, type RateLimitRule } from "./rate-limit";

export type ApiRouteFamily =
  | "auth"
  | "oidc_begin"
  | "oidc_callback"
  | "webhook"
  | "evidence"
  | "billing"
  | "actions"
  | "regulatory"
  | "provider"
  | "provider_callback"
  | "partner"
  | "tenant_read"
  | "organization"
  | "compliance"
  | "public_compliance"
  | "public_read"
  | "unknown";

export interface ApiRequestContext extends RequestContext {
  requestId: string;
  correlationId: string;
  method: string;
  pathname: string;
  routeFamily: ApiRouteFamily;
  organizationId: string | null;
  authenticatedUserId: string | null;
  idempotencyKey: string | null;
  sessionId: string | null;
  rateLimitKey: string | null;
}

export interface ApiMiddlewareDecision {
  context: ApiRequestContext;
  rejection: JsonResult | null;
}

interface SessionView {
  user: {
    id: string;
  };
  session: {
    id: string;
    activeOrganizationId: string | null;
  };
}

export interface ApiMiddlewareOptions {
  config: PureSocConfig["api"];
  sessionResolver: {
    getSession(sessionToken: string): Promise<SessionView>;
  };
  rateLimiter?: RateLimiter;
  now?: () => Date;
}

interface RoutePolicy {
  routeFamily: ApiRouteFamily;
  rateLimitFamily: string;
  organizationId: string | null;
}

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const createApiMiddleware = (options: ApiMiddlewareOptions) => {
  const rateLimiter =
    options.rateLimiter ??
    createApiRateLimiter({
      config: options.config.rateLimits,
      now: options.now
    });

  return {
    async apply(request: IncomingMessage, url: URL): Promise<ApiMiddlewareDecision> {
      const policy = resolveRoutePolicy(request.method ?? "GET", url.pathname);
      const baseContext = readRequestContext(request, options.config.security.proxy);
      const session = await resolveOptionalSession(request.headers.cookie, options.sessionResolver);
      const rateLimitKey = buildRateLimitKey(policy, baseContext, session);
      const requestId = requestIdentifier(request.headers["x-request-id"]) ?? randomUUID();
      const correlationId = requestIdentifier(request.headers["x-correlation-id"]) ?? requestId;
      const context: ApiRequestContext = {
        ...baseContext,
        requestId,
        correlationId,
        method: request.method ?? "GET",
        pathname: url.pathname,
        routeFamily: policy.routeFamily,
        organizationId: policy.organizationId,
        authenticatedUserId: session?.user.id ?? null,
        idempotencyKey: requestIdentifier(request.headers["idempotency-key"]),
        sessionId: session?.session.id ?? null,
        rateLimitKey
      };

      const originRejection = validateOrigin({
        config: options.config,
        method: request.method ?? "GET",
        headers: request.headers,
        routeFamily: policy.routeFamily
      });
      if (originRejection) {
        return {
          context,
          rejection: originRejection
        };
      }

      if (options.config.rateLimits.enabled) {
        const rule = rateLimitRuleFor(options.config, policy.rateLimitFamily);
        const decision = await safeRateLimitCheck(rateLimiter, {
          key: rateLimitKey,
          windowMs: rule.windowMs,
          maxRequests: rule.maxRequests
        });

        if (!decision) {
          return {
            context,
            rejection: {
              statusCode: 503,
              body: {
                error: {
                  code: "rate_limit_store_unavailable",
                  message: "Rate limiting is temporarily unavailable for this route family.",
                  routeFamily: policy.routeFamily
                }
              }
            }
          };
        }

        if (!decision.allowed) {
          return {
            context,
            rejection: {
              statusCode: 429,
              headers: {
                "retry-after": String(decision.retryAfterSeconds),
                "x-ratelimit-reset": decision.resetAt
              },
              body: {
                error: {
                  code: "rate_limit_exceeded",
                  message: "Too many requests for this route family.",
                  routeFamily: policy.routeFamily
                }
              }
            }
          };
        }
      }

      return {
        context,
        rejection: null
      };
    },
    rateLimiter
  };
};

const requestIdentifier = (value: string | string[] | undefined): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed && /^[A-Za-z0-9_.:-]{1,128}$/.test(trimmed) ? trimmed : null;
};

export const resolveRoutePolicy = (method: string, pathname: string): RoutePolicy => {
  if (method === "GET" && pathname === "/compliance/nis2/country-packs/status") {
    return policy("public_read", "tenant_read");
  }

  if (pathname === "/billing/stripe/webhook") {
    return policy("webhook", "webhook");
  }

  if (/^\/auth\/oidc\/[^/]+\/callback$/.test(pathname)) {
    return policy("oidc_callback", "oidc");
  }

  if (/^\/auth\/oidc\/[^/]+\/begin$/.test(pathname)) {
    return policy("oidc_begin", "oidc");
  }

  if (pathname.startsWith("/auth/")) {
    return policy("auth", "auth");
  }

  if (pathname === "/api/v1/openapi.json" || /^\/api\/v1\/country-packs(?:\/|$)/.test(pathname)) {
    return policy("public_read", "tenant_read");
  }

  if (pathname === "/api/v1/me" || /^\/api\/v1\/operations(?:\/|$)/.test(pathname)) {
    return policy("tenant_read", "tenant_read");
  }

  if (pathname === "/api/v1/organizations") {
    return policy(method === "GET" ? "tenant_read" : "organization", method === "GET" ? "tenant_read" : "auth");
  }

  if (/^\/api\/v1\/partners(?:\/|$)/.test(pathname)) {
    return policy("partner", method === "GET" ? "tenant_read" : "organization");
  }

  if (/^\/api\/v1\/organization-relationships(?:\/|$)/.test(pathname)) {
    return policy("organization", "organization");
  }

  if (/^\/api\/v1\/support-sessions(?:\/|$)/.test(pathname)) {
    return policy("organization", method === "GET" ? "tenant_read" : "organization");
  }

  const apiV1OrganizationMatch = pathname.match(/^\/api\/v1\/organizations\/([^/]+)/);
  const apiV1OrganizationId = apiV1OrganizationMatch?.[1] ?? null;
  if (/^\/api\/v1\/organizations\/[^/]+\/connectors(?:\/|$)/.test(pathname)) {
    return policy("provider", "provider", apiV1OrganizationId);
  }
  if (/^\/api\/v1\/organizations\/[^/]+\/provider-capabilities$/.test(pathname)) {
    return policy("provider", "tenant_read", apiV1OrganizationId);
  }
  if (/^\/api\/v1\/organizations\/[^/]+\/compliance(?:\/|$)/.test(pathname)) {
    return policy("compliance", method === "GET" ? "tenant_read" : "default", apiV1OrganizationId);
  }
  if (apiV1OrganizationId) {
    return policy(method === "GET" ? "tenant_read" : "organization", method === "GET" ? "tenant_read" : "organization", apiV1OrganizationId);
  }

  if (/^\/partners(?:\/|$)/.test(pathname)) {
    return policy("partner", method === "GET" ? "tenant_read" : "organization");
  }

  const organizationMatch = pathname.match(/^\/organizations(?:\/([^/]+))?/);
  const organizationId = organizationMatch?.[1] ?? null;

  if (pathname === "/organizations") {
    return policy("organization", "auth", organizationId);
  }

  if (/^\/organizations\/[^/]+\/provider-connections\/[^/]+\/consent\/callback$/.test(pathname)) {
    return policy("provider_callback", "provider", organizationId);
  }

  if (/^\/organizations\/[^/]+\/provider-connections(?:\/|$)/.test(pathname)) {
    return policy("provider", "provider", organizationId);
  }

  if (/^\/organizations\/[^/]+\/evidence(?:\/|$)/.test(pathname)) {
    return policy("evidence", method === "GET" ? "tenant_read" : "evidence", organizationId);
  }

  if (/^\/organizations\/[^/]+\/billing(?:\/|$)/.test(pathname)) {
    return policy("billing", method === "GET" ? "tenant_read" : "billing", organizationId);
  }

  if (/^\/organizations\/[^/]+\/actions(?:\/|$)/.test(pathname)) {
    return policy("actions", "actions", organizationId);
  }

  if (/^\/organizations\/[^/]+\/regulatory-sources(?:\/|$)/.test(pathname)) {
    return policy("regulatory", method === "GET" ? "tenant_read" : "regulatory", organizationId);
  }

  if (/^\/organizations\/[^/]+\/members$/.test(pathname)) {
    return policy("tenant_read", "tenant_read", organizationId);
  }

  if (/^\/organizations\/[^/]+\/(compliance|recommendations|reports|dashboards)(?:\/|$)/.test(pathname)) {
    return policy("compliance", method === "GET" ? "tenant_read" : "default", organizationId);
  }

  if (pathname.startsWith("/compliance/nis2/ro/")) {
    return policy("public_compliance", "default");
  }

  return policy("unknown", "default", organizationId);
};

const policy = (
  routeFamily: ApiRouteFamily,
  rateLimitFamily: string,
  organizationId: string | null = null
): RoutePolicy => ({
  routeFamily,
  rateLimitFamily,
  organizationId
});

const resolveOptionalSession = async (
  cookieHeader: string | undefined,
  sessionResolver: ApiMiddlewareOptions["sessionResolver"]
): Promise<SessionView | null> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  if (!sessionToken) {
    return null;
  }

  try {
    return await sessionResolver.getSession(sessionToken);
  } catch {
    return null;
  }
};

const buildRateLimitKey = (
  policy: RoutePolicy,
  context: RequestContext,
  session: SessionView | null
): string => {
  if (session) {
    const organizationId = policy.organizationId ?? session.session.activeOrganizationId ?? "none";
    return `${policy.rateLimitFamily}:user:${session.user.id}:org:${organizationId}`;
  }

  return `${policy.rateLimitFamily}:ip:${context.ipAddress ?? "unknown"}`;
};

const validateOrigin = (input: {
  config: PureSocConfig["api"];
  method: string;
  headers: IncomingHttpHeaders;
  routeFamily: ApiRouteFamily;
}): JsonResult | null => {
  const protection = input.config.security.originProtection;
  if (
    !protection.enabled ||
    !stateChangingMethods.has(input.method.toUpperCase()) ||
    protection.exemptRouteFamilies.includes(input.routeFamily)
  ) {
    return null;
  }

  const sourceOrigin = requestSourceOrigin(input.headers);
  if (!sourceOrigin && !protection.requireOriginOrReferer) {
    return null;
  }

  if (!sourceOrigin) {
    return originError("origin_required", input.routeFamily);
  }

  if (!input.config.security.trustedOrigins.includes(sourceOrigin) && !isRequestHostOrigin(sourceOrigin, input.headers)) {
    return originError("origin_not_allowed", input.routeFamily);
  }

  return null;
};

const requestSourceOrigin = (headers: IncomingHttpHeaders): string | null => {
  const origin = singleHeader(headers.origin);
  if (origin) {
    return toOrigin(origin);
  }

  const referer = singleHeader(headers.referer);
  return referer ? toOrigin(referer) : null;
};

const singleHeader = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const toOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const isRequestHostOrigin = (sourceOrigin: string, headers: IncomingHttpHeaders): boolean => {
  const host = normalizeHost(singleHeader(headers.host));
  if (!host) {
    return false;
  }

  try {
    return normalizeHost(new URL(sourceOrigin).host) === host;
  } catch {
    return false;
  }
};

const normalizeHost = (value: string | null): string | null => {
  const normalized = value?.trim().replace(/^"|"$/g, "").toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
};

const originError = (code: "origin_required" | "origin_not_allowed", routeFamily: ApiRouteFamily): JsonResult => ({
  statusCode: 403,
  body: {
    error: {
      code,
      message:
        code === "origin_required"
          ? "Origin or Referer is required for this state-changing route."
          : "Origin or Referer is not allowed for this state-changing route.",
      routeFamily
    }
  }
});

const rateLimitRuleFor = (config: PureSocConfig["api"], family: string): RateLimitRule =>
  config.rateLimits.routeFamilies[family] ?? config.rateLimits.default;

const safeRateLimitCheck = async (
  rateLimiter: RateLimiter,
  input: RateLimitRule & { key: string }
) => {
  try {
    return await rateLimiter.check(input);
  } catch {
    return null;
  }
};
