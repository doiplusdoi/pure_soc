import { createServer, type IncomingHttpHeaders } from "node:http";

import type { DashboardSnapshotContract } from "@puresoc/dashboards";

import {
  createOperationalConsoleRuntimeModel,
  organizationInvitationRoleOptions,
  createRomaniaOnboardingRouteModel,
  type OrganizationInvitationScreenModel,
  type RomaniaOnboardingRouteInput,
  type RuntimeSessionSurface,
  type WorkspaceSelectionModel
} from "./app-data";
import {
  renderLoginScreen,
  renderEmailVerificationScreen,
  renderOrganizationInvitationsScreen,
  renderOperationalConsole,
  renderRegisterScreen,
  renderRomaniaOnboardingRoute,
  renderRuntimeMessageScreen,
  renderWorkspaceSelectionScreen
} from "./operational-console";

export interface WebServerOptions {
  apiBaseUrl?: string;
  publicBaseUrl?: string;
}

interface LatestDashboardSnapshotResponse {
  snapshot: DashboardSnapshotContract;
}

interface OrganizationListResponse {
  organizations: Array<{
    membership: {
      id: string;
      status: string;
    };
    organization: {
      id: string;
      name: string;
      billingStatus: string;
      primaryCountryCode?: string | null;
    };
    roleKeys: string[];
  }>;
}

interface CreateOrganizationWebResponse {
  organization?: {
    id?: string;
    name?: string;
  };
}

interface RomaniaOnboardingStateResponse {
  classificationRun: RomaniaOnboardingRouteInput["classificationRun"];
  latestNotificationDraft: {
    id: string;
    payload?: unknown;
    status?: string;
  } | null;
  progress: RomaniaOnboardingRouteInput["progress"];
}

interface EvidenceListResponse {
  artifacts: Array<{
    id: string;
    sourceType?: string;
    title?: string;
  }>;
}

interface BillingEntitlementsResponse {
  entitlements: unknown[];
}

interface AuditCheckpointsResponse {
  checkpoints: unknown[];
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
    try {
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

    if (request.method === "GET" && url.pathname === "/register") {
      sendHtml(response, renderRegisterScreen());
      return;
    }

    if (request.method === "GET" && url.pathname === "/verify-email") {
      sendHtml(response, renderEmailVerificationScreen());
      return;
    }

    if (request.method === "GET" && (url.pathname === "/invitations" || url.pathname === "/invitations/accept")) {
      const invitationModel = await loadOrganizationInvitationScreenModel({
        acceptOrganizationId: url.searchParams.get("organizationId"),
        actionMessage: url.searchParams.get("message"),
        apiBaseUrl,
        cookie: request.headers.cookie
      });

      if (!invitationModel) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to manage organization invitations."
          })
        );
        return;
      }

      sendHtml(response, renderOrganizationInvitationsScreen(invitationModel));
      return;
    }

    if (request.method === "GET" && url.pathname === "/onboarding/romania") {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      if (session.statusCode !== 200) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to open the Romania readiness workflow."
          })
        );
        return;
      }
      if (!session.body.session.activeOrganizationId) {
        const selection = await loadWorkspaceSelectionModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          session: session.body
        });
        sendHtml(
          response,
          selection
            ? renderWorkspaceSelectionScreen(selection)
            : renderRuntimeMessageScreen({
                title: "Select A Workspace",
                summary: "The Romania workflow needs an active organization-owned workspace.",
                statusLabel: "Session active",
                statusTone: "warning",
                actionHref: "/workspaces",
                actionLabel: "Choose workspace"
              })
        );
        return;
      }

      sendHtml(
        response,
        renderRomaniaOnboardingRoute(
          await loadRomaniaOnboardingRouteModel({
            actionMessage: url.searchParams.get("message"),
            apiBaseUrl,
            cookie: request.headers.cookie,
            locale: url.searchParams.get("locale"),
            organizationId: session.body.session.activeOrganizationId
          })
        )
      );
      return;
    }

    const requestOrigin =
      options.publicBaseUrl ??
      process.env.PURESOC_WEB_PUBLIC_BASE_URL ??
      process.env.PURESOC_PUBLIC_BASE_URL ??
      resolvePublicRequestOrigin(request, port);

    if (request.method === "POST" && url.pathname === "/auth/email/verify") {
      const form = await readFormBody(request);
      const verification = await apiJson<unknown>(apiBaseUrl, "/auth/email/verify", {
        method: "POST",
        origin: requestOrigin,
        body: {
          token: form.get("token") ?? ""
        }
      });

      if (verification.statusCode !== 200) {
        sendHtml(
          response,
          renderEmailVerificationScreen({
            errorMessage: "Email verification failed. Use the latest unexpired token from the configured delivery path."
          }),
          verification.statusCode
        );
        return;
      }

      sendHtml(
        response,
        renderRuntimeMessageScreen({
          title: "Email Verified",
          summary: "The local account email is verified. Continue to workspace setup for this session.",
          statusLabel: "verified",
          statusTone: "success",
          actionHref: "/workspaces",
          actionLabel: "Continue to workspace setup"
        })
      );
      return;
    }

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

    if (request.method === "POST" && url.pathname === "/auth/register") {
      const form = await readFormBody(request);
      const registration = await apiJson<unknown>(apiBaseUrl, "/auth/register", {
        method: "POST",
        origin: requestOrigin,
        body: {
          displayName: form.get("displayName") ?? "",
          email: form.get("email") ?? "",
          password: form.get("password") ?? ""
        }
      });

      if (registration.statusCode !== 201) {
        sendHtml(
          response,
          renderRegisterScreen({
            errorMessage: "Registration failed. Use a valid email and a strong local password."
          }),
          registration.statusCode
        );
        return;
      }

      const login = await apiJson<unknown>(apiBaseUrl, "/auth/login", {
        method: "POST",
        origin: requestOrigin,
        body: {
          email: form.get("email") ?? "",
          password: form.get("password") ?? ""
        }
      });
      if (login.statusCode !== 200 || !login.setCookie) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Account created, but automatic sign-in failed. Sign in with the same email and password."
          }),
          login.statusCode === 200 ? 502 : login.statusCode
        );
        return;
      }
      if (login.setCookie) {
        response.setHeader("set-cookie", login.setCookie);
      }
      response.statusCode = 303;
      response.setHeader("location", "/verify-email");
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

    if (request.method === "POST" && url.pathname === "/invitations") {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      const organizationId = session.body?.session?.activeOrganizationId;
      if (session.statusCode !== 200 || !organizationId) {
        const invitationModel = await loadOrganizationInvitationScreenModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Select an active workspace before creating invitations."
        });
        sendHtml(
          response,
          invitationModel
            ? renderOrganizationInvitationsScreen(invitationModel)
            : renderLoginScreen({ errorMessage: "Sign in to create organization invitations." }),
          session.statusCode === 200 ? 400 : session.statusCode
        );
        return;
      }

      const form = await readFormBody(request);
      const invitation = await apiJson<unknown>(apiBaseUrl, `/organizations/${encodeURIComponent(organizationId)}/invitations`, {
        method: "POST",
        cookie: request.headers.cookie,
        origin: requestOrigin,
        body: {
          email: form.get("email") ?? "",
          roleKey: optionalFormValue(form.get("roleKey")) ?? "auditor"
        }
      });

      if (invitation.statusCode !== 201) {
        const invitationModel = await loadOrganizationInvitationScreenModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Invitation was not created. Confirm your email is verified and your role can invite members."
        });
        sendHtml(
          response,
          invitationModel
            ? renderOrganizationInvitationsScreen(invitationModel)
            : renderLoginScreen({ errorMessage: "Sign in to create organization invitations." }),
          invitation.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/invitations?message=${encodeURIComponent("Invitation created. Delivery remains configured outside the served web runtime.")}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/invitations/accept") {
      const form = await readFormBody(request);
      const organizationId = optionalFormValue(form.get("organizationId"));
      if (!organizationId) {
        const invitationModel = await loadOrganizationInvitationScreenModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Organization ID is required to accept an invitation."
        });
        sendHtml(
          response,
          invitationModel
            ? renderOrganizationInvitationsScreen(invitationModel)
            : renderLoginScreen({ errorMessage: "Sign in to accept an organization invitation." }),
          400
        );
        return;
      }

      const accepted = await apiJson<unknown>(apiBaseUrl, `/organizations/${encodeURIComponent(organizationId)}/invitations/accept`, {
        method: "POST",
        cookie: request.headers.cookie,
        origin: requestOrigin,
        body: {
          token: form.get("token") ?? ""
        }
      });

      if (accepted.statusCode !== 200) {
        const invitationModel = await loadOrganizationInvitationScreenModel({
          acceptOrganizationId: organizationId,
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Invitation was not accepted. Sign in with the verified invited email and use the latest token."
        });
        sendHtml(
          response,
          invitationModel
            ? renderOrganizationInvitationsScreen(invitationModel)
            : renderLoginScreen({ errorMessage: "Sign in to accept an organization invitation." }),
          accepted.statusCode
        );
        return;
      }

      await apiJson<unknown>(apiBaseUrl, "/auth/session/active-organization", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: requestOrigin,
        body: {
          organizationId
        }
      });

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/invitations?message=${encodeURIComponent("Invitation accepted. The workspace membership is active for this account.")}`
      );
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/workspaces") {
      const selection = await loadWorkspaceSelectionModel({
        apiBaseUrl,
        cookie: request.headers.cookie
      });

      if (!selection) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to choose a workspace."
          })
        );
        return;
      }

      sendHtml(response, renderWorkspaceSelectionScreen(selection));
      return;
    }

    if (request.method === "POST" && url.pathname === "/workspaces/select") {
      const form = await readFormBody(request);
      const organizationId = optionalFormValue(form.get("organizationId"));
      const selected = await apiJson<unknown>(apiBaseUrl, "/auth/session/active-organization", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: requestOrigin,
        body: {
          organizationId
        }
      });

      if (selected.statusCode !== 200) {
        const selection = await loadWorkspaceSelectionModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Workspace selection failed. Choose an organization where your membership is active."
        });
        sendHtml(
          response,
          selection
            ? renderWorkspaceSelectionScreen(selection)
            : renderLoginScreen({ errorMessage: "Sign in to choose a workspace." }),
          selected.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader("location", "/");
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/organizations") {
      const form = await readFormBody(request);
      const created = await apiJson<CreateOrganizationWebResponse>(apiBaseUrl, "/organizations", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: requestOrigin,
        body: {
          name: form.get("name") ?? "",
          legalName: optionalFormValue(form.get("legalName")),
          primaryCountryCode: optionalFormValue(form.get("primaryCountryCode")) ?? "RO"
        }
      });

      if (created.statusCode !== 201) {
        const selection = await loadWorkspaceSelectionModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Workspace creation failed. Check the organization name and try again."
        });
        sendHtml(
          response,
          selection
            ? renderWorkspaceSelectionScreen(selection)
            : renderLoginScreen({ errorMessage: "Sign in to create a workspace." }),
          created.statusCode
        );
        return;
      }

      const createdOrganizationId = created.body.organization?.id;
      if (!createdOrganizationId) {
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Workspace Created Without Selection",
            summary: "The API created a workspace but did not return an organization identifier for the browser session.",
            statusLabel: "Selection blocked",
            statusTone: "warning",
            actionHref: "/workspaces",
            actionLabel: "Choose workspace"
          }),
          502
        );
        return;
      }

      const selected = await apiJson<unknown>(apiBaseUrl, "/auth/session/active-organization", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: requestOrigin,
        body: {
          organizationId: createdOrganizationId
        }
      });
      if (selected.statusCode !== 200) {
        const selection = await loadWorkspaceSelectionModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Workspace was created, but this browser session could not select it automatically."
        });
        sendHtml(
          response,
          selection
            ? renderWorkspaceSelectionScreen(selection)
            : renderLoginScreen({ errorMessage: "Sign in to select the new workspace." }),
          selected.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/onboarding/romania?locale=ro-RO&message=${encodeURIComponent("Workspace created and selected.")}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname.startsWith("/onboarding/romania/")) {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      const organizationId = session.body?.session?.activeOrganizationId;
      if (session.statusCode !== 200 || !organizationId) {
        response.statusCode = 303;
        response.setHeader("location", "/login");
        response.end();
        return;
      }

      const actionResult = await handleRomaniaWorkflowPost({
        apiBaseUrl,
        cookie: request.headers.cookie,
        organizationId,
        origin: requestOrigin,
        path: url.pathname,
        request
      });
      response.statusCode = 303;
      response.setHeader("location", `/onboarding/romania?locale=ro-RO&message=${encodeURIComponent(actionResult.message)}`);
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
        const selection = await loadWorkspaceSelectionModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          session: session.body
        });
        sendHtml(
          response,
          selection
            ? renderWorkspaceSelectionScreen(selection)
            : renderRuntimeMessageScreen({
                title: "Select A Workspace",
                summary: "The API session is valid, but no active organization is attached to this browser session yet.",
                statusLabel: "Session active",
                statusTone: "warning",
                actionHref: "/login",
                actionLabel: "Sign in again"
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
            summary: "This workspace does not have a dashboard snapshot yet. Open the Romania workflow, save answers, then evaluate readiness to create one.",
            statusLabel: "API connected",
            statusTone: "warning",
            actionHref: "/onboarding/romania?locale=ro-RO",
            actionLabel: "Open Romania workflow"
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
            organization: await resolveActiveOrganizationSurface(apiBaseUrl, request.headers.cookie, session.body)
          })
        )
      );
      return;
    }

    response.statusCode = 404;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("not found");
    } catch (error) {
      if (!response.headersSent) {
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Service Temporarily Unavailable",
            summary: webRequestErrorMessage(error),
            statusLabel: "Request failed",
            statusTone: "warning",
            actionHref: "/login",
            actionLabel: "Return to sign in"
          }),
          502
        );
        return;
      }
      response.end();
    }
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

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export const resolvePublicRequestOrigin = (request: { headers: IncomingHttpHeaders }, port: number): string => {
  const forwarded = parseForwardedHeader(singleHeader(request.headers.forwarded));
  const forwardedHost = firstCommaSeparatedHeaderValue(singleHeader(request.headers["x-forwarded-host"]));
  const forwardedProto = firstCommaSeparatedHeaderValue(singleHeader(request.headers["x-forwarded-proto"]));
  const host = forwardedHost ?? forwarded.host ?? singleHeader(request.headers.host) ?? `127.0.0.1:${port}`;
  const protocol = normalizePublicProtocol(forwardedProto ?? forwarded.proto);

  return `${protocol}://${host}`;
};

const singleHeader = (value: string | string[] | undefined): string | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const firstCommaSeparatedHeaderValue = (value: string | null): string | null => {
  const first = value?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
};

const parseForwardedHeader = (value: string | null): { host?: string; proto?: string } => {
  const first = firstCommaSeparatedHeaderValue(value);
  if (!first) {
    return {};
  }

  const entries = first.split(";").map((part) => part.trim());
  const result: { host?: string; proto?: string } = {};
  for (const entry of entries) {
    const [rawKey, ...rawValueParts] = entry.split("=");
    const key = rawKey?.trim().toLowerCase();
    const rawValue = rawValueParts.join("=").trim().replace(/^"|"$/g, "");
    if (key === "host" && rawValue.length > 0) {
      result.host = rawValue;
    }
    if (key === "proto" && rawValue.length > 0) {
      result.proto = rawValue;
    }
  }

  return result;
};

const normalizePublicProtocol = (value: string | null | undefined): "http" | "https" =>
  value?.toLowerCase() === "https" ? "https" : "http";

const webRequestErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message === "Form body is too large."
    ? "The submitted form is too large for the current public web runtime."
    : "The web runtime could not complete this request against the API. Check the API health and public origin configuration.";

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

const loadWorkspaceSelectionModel = async (input: {
  apiBaseUrl: string;
  cookie?: string;
  errorMessage?: string;
  session?: RuntimeSessionSurface;
}): Promise<WorkspaceSelectionModel | null> => {
  const session =
    input.session ??
    (await apiJson<RuntimeSessionSurface>(input.apiBaseUrl, "/auth/session", {
      method: "GET",
      cookie: input.cookie
    }));
  const sessionBody = "statusCode" in session ? session.body : session;
  if ("statusCode" in session && session.statusCode !== 200) {
    return null;
  }

  const organizations = await apiJson<OrganizationListResponse>(input.apiBaseUrl, "/organizations", {
    method: "GET",
    cookie: input.cookie
  });
  if (organizations.statusCode !== 200) {
    return null;
  }

  return {
    errorMessage: input.errorMessage,
    session: sessionBody,
    organizations: organizations.body.organizations
      .filter((item) => item.membership.status === "active")
      .map((item) => ({
        id: item.organization.id,
        name: item.organization.name,
        primaryCountryCode: item.organization.primaryCountryCode ?? null,
        billingStatus: item.organization.billingStatus,
        membershipStatus: item.membership.status,
        roleKeys: item.roleKeys,
        isActive: item.organization.id === sessionBody.session.activeOrganizationId
      }))
  };
};

const loadOrganizationInvitationScreenModel = async (input: {
  acceptOrganizationId?: string | null;
  actionMessage?: string | null;
  apiBaseUrl: string;
  cookie?: string;
  errorMessage?: string;
}): Promise<OrganizationInvitationScreenModel | null> => {
  const selection = await loadWorkspaceSelectionModel({
    apiBaseUrl: input.apiBaseUrl,
    cookie: input.cookie
  });
  if (!selection) {
    return null;
  }

  const activeOrganizationId = selection.session.session.activeOrganizationId ?? null;
  const activeOrganization =
    selection.organizations.find((organization) => organization.id === activeOrganizationId) ?? null;
  const roleKeys = activeOrganization?.roleKeys ?? [];

  return {
    acceptOrganizationId: input.acceptOrganizationId,
    actionMessage: input.actionMessage ?? undefined,
    activeOrganization,
    canCreateInvitations: roleKeys.includes("owner") || roleKeys.includes("org_admin"),
    errorMessage: input.errorMessage,
    organizations: selection.organizations,
    roleKeys,
    roleOptions: [...organizationInvitationRoleOptions],
    session: selection.session
  };
};

const resolveActiveOrganizationSurface = async (
  apiBaseUrl: string,
  cookie: string | undefined,
  session: RuntimeSessionSurface
) => {
  const activeOrganizationId = session.session.activeOrganizationId ?? "unknown";
  const selection = await loadWorkspaceSelectionModel({
    apiBaseUrl,
    cookie,
    session
  });
  const active = selection?.organizations.find((organization) => organization.id === activeOrganizationId);

  return {
    id: activeOrganizationId,
    name: active?.name ?? null,
    primaryCountryCode: active?.primaryCountryCode ?? null,
    subscriptionStatus: active?.billingStatus ?? null
  };
};

const loadRomaniaOnboardingRouteModel = async (input: {
  actionMessage?: string | null;
  apiBaseUrl: string;
  cookie?: string;
  locale?: string | null;
  organizationId: string;
}) => {
  const [state, evidence, billing, audit, dashboard] = await Promise.all([
    apiJson<RomaniaOnboardingStateResponse>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/ro/onboarding`,
      {
        method: "GET",
        cookie: input.cookie
      }
    ),
    apiJson<EvidenceListResponse>(input.apiBaseUrl, `/organizations/${encodeURIComponent(input.organizationId)}/evidence`, {
      method: "GET",
      cookie: input.cookie
    }),
    apiJson<BillingEntitlementsResponse>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/billing/entitlements`,
      {
        method: "GET",
        cookie: input.cookie
      }
    ),
    apiJson<AuditCheckpointsResponse>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/audit/checkpoints`,
      {
        method: "GET",
        cookie: input.cookie
      }
    ),
    apiJson<LatestDashboardSnapshotResponse>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/dashboards/snapshots/latest`,
      {
        method: "GET",
        cookie: input.cookie
      }
    )
  ]);

  return createRomaniaOnboardingRouteModel({
    actionMessage: input.actionMessage,
    auditCheckpointCount: audit.statusCode === 200 ? audit.body.checkpoints.length : 0,
    billingEntitlementCount: billing.statusCode === 200 ? billing.body.entitlements.length : 0,
    billingProviderKey: "none",
    classificationRun: state.statusCode === 200 ? state.body.classificationRun : null,
    dashboard: dashboard.statusCode === 200 ? dashboard.body.snapshot : null,
    evidenceArtifacts: evidence.statusCode === 200 ? evidence.body.artifacts : [],
    latestNotificationDraft: state.statusCode === 200 ? state.body.latestNotificationDraft : null,
    locale: input.locale,
    progress: state.statusCode === 200 ? state.body.progress : null
  });
};

const handleRomaniaWorkflowPost = async (input: {
  apiBaseUrl: string;
  cookie?: string;
  organizationId: string;
  origin: string;
  path: string;
  request: AsyncIterable<Buffer>;
}): Promise<{ message: string }> => {
  if (input.path === "/onboarding/romania/save") {
    const form = await readFormBody(input.request);
    const saved = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/ro/onboarding`,
      {
        method: "PUT",
        cookie: input.cookie,
        origin: input.origin,
        body: {
          answers: formToRomaniaAnswers(form)
        }
      }
    );
    return { message: messageForRomaniaAction(input.path, saved.statusCode) };
  }

  if (input.path === "/onboarding/romania/classify") {
    const classified = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/ro/classification`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: {}
      }
    );
    return { message: messageForRomaniaAction(input.path, classified.statusCode) };
  }

  if (input.path === "/onboarding/romania/notification-draft") {
    const draft = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/ro/notification-draft/from-onboarding`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: {
          locale: "ro-RO"
        }
      }
    );
    return { message: messageForRomaniaAction(input.path, draft.statusCode) };
  }

  if (input.path === "/onboarding/romania/evaluate") {
    const state = await loadRoState(input);
    const assessmentId = state.progress?.assessmentId;
    if (!assessmentId) {
      return { message: "Save Romania onboarding progress before evaluating readiness." };
    }
    const evaluated = await apiJson<unknown>(input.apiBaseUrl, `/organizations/${encodeURIComponent(input.organizationId)}/compliance/evaluate`, {
      method: "POST",
      cookie: input.cookie,
      origin: input.origin,
      body: {
        assessmentId,
        countryPack: {
          countryCode: "RO",
          completeness: "planned_full_pack",
          countryPackStatus: "planned_full_pack",
          unsupportedFeatures: [
            {
              featureKey: "dnsc_direct_submission",
              reason: "PureSOC creates an internal draft only; no authority submission is implemented."
            },
            {
              featureKey: "ro_legal_activation",
              reason: "Romania country-pack logic remains review-required until product/legal approval."
            }
          ]
        },
        jurisdiction: "EU"
      }
    });
    if (apiSucceeded(evaluated.statusCode)) {
      await createDashboardSnapshot(input, assessmentId);
    }
    return { message: messageForRomaniaAction(input.path, evaluated.statusCode) };
  }

  if (input.path === "/onboarding/romania/evidence") {
    const form = await readFormBody(input.request);
    const state = await loadRoState(input);
    const uploaded = await apiJson<unknown>(input.apiBaseUrl, `/organizations/${encodeURIComponent(input.organizationId)}/evidence/upload`, {
      method: "POST",
      cookie: input.cookie,
      origin: input.origin,
      body: {
        content: Buffer.from(String(form.get("evidenceContent") ?? ""), "utf8").toString("base64"),
        contentEncoding: "base64",
        controlId: optionalFormValue(form.get("controlId")),
        jurisdiction: "EU",
        linkedAssessmentId: state.progress?.assessmentId,
        linkedSourceRecordId: "eu-nis2-art-21",
        mimeType: "text/plain",
        requirementKey: "m78-local-evidence",
        sourceType: "manual_upload",
        title: optionalFormValue(form.get("evidenceTitle")) ?? "Romania readiness evidence"
      }
    });
    if (apiSucceeded(uploaded.statusCode) && state.progress?.assessmentId) {
      await createDashboardSnapshot(input, state.progress.assessmentId);
    }
    return { message: messageForRomaniaAction(input.path, uploaded.statusCode) };
  }

  if (input.path === "/onboarding/romania/reports/internal-readiness") {
    const state = await loadRoState(input);
    if (!state.progress?.assessmentId) {
      return { message: "Evaluate readiness before generating the internal readiness export." };
    }
    const report = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/reports/internal-readiness`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: {
          assessmentId: state.progress.assessmentId
        }
      }
    );
    return { message: messageForRomaniaAction(input.path, report.statusCode) };
  }

  if (input.path === "/onboarding/romania/reports/notification-draft") {
    const state = await loadRoState(input);
    const reportBody = notificationDraftReportBody(input.organizationId, state);
    if (!reportBody) {
      return { message: "Generate a Romania notification draft before exporting it." };
    }
    const report = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/reports/romania-notification-draft`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: reportBody
      }
    );
    return { message: messageForRomaniaAction(input.path, report.statusCode) };
  }

  if (input.path === "/onboarding/romania/audit/checkpoint") {
    const checkpoint = await apiJson<unknown>(input.apiBaseUrl, `/organizations/${encodeURIComponent(input.organizationId)}/audit/checkpoints`, {
      method: "POST",
      cookie: input.cookie,
      origin: input.origin,
      body: {}
    });
    return { message: messageForRomaniaAction(input.path, checkpoint.statusCode) };
  }

  return { message: "Romania readiness action is not available." };
};

const loadRoState = async (input: {
  apiBaseUrl: string;
  cookie?: string;
  organizationId: string;
}): Promise<RomaniaOnboardingStateResponse> => {
  const state = await apiJson<RomaniaOnboardingStateResponse>(
    input.apiBaseUrl,
    `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/ro/onboarding`,
    {
      method: "GET",
      cookie: input.cookie
    }
  );

  return state.body;
};

const createDashboardSnapshot = async (
  input: {
    apiBaseUrl: string;
    cookie?: string;
    organizationId: string;
    origin: string;
  },
  assessmentId: string
) => {
  await apiJson<unknown>(input.apiBaseUrl, `/organizations/${encodeURIComponent(input.organizationId)}/dashboards/snapshots`, {
    method: "POST",
    cookie: input.cookie,
    origin: input.origin,
    body: {
      assessmentId,
      countryPackCompleteness: 64
    }
  });
};

const formToRomaniaAnswers = (form: URLSearchParams): Record<string, unknown> => {
  const employeeCount = Number(form.get("employeeCount") ?? "");
  const annualTurnoverEur = Number(form.get("annualTurnoverEur") ?? "");
  const balanceSheetTotalEur = Number(form.get("balanceSheetTotalEur") ?? "");
  const serviceCodes = form.getAll("serviceCodes").filter((value) => value.length > 0);
  const legacyServiceCode = optionalFormValue(form.get("serviceCode"));

  return {
    activity: {
      mainNaceCode: optionalFormValue(form.get("mainNaceCode")),
      secondaryNaceCodes: splitList(optionalFormValue(form.get("secondaryNaceCodes")))
    },
    address: {
      city: optionalFormValue(form.get("city")),
      country: optionalFormValue(form.get("country")),
      county: optionalFormValue(form.get("county")),
      number: optionalFormValue(form.get("number")),
      postalCode: optionalFormValue(form.get("postalCode")),
      street: optionalFormValue(form.get("street"))
    },
    article9: {
      nationalOrRegionalCriticality: form.get("nationalOrRegionalCriticality") === "true",
      publicSafetySecurityOrHealthImpact: optionalFormValue(form.get("publicSafetySecurityOrHealthImpact")) ?? undefined,
      soleProviderEssentialService: form.get("soleProviderEssentialService") === "true",
      systemicRisk: optionalFormValue(form.get("systemicRisk")) ?? undefined
    },
    attachedDocumentIds: splitList(optionalFormValue(form.get("attachedDocumentIds"))),
    contact: {
      email: optionalFormValue(form.get("email")),
      mobilePhone: optionalFormValue(form.get("mobilePhone")),
      phone: optionalFormValue(form.get("phone")),
      websiteUrl: optionalFormValue(form.get("websiteUrl"))
    },
    cybersecurityResponsible: {
      email: optionalFormValue(form.get("cybersecurityEmail")),
      name: optionalFormValue(form.get("cybersecurityName")),
      phone: optionalFormValue(form.get("cybersecurityPhone")),
      role: optionalFormValue(form.get("cybersecurityRole"))
    },
    entity: {
      cui: optionalFormValue(form.get("cui")),
      legalName: optionalFormValue(form.get("legalName")),
      nationalRegistrationNumber: optionalFormValue(form.get("nationalRegistrationNumber"))
    },
    legalRepresentative: {
      email: optionalFormValue(form.get("legalRepresentativeEmail")),
      name: optionalFormValue(form.get("legalRepresentativeName")),
      phone: optionalFormValue(form.get("legalRepresentativePhone")),
      role: optionalFormValue(form.get("legalRepresentativeRole"))
    },
    network: {
      publicIpRanges: splitList(optionalFormValue(form.get("publicIpRanges"))),
      systemsDescription: optionalFormValue(form.get("systemsDescription"))
    },
    permanentMonitoringContact: {
      email: optionalFormValue(form.get("monitoringEmail")),
      name: optionalFormValue(form.get("monitoringName")),
      phone: optionalFormValue(form.get("monitoringPhone")),
      role: optionalFormValue(form.get("monitoringRole"))
    },
    relationship: {
      criticalEntityInRomaniaLaw294: form.get("criticalEntityInRomaniaLaw294") === "true",
      establishedInRomania: form.get("establishedInRomania") === "true",
      mainOfficeInRomania: form.get("mainOfficeInRomania") === "true",
      providesServicesInAnotherEuMemberState: form.get("providesServicesInAnotherEuMemberState") === "true",
      providesServicesInRomania: form.get("providesServicesInRomania") === "true",
      publicAdministrationEstablishedByRomania: form.get("publicAdministrationEstablishedByRomania") === "true"
    },
    selectedServiceTypeCodes: serviceCodes.length > 0 ? serviceCodes : [legacyServiceCode].filter(Boolean),
    size: {
      annualTurnoverEur: Number.isFinite(annualTurnoverEur) && annualTurnoverEur > 0 ? annualTurnoverEur : undefined,
      balanceSheetTotalEur: Number.isFinite(balanceSheetTotalEur) && balanceSheetTotalEur > 0 ? balanceSheetTotalEur : undefined,
      employeeCount: Number.isFinite(employeeCount) && employeeCount > 0 ? employeeCount : undefined,
      sizeCategory: optionalFormValue(form.get("sizeCategory"))
    }
  };
};

const splitList = (value: string | null): string[] =>
  value
    ? value
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    : [];

const notificationDraftReportBody = (
  organizationId: string,
  state: RomaniaOnboardingStateResponse
): Record<string, unknown> | null => {
  const latest = state.latestNotificationDraft;
  if (!latest || !isRecord(latest.payload)) {
    return null;
  }

  const envelopePayload = isRecord(latest.payload.payload) ? latest.payload.payload : {};
  const fields = Array.isArray(envelopePayload.fields) ? envelopePayload.fields.filter(isRecord) : [];

  return {
    assessmentId: state.progress?.assessmentId,
    classificationRunId: state.classificationRun?.id,
    locale: "ro-RO",
    notificationDraftId: latest.id,
    onboardingProgressId: state.progress?.id,
    organizationId,
    payload: envelopePayload,
    sourceMappedFields: fields.map((field) => ({
      fieldKey: typeof field.key === "string" ? field.key : "unknown_field",
      sourceReferences: Array.isArray(field.sourceReferences) ? field.sourceReferences : [],
      value: field.value ?? null
    })),
    sourceReferences: Array.isArray(latest.payload.sourceReferences) ? latest.payload.sourceReferences : [],
    status: latest.status ?? "draft"
  };
};

const messageForRomaniaAction = (path: string, statusCode = 200): string => {
  if (!apiSucceeded(statusCode)) {
    const failures: Record<string, string> = {
      "/onboarding/romania/save": "Romania onboarding progress was not saved. Check required fields and try again.",
      "/onboarding/romania/classify": "Classification could not be generated from the saved answers.",
      "/onboarding/romania/notification-draft": "Notification draft could not be generated from saved answers.",
      "/onboarding/romania/evaluate": "Internal readiness evaluation could not be generated.",
      "/onboarding/romania/evidence": "Local evidence could not be attached.",
      "/onboarding/romania/reports/internal-readiness": "Internal readiness export could not be generated.",
      "/onboarding/romania/reports/notification-draft": "Notification draft export could not be generated.",
      "/onboarding/romania/audit/checkpoint": "Audit checkpoint metadata could not be recorded."
    };

    return failures[path] ?? "Romania readiness action could not be completed.";
  }

  const messages: Record<string, string> = {
    "/onboarding/romania/save": "Romania onboarding progress saved.",
    "/onboarding/romania/classify": "Preliminary Romania classification generated from saved answers.",
    "/onboarding/romania/notification-draft": "Romania notification draft generated. DNSC submission remains unavailable.",
    "/onboarding/romania/evaluate": "Internal readiness evaluation and dashboard snapshot generated.",
    "/onboarding/romania/evidence": "Local evidence attached to the workspace.",
    "/onboarding/romania/reports/internal-readiness": "Internal readiness JSON export generated.",
    "/onboarding/romania/reports/notification-draft": "Romania notification draft JSON export generated.",
    "/onboarding/romania/audit/checkpoint": "Audit checkpoint metadata recorded without WORM or external notarization claims."
  };

  return messages[path] ?? "Romania readiness action completed.";
};

const apiSucceeded = (statusCode: number): boolean => statusCode >= 200 && statusCode < 300;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const apiJson = async <T>(
  apiBaseUrl: string,
  path: string,
  input: {
    method: "GET" | "POST" | "PUT";
    body?: Record<string, unknown>;
    cookie?: string;
    origin?: string;
  }
): Promise<{ statusCode: number; body: T; setCookie?: string }> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: input.method,
    headers: {
      ...(input.method === "POST" || input.method === "PUT" ? { "content-type": "application/json" } : {}),
      ...(input.cookie ? { cookie: input.cookie } : {}),
      ...(input.origin ? { origin: input.origin } : {})
    },
    body: input.method === "POST" || input.method === "PUT" ? JSON.stringify(input.body ?? {}) : undefined
  });

  return {
    statusCode: response.status,
    body: (await response.json()) as T,
    setCookie: response.headers.get("set-cookie") ?? undefined
  };
};
