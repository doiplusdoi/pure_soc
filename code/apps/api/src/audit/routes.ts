import { AuditExportError } from "@puresoc/audit";
import { AuthError } from "@puresoc/auth-core";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac";

const optionalString = (body: Record<string, unknown>, field: string): string | null => {
  const value = body[field];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getAuthorizedAuditSession = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
) => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");

  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: session.user.id,
    organizationId,
    allowedRoles: ["owner", "org_admin", "auditor"]
  });

  return session;
};

export const exportAuditSegmentRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  await getAuthorizedAuditSession(organizationId, cookieHeader, services);
  const segment = await services.auditCheckpoints.exportSegment({
    organizationId
  });

  return {
    statusCode: 200,
    body: {
      segment
    }
  };
};

export const listAuditCheckpointsRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  await getAuthorizedAuditSession(organizationId, cookieHeader, services);

  return {
    statusCode: 200,
    body: {
      checkpoints: await services.auditCheckpoints.listCheckpoints({
        organizationId
      })
    }
  };
};

export const recordAuditCheckpointRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await getAuthorizedAuditSession(organizationId, cookieHeader, services);
  const expectedTerminalHash = optionalString(body, "expectedTerminalHash");
  const result = await services.auditCheckpoints.recordCheckpoint({
    organizationId,
    createdByUserId: session.user.id,
    expectedTerminalHash
  });

  if (
    !result.checkpoint.guarantees ||
    !result.checkpoint.handoff?.guarantees ||
    result.checkpoint.guarantees.databaseRowsAreWorm !== false ||
    result.checkpoint.handoff.guarantees.databaseRowsAreWorm !== false ||
    result.checkpoint.handoff.artifact.storagePointerReturnedToClient !== false ||
    result.checkpoint.handoff.artifact.publicUrlReturnedToClient !== false ||
    result.checkpoint.guarantees.externalNotarization !== false ||
    result.checkpoint.handoff.guarantees.externalNotarization !== false ||
    result.checkpoint.guarantees.legalCertification !== false ||
    result.checkpoint.handoff.guarantees.legalCertification !== false
  ) {
    throw new AuditExportError(
      "invalid_audit_checkpoint_guarantees",
      "Audit checkpoint guarantees must not claim WORM or external notarization."
    );
  }

  await services.auditWriter.write({
    organizationId,
    actorUserId: session.user.id,
    targetType: "audit_checkpoint",
    targetId: result.checkpoint.id,
    action: "audit_checkpoint_recorded",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      checkpointId: result.checkpoint.id,
      exportId: result.checkpoint.exportId,
      recordCount: result.checkpoint.recordCount,
      terminalHash: result.checkpoint.terminalHash,
      verificationStatus: result.checkpoint.verificationStatus,
      externalCheckpointStatus: result.checkpoint.externalCheckpointStatus,
      externalCheckpointProvider: result.checkpoint.externalCheckpointProvider,
      handoffStatus: result.checkpoint.handoff.status,
      handoffArtifactStatus: result.checkpoint.handoff.artifact.status,
      retentionPolicyKey: result.checkpoint.retentionPolicy.policyKey,
      databaseRowsAreWorm: false
    }
  });

  return {
    statusCode: 201,
    body: {
      checkpoint: result.checkpoint,
      verification: result.segment.verification
    }
  };
};

export const assertAuditCheckpointRequestBody = (body: unknown): Record<string, unknown> => {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new AuthError("invalid_request", "Audit checkpoint request body must be a JSON object.", 400);
  }

  return body as Record<string, unknown>;
};
