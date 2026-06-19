import { AuthError } from "@puresoc/auth-core";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import type { ApiServices } from "../auth/services";
import { isPartnerTenantAccessLevel } from "./service";

const requireString = (body: Record<string, unknown>, field: string): string => {
  const value = body[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AuthError("invalid_request", `Missing required string field: ${field}`, 400);
  }

  return value.trim();
};

const optionalString = (body: Record<string, unknown>, field: string): string | null => {
  const value = body[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const optionalCountryCode = (body: Record<string, unknown>, field: string): string | null => {
  const value = optionalString(body, field);
  if (value === null) {
    return null;
  }

  const normalized = value.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new AuthError("invalid_request", `${field} must be a two-letter ISO country code.`, 400);
  }

  return normalized;
};

const optionalAccessLevel = (body: Record<string, unknown>) => {
  const value = optionalString(body, "accessLevel");
  if (value === null) {
    return null;
  }

  if (!isPartnerTenantAccessLevel(value)) {
    throw new AuthError("invalid_request", "Unsupported partner tenant access level.", 400);
  }

  return value;
};

const getSession = async (cookieHeader: string | undefined, services: ApiServices) => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  return services.localAuth.getSession(sessionToken ?? "");
};

export const createPartnerRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext & { requestId?: string | null; traceId?: string | null },
  services: ApiServices
): Promise<JsonResult> => {
  const session = await getSession(cookieHeader, services);
  return {
    statusCode: 201,
    body: await services.partners.createPartner({
      actorUserId: session.user.id,
      name: requireString(body, "name"),
      slug: optionalString(body, "slug"),
      parentPartnerId: optionalString(body, "parentPartnerId"),
      context
    })
  };
};

export const listPartnersRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await getSession(cookieHeader, services);
  return {
    statusCode: 200,
    body: await services.partners.listPartnersForUser(session.user.id)
  };
};

export const listPartnerPortfolioRoute = async (
  partnerId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await getSession(cookieHeader, services);
  return {
    statusCode: 200,
    body: await services.partners.listPartnerPortfolio({
      actorUserId: session.user.id,
      partnerId
    })
  };
};

export const createPartnerCustomerRoute = async (
  partnerId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext & { requestId?: string | null; traceId?: string | null },
  services: ApiServices
): Promise<JsonResult> => {
  const session = await getSession(cookieHeader, services);
  return {
    statusCode: 201,
    body: await services.partners.createCustomerForPartner({
      actorUserId: session.user.id,
      partnerId,
      name: requireString(body, "name"),
      legalName: optionalString(body, "legalName"),
      primaryCountryCode: optionalCountryCode(body, "primaryCountryCode"),
      headquartersCountryCode: optionalCountryCode(body, "headquartersCountryCode"),
      accessLevel: optionalAccessLevel(body),
      context
    })
  };
};

export const startTenantAccessRoute = async (
  partnerId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext & { requestId?: string | null; traceId?: string | null },
  services: ApiServices
): Promise<JsonResult> => {
  const session = await getSession(cookieHeader, services);
  return {
    statusCode: 201,
    body: await services.partners.startTenantAccess({
      actorUserId: session.user.id,
      partnerId,
      organizationId: requireString(body, "organizationId"),
      reason: requireString(body, "reason"),
      context
    })
  };
};

export const getCurrentTenantAccessRoute = async (
  partnerId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await getSession(cookieHeader, services);
  return {
    statusCode: 200,
    body: await services.partners.getCurrentTenantAccess({
      actorUserId: session.user.id,
      partnerId
    })
  };
};

export const exitTenantAccessRoute = async (
  partnerId: string,
  sessionId: string,
  cookieHeader: string | undefined,
  context: RequestContext & { requestId?: string | null; traceId?: string | null },
  services: ApiServices
): Promise<JsonResult> => {
  const session = await getSession(cookieHeader, services);
  return {
    statusCode: 200,
    body: await services.partners.exitTenantAccess({
      actorUserId: session.user.id,
      partnerId,
      sessionId,
      context
    })
  };
};
