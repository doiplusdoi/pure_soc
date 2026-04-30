import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const createDashboardSnapshotRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
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
    statusCode: 201,
    body: await services.dashboards.createReadinessSnapshot({
      organizationId,
      assessmentId:
        typeof body.assessmentId === "string" && body.assessmentId.length > 0
          ? body.assessmentId
          : `${organizationId}:nis2:assessment`,
      countryPackCompleteness: typeof body.countryPackCompleteness === "number" ? body.countryPackCompleteness : undefined
    })
  };
};
