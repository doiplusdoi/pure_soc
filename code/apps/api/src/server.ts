import { createServer, type IncomingMessage } from "node:http";

import { validateConfigForStartup } from "@puresoc/config";
import { getApiHealth } from "./health";
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
import { createApiServices, type ApiServices } from "./auth/services";
import { parseJsonBody, parseRawBody, sendApiResult, sendJson, toJsonResultError, type ApiResult } from "./http";
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
  failActionRunRoute,
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
  createNotificationChannelRoute,
  deleteNotificationChannelRoute,
  listNotificationChannelsRoute,
  listNotificationLogsRoute,
  sendNotificationChannelTestRoute
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

type ApiRouteMethod = "DELETE" | "GET" | "POST" | "PUT";

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
  handler: (input: ApiRouteDispatchInput) => Promise<ApiResult>;
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
  route("DELETE", /^\/organizations\/([^/]+)\/notification-channels\/([^/]+)$/, "organization", ({ params, request, context, services }) =>
    deleteNotificationChannelRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("POST", /^\/organizations\/([^/]+)\/notification-channels\/([^/]+)\/test$/, "organization", ({ params, request, context, services }) =>
    sendNotificationChannelTestRoute(params[0] ?? "", params[1] ?? "", request.headers.cookie, context, services)),
  route("GET", /^\/organizations\/([^/]+)\/notification-logs$/, "tenant_read", ({ params, request, services }) =>
    listNotificationLogsRoute(params[0] ?? "", request.headers.cookie, services)),
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
  const middleware = createApiMiddleware({
    config: services.config.api,
    sessionResolver: services.localAuth
  });

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/health") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(getApiHealth()));
      return;
    }

    try {
      const middlewareDecision = await middleware.apply(request, url);
      const context = middlewareDecision.context;
      if (middlewareDecision.rejection) {
        sendJson(response, middlewareDecision.rejection);
        return;
      }

      const requestLimits = services.config.api.requestLimits;
      const routeMatch = findApiRoute(request.method, url.pathname);

      if (routeMatch?.route.rawBody) {
        const rawBody = await parseRawBody(request, {
          maxBytes: requestLimits.stripeWebhookRawBodyMaxBytes
        });
        sendApiResult(
          response,
          await routeMatch.route.handler({
            request,
            url,
            body: {},
            rawBody,
            context,
            services,
            params: routeMatch.params
          })
        );
        return;
      }

      const body =
        request.method === "POST" || request.method === "PUT"
          ? await parseJsonBody(request, {
              maxBytes: requestLimits.jsonBodyMaxBytes
            })
          : {};

      if (routeMatch) {
        sendApiResult(
          response,
          await routeMatch.route.handler({
            request,
            url,
            body,
            context,
            services,
            params: routeMatch.params
          })
        );
        return;
      }

      response.statusCode = 404;
      response.end("not found");
    } catch (error) {
      sendJson(response, toJsonResultError(error));
    }
  });

  server.listen(port);
  return server;
};

if (process.argv[1]?.endsWith("server.ts")) {
  startApiServer();
}
