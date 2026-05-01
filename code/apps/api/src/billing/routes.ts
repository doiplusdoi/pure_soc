import { AuthError } from "@puresoc/auth-core";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const listBillingEntitlementsRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "billing_admin", "auditor"]
  });

  return {
    statusCode: 200,
    body: await services.billing.listEntitlements(organizationId)
  };
};

export const createBillingCheckoutSessionRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "billing_admin"]
  });

  return {
    statusCode: 201,
    body: await services.billing.createCheckoutSession({
      organizationId,
      actorUserId,
      planKey: optionalString(body.planKey, "planKey") ?? undefined,
      billingEmail: optionalString(body.billingEmail, "billingEmail"),
      successUrl: optionalString(body.successUrl, "successUrl"),
      cancelUrl: optionalString(body.cancelUrl, "cancelUrl"),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const createBillingPortalSessionRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "billing_admin"]
  });

  return {
    statusCode: 201,
    body: await services.billing.createPortalSession({
      organizationId,
      actorUserId,
      returnUrl: optionalString(body.returnUrl, "returnUrl"),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const stripeBillingWebhookRoute = async (
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => ({
  statusCode: 200,
  body: await services.billing.handleStripeWebhook({
    rawBody,
    signatureHeader,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })
});

const optionalString = (value: unknown, fieldName: string): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AuthError("invalid_request", `${fieldName} must be a string when provided.`, 400);
  }

  return value;
};
