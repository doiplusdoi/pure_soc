import type { DashboardWidgetContract } from "@puresoc/dashboards";
import type { ActionRun } from "@puresoc/recommendations";
import type { ReportEvidenceSummary, ReportSourceReference } from "@puresoc/reports";
import {
  PURESOC_MESSAGE_KEYS,
  resolvePureSocLocale,
  resolvePureSocMessage,
  type ActionableSeverity,
  type PureSocLocale
} from "@puresoc/shared";
import {
  clampPercent,
  escapeHtml,
  renderCommandButton,
  renderDataTable,
  renderLegalCaveat,
  renderMeter,
  renderPureSocDesignSystemCss,
  renderSourceChip,
  renderStatusPill,
  type PureSocUiTone
} from "@puresoc/ui";

import type {
  ActiveTenantAccessBannerSurface,
  CountryPackSurface,
  DashboardSnapshotHistoryPoint,
  GapSurface,
  Microsoft365ModuleSurface,
  Nis2CountryAwareOnboardingModel,
  Nis2CountryPackDefinitionSurface,
  Nis2CountryPackQuestionSurface,
  NotificationSettingsScreenModel,
  OnboardingSurface,
  OrganizationInvitationScreenModel,
  OperationalConsoleModel,
  OperationalStatus,
  Microsoft365HealthSurface,
  RomaniaOnboardingRouteModel,
  RomaniaReadinessGapSurface,
  PartnerConsoleModel,
  PartnerPortfolioCustomerSurface,
  RecommendationSurface,
  ReportSurface,
  RuntimeSessionSurface,
  WorkspaceSelectionModel
} from "./app-data";

export interface RenderOperationalConsoleOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface RenderLoginScreenOptions {
  activeOrganizationId?: string | null;
  emailValue?: string | null;
  errorMessage?: string;
  locale?: string | null;
  microsoftEntraEnabled?: boolean;
  productName?: string;
}

export interface RenderRegisterScreenOptions {
  displayNameValue?: string | null;
  emailValue?: string | null;
  errorMessage?: string;
  locale?: string | null;
  microsoftEntraEnabled?: boolean;
  productName?: string;
}

export interface RenderEmailVerificationScreenOptions {
  errorMessage?: string;
  locale?: string | null;
  productName?: string;
  successMessage?: string;
}

export interface RuntimeMessageScreenInput {
  actionHref?: string;
  actionLabel?: string;
  locale?: string | null;
  statusLabel: string;
  statusTone?: PureSocUiTone;
  summary: string;
  title: string;
}

export type ProductMvpRoute =
  | "connectors"
  | "connectors_microsoft365"
  | "customers"
  | "dashboard"
  | "evidence"
  | "gap_analyzer"
  | "microsoft365"
  | "onboarding"
  | "remediation"
  | "reports"
  | "settings";

export interface ProductMvpShellModel {
  actionMessage?: string | null;
  activeRoute: ProductMvpRoute;
  customers: Array<Record<string, unknown>>;
  dashboard: {
    workspace: {
      id: string;
      name: string;
      legalName?: string | null;
      countryCode: string;
      billingStatus: string;
    };
    countryPack: {
      selected: string;
      available: string[];
      status: string;
    };
    readiness: {
      score: number;
      label: string;
      assessmentId: string;
      baselineState: string;
    };
    microsoft365: {
      status: string;
      connectionId: string | null;
      tenantName: string;
      lastSyncAt: string | null;
      writeEnabled: boolean;
    };
    gaps: {
      critical: number;
      open: number;
      recent: Array<Record<string, unknown>>;
    };
    recommendations: Array<Record<string, unknown>>;
    evidence: Array<Record<string, unknown>>;
    reports: Array<Record<string, unknown>>;
    remediation: {
      total: number;
      approvalRequested: number;
      approved: number;
      dryRunOnly: boolean;
    };
    lastSync: string | null;
    nextAction: {
      label: string;
      href: string;
    };
    legalCaveat: string;
  };
  details?: {
    connectors?: Array<Record<string, unknown>>;
    evidence?: Array<Record<string, unknown>>;
    findings?: Array<Record<string, unknown>>;
    gaps?: Array<Record<string, unknown>>;
    recommendations?: Array<Record<string, unknown>>;
    remediationActions?: Array<Record<string, unknown>>;
    reports?: Array<Record<string, unknown>>;
  };
  session: RuntimeSessionSurface;
}

export interface RenderProductMvpShellOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface Microsoft365ConnectorPageModel {
  actionMessage?: string | null;
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
  activeOrganizationName?: string | null;
  microsoft365: Microsoft365HealthSurface;
}

export interface RenderMicrosoft365ConnectorPageOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface RenderWorkspaceSelectionOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface RenderOrganizationInvitationsOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface RenderNotificationSettingsOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface RenderPartnerConsoleOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface RenderNis2CountryAwareOnboardingOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export type RomaniaOnboardingScreen =
  | "company"
  | "address"
  | "legal"
  | "size"
  | "services"
  | "contacts"
  | "systems"
  | "article9"
  | "outputs"
  | "connector"
  | "gaps";

type RomaniaDataEntryScreen = Exclude<RomaniaOnboardingScreen, "outputs" | "connector" | "gaps">;

export interface RenderRomaniaOnboardingRouteOptions {
  includeDocumentShell?: boolean;
  screen?: RomaniaOnboardingScreen;
}

interface RomaniaOnboardingScreenDefinition {
  href: string;
  key: RomaniaOnboardingScreen;
  label: string;
  summary: string;
}

const romaniaOnboardingScreens: readonly RomaniaOnboardingScreenDefinition[] = [
  {
    href: "/onboarding/romania/company?locale=ro-RO",
    key: "company",
    label: "Company",
    summary: "Legal identity and registration"
  },
  {
    href: "/onboarding/romania/address?locale=ro-RO",
    key: "address",
    label: "Address",
    summary: "Registered office details"
  },
  {
    href: "/onboarding/romania/legal?locale=ro-RO",
    key: "legal",
    label: "Legal",
    summary: "Representative details"
  },
  {
    href: "/onboarding/romania/size?locale=ro-RO",
    key: "size",
    label: "Size",
    summary: "Business activity and scale"
  },
  {
    href: "/onboarding/romania/services?locale=ro-RO",
    key: "services",
    label: "Services",
    summary: "NIS2 service and jurisdiction"
  },
  {
    href: "/onboarding/romania/contacts?locale=ro-RO",
    key: "contacts",
    label: "Contacts",
    summary: "Security responsibility"
  },
  {
    href: "/onboarding/romania/systems?locale=ro-RO",
    key: "systems",
    label: "Systems",
    summary: "Monitoring and network context"
  },
  {
    href: "/onboarding/romania/article9?locale=ro-RO",
    key: "article9",
    label: "Article 9",
    summary: "Criticality and impact context"
  },
  {
    href: "/onboarding/romania/outputs?locale=ro-RO",
    key: "outputs",
    label: "Outputs",
    summary: "Classification, draft, evidence, and review package"
  },
  {
    href: "/onboarding/romania/connector?locale=ro-RO",
    key: "connector",
    label: "Connector",
    summary: "Microsoft 365 tenant connection"
  },
  {
    href: "/onboarding/romania/gaps?locale=ro-RO",
    key: "gaps",
    label: "Gaps",
    summary: "Gap list and exports"
  }
];

const romaniaDataEntryScreenOrder: readonly RomaniaDataEntryScreen[] = [
  "company",
  "address",
  "legal",
  "size",
  "services",
  "contacts",
  "systems",
  "article9"
];

const isRomaniaDataEntryScreen = (screen: RomaniaOnboardingScreen): screen is RomaniaDataEntryScreen =>
  romaniaDataEntryScreenOrder.includes(screen as RomaniaDataEntryScreen);

const wizardQuestionLimit = 5;

interface OperationalConsoleCopy {
  apiSession: string;
  approvalQueue: string;
  dashboard: string;
  email: string;
  evidenceReports: string;
  internalReadiness: string;
  internalReadinessConsole: string;
  locale: PureSocLocale;
  password: string;
  signIn: string;
  sourceMapped: string;
  storedAggregate: string;
}

export const renderOperationalConsole = (
  model: OperationalConsoleModel,
  options: RenderOperationalConsoleOptions = {}
): string => {
  const copy = resolveOperationalConsoleCopy(options.locale);
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<div class="ps-shell" data-ui-smoke="operational-console">',
    renderSidebar(model, copy),
    '<main class="ps-main" id="content" tabindex="-1">',
    renderTopbar(model),
    '<div class="ps-content">',
    renderActiveTenantAccessBanner(model.activeTenantAccess),
    renderDashboardSection(model, copy),
    renderOnboardingSection(model, copy),
    renderMicrosoft365Section(model),
    renderGapsAndRecommendationsSection(model),
    renderEvidenceReportsSection(model, copy),
    renderApprovalSection(model.actionRuns, copy),
    "</div>",
    "</main>",
    "</div>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${copy.locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(model.organization.name)} PureSOC console</title>`,
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    renderRomaniaServiceSearchScript(),
    renderDashboardTrendScript(),
    "</body>",
    "</html>"
  ].join("");
};

export const renderLoginScreen = (options: RenderLoginScreenOptions | string = {}): string => {
  const normalized = typeof options === "string" ? { productName: options } : options;
  const productName = normalized.productName ?? "PureSOC";
  const copy = resolveOperationalConsoleCopy(normalized.locale);

  return [
    "<!doctype html>",
    `<html lang="${copy.locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(productName)} ${escapeHtml(copy.signIn.toLowerCase())}</title>`,
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    '<main class="ps-content ps-content--auth" id="content" tabindex="-1" data-ui-smoke="login-screen">',
    '<section class="ps-section" aria-labelledby="login-title">',
    '<div class="ps-section__header">',
    `<div><h1 class="ps-section__title" id="login-title">${escapeHtml(copy.signIn)}</h1><p class="ps-muted">${escapeHtml(
      copy.internalReadinessConsole
    )}</p></div>`,
    renderStatusPill({ label: copy.apiSession, tone: "info" }),
    "</div>",
    '<div class="ps-section__body">',
    normalized.errorMessage
      ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(normalized.errorMessage)}</p>`
      : "",
    '<form class="ps-form" action="/auth/login" method="post">',
    `<div class="ps-field"><label for="email">${escapeHtml(copy.email)}</label><input id="email" name="email" type="email" autocomplete="email"${
      normalized.emailValue ? ` value="${escapeHtml(normalized.emailValue)}"` : ""
    } required></div>`,
    `<div class="ps-field"><label for="password">${escapeHtml(copy.password)}</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>`,
    normalized.activeOrganizationId
      ? `<input type="hidden" name="activeOrganizationId" value="${escapeHtml(normalized.activeOrganizationId)}">`
      : "",
    renderCommandButton({ label: copy.signIn, ariaLabel: `${copy.signIn} PureSOC`, tone: "primary", type: "submit" }),
    "</form>",
    normalized.microsoftEntraEnabled === false ? "" : renderMicrosoftEntraSignInForm("Sign in with Microsoft"),
    '<p class="ps-muted">Need a local account? <a class="ps-command" href="/register" data-ui-action="open-register">Register</a></p>',
    "</div>",
    "</section>",
    "</main>",
    "</body>",
    "</html>"
  ].join("");
};

export const renderRegisterScreen = (options: RenderRegisterScreenOptions = {}): string => {
  const productName = options.productName ?? "PureSOC";
  const copy = resolveOperationalConsoleCopy(options.locale);

  return [
    "<!doctype html>",
    `<html lang="${copy.locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>Register local account | ${escapeHtml(productName)}</title>`,
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    '<main class="ps-content ps-content--auth" id="content" tabindex="-1" data-ui-smoke="register-screen">',
    '<section class="ps-section" aria-labelledby="register-title">',
    '<div class="ps-section__header">',
    '<div><h1 class="ps-section__title" id="register-title">Register local account</h1><p class="ps-muted">Create a PureSOC account, then continue to workspace setup.</p></div>',
    renderStatusPill({ label: "local auth", tone: "info" }),
    "</div>",
    '<div class="ps-section__body">',
    options.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(options.errorMessage)}</p>` : "",
    '<form class="ps-form" action="/auth/register" method="post">',
    `<div class="ps-field"><label for="displayName">Display name</label><input id="displayName" name="displayName" type="text" autocomplete="name"${
      options.displayNameValue ? ` value="${escapeHtml(options.displayNameValue)}"` : ""
    } required><span class="ps-help">Use the name your teammates will recognize in audit history.</span></div>`,
    `<div class="ps-field"><label for="email">${escapeHtml(copy.email)}</label><input id="email" name="email" type="email" autocomplete="email"${
      options.emailValue ? ` value="${escapeHtml(options.emailValue)}"` : ""
    } required></div>`,
    `<div class="ps-field"><label for="password">${escapeHtml(
      copy.password
    )}</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="12" required><span class="ps-help">Minimum 12 characters for local development accounts.</span></div>`,
    renderCommandButton({ label: "Register", ariaLabel: "Register local PureSOC account", tone: "primary", type: "submit" }),
    "</form>",
    options.microsoftEntraEnabled === false ? "" : renderMicrosoftEntraSignInForm("Continue with Microsoft"),
    '<p class="ps-muted"><a class="ps-command" href="/login" data-ui-action="back-to-login">Back to sign in</a></p>',
    "</div>",
    "</section>",
    "</main>",
    "</body>",
    "</html>"
  ].join("");
};

const renderMicrosoftEntraSignInForm = (label: string): string =>
  [
    '<form class="ps-form" action="/auth/oidc/microsoft_entra/begin" method="post" data-ui-action="microsoft-entra-signin">',
    renderCommandButton({
      label,
      ariaLabel: `${label} Entra ID`,
      tone: "secondary",
      type: "submit"
    }),
    "</form>"
  ].join("");

export const renderEmailVerificationScreen = (options: RenderEmailVerificationScreenOptions = {}): string => {
  const productName = options.productName ?? "PureSOC";
  const locale = resolvePureSocLocale(options.locale).locale;

  return [
    "<!doctype html>",
    `<html lang="${locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>Verify email | ${escapeHtml(productName)}</title>`,
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    '<main class="ps-content ps-content--auth" id="content" tabindex="-1" data-ui-smoke="email-verification-screen">',
    '<section class="ps-section" aria-labelledby="email-verification-title">',
    '<div class="ps-section__header">',
    '<div><h1 class="ps-section__title" id="email-verification-title">Verify email</h1><p class="ps-muted">Enter the verification token from the configured local auth email delivery path before relying on this account for launch testing.</p></div>',
    renderStatusPill({ label: "verification required", tone: "warning" }),
    "</div>",
    '<div class="ps-section__body">',
    options.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(options.errorMessage)}</p>` : "",
    options.successMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(options.successMessage)}</p>` : "",
    '<form class="ps-form" action="/auth/email/verify" method="post">',
    '<div class="ps-field"><label for="token">Verification token</label><input id="token" name="token" type="text" autocomplete="one-time-code" required><span class="ps-help">The token is submitted to the API and is not echoed back into this page.</span></div>',
    renderCommandButton({ label: "Verify email", ariaLabel: "Verify local account email", tone: "primary", type: "submit" }),
    "</form>",
    '<p class="ps-muted"><a class="ps-command" href="/workspaces" data-ui-action="continue-to-workspaces">Continue to workspace setup</a></p>',
    "</div>",
    "</section>",
    "</main>",
    "</body>",
    "</html>"
  ].join("");
};

export const renderRuntimeMessageScreen = (input: RuntimeMessageScreenInput): string =>
  {
    const locale = resolvePureSocLocale(input.locale).locale;

    return [
    "<!doctype html>",
    `<html lang="${locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(input.title)} | PureSOC</title>`,
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    '<main class="ps-content" id="content" tabindex="-1">',
    '<section class="ps-section" aria-labelledby="runtime-message-title">',
    '<div class="ps-section__header">',
    `<div><h1 class="ps-section__title" id="runtime-message-title">${escapeHtml(input.title)}</h1><p class="ps-muted">${escapeHtml(input.summary)}</p></div>`,
    renderStatusPill({ label: input.statusLabel, tone: input.statusTone ?? "info" }),
    "</div>",
    '<div class="ps-section__body">',
    input.actionHref && input.actionLabel
      ? `<p><a class="ps-command ps-command--primary" href="${escapeHtml(input.actionHref)}">${escapeHtml(input.actionLabel)}</a></p>`
      : "",
    "</div>",
    "</section>",
    "</main>",
    "</body>",
    "</html>"
    ].join("");
  };

export const renderProductMvpShell = (
  model: ProductMvpShellModel,
  options: RenderProductMvpShellOptions = {}
): string => {
  const locale = resolvePureSocLocale(options.locale).locale;
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<div class="ps-shell ps-shell--product" data-ui-smoke="product-mvp-shell">',
    renderProductSidebar(model),
    '<main class="ps-main" id="content" tabindex="-1">',
    renderProductTopbar(model),
    '<div class="ps-content ps-content--product">',
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    renderProductActivePage(model),
    "</div>",
    "</main>",
    "</div>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(productRouteTitle(model.activeRoute))} | PureSOC</title>`,
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    "</body>",
    "</html>"
  ].join("");
};

const productNavItems: Array<{
  href: string;
  icon: string;
  label: string;
  route: ProductMvpRoute;
  partnerOnly?: boolean;
}> = [
  { href: "/dashboard", icon: "DB", label: "Dashboard", route: "dashboard" },
  { href: "/customers", icon: "CU", label: "Customers", route: "customers", partnerOnly: true },
  { href: "/onboarding", icon: "ON", label: "Readiness", route: "onboarding" },
  { href: "/gap-analyzer", icon: "GA", label: "Gap Analyzer", route: "gap_analyzer" },
  { href: "/microsoft365", icon: "M3", label: "Microsoft 365", route: "microsoft365" },
  { href: "/remediation", icon: "RM", label: "Remediation", route: "remediation" },
  { href: "/evidence", icon: "EV", label: "Evidence", route: "evidence" },
  { href: "/reports", icon: "RP", label: "Reports", route: "reports" },
  { href: "/settings", icon: "ST", label: "Settings", route: "settings" }
];

const productRouteTitle = (route: ProductMvpRoute): string =>
  productNavItems.find((item) => item.route === route)?.label ?? "Dashboard";

const renderProductSidebar = (model: ProductMvpShellModel): string => {
  const showCustomers = model.customers.length > 0 || ["customers"].includes(model.activeRoute);
  return [
    '<aside class="ps-sidebar" aria-label="Primary navigation">',
    '<div class="ps-brand">',
    '<span class="ps-brand__mark" aria-hidden="true">PS</span>',
    `<div class="ps-brand__identity"><p class="ps-brand__name">PureSOC</p><span class="ps-brand__meta">SMB security readiness</span><br><span class="ps-brand__meta">${escapeHtml(
      model.dashboard.workspace.countryCode
    )} workspace</span></div>`,
    "</div>",
    '<nav class="ps-nav">',
    ...productNavItems
      .filter((item) => !item.partnerOnly || showCustomers)
      .map(
        (item) =>
          `<a class="ps-nav__link" href="${escapeHtml(item.href)}"${
            item.route === model.activeRoute ? ' aria-current="page"' : ""
          } data-ui-action="open-${escapeHtml(item.route)}"><span class="ps-nav__icon" aria-hidden="true">${escapeHtml(
            item.icon
          )}</span><span>${escapeHtml(item.label)}</span><span class="ps-nav__chevron" aria-hidden="true">&rsaquo;</span></a>`
      ),
    "</nav>",
    '<div class="ps-sidebar__footer">',
    `<a class="ps-command ps-command--primary" href="${escapeHtml(model.dashboard.nextAction.href)}" data-ui-action="primary-next-action">${escapeHtml(
      model.dashboard.nextAction.label
    )}</a>`,
    renderStatusPill({ label: model.dashboard.readiness.label, tone: "accent" }),
    '<form class="ps-inline-form" action="/auth/logout" method="post" data-ui-action="sign-out">',
    renderCommandButton({ label: "Sign out", ariaLabel: "Sign out of PureSOC", tone: "secondary", type: "submit" }),
    "</form>",
    "</div>",
    "</aside>"
  ].join("");
};

const renderProductTopbar = (model: ProductMvpShellModel): string => [
  '<header class="ps-topbar">',
  '<div class="ps-topbar__actions ps-topbar__actions--left">',
  `<a class="ps-command" href="/workspaces" data-ui-action="switch-workspace">${escapeHtml(model.dashboard.workspace.name)}</a>`,
  '<div class="ps-chip-row ps-chip-row--compact" aria-label="Country packs">',
  ...model.dashboard.countryPack.available.map((country) => {
    const selected = country === model.dashboard.countryPack.selected;
    return `<a class="ps-command${selected ? " ps-command--primary" : ""}" href="/onboarding?country=${escapeHtml(
      country
    )}" aria-current="${selected ? "page" : "false"}">${escapeHtml(country)}</a>`;
  }),
  "</div>",
  "</div>",
  '<div class="ps-topbar__actions">',
  renderStatusPill({
    label: model.dashboard.microsoft365.connectionId ? "Microsoft 365 connected" : "Microsoft 365 not connected",
    tone: model.dashboard.microsoft365.connectionId ? "success" : "warning"
  }),
  renderStatusPill({ label: `${clampPercent(model.dashboard.readiness.score)}% readiness`, tone: "info" }),
  `<span class="ps-muted">${escapeHtml(model.session.user.displayName ?? model.session.user.email)}</span>`,
  "</div>",
  "</header>"
].join("");

const renderProductActivePage = (model: ProductMvpShellModel): string => {
  if (model.activeRoute === "onboarding") {
    return renderProductOnboardingPage(model);
  }
  if (model.activeRoute === "gap_analyzer") {
    return renderProductGapAnalyzerPage(model);
  }
  if (model.activeRoute === "microsoft365") {
    return renderProductMicrosoft365Page(model);
  }
  if (model.activeRoute === "connectors" || model.activeRoute === "connectors_microsoft365") {
    return renderProductConnectorsPage(model);
  }
  if (model.activeRoute === "remediation") {
    return renderProductRemediationPage(model);
  }
  if (model.activeRoute === "evidence") {
    return renderProductEvidencePage(model);
  }
  if (model.activeRoute === "reports") {
    return renderProductReportsPage(model);
  }
  if (model.activeRoute === "settings") {
    return renderProductSettingsPage(model);
  }
  if (model.activeRoute === "customers") {
    return renderProductCustomersPage(model);
  }
  return renderProductDashboardPage(model);
};

const renderProductPageHeader = (input: {
  eyebrow: string;
  primaryAction?: { href: string; label: string };
  status?: string;
  title: string;
}): string => [
  '<section class="ps-section ps-section--product-hero" aria-labelledby="product-page-title">',
  '<div class="ps-section__header">',
  `<div><p class="ps-route-hero__eyebrow">${escapeHtml(input.eyebrow)}</p><h1 class="ps-section__title" id="product-page-title">${escapeHtml(
    input.title
  )}</h1></div>`,
  input.status ? renderStatusPill({ label: input.status, tone: "info" }) : "",
  input.primaryAction
    ? `<a class="ps-command ps-command--primary" href="${escapeHtml(input.primaryAction.href)}">${escapeHtml(
        input.primaryAction.label
      )}</a>`
    : "",
  "</div>",
  "</section>"
].join("");

const renderProductDashboardPage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({
    eyebrow: "Workspace overview",
    title: "Dashboard",
    status: model.dashboard.countryPack.status.replaceAll("_", " "),
    primaryAction: model.dashboard.nextAction
  }),
  '<section class="ps-grid ps-grid--dense" aria-label="Dashboard summary">',
  renderProductScoreCard("Readiness score", `${clampPercent(model.dashboard.readiness.score)}%`, model.dashboard.readiness.baselineState),
  renderProductScoreCard("Critical gaps", String(model.dashboard.gaps.critical), `${model.dashboard.gaps.open} open gaps`),
  renderProductScoreCard("Microsoft 365", model.dashboard.microsoft365.connectionId ? "Connected" : "Not connected", model.dashboard.microsoft365.tenantName),
  renderProductScoreCard("Remediation", `${model.dashboard.remediation.approvalRequested} waiting`, "Remediation actions require approval"),
  "</section>",
  '<section class="ps-grid ps-stack-top">',
  renderProductNextActionCard(model),
  renderProductReadinessAreas(model),
  "</section>",
  '<section class="ps-grid ps-stack-top">',
  renderProductGapList(model.dashboard.gaps.recent),
  renderProductEvidenceList(model.dashboard.evidence),
  renderProductReportCards(model.dashboard.reports),
  "</section>",
  renderLegalCaveat(model.dashboard.legalCaveat)
].join("");

const renderProductScoreCard = (label: string, value: string, detail: string): string =>
  `<article class="ps-panel"><h2 class="ps-panel__title">${escapeHtml(label)}</h2><p class="ps-metric">${escapeHtml(
    value
  )}</p><p class="ps-muted">${escapeHtml(detail)}</p></article>`;

const renderProductNextActionCard = (model: ProductMvpShellModel): string => [
  '<article class="ps-panel" aria-labelledby="next-action-title">',
  '<div class="ps-section__header ps-section__header--flat">',
  `<div><h2 class="ps-panel__title" id="next-action-title">Recommended next action</h2><p class="ps-muted">One step moves this workspace forward.</p></div>`,
  renderStatusPill({ label: "guided", tone: "accent" }),
  "</div>",
  `<p>${escapeHtml(nextActionCopy(model.dashboard.nextAction.label))}</p>`,
  `<p><a class="ps-command ps-command--primary" href="${escapeHtml(model.dashboard.nextAction.href)}">${escapeHtml(
    model.dashboard.nextAction.label
  )}</a></p>`,
  "</article>"
].join("");

const nextActionCopy = (label: string): string => {
  if (label.includes("onboarding")) {
    return "Capture company context first. This creates the business baseline for readiness and reports.";
  }
  if (label.includes("gap")) {
    return "Run the analyzer from saved answers. Microsoft 365 can improve confidence later, but it is not required.";
  }
  if (label.includes("Microsoft")) {
    return "Add read-only Microsoft 365 posture so identity, device, and email gaps can be verified.";
  }
  return "Review the remediation plan and assign the highest-risk actions.";
};

const renderProductReadinessAreas = (model: ProductMvpShellModel): string => {
  const areas = [
    ["Business profile", model.dashboard.readiness.baselineState === "ready" ? "Ready" : "Draft"],
    ["Country pack", `${model.dashboard.countryPack.selected} ${model.dashboard.countryPack.status.replaceAll("_", " ")}`],
    ["Microsoft 365", model.dashboard.microsoft365.connectionId ? "Verified signals available" : "Manual baseline only"],
    ["Evidence", `${model.dashboard.evidence.length} recent items`]
  ];
  return [
    '<article class="ps-panel" aria-labelledby="readiness-areas-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="readiness-areas-title">Readiness areas</h2><p class="ps-muted">Draft reports are allowed before every signal is connected.</p></div>',
    renderStatusPill({ label: "business baseline", tone: "info" }),
    "</div>",
    '<div class="ps-grid ps-grid--dense">',
    ...areas.map(([label, status]) => renderProductScoreCard(label, status, "")),
    "</div>",
    "</article>"
  ].join("");
};

const renderProductOnboardingPage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({
    eyebrow: "Business onboarding",
    title: "Readiness",
    status: "autosave"
  }),
  '<section class="ps-layout-with-aside">',
  '<form class="ps-panel ps-form ps-form--wide" action="/onboarding" method="post" data-ui-action="save-business-onboarding">',
  '<div class="ps-section__header ps-section__header--flat"><div><h2 class="ps-panel__title">Company profile</h2><p class="ps-muted">Start with the business facts needed for a draft baseline.</p></div></div>',
  '<div class="ps-form-grid">',
  renderTextInput("legalName", "Legal name", model.dashboard.workspace.legalName ?? model.dashboard.workspace.name, true),
  renderTextInput("primaryContactEmail", "Primary contact email", "", true, "email"),
  renderSelect("countryCode", "Country pack", model.dashboard.countryPack.selected, [["RO", "Romania"], ["PL", "Poland"], ["DE", "Germany"]], "", true),
  renderTextInput("sector", "Main sector", "", true),
  renderTextInput("employeeCount", "Employee count", "", false, "number", "", ['min="0"', 'inputmode="numeric"']),
  renderSelect(
    "microsoft365Usage",
    "Microsoft 365 usage",
    "",
    [["", "Choose usage"], ["not_connected", "Not connected yet"], ["email_collaboration", "Email and collaboration"], ["identity_devices_security", "Identity, devices, and security"]],
    "",
    true
  ),
  renderTextarea("securityPractices", "Existing security practices", "", "Mention MFA, backups, incident response, supplier reviews, or known gaps.", "ps-field--full"),
  "</div>",
  '<div class="ps-command-row">',
  renderCommandButton({ label: "Save onboarding", ariaLabel: "Save readiness onboarding", tone: "primary", type: "submit" }),
  "</div>",
  "</form>",
  '<aside class="ps-panel ps-panel--quiet"><h2 class="ps-panel__title">Progress</h2><ol class="ps-step-list"><li><span class="ps-step-list__number">1</span><div><strong>Company profile</strong><span>Current step</span></div></li><li><span class="ps-step-list__number">2</span><div><strong>Gap analyzer</strong><span>Runs after save</span></div></li><li><span class="ps-step-list__number">3</span><div><strong>Microsoft 365</strong><span>Optional confidence boost</span></div></li></ol></aside>',
  "</section>"
].join("");

const renderProductGapAnalyzerPage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({
    eyebrow: "Manual and connector baseline",
    title: "Gap Analyzer",
    status: model.dashboard.readiness.baselineState,
    primaryAction: { href: "/gap-analyzer/run", label: "Run analyzer" }
  }),
  '<form class="ps-panel ps-form" action="/gap-analyzer/run" method="post" data-ui-action="run-gap-analyzer">',
  '<p class="ps-muted">The analyzer works from onboarding answers and manual security input. Microsoft 365 findings increase confidence when connected.</p>',
  renderCommandButton({ label: "Run analyzer", ariaLabel: "Run gap analyzer", tone: "primary", type: "submit" }),
  "</form>",
  renderProductGapList(model.details?.gaps ?? model.dashboard.gaps.recent),
  renderProductRecommendations(model.details?.recommendations ?? model.dashboard.recommendations)
].join("");

const renderProductMicrosoft365Page = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({
    eyebrow: "Security posture",
    title: "Microsoft 365",
    status: model.dashboard.microsoft365.connectionId ? "connected" : "not connected",
    primaryAction: { href: model.dashboard.microsoft365.connectionId ? "/connectors/microsoft365" : "/connectors/microsoft365", label: model.dashboard.microsoft365.connectionId ? "Manage connection" : "Connect Microsoft 365" }
  }),
  '<section class="ps-grid">',
  renderProductScoreCard("Connection", model.dashboard.microsoft365.connectionId ? "Connected" : "Not connected", model.dashboard.microsoft365.tenantName),
  renderProductScoreCard("Last sync", model.dashboard.lastSync ? formatTimestamp(model.dashboard.lastSync) : "No sync yet", "Read-only modules"),
  renderProductScoreCard("Remediation", "Approval required", "No dashboard execution"),
  "</section>",
  renderProductFindingTable(model.details?.findings ?? []),
  '<p class="ps-stack-top"><a class="ps-command" href="/connectors/microsoft365">Open connector settings</a></p>'
].join("");

const renderProductConnectorsPage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({
    eyebrow: "Data sources",
    title: model.activeRoute === "connectors_microsoft365" ? "Microsoft 365 connector" : "Connectors",
    status: "read-only first"
  }),
  '<section class="ps-grid">',
  ...(model.details?.connectors ?? []).map((connector) => {
    const providerKey = String(connector.providerKey ?? "");
    const isMicrosoft = providerKey === "microsoft365";
    return [
      '<article class="ps-panel">',
      `<h2 class="ps-panel__title">${escapeHtml(String(connector.name ?? providerKey))}</h2>`,
      renderStatusPill({ label: String(connector.status ?? "not connected").replaceAll("_", " "), tone: connectorStatusTone(String(connector.status ?? "")) }),
      `<p class="ps-muted">${escapeHtml(isMicrosoft ? "Read-only Microsoft Graph modules for identity, devices, email, and Secure Score." : "Planned data source.")}</p>`,
      isMicrosoft
        ? `<form class="ps-form" action="/connectors/microsoft365/connect" method="post" data-ui-action="connect-microsoft365"><input type="hidden" name="providerConnectionId" value="${escapeHtml(String(connector.connectionId ?? ""))}">${renderCommandButton({
            label: connector.connectionId ? "Reconnect" : "Connect",
            ariaLabel: "Connect Microsoft 365",
            tone: "primary",
            type: "submit"
          })}</form>`
        : renderStatusPill({ label: "coming later", tone: "neutral" }),
      "</article>"
    ].join("");
  }),
  "</section>",
  model.activeRoute === "connectors_microsoft365"
    ? '<article class="ps-panel ps-stack-top"><h2 class="ps-panel__title">Permissions</h2><p class="ps-muted">The MVP requests read permissions only. Remediation actions require preview, approval, audit, and rollback guidance before any execution path.</p><div class="ps-chip-row">' +
      renderStatusPill({ label: "Baseline read", tone: "info" }) +
      renderStatusPill({ label: "Security read", tone: "info" }) +
      renderStatusPill({ label: "Intune read", tone: "info" }) +
      renderStatusPill({ label: "Write actions require approval", tone: "warning" }) +
      "</div></article>"
    : ""
].join("");

const renderProductRemediationPage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({ eyebrow: "Action center", title: "Remediation", status: "approval gated" }),
  renderDataTable<Record<string, unknown>>(
    "Remediation actions",
    [
      { header: "Action", render: (row) => `<strong>${escapeHtml(String(row.title ?? "Action"))}</strong><br><span class="ps-muted">${escapeHtml(String(row.expectedChange ?? ""))}</span>` },
      { header: "Risk", render: (row) => renderStatusPill({ label: String(row.risk ?? "medium"), tone: toneForSeverity(String(row.risk ?? "medium") as ActionableSeverity) }) },
      { header: "Approval", render: (row) => renderStatusPill({ label: String(row.approvalState ?? "not requested").replaceAll("_", " "), tone: "info" }) },
      { header: "Execution", render: (row) => escapeHtml(String(row.executionState ?? "draft").replaceAll("_", " ")) }
    ],
    model.details?.remediationActions ?? []
  )
].join("");

const renderProductEvidencePage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({ eyebrow: "Evidence library", title: "Evidence", status: `${(model.details?.evidence ?? model.dashboard.evidence).length} items` }),
  '<form class="ps-panel ps-form" action="/evidence" method="post" data-ui-action="attach-evidence">',
  '<div class="ps-form-grid">',
  renderTextInput("title", "Evidence title", "", true),
  renderTextInput("controlId", "Control ID", "", false),
  renderTextarea("content", "Evidence note", "", "Do not paste secrets, passwords, tokens, or private keys.", "ps-field--full"),
  "</div>",
  renderCommandButton({ label: "Attach evidence", ariaLabel: "Attach evidence", tone: "primary", type: "submit" }),
  "</form>",
  renderProductEvidenceList(model.details?.evidence ?? model.dashboard.evidence)
].join("");

const renderProductReportsPage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({ eyebrow: "Reports and exports", title: "Reports", status: "draft reports allowed" }),
  '<section class="ps-grid">',
  renderReportActionCard("NIS2 readiness summary", "/reports/nis2-summary", "PDF-ready internal readiness summary."),
  renderReportActionCard("Gap list", "/reports/gap-list", "CSV export for gap review."),
  renderReportActionCard("Microsoft 365 posture", "/reports/m365-posture", "Security posture summary after connector sync."),
  "</section>",
  renderProductReportCards(model.details?.reports ?? model.dashboard.reports)
].join("");

const renderReportActionCard = (title: string, action: string, summary: string): string => [
  '<article class="ps-panel">',
  `<h2 class="ps-panel__title">${escapeHtml(title)}</h2>`,
  `<p class="ps-muted">${escapeHtml(summary)}</p>`,
  `<form class="ps-form" action="${escapeHtml(action)}" method="post">`,
  renderCommandButton({ label: "Generate", ariaLabel: `Generate ${title}`, tone: "primary", type: "submit" }),
  "</form>",
  "</article>"
].join("");

const renderProductSettingsPage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({ eyebrow: "Workspace settings", title: "Settings", status: model.dashboard.workspace.billingStatus }),
  '<section class="ps-grid">',
  renderProductScoreCard("Workspace", model.dashboard.workspace.name, model.dashboard.workspace.countryCode),
  renderProductScoreCard("Country pack", model.dashboard.countryPack.selected, model.dashboard.countryPack.status.replaceAll("_", " ")),
  renderProductScoreCard("Users and roles", "Invite teammates", "Owner and admin managed"),
  renderProductScoreCard("Notifications", "Channels", "Critical gaps and deadlines"),
  "</section>",
  '<p class="ps-stack-top"><a class="ps-command" href="/workspaces">Switch workspace</a> <a class="ps-command" href="/invitations">Invite users</a> <a class="ps-command" href="/settings/notifications">Notification channels</a></p>'
].join("");

const renderProductCustomersPage = (model: ProductMvpShellModel): string => [
  renderProductPageHeader({ eyebrow: "Partner portfolio", title: "Customers", status: `${model.customers.length} customers` }),
  '<form class="ps-panel ps-form" action="/customers" method="post" data-ui-action="create-customer">',
  '<div class="ps-form-grid">',
  renderTextInput("name", "Customer name", "", true),
  renderTextInput("legalName", "Legal name", "", false),
  renderSelect("countryCode", "Country", "RO", [["RO", "Romania"], ["PL", "Poland"], ["DE", "Germany"]], "", true),
  "</div>",
  renderCommandButton({ label: "Add customer", ariaLabel: "Add customer workspace", tone: "primary", type: "submit" }),
  "</form>",
  renderDataTable<Record<string, unknown>>(
    "Customers",
    [
      { header: "Company", render: (row) => escapeHtml(String(row.name ?? "Customer")) },
      { header: "Country", render: (row) => escapeHtml(String(row.countryCode ?? "EU")) },
      { header: "Microsoft", render: (row) => renderStatusPill({ label: String((row.snapshot as Record<string, unknown> | undefined)?.microsoftConnectionState ?? "not connected").replaceAll("_", " "), tone: "info" }) },
      { header: "Open", render: (row) => `<form class="ps-form ps-form--compact" action="/customers/${escapeHtml(String(row.id ?? ""))}/impersonate" method="post"><input name="reason" placeholder="Reason for review" minlength="8" required>${renderCommandButton({ label: "Open", ariaLabel: "Open customer workspace", tone: "primary", type: "submit" })}</form>` }
    ],
    model.customers
  )
].join("");

const renderProductGapList = (gaps: Array<Record<string, unknown>>): string =>
  renderDataTable<Record<string, unknown>>(
    "Gap list",
    [
      { header: "Gap", render: (row) => `<strong>${escapeHtml(String(row.title ?? "Gap"))}</strong><br><span class="ps-muted">${escapeHtml(String(row.businessImpact ?? ""))}</span>` },
      { header: "Area", render: (row) => escapeHtml(String(row.controlArea ?? "Readiness")) },
      { header: "Severity", render: (row) => renderStatusPill({ label: String(row.severity ?? "medium"), tone: toneForSeverity(String(row.severity ?? "medium") as ActionableSeverity) }) },
      { header: "Source", render: (row) => escapeHtml(String(row.source ?? "manual input")) },
      { header: "Status", render: (row) => escapeHtml(String(row.status ?? "open")) }
    ],
    gaps
  );

const renderProductRecommendations = (recommendations: Array<Record<string, unknown>>): string =>
  renderDataTable<Record<string, unknown>>(
    "Recommendations",
    [
      { header: "Recommendation", render: (row) => `<strong>${escapeHtml(String(row.title ?? "Recommendation"))}</strong><br><span class="ps-muted">${escapeHtml(String(row.summary ?? ""))}</span>` },
      { header: "Priority", render: (row) => renderStatusPill({ label: String(row.priority ?? "medium"), tone: toneForSeverity(String(row.priority ?? "medium") as ActionableSeverity) }) },
      { header: "Effort", render: (row) => escapeHtml(String(row.effort ?? "review")) }
    ],
    recommendations
  );

const renderProductEvidenceList = (items: Array<Record<string, unknown>>): string =>
  renderDataTable<Record<string, unknown>>(
    "Evidence",
    [
      { header: "Evidence", render: (row) => `<strong>${escapeHtml(String(row.title ?? "Evidence"))}</strong><br><span class="ps-muted">${escapeHtml(String(row.sourceType ?? "manual"))}</span>` },
      { header: "Control", render: (row) => escapeHtml(String(row.controlId ?? "Not mapped")) },
      { header: "Scan", render: (row) => renderStatusPill({ label: String(row.scanStatus ?? "stored").replaceAll("_", " "), tone: "info" }) },
      { header: "Created", render: (row) => escapeHtml(row.createdAt ? formatTimestamp(String(row.createdAt)) : "") }
    ],
    items
  );

const renderProductReportCards = (reports: Array<Record<string, unknown>>): string => [
  '<section class="ps-grid ps-stack-top" aria-label="Generated reports">',
  reports.length === 0 ? '<article class="ps-panel"><h2 class="ps-panel__title">No reports yet</h2><p class="ps-muted">Generate a draft report after running the gap analyzer.</p></article>' : "",
  ...reports.map((report) => [
    '<article class="ps-panel">',
    `<h2 class="ps-panel__title">${escapeHtml(String(report.title ?? "Report"))}</h2>`,
    renderStatusPill({ label: String(report.status ?? "ready"), tone: "success" }),
    `<p class="ps-muted">${escapeHtml(String(report.format ?? "export"))}</p>`,
    report.downloadHref ? `<p><a class="ps-command" href="${escapeHtml(String(report.downloadHref))}">Download</a></p>` : "",
    "</article>"
  ].join("")),
  "</section>"
].join("");

const renderProductFindingTable = (findings: Array<Record<string, unknown>>): string =>
  renderDataTable<Record<string, unknown>>(
    "Microsoft 365 findings",
    [
      { header: "Finding", render: (row) => `<strong>${escapeHtml(String(row.title ?? "Finding"))}</strong><br><span class="ps-muted">${escapeHtml(String(row.resourceDisplayName ?? ""))}</span>` },
      { header: "Severity", render: (row) => renderStatusPill({ label: String(row.severity ?? "medium"), tone: toneForSeverity(String(row.severity ?? "medium") as ActionableSeverity) }) },
      { header: "Status", render: (row) => escapeHtml(String(row.status ?? "open")) }
    ],
    findings
  );

const connectorStatusTone = (status: string): PureSocUiTone => {
  if (status === "connected") {
    return "success";
  }
  if (status === "coming_later") {
    return "neutral";
  }
  return "warning";
};


export const renderMicrosoft365ConnectorPage = (
  model: Microsoft365ConnectorPageModel,
  options: RenderMicrosoft365ConnectorPageOptions = {}
): string => {
  const locale = resolvePureSocLocale(options.locale).locale;
  const connectionLabel = model.microsoft365.providerConnectionId
    ? "Refresh read-only Graph modules"
    : "Start global admin approval";
  const connectionSummary = model.microsoft365.providerConnectionId
    ? "Use the stored tenant grant to refresh read-only Microsoft 365 module status."
    : "A Microsoft global admin approves the PureSOC platform app for this tenant. No customer-created Azure app registration is required.";
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content ps-content--connector" id="content" tabindex="-1" data-ui-smoke="microsoft365-connector-page">',
    renderActiveTenantAccessBanner(model.activeTenantAccess),
    '<section class="ps-connector-shell" aria-labelledby="microsoft365-connector-title">',
    '<aside class="ps-connector-roadmap" aria-label="Roadmap to readiness">',
    '<div class="ps-connector-roadmap__brand"><span class="ps-brand__mark" aria-hidden="true">PS</span><div><p class="ps-brand__name">PureSOC</p><span class="ps-brand__meta">NIS2 Readiness Engine</span></div></div>',
    '<p class="ps-route-hero__eyebrow">The roadmap to readiness</p>',
    '<ol class="ps-connector-roadmap__list">',
    '<li class="ps-connector-step ps-connector-step--complete"><span class="ps-connector-step__dot">1</span><div><strong>Welcome</strong><span>Account created successfully.</span></div></li>',
    '<li class="ps-connector-step ps-connector-step--active"><span class="ps-connector-step__dot">2</span><div><strong>Connect Data</strong><span>Integrate your core systems.</span></div></li>',
    '<li class="ps-connector-step"><span class="ps-connector-step__dot">3</span><div><strong>Scope Business</strong><span>Define NIS2 boundaries.</span></div></li>',
    '<li class="ps-connector-step"><span class="ps-connector-step__dot">4</span><div><strong>Generate Baseline</strong><span>Initial readiness report.</span></div></li>',
    "</ol>",
    "</aside>",
    '<div class="ps-connector-main">',
    '<span class="ps-connector-icon" aria-hidden="true">M365</span>',
    `<h1 id="microsoft365-connector-title">Strengthen your NIS2 readiness posture with Microsoft 365.</h1>`,
    `<p>${escapeHtml(
      model.activeOrganizationName
        ? `${model.activeOrganizationName} can connect existing security data to identify gaps and collect evidence. PureSOC only reads the configurations required for NIS2.`
        : "Connect existing security data to identify gaps and collect evidence. PureSOC only reads the configurations required for NIS2."
    )}</p>`,
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<article class="ps-connector-card" aria-labelledby="connector-card-title">',
    '<span class="ps-connector-card__logo" aria-hidden="true">365</span>',
    '<div>',
    '<h2 class="ps-panel__title" id="connector-card-title">Microsoft 365 Security Center</h2>',
    `<p>${escapeHtml(connectionSummary)}</p>`,
    '<div class="ps-chip-row">',
    renderStatusPill({ label: "Read-only Access", tone: "info" }),
    renderStatusPill({ label: "Encrypted credentials", tone: "neutral" }),
    renderStatusPill({ label: model.microsoft365.status.replaceAll("_", " "), tone: toneForStatus(model.microsoft365.status) }),
    renderStatusPill({ label: model.microsoft365.writeEnabled ? "write enabled" : "write disabled", tone: model.microsoft365.writeEnabled ? "warning" : "neutral" }),
    "</div>",
    "</div>",
    renderMicrosoft365Actions(model.microsoft365),
    "</article>",
    '<div class="ps-grid">',
    '<article class="ps-panel">',
    `<h2 class="ps-panel__title">Microsoft 365 Tenant Connector</h2><p class="ps-muted">${escapeHtml(connectionLabel)}</p>`,
    `<p>${escapeHtml(model.microsoft365.tenantDisplayName)}</p>`,
    `<p class="ps-muted">${escapeHtml(model.microsoft365.tenantId)}</p>`,
    '<div class="ps-chip-row">',
    renderSourceChip({ label: "Connector", detail: model.microsoft365.connectorMode }),
    renderSourceChip({ label: "Last sync", detail: model.microsoft365.lastSyncAt }),
    "</div>",
    "</article>",
    '<article class="ps-panel">',
    '<h2 class="ps-panel__title">Consent scope</h2>',
    '<p class="ps-muted">The connect action requests the V1 read-only baseline, security, and Intune bundles. Write and remediation scopes remain disabled.</p>',
    '<div class="ps-chip-row">',
    renderStatusPill({ label: "m365_read_baseline", tone: "info" }),
    renderStatusPill({ label: "m365_security_read", tone: "info" }),
    renderStatusPill({ label: "m365_intune_read", tone: "info" }),
    renderStatusPill({ label: "no write scopes", tone: "success" }),
    "</div>",
    "</article>",
    "</div>",
    renderMicrosoft365ConnectorSetup(),
    renderDataTable<Microsoft365ModuleSurface>(
      "Read-only module status",
      [
        {
          header: "Module",
          render: (module) => escapeHtml(module.label)
        },
        {
          header: "Status",
          render: (module) => renderStatusPill({ label: module.status.replaceAll("_", " "), tone: toneForStatus(module.status) })
        },
        {
          header: "Coverage",
          render: (module) => escapeHtml(module.coverage)
        }
      ],
      model.microsoft365.modules
    ),
    '<div class="ps-connector-neutrality"><p><strong>Provider Neutrality:</strong> Future connectors can follow the same provider-neutral contract without changing the compliance engine.</p></div>',
    '<p class="ps-stack-top"><a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a> <a class="ps-command" href="/onboarding/romania/company?locale=ro-RO" data-ui-action="open-romania-onboarding">Open Romania wizard</a></p>',
    "</div>",
    "</section>",
    "</main>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Microsoft 365 connector | PureSOC</title>",
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    "</body>",
    "</html>"
  ].join("");
};

export const renderOrganizationInvitationsScreen = (
  model: OrganizationInvitationScreenModel,
  options: RenderOrganizationInvitationsOptions = {}
): string => {
  const copy = resolveOperationalConsoleCopy(options.locale);
  const activeOrganization = model.activeOrganization;
  const canCreate = model.canCreateInvitations && Boolean(activeOrganization);
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="organization-invitations">',
    renderActiveTenantAccessBanner(model.activeTenantAccess),
    '<section class="ps-section" aria-labelledby="organization-invitations-title">',
    '<div class="ps-section__header">',
    '<div><h1 class="ps-section__title" id="organization-invitations-title">Organization invitations</h1><p class="ps-muted">Invite verified teammates into the active workspace, or accept an invitation token from a configured delivery path.</p></div>',
    renderStatusPill({ label: "local invitation flow", tone: "info" }),
    "</div>",
    '<div class="ps-section__body">',
    model.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(model.errorMessage)}</p>` : "",
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<div class="ps-grid">',
    renderInvitationCreatePanel(model, canCreate),
    renderInvitationAcceptPanel(model),
    "</div>",
    renderInvitationWorkspacePanel(model),
    '<p class="ps-stack-top"><a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a></p>',
    "</div>",
    "</section>",
    "</main>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${copy.locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Organization invitations | PureSOC</title>",
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    "</body>",
    "</html>"
  ].join("");
};

export const renderNotificationSettingsScreen = (
  model: NotificationSettingsScreenModel,
  options: RenderNotificationSettingsOptions = {}
): string => {
  const copy = resolveOperationalConsoleCopy(options.locale);
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="notification-settings">',
    renderActiveTenantAccessBanner(model.activeTenantAccess),
    '<section class="ps-section" aria-labelledby="notification-settings-title">',
    '<div class="ps-section__header">',
    '<div><h1 class="ps-section__title" id="notification-settings-title">Notification settings</h1><p class="ps-muted">Organization-scoped channels for critical gaps, Microsoft 365 drift, deadline windows, evidence expiry, checklist overdue, and verified remediation events.</p></div>',
    renderStatusPill({
      label: model.canManageChannels ? "owner or admin" : "read only",
      tone: model.canManageChannels ? "success" : "warning"
    }),
    "</div>",
    '<div class="ps-section__body">',
    model.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(model.errorMessage)}</p>` : "",
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<div class="ps-grid">',
    renderNotificationChannelCreatePanel(model),
    renderNotificationChannelListPanel(model),
    "</div>",
    renderNotificationLogPanel(model),
    '<p class="ps-stack-top"><a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a></p>',
    "</div>",
    "</section>",
    "</main>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${copy.locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Notification settings | PureSOC</title>",
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    "</body>",
    "</html>"
  ].join("");
};

export const renderPartnerConsoleScreen = (
  model: PartnerConsoleModel,
  options: RenderPartnerConsoleOptions = {}
): string => {
  const copy = resolveOperationalConsoleCopy(options.locale);
  const activePartner = activePartnerForConsole(model);
  const role = activePartner?.membership.role ?? "no partner role";
  const canCreateCustomer = Boolean(activePartner && ["owner", "admin"].includes(activePartner.membership.role));
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    renderActiveTenantAccessBanner(model.activeTenantAccess),
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="partner-console">',
    '<section class="ps-section" aria-labelledby="partner-console-title">',
    '<div class="ps-section__header">',
    `<div><h1 class="ps-section__title" id="partner-console-title">Partner portfolio</h1><p class="ps-muted">${escapeHtml(
      model.session.user.displayName ?? "Signed-in partner user"
    )}</p></div>`,
    renderStatusPill({ label: role, tone: canCreateCustomer ? "success" : activePartner ? "info" : "warning" }),
    "</div>",
    '<div class="ps-section__body">',
    model.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(model.errorMessage)}</p>` : "",
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<div class="ps-command-row">',
    '<a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a>',
    '<a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">Switch workspace</a>',
    "</div>",
    model.partners.length === 0 ? renderPartnerCreateOnlyPanel() : renderPartnerPortfolioContent(model, canCreateCustomer),
    "</div>",
    "</section>",
    "</main>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${copy.locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Partner portfolio | PureSOC</title>",
    `<style>${renderPureSocDesignSystemCss()}${renderPartnerConsoleCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    "</body>",
    "</html>"
  ].join("");
};

export const renderNis2CountryAwareOnboardingScreen = (
  model: Nis2CountryAwareOnboardingModel,
  options: RenderNis2CountryAwareOnboardingOptions = {}
): string => {
  const copy = resolveOperationalConsoleCopy(options.locale);
  const pack = model.selectedCountryPack;
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="nis2-country-aware-onboarding">',
    renderActiveTenantAccessBanner(model.activeTenantAccess),
    '<section class="ps-section" aria-labelledby="nis2-country-onboarding-title">',
    '<div class="ps-section__header">',
    `<div><h1 class="ps-section__title" id="nis2-country-onboarding-title">NIS2 country onboarding</h1><p class="ps-muted">${escapeHtml(
      model.session.user.displayName ?? model.session.user.email
    )}</p></div>`,
    renderStatusPill({ label: `${pack.countryCode} ${pack.status}`, tone: toneForStatusText(pack.status) }),
    "</div>",
    '<div class="ps-section__body">',
    model.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(model.errorMessage)}</p>` : "",
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<div class="ps-command-row">',
    '<a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a>',
    '<a class="ps-command" href="/partners" data-ui-action="open-partner-console">Partner portfolio</a>',
    '<a class="ps-command" href="/onboarding/romania/company?locale=ro-RO" data-ui-action="continue-romania-saved-workflow">Romania saved workflow</a>',
    "</div>",
    renderCountryPackSelector(model),
    '<div class="ps-grid ps-stack-top">',
    renderSelectedCountryPackPanel(pack),
    renderNis2CountryOnboardingForm(model),
    "</div>",
    renderGeneratedReportDownloadsPanel(model),
    renderCountryAwareWorkflowStepper(model),
    renderCountryPackClassificationResult(model),
    renderCountryPackDynamicQuestions(pack),
    renderCountryPackSources(pack),
    "</div>",
    "</section>",
    "</main>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${copy.locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>NIS2 country onboarding | PureSOC</title>",
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    "</body>",
    "</html>"
  ].join("");
};

const renderCountryPackSelector = (model: Nis2CountryAwareOnboardingModel): string =>
  [
    '<nav class="ps-chip-row" aria-label="NIS2 country packs">',
    ...model.countryPacks.map((pack) => {
      const selected = pack.countryCode === model.selectedCountryCode;
      const label = `${pack.countryCode} ${pack.status}`;
      return `<a class="ps-command${selected ? " ps-command--primary" : ""}" href="/onboarding/nis2?country=${escapeHtml(
        pack.countryCode
      )}&screen=${escapeHtml(model.selectedScreen)}" data-ui-action="select-country-pack-${escapeHtml(pack.countryCode.toLowerCase())}" aria-current="${selected ? "page" : "false"}">${escapeHtml(
        label
      )}</a>`;
    }),
    "</nav>"
  ].join("");

const renderSelectedCountryPackPanel = (pack: Nis2CountryPackDefinitionSurface): string =>
  [
    '<article class="ps-panel" aria-labelledby="country-pack-summary-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="country-pack-summary-title">${escapeHtml(pack.displayName)}</h2><p class="ps-muted">${escapeHtml(
      pack.reportLanguage.classificationDisclaimer
    )}</p></div>`,
    renderStatusPill({ label: `v${pack.packVersion}`, tone: "info" }),
    "</div>",
    '<div class="ps-chip-row">',
    renderStatusPill({ label: pack.status, tone: toneForStatusText(pack.status) }),
    renderSourceChip({ label: "Effective", detail: pack.effectiveDate }),
    renderSourceChip({ label: "Sources", detail: String(pack.officialSources.length) }),
    renderSourceChip({ label: "Languages", detail: pack.supportedUiLanguages.join(", ") }),
    "</div>",
    '<ul class="ps-list">',
    ...pack.authorityGuidance.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`),
    ...pack.registrationGuidance.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`),
    "</ul>",
    pack.countryCode === "RO"
      ? '<p><a class="ps-command ps-command--primary" href="/onboarding/romania/company?locale=ro-RO" data-ui-action="continue-romania-saved-workflow">Open saved Romania workflow</a></p>'
      : '<p class="ps-muted">Saved country-aware onboarding and report v1 generation are available for this demo pack. Legal review remains required before external use.</p>',
    "</article>"
  ].join("");

const renderNis2CountryOnboardingForm = (model: Nis2CountryAwareOnboardingModel): string => {
  const screen = model.onboardingScreens.find((candidate) => candidate.key === model.selectedScreen) ?? model.onboardingScreens[0];
  const answers = model.progress?.answers ?? {};
  const completedCount = model.progress?.completedScreens.length ?? 0;

  return [
    '<article class="ps-panel" aria-labelledby="country-pack-classification-form-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="country-pack-classification-form-title">${escapeHtml(screen?.label ?? "NIS2 onboarding")}</h2><p class="ps-muted">${escapeHtml(
      screen?.summary ?? "Save onboarding answers before generating report v1."
    )}</p></div>`,
    renderStatusPill({ label: `${completedCount}/${model.onboardingScreens.length} screens saved`, tone: completedCount === model.onboardingScreens.length ? "success" : "info" }),
    "</div>",
    model.progress
      ? `<p class="ps-muted">Saved ${escapeHtml(model.progress.updatedAt)}. Missing required fields: ${escapeHtml(
          String(model.progress.missingRequiredFields.length)
        )}.</p>`
      : '<p class="ps-muted">No saved country-aware onboarding progress yet.</p>',
    '<form class="ps-form ps-form--wide" id="classification-form" action="/onboarding/nis2" method="post" data-ui-action="save-country-aware-onboarding">',
    `<input type="hidden" name="country" value="${escapeHtml(model.selectedCountryCode)}">`,
    `<input type="hidden" name="screen" value="${escapeHtml(screen?.key ?? model.selectedScreen)}">`,
    model.progress?.id ? `<input type="hidden" name="onboardingProgressId" value="${escapeHtml(model.progress.id)}">` : "",
    model.firstReportId ? `<input type="hidden" name="firstReportId" value="${escapeHtml(model.firstReportId)}">` : "",
    model.improvedReportId ? `<input type="hidden" name="improvedReportId" value="${escapeHtml(model.improvedReportId)}">` : "",
    renderNis2CountryScreenFields(model, answers, screen?.key ?? model.selectedScreen),
    '<div class="ps-command-row">',
    '<button type="submit" class="ps-command ps-command--primary" name="_action" value="save" aria-label="Save NIS2 country onboarding screen"><span>Save screen</span></button>',
    '<button type="submit" class="ps-command" name="_action" value="classify" aria-label="Run preliminary NIS2 scope check from saved onboarding"><span>Run scope check</span></button>',
    '<button type="submit" class="ps-command" name="_action" value="generate_report" aria-label="Generate declared internal readiness report v1"><span>Generate report v1</span></button>',
    "</div>",
    "</form>",
    "</article>"
  ].join("");
};

const renderGeneratedReportDownloadsPanel = (model: Nis2CountryAwareOnboardingModel): string => {
  if (!model.firstReportId && !model.improvedReportId) {
    return "";
  }

  return [
    '<article class="ps-panel ps-stack-top" aria-labelledby="nis2-report-downloads-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="nis2-report-downloads-title">Report downloads</h2><p class="ps-muted">PDF exports render the stored generated report ID.</p></div>',
    renderStatusPill({ label: "immutable snapshots", tone: "success" }),
    "</div>",
    '<div class="ps-command-row">',
    model.firstReportId
      ? `<a class="ps-command ps-command--primary" href="/reports/generated/${encodeURIComponent(
          model.firstReportId
        )}/pdf?format=pdf" data-ui-action="download-first-pdf">Download first PDF</a>`
      : "",
    model.improvedReportId
      ? `<a class="ps-command ps-command--primary" href="/reports/generated/${encodeURIComponent(
          model.improvedReportId
        )}/pdf?format=pdf" data-ui-action="download-improved-pdf">Download improved PDF</a>`
      : "",
    "</div>",
    "</article>"
  ].join("");
};

const renderNis2CountryScreenFields = (
  model: Nis2CountryAwareOnboardingModel,
  answers: Record<string, unknown>,
  screenKey: string
): string => {
  if (screenKey === "company_contacts") {
    return [
      '<div class="ps-form-grid">',
      renderTextInput("company.legalName", "Legal name", countryAnswerText(answers, "company.legalName"), true),
      renderTextInput("company.countryCode", "Country", model.selectedCountryCode, true),
      renderTextInput("contacts.primaryName", "Primary contact", countryAnswerText(answers, "contacts.primaryName"), true),
      renderTextInput("contacts.primaryEmail", "Primary email", countryAnswerText(answers, "contacts.primaryEmail"), true, "email"),
      renderTextInput("contacts.securityName", "Security owner", countryAnswerText(answers, "contacts.securityName"), true),
      renderTextInput("contacts.securityEmail", "Security email", countryAnswerText(answers, "contacts.securityEmail"), true, "email"),
      "</div>"
    ].join("");
  }

  if (screenKey === "business_profile") {
    return [
      '<div class="ps-form-grid">',
      renderSelect(
        "business.sector",
        "Sector",
        countryAnswerText(answers, "business.sector"),
        [
          ["", "Choose sector"],
          ...model.selectedCountryPack.sectorRules.map((sector) => [sector, formatKeyLabel(sector)] as const)
        ],
        "Use the closest actual business activity.",
        true
      ),
      renderTextInput(
        "business.employeeCount",
        "Employee count",
        countryAnswerText(answers, "business.employeeCount"),
        true,
        "number"
      ),
      renderTextarea(
        "business.mainProductsServices",
        "Main products and services",
        countryAnswerText(answers, "business.mainProductsServices"),
        "Describe the actual service delivered to customers."
      ),
      renderTextarea(
        "business.countriesServed",
        "Countries served",
        countryAnswerArrayText(answers, "business.countriesServed"),
        "Comma-separated country names or codes."
      ),
      "</div>"
    ].join("");
  }

  if (screenKey === "nis2_scope") {
    return [
      '<div class="ps-form-grid">',
      renderTextarea("scope.activities", "NIS2-relevant activities", countryAnswerArrayText(answers, "scope.activities"), "Comma-separated activities are accepted."),
      renderCheckbox("scope.publicAdministration", "Public administration", countryAnswerBoolean(answers, "scope.publicAdministration")),
      renderCheckbox("scope.telecomProvider", "Telecommunications provider", countryAnswerBoolean(answers, "scope.telecomProvider")),
      ...model.selectedCountryPack.dynamicQuestions.map((question) =>
        renderTextInput(
          `scope.dynamicAnswers.${question.key}`,
          question.label,
          countryAnswerText(answers, `scope.dynamicAnswers.${question.key}`),
          false,
          question.answerType === "number" ? "number" : "text",
          question.sourceIds.join(", ")
        )
      ),
      "</div>"
    ].join("");
  }

  if (screenKey === "operational_dependencies") {
    return [
      '<div class="ps-form-grid">',
      renderSelect(
        "dependencies.microsoft365Usage",
        "Microsoft 365 usage",
        countryAnswerText(answers, "dependencies.microsoft365Usage"),
        [
          ["", "Choose usage"],
          ["not_used", "Not used"],
          ["used_for_email_collaboration", "Email and collaboration"],
          ["used_for_identity_devices_security", "Identity, devices, and security"]
        ],
        "",
        true
      ),
      renderTextarea("dependencies.criticalSuppliers", "Critical suppliers", countryAnswerArrayText(answers, "dependencies.criticalSuppliers"), "Comma-separated supplier categories or vendors."),
      renderTextarea("dependencies.backupArrangements", "Backup arrangements", countryAnswerText(answers, "dependencies.backupArrangements")),
      renderTextarea("dependencies.businessContinuity", "Business continuity", countryAnswerText(answers, "dependencies.businessContinuity")),
      renderTextarea("dependencies.incidentResponse", "Incident response", countryAnswerText(answers, "dependencies.incidentResponse")),
      "</div>"
    ].join("");
  }

  if (screenKey === "governance_controls") {
    return [
      '<div class="ps-form-grid">',
      renderTextarea("governance.riskManagement", "Risk management", countryAnswerText(answers, "governance.riskManagement")),
      renderTextarea("governance.identityControls", "Access control", countryAnswerText(answers, "governance.identityControls")),
      renderTextarea("governance.mfa", "MFA status", countryAnswerText(answers, "governance.mfa")),
      renderTextarea("governance.supplyChainSecurity", "Supply-chain security", countryAnswerText(answers, "governance.supplyChainSecurity")),
      "</div>"
    ].join("");
  }

  return [
    '<div class="ps-form-grid">',
    renderTextarea("review.assumptions", "Assumptions", countryAnswerText(answers, "review.assumptions")),
    renderCheckbox("review.legalCaveatAcknowledged", "Internal readiness caveat reviewed", countryAnswerBoolean(answers, "review.legalCaveatAcknowledged")),
    "</div>",
    model.progress?.missingRequiredFields.length
      ? `<p class="ps-legal-caveat">Complete required fields before report generation: ${escapeHtml(
          model.progress.missingRequiredFields.join(", ")
        )}</p>`
      : '<p class="ps-muted">Ready to generate declared report v1 from saved onboarding answers.</p>'
  ].join("");
};

const renderCountryAwareWorkflowStepper = (model: Nis2CountryAwareOnboardingModel): string => {
  const completedScreens = new Set(model.progress?.completedScreens ?? []);
  return [
    '<article class="ps-panel ps-stack-top" aria-labelledby="country-aware-stepper-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="country-aware-stepper-title">Country-aware workflow</h2><p class="ps-muted">${escapeHtml(
      model.selectedCountryPack.displayName
    )} supplies the dynamic scope questions and source caveats.</p></div>`,
    renderStatusPill({ label: "six screens", tone: "accent" }),
    "</div>",
    '<ol class="ps-step-list">',
    ...model.onboardingScreens.map(
      (screen, index) =>
        `<li><span class="ps-step-list__number">${index + 1}</span><div><strong><a href="/onboarding/nis2?country=${escapeHtml(
          model.selectedCountryCode
        )}&screen=${escapeHtml(screen.key)}">${escapeHtml(screen.label)}</a></strong><span>${escapeHtml(screen.summary)}</span>${
          completedScreens.has(screen.key) ? renderStatusPill({ label: "saved", tone: "success" }) : ""
        }</div></li>`
    ),
    "</ol>",
    "</article>"
  ].join("");
};

const renderCountryPackClassificationResult = (model: Nis2CountryAwareOnboardingModel): string => {
  if (!model.classification) {
    return "";
  }

  const classification = model.classification;
  return [
    '<article class="ps-panel ps-stack-top" aria-labelledby="country-pack-classification-result-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="country-pack-classification-result-title">Scope result</h2><p class="ps-muted">${escapeHtml(
      classification.explanation
    )}</p></div>`,
    renderStatusPill({ label: classification.result.replaceAll("_", " "), tone: toneForStatusText(classification.result) }),
    "</div>",
    '<div class="ps-chip-row">',
    renderStatusPill({ label: `confidence ${classification.confidence}`, tone: toneForStatusText(classification.confidence) }),
    renderStatusPill({
      label: classification.legalReviewRequired ? "legal review required" : "reviewed logic",
      tone: classification.legalReviewRequired ? "warning" : "success"
    }),
    ...classification.matchedRules.map((rule) => renderSourceChip({ label: "Matched rule", detail: rule })),
    "</div>",
    classification.missingInformation.length > 0
      ? `<p class="ps-legal-caveat">Missing information: ${escapeHtml(classification.missingInformation.join(", "))}</p>`
      : "",
    '<ul class="ps-list">',
    ...classification.assumptions.map((assumption) => `<li>${escapeHtml(assumption)}</li>`),
    "</ul>",
    classification.legalBasisReferences.length > 0
      ? `<div class="ps-chip-row">${classification.legalBasisReferences
          .map(renderCountryClassificationSourceChip)
          .join("")}</div>`
      : "",
    "</article>"
  ].join("");
};

const renderCountryClassificationSourceChip = (source: unknown): string => {
  const record = source && typeof source === "object" && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
  const label =
    typeof record.title === "string"
      ? record.title
      : typeof record.label === "string"
        ? record.label
        : typeof record.sourceRecordId === "string"
          ? record.sourceRecordId
          : "source";
  const detail =
    typeof record.retrievedAt === "string"
      ? record.retrievedAt
      : typeof record.sourceVersion === "string"
        ? record.sourceVersion
        : undefined;
  const href = typeof record.url === "string" ? record.url : typeof record.sourceUrl === "string" ? record.sourceUrl : undefined;

  return renderSourceChip({ label, detail, href });
};

const renderCountryPackDynamicQuestions = (pack: Nis2CountryPackDefinitionSurface): string =>
  renderDataTable<Nis2CountryPackQuestionSurface>(
    "Country-pack dynamic questions",
    [
      {
        header: "Question",
        render: (question) => `<strong>${escapeHtml(question.label)}</strong><br><span class="ps-muted">${escapeHtml(question.key)}</span>`
      },
      {
        header: "Answer type",
        render: (question) => renderStatusPill({ label: question.answerType.replaceAll("_", " "), tone: "info" })
      },
      {
        header: "Choices or sources",
        render: (question) =>
          escapeHtml(
            question.choices && question.choices.length > 0 ? question.choices.join(", ") : question.sourceIds.join(", ")
          )
      }
    ],
    pack.dynamicQuestions
  );

const renderCountryPackSources = (pack: Nis2CountryPackDefinitionSurface): string =>
  renderDataTable<Nis2CountryPackDefinitionSurface["officialSources"][number]>(
    "Official source references",
    [
      {
        header: "Source",
        render: (source) =>
          `<a href="${escapeHtml(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a><br><span class="ps-muted">${escapeHtml(
            source.id
          )}</span>`
      },
      {
        header: "Retrieved",
        render: (source) => escapeHtml(source.retrievedAt)
      },
      {
        header: "Trust",
        render: (source) => renderStatusPill({ label: source.trustLevel, tone: source.trustLevel === "primary" ? "success" : "info" })
      }
    ],
    pack.officialSources
  );

export const renderWorkspaceSelectionScreen = (
  model: WorkspaceSelectionModel,
  options: RenderWorkspaceSelectionOptions = {}
): string => {
  const copy = resolveOperationalConsoleCopy(options.locale);
  const activeOrganizationId = model.session.session.activeOrganizationId ?? null;
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="workspace-selection">',
    renderActiveTenantAccessBanner(model.activeTenantAccess),
    '<section class="ps-section" aria-labelledby="workspace-selection-title">',
    '<div class="ps-section__header">',
    `<div><h1 class="ps-section__title" id="workspace-selection-title">Select a workspace</h1><p class="ps-muted">${escapeHtml(
      model.session.user.displayName ?? model.session.user.email
    )}</p></div>`,
    renderStatusPill({ label: copy.apiSession, tone: "info" }),
    "</div>",
    '<div class="ps-section__body">',
    model.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(model.errorMessage)}</p>` : "",
    model.organizations.length === 0
      ? '<div class="ps-empty-state"><p class="ps-muted">No active workspace memberships are available for this session.</p></div>'
      : [
          '<div class="ps-grid">',
          ...model.organizations.map((organization) => renderWorkspaceSelectionPanel(organization, activeOrganizationId)),
          "</div>"
        ].join(""),
    '<article class="ps-panel ps-panel--quiet ps-stack-top" aria-labelledby="workspace-create-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-section__title" id="workspace-create-title">Create workspace</h2><p class="ps-muted">Start with the country because it decides which onboarding route appears first.</p></div>',
    renderStatusPill({ label: "local organization", tone: "accent" }),
    "</div>",
    '<form class="ps-form" action="/organizations" method="post" data-ui-action="create-local-workspace">',
    '<div class="ps-field"><label for="name">Workspace name</label><input id="name" name="name" type="text" required><span class="ps-help">Use a short operational name, for example the business unit or legal entity.</span></div>',
    '<div class="ps-field"><label for="legalName">Legal name</label><input id="legalName" name="legalName" type="text"><span class="ps-help">Optional now. The NIS2 wizard asks for the legal name later.</span></div>',
    '<div class="ps-field"><label for="primaryCountryCode">Primary country</label><input id="primaryCountryCode" name="primaryCountryCode" type="text" value="RO" maxlength="2" pattern="[A-Za-z]{2}" autocapitalize="characters" spellcheck="false" required><span class="ps-help">Two-letter ISO code. Use RO for the Romania NIS2 route.</span></div>',
    renderCommandButton({ label: "Create workspace", ariaLabel: "Create local workspace", tone: "primary", type: "submit" }),
    "</form>",
    "</article>",
    '<p class="ps-stack-top"><a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a></p>',
    "</div>",
    "</section>",
    "</main>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${copy.locale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Select workspace | PureSOC</title>",
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    "</body>",
    "</html>"
  ].join("");
};

export const renderRomaniaOnboardingRoute = (
  model: RomaniaOnboardingRouteModel,
  options: RenderRomaniaOnboardingRouteOptions = {}
): string => {
  const activeScreen = options.screen ?? "company";
  const activeDataEntryScreen = isRomaniaDataEntryScreen(activeScreen) ? activeScreen : "company";
  const requiredFieldCount = model.steps.reduce((total, step) => total + step.requiredFieldPaths.length, 0);
  const completedRequiredFieldCount = requiredFieldCount - model.progress.missingRequiredFields.length;
  const requiredFieldCoverage =
    requiredFieldCount === 0 ? 100 : Math.round((completedRequiredFieldCount / requiredFieldCount) * 100);
  const labelFallbackCount = model.notificationDraft.fields.filter((field) => field.labelFallbackUsed).length;
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content ps-content--wizard" id="content" tabindex="-1" data-ui-smoke="romania-onboarding-route">',
    renderActiveTenantAccessBanner(model.activeTenantAccess),
    renderRomaniaRouteHero({
      completedRequiredFieldCount,
      labelFallbackCount,
      model,
      requiredFieldCount,
      requiredFieldCoverage,
      screen: activeDataEntryScreen
    }),
    renderRomaniaScreenSection(model, activeScreen, labelFallbackCount),
    '<p><a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a></p>',
    "</main>"
  ].join("");

  if (options.includeDocumentShell === false) {
    return content;
  }

  return [
    "<!doctype html>",
    `<html lang="${model.resolvedLocale}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Romania NIS2 onboarding | PureSOC</title>",
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    renderRomaniaServiceSearchScript(),
    "</body>",
    "</html>"
  ].join("");
};

type RomaniaGuidedStepState = "active" | "blocked" | "complete";

interface RomaniaRouteHeroInput {
  completedRequiredFieldCount: number;
  labelFallbackCount: number;
  model: RomaniaOnboardingRouteModel;
  requiredFieldCount: number;
  requiredFieldCoverage: number;
  screen: RomaniaDataEntryScreen;
}

const renderRomaniaRouteHero = ({
  completedRequiredFieldCount,
  labelFallbackCount,
  model,
  requiredFieldCount,
  requiredFieldCoverage,
  screen
}: RomaniaRouteHeroInput): string => {
  const nextAction = resolveRomaniaNextAction(model);
  const answeredWizardPages = romaniaOnboardingScreens.filter((item) => model.wizardCompletion[item.key]?.complete).length;
  const savedStepsLabel = `${answeredWizardPages} of ${romaniaOnboardingScreens.length} customer workflow screens complete`;
  const savedFieldsLabel = `${completedRequiredFieldCount} of ${requiredFieldCount} required fields saved`;
  const serviceOptionCount = model.serviceCatalogGroups.reduce((total, group) => total + group.options.length, 0);
  const classificationLabel = model.classificationPersisted
    ? `Preliminary result: ${model.classification.result.replaceAll("_", " ")}`
    : "Classification will appear after saved answers";
  const localeLabel =
    labelFallbackCount > 0
      ? "English legal caveat until Romanian wording is approved"
      : "Romanian legal copy is available";

  return [
    '<section class="ps-route-hero" id="romania-onboarding" data-ui-section="romania-onboarding" aria-labelledby="romania-route-title">',
    '<div class="ps-route-hero__body">',
    '<div class="ps-route-hero__intro">',
    '<p class="ps-route-hero__eyebrow">Customer onboarding workspace</p>',
    '<h1 class="ps-route-hero__title" id="romania-route-title">NIS2 Readiness Wizard</h1>',
    '<p class="ps-route-hero__lede">Complete business data in short screens, run the Romania NIS2 readiness checks, connect Microsoft 365 from the workspace connector when ready, and export the resulting gap list.</p>',
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<p class="ps-route-hero__boundary-note">DNSC filing stays outside PureSOC. Outputs remain internal readiness support.</p>',
    "</div>",
    '<div class="ps-route-hero__status-strip" aria-label="Romania readiness summary">',
    `<div class="ps-route-hero__status-item ps-route-hero__status-item--meter">${renderMeter({
      label: "Required answers",
      value: requiredFieldCoverage,
      source: "saved Romania answers"
    })}<span class="ps-route-hero__status-note">${escapeHtml(savedFieldsLabel)}.</span></div>`,
    `<div class="ps-route-hero__status-item"><span class="ps-route-hero__status-label">Next action</span><strong class="ps-route-hero__status-title">${escapeHtml(
      nextAction.label
    )}</strong><span class="ps-route-hero__status-note">${escapeHtml(nextAction.summary)}</span></div>`,
    `<div class="ps-route-hero__status-item"><span class="ps-route-hero__status-label">Output</span><strong class="ps-route-hero__status-title">${escapeHtml(
      classificationLabel
    )}</strong><span class="ps-route-hero__status-note">Draft readiness materials for review only.</span></div>`,
    "</div>",
    '<div class="ps-route-hero__actions">',
    `<a class="ps-command ps-command--primary" href="${escapeHtml(activeRomaniaScreenHref(screen))}#romania-workflow" data-ui-action="focus-romania-guided-workflow">Continue workflow</a>`,
    '<a class="ps-command" href="/onboarding/romania/gaps?locale=ro-RO#romania-gap-list" data-ui-action="open-romania-gap-list">Open gap list</a>',
    "</div>",
    "</div>",
    '<details class="ps-route-details">',
    '<summary>Workspace details</summary>',
    '<div class="ps-route-hero__facts">',
    '<article class="ps-route-hero__guardrails" aria-labelledby="romania-guardrails-title">',
    '<h2 class="ps-panel__title" id="romania-guardrails-title">What this workspace does</h2>',
    '<ul class="ps-plain-list">',
    `<li><strong>${escapeHtml(model.hasSavedProgress ? "Saved answers found" : "No saved answers yet")}.</strong> ${escapeHtml(
      savedStepsLabel
    )}.</li>`,
    `<li><strong>Question limit.</strong> Every wizard screen asks ${wizardQuestionLimit} or fewer customer questions.</li>`,
    `<li><strong>Country pack.</strong> Romania workflow planned with ${escapeHtml(serviceOptionCount)} service options.</li>`,
    `<li><strong>Connector.</strong> Microsoft 365 uses tenant OAuth and read-only module health.</li>`,
    `<li><strong>Language.</strong> ${escapeHtml(localeLabel)}.</li>`,
    '<li><strong>Submission.</strong> DNSC filing stays outside PureSOC.</li>',
    '<li><strong>Claim.</strong> Outputs are internal readiness support, not legal certification.</li>',
    "</ul>",
    "</article>",
    "</div>",
    "</details>",
    renderRomaniaGuidedStepper(model, labelFallbackCount),
    renderRomaniaScreenNav(screen),
    "</section>"
  ].join("");
};

const activeRomaniaScreenHref = (screen: RomaniaOnboardingScreen): string =>
  romaniaOnboardingScreens.find((item) => item.key === screen)?.href ?? romaniaOnboardingScreens[0].href;

const renderRomaniaScreenNav = (screen: RomaniaOnboardingScreen): string =>
  [
    '<nav class="ps-route-tabs" aria-label="NIS2 wizard screens">',
    ...romaniaOnboardingScreens.map(
      (item) =>
        `<a class="ps-route-tabs__link" href="${escapeHtml(item.href)}" aria-label="${escapeHtml(`${item.label}: ${item.summary}`)}"${
          item.key === screen ? ' aria-current="page"' : ""
        } data-ui-action="open-romania-${escapeHtml(
          item.key
        )}-screen"><span>${escapeHtml(item.label)}</span></a>`
    ),
    "</nav>"
  ].join("");

const renderRomaniaScreenSection = (
  model: RomaniaOnboardingRouteModel,
  screen: RomaniaOnboardingScreen,
  labelFallbackCount: number
): string => {
  if (screen === "outputs") {
    return [
      renderSection({
        id: "romania-workflow",
        title: "Readiness Outputs",
        eyebrow: renderStatusPill({ label: "review package", tone: "accent" }),
        body: renderRomaniaOutputsWorkflow(model)
      }),
      renderRomaniaOutputsSection(model, labelFallbackCount),
      renderRomaniaBoundariesSection(model)
    ].join("");
  }

  if (screen === "connector") {
    return renderSection({
      id: "romania-workflow",
      title: "Microsoft 365 Tenant Connector",
      eyebrow: renderStatusPill({ label: model.microsoft365.status.replaceAll("_", " "), tone: toneForStatus(model.microsoft365.status) }),
      body: renderRomaniaConnectorWorkflow(model.microsoft365)
    });
  }

  if (screen === "gaps") {
    return renderSection({
      id: "romania-workflow",
      title: "Gap List And Exports",
      eyebrow: renderStatusPill({ label: `${model.readinessGaps.length} open items`, tone: model.readinessGaps.length > 0 ? "warning" : "success" }),
      body: renderRomaniaGapListWorkflow(model)
    });
  }

  const screenLabels: Record<
    RomaniaDataEntryScreen,
    { title: string; status: string }
  > = {
    company: {
      status: "1 of 8",
      title: "Company Identity"
    },
    address: {
      status: "2 of 8",
      title: "Registered Address"
    },
    legal: {
      status: "3 of 8",
      title: "Legal Representative"
    },
    size: {
      status: "4 of 8",
      title: "Activity And Size"
    },
    services: {
      status: "5 of 8",
      title: "Services And Jurisdiction"
    },
    contacts: {
      status: "6 of 8",
      title: "Security Responsibility"
    },
    systems: {
      status: "7 of 8",
      title: "Systems And Monitoring"
    },
    article9: {
      status: "8 of 8",
      title: "Article 9 Context"
    }
  };

  return [
    `<section class="ps-section ps-section--workflow-stage" id="romania-workflow" data-ui-section="romania-workflow" aria-label="${escapeHtml(
      screenLabels[screen].title
    )}">`,
    `<div class="ps-section__body"><div class="ps-workflow-stage">${renderRomaniaWorkflowForms(model, screen)}</div></div>`,
    "</section>"
  ].join("");
};

const renderRomaniaOutputsSection = (model: RomaniaOnboardingRouteModel, labelFallbackCount: number): string =>
  renderSection({
    id: "romania-outputs",
    title: "Readiness Outputs",
    eyebrow: renderStatusPill({ label: "draft package only", tone: "warning" }),
    body: [
      '<div class="ps-grid">',
      '<article class="ps-panel">',
      '<h3 class="ps-panel__title">Preliminary classification</h3>',
      renderStatusPill({ label: model.classification.result.replaceAll("_", " "), tone: "warning" }),
      `<p>${escapeHtml(formatRomaniaClassificationReason(model.classification.reasons[0]))}</p>`,
      renderStatusPill({
        label: model.classificationPersisted ? "stored classification run" : "preview from saved answers",
        tone: model.classificationPersisted ? "success" : "info"
      }),
      model.classificationRunId ? renderSourceChip({ label: "Run", detail: model.classificationRunId }) : "",
      "</article>",
      '<article class="ps-panel">',
      '<h3 class="ps-panel__title">Notification draft</h3>',
      renderStatusPill({ label: model.notificationDraft.status.replaceAll("_", " "), tone: "info" }),
      renderStatusPill({ label: model.notificationDraft.submission.submittedToDnsc ? "submitted" : "not submitted", tone: "warning" }),
      `<p>${escapeHtml(model.notificationDraft.submission.notice)}</p>`,
      `<p class="ps-muted">${escapeHtml(model.notificationDraft.fields.length)} draft fields are prepared for reviewer export.</p>`,
      model.latestNotificationDraftId ? renderSourceChip({ label: "Draft", detail: model.latestNotificationDraftId }) : "",
      "</article>",
      '<article class="ps-panel">',
      '<h3 class="ps-panel__title">Locale review</h3>',
      renderStatusPill({ label: model.resolvedLocale, tone: "info" }),
      renderStatusPill({
        label: labelFallbackCount > 0 ? "Romanian legal copy pending" : "localized copy ready",
        tone: labelFallbackCount > 0 ? "warning" : "success"
      }),
      `<p>${escapeHtml(
        labelFallbackCount > 0
          ? "The workflow keeps legal and regulatory wording conservative until approved Romanian copy exists."
          : "The selected locale has approved draft labels."
      )}</p>`,
      "</article>",
      '<article class="ps-panel">',
      '<h3 class="ps-panel__title">Readiness state</h3>',
      renderStatusPill({ label: `Evidence ${model.evidence.count}`, tone: "info" }),
      renderStatusPill({ label: `Reports ${model.evidence.generatedReportCount}`, tone: "accent" }),
      model.dashboard
        ? renderMeter({
            label: model.dashboard.readinessScoreLabel,
            value: model.dashboard.readinessScores.overallInternalReadiness,
            source: "stored readiness outputs"
          })
        : renderStatusPill({ label: "dashboard not generated", tone: "warning" }),
      "</article>",
      "</div>"
    ].join("")
  });

const formatRomaniaClassificationReason = (reason?: string): string =>
  (reason ?? "Classification awaits more saved answers.")
    .replace(/workbook option/gi, "service option")
    .replace(/workbook rule/gi, "Romania NIS2 rule")
    .replace(/source map/gi, "internal reference")
    .replace(/Entity assessment![A-Z0-9:]+/gi, "the Romania readiness criteria")
    .replace(/Notification form![A-Z0-9:]+/gi, "the Romania notification draft");

const renderRomaniaBoundariesSection = (model: RomaniaOnboardingRouteModel): string =>
  renderSection({
    id: "romania-boundaries",
    title: "Review Boundaries",
    eyebrow: renderStatusPill({ label: "internal readiness only", tone: "accent" }),
    body: [
      '<div class="ps-grid">',
      ...model.unsupportedSignals.map(
        (signal) =>
          `<article class="ps-panel"><h3 class="ps-panel__title">${escapeHtml(signal.label)}</h3>${renderStatusPill({
            label: signal.tone === "warning" ? "not available" : "documented",
            tone: signal.tone
          })}<p>${escapeHtml(signal.detail)}</p></article>`
      ),
      "</div>",
      '<div class="ps-chip-row ps-stack-top">',
      renderStatusPill({ label: model.billing.planLabel, tone: "success" }),
      renderSourceChip({ label: "Billing", detail: model.billing.providerKey }),
      renderSourceChip({ label: "Audit", detail: model.audit.guarantees }),
      "</div>",
      renderLegalCaveat(model.notificationDraft.legalCaveat)
    ].join("")
  });

const renderRomaniaGuidedStepper = (model: RomaniaOnboardingRouteModel, labelFallbackCount: number): string => {
  const steps = resolveRomaniaGuidedSteps(model, labelFallbackCount);

  return [
    '<ol class="ps-stepper" aria-label="NIS2 wizard guided steps">',
    ...steps.map(
      (step) =>
        `<li class="ps-step ps-step--${step.state}"><div class="ps-step__header"><span class="ps-step__index">${escapeHtml(
          step.index
        )}</span><span>${escapeHtml(step.label)}</span></div><p class="ps-muted">${escapeHtml(step.summary)}</p></li>`
    ),
    "</ol>"
  ].join("");
};

const resolveRomaniaGuidedSteps = (
  model: RomaniaOnboardingRouteModel,
  labelFallbackCount: number
): Array<{ index: number; label: string; state: RomaniaGuidedStepState; summary: string }> => {
  const businessComplete = ["company", "address", "legal", "size"].every((screen) => model.wizardCompletion[screen as RomaniaOnboardingScreen]?.complete);
  const scopeComplete = ["services", "contacts", "systems", "article9"].every((screen) => model.wizardCompletion[screen as RomaniaOnboardingScreen]?.complete);
  const outputsComplete = model.classificationPersisted && Boolean(model.latestNotificationDraftId) && Boolean(model.assessmentId);
  const connectorComplete = Boolean(model.microsoft365.providerConnectionId);
  const evidenceComplete = model.evidence.count > 0 && model.evidence.generatedReportCount > 0;
  const definitions = [
    {
      complete: businessComplete,
      label: "Business details",
      summary: model.hasSavedProgress ? "Company, address, legal representative, and scale screens are saved." : "Start with legal identity and address."
    },
    {
      complete: scopeComplete,
      label: "Scope and services",
      summary: "Services, security contacts, systems, and Article 9 context."
    },
    {
      complete: outputsComplete,
      label: "Readiness outputs",
      summary: model.classificationPersisted ? "Classification, draft, and assessment are ready." : "Run local outputs after answers are saved."
    },
    {
      complete: connectorComplete,
      label: "Microsoft connector",
      summary: connectorComplete ? "Tenant OAuth connection is present." : "Connect Microsoft 365 from the workspace connector. Romania onboarding is not required."
    },
    {
      complete: evidenceComplete,
      label: "Gaps and exports",
      summary:
        labelFallbackCount > 0
          ? `${labelFallbackCount} draft labels still need approved Romanian wording before reviewer sharing.`
          : "Attach evidence, review the gap list, and export the package."
    }
  ];
  const firstIncompleteIndex = definitions.findIndex((definition) => !definition.complete);

  return definitions.map((definition, index) => ({
    index: index + 1,
    label: definition.label,
    state: definition.complete ? "complete" : index === firstIncompleteIndex ? "active" : "blocked",
    summary: definition.summary
  }));
};

interface RomaniaNextAction {
  key: "boundaries" | "classify" | "connector" | "draft" | "evaluate" | "evidence" | "gaps" | "save";
  label: string;
  summary: string;
  tone: PureSocUiTone;
}

const renderRomaniaWorkflowForms = (
  model: RomaniaOnboardingRouteModel,
  screen: RomaniaDataEntryScreen
): string => {
  return [
    '<div class="ps-workflow-main">',
    '<p class="ps-help ps-workflow-help">Five customer questions or fewer. Empty fields remain explicit gaps.</p>',
    screen === "company" ? renderRomaniaCompanyForm(model) : "",
    screen === "address" ? renderRomaniaAddressForm(model) : "",
    screen === "legal" ? renderRomaniaLegalRepresentativeForm(model) : "",
    screen === "size" ? renderRomaniaSizeForm(model) : "",
    screen === "services" ? renderRomaniaServicesForm(model) : "",
    screen === "contacts" ? renderRomaniaContactsForm(model) : "",
    screen === "systems" ? renderRomaniaSystemsForm(model) : "",
    screen === "article9" ? renderRomaniaArticle9Form(model) : "",
    "</div>",
    renderRomaniaContextPanel(model, screen)
  ].join("");
};

const renderRomaniaContextPanel = (model: RomaniaOnboardingRouteModel, screen: RomaniaDataEntryScreen): string => {
  const screenContext: Record<RomaniaDataEntryScreen, { facts: Array<readonly [string, string]>; lead: string; title: string }> = {
    company: {
      title: "Identity traceability",
      lead: "PureSOC uses this identity data to keep readiness outputs tied to the correct legal entity.",
      facts: [
        ["Required", "Legal name, CUI, registration number, and organization email support local draft metadata."],
        ["Review state", "Outputs remain internal readiness support until the country-pack review process is complete."]
      ]
    },
    address: {
      title: "Registered office context",
      lead: "Address details help distinguish Romanian establishment, local contactability, and jurisdictional context.",
      facts: [
        ["Country pack", `${model.countryPack.countryName} remains the selected country workflow.`],
        ["Evidence", "Keep official registration evidence in the vault before sharing a report."]
      ]
    },
    legal: {
      title: "Accountability record",
      lead: "Representative details make draft outputs reviewable by business and legal owners.",
      facts: [
        ["Audit trail", "Changes to saved answers are stored through the authenticated workspace workflow."],
        ["Boundary", "PureSOC does not submit national filings from this screen."]
      ]
    },
    size: {
      title: "Scale and economic impact",
      lead: "Size fields support scoping, but sector and service context can still affect the preliminary result.",
      facts: [
        ["Essential threshold signal", "Large-entity indicators are treated as review inputs, not legal certification."],
        ["Important threshold signal", "Medium-entity indicators are combined with service and Article 9 context."]
      ]
    },
    services: {
      title: "Operational context",
      lead: "Services link business activity to the generated Romania service catalog and EU NIS2 categories.",
      facts: [
        ["Service catalog", `${model.serviceCatalogGroups.reduce((total, group) => total + group.options.length, 0)} service options are available.`],
        ["Provider neutrality", "Cloud-provider posture remains separate from regulatory scoping answers."]
      ]
    },
    contacts: {
      title: "Security responsibility",
      lead: "Named contacts make recurring tasks, evidence requests, and incident workflow handoffs actionable.",
      facts: [
        ["Minimum data", "Cybersecurity name, role, email, and phone are required for the local readiness package."],
        ["Privacy", "Do not paste passwords, tokens, or provider secrets into contact fields."]
      ]
    },
    systems: {
      title: "Monitoring and systems",
      lead: "System context helps explain which network and information systems support the selected service.",
      facts: [
        ["Evidence", `${model.evidence.count} evidence artifact${model.evidence.count === 1 ? "" : "s"} currently attached.`],
        ["Connector", "Microsoft 365 posture is connected from the tenant connector, not from free-text system fields."]
      ]
    },
    article9: {
      title: "Criticality context",
      lead: "Article 9 answers capture operational impact signals that may change how the local result is reviewed.",
      facts: [
        ["No overclaim", "The result is a preliminary internal readiness classification."],
        ["Next output", "Save this screen before generating classification, draft, and assessment outputs."]
      ]
    }
  };
  const context = screenContext[screen];

  return [
    '<aside class="ps-context-panel" aria-label="Romania workflow context">',
    `<div class="ps-context-panel__header"><h3 class="ps-panel__title">${escapeHtml(context.title)}</h3><p class="ps-muted">${escapeHtml(
      context.lead
    )}</p></div>`,
    '<div class="ps-context-panel__body">',
    ...context.facts.map(
      ([title, detail]) =>
        `<div class="ps-context-fact"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`
    ),
    '<p class="ps-muted"><em>DNSC filing stays outside PureSOC. Outputs remain internal readiness support.</em></p>',
    "</div>",
    "</aside>"
  ].join("");
};

const formatRomaniaDataEntryScreenStatus = (screen: RomaniaDataEntryScreen): string => {
  const index = romaniaDataEntryScreenOrder.indexOf(screen);
  return `${index + 1} of ${romaniaDataEntryScreenOrder.length}`;
};

const renderRomaniaSaveForm = (input: {
  body: string;
  model: RomaniaOnboardingRouteModel;
  nextScreen: RomaniaOnboardingScreen;
  screen: RomaniaDataEntryScreen;
  submitLabel: string;
  summary: string;
  title: string;
}): string =>
  [
    '<article class="ps-panel ps-workflow-form-card">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h3 class="ps-panel__title">${escapeHtml(input.title)}</h3><p class="ps-muted">${escapeHtml(input.summary)}</p></div>`,
    `<div class="ps-chip-row ps-chip-row--compact">${renderStatusPill({ label: formatRomaniaDataEntryScreenStatus(input.screen), tone: "accent" })}${renderStatusPill({
      label: input.model.hasSavedProgress ? "updates saved data" : "creates local progress",
      tone: input.model.hasSavedProgress ? "success" : "warning"
    })}</div>`,
    "</div>",
    '<form class="ps-form ps-form--wide" action="/onboarding/romania/save" method="post" data-ui-action="save-romania-onboarding">',
    `<input type="hidden" name="screen" value="${escapeHtml(input.screen)}">`,
    `<input type="hidden" name="nextScreen" value="${escapeHtml(input.nextScreen)}">`,
    input.body,
    '<div class="ps-command-row ps-stack-top">',
    renderCommandButton({
      label: input.submitLabel,
      ariaLabel: input.submitLabel,
      tone: "primary",
      type: "submit"
    }),
    `<a class="ps-command" href="${escapeHtml(activeRomaniaScreenHref(input.nextScreen))}" data-ui-action="open-romania-next-screen">Skip to ${escapeHtml(
      romaniaOnboardingScreens.find((item) => item.key === input.nextScreen)?.label ?? "next"
    )}</a>`,
    "</div>",
    "</form>",
    "</article>"
  ].join("");

const renderRomaniaCompanyForm = (model: RomaniaOnboardingRouteModel): string =>
  renderRomaniaSaveForm({
    model,
    nextScreen: "address",
    screen: "company",
    submitLabel: "Save company",
    summary: "Capture the legal entity identity before the NIS2 scope questions.",
    title: "Company Identity",
    body: [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Business data</legend>',
    '<div class="ps-form-grid">',
    renderTextInput("legalName", "Legal name", answerText(model, "entity.legalName"), true, "text", "Use the entity name as it appears in official registration records."),
    renderTextInput("cui", "CUI", answerText(model, "entity.cui"), true, "text", "Use the Romanian fiscal identifier, with or without the RO prefix."),
    renderTextInput(
      "nationalRegistrationNumber",
      "National registration number",
      answerText(model, "entity.nationalRegistrationNumber"),
      true,
      "text",
      "Use the trade register value when available."
    ),
    renderTextInput("websiteUrl", "Website URL", answerText(model, "contact.websiteUrl"), false),
    renderTextInput("email", "Organization email", answerText(model, "contact.email"), true, "email", "This contact appears in local notification draft metadata."),
    "</div>",
    "</fieldset>"
    ].join("")
  });

const renderRomaniaAddressForm = (model: RomaniaOnboardingRouteModel): string =>
  renderRomaniaSaveForm({
    model,
    nextScreen: "legal",
    screen: "address",
    submitLabel: "Save address",
    summary: "Capture the registered office details used in the local readiness package.",
    title: "Registered address",
    body: [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Registered office</legend>',
    '<div class="ps-form-grid">',
    renderTextInput("country", "Country", answerText(model, "address.country") || "Romania", true),
    renderTextInput("county", "County", answerText(model, "address.county"), true),
    renderTextInput("city", "City", answerText(model, "address.city"), true),
    renderTextInput("street", "Street", answerText(model, "address.street"), true),
    renderTextInput("postalCode", "Postal code", answerText(model, "address.postalCode"), false),
    "</div>",
    "</fieldset>"
    ].join("")
  });

const renderRomaniaLegalRepresentativeForm = (model: RomaniaOnboardingRouteModel): string =>
  renderRomaniaSaveForm({
    model,
    nextScreen: "size",
    screen: "legal",
    submitLabel: "Save legal rep",
    summary: "Capture the person who represents the company in the readiness package.",
    title: "Legal representative",
    body: renderRomaniaLegalRepresentativeFields(model)
  });

const renderRomaniaSizeForm = (model: RomaniaOnboardingRouteModel): string =>
  renderRomaniaSaveForm({
    model,
    nextScreen: "services",
    screen: "size",
    submitLabel: "Save business size",
    summary: "Use activity and size information to support scoping without turning the page into a spreadsheet.",
    title: "Activity and size",
    body: [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Activity and scale</legend>',
    '<div class="ps-form-grid">',
    renderTextInput("mainNaceCode", "Main NACE code", answerText(model, "activity.mainNaceCode"), true, "text", "Use the main NACE activity code from source records."),
    renderTextInput("employeeCount", "Employee count", answerText(model, "size.employeeCount"), false, "number", "Optional. Helps explain size classification.", [
      'min="0"',
      'inputmode="numeric"'
    ]),
    renderTextInput("annualTurnoverEur", "Annual turnover (EUR)", answerText(model, "size.annualTurnoverEur"), false, "number", "Optional size evidence.", [
      'min="0"',
      'inputmode="decimal"'
    ]),
    renderTextInput("balanceSheetTotalEur", "Balance sheet total (EUR)", answerText(model, "size.balanceSheetTotalEur"), false, "number", "Optional size evidence.", [
      'min="0"',
      'inputmode="decimal"'
    ]),
    renderSelect(
      "sizeCategory",
      "Size category",
      answerText(model, "size.sizeCategory"),
      [
        ["", "Select size"],
        ["small_micro", "Small or micro"],
        ["medium", "Medium"],
        ["large", "Large"]
      ],
      "Used with employee count for local scope checks."
    ),
    "</div>",
    "</fieldset>"
    ].join("")
  });

const renderRomaniaServicesForm = (model: RomaniaOnboardingRouteModel): string =>
  renderRomaniaSaveForm({
    model,
    nextScreen: "contacts",
    screen: "services",
    submitLabel: "Save services",
    summary: "Select the NIS2-facing service category and where the entity operates.",
    title: "Services and jurisdiction",
    body: [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Services and relationships</legend>',
    '<div class="ps-form-grid">',
    renderRomaniaServiceSelector(model),
    renderCheckbox("establishedInRomania", "Established in Romania", answerBoolean(model, "relationship.establishedInRomania")),
    renderCheckbox("mainOfficeInRomania", "Main office in Romania", answerBoolean(model, "relationship.mainOfficeInRomania")),
    renderCheckbox("providesServicesInRomania", "Provides services in Romania", answerBoolean(model, "relationship.providesServicesInRomania")),
    renderCheckbox(
      "providesServicesInAnotherEuMemberState",
      "Provides services in another EU member state",
      answerBoolean(model, "relationship.providesServicesInAnotherEuMemberState")
    ),
    "</div>",
    "</fieldset>"
    ].join("")
  });

const renderRomaniaContactsForm = (model: RomaniaOnboardingRouteModel): string =>
  renderRomaniaSaveForm({
    model,
    nextScreen: "systems",
    screen: "contacts",
    submitLabel: "Save contacts",
    summary: "Add the cybersecurity owner and primary operational phone numbers.",
    title: "Security responsibility",
    body: [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Security responsibility</legend>',
    '<div class="ps-form-grid">',
    renderTextInput("cybersecurityName", "Cybersecurity responsible person", answerText(model, "cybersecurityResponsible.name"), true),
    renderTextInput("cybersecurityRole", "Cybersecurity role", answerText(model, "cybersecurityResponsible.role"), true),
    renderTextInput("cybersecurityEmail", "Cybersecurity email", answerText(model, "cybersecurityResponsible.email"), true, "email"),
    renderTextInput("cybersecurityPhone", "Cybersecurity phone", answerText(model, "cybersecurityResponsible.phone"), true),
    renderTextInput("phone", "Organization telephone", answerText(model, "contact.phone"), false),
    "</div>",
    "</fieldset>"
    ].join("")
  });

const renderRomaniaSystemsForm = (model: RomaniaOnboardingRouteModel): string =>
  renderRomaniaSaveForm({
    model,
    nextScreen: "article9",
    screen: "systems",
    submitLabel: "Save systems",
    summary: "Capture monitoring and network context for the selected services.",
    title: "Systems and monitoring",
    body: [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Monitoring and systems</legend>',
    '<div class="ps-form-grid">',
    renderTextInput("monitoringName", "Monitoring contact", answerText(model, "permanentMonitoringContact.name"), true),
    renderTextInput("monitoringEmail", "Monitoring email", answerText(model, "permanentMonitoringContact.email"), true, "email"),
    renderTextInput("monitoringPhone", "Monitoring phone", answerText(model, "permanentMonitoringContact.phone"), true),
    renderTextarea(
      "publicIpRanges",
      "Public IP ranges",
      answerArrayText(model, "network.publicIpRanges"),
      "Separate ranges with commas or line breaks.",
      "ps-field--full"
    ),
    renderTextarea(
      "systemsDescription",
      "Network and information systems",
      answerText(model, "network.systemsDescription"),
      "Summarize the systems that support the selected service category.",
      "ps-field--full"
    ),
    "</div>",
    "</fieldset>"
    ].join("")
  });

const renderRomaniaArticle9Form = (model: RomaniaOnboardingRouteModel): string =>
  renderRomaniaSaveForm({
    model,
    nextScreen: "outputs",
    screen: "article9",
    submitLabel: "Save Article 9",
    summary: "Capture criticality signals used when classification requires additional context.",
    title: "Article 9 context",
    body: [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Criticality and impact</legend>',
    '<div class="ps-form-grid">',
    renderCheckbox(
      "publicAdministrationEstablishedByRomania",
      "Public administration entity established by Romania",
      answerBoolean(model, "relationship.publicAdministrationEstablishedByRomania")
    ),
    renderCheckbox("soleProviderEssentialService", "Sole provider of an essential supporting service", answerBoolean(model, "article9.soleProviderEssentialService")),
    renderSelect(
      "publicSafetySecurityOrHealthImpact",
      "Public safety/security/health impact",
      answerText(model, "article9.publicSafetySecurityOrHealthImpact"),
      [
        ["", "Not assessed"],
        ["low", "Low"],
        ["medium", "Medium"],
        ["high", "High"]
      ],
      "Use the highest known impact level."
    ),
    renderSelect(
      "systemicRisk",
      "Systemic or cross-border risk",
      answerText(model, "article9.systemicRisk"),
      [
        ["", "Not assessed"],
        ["low", "Low"],
        ["medium", "Medium"],
        ["high", "High"]
      ],
      "Use the highest known systemic-risk level."
    ),
    renderCheckbox("nationalOrRegionalCriticality", "Critical at national or regional level", answerBoolean(model, "article9.nationalOrRegionalCriticality")),
    "</div>",
    "</fieldset>"
    ].join("")
  });

const renderRomaniaOutputsWorkflow = (model: RomaniaOnboardingRouteModel): string => {
  const nextAction = resolveRomaniaNextAction(model);
  const evidenceButtonTone = nextAction.key === "evidence" ? "primary" : "secondary";

  return [
    '<div class="ps-next-action">',
    `<div><h3>${escapeHtml(nextAction.label)}</h3><p>${escapeHtml(nextAction.summary)}</p></div>`,
    renderStatusPill({ label: "guided step", tone: nextAction.tone }),
    "</div>",
    '<div class="ps-grid ps-stack-top">',
    '<article class="ps-panel">',
    '<h3 class="ps-panel__title">Generate readiness outputs</h3>',
    '<p class="ps-muted">Actions use saved organization data and never send anything to DNSC.</p>',
    '<div class="ps-action-list">',
    renderWorkflowActionForm({
      action: "/onboarding/romania/classify",
      disabled: !model.hasSavedProgress,
      isPrimary: nextAction.key === "classify",
      label: "Run classification",
      reason: model.hasSavedProgress ? "Creates a local classification run." : "Save progress first.",
      uiAction: "run-romania-classification"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/notification-draft",
      disabled: !model.hasSavedProgress,
      isPrimary: nextAction.key === "draft",
      label: "Generate draft",
      reason: model.hasSavedProgress ? "Builds a local notification draft. PureSOC does not submit it." : "Save progress first.",
      uiAction: "generate-romania-notification-draft"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/evaluate",
      disabled: !model.hasSavedProgress,
      isPrimary: nextAction.key === "evaluate",
      label: "Evaluate readiness",
      reason: model.hasSavedProgress ? "Refreshes the dashboard snapshot for this workspace." : "Save progress first.",
      uiAction: "evaluate-romania-readiness"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/reports/internal-readiness",
      disabled: !model.assessmentId,
      label: "JSON export",
      reason: model.assessmentId ? "Exports the current internal readiness report JSON." : "Evaluate readiness first.",
      uiAction: "generate-internal-readiness-json-export"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/reports/internal-readiness-csv",
      disabled: !model.assessmentId,
      label: "CSV export",
      reason: model.assessmentId ? "Exports gaps and readiness rows as stable CSV." : "Evaluate readiness first.",
      uiAction: "generate-internal-readiness-csv-export"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/reports/evidence-package",
      disabled: !model.assessmentId,
      label: "Evidence package",
      reason: model.assessmentId ? "Exports the local readiness bundle with configured package limits." : "Evaluate readiness first.",
      uiAction: "generate-internal-readiness-evidence-package"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/reports/notification-draft",
      disabled: !model.latestNotificationDraftId,
      label: "Draft export",
      reason: model.latestNotificationDraftId ? "Exports the local notification draft." : "Generate draft first.",
      uiAction: "generate-romania-draft-export"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/audit/checkpoint",
      disabled: false,
      label: "Record checkpoint",
      reason: "Records local audit state without provider writes.",
      uiAction: "record-audit-checkpoint"
    }),
    "</div>",
    "</article>",
    '<article class="ps-panel">',
    '<h3 class="ps-panel__title">Attach evidence</h3>',
    '<p class="ps-muted">Keep the evidence trail next to readiness outputs for review.</p>',
    '<form class="ps-form ps-form--wide" action="/onboarding/romania/evidence" method="post" data-ui-action="upload-local-evidence">',
    renderTextInput("evidenceTitle", "Evidence title", "Romania readiness note", true, "text", "Use a human-readable title for later review."),
    renderTextInput("controlId", "Control ID", "nis2.governance.risk-management", false, "text", "Optional control link for the evidence vault."),
    renderTextarea("evidenceContent", "Evidence text", "Describe the local evidence or paste a short policy excerpt.", "Keep secrets out of local evidence text."),
    renderCommandButton({ label: "Attach evidence", ariaLabel: "Attach local evidence", tone: evidenceButtonTone, type: "submit" }),
    "</form>",
    "</article>",
    "</div>",
    '<div class="ps-chip-row ps-stack-top">',
    model.evidence.latestTitles.length > 0
      ? model.evidence.latestTitles.map((title) => renderSourceChip({ label: "Latest evidence", detail: title })).join("")
      : '<div class="ps-empty-state">' + renderStatusPill({ label: "No evidence attached yet", tone: "warning" }) + "</div>",
    "</div>"
  ].join("");
};

const renderRomaniaConnectorWorkflow = (microsoft365: Microsoft365HealthSurface): string =>
  [
    '<div class="ps-next-action">',
    `<div><h3>${escapeHtml(microsoft365.providerConnectionId ? "Run read-only tenant sync" : "Connect the Microsoft tenant")}</h3><p>${escapeHtml(
      microsoft365.providerConnectionId
        ? "Use the stored tenant connection to refresh read-only Entra, M365, Intune, and Defender module status when the connector is configured."
        : "An owner or organization admin can start Microsoft Entra tenant admin consent from this workspace. Romania onboarding is not required."
    )}</p></div>`,
    renderStatusPill({ label: "tenant OAuth", tone: "accent" }),
    "</div>",
    '<div class="ps-grid ps-stack-top">',
    '<article class="ps-panel">',
    '<h3 class="ps-panel__title">Tenant connection</h3>',
    `<p>${escapeHtml(microsoft365.tenantDisplayName)}</p>`,
    `<p class="ps-muted">${escapeHtml(microsoft365.tenantId)}</p>`,
    '<div class="ps-chip-row">',
    renderStatusPill({ label: microsoft365.status.replaceAll("_", " "), tone: toneForStatus(microsoft365.status) }),
    renderStatusPill({ label: microsoft365.writeEnabled ? "write enabled" : "write disabled", tone: microsoft365.writeEnabled ? "warning" : "neutral" }),
    renderSourceChip({ label: "Connector", detail: microsoft365.connectorMode }),
    renderSourceChip({ label: "Last sync", detail: microsoft365.lastSyncAt }),
    "</div>",
    "</article>",
    '<article class="ps-panel">',
    '<h3 class="ps-panel__title">Connector actions</h3>',
    '<p class="ps-muted">The first connector is Microsoft 365 tenant OAuth. V1 keeps Graph reads separate from disabled write/remediation scopes.</p>',
    renderMicrosoft365Actions(microsoft365),
    "</article>",
    "</div>",
    renderDataTable<Microsoft365ModuleSurface>(
      "Read-only module status",
      [
        {
          header: "Module",
          render: (module) => escapeHtml(module.label)
        },
        {
          header: "Status",
          render: (module) => renderStatusPill({ label: module.status.replaceAll("_", " "), tone: toneForStatus(module.status) })
        },
        {
          header: "Coverage",
          render: (module) => escapeHtml(module.coverage)
        }
      ],
      microsoft365.modules
    )
  ].join("");

const renderRomaniaGapListWorkflow = (model: RomaniaOnboardingRouteModel): string =>
  [
    '<div class="ps-next-action" id="romania-gap-list">',
    `<div><h3>${escapeHtml(model.readinessGaps.length > 0 ? "Export the current gap list" : "No local gaps in the current view")}</h3><p>${escapeHtml(
      model.readinessGaps.length > 0
        ? "The list combines missing onboarding answers, unfinished local outputs, and Microsoft 365 connector/module status."
        : "Continue to keep evidence, connector sync, and country-pack review current before sharing outputs."
    )}</p></div>`,
    renderStatusPill({ label: "onboarding + connector", tone: model.readinessGaps.length > 0 ? "warning" : "success" }),
    "</div>",
    renderDataTable<RomaniaReadinessGapSurface>(
      "Readiness gap list",
      [
        {
          header: "Gap",
          render: (gap) => `<strong>${escapeHtml(gap.title)}</strong><br><span class="ps-muted">${escapeHtml(gap.summary)}</span>`
        },
        {
          header: "Source",
          render: (gap) => renderStatusPill({ label: gap.source, tone: gap.source === "microsoft365" ? "accent" : "info" })
        },
        {
          header: "Severity",
          render: (gap) => renderStatusPill({ label: gap.severity, tone: toneForSeverity(gap.severity) })
        },
        {
          header: "Action",
          render: (gap) => `<a class="ps-command" href="${escapeHtml(gap.actionHref)}" data-ui-action="${escapeHtml(gap.actionKey)}">${escapeHtml(
            gap.actionLabel
          )}</a>`
        }
      ],
      model.readinessGaps
    ),
    '<article class="ps-panel ps-panel--quiet ps-stack-top">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h3 class="ps-panel__title">Exports</h3><p class="ps-muted">Exports are generated from stored local assessment records and retain the internal-readiness legal caveat.</p></div>',
    renderStatusPill({ label: model.assessmentId ? "assessment ready" : "evaluate first", tone: model.assessmentId ? "success" : "warning" }),
    "</div>",
    '<div class="ps-action-list">',
    renderWorkflowActionForm({
      action: "/onboarding/romania/reports/internal-readiness",
      disabled: !model.assessmentId,
      label: "JSON export",
      reason: "Structured internal readiness report with source references.",
      uiAction: "export-gap-list-json"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/reports/internal-readiness-csv",
      disabled: !model.assessmentId,
      label: "CSV export",
      reason: "Tabular gap, recommendation, evidence, and source rows.",
      uiAction: "export-gap-list-csv"
    }),
    renderWorkflowActionForm({
      action: "/onboarding/romania/reports/evidence-package",
      disabled: !model.assessmentId,
      label: "Evidence package",
      reason: "Deterministic local package with manifest, report, CSV, and readable evidence files.",
      uiAction: "export-gap-list-evidence-package"
    }),
    "</div>",
    "</article>"
  ].join("");

const resolveRomaniaNextAction = (model: RomaniaOnboardingRouteModel): RomaniaNextAction => {
  if (!model.hasSavedProgress) {
    return {
      key: "save",
      label: "Start with saved answers",
      summary: "Save entity, scope, and contact fields before generating outputs.",
      tone: "warning"
    };
  }
  if (!model.classificationPersisted) {
    return {
      key: "classify",
      label: "Run classification",
      summary: "Persist the preliminary classification so later outputs have a traceable source.",
      tone: "info"
    };
  }
  if (!model.latestNotificationDraftId) {
    return {
      key: "draft",
      label: "Generate draft",
      summary: "Create the local notification draft while keeping DNSC submission outside PureSOC.",
      tone: "info"
    };
  }
  if (!model.assessmentId) {
    return {
      key: "evaluate",
      label: "Evaluate readiness",
      summary: "Refresh the internal dashboard snapshot from the saved Romania route.",
      tone: "info"
    };
  }
  if (model.evidence.count === 0) {
    return {
      key: "evidence",
      label: "Attach evidence",
      summary: "Add at least one review artifact so the readiness report has local support.",
      tone: "accent"
    };
  }
  if (!model.microsoft365.providerConnectionId) {
    return {
      key: "connector",
      label: "Connect Microsoft 365",
      summary: "Bring Entra, M365, Intune, and Defender read-only posture into the same readiness view.",
      tone: "accent"
    };
  }
  if (model.readinessGaps.length > 0) {
    return {
      key: "gaps",
      label: "Review gap list",
      summary: "Export onboarding and Microsoft 365 readiness gaps for follow-up.",
      tone: "warning"
    };
  }
  return {
    key: "boundaries",
    label: "Review boundaries",
    summary: "The guided flow is populated. Check unsupported states and export metadata.",
    tone: "success"
  };
};

interface WorkflowActionFormInput {
  action: string;
  disabled: boolean;
  isPrimary?: boolean;
  label: string;
  reason: string;
  uiAction: string;
}

const renderWorkflowActionForm = ({ action, disabled, isPrimary = false, label, reason, uiAction }: WorkflowActionFormInput): string =>
  [
    `<form class="ps-action-form" action="${escapeHtml(action)}" method="post" data-ui-action="${escapeHtml(uiAction)}">`,
    renderCommandButton({
      label,
      ariaLabel: label,
      disabled,
      tone: disabled || !isPrimary ? "secondary" : "primary",
      type: "submit"
    }),
    `<p class="ps-help">${escapeHtml(reason)}</p>`,
    "</form>"
  ].join("");

const renderRomaniaServiceSelector = (model: RomaniaOnboardingRouteModel): string => {
  const selectedCodes = new Set(arrayStringAnswer(model, "selectedServiceTypeCodes"));

  return [
    '<div class="ps-field ps-field--full" data-wizard-question="serviceCodes">',
    '<label for="serviceCodes">Services by sector and subsector</label>',
    '<input id="serviceSearch" type="search" placeholder="Search services" autocomplete="off" aria-controls="serviceCodes" data-ui-action="search-romania-services">',
    '<select id="serviceCodes" name="serviceCodes" multiple size="12" aria-describedby="serviceCodes-help">',
    ...model.serviceCatalogGroups.map(
      (group) =>
        `<optgroup label="${escapeHtml([group.categoryLabel, group.sectorLabel].filter(Boolean).join(" / "))}">${group.options
          .map((option) => {
            const suffix = option.subsectorLabel ? ` (${option.subsectorLabel})` : "";
            return `<option value="${escapeHtml(option.code)}"${selectedCodes.has(option.code) ? " selected" : ""}>${escapeHtml(
              `${option.label}${suffix}`
            )}</option>`;
          })
          .join("")}</optgroup>`
    ),
    "</select>",
    '<span class="ps-help" id="serviceCodes-help">Filter by sector, subsector, or service label. Hold Command or Ctrl to select more than one service.</span>',
    "</div>"
  ].join("");
};

const renderRomaniaServiceSearchScript = (): string =>
  `<script>
(() => {
  const search = document.getElementById("serviceSearch");
  const select = document.getElementById("serviceCodes");
  if (!(search instanceof HTMLInputElement) || !(select instanceof HTMLSelectElement)) {
    return;
  }

  const groups = Array.from(select.querySelectorAll("optgroup"));
  const update = () => {
    const query = search.value.trim().toLowerCase();
    groups.forEach((group) => {
      const options = Array.from(group.querySelectorAll("option"));
      let visibleCount = 0;
      options.forEach((option) => {
        const match = query.length === 0 || option.textContent?.toLowerCase().includes(query) === true;
        option.hidden = !match && !option.selected;
        if (!option.hidden) {
          visibleCount += 1;
        }
      });
      group.hidden = visibleCount === 0;
    });
  };

  search.addEventListener("input", update);
  update();
})();
</script>`;

const renderDashboardTrendScript = (): string =>
  `<script>
(() => {
  document.querySelectorAll("[data-score-trend-card]").forEach((card) => {
    const buttons = Array.from(card.querySelectorAll("[data-trend-days]"));
    const panels = Array.from(card.querySelectorAll("[data-trend-panel]"));
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.getAttribute("data-trend-days");
        buttons.forEach((candidate) => {
          candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false");
        });
        panels.forEach((panel) => {
          panel.hidden = panel.getAttribute("data-trend-panel") !== selected;
        });
      });
    });
  });
})();
</script>`;

const renderRomaniaLegalRepresentativeFields = (model: RomaniaOnboardingRouteModel): string =>
  [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Legal representative</legend>',
    '<p class="ps-help">This person represents the organization in the local readiness package.</p>',
    '<div class="ps-form-grid">',
    renderTextInput("legalRepresentativeName", "Legal representative", answerText(model, "legalRepresentative.name"), true),
    renderTextInput("legalRepresentativeRole", "Legal representative role", answerText(model, "legalRepresentative.role"), true),
    renderTextInput("legalRepresentativeEmail", "Legal representative email", answerText(model, "legalRepresentative.email"), true, "email"),
    renderTextInput("legalRepresentativePhone", "Legal representative phone", answerText(model, "legalRepresentative.phone"), true),
    "</div>",
    "</fieldset>"
  ].join("");

const renderTextInput = (
  name: string,
  label: string,
  value: string,
  required = false,
  type: "email" | "number" | "text" = "text",
  help = "",
  attributes: readonly string[] = []
): string => {
  const fieldId = escapeHtml(name);
  const helpId = `${fieldId}-help`;
  const describedBy = help ? ` aria-describedby="${helpId}"` : "";
  const extraAttributes = attributes.length > 0 ? ` ${attributes.join(" ")}` : "";

  return `<div class="ps-field" data-wizard-question="${fieldId}"><label for="${fieldId}">${escapeHtml(label)}</label><input id="${fieldId}" name="${fieldId}" type="${type}" value="${escapeHtml(
    value
  )}"${required ? " required" : ""}${describedBy}${extraAttributes}>${
    help ? `<span class="ps-help" id="${helpId}">${escapeHtml(help)}</span>` : ""
  }</div>`;
};

const renderTextarea = (name: string, label: string, value: string, help = "", className = ""): string => {
  const fieldId = escapeHtml(name);
  const helpId = `${fieldId}-help`;
  const describedBy = help ? ` aria-describedby="${helpId}"` : "";
  const classes = ["ps-field", className].filter(Boolean).join(" ");

  return `<div class="${classes}" data-wizard-question="${fieldId}"><label for="${fieldId}">${escapeHtml(label)}</label><textarea id="${fieldId}" name="${fieldId}" rows="4"${describedBy}>${escapeHtml(
    value
  )}</textarea>${help ? `<span class="ps-help" id="${helpId}">${escapeHtml(help)}</span>` : ""}</div>`;
};

const renderSelect = (
  name: string,
  label: string,
  value: string,
  options: Array<readonly [string, string]>,
  help = "",
  required = false
): string => {
  const fieldId = escapeHtml(name);
  const helpId = `${fieldId}-help`;
  const describedBy = help ? ` aria-describedby="${helpId}"` : "";

  return [
    `<div class="ps-field" data-wizard-question="${fieldId}"><label for="${fieldId}">${escapeHtml(label)}</label><select id="${fieldId}" name="${fieldId}"${required ? " required" : ""}${describedBy}>`,
    ...options.map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}"${optionValue === value ? " selected" : ""}>${escapeHtml(optionLabel)}</option>`
    ),
    `</select>${help ? `<span class="ps-help" id="${helpId}">${escapeHtml(help)}</span>` : ""}</div>`
  ].join("");
};

const renderCheckbox = (name: string, label: string, checked: boolean): string =>
  `<label class="ps-field ps-field--checkbox" data-wizard-question="${escapeHtml(name)}"><input name="${escapeHtml(name)}" type="hidden" value="false"><input name="${escapeHtml(name)}" type="checkbox" value="true"${
    checked ? " checked" : ""
  }> ${escapeHtml(label)}</label>`;

const countryAnswerText = (answers: Record<string, unknown>, path: string): string => {
  const value = valueAtPath(answers, path);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return typeof value === "string" ? value : "";
};

const countryAnswerArrayText = (answers: Record<string, unknown>, path: string): string => {
  const value = valueAtPath(answers, path);
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string").join(", ");
  }
  return typeof value === "string" ? value : "";
};

const countryAnswerBoolean = (answers: Record<string, unknown>, path: string): boolean =>
  valueAtPath(answers, path) === true;

const answerText = (model: RomaniaOnboardingRouteModel, path: string): string => {
  const value = valueAtPath(model.progress.answers, path);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return typeof value === "string" ? value : "";
};

const arrayStringAnswer = (model: RomaniaOnboardingRouteModel, path: string): string[] => {
  const value = valueAtPath(model.progress.answers, path);
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
};

const answerArrayText = (model: RomaniaOnboardingRouteModel, path: string): string => arrayStringAnswer(model, path).join(", ");

const answerBoolean = (model: RomaniaOnboardingRouteModel, path: string): boolean =>
  valueAtPath(model.progress.answers, path) === true;

const valueAtPath = (value: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, value);

const resolveOperationalConsoleCopy = (locale?: string | null): OperationalConsoleCopy => {
  const resolvedLocale = resolvePureSocLocale(locale).locale;
  const text = (messageKey: string): string => resolvePureSocMessage({ locale, messageKey }).text;

  return {
    apiSession: text(PURESOC_MESSAGE_KEYS.apiSessionLabel),
    approvalQueue: text(PURESOC_MESSAGE_KEYS.approvalQueueLabel),
    dashboard: text(PURESOC_MESSAGE_KEYS.dashboardLabel),
    email: text(PURESOC_MESSAGE_KEYS.emailLabel),
    evidenceReports: text(PURESOC_MESSAGE_KEYS.evidenceReportsLabel),
    internalReadiness: text(PURESOC_MESSAGE_KEYS.internalReadinessLabel),
    internalReadinessConsole: text(PURESOC_MESSAGE_KEYS.internalReadinessConsoleLabel),
    locale: resolvedLocale,
    password: text(PURESOC_MESSAGE_KEYS.passwordLabel),
    signIn: text(PURESOC_MESSAGE_KEYS.signInTitle),
    sourceMapped: text(PURESOC_MESSAGE_KEYS.sourceMappedLabel),
    storedAggregate: text(PURESOC_MESSAGE_KEYS.storedAggregateLabel)
  };
};

const renderSidebar = (model: OperationalConsoleModel, copy: OperationalConsoleCopy): string => {
  const items = [
    { icon: "[]", label: copy.dashboard, href: "#dashboard", action: "open-dashboard-anchor" },
    { icon: "/\\", label: "Scoping & Governance", href: "#onboarding", action: "open-onboarding-anchor" },
    { icon: "EU", label: "Country onboarding", href: "/onboarding/nis2", action: "open-nis2-country-onboarding" },
    { icon: "RO", label: "Romania onboarding", href: "/onboarding/romania/company?locale=ro-RO", action: "open-romania-onboarding" },
    { icon: "M3", label: "Microsoft 365", href: "#microsoft365", action: "open-microsoft365-anchor" },
    { icon: "!!", label: "Control Framework", href: "#gaps", action: "open-gaps-anchor" },
    { icon: "EV", label: "Evidence Vault", href: "#evidence", action: "open-evidence-reports-anchor" },
    { icon: "AP", label: copy.approvalQueue, href: "#approvals", action: "open-approval-queue-anchor" }
  ] as const;

  return [
    '<aside class="ps-sidebar" aria-label="Primary navigation">',
    '<div class="ps-brand">',
    '<span class="ps-brand__mark" aria-hidden="true">PS</span>',
    `<div class="ps-brand__identity"><p class="ps-brand__name">PureSOC</p><span class="ps-brand__meta">NIS2 Readiness</span><br><span class="ps-brand__meta">${escapeHtml(
      model.organization.primaryCountryCode
    )} workspace</span></div>`,
    "</div>",
    '<nav class="ps-nav">',
    ...items.map(
      (item, index) =>
        `<a class="ps-nav__link" href="${item.href}"${index === 0 ? ' aria-current="page"' : ""} data-ui-action="${item.action}"><span class="ps-nav__icon" aria-hidden="true">${escapeHtml(
          item.icon
        )}</span><span>${escapeHtml(item.label)}</span><span class="ps-nav__chevron" aria-hidden="true">&rsaquo;</span></a>`
    ),
    "</nav>",
    '<div class="ps-sidebar__footer">',
    '<a class="ps-command ps-command--primary" href="#evidence" data-ui-action="open-evidence-reports-anchor">Generate Report</a>',
    renderStatusPill({ label: copy.internalReadiness, tone: "accent" }),
    renderStatusPill({ label: `Plan: ${model.organization.subscriptionStatus}`, tone: "info" }),
    '<form class="ps-inline-form" action="/auth/logout" method="post" data-ui-action="sign-out">',
    renderCommandButton({ label: "Sign out", ariaLabel: "Sign out of PureSOC", tone: "secondary", type: "submit" }),
    "</form>",
    "</div>",
    "</aside>"
  ].join("");
};

const renderTopbar = (model: OperationalConsoleModel): string =>
  [
    '<header class="ps-topbar">',
    '<div>',
    '<nav class="ps-topbar__tabs" aria-label="Console views">',
    '<a class="ps-topbar__tab" href="#dashboard" aria-current="page" data-ui-action="open-dashboard-anchor">Readiness Summary</a>',
    '<a class="ps-topbar__tab" href="#evidence" data-ui-action="open-evidence-reports-anchor">Audit Trail</a>',
    "</nav>",
    "</div>",
    '<div class="ps-topbar__actions">',
    '<label class="ps-topbar__search"><span aria-hidden="true">Search</span><input type="search" placeholder="Search evidence..." aria-label="Search evidence and controls"></label>',
    renderStatusPill({ label: `Readiness: ${model.dashboard.readinessScores.overallInternalReadiness}%`, tone: "success" }),
    '<a class="ps-command" href="/partners" data-ui-action="open-partner-console">Partner portfolio</a>',
    '<a class="ps-command" href="/onboarding/nis2" data-ui-action="open-nis2-country-onboarding">Country onboarding</a>',
    '<a class="ps-command" href="/settings/notifications" data-ui-action="open-notification-settings">Notifications</a>',
    '<a class="ps-command" href="/invitations" data-ui-action="open-organization-invitations">Invite members</a>',
    '<a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">Switch workspace</a>',
    "</div>",
    "</header>"
  ].join("");

const renderInvitationCreatePanel = (model: OrganizationInvitationScreenModel, canCreate: boolean): string => {
  const activeOrganization = model.activeOrganization;

  return [
    '<article class="ps-panel ps-panel--wide" aria-labelledby="create-invitation-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="create-invitation-title">Create invitation</h2><p class="ps-muted">Owners and organization admins can invite one teammate at a time.</p></div>',
    renderStatusPill({ label: canCreate ? "ready" : "owner or admin required", tone: canCreate ? "success" : "warning" }),
    "</div>",
    activeOrganization
      ? `<p class="ps-muted">Active workspace: ${escapeHtml(activeOrganization.name)}.</p>`
      : '<p class="ps-muted">Select a workspace before creating invitations.</p>',
    '<form class="ps-form ps-form--wide" action="/invitations" method="post" data-ui-action="create-organization-invitation">',
    '<div class="ps-form-grid">',
    `<div class="ps-field"><label for="inviteEmail">Invitee email</label><input id="inviteEmail" name="email" type="email" autocomplete="email" required${canCreate ? "" : " disabled"}><span class="ps-help">The invited user must accept with this verified account email.</span></div>`,
    '<div class="ps-field"><label for="inviteRoleKey">Workspace role</label>',
    `<select id="inviteRoleKey" name="roleKey"${canCreate ? "" : " disabled"}>`,
    ...model.roleOptions.map(
      (role) =>
        `<option value="${escapeHtml(role.key)}"${role.key === "auditor" ? " selected" : ""}>${escapeHtml(role.label)}</option>`
    ),
    "</select>",
    `<span class="ps-help">${escapeHtml(model.roleOptions.map((role) => `${role.label}: ${role.summary}`).join(" "))}</span>`,
    "</div>",
    "</div>",
    renderCommandButton({
      label: "Create invite",
      ariaLabel: "Create organization invitation",
      disabled: !canCreate,
      tone: canCreate ? "primary" : "secondary",
      type: "submit"
    }),
    '<p class="ps-help">Real invitation email delivery is still deferred. The web response does not expose plaintext invitation tokens.</p>',
    "</form>",
    "</article>"
  ].join("");
};

const renderNotificationChannelCreatePanel = (model: NotificationSettingsScreenModel): string => {
  const canCreate = model.canManageChannels && Boolean(model.activeOrganization);

  return [
    '<article class="ps-panel ps-panel--wide" aria-labelledby="create-notification-channel-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="create-notification-channel-title">Add channel</h2><p class="ps-muted">Create one delivery route for this workspace.</p></div>',
    renderStatusPill({ label: canCreate ? "ready" : "owner or admin required", tone: canCreate ? "success" : "warning" }),
    "</div>",
    model.activeOrganization
      ? `<p class="ps-muted">Active workspace: ${escapeHtml(model.activeOrganization.name)}.</p>`
      : '<p class="ps-muted">Select a workspace before adding channels.</p>',
    '<form class="ps-form ps-form--wide" action="/settings/notifications/channels" method="post" data-ui-action="create-notification-channel">',
    '<div class="ps-form-grid">',
    '<div class="ps-field"><label for="notificationChannelType">Channel type</label>',
    `<select id="notificationChannelType" name="type"${canCreate ? "" : " disabled"}>`,
    '<option value="email">Email</option>',
    '<option value="slack_webhook">Slack webhook</option>',
    '<option value="teams_webhook">Teams webhook</option>',
    "</select>",
    '<span class="ps-help">Email uses the configured SMTP transport. Webhooks post directly to the saved URL.</span></div>',
    `<div class="ps-field"><label for="notificationDestination">Destination</label><input id="notificationDestination" name="destination" type="text" autocomplete="off" spellcheck="false" required${canCreate ? "" : " disabled"}><span class="ps-help">Use an email address or an HTTPS webhook URL owned by this workspace.</span></div>`,
    "</div>",
    renderCommandButton({
      label: "Add channel",
      ariaLabel: "Add notification channel",
      disabled: !canCreate,
      tone: canCreate ? "primary" : "secondary",
      type: "submit"
    }),
    "</form>",
    "</article>"
  ].join("");
};

const renderNotificationChannelListPanel = (model: NotificationSettingsScreenModel): string =>
  [
    '<article class="ps-panel" aria-labelledby="notification-channel-list-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="notification-channel-list-title">Channels</h2><p class="ps-muted">Delivery attempts are logged per channel.</p></div>',
    renderStatusPill({ label: `${model.channels.length} configured`, tone: model.channels.length > 0 ? "info" : "warning" }),
    "</div>",
    renderDataTable(
      "Notification channels",
      [
        {
          header: "Type",
          render: (channel) => escapeHtml(notificationChannelTypeLabel(channel.type))
        },
        {
          header: "Destination",
          render: (channel) => escapeHtml(channel.destination ?? channel.destinationPreview)
        },
        {
          header: "Status",
          render: (channel) =>
            renderStatusPill({ label: channel.enabled ? "enabled" : "disabled", tone: channel.enabled ? "success" : "warning" })
        },
        {
          header: "Actions",
          render: (channel) => renderNotificationChannelActions(channel.id, model.canManageChannels)
        }
      ],
      model.channels
    ),
    "</article>"
  ].join("");

const renderNotificationLogPanel = (model: NotificationSettingsScreenModel): string =>
  [
    '<article class="ps-panel ps-panel--quiet ps-stack-top" aria-labelledby="notification-log-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="notification-log-title">Recent delivery log</h2><p class="ps-muted">Last 100 send attempts for this workspace.</p></div>',
    renderStatusPill({ label: `${model.logs.length} attempts`, tone: model.logs.length > 0 ? "info" : "neutral" }),
    "</div>",
    renderDataTable(
      "Notification send attempts",
      [
        {
          header: "Event",
          render: (log) => escapeHtml(log.eventType)
        },
        {
          header: "Status",
          render: (log) => renderStatusPill({ label: log.status, tone: log.status === "sent" ? "success" : "danger" })
        },
        {
          header: "Sent",
          render: (log) => escapeHtml(formatTimestamp(log.sentAt))
        },
        {
          header: "Error",
          render: (log) => escapeHtml(log.errorMessage ?? "")
        }
      ],
      model.logs
    ),
    "</article>"
  ].join("");

const renderNotificationChannelActions = (channelId: string, canManage: boolean): string =>
  [
    '<div class="ps-chip-row">',
    `<form class="ps-inline-form" action="/settings/notifications/channels/${escapeHtml(channelId)}/test" method="post" data-ui-action="test-notification-channel">`,
    renderCommandButton({
      label: "Send test",
      ariaLabel: "Send test notification",
      disabled: !canManage,
      tone: "secondary",
      type: "submit"
    }),
    "</form>",
    `<form class="ps-inline-form" action="/settings/notifications/channels/${escapeHtml(channelId)}/delete" method="post" data-ui-action="delete-notification-channel">`,
    renderCommandButton({
      label: "Remove",
      ariaLabel: "Remove notification channel",
      disabled: !canManage,
      tone: "danger",
      type: "submit"
    }),
    "</form>",
    "</div>"
  ].join("");

const activePartnerForConsole = (model: PartnerConsoleModel) =>
  model.partners.find((entry) => entry.partner.id === model.activePartnerId) ?? model.partners[0] ?? null;

const renderActiveTenantAccessBanner = (banner?: ActiveTenantAccessBannerSurface | null): string => {
  const session = banner?.session;
  if (!banner || !session || session.status !== "active") {
    return "";
  }

  return [
    '<aside class="ps-tenant-banner" role="status" aria-label="Active customer session">',
    '<div class="ps-tenant-banner__inner">',
    `<p><strong>You are accessing ${escapeHtml(banner.customerName)} through ${escapeHtml(
      banner.partnerName
    )}.</strong> This is review-only customer access, not impersonation. Actions are logged with your real user and provider writes stay disabled.</p>`,
    '<div class="ps-chip-row ps-chip-row--compact">',
    renderStatusPill({ label: "customer session active", tone: "warning" }),
    banner.grantLevel ? renderSourceChip({ label: "Grant", detail: banner.grantLevel }) : "",
    renderSourceChip({ label: "Reason", detail: session.reason }),
    renderSourceChip({ label: "Expires", detail: formatTimestamp(session.expiresAt) }),
    "</div>",
    `<form class="ps-inline-form" action="/partners/${escapeHtml(banner.partnerId)}/tenant-sessions/${escapeHtml(
      session.id
    )}/exit" method="post" data-ui-action="exit-customer-tenant">`,
    renderCommandButton({ label: "Exit customer", ariaLabel: "Exit customer session", tone: "danger", type: "submit" }),
    "</form>",
    "</div>",
    "</aside>"
  ].join("");
};

const renderPartnerCreateOnlyPanel = (): string =>
  [
    '<div class="ps-grid">',
    renderPartnerCreatePanel(),
    '<article class="ps-panel ps-panel--quiet" aria-labelledby="partner-empty-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="partner-empty-title">No partner portfolio yet</h2><p class="ps-muted">Create a partner record to add customer companies through explicit grants.</p></div>',
    renderStatusPill({ label: "setup required", tone: "warning" }),
    "</div>",
    "<p>Customer data stays tenant-owned. Creating a partner record does not create Microsoft permissions, billing, or authority submissions.</p>",
    "</article>",
    "</div>"
  ].join("");

const renderPartnerPortfolioContent = (model: PartnerConsoleModel, canCreateCustomer: boolean): string => {
  const activePartner = activePartnerForConsole(model);
  if (!activePartner) {
    return renderPartnerCreateOnlyPanel();
  }

  return [
    renderPartnerSelector(model, activePartner.partner.id),
    '<div class="ps-grid">',
    renderPartnerMetrics(model),
    renderPartnerCreateCustomerPanel(activePartner.partner.id, canCreateCustomer),
    "</div>",
    renderPartnerOpportunityTable(model),
    renderPartnerPortfolioTable(model, activePartner.partner.id)
  ].join("");
};

const renderPartnerSelector = (model: PartnerConsoleModel, activePartnerId: string): string =>
  [
    '<article class="ps-panel ps-panel--quiet" aria-labelledby="partner-selector-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="partner-selector-title">Partner account</h2><p class="ps-muted">Portfolio actions use partner membership plus an explicit customer grant.</p></div>',
    renderStatusPill({ label: `${model.partners.length} partner${model.partners.length === 1 ? "" : "s"}`, tone: "info" }),
    "</div>",
    '<div class="ps-chip-row ps-stack-top">',
    ...model.partners.map((entry) => {
      const selected = entry.partner.id === activePartnerId;
      return `<a class="ps-command${selected ? " ps-command--primary" : ""}" href="/partners?partnerId=${escapeHtml(
        entry.partner.id
      )}" data-ui-action="select-partner">${escapeHtml(entry.partner.name)} (${escapeHtml(entry.membership.role)})</a>`;
    }),
    "</div>",
    "</article>"
  ].join("");

const renderPartnerCreatePanel = (): string =>
  [
    '<article class="ps-panel" aria-labelledby="partner-create-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="partner-create-title">Create partner</h2><p class="ps-muted">Use the business name customers recognize in audit records.</p></div>',
    renderStatusPill({ label: "owner role created", tone: "accent" }),
    "</div>",
    '<form class="ps-form" action="/partners" method="post" data-ui-action="create-partner">',
    '<div class="ps-field"><label for="partnerName">Partner name</label><input id="partnerName" name="name" type="text" autocomplete="organization" required></div>',
    '<div class="ps-field"><label for="partnerSlug">Partner slug</label><input id="partnerSlug" name="slug" type="text" autocomplete="off" spellcheck="false"><span class="ps-help">Optional. Leave blank to derive a stable identifier from the name.</span></div>',
    renderCommandButton({ label: "Create partner", ariaLabel: "Create partner account", tone: "primary", type: "submit" }),
    "</form>",
    "</article>"
  ].join("");

const renderPartnerCreateCustomerPanel = (partnerId: string, canCreateCustomer: boolean): string =>
  [
    '<article class="ps-panel" aria-labelledby="partner-create-customer-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="partner-create-customer-title">Add customer</h2><p class="ps-muted">Creates a tenant and a partner grant. It does not add workspace membership.</p></div>',
    renderStatusPill({ label: canCreateCustomer ? "owner or admin" : "viewer is read only", tone: canCreateCustomer ? "success" : "warning" }),
    "</div>",
    `<form class="ps-form" action="/partners/${escapeHtml(partnerId)}/customers" method="post" data-ui-action="create-partner-customer">`,
    '<div class="ps-form-grid">',
    `<div class="ps-field"><label for="customerName">Company name</label><input id="customerName" name="name" type="text" autocomplete="organization" required${canCreateCustomer ? "" : " disabled"}></div>`,
    `<div class="ps-field"><label for="customerLegalName">Legal name</label><input id="customerLegalName" name="legalName" type="text"${canCreateCustomer ? "" : " disabled"}></div>`,
    `<div class="ps-field"><label for="customerCountry">Country</label><input id="customerCountry" name="primaryCountryCode" type="text" maxlength="2" pattern="[A-Za-z]{2}" value="RO" autocapitalize="characters" spellcheck="false" required${canCreateCustomer ? "" : " disabled"}></div>`,
    `<div class="ps-field"><label for="customerGrantLevel">Grant level</label><select id="customerGrantLevel" name="grantLevel"${canCreateCustomer ? "" : " disabled"}><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select></div>`,
    "</div>",
    renderCommandButton({
      label: "Add customer",
      ariaLabel: "Add customer tenant",
      disabled: !canCreateCustomer,
      tone: canCreateCustomer ? "primary" : "secondary",
      type: "submit"
    }),
    "</form>",
    "</article>"
  ].join("");

const renderPartnerMetrics = (model: PartnerConsoleModel): string => {
  const activeGrants = model.portfolio.filter((row) => row.grant.status === "active").length;
  const metrics = model.metrics ?? {
    totalCustomerTenants: model.portfolio.length,
    completedAssessments: 0,
    customersLikelyOrPossiblyInScope: 0,
    connectedMicrosoftTenants: 0,
    highPriorityGaps: 0,
    opportunities: 0
  };
  return [
    '<article class="ps-panel" aria-labelledby="partner-portfolio-metrics-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="partner-portfolio-metrics-title">Portfolio state</h2><p class="ps-muted">Assessment, Microsoft, and opportunity signals are derived from tenant-owned snapshots.</p></div>',
    renderStatusPill({ label: `${metrics.totalCustomerTenants} customers`, tone: metrics.totalCustomerTenants > 0 ? "info" : "warning" }),
    "</div>",
    '<div class="ps-grid ps-grid--dense">',
    renderPartnerFact("Active grants", String(activeGrants)),
    renderPartnerFact("Assessments done", String(metrics.completedAssessments)),
    renderPartnerFact("Likely in scope", String(metrics.customersLikelyOrPossiblyInScope)),
    renderPartnerFact("Microsoft tenants", String(metrics.connectedMicrosoftTenants)),
    renderPartnerFact("High-priority gaps", String(metrics.highPriorityGaps)),
    renderPartnerFact("Opportunities", String(metrics.opportunities)),
    renderPartnerFact("Current customer", model.activeTenantAccess?.customerName ?? "None"),
    "</div>",
    "</article>"
  ].join("");
};

const renderPartnerOpportunityTable = (model: PartnerConsoleModel): string => {
  const opportunities =
    model.opportunities ??
    model.portfolio.flatMap((row) =>
      (row.snapshot?.opportunities ?? []).map((opportunity) => ({
        ...opportunity,
        customerId: row.grant.organizationId,
        customerName: row.organization?.name ?? row.grant.organizationId
      }))
    );

  return [
    '<article class="ps-panel ps-panel--wide ps-stack-top" aria-labelledby="partner-opportunities-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="partner-opportunities-title">Portfolio opportunities</h2><p class="ps-muted">Readiness opportunities only. No pricing, margin, commission, or ordering action is included.</p></div>',
    renderStatusPill({ label: `${opportunities.length} opportunity${opportunities.length === 1 ? "" : "ies"}`, tone: opportunities.length > 0 ? "accent" : "neutral" }),
    "</div>",
    opportunities.length === 0
      ? '<div class="ps-empty-state"><p class="ps-muted">No portfolio opportunities have been generated yet.</p></div>'
      : renderDataTable(
          "Partner portfolio opportunities",
          [
            {
              header: "Customer",
              render: (row) => escapeHtml(row.customerName ?? row.customerId ?? "Unknown customer")
            },
            {
              header: "Type",
              render: (row) => escapeHtml(humanizeKey(row.opportunityType))
            },
            {
              header: "Priority",
              render: (row) => renderStatusPill({ label: row.priority, tone: toneForPortfolioPriority(row.priority) })
            },
            {
              header: "Capability or plan",
              render: (row) => escapeHtml(row.relevantMicrosoftCapabilityOrPlan ?? "Partner service")
            },
            {
              header: "Users",
              render: (row) => escapeHtml(row.affectedUsers === undefined ? "Unknown" : String(row.affectedUsers))
            },
            {
              header: "NIS2 areas",
              render: (row) => escapeHtml(row.nis2Areas.join(", ") || "Not mapped")
            },
            {
              header: "Evidence source",
              render: (row) => escapeHtml(row.evidenceSource)
            },
            {
              header: "Next action",
              render: (row) => escapeHtml(row.nextAction)
            }
          ],
          opportunities
        ),
    "</article>"
  ].join("");
};

const renderPartnerPortfolioTable = (model: PartnerConsoleModel, partnerId: string): string =>
  [
    '<article class="ps-panel ps-panel--wide ps-stack-top" aria-labelledby="partner-customer-table-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="partner-customer-table-title">Customers</h2><p class="ps-muted">Open a customer only after entering a reason. Nested customer sessions are rejected by the API.</p></div>',
    renderStatusPill({ label: "logged customer sessions", tone: "accent" }),
    "</div>",
    model.portfolio.length === 0
      ? '<div class="ps-empty-state"><p class="ps-muted">No customer grants exist for this partner.</p></div>'
      : renderDataTable<PartnerPortfolioCustomerSurface>(
          "Partner customer portfolio",
          [
            {
              header: "Company",
              render: (row) => escapeHtml(row.organization?.name ?? row.grant.organizationId)
            },
            {
              header: "Country",
              render: (row) =>
                [
                  escapeHtml(row.organization?.primaryCountryCode ?? "EU"),
                  row.snapshot?.sector ? `<span class="ps-muted">${escapeHtml(row.snapshot.sector)}</span>` : ""
                ].join("<br>")
            },
            {
              header: "Scope",
              render: (row) => escapeHtml(row.snapshot?.likelyClassification ?? "Not assessed")
            },
            {
              header: "Readiness",
              render: (row) =>
                [
                  escapeHtml(formatPercent(row.snapshot?.readinessPercent)),
                  `<span class="ps-muted">Evidence ${escapeHtml(formatPercent(row.snapshot?.evidenceConfidencePercent))}</span>`
                ].join("<br>")
            },
            {
              header: "Microsoft",
              render: (row) =>
                renderStatusPill({
                  label: row.snapshot?.microsoftConnectionState ?? "disconnected",
                  tone: toneForMicrosoftConnection(row.snapshot?.microsoftConnectionState)
                })
            },
            {
              header: "Top opportunity",
              render: (row) => escapeHtml(row.snapshot?.topRecommendationOrOpportunity ?? "No recommendation yet")
            },
            {
              header: "Activity",
              render: (row) => escapeHtml(row.snapshot?.lastAssessmentOrSyncAt ? formatTimestamp(row.snapshot.lastAssessmentOrSyncAt) : "No activity yet")
            },
            {
              header: "Enter customer",
              render: (row) => renderPartnerEnterCustomerForm(partnerId, row)
            }
          ],
          model.portfolio
        ),
    "</article>"
  ].join("");

const renderPartnerEnterCustomerForm = (partnerId: string, row: PartnerPortfolioCustomerSurface): string => {
  const disabled = row.grant.status !== "active";
  const customerName = row.organization?.name ?? row.grant.organizationId;
  return [
    `<form class="ps-form ps-form--compact" action="/partners/${escapeHtml(
      partnerId
    )}/tenant-sessions" method="post" data-ui-action="enter-customer-tenant">`,
    `<input type="hidden" name="organizationId" value="${escapeHtml(row.grant.organizationId)}">`,
    `<label class="ps-sr-only" for="reason-${escapeHtml(row.grant.id)}">Reason for ${escapeHtml(customerName)}</label>`,
    `<input id="reason-${escapeHtml(row.grant.id)}" name="reason" type="text" minlength="8" placeholder="Reason for review" required${disabled ? " disabled" : ""}>`,
    renderCommandButton({
      label: "Enter",
      ariaLabel: `Enter ${customerName}`,
      disabled,
      tone: disabled ? "secondary" : "primary",
      type: "submit"
    }),
    "</form>"
  ].join("");
};

const renderPartnerFact = (title: string, value: string): string =>
  `<div class="ps-fact"><h3 class="ps-panel__title">${escapeHtml(title)}</h3><p>${escapeHtml(value)}</p></div>`;

const toneForPartnerGrant = (grantLevel: string): PureSocUiTone => {
  if (grantLevel === "admin") {
    return "accent";
  }
  if (grantLevel === "analyst") {
    return "info";
  }
  return "neutral";
};

const toneForPortfolioPriority = (priority: string): PureSocUiTone => {
  if (priority === "critical") {
    return "danger";
  }
  if (priority === "high") {
    return "warning";
  }
  if (priority === "medium") {
    return "accent";
  }
  return "neutral";
};

const toneForMicrosoftConnection = (state: string | undefined): PureSocUiTone => {
  if (state === "connected") {
    return "success";
  }
  if (state === "partial") {
    return "warning";
  }
  if (state === "error") {
    return "danger";
  }
  return "neutral";
};

const formatPercent = (value: number | undefined): string => (typeof value === "number" ? `${value}%` : "Unknown");

const humanizeKey = (value: string): string =>
  value
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const renderPartnerConsoleCss = (): string => `
.ps-form--compact {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) auto;
  gap: 0.5rem;
  align-items: end;
}

.ps-form--compact input {
  min-width: 0;
}

.ps-grid--dense {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.ps-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 720px) {
  .ps-form--compact,
  .ps-grid--dense {
    grid-template-columns: 1fr;
  }
}
`;

const notificationChannelTypeLabel = (type: string): string => {
  if (type === "slack_webhook") {
    return "Slack webhook";
  }
  if (type === "teams_webhook") {
    return "Teams webhook";
  }
  return "Email";
};

const formatTimestamp = (value: string): string => {
  if (!value) {
    return "";
  }
  return value.replace("T", " ").replace(".000Z", "Z");
};

const renderInvitationAcceptPanel = (model: OrganizationInvitationScreenModel): string => {
  const defaultOrganizationId = model.acceptOrganizationId ?? model.activeOrganization?.id ?? "";

  return [
    '<article class="ps-panel" aria-labelledby="accept-invitation-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="accept-invitation-title">Accept invitation</h2><p class="ps-muted">Sign in with the invited and verified email before accepting.</p></div>',
    renderStatusPill({ label: "token required", tone: "warning" }),
    "</div>",
    '<form class="ps-form" action="/invitations/accept" method="post" data-ui-action="accept-organization-invitation">',
    `<div class="ps-field"><label for="acceptOrganizationId">Organization ID</label><input id="acceptOrganizationId" name="organizationId" type="text" value="${escapeHtml(
      defaultOrganizationId
    )}" required spellcheck="false"><span class="ps-help">Use the organization ID from the invitation delivery path.</span></div>`,
    '<div class="ps-field"><label for="invitationToken">Invitation token</label><input id="invitationToken" name="token" type="text" autocomplete="one-time-code" required><span class="ps-help">The token is submitted to the API and is not echoed back into this page.</span></div>',
    renderCommandButton({
      label: "Accept invite",
      ariaLabel: "Accept organization invitation",
      tone: "primary",
      type: "submit"
    }),
    "</form>",
    "</article>"
  ].join("");
};

const renderInvitationWorkspacePanel = (model: OrganizationInvitationScreenModel): string =>
  [
    '<article class="ps-panel ps-panel--quiet ps-stack-top" aria-labelledby="invitation-workspace-state-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="invitation-workspace-state-title">Workspace state</h2><p class="ps-muted">Invitation operations keep using API session and RBAC checks.</p></div>',
    renderStatusPill({ label: model.roleKeys.length > 0 ? model.roleKeys.join(", ") : "no active role", tone: model.roleKeys.length > 0 ? "info" : "warning" }),
    "</div>",
    model.activeOrganization
      ? `<p>${escapeHtml(model.activeOrganization.name)} is selected for this browser session.</p>`
      : '<p>No active workspace is selected. You can still accept an invitation when you have its organization ID and token.</p>',
    '<div class="ps-chip-row">',
    model.activeOrganization ? renderSourceChip({ label: "Organization", detail: model.activeOrganization.id }) : "",
    renderStatusPill({ label: `${model.organizations.length} active memberships`, tone: "neutral" }),
    renderStatusPill({ label: "signed-in account", tone: "info" }),
    "</div>",
    '<p class="ps-stack-top"><a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">Open workspace selector</a></p>',
    "</article>"
  ].join("");

const renderWorkspaceSelectionPanel = (
  organization: WorkspaceSelectionModel["organizations"][number],
  activeOrganizationId: string | null
): string => {
  const roleSummary = organization.roleKeys.length > 0 ? organization.roleKeys.join(", ") : "member";
  const selected = organization.id === activeOrganizationId || organization.isActive;

  return [
    '<article class="ps-panel">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h3 class="ps-panel__title">${escapeHtml(organization.name)}</h3><p class="ps-muted">${escapeHtml(
      organization.primaryCountryCode ?? "EU"
    )} workspace | ${escapeHtml(roleSummary)}</p></div>`,
    renderStatusPill({ label: selected ? "active" : organization.membershipStatus, tone: selected ? "success" : "info" }),
    "</div>",
    '<details class="ps-disclosure ps-trace">',
    '<summary>Trace</summary>',
    '<div class="ps-chip-row ps-stack-top">',
    renderSourceChip({ label: "Organization", detail: organization.id }),
    renderStatusPill({ label: `Billing ${organization.billingStatus}`, tone: "neutral" }),
    "</div>",
    "</details>",
    `<form class="ps-form ps-stack-top" action="/workspaces/select" method="post" data-organization-id="${escapeHtml(
      organization.id
    )}">`,
    `<input type="hidden" name="organizationId" value="${escapeHtml(organization.id)}">`,
    `<button type="submit" class="ps-command${selected ? "" : " ps-command--primary"}" aria-label="${escapeHtml(
      `Open ${organization.name}`
    )}" data-ui-action="select-workspace" data-organization-id="${escapeHtml(organization.id)}"><span>${escapeHtml(
      selected ? "Open active workspace" : "Open workspace"
    )}</span></button>`,
    "</form>",
    "</article>"
  ].join("");
};

const renderDashboardSection = (model: OperationalConsoleModel, copy: OperationalConsoleCopy): string => {
  const scores = model.dashboard.readinessScores;
  const scoreMeters = [
    ["EU applicability", scores.euApplicability],
    ["Country pack", scores.countryPackCompleteness],
    ["Technical posture", scores.technicalPosture],
    ["Process", scores.processCompliance],
    ["Evidence", scores.evidenceCompleteness],
    ["Overall internal readiness", scores.overallInternalReadiness]
  ] as const;

  return [
    '<section class="ps-section ps-section--dashboard" id="dashboard" data-ui-section="dashboard" aria-labelledby="dashboard-title">',
    '<div class="ps-section__body">',
    '<div class="ps-page-hero">',
    `<div><h1 class="ps-section__title" id="dashboard-title">Readiness Overview</h1><p>Executive summary of NIS2 readiness posture for ${escapeHtml(
      model.organization.name
    )}.</p></div>`,
    '<div class="ps-command-row">',
    renderSourceChip({ label: copy.storedAggregate, detail: model.dashboard.snapshotType }),
    renderSourceChip({ label: "Session", detail: `${model.user.displayName} | ${model.user.role}` }),
    model.runtimeSource ? renderSourceChip(model.runtimeSource) : "",
    renderSourceChip({ label: "Dashboard source", detail: model.dashboard.source }),
    '<a class="ps-command ps-command--primary" href="#approvals" data-ui-action="open-approval-queue-anchor">View Action Workflows</a>',
    "</div>",
    "</div>",
    renderDashboardNextAction(model),
    renderScoreTrendPanel(model.dashboardHistory),
    '<div class="ps-dashboard-grid ps-stack-top">',
    '<article class="ps-panel ps-readiness-ring-card" aria-labelledby="readiness-score-title">',
    '<h2 class="ps-panel__title" id="readiness-score-title">Overall Readiness Score</h2>',
    renderReadinessRing({
      caption: copy.internalReadiness,
      label: "Overall readiness score",
      value: scores.overallInternalReadiness
    }),
    '<div class="ps-readiness-ring-card__footer"><span>Target: 100% by Q4</span><strong>+4% this month</strong></div>',
    "</article>",
    '<article class="ps-panel" aria-labelledby="critical-gaps-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="critical-gaps-title">Critical Gaps</h2><p class="ps-muted">Highest-priority readiness work from current gap records.</p></div>',
    '<a class="ps-command" href="#gaps" data-ui-action="open-gaps-anchor">View All Gaps</a>',
    "</div>",
    '<div class="ps-critical-list">',
    ...model.gaps.slice(0, 3).map(renderCriticalGapCard),
    "</div>",
    "</article>",
    "</div>",
    '<div class="ps-dashboard-secondary-grid ps-stack-top">',
    '<article class="ps-panel" aria-labelledby="obligation-roadmap-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="obligation-roadmap-title">Obligation Roadmap</h2><p class="ps-muted">Planned actions generated from recommendations and country-pack state.</p></div>',
    renderStatusPill({ label: "readiness plan", tone: "accent" }),
    "</div>",
    '<div class="ps-roadmap-grid">',
    renderRoadmapCard({
      due: "Due in 14 days",
      title: model.gaps[0]?.title ?? "Review critical evidence gaps",
      status: "Urgent",
      tone: "urgent"
    }),
    renderRoadmapCard({
      due: "Due in 45 days",
      title: model.recommendations[0]?.title ?? "Run annual risk assessment",
      status: "In progress",
      tone: "active"
    }),
    renderRoadmapCard({
      due: "Due in 90 days",
      title: model.recommendations[1]?.title ?? "Tabletop exercise",
      status: "Planned",
      tone: "planned"
    }),
    "</div>",
    "</article>",
    '<article class="ps-panel ps-evidence-health" aria-labelledby="evidence-health-title">',
    '<h2 class="ps-panel__title" id="evidence-health-title">Evidence Health</h2>',
    `<p class="ps-evidence-health__value">${escapeHtml(scores.evidenceCompleteness)}%</p>`,
    '<p class="ps-muted">Evidence completeness from stored analysis records</p>',
    '<div class="ps-evidence-bars ps-stack-top">',
    `<div class="ps-evidence-bar"><span class="ps-evidence-bar__label"><span>Microsoft 365 Connector</span><span>${escapeHtml(
      scores.technicalPosture
    )}%</span></span>${renderMeter({ label: "Microsoft 365 Connector", value: scores.technicalPosture, source: "provider module health" })}</div>`,
    `<div class="ps-evidence-bar"><span class="ps-evidence-bar__label"><span>Evidence Vault</span><span>${escapeHtml(
      scores.evidenceCompleteness
    )}%</span></span>${renderMeter({ label: "Evidence Vault", value: scores.evidenceCompleteness, source: "evidence_artifacts" })}</div>`,
    "</div>",
    '<div class="ps-evidence-health__scanner">',
    '<div class="ps-evidence-health__scanner-header">',
    `<strong>${escapeHtml(model.evidenceScanner.label)}</strong>`,
    renderStatusPill({ label: model.evidenceScanner.status, tone: toneForStatus(model.evidenceScanner.status) }),
    "</div>",
    `<p class="ps-muted">${escapeHtml(model.evidenceScanner.detail)}</p>`,
    '<div class="ps-evidence-health__scanner-meta">',
    renderSourceChip({ label: "Scanner", detail: model.evidenceScanner.engine }),
    model.evidenceScanner.signatureSource
      ? renderSourceChip({ label: "Signatures", detail: model.evidenceScanner.signatureSource })
      : "",
    "</div>",
    "</div>",
    renderSourceChip({ label: "Dashboard source", detail: model.dashboard.source }),
    "</article>",
    "</div>",
    '<div class="ps-score-grid ps-stack-top" aria-label="Readiness score breakdown">',
    ...scoreMeters.map(([label, value]) => `<div class="ps-panel">${renderMeter({ label, value, source: "dashboard_snapshots" })}</div>`),
    "</div>",
    '<div class="ps-grid ps-stack-top">',
    ...model.dashboard.widgets.map(renderDashboardWidget),
    "</div>",
    "</div>",
    "</section>"
  ].join("");
};

const renderDashboardNextAction = (model: OperationalConsoleModel): string => {
  const readiness = model.dashboard.readinessScores.overallInternalReadiness;
  const romaniaCompleteness = model.onboarding.romania.completeness;
  const label = romaniaCompleteness < 100 ? "Continue onboarding" : "Review evidence";
  const href = romaniaCompleteness < 100 ? "/onboarding/nis2" : "#evidence";
  const action = romaniaCompleteness < 100 ? "open-nis2-country-onboarding" : "open-evidence-reports-anchor";
  const summary =
    readiness >= 75
      ? "Internal readiness is in a reviewable range. Keep the evidence trail current before sharing exports."
      : "The fastest path to a useful snapshot is completing the short NIS2 wizard, then generating readiness outputs.";

  return [
    '<div class="ps-next-action">',
    `<div><h3>Next best action</h3><p>${escapeHtml(summary)}</p></div>`,
    `<a class="ps-command ps-command--primary" href="${escapeHtml(href)}" data-ui-action="${escapeHtml(action)}">${escapeHtml(label)}</a>`,
    "</div>"
  ].join("");
};

const trendRanges = [30, 90, 180] as const;

const renderScoreTrendPanel = (history: DashboardSnapshotHistoryPoint[]): string => {
  const points = normalizeTrendHistory(history);
  const defaultDays = 30;

  return [
    '<article class="ps-panel ps-trend-card ps-stack-top" aria-labelledby="score-trend-title" data-score-trend-card>',
    '<div class="ps-section__header ps-section__header--flat ps-trend-card__header">',
    '<div><h2 class="ps-panel__title" id="score-trend-title">Readiness Score Trend</h2><p class="ps-muted">Daily internal-readiness snapshots from stored assessment outputs.</p></div>',
    '<div class="ps-trend-toggle-row" role="group" aria-label="Trend window">',
    ...trendRanges.map(
      (days) =>
        `<button type="button" class="ps-trend-toggle" data-trend-days="${days}" aria-pressed="${days === defaultDays ? "true" : "false"}">${days} days</button>`
    ),
    "</div>",
    "</div>",
    ...trendRanges.map((days) => renderTrendRangePanel(points, days, days === defaultDays)),
    "</article>"
  ].join("");
};

const renderTrendRangePanel = (
  points: DashboardSnapshotHistoryPoint[],
  days: (typeof trendRanges)[number],
  active: boolean
): string => {
  const rangePoints = filterTrendRange(points, days);
  const hidden = active ? "" : " hidden";

  if (rangePoints.length < 3) {
    return [
      `<div class="ps-trend-panel"${hidden} data-trend-panel="${days}">`,
      '<div class="ps-trend-empty" role="status">',
      '<div><h3 class="ps-panel__title">Not enough data</h3>',
      `<p class="ps-muted">At least 3 daily snapshots are needed for the ${days}-day trend. ${rangePoints.length} available.</p></div>`,
      renderStatusPill({ label: "collecting snapshots", tone: "warning" }),
      "</div>",
      "</div>"
    ].join("");
  }

  return [
    `<div class="ps-trend-panel"${hidden} data-trend-panel="${days}">`,
    renderTrendSvg(rangePoints),
    renderTrendStatRow(rangePoints, days),
    "</div>"
  ].join("");
};

const renderTrendSvg = (points: DashboardSnapshotHistoryPoint[]): string => {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return "";
  }

  const width = 760;
  const height = 280;
  const plot = {
    left: 50,
    right: 56,
    top: 22,
    bottom: 42
  };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const maxCritical = Math.max(1, ...points.map((point) => point.critical_gaps));
  const movement = last.overall_score - first.overall_score;
  const scoreTone = movement > 0 ? "up" : movement < 0 ? "down" : "flat";
  const xFor = (index: number): number =>
    plot.left + (points.length === 1 ? 0 : (index / (points.length - 1)) * plotWidth);
  const scoreY = (score: number): number => plot.top + ((100 - score) / 100) * plotHeight;
  const criticalY = (count: number): number => plot.top + ((maxCritical - count) / maxCritical) * plotHeight;
  const scoreLine = points.map((point, index) => `${roundChart(xFor(index))},${roundChart(scoreY(point.overall_score))}`).join(" ");
  const criticalLine = points
    .map((point, index) => `${roundChart(xFor(index))},${roundChart(criticalY(point.critical_gaps))}`)
    .join(" ");

  return [
    `<div class="ps-trend-chart ps-trend-chart--${scoreTone}">`,
    '<svg class="ps-trend-svg" viewBox="0 0 760 280" role="img" aria-labelledby="trend-svg-title trend-svg-desc">',
    '<title id="trend-svg-title">Readiness score trend chart</title>',
    `<desc id="trend-svg-desc">Score line from ${first.overall_score} to ${last.overall_score}; critical gaps from ${first.critical_gaps} to ${last.critical_gaps}.</desc>`,
    `<line class="ps-trend-axis" x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${height - plot.bottom}"></line>`,
    `<line class="ps-trend-axis" x1="${width - plot.right}" y1="${plot.top}" x2="${width - plot.right}" y2="${height - plot.bottom}"></line>`,
    `<line class="ps-trend-axis" x1="${plot.left}" y1="${height - plot.bottom}" x2="${width - plot.right}" y2="${height - plot.bottom}"></line>`,
    ...[0, 50, 100].map((value) => {
      const y = scoreY(value);
      return [
        `<line class="ps-trend-gridline" x1="${plot.left}" y1="${roundChart(y)}" x2="${width - plot.right}" y2="${roundChart(y)}"></line>`,
        `<text class="ps-trend-axis-label ps-trend-axis-label--left" x="${plot.left - 10}" y="${roundChart(y + 4)}">${value}</text>`
      ].join("");
    }),
    `<text class="ps-trend-axis-label ps-trend-axis-label--right" x="${width - plot.right + 10}" y="${plot.top + 4}">${maxCritical}</text>`,
    `<text class="ps-trend-axis-label ps-trend-axis-label--right" x="${width - plot.right + 10}" y="${height - plot.bottom + 4}">0</text>`,
    `<polyline class="ps-trend-line ps-trend-line--score" points="${scoreLine}"></polyline>`,
    `<polyline class="ps-trend-line ps-trend-line--critical" points="${criticalLine}"></polyline>`,
    ...points.map((point, index) => renderTrendPoint(point, xFor(index), scoreY(point.overall_score))),
    `<text class="ps-trend-date-label" x="${plot.left}" y="${height - 10}">${escapeHtml(formatTrendDate(first.date))}</text>`,
    `<text class="ps-trend-date-label ps-trend-date-label--end" x="${width - plot.right}" y="${height - 10}">${escapeHtml(
      formatTrendDate(last.date)
    )}</text>`,
    "</svg>",
    '<div class="ps-trend-legend" aria-label="Chart legend">',
    '<span><i class="ps-trend-legend__swatch ps-trend-legend__swatch--score" aria-hidden="true"></i>Readiness score</span>',
    '<span><i class="ps-trend-legend__swatch ps-trend-legend__swatch--critical" aria-hidden="true"></i>Critical gaps</span>',
    "</div>",
    "</div>"
  ].join("");
};

const renderTrendPoint = (point: DashboardSnapshotHistoryPoint, x: number, y: number): string => {
  const tooltipWidth = 168;
  const tooltipHeight = 48;
  const tooltipX = x > 580 ? x - tooltipWidth - 10 : x + 10;
  const tooltipY = y < 72 ? y + 16 : y - tooltipHeight - 10;
  const label = `${point.date}: score ${point.overall_score}, critical gaps ${point.critical_gaps}, high gaps ${point.high_gaps}`;

  return [
    `<g class="ps-trend-point" tabindex="0" aria-label="${escapeHtml(label)}">`,
    `<circle class="ps-trend-point__dot" cx="${roundChart(x)}" cy="${roundChart(y)}" r="4.5"></circle>`,
    '<g class="ps-trend-tooltip" aria-hidden="true">',
    `<rect x="${roundChart(tooltipX)}" y="${roundChart(tooltipY)}" width="${tooltipWidth}" height="${tooltipHeight}" rx="4"></rect>`,
    `<text x="${roundChart(tooltipX + 8)}" y="${roundChart(tooltipY + 17)}">`,
    `<tspan x="${roundChart(tooltipX + 8)}">${escapeHtml(point.date)}</tspan>`,
    `<tspan x="${roundChart(tooltipX + 8)}" dy="15">Score ${point.overall_score} | Critical ${point.critical_gaps} | High ${point.high_gaps}</tspan>`,
    "</text>",
    "</g>",
    "</g>"
  ].join("");
};

const renderTrendStatRow = (points: DashboardSnapshotHistoryPoint[], days: number): string => {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return "";
  }

  const delta = last.overall_score - first.overall_score;
  const movement = delta > 0 ? "improved" : delta < 0 ? "declined" : "unchanged";
  const signedDelta = delta > 0 ? `+${delta}` : String(delta);
  const tone = delta > 0 ? "success" : delta < 0 ? "danger" : "warning";

  return [
    '<div class="ps-trend-stat-row">',
    `<p class="ps-trend-stat__summary">Score ${movement} ${signedDelta} points in the last ${days} days</p>`,
    '<div class="ps-chip-row">',
    renderStatusPill({ label: `${first.overall_score} -> ${last.overall_score} score`, tone }),
    renderStatusPill({ label: `${first.critical_gaps} -> ${last.critical_gaps} critical gaps`, tone: last.critical_gaps <= first.critical_gaps ? "success" : "danger" }),
    renderStatusPill({ label: `${first.high_gaps} -> ${last.high_gaps} high gaps`, tone: last.high_gaps <= first.high_gaps ? "success" : "warning" }),
    "</div>",
    "</div>"
  ].join("");
};

const normalizeTrendHistory = (history: DashboardSnapshotHistoryPoint[]): DashboardSnapshotHistoryPoint[] => {
  const byDate = new Map<string, DashboardSnapshotHistoryPoint>();
  for (const point of history) {
    if (!isIsoDate(point.date)) {
      continue;
    }
    byDate.set(point.date, {
      date: point.date,
      overall_score: clampPercent(point.overall_score),
      critical_gaps: nonNegativeTrendInteger(point.critical_gaps),
      high_gaps: nonNegativeTrendInteger(point.high_gaps)
    });
  }

  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
};

const filterTrendRange = (
  points: DashboardSnapshotHistoryPoint[],
  days: (typeof trendRanges)[number]
): DashboardSnapshotHistoryPoint[] => {
  const latest = points[points.length - 1];
  if (!latest) {
    return [];
  }

  const earliestMs = trendDateMs(latest.date) - (days - 1) * 86_400_000;
  return points.filter((point) => trendDateMs(point.date) >= earliestMs);
};

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(trendDateMs(value));

const trendDateMs = (date: string): number => new Date(`${date}T00:00:00.000Z`).getTime();

const formatTrendDate = (date: string): string => `${date.slice(5, 7)}/${date.slice(8, 10)}`;

const nonNegativeTrendInteger = (value: number): number => Math.max(0, Math.round(value));

const roundChart = (value: number): string => Number(value.toFixed(1)).toString();

const renderReadinessRing = ({ caption, label, value }: { caption: string; label: string; value: number }): string => {
  const percent = clampPercent(value);

  return [
    `<div class="ps-readiness-ring" role="meter" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" style="--ps-ring-value: ${percent};">`,
    '<div class="ps-readiness-ring__label">',
    `<span class="ps-readiness-ring__value">${percent}%</span>`,
    `<span class="ps-readiness-ring__caption">${escapeHtml(caption)}</span>`,
    "</div>",
    "</div>"
  ].join("");
};

const renderCriticalGapCard = (gap: GapSurface): string => {
  const toneClass = gap.severity === "high" || gap.severity === "critical" ? "ps-critical-gap--high" : "ps-critical-gap--medium";

  return [
    `<article class="ps-critical-gap ${toneClass}">`,
    '<span class="ps-critical-gap__dot" aria-hidden="true"></span>',
    `<div><h3 class="ps-panel__title">${escapeHtml(gap.title)}</h3><p>${escapeHtml(gap.summary)}</p><div class="ps-chip-row ps-stack-top">${renderStatusPill({
      label: gap.controlId,
      tone: "neutral"
    })}${renderStatusPill({ label: gap.severity, tone: toneForSeverity(gap.severity) })}</div></div>`,
    `<a class="ps-command" href="#gaps" data-ui-action="open-gaps-anchor">${gap.severity === "high" ? "Plan Action" : "Review"}</a>`,
    "</article>"
  ].join("");
};

const renderRoadmapCard = ({
  due,
  status,
  title,
  tone
}: {
  due: string;
  status: string;
  title: string;
  tone: "active" | "planned" | "urgent";
}): string =>
  [
    `<article class="ps-roadmap-card ps-roadmap-card--${tone}">`,
    `<span class="ps-source-detail">${escapeHtml(due)}</span>`,
    `<strong>${escapeHtml(title)}</strong>`,
    '<div class="ps-chip-row">',
    renderStatusPill({ label: status, tone: tone === "urgent" ? "danger" : tone === "planned" ? "success" : "info" }),
    '<span aria-hidden="true">-&gt;</span>',
    "</div>",
    "</article>"
  ].join("");

const renderDashboardWidget = (widget: DashboardWidgetContract): string =>
  [
    '<article class="ps-panel">',
    `<h3 class="ps-panel__title">${escapeHtml(widget.title)}</h3>`,
    `<p class="ps-dashboard-number">${escapeHtml(widget.value)}</p>`,
    '<div class="ps-chip-row">',
    widget.severity ? renderStatusPill({ label: widget.severity, tone: toneForSeverity(widget.severity) }) : "",
    renderSourceChip({ label: "Query", detail: widget.sourceQuery }),
    "</div>",
    "</article>"
  ].join("");

const renderOnboardingSection = (model: OperationalConsoleModel, copy: OperationalConsoleCopy): string =>
  renderSection({
    id: "onboarding",
    title: "Onboarding And Country Packs",
    eyebrow: renderStatusPill({ label: copy.sourceMapped, tone: "accent" }),
    body: [
      '<div class="ps-grid">',
      renderOnboardingPanel(model.onboarding.eu),
      renderOnboardingPanel(model.onboarding.romania),
      "</div>",
      '<p class="ps-stack-top"><a class="ps-command ps-command--primary" href="/onboarding/nis2" data-ui-action="open-nis2-country-onboarding">Open country onboarding</a> <a class="ps-command" href="/onboarding/romania/company?locale=ro-RO" data-ui-action="open-romania-onboarding">Open Romania saved workflow</a></p>',
      renderDataTable<CountryPackSurface>(
        "Country pack status",
        [
          {
            header: "Country",
            render: (country) => `${escapeHtml(country.countryName)} <span class="ps-muted">${escapeHtml(country.countryCode)}</span>`
          },
          {
            header: "Status",
            render: (country) => renderStatusPill({ label: country.status.replaceAll("_", " "), tone: toneForStatus(country.status) })
          },
          {
            header: "Classification",
            render: (country) => escapeHtml(country.classification)
          },
          {
            header: "Completeness",
            render: (country) => renderMeter({ label: `${country.countryCode} completeness`, value: country.completeness, source: "country_pack_versions" })
          },
          {
            header: "Source review",
            render: (country) => `${escapeHtml(country.sourceReview)}${renderSources(country.sourceReferences)}`
          },
          {
            header: "Unsupported",
            render: (country) => country.unsupportedAreas.map((area) => renderStatusPill({ label: area, tone: "warning" })).join(" ")
          }
        ],
        model.onboarding.countryPacks
      )
    ].join("")
  });

const renderOnboardingPanel = (item: OnboardingSurface): string =>
  [
    '<article class="ps-panel">',
    `<h3 class="ps-panel__title">${escapeHtml(item.title)}</h3>`,
    renderStatusPill({ label: item.status.replaceAll("_", " "), tone: toneForStatus(item.status) }),
    `<p>${escapeHtml(item.summary)}</p>`,
    renderMeter({ label: "Completeness", value: item.completeness, source: "regulatory_answers" }),
    renderSources(item.sourceReferences),
    "</article>"
  ].join("");

const renderMicrosoft365Section = (model: OperationalConsoleModel): string =>
  renderSection({
    id: "microsoft365",
    title: "Microsoft 365 Connection Health",
    eyebrow: renderStatusPill({
      label: model.microsoft365.status.replaceAll("_", " "),
      tone: toneForStatus(model.microsoft365.status)
    }),
    body: [
      '<div class="ps-grid">',
      '<article class="ps-panel">',
      '<h3 class="ps-panel__title">Tenant</h3>',
      `<p>${escapeHtml(model.microsoft365.tenantDisplayName)}</p>`,
      `<p class="ps-muted">${escapeHtml(model.microsoft365.tenantId)}</p>`,
      '<div class="ps-chip-row">',
      model.microsoft365.providerConnectionId
        ? renderStatusPill({ label: "provider connected", tone: "success" })
        : renderStatusPill({ label: "provider disabled", tone: "warning" }),
      renderSourceChip({ label: "Last sync", detail: model.microsoft365.lastSyncAt }),
      renderSourceChip({ label: "Connector", detail: model.microsoft365.connectorMode }),
      "</div>",
      "</article>",
      '<article class="ps-panel">',
      '<h3 class="ps-panel__title">Permission bundles</h3>',
      '<div class="ps-chip-row">',
      ...model.microsoft365.permissionBundles.map((bundle) => renderStatusPill({ label: bundle, tone: "info" })),
      renderStatusPill({ label: model.microsoft365.writeEnabled ? "write enabled" : "write disabled", tone: model.microsoft365.writeEnabled ? "warning" : "neutral" }),
      "</div>",
      "</article>",
      "</div>",
      renderMicrosoft365Actions(model.microsoft365),
      renderMicrosoft365ConnectorSetup(),
      renderDataTable<Microsoft365ModuleSurface>(
        "Microsoft module health",
        [
          {
            header: "Module",
            render: (module) => escapeHtml(module.label)
          },
          {
            header: "Status",
            render: (module) => renderStatusPill({ label: module.status.replaceAll("_", " "), tone: toneForStatus(module.status) })
          },
          {
            header: "Coverage",
            render: (module) => escapeHtml(module.coverage)
          },
          {
            header: "Source",
            render: (module) => renderSourceChip({ label: "Stored module", detail: module.sourceQuery })
          }
        ],
        model.microsoft365.modules
      )
    ].join("")
  });

const renderMicrosoft365Actions = (microsoft365: Microsoft365HealthSurface): string => {
  if (microsoft365.providerConnectionId) {
    return [
      '<div class="ps-command-row ps-stack-top">',
      `<form class="ps-inline-form" action="/providers/microsoft365/sync" method="post" data-ui-action="sync-microsoft365-read-only">`,
      `<input type="hidden" name="providerConnectionId" value="${escapeHtml(microsoft365.providerConnectionId)}">`,
      renderCommandButton({
        label: "Run read-only sync",
        ariaLabel: "Run Microsoft 365 read-only connector sync",
        tone: "primary",
        type: "submit"
      }),
      "</form>",
      renderCommandButton({
        label: "Write actions disabled",
        ariaLabel: "Microsoft 365 write actions are disabled until approval safety gates are enabled",
        disabled: true
      }),
      "</div>"
    ].join("");
  }

  return [
    '<div class="ps-command-row ps-stack-top">',
    `<form class="ps-inline-form" action="/providers/microsoft365/connect" method="post" data-ui-action="connect-microsoft365-tenant">`,
    renderCommandButton({
      label: "Connect Microsoft 365",
      ariaLabel: "Connect Microsoft 365 with tenant admin consent",
      tone: "primary",
      type: "submit"
    }),
    "</form>",
    renderCommandButton({
      label: "Write actions disabled",
      ariaLabel: "Microsoft 365 write actions are disabled until approval safety gates are enabled",
      disabled: true
    }),
    "</div>"
  ].join("");
};

interface Microsoft365ConnectorSetupRow {
  item: string;
  value: string;
  detail: string;
}

const microsoft365ConnectorSetupRows: readonly Microsoft365ConnectorSetupRow[] = [
  {
    item: "PureSOC platform app",
    value: "Multitenant connector application",
    detail: "The PureSOC deployment owns the Microsoft Entra app registration; customer tenants do not create one."
  },
  {
    item: "Global admin approval",
    value: "Microsoft admin consent",
    detail: "A tenant global admin signs in and approves the requested Microsoft Graph application permissions."
  },
  {
    item: "Read-only bundles",
    value: "Baseline, security, Intune",
    detail: "The first connection asks for V1 read-only bundles only; remediation write bundles are disabled."
  },
  {
    item: "Token storage",
    value: "Encrypted ProviderConnection credential",
    detail: "PureSOC stores tenant ID, consent metadata, permission bundles, and encrypted token metadata per workspace."
  },
  {
    item: "Graph reads",
    value: "Module-level health",
    detail: "Missing permissions, licenses, or unsupported endpoints become module status rather than a full connector failure."
  }
];

const renderMicrosoft365ConnectorSetup = (): string =>
  [
    '<div class="ps-stack-top">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h3 class="ps-panel__title">Consent model</h3><p class="ps-muted">Connect each customer tenant through Microsoft OAuth admin consent without creating customer-owned Azure app registrations.</p></div>',
    '<div class="ps-chip-row">',
    renderStatusPill({ label: "platform app", tone: "info" }),
    renderStatusPill({ label: "tenant OAuth per workspace", tone: "accent" }),
    renderStatusPill({ label: "read-only first", tone: "success" }),
    "</div>",
    "</div>",
    renderDataTable<Microsoft365ConnectorSetupRow>(
      "Microsoft 365 admin consent model",
      [
        {
          header: "Item",
          render: (row) => escapeHtml(row.item)
        },
        {
          header: "Model",
          render: (row) => escapeHtml(row.value)
        },
        {
          header: "Operational note",
          render: (row) => escapeHtml(row.detail)
        }
      ],
      microsoft365ConnectorSetupRows
    ),
    '<p class="ps-help">Admin consent redirects use Microsoft identity platform v2 with Microsoft Graph /.default application permissions. Background Graph reads use the tenant grant with the client credentials flow.</p>',
    "</div>"
  ].join("");

const renderGapsAndRecommendationsSection = (model: OperationalConsoleModel): string =>
  renderSection({
    id: "gaps",
    title: "Gaps And Recommendations",
    eyebrow: renderSourceChip({ label: "Generated from", detail: "compliance_gaps + provider_recommendations" }),
    body: [
      renderDataTable<GapSurface>(
        "Open compliance gaps",
        [
          {
            header: "Control",
            render: (gap) => `<strong>${escapeHtml(gap.title)}</strong><br><span class="ps-muted">${escapeHtml(gap.controlId)} | ${escapeHtml(gap.jurisdiction)}</span>`
          },
          {
            header: "Severity",
            render: (gap) => renderStatusPill({ label: gap.severity, tone: toneForSeverity(gap.severity) })
          },
          {
            header: "State",
            render: (gap) => `${renderStatusPill({ label: gap.status, tone: toneForStatusText(gap.status) })}<br><span class="ps-muted">Confidence: ${escapeHtml(gap.confidence)}</span>`
          },
          {
            header: "Source",
            render: (gap) => `${escapeHtml(gap.summary)}${renderSources(gap.sourceReferences)}`
          }
        ],
        model.gaps
      ),
      renderDataTable<RecommendationSurface>(
        "Recommendation backlog",
        [
          {
            header: "Recommendation",
            render: (recommendation) => `<strong>${escapeHtml(recommendation.title)}</strong><br><span class="ps-muted">${escapeHtml(recommendation.id)}</span>`
          },
          {
            header: "Mode",
            render: (recommendation) => `${renderStatusPill({ label: recommendation.automationMode, tone: "info" })}<br>${renderStatusPill({ label: recommendation.status, tone: toneForStatusText(recommendation.status) })}`
          },
          {
            header: "Expected change",
            render: (recommendation) => escapeHtml(recommendation.expectedChange)
          },
          {
            header: "Blast radius",
            render: (recommendation) => escapeHtml(recommendation.blastRadius)
          },
          {
            header: "Sources",
            render: (recommendation) => renderSources(recommendation.sourceReferences)
          }
        ],
        model.recommendations
      )
    ].join("")
  });

const renderEvidenceReportsSection = (model: OperationalConsoleModel, copy: OperationalConsoleCopy): string =>
  renderSection({
    id: "evidence",
    title: copy.evidenceReports,
    eyebrow: renderSourceChip({ label: "Provenance", detail: "stored_analysis" }),
    body: [
      renderLegalCaveat(model.legalCaveat),
      renderDataTable<ReportEvidenceSummary>(
        "Evidence vault",
        [
          {
            header: "Artifact",
            render: (artifact) => `<strong>${escapeHtml(artifact.title)}</strong><br><span class="ps-muted">${escapeHtml(artifact.id)}</span>`
          },
          {
            header: "Type",
            render: (artifact) => renderStatusPill({ label: artifact.sourceType, tone: artifact.sourceType === "generated_report" ? "accent" : "neutral" })
          },
          {
            header: "Scan",
            render: (artifact) => renderStatusPill({ label: artifact.scanStatus ?? "unknown", tone: toneForScan(artifact.scanStatus) })
          },
          {
            header: "Traceability",
            render: (artifact) =>
              [
                artifact.controlId ? `Control ${escapeHtml(artifact.controlId)}` : undefined,
                artifact.jurisdiction ? `Jurisdiction ${escapeHtml(artifact.jurisdiction)}` : undefined,
                artifact.linkedSourceRecordId ? `Source ${escapeHtml(artifact.linkedSourceRecordId)}` : undefined
              ]
                .filter(Boolean)
                .join("<br>")
          }
        ],
        model.evidence
      ),
      renderDataTable<ReportSurface>(
        "Report exports",
        [
          {
            header: "Report",
            render: (report) => `<strong>${escapeHtml(report.title)}</strong><br><span class="ps-muted">${escapeHtml(report.type)}</span>`
          },
          {
            header: "Status",
            render: (report) => renderStatusPill({ label: report.status, tone: toneForStatusText(report.status) })
          },
          {
            header: "Format",
            render: (report) => escapeHtml(report.format)
          },
          {
            header: "Source indicators",
            render: (report) => renderSources(report.sourceReferences)
          }
        ],
        model.reports
      )
    ].join("")
  });

const renderApprovalSection = (runs: readonly ActionRun[], copy: OperationalConsoleCopy): string =>
  renderSection({
    id: "approvals",
    title: copy.approvalQueue,
    eyebrow: renderSourceChip({ label: "Safety model", detail: "preflight + approval + snapshots" }),
    body: [
      runs.length === 0
        ? '<p class="ps-muted">Provider write execution remains disabled. No approval queue items exist for this local workspace.</p>'
        : "",
      '<div class="ps-action-list">',
      ...runs.map(renderActionRun),
      "</div>"
    ].join("")
  });

const renderActionRun = (run: ActionRun): string =>
  [
    '<article class="ps-panel">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h3 class="ps-panel__title">${escapeHtml(run.title)}</h3><p class="ps-muted">${escapeHtml(run.controlId)} | ${escapeHtml(run.providerKey)}</p></div>`,
    '<div class="ps-chip-row">',
    renderStatusPill({ label: run.status, tone: toneForStatusText(run.status) }),
    renderStatusPill({ label: `approval ${run.approval.status}`, tone: toneForStatusText(run.approval.status) }),
    renderStatusPill({ label: `preflight ${run.preflightStatus}`, tone: toneForStatusText(run.preflightStatus) }),
    "</div>",
    "</div>",
    '<div class="ps-grid">',
    renderFactPanel("Expected change", run.expectedChange),
    renderFactPanel("Blast radius", run.blastRadius),
    renderFactPanel("Manual fallback", run.manualFallback),
    "</div>",
    '<div class="ps-chip-row ps-stack-top">',
    ...run.permissionsRequired.map((permission) => renderStatusPill({ label: permission, tone: "info" })),
    ...run.licenseRequired.map((license) => renderStatusPill({ label: license, tone: "warning" })),
    run.preStateSnapshot
      ? renderSourceChip({ label: "Pre-state snapshot", detail: run.preStateSnapshot.evidenceArtifactId })
      : renderStatusPill({ label: "Snapshot missing", tone: "danger" }),
    "</div>",
    renderPreflightChecks(run),
    '<div class="ps-command-row ps-stack-top">',
    renderCommandButton({
      label: "Review approval",
      ariaLabel: `Review approval state for ${run.title}`,
      tone: "primary"
    }),
    renderCommandButton({
      label: "Queue unavailable",
      ariaLabel: `Queue provider execution for ${run.title} is unavailable until write safety gates pass`,
      disabled: true
    }),
    "</div>",
    renderSources(run.sourceReferences as ReportSourceReference[]),
    "</article>"
  ].join("");

const renderPreflightChecks = (run: ActionRun): string => {
  if (!run.preflightResult) {
    return "";
  }

  return [
    '<div class="ps-chip-row ps-stack-top">',
    ...run.preflightResult.checks.map(
      (check) =>
        `${renderStatusPill({ label: check.code, tone: toneForStatusText(check.status) })}<span>${escapeHtml(check.message)}</span>`
    ),
    "</div>"
  ].join("");
};

const renderFactPanel = (title: string, value: string): string =>
  `<div class="ps-fact"><h4 class="ps-panel__title">${escapeHtml(title)}</h4><p>${escapeHtml(value)}</p></div>`;

const renderSection = ({
  id,
  title,
  eyebrow,
  body,
  className
}: {
  id: string;
  title: string;
  eyebrow: string;
  body: string;
  className?: string;
}): string =>
  [
    `<section class="${["ps-section", className].filter(Boolean).join(" ")}" id="${escapeHtml(id)}" data-ui-section="${escapeHtml(
      id
    )}" aria-labelledby="${escapeHtml(id)}-title">`,
    '<div class="ps-section__header">',
    `<h2 class="ps-section__title" id="${escapeHtml(id)}-title">${escapeHtml(title)}</h2>`,
    eyebrow,
    "</div>",
    `<div class="ps-section__body">${body}</div>`,
    "</section>"
  ].join("");

const renderSources = (sources: readonly ReportSourceReference[]): string =>
  sources.length === 0
    ? ""
    : `<div class="ps-chip-row ps-source-stack">${sources
        .map((source) =>
          renderSourceChip({
            label: source.title ?? source.sourceRecordId,
            detail: [source.jurisdiction, source.article ? `Article ${source.article}` : undefined, source.sourceVersion]
              .filter(Boolean)
              .join(" | "),
            href: source.sourceUrl
          })
        )
        .join("")}</div>`;

const formatKeyLabel = (key: string): string =>
  key
    .split("_")
    .map((part) => (part.length === 0 ? part : `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`))
    .join(" ");

const toneForStatus = (status: OperationalStatus): PureSocUiTone => {
  if (status === "ready") {
    return "success";
  }
  if (status === "blocked") {
    return "danger";
  }
  if (status === "attention" || status === "review_required") {
    return "warning";
  }

  return "info";
};

const toneForStatusText = (status: string): PureSocUiTone => {
  if (["ready", "passing", "approved", "verified", "generated", "clean", "passed"].includes(status)) {
    return "success";
  }
  if (["critical", "failed", "rejected", "blocked", "infected"].includes(status)) {
    return "danger";
  }
  if (
    ["high", "pending", "requested", "warning", "needs_evidence", "requires_legal_review", "approval_requested"].includes(
      status
    )
  ) {
    return "warning";
  }

  return "info";
};

const toneForSeverity = (severity: string): PureSocUiTone => {
  if (severity === "critical") {
    return "critical";
  }
  if (severity === "high") {
    return "danger";
  }
  if (severity === "medium") {
    return "warning";
  }

  return "info";
};

const toneForScan = (status?: string): PureSocUiTone => {
  if (status === "clean") {
    return "success";
  }
  if (status === "infected" || status === "failed") {
    return "danger";
  }
  if (status === "pending") {
    return "warning";
  }

  return "neutral";
};
