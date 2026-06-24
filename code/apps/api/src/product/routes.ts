import { AuthError, type PureSocRoleKey } from "@puresoc/auth-core";
import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import type { ApiServices } from "../auth/services";
import { listNis2CountryPacksRoute, getNis2CountryPackRoute } from "../compliance/nis2/routes";
import type { ApiResult, JsonResult, RequestContext } from "../http";
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

const businessGapView = (gap: Record<string, unknown>) => ({
  id: String(gap.id ?? ""),
  title: String(gap.title ?? gap.summary ?? "Readiness gap"),
  controlArea: String(gap.controlArea ?? gap.controlId ?? "NIS2 readiness"),
  severity: String(gap.severity ?? "medium"),
  source: String(gap.source ?? gap.sourceType ?? "readiness_engine"),
  businessImpact: String(gap.businessImpact ?? gap.summary ?? "This gap reduces confidence in the readiness baseline."),
  recommendedAction: String(gap.recommendedAction ?? "Review the control and attach evidence or remediation notes."),
  status: String(gap.status ?? "open"),
  owner: typeof gap.ownerUserId === "string" ? gap.ownerUserId : null,
  dueDate: typeof gap.dueDate === "string" ? gap.dueDate : null,
  relatedEvidence: Array.isArray(gap.evidenceArtifactIds) ? gap.evidenceArtifactIds : [],
  relatedConnectorFinding: typeof gap.providerFindingId === "string" ? gap.providerFindingId : null
});

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
  const gaps = (analysis?.gaps ?? []).map((gap) => businessGapView(gap as unknown as Record<string, unknown>));
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

export const productUnsupportedWriteRoute = (message: string): JsonResult => ({
  statusCode: 409,
  body: {
    error: {
      code: "not_available_in_current_runtime",
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

  return {
    statusCode: 201,
    body: {
      assessmentId,
      score: scoreFromAnalysis(await latestAnalysis(organizationId, services)),
      gaps: result.gaps.map((gap) => businessGapView(gap as unknown as Record<string, unknown>)),
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
      gaps: (analysis?.gaps ?? []).map((gap) => businessGapView(gap as unknown as Record<string, unknown>))
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
