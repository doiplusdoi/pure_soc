import { AuthError } from "@puresoc/auth-core";
import type { NotificationDraftPayloadEnvelopeContract } from "@puresoc/database";
import type { ReportBranding, StoredRomaniaNotificationDraftInput } from "@puresoc/reports";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type BinaryResult, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";
import type { InternalReadinessReportVersionContext } from "./service";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

const loadReportBranding = async (
  organizationId: string,
  actorUserId: string,
  services: ApiServices
): Promise<ReportBranding | undefined> => {
  const organization = (await services.identityRepository.listOrganizationsForUser(actorUserId)).find(
    (row) => row.organization.id === organizationId
  )?.organization;
  if (!organization) {
    return undefined;
  }

  return {
    organizationName: organization.name,
    legalName: organization.legalName ?? null,
    logoDataUrl: organization.logoDataUrl ?? null
  };
};

export const buildInternalReadinessReportRoute = async (
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
  const reportBranding = await loadReportBranding(organizationId, actorUserId, services);

  return {
    statusCode: 201,
    body: await services.reports.buildInternalReadinessReport({
      organizationId,
      actorUserId,
      assessmentId: requireString(body, "assessmentId"),
      versionContext: parseInternalReadinessReportVersionContext(body),
      reportBranding,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const buildMicrosoft365VerifiedInternalReadinessReportRoute = async (
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
  const reportBranding = await loadReportBranding(organizationId, actorUserId, services);

  return {
    statusCode: 201,
    body: await services.reports.buildMicrosoft365VerifiedInternalReadinessReport({
      organizationId,
      actorUserId,
      previousReportId: requireString(body, "previousReportId"),
      providerConnectionId: requireString(body, "providerConnectionId"),
      assessmentId: optionalString(body.assessmentId),
      versionContext: parseInternalReadinessReportVersionContext(body),
      reportBranding,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const buildInternalReadinessCsvExportRoute = async (
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
  const reportBranding = await loadReportBranding(organizationId, actorUserId, services);

  return {
    statusCode: 201,
    body: await services.reports.buildInternalReadinessCsvExport({
      organizationId,
      actorUserId,
      assessmentId: requireString(body, "assessmentId"),
      versionContext: parseInternalReadinessReportVersionContext(body),
      reportBranding,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const buildInternalReadinessEvidencePackageRoute = async (
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
  const reportBranding = await loadReportBranding(organizationId, actorUserId, services);

  return {
    statusCode: 201,
    body: await services.reports.buildInternalReadinessEvidencePackage({
      organizationId,
      actorUserId,
      assessmentId: requireString(body, "assessmentId"),
      versionContext: parseInternalReadinessReportVersionContext(body),
      reportBranding,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const buildRomaniaNotificationDraftReportRoute = async (
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
  const reportBranding = await loadReportBranding(organizationId, actorUserId, services);

  return {
    statusCode: 201,
    body: await services.reports.buildRomaniaNotificationDraft({
      organizationId,
      actorUserId,
      draft: parseRomaniaDraft(organizationId, body),
      reportBranding,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const downloadGapReportPdfRoute = async (
  organizationId: string,
  searchParams: URLSearchParams,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<BinaryResult | JsonResult> => {
  const format = searchParams.get("format") ?? "json";
  if (format !== "pdf") {
    throw new AuthError("invalid_request", "Only format=pdf is supported on this download route.", 400);
  }

  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });
  const reportBranding = await loadReportBranding(organizationId, actorUserId, services);

  const result = await services.reports.buildGapReportPdf({
    organizationId,
    actorUserId,
    assessmentId: searchParams.get("assessmentId") ?? undefined,
    reportBranding,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return toPdfResult(result.pdf);
};

export const downloadGeneratedReportPdfRoute = async (
  organizationId: string,
  reportId: string,
  searchParams: URLSearchParams,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<BinaryResult | JsonResult> => {
  const format = searchParams.get("format") ?? "json";
  if (format !== "pdf") {
    throw new AuthError("invalid_request", "Only format=pdf is supported on this download route.", 400);
  }

  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });

  const result = await services.reports.downloadGeneratedReportPdf({
    organizationId,
    reportId,
    actorUserId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return toPdfResult(result.pdf);
};

export const downloadRomaniaNotificationDraftPdfRoute = async (
  organizationId: string,
  searchParams: URLSearchParams,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<BinaryResult | JsonResult> => {
  const format = searchParams.get("format") ?? "json";
  if (format !== "pdf") {
    throw new AuthError("invalid_request", "Only format=pdf is supported on this download route.", 400);
  }

  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });
  const reportBranding = await loadReportBranding(organizationId, actorUserId, services);

  const notificationDraftId = searchParams.get("notificationDraftId");
  const notificationDraft = notificationDraftId
    ? await services.notificationDrafts.getNotificationDraft({
        organizationId,
        notificationDraftId
      })
    : {
        notificationDraft:
          (
            await services.notificationDrafts.listNotificationDrafts({
              organizationId,
              jurisdiction: "RO"
            })
          )[0] ?? null
      };

  if (!notificationDraft.notificationDraft) {
    throw new AuthError("invalid_request", "Romania notification draft was not found for this organization.", 404);
  }

  const result = await services.reports.buildRomaniaNotificationDraftPdf({
    organizationId,
    actorUserId,
    draft: toStoredRomaniaDraftInput(notificationDraft.notificationDraft.payload, {
      organizationId,
      assessmentId: notificationDraft.notificationDraft.assessmentId,
      notificationDraftId: notificationDraft.notificationDraft.id,
      status: notificationDraft.notificationDraft.status
    }),
    reportBranding,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return toPdfResult(result.pdf);
};

const requireString = (body: Record<string, unknown>, field: string): string => {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new AuthError("invalid_request", `Missing required string field: ${field}`, 400);
  }

  return value;
};

const parseInternalReadinessReportVersionContext = (
  body: Record<string, unknown>
): InternalReadinessReportVersionContext => ({
  classificationResult: parseClassificationSnapshot(body.classificationResult),
  countryPackVersion: optionalString(body.countryPackVersion),
  onboardingSchemaVersion: optionalString(body.onboardingSchemaVersion),
  previousReportId: optionalString(body.previousReportId),
  reportVersion: body.reportVersion === 2 ? 2 : 1,
  triggerType: parseReportTriggerType(body.triggerType)
});

const parseClassificationSnapshot = (
  value: unknown
): InternalReadinessReportVersionContext["classificationResult"] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const result = optionalString(record.result);
  if (!result) {
    return undefined;
  }

  return {
    confidence: optionalString(record.confidence),
    countryCode: optionalString(record.countryCode),
    explanation: optionalString(record.explanation),
    legalReviewRequired: typeof record.legalReviewRequired === "boolean" ? record.legalReviewRequired : true,
    missingInformation: Array.isArray(record.missingInformation)
      ? record.missingInformation.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    result
  };
};

const parseReportTriggerType = (value: unknown): InternalReadinessReportVersionContext["triggerType"] => {
  if (
    value === "onboarding_completed" ||
    value === "manual_regenerate" ||
    value === "microsoft_sync_completed"
  ) {
    return value;
  }

  return "onboarding_completed";
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

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
    notificationDraftId: typeof body.notificationDraftId === "string" ? body.notificationDraftId : undefined,
    locale: typeof body.locale === "string" ? body.locale : undefined
  };
};

const toStoredRomaniaDraftInput = (
  payload: NotificationDraftPayloadEnvelopeContract,
  metadata: {
    organizationId: string;
    assessmentId?: string;
    notificationDraftId: string;
    status: StoredRomaniaNotificationDraftInput["status"];
  }
): StoredRomaniaNotificationDraftInput => ({
  organizationId: metadata.organizationId,
  assessmentId: metadata.assessmentId,
  status: metadata.status,
  payload: payload.payload,
  sourceMappedFields: payload.sourceMappedFields.map((field) => {
    const record = field as Record<string, unknown>;
    return {
      fieldKey: typeof record.fieldKey === "string" ? record.fieldKey : "unknown_field",
      value: record.value,
      sourceReferences: Array.isArray(record.sourceReferences)
        ? (record.sourceReferences as StoredRomaniaNotificationDraftInput["sourceMappedFields"][number]["sourceReferences"])
        : []
    };
  }),
  sourceReferences: payload.sourceReferences as StoredRomaniaNotificationDraftInput["sourceReferences"],
  notificationDraftId: metadata.notificationDraftId,
  locale: payload.locale
});

const toPdfResult = (pdf: {
  filename: string;
  mimeType: string;
  contentHashSha256: string;
  body: Uint8Array;
}): BinaryResult => ({
  kind: "binary",
  statusCode: 200,
  body: pdf.body,
  headers: {
    "content-type": pdf.mimeType,
    "content-disposition": `attachment; filename="${sanitizeFilename(pdf.filename)}"`,
    "x-puresoc-content-sha256": pdf.contentHashSha256
  }
});

const sanitizeFilename = (filename: string): string => filename.replaceAll(/[/\\?%*:|"<>]/g, "-");
