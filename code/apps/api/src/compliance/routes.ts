import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";
import { parseComplianceEvaluationBody } from "./validation";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const evaluateComplianceAssessmentRoute = async (
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
    allowedRoles: ["owner", "org_admin", "auditor"]
  });

  const input = parseComplianceEvaluationBody(body, organizationId);
  const evaluation = await services.compliance.evaluateAssessment({
    organizationId,
    assessmentId: input.assessmentId,
    providerConnectionId: input.providerConnectionId,
    jurisdiction: input.jurisdiction,
    ownerUserId: actorUserId,
    evidenceArtifacts: input.evidenceArtifacts,
    manualTasks: input.manualTasks,
    countryPack: input.countryPack
  });

  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "compliance_assessment",
    targetId: input.assessmentId,
    action: "compliance.assessment.evaluated",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      assessmentId: input.assessmentId,
      jurisdiction: input.jurisdiction ?? null,
      controlsEvaluated: evaluation.results.length,
      gapsCount: evaluation.gaps.length,
      recommendationsCount: evaluation.recommendations.length,
      checklistItemsCount: evaluation.checklistItems.length,
      countryPackWarningsCount: evaluation.countryPackWarnings.length
    }
  });

  return {
    statusCode: 200,
    body: evaluation
  };
};
