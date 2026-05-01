import { AuthError } from "@puresoc/auth-core";
import type { EvidenceSourceType } from "@puresoc/evidence";
import type { ApiServices } from "../auth/services";
import { evidenceArtifactApiView } from "./service";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const uploadEvidenceRoute = async (
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
    allowedRoles: ["owner", "org_admin"]
  });

  const upload = await services.evidence.upload({
    organizationId,
    actorUserId,
    title: requireString(body, "title"),
    content: requireString(body, "content"),
    contentEncoding: body.contentEncoding === "base64" ? "base64" : "utf8",
    mimeType: requireString(body, "mimeType"),
    sourceType: requireEvidenceSourceType(body.sourceType),
    sourceProvider: optionalString(body, "sourceProvider"),
    providerConnectionId: optionalString(body, "providerConnectionId"),
    manualSourceLabel: optionalString(body, "manualSourceLabel"),
    controlId: optionalString(body, "controlId"),
    jurisdiction: optionalString(body, "jurisdiction"),
    requirementKey: optionalString(body, "requirementKey"),
    linkedAssessmentId: optionalString(body, "linkedAssessmentId"),
    linkedSourceRecordId: optionalString(body, "linkedSourceRecordId"),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return {
    statusCode: 201,
    body: {
      artifact: evidenceArtifactApiView(upload.artifact)
    }
  };
};

export const downloadEvidenceRoute = async (
  organizationId: string,
  evidenceArtifactId: string,
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

  const download = await services.evidence.download({
    organizationId,
    actorUserId,
    evidenceArtifactId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return {
    statusCode: 200,
    body: {
      artifact: evidenceArtifactApiView(download.artifact),
      bodyBase64: Buffer.from(download.body).toString("base64"),
      mimeType: download.mimeType,
      contentHashSha256: download.contentHashSha256,
      auditEntry: download.accessLog
    }
  };
};

export const listEvidenceRoute = async (
  organizationId: string,
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
    body: {
      artifacts: (await services.evidence.list(organizationId)).map(evidenceArtifactApiView)
    }
  };
};

const requireString = (body: Record<string, unknown>, field: string): string => {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new AuthError("invalid_request", `Missing required string field: ${field}`, 400);
  }

  return value;
};

const optionalString = (body: Record<string, unknown>, field: string): string | undefined => {
  const value = body[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const evidenceSourceTypes = new Set<EvidenceSourceType>([
  "provider_snapshot",
  "manual_upload",
  "generated_report",
  "signed_document",
  "checklist_completion",
  "action_pre_state",
  "action_post_state",
  "audit_log_export",
  "policy_document",
  "risk_acceptance",
  "regulatory_source_snapshot",
  "country_registration_draft",
  "incident_reporting_draft"
]);

const requireEvidenceSourceType = (value: unknown): EvidenceSourceType => {
  if (typeof value !== "string" || !evidenceSourceTypes.has(value as EvidenceSourceType)) {
    throw new AuthError("invalid_request", "sourceType is not a supported evidence source type.", 400);
  }

  return value as EvidenceSourceType;
};
