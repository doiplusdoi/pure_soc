import { createServer } from "node:http";

import { getApiHealth } from "./health";
import { loginRoute, logoutRoute, registerRoute, sessionRoute } from "./auth/routes";
import { createApiServices, type ApiServices } from "./auth/services";
import { parseJsonBody, readRequestContext, sendJson, toJsonResultError } from "./http";
import { createOrganizationRoute, listOrganizationMembersRoute } from "./organizations/routes";

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

      if (request.method === "POST" && url.pathname === "/organizations") {
        sendJson(response, await createOrganizationRoute(body, request.headers.cookie, context, services));
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
