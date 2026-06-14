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
    repository: services.rbacRepository,
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

export const getLatestDashboardSnapshotRoute = async (
  organizationId: string,
  query: URLSearchParams,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "auditor"]
  });

  const assessmentId = query.get("assessmentId") ?? undefined;

  try {
    return {
      statusCode: 200,
      body: await services.dashboards.getLatestReadinessSnapshot({
        organizationId,
        assessmentId
      })
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Dashboard snapshot was not found")) {
      return {
        statusCode: 404,
        body: {
          error: {
            code: "dashboard_snapshot_not_found",
            message: "Dashboard snapshot was not found for this organization."
          }
        }
      };
    }

    throw error;
  }
};

export const listDashboardSnapshotsRoute = async (
  organizationId: string,
  query: URLSearchParams,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "auditor"]
  });

  return {
    statusCode: 200,
    body: await services.dashboards.listReadinessSnapshotHistory({
      organizationId,
      assessmentId: query.get("assessmentId") ?? undefined,
      days: parseDays(query.get("days"))
    })
  };
};

const parseDays = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
