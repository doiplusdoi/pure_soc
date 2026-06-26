import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";
import { AuthError } from "@puresoc/auth-core";
import type { ApiServices } from "../auth/services";

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

export const createOrganizationRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");

  return {
    statusCode: 201,
    body: await services.organizations.createOrganization({
      actorUserId: session.user.id,
      name: requireString(body, "name"),
      legalName: optionalString(body, "legalName"),
      primaryCountryCode: optionalCountryCode(body, "primaryCountryCode"),
      headquartersCountryCode: optionalCountryCode(body, "headquartersCountryCode"),
      logoDataUrl: optionalString(body, "logoDataUrl"),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const listOrganizationsRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");

  return {
    statusCode: 200,
    body: await services.organizations.listOrganizationsForUser(session.user.id)
  };
};

export const listOrganizationMembersRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");

  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: session.user.id,
    organizationId,
    allowedRoles: ["owner", "org_admin", "auditor"]
  });

  return {
    statusCode: 200,
    body: await services.organizations.listMembers(organizationId)
  };
};

export const createOrganizationInvitationRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");

  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: session.user.id,
    organizationId,
    allowedRoles: ["owner", "org_admin"]
  });

  return {
    statusCode: 201,
    body: await services.organizations.createInvitation({
      actorUserId: session.user.id,
      organizationId,
      email: requireString(body, "email"),
      roleKey: optionalString(body, "roleKey"),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deliverInvitationToken: (delivery) => services.organizationInvitationDelivery.deliver(delivery)
    })
  };
};

export const acceptOrganizationInvitationRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");

  return {
    statusCode: 200,
    body: await services.organizations.acceptInvitation({
      actorUserId: session.user.id,
      organizationId,
      plaintextToken: requireString(body, "token"),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};
