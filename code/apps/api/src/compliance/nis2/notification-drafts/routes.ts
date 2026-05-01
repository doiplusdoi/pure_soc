import { AuthError } from "@puresoc/auth-core";
import type { NotificationDraftContract } from "@puresoc/database";
import type { ApiServices } from "../../../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../../../http";
import { requireOrganizationRole } from "../../../rbac/index";

export const createNotificationDraftRoute = async (
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
    allowedRoles: ["owner", "org_admin", "compliance_manager"]
  });

  return {
    statusCode: 201,
    body: await services.notificationDrafts.createNotificationDraft({
      actorUserId,
      organizationId,
      assessmentId: optionalString(body, "assessmentId"),
      status: optionalNotificationDraftStatus(body.status),
      payload: body.payload,
      sourceReferences: optionalStringArray(body.sourceReferences),
      metadata: optionalRecord(body.metadata),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const getNotificationDraftRoute = async (
  organizationId: string,
  notificationDraftId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });

  return {
    statusCode: 200,
    body: await services.notificationDrafts.getNotificationDraft({
      organizationId,
      notificationDraftId
    })
  };
};

export const listNotificationDraftsRoute = async (
  organizationId: string,
  searchParams: URLSearchParams,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });

  return {
    statusCode: 200,
    body: {
      notificationDrafts: await services.notificationDrafts.listNotificationDrafts({
        organizationId,
        jurisdiction: optionalSearchString(searchParams, "jurisdiction"),
        status: optionalNotificationDraftStatus(searchParams.get("status"))
      })
    }
  };
};

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

const optionalNotificationDraftStatus = (
  value: unknown
): NotificationDraftContract["status"] | undefined => {
  if (value === "draft" || value === "ready_for_review" || value === "exported" || value === "superseded") {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  throw new AuthError("invalid_request", "notification draft status is not supported.", 400);
};

const optionalString = (body: Record<string, unknown>, field: string): string | undefined => {
  const value = body[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const optionalSearchString = (searchParams: URLSearchParams, field: string): string | undefined => {
  const value = searchParams.get(field);
  return value && value.length > 0 ? value : undefined;
};

const optionalStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new AuthError("invalid_request", "sourceReferences must be an array of strings when provided.", 400);
  }

  return value;
};

const optionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AuthError("invalid_request", "metadata must be an object when provided.", 400);
  }

  return value as Record<string, unknown>;
};
