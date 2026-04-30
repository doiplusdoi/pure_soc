import { AuthError } from "@puresoc/auth-core";
import type { StoredRomaniaNotificationDraftInput } from "@puresoc/reports";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const buildInternalReadinessReportRoute = async (
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
    body: await services.reports.buildInternalReadinessReport({
      organizationId,
      actorUserId,
      assessmentId: requireString(body, "assessmentId")
    })
  };
};

export const buildRomaniaNotificationDraftReportRoute = async (
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
    body: await services.reports.buildRomaniaNotificationDraft({
      organizationId,
      actorUserId,
      draft: parseRomaniaDraft(organizationId, body)
    })
  };
};

const requireString = (body: Record<string, unknown>, field: string): string => {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new AuthError("invalid_request", `Missing required string field: ${field}`, 400);
  }

  return value;
};

const parseRomaniaDraft = (
  organizationId: string,
  body: Record<string, unknown>
): StoredRomaniaNotificationDraftInput => {
  if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    throw new AuthError("invalid_request", "payload must be an object.", 400);
  }

  if (!Array.isArray(body.sourceMappedFields)) {
    throw new AuthError("invalid_request", "sourceMappedFields must be an array.", 400);
  }

  return {
    organizationId,
    assessmentId: typeof body.assessmentId === "string" ? body.assessmentId : undefined,
    status:
      body.status === "ready_for_review" || body.status === "exported" || body.status === "superseded"
        ? body.status
        : "draft",
    payload: body.payload as Record<string, unknown>,
    sourceMappedFields: body.sourceMappedFields as StoredRomaniaNotificationDraftInput["sourceMappedFields"],
    sourceReferences: Array.isArray(body.sourceReferences)
      ? (body.sourceReferences as StoredRomaniaNotificationDraftInput["sourceReferences"])
      : [],
    classificationRunId: typeof body.classificationRunId === "string" ? body.classificationRunId : undefined,
    onboardingProgressId: typeof body.onboardingProgressId === "string" ? body.onboardingProgressId : undefined,
    notificationDraftId: typeof body.notificationDraftId === "string" ? body.notificationDraftId : undefined
  };
};
