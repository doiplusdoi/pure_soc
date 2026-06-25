import { AuthError } from "@puresoc/auth-core";
import type { ApiServices } from "../../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../../http";
import { requireOrganizationRole } from "../../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

const requireString = (body: Record<string, unknown>, key: string): string => {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new AuthError("invalid_request", `Missing required Microsoft 365 field: ${key}.`, 400);
  }

  return value;
};

const optionalStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : undefined;

const microsoftAdminConsentGranted = (value: unknown): boolean =>
  value === true || (typeof value === "string" && value.trim().toLowerCase() === "true");

export const beginMicrosoft365ConsentRoute = async (
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
    allowedRoles: ["owner", "org_admin"]
  });

  return {
    statusCode: 201,
    body: await services.microsoft365ProviderConnections.beginConsent({
      organizationId,
      actorUserId,
      redirectUri: requireString(body, "redirectUri"),
      requestedPermissionBundles: optionalStringArray(body.requestedPermissionBundles),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const completeMicrosoft365ConsentRoute = async (
  organizationId: string,
  input: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin"]
  });

  return {
    statusCode: 201,
    body: await services.microsoft365ProviderConnections.completeConsent({
      organizationId,
      actorUserId,
      state: requireString(input, "state"),
      tenantId: requireString(input, "tenant"),
      adminConsent: microsoftAdminConsentGranted(input.admin_consent),
      redirectUri: typeof input.redirectUri === "string" ? input.redirectUri : undefined,
      authorizationCode: typeof input.code === "string" ? input.code : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const runMicrosoft365SyncRoute = async (
  organizationId: string,
  providerConnectionId: string,
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
    allowedRoles: ["owner", "org_admin", "security_operator"]
  });

  return {
    statusCode: 202,
    body: await services.microsoft365ProviderConnections.runSync({
      organizationId,
      actorUserId,
      providerConnectionId,
      requestedModules: optionalStringArray(body.requestedModules),
      maxRetries: typeof body.maxRetries === "number" ? body.maxRetries : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const getMicrosoft365ConnectionHealthRoute = async (
  organizationId: string,
  providerConnectionId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "security_operator", "auditor"]
  });

  return {
    statusCode: 200,
    body: await services.microsoft365ProviderConnections.getHealth(organizationId, providerConnectionId)
  };
};
