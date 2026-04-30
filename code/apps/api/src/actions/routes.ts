import { AuthError } from "@puresoc/auth-core";
import type {
  ActionPreflightResult,
  ActionSnapshotMetadata,
  ActionTemplate,
  ActionVerificationResult,
  RecommendationContract
} from "@puresoc/recommendations";
import {
  actionableSeverities,
  type RecommendationActionType,
  type RecommendationAutomationMode
} from "@puresoc/shared";

import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const createActionRunRoute = async (
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
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });
  const providerConnectionId = stringField(body, "providerConnectionId");
  await services.providerConnections.store.getConnectionForOrganization(organizationId, providerConnectionId);
  const template = await services.actions.createTemplate(parseActionTemplate(body.actionTemplate, organizationId));
  const run = await services.actions.createActionRun({
    organizationId,
    providerConnectionId,
    actorUserId,
    recommendation: parseRecommendation(body.recommendation, organizationId),
    template
  });

  return {
    statusCode: 201,
    body: {
      actionRun: run,
      followupTasks: services.actions.createManualGuidedTasks({
        run,
        ownerUserId: actorUserId
      })
    }
  };
};

export const recordActionPreflightRoute = async (
  organizationId: string,
  actionRunId: string,
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
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: await services.actions.recordPreflight({
        organizationId,
        actionRunId,
        actorUserId,
        result: parsePreflightResult(body),
        context
      })
    }
  };
};

export const requestActionApprovalRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: await services.actions.requestApproval({
        organizationId,
        actionRunId,
        actorUserId,
        context
      })
    }
  };
};

export const approveActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "remediation_approver"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: await services.actions.approve({
        organizationId,
        actionRunId,
        actorUserId,
        context
      })
    }
  };
};

export const attachActionSnapshotRoute = async (
  organizationId: string,
  actionRunId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: await services.actions.attachSnapshot({
        organizationId,
        actionRunId,
        snapshot: parseSnapshot(body, actorUserId)
      })
    }
  };
};

export const queueActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "security_operator"]
  });
  const run = await services.actionsRepository.findActionRunForOrganization({
    organizationId,
    actionRunId
  });
  if (!run) {
    throw new AuthError("invalid_request", "Action run was not found for this organization.", 404);
  }
  const connection = await services.providerConnections.store.getConnectionForOrganization(
    organizationId,
    run.providerConnectionId
  );
  const result = await services.actions.queue({
    organizationId,
    actionRunId,
    actorUserId,
    providerConnectionWriteEnabled: connection.writeEnabled,
    context
  });

  return {
    statusCode: 202,
    body: {
      actionRun: result.run,
      workerJob: result.job
    }
  };
};

export const failActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
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
    allowedRoles: ["owner", "org_admin", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: await services.actions.fail({
        organizationId,
        actionRunId,
        actorUserId,
        reason: stringField(body, "reason"),
        context
      })
    }
  };
};

export const verifyActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
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
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: await services.actions.recordVerification({
        organizationId,
        actionRunId,
        actorUserId,
        result: parseVerificationResult(body),
        context
      })
    }
  };
};

export const closeActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.repository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: await services.actions.close({
        organizationId,
        actionRunId,
        actorUserId,
        context
      })
    }
  };
};

const parseActionTemplate = (value: unknown, organizationId: string): Omit<ActionTemplate, "createdAt" | "updatedAt"> => {
  const input = objectField(value, "actionTemplate");
  const automationMode = automationModeField(input, "automationMode");
  const riskLevel = severityField(input, "riskLevel");

  return {
    id: optionalStringField(input, "id") ?? `template_${stringField(input, "actionKey")}`,
    organizationId,
    providerKey: stringField(input, "providerKey"),
    moduleKey: optionalStringField(input, "moduleKey"),
    actionKey: stringField(input, "actionKey"),
    actionType: actionTypeField(input, "actionType"),
    automationMode,
    title: stringField(input, "title"),
    description: optionalStringField(input, "description"),
    riskLevel,
    licenseRequired: stringArrayField(input, "licenseRequired"),
    permissionsRequired: stringArrayField(input, "permissionsRequired"),
    preconditions: recordField(input, "preconditions"),
    expectedChange: stringField(input, "expectedChange"),
    blastRadius: stringField(input, "blastRadius"),
    rollbackStrategy: stringField(input, "rollbackStrategy"),
    manualFallback: stringField(input, "manualFallback"),
    evidenceRequired: booleanField(input, "evidenceRequired", true),
    enabledByDefault: booleanField(input, "enabledByDefault", false),
    highRiskForbiddenInV1: booleanField(input, "highRiskForbiddenInV1", false),
    sourceReferences: []
  };
};

const parseRecommendation = (value: unknown, organizationId: string): RecommendationContract => {
  const input = objectField(value, "recommendation");
  return {
    id: stringField(input, "id"),
    organizationId,
    sourceFindingId: optionalStringField(input, "sourceFindingId"),
    sourceFindingIds: stringArrayField(input, "sourceFindingIds"),
    manualTaskIds: stringArrayField(input, "manualTaskIds"),
    controlId: stringField(input, "controlId"),
    jurisdiction: stringField(input, "jurisdiction"),
    title: stringField(input, "title"),
    summary: stringField(input, "summary"),
    severity: severityField(input, "severity"),
    confidence: "medium",
    recommendationType: actionTypeField(input, "recommendationType"),
    automationMode: automationModeField(input, "automationMode"),
    requiredPermissions: stringArrayField(input, "requiredPermissions"),
    requiredLicense: stringArrayField(input, "requiredLicense"),
    expectedChange: optionalStringField(input, "expectedChange"),
    blastRadius: optionalStringField(input, "blastRadius"),
    manualFallback: optionalStringField(input, "manualFallback"),
    evidenceRequired: booleanField(input, "evidenceRequired", true),
    status: "proposed",
    sourceReferences: []
  };
};

const parsePreflightResult = (body: Record<string, unknown>): Omit<ActionPreflightResult, "checkedAt" | "checkedBy"> => {
  const status = body.status === "passed" || body.status === "failed" ? body.status : undefined;
  if (!status) {
    throw new AuthError("invalid_request", "Preflight status must be passed or failed.", 400);
  }

  return {
    status,
    checks: Array.isArray(body.checks)
      ? body.checks.map((entry, index) => {
          const check = objectField(entry, `checks[${index}]`);
          const checkStatus =
            check.status === "passed" || check.status === "failed" || check.status === "warning"
              ? check.status
              : undefined;
          if (!checkStatus) {
            throw new AuthError("invalid_request", "Preflight check status is invalid.", 400);
          }
          return {
            code: stringField(check, "code"),
            status: checkStatus,
            message: stringField(check, "message")
          };
        })
      : [],
    diff:
      typeof body.diff === "object" && body.diff !== null
        ? {
            summary: stringField(body.diff as Record<string, unknown>, "summary"),
            changes: []
          }
        : undefined,
    requiredPermissions: stringArrayField(body, "requiredPermissions"),
    requiredLicense: stringArrayField(body, "requiredLicense"),
    canRequestApproval: booleanField(body, "canRequestApproval", status === "passed")
  };
};

const parseSnapshot = (body: Record<string, unknown>, actorUserId: string): ActionSnapshotMetadata => {
  const sourceType =
    body.sourceType === "action_pre_state" || body.sourceType === "action_post_state" ? body.sourceType : undefined;
  if (!sourceType) {
    throw new AuthError("invalid_request", "Snapshot sourceType must be action_pre_state or action_post_state.", 400);
  }

  return {
    evidenceArtifactId: stringField(body, "evidenceArtifactId"),
    sourceType,
    contentHashSha256: optionalStringField(body, "contentHashSha256"),
    capturedAt: optionalStringField(body, "capturedAt") ?? new Date().toISOString(),
    capturedBy: actorUserId,
    providerConnectionId: stringField(body, "providerConnectionId"),
    resourceRefs: stringArrayField(body, "resourceRefs"),
    description: optionalStringField(body, "description")
  };
};

const parseVerificationResult = (
  body: Record<string, unknown>
): Omit<ActionVerificationResult, "verifiedAt" | "verifiedBy"> => {
  const status =
    body.status === "passed" || body.status === "failed" || body.status === "manual_required"
      ? body.status
      : undefined;
  if (!status) {
    throw new AuthError("invalid_request", "Verification status must be passed, failed, or manual_required.", 400);
  }

  return {
    status,
    checks: [],
    evidenceArtifactIds: stringArrayField(body, "evidenceArtifactIds")
  };
};

const objectField = (value: unknown, fieldName: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AuthError("invalid_request", `${fieldName} must be an object.`, 400);
  }

  return value as Record<string, unknown>;
};

const recordField = (value: Record<string, unknown>, fieldName: string): Record<string, unknown> => {
  const field = value[fieldName];
  return field && typeof field === "object" && !Array.isArray(field) ? (field as Record<string, unknown>) : {};
};

const stringField = (value: Record<string, unknown>, fieldName: string): string => {
  const field = value[fieldName];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new AuthError("invalid_request", `${fieldName} must be a non-empty string.`, 400);
  }

  return field;
};

const optionalStringField = (value: Record<string, unknown>, fieldName: string): string | undefined => {
  const field = value[fieldName];
  return typeof field === "string" && field.trim().length > 0 ? field : undefined;
};

const stringArrayField = (value: Record<string, unknown>, fieldName: string): string[] => {
  const field = value[fieldName];
  return Array.isArray(field) ? field.filter((entry): entry is string => typeof entry === "string") : [];
};

const booleanField = (value: Record<string, unknown>, fieldName: string, fallback: boolean): boolean =>
  typeof value[fieldName] === "boolean" ? value[fieldName] : fallback;

const severityField = (value: Record<string, unknown>, fieldName: string) => {
  const field = value[fieldName];
  if (typeof field === "string" && (actionableSeverities as readonly string[]).includes(field)) {
    return field as (typeof actionableSeverities)[number];
  }

  throw new AuthError("invalid_request", `${fieldName} must be an actionable severity.`, 400);
};

const recommendationActionTypes = [
  "manual",
  "guided",
  "technical",
  "process",
  "evidence_upload",
  "country_registration",
  "incident_reporting"
] as const satisfies readonly RecommendationActionType[];

const actionTypeField = (value: Record<string, unknown>, fieldName: string): RecommendationActionType => {
  const field = value[fieldName];
  if (typeof field === "string" && (recommendationActionTypes as readonly string[]).includes(field)) {
    return field as RecommendationActionType;
  }

  throw new AuthError("invalid_request", `${fieldName} must be a supported action type.`, 400);
};

const automationModes = ["manual", "guided", "preflightable", "executable_later"] as const satisfies readonly RecommendationAutomationMode[];

const automationModeField = (value: Record<string, unknown>, fieldName: string): RecommendationAutomationMode => {
  const field = value[fieldName];
  if (typeof field === "string" && (automationModes as readonly string[]).includes(field)) {
    return field as RecommendationAutomationMode;
  }

  throw new AuthError("invalid_request", `${fieldName} must be a supported automation mode.`, 400);
};
