import { AuthError } from "../../../../packages/auth/core/src/index";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";

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
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "auditor"]
  });

  const assessmentId = typeof body.assessmentId === "string" ? body.assessmentId : `${organizationId}:nis2:assessment`;
  const providerConnectionId = typeof body.providerConnectionId === "string" ? body.providerConnectionId : undefined;

  return {
    statusCode: 202,
    body: await services.compliance.evaluateAssessment({
      organizationId,
      assessmentId,
      providerConnectionId,
      jurisdiction: typeof body.jurisdiction === "string" ? body.jurisdiction : undefined,
      ownerUserId: actorUserId,
      evidenceArtifacts: Array.isArray(body.evidenceArtifacts) ? (body.evidenceArtifacts as never[]) : undefined,
      manualTasks: Array.isArray(body.manualTasks) ? (body.manualTasks as never[]) : undefined,
      countryPack: parseCountryPack(body.countryPack),
      ...auditContext(context)
    })
  };
};

const parseCountryPack = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== "object" || !("countryCode" in value)) {
    throw new AuthError("invalid_request", "countryPack must include countryCode when provided.", 400);
  }

  return value as {
    countryCode: string;
    completeness?: string;
    countryPackStatus?: string;
    unsupportedFeatures?: Array<{ featureKey: string; reason: string }>;
  };
};

const auditContext = (_context: RequestContext): Record<string, never> => ({});
