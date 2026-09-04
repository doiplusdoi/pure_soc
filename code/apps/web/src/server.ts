import { createServer, type IncomingHttpHeaders, type IncomingMessage } from "node:http";

import type { DashboardSnapshotContract } from "@puresoc/dashboards";

import {
  createOperationalConsoleRuntimeModel,
  type ActiveTenantAccessBannerSurface,
  type DashboardSnapshotHistoryPoint,
  disconnectedMicrosoft365Surface,
  organizationInvitationRoleOptions,
  createRomaniaOnboardingRouteModel,
  type Microsoft365HealthSurface,
  type Microsoft365ModuleSurface,
  type Nis2CountryAwareOnboardingModel,
  type Nis2CountryPackDefinitionSurface,
  type Nis2CountryPackStructuredClassificationSurface,
  type NotificationSettingsScreenModel,
  type OrganizationInvitationScreenModel,
  type PartnerConsoleModel,
  type PartnerTenantSessionSurface,
  type OperationalStatus,
  type RomaniaOnboardingRouteInput,
  type ProductV1ConsoleModel,
  type ProductV1ConsoleSection,
  type RuntimeSessionSurface,
  type WorkspaceSelectionModel
} from "./app-data";
import {
  renderLoginScreen as renderBaseLoginScreen,
  renderMicrosoft365ConnectorPage,
  renderNis2CountryAwareOnboardingScreen,
  renderNotificationSettingsScreen,
  renderEmailVerificationScreen,
  renderOrganizationInvitationsScreen,
  renderPartnerConsoleScreen,
  renderProductMvpShell,
  renderProductV1ConsoleScreen,
  renderOperationalConsole,
  renderRegisterScreen as renderBaseRegisterScreen,
  renderRomaniaOnboardingRoute,
  renderRuntimeMessageScreen,
  renderWorkspaceSelectionScreen,
  type ProductMvpRoute,
  type ProductMvpShellModel,
  type RomaniaOnboardingScreen
} from "./operational-console";
import { resolveProductLocale } from "./product-localization";

export interface WebServerOptions {
  apiBaseUrl?: string;
  apiRequestOrigin?: string;
  defaultLocale?: string;
  listenHost?: string;
  publicBaseUrl?: string;
}

const romaniaOnboardingScreenKeys = new Set<RomaniaOnboardingScreen>([
  "company",
  "address",
  "legal",
  "size",
  "services",
  "contacts",
  "systems",
  "article9",
  "outputs",
  "connector",
  "gaps"
]);

const resolveRomaniaOnboardingScreen = (pathname: string): RomaniaOnboardingScreen | null => {
  if (pathname === "/onboarding/romania") {
    return "company";
  }

  const match = /^\/onboarding\/romania\/([^/]+)$/.exec(pathname);
  const screen = match?.[1];
  return isRomaniaOnboardingScreen(screen) ? screen : null;
};

const isRomaniaOnboardingScreen = (value: unknown): value is RomaniaOnboardingScreen =>
  typeof value === "string" && romaniaOnboardingScreenKeys.has(value as RomaniaOnboardingScreen);

const romaniaOnboardingPath = (screen: RomaniaOnboardingScreen): string => `/onboarding/romania/${screen}`;
const microsoft365FirstConnectionBundles = ["m365_read_baseline"] as const;
const internalComposeWebOrigin = "http://puresoc-web:3000";

interface LatestDashboardSnapshotResponse {
  snapshot: DashboardSnapshotContract;
}

interface DashboardSnapshotHistoryResponse {
  snapshots: DashboardSnapshotHistoryPoint[];
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
      logoDataUrl?: string | null;
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

interface ProviderConnectionListResponse {
  connections: Array<{
    id: string;
    providerKey: string;
    displayName: string;
    externalTenantId?: string | null;
    externalTenantName?: string | null;
    status: string;
    readEnabled: boolean;
    writeEnabled: boolean;
    lastSuccessfulSyncAt?: string | null;
  }>;
}

interface Microsoft365ConsentBeginWebResponse {
  url?: string;
  state?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

interface OidcBeginWebResponse {
  redirectUrl?: string;
  providerKey?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

interface Microsoft365HealthWebResponse {
  connection: {
    id: string;
    displayName: string;
    externalTenantId?: string | null;
    externalTenantName?: string | null;
    status: string;
    writeEnabled: boolean;
    lastSuccessfulSyncAt?: string | null;
  };
  status: string;
  connectorMode?: string;
  effectiveConnectorMode?: string;
  fixtureSet?: string;
  permissionBundles: Array<{
    bundleKey: string;
    enabled: boolean;
  }>;
  capabilities: Array<{
    moduleKey: string;
    status: string;
    statusReason?: string;
  }>;
  moduleStatuses: Array<{
    moduleKey: string;
    status: string;
    missingPermissions?: string[];
    missingLicenses?: string[];
    statusReason?: string;
    completedAt?: string;
  }>;
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

interface NotificationChannelsResponse {
  channels: NotificationSettingsScreenModel["channels"];
}

interface NotificationLogsResponse {
  logs: NotificationSettingsScreenModel["logs"];
}

interface NotificationOperatorAlertsResponse {
  operatorAlerts: NotificationSettingsScreenModel["operatorAlerts"];
}

interface PartnerListWebResponse {
  partners: PartnerConsoleModel["partners"];
}

interface PartnerPortfolioWebResponse {
  metrics: PartnerConsoleModel["metrics"];
  opportunities: PartnerConsoleModel["opportunities"];
  grants: Array<{
    id: string;
    organizationId: string;
    grantLevel: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    organization: PartnerConsoleModel["portfolio"][number]["organization"];
    snapshot?: PartnerConsoleModel["portfolio"][number]["snapshot"];
  }>;
}

interface PartnerTenantSessionWebResponse {
  tenantSession: PartnerTenantSessionSurface | null;
}

interface Nis2CountryPackListWebResponse {
  countryPacks: Nis2CountryPackDefinitionSurface[];
  frameworkKey: string;
}

interface Nis2CountryPackClassificationWebResponse {
  classification: Nis2CountryPackStructuredClassificationSurface;
  countryPack: Nis2CountryPackDefinitionSurface;
}

interface Nis2CountryOnboardingStateWebResponse {
  classificationRun: Nis2CountryAwareOnboardingModel["classification"];
  countryPack: Nis2CountryPackDefinitionSurface;
  progress: Nis2CountryAwareOnboardingModel["progress"];
  screens: Nis2CountryAwareOnboardingModel["onboardingScreens"];
}

interface Nis2CountryOnboardingReportWebResponse {
  assessmentId: string;
  report: {
    id: string;
    assessmentId?: string;
    status: string;
  };
}

interface CreatePartnerWebResponse {
  partner?: {
    id?: string;
  };
}

interface CreatePartnerCustomerWebResponse {
  organization?: {
    id?: string;
    name?: string;
  };
}

interface ProductDashboardWebResponse {
  dashboard: ProductMvpShellModel["dashboard"];
}

interface ProductCustomersWebResponse {
  customers: ProductMvpShellModel["customers"];
}

interface ProductConnectorsWebResponse {
  connectors: NonNullable<ProductMvpShellModel["details"]>["connectors"];
}

interface ProductOnboardingAnswersWebResponse {
  answers: Record<string, unknown>;
  countryCode: string;
  progress?: Record<string, unknown> | null;
  schema?: Record<string, unknown> | null;
}

interface ProductOnboardingSchemaWebResponse extends Record<string, unknown> {
  country: string;
  fields: Array<Record<string, unknown>>;
  screens: Array<Record<string, unknown>>;
}

interface ProductGapsWebResponse {
  gaps: NonNullable<ProductMvpShellModel["details"]>["gaps"];
}

interface ProductRecommendationsWebResponse {
  recommendations: NonNullable<ProductMvpShellModel["details"]>["recommendations"];
}

interface ProductEvidenceWebResponse {
  evidence: NonNullable<ProductMvpShellModel["details"]>["evidence"];
}

interface ProductReportsWebResponse {
  reports: NonNullable<ProductMvpShellModel["details"]>["reports"];
}

interface ProductRemediationWebResponse {
  actions: NonNullable<ProductMvpShellModel["details"]>["remediationActions"];
}

interface ProductMicrosoft365FindingsWebResponse {
  findings: NonNullable<ProductMvpShellModel["details"]>["findings"];
}

interface ProductV1PageWebResponse {
  data: Array<Record<string, unknown>>;
  page?: {
    limit: number;
    nextCursor?: string | null;
  };
}

interface ProductV1SetupWebResponse {
  setup: Record<string, unknown>;
}

interface ProductV1NotificationPreferencesWebResponse {
  notificationPreferences: Record<string, unknown>;
}

interface ProductV1MeWebResponse {
  user: RuntimeSessionSurface["user"];
  session: RuntimeSessionSurface["session"];
}

const productRouteByPath = new Map<string, ProductMvpRoute>([
  ["/customers", "customers"],
  ["/dashboard", "dashboard"],
  ["/evidence", "evidence"],
  ["/gap-analyzer", "gap_analyzer"],
  ["/microsoft365", "microsoft365"],
  ["/connectors", "connectors"],
  ["/connectors/microsoft365", "connectors_microsoft365"],
  ["/onboarding", "onboarding"],
  ["/onboarding/company", "onboarding"],
  ["/onboarding/locations", "onboarding"],
  ["/onboarding/contacts", "onboarding"],
  ["/onboarding/size", "onboarding"],
  ["/onboarding/services", "onboarding"],
  ["/onboarding/country-scope", "onboarding"],
  ["/onboarding/systems", "onboarding"],
  ["/onboarding/providers", "onboarding"],
  ["/onboarding/security-baseline", "onboarding"],
  ["/onboarding/evidence", "onboarding"],
  ["/onboarding/review", "onboarding"],
  ["/remediation", "remediation"],
  ["/reports", "reports"],
  ["/settings", "settings"]
]);

const appOrganizationRouteTargets = new Map<string, string>([
  ["", "/dashboard"],
  ["overview", "/dashboard"],
  ["dashboard", "/dashboard"],
  ["setup", "/onboarding"],
  ["setup/microsoft365", "/connectors/microsoft365"],
  ["services", "/onboarding"],
  ["people", "/onboarding"],
  ["systems", "/onboarding"],
  ["suppliers", "/onboarding"],
  ["connectors", "/connectors"],
  ["connectors/microsoft365", "/connectors/microsoft365"],
  ["security", "/microsoft365"],
  ["security/findings", "/microsoft365"],
  ["findings", "/microsoft365"],
  ["remediation", "/remediation"],
  ["evidence", "/evidence"],
  ["reports", "/reports"],
  ["risks", "/gap-analyzer"],
  ["policies", "/settings"],
  ["governance", "/settings"],
  ["incidents", "/gap-analyzer"],
  ["audit", "/reports"],
  ["settings", "/settings"]
]);

const productV1SectionByAppTail = new Map<string, ProductV1ConsoleSection>([
  ["", "overview"],
  ["overview", "overview"],
  ["dashboard", "overview"],
  ["setup", "setup"],
  ["setup/microsoft365", "setup"],
  ["services", "business"],
  ["people", "business"],
  ["systems", "business"],
  ["suppliers", "business"],
  ["security", "security"],
  ["security/findings", "security"],
  ["findings", "security"],
  ["remediation", "security"],
  ["tasks", "security"],
  ["incidents", "incidents"],
  ["risks", "risk"],
  ["risk", "risk"],
  ["policies", "risk"],
  ["governance", "governance"],
  ["evidence", "evidence"],
  ["reports", "reports"],
  ["connectors", "connectors"],
  ["connectors/microsoft365", "connectors"],
  ["notifications", "notifications"],
  ["audit", "events"],
  ["events", "events"]
]);

interface ProductV1AppOrganizationRoute {
  organizationId: string;
  routeTail: string;
  section: ProductV1ConsoleSection;
}

interface ProductV1AppSetupRoute {
  step: string | null;
}

interface ProductV1AppPartnerRoute {
  partnerId: string;
}

type PartnerConsoleRouteMode = "app" | "legacy";

interface PartnerConsolePostRoute {
  partnerId: string;
  routeMode: PartnerConsoleRouteMode;
}

interface PartnerConsoleSessionExitRoute extends PartnerConsolePostRoute {
  sessionId: string;
}

const productV1AppOrganizationRoute = (pathname: string): ProductV1AppOrganizationRoute | null => {
  const match = /^\/app\/o\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (!match) {
    return null;
  }
  const tail = (match[2] ?? "").replace(/^\/+|\/+$/g, "");
  const section = productV1SectionByAppTail.get(tail) ?? "overview";
  return {
    organizationId: decodeURIComponent(match[1] ?? ""),
    routeTail: productV1CanonicalRouteTail(tail, section),
    section
  };
};

const productV1AppSetupRoute = (pathname: string): ProductV1AppSetupRoute | null => {
  if (pathname === "/app/setup") {
    return { step: null };
  }

  const match = /^\/app\/setup\/([^/]+)$/.exec(pathname);
  return match ? { step: decodeURIComponent(match[1] ?? "") } : null;
};

const productV1AppPartnerRoute = (pathname: string): ProductV1AppPartnerRoute | null => {
  const match = /^\/app\/partner\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (!match) {
    return null;
  }

  return {
    partnerId: decodeURIComponent(match[1] ?? "")
  };
};

const productV1AppAdminRoute = (pathname: string): boolean =>
  pathname === "/app/admin" || pathname.startsWith("/app/admin/");

const productV1SectionPath = (section: ProductV1ConsoleSection): string =>
  ({
    overview: "overview",
    setup: "setup",
    business: "services",
    security: "security/findings",
    incidents: "incidents",
    risk: "risks",
    governance: "governance",
    evidence: "evidence",
    reports: "reports",
    connectors: "connectors/microsoft365",
    notifications: "notifications",
    events: "audit"
  })[section];

const productV1RouteTailAliases = new Map<string, string>([
  ["", "overview"],
  ["dashboard", "overview"],
  ["findings", "security/findings"],
  ["risk", "risks"],
  ["events", "audit"]
]);

const productV1CanonicalRouteTail = (routeTail: string, section: ProductV1ConsoleSection): string => {
  const normalized = routeTail.replace(/^\/+|\/+$/g, "");
  const alias = productV1RouteTailAliases.get(normalized);
  if (alias) {
    return alias;
  }
  return productV1SectionByAppTail.has(normalized) ? normalized : productV1SectionPath(section);
};

const onboardingScreenFromPath = (pathname: string): string | undefined => {
  if (pathname === "/onboarding") {
    return undefined;
  }
  const match = /^\/onboarding\/([^/]+)$/.exec(pathname);
  return match?.[1];
};

const appRouteRedirectTarget = (pathname: string): string | null => {
  if (pathname === "/app") {
    return "/dashboard";
  }

  const organizationMatch = /^\/app\/o\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (!organizationMatch) {
    return null;
  }

  const organizationId = organizationMatch[1] ?? "";
  const routeTail = organizationMatch[2] ?? "";
  const target = appOrganizationRouteTargets.get(routeTail) ?? "/dashboard";
  return `${target}?organizationId=${encodeURIComponent(organizationId)}`;
};

const mergeRedirectSearch = (target: string, sourceSearch: string): string => {
  if (!sourceSearch) {
    return target;
  }
  return `${target}${target.includes("?") ? "&" : "?"}${sourceSearch.slice(1)}`;
};

const partnerCustomerCreateRoute = (pathname: string): PartnerConsolePostRoute | null => {
  const appMatch = /^\/app\/partner\/([^/]+)\/customers$/.exec(pathname);
  if (appMatch) {
    return { partnerId: decodeURIComponent(appMatch[1] ?? ""), routeMode: "app" };
  }

  const legacyMatch = /^\/partners\/([^/]+)\/customers$/.exec(pathname);
  return legacyMatch ? { partnerId: decodeURIComponent(legacyMatch[1] ?? ""), routeMode: "legacy" } : null;
};

const partnerTenantSessionStartRoute = (pathname: string): PartnerConsolePostRoute | null => {
  const appMatch = /^\/app\/partner\/([^/]+)\/tenant-sessions$/.exec(pathname);
  if (appMatch) {
    return { partnerId: decodeURIComponent(appMatch[1] ?? ""), routeMode: "app" };
  }

  const legacyMatch = /^\/partners\/([^/]+)\/tenant-sessions$/.exec(pathname);
  return legacyMatch ? { partnerId: decodeURIComponent(legacyMatch[1] ?? ""), routeMode: "legacy" } : null;
};

const partnerTenantSessionExitRoute = (pathname: string): PartnerConsoleSessionExitRoute | null => {
  const appMatch = /^\/app\/partner\/([^/]+)\/tenant-sessions\/([^/]+)\/exit$/.exec(pathname);
  if (appMatch) {
    return {
      partnerId: decodeURIComponent(appMatch[1] ?? ""),
      routeMode: "app",
      sessionId: decodeURIComponent(appMatch[2] ?? "")
    };
  }

  const legacyMatch = /^\/partners\/([^/]+)\/tenant-sessions\/([^/]+)\/exit$/.exec(pathname);
  return legacyMatch
    ? {
        partnerId: decodeURIComponent(legacyMatch[1] ?? ""),
        routeMode: "legacy",
        sessionId: decodeURIComponent(legacyMatch[2] ?? "")
      }
    : null;
};

const partnerConsoleRedirectLocation = (
  partnerId: string,
  routeMode: PartnerConsoleRouteMode,
  message: string
): string => {
  const base =
    routeMode === "app"
      ? `/app/partner/${encodeURIComponent(partnerId)}`
      : `/partners?partnerId=${encodeURIComponent(partnerId)}`;
  return `${base}${base.includes("?") ? "&" : "?"}message=${encodeURIComponent(message)}`;
};

export const startWebServer = (port = Number(process.env.PORT ?? 3000), options: WebServerOptions = {}) => {
  const apiBaseUrl = normalizeBaseUrl(
    options.apiBaseUrl ??
      process.env.PURESOC_WEB_API_BASE_URL ??
      process.env.PURESOC_API_BASE_URL ??
      process.env.API_BASE_URL ??
      "http://127.0.0.1:3001"
  );
  const microsoftEntraSignInEnabled = process.env.PURESOC_AUTH_MICROSOFT_ENTRA_ENABLED === "true";
  const configuredDefaultLocale = resolveProductLocale(
    options.defaultLocale ?? process.env.PURESOC_WEB_DEFAULT_LOCALE ?? "en"
  );
  const configuredApiRequestOrigin =
    options.apiRequestOrigin ??
    process.env.PURESOC_WEB_API_REQUEST_ORIGIN ??
    process.env.PURESOC_API_REQUEST_ORIGIN;
  const renderLoginScreen = (screenOptions: Parameters<typeof renderBaseLoginScreen>[0] = {}) =>
    typeof screenOptions === "string"
      ? renderBaseLoginScreen(screenOptions)
      : renderBaseLoginScreen({
          ...screenOptions,
          locale: screenOptions.locale ?? configuredDefaultLocale,
          microsoftEntraEnabled: microsoftEntraSignInEnabled
        });
  const renderRegisterScreen = (screenOptions: Parameters<typeof renderBaseRegisterScreen>[0] = {}) =>
    renderBaseRegisterScreen({
      ...screenOptions,
      locale: screenOptions.locale ?? configuredDefaultLocale,
      microsoftEntraEnabled: microsoftEntraSignInEnabled
    });

  const server = createServer(async (request, response) => {
    try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const requestLocale = resolveWebRequestLocale(request.headers.cookie, configuredDefaultLocale);

    const localeRoute = /^\/locale\/(en|ro)$/.exec(url.pathname);
    if (request.method === "GET" && localeRoute) {
      const locale = resolveProductLocale(localeRoute[1]);
      response.statusCode = 303;
      response.setHeader("set-cookie", `${webLocaleCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`);
      response.setHeader("location", safeLocaleReturnPath(request.headers.referer));
      response.end();
      return;
    }

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

    if (request.method === "GET" && url.pathname === "/") {
      response.statusCode = 303;
      response.setHeader("location", "/dashboard");
      response.end();
      return;
    }

    const productV1AppRoute = productV1AppOrganizationRoute(url.pathname);
    if (productV1AppRoute && request.method === "GET") {
      const model = await loadProductV1ConsoleModel({
        actionMessage: url.searchParams.get("message"),
        apiBaseUrl,
        cookie: request.headers.cookie,
        organizationId: productV1AppRoute.organizationId,
        routeTail: productV1AppRoute.routeTail,
        section: productV1AppRoute.section
      });

      if (!model) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to open the organization-scoped product workspace."
          }),
          401
        );
        return;
      }

      sendHtml(response, renderProductV1ConsoleScreen(model), model.errorMessage ? 403 : 200);
      return;
    }

    if (productV1AppRoute && request.method === "POST") {
      const requestOrigin =
        options.publicBaseUrl ??
        process.env.PURESOC_WEB_PUBLIC_BASE_URL ??
        process.env.PURESOC_PUBLIC_BASE_URL ??
        resolvePublicRequestOrigin(request, port);
      const apiRequestOrigin = resolveApiRequestOrigin(apiBaseUrl, requestOrigin, configuredApiRequestOrigin);
      const result = await handleProductV1ConsolePost({
        apiBaseUrl,
        cookie: request.headers.cookie,
        organizationId: productV1AppRoute.organizationId,
        origin: apiRequestOrigin,
        request,
        section: productV1AppRoute.section
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/app/o/${encodeURIComponent(productV1AppRoute.organizationId)}/${productV1AppRoute.routeTail}?message=${encodeURIComponent(
          result.message
        )}`
      );
      response.end();
      return;
    }

    const productV1SetupRoute = productV1AppSetupRoute(url.pathname);
    if (productV1SetupRoute && request.method === "GET") {
      const activeOrganizationId = await loadProductV1ActiveOrganizationId({
        apiBaseUrl,
        cookie: request.headers.cookie
      });

      if (!activeOrganizationId) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in and select a workspace to continue setup."
          }),
          401
        );
        return;
      }

      const model = await loadProductV1ConsoleModel({
        actionMessage: url.searchParams.get("message"),
        apiBaseUrl,
        cookie: request.headers.cookie,
        organizationId: activeOrganizationId,
        routeTail: productV1SetupRoute.step ? `setup/${productV1SetupRoute.step}` : "setup",
        section: "setup"
      });

      if (!model) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in and select a workspace to continue setup."
          }),
          401
        );
        return;
      }

      sendHtml(response, renderProductV1ConsoleScreen(model), model.errorMessage ? 403 : 200);
      return;
    }

    if (productV1SetupRoute && request.method === "POST") {
      const activeOrganizationId = await loadProductV1ActiveOrganizationId({
        apiBaseUrl,
        cookie: request.headers.cookie
      });

      if (!activeOrganizationId) {
        response.statusCode = 303;
        response.setHeader("location", "/login");
        response.end();
        return;
      }

      const requestOrigin =
        options.publicBaseUrl ??
        process.env.PURESOC_WEB_PUBLIC_BASE_URL ??
        process.env.PURESOC_PUBLIC_BASE_URL ??
        resolvePublicRequestOrigin(request, port);
      const apiRequestOrigin = resolveApiRequestOrigin(apiBaseUrl, requestOrigin, configuredApiRequestOrigin);
      const result = await handleProductV1ConsolePost({
        apiBaseUrl,
        cookie: request.headers.cookie,
        organizationId: activeOrganizationId,
        origin: apiRequestOrigin,
        request,
        section: "setup"
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        `${url.pathname}?message=${encodeURIComponent(result.message)}`
      );
      response.end();
      return;
    }

    const productV1PartnerRoute = productV1AppPartnerRoute(url.pathname);
    if (productV1PartnerRoute && request.method === "GET") {
      const partnerModel = await loadPartnerConsoleModel({
        actionMessage: url.searchParams.get("message"),
        apiBaseUrl,
        cookie: request.headers.cookie,
        errorMessage: url.searchParams.get("error"),
        partnerId: productV1PartnerRoute.partnerId
      });

      if (!partnerModel) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to manage a partner portfolio."
          }),
          401
        );
        return;
      }

      sendHtml(response, renderPartnerConsoleScreen(partnerModel, { locale: requestLocale, routeMode: "app" }));
      return;
    }

    if (productV1AppAdminRoute(url.pathname) && request.method === "GET") {
      sendHtml(
        response,
        renderRuntimeMessageScreen({
          title: "Platform admin gated",
          summary:
            "Platform admin routes need dedicated platform-admin RBAC, support-session operations, country-pack activation controls, and production audit review before customer use.",
          statusLabel: "Blocked",
          statusTone: "warning",
          actionHref: "/settings",
          actionLabel: "Open workspace settings"
        }),
        403
      );
      return;
    }

    const appRedirect = appRouteRedirectTarget(url.pathname);
    if (request.method === "GET" && appRedirect) {
      response.statusCode = 303;
      response.setHeader("location", mergeRedirectSearch(appRedirect, url.search));
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/onboarding/nis2") {
      response.statusCode = 303;
      response.setHeader("location", `/onboarding${url.search}`);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/onboarding/romania/")) {
      const target = url.pathname.endsWith("/gaps")
        ? "/gap-analyzer"
        : url.pathname.endsWith("/connector")
          ? "/microsoft365"
          : "/onboarding";
      response.statusCode = 303;
      response.setHeader("location", target);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/providers/microsoft365") {
      response.statusCode = 303;
      response.setHeader("location", `/connectors/microsoft365${url.search}`);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/gap-analyzer/run") {
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/gap-analyzer?message=${encodeURIComponent("Use the Run analyzer button to start the readiness analysis.")}`
      );
      response.end();
      return;
    }

    const productRoute = productRouteByPath.get(url.pathname);
    if (request.method === "GET" && productRoute) {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });

      if (session.statusCode !== 200) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in and select a workspace to open PureSOC."
          })
        );
        return;
      }

      if (!session.body.session.activeOrganizationId) {
        const selection = await loadWorkspaceSelectionModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Select or create a workspace to open PureSOC.",
          session: session.body
        });
        sendHtml(
          response,
          selection
            ? renderWorkspaceSelectionScreen(selection, { locale: requestLocale })
            : renderRuntimeMessageScreen({
                title: "Select A Workspace",
                summary: "The API session is valid, but workspace memberships could not be loaded.",
                statusLabel: "Session active",
                statusTone: "warning",
                actionHref: "/workspaces",
                actionLabel: "Choose workspace"
              })
        );
        return;
      }

      const productModel = await loadProductMvpShellModel({
        actionMessage: url.searchParams.get("message"),
        apiBaseUrl,
        cookie: request.headers.cookie,
        onboardingCountry: url.searchParams.get("country"),
        onboardingScreen: onboardingScreenFromPath(url.pathname) ?? url.searchParams.get("screen") ?? undefined,
        route: productRoute,
        session: session.body
      });

      if (!productModel) {
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Workspace Unavailable",
            summary: "The session is active, but the selected workspace could not load the product dashboard.",
            statusLabel: "API connected",
            statusTone: "warning",
            actionHref: "/workspaces",
            actionLabel: "Choose workspace"
          })
        );
        return;
      }

      sendHtml(response, renderProductMvpShell(productModel, { locale: requestLocale }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/login") {
      sendHtml(
        response,
        renderLoginScreen({
          activeOrganizationId: url.searchParams.get("organizationId"),
          locale: requestLocale
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/auth/login") {
      response.statusCode = 303;
      response.setHeader("location", `/login${url.search}`);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/register") {
      sendHtml(response, renderRegisterScreen({ locale: requestLocale }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/auth/register") {
      response.statusCode = 303;
      response.setHeader("location", `/register${url.search}`);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/verify-email") {
      sendHtml(response, renderEmailVerificationScreen({ locale: requestLocale }));
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

      sendHtml(response, renderOrganizationInvitationsScreen(invitationModel, { locale: requestLocale }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/settings/notifications") {
      const settingsModel = await loadNotificationSettingsScreenModel({
        actionMessage: url.searchParams.get("message"),
        apiBaseUrl,
        cookie: request.headers.cookie
      });

      if (!settingsModel) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to manage notification settings."
          })
        );
        return;
      }

      sendHtml(response, renderNotificationSettingsScreen(settingsModel, { locale: requestLocale }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/partners") {
      const partnerModel = await loadPartnerConsoleModel({
        actionMessage: url.searchParams.get("message"),
        apiBaseUrl,
        cookie: request.headers.cookie,
        errorMessage: url.searchParams.get("error"),
        partnerId: url.searchParams.get("partnerId")
      });

      if (!partnerModel) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to manage a partner portfolio."
          })
        );
        return;
      }

      sendHtml(response, renderPartnerConsoleScreen(partnerModel, { locale: requestLocale }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/onboarding/nis2") {
      const nis2Model = await loadNis2CountryAwareOnboardingModel({
        actionMessage: url.searchParams.get("message"),
        apiBaseUrl,
        cookie: request.headers.cookie,
        query: url.searchParams
      });

      if (!nis2Model) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to open the NIS2 country onboarding entry point."
          })
        );
        return;
      }

      sendHtml(response, renderNis2CountryAwareOnboardingScreen(nis2Model, { locale: requestLocale }));
      return;
    }

    const remediationReportDownload = /^\/remediation\/reports\/([^/]+)\/download$/.exec(url.pathname);
    if (request.method === "GET" && remediationReportDownload) {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      const organizationId = session.body?.session?.activeOrganizationId;
      if (session.statusCode !== 200 || !organizationId) {
        sendHtml(
          response,
          renderLoginScreen({ errorMessage: "Sign in and select a workspace before downloading remediation output." }),
          401
        );
        return;
      }

      const reportSnapshotId = remediationReportDownload[1] ?? "";
      const upstream = await fetch(
        `${apiBaseUrl}/api/v1/organizations/${encodeURIComponent(organizationId)}/report-snapshots/${encodeURIComponent(
          reportSnapshotId
        )}/download`,
        {
          method: "GET",
          headers: {
            ...(request.headers.cookie ? { cookie: request.headers.cookie } : {})
          }
        }
      );
      if (upstream.status !== 200) {
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Remediation Output Not Available",
            summary: "The generated output could not be downloaded or is outside the active workspace.",
            statusLabel: String(upstream.status),
            statusTone: "warning",
            actionHref: "/remediation",
            actionLabel: "Return to remediation"
          }),
          upstream.status
        );
        return;
      }

      response.statusCode = 200;
      for (const headerName of [
        "cache-control",
        "content-type",
        "content-disposition",
        "x-puresoc-content-sha256",
        "x-puresoc-file-object-id",
        "x-puresoc-renderer"
      ]) {
        const headerValue = upstream.headers.get(headerName);
        if (headerValue) {
          response.setHeader(headerName, headerValue);
        }
      }
      response.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }

    const generatedReportPdf = /^\/reports\/generated\/([^/]+)\/pdf$/.exec(url.pathname);
    if (request.method === "GET" && generatedReportPdf) {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      const organizationId = session.body?.session?.activeOrganizationId;
      if (session.statusCode !== 200 || !organizationId) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in and select a workspace before downloading report PDFs."
          }),
          401
        );
        return;
      }

      const reportId = generatedReportPdf[1] ?? "";
      const upstream = await fetch(
        `${apiBaseUrl}/organizations/${encodeURIComponent(organizationId)}/reports/generated/${encodeURIComponent(
          reportId
        )}/pdf?format=pdf`,
        {
          method: "GET",
          headers: {
            ...(request.headers.cookie ? { cookie: request.headers.cookie } : {})
          }
        }
      );

      if (upstream.status !== 200) {
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Report PDF Not Available",
            summary: "The generated report could not be rendered or the active workspace cannot access it.",
            statusLabel: String(upstream.status),
            statusTone: "warning",
            actionHref: "/onboarding/nis2",
            actionLabel: "Return to NIS2 onboarding"
          }),
          upstream.status
        );
        return;
      }

      response.statusCode = upstream.status;
      for (const headerName of ["content-type", "content-disposition", "x-puresoc-content-sha256"]) {
        const headerValue = upstream.headers.get(headerName);
        if (headerValue) {
          response.setHeader(headerName, headerValue);
        }
      }
      response.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }

    const romaniaOnboardingScreen = resolveRomaniaOnboardingScreen(url.pathname);
    if (request.method === "GET" && romaniaOnboardingScreen) {
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
            ? renderWorkspaceSelectionScreen(selection, { locale: requestLocale })
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
          }),
          {
            screen: romaniaOnboardingScreen
          }
        )
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/providers/microsoft365") {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      if (session.statusCode !== 200) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to connect Microsoft 365."
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
            ? renderWorkspaceSelectionScreen(selection, { locale: requestLocale })
            : renderRuntimeMessageScreen({
                title: "Select A Workspace",
                summary: "Microsoft 365 tenant consent is stored on an organization-owned workspace.",
                statusLabel: "Session active",
                statusTone: "warning",
                actionHref: "/workspaces",
                actionLabel: "Choose workspace"
              })
        );
        return;
      }

      const organization = await resolveActiveOrganizationSurface(apiBaseUrl, request.headers.cookie, session.body);
      sendHtml(
        response,
        renderMicrosoft365ConnectorPage(
          {
            actionMessage: url.searchParams.get("message"),
            activeTenantAccess: await loadActiveTenantAccessBanner({
              apiBaseUrl,
              activeOrganizationId: session.body.session.activeOrganizationId,
              activeOrganizationName: organization.name,
              cookie: request.headers.cookie
            }),
            activeOrganizationName: organization.name,
            microsoft365: await loadMicrosoft365HealthSurface({
              apiBaseUrl,
              cookie: request.headers.cookie,
              generatedAt: new Date().toISOString(),
              organizationId: session.body.session.activeOrganizationId
            })
          },
          { locale: requestLocale }
        )
      );
      return;
    }

    const requestOrigin =
      options.publicBaseUrl ??
      process.env.PURESOC_WEB_PUBLIC_BASE_URL ??
      process.env.PURESOC_PUBLIC_BASE_URL ??
      resolvePublicRequestOrigin(request, port);
    const apiRequestOrigin = resolveApiRequestOrigin(apiBaseUrl, requestOrigin, configuredApiRequestOrigin);

    if (
      request.method === "POST" &&
      (url.pathname === "/onboarding" ||
        (url.pathname !== "/onboarding/nis2" && /^\/onboarding\/[^/]+$/.test(url.pathname)))
    ) {
      const form = await readFormBody(request);
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      const currentScreen = optionalFormValue(form.get("currentScreen")) ?? onboardingScreenFromPath(url.pathname) ?? "company";
      const nextScreen = optionalFormValue(form.get("nextScreen")) ?? currentScreen;
      const countryCode =
        optionalFormValue(form.get("company.countryCode")) ?? optionalFormValue(form.get("countryCode")) ?? "RO";
      const action = optionalFormValue(form.get("_action")) ?? "save";
      const answers = answersFromOnboardingForm(form);
      const saved = await apiJson<unknown>(apiBaseUrl, "/api/onboarding/answers", {
        method: "PUT",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {
          countryCode,
          currentScreen,
          status: "in_progress",
          completedScreens: [...new Set([...form.getAll("completedScreens").map(String), currentScreen])],
          answers
        }
      });
      const logoPatch =
        session.statusCode === 200 && session.body.session.activeOrganizationId
          ? await patchWorkspaceBrandingFromForm({
              apiBaseUrl,
              cookie: request.headers.cookie,
              form,
              legalName: optionalFormValue(form.get("company.legalName")),
              organizationId: session.body.session.activeOrganizationId,
              origin: apiRequestOrigin,
              primaryCountryCode: countryCode
            })
          : { statusCode: 204 };
      const completed =
        apiSucceeded(saved.statusCode) && (action === "complete" || action === "run")
          ? await apiJson<unknown>(apiBaseUrl, "/api/onboarding/complete", {
              method: "POST",
              cookie: request.headers.cookie,
              origin: apiRequestOrigin,
              body: {}
            })
          : { statusCode: 204 };
      const analyzer =
        apiSucceeded(saved.statusCode) && apiSucceeded(completed.statusCode) && action === "run"
          ? await apiJson<unknown>(apiBaseUrl, "/api/readiness/run", {
              method: "POST",
              cookie: request.headers.cookie,
              origin: apiRequestOrigin,
              body: {}
            })
          : { statusCode: 204 };
      const redirectTarget =
        action === "run" && apiSucceeded(analyzer.statusCode)
          ? "/gap-analyzer"
          : `/onboarding/${encodeURIComponent(nextScreen)}?country=${encodeURIComponent(countryCode)}`;
      const message = (() => {
        if (!apiSucceeded(saved.statusCode)) return "Onboarding was not saved. Check required fields.";
        if (!apiSucceeded(logoPatch.statusCode)) return "Onboarding saved, but workspace identity was not updated.";
        if (action === "run") return apiSucceeded(analyzer.statusCode) ? "Readiness analyzer completed." : "Run analyzer needs saved required answers first.";
        if (action === "complete") return apiSucceeded(completed.statusCode) ? "Classification generated from saved answers." : "Classification needs more saved answers.";
        return "Readiness onboarding saved.";
      })();

      response.statusCode = 303;
      response.setHeader(
        "location",
        `${redirectTarget}${redirectTarget.includes("?") ? "&" : "?"}message=${encodeURIComponent(message)}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/gap-analyzer/run") {
      const result = await apiJson<unknown>(apiBaseUrl, "/api/readiness/run", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {}
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/gap-analyzer?message=${encodeURIComponent(
          apiSucceeded(result.statusCode) ? "Gap analyzer completed." : "Gap analyzer needs saved onboarding answers first."
        )}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/remediation/actions") {
      const form = await readFormBody(request);
      const created = await apiJson<unknown>(apiBaseUrl, "/api/remediation/actions", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {
          recommendationId: form.get("recommendationId") ?? "",
          actionKey: form.get("actionKey") ?? ""
        }
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/remediation?message=${encodeURIComponent(
          apiSucceeded(created.statusCode)
            ? "Safe workflow created with a passed preview and pre-state snapshot."
            : apiErrorMessage(created.body) ?? "The remediation workflow could not be created."
        )}`
      );
      response.end();
      return;
    }

    const productRemediationTransition = /^\/remediation\/actions\/([^/]+)\/(preview|approve|execute)$/.exec(
      url.pathname
    );
    if (request.method === "POST" && productRemediationTransition) {
      const actionRunId = productRemediationTransition[1] ?? "";
      const transition = productRemediationTransition[2] ?? "preview";
      const transitioned = await apiJson<unknown>(
        apiBaseUrl,
        `/api/remediation/actions/${encodeURIComponent(actionRunId)}/${transition}`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {}
        }
      );
      const successMessage =
        transition === "approve"
          ? "Remediation action approved."
          : transition === "execute"
            ? "Zero-blast output generated, verified, and added to the evidence trail."
            : "Remediation preview and pre-state snapshot refreshed.";
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/remediation?message=${encodeURIComponent(
          apiSucceeded(transitioned.statusCode)
            ? successMessage
            : apiErrorMessage(transitioned.body) ?? "The remediation action could not advance."
        )}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/connectors/microsoft365/connect") {
      const begin = await apiJson<Microsoft365ConsentBeginWebResponse>(apiBaseUrl, "/api/connectors/microsoft365/connect", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {
          redirectUri: microsoft365WebCallbackRedirectUri(requestOrigin),
          requestedPermissionBundles: [...microsoft365FirstConnectionBundles]
        }
      });

      if (begin.statusCode !== 201 || !begin.body.url) {
        response.statusCode = 303;
        response.setHeader(
          "location",
          `/connectors/microsoft365?message=${encodeURIComponent("Microsoft 365 connection could not start.")}`
        );
        response.end();
        return;
      }

      response.statusCode = 303;
      response.setHeader("location", begin.body.url);
      response.end();
      return;
    }

    if (
      (request.method === "GET" || request.method === "POST") &&
      url.pathname === "/connectors/microsoft365/callback"
    ) {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      const organizationId = session.body?.session?.activeOrganizationId;
      if (session.statusCode !== 200 || !organizationId) {
        sendHtml(response, renderLoginScreen({ errorMessage: "Sign in to complete Microsoft 365 tenant consent." }), 401);
        return;
      }

      const callbackInput =
        request.method === "GET"
          ? Object.fromEntries(url.searchParams.entries())
          : Object.fromEntries((await readFormBody(request)).entries());
      const completed = await apiJson<unknown>(
        apiBaseUrl,
        `/organizations/${encodeURIComponent(organizationId)}/provider-connections/microsoft365/consent/callback`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: callbackInput
        }
      );

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/microsoft365?message=${encodeURIComponent(
          apiSucceeded(completed.statusCode)
            ? "Microsoft 365 connection completed."
            : apiErrorMessage(completed.body) ?? "Microsoft 365 consent was not completed."
        )}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/evidence") {
      const form = await readFormBody(request);
      const created = await apiJson<unknown>(apiBaseUrl, "/api/evidence", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {
          title: form.get("title") ?? "",
          controlId: optionalFormValue(form.get("controlId")),
          content: form.get("content") ?? "",
          mimeType: "text/plain"
        }
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/evidence?message=${encodeURIComponent(
          apiSucceeded(created.statusCode) ? "Evidence attached." : "Evidence was not attached."
        )}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && /^\/reports\/(nis2-summary|gap-list|m365-posture)$/.test(url.pathname)) {
      const reportKind = url.pathname.split("/").pop() ?? "nis2-summary";
      const created = await apiJson<unknown>(apiBaseUrl, `/api/reports/${reportKind}`, {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {}
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/reports?message=${encodeURIComponent(
          apiSucceeded(created.statusCode) ? "Report generated." : "Run the gap analyzer before generating reports."
        )}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/customers") {
      const form = await readFormBody(request);
      const created = await apiJson<unknown>(apiBaseUrl, "/api/customers", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {
          name: form.get("name") ?? "",
          legalName: optionalFormValue(form.get("legalName")),
          countryCode: optionalFormValue(form.get("countryCode")) ?? "RO"
        }
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/customers?message=${encodeURIComponent(
          apiSucceeded(created.statusCode) ? "Customer workspace added." : "Customer was not added."
        )}`
      );
      response.end();
      return;
    }

    const productCustomerEnter = /^\/customers\/([^/]+)\/impersonate$/.exec(url.pathname);
    if (request.method === "POST" && productCustomerEnter) {
      const form = await readFormBody(request);
      const customerId = productCustomerEnter[1] ?? "";
      const opened = await apiJson<PartnerTenantSessionWebResponse>(
        apiBaseUrl,
        `/api/customers/${encodeURIComponent(customerId)}/impersonate`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {
            reason: form.get("reason") ?? ""
          }
        }
      );
      if (apiSucceeded(opened.statusCode)) {
        await apiJson<unknown>(apiBaseUrl, "/auth/session/active-organization", {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {
            organizationId: opened.body.tenantSession?.effectiveOrganizationId ?? customerId
          }
        });
      }
      response.statusCode = 303;
      response.setHeader(
        "location",
        `/dashboard?message=${encodeURIComponent(
          apiSucceeded(opened.statusCode)
            ? "Customer workspace opened. Actions are logged with your real user."
            : "Customer workspace could not be opened."
        )}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/partners") {
      const form = await readFormBody(request);
      const created = await apiJson<CreatePartnerWebResponse>(apiBaseUrl, "/partners", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {
          name: form.get("name") ?? "",
          slug: optionalFormValue(form.get("slug"))
        }
      });

      if (created.statusCode !== 201) {
        const partnerModel = await loadPartnerConsoleModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Partner was not created. Check the name and slug."
        });
        sendHtml(
          response,
          partnerModel
            ? renderPartnerConsoleScreen(partnerModel, { locale: requestLocale })
            : renderLoginScreen({ errorMessage: "Sign in to create a partner portfolio." }),
          created.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/partners?partnerId=${encodeURIComponent(created.body.partner?.id ?? "")}&message=${encodeURIComponent(
          "Partner created."
        )}`
      );
      response.end();
      return;
    }

    const partnerCustomerCreate = partnerCustomerCreateRoute(url.pathname);
    if (request.method === "POST" && partnerCustomerCreate) {
      const { partnerId, routeMode } = partnerCustomerCreate;
      const form = await readFormBody(request);
      const created = await apiJson<CreatePartnerCustomerWebResponse>(
        apiBaseUrl,
        `/partners/${encodeURIComponent(partnerId)}/customers`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {
            name: form.get("name") ?? "",
            legalName: optionalFormValue(form.get("legalName")),
            primaryCountryCode: optionalFormValue(form.get("primaryCountryCode")),
            accessLevel: optionalFormValue(form.get("grantLevel"))
          }
        }
      );

      if (created.statusCode !== 201) {
        const partnerModel = await loadPartnerConsoleModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Customer tenant was not created. Confirm your partner role and customer country code.",
          partnerId
        });
        sendHtml(
          response,
          partnerModel
            ? renderPartnerConsoleScreen(partnerModel, { locale: requestLocale, routeMode })
            : renderLoginScreen({ errorMessage: "Sign in to add a partner customer." }),
          created.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        partnerConsoleRedirectLocation(
          partnerId,
          routeMode,
          `${created.body.organization?.name ?? "Customer"} added to the partner portfolio.`
        )
      );
      response.end();
      return;
    }

    const partnerTenantSessionStart = partnerTenantSessionStartRoute(url.pathname);
    if (request.method === "POST" && partnerTenantSessionStart) {
      const { partnerId, routeMode } = partnerTenantSessionStart;
      const form = await readFormBody(request);
      const started = await apiJson<PartnerTenantSessionWebResponse>(
        apiBaseUrl,
        `/partners/${encodeURIComponent(partnerId)}/tenant-access-sessions`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {
            organizationId: form.get("organizationId") ?? "",
            reason: form.get("reason") ?? ""
          }
        }
      );

      if (started.statusCode !== 201) {
        const partnerModel = await loadPartnerConsoleModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Customer session was not started. Check the grant, reason, and any active customer session.",
          partnerId
        });
        sendHtml(
          response,
          partnerModel
            ? renderPartnerConsoleScreen(partnerModel, { locale: requestLocale, routeMode })
            : renderLoginScreen({ errorMessage: "Sign in to enter a partner customer." }),
          started.statusCode
        );
        return;
      }

      const selected = await apiJson<unknown>(apiBaseUrl, "/auth/session/active-organization", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {
          organizationId: started.body.tenantSession?.effectiveOrganizationId ?? form.get("organizationId") ?? ""
        }
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        selected.statusCode === 200
          ? `/dashboard?message=${encodeURIComponent(
              requestLocale === "ro"
                ? "Sesiunea clientului a început. Acțiunile sunt înregistrate cu utilizatorul real."
                : "Customer session started. Actions are logged with your real user."
            )}`
          : partnerConsoleRedirectLocation(
              partnerId,
              routeMode,
              "Customer session started, but the customer workspace was not selected."
            )
      );
      response.end();
      return;
    }

    const partnerTenantSessionExit = partnerTenantSessionExitRoute(url.pathname);
    if (request.method === "POST" && partnerTenantSessionExit) {
      const { partnerId, routeMode, sessionId } = partnerTenantSessionExit;
      const exited = await apiJson<PartnerTenantSessionWebResponse>(
        apiBaseUrl,
        `/partners/${encodeURIComponent(partnerId)}/tenant-access-sessions/${encodeURIComponent(sessionId)}/exit`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {}
        }
      );
      const cleared =
        apiSucceeded(exited.statusCode)
          ? await apiJson<unknown>(apiBaseUrl, "/auth/session/active-organization", {
              method: "POST",
              cookie: request.headers.cookie,
              origin: apiRequestOrigin,
              body: {
                organizationId: null
              }
            })
          : null;

      response.statusCode = 303;
      response.setHeader(
        "location",
        partnerConsoleRedirectLocation(
          partnerId,
          routeMode,
          apiSucceeded(exited.statusCode) && apiSucceeded(cleared?.statusCode ?? 500)
            ? "Customer session exited and customer context cleared."
            : apiSucceeded(exited.statusCode)
              ? "Customer session exited, but customer context was not cleared."
              : "Customer session exit was not completed."
        )
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/settings/notifications/channels") {
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

      const form = await readFormBody(request);
      const created = await apiJson<unknown>(
        apiBaseUrl,
        `/organizations/${encodeURIComponent(organizationId)}/notification-channels`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {
            type: form.get("type") ?? "",
            destination: form.get("destination") ?? ""
          }
        }
      );

      if (created.statusCode !== 201) {
        const settingsModel = await loadNotificationSettingsScreenModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Notification channel was not created. Check your role and destination format."
        });
        sendHtml(
          response,
          settingsModel
            ? renderNotificationSettingsScreen(settingsModel, { locale: requestLocale })
            : renderLoginScreen({ errorMessage: "Sign in to manage notification settings." }),
          created.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/settings/notifications?message=${encodeURIComponent("Notification channel created.")}`
      );
      response.end();
      return;
    }

    const notificationAlertAction = /^\/settings\/notifications\/operator-alerts\/([^/]+)\/acknowledge$/.exec(
      url.pathname
    );
    if (request.method === "POST" && notificationAlertAction) {
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

      const alertId = notificationAlertAction[1] ?? "";
      const result = await apiJson<unknown>(
        apiBaseUrl,
        `/organizations/${encodeURIComponent(organizationId)}/notification-operator-alerts/${encodeURIComponent(
          alertId
        )}/acknowledge`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {}
        }
      );

      if (!apiSucceeded(result.statusCode)) {
        const settingsModel = await loadNotificationSettingsScreenModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage: "Notification operator alert was not acknowledged. Check your workspace role."
        });
        sendHtml(
          response,
          settingsModel
            ? renderNotificationSettingsScreen(settingsModel, { locale: requestLocale })
            : renderLoginScreen({ errorMessage: "Sign in to manage notification settings." }),
          result.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/settings/notifications?message=${encodeURIComponent("Notification operator alert acknowledged.")}`
      );
      response.end();
      return;
    }

    const notificationChannelAction = /^\/settings\/notifications\/channels\/([^/]+)\/(test|delete|update)$/.exec(
      url.pathname
    );
    if (request.method === "POST" && notificationChannelAction) {
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

      const channelId = notificationChannelAction[1] ?? "";
      const action = notificationChannelAction[2];
      let result: Awaited<ReturnType<typeof apiJson<unknown>>>;
      if (action === "test") {
        result = await apiJson<unknown>(
          apiBaseUrl,
          `/organizations/${encodeURIComponent(organizationId)}/notification-channels/${encodeURIComponent(channelId)}/test`,
          {
            method: "POST",
            cookie: request.headers.cookie,
            origin: apiRequestOrigin,
            body: {}
          }
        );
      } else if (action === "update") {
        const form = await readFormBody(request);
        const destination = String(form.get("destination") ?? "").trim();
        result = await apiJson<unknown>(
          apiBaseUrl,
          `/organizations/${encodeURIComponent(organizationId)}/notification-channels/${encodeURIComponent(channelId)}`,
          {
            method: "PATCH",
            cookie: request.headers.cookie,
            origin: apiRequestOrigin,
            body: {
              ...(destination ? { destination } : {}),
              enabled: form.get("enabled") === "true"
            }
          }
        );
      } else {
        result = await apiJson<unknown>(
          apiBaseUrl,
          `/organizations/${encodeURIComponent(organizationId)}/notification-channels/${encodeURIComponent(channelId)}`,
          {
            method: "DELETE",
            cookie: request.headers.cookie,
            origin: apiRequestOrigin
          }
        );
      }

      if (!apiSucceeded(result.statusCode)) {
        const settingsModel = await loadNotificationSettingsScreenModel({
          apiBaseUrl,
          cookie: request.headers.cookie,
          errorMessage:
            action === "test"
              ? "Test notification was not sent. Check channel delivery configuration and recent logs."
              : action === "update"
                ? "Notification channel was not updated. Check your workspace role and destination format."
                : "Notification channel was not removed. Check your workspace role."
        });
        sendHtml(
          response,
          settingsModel
            ? renderNotificationSettingsScreen(settingsModel, { locale: requestLocale })
            : renderLoginScreen({ errorMessage: "Sign in to manage notification settings." }),
          result.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/settings/notifications?message=${encodeURIComponent(
          action === "test"
            ? "Test notification attempted. Review the delivery log."
            : action === "update"
              ? "Notification channel updated."
              : "Notification channel removed."
        )}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/oidc/microsoft_entra/begin") {
      const begin = await apiJson<OidcBeginWebResponse>(apiBaseUrl, "/auth/oidc/microsoft_entra/begin", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: {}
      });

      if (begin.statusCode !== 200 || !begin.body.redirectUrl) {
        const errorCode = begin.body.error?.code;
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage:
              errorCode === "provider_not_configured"
                ? "Microsoft sign-in is enabled but the Entra app client ID, client secret, or redirect URI is not configured yet."
                : "Microsoft sign-in could not start. Use local sign-in or check the Entra app configuration."
          }),
          begin.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader("location", begin.body.redirectUrl);
      response.end();
      return;
    }

    if (
      (request.method === "GET" || request.method === "POST") &&
      url.pathname === "/auth/oidc/microsoft_entra/callback"
    ) {
      const callbackInput =
        request.method === "GET"
          ? Object.fromEntries(url.searchParams.entries())
          : Object.fromEntries((await readFormBody(request)).entries());

      if (typeof callbackInput.error === "string") {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Microsoft sign-in was not completed."
          }),
          401
        );
        return;
      }

      const completed = await apiJson<OidcBeginWebResponse>(apiBaseUrl, "/auth/oidc/microsoft_entra/callback", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
        body: callbackInput
      });

      if (completed.statusCode !== 200) {
        const errorCode = completed.body.error?.code;
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage:
              errorCode === "account_link_required"
                ? "A PureSOC account already uses that Microsoft email. Sign in locally first, then approve account linking."
                : "Microsoft sign-in could not complete. Use local sign-in or retry from Microsoft."
          }),
          completed.statusCode
        );
        return;
      }

      if (completed.setCookie) {
        response.setHeader("set-cookie", completed.setCookie);
      }
      response.statusCode = 303;
      response.setHeader("location", "/workspaces");
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/providers/microsoft365/connect") {
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

      const begin = await apiJson<Microsoft365ConsentBeginWebResponse>(
        apiBaseUrl,
        `/organizations/${encodeURIComponent(organizationId)}/provider-connections/microsoft365/consent/begin`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {
            redirectUri: microsoft365WebCallbackRedirectUri(requestOrigin),
            requestedPermissionBundles: [...microsoft365FirstConnectionBundles]
          }
        }
      );

      if (begin.statusCode !== 201 || !begin.body.url) {
        const errorCode = begin.body.error?.code;
        const errorMessage = begin.body.error?.message;
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Microsoft 365 Connector Not Started",
            summary:
              errorMessage ??
              "The PureSOC Microsoft 365 connector could not start because the current user cannot manage provider connections or the connector app configuration is incomplete.",
            statusLabel: errorCode ?? "Connector blocked",
            statusTone: "warning",
            actionHref: "/providers/microsoft365",
            actionLabel: "Return to connector"
          }),
          begin.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader("location", begin.body.url);
      response.end();
      return;
    }

    if (
      (request.method === "GET" || request.method === "POST") &&
      url.pathname === "/providers/microsoft365/callback"
    ) {
      const session = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/session", {
        method: "GET",
        cookie: request.headers.cookie
      });
      const organizationId = session.body?.session?.activeOrganizationId;
      if (session.statusCode !== 200 || !organizationId) {
        sendHtml(
          response,
          renderLoginScreen({
            errorMessage: "Sign in to complete Microsoft 365 tenant consent."
          }),
          401
        );
        return;
      }

      const callbackInput =
        request.method === "GET"
          ? Object.fromEntries(url.searchParams.entries())
          : Object.fromEntries((await readFormBody(request)).entries());
      const completed = await apiJson<unknown>(
        apiBaseUrl,
        `/organizations/${encodeURIComponent(organizationId)}/provider-connections/microsoft365/consent/callback`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: callbackInput
        }
      );

      if (completed.statusCode !== 201) {
        const errorCode = apiErrorCode(completed.body);
        const errorMessage = apiErrorMessage(completed.body);
        const microsoft365Message = microsoft365CallbackErrorMessage(errorCode, errorMessage);
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Microsoft 365 Consent Not Completed",
            summary: microsoft365Message,
            statusLabel: errorCode ?? "Consent blocked",
            statusTone: "warning",
            actionHref: "/providers/microsoft365",
            actionLabel: "Return to connector"
          }),
          completed.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/connectors/microsoft365?message=${encodeURIComponent("Microsoft 365 tenant consent completed. Read-only tenant profile sync started.")}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/providers/microsoft365/sync") {
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

      const form = await readFormBody(request);
      const providerConnectionId = optionalFormValue(form.get("providerConnectionId"));
      if (!providerConnectionId) {
        response.statusCode = 303;
        response.setHeader("location", "/providers/microsoft365");
        response.end();
        return;
      }

      await apiJson<unknown>(
        apiBaseUrl,
        `/organizations/${encodeURIComponent(organizationId)}/provider-connections/${encodeURIComponent(providerConnectionId)}/microsoft365/sync`,
        {
          method: "POST",
          cookie: request.headers.cookie,
          origin: apiRequestOrigin,
          body: {}
        }
      );

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/providers/microsoft365?message=${encodeURIComponent("Microsoft 365 read-only sync requested.")}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/email/verify") {
      const form = await readFormBody(request);
      const verification = await apiJson<unknown>(apiBaseUrl, "/auth/email/verify", {
        method: "POST",
        origin: apiRequestOrigin,
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
      const login = await apiJson<RuntimeSessionSurface>(apiBaseUrl, "/auth/login", {
        method: "POST",
        origin: apiRequestOrigin,
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
            emailValue: optionalFormValue(form.get("email")),
            errorMessage: loginErrorMessageForApiResponse(login.statusCode, login.body),
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
      response.setHeader(
        "location",
        await authenticatedLandingPath({
          activeOrganizationId: login.body.session?.activeOrganizationId,
          apiBaseUrl,
          cookie: login.setCookie
        })
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/register") {
      const form = await readFormBody(request);
      const registration = await apiJson<{ emailVerificationRequired?: boolean }>(apiBaseUrl, "/auth/register", {
        method: "POST",
        origin: apiRequestOrigin,
        body: {
          displayName: form.get("displayName") ?? "",
          email: form.get("email") ?? "",
          password: form.get("password") ?? ""
        }
      });

      if (registration.statusCode !== 201) {
        const errorMessage = registrationErrorMessageForApiResponse(registration.statusCode, registration.body);
        const emailValue = optionalFormValue(form.get("email"));

        if (apiErrorCode(registration.body) === "email_already_registered") {
          sendHtml(
            response,
            renderLoginScreen({
              emailValue,
              errorMessage
            }),
            registration.statusCode
          );
          return;
        }

        sendHtml(
          response,
          renderRegisterScreen({
            displayNameValue: optionalFormValue(form.get("displayName")),
            emailValue,
            errorMessage
          }),
          registration.statusCode
        );
        return;
      }

      const login = await apiJson<unknown>(apiBaseUrl, "/auth/login", {
        method: "POST",
        origin: apiRequestOrigin,
        body: {
          email: form.get("email") ?? "",
          password: form.get("password") ?? ""
        }
      });
      if (login.statusCode !== 200 || !login.setCookie) {
        sendHtml(
          response,
          renderLoginScreen({
            emailValue: optionalFormValue(form.get("email")),
            errorMessage: `Account created, but automatic sign-in failed. ${loginErrorMessageForApiResponse(
              login.statusCode,
              login.body
            )}`
          }),
          login.statusCode === 200 ? 502 : login.statusCode
        );
        return;
      }
      if (login.setCookie) {
        response.setHeader("set-cookie", login.setCookie);
      }
      response.statusCode = 303;
      response.setHeader(
        "location",
        registration.body.emailVerificationRequired === true ? "/verify-email" : "/workspaces"
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/logout") {
      const logout = await apiJson<unknown>(apiBaseUrl, "/auth/logout", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
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
            ? renderOrganizationInvitationsScreen(invitationModel, { locale: requestLocale })
            : renderLoginScreen({ errorMessage: "Sign in to create organization invitations." }),
          session.statusCode === 200 ? 400 : session.statusCode
        );
        return;
      }

      const form = await readFormBody(request);
      const invitation = await apiJson<unknown>(apiBaseUrl, `/organizations/${encodeURIComponent(organizationId)}/invitations`, {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
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
            ? renderOrganizationInvitationsScreen(invitationModel, { locale: requestLocale })
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
            ? renderOrganizationInvitationsScreen(invitationModel, { locale: requestLocale })
            : renderLoginScreen({ errorMessage: "Sign in to accept an organization invitation." }),
          400
        );
        return;
      }

      const accepted = await apiJson<unknown>(apiBaseUrl, `/organizations/${encodeURIComponent(organizationId)}/invitations/accept`, {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
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
            ? renderOrganizationInvitationsScreen(invitationModel, { locale: requestLocale })
            : renderLoginScreen({ errorMessage: "Sign in to accept an organization invitation." }),
          accepted.statusCode
        );
        return;
      }

      await apiJson<unknown>(apiBaseUrl, "/auth/session/active-organization", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
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

      sendHtml(response, renderWorkspaceSelectionScreen(selection, { locale: requestLocale }));
      return;
    }

    if (request.method === "POST" && url.pathname === "/workspaces/select") {
      const form = await readFormBody(request);
      const organizationId = optionalFormValue(form.get("organizationId"));
      const selected = await apiJson<unknown>(apiBaseUrl, "/auth/session/active-organization", {
        method: "POST",
        cookie: request.headers.cookie,
        origin: apiRequestOrigin,
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
            ? renderWorkspaceSelectionScreen(selection, { locale: requestLocale })
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
        origin: apiRequestOrigin,
        body: {
          name: form.get("name") ?? "",
          legalName: optionalFormValue(form.get("legalName")),
          primaryCountryCode: optionalFormValue(form.get("primaryCountryCode")) ?? "RO",
          logoDataUrl: optionalFormValue(form.get("logoDataUrl"))
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
            ? renderWorkspaceSelectionScreen(selection, { locale: requestLocale })
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
        origin: apiRequestOrigin,
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
            ? renderWorkspaceSelectionScreen(selection, { locale: requestLocale })
            : renderLoginScreen({ errorMessage: "Sign in to select the new workspace." }),
          selected.statusCode
        );
        return;
      }

      response.statusCode = 303;
      response.setHeader(
        "location",
        `/providers/microsoft365?message=${encodeURIComponent(
          "Workspace created and selected. You can connect Microsoft 365 now or open the Romania wizard when ready."
        )}`
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/onboarding/nis2") {
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

      const actionResult = await handleNis2CountryOnboardingPost({
        apiBaseUrl,
        cookie: request.headers.cookie,
        organizationId,
        origin: apiRequestOrigin,
        request
      });
      const redirectParams = new URLSearchParams({
        country: actionResult.countryCode,
        screen: actionResult.screen,
        message: actionResult.message
      });
      if (actionResult.firstReportId) {
        redirectParams.set("firstReportId", actionResult.firstReportId);
      }
      if (actionResult.improvedReportId) {
        redirectParams.set("improvedReportId", actionResult.improvedReportId);
      }
      response.statusCode = 303;
      response.setHeader("location", `/onboarding/nis2?${redirectParams.toString()}`);
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
        origin: apiRequestOrigin,
        path: url.pathname,
        request
      });
      response.statusCode = 303;
      response.setHeader(
        "location",
        `${romaniaOnboardingPath(actionResult.screen ?? "outputs")}?locale=ro-RO&message=${encodeURIComponent(actionResult.message)}`
      );
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
            ? renderWorkspaceSelectionScreen(selection, { locale: requestLocale })
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

      const [dashboard, dashboardHistory] = await Promise.all([
        apiJson<LatestDashboardSnapshotResponse>(
          apiBaseUrl,
          `/organizations/${encodeURIComponent(activeOrganizationId)}/dashboards/snapshots/latest`,
          {
            method: "GET",
            cookie: request.headers.cookie
          }
        ),
        apiJson<DashboardSnapshotHistoryResponse>(
          apiBaseUrl,
          `/organizations/${encodeURIComponent(activeOrganizationId)}/dashboards/snapshots?days=180`,
          {
            method: "GET",
            cookie: request.headers.cookie
          }
        )
      ]);

      if (dashboard.statusCode !== 200) {
        sendHtml(
          response,
          renderRuntimeMessageScreen({
            title: "Dashboard Snapshot Required",
            summary: "This workspace does not have a dashboard snapshot yet. You can connect Microsoft 365 now, or open the Romania workflow and evaluate readiness to create one.",
            statusLabel: "API connected",
            statusTone: "warning",
            actionHref: "/providers/microsoft365",
            actionLabel: "Open Microsoft connector"
          }),
          dashboard.statusCode === 404 ? 404 : 200
        );
        return;
      }

      sendHtml(
        response,
        renderOperationalConsole(
          createOperationalConsoleRuntimeModel({
            activeTenantAccess: await loadActiveTenantAccessBanner({
              apiBaseUrl,
              activeOrganizationId,
              cookie: request.headers.cookie
            }),
            session: session.body,
            dashboard: dashboard.body.snapshot,
            dashboardHistory: dashboardHistory.statusCode === 200 ? dashboardHistory.body.snapshots : [],
            organization: await resolveActiveOrganizationSurface(apiBaseUrl, request.headers.cookie, session.body),
            microsoft365: await loadMicrosoft365HealthSurface({
              apiBaseUrl,
              cookie: request.headers.cookie,
              organizationId: activeOrganizationId,
              generatedAt: dashboard.body.snapshot.generatedAt
            })
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

  const listenHost = options.listenHost ?? process.env.PURESOC_WEB_LISTEN_HOST;
  server.listen(port, listenHost, () => {
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
  const protocol = normalizePublicProtocol(forwardedProto ?? forwarded.proto, host);

  return `${protocol}://${host}`;
};

export const resolveApiRequestOrigin = (
  apiBaseUrl: string,
  publicRequestOrigin: string,
  configuredOrigin?: string
): string | undefined => {
  const configured = configuredOrigin ? originForUrl(configuredOrigin) : null;
  if (configured) {
    return configured;
  }

  const hostname = hostnameForUrl(apiBaseUrl);
  if (!hostname) {
    return undefined;
  }

  if (isInternalApiHost(hostname)) {
    return internalComposeWebOrigin;
  }

  return publicRequestOrigin;
};

export const shouldForwardBrowserOriginToApi = (apiBaseUrl: string): boolean => {
  return resolveApiRequestOrigin(apiBaseUrl, "http://localhost:3000") !== undefined;
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

const normalizePublicProtocol = (value: string | null | undefined, host: string): "http" | "https" => {
  const normalized = value?.toLowerCase();
  if (normalized === "https") {
    return "https";
  }
  if (normalized === "http") {
    return "http";
  }

  return process.env.PURESOC_APP_ENV === "production" && !isLocalPublicHost(host) ? "https" : "http";
};

const isLocalPublicHost = (host: string): boolean => {
  const normalized = host.toLowerCase();
  return (
    normalized.startsWith("localhost") ||
    normalized.startsWith("127.") ||
    normalized.startsWith("[::1]") ||
    normalized.startsWith("::1")
  );
};

const hostnameForUrl = (value: string): string | null => {
  try {
    return new URL(value).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
};

const originForUrl = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const isInternalApiHost = (hostname: string): boolean => {
  if (isLocalPublicHost(hostname)) {
    return false;
  }

  return hostname === "puresoc-api" || !hostname.includes(".");
};

const webRequestErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message === "Form body is too large."
    ? "The submitted form is too large for the current public web runtime."
    : "The web runtime could not complete this request against the API. Check API health and internal Compose routing.";

const optionalFormValue = (value: string | null): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const patchWorkspaceBrandingFromForm = async (input: {
  apiBaseUrl: string;
  cookie?: string;
  form: URLSearchParams;
  legalName?: string | null;
  organizationId: string;
  origin?: string;
  primaryCountryCode?: string | null;
}): Promise<{ statusCode: number }> => {
  const logoDataUrl = optionalFormValue(input.form.get("logoDataUrl"));
  const body: Record<string, unknown> = {};
  if (input.legalName) {
    body.legalName = input.legalName;
  }
  if (input.primaryCountryCode) {
    body.primaryCountryCode = input.primaryCountryCode;
  }
  if (logoDataUrl) {
    body.logoDataUrl = logoDataUrl;
  }
  if (Object.keys(body).length === 0) {
    return { statusCode: 204 };
  }

  return apiJson<unknown>(input.apiBaseUrl, `/api/workspaces/${encodeURIComponent(input.organizationId)}`, {
    method: "PATCH",
    cookie: input.cookie,
    origin: input.origin,
    body
  });
};

const numberFormValue = (value: string | null): number | undefined => {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const answersFromOnboardingForm = (form: URLSearchParams): Record<string, unknown> => {
  const answers: Record<string, unknown> = {};
  const skipped = new Set(["_action", "completedScreens", "currentScreen", "nextScreen", "logoDataUrl"]);
  const fieldNames = [...new Set([...form.keys()].filter((key) => !skipped.has(key)))];

  for (const fieldName of fieldNames) {
    const values = form
      .getAll(fieldName)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (values.length === 0) {
      continue;
    }
    const value = values.length > 1 ? values : normalizeOnboardingFormValue(fieldName, values[0] ?? "");
    setAnswerPath(answers, fieldName === "countryCode" ? "company.countryCode" : fieldName, value);
  }

  return answers;
};

const normalizeOnboardingFormValue = (fieldName: string, value: string): string | number | boolean => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/(\.|^)(employeeCount|annualTurnoverEur|balanceSheetTotalEur)$/.test(fieldName)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
};

const setAnswerPath = (answers: Record<string, unknown>, fieldPath: string, value: unknown): void => {
  const parts = fieldPath.split(".");
  let current = answers;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1] ?? fieldPath] = value;
};

const sendHtml = (response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, html: string, statusCode = 200) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(html);
};

const webLocaleCookieName = "puresoc_locale";

const resolveWebRequestLocale = (cookieHeader: string | undefined, fallbackLocale: string): "en" | "ro" => {
  const localeCookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${webLocaleCookieName}=`))
    ?.slice(webLocaleCookieName.length + 1);
  return resolveProductLocale(localeCookie ?? fallbackLocale);
};

const safeLocaleReturnPath = (referer: string | undefined): string => {
  if (!referer) {
    return "/dashboard";
  }
  try {
    const parsed = new URL(referer);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
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

const loadProductMvpShellModel = async (input: {
  actionMessage?: string | null;
  apiBaseUrl: string;
  cookie?: string;
  onboardingCountry?: string | null;
  onboardingScreen?: string;
  route: ProductMvpRoute;
  session?: RuntimeSessionSurface;
}): Promise<ProductMvpShellModel | null> => {
  let session = input.session;
  if (!session) {
    const sessionResponse = await apiJson<RuntimeSessionSurface>(input.apiBaseUrl, "/auth/session", {
      method: "GET",
      cookie: input.cookie
    });
    if (sessionResponse.statusCode !== 200) {
      return null;
    }
    session = sessionResponse.body;
  }
  if (!session.session.activeOrganizationId) {
    return null;
  }

  const dashboard = await apiJson<ProductDashboardWebResponse>(input.apiBaseUrl, "/api/dashboard", {
    method: "GET",
    cookie: input.cookie
  });
  if (dashboard.statusCode !== 200) {
    return null;
  }

  const [customers, connectors] = await Promise.all([
    apiJson<ProductCustomersWebResponse>(input.apiBaseUrl, "/api/customers", {
      method: "GET",
      cookie: input.cookie
    }).catch(() => ({ statusCode: 500, body: { customers: [] } })),
    apiJson<ProductConnectorsWebResponse>(input.apiBaseUrl, "/api/connectors", {
      method: "GET",
      cookie: input.cookie
    }).catch(() => ({ statusCode: 500, body: { connectors: [] } }))
  ]);

  const details: ProductMvpShellModel["details"] = {
    connectors: connectors.statusCode === 200 ? connectors.body.connectors ?? [] : []
  };

  if (input.route === "gap_analyzer" || input.route === "remediation") {
    const [gaps, recommendations] = await Promise.all([
      apiJson<ProductGapsWebResponse>(input.apiBaseUrl, "/api/gaps", {
        method: "GET",
        cookie: input.cookie
      }),
      apiJson<ProductRecommendationsWebResponse>(input.apiBaseUrl, "/api/recommendations", {
        method: "GET",
        cookie: input.cookie
      })
    ]);
    details.gaps = gaps.statusCode === 200 ? gaps.body.gaps ?? [] : [];
    details.recommendations = recommendations.statusCode === 200 ? recommendations.body.recommendations ?? [] : [];
  }

  const onboarding =
    input.route === "onboarding"
      ? await apiJson<ProductOnboardingAnswersWebResponse>(input.apiBaseUrl, "/api/onboarding/answers", {
          method: "GET",
          cookie: input.cookie
        }).catch(() => null)
      : null;
  const selectedOnboardingCountry =
    input.onboardingCountry ??
    (onboarding?.statusCode === 200 ? onboarding.body.countryCode : undefined) ??
    dashboard.body.dashboard.workspace.countryCode ??
    dashboard.body.dashboard.countryPack.selected;
  const onboardingSchema =
    input.route === "onboarding"
      ? await apiJson<ProductOnboardingSchemaWebResponse>(
          input.apiBaseUrl,
          `/api/onboarding/schema?country=${encodeURIComponent(selectedOnboardingCountry)}`,
          {
            method: "GET",
            cookie: input.cookie
          }
        ).catch(() => null)
      : null;

  if (input.route === "microsoft365") {
    details.microsoft365Health = await loadMicrosoft365HealthSurface({
      apiBaseUrl: input.apiBaseUrl,
      cookie: input.cookie,
      generatedAt: dashboard.body.dashboard.lastSync ?? "No sync yet",
      organizationId: session.session.activeOrganizationId
    });

    const findings = await apiJson<ProductMicrosoft365FindingsWebResponse>(input.apiBaseUrl, "/api/microsoft365/findings", {
      method: "GET",
      cookie: input.cookie
    });
    details.findings = findings.statusCode === 200 ? findings.body.findings ?? [] : [];
  }

  if (input.route === "evidence") {
    const evidence = await apiJson<ProductEvidenceWebResponse>(input.apiBaseUrl, "/api/evidence", {
      method: "GET",
      cookie: input.cookie
    });
    details.evidence = evidence.statusCode === 200 ? evidence.body.evidence ?? [] : [];
  }

  if (input.route === "reports") {
    const reports = await apiJson<ProductReportsWebResponse>(input.apiBaseUrl, "/api/reports", {
      method: "GET",
      cookie: input.cookie
    });
    details.reports = reports.statusCode === 200 ? reports.body.reports ?? [] : [];
  }

  if (input.route === "remediation") {
    const remediation = await apiJson<ProductRemediationWebResponse>(input.apiBaseUrl, "/api/remediation/actions", {
      method: "GET",
      cookie: input.cookie
    });
    details.remediationActions = remediation.statusCode === 200 ? remediation.body.actions ?? [] : [];
  }

  return {
    actionMessage: input.actionMessage ?? undefined,
    activeTenantAccess: await loadActiveTenantAccessBanner({
      activeOrganizationId: session.session.activeOrganizationId,
      activeOrganizationName: dashboard.body.dashboard.workspace.name,
      apiBaseUrl: input.apiBaseUrl,
      cookie: input.cookie
    }),
    activeRoute: input.route,
    customers: customers.statusCode === 200 ? customers.body.customers ?? [] : [],
    dashboard: dashboard.body.dashboard,
    details,
    onboarding:
      onboarding?.statusCode === 200
        ? {
            answers: onboarding.body.answers ?? {},
            countryCode: selectedOnboardingCountry,
            progress: onboarding.body.progress ?? null,
            schema: onboardingSchema?.statusCode === 200 ? onboardingSchema.body : (onboarding.body.schema ?? null),
            selectedScreen:
              input.onboardingScreen ??
              (typeof onboarding.body.progress?.["currentScreen"] === "string" ? onboarding.body.progress["currentScreen"] : undefined) ??
              "company"
          }
        : undefined,
    session
  };
};

const emptyProductV1Resources = (): ProductV1ConsoleModel["resources"] => ({
  assets: [],
  attestations: [],
  businessServices: [],
  fileObjects: [],
  findings: [],
  governanceActivities: [],
  governanceCalendarEvents: [],
  incidents: [],
  internalEvents: [],
  notifications: [],
  people: [],
  policies: [],
  policyAcknowledgements: [],
  policyReviews: [],
  remediationPlans: [],
  reportSnapshots: [],
  retentionPolicies: [],
  risks: [],
  supportSessions: [],
  supplierReviews: [],
  suppliers: [],
  tasks: [],
  trainingRecords: []
});

const loadProductV1ActiveOrganizationId = async (input: {
  apiBaseUrl: string;
  cookie?: string;
}): Promise<string | null> => {
  const session = await apiJson<ProductV1MeWebResponse>(input.apiBaseUrl, "/api/v1/me", {
    method: "GET",
    cookie: input.cookie
  });
  if (session.statusCode !== 200) {
    return null;
  }

  return session.body.session.activeOrganizationId ?? null;
};

const loadProductV1ConsoleModel = async (input: {
  actionMessage?: string | null;
  apiBaseUrl: string;
  cookie?: string;
  organizationId: string;
  routeTail: string;
  section: ProductV1ConsoleSection;
}): Promise<ProductV1ConsoleModel | null> => {
  const session = await apiJson<ProductV1MeWebResponse>(input.apiBaseUrl, "/api/v1/me", {
    method: "GET",
    cookie: input.cookie
  });
  if (session.statusCode !== 200) {
    return null;
  }

  const organizations = await apiJson<ProductV1PageWebResponse>(input.apiBaseUrl, "/api/v1/organizations?limit=100", {
    method: "GET",
    cookie: input.cookie
  });
  const organizationRecord =
    organizations.statusCode === 200
      ? organizations.body.data.find((candidate) => String(candidate.id ?? "") === input.organizationId)
      : undefined;
  const organization = {
    id: input.organizationId,
    name: String(organizationRecord?.name ?? input.organizationId),
    legalName: typeof organizationRecord?.legalName === "string" ? organizationRecord.legalName : null,
    primaryCountryCode:
      typeof organizationRecord?.primaryCountryCode === "string" ? organizationRecord.primaryCountryCode : null,
    roles: Array.isArray(organizationRecord?.roles)
      ? organizationRecord.roles.filter((role): role is string => typeof role === "string")
      : []
  };

  const setup = await apiJson<ProductV1SetupWebResponse>(
    input.apiBaseUrl,
    `/api/v1/organizations/${encodeURIComponent(input.organizationId)}/setup`,
    {
      method: "GET",
      cookie: input.cookie
    }
  );
  if (setup.statusCode === 401) {
    return null;
  }
  if (setup.statusCode === 403 || setup.statusCode === 404) {
    return {
      actionMessage: input.actionMessage,
      countryPacks: [],
      errorMessage: "Access blocked for this organization route. Check workspace membership, partner scope, or support session policy.",
      organization,
      notificationPreferences: null,
      providerCapabilities: [],
      reportTemplates: [],
      resources: emptyProductV1Resources(),
      routeTail: productV1CanonicalRouteTail(input.routeTail, input.section),
      section: input.section,
      session: {
        user: session.body.user,
        session: session.body.session
      },
      setup: null
    };
  }

  const orgBase = `/api/v1/organizations/${encodeURIComponent(input.organizationId)}`;
  const [
    countryPacks,
    businessServices,
    people,
    suppliers,
    assets,
    findings,
    remediationPlans,
    tasks,
    incidents,
    risks,
    policies,
    supplierReviews,
    policyReviews,
    policyAcknowledgements,
    governanceActivities,
    governanceCalendarEvents,
    attestations,
    trainingRecords,
    retentionPolicies,
    fileObjects,
    reportTemplates,
    reportSnapshots,
    providerCapabilities,
    internalEvents,
    notifications,
    notificationPreferences,
    supportSessions
  ] = await Promise.all([
    productV1Page(input.apiBaseUrl, "/api/v1/country-packs?limit=20", input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/business-services?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/responsibilities?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/suppliers?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/assets?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/findings?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/remediation-plans?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/tasks?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/incidents?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/risks?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/policies?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/supplier-reviews?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/policy-reviews?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/policy-acknowledgements?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/governance-activities?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/governance-calendar-events?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/attestations?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/training-records?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/retention-policies?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/file-objects?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, "/api/v1/report-templates?limit=25", input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/report-snapshots?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/provider-capabilities?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/internal-events?limit=25`, input.cookie),
    productV1Page(input.apiBaseUrl, `${orgBase}/notifications?limit=25`, input.cookie),
    productV1NotificationPreferences(input.apiBaseUrl, `${orgBase}/notification-preferences`, input.cookie),
    productV1Page(
      input.apiBaseUrl,
      `/api/v1/support-sessions?organizationId=${encodeURIComponent(input.organizationId)}&limit=25`,
      input.cookie
    )
  ]);

  return {
    actionMessage: input.actionMessage,
    countryPacks,
    errorMessage:
      setup.statusCode === 200
        ? undefined
        : "Product v1 setup loaded with partial API data. Check API health and route authorization.",
    organization,
    notificationPreferences,
    providerCapabilities,
    reportTemplates,
    resources: {
      assets,
      attestations,
      businessServices,
      fileObjects,
      findings,
      governanceActivities,
      governanceCalendarEvents,
      incidents,
      internalEvents,
      notifications,
      people,
      policies,
      policyAcknowledgements,
      policyReviews,
      remediationPlans,
      reportSnapshots,
      retentionPolicies,
      risks,
      supportSessions,
      supplierReviews,
      suppliers,
      tasks,
      trainingRecords
    },
    routeTail: productV1CanonicalRouteTail(input.routeTail, input.section),
    section: input.section,
    session: {
      user: session.body.user,
      session: session.body.session
    },
    setup: setup.statusCode === 200 ? setup.body.setup : null
  };
};

const productV1Page = async (apiBaseUrl: string, path: string, cookie?: string): Promise<Array<Record<string, unknown>>> => {
  const result = await apiJson<ProductV1PageWebResponse>(apiBaseUrl, path, {
    method: "GET",
    cookie
  }).catch(() => ({ statusCode: 500, body: { data: [] } }));
  return result.statusCode === 200 ? result.body.data ?? [] : [];
};

const productV1NotificationPreferences = async (
  apiBaseUrl: string,
  path: string,
  cookie?: string
): Promise<Record<string, unknown> | null> => {
  const result = await apiJson<ProductV1NotificationPreferencesWebResponse>(apiBaseUrl, path, {
    method: "GET",
    cookie
  }).catch(() => ({ statusCode: 500, body: { notificationPreferences: null } }));
  return result.statusCode === 200 && result.body.notificationPreferences
    ? result.body.notificationPreferences
    : null;
};

const handleProductV1ConsolePost = async (input: {
  apiBaseUrl: string;
  cookie?: string;
  organizationId: string;
  origin?: string;
  request: IncomingMessage;
  section: ProductV1ConsoleSection;
}): Promise<{ message: string }> => {
  const form = await readFormBody(input.request);
  const action = optionalFormValue(form.get("_action")) ?? "";
  const orgBase = `/api/v1/organizations/${encodeURIComponent(input.organizationId)}`;
  const post = (path: string, body: Record<string, unknown>) =>
    apiJson<unknown>(input.apiBaseUrl, path, {
      method: "POST",
      cookie: input.cookie,
      origin: input.origin,
      body
    });
  const put = (path: string, body: Record<string, unknown>) =>
    apiJson<unknown>(input.apiBaseUrl, path, {
      method: "PUT",
      cookie: input.cookie,
      origin: input.origin,
      body
    });
  const patch = (path: string, body: Record<string, unknown>) =>
    apiJson<unknown>(input.apiBaseUrl, path, {
      method: "PATCH",
      cookie: input.cookie,
      origin: input.origin,
      body
    });

  const result =
    action === "saveSetupStep"
      ? await put(`${orgBase}/setup/${encodeURIComponent(optionalFormValue(form.get("step")) ?? "organization")}`, {
          complete: booleanFormValue(form, "complete"),
          data: {
            owner: optionalFormValue(form.get("owner")),
            summary: optionalFormValue(form.get("summary"))
          }
        })
      : action === "launchSetup"
        ? await post(`${orgBase}/setup/launch`, {})
        : action === "createBusinessService"
          ? await post(`${orgBase}/business-services`, {
              name: form.get("name") ?? "",
              criticality: optionalFormValue(form.get("criticality")) ?? "medium"
            })
          : action === "createResponsibility"
            ? await post(`${orgBase}/responsibilities`, {
                displayName: form.get("displayName") ?? "",
                email: optionalFormValue(form.get("email")),
                responsibilities: splitFormList(form.get("responsibilities"))
              })
            : action === "createSupplier"
              ? await post(`${orgBase}/suppliers`, {
                  name: form.get("name") ?? "",
                  criticality: optionalFormValue(form.get("criticality")) ?? "medium",
                  services: splitFormList(form.get("services")),
                  reviewCadenceMonths: numberFormValue(form.get("reviewCadenceMonths")) ?? 12
                })
              : action === "createAsset"
                ? await post(`${orgBase}/assets`, {
                    displayName: form.get("displayName") ?? "",
                    assetType: optionalFormValue(form.get("assetType")) ?? "manual_system"
                  })
                : action === "createFinding"
                  ? await post(`${orgBase}/findings`, {
                      title: form.get("title") ?? "",
                      severity: optionalFormValue(form.get("severity")) ?? "medium",
                      sourceType: optionalFormValue(form.get("sourceType")) ?? "manual"
                    })
                  : action === "createRemediationPlan"
                    ? await post(`${orgBase}/remediation-plans`, {
                        objective: form.get("objective") ?? ""
                      })
                    : action === "createTask"
                      ? await post(`${orgBase}/tasks`, {
                          title: form.get("title") ?? "",
                          priority: optionalFormValue(form.get("priority")) ?? "medium",
                          dueDate: optionalFormValue(form.get("dueDate"))
                        })
                      : action === "createIncident"
                        ? await post(`${orgBase}/incidents`, {
                            title: form.get("title") ?? "",
                            awarenessTime: optionalFormValue(form.get("awarenessTime"))
                          })
                        : action === "createRisk"
                          ? await post(`${orgBase}/risks`, {
                              statement: form.get("statement") ?? "",
                              inherentScore: numberFormValue(form.get("inherentScore")) ?? 3,
                              residualScore: numberFormValue(form.get("residualScore")) ?? 2,
                              treatment: optionalFormValue(form.get("treatment")) ?? "mitigate"
                            })
                          : action === "createPolicy"
                            ? await post(`${orgBase}/policies`, {
                                title: form.get("title") ?? "",
                                reviewDueAt: optionalFormValue(form.get("reviewDueAt"))
                              })
                            : action === "createSupplierReview"
                              ? await post(`${orgBase}/supplier-reviews`, {
                                  supplierId: form.get("supplierId") ?? "",
                                  reviewDueAt: optionalFormValue(form.get("reviewDueAt"))
                                })
                              : action === "createPolicyReview"
                                ? await post(`${orgBase}/policy-reviews`, {
                                    policyDocumentId: form.get("policyDocumentId") ?? "",
                                    reviewDueAt: optionalFormValue(form.get("reviewDueAt"))
                                  })
                                : action === "createGovernanceActivity"
                                  ? await post(`${orgBase}/governance-activities`, {
                                      title: form.get("title") ?? "",
                                      activityType: optionalFormValue(form.get("activityType")) ?? "management_review",
                                      dueAt: optionalFormValue(form.get("dueAt"))
                                    })
                                  : action === "createTrainingRecord"
                                    ? await post(`${orgBase}/training-records`, {
                                        subject: form.get("subject") ?? "",
                                        dueAt: optionalFormValue(form.get("dueAt"))
                                      })
                                    : action === "createRetentionPolicy"
                                      ? await post(`${orgBase}/retention-policies`, {
                                          name: form.get("name") ?? "",
                                          retentionClass: optionalFormValue(form.get("retentionClass")) ?? "evidence",
                                          retainForDays: numberFormValue(form.get("retainForDays")) ?? 365,
                                          legalHoldDefault: booleanFormValue(form, "legalHoldDefault")
                                        })
                                      : action === "createFileObject"
                                        ? await post(`${orgBase}/file-objects`, {
                                            filename: form.get("filename") ?? "",
                                            mimeType: form.get("mimeType") ?? "application/octet-stream",
                                            sizeBytes: numberFormValue(form.get("sizeBytes")) ?? 0,
                                            checksumSha256: form.get("checksumSha256") ?? "",
                                            storage: {
                                              provider: "product_v1_manual",
                                              key: form.get("storageKey") ?? ""
                                            },
                                            retentionClass: optionalFormValue(form.get("retentionClass")) ?? "evidence"
                                          })
                                        : action === "createReportSnapshot"
                                          ? await post(`${orgBase}/report-snapshots`, {
                                              templateKey: optionalFormValue(form.get("templateKey")) ?? "nis2",
                                              locale: optionalFormValue(form.get("locale")) ?? "en",
                                              sourceReferences: splitFormList(form.get("sourceReferences")),
                                              content: {
                                                source: "product_v1_web_console"
                                              }
                                            })
                                          : action === "createNotification"
                                            ? await post(`${orgBase}/notifications`, {
                                                title: form.get("title") ?? "",
                                                body: optionalFormValue(form.get("body")),
                                                category: optionalFormValue(form.get("category")) ?? "system",
                                                severity: optionalFormValue(form.get("severity")) ?? "info",
                                                sourceResourceType: optionalFormValue(form.get("sourceResourceType")),
                                                sourceResourceId: optionalFormValue(form.get("sourceResourceId")),
                                                actionHref: optionalFormValue(form.get("actionHref"))
                                              })
                                            : action === "markNotificationRead"
                                              ? await patch(
                                                  `${orgBase}/notifications/${encodeURIComponent(
                                                    optionalFormValue(form.get("notificationId")) ?? ""
                                                  )}`,
                                                  { status: "read" }
                                                )
                                              : action === "archiveNotification"
                                                ? await patch(
                                                    `${orgBase}/notifications/${encodeURIComponent(
                                                      optionalFormValue(form.get("notificationId")) ?? ""
                                                    )}`,
                                                    { status: "archived" }
                                                  )
                                                : action === "updateNotificationPreferences"
                                                  ? await put(`${orgBase}/notification-preferences`, {
                                                      digestFrequency: optionalFormValue(form.get("digestFrequency")) ?? "off",
                                                      suppressedCategories: splitFormList(form.get("suppressedCategories")),
                                                      mutedUntil: optionalFormValue(form.get("mutedUntil"))
                                                    })
                                                  : action === "runMicrosoft365Sync"
                                                    ? await post(`${orgBase}/connectors/microsoft365/sync-runs`, {
                                                        requestedModules: splitFormList(form.get("requestedModules"))
                                                      })
                                                    : { statusCode: 400 };

  return {
    message: apiSucceeded(result.statusCode) ? productV1SuccessMessage(action) : productV1FailureMessage(action, result.statusCode)
  };
};

const productV1SuccessMessage = (action: string): string =>
  ({
    createAsset: "Asset added.",
    createBusinessService: "Business service added.",
    createFileObject: "File metadata registered.",
    createFinding: "Finding added.",
    createGovernanceActivity: "Governance activity added.",
    createIncident: "Incident declared.",
    createNotification: "Notification added.",
    createPolicy: "Policy added.",
    createPolicyReview: "Policy review scheduled.",
    createRemediationPlan: "Remediation plan added.",
    createReportSnapshot: "Report snapshot requested.",
    createResponsibility: "Responsibility added.",
    createRetentionPolicy: "Retention policy added.",
    createRisk: "Risk added.",
    createSupplier: "Supplier added.",
    createSupplierReview: "Supplier review scheduled.",
    createTask: "Task added.",
    createTrainingRecord: "Training assigned.",
    launchSetup: "Setup launch readiness evaluated.",
    archiveNotification: "Notification archived.",
    markNotificationRead: "Notification marked read.",
    runMicrosoft365Sync: "Microsoft 365 sync requested.",
    saveSetupStep: "Setup step saved.",
    updateNotificationPreferences: "Notification preferences saved."
  })[action] ?? "Product v1 action completed.";

const productV1FailureMessage = (action: string, statusCode: number): string =>
  `Product v1 action ${action || "request"} was not completed (${statusCode}).`;

const splitFormList = (value: string | null): string[] =>
  optionalFormValue(value)
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

const booleanFormValue = (form: URLSearchParams, key: string): boolean => form.getAll(key).includes("true");

const loadPartnerConsoleModel = async (input: {
  actionMessage?: string | null;
  apiBaseUrl: string;
  cookie?: string;
  errorMessage?: string | null;
  partnerId?: string | null;
}): Promise<PartnerConsoleModel | null> => {
  const session = await apiJson<RuntimeSessionSurface>(input.apiBaseUrl, "/auth/session", {
    method: "GET",
    cookie: input.cookie
  });
  if (session.statusCode !== 200) {
    return null;
  }

  const partners = await apiJson<PartnerListWebResponse>(input.apiBaseUrl, "/partners", {
    method: "GET",
    cookie: input.cookie
  });
  if (partners.statusCode !== 200) {
    return {
      actionMessage: input.actionMessage ?? undefined,
      activeTenantAccess: null,
      activePartnerId: null,
      currentTenantSession: null,
      errorMessage: input.errorMessage ?? "Partner portfolio could not be loaded for this session.",
      metrics: undefined,
      opportunities: [],
      partners: [],
      portfolio: [],
      session: session.body
    };
  }

  const activePartnerId =
    partners.body.partners.find((entry) => entry.partner.id === input.partnerId)?.partner.id ??
    partners.body.partners[0]?.partner.id ??
    null;
  if (!activePartnerId) {
    return {
      actionMessage: input.actionMessage ?? undefined,
      activeTenantAccess: null,
      activePartnerId,
      currentTenantSession: null,
      errorMessage: input.errorMessage ?? undefined,
      metrics: undefined,
      opportunities: [],
      partners: partners.body.partners,
      portfolio: [],
      session: session.body
    };
  }

  const [portfolio, current] = await Promise.all([
    apiJson<PartnerPortfolioWebResponse>(
      input.apiBaseUrl,
      `/partners/${encodeURIComponent(activePartnerId)}/portfolio`,
      {
        method: "GET",
        cookie: input.cookie
      }
    ),
    apiJson<PartnerTenantSessionWebResponse>(
      input.apiBaseUrl,
      `/partners/${encodeURIComponent(activePartnerId)}/tenant-access-sessions/current`,
      {
        method: "GET",
        cookie: input.cookie
      }
    )
  ]);

  const portfolioRows =
    portfolio.statusCode === 200
      ? portfolio.body.grants.map((grant) => ({
          grant: {
            id: grant.id,
            organizationId: grant.organizationId,
            grantLevel: grant.grantLevel,
            status: grant.status,
            createdAt: grant.createdAt,
            updatedAt: grant.updatedAt
          },
          organization: grant.organization,
          snapshot: grant.snapshot
        }))
      : [];
  const currentTenantSession = current.statusCode === 200 ? current.body.tenantSession : null;
  const activePartner = partners.body.partners.find((entry) => entry.partner.id === activePartnerId) ?? null;

  return {
    actionMessage: input.actionMessage ?? undefined,
    activeTenantAccess: buildActiveTenantAccessBanner({
      partner: activePartner,
      portfolio: portfolioRows,
      session: currentTenantSession
    }),
    activePartnerId,
    currentTenantSession,
    errorMessage:
      input.errorMessage ??
      (portfolio.statusCode === 200 && current.statusCode === 200
        ? undefined
        : "Partner portfolio loaded with partial API data."),
    partners: partners.body.partners,
    metrics: portfolio.statusCode === 200 ? portfolio.body.metrics : undefined,
    opportunities: portfolio.statusCode === 200 ? portfolio.body.opportunities ?? [] : [],
    portfolio: portfolioRows,
    session: session.body
  };
};

const loadActiveTenantAccessBanner = async (input: {
  activeOrganizationId?: string | null;
  activeOrganizationName?: string | null;
  apiBaseUrl: string;
  cookie?: string;
}): Promise<ActiveTenantAccessBannerSurface | null> => {
  const partners = await apiJson<PartnerListWebResponse>(input.apiBaseUrl, "/partners", {
    method: "GET",
    cookie: input.cookie
  });
  if (partners.statusCode !== 200 || partners.body.partners.length === 0) {
    return null;
  }

  for (const partner of partners.body.partners) {
    const current = await apiJson<PartnerTenantSessionWebResponse>(
      input.apiBaseUrl,
      `/partners/${encodeURIComponent(partner.partner.id)}/tenant-access-sessions/current`,
      {
        method: "GET",
        cookie: input.cookie
      }
    );
    const session = current.statusCode === 200 ? current.body.tenantSession : null;
    if (
      !session ||
      session.status !== "active" ||
      (input.activeOrganizationId && session.effectiveOrganizationId !== input.activeOrganizationId)
    ) {
      continue;
    }

    const portfolio = await apiJson<PartnerPortfolioWebResponse>(
      input.apiBaseUrl,
      `/partners/${encodeURIComponent(partner.partner.id)}/portfolio`,
      {
        method: "GET",
        cookie: input.cookie
      }
    );
    const customer =
      portfolio.statusCode === 200
        ? portfolio.body.grants.find((grant) => grant.organizationId === session.effectiveOrganizationId)
        : null;

    return {
      partnerId: partner.partner.id,
      partnerName: partner.partner.name,
      customerName: customer?.organization?.name ?? input.activeOrganizationName ?? session.effectiveOrganizationId,
      grantLevel: customer?.grantLevel ?? null,
      session
    };
  }

  return null;
};

const buildActiveTenantAccessBanner = (input: {
  partner: PartnerConsoleModel["partners"][number] | null;
  portfolio: PartnerConsoleModel["portfolio"];
  session: PartnerTenantSessionSurface | null;
}): ActiveTenantAccessBannerSurface | null => {
  if (!input.partner || !input.session || input.session.status !== "active") {
    return null;
  }

  const customer = input.portfolio.find((row) => row.grant.organizationId === input.session?.effectiveOrganizationId);

  return {
    partnerId: input.partner.partner.id,
    partnerName: input.partner.partner.name,
    customerName: customer?.organization?.name ?? input.session.effectiveOrganizationId,
    grantLevel: customer?.grant.grantLevel ?? null,
    session: input.session
  };
};

const loadNis2CountryAwareOnboardingModel = async (input: {
  actionMessage?: string | null;
  apiBaseUrl: string;
  cookie?: string;
  query: URLSearchParams;
}): Promise<Nis2CountryAwareOnboardingModel | null> => {
  const session = await apiJson<RuntimeSessionSurface>(input.apiBaseUrl, "/auth/session", {
    method: "GET",
    cookie: input.cookie
  });
  if (session.statusCode !== 200) {
    return null;
  }

  const countryPacks = await apiJson<Nis2CountryPackListWebResponse>(input.apiBaseUrl, "/compliance/nis2/country-packs", {
    method: "GET",
    cookie: input.cookie
  });
  if (countryPacks.statusCode !== 200 || countryPacks.body.countryPacks.length === 0) {
    return null;
  }

  const requestedCountryCode = (input.query.get("country") ?? "RO").trim().toUpperCase();
  const selectedCountryPack =
    countryPacks.body.countryPacks.find((pack) => pack.countryCode === requestedCountryCode) ??
    countryPacks.body.countryPacks.find((pack) => pack.countryCode === "RO") ??
    countryPacks.body.countryPacks[0];
  const activeOrganizationId = session.body.session.activeOrganizationId ?? null;
  const onboardingState =
    activeOrganizationId && selectedCountryPack
      ? await apiJson<Nis2CountryOnboardingStateWebResponse>(
          input.apiBaseUrl,
          `/organizations/${encodeURIComponent(activeOrganizationId)}/compliance/nis2/onboarding/${encodeURIComponent(
            selectedCountryPack.countryCode
          )}`,
          {
            method: "GET",
            cookie: input.cookie
          }
        )
      : null;
  const classificationInput = parseNis2CountryClassificationQuery(input.query);
  const shouldClassify =
    Boolean(classificationInput.sector) ||
    typeof classificationInput.employeeCount === "number" ||
    Boolean(classificationInput.publicAdministration) ||
    Boolean(classificationInput.telecomProvider);
  const classification =
    shouldClassify && selectedCountryPack
      ? await apiJson<Nis2CountryPackClassificationWebResponse>(
          input.apiBaseUrl,
          `/compliance/nis2/country-packs/${encodeURIComponent(selectedCountryPack.countryCode)}/classification`,
          {
            method: "POST",
            cookie: input.cookie,
            body: classificationInput
          }
        )
      : null;
  const screens =
    onboardingState?.statusCode === 200 && onboardingState.body.screens.length > 0
      ? onboardingState.body.screens
      : nis2CountryOnboardingScreenFallback;
  const requestedScreen = input.query.get("screen")?.trim();
  const firstReportId = optionalFormValue(input.query.get("firstReportId")) ?? undefined;
  const improvedReportId = optionalFormValue(input.query.get("improvedReportId")) ?? undefined;
  const progress = onboardingState?.statusCode === 200 ? onboardingState.body.progress : null;
  const selectedScreen =
    (requestedScreen && screens.some((screen) => screen.key === requestedScreen) ? requestedScreen : undefined) ??
    (progress?.currentScreen && screens.some((screen) => screen.key === progress.currentScreen)
      ? progress.currentScreen
      : undefined) ??
    screens[0]?.key ??
    "company_contacts";

  return {
    actionMessage: input.actionMessage ?? undefined,
    activeTenantAccess: await loadActiveTenantAccessBanner({
      apiBaseUrl: input.apiBaseUrl,
      activeOrganizationId,
      cookie: input.cookie
    }),
    activeOrganizationId,
    classification:
      onboardingState?.statusCode === 200 && onboardingState.body.classificationRun
        ? onboardingState.body.classificationRun
        : classification?.statusCode === 200
          ? classification.body.classification
          : null,
    classificationInput,
    countryPacks: countryPacks.body.countryPacks,
    errorMessage:
      onboardingState && onboardingState.statusCode !== 200
        ? "Saved NIS2 onboarding progress could not be loaded for the selected country."
        : classification && classification.statusCode !== 200
        ? "Country-pack classification could not be generated for the selected input."
        : undefined,
    firstReportId,
    generatedReport: firstReportId
      ? {
          id: firstReportId,
          assessmentId: progress?.assessmentId,
          status: "ready"
        }
      : undefined,
    improvedReportId,
    onboardingScreens: screens,
    progress,
    selectedCountryCode: selectedCountryPack.countryCode,
    selectedCountryPack,
    selectedScreen,
    session: session.body
  };
};

const nis2CountryOnboardingScreenFallback: Nis2CountryAwareOnboardingModel["onboardingScreens"] = [
  {
    key: "company_contacts",
    label: "Company and contacts",
    summary: "Legal identity and security contacts.",
    requiredFieldPaths: ["company.legalName", "company.countryCode", "contacts.primaryName", "contacts.primaryEmail"]
  },
  {
    key: "business_profile",
    label: "Business profile",
    summary: "Sector, services, countries served, and approximate size.",
    requiredFieldPaths: ["business.sector", "business.mainProductsServices", "business.countriesServed", "business.employeeCount"]
  },
  {
    key: "nis2_scope",
    label: "NIS2 scope",
    summary: "Country-pack scope signals.",
    requiredFieldPaths: ["scope.activities", "scope.publicAdministration", "scope.telecomProvider"]
  },
  {
    key: "operational_dependencies",
    label: "Operational dependencies",
    summary: "Microsoft 365, cloud, suppliers, continuity, and incident handling.",
    requiredFieldPaths: [
      "dependencies.microsoft365Usage",
      "dependencies.criticalSuppliers",
      "dependencies.backupArrangements",
      "dependencies.businessContinuity",
      "dependencies.incidentResponse"
    ]
  },
  {
    key: "governance_controls",
    label: "Governance and controls",
    summary: "Article 21 control coverage.",
    requiredFieldPaths: ["governance.riskManagement", "governance.identityControls", "governance.mfa", "governance.supplyChainSecurity"]
  },
  {
    key: "review_generate",
    label: "Review and assessment",
    summary: "Source caveat and report trigger.",
    requiredFieldPaths: ["review.legalCaveatAcknowledged"]
  }
];

const parseNis2CountryClassificationQuery = (
  query: URLSearchParams
): Nis2CountryAwareOnboardingModel["classificationInput"] => {
  const employeeCountValue = query.get("employeeCount");
  const employeeCount =
    employeeCountValue && employeeCountValue.trim().length > 0 ? Number(employeeCountValue) : undefined;

  return {
    employeeCount: Number.isFinite(employeeCount) ? employeeCount : undefined,
    publicAdministration: query.getAll("publicAdministration").includes("true"),
    sector: optionalFormValue(query.get("sector")) ?? undefined,
    telecomProvider: query.getAll("telecomProvider").includes("true")
  };
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
  const organizationRows = organizations.body.organizations
    .filter((item) => item.membership.status === "active")
    .map((item) => ({
      id: item.organization.id,
      name: item.organization.name,
      logoDataUrl: item.organization.logoDataUrl ?? null,
      primaryCountryCode: item.organization.primaryCountryCode ?? null,
      billingStatus: item.organization.billingStatus,
      membershipStatus: item.membership.status,
      roleKeys: item.roleKeys,
      isActive: item.organization.id === sessionBody.session.activeOrganizationId
    }));
  const activeOrganization = organizationRows.find((organization) => organization.isActive) ?? null;

  return {
    activeTenantAccess: await loadActiveTenantAccessBanner({
      apiBaseUrl: input.apiBaseUrl,
      activeOrganizationId: sessionBody.session.activeOrganizationId ?? null,
      activeOrganizationName: activeOrganization?.name ?? null,
      cookie: input.cookie
    }),
    errorMessage: input.errorMessage,
    session: sessionBody,
    organizations: organizationRows
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
    activeTenantAccess: selection.activeTenantAccess ?? null,
    activeOrganization,
    canCreateInvitations: roleKeys.includes("owner") || roleKeys.includes("org_admin"),
    errorMessage: input.errorMessage,
    organizations: selection.organizations,
    roleKeys,
    roleOptions: [...organizationInvitationRoleOptions],
    session: selection.session
  };
};

const loadNotificationSettingsScreenModel = async (input: {
  actionMessage?: string | null;
  apiBaseUrl: string;
  cookie?: string;
  errorMessage?: string;
}): Promise<NotificationSettingsScreenModel | null> => {
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
  const canManageChannels = roleKeys.includes("owner") || roleKeys.includes("org_admin");

  if (!activeOrganizationId) {
    return {
      actionMessage: input.actionMessage ?? undefined,
      activeTenantAccess: selection.activeTenantAccess ?? null,
      activeOrganization,
      canManageChannels,
      channels: [],
      errorMessage: input.errorMessage,
      logs: [],
      operatorAlerts: [],
      roleKeys,
      session: selection.session
    };
  }

  const [channels, logs, operatorAlerts] = await Promise.all([
    apiJson<NotificationChannelsResponse>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(activeOrganizationId)}/notification-channels`,
      {
        method: "GET",
        cookie: input.cookie
      }
    ),
    apiJson<NotificationLogsResponse>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(activeOrganizationId)}/notification-logs`,
      {
        method: "GET",
        cookie: input.cookie
      }
    ),
    apiJson<NotificationOperatorAlertsResponse>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(activeOrganizationId)}/notification-operator-alerts`,
      {
        method: "GET",
        cookie: input.cookie
      }
    )
  ]);

  return {
    actionMessage: input.actionMessage ?? undefined,
    activeTenantAccess: selection.activeTenantAccess ?? null,
    activeOrganization,
    canManageChannels,
    channels: channels.statusCode === 200 ? channels.body.channels : [],
    errorMessage:
      input.errorMessage ??
      (channels.statusCode === 200 && logs.statusCode === 200 && operatorAlerts.statusCode === 200
        ? undefined
        : "Notification settings could not load all API data for this workspace."),
    logs: logs.statusCode === 200 ? logs.body.logs : [],
    operatorAlerts: operatorAlerts.statusCode === 200 ? operatorAlerts.body.operatorAlerts : [],
    roleKeys,
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
    logoDataUrl: active?.logoDataUrl ?? null,
    primaryCountryCode: active?.primaryCountryCode ?? null,
    subscriptionStatus: active?.billingStatus ?? null
  };
};

const loadMicrosoft365HealthSurface = async (input: {
  apiBaseUrl: string;
  cookie?: string;
  generatedAt: string;
  organizationId: string;
}): Promise<Microsoft365HealthSurface> => {
  const connections = await apiJson<ProviderConnectionListResponse>(
    input.apiBaseUrl,
    `/organizations/${encodeURIComponent(input.organizationId)}/provider-connections`,
    {
      method: "GET",
      cookie: input.cookie
    }
  );
  if (connections.statusCode !== 200) {
    return disconnectedMicrosoft365Surface(input.generatedAt);
  }

  const connection = connections.body.connections.find((item) => item.providerKey === "microsoft365");
  if (!connection) {
    return disconnectedMicrosoft365Surface(input.generatedAt);
  }

  const health = await apiJson<Microsoft365HealthWebResponse>(
    input.apiBaseUrl,
    `/organizations/${encodeURIComponent(input.organizationId)}/provider-connections/${encodeURIComponent(connection.id)}/health`,
    {
      method: "GET",
      cookie: input.cookie
    }
  );
  if (health.statusCode !== 200) {
    return {
      providerConnectionId: connection.id,
      status: "attention",
      tenantDisplayName: connection.externalTenantName ?? connection.displayName,
      tenantId: connection.externalTenantId ?? "tenant pending",
      lastSyncAt: connection.lastSuccessfulSyncAt ?? input.generatedAt,
      permissionBundles: ["health route unavailable"],
      writeEnabled: connection.writeEnabled,
      connectorMode: "tenant_oauth_provider_connection",
      modules: [
        {
          moduleKey: "provider.health",
          label: "Provider health",
          status: "attention",
          coverage: "Provider connection exists, but module health was not returned by the API.",
          sourceQuery: "provider_connection_health:error"
        }
      ]
    };
  }

  return {
    providerConnectionId: health.body.connection.id,
    status: providerStatusToOperationalStatus(health.body.status),
    tenantDisplayName: health.body.connection.externalTenantName ?? health.body.connection.displayName,
    tenantId: health.body.connection.externalTenantId ?? "tenant pending",
    lastSyncAt: health.body.connection.lastSuccessfulSyncAt ?? input.generatedAt,
    permissionBundles:
      health.body.permissionBundles.length > 0
        ? health.body.permissionBundles.map((bundle) => `${bundle.bundleKey}${bundle.enabled ? "" : " missing"}`)
        : ["permission bundles pending"],
    writeEnabled: health.body.connection.writeEnabled,
    connectorMode: microsoft365ConnectorModeLabel(health.body),
    modules: microsoft365ModulesForHealth(health.body)
  };
};

const microsoft365ConnectorModeLabel = (health: Microsoft365HealthWebResponse): string => {
  const configured = health.connectorMode ?? "live";
  const effective = health.effectiveConnectorMode ?? configured;
  const fixtureSet = health.fixtureSet ? `:${health.fixtureSet}` : "";
  return configured === effective ? effective : `${configured}->${effective}${fixtureSet}`;
};

const microsoft365ModulesForHealth = (health: Microsoft365HealthWebResponse): Microsoft365ModuleSurface[] => {
  if (health.moduleStatuses.length > 0) {
    return health.moduleStatuses.map((module) => ({
      moduleKey: module.moduleKey,
      label: microsoft365ModuleLabel(module.moduleKey),
      status: providerStatusToOperationalStatus(module.status),
      coverage: module.statusReason ?? microsoft365ModuleCoverage(module),
      lastSyncAt: module.completedAt,
      sourceQuery: `provider_sync_modules:${module.moduleKey},latest`
    }));
  }

  return health.capabilities.length > 0
    ? health.capabilities.map((capability) => ({
        moduleKey: capability.moduleKey,
        label: microsoft365ModuleLabel(capability.moduleKey),
        status: providerStatusToOperationalStatus(capability.status),
        coverage: capability.statusReason ?? "Capability recorded before the first module sync.",
        sourceQuery: `provider_capabilities:${capability.moduleKey}`
      }))
    : [
        {
          moduleKey: "provider.connection",
          label: "Provider connection",
          status: providerStatusToOperationalStatus(health.status),
          coverage: "Tenant consent is stored. Run a read-only sync to populate module health.",
          sourceQuery: "provider_connections:microsoft365"
        }
      ];
};

const microsoft365ModuleCoverage = (module: Microsoft365HealthWebResponse["moduleStatuses"][number]): string => {
  if (module.missingPermissions && module.missingPermissions.length > 0) {
    return `Missing permissions: ${module.missingPermissions.join(", ")}`;
  }
  if (module.missingLicenses && module.missingLicenses.length > 0) {
    return `Missing licenses: ${module.missingLicenses.join(", ")}`;
  }
  return "Latest read-only connector module status.";
};

const microsoft365ModuleLabel = (moduleKey: string): string => {
  if (moduleKey === "mfa-registration") {
    return "MFA Registration";
  }

  return moduleKey
    .split(/[-_.]/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

const providerStatusToOperationalStatus = (status: string): OperationalStatus => {
  if (status === "connected" || status === "succeeded") {
    return "ready";
  }
  if (status === "pending" || status === "running") {
    return "in_progress";
  }
  if (status === "revoked" || status === "failed" || status === "revoked_consent") {
    return "blocked";
  }
  return "attention";
};

const microsoft365WebCallbackRedirectUri = (requestOrigin: string): string =>
  process.env.PURESOC_CONNECTOR_MICROSOFT365_REDIRECT_URI?.trim() ||
  `${requestOrigin}/providers/microsoft365/callback`;

const microsoft365CallbackErrorMessage = (
  errorCode: string | null | undefined,
  errorMessage: string | null | undefined
): string => {
  if (errorCode === "microsoft365_graph_forbidden") {
    return [
      "Microsoft Graph rejected the first tenant-profile read. Confirm the PureSOC Entra app registration includes the Microsoft Graph application permissions required by the selected bundle, then grant admin consent again. Extra granted roles are recorded, but provider writes still require the separate action lifecycle.",
      errorMessage
    ]
      .filter(Boolean)
      .join(" ");
  }

  return errorMessage ?? "The callback did not match the active workspace session or Microsoft did not grant admin consent.";
};

const handleNis2CountryOnboardingPost = async (input: {
  apiBaseUrl: string;
  cookie?: string;
  organizationId: string;
  origin?: string;
  request: AsyncIterable<Buffer>;
}): Promise<{ countryCode: string; firstReportId?: string; improvedReportId?: string; message: string; screen: string }> => {
  const form = await readFormBody(input.request);
  const countryCode = (optionalFormValue(form.get("country")) ?? "RO").toUpperCase();
  const screen = optionalFormValue(form.get("screen")) ?? "company_contacts";
  const action = optionalFormValue(form.get("_action")) ?? "save";
  const existingFirstReportId = optionalFormValue(form.get("firstReportId")) ?? undefined;
  const existingImprovedReportId = optionalFormValue(form.get("improvedReportId")) ?? undefined;
  const save = await apiJson<{ progress?: Nis2CountryAwareOnboardingModel["progress"] }>(
    input.apiBaseUrl,
    `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/onboarding/${encodeURIComponent(countryCode)}`,
    {
      method: "PUT",
      cookie: input.cookie,
      origin: input.origin,
      body: {
        answers: formToNis2CountryAnswers(form),
        currentScreen: screen,
        onboardingProgressId: optionalFormValue(form.get("onboardingProgressId"))
      }
    }
  );
  if (!apiSucceeded(save.statusCode)) {
    return {
      countryCode,
      firstReportId: existingFirstReportId,
      improvedReportId: existingImprovedReportId,
      message: "NIS2 country onboarding progress was not saved. Check the required fields and try again.",
      screen
    };
  }

  if (action === "classify") {
    const classified = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/onboarding/${encodeURIComponent(
        countryCode
      )}/classification`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: {}
      }
    );
    return {
      countryCode,
      firstReportId: existingFirstReportId,
      improvedReportId: existingImprovedReportId,
      message: apiSucceeded(classified.statusCode)
        ? "Country-pack scope check generated from saved onboarding answers."
        : "Country-pack scope check could not be generated from saved answers.",
      screen: "nis2_scope"
    };
  }

  if (action === "generate_report") {
    const generated = await apiJson<Nis2CountryOnboardingReportWebResponse>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/onboarding/${encodeURIComponent(
        countryCode
      )}/report`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: {}
      }
    );
    const generatedReportId = apiSucceeded(generated.statusCode) ? generated.body.report.id : undefined;
    return {
      countryCode,
      firstReportId: generatedReportId ?? existingFirstReportId,
      improvedReportId: existingImprovedReportId,
      message: apiSucceeded(generated.statusCode)
        ? `Internal readiness report v1 generated (${generated.body.report.id}).`
        : "Internal readiness report could not be generated. Complete all required fields first.",
      screen: "review_generate"
    };
  }

  return {
    countryCode,
    firstReportId: existingFirstReportId,
    improvedReportId: existingImprovedReportId,
    message: "NIS2 country onboarding progress saved.",
    screen
  };
};

const loadRomaniaOnboardingRouteModel = async (input: {
  actionMessage?: string | null;
  apiBaseUrl: string;
  cookie?: string;
  locale?: string | null;
  organizationId: string;
}) => {
  const [state, evidence, billing, audit, dashboard, activeTenantAccess] = await Promise.all([
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
    ),
    loadActiveTenantAccessBanner({
      apiBaseUrl: input.apiBaseUrl,
      activeOrganizationId: input.organizationId,
      cookie: input.cookie
    })
  ]);
  const microsoft365 = await loadMicrosoft365HealthSurface({
    apiBaseUrl: input.apiBaseUrl,
    cookie: input.cookie,
    generatedAt: dashboard.statusCode === 200 ? dashboard.body.snapshot.generatedAt : "2026-05-03T09:00:00.000Z",
    organizationId: input.organizationId
  });

  return createRomaniaOnboardingRouteModel({
    actionMessage: input.actionMessage,
    activeTenantAccess,
    auditCheckpointCount: audit.statusCode === 200 ? audit.body.checkpoints.length : 0,
    billingEntitlementCount: billing.statusCode === 200 ? billing.body.entitlements.length : 0,
    billingProviderKey: "none",
    classificationRun: state.statusCode === 200 ? state.body.classificationRun : null,
    dashboard: dashboard.statusCode === 200 ? dashboard.body.snapshot : null,
    evidenceArtifacts: evidence.statusCode === 200 ? evidence.body.artifacts : [],
    latestNotificationDraft: state.statusCode === 200 ? state.body.latestNotificationDraft : null,
    locale: input.locale,
    microsoft365,
    progress: state.statusCode === 200 ? state.body.progress : null
  });
};

const handleRomaniaWorkflowPost = async (input: {
  apiBaseUrl: string;
  cookie?: string;
  organizationId: string;
  origin?: string;
  path: string;
  request: AsyncIterable<Buffer>;
}): Promise<{ message: string; screen?: RomaniaOnboardingScreen }> => {
  if (input.path === "/onboarding/romania/save") {
    const form = await readFormBody(input.request);
    const state = await loadRoState(input);
    const existingAnswers = isRecord(state.progress?.answers) ? state.progress.answers : {};
    const saved = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/compliance/nis2/ro/onboarding`,
      {
        method: "PUT",
        cookie: input.cookie,
        origin: input.origin,
        body: {
          answers: formToRomaniaAnswers(form, existingAnswers)
        }
      }
    );
    const logoPatch = await patchWorkspaceBrandingFromForm({
      apiBaseUrl: input.apiBaseUrl,
      cookie: input.cookie,
      form,
      legalName: optionalFormValue(form.get("legalName")),
      organizationId: input.organizationId,
      origin: input.origin,
      primaryCountryCode: "RO"
    });
    const nextScreen = form.get("nextScreen");
    return {
      message:
        apiSucceeded(saved.statusCode) && !apiSucceeded(logoPatch.statusCode)
          ? "Romania onboarding progress saved, but the workspace logo was not updated."
          : messageForRomaniaAction(input.path, saved.statusCode),
      screen: isRomaniaOnboardingScreen(nextScreen) ? nextScreen : "company"
    };
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
    return { message: messageForRomaniaAction(input.path, classified.statusCode), screen: "outputs" };
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
    return { message: messageForRomaniaAction(input.path, draft.statusCode), screen: "outputs" };
  }

  if (input.path === "/onboarding/romania/evaluate") {
    const state = await loadRoState(input);
    const assessmentId = state.progress?.assessmentId;
    if (!assessmentId) {
      return { message: "Save Romania onboarding progress before evaluating readiness.", screen: "outputs" };
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
    return { message: messageForRomaniaAction(input.path, evaluated.statusCode), screen: "outputs" };
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
    return { message: messageForRomaniaAction(input.path, uploaded.statusCode), screen: "outputs" };
  }

  if (input.path === "/onboarding/romania/reports/internal-readiness") {
    const state = await loadRoState(input);
    if (!state.progress?.assessmentId) {
      return { message: "Evaluate readiness before generating the internal readiness export.", screen: "outputs" };
    }
    const report = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/reports/internal-readiness`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: {
          assessmentId: state.progress.assessmentId,
          ...buildRomaniaInitialReportVersionContext(state)
        }
      }
    );
    return { message: messageForRomaniaAction(input.path, report.statusCode), screen: "outputs" };
  }

  if (input.path === "/onboarding/romania/reports/internal-readiness-csv") {
    const state = await loadRoState(input);
    if (!state.progress?.assessmentId) {
      return { message: "Evaluate readiness before generating the internal readiness CSV export.", screen: "gaps" };
    }
    const report = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/reports/internal-readiness/csv`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: {
          assessmentId: state.progress.assessmentId,
          ...buildRomaniaInitialReportVersionContext(state)
        }
      }
    );
    return { message: messageForRomaniaAction(input.path, report.statusCode), screen: "gaps" };
  }

  if (input.path === "/onboarding/romania/reports/evidence-package") {
    const state = await loadRoState(input);
    if (!state.progress?.assessmentId) {
      return { message: "Evaluate readiness before generating the evidence package.", screen: "gaps" };
    }
    const report = await apiJson<unknown>(
      input.apiBaseUrl,
      `/organizations/${encodeURIComponent(input.organizationId)}/reports/internal-readiness/evidence-package`,
      {
        method: "POST",
        cookie: input.cookie,
        origin: input.origin,
        body: {
          assessmentId: state.progress.assessmentId,
          ...buildRomaniaInitialReportVersionContext(state)
        }
      }
    );
    return { message: messageForRomaniaAction(input.path, report.statusCode), screen: "gaps" };
  }

  if (input.path === "/onboarding/romania/reports/notification-draft") {
    const state = await loadRoState(input);
    const reportBody = notificationDraftReportBody(input.organizationId, state);
    if (!reportBody) {
      return { message: "Generate a Romania notification draft before exporting it.", screen: "outputs" };
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
    return { message: messageForRomaniaAction(input.path, report.statusCode), screen: "outputs" };
  }

  if (input.path === "/onboarding/romania/audit/checkpoint") {
    const checkpoint = await apiJson<unknown>(input.apiBaseUrl, `/organizations/${encodeURIComponent(input.organizationId)}/audit/checkpoints`, {
      method: "POST",
      cookie: input.cookie,
      origin: input.origin,
      body: {}
    });
    return { message: messageForRomaniaAction(input.path, checkpoint.statusCode), screen: "outputs" };
  }

  return { message: "Romania readiness action is not available.", screen: "outputs" };
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

  return state.statusCode === 200
    ? state.body
    : {
        classificationRun: null,
        latestNotificationDraft: null,
        progress: null
  };
};

const formToNis2CountryAnswers = (form: URLSearchParams): Record<string, unknown> => {
  const answers: Record<string, unknown> = {};
  const stringFields = [
    "company.legalName",
    "company.countryCode",
    "locations.headquartersCountry",
    "locations.headquartersCity",
    "contacts.primaryName",
    "contacts.primaryEmail",
    "contacts.securityName",
    "contacts.securityEmail",
    "business.sector",
    "business.mainProductsServices",
    "size.sizeCategory",
    "size.legalStructure",
    "systems.systemsDescription",
    "providers.microsoft365Usage",
    "dependencies.microsoft365Usage",
    "dependencies.backupArrangements",
    "dependencies.businessContinuity",
    "dependencies.incidentResponse",
    "governance.riskManagement",
    "governance.identityControls",
    "governance.mfa",
    "governance.supplyChainSecurity",
    "review.assumptions"
  ];
  for (const field of stringFields) {
    setStringIfPresent(answers, form, field, field);
  }

  const listFields = [
    "business.countriesServed",
    "scope.activities",
    "selectedServiceTypeCodes",
    "systems.publicIpRanges",
    "dependencies.criticalSuppliers"
  ];
  for (const field of listFields) {
    setListIfPresent(answers, form, field, field);
  }

  const employeeCount = Number(form.get("business.employeeCount") ?? "");
  if (form.has("business.employeeCount")) {
    setPath(answers, "business.employeeCount", Number.isFinite(employeeCount) && employeeCount > 0 ? employeeCount : undefined);
  }

  setBooleanIfPresent(answers, form, "scope.publicAdministration", "scope.publicAdministration");
  setBooleanIfPresent(answers, form, "scope.telecomProvider", "scope.telecomProvider");
  setBooleanIfPresent(answers, form, "relationship.establishedInRomania", "relationship.establishedInRomania");
  setBooleanIfPresent(answers, form, "relationship.mainOfficeInRomania", "relationship.mainOfficeInRomania");
  setBooleanIfPresent(answers, form, "relationship.providesServicesInRomania", "relationship.providesServicesInRomania");
  setBooleanIfPresent(
    answers,
    form,
    "relationship.providesServicesInAnotherEuMemberState",
    "relationship.providesServicesInAnotherEuMemberState"
  );
  setBooleanIfPresent(
    answers,
    form,
    "relationship.publicAdministrationEstablishedByRomania",
    "relationship.publicAdministrationEstablishedByRomania"
  );
  setBooleanIfPresent(
    answers,
    form,
    "relationship.criticalEntityInRomaniaLaw294",
    "relationship.criticalEntityInRomaniaLaw294"
  );
  setBooleanIfPresent(answers, form, "review.legalCaveatAcknowledged", "review.legalCaveatAcknowledged");

  if (!form.has("providers.microsoft365Usage") && form.has("dependencies.microsoft365Usage")) {
    setStringIfPresent(answers, form, "dependencies.microsoft365Usage", "providers.microsoft365Usage");
  }

  for (const [key, value] of form.entries()) {
    if (key.startsWith("scope.dynamicAnswers.") && value.trim().length > 0) {
      setPath(answers, key, value.trim());
    }
  }

  return answers;
};

const buildRomaniaInitialReportVersionContext = (state: RomaniaOnboardingStateResponse) => ({
  classificationResult: state.classificationRun
    ? {
        confidence: state.classificationRun.missingRequiredFields.length === 0 ? "medium" : "low",
        countryCode: "RO",
        explanation: state.classificationRun.reasons.join(" "),
        legalReviewRequired: true,
        missingInformation: state.classificationRun.missingRequiredFields,
        result: state.classificationRun.result
      }
    : undefined,
  countryPackVersion: "2026.06.demo",
  onboardingSchemaVersion: state.progress?.sourceVersion,
  reportVersion: 1,
  triggerType: "onboarding_completed"
});

const createDashboardSnapshot = async (
  input: {
    apiBaseUrl: string;
    cookie?: string;
    organizationId: string;
    origin?: string;
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

const formToRomaniaAnswers = (form: URLSearchParams, existingAnswers: Record<string, unknown>): Record<string, unknown> => {
  const answers = cloneAnswerRecord(existingAnswers);
  const employeeCount = Number(form.get("employeeCount") ?? "");
  const annualTurnoverEur = Number(form.get("annualTurnoverEur") ?? "");
  const balanceSheetTotalEur = Number(form.get("balanceSheetTotalEur") ?? "");
  const serviceCodes = form.getAll("serviceCodes").filter((value) => value.length > 0);
  const legacyServiceCode = optionalFormValue(form.get("serviceCode"));

  setStringIfPresent(answers, form, "mainNaceCode", "activity.mainNaceCode");
  setListIfPresent(answers, form, "secondaryNaceCodes", "activity.secondaryNaceCodes");
  setStringIfPresent(answers, form, "city", "address.city");
  setStringIfPresent(answers, form, "country", "address.country");
  setStringIfPresent(answers, form, "county", "address.county");
  setStringIfPresent(answers, form, "number", "address.number");
  setStringIfPresent(answers, form, "postalCode", "address.postalCode");
  setStringIfPresent(answers, form, "street", "address.street");
  setBooleanIfPresent(answers, form, "nationalOrRegionalCriticality", "article9.nationalOrRegionalCriticality");
  setStringIfPresent(answers, form, "publicSafetySecurityOrHealthImpact", "article9.publicSafetySecurityOrHealthImpact");
  setBooleanIfPresent(answers, form, "soleProviderEssentialService", "article9.soleProviderEssentialService");
  setStringIfPresent(answers, form, "systemicRisk", "article9.systemicRisk");
  setListIfPresent(answers, form, "attachedDocumentIds", "attachedDocumentIds");
  setStringIfPresent(answers, form, "email", "contact.email");
  setStringIfPresent(answers, form, "mobilePhone", "contact.mobilePhone");
  setStringIfPresent(answers, form, "phone", "contact.phone");
  setStringIfPresent(answers, form, "websiteUrl", "contact.websiteUrl");
  setStringIfPresent(answers, form, "cybersecurityEmail", "cybersecurityResponsible.email");
  setStringIfPresent(answers, form, "cybersecurityName", "cybersecurityResponsible.name");
  setStringIfPresent(answers, form, "cybersecurityPhone", "cybersecurityResponsible.phone");
  setStringIfPresent(answers, form, "cybersecurityRole", "cybersecurityResponsible.role");
  setStringIfPresent(answers, form, "cui", "entity.cui");
  setStringIfPresent(answers, form, "legalName", "entity.legalName");
  setStringIfPresent(answers, form, "nationalRegistrationNumber", "entity.nationalRegistrationNumber");
  setStringIfPresent(answers, form, "legalRepresentativeEmail", "legalRepresentative.email");
  setStringIfPresent(answers, form, "legalRepresentativeName", "legalRepresentative.name");
  setStringIfPresent(answers, form, "legalRepresentativePhone", "legalRepresentative.phone");
  setStringIfPresent(answers, form, "legalRepresentativeRole", "legalRepresentative.role");
  setListIfPresent(answers, form, "publicIpRanges", "network.publicIpRanges");
  setStringIfPresent(answers, form, "systemsDescription", "network.systemsDescription");
  setStringIfPresent(answers, form, "monitoringEmail", "permanentMonitoringContact.email");
  setStringIfPresent(answers, form, "monitoringName", "permanentMonitoringContact.name");
  setStringIfPresent(answers, form, "monitoringPhone", "permanentMonitoringContact.phone");
  setStringIfPresent(answers, form, "monitoringRole", "permanentMonitoringContact.role");
  setBooleanIfPresent(answers, form, "criticalEntityInRomaniaLaw294", "relationship.criticalEntityInRomaniaLaw294");
  setBooleanIfPresent(answers, form, "establishedInRomania", "relationship.establishedInRomania");
  setBooleanIfPresent(answers, form, "mainOfficeInRomania", "relationship.mainOfficeInRomania");
  setBooleanIfPresent(answers, form, "providesServicesInAnotherEuMemberState", "relationship.providesServicesInAnotherEuMemberState");
  setBooleanIfPresent(answers, form, "providesServicesInRomania", "relationship.providesServicesInRomania");
  setBooleanIfPresent(answers, form, "publicAdministrationEstablishedByRomania", "relationship.publicAdministrationEstablishedByRomania");
  if (form.has("serviceCodes") || form.has("serviceCode")) {
    setPath(answers, "selectedServiceTypeCodes", serviceCodes.length > 0 ? serviceCodes : [legacyServiceCode].filter(Boolean));
  }
  if (form.has("annualTurnoverEur")) {
    setPath(answers, "size.annualTurnoverEur", Number.isFinite(annualTurnoverEur) && annualTurnoverEur > 0 ? annualTurnoverEur : undefined);
  }
  if (form.has("balanceSheetTotalEur")) {
    setPath(answers, "size.balanceSheetTotalEur", Number.isFinite(balanceSheetTotalEur) && balanceSheetTotalEur > 0 ? balanceSheetTotalEur : undefined);
  }
  if (form.has("employeeCount")) {
    setPath(answers, "size.employeeCount", Number.isFinite(employeeCount) && employeeCount > 0 ? employeeCount : undefined);
  }
  setStringIfPresent(answers, form, "sizeCategory", "size.sizeCategory");

  return answers;
};

const cloneAnswerRecord = (value: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

const setStringIfPresent = (answers: Record<string, unknown>, form: URLSearchParams, field: string, path: string): void => {
  if (form.has(field)) {
    setPath(answers, path, optionalFormValue(form.get(field)) ?? undefined);
  }
};

const setListIfPresent = (answers: Record<string, unknown>, form: URLSearchParams, field: string, path: string): void => {
  if (form.has(field)) {
    setPath(answers, path, splitList(optionalFormValue(form.get(field))));
  }
};

const setBooleanIfPresent = (answers: Record<string, unknown>, form: URLSearchParams, field: string, path: string): void => {
  if (form.has(field)) {
    setPath(answers, path, form.getAll(field).includes("true"));
  }
};

const setPath = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (const part of parts.slice(0, -1)) {
    const existing = cursor[part];
    if (!isRecord(existing)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  const leaf = parts.at(-1);
  if (leaf) {
    cursor[leaf] = value;
  }
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
      "/onboarding/romania/reports/internal-readiness-csv": "Internal readiness CSV export could not be generated.",
      "/onboarding/romania/reports/evidence-package": "Evidence package export could not be generated.",
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
    "/onboarding/romania/reports/internal-readiness-csv": "Internal readiness CSV export generated.",
    "/onboarding/romania/reports/evidence-package": "Internal readiness evidence package generated.",
    "/onboarding/romania/reports/notification-draft": "Romania notification draft JSON export generated.",
    "/onboarding/romania/audit/checkpoint": "Audit checkpoint metadata recorded without WORM or external notarization claims."
  };

  return messages[path] ?? "Romania readiness action completed.";
};

const apiSucceeded = (statusCode: number): boolean => statusCode >= 200 && statusCode < 300;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const registrationErrorMessageForApiResponse = (statusCode: number, body: unknown): string => {
  const errorCode = apiErrorCode(body);

  if (errorCode === "email_already_registered") {
    return "An account already exists for that email. Sign in instead.";
  }

  if (errorCode === "origin_required" || errorCode === "origin_not_allowed") {
    return "The API rejected this registration request origin. Keep web-to-API calls on the internal Compose URL, or configure trusted origins if the API is public.";
  }

  if (errorCode === "payload_too_large") {
    return "Registration data is too large. Use a shorter display name.";
  }

  if (errorCode === "rate_limited") {
    return "Too many registration attempts. Wait a minute and try again.";
  }

  if (statusCode >= 500 || errorCode === "internal_error") {
    return "Registration is temporarily unavailable. The operator should check API logs and database migrations.";
  }

  if (errorCode === "invalid_request") {
    return "Enter a display name, a valid email, and a password with at least 12 characters.";
  }

  return "Registration failed. Use a valid email and a password with at least 12 characters.";
};

export const loginErrorMessageForApiResponse = (statusCode: number, body: unknown): string => {
  const errorCode = apiErrorCode(body);

  if (errorCode === "account_locked") {
    return "This account is temporarily locked after repeated failed sign-in attempts. Wait 15 minutes, then try again or reset the password.";
  }

  if (errorCode === "rate_limited") {
    return "Too many failed sign-in attempts. Wait a minute before trying again.";
  }

  if (errorCode === "forbidden") {
    return "The selected workspace is not available for this account. Sign in without a workspace, then choose one from the workspace screen.";
  }

  if (errorCode === "origin_required" || errorCode === "origin_not_allowed") {
    return "The API rejected this sign-in request origin. Keep web-to-API calls on the internal Compose URL, or configure trusted origins if the API is public.";
  }

  if (errorCode === "payload_too_large") {
    return "Sign-in data is too large. Use a shorter email value.";
  }

  if (statusCode >= 500 || errorCode === "internal_error") {
    return "Sign-in is temporarily unavailable. The operator should check API logs and database migrations.";
  }

  if (errorCode === "invalid_request") {
    return "Enter a valid email and password.";
  }

  return "Sign-in failed. Check the email and password.";
};

const apiErrorCode = (body: unknown): string | null => {
  if (!isRecord(body) || !isRecord(body.error)) {
    return null;
  }

  return typeof body.error.code === "string" ? body.error.code : null;
};

const apiErrorMessage = (body: unknown): string | null => {
  if (!isRecord(body) || !isRecord(body.error)) {
    return null;
  }

  return typeof body.error.message === "string" ? body.error.message : null;
};

const apiJson = async <T>(
  apiBaseUrl: string,
  path: string,
  input: {
    method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
    body?: Record<string, unknown>;
    cookie?: string;
    origin?: string;
  }
): Promise<{ statusCode: number; body: T; setCookie?: string }> => {
  const hasJsonBody = input.method === "PATCH" || input.method === "POST" || input.method === "PUT";
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: input.method,
    headers: {
      ...(hasJsonBody ? { "content-type": "application/json" } : {}),
      ...(input.cookie ? { cookie: input.cookie } : {}),
      ...(input.origin ? { origin: input.origin } : {})
    },
    body: hasJsonBody ? JSON.stringify(input.body ?? {}) : undefined
  });

  return {
    statusCode: response.status,
    body: (await response.json()) as T,
    setCookie: response.headers.get("set-cookie") ?? undefined
  };
};

const authenticatedLandingPath = async (input: {
  activeOrganizationId?: string | null;
  apiBaseUrl: string;
  cookie?: string;
}): Promise<"/dashboard" | "/partners" | "/workspaces"> => {
  if (input.activeOrganizationId) {
    return "/dashboard";
  }

  const cookie = input.cookie?.split(";", 1)[0];
  if (!cookie) {
    return "/workspaces";
  }

  try {
    const partners = await apiJson<PartnerListWebResponse>(input.apiBaseUrl, "/partners", {
      method: "GET",
      cookie
    });
    return partners.statusCode === 200 && partners.body.partners.length > 0 ? "/partners" : "/workspaces";
  } catch {
    return "/workspaces";
  }
};
