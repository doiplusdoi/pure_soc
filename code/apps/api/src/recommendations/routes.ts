import { AuthError } from "@puresoc/auth-core";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";
import { parseComplianceGaps, parseRecommendationContext } from "../compliance/validation";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const generateRecommendationsRoute = async (
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
    allowedRoles: ["owner", "org_admin", "compliance_manager"]
  });

  if (!Array.isArray(body.gaps)) {
    throw new AuthError("invalid_request", "gaps must be an array.", 400);
  }

  const gaps = parseComplianceGaps(body.gaps, organizationId);
  const recommendationContext = parseRecommendationContext(body.context);
  const recommendationResult = services.recommendations.generate({
    organizationId,
    gaps,
    context: recommendationContext
  });
  const assessmentIds = [...new Set(gaps.map((gap) => gap.assessmentId))];

  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "compliance_recommendations",
    targetId: assessmentIds.length === 1 ? assessmentIds[0] : `${organizationId}:recommendations`,
    action: "compliance.recommendations.generated",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      assessmentIds,
      gapsCount: gaps.length,
      recommendationsCount: recommendationResult.recommendations.length,
      controlIds: [...new Set(gaps.map((gap) => gap.controlId))],
      snapshotId: recommendationResult.snapshot.id,
      ruleVersions: recommendationResult.snapshot.ruleVersions,
      unknownMicrosoftSkuPartNumbers: recommendationResult.snapshot.diagnostics.unknownMicrosoftSkuPartNumbers
    }
  });

  return {
    statusCode: 200,
    body: recommendationResult
  };
};
