import { randomUUID } from "node:crypto";

import { AuthError, type PureSocRoleKey } from "@puresoc/auth-core";
import { generateReadinessPlan, type ComplianceGap, type ComplianceStatus } from "@puresoc/compliance-core";
import type { RecommendationContract } from "@puresoc/recommendations";
import type { ReportBranding } from "@puresoc/reports";
import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import type { ApiServices } from "../auth/services";
import { listNis2CountryPacksRoute, getNis2CountryPackRoute } from "../compliance/nis2/routes";
import {
  listSupportedNis2OnboardingCountryPacks,
  toCustomerOnboardingCountryPack
} from "../compliance/nis2/onboarding-service";
import type { ApiResult, BinaryResult, JsonResult, RequestContext } from "../http";
import { parseCookies, sessionCookieName } from "../http";
import { requireOrganizationRole } from "../rbac";

type ProductWriteContext = RequestContext & { requestId?: string | null; traceId?: string | null };

const readSession = async (cookieHeader: string | undefined, services: ApiServices) => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  return services.localAuth.getSession(sessionToken ?? "");
};

const requireActiveWorkspace = async (
  cookieHeader: string | undefined,
  services: ApiServices,
  allowedRoles: readonly PureSocRoleKey[] = ["owner", "org_admin", "compliance_manager", "security_operator", "auditor"]
) => {
  const session = await readSession(cookieHeader, services);
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    throw new AuthError("invalid_request", "Select a workspace before using this product route.", 400);
  }

  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: session.user.id,
    organizationId,
    allowedRoles
  });

  const organizationRows = await services.identityRepository.listOrganizationsForUser(session.user.id);
  const directOrganization = organizationRows.find((row) => row.organization.id === organizationId)?.organization;
  const partnerOrganization = directOrganization
    ? null
    : await services.partnerRepository.findOrganizationById(organizationId);
  const organization =
    directOrganization ??
    (partnerOrganization
      ? {
          ...partnerOrganization,
          logoDataUrl: null
        }
      : null);
  if (!organization) {
    throw new AuthError("forbidden", "The selected workspace is not available to this session.", 404);
  }

  return {
    session,
    organization,
    organizationId
  };
};

const reportBrandingForOrganization = (organization: {
  name: string;
  legalName?: string | null;
  logoDataUrl?: string | null;
}): ReportBranding => ({
  organizationName: organization.name,
  legalName: organization.legalName ?? null,
  logoDataUrl: organization.logoDataUrl ?? null
});

const safeString = (body: Record<string, unknown>, key: string): string | undefined => {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const optionalStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : undefined;

const optionalNullableString = (body: Record<string, unknown>, key: string): string | null | undefined => {
  if (body[key] === null) {
    return null;
  }
  return safeString(body, key);
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuidString = (value: string | undefined): value is string => Boolean(value && uuidPattern.test(value));

const optionalUuidString = (body: Record<string, unknown>, key: string, label = key): string | undefined => {
  const value = safeString(body, key);
  if (!value) {
    return undefined;
  }
  if (!isUuidString(value)) {
    throw new AuthError("invalid_request", `${label} must be a UUID.`, 400);
  }
  return value;
};

const safeBoolean = (body: Record<string, unknown>, key: string): boolean | undefined => {
  const value = body[key];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }
  return undefined;
};

const requireBodyString = (body: Record<string, unknown>, key: string, label = key): string => {
  const value = safeString(body, key);
  if (!value) {
    throw new AuthError("invalid_request", `${label} is required.`, 400);
  }
  return value;
};

const preferredAssessmentId = (organizationId: string): string => `${organizationId}:nis2:assessment`;

const primaryMicrosoftConnection = async (organizationId: string, services: ApiServices) => {
  const connections = await services.providerConnections.listConnections(organizationId);
  return connections.connections.find((connection) => connection.providerKey === "microsoft365") ?? null;
};

const latestAnalysis = (organizationId: string, services: ApiServices) =>
  services.outputRepository.findLatestStoredAnalysis(organizationId);

const scoreFromAnalysis = (analysis: Awaited<ReturnType<typeof latestAnalysis>>): number => {
  if (!analysis) {
    return 0;
  }
  const total = analysis.results.length;
  if (total === 0) {
    return 0;
  }
  const completed = analysis.results.filter((result) =>
    ["compliant", "accepted_risk"].includes(String(result.status))
  ).length;
  return Math.round((completed / total) * 100);
};

const businessGapView = (gap: Record<string, unknown>, planItem?: Record<string, unknown>) => ({
  id: String(gap.id ?? ""),
  title: String(gap.title ?? gap.summary ?? "Readiness gap"),
  controlArea: String(gap.controlArea ?? gap.controlId ?? "NIS2 readiness"),
  severity: String(gap.severity ?? "medium"),
  source: String(gap.source ?? gap.sourceType ?? "readiness_engine"),
  businessImpact: String(gap.businessImpact ?? gap.summary ?? "This gap reduces confidence in the readiness baseline."),
  recommendedAction: String(gap.recommendedAction ?? "Review the control and attach evidence or remediation notes."),
  status: String(planItem?.status ?? gap.status ?? "open"),
  engineStatus: String(gap.status ?? "unknown"),
  owner:
    typeof planItem?.ownerUserId === "string"
      ? planItem.ownerUserId
      : typeof gap.ownerUserId === "string"
        ? gap.ownerUserId
        : null,
  dueDate:
    typeof planItem?.dueDate === "string"
      ? planItem.dueDate
      : typeof gap.dueDate === "string"
        ? gap.dueDate
        : null,
  relatedEvidence: Array.isArray(gap.evidenceArtifactIds) ? gap.evidenceArtifactIds : [],
  relatedConnectorFinding: typeof gap.providerFindingId === "string" ? gap.providerFindingId : null
});

const planItemForGap = (analysis: Awaited<ReturnType<typeof latestAnalysis>>, gap: Record<string, unknown>) =>
  analysis?.readinessPlan.items.find(
    (item) => item.controlId === gap.controlId || item.gapSummary === gap.summary
  ) as Record<string, unknown> | undefined;

const recommendationView = (recommendation: Record<string, unknown>) => ({
  id: String(recommendation.id ?? ""),
  title: String(recommendation.title ?? "Recommended action"),
  controlArea: String(recommendation.controlId ?? "NIS2 readiness"),
  priority: String(recommendation.priority ?? recommendation.severity ?? "medium"),
  effort: String(recommendation.effort ?? "review"),
  owner: typeof recommendation.ownerUserId === "string" ? recommendation.ownerUserId : null,
  actionType: String(recommendation.actionType ?? "manual"),
  summary: String(recommendation.summary ?? recommendation.description ?? "Review and assign this recommendation.")
});

const reportView = (artifact: Record<string, unknown>) => {
  const links = Array.isArray(artifact.links) ? (artifact.links as Array<Record<string, unknown>>) : [];
  const linkedReportId = links.find(
    (link) => link.targetType === "report" && typeof link.targetId === "string"
  )?.targetId;
  const reportId = String(linkedReportId ?? artifact.id ?? "");

  return {
    id: String(artifact.id ?? ""),
    title: String(artifact.title ?? "Generated report"),
    format: String(artifact.mimeType ?? "application/pdf"),
    status: "ready",
    createdAt: String(artifact.createdAt ?? ""),
    downloadHref: `/reports/generated/${encodeURIComponent(reportId)}/pdf?format=pdf`
  };
};

const pdfReportCreationView = (result: {
  report: unknown;
  pdf: { filename: string; mimeType: string; contentHashSha256: string; body: Uint8Array };
  pdfArtifactId?: string;
}) => ({
  report: result.report,
  pdf: {
    filename: result.pdf.filename,
    mimeType: result.pdf.mimeType,
    contentHashSha256: result.pdf.contentHashSha256
  },
  pdfArtifactId: result.pdfArtifactId
});

const complianceStatuses = new Set<ComplianceStatus>([
  "not_started",
  "not_applicable",
  "passing",
  "failing",
  "partial",
  "unsupported",
  "needs_evidence",
  "accepted_risk"
]);

const readinessPlanItemStatuses = new Set(["proposed", "accepted", "planned", "completed", "dismissed"]);

const safeActionRunView = <TActionRun extends { idempotencyKey?: string }>(
  run: TActionRun
): Omit<TActionRun, "idempotencyKey"> & { idempotencyKeyPresent?: true } => {
  const { idempotencyKey, ...response } = run;
  return idempotencyKey ? { ...response, idempotencyKeyPresent: true } : response;
};

export const productDashboardRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organization, organizationId } = await requireActiveWorkspace(cookieHeader, services);
  const [analysis, dashboardSnapshot, connection, evidence, actionRuns] = await Promise.all([
    latestAnalysis(organizationId, services),
    services.outputRepository.findLatestDashboardSnapshot(organizationId),
    primaryMicrosoftConnection(organizationId, services),
    services.evidence.list(organizationId),
    services.actionsRepository.listActionRuns(organizationId)
  ]);
  const gaps = (analysis?.gaps ?? []).map((gap) => {
    const gapRecord = gap as unknown as Record<string, unknown>;
    return businessGapView(gapRecord, planItemForGap(analysis, gapRecord));
  });
  const recommendations = (analysis?.recommendations ?? []).map((recommendation) =>
    recommendationView(recommendation as unknown as Record<string, unknown>)
  );
  const generatedReports = evidence.filter((artifact) => artifact.sourceType === "generated_report").map((artifact) =>
    reportView(artifact as unknown as Record<string, unknown>)
  );
  const criticalGaps = gaps.filter((gap) => gap.severity === "critical").length;
  const readinessScore = dashboardSnapshot?.snapshot.readinessScores.overallInternalReadiness ?? scoreFromAnalysis(analysis);
  const baselineExists = Boolean(analysis);
  const businessProfileExists = Boolean(analysis || dashboardSnapshot);
  const connectorExists = Boolean(connection);
  const nextAction = !businessProfileExists
    ? { label: "Start readiness onboarding", href: "/onboarding" }
    : !baselineExists
      ? { label: "Run gap analyzer", href: "/gap-analyzer" }
      : !connectorExists
        ? { label: "Connect Microsoft 365", href: "/microsoft365" }
        : { label: "Review remediation plan", href: "/remediation" };

  return {
    statusCode: 200,
    body: {
      dashboard: {
        workspace: {
          id: organization.id,
          name: organization.name,
          legalName: organization.legalName ?? null,
          logoDataUrl: organization.logoDataUrl ?? null,
          countryCode: organization.primaryCountryCode ?? "RO",
          billingStatus: organization.billingStatus
        },
        countryPack: {
          selected: organization.primaryCountryCode ?? "RO",
          available: ["RO", "PL", "DE"],
          status: organization.primaryCountryCode === "RO" ? "review_required" : "demo"
        },
        readiness: {
          score: readinessScore,
          label: "PureSOC internal readiness",
          assessmentId: analysis?.assessmentId ?? dashboardSnapshot?.assessmentId ?? preferredAssessmentId(organizationId),
          baselineState: baselineExists ? "ready" : "draft"
        },
        microsoft365: connection
          ? {
              status: connection.status,
              connectionId: connection.id,
              tenantName: connection.externalTenantName ?? connection.displayName,
              lastSyncAt: connection.lastSuccessfulSyncAt,
              writeEnabled: connection.writeEnabled
            }
          : {
              status: "not_connected",
              connectionId: null,
              tenantName: "Microsoft 365 is not connected yet",
              lastSyncAt: null,
              writeEnabled: false
            },
        gaps: {
          critical: criticalGaps,
          open: gaps.length,
          recent: gaps.slice(0, 6)
        },
        recommendations: recommendations.slice(0, 6),
        evidence: evidence.slice(0, 8).map((artifact) => ({
          id: artifact.id,
          title: artifact.title,
          sourceType: artifact.sourceType,
          scanStatus: artifact.scanStatus,
          createdAt: artifact.createdAt
        })),
        reports: generatedReports.slice(0, 6),
        remediation: {
          total: actionRuns.length,
          approvalRequested: actionRuns.filter((run) => run.approval.status === "requested").length,
          approved: actionRuns.filter((run) => run.approval.status === "approved").length,
          dryRunOnly: true
        },
        lastSync: connection?.lastSuccessfulSyncAt ?? analysis?.recordedAt ?? dashboardSnapshot?.createdAt ?? null,
        nextAction,
        legalCaveat: PURESOC_LEGAL_CAVEAT
      }
    }
  };
};

export const productListWorkspacesRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  const organizations = await services.identityRepository.listOrganizationsForUser(session.user.id);

  return {
    statusCode: 200,
    body: {
      workspaces: organizations.map((row) => ({
        id: row.organization.id,
        name: row.organization.name,
        legalName: row.organization.legalName ?? null,
        logoDataUrl: row.organization.logoDataUrl ?? null,
        countryCode: row.organization.primaryCountryCode ?? null,
        billingStatus: row.organization.billingStatus,
        membershipStatus: row.membership.status,
        roles: row.roleKeys,
        active: row.organization.id === session.session.activeOrganizationId
      }))
    }
  };
};

export const productCreateWorkspaceRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  return {
    statusCode: 201,
    body: await services.organizations.createOrganization({
      actorUserId: session.user.id,
      name: requireBodyString(body, "name", "Workspace name"),
      legalName: safeString(body, "legalName") ?? null,
      primaryCountryCode: safeString(body, "countryCode") ?? safeString(body, "primaryCountryCode") ?? "RO",
      logoDataUrl: safeString(body, "logoDataUrl") ?? null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const productGetWorkspaceRoute = async (
  workspaceId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  const organizations = await services.identityRepository.listOrganizationsForUser(session.user.id);
  const workspace = organizations.find((row) => row.organization.id === workspaceId);
  if (!workspace) {
    throw new AuthError("forbidden", "Workspace was not found for this account.", 404);
  }

  return {
    statusCode: 200,
    body: {
      workspace: {
        id: workspace.organization.id,
        name: workspace.organization.name,
        legalName: workspace.organization.legalName ?? null,
        logoDataUrl: workspace.organization.logoDataUrl ?? null,
        countryCode: workspace.organization.primaryCountryCode ?? null,
        billingStatus: workspace.organization.billingStatus,
        membershipStatus: workspace.membership.status,
        roles: workspace.roleKeys,
        active: workspace.organization.id === session.session.activeOrganizationId
      }
    }
  };
};

export const productUpdateWorkspaceRoute = async (
  workspaceId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: session.user.id,
    organizationId: workspaceId,
    allowedRoles: ["owner", "org_admin"]
  });

  const patch = {
    name: safeString(body, "name"),
    legalName: optionalNullableString(body, "legalName"),
    primaryCountryCode: optionalNullableString(body, "countryCode") ?? optionalNullableString(body, "primaryCountryCode"),
    headquartersCountryCode: optionalNullableString(body, "headquartersCountryCode"),
    logoDataUrl: optionalNullableString(body, "logoDataUrl")
  };
  if (Object.values(patch).every((value) => value === undefined)) {
    throw new AuthError("invalid_request", "At least one workspace field must be provided.", 400);
  }

  return {
    statusCode: 200,
    body: await services.organizations.updateOrganization({
      actorUserId: session.user.id,
      organizationId: workspaceId,
      ...patch,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const productUnsupportedWriteRoute = (message: string): JsonResult => ({
  statusCode: 409,
  body: {
    error: {
      code: "not_available",
      message
    }
  }
});

export const productListCustomersRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  const partners = await services.partners.listPartnersForUser(session.user.id);
  const portfolios = await Promise.all(
    partners.partners.map(async (entry) => ({
      partner: entry.partner,
      membership: entry.membership,
      portfolio: await services.partners.listPartnerPortfolio({
        actorUserId: session.user.id,
        partnerId: entry.partner.id
      })
    }))
  );

  return {
    statusCode: 200,
    body: {
      customers: portfolios.flatMap((entry) =>
        entry.portfolio.grants.map((grant) => ({
          id: grant.organizationId,
          name: grant.organization?.name ?? grant.organizationId,
          legalName: grant.organization?.legalName ?? null,
          countryCode: grant.organization?.primaryCountryCode ?? null,
          partnerId: entry.partner.id,
          partnerName: entry.partner.name,
          grantLevel: grant.grantLevel,
          status: grant.status,
          snapshot: grant.snapshot
        }))
      )
    }
  };
};

export const productCreateCustomerRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  const partners = await services.partners.listPartnersForUser(session.user.id);
  const partnerId = safeString(body, "partnerId") ?? partners.partners[0]?.partner.id;
  if (!partnerId) {
    throw new AuthError("invalid_request", "Create or select a partner before adding customers.", 400);
  }

  return {
    statusCode: 201,
    body: await services.partners.createCustomerForPartner({
      actorUserId: session.user.id,
      partnerId,
      name: requireBodyString(body, "name", "Customer name"),
      legalName: safeString(body, "legalName") ?? null,
      primaryCountryCode: safeString(body, "countryCode") ?? safeString(body, "primaryCountryCode") ?? "RO",
      accessLevel: (safeString(body, "accessLevel") as "admin" | "analyst" | "viewer" | undefined) ?? "admin",
      context
    })
  };
};

export const productImpersonateCustomerRoute = async (
  customerId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  const partners = await services.partners.listPartnersForUser(session.user.id);
  const partnerId = safeString(body, "partnerId") ?? partners.partners[0]?.partner.id;
  if (!partnerId) {
    throw new AuthError("invalid_request", "Select a partner before opening a customer workspace.", 400);
  }

  return {
    statusCode: 201,
    body: await services.partners.startTenantAccess({
      actorUserId: session.user.id,
      partnerId,
      organizationId: customerId,
      reason: requireBodyString(body, "reason", "Customer access reason"),
      context
    })
  };
};

export const productListCountryPacksRoute = async (): Promise<JsonResult> => {
  const result = await listNis2CountryPacksRoute();
  const body = result.body as { countryPacks?: Array<Record<string, unknown>>; frameworkKey?: string };
  return {
    statusCode: 200,
    body: {
      frameworkKey: body.frameworkKey ?? "nis2",
      countryPacks: (body.countryPacks ?? [])
        .filter((pack) => ["RO", "PL", "DE"].includes(String(pack.countryCode)))
        .map((pack) => ({
          countryCode: pack.countryCode,
          name: pack.displayName,
          status: pack.status,
          version: pack.packVersion,
          reportLanguage: pack.reportLanguage
        }))
    }
  };
};

export const productGetCountryPackRoute = async (countryCode: string): Promise<JsonResult> => getNis2CountryPackRoute(countryCode);

export const productOnboardingSchemaRoute = async (query: URLSearchParams): Promise<JsonResult> => {
  const country = (query.get("country") ?? "RO").toUpperCase();
  return {
    statusCode: 200,
    body: customerOnboardingSchemaBody(country)
  };
};

export const productGetOnboardingAnswersRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId, organization } = await requireActiveWorkspace(cookieHeader, services);
  const countryCode = organization.primaryCountryCode ?? "RO";
  const state = await services.nis2Onboarding.getReadinessState({ organizationId, countryCode });
  return {
    statusCode: 200,
    body: {
      countryCode,
      progress: state.progress,
      answers: state.progress?.answers ?? {},
      schema: customerOnboardingSchemaBody(countryCode)
    }
  };
};

const customerOnboardingSchemaBody = (country: string) => {
  const onboardingPack = toCustomerOnboardingCountryPack(country);
  return {
    country: onboardingPack.countryCode,
    availableCountries: listSupportedNis2OnboardingCountryPacks().map((pack) => ({
      countryCode: pack.countryCode,
      displayName: pack.displayName,
      sourceReviewStatus: pack.sourceReviewStatus,
      status: pack.status
    })),
    countryPack: {
      countryCode: onboardingPack.countryCode,
      displayName: onboardingPack.displayName,
      packVersion: onboardingPack.packVersion,
      safeSourceSummary: onboardingPack.safeSourceSummary,
      sourceReviewStatus: onboardingPack.sourceReviewStatus,
      status: onboardingPack.status,
      supportedUiLanguages: onboardingPack.supportedUiLanguages,
      countryNotes: onboardingPack.countryNotes,
      classificationAdapter: {
        ...onboardingPack.classificationAdapter,
        key:
          onboardingPack.classificationAdapter.key === "ro_workbook_backed"
            ? "country_specific"
            : onboardingPack.classificationAdapter.key
      },
      notificationDraftCapabilities: onboardingPack.notificationDraftCapabilities,
      unsupportedFeatures: onboardingPack.unsupportedFeatures
    },
    countrySpecificQuestions: onboardingPack.countrySpecificQuestions,
    fields: onboardingPack.fieldDefinitions,
    screens: onboardingPack.onboardingScreens.map((screen) => ({
      ...screen,
      requiredFieldPaths: onboardingPack.fieldDefinitions
        .filter((field) => field.screenKey === screen.key && field.requiredPolicy === "required")
        .map((field) => field.key)
    })),
    serviceCatalog: onboardingPack.serviceCatalog,
    autosave: true,
    maxFieldsPerStep: 6
  };
};

export const productSaveOnboardingAnswersRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId, organization } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "compliance_manager"
  ]);
  const countryCode = safeString(body, "countryCode") ?? organization.primaryCountryCode ?? "RO";
  const answers =
    body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : body;
  const progress = await services.nis2Onboarding.saveOnboardingProgress({
    actorUserId: session.user.id,
    organizationId,
    countryCode,
    onboardingProgressId: safeString(body, "onboardingProgressId"),
    assessmentId: optionalUuidString(body, "assessmentId", "Assessment ID"),
    answers,
    completedScreens: optionalStringArray(body.completedScreens),
    currentScreen: safeString(body, "currentScreen"),
    status: safeString(body, "status") ?? "in_progress"
  });
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "onboarding_answers",
    targetId: progress.id,
    action: "product.onboarding.autosaved",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      countryCode,
      missingRequiredFieldCount: progress.missingRequiredFields.length,
      completedScreens: progress.completedScreens
    }
  });

  return {
    statusCode: 200,
    body: {
      progress,
      answers: progress.answers
    }
  };
};

export const productCompleteOnboardingRoute = async (
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId, organization } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "compliance_manager"
  ]);
  const countryCode = organization.primaryCountryCode ?? "RO";
  const result = await services.nis2Onboarding.classifyLatestOnboarding({
    actorUserId: session.user.id,
    countryCode,
    organizationId
  });
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "onboarding_answers",
    targetId: result.classificationRun.id,
    action: "product.onboarding.completed",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      countryCode,
      result: result.classification.result,
      confidence: result.classification.confidence
    }
  });

  return {
    statusCode: 201,
    body: result
  };
};

export const productRunReadinessRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId, organization } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "compliance_manager",
    "security_operator"
  ]);
  const connection = await primaryMicrosoftConnection(organizationId, services);
  const countryCode = organization.primaryCountryCode ?? "RO";
  const progress = await services.nis2Onboarding.requireLatestProgress({
    countryCode,
    organizationId
  });
  const classification = await services.nis2Onboarding.classifyLatestOnboarding({
    actorUserId: session.user.id,
    countryCode,
    organizationId
  });
  const assessmentId =
    optionalUuidString(body, "assessmentId", "Assessment ID") ??
    (isUuidString(progress.assessmentId) ? progress.assessmentId : randomUUID());
  const evidence = await services.evidence.list(organizationId);
  const result = await services.compliance.evaluateAssessment({
    organizationId,
    assessmentId,
    providerConnectionId: connection?.id,
    jurisdiction: countryCode,
    ownerUserId: session.user.id,
    countryPack: {
      countryCode,
      countryPackStatus: countryCode === "RO" ? "review_required" : "demo",
      completeness: "partial"
    }
  });
  const productGaps = buildProductReadinessGaps({
    assessmentId,
    classificationRun: classification.classificationRun,
    connection,
    countryCode,
    evidenceCount: evidence.length,
    organizationId,
    progress
  });
  const gaps = mergeGaps(result.gaps, productGaps);
  const recommendations = mergeRecommendations(
    result.recommendations as RecommendationContract[],
    productGaps.map((gap) => recommendationFromProductGap(gap))
  );
  const readinessPlan = generateReadinessPlan({
    organizationId,
    assessmentId,
    gaps,
    recommendations,
    defaultOwnerUserId: session.user.id,
    generatedAt: new Date().toISOString(),
    title: "NIS2 readiness plan"
  });
  await services.outputRepository.saveStoredAnalysis({
    organizationId,
    assessmentId,
    jurisdiction: countryCode,
    catalogVersion: result.catalogVersion,
    recordedAt: new Date().toISOString(),
    results: result.results,
    gaps,
    recommendations,
    readinessPlan,
    evidenceArtifacts: evidence
  });
  await services.dashboards.createReadinessSnapshot({
    organizationId,
    assessmentId,
    countryPackCompleteness: 50
  });
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "readiness_assessment",
    targetId: assessmentId,
    action: "product.readiness.run",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      gaps: gaps.length,
      recommendations: recommendations.length,
      providerConnectionId: connection?.id ?? null
    }
  });
  const storedAnalysis = await latestAnalysis(organizationId, services);

  return {
    statusCode: 201,
    body: {
      assessmentId,
      score: scoreFromAnalysis(storedAnalysis),
      gaps: gaps.map((gap) => {
        const gapRecord = gap as unknown as Record<string, unknown>;
        return businessGapView(gapRecord, planItemForGap(storedAnalysis, gapRecord));
      }),
      recommendations: recommendations.map((recommendation) =>
        recommendationView(recommendation as unknown as Record<string, unknown>)
      )
    }
  };
};

const buildProductReadinessGaps = (input: {
  assessmentId: string;
  classificationRun: { result: string; missingInformation: string[]; legalReviewRequired: boolean };
  connection: Awaited<ReturnType<typeof primaryMicrosoftConnection>>;
  countryCode: string;
  evidenceCount: number;
  organizationId: string;
  progress: { answers: Record<string, unknown>; missingRequiredFields: string[]; sourceVersion: string };
}): ComplianceGap[] => {
  const gaps: ComplianceGap[] = [];
  const sourceReferences = [
    {
      sourceRecordId: "puresoc-onboarding",
      label: "Saved onboarding answers",
      sourceVersion: input.progress.sourceVersion
    }
  ];
  const addGap = (key: string, summary: string, recommendedAction: string, options: {
    controlCode?: string;
    controlId?: string;
    severity?: ComplianceGap["severity"];
    status?: ComplianceGap["status"];
    missingEvidence?: string[];
    warnings?: string[];
  } = {}) => {
    gaps.push({
      id: `${input.assessmentId}:product:${key}:gap`,
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      jurisdiction: input.countryCode,
      controlId: options.controlId ?? `product.${key}`,
      controlCode: options.controlCode ?? `PURESOC-${key.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
      status: options.status ?? "needs_evidence",
      severity: options.severity ?? "medium",
      confidence: "medium",
      summary,
      findingIds: [],
      findings: [summary],
      missingEvidence: options.missingEvidence ?? [],
      recommendedActions: [recommendedAction],
      providerSignals: [],
      manualTaskIds: [],
      manualTasks: [],
      countryPackWarnings: options.warnings ?? [],
      sourceReferences
    });
  };

  if (input.progress.missingRequiredFields.some((field) => field.startsWith("company.") || field.startsWith("locations."))) {
    addGap("missing-company-data", "Required company identity or jurisdiction data is incomplete.", "Complete the company and locations onboarding screens.");
  }

  if (
    input.progress.missingRequiredFields.some((field) => field.startsWith("relationship.") || field.startsWith("article9.") || field.startsWith("scope."))
  ) {
    addGap("missing-country-scope", "Country-specific scoping answers are incomplete.", "Complete the country-specific scope screen.");
  }

  if (stringsAtPath(input.progress.answers, "scope.activities").length === 0 && stringsAtPath(input.progress.answers, "selectedServiceTypeCodes").length === 0) {
    addGap("missing-service-selection", "No relevant NIS2 services have been selected.", "Select the services that best match the organization.");
  }

  if (
    input.progress.missingRequiredFields.some(
      (field) => field.startsWith("governance.") || field.startsWith("dependencies.backup") || field.startsWith("dependencies.business") || field.startsWith("dependencies.incident")
    )
  ) {
    addGap("missing-security-baseline", "Security baseline declarations are incomplete.", "Complete governance, identity, backup, continuity, supplier, and incident-response declarations.", {
      severity: "high"
    });
  }

  if (input.evidenceCount === 0) {
    addGap("missing-declared-control-evidence", "Declared controls do not have attached evidence yet.", "Attach policies, screenshots, exports, or review notes for declared controls.", {
      missingEvidence: ["Declared control evidence"]
    });
  }

  if (!input.connection) {
    addGap("microsoft365-not-connected", "Microsoft 365 is not connected, so provider signals are unavailable.", "Connect Microsoft 365 read-only modules or keep the assessment marked as manual baseline only.", {
      severity: "high",
      status: "partial"
    });
  } else if (input.connection.status !== "connected") {
    addGap("provider-module-health", "The Microsoft 365 connector is present but not fully healthy.", "Review connector module permissions, licenses, and latest sync health.", {
      severity: "high",
      status: "partial"
    });
  }

  if (input.classificationRun.legalReviewRequired) {
    addGap("country-pack-review-required", "The selected country pack is review required for external decisions.", "Use outputs as internal readiness support until the local country pack is reviewed.", {
      controlId: "country-pack.review",
      warnings: ["Country-pack legal review required."]
    });
  }

  if (input.countryCode === "RO") {
    if (input.classificationRun.missingInformation.includes("article9") || input.progress.missingRequiredFields.some((field) => field.startsWith("article9."))) {
      addGap("ro-article9-missing", "Romania Article 9 answers are missing where they may affect classification.", "Complete Romania Article 9 scope answers before relying on the classification.");
    }
    if (!hasRequiredValueAtPath(input.progress.answers, "relationship.criticalEntityInRomaniaLaw294")) {
      addGap("ro-law294-missing", "Romania Law 294 critical-entity answer is missing.", "Confirm whether the organization is identified as a critical entity under Romanian Law 294/2024.");
    }
    if (stringsAtPath(input.progress.answers, "systems.publicIpRanges").length === 0 && stringsAtPath(input.progress.answers, "network.publicIpRanges").length === 0) {
      addGap("ro-public-ip-ranges-missing", "Public IP ranges are missing from the Romania readiness input.", "Add public IP ranges or document why they are not applicable.");
    }
    if (!hasRequiredValueAtPath(input.progress.answers, "contacts.securityName") || !hasRequiredValueAtPath(input.progress.answers, "contacts.securityEmail")) {
      addGap("ro-security-contact-missing", "Responsible security contact details are incomplete.", "Add the responsible security contact before generating review outputs.");
    }
    addGap("ro-source-review-required", "Romania country-pack source review is required.", "Keep Romania outputs in internal review until source-derived logic is approved.", {
      warnings: ["Romania country-pack source review required."]
    });
  }

  if (input.countryCode === "PL" || input.countryCode === "DE") {
    addGap("national-personalization-incomplete", `${input.countryCode} national personalization is incomplete.`, "Use the common EU baseline until a reviewed local pack is available.", {
      warnings: ["Country-pack partial demo status."]
    });
  }

  return gaps;
};

const mergeGaps = (left: readonly ComplianceGap[], right: readonly ComplianceGap[]): ComplianceGap[] => {
  const byId = new Map<string, ComplianceGap>();
  for (const gap of [...left, ...right]) {
    byId.set(gap.id, gap);
  }
  return [...byId.values()];
};

const mergeRecommendations = (
  left: readonly RecommendationContract[],
  right: readonly RecommendationContract[]
): RecommendationContract[] => {
  const byId = new Map<string, RecommendationContract>();
  for (const recommendation of [...left, ...right]) {
    byId.set(recommendation.id, recommendation);
  }
  return [...byId.values()];
};

const recommendationFromProductGap = (gap: ComplianceGap): RecommendationContract => ({
  id: `${gap.id}:recommendation`,
  organizationId: gap.organizationId,
  sourceFindingIds: gap.findingIds,
  manualTaskIds: gap.manualTaskIds,
  controlId: gap.controlId,
  jurisdiction: gap.jurisdiction,
  title: gap.recommendedActions[0] ?? "Review readiness gap",
  summary: gap.summary,
  severity: gap.severity,
  confidence: gap.confidence,
  recommendationType: gap.missingEvidence.length > 0 ? "evidence_upload" : "process",
  automationMode: "manual",
  requiredPermissions: [],
  requiredLicense: [],
  evidenceRequired: gap.missingEvidence.length > 0,
  status: "proposed",
  sourceReferences: gap.sourceReferences
});

const hasRequiredValueAtPath = (value: Record<string, unknown>, fieldPath: string): boolean => {
  const found = getPath(value, fieldPath);
  if (fieldPath === "review.legalCaveatAcknowledged") {
    return found === true;
  }
  if (Array.isArray(found)) {
    return found.length > 0;
  }
  return found !== undefined && found !== null && found !== "";
};

const stringsAtPath = (value: Record<string, unknown>, fieldPath: string): string[] => {
  const found = getPath(value, fieldPath);
  if (Array.isArray(found)) {
    return found.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  }
  if (typeof found === "string" && found.trim().length > 0) {
    return found
      .split(/[\n,;]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
};

const getPath = (value: Record<string, unknown>, fieldPath: string): unknown =>
  fieldPath.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, value);

export const productListGapsRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  const analysis = await latestAnalysis(organizationId, services);
  return {
    statusCode: 200,
    body: {
      gaps: (analysis?.gaps ?? []).map((gap) => {
        const gapRecord = gap as unknown as Record<string, unknown>;
        return businessGapView(gapRecord, planItemForGap(analysis, gapRecord));
      })
    }
  };
};

export const productUpdateGapRoute = async (
  gapId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "compliance_manager",
    "security_operator"
  ]);
  const analysis = await latestAnalysis(organizationId, services);
  if (!analysis) {
    throw new AuthError("invalid_request", "Run the gap analyzer before updating gaps.", 400);
  }
  const gapIndex = analysis.gaps.findIndex((gap) => gap.id === gapId);
  if (gapIndex < 0) {
    throw new AuthError("invalid_request", "Gap was not found for this workspace.", 404);
  }

  const requestedStatus = safeString(body, "status");
  const planStatus = safeString(body, "planStatus");
  const ownerUserId = optionalNullableString(body, "ownerUserId") ?? optionalNullableString(body, "owner");
  const dueDate = optionalNullableString(body, "dueDate");
  if (
    requestedStatus === undefined &&
    planStatus === undefined &&
    ownerUserId === undefined &&
    dueDate === undefined
  ) {
    throw new AuthError("invalid_request", "Provide a gap status, plan status, owner, or due date to update.", 400);
  }
  if (requestedStatus && !complianceStatuses.has(requestedStatus as ComplianceStatus)) {
    throw new AuthError("invalid_request", "Gap status is not supported.", 400);
  }
  if (planStatus && !readinessPlanItemStatuses.has(planStatus)) {
    throw new AuthError("invalid_request", "Plan status is not supported.", 400);
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new AuthError("invalid_request", "Due date must use YYYY-MM-DD.", 400);
  }

  const existingGap = analysis.gaps[gapIndex]!;
  const updatedGap = {
    ...existingGap,
    ...(requestedStatus ? { status: requestedStatus as ComplianceStatus } : {})
  };
  const readinessPlan = {
    ...analysis.readinessPlan,
    items: analysis.readinessPlan.items.map((item) =>
      item.controlId === existingGap.controlId || item.gapSummary === existingGap.summary
        ? {
            ...item,
            ...(planStatus ? { status: planStatus as typeof item.status } : {}),
            ...(ownerUserId !== undefined ? { ownerUserId: ownerUserId ?? undefined } : {}),
            ...(dueDate !== undefined ? { dueDate: dueDate ?? undefined } : {})
          }
        : item
    )
  };
  const results =
    requestedStatus === "accepted_risk" || requestedStatus === "not_applicable" || requestedStatus === "failing"
      ? analysis.results.map((result) =>
          result.controlId === existingGap.controlId && result.jurisdiction === existingGap.jurisdiction
            ? { ...result, status: requestedStatus as ComplianceStatus }
            : result
        )
      : analysis.results;
  const updatedAnalysis = {
    ...analysis,
    recordedAt: new Date().toISOString(),
    results,
    gaps: analysis.gaps.map((gap, index) => (index === gapIndex ? updatedGap : gap)),
    readinessPlan
  };
  await services.outputRepository.saveStoredAnalysis(updatedAnalysis);
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "compliance_gap",
    targetId: gapId,
    action: "product.gap.updated",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      status: updatedGap.status,
      planStatus: planStatus ?? null,
      ownerUserId: ownerUserId ?? null,
      dueDate: dueDate ?? null
    }
  });

  return {
    statusCode: 200,
    body: {
      gap: businessGapView(
        updatedGap as unknown as Record<string, unknown>,
        readinessPlan.items.find(
          (item) => item.controlId === existingGap.controlId || item.gapSummary === existingGap.summary
        ) as unknown as Record<string, unknown> | undefined
      ),
      readinessPlan: {
        id: readinessPlan.id,
        updatedItems: readinessPlan.items.filter(
          (item) => item.controlId === existingGap.controlId || item.gapSummary === existingGap.summary
        )
      }
    }
  };
};

export const productListRecommendationsRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  const analysis = await latestAnalysis(organizationId, services);
  return {
    statusCode: 200,
    body: {
      recommendations: (analysis?.recommendations ?? []).map((recommendation) =>
        recommendationView(recommendation as unknown as Record<string, unknown>)
      )
    }
  };
};

export const productMicrosoft365OverviewRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  const connection = await primaryMicrosoftConnection(organizationId, services);
  const health = connection
    ? await services.microsoft365ProviderConnections.getHealth(organizationId, connection.id)
    : null;
  return {
    statusCode: 200,
    body: {
      overview: {
        connected: Boolean(connection),
        connection,
        health,
        writeActionsEnabled: connection?.writeEnabled === true,
        writeActionsPolicy: "Preview, approval, execution, audit, and rollback guidance are required before writes."
      }
    }
  };
};

export const productMicrosoft365SnapshotRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  const connection = await primaryMicrosoftConnection(organizationId, services);
  const resources = connection
    ? await services.providerConnections.store.listNormalizedResources(organizationId, connection.id)
    : [];
  return {
    statusCode: 200,
    body: {
      snapshot: {
        connectionId: connection?.id ?? null,
        resources: resources.map((resource) => ({
          id: resource.id,
          resourceType: resource.resourceType,
          displayName:
            typeof resource.normalizedJson.displayName === "string"
              ? resource.normalizedJson.displayName
              : resource.externalId,
          collectedAt: resource.lastSeenAt
        }))
      }
    }
  };
};

export const productMicrosoft365FindingsRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  const connection = await primaryMicrosoftConnection(organizationId, services);
  const findings = connection ? await services.providerConnections.store.listFindings(organizationId, connection.id) : [];
  return {
    statusCode: 200,
    body: {
      findings: findings.map((finding) => ({
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        status: finding.status,
        resourceType: finding.resourceType,
        resourceDisplayName:
          typeof finding.evidence.resourceDisplayName === "string" ? finding.evidence.resourceDisplayName : null,
        recommendation:
          typeof finding.evidence.recommendation === "string" ? finding.evidence.recommendation : finding.summary
      }))
    }
  };
};

export const productMicrosoft365SyncRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "security_operator"
  ]);
  const providerConnectionId = safeString(body, "providerConnectionId") ?? (await primaryMicrosoftConnection(organizationId, services))?.id;
  if (!providerConnectionId) {
    throw new AuthError("invalid_request", "Connect Microsoft 365 before running sync.", 400);
  }

  return {
    statusCode: 202,
    body: await services.microsoft365ProviderConnections.runSync({
      organizationId,
      actorUserId: session.user.id,
      providerConnectionId,
      requestedModules: optionalStringArray(body.requestedModules),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const productMicrosoft365DisconnectRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, ["owner", "org_admin"]);
  const providerConnectionId = safeString(body, "providerConnectionId") ?? (await primaryMicrosoftConnection(organizationId, services))?.id;
  if (!providerConnectionId) {
    throw new AuthError("invalid_request", "Microsoft 365 is not connected.", 400);
  }

  return {
    statusCode: 200,
    body: await services.microsoft365ProviderConnections.disconnect({
      organizationId,
      actorUserId: session.user.id,
      providerConnectionId,
      reason: safeString(body, "reason"),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const productListConnectorsRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  const connections = await services.providerConnections.listConnections(organizationId);
  const microsoft365 = connections.connections.find((connection) => connection.providerKey === "microsoft365");
  return {
    statusCode: 200,
    body: {
      connectors: [
        {
          providerKey: "microsoft365",
          name: "Microsoft 365",
          status: microsoft365?.status ?? "not_connected",
          connectionId: microsoft365?.id ?? null,
          active: Boolean(microsoft365)
        },
        { providerKey: "google_workspace", name: "Google Workspace", status: "coming_later", connectionId: null, active: false },
        { providerKey: "backup_logs", name: "Backup and log sources", status: "coming_later", connectionId: null, active: false }
      ]
    }
  };
};

export const productMicrosoft365ConnectorRoute = productMicrosoft365OverviewRoute;

export const productMicrosoft365ConnectRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, ["owner", "org_admin"]);
  return {
    statusCode: 201,
    body: await services.microsoft365ProviderConnections.beginConsent({
      organizationId,
      actorUserId: session.user.id,
      redirectUri: requireBodyString(body, "redirectUri", "Redirect URI"),
      requestedPermissionBundles: optionalStringArray(body.requestedPermissionBundles),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const productMicrosoft365CallbackRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, ["owner", "org_admin"]);
  const tenantId = safeString(body, "tenant") ?? safeString(body, "tenantId");
  if (!tenantId) {
    throw new AuthError("invalid_request", "Microsoft 365 tenant is required.", 400);
  }

  return {
    statusCode: 200,
    body: await services.microsoft365ProviderConnections.completeConsent({
      organizationId,
      actorUserId: session.user.id,
      state: requireBodyString(body, "state", "Microsoft 365 state"),
      tenantId,
      adminConsent: safeBoolean(body, "admin_consent") ?? safeBoolean(body, "adminConsent") ?? false,
      redirectUri: safeString(body, "redirectUri"),
      authorizationCode: safeString(body, "code") ?? safeString(body, "authorizationCode"),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const productListEvidenceRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  return {
    statusCode: 200,
    body: {
      evidence: (await services.evidence.list(organizationId)).map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        sourceType: artifact.sourceType,
        mimeType: artifact.mimeType,
        scanStatus: artifact.scanStatus,
        createdAt: artifact.createdAt,
        controlId: artifact.controlId ?? null
      }))
    }
  };
};

export const productCreateEvidenceRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "compliance_manager",
    "security_operator"
  ]);
  return {
    statusCode: 201,
    body: await services.evidence.upload({
      organizationId,
      actorUserId: session.user.id,
      title: requireBodyString(body, "title", "Evidence title"),
      content: requireBodyString(body, "content", "Evidence content"),
      mimeType: safeString(body, "mimeType") ?? "text/plain",
      sourceType: "manual_upload",
      controlId: safeString(body, "controlId"),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  };
};

export const productListReportsRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  const evidence = await services.evidence.list(organizationId);
  return {
    statusCode: 200,
    body: {
      reports: evidence.filter((artifact) => artifact.sourceType === "generated_report").map((artifact) =>
        reportView(artifact as unknown as Record<string, unknown>)
      )
    }
  };
};

export const productCreateReportRoute = async (
  reportKind: "gap-list" | "m365-posture" | "nis2-summary",
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const { session, organization, organizationId } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "compliance_manager",
    "auditor"
  ]);
  const assessmentId = safeString(body, "assessmentId") ?? (await latestAnalysis(organizationId, services))?.assessmentId;
  if (!assessmentId) {
    throw new AuthError("invalid_request", "Run the gap analyzer before generating reports.", 400);
  }

  const reportBranding = reportBrandingForOrganization(organization);

  if (reportKind === "gap-list") {
    const result = await services.reports.buildGapReportPdf({
      organizationId,
      actorUserId: session.user.id,
      assessmentId,
      reportBranding,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      statusCode: 201,
      body: pdfReportCreationView(result)
    };
  }

  const isPostureReport = reportKind === "m365-posture";
  const result = await services.reports.buildInternalReadinessPdfReport({
    organizationId,
    actorUserId: session.user.id,
    assessmentId,
    reportType: isPostureReport ? "provider_posture" : "executive_summary",
    template: isPostureReport ? "gap_report" : "executive_summary",
    title: isPostureReport ? "Microsoft 365 Posture Report" : "NIS2 Readiness Summary",
    filenamePrefix: isPostureReport ? "puresoc-microsoft365-posture" : "puresoc-readiness-summary",
    reportBranding,
    versionContext: {
      triggerType: isPostureReport ? "microsoft_sync_completed" : "onboarding_completed"
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return {
    statusCode: 201,
    body: pdfReportCreationView(result)
  };
};

export const productDownloadReportRoute = async (
  reportId: string,
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<BinaryResult> => {
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "compliance_manager",
    "auditor"
  ]);
  const result = await services.reports.downloadGeneratedReportPdf({
    organizationId,
    reportId,
    actorUserId: session.user.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return {
    kind: "binary",
    statusCode: 200,
    body: result.pdf.body,
    headers: {
      "content-type": result.pdf.mimeType,
      "content-disposition": `attachment; filename="${result.pdf.filename}"`,
      "x-content-hash-sha256": result.pdf.contentHashSha256
    }
  };
};

export const productListRemediationRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  return {
    statusCode: 200,
    body: {
      actions: (await services.actionsRepository.listActionRuns(organizationId)).map((run) => ({
        id: run.id,
        title: run.title,
        area: run.moduleKey ?? run.controlId,
        risk: run.riskLevel,
        effort: run.automationMode === "manual" ? "manual" : "medium",
        approvalState: run.approval.status,
        executionState: run.status,
        dryRunOnly: !run.highRiskForbiddenInV1 && run.automationMode !== "manual" ? !run.workerJob : true,
        expectedChange: run.expectedChange,
        rollbackGuidance: run.rollbackStrategy
      }))
    }
  };
};

export const productRemediationTransitionRoute = async (
  actionRunId: string,
  transition: "preview" | "approve" | "execute",
  cookieHeader: string | undefined,
  context: ProductWriteContext,
  services: ApiServices
): Promise<JsonResult> => {
  const allowedRoles =
    transition === "approve"
      ? (["owner", "org_admin", "remediation_approver"] as const)
      : (["owner", "org_admin", "compliance_manager", "security_operator"] as const);
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, allowedRoles);
  const run = await services.actionsRepository.findActionRunForOrganization({ organizationId, actionRunId });
  if (!run) {
    throw new AuthError("invalid_request", "Remediation action was not found for this workspace.", 404);
  }

  if (transition === "preview") {
    const connection = await services.providerConnections.store.getConnectionForOrganization(
      organizationId,
      run.providerConnectionId
    );
    const executableBlocked = run.highRiskForbiddenInV1 && run.automationMode === "executable_later";
    const preview = await services.actions.recordPreflight({
      organizationId,
      actionRunId,
      actorUserId: session.user.id,
      context,
      result: {
        status: executableBlocked ? "failed" : "passed",
        checks: [
          {
            code: "provider_connection_available",
            status: connection.status === "connected" || connection.status === "degraded" ? "passed" : "warning",
            message: "Provider connection state is available for preview."
          },
          {
            code: "write_execution_policy",
            status: run.automationMode === "executable_later" && !connection.writeEnabled ? "warning" : "passed",
            message:
              run.automationMode === "executable_later" && !connection.writeEnabled
                ? "Execution will remain blocked until Microsoft 365 write access is explicitly enabled."
                : "This action can proceed through the approval workflow."
          }
        ],
        diff: {
          summary: run.expectedChange,
          changes: [
            {
              field: "expectedChange",
              after: run.expectedChange
            },
            {
              field: "rollbackOrManualFallback",
              after: run.rollbackStrategy || run.manualFallback
            }
          ]
        },
        requiredPermissions: run.permissionsRequired,
        requiredLicense: run.licenseRequired,
        canRequestApproval: !executableBlocked
      }
    });

    return {
      statusCode: 200,
      body: {
        actionRun: safeActionRunView(preview),
        preview: preview.preflightResult
      }
    };
  }

  if (transition === "approve") {
    const requested =
      run.approval.status === "requested" || run.approval.status === "approved"
        ? run
        : await services.actions.requestApproval({
            organizationId,
            actionRunId,
            actorUserId: session.user.id,
            context
          });
    const approved =
      requested.approval.status === "approved"
        ? requested
        : await services.actions.approve({
            organizationId,
            actionRunId,
            actorUserId: session.user.id,
            context
          });

    return {
      statusCode: 200,
      body: {
        actionRun: safeActionRunView(approved)
      }
    };
  }

  const connection = await services.providerConnections.store.getConnectionForOrganization(
    organizationId,
    run.providerConnectionId
  );
  const queued = await services.actions.queue({
    organizationId,
    actionRunId,
    actorUserId: session.user.id,
    providerConnectionWriteEnabled: connection.writeEnabled,
    context
  });

  return {
    statusCode: 202,
    body: {
      actionRun: safeActionRunView(queued.run),
      workerJob: queued.job
    }
  };
};

export const productAuditRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const { organizationId } = await requireActiveWorkspace(cookieHeader, services);
  return {
    statusCode: 200,
    body: {
      audit: {
        checkpoints: await services.auditCheckpoints.listCheckpoints({ organizationId }),
        note: "Audit details are tamper-evident database records. External WORM/notarization remains a deployment decision."
      }
    }
  };
};

export const asApiResult = (result: JsonResult): ApiResult => result;
