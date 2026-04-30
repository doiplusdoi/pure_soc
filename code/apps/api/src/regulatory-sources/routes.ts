import { AuthError } from "@puresoc/auth-core";
import type { JsonObject, RegulatoryReviewTaskStatus } from "@puresoc/regulatory-sources";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const listRegulatoryReviewTasksRoute = async (
  organizationId: string,
  query: URLSearchParams,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await requireRegulatoryAdmin(organizationId, cookieHeader, services);
  const status = optionalReviewTaskStatus(query.get("status"));

  return {
    statusCode: 200,
    body: {
      actorUserId,
      reviewTasks: await services.regulatorySources.listReviewTasks({
        organizationId,
        status
      })
    }
  };
};

export const markRegulatoryReviewTaskReviewedRoute = async (
  organizationId: string,
  taskId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await requireRegulatoryAdmin(organizationId, cookieHeader, services);
  const reviewTask = await services.regulatorySources.markReviewed({
    taskId,
    actorUserId,
    notes: optionalString(body, "notes"),
    decisionJson: optionalJsonObject(body, "decision")
  });

  await services.auditWriter.write({
    organizationId,
    actorUserId,
    targetType: "regulatory_review_task",
    targetId: reviewTask.id,
    action: "regulatory.review_task.reviewed",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      status: reviewTask.status,
      sourceVersionId: reviewTask.sourceVersionId
    }
  });

  return {
    statusCode: 200,
    body: {
      reviewTask
    }
  };
};

export const rejectRegulatoryReviewTaskRoute = async (
  organizationId: string,
  taskId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await requireRegulatoryAdmin(organizationId, cookieHeader, services);
  const reviewTask = await services.regulatorySources.reject({
    taskId,
    actorUserId,
    notes: optionalString(body, "notes"),
    decisionJson: optionalJsonObject(body, "decision")
  });

  await services.auditWriter.write({
    organizationId,
    actorUserId,
    targetType: "regulatory_review_task",
    targetId: reviewTask.id,
    action: "regulatory.review_task.rejected",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      status: reviewTask.status,
      sourceVersionId: reviewTask.sourceVersionId
    }
  });

  return {
    statusCode: 200,
    body: {
      reviewTask
    }
  };
};

export const activateRegulatorySourceVersionRoute = async (
  organizationId: string,
  taskId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await requireRegulatoryAdmin(organizationId, cookieHeader, services);
  const activation = await services.regulatorySources.activateReviewedSourceVersion({
    taskId,
    actorUserId,
    notes: optionalString(body, "notes"),
    decisionJson: optionalJsonObject(body, "decision")
  });

  await services.auditWriter.write({
    organizationId,
    actorUserId,
    targetType: "regulatory_source_version",
    targetId: activation.sourceVersion.id,
    action: "regulatory.source_version.activated",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      sourceId: activation.source.id,
      sourceVersionId: activation.sourceVersion.id,
      reviewTaskId: activation.task.id,
      status: activation.sourceVersion.activationStatus
    }
  });

  return {
    statusCode: 200,
    body: {
      source: activation.source,
      sourceVersion: activation.sourceVersion,
      reviewTask: activation.task
    }
  };
};

export const readRegulatorySourceMapTraceabilityRoute = async (
  organizationId: string,
  sourceVersionId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  await requireRegulatoryAdmin(organizationId, cookieHeader, services);

  return {
    statusCode: 200,
    body: await services.regulatorySources.getSourceMapTraceability(sourceVersionId)
  };
};

const requireRegulatoryAdmin = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<string> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["regulatory_admin"]
  });

  return actorUserId;
};

const optionalReviewTaskStatus = (value: string | null): RegulatoryReviewTaskStatus | undefined => {
  if (value === null || value.length === 0) {
    return undefined;
  }

  if (!["open", "reviewed", "rejected", "activated"].includes(value)) {
    throw new AuthError("invalid_request", "status is not a supported regulatory review task status.", 400);
  }

  return value as RegulatoryReviewTaskStatus;
};

const optionalString = (body: Record<string, unknown>, field: string): string | undefined => {
  const value = body[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const optionalJsonObject = (body: Record<string, unknown>, field: string): JsonObject | undefined => {
  const value = body[field];
  if (value === undefined) {
    return undefined;
  }

  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new AuthError("invalid_request", `${field} must be a JSON object when provided.`, 400);
  }

  return value as JsonObject;
};
