import { AuthError } from "@puresoc/auth-core";
import { mockProviderScenarioKeys, type MockProviderScenarioKey } from "@puresoc/provider-mock";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

const requireScenarioKey = (body: Record<string, unknown>): MockProviderScenarioKey => {
  const value = body.scenarioKey;
  if (typeof value !== "string" || !mockProviderScenarioKeys.includes(value as MockProviderScenarioKey)) {
    throw new AuthError("invalid_request", "Missing or unsupported mock provider scenarioKey.", 400);
  }

  return value as MockProviderScenarioKey;
};

export const createMockProviderConnectionRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin"]
  });

  return {
    statusCode: 201,
    body: await services.providerConnections.createMockConnection({
      organizationId,
      actorUserId,
      scenarioKey: requireScenarioKey(body),
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const listProviderConnectionsRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "auditor"]
  });

  return {
    statusCode: 200,
    body: await services.providerConnections.listConnections(organizationId)
  };
};

export const runProviderSyncRoute = async (
  organizationId: string,
  providerConnectionId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin"]
  });

  return {
    statusCode: 202,
    body: await services.providerConnections.runSync({
      organizationId,
      actorUserId,
      providerConnectionId,
      scenarioKey: typeof body.scenarioKey === "string" ? (body.scenarioKey as MockProviderScenarioKey) : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};
