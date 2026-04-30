import { AuthError } from "../../../../packages/auth/core/src/index";
import type { ComplianceGap } from "../../../../packages/compliance/core/src/index";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const generateRecommendationsRoute = async (
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

  if (!Array.isArray(body.gaps)) {
    throw new AuthError("invalid_request", "gaps must be an array.", 400);
  }

  return {
    statusCode: 200,
    body: services.recommendations.generate({
      organizationId,
      gaps: body.gaps as ComplianceGap[]
    })
  };
};
