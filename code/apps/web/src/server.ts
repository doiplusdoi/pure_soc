import { createServer } from "node:http";

import type { DashboardSnapshotContract } from "@puresoc/dashboards";

import { createOperationalConsoleRuntimeModel, createRomaniaOnboardingRouteModel, type RuntimeSessionSurface } from "./app-data";
import {
  renderLoginScreen,
  renderOperationalConsole,
  renderRomaniaOnboardingRoute,
  renderRuntimeMessageScreen
} from "./operational-console";

export interface WebServerOptions {
  apiBaseUrl?: string;
  publicBaseUrl?: string;
}

interface LatestDashboardSnapshotResponse {
  snapshot: DashboardSnapshotContract;
}

export const startWebServer = (port = Number(process.env.PORT ?? 3000), options: WebServerOptions = {}) => {
  const apiBaseUrl = normalizeBaseUrl(
    options.apiBaseUrl ??
      process.env.PURESOC_WEB_API_BASE_URL ??
      process.env.PURESOC_API_BASE_URL ??
      process.env.API_BASE_URL ??
      "http://127.0.0.1:3001"
  );

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/health") {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          service: "puresoc-web",
          status: "ok",
          runtime: "api-backed-renderer",
          apiBacked: true
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/login") {
      sendHtml(
        response,
        renderLoginScreen({
          activeOrganizationId: url.searchParams.get("organizationId")
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/onboarding/romania") {
      sendHtml(
        response,
        renderRomaniaOnboardingRoute(
          createRomaniaOnboardingRouteModel({
            locale: url.searchParams.get("locale")
          })
        )
      );
      return;
    }

    const requestOrigin = options.publicBaseUrl ?? process.env.PURESOC_WEB_PUBLIC_BASE_URL ?? originFromRequest(request, port);

    if (request.method === "POST" && url.pathname === "/auth/login") {
      const form = await readFormBody(request);
      const login = await apiJson<unknown>(apiBaseUrl, "/auth/login", {
        method: "POST",
        origin: requestOrigin,
        body: {
          email: form.get("email") ?? "",
          password: form.get("password") ?? "",
          activeOrganizationId: optionalFormValue(form.get("activeOrganizationId"))
        }
      });

      if (login.statusCode !== 200) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign-in failed. Check the email, password, and selected workspace.",
            activeOrganizationId: optionalFormValue(form.get("activeOrganizationId"))
          }),
          login.statusCode
        );
        return;
      }

      if (login.setCookie) {
        response.setHeader("set-cookie", login.setCookie);
      }
      response.statusCode = 303;
      response.setHeader("location", "/");
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/logout") {
      const logout = await apiJson<unknown>(apiBaseUrl, "/auth/logout", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: requestOrigin,
        body: {}
      });
      if (logout.setCookie) {
        response.setHeader("set-cookie", logout.setCookie);
      }
      response.statusCode = 303;
      response.setHeader("location", "/login");
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/auth/session") {
      const session = await apiJson<unknown>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      response.statusCode = session.statusCode;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(session.body));
      return;
    }

    if (request.method === "GET" && url.pathname === "/") {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });

      if (session.statusCode !== 200) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to open the operational console."
          })
        );
        return;
      }

      const activeOrganizationId = session.body.session.activeOrganizationId;
      if (!activeOrganizationId) {
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Select A Workspace",
            summary: "The API session is valid, but no active organization is attached to this browser session yet.",
            statusLabel: "Session active",
            statusTone: "warning",
            actionHref: "/login",
            actionLabel: "Sign in with workspace"
          })
        );
        return;
      }

      const dashboard = await apiJson<LatestDashboardSnapshotResponse>(
        apiBaseUrl,
        `/organizations/${encodeURIComponent(activeOrganizationId)}/dashboards/snapshots/latest`,
        {
          method: "GET",
          cookie: request.headers.cookie
        }
      );

      if (dashboard.statusCode !== 200) {
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Dashboard Snapshot Required",
            summary: "The web runtime reached the API session, but this workspace does not have a dashboard snapshot yet.",
            statusLabel: "API connected",
            statusTone: "warning"
          }),
          dashboard.statusCode === 404 ? 404 : 200
        );
        return;
      }

      sendHtml(
        response,
        renderOperationalConsole(
          createOperationalConsoleRuntimeModel({
            session: session.body,
            dashboard: dashboard.body.snapshot,
            organization: {
              id: activeOrganizationId
            }
          })
        )
      );
      return;
    }

    response.statusCode = 404;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("not found");
  });

  server.listen(port, () => {
    const address = server.address();
    console.log(
      JSON.stringify({
        service: "puresoc-web",
        status: "listening",
        port: typeof address === "object" && address ? address.port : port,
        runtime: "api-backed-renderer"
      })
    );
  });

  return server;
};

if (process.argv.some((argument) => argument.endsWith("apps/web/src/server.ts"))) {
  const server = startWebServer();
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const originFromRequest = (request: { headers: { host?: string | string[] } }, port: number): string => {
  const host = Array.isArray(request.headers.host) ? request.headers.host[0] : request.headers.host;
  return `http://${host ?? `127.0.0.1:${port}`}`;
};

const optionalFormValue = (value: string | null): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const sendHtml = (response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, html: string, statusCode = 200) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(html);
};

const readFormBody = async (request: AsyncIterable<Buffer>): Promise<URLSearchParams> => {
  let body = "";
  for await (const chunk of request) {
    body += chunk.toString("utf8");
    if (Buffer.byteLength(body, "utf8") > 65_536) {
      throw new Error("Form body is too large.");
    }
  }

  return new URLSearchParams(body);
};

const apiJson = async <T>(
  apiBaseUrl: string,
  path: string,
  input: {
    method: "GET" | "POST";
    body?: Record<string, unknown>;
    cookie?: string;
    origin?: string;
  }
): Promise<{ statusCode: number; body: T; setCookie?: string }> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: input.method,
    headers: {
      ...(input.method === "POST" ? { "content-type": "application/json" } : {}),
      ...(input.cookie ? { cookie: input.cookie } : {}),
      ...(input.origin ? { origin: input.origin } : {})
    },
    body: input.method === "POST" ? JSON.stringify(input.body ?? {}) : undefined
  });

  return {
    statusCode: response.status,
    body: (await response.json()) as T,
    setCookie: response.headers.get("set-cookie") ?? undefined
  };
};
