import { AuthError, type PureSocRoleKey } from "@puresoc/auth-core";

import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const channelManagerRoles: readonly PureSocRoleKey[] = ["owner", "org_admin"];
const notificationReadRoles: readonly PureSocRoleKey[] = [
  "owner",
  "org_admin",
  "compliance_manager",
  "security_operator",
  "auditor"
];

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const listNotificationChannelsRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: notificationReadRoles
  });

  return {
    statusCode: 200,
    body: await services.notifications.listChannels(organizationId)
  };
};

export const createNotificationChannelRoute = async (
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
    allowedRoles: channelManagerRoles
  });

  return {
    statusCode: 201,
    body: await services.notifications.createChannel({
      organizationId,
      actorUserId,
      type: body.type,
      destination: body.destination,
      context
    })
  };
};

export const deleteNotificationChannelRoute = async (
  organizationId: string,
  channelId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: channelManagerRoles
  });

  const result = await services.notifications.deleteChannel({
    organizationId,
    actorUserId,
    channelId,
    context
  });

  if (!result.deleted) {
    throw new AuthError("invalid_request", "Notification channel was not found for this organization.", 404);
  }

  return {
    statusCode: 200,
    body: result
  };
};

export const sendNotificationChannelTestRoute = async (
  organizationId: string,
  channelId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: channelManagerRoles
  });
  const channel = await services.notificationRepository.findChannel(organizationId, channelId);
  if (!channel) {
    throw new AuthError("invalid_request", "Notification channel was not found for this organization.", 404);
  }

  return {
    statusCode: 202,
    body: await services.notifications.sendTest({
      organizationId,
      actorUserId,
      channelId,
      context
    })
  };
};

export const listNotificationLogsRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: notificationReadRoles
  });

  return {
    statusCode: 200,
    body: await services.notifications.listLogs(organizationId)
  };
};
