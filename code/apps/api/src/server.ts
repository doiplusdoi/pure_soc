import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { AuthError } from "@puresoc/auth-core";
import { validateConfigForStartup } from "@puresoc/config";
import { ApiMetricsRegistry, getApiHealth, renderApiMetricsPrometheus } from "./health";
import {
  beginOidcAuthorizationRoute,
  completeOidcCallbackRoute,
  loginRoute,
  logoutRoute,
  registerRoute,
  selectActiveOrganizationRoute,
  sessionRoute,
  verifyEmailRoute
} from "./auth/routes";
import {
  classifyNis2CountryPackRoute,
  countryPackStatusRoute,
  getNis2CountryPackRoute,
  listNis2CountryPacksRoute
} from "./compliance/nis2/routes";
import { evaluateComplianceAssessmentRoute } from "./compliance/routes";
import {
  roNis2ClassificationRoute,
  classifyOrganizationRoNis2OnboardingRoute,
  createOrganizationRoNis2NotificationDraftFromOnboardingRoute,
  getOrganizationRoNis2OnboardingRoute,
  roNis2NotificationDraftRoute,
  roNis2OnboardingProgressRoute,
  roNis2OnboardingSchemaRoute,
  saveOrganizationRoNis2OnboardingRoute
} from "./compliance/nis2/ro";
import {
  buildOrganizationNis2OnboardingReportRoute,
  classifyOrganizationNis2OnboardingRoute,
  getOrganizationNis2OnboardingRoute,
  saveOrganizationNis2OnboardingRoute
} from "./compliance/nis2/onboarding-routes";
import { createApiServices, type ApiServices } from "./auth/services";
import { parseJsonBody, parseRawBody, sendApiResult, sendJson, toJsonResultError, type ApiResult, type JsonResult } from "./http";
import { createApiMiddleware, type ApiRequestContext, type ApiRouteFamily } from "./middleware";
import {
  acceptOrganizationInvitationRoute,
  createOrganizationInvitationRoute,
  createOrganizationRoute,
  listOrganizationMembersRoute,
  listOrganizationsRoute
} from "./organizations/routes";
import {
  createMockProviderConnectionRoute,
  listProviderConnectionsRoute,
  runProviderSyncRoute
} from "./provider-connections/routes";
import {
  beginMicrosoft365ConsentRoute,
  completeMicrosoft365ConsentRoute,
  getMicrosoft365ConnectionHealthRoute,
  runMicrosoft365SyncRoute
} from "./provider-connections/microsoft365/routes";
import { generateRecommendationsRoute } from "./recommendations/routes";
import {
  createNotificationDraftRoute,
  getNotificationDraftRoute,
  listNotificationDraftsRoute
} from "./compliance/nis2/notification-drafts/routes";
import { downloadEvidenceRoute, listEvidenceRoute, uploadEvidenceRoute } from "./evidence/routes";
import {
  activateRegulatorySourceVersionRoute,
  listRegulatoryReviewTasksRoute,
  markRegulatoryReviewTaskReviewedRoute,
  readRegulatorySourceMapTraceabilityRoute,
  rejectRegulatoryReviewTaskRoute
} from "./regulatory-sources/routes";
import {
  buildInternalReadinessCsvExportRoute,
  buildInternalReadinessEvidencePackageRoute,
  buildInternalReadinessReportRoute,
  buildMicrosoft365VerifiedInternalReadinessReportRoute,
  buildRomaniaNotificationDraftReportRoute,
  downloadGeneratedReportPdfRoute,
  downloadGapReportPdfRoute,
  downloadRomaniaNotificationDraftPdfRoute
} from "./reports/routes";
import { createDashboardSnapshotRoute, getLatestDashboardSnapshotRoute, listDashboardSnapshotsRoute } from "./dashboards/routes";
import {
  createBillingCheckoutSessionRoute,
  createBillingPortalSessionRoute,
  listBillingEntitlementsRoute,
  stripeBillingWebhookRoute
} from "./billing/routes";
import {
  approveActionRunRoute,
  attachActionSnapshotRoute,
  closeActionRunRoute,
  createActionRunRoute,
  createProviderActionPreflightRoute,
  executeProviderActionRunRoute,
  failActionRunRoute,
  getProviderActionRunRoute,
  approveProviderActionRunRoute,
  queueActionRunRoute,
  recordActionPreflightRoute,
  requestActionApprovalRoute,
  verifyActionRunRoute
} from "./actions/routes";
import {
  assertAuditCheckpointRequestBody,
  exportAuditSegmentRoute,
  listAuditCheckpointsRoute,
  recordAuditCheckpointRoute
} from "./audit/routes";
import {
  acknowledgeNotificationOperatorAlertRoute,
  createNotificationChannelRoute,
  deleteNotificationChannelRoute,
  listNotificationChannelsRoute,
  listNotificationLogsRoute,
  listNotificationOperatorAlertsRoute,
  sendNotificationChannelTestRoute,
  updateNotificationChannelRoute
} from "./notifications/routes";
import {
  createPartnerCustomerRoute,
  createPartnerRoute,
  exitTenantAccessRoute,
  getCurrentTenantAccessRoute,
  listPartnerPortfolioRoute,
  listPartnersRoute,
  startTenantAccessRoute
} from "./partners/routes";
import {
  productAuditRoute,
  productCompleteOnboardingRoute,
  productCreateCustomerRoute,
  productCreateEvidenceRoute,
  productCreateRemediationRoute,
  productCreateReportRoute,
  productCreateWorkspaceRoute,
  productDashboardRoute,
  productDownloadReportRoute,
  productGetCountryPackRoute,
  productGetOnboardingAnswersRoute,
  productGetWorkspaceRoute,
  productImpersonateCustomerRoute,
  productListConnectorsRoute,
  productListCountryPacksRoute,
  productListCustomersRoute,
  productListEvidenceRoute,
  productListGapsRoute,
  productListRecommendationsRoute,
  productListRemediationRoute,
  productListReportsRoute,
  productListWorkspacesRoute,
  productMicrosoft365CallbackRoute,
  productMicrosoft365ConnectRoute,
  productMicrosoft365ConnectorRoute,
  productMicrosoft365DisconnectRoute,
  productMicrosoft365FindingsRoute,
  productMicrosoft365OverviewRoute,
  productMicrosoft365SnapshotRoute,
  productMicrosoft365SyncRoute,
  productOnboardingSchemaRoute,
  productRemediationTransitionRoute,
  productRunReadinessRoute,
  productSaveOnboardingAnswersRoute,
  productUnsupportedWriteRoute,
  productUpdateGapRoute,
  productUpdateWorkspaceRoute
} from "./product/routes";
import {
  productV1AggregateRoute,
  productV1AggregateUpdateRoute,
  productV1BusinessServicesRoute,
  productV1CountryPacksRoute,
  productV1CreateOrganizationRoute,
  productV1CreateRelationshipInvitationRoute,
  productV1EndSupportSessionRoute,
  productV1DeleteFileObjectRoute,
  productV1DownloadReportSnapshotRoute,
  productV1FileObjectLegalHoldRoute,
  productV1FileObjectsRoute,
  productV1GetOperationRoute,
  productV1GetSetupRoute,
  productV1InternalEventPublishResultRoute,
  productV1InternalEventsRoute,
  productV1ListOrganizationsRoute,
  productV1MeRoute,
  productV1Microsoft365DisconnectRoute,
  productV1Microsoft365SyncRunRoute,
  productV1NotificationPreferencesRoute,
  productV1NotificationUpdateRoute,
  productV1NotificationsRoute,
  productV1OpenApiRoute,
  productV1PartnerAssignmentsRoute,
  productV1PartnerCustomerContextRoute,
  productV1ProviderCapabilitiesRoute,
  productV1RelationshipTransitionRoute,
  productV1ReportSnapshotsRoute,
  productV1ReportTemplatesRoute,
  productV1RetentionPoliciesRoute,
  productV1ResponsibilitiesRoute,
  productV1RunClassificationRoute,
  productV1SaveSetupStepRoute,
  productV1LaunchSetupRoute,
  productV1SupportSessionsRoute,
  productV1SuppliersRoute
} from "./product-v1/routes";

type ApiRouteMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

interface ApiRouteDispatchInput {
  request: IncomingMessage;
  url: URL;
  body: Record<string, unknown>;
  rawBody?: Buffer;
  context: ApiRequestContext;
  services: ApiServices;
  params: string[];
}

interface ApiRouteEntry {
  methods: readonly ApiRouteMethod[];
  pattern: RegExp;
  routeFamily: ApiRouteFamily;
  rawBody?: boolean;
  handler: (input: ApiRouteDispatchInput) => ApiResult | Promise<ApiResult>;
}

const route = (
  methods: ApiRouteMethod | readonly ApiRouteMethod[],
  pattern: RegExp,
  routeFamily: ApiRouteFamily,
  handler: ApiRouteEntry["handler"],
  options: Pick<ApiRouteEntry, "rawBody"> = {}
): ApiRouteEntry => ({
  methods: Array.isArray(methods) ? methods : [methods],
  pattern,
  routeFamily,
  handler,
  ...options
});

export const apiRouteTable: readonly ApiRouteEntry[] = [
  route("POST", /^\/billing\/stripe\/webhook$/, "webhook", ({ rawBody, request, context, services }) =>
    stripeBillingWebhookRoute(rawBody ?? Buffer.alloc(0), request.headers["stripe-signature"], context, services), {
      rawBody: true
    }),
  route("GET", /^\/api\/v1\/openapi\.json$/, "public_read", () => productV1OpenApiRoute()),
  route("GET", /^\/api\/v1\/me$/, "tenant_read", ({ request, services }) =>
    productV1MeRoute(request.headers.cookie, services)),
  route("GET", /^\/api\/v1\/organizations$/, "tenant_read", ({ url, request, services }) =>
    productV1ListOrganizationsRoute(url.searchParams, request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organizations$/, "organization", ({ body, request, context, services }) =>
    productV1CreateOrganizationRoute(body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/setup$/, "tenant_read", ({ params, request, services }) =>
    productV1GetSetupRoute(params[0] ?? "", request.headers.cookie, services)),
  route("PUT", /^\/api\/v1\/organizations\/([^/]+)\/setup\/([^/]+)$/, "organization", ({ params, body, request, context, services }) =>
    productV1SaveSetupStepRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/setup\/launch$/, "organization", ({ params, request, context, services }) =>
    productV1LaunchSetupRoute(params[0] ?? "", request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/organizations\/([^/]+)\/business-services$/, "organization", ({ params, url, body, request, context, services }) =>
    productV1BusinessServicesRoute(params[0] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/organizations\/([^/]+)\/responsibilities$/, "organization", ({ params, url, body, request, context, services }) =>
    productV1ResponsibilitiesRoute(params[0] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/organizations\/([^/]+)\/suppliers$/, "organization", ({ params, url, body, request, context, services }) =>
    productV1SuppliersRoute(params[0] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route("POST", /^\/api\/v1\/partners\/([^/]+)\/customer-invitations$/, "partner", ({ params, body, request, context, services }) =>
    productV1CreateRelationshipInvitationRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/partners\/([^/]+)\/assignments$/, "partner", ({ params, url, body, request, context, services }) =>
    productV1PartnerAssignmentsRoute(params[0] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/partners\/([^/]+)\/customers\/([^/]+)\/context$/, "partner", ({ params, request, services }) =>
    productV1PartnerCustomerContextRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organization-relationships\/([^/]+)\/(accept|suspend|request-termination|terminate)$/, "organization", ({ params, request, context, services }) =>
    productV1RelationshipTransitionRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/support-sessions$/, "organization", ({ url, body, request, context, services }) =>
    productV1SupportSessionsRoute(url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route("POST", /^\/api\/v1\/support-sessions\/([^/]+)\/end$/, "organization", ({ params, body, request, context, services }) =>
    productV1EndSupportSessionRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/country-packs$/, "public_read", ({ url }) =>
    productV1CountryPacksRoute(url.searchParams, null)),
  route("GET", /^\/api\/v1\/country-packs\/([^/]+)$/, "public_read", ({ url, params }) =>
    productV1CountryPacksRoute(url.searchParams, params[0] ?? "")),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/compliance\/classification\/run$/, "compliance", ({ params, body, request, services }) =>
    productV1RunClassificationRoute(params[0] ?? "", body, request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/connectors\/microsoft365\/sync-runs$/, "provider", ({ params, body, request, context, services }) =>
    productV1Microsoft365SyncRunRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/connectors\/microsoft365\/disconnect$/, "provider", ({ params, body, request, context, services }) =>
    productV1Microsoft365DisconnectRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/provider-capabilities$/, "provider", ({ params, url, request, services }) =>
    productV1ProviderCapabilitiesRoute(params[0] ?? "", url.searchParams, request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/provider-actions\/([^/]+)\/preflight$/, "actions", ({ params, body, request, context, services }) =>
    createProviderActionPreflightRoute(
      params[0] ?? "",
      params[1] ?? "",
      body,
      request.headers.cookie,
      request.headers["idempotency-key"],
      context,
      services
    )),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/provider-actions\/([^/]+)$/, "actions", ({ params, request, services }) =>
    getProviderActionRunRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/provider-actions\/([^/]+)\/approve$/, "actions", ({ params, request, context, services }) =>
    approveProviderActionRunRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/provider-actions\/([^/]+)\/execute$/, "actions", ({ params, request, context, services }) =>
    executeProviderActionRunRoute(
      params[0] ?? "",
      params[1] ?? "",
      request.headers.cookie,
      request.headers["idempotency-key"],
      context,
      services
    )),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/internal-events$/, "tenant_read", ({ params, url, request, services }) =>
    productV1InternalEventsRoute(params[0] ?? "", url.searchParams, request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/internal-events\/([^/]+)\/publish-result$/, "organization", ({ params, body, request, context, services }) =>
    productV1InternalEventPublishResultRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/audit\/export$/, "unknown", ({ params, request, services }) =>
    exportAuditSegmentRoute(params[0] ?? "", request.headers.cookie, services)),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/audit\/checkpoints$/, "unknown", ({ params, request, services }) =>
    listAuditCheckpointsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/audit\/checkpoints$/, "unknown", ({ params, body, request, context, services }) =>
    recordAuditCheckpointRoute(
      params[0] ?? "",
      assertAuditCheckpointRequestBody(body),
      request.headers.cookie,
      context,
      services
    )),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/notification-channels$/, "tenant_read", ({ params, request, services }) =>
    listNotificationChannelsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/notification-channels$/, "organization", ({ params, body, request, context, services }) =>
    createNotificationChannelRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("PATCH", /^\/api\/v1\/organizations\/([^/]+)\/notification-channels\/([^/]+)$/, "organization", ({ params, body, request, context, services }) =>
    updateNotificationChannelRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("DELETE", /^\/api\/v1\/organizations\/([^/]+)\/notification-channels\/([^/]+)$/, "organization", ({ params, request, context, services }) =>
    deleteNotificationChannelRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/notification-channels\/([^/]+)\/test$/, "organization", ({ params, request, context, services }) =>
    sendNotificationChannelTestRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/notification-logs$/, "tenant_read", ({ params, request, services }) =>
    listNotificationLogsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/notification-operator-alerts$/, "tenant_read", ({ params, request, services }) =>
    listNotificationOperatorAlertsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/notification-operator-alerts\/([^/]+)\/acknowledge$/, "organization", ({ params, request, context, services }) =>
    acknowledgeNotificationOperatorAlertRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/organizations\/([^/]+)\/notifications$/, "organization", ({ params, url, body, request, context, services }) =>
    productV1NotificationsRoute(params[0] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route("PATCH", /^\/api\/v1\/organizations\/([^/]+)\/notifications\/([^/]+)$/, "organization", ({ params, body, request, context, services }) =>
    productV1NotificationUpdateRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route(["GET", "PUT"], /^\/api\/v1\/organizations\/([^/]+)\/notification-preferences$/, "organization", ({ params, body, request, context, services }) =>
    productV1NotificationPreferencesRoute(params[0] ?? "", body, request.method ?? "GET", request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/organizations\/([^/]+)\/(assets|findings|remediation-plans|tasks|incidents|risks|policies|supplier-reviews|policy-reviews|policy-acknowledgements|governance-activities|governance-calendar-events|attestations|training-records)$/, "organization", ({ params, url, body, request, context, services }) =>
    productV1AggregateRoute(params[0] ?? "", params[1] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route("PATCH", /^\/api\/v1\/organizations\/([^/]+)\/(findings|remediation-plans|tasks|incidents|risks|policies|supplier-reviews|policy-reviews|policy-acknowledgements|governance-activities|governance-calendar-events|attestations|training-records)\/([^/]+)$/, "organization", ({ params, body, request, context, services }) =>
    productV1AggregateUpdateRoute(params[0] ?? "", params[1] ?? "", params[2] ?? "", body, request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/organizations\/([^/]+)\/retention-policies$/, "organization", ({ params, url, body, request, context, services }) =>
    productV1RetentionPoliciesRoute(params[0] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/v1\/organizations\/([^/]+)\/file-objects$/, "evidence", ({ params, url, body, request, context, services }) =>
    productV1FileObjectsRoute(params[0] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route("POST", /^\/api\/v1\/organizations\/([^/]+)\/file-objects\/([^/]+)\/legal-hold$/, "evidence", ({ params, body, request, context, services }) =>
    productV1FileObjectLegalHoldRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("DELETE", /^\/api\/v1\/organizations\/([^/]+)\/file-objects\/([^/]+)$/, "evidence", ({ params, body, request, context, services }) =>
    productV1DeleteFileObjectRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/report-templates$/, "public_read", () =>
    productV1ReportTemplatesRoute()),
  route(["GET", "POST"], /^\/api\/v1\/organizations\/([^/]+)\/report-snapshots$/, "compliance", ({ params, url, body, request, context, services }) =>
    productV1ReportSnapshotsRoute(params[0] ?? "", url.searchParams, body, request.method ?? "GET", request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/organizations\/([^/]+)\/report-snapshots\/([^/]+)\/download$/, "compliance", ({ params, request, context, services }) =>
    productV1DownloadReportSnapshotRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("GET", /^\/api\/v1\/operations\/([^/]+)$/, "tenant_read", ({ params, request, services }) =>
    productV1GetOperationRoute(params[0] ?? "", request.headers.cookie, services)),
  route("GET", /^\/api\/dashboard$/, "tenant_read", ({ request, services }) =>
    productDashboardRoute(request.headers.cookie, services)),
  route("GET", /^\/api\/workspaces$/, "tenant_read", ({ request, services }) =>
    productListWorkspacesRoute(request.headers.cookie, services)),
  route("POST", /^\/api\/workspaces$/, "organization", ({ body, request, context, services }) =>
    productCreateWorkspaceRoute(body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/workspaces\/([^/]+)$/, "tenant_read", ({ params, request, services }) =>
    productGetWorkspaceRoute(params[0] ?? "", request.headers.cookie, services)),
  route("PATCH", /^\/api\/workspaces\/([^/]+)$/, "organization", ({ params, body, request, context, services }) =>
    productUpdateWorkspaceRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/customers$/, "partner", ({ request, services }) =>
    productListCustomersRoute(request.headers.cookie, services)),
  route("POST", /^\/api\/customers$/, "partner", ({ body, request, context, services }) =>
    productCreateCustomerRoute(body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/customers\/([^/]+)$/, "partner", ({ params, request, services }) =>
    productGetWorkspaceRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/api\/customers\/([^/]+)\/impersonate$/, "partner", ({ params, body, request, context, services }) =>
    productImpersonateCustomerRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/country-packs$/, "public_read", () => productListCountryPacksRoute()),
  route("GET", /^\/api\/country-packs\/([^/]+)$/, "public_read", ({ params }) =>
    productGetCountryPackRoute(params[0] ?? "")),
  route("GET", /^\/api\/onboarding\/schema$/, "public_compliance", ({ url }) =>
    productOnboardingSchemaRoute(url.searchParams)),
  route("GET", /^\/api\/onboarding\/answers$/, "compliance", ({ request, services }) =>
    productGetOnboardingAnswersRoute(request.headers.cookie, services)),
  route("PUT", /^\/api\/onboarding\/answers$/, "compliance", ({ body, request, context, services }) =>
    productSaveOnboardingAnswersRoute(body, request.headers.cookie, context, services)),
  route("POST", /^\/api\/onboarding\/complete$/, "compliance", ({ request, context, services }) =>
    productCompleteOnboardingRoute(request.headers.cookie, context, services)),
  route("POST", /^\/api\/readiness\/run$/, "compliance", ({ body, request, context, services }) =>
    productRunReadinessRoute(body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/gaps$/, "tenant_read", ({ request, services }) =>
    productListGapsRoute(request.headers.cookie, services)),
  route("PATCH", /^\/api\/gaps\/([^/]+)$/, "compliance", ({ params, body, request, context, services }) =>
    productUpdateGapRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/recommendations$/, "tenant_read", ({ request, services }) =>
    productListRecommendationsRoute(request.headers.cookie, services)),
  route("GET", /^\/api\/microsoft365\/overview$/, "provider", ({ request, services }) =>
    productMicrosoft365OverviewRoute(request.headers.cookie, services)),
  route("GET", /^\/api\/microsoft365\/snapshot$/, "provider", ({ request, services }) =>
    productMicrosoft365SnapshotRoute(request.headers.cookie, services)),
  route("POST", /^\/api\/microsoft365\/sync$/, "provider", ({ body, request, context, services }) =>
    productMicrosoft365SyncRoute(body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/microsoft365\/findings$/, "provider", ({ request, services }) =>
    productMicrosoft365FindingsRoute(request.headers.cookie, services)),
  route("GET", /^\/api\/connectors$/, "provider", ({ request, services }) =>
    productListConnectorsRoute(request.headers.cookie, services)),
  route("GET", /^\/api\/connectors\/microsoft365$/, "provider", ({ request, services }) =>
    productMicrosoft365ConnectorRoute(request.headers.cookie, services)),
  route("POST", /^\/api\/connectors\/microsoft365\/connect$/, "provider", ({ body, request, context, services }) =>
    productMicrosoft365ConnectRoute(body, request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/api\/connectors\/microsoft365\/callback$/, "provider_callback", ({ request, url, body, context, services }) => {
    const callbackInput = request.method === "GET" ? Object.fromEntries(url.searchParams.entries()) : body;
    return productMicrosoft365CallbackRoute(callbackInput, request.headers.cookie, context, services);
  }),
  route("POST", /^\/api\/connectors\/microsoft365\/disconnect$/, "provider", ({ body, request, context, services }) =>
    productMicrosoft365DisconnectRoute(body, request.headers.cookie, context, services)),
  route("POST", /^\/api\/connectors\/microsoft365\/sync$/, "provider", ({ body, request, context, services }) =>
    productMicrosoft365SyncRoute(body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/remediation\/actions$/, "actions", ({ request, services }) =>
    productListRemediationRoute(request.headers.cookie, services)),
  route("POST", /^\/api\/remediation\/actions$/, "actions", ({ body, request, context, services }) =>
    productCreateRemediationRoute(body, request.headers.cookie, context, services)),
  route("POST", /^\/api\/remediation\/actions\/([^/]+)\/(preview|approve|execute)$/, "actions", ({ params, request, context, services }) =>
    productRemediationTransitionRoute(
      params[0] ?? "",
      (params[1] as "preview" | "approve" | "execute") ?? "preview",
      request.headers.cookie,
      context,
      services
    )),
  route("GET", /^\/api\/evidence$/, "evidence", ({ request, services }) =>
    productListEvidenceRoute(request.headers.cookie, services)),
  route("POST", /^\/api\/evidence$/, "evidence", ({ body, request, context, services }) =>
    productCreateEvidenceRoute(body, request.headers.cookie, context, services)),
  route("DELETE", /^\/api\/evidence\/([^/]+)$/, "evidence", () =>
    productUnsupportedWriteRoute("Evidence deletion is not available until retention and audit policy support are in place.")),
  route("GET", /^\/api\/reports$/, "tenant_read", ({ request, services }) =>
    productListReportsRoute(request.headers.cookie, services)),
  route("POST", /^\/api\/reports\/nis2-summary$/, "compliance", ({ body, request, context, services }) =>
    productCreateReportRoute("nis2-summary", body, request.headers.cookie, context, services)),
  route("POST", /^\/api\/reports\/gap-list$/, "compliance", ({ body, request, context, services }) =>
    productCreateReportRoute("gap-list", body, request.headers.cookie, context, services)),
  route("POST", /^\/api\/reports\/m365-posture$/, "compliance", ({ body, request, context, services }) =>
    productCreateReportRoute("m365-posture", body, request.headers.cookie, context, services)),
  route("GET", /^\/api\/reports\/([^/]+)\/download$/, "tenant_read", ({ params, request, context, services }) =>
    productDownloadReportRoute(params[0] ?? "", request.headers.cookie, context, services)),
  route("GET", /^\/api\/audit$/, "tenant_read", ({ request, services }) =>
    productAuditRoute(request.headers.cookie, services)),
  route("POST", /^\/auth\/register$/, "auth", ({ body, context, services }) => registerRoute(body, context, services)),
  route("POST", /^\/auth\/email\/verify$/, "auth", ({ body, context, services }) =>
    verifyEmailRoute(body, context, services)),
  route("POST", /^\/auth\/login$/, "auth", ({ body, context, services }) => loginRoute(body, context, services)),
  route("POST", /^\/auth\/logout$/, "auth", ({ request, context, services }) =>
    logoutRoute(request.headers.cookie, context, services)),
  route("GET", /^\/auth\/session$/, "auth", ({ request, services }) => sessionRoute(request.headers.cookie, services)),
  route("POST", /^\/auth\/session\/active-organization$/, "auth", ({ body, request, context, services }) =>
    selectActiveOrganizationRoute(body, request.headers.cookie, context, services)),
  route("POST", /^\/auth\/oidc\/([^/]+)\/begin$/, "oidc_begin", ({ params, services }) =>
    beginOidcAuthorizationRoute(params[0] ?? "", services)),
  route(["GET", "POST"], /^\/auth\/oidc\/([^/]+)\/callback$/, "oidc_callback", ({ request, url, body, params, context, services }) => {
    const callbackInput = request.method === "GET" ? Object.fromEntries(url.searchParams.entries()) : body;
    return completeOidcCallbackRoute(params[0] ?? "", callbackInput, request.headers.cookie, context, services);
  }),
  route("GET", /^\/partners$/, "partner", ({ request, services }) => listPartnersRoute(request.headers.cookie, services)),
  route("POST", /^\/partners$/, "partner", ({ body, request, context, services }) =>
    createPartnerRoute(body, request.headers.cookie, context, services)),
  route("GET", /^\/partners\/([^/]+)\/portfolio$/, "partner", ({ params, request, services }) =>
    listPartnerPortfolioRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/partners\/([^/]+)\/customers$/, "partner", ({ params, body, request, context, services }) =>
    createPartnerCustomerRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/partners\/([^/]+)\/tenant-access-sessions$/, "partner", ({ params, body, request, context, services }) =>
    startTenantAccessRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/partners\/([^/]+)\/tenant-access-sessions\/current$/, "partner", ({ params, request, services }) =>
    getCurrentTenantAccessRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/partners\/([^/]+)\/tenant-access-sessions\/([^/]+)\/exit$/, "partner", ({ params, request, context, services }) =>
    exitTenantAccessRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("GET", /^\/compliance\/nis2\/country-packs\/status$/, "public_read", () => countryPackStatusRoute()),
  route("GET", /^\/compliance\/nis2\/country-packs$/, "public_read", () => listNis2CountryPacksRoute()),
  route("GET", /^\/compliance\/nis2\/country-packs\/([^/]+)$/, "public_read", ({ params }) =>
    getNis2CountryPackRoute(params[0] ?? "")),
  route("POST", /^\/compliance\/nis2\/country-packs\/([^/]+)\/classification$/, "public_compliance", ({ params, body }) =>
    classifyNis2CountryPackRoute(params[0] ?? "", body)),
  route("POST", /^\/organizations\/([^/]+)\/compliance\/evaluate$/, "compliance", ({ params, body, request, context, services }) =>
    evaluateComplianceAssessmentRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/compliance\/nis2\/ro\/onboarding$/, "compliance", ({ params, request, services }) =>
    getOrganizationRoNis2OnboardingRoute(params[0] ?? "", request.headers.cookie, services)),
  route("PUT", /^\/organizations\/([^/]+)\/compliance\/nis2\/ro\/onboarding$/, "compliance", ({ params, body, request, context, services }) =>
    saveOrganizationRoNis2OnboardingRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/compliance\/nis2\/ro\/classification$/, "compliance", ({ params, request, context, services }) =>
    classifyOrganizationRoNis2OnboardingRoute(params[0] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/compliance\/nis2\/ro\/notification-draft\/from-onboarding$/, "compliance", ({ params, body, request, context, services }) =>
    createOrganizationRoNis2NotificationDraftFromOnboardingRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/compliance\/nis2\/onboarding\/([^/]+)$/, "compliance", ({ params, request, services }) =>
    getOrganizationNis2OnboardingRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, services)),
  route("PUT", /^\/organizations\/([^/]+)\/compliance\/nis2\/onboarding\/([^/]+)$/, "compliance", ({ params, body, request, context, services }) =>
    saveOrganizationNis2OnboardingRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/compliance\/nis2\/onboarding\/([^/]+)\/classification$/, "compliance", ({ params, request, context, services }) =>
    classifyOrganizationNis2OnboardingRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/compliance\/nis2\/onboarding\/([^/]+)\/report$/, "compliance", ({ params, request, context, services }) =>
    buildOrganizationNis2OnboardingReportRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/recommendations\/generate$/, "compliance", ({ params, body, request, context, services }) =>
    generateRecommendationsRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/compliance\/nis2\/notification-drafts$/, "compliance", ({ params, url, request, services }) =>
    listNotificationDraftsRoute(params[0] ?? "", url.searchParams, request.headers.cookie, services)),
  route("POST", /^\/organizations\/([^/]+)\/compliance\/nis2\/notification-drafts$/, "compliance", ({ params, body, request, context, services }) =>
    createNotificationDraftRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/compliance\/nis2\/notification-drafts\/([^/]+)$/, "compliance", ({ params, request, services }) =>
    getNotificationDraftRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, services)),
  route("POST", /^\/organizations\/([^/]+)\/actions\/runs$/, "actions", ({ params, body, request, services }) =>
    createActionRunRoute(params[0] ?? "", body, request.headers.cookie, request.headers["idempotency-key"], services)),
  route(
    "POST",
    /^\/organizations\/([^/]+)\/actions\/runs\/([^/]+)\/(preflight|request-approval|approve|snapshot|queue|fail|verify|close)$/,
    "actions",
    handleActionRunOperationRoute
  ),
  route("GET", /^\/organizations\/([^/]+)\/audit\/export$/, "unknown", ({ params, request, services }) =>
    exportAuditSegmentRoute(params[0] ?? "", request.headers.cookie, services)),
  route("GET", /^\/organizations\/([^/]+)\/audit\/checkpoints$/, "unknown", ({ params, request, services }) =>
    listAuditCheckpointsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/organizations\/([^/]+)\/audit\/checkpoints$/, "unknown", ({ params, body, request, context, services }) =>
    recordAuditCheckpointRoute(
      params[0] ?? "",
      assertAuditCheckpointRequestBody(body),
      request.headers.cookie,
      context,
      services
    )),
  route("GET", /^\/organizations\/([^/]+)\/evidence$/, "evidence", ({ params, request, services }) =>
    listEvidenceRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/organizations\/([^/]+)\/evidence\/upload$/, "evidence", ({ params, body, request, context, services }) =>
    uploadEvidenceRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/evidence\/([^/]+)\/download$/, "evidence", ({ params, request, context, services }) =>
    downloadEvidenceRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/reports\/internal-readiness$/, "compliance", ({ params, body, request, context, services }) =>
    buildInternalReadinessReportRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/reports\/internal-readiness\/verified-microsoft365$/, "compliance", ({ params, body, request, context, services }) =>
    buildMicrosoft365VerifiedInternalReadinessReportRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/reports\/internal-readiness\/csv$/, "compliance", ({ params, body, request, context, services }) =>
    buildInternalReadinessCsvExportRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/reports\/internal-readiness\/evidence-package$/, "compliance", ({ params, body, request, context, services }) =>
    buildInternalReadinessEvidencePackageRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/reports\/romania-notification-draft$/, "compliance", ({ params, body, request, context, services }) =>
    buildRomaniaNotificationDraftReportRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/reports\/generated\/([^/]+)\/pdf$/, "compliance", ({ params, url, request, context, services }) =>
    downloadGeneratedReportPdfRoute(params[0] ?? "", params[1] ?? "", url.searchParams, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/compliance\/reports\/gap-report$/, "compliance", ({ params, url, request, context, services }) =>
    downloadGapReportPdfRoute(params[0] ?? "", url.searchParams, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/onboarding\/romania\/reports\/notification-draft$/, "compliance", ({ params, url, request, context, services }) =>
    downloadRomaniaNotificationDraftPdfRoute(params[0] ?? "", url.searchParams, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/dashboards\/snapshots$/, "compliance", ({ params, body, request, services }) =>
    createDashboardSnapshotRoute(params[0] ?? "", body, request.headers.cookie, services)),
  route("GET", /^\/organizations\/([^/]+)\/dashboards\/snapshots$/, "compliance", ({ params, url, request, services }) =>
    listDashboardSnapshotsRoute(params[0] ?? "", url.searchParams, request.headers.cookie, services)),
  route("GET", /^\/organizations\/([^/]+)\/dashboards\/snapshots\/latest$/, "compliance", ({ params, url, request, services }) =>
    getLatestDashboardSnapshotRoute(params[0] ?? "", url.searchParams, request.headers.cookie, services)),
  route("GET", /^\/organizations\/([^/]+)\/billing\/entitlements$/, "billing", ({ params, request, services }) =>
    listBillingEntitlementsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("GET", /^\/organizations\/([^/]+)\/notification-channels$/, "tenant_read", ({ params, request, services }) =>
    listNotificationChannelsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/organizations\/([^/]+)\/notification-channels$/, "organization", ({ params, body, request, context, services }) =>
    createNotificationChannelRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("PATCH", /^\/organizations\/([^/]+)\/notification-channels\/([^/]+)$/, "organization", ({ params, body, request, context, services }) =>
    updateNotificationChannelRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("DELETE", /^\/organizations\/([^/]+)\/notification-channels\/([^/]+)$/, "organization", ({ params, request, context, services }) =>
    deleteNotificationChannelRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/notification-channels\/([^/]+)\/test$/, "organization", ({ params, request, context, services }) =>
    sendNotificationChannelTestRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/notification-logs$/, "tenant_read", ({ params, request, services }) =>
    listNotificationLogsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("GET", /^\/organizations\/([^/]+)\/notification-operator-alerts$/, "tenant_read", ({ params, request, services }) =>
    listNotificationOperatorAlertsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/organizations\/([^/]+)\/notification-operator-alerts\/([^/]+)\/acknowledge$/, "organization", ({ params, request, context, services }) =>
    acknowledgeNotificationOperatorAlertRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/billing\/stripe\/checkout$/, "billing", ({ params, body, request, context, services }) =>
    createBillingCheckoutSessionRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/billing\/stripe\/portal$/, "billing", ({ params, body, request, context, services }) =>
    createBillingPortalSessionRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/regulatory-sources\/review-tasks$/, "regulatory", ({ params, url, request, services }) =>
    listRegulatoryReviewTasksRoute(params[0] ?? "", url.searchParams, request.headers.cookie, services)),
  route(
    "POST",
    /^\/organizations\/([^/]+)\/regulatory-sources\/review-tasks\/([^/]+)\/(review|reject|activate)$/,
    "regulatory",
    handleRegulatoryReviewTaskActionRoute
  ),
  route("GET", /^\/organizations\/([^/]+)\/regulatory-sources\/source-versions\/([^/]+)\/source-map$/, "regulatory", ({ params, request, services }) =>
    readRegulatorySourceMapTraceabilityRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, services)),
  route("GET", /^\/compliance\/nis2\/ro\/onboarding\/schema$/, "public_compliance", () => roNis2OnboardingSchemaRoute()),
  route("POST", /^\/compliance\/nis2\/ro\/onboarding\/progress$/, "public_compliance", ({ body }) =>
    roNis2OnboardingProgressRoute(body)),
  route("POST", /^\/compliance\/nis2\/ro\/classification$/, "public_compliance", ({ body }) =>
    roNis2ClassificationRoute(body)),
  route("POST", /^\/compliance\/nis2\/ro\/notification-draft$/, "public_compliance", ({ body }) =>
    roNis2NotificationDraftRoute(body)),
  route("GET", /^\/organizations$/, "tenant_read", ({ request, services }) =>
    listOrganizationsRoute(request.headers.cookie, services)),
  route("POST", /^\/organizations$/, "organization", ({ body, request, context, services }) =>
    createOrganizationRoute(body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/invitations$/, "organization", ({ params, body, request, context, services }) =>
    createOrganizationInvitationRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/invitations\/accept$/, "organization", ({ params, body, request, context, services }) =>
    acceptOrganizationInvitationRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/provider-connections$/, "provider", ({ params, request, services }) =>
    listProviderConnectionsRoute(params[0] ?? "", request.headers.cookie, services)),
  route("POST", /^\/organizations\/([^/]+)\/provider-connections$/, "provider", ({ params, body, request, context, services }) =>
    createMockProviderConnectionRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/provider-connections\/microsoft365\/consent\/begin$/, "provider", ({ params, body, request, context, services }) =>
    beginMicrosoft365ConsentRoute(params[0] ?? "", body, request.headers.cookie, context, services)),
  route(["GET", "POST"], /^\/organizations\/([^/]+)\/provider-connections\/microsoft365\/consent\/callback$/, "provider_callback", ({ request, url, body, params, context, services }) => {
    const callbackInput = request.method === "GET" ? Object.fromEntries(url.searchParams.entries()) : body;
    return completeMicrosoft365ConsentRoute(params[0] ?? "", callbackInput, request.headers.cookie, context, services);
  }),
  route("POST", /^\/organizations\/([^/]+)\/provider-connections\/([^/]+)\/sync$/, "provider", ({ params, body, request, context, services }) =>
    runProviderSyncRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/provider-connections\/([^/]+)\/microsoft365\/sync$/, "provider", ({ params, body, request, context, services }) =>
    runMicrosoft365SyncRoute(params[0] ?? "", params[1] ?? "", body, request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/provider-connections\/([^/]+)\/health$/, "provider", ({ params, request, services }) =>
    getMicrosoft365ConnectionHealthRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, services)),
  route("GET", /^\/organizations\/([^/]+)\/members$/, "tenant_read", ({ params, request, services }) =>
    listOrganizationMembersRoute(params[0] ?? "", request.headers.cookie, services))
];

function handleActionRunOperationRoute(input: ApiRouteDispatchInput): Promise<ApiResult> {
  const organizationId = input.params[0] ?? "";
  const actionRunId = input.params[1] ?? "";
  const action = input.params[2];

  if (action === "preflight") {
    return recordActionPreflightRoute(
      organizationId,
      actionRunId,
      input.body,
      input.request.headers.cookie,
      input.context,
      input.services
    );
  }

  if (action === "request-approval") {
    return requestActionApprovalRoute(
      organizationId,
      actionRunId,
      input.request.headers.cookie,
      input.context,
      input.services
    );
  }

  if (action === "approve") {
    return approveActionRunRoute(
      organizationId,
      actionRunId,
      input.request.headers.cookie,
      input.context,
      input.services
    );
  }

  if (action === "snapshot") {
    return attachActionSnapshotRoute(
      organizationId,
      actionRunId,
      input.body,
      input.request.headers.cookie,
      input.services
    );
  }

  if (action === "queue") {
    return queueActionRunRoute(
      organizationId,
      actionRunId,
      input.request.headers.cookie,
      input.context,
      input.services
    );
  }

  if (action === "fail") {
    return failActionRunRoute(
      organizationId,
      actionRunId,
      input.body,
      input.request.headers.cookie,
      input.context,
      input.services
    );
  }

  if (action === "verify") {
    return verifyActionRunRoute(
      organizationId,
      actionRunId,
      input.body,
      input.request.headers.cookie,
      input.context,
      input.services
    );
  }

  return closeActionRunRoute(organizationId, actionRunId, input.request.headers.cookie, input.context, input.services);
}

function handleRegulatoryReviewTaskActionRoute(input: ApiRouteDispatchInput): Promise<ApiResult> {
  const organizationId = input.params[0] ?? "";
  const taskId = input.params[1] ?? "";
  const action = input.params[2];

  if (action === "review") {
    return markRegulatoryReviewTaskReviewedRoute(
      organizationId,
      taskId,
      input.body,
      input.request.headers.cookie,
      input.context,
      input.services
    );
  }

  if (action === "reject") {
    return rejectRegulatoryReviewTaskRoute(
      organizationId,
      taskId,
      input.body,
      input.request.headers.cookie,
      input.context,
      input.services
    );
  }

  return activateRegulatorySourceVersionRoute(
    organizationId,
    taskId,
    input.body,
    input.request.headers.cookie,
    input.context,
    input.services
  );
}

const findApiRoute = (
  method: string | undefined,
  pathname: string
): { route: ApiRouteEntry; params: string[] } | null => {
  const requestMethod = method ?? "GET";

  for (const candidate of apiRouteTable) {
    if (!candidate.methods.includes(requestMethod as ApiRouteMethod)) {
      continue;
    }

    const match = pathname.match(candidate.pattern);
    if (match) {
      return {
        route: candidate,
        params: match.slice(1)
      };
    }
  }

  return null;
};

export const startApiServer = (port = Number(process.env.PORT ?? 3001), services: ApiServices = createApiServices()) => {
  validateConfigForStartup(services.config, { serviceName: "api" });
  const metrics = new ApiMetricsRegistry();
  const middleware = createApiMiddleware({
    config: services.config.api,
    sessionResolver: services.localAuth
  });

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    let requestContext: ApiRequestContext | null = null;

    if (request.method === "GET" && url.pathname === "/health") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(getApiHealth()));
      return;
    }
    if (request.method === "GET" && url.pathname === "/metrics") {
      response.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
      response.end(renderApiMetricsPrometheus(metrics.snapshot()));
      return;
    }

    try {
      const middlewareDecision = await middleware.apply(request, url);
      const context = middlewareDecision.context;
      requestContext = context;
      if (middlewareDecision.rejection) {
        sendApiJson(response, middlewareDecision.rejection, context, metrics);
        return;
      }

      const requestLimits = services.config.api.requestLimits;
      const routeMatch = findApiRoute(request.method, url.pathname);

      if (routeMatch?.route.rawBody) {
        const rawBody = await parseRawBody(request, {
          maxBytes: requestLimits.stripeWebhookRawBodyMaxBytes
        });
        sendContextualApiResult(
          response,
          await routeMatch.route.handler({
            request,
            url,
            body: {},
            rawBody,
            context,
            services,
            params: routeMatch.params
          }),
          context,
          metrics
        );
        return;
      }

      const body =
        request.method === "POST" || request.method === "PUT" || request.method === "PATCH"
          ? await parseJsonBody(request, {
              maxBytes: requestLimits.jsonBodyMaxBytes
            })
          : {};

      if (routeMatch) {
        sendContextualApiResult(
          response,
          await routeMatch.route.handler({
            request,
            url,
            body,
            context,
            services,
            params: routeMatch.params
          }),
          context,
          metrics
        );
        return;
      }

      if (url.pathname.startsWith("/api/v1")) {
        sendApiJson(
          response,
          {
            statusCode: 404,
            body: {
              error: {
                code: "not_found",
                message: "Route was not found."
              }
            }
          },
          context,
          metrics
        );
        return;
      }
      response.statusCode = 404;
      response.end("not found");
    } catch (error) {
      const result = toJsonResultError(error);
      if (result.statusCode >= 500 && !(error instanceof AuthError)) {
        logUnhandledApiError(error, requestContext, request);
      }
      sendApiJson(response, result, requestContext, metrics);
    }
  });

  server.listen(port);
  return server;
};

const sendContextualApiResult = (
  response: ServerResponse,
  result: ApiResult,
  context: ApiRequestContext | null,
  metrics?: ApiMetricsRegistry
): void => {
  recordApiMetric(metrics, result.statusCode, context);
  applyContextHeaders(response, context);
  sendApiResult(response, normalizeV1ApiResult(result, context));
};

const sendApiJson = (
  response: ServerResponse,
  result: JsonResult,
  context: ApiRequestContext | null,
  metrics?: ApiMetricsRegistry
): void => {
  recordApiMetric(metrics, result.statusCode, context);
  applyContextHeaders(response, context);
  sendJson(response, normalizeV1JsonResult(result, context));
};

const recordApiMetric = (
  metrics: ApiMetricsRegistry | undefined,
  statusCode: number,
  context: ApiRequestContext | null
): void => {
  metrics?.record({
    method: context?.method ?? "UNKNOWN",
    routeFamily: context?.routeFamily ?? "unknown",
    statusCode
  });
};

const applyContextHeaders = (response: ServerResponse, context: ApiRequestContext | null): void => {
  if (!context) {
    return;
  }
  response.setHeader("x-request-id", context.requestId);
  response.setHeader("x-correlation-id", context.correlationId);
};

const normalizeV1ApiResult = (result: ApiResult, context: ApiRequestContext | null): ApiResult => {
  if ("kind" in result && result.kind === "binary") {
    return result;
  }
  return normalizeV1JsonResult(result, context);
};

const normalizeV1JsonResult = (result: JsonResult, context: ApiRequestContext | null): JsonResult => {
  if (!context?.pathname.startsWith("/api/v1") || result.statusCode < 400) {
    return result;
  }
  return {
    ...result,
    body: normalizeV1ErrorBody(result.body, context)
  };
};

const normalizeV1ErrorBody = (body: unknown, context: ApiRequestContext): { error: Record<string, unknown> } => {
  const source = typeof body === "object" && body !== null && "error" in body
    ? (body as { error?: unknown }).error
    : null;
  const error = typeof source === "object" && source !== null ? source as Record<string, unknown> : {};
  const code = typeof error.code === "string" ? error.code : "internal_error";
  const message = typeof error.message === "string" ? error.message : "Request failed.";
  const details = normalizeV1ErrorDetails(error);
  const fieldErrors = Array.isArray(error.fieldErrors) ? error.fieldErrors : [];

  return {
    error: {
      code,
      message,
      details,
      requestId: context.requestId,
      correlationId: context.correlationId,
      fieldErrors
    }
  };
};

const normalizeV1ErrorDetails = (error: Record<string, unknown>): Record<string, unknown> => {
  const details = typeof error.details === "object" && error.details !== null && !Array.isArray(error.details)
    ? { ...(error.details as Record<string, unknown>) }
    : {};
  for (const [key, value] of Object.entries(error)) {
    if (["code", "message", "details", "requestId", "correlationId", "fieldErrors"].includes(key)) {
      continue;
    }
    details[key] = value;
  }
  return details;
};

const logUnhandledApiError = (
  error: unknown,
  context: ApiRequestContext | null,
  request: IncomingMessage
): void => {
  const errorRecord = error instanceof Error ? error : null;
  console.error(
    JSON.stringify({
      service: "puresoc-api",
      level: "error",
      event: "api_unhandled_error",
      requestId: context?.requestId ?? null,
      method: context?.method ?? request.method ?? null,
      pathname: context?.pathname ?? request.url ?? null,
      routeFamily: context?.routeFamily ?? null,
      errorName: errorRecord?.name ?? typeof error,
      errorCode: safeErrorCode(error),
      errorMessage: redactErrorMessage(errorRecord?.message ?? String(error))
    })
  );
};

const safeErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[a-zA-Z0-9_.-]{1,80}$/.test(code) ? code : null;
};

const redactErrorMessage = (message: string): string =>
  message
    .replaceAll(/(postgres(?:ql)?:\/\/)([^:@\s]+):([^@\s]+)@/gi, "$1[redacted]:[redacted]@")
    .replaceAll(/(redis:\/\/)([^:@\s]*):([^@\s]+)@/gi, "$1[redacted]:[redacted]@")
    .replaceAll(/(password|secret|token|authorization)=([^&\s]+)/gi, "$1=[redacted]")
    .slice(0, 500);

if (process.argv[1]?.endsWith("server.ts")) {
  startApiServer();
}
