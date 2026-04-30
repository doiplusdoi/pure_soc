import { createServer } from "node:http";

import { getApiHealth } from "./health";
import { loginRoute, logoutRoute, registerRoute, sessionRoute } from "./auth/routes";
import { countryPackStatusRoute } from "./compliance/nis2/routes";
import { evaluateComplianceAssessmentRoute } from "./compliance/routes";
import {
  roNis2ClassificationRoute,
  roNis2NotificationDraftRoute,
  roNis2OnboardingProgressRoute,
  roNis2OnboardingSchemaRoute
} from "./compliance/nis2/ro";
import { createApiServices, type ApiServices } from "./auth/services";
import { parseJsonBody, readRequestContext, sendJson, toJsonResultError } from "./http";
import { createOrganizationRoute, listOrganizationMembersRoute } from "./organizations/routes";
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
import { downloadEvidenceRoute, listEvidenceRoute, uploadEvidenceRoute } from "./evidence/routes";
import {
  buildInternalReadinessReportRoute,
  buildRomaniaNotificationDraftReportRoute
} from "./reports/routes";
import { createDashboardSnapshotRoute } from "./dashboards/routes";

export const startApiServer = (port = Number(process.env.PORT ?? 3001), services: ApiServices = createApiServices()) => {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/health") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(getApiHealth()));
      return;
    }

    try {
      const context = readRequestContext(request);
      const body = request.method === "POST" ? await parseJsonBody(request) : {};

      if (request.method === "POST" && url.pathname === "/auth/register") {
        sendJson(response, await registerRoute(body, context, services));
        return;
      }

      if (request.method === "POST" && url.pathname === "/auth/login") {
        sendJson(response, await loginRoute(body, context, services));
        return;
      }

      if (request.method === "POST" && url.pathname === "/auth/logout") {
        sendJson(response, await logoutRoute(request.headers.cookie, context, services));
        return;
      }

      if (request.method === "GET" && url.pathname === "/auth/session") {
        sendJson(response, await sessionRoute(request.headers.cookie, services));
        return;
      }

      if (request.method === "GET" && url.pathname === "/compliance/nis2/country-packs/status") {
        sendJson(response, await countryPackStatusRoute());
        return;
      }

      const complianceEvaluateRouteMatch = url.pathname.match(/^\/organizations\/([^/]+)\/compliance\/evaluate$/);
      if (complianceEvaluateRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await evaluateComplianceAssessmentRoute(
            complianceEvaluateRouteMatch[1] ?? "",
            body,
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const recommendationRouteMatch = url.pathname.match(/^\/organizations\/([^/]+)\/recommendations\/generate$/);
      if (recommendationRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await generateRecommendationsRoute(
            recommendationRouteMatch[1] ?? "",
            body,
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const evidenceCollectionRouteMatch = url.pathname.match(/^\/organizations\/([^/]+)\/evidence$/);
      if (evidenceCollectionRouteMatch && request.method === "GET") {
        sendJson(
          response,
          await listEvidenceRoute(evidenceCollectionRouteMatch[1] ?? "", request.headers.cookie, services)
        );
        return;
      }

      const evidenceUploadRouteMatch = url.pathname.match(/^\/organizations\/([^/]+)\/evidence\/upload$/);
      if (evidenceUploadRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await uploadEvidenceRoute(
            evidenceUploadRouteMatch[1] ?? "",
            body,
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const evidenceDownloadRouteMatch = url.pathname.match(/^\/organizations\/([^/]+)\/evidence\/([^/]+)\/download$/);
      if (evidenceDownloadRouteMatch && request.method === "GET") {
        sendJson(
          response,
          await downloadEvidenceRoute(
            evidenceDownloadRouteMatch[1] ?? "",
            evidenceDownloadRouteMatch[2] ?? "",
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const internalReadinessReportRouteMatch = url.pathname.match(
        /^\/organizations\/([^/]+)\/reports\/internal-readiness$/
      );
      if (internalReadinessReportRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await buildInternalReadinessReportRoute(
            internalReadinessReportRouteMatch[1] ?? "",
            body,
            request.headers.cookie,
            services
          )
        );
        return;
      }

      const romaniaNotificationReportRouteMatch = url.pathname.match(
        /^\/organizations\/([^/]+)\/reports\/romania-notification-draft$/
      );
      if (romaniaNotificationReportRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await buildRomaniaNotificationDraftReportRoute(
            romaniaNotificationReportRouteMatch[1] ?? "",
            body,
            request.headers.cookie,
            services
          )
        );
        return;
      }

      const dashboardSnapshotRouteMatch = url.pathname.match(/^\/organizations\/([^/]+)\/dashboards\/snapshots$/);
      if (dashboardSnapshotRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await createDashboardSnapshotRoute(
            dashboardSnapshotRouteMatch[1] ?? "",
            body,
            request.headers.cookie,
            services
          )
        );
        return;
      }

      if (request.method === "GET" && url.pathname === "/compliance/nis2/ro/onboarding/schema") {
        sendJson(response, await roNis2OnboardingSchemaRoute());
        return;
      }

      if (request.method === "POST" && url.pathname === "/compliance/nis2/ro/onboarding/progress") {
        sendJson(response, await roNis2OnboardingProgressRoute(body));
        return;
      }

      if (request.method === "POST" && url.pathname === "/compliance/nis2/ro/classification") {
        sendJson(response, await roNis2ClassificationRoute(body));
        return;
      }

      if (request.method === "POST" && url.pathname === "/compliance/nis2/ro/notification-draft") {
        sendJson(response, await roNis2NotificationDraftRoute(body));
        return;
      }

      if (request.method === "POST" && url.pathname === "/organizations") {
        sendJson(response, await createOrganizationRoute(body, request.headers.cookie, context, services));
        return;
      }

      const providerConnectionsRouteMatch = url.pathname.match(/^\/organizations\/([^/]+)\/provider-connections$/);
      if (providerConnectionsRouteMatch && request.method === "GET") {
        sendJson(
          response,
          await listProviderConnectionsRoute(providerConnectionsRouteMatch[1] ?? "", request.headers.cookie, services)
        );
        return;
      }

      if (providerConnectionsRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await createMockProviderConnectionRoute(
            providerConnectionsRouteMatch[1] ?? "",
            body,
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const microsoft365ConsentBeginRouteMatch = url.pathname.match(
        /^\/organizations\/([^/]+)\/provider-connections\/microsoft365\/consent\/begin$/
      );
      if (microsoft365ConsentBeginRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await beginMicrosoft365ConsentRoute(
            microsoft365ConsentBeginRouteMatch[1] ?? "",
            body,
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const microsoft365ConsentCallbackRouteMatch = url.pathname.match(
        /^\/organizations\/([^/]+)\/provider-connections\/microsoft365\/consent\/callback$/
      );
      if (microsoft365ConsentCallbackRouteMatch && (request.method === "GET" || request.method === "POST")) {
        const callbackInput =
          request.method === "GET" ? Object.fromEntries(url.searchParams.entries()) : body;
        sendJson(
          response,
          await completeMicrosoft365ConsentRoute(
            microsoft365ConsentCallbackRouteMatch[1] ?? "",
            callbackInput,
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const providerSyncRouteMatch = url.pathname.match(
        /^\/organizations\/([^/]+)\/provider-connections\/([^/]+)\/sync$/
      );
      if (providerSyncRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await runProviderSyncRoute(
            providerSyncRouteMatch[1] ?? "",
            providerSyncRouteMatch[2] ?? "",
            body,
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const microsoft365ProviderSyncRouteMatch = url.pathname.match(
        /^\/organizations\/([^/]+)\/provider-connections\/([^/]+)\/microsoft365\/sync$/
      );
      if (microsoft365ProviderSyncRouteMatch && request.method === "POST") {
        sendJson(
          response,
          await runMicrosoft365SyncRoute(
            microsoft365ProviderSyncRouteMatch[1] ?? "",
            microsoft365ProviderSyncRouteMatch[2] ?? "",
            body,
            request.headers.cookie,
            context,
            services
          )
        );
        return;
      }

      const providerHealthRouteMatch = url.pathname.match(
        /^\/organizations\/([^/]+)\/provider-connections\/([^/]+)\/health$/
      );
      if (providerHealthRouteMatch && request.method === "GET") {
        sendJson(
          response,
          await getMicrosoft365ConnectionHealthRoute(
            providerHealthRouteMatch[1] ?? "",
            providerHealthRouteMatch[2] ?? "",
            request.headers.cookie,
            services
          )
        );
        return;
      }

      const memberRouteMatch = url.pathname.match(/^\/organizations\/([^/]+)\/members$/);
      if (request.method === "GET" && memberRouteMatch) {
        sendJson(response, await listOrganizationMembersRoute(memberRouteMatch[1] ?? "", request.headers.cookie, services));
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
