import { AuthError, type PureSocRoleKey } from "@puresoc/auth-core";
import type { ComplianceStatus } from "@puresoc/compliance-core";
import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import type { ApiServices } from "../auth/services";
import { listNis2CountryPacksRoute, getNis2CountryPackRoute } from "../compliance/nis2/routes";
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
  const organization = organizationRows.find((row) => row.organization.id === organizationId)?.organization;
  if (!organization) {
    throw new AuthError("forbidden", "The selected workspace is not available to this session.", 404);
  }

  return {
    session,
    organization,
    organizationId
  };
};

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

const reportView = (artifact: Record<string, unknown>) => ({
  id: String(artifact.id ?? ""),
  title: String(artifact.title ?? "Generated report"),
  format: String(artifact.mimeType ?? "application/json"),
  status: "ready",
  createdAt: String(artifact.createdAt ?? ""),
  downloadHref: `/reports/generated/${encodeURIComponent(String(artifact.id ?? ""))}/pdf?format=pdf`
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
    headquartersCountryCode: optionalNullableString(body, "headquartersCountryCode")
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
  const pack = await getNis2CountryPackRoute(country);
  return {
    statusCode: 200,
    body: {
      country,
      countryPack: (pack.body as { countryPack: unknown }).countryPack,
      sections: [
        "company_profile",
        "contacts_responsibility",
        "industry_services",
        "size_structure",
        "systems_data",
        "security_practices",
        "compliance_context",
        "review"
      ],
      autosave: true,
      maxFieldsPerStep: 7
    }
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
      answers: state.progress?.answers ?? {}
    }
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
    assessmentId: safeString(body, "assessmentId") ?? preferredAssessmentId(organizationId),
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
  const assessmentId = safeString(body, "assessmentId") ?? preferredAssessmentId(organizationId);
  const result = await services.compliance.evaluateAssessment({
    organizationId,
    assessmentId,
    providerConnectionId: connection?.id,
    jurisdiction: organization.primaryCountryCode ?? "EU",
    ownerUserId: session.user.id,
    countryPack: {
      countryCode: organization.primaryCountryCode ?? "RO",
      countryPackStatus: organization.primaryCountryCode === "RO" ? "review_required" : "demo",
      completeness: "partial"
    }
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
      gaps: result.gaps.length,
      recommendations: result.recommendations.length,
      providerConnectionId: connection?.id ?? null
    }
  });
  const storedAnalysis = await latestAnalysis(organizationId, services);

  return {
    statusCode: 201,
    body: {
      assessmentId,
      score: scoreFromAnalysis(storedAnalysis),
      gaps: result.gaps.map((gap) => {
        const gapRecord = gap as unknown as Record<string, unknown>;
        return businessGapView(gapRecord, planItemForGap(storedAnalysis, gapRecord));
      }),
      recommendations: result.recommendations.map((recommendation) =>
        recommendationView(recommendation as unknown as Record<string, unknown>)
      )
    }
  };
};

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
  const { session, organizationId } = await requireActiveWorkspace(cookieHeader, services, [
    "owner",
    "org_admin",
    "compliance_manager",
    "auditor"
  ]);
  const assessmentId = safeString(body, "assessmentId") ?? (await latestAnalysis(organizationId, services))?.assessmentId;
  if (!assessmentId) {
    throw new AuthError("invalid_request", "Run the gap analyzer before generating reports.", 400);
  }

  if (reportKind === "gap-list") {
    return {
      statusCode: 201,
      body: await services.reports.buildInternalReadinessCsvExport({
        organizationId,
        actorUserId: session.user.id,
        assessmentId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      })
    };
  }

  return {
    statusCode: 201,
    body: await services.reports.buildInternalReadinessReport({
      organizationId,
      actorUserId: session.user.id,
      assessmentId,
      versionContext: {
        triggerType: reportKind === "m365-posture" ? "microsoft_sync_completed" : "onboarding_completed"
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
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
