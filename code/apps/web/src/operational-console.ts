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
  ProductV1ConsoleModel,
  ProductV1ConsoleSection,
  RecommendationSurface,
  ReportSurface,
  RuntimeSessionSurface,
  WorkspaceSelectionModel
} from "./app-data";
import {
  localeLabel,
  productCountryName,
  productDataText,
  productNextActionLabel,
  productOnboardingFieldLabel,
  productOnboardingOptionLabel,
  productOnboardingScreenCopy,
  productStatusText,
  productText,
  resolveProductLocale
} from "./product-localization";

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
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
  activeRoute: ProductMvpRoute;
  customers: Array<Record<string, unknown>>;
  onboarding?: {
    answers: Record<string, unknown>;
    countryCode: string;
    progress?: Record<string, unknown> | null;
    schema?: Record<string, unknown> | null;
    selectedScreen?: string;
  };
  dashboard: {
    workspace: {
      id: string;
      name: string;
      legalName?: string | null;
      logoDataUrl?: string | null;
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
    microsoft365Health?: Microsoft365HealthSurface;
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

export interface RenderProductV1ConsoleOptions {
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
  routeMode?: "app" | "legacy";
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
    renderLocaleSwitcher(copy.locale),
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
    normalized.microsoftEntraEnabled === false
      ? ""
      : renderMicrosoftEntraSignInForm(copy.locale === "ro" ? "Continuă cu Microsoft" : "Sign in with Microsoft"),
    `<p class="ps-muted">${escapeHtml(copy.locale === "ro" ? "Aveți nevoie de un cont local?" : "Need a local account?")} <a class="ps-command" href="/register" data-ui-action="open-register">${escapeHtml(copy.locale === "ro" ? "Înregistrare" : "Register")}</a></p>`,
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
  const locale = resolveProductLocale(options.locale);
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<div class="ps-shell ps-shell--product" data-ui-smoke="product-mvp-shell">',
    renderProductSidebar(model, locale),
    '<main class="ps-main" id="content" tabindex="-1">',
    renderProductTopbar(model, locale),
    renderActiveTenantAccessBanner(model.activeTenantAccess, { locale }),
    '<div class="ps-content ps-content--product">',
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    renderProductActivePage(model, locale),
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
    `<title>${escapeHtml(productRouteTitle(model.activeRoute, locale))} | PureSOC</title>`,
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    renderCompanyLogoUploadScript(),
    "</body>",
    "</html>"
  ].join("");
};

const productNavItems: Array<{
  href: string;
  group: "Workspace" | "Readiness" | "Operations" | "Admin";
  icon: string;
  label: string;
  route: ProductMvpRoute;
  partnerOnly?: boolean;
}> = [
  { href: "/dashboard", group: "Workspace", icon: "DB", label: "Dashboard", route: "dashboard" },
  { href: "/customers", group: "Workspace", icon: "CU", label: "Customers", route: "customers", partnerOnly: true },
  { href: "/onboarding", group: "Readiness", icon: "RD", label: "Readiness", route: "onboarding" },
  { href: "/gap-analyzer", group: "Readiness", icon: "GA", label: "Gap Analyzer", route: "gap_analyzer" },
  { href: "/microsoft365", group: "Readiness", icon: "M3", label: "Microsoft 365", route: "microsoft365" },
  { href: "/connectors", group: "Operations", icon: "CN", label: "Connectors", route: "connectors" },
  { href: "/remediation", group: "Operations", icon: "RM", label: "Remediation", route: "remediation" },
  { href: "/evidence", group: "Operations", icon: "EV", label: "Evidence", route: "evidence" },
  { href: "/reports", group: "Operations", icon: "RP", label: "Reports", route: "reports" },
  { href: "/settings", group: "Admin", icon: "ST", label: "Settings", route: "settings" }
];

const productRouteTitle = (route: ProductMvpRoute, locale?: string | null): string =>
  productText(locale, productNavItems.find((item) => item.route === route)?.label ?? "Dashboard");

const renderProductSidebar = (model: ProductMvpShellModel, locale?: string | null): string => {
  const showCustomers = model.customers.length > 0 || ["customers"].includes(model.activeRoute);
  const navItems = productNavItems.filter((item) => !item.partnerOnly || showCustomers);
  let currentGroup = "";
  return [
    `<aside class="ps-sidebar" aria-label="${escapeHtml(productText(locale, "Primary navigation"))}">`,
    '<div class="ps-brand">',
    '<span class="ps-brand__mark" aria-hidden="true">PS</span>',
    `<div class="ps-brand__identity"><p class="ps-brand__name">PureSOC</p><span class="ps-brand__meta">${escapeHtml(
      resolveProductLocale(locale) === "ro" ? "Pregătire de securitate pentru IMM-uri" : "SMB security readiness"
    )}</span><br><span class="ps-brand__meta">${escapeHtml(
      model.dashboard.workspace.countryCode
    )} ${escapeHtml(resolveProductLocale(locale) === "ro" ? "spațiu de lucru" : "workspace")}</span></div>`,
    "</div>",
    '<nav class="ps-nav">',
    ...navItems.flatMap((item) => {
      const groupMarker =
        item.group === currentGroup ? [] : [`<span class="ps-nav__group">${escapeHtml(productText(locale, item.group))}</span>`];
      currentGroup = item.group;
      return [
        ...groupMarker,
        `<a class="ps-nav__link" href="${escapeHtml(item.href)}"${
          item.route === model.activeRoute ? ' aria-current="page"' : ""
        } data-ui-action="open-${escapeHtml(item.route)}"><span class="ps-nav__icon" aria-hidden="true">${escapeHtml(
          item.icon
        )}</span><span class="ps-nav__label">${escapeHtml(productText(locale, item.label))}</span><span class="ps-nav__chevron" aria-hidden="true">&rsaquo;</span></a>`
      ];
    }),
    "</nav>",
    '<div class="ps-sidebar__footer">',
    `<a class="ps-command ps-command--primary" href="${escapeHtml(model.dashboard.nextAction.href)}" data-ui-action="primary-next-action">${escapeHtml(
      productNextActionLabel(locale, model.dashboard.nextAction.label)
    )}</a>`,
    renderStatusPill({ label: resolveProductLocale(locale) === "ro" ? "Pregătire internă PureSOC" : model.dashboard.readiness.label, tone: "accent" }),
    '<form class="ps-inline-form" action="/auth/logout" method="post" data-ui-action="sign-out">',
    renderCommandButton({ label: productText(locale, "Sign out"), ariaLabel: productText(locale, "Sign out"), tone: "secondary", type: "submit" }),
    "</form>",
    "</div>",
    "</aside>"
  ].join("");
};

const renderProductTopbar = (model: ProductMvpShellModel, locale?: string | null): string => [
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
    label: productText(locale, model.dashboard.microsoft365.connectionId ? "Microsoft 365 connected" : "Microsoft 365 not connected"),
    tone: model.dashboard.microsoft365.connectionId ? "success" : "warning"
  }),
  renderStatusPill({
    label: `${clampPercent(model.dashboard.readiness.score)}% ${resolveProductLocale(locale) === "ro" ? "pregătire" : "readiness"}`,
    tone: "info"
  }),
  renderLocaleSwitcher(locale),
  `<span class="ps-muted">${escapeHtml(model.session.user.displayName ?? model.session.user.email)}</span>`,
  "</div>",
  "</header>"
].join("");

const renderProductActivePage = (model: ProductMvpShellModel, locale?: string | null): string => {
  if (model.activeRoute === "onboarding") {
    return renderProductOnboardingPage(model, locale);
  }
  if (model.activeRoute === "gap_analyzer") {
    return renderProductGapAnalyzerPage(model, locale);
  }
  if (model.activeRoute === "microsoft365") {
    return renderProductMicrosoft365Page(model, locale);
  }
  if (model.activeRoute === "connectors" || model.activeRoute === "connectors_microsoft365") {
    return renderProductConnectorsPage(model, locale);
  }
  if (model.activeRoute === "remediation") {
    return renderProductRemediationPage(model, locale);
  }
  if (model.activeRoute === "evidence") {
    return renderProductEvidencePage(model, locale);
  }
  if (model.activeRoute === "reports") {
    return renderProductReportsPage(model, locale);
  }
  if (model.activeRoute === "settings") {
    return renderProductSettingsPage(model, locale);
  }
  if (model.activeRoute === "customers") {
    return renderProductCustomersPage(model, locale);
  }
  return renderProductDashboardPage(model, locale);
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

const renderProductDashboardPage = (model: ProductMvpShellModel, locale?: string | null): string => [
  renderProductPageHeader({
    eyebrow: productText(locale, "Workspace overview"),
    title: productText(locale, "Dashboard"),
    status: productStatusText(locale, model.dashboard.countryPack.status),
    primaryAction: { ...model.dashboard.nextAction, label: productNextActionLabel(locale, model.dashboard.nextAction.label) }
  }),
  `<section class="ps-grid ps-grid--dense" aria-label="${escapeHtml(resolveProductLocale(locale) === "ro" ? "Rezumatul spațiului de lucru" : "Dashboard summary")}">`,
  renderProductScoreCard(productText(locale, "Readiness score"), `${clampPercent(model.dashboard.readiness.score)}%`, productStatusText(locale, model.dashboard.readiness.baselineState)),
  renderProductScoreCard(
    productText(locale, "Critical gaps"),
    String(model.dashboard.gaps.critical),
    resolveProductLocale(locale) === "ro" ? `${model.dashboard.gaps.open} deficiențe deschise` : `${model.dashboard.gaps.open} open gaps`
  ),
  renderProductScoreCard(
    "Microsoft 365",
    productText(locale, model.dashboard.microsoft365.connectionId ? "Connected" : "Not connected"),
    model.dashboard.microsoft365.tenantName
  ),
  renderProductScoreCard(
    productText(locale, "Remediation"),
    resolveProductLocale(locale) === "ro" ? `${model.dashboard.remediation.approvalRequested} în așteptare` : `${model.dashboard.remediation.approvalRequested} waiting`,
    resolveProductLocale(locale) === "ro" ? "Acțiunile de remediere necesită aprobare" : "Remediation actions require approval"
  ),
  "</section>",
  '<section class="ps-grid ps-stack-top">',
  renderProductNextActionCard(model, locale),
  renderProductReadinessAreas(model, locale),
  "</section>",
  '<section class="ps-grid ps-stack-top">',
  renderProductGapList(model.dashboard.gaps.recent, locale),
  renderProductEvidenceList(model.dashboard.evidence, locale),
  renderProductReportCards(model.dashboard.reports, locale),
  "</section>",
  renderLegalCaveat(model.dashboard.legalCaveat)
].join("");

const renderProductScoreCard = (label: string, value: string, detail: string): string =>
  `<article class="ps-panel"><h2 class="ps-panel__title">${escapeHtml(label)}</h2><p class="ps-metric">${escapeHtml(
    value
  )}</p><p class="ps-muted">${escapeHtml(detail)}</p></article>`;

const renderProductNextActionCard = (model: ProductMvpShellModel, locale?: string | null): string => [
  '<article class="ps-panel" aria-labelledby="next-action-title">',
  '<div class="ps-section__header ps-section__header--flat">',
  `<div><h2 class="ps-panel__title" id="next-action-title">${escapeHtml(productText(locale, "Recommended next action"))}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Un singur pas duce spațiul de lucru înainte." : "One step moves this workspace forward.")}</p></div>`,
  renderStatusPill({ label: resolveProductLocale(locale) === "ro" ? "ghidat" : "guided", tone: "accent" }),
  "</div>",
  `<p>${escapeHtml(nextActionCopy(model.dashboard.nextAction.label, locale))}</p>`,
  `<p><a class="ps-command ps-command--primary" href="${escapeHtml(model.dashboard.nextAction.href)}">${escapeHtml(
    productNextActionLabel(locale, model.dashboard.nextAction.label)
  )}</a></p>`,
  "</article>"
].join("");

const nextActionCopy = (label: string, locale?: string | null): string => {
  if (resolveProductLocale(locale) === "ro") {
    if (label.includes("onboarding")) return "Completați mai întâi contextul companiei. Acesta devine baza evaluării și a rapoartelor.";
    if (label.includes("gap")) return "Rulați analiza folosind răspunsurile salvate. Microsoft 365 poate crește ulterior nivelul de încredere.";
    if (label.includes("Microsoft")) return "Adăugați date Microsoft 365 în mod doar-citire pentru a verifica identitatea, dispozitivele și emailul.";
    return "Revizuiți planul de remediere și atribuiți acțiunile cu cel mai ridicat risc.";
  }
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

const renderProductReadinessAreas = (model: ProductMvpShellModel, locale?: string | null): string => {
  const areas = [
    [productText(locale, "Business profile"), productStatusText(locale, model.dashboard.readiness.baselineState)],
    [productText(locale, "Country pack"), `${model.dashboard.countryPack.selected} ${productStatusText(locale, model.dashboard.countryPack.status)}`],
    ["Microsoft 365", productText(locale, model.dashboard.microsoft365.connectionId ? "Verified signals available" : "Manual baseline only")],
    [productText(locale, "Evidence"), resolveProductLocale(locale) === "ro" ? `${model.dashboard.evidence.length} elemente recente` : `${model.dashboard.evidence.length} recent items`]
  ];
  return [
    '<article class="ps-panel" aria-labelledby="readiness-areas-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="readiness-areas-title">${escapeHtml(productText(locale, "Readiness areas"))}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Rapoartele preliminare pot fi generate înainte de conectarea tuturor semnalelor." : "Draft reports are allowed before every signal is connected.")}</p></div>`,
    renderStatusPill({ label: resolveProductLocale(locale) === "ro" ? "context de afaceri" : "business baseline", tone: "info" }),
    "</div>",
    '<div class="ps-grid ps-grid--dense">',
    ...areas.map(([label, status]) => renderProductScoreCard(label, status, "")),
    "</div>",
    "</article>"
  ].join("");
};

const renderProductOnboardingPage = (model: ProductMvpShellModel, locale?: string | null): string => {
  const schema = productOnboardingSchema(model);
  const screens = productOnboardingScreens(schema);
  const fields = productOnboardingFields(schema);
  const selectedScreenKey = productSelectedOnboardingScreen(model, screens);
  const selectedScreen = screens.find((screen) => screen.key === selectedScreenKey) ?? screens[0];
  const selectedIndex = Math.max(0, screens.findIndex((screen) => screen.key === selectedScreen?.key));
  const nextScreen = screens[Math.min(selectedIndex + 1, screens.length - 1)]?.key ?? selectedScreen?.key ?? "review";
  const screenFields = fields.filter((field) => field.screenKey === selectedScreen?.key && field.key !== "company.countryCode");
  const missing = productOnboardingMissingFields(model);
  const completedScreens = productOnboardingCompletedScreens(model);
  const countryPack = productOnboardingCountryPack(schema);

  return [
    renderProductPageHeader({
      eyebrow: productText(locale, "Readiness input"),
      title: productText(locale, "Onboarding"),
      status: productStatusText(locale, countryPack.sourceReviewStatus)
    }),
    '<section class="ps-layout-with-aside">',
    '<aside class="ps-panel ps-panel--quiet" aria-labelledby="onboarding-progress-title">',
    `<div class="ps-section__header ps-section__header--flat"><div><h2 class="ps-panel__title" id="onboarding-progress-title">${escapeHtml(productText(locale, "Progress"))}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Salvați fiecare etapă pe măsură ce o completați." : "Save each screen in small chunks.")}</p></div></div>`,
    '<ol class="ps-step-list">',
    ...screens.map((screen, index) => {
      const isSelected = screen.key === selectedScreen?.key;
      const screenMissing = productMissingForScreen(screen, fields, missing);
      const complete = completedScreens.includes(screen.key) && screenMissing.length === 0;
      const localizedScreen = productOnboardingScreenCopy(locale, screen);
      return `<li${isSelected ? ' aria-current="step"' : ""}><span class="ps-step-list__number">${index + 1}</span><div><strong><a href="${escapeHtml(
        screen.routePath
      )}?country=${escapeHtml(model.onboarding?.countryCode ?? model.dashboard.countryPack.selected)}">${escapeHtml(
        localizedScreen.title
      )}</a></strong><span>${escapeHtml(
        complete
          ? productText(locale, "Complete")
          : screenMissing.length > 0
            ? resolveProductLocale(locale) === "ro" ? `${screenMissing.length} câmpuri obligatorii` : `${screenMissing.length} required`
            : resolveProductLocale(locale) === "ro" ? "Pregătit pentru salvare" : "Ready to save"
      )}</span></div></li>`;
    }),
    "</ol>",
    "</aside>",
    '<form class="ps-panel ps-form ps-form--wide" action="/onboarding" method="post" data-ui-action="save-readiness-onboarding-screen">',
    `<input type="hidden" name="currentScreen" value="${escapeHtml(selectedScreen?.key ?? "company")}">`,
    `<input type="hidden" name="nextScreen" value="${escapeHtml(nextScreen)}">`,
    ...completedScreens.map((screen) => `<input type="hidden" name="completedScreens" value="${escapeHtml(screen)}">`),
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title">${escapeHtml(productOnboardingScreenCopy(locale, selectedScreen ?? { key: "company", title: "Onboarding", summary: "Capture readiness inputs." }).title)}</h2><p class="ps-muted">${escapeHtml(
      productOnboardingScreenCopy(locale, selectedScreen ?? { key: "company", title: "Onboarding", summary: "Capture readiness inputs." }).summary
    )}</p></div>`,
    renderStatusPill({
      label: resolveProductLocale(locale) === "ro" ? "Pachet România bazat pe surse, necesită revizuire" : countryPack.safeSourceSummary,
      tone: countryPack.sourceReviewStatus === "active" ? "success" : "warning"
    }),
    "</div>",
    '<div class="ps-form-grid">',
    renderProductOnboardingCountrySelector(model, schema, locale),
    ...(selectedScreen?.key === "company"
      ? [renderCompanyLogoUpload({ currentLogoDataUrl: model.dashboard.workspace.logoDataUrl, fieldId: "product-onboarding-logo", locale })]
      : []),
    ...screenFields.map((field) => renderProductOnboardingField(model, field, missing.includes(field.key), locale)),
    "</div>",
    selectedScreen?.key === "review" ? renderProductOnboardingReviewSummary(fields, screens, missing, locale) : "",
    '<div class="ps-command-row">',
    renderCommandButton({ label: productText(locale, "Save screen"), ariaLabel: productText(locale, "Save screen"), tone: "primary", type: "submit" }),
    selectedScreen?.key === "review"
      ? `<button class="ps-command" type="submit" name="_action" value="complete">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Rulează încadrarea" : "Run classification")}</button><button class="ps-command ps-command--primary" type="submit" name="_action" value="run">${escapeHtml(productText(locale, "Run analyzer"))}</button>`
      : "",
    `<a class="ps-command" href="/microsoft365">${escapeHtml(productText(locale, "Providers"))}</a>`,
    `<a class="ps-command" href="/evidence">${escapeHtml(productText(locale, "Evidence"))}</a>`,
    "</div>",
    "</form>",
    "</section>",
    renderLegalCaveat(model.dashboard.legalCaveat)
  ].join("");
};

interface ProductOnboardingScreenSurface {
  key: string;
  routePath: string;
  summary: string;
  title: string;
  requiredFieldPaths?: string[];
}

interface ProductOnboardingFieldSurface {
  fallbackLabel: string;
  key: string;
  options?: Array<{ label: string; value: string }>;
  requiredPolicy: string;
  screenKey: string;
  type: string;
  validationHints?: {
    helpText?: string;
    min?: number;
    placeholder?: string;
  };
}

const productOnboardingSchema = (model: ProductMvpShellModel): Record<string, unknown> =>
  model.onboarding?.schema && typeof model.onboarding.schema === "object" ? model.onboarding.schema : {};

const productOnboardingScreens = (schema: Record<string, unknown>): ProductOnboardingScreenSurface[] => {
  const screens = Array.isArray(schema.screens) ? schema.screens : [];
  return screens
    .filter((screen): screen is Record<string, unknown> => Boolean(screen && typeof screen === "object"))
    .map((screen) => ({
      key: String(screen.key ?? "company"),
      routePath: String(screen.routePath ?? `/onboarding/${String(screen.key ?? "company")}`),
      summary: String(screen.summary ?? ""),
      title: String(screen.title ?? screen.label ?? screen.key ?? "Onboarding"),
      requiredFieldPaths: Array.isArray(screen.requiredFieldPaths)
        ? screen.requiredFieldPaths.filter((field): field is string => typeof field === "string")
        : []
    }));
};

const productOnboardingFields = (schema: Record<string, unknown>): ProductOnboardingFieldSurface[] => {
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  return fields
    .filter((field): field is Record<string, unknown> => Boolean(field && typeof field === "object"))
    .map((field) => ({
      fallbackLabel: String(field.fallbackLabel ?? field.key ?? "Field"),
      key: String(field.key ?? ""),
      options: Array.isArray(field.options)
        ? field.options
            .filter((option): option is Record<string, unknown> => Boolean(option && typeof option === "object"))
            .map((option) => ({ label: String(option.label ?? option.value ?? ""), value: String(option.value ?? "") }))
        : undefined,
      requiredPolicy: String(field.requiredPolicy ?? "optional"),
      screenKey: String(field.screenKey ?? "company"),
      type: String(field.type ?? "text"),
      validationHints:
        field.validationHints && typeof field.validationHints === "object"
          ? (field.validationHints as ProductOnboardingFieldSurface["validationHints"])
          : undefined
    }))
    .filter((field) => field.key.length > 0);
};

const productOnboardingCountryPack = (schema: Record<string, unknown>) => {
  const countryPack =
    schema.countryPack && typeof schema.countryPack === "object" ? (schema.countryPack as Record<string, unknown>) : {};
  return {
    safeSourceSummary: String(countryPack.safeSourceSummary ?? "Source-backed country pack. Review required."),
    sourceReviewStatus: String(countryPack.sourceReviewStatus ?? "review_required")
  };
};

const productSelectedOnboardingScreen = (
  model: ProductMvpShellModel,
  screens: readonly ProductOnboardingScreenSurface[]
): string => {
  const selected = model.onboarding?.selectedScreen;
  if (selected && screens.some((screen) => screen.key === selected)) {
    return selected;
  }
  const current = model.onboarding?.progress?.["currentScreen"];
  if (typeof current === "string" && screens.some((screen) => screen.key === current)) {
    return current;
  }
  return screens[0]?.key ?? "company";
};

const productOnboardingMissingFields = (model: ProductMvpShellModel): string[] => {
  const missing = model.onboarding?.progress?.["missingRequiredFields"];
  return Array.isArray(missing) ? missing.filter((field): field is string => typeof field === "string") : [];
};

const productOnboardingCompletedScreens = (model: ProductMvpShellModel): string[] => {
  const completed = model.onboarding?.progress?.["completedScreens"];
  return Array.isArray(completed) ? completed.filter((screen): screen is string => typeof screen === "string") : [];
};

const productMissingForScreen = (
  screen: ProductOnboardingScreenSurface,
  fields: readonly ProductOnboardingFieldSurface[],
  missing: readonly string[]
): string[] => {
  const fieldKeys = new Set(fields.filter((field) => field.screenKey === screen.key).map((field) => field.key));
  return missing.filter((field) => fieldKeys.has(field));
};

const renderProductOnboardingCountrySelector = (
  model: ProductMvpShellModel,
  schema: Record<string, unknown>,
  locale?: string | null
): string => {
  const available = Array.isArray(schema.availableCountries)
    ? schema.availableCountries
        .filter((country): country is Record<string, unknown> => Boolean(country && typeof country === "object"))
        .map((country) => {
          const countryCode = String(country.countryCode ?? "");
          return [countryCode, productCountryName(locale, countryCode)] as const;
        })
    : ([
        ["RO", productCountryName(locale, "RO")],
        ["PL", productCountryName(locale, "PL")],
        ["DE", productCountryName(locale, "DE")]
      ] as Array<readonly [string, string]>);

  return renderSelect(
    "company.countryCode",
    productText(locale, "Country pack"),
    productOnboardingAnswerText(model, "company.countryCode", model.onboarding?.countryCode ?? model.dashboard.countryPack.selected),
    [["", productText(locale, "Choose country")], ...available],
    resolveProductLocale(locale) === "ro"
      ? "Țara selectată determină întrebările naționale și regulile de încadrare."
      : "The selected country controls the national questions and classifier.",
    true
  );
};

const renderProductOnboardingField = (
  model: ProductMvpShellModel,
  field: ProductOnboardingFieldSurface,
  isMissing: boolean,
  locale?: string | null
): string => {
  const required = field.requiredPolicy === "required";
  const help =
    field.validationHints?.helpText ??
    (isMissing
      ? resolveProductLocale(locale) === "ro"
        ? "Câmp obligatoriu pentru evaluare."
        : "Required for analyzer readiness."
      : "");
  const value = productOnboardingAnswerText(model, field.key);
  const label = productOnboardingFieldLabel(locale, field.key, field.fallbackLabel);

  if (field.type === "textarea") {
    return renderTextarea(field.key, label, value, help, "ps-field--full");
  }
  if (field.type === "select") {
    return renderSelect(
      field.key,
      label,
      value,
      [
        ["", resolveProductLocale(locale) === "ro" ? "Alegeți" : "Choose"],
        ...(field.options ?? []).map((option) => [option.value, productOnboardingOptionLabel(locale, option.value, option.label)] as const)
      ],
      help,
      required
    );
  }
  if (field.type === "multi_select") {
    return renderProductMultiSelect(field, productOnboardingAnswerValues(model, field.key), help, required, locale);
  }
  if (field.type === "boolean") {
    return renderSelect(
      field.key,
      label,
      value,
      [
        ["", resolveProductLocale(locale) === "ro" ? "Alegeți" : "Choose"],
        ["true", productOnboardingOptionLabel(locale, "true", "Yes")],
        ["false", productOnboardingOptionLabel(locale, "false", "No")]
      ],
      help,
      required
    );
  }
  const inputType = field.type === "email" ? "email" : field.type === "number" ? "number" : "text";
  const attributes = [
    field.validationHints?.min !== undefined ? `min="${escapeHtml(String(field.validationHints.min))}"` : "",
    field.validationHints?.placeholder ? `placeholder="${escapeHtml(field.validationHints.placeholder)}"` : ""
  ].filter(Boolean);
  return renderTextInput(field.key, label, value, required, inputType, help, attributes);
};

const renderProductMultiSelect = (
  field: ProductOnboardingFieldSurface,
  values: readonly string[],
  help: string,
  required: boolean,
  locale?: string | null
): string => {
  const fieldId = escapeHtml(field.key);
  const selected = new Set(values);
  const options = field.options ?? [];
  const size = Math.min(8, Math.max(4, options.length));
  return [
    `<div class="ps-field ps-field--full" data-wizard-question="${fieldId}"><label for="${fieldId}">${escapeHtml(
      productOnboardingFieldLabel(locale, field.key, field.fallbackLabel)
    )}</label><select id="${fieldId}" name="${fieldId}" multiple size="${size}"${required ? " required" : ""}>`,
    ...options.map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${selected.has(option.value) ? " selected" : ""}>${escapeHtml(
          productOnboardingOptionLabel(locale, option.value, option.label)
        )}</option>`
    ),
    `</select>${help ? `<span class="ps-help">${escapeHtml(help)}</span>` : ""}</div>`
  ].join("");
};

const renderProductOnboardingReviewSummary = (
  fields: readonly ProductOnboardingFieldSurface[],
  screens: readonly ProductOnboardingScreenSurface[],
  missing: readonly string[],
  locale?: string | null
): string => {
  const missingLabels = missing.map((fieldKey) => {
    const field = fields.find((candidate) => candidate.key === fieldKey);
    return productOnboardingFieldLabel(locale, fieldKey, field?.fallbackLabel ?? fieldKey);
  });
  return [
    '<section class="ps-panel ps-panel--quiet ps-stack-top" aria-labelledby="onboarding-review-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h3 class="ps-panel__title" id="onboarding-review-title">${escapeHtml(productText(locale, "Analyzer readiness"))}</h3><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Analiza poate rula cu date parțiale, iar câmpurile obligatorii lipsă rămân vizibile ca deficiențe." : "The analyzer can run with partial data, but missing required fields remain visible as gaps.")}</p></div>`,
    renderStatusPill({
      label: resolveProductLocale(locale) === "ro" ? `${missing.length} câmpuri obligatorii lipsă` : `${missing.length} required missing`,
      tone: missing.length > 0 ? "warning" : "success"
    }),
    "</div>",
    missingLabels.length > 0
      ? `<ul class="ps-list">${missingLabels.slice(0, 12).map((label) => `<li>${escapeHtml(label)}</li>`).join("")}</ul>`
      : `<p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Câmpurile obligatorii sunt complete pentru țara selectată." : "Required onboarding fields are complete for the selected country.")}</p>`,
    '<div class="ps-chip-row">',
    ...screens.map((screen) =>
      renderStatusPill({
        label: `${productOnboardingScreenCopy(locale, screen).title}: ${productMissingForScreen(screen, fields, missing).length} ${resolveProductLocale(locale) === "ro" ? "lipsă" : "missing"}`,
        tone: productMissingForScreen(screen, fields, missing).length > 0 ? "warning" : "success"
      })
    ),
    "</div>",
    "</section>"
  ].join("");
};

const productOnboardingAnswerText = (model: ProductMvpShellModel, path: string, fallback = ""): string => {
  const value = valueAtPath(model.onboarding?.answers ?? {}, path);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return typeof value === "string" && value.length > 0 ? value : fallback;
};

const productOnboardingAnswerValues = (model: ProductMvpShellModel, path: string): string[] => {
  const value = valueAtPath(model.onboarding?.answers ?? {}, path);
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return typeof value === "string" && value.length > 0 ? [value] : [];
};

const renderProductGapAnalyzerPage = (model: ProductMvpShellModel, locale?: string | null): string => [
  renderProductPageHeader({
    eyebrow: productText(locale, "Manual and connector baseline"),
    title: productText(locale, "Gap Analyzer"),
    status: productStatusText(locale, model.dashboard.readiness.baselineState),
    primaryAction: { href: "#run-gap-analyzer-form", label: productText(locale, "Run analyzer") }
  }),
  '<form class="ps-panel ps-form" id="run-gap-analyzer-form" action="/gap-analyzer/run" method="post" data-ui-action="run-gap-analyzer">',
  `<p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Analiza folosește răspunsurile din configurare și declarațiile de securitate. Constatările Microsoft 365 cresc nivelul de încredere după conectare." : "The analyzer works from onboarding answers and manual security input. Microsoft 365 findings increase confidence when connected.")}</p>`,
  renderCommandButton({ label: productText(locale, "Run analyzer"), ariaLabel: productText(locale, "Run analyzer"), tone: "primary", type: "submit" }),
  "</form>",
  renderProductGapList(model.details?.gaps ?? model.dashboard.gaps.recent, locale),
  renderProductRecommendations(model.details?.recommendations ?? model.dashboard.recommendations, locale)
].join("");

const renderProductMicrosoft365Page = (model: ProductMvpShellModel, locale?: string | null): string => {
  const microsoft365 = productMicrosoft365Health(model);
  const moduleSummary = summarizeMicrosoft365Modules(microsoft365.modules);
  return [
    renderProductPageHeader({
      eyebrow: productText(locale, "Security posture"),
      title: "Microsoft 365",
      status: productStatusText(locale, microsoft365.providerConnectionId ? "connected" : "not_connected"),
      primaryAction: { href: "/connectors/microsoft365", label: productText(locale, microsoft365.providerConnectionId ? "Manage connection" : "Connect Microsoft 365") }
    }),
    '<section class="ps-grid">',
    renderProductScoreCard(productText(locale, "Connection"), productText(locale, microsoft365.providerConnectionId ? "Connected" : "Not connected"), microsoft365.tenantDisplayName),
    renderProductScoreCard(productText(locale, "Last sync"), readableMicrosoft365Time(microsoft365.lastSyncAt, locale), resolveProductLocale(locale) === "ro" ? "Module doar-citire" : "Read-only modules"),
    renderProductScoreCard(
      productText(locale, "Remediation"),
      productText(locale, "Write gated"),
      resolveProductLocale(locale) === "ro"
        ? microsoft365.writeEnabled ? "Permisiunea este înregistrată, execuția rămâne blocată" : "Conector doar-citire"
        : microsoft365.writeEnabled ? "Write scope recorded, execution gated" : "Read-only connector"
    ),
    "</section>",
    renderProductMicrosoft365TenantIntelligence(microsoft365, moduleSummary, locale),
    renderProductMicrosoft365ModuleTable(microsoft365, locale),
    renderProductFindingTable(model.details?.findings ?? [], locale),
    `<p class="ps-stack-top"><a class="ps-command" href="/connectors/microsoft365">${escapeHtml(productText(locale, "Open connector settings"))}</a></p>`
  ].join("");
};

const productMicrosoft365Health = (model: ProductMvpShellModel): Microsoft365HealthSurface =>
  model.details?.microsoft365Health ?? {
    providerConnectionId: model.dashboard.microsoft365.connectionId,
    status: providerStatusToOperationalStatus(model.dashboard.microsoft365.status),
    tenantDisplayName: model.dashboard.microsoft365.tenantName,
    tenantId: model.dashboard.microsoft365.connectionId ?? "tenant OAuth not connected",
    lastSyncAt: model.dashboard.microsoft365.lastSyncAt ?? model.dashboard.lastSync ?? "No sync yet",
    permissionBundles: [model.dashboard.microsoft365.connectionId ? "bundle metadata pending" : "tenant OAuth consent required"],
    modules: [],
    writeEnabled: model.dashboard.microsoft365.writeEnabled,
    connectorMode: model.dashboard.microsoft365.connectionId ? "tenant_oauth_provider_connection" : "not_connected"
  };

const renderProductMicrosoft365TenantIntelligence = (
  microsoft365: Microsoft365HealthSurface,
  moduleSummary: Microsoft365ModuleSummary,
  locale?: string | null
): string => [
  `<section class="ps-grid ps-stack-top" aria-label="${escapeHtml(productText(locale, "Tenant intelligence"))}">`,
  '<article class="ps-panel">',
  '<div class="ps-section__header ps-section__header--flat">',
  `<div><h2 class="ps-panel__title">${escapeHtml(productText(locale, "Tenant intelligence"))}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Metadate Microsoft deținute de client, preluate din conexiune și din ultima stare a modulelor." : "Organization-owned Microsoft tenant metadata from the provider connection and latest module health.")}</p></div>`,
  renderStatusPill({ label: productStatusText(locale, microsoft365.status), tone: toneForStatus(microsoft365.status) }),
  "</div>",
  '<dl class="ps-kv-grid">',
  renderKeyValue(productText(locale, "Tenant"), microsoft365.tenantDisplayName),
  renderKeyValue(productText(locale, "Tenant ID"), microsoft365.tenantId),
  renderKeyValue(productText(locale, "Connector mode"), microsoft365.connectorMode),
  renderKeyValue(resolveProductLocale(locale) === "ro" ? "Permisiuni acordate" : "Permission scope", microsoft365.permissionBundles.join(", ")),
  "</dl>",
  "</article>",
  '<article class="ps-panel">',
  `<h2 class="ps-panel__title">${escapeHtml(productText(locale, "Module coverage"))}</h2>`,
  `<p class="ps-metric">${escapeHtml(moduleCoverageText(moduleSummary))}</p>`,
  `<p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Modulele citite cu succes sunt vizibile. Permisiunile sau licențele lipsă rămân explicite în starea fiecărui modul." : "Read modules ready. Missing permissions, licenses, and unsupported endpoints stay visible as module health.")}</p>`,
  '<div class="ps-chip-row">',
  renderStatusPill({ label: `${moduleSummary.attention} ${resolveProductLocale(locale) === "ro" ? "necesită atenție" : "attention"}`, tone: moduleSummary.attention > 0 ? "warning" : "neutral" }),
  renderStatusPill({ label: `${moduleSummary.blocked} ${resolveProductLocale(locale) === "ro" ? "blocate" : "blocked"}`, tone: moduleSummary.blocked > 0 ? "danger" : "neutral" }),
  "</div>",
  "</article>",
  renderProductMicrosoft365DataProtectionPanel(microsoft365, locale),
  "</section>"
].join("");

const renderProductMicrosoft365DataProtectionPanel = (microsoft365: Microsoft365HealthSurface, locale?: string | null): string => {
  const dataProtectionModules = ["purview-posture", "exchange-posture", "sharepoint-posture", "teams-posture"];
  const modules = dataProtectionModules
    .map((moduleKey) => microsoft365.modules.find((module) => module.moduleKey === moduleKey))
    .filter((module): module is Microsoft365ModuleSurface => Boolean(module));
  const purview = modules.find((module) => module.moduleKey === "purview-posture");
  const primary = purview ?? modules[0];

  return [
    '<article class="ps-panel">',
    `<h2 class="ps-panel__title">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Purview și protecția datelor" : "Purview and data protection")}</h2>`,
    primary
      ? renderStatusPill({ label: productStatusText(locale, primary.status), tone: toneForStatus(primary.status) })
      : renderStatusPill({ label: resolveProductLocale(locale) === "ro" ? microsoft365.providerConnectionId ? "nesincronizat" : "neconectat" : microsoft365.providerConnectionId ? "not synced" : "not connected", tone: "warning" }),
    `<p class="ps-muted">${escapeHtml(
      primary?.coverage ??
        (resolveProductLocale(locale) === "ro"
          ? microsoft365.providerConnectionId
            ? "Nu există încă un rezultat stocat pentru Purview, DLP, retenție, etichete de confidențialitate, Exchange, SharePoint și Teams."
            : "Conectați Microsoft 365 pentru a colecta postura Purview și a instrumentelor de colaborare."
          : microsoft365.providerConnectionId
          ? "Purview, DLP, retention, sensitivity labels, Exchange, SharePoint, and Teams posture have no stored module result yet."
          : "Connect Microsoft 365 before PureSOC can record Purview or collaboration posture.")
    )}</p>`,
    '<div class="ps-chip-row">',
    renderSourceChip({ label: productText(locale, "Source"), detail: primary?.sourceQuery ?? "provider_sync_modules:purview-posture,deferred" }),
    renderStatusPill({ label: resolveProductLocale(locale) === "ro" ? "doar-citire" : "read-only", tone: "info" }),
    "</div>",
    "</article>"
  ].join("");
};

const renderProductMicrosoft365ModuleTable = (microsoft365: Microsoft365HealthSurface, locale?: string | null): string =>
  renderDataTable<Microsoft365ModuleSurface>(
    resolveProductLocale(locale) === "ro" ? "Modulele organizației Microsoft 365" : "Microsoft 365 tenant modules",
    [
      { header: productText(locale, "Module"), render: (module) => `<strong>${escapeHtml(module.label)}</strong><br><span class="ps-muted">${escapeHtml(module.moduleKey)}</span>` },
      { header: productText(locale, "Status"), render: (module) => renderStatusPill({ label: productStatusText(locale, module.status), tone: toneForStatus(module.status) }) },
      { header: productText(locale, "Signal"), render: (module) => escapeHtml(module.coverage) },
      { header: productText(locale, "Last sync"), render: (module) => escapeHtml(module.lastSyncAt ? readableMicrosoft365Time(module.lastSyncAt, locale) : productStatusText(locale, "pending")) }
    ],
    microsoft365.modules
  );

interface Microsoft365ModuleSummary {
  attention: number;
  blocked: number;
  ready: number;
  total: number;
}

const summarizeMicrosoft365Modules = (modules: readonly Microsoft365ModuleSurface[]): Microsoft365ModuleSummary => {
  const total = modules.length;
  const ready = modules.filter((module) => module.status === "ready").length;
  const blocked = modules.filter((module) => module.status === "blocked").length;
  const attention = modules.filter((module) => !["ready", "in_progress", "blocked"].includes(module.status)).length;
  return { attention, blocked, ready, total };
};

const moduleCoverageText = (summary: Microsoft365ModuleSummary): string =>
  summary.total === 0 ? "No module data" : `${summary.ready}/${summary.total}`;

const renderKeyValue = (label: string, value: string): string =>
  `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;

const readableMicrosoft365Time = (value: string | null | undefined, locale?: string | null): string =>
  value && /^\d{4}-\d{2}-\d{2}T/.test(value)
    ? formatTimestamp(value)
    : value || (resolveProductLocale(locale) === "ro" ? "Nicio sincronizare" : "No sync yet");

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
  if (status === "not_connected" || status === "degraded") {
    return "attention";
  }
  return "attention";
};

const renderProductConnectorsPage = (model: ProductMvpShellModel, locale?: string | null): string => {
  const connectors =
    model.details?.connectors && model.details.connectors.length > 0
      ? model.details.connectors
      : [
          {
            connectionId: model.dashboard.microsoft365.connectionId,
            name: "Microsoft 365",
            providerKey: "microsoft365",
            status: model.dashboard.microsoft365.status
          }
        ];

  return [
    renderProductPageHeader({
      eyebrow: productText(locale, "Data sources"),
      title: productText(locale, model.activeRoute === "connectors_microsoft365" ? "Microsoft 365 connector" : "Connectors"),
      status: resolveProductLocale(locale) === "ro" ? "doar-citire implicit" : "read-only first"
    }),
    '<section class="ps-grid">',
    ...connectors.map((connector) => {
      const providerKey = String(connector.providerKey ?? "");
      const isMicrosoft = providerKey === "microsoft365";
      return [
        '<article class="ps-panel">',
        `<h2 class="ps-panel__title">${escapeHtml(String(connector.name ?? providerKey))}</h2>`,
        renderStatusPill({
          label: productStatusText(locale, String(connector.status ?? "not_connected")),
          tone: connectorStatusTone(String(connector.status ?? ""))
        }),
        `<p class="ps-muted">${escapeHtml(isMicrosoft
          ? resolveProductLocale(locale) === "ro" ? "Module Microsoft Graph doar-citire pentru identitate, dispozitive, email și Secure Score." : "Read-only Microsoft Graph modules for identity, devices, email, and Secure Score."
          : productText(locale, "Planned data source."))}</p>`,
        isMicrosoft
          ? `<form class="ps-form" action="/connectors/microsoft365/connect" method="post" data-ui-action="connect-microsoft365"><input type="hidden" name="providerConnectionId" value="${escapeHtml(String(connector.connectionId ?? ""))}">${renderCommandButton({
              label: productText(locale, connector.connectionId ? "Reconnect" : "Connect"),
              ariaLabel: productText(locale, "Connect Microsoft 365"),
              tone: "primary",
              type: "submit"
            })}</form>`
          : renderStatusPill({ label: productStatusText(locale, "coming_later"), tone: "neutral" }),
        "</article>"
      ].join("");
    }),
    "</section>",
    model.activeRoute === "connectors_microsoft365"
      ? `<article class="ps-panel ps-stack-top"><h2 class="ps-panel__title">${escapeHtml(productText(locale, "Permissions"))}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Conectorul pornește numai cu permisiuni de citire. Orice remediere necesită previzualizare, aprobare, audit și instrucțiuni de revenire." : "The MVP starts with read permissions only. Remediation actions require preview, approval, audit, and rollback guidance before any execution path.")}</p><div class="ps-chip-row">` +
        renderStatusPill({ label: productText(locale, "Baseline read"), tone: "info" }) +
        renderStatusPill({ label: productText(locale, "Security read"), tone: "info" }) +
        renderStatusPill({ label: productText(locale, "Intune read"), tone: "info" }) +
        renderStatusPill({ label: productText(locale, "Write actions require approval"), tone: "warning" }) +
        "</div></article>"
      : ""
  ].join("");
};

interface ProductRemediationBacklogRow {
  id: string;
  recommendedAction: string;
  severity: string;
  source: string;
  status: string;
  summary: string;
  title: string;
  type: "gap" | "recommendation";
}

const renderProductRemediationPage = (model: ProductMvpShellModel, locale?: string | null): string => {
  const actions = model.details?.remediationActions ?? [];
  const detailsGaps = model.details?.gaps;
  const detailsRecommendations = model.details?.recommendations;
  const gaps = detailsGaps && detailsGaps.length > 0 ? detailsGaps : model.dashboard.gaps.recent;
  const recommendations =
    detailsRecommendations && detailsRecommendations.length > 0 ? detailsRecommendations : model.dashboard.recommendations;
  const backlog = buildProductRemediationBacklog(gaps, recommendations);

  return [
    renderProductPageHeader({
      eyebrow: productText(locale, "Action center"),
      title: productText(locale, "Remediation"),
      status: resolveProductLocale(locale) === "ro" ? "aprobare obligatorie" : "approval gated"
    }),
    `<section class="ps-grid ps-grid--dense" aria-label="${escapeHtml(resolveProductLocale(locale) === "ro" ? "Rezumatul remedierii" : "Remediation analysis summary")}">`,
    renderProductScoreCard(productText(locale, "Analyzed gaps"), String(model.dashboard.gaps.open), `${model.dashboard.gaps.critical} ${productStatusText(locale, "critical")}`),
    renderProductScoreCard(productText(locale, "Recommendations"), String(recommendations.length), resolveProductLocale(locale) === "ro" ? "din ultima analiză salvată" : "from stored readiness analysis"),
    renderProductScoreCard(productText(locale, "Execution boundary"), resolveProductLocale(locale) === "ro" ? "Controlată" : "Gated", resolveProductLocale(locale) === "ro" ? "previzualizare, aprobare, capturi, verificare și dovezi" : "preview, approval, snapshots, verification, evidence"),
    "</section>",
    renderProductRemediationSafetyPanel({ actionsCount: actions.length, backlogCount: backlog.length }, locale),
    renderProductRemediationBacklog(backlog, locale),
    renderDataTable<Record<string, unknown>>(
      productText(locale, "Approval action runs"),
      [
        {
          header: resolveProductLocale(locale) === "ro" ? "Acțiune" : "Action",
          render: (row) =>
            `<strong>${escapeHtml(String(row.title ?? "Action"))}</strong><br><span class="ps-muted">${escapeHtml(
              String(row.expectedChange ?? "")
            )}</span>`
        },
        {
          header: productText(locale, "Risk"),
          render: (row) =>
            renderStatusPill({
              label: productStatusText(locale, String(row.risk ?? "medium")),
              tone: toneForSeverity(String(row.risk ?? "medium") as ActionableSeverity)
            })
        },
        {
          header: resolveProductLocale(locale) === "ro" ? "Aprobare" : "Approval",
          render: (row) =>
            renderStatusPill({ label: productStatusText(locale, String(row.approvalState ?? "not_requested")), tone: "info" })
        },
        { header: productText(locale, "Execution"), render: (row) => escapeHtml(productStatusText(locale, String(row.executionState ?? "draft"))) }
      ],
      actions
    )
  ].join("");
};

const renderProductRemediationSafetyPanel = (
  input: { actionsCount: number; backlogCount: number },
  locale?: string | null
): string => [
  '<section class="ps-panel ps-stack-top" aria-labelledby="remediation-safety-title">',
  '<div class="ps-section__header ps-section__header--flat">',
  `<div><h2 class="ps-panel__title" id="remediation-safety-title">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Priorități de remediere din analiza curentă" : "Remediation focus from analyzed gaps")}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Folosiți această listă pentru a atribui responsabili și a colecta dovezi înaintea oricărei acțiuni care afectează furnizorii." : "Use this queue to assign owners and collect evidence before any provider-impacting action is considered.")}</p></div>`,
  renderStatusPill({ label: resolveProductLocale(locale) === "ro" ? "scrierile la furnizor sunt blocate" : "provider writes gated", tone: "warning" }),
  "</div>",
  '<div class="ps-grid ps-grid--dense">',
  renderProductRemediationFact(resolveProductLocale(locale) === "ro" ? "Listă de lucru" : "Backlog", resolveProductLocale(locale) === "ro" ? `${input.backlogCount} elemente` : `${input.backlogCount} gap-based items`, resolveProductLocale(locale) === "ro" ? "Din ultima analiză și ultimul set de recomandări." : "From the latest analyzer output and recommendation snapshot."),
  renderProductRemediationFact(resolveProductLocale(locale) === "ro" ? "Coada de aprobări" : "Approval queue", resolveProductLocale(locale) === "ro" ? `${input.actionsCount} acțiuni` : `${input.actionsCount} action runs`, resolveProductLocale(locale) === "ro" ? "Numai acțiunile create pot trece prin previzualizare și aprobare." : "Only created action runs can move through preview and approval."),
  renderProductRemediationFact(resolveProductLocale(locale) === "ro" ? "Mod curent" : "Current mode", resolveProductLocale(locale) === "ro" ? "Manual sau ghidat" : "Manual or guided", resolveProductLocale(locale) === "ro" ? "Execuția rămâne blocată până la finalizarea verificărilor și a dovezilor." : "Execution remains blocked until safety gates and evidence are complete."),
  "</div>",
  "</section>"
].join("");

const renderProductRemediationFact = (label: string, value: string, detail: string): string =>
  `<div class="ps-fact"><span class="ps-source-detail">${escapeHtml(label)}</span><p class="ps-metric">${escapeHtml(
    value
  )}</p><p class="ps-muted">${escapeHtml(detail)}</p></div>`;

const renderProductRemediationBacklog = (backlog: ProductRemediationBacklogRow[], locale?: string | null): string => [
  renderDataTable<ProductRemediationBacklogRow>(
    resolveProductLocale(locale) === "ro" ? "Remedieri rezultate din analiză" : "Gap-derived remediation backlog",
    [
      {
        header: productText(locale, "Gap or recommendation"),
        render: (row) =>
          `<strong>${escapeHtml(row.title)}</strong><br><span class="ps-muted">${escapeHtml(row.summary)}</span>`
      },
      {
        header: productText(locale, "Priority"),
        render: (row) =>
          renderStatusPill({
            label: productStatusText(locale, row.severity),
            tone: toneForSeverity(row.severity as ActionableSeverity)
          })
      },
      { header: productText(locale, "Recommended next step"), render: (row) => escapeHtml(row.recommendedAction) },
      {
        header: productText(locale, "Source"),
        render: (row) =>
          `${renderStatusPill({ label: row.type, tone: row.type === "gap" ? "warning" : "info" })}<br><span class="ps-muted">${escapeHtml(
            `${row.source} - ${row.status}`
          )}</span>`
      }
    ],
    backlog
  )
].join("");

const buildProductRemediationBacklog = (
  gaps: Array<Record<string, unknown>>,
  recommendations: Array<Record<string, unknown>>
): ProductRemediationBacklogRow[] => {
  const gapRows = gaps.map((gap, index) => ({
    id: String(gap.id ?? `gap_${index}`),
    recommendedAction: String(gap.recommendedAction ?? "Assign an owner, confirm evidence required, and plan the manual remediation step."),
    severity: String(gap.severity ?? "medium"),
    source: String(gap.source ?? "readiness_engine"),
    status: String(gap.status ?? "open").replaceAll("_", " "),
    summary: String(gap.businessImpact ?? gap.summary ?? "This gap reduces confidence in the readiness baseline."),
    title: String(gap.title ?? "Readiness gap"),
    type: "gap" as const
  }));

  const recommendationRows = recommendations.map((recommendation, index) => ({
    id: String(recommendation.id ?? `recommendation_${index}`),
    recommendedAction: String(recommendation.summary ?? "Review and assign this recommendation."),
    severity: String(recommendation.priority ?? recommendation.severity ?? "medium"),
    source: String(recommendation.controlArea ?? recommendation.controlId ?? "recommendation_snapshot"),
    status: String(recommendation.actionType ?? recommendation.effort ?? "review").replaceAll("_", " "),
    summary: String(recommendation.summary ?? "Recommended from the latest readiness analysis."),
    title: String(recommendation.title ?? "Recommended action"),
    type: "recommendation" as const
  }));

  return [...gapRows, ...recommendationRows].slice(0, 8);
};

const renderProductEvidencePage = (model: ProductMvpShellModel, locale?: string | null): string => [
  renderProductPageHeader({
    eyebrow: productText(locale, "Evidence library"),
    title: productText(locale, "Evidence"),
    status: resolveProductLocale(locale) === "ro" ? `${(model.details?.evidence ?? model.dashboard.evidence).length} elemente` : `${(model.details?.evidence ?? model.dashboard.evidence).length} items`
  }),
  '<form class="ps-panel ps-form" action="/evidence" method="post" data-ui-action="attach-evidence">',
  '<div class="ps-form-grid">',
  renderTextInput("title", productText(locale, "Evidence title"), "", true),
  renderTextInput("controlId", resolveProductLocale(locale) === "ro" ? "ID control" : "Control ID", "", false),
  renderTextarea("content", productText(locale, "Evidence note"), "", resolveProductLocale(locale) === "ro" ? "Nu introduceți secrete, parole, tokenuri sau chei private." : "Do not paste secrets, passwords, tokens, or private keys.", "ps-field--full"),
  "</div>",
  renderCommandButton({ label: productText(locale, "Attach evidence"), ariaLabel: productText(locale, "Attach evidence"), tone: "primary", type: "submit" }),
  "</form>",
  renderProductEvidenceList(model.details?.evidence ?? model.dashboard.evidence, locale)
].join("");

const renderProductReportsPage = (model: ProductMvpShellModel, locale?: string | null): string => [
  renderProductPageHeader({ eyebrow: productText(locale, "Reports and exports"), title: productText(locale, "Reports"), status: resolveProductLocale(locale) === "ro" ? "rapoarte preliminare disponibile" : "draft reports allowed" }),
  '<section class="ps-grid">',
  renderReportActionCard(
    resolveProductLocale(locale) === "ro" ? "Rezumatul pregătirii NIS2" : "NIS2 readiness summary",
    "/reports/nis2-summary",
    resolveProductLocale(locale) === "ro" ? "PDF personalizat pentru analiza internă a pregătirii." : "Branded PDF for internal readiness review.",
    productText(locale, "Create readiness PDF")
  ),
  renderReportActionCard(
    productText(locale, "Gap report"),
    "/reports/gap-list",
    resolveProductLocale(locale) === "ro" ? "PDF personalizat cu deficiențe prioritizate și starea dovezilor." : "Branded PDF with prioritized gaps and evidence status.",
    productText(locale, "Create gap PDF")
  ),
  renderReportActionCard(
    productText(locale, "Microsoft 365 posture"),
    "/reports/m365-posture",
    resolveProductLocale(locale) === "ro" ? "PDF personalizat după sincronizarea conectorului." : "Branded PDF after connector sync.",
    productText(locale, "Create posture PDF")
  ),
  "</section>",
  renderProductReportCards(model.details?.reports ?? model.dashboard.reports, locale)
].join("");

const renderReportActionCard = (title: string, action: string, summary: string, actionLabel: string): string => [
  '<article class="ps-panel">',
  `<h2 class="ps-panel__title">${escapeHtml(title)}</h2>`,
  `<p class="ps-muted">${escapeHtml(summary)}</p>`,
  `<form class="ps-form" action="${escapeHtml(action)}" method="post">`,
  renderCommandButton({ label: actionLabel, ariaLabel: actionLabel, tone: "primary", type: "submit" }),
  "</form>",
  "</article>"
].join("");

const renderCompanyLogoUpload = (input: { currentLogoDataUrl?: string | null; fieldId: string; locale?: string | null }): string => {
  const currentLogo = input.currentLogoDataUrl ?? "";
  const fileInputId = `${input.fieldId}-file`;
  const hiddenInputId = `${input.fieldId}-data`;
  return [
    '<div class="ps-field ps-field--logo ps-field--full" data-logo-upload>',
    `<label for="${escapeHtml(fileInputId)}">${escapeHtml(resolveProductLocale(input.locale) === "ro" ? "Sigla companiei" : "Company logo")}</label>`,
    currentLogo
      ? `<img class="ps-logo-preview" src="${escapeHtml(currentLogo)}" alt="${escapeHtml(resolveProductLocale(input.locale) === "ro" ? "Sigla actuală a companiei" : "Current company logo")}" data-logo-preview>`
      : `<span class="ps-logo-preview ps-logo-preview--empty" data-logo-preview>${escapeHtml(resolveProductLocale(input.locale) === "ro" ? "Fără siglă" : "No logo")}</span>`,
    `<input id="${escapeHtml(fileInputId)}" type="file" accept="image/png,image/jpeg,image/webp" data-logo-file-input>`,
    `<input id="${escapeHtml(hiddenInputId)}" type="hidden" name="logoDataUrl" value="${escapeHtml(currentLogo)}" data-logo-data-url>`,
    `<span class="ps-help">${escapeHtml(resolveProductLocale(input.locale) === "ro" ? "PNG, JPEG sau WebP sub 34 KB. Sigla este folosită în rapoartele PDF." : "PNG, JPEG, or WebP under 34 KB. Used on generated PDF reports.")}</span>`,
    "</div>"
  ].join("");
};

const renderCompanyLogoUploadScript = (): string => `
<script>
(() => {
  const maxLogoBytes = 34000;
  document.querySelectorAll("[data-logo-upload]").forEach((field) => {
    const fileInput = field.querySelector("[data-logo-file-input]");
    const hiddenInput = field.querySelector("[data-logo-data-url]");
    const preview = field.querySelector("[data-logo-preview]");
    if (!fileInput || !hiddenInput || !preview) {
      return;
    }
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        return;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > maxLogoBytes) {
        fileInput.value = "";
        fileInput.setCustomValidity("Use a PNG, JPEG, or WebP logo under 34 KB.");
        fileInput.reportValidity();
        fileInput.setCustomValidity("");
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        hiddenInput.value = result;
        if (preview instanceof HTMLImageElement) {
          preview.src = result;
        } else {
          const image = document.createElement("img");
          image.className = "ps-logo-preview";
          image.alt = "Selected company logo";
          image.dataset.logoPreview = "";
          image.src = result;
          preview.replaceWith(image);
        }
      });
      reader.readAsDataURL(file);
    });
  });
})();
</script>`;

const renderProductSettingsPage = (model: ProductMvpShellModel, locale?: string | null): string => [
  renderProductPageHeader({ eyebrow: productText(locale, "Workspace settings"), title: productText(locale, "Settings"), status: productStatusText(locale, model.dashboard.workspace.billingStatus) }),
  '<section class="ps-grid">',
  renderProductScoreCard(productText(locale, "Workspace"), model.dashboard.workspace.name, model.dashboard.workspace.countryCode),
  renderProductScoreCard(productText(locale, "Country pack"), model.dashboard.countryPack.selected, productStatusText(locale, model.dashboard.countryPack.status)),
  renderProductScoreCard(productText(locale, "Users and roles"), productText(locale, "Invite teammates"), productText(locale, "Owner and admin managed")),
  renderProductScoreCard(productText(locale, "Notifications"), productText(locale, "Channels"), resolveProductLocale(locale) === "ro" ? "Deficiențe critice și termene" : "Critical gaps and deadlines"),
  "</section>",
  `<p class="ps-stack-top"><a class="ps-command" href="/workspaces">${escapeHtml(productText(locale, "Switch workspace"))}</a> <a class="ps-command" href="/invitations">${escapeHtml(productText(locale, "Invite users"))}</a> <a class="ps-command" href="/settings/notifications">${escapeHtml(productText(locale, "Notification channels"))}</a></p>`
].join("");

const renderProductCustomersPage = (model: ProductMvpShellModel, locale?: string | null): string => [
  renderProductPageHeader({ eyebrow: productText(locale, "Partner portfolio"), title: productText(locale, "Customers"), status: resolveProductLocale(locale) === "ro" ? `${model.customers.length} clienți` : `${model.customers.length} customers` }),
  '<form class="ps-panel ps-form" action="/customers" method="post" data-ui-action="create-customer">',
  '<div class="ps-form-grid">',
  renderTextInput("name", productText(locale, "Customer name"), "", true),
  renderTextInput("legalName", productText(locale, "Legal name"), "", false),
  renderSelect("countryCode", productText(locale, "Country"), "RO", [["RO", productCountryName(locale, "RO")], ["PL", productCountryName(locale, "PL")], ["DE", productCountryName(locale, "DE")]], "", true),
  "</div>",
  renderCommandButton({ label: productText(locale, "Add customer"), ariaLabel: productText(locale, "Add customer workspace"), tone: "primary", type: "submit" }),
  "</form>",
  renderDataTable<Record<string, unknown>>(
    productText(locale, "Customers"),
    [
      { header: productText(locale, "Company"), render: (row) => escapeHtml(String(row.name ?? (resolveProductLocale(locale) === "ro" ? "Client" : "Customer"))) },
      { header: productText(locale, "Country"), render: (row) => escapeHtml(String(row.countryCode ?? "EU")) },
      { header: "Microsoft", render: (row) => renderStatusPill({ label: productStatusText(locale, String((row.snapshot as Record<string, unknown> | undefined)?.microsoftConnectionState ?? "not_connected")), tone: "info" }) },
      { header: productText(locale, "Open"), render: (row) => `<form class="ps-form ps-form--compact" action="/customers/${escapeHtml(String(row.id ?? ""))}/impersonate" method="post"><input name="reason" placeholder="${escapeHtml(resolveProductLocale(locale) === "ro" ? "Motivul accesului" : "Reason for review")}" minlength="8" required>${renderCommandButton({ label: productText(locale, "Open"), ariaLabel: productText(locale, "Open customer workspace"), tone: "primary", type: "submit" })}</form>` }
    ],
    model.customers
  )
].join("");

const renderProductGapList = (gaps: Array<Record<string, unknown>>, locale?: string | null): string =>
  renderDataTable<Record<string, unknown>>(
    productText(locale, "Gap list"),
    [
      { header: productText(locale, "Gap"), render: (row) => `<strong>${escapeHtml(String(row.title ?? productText(locale, "Gap")))}</strong><br><span class="ps-muted">${escapeHtml(String(row.businessImpact ?? ""))}</span>` },
      { header: productText(locale, "Area"), render: (row) => escapeHtml(String(row.controlArea ?? productText(locale, "Readiness"))) },
      { header: productText(locale, "Severity"), render: (row) => renderStatusPill({ label: productStatusText(locale, String(row.severity ?? "medium")), tone: toneForSeverity(String(row.severity ?? "medium") as ActionableSeverity) }) },
      { header: productText(locale, "Source"), render: (row) => escapeHtml(String(row.source ?? (resolveProductLocale(locale) === "ro" ? "date introduse manual" : "manual input"))) },
      { header: productText(locale, "Status"), render: (row) => escapeHtml(productStatusText(locale, String(row.status ?? "open"))) }
    ],
    gaps
  );

const renderProductRecommendations = (recommendations: Array<Record<string, unknown>>, locale?: string | null): string =>
  renderDataTable<Record<string, unknown>>(
    productText(locale, "Recommendations"),
    [
      { header: resolveProductLocale(locale) === "ro" ? "Recomandare" : "Recommendation", render: (row) => `<strong>${escapeHtml(String(row.title ?? (resolveProductLocale(locale) === "ro" ? "Recomandare" : "Recommendation")))}</strong><br><span class="ps-muted">${escapeHtml(String(row.summary ?? ""))}</span>` },
      { header: productText(locale, "Priority"), render: (row) => renderStatusPill({ label: productStatusText(locale, String(row.priority ?? "medium")), tone: toneForSeverity(String(row.priority ?? "medium") as ActionableSeverity) }) },
      { header: resolveProductLocale(locale) === "ro" ? "Efort" : "Effort", render: (row) => escapeHtml(productStatusText(locale, String(row.effort ?? "review"))) }
    ],
    recommendations
  );

const renderProductEvidenceList = (items: Array<Record<string, unknown>>, locale?: string | null): string =>
  renderDataTable<Record<string, unknown>>(
    productText(locale, "Evidence"),
    [
      { header: productText(locale, "Evidence"), render: (row) => `<strong>${escapeHtml(String(row.title ?? productText(locale, "Evidence")))}</strong><br><span class="ps-muted">${escapeHtml(String(row.sourceType ?? (resolveProductLocale(locale) === "ro" ? "manual" : "manual")))}</span>` },
      { header: productText(locale, "Control"), render: (row) => escapeHtml(String(row.controlId ?? productText(locale, "Not mapped"))) },
      { header: productText(locale, "Scan"), render: (row) => renderStatusPill({ label: productStatusText(locale, String(row.scanStatus ?? "stored")), tone: "info" }) },
      { header: productText(locale, "Created"), render: (row) => escapeHtml(row.createdAt ? formatTimestamp(String(row.createdAt)) : "") }
    ],
    items
  );

const renderProductReportCards = (reports: Array<Record<string, unknown>>, locale?: string | null): string => [
  `<section class="ps-grid ps-stack-top" aria-label="${escapeHtml(productText(locale, "Generated reports"))}">`,
  reports.length === 0 ? `<article class="ps-panel"><h2 class="ps-panel__title">${escapeHtml(productText(locale, "No reports yet"))}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Generați un raport PDF după rularea analizei de deficiențe." : "Create a branded PDF report after running the gap analyzer.")}</p></article>` : "",
  ...reports.map((report) => [
    '<article class="ps-panel">',
    `<h2 class="ps-panel__title">${escapeHtml(String(report.title ?? productText(locale, "Report")))}</h2>`,
    renderStatusPill({ label: productStatusText(locale, String(report.status ?? "ready")), tone: "success" }),
    `<p class="ps-muted">${escapeHtml(String(report.format ?? "export"))}</p>`,
    report.downloadHref ? `<p><a class="ps-command" href="${escapeHtml(String(report.downloadHref))}">${escapeHtml(productText(locale, "Download PDF"))}</a></p>` : "",
    "</article>"
  ].join("")),
  "</section>"
].join("");

const renderProductFindingTable = (findings: Array<Record<string, unknown>>, locale?: string | null): string =>
  renderDataTable<Record<string, unknown>>(
    productText(locale, "Microsoft 365 findings"),
    [
      { header: productText(locale, "Finding"), render: (row) => `<strong>${escapeHtml(String(row.title ?? productText(locale, "Finding")))}</strong><br><span class="ps-muted">${escapeHtml(String(row.resourceDisplayName ?? ""))}</span>` },
      { header: productText(locale, "Severity"), render: (row) => renderStatusPill({ label: productStatusText(locale, String(row.severity ?? "medium")), tone: toneForSeverity(String(row.severity ?? "medium") as ActionableSeverity) }) },
      { header: productText(locale, "Status"), render: (row) => escapeHtml(productStatusText(locale, String(row.status ?? "open"))) }
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

const productV1SectionItems: Array<{ hrefTail: string; label: string; section: ProductV1ConsoleSection }> = [
  { hrefTail: "overview", label: "Overview", section: "overview" },
  { hrefTail: "setup", label: "Setup", section: "setup" },
  { hrefTail: "services", label: "Business", section: "business" },
  { hrefTail: "security/findings", label: "Security Work", section: "security" },
  { hrefTail: "incidents", label: "Incidents", section: "incidents" },
  { hrefTail: "risks", label: "Risk", section: "risk" },
  { hrefTail: "governance", label: "Governance", section: "governance" },
  { hrefTail: "evidence", label: "Evidence", section: "evidence" },
  { hrefTail: "reports", label: "Reports", section: "reports" },
  { hrefTail: "connectors/microsoft365", label: "Connectors", section: "connectors" },
  { hrefTail: "notifications", label: "Notifications", section: "notifications" },
  { hrefTail: "audit", label: "Events", section: "events" }
];

const productV1SetupSteps = [
  "organization",
  "jurisdiction",
  "services",
  "people",
  "systems",
  "suppliers",
  "microsoft365",
  "review"
] as const;

export const renderProductV1ConsoleScreen = (
  model: ProductV1ConsoleModel,
  options: RenderProductV1ConsoleOptions = {}
): string => {
  const locale = resolvePureSocLocale(options.locale).locale;
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<div class="ps-shell ps-shell--product" data-ui-smoke="product-v1-console">',
    renderProductV1Sidebar(model),
    '<main class="ps-main" id="content" tabindex="-1">',
    renderProductV1Topbar(model),
    '<div class="ps-content ps-content--product">',
    model.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(model.errorMessage)}</p>` : "",
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    renderProductV1ActiveSection(model),
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
    `<title>${escapeHtml(productV1SectionTitle(model.section))} | PureSOC</title>`,
    `<style>${renderPureSocDesignSystemCss()}</style>`,
    "</head>",
    '<body class="ps-body">',
    content,
    renderCompanyLogoUploadScript(),
    "</body>",
    "</html>"
  ].join("");
};

const productV1SectionTitle = (section: ProductV1ConsoleSection): string =>
  productV1SectionItems.find((item) => item.section === section)?.label ?? "Overview";

const encodeProductV1RouteTail = (routeTail: string): string =>
  routeTail
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const productV1RouteHref = (organizationId: string, routeTail: string): string =>
  `/app/o/${encodeURIComponent(organizationId)}/${encodeProductV1RouteTail(routeTail) || "overview"}`;

const productV1SectionHref = (organizationId: string, section: ProductV1ConsoleSection): string => {
  const item = productV1SectionItems.find((candidate) => candidate.section === section) ?? productV1SectionItems[0];
  return productV1RouteHref(organizationId, item.hrefTail);
};

const productV1CurrentHref = (model: ProductV1ConsoleModel): string =>
  productV1RouteHref(model.organization.id, model.routeTail || "overview");

const renderProductV1Subnav = (
  model: ProductV1ConsoleModel,
  ariaLabel: string,
  items: Array<{ hrefTail: string; label: string }>
): string => [
  `<nav class="ps-command-row ps-stack-top" aria-label="${escapeHtml(ariaLabel)}">`,
  ...items.map((item) => {
    const selected = model.routeTail === item.hrefTail;
    return `<a class="ps-command${selected ? " ps-command--primary" : ""}" href="${escapeHtml(
      productV1RouteHref(model.organization.id, item.hrefTail)
    )}"${selected ? ' aria-current="page"' : ""} data-ui-action="open-product-v1-${escapeHtml(
      item.hrefTail.replaceAll("/", "-")
    )}">${escapeHtml(item.label)}</a>`;
  }),
  "</nav>"
].join("");

const renderProductV1Sidebar = (model: ProductV1ConsoleModel): string => [
  '<aside class="ps-sidebar" aria-label="Product v1 navigation">',
  '<div class="ps-brand">',
  '<span class="ps-brand__mark" aria-hidden="true">PS</span>',
  `<div class="ps-brand__identity"><p class="ps-brand__name">PureSOC</p><span class="ps-brand__meta">Product v1</span><br><span class="ps-brand__meta">${escapeHtml(
    model.organization.primaryCountryCode ?? "EU"
  )} organization</span></div>`,
  "</div>",
  '<nav class="ps-nav">',
  ...productV1SectionItems.map(
    (item) =>
      `<a class="ps-nav__link" href="${escapeHtml(productV1RouteHref(model.organization.id, item.hrefTail))}"${
        item.section === model.section ? ' aria-current="page"' : ""
      } data-ui-action="open-product-v1-${escapeHtml(item.section)}"><span class="ps-nav__icon" aria-hidden="true">${escapeHtml(
        item.label.slice(0, 2).toUpperCase()
      )}</span><span class="ps-nav__label">${escapeHtml(item.label)}</span><span class="ps-nav__chevron" aria-hidden="true">&rsaquo;</span></a>`
  ),
  "</nav>",
  '<div class="ps-sidebar__footer">',
  renderStatusPill({ label: setupStatus(model), tone: toneForStatusText(setupStatus(model).toLowerCase()) }),
  `<a class="ps-command" href="/dashboard?organizationId=${escapeHtml(model.organization.id)}">Legacy dashboard</a>`,
  "</div>",
  "</aside>"
].join("");

const renderProductV1Topbar = (model: ProductV1ConsoleModel): string => [
  '<header class="ps-topbar">',
  '<div class="ps-topbar__actions ps-topbar__actions--left">',
  `<a class="ps-command" href="/workspaces" data-ui-action="switch-workspace">${escapeHtml(model.organization.name)}</a>`,
  renderStatusPill({ label: model.organization.id, tone: "neutral" }),
  "</div>",
  '<div class="ps-topbar__actions">',
  renderStatusPill({ label: `${model.organization.roles.length || 0} roles`, tone: "info" }),
  renderStatusPill({ label: `${pendingInternalEventCount(model)} pending events`, tone: pendingInternalEventCount(model) > 0 ? "warning" : "success" }),
  `<span class="ps-muted">${escapeHtml(model.session.user.displayName ?? model.session.user.email)}</span>`,
  "</div>",
  "</header>"
].join("");

const renderProductV1ActiveSection = (model: ProductV1ConsoleModel): string => {
  if (model.section === "setup") {
    return renderProductV1SetupSection(model);
  }
  if (model.section === "business") {
    return renderProductV1BusinessSection(model);
  }
  if (model.section === "security") {
    return renderProductV1SecuritySection(model);
  }
  if (model.section === "incidents") {
    return renderProductV1IncidentsSection(model);
  }
  if (model.section === "risk") {
    return renderProductV1RiskSection(model);
  }
  if (model.section === "governance") {
    return renderProductV1GovernanceSection(model);
  }
  if (model.section === "evidence") {
    return renderProductV1EvidenceSection(model);
  }
  if (model.section === "reports") {
    return renderProductV1ReportsSection(model);
  }
  if (model.section === "connectors") {
    return renderProductV1ConnectorsSection(model);
  }
  if (model.section === "notifications") {
    return renderProductV1NotificationsSection(model);
  }
  if (model.section === "events") {
    return renderProductV1EventsSection(model);
  }
  return renderProductV1OverviewSection(model);
};

const renderProductV1Header = (model: ProductV1ConsoleModel, eyebrow: string, title: string, status?: string): string => [
  '<section class="ps-section ps-section--product-hero" aria-labelledby="product-v1-title">',
  '<div class="ps-section__header">',
  `<div><p class="ps-route-hero__eyebrow">${escapeHtml(eyebrow)}</p><h1 class="ps-section__title" id="product-v1-title">${escapeHtml(
    title
  )}</h1><p class="ps-muted">${escapeHtml(model.organization.legalName ?? model.organization.name)}</p></div>`,
  status ? renderStatusPill({ label: status, tone: toneForStatusText(status.toLowerCase()) }) : "",
  "</div>",
  "</section>"
].join("");

const renderProductV1OverviewSection = (model: ProductV1ConsoleModel): string => [
  renderProductV1Header(model, "Organization context", "Product v1 overview", setupStatus(model)),
  '<section class="ps-grid ps-grid--dense" aria-label="Product v1 summary">',
  renderProductScoreCard("Setup", setupStatus(model), `${completedSetupSteps(model).length} of ${productV1SetupSteps.length} steps complete`),
  renderProductScoreCard("Business context", String(model.resources.businessServices.length), `${model.resources.people.length} people, ${model.resources.suppliers.length} suppliers`),
  renderProductScoreCard("Security work", String(model.resources.findings.length), `${model.resources.tasks.length} tasks, ${model.resources.remediationPlans.length} plans`),
  renderProductScoreCard("Governance", String(model.resources.policies.length), `${model.resources.risks.length} risks, ${model.resources.incidents.length} incidents`),
  "</section>",
  '<section class="ps-grid ps-stack-top">',
  renderProductV1NextWorkflowPanel(model),
  renderProductV1CountryPackPanel(model),
  "</section>",
  '<section class="ps-grid ps-stack-top">',
  renderV1RecordsTable("Recent findings", model.resources.findings, ["title", "severity", "status", "sourceType"]),
  renderV1RecordsTable("Open tasks", model.resources.tasks, ["title", "priority", "status", "dueDate"]),
  renderV1RecordsTable("Internal events", model.resources.internalEvents, ["eventType", "aggregateType", "outboxStatus", "attempts"]),
  "</section>"
].join("");

const renderProductV1NextWorkflowPanel = (model: ProductV1ConsoleModel): string => [
  '<article class="ps-panel" aria-labelledby="product-v1-next-title">',
  '<div class="ps-section__header ps-section__header--flat">',
  '<div><h2 class="ps-panel__title" id="product-v1-next-title">Next workflow</h2><p class="ps-muted">The v1 route map keeps organization context in the URL.</p></div>',
  renderStatusPill({ label: model.section, tone: "accent" }),
  "</div>",
  '<div class="ps-command-row">',
  `<a class="ps-command ps-command--primary" href="${escapeHtml(productV1SectionHref(model.organization.id, "setup"))}">Continue setup</a>`,
  `<a class="ps-command" href="${escapeHtml(productV1SectionHref(model.organization.id, "security"))}">Review findings</a>`,
  `<a class="ps-command" href="${escapeHtml(productV1SectionHref(model.organization.id, "reports"))}">Create snapshot</a>`,
  "</div>",
  "</article>"
].join("");

const renderProductV1CountryPackPanel = (model: ProductV1ConsoleModel): string => [
  '<article class="ps-panel" aria-labelledby="product-v1-country-packs-title">',
  '<div class="ps-section__header ps-section__header--flat">',
  '<div><h2 class="ps-panel__title" id="product-v1-country-packs-title">Country packs</h2><p class="ps-muted">National content remains review-gated until approval metadata exists.</p></div>',
  renderStatusPill({ label: "legal review gate", tone: "warning" }),
  "</div>",
  '<div class="ps-chip-row">',
  ...model.countryPacks.map((pack) =>
    renderStatusPill({
      label: `${String(pack.countryCode ?? "EU")} ${String(pack.reviewStatus ?? pack.status ?? "review_required").replaceAll("_", " ")}`,
      tone: String(pack.legalActivationBlocked ?? "true") === "true" ? "warning" : "success"
    })
  ),
  "</div>",
  "</article>"
].join("");

const renderProductV1SetupSection = (model: ProductV1ConsoleModel): string => {
  const activeStep = model.routeTail.startsWith("setup/")
    ? model.routeTail.slice("setup/".length)
    : String(fieldValue(model.setup, "currentStep") || "organization");
  return [
    renderProductV1Header(model, "Setup", "Launch readiness", setupStatus(model)),
    '<section class="ps-layout-with-aside">',
    `<form class="ps-panel ps-form ps-form--wide" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="save-product-v1-setup">`,
    '<input type="hidden" name="_action" value="saveSetupStep">',
    '<div class="ps-form-grid">',
    ...[
      renderSelect("step", "Setup step", activeStep, productV1SetupSteps.map((step) => [step, step] as const), "", true),
      renderTextInput("owner", "Owner", "", false),
      renderTextarea("summary", "Step notes", "", "Save the current evidence, assumptions, or launch blocker.", "ps-field--full"),
      renderCheckbox("complete", "Mark this step complete", true)
    ].map((field) => prefixGeneratedFieldIds(field, "saveSetupStep")),
    "</div>",
    '<div class="ps-command-row">',
    renderCommandButton({ label: "Save step", ariaLabel: "Save setup step", tone: "primary", type: "submit" }),
    "</div>",
    "</form>",
    '<aside class="ps-panel ps-panel--quiet"><h2 class="ps-panel__title">Step status</h2><ol class="ps-step-list">',
    ...productV1SetupSteps.map((step, index) => {
      const complete = completedSetupSteps(model).includes(step);
      return `<li><span class="ps-step-list__number">${index + 1}</span><div><strong>${escapeHtml(step)}</strong><span>${escapeHtml(
        complete ? "complete" : "open"
      )}</span></div></li>`;
    }),
    "</ol>",
    `<form class="ps-form ps-stack-top" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="launch-product-v1-setup">`,
    '<input type="hidden" name="_action" value="launchSetup">',
    renderCommandButton({ label: "Evaluate launch", ariaLabel: "Evaluate setup launch readiness", tone: "secondary", type: "submit" }),
    "</form>",
    "</aside>",
    "</section>"
  ].join("");
};

const renderProductV1BusinessSection = (model: ProductV1ConsoleModel): string => {
  const subnav = renderProductV1Subnav(model, "Business context pages", [
    { hrefTail: "services", label: "Services" },
    { hrefTail: "people", label: "People" },
    { hrefTail: "systems", label: "Systems" },
    { hrefTail: "suppliers", label: "Suppliers" }
  ]);

  if (model.routeTail === "people") {
    return [
      renderProductV1Header(model, "Business context", "People and responsibilities", `${model.resources.people.length} people`),
      subnav,
      '<section class="ps-grid ps-stack-top">',
      renderV1CreatePersonForm(model),
      renderProductScoreCard("Services", String(model.resources.businessServices.length), "available for ownership mapping"),
      "</section>",
      renderV1RecordsTable("People and responsibilities", model.resources.people, ["displayName", "email", "responsibilities", "updatedAt"])
    ].join("");
  }

  if (model.routeTail === "systems") {
    return [
      renderProductV1Header(model, "Business context", "Systems and assets", `${model.resources.assets.length} assets`),
      subnav,
      '<section class="ps-grid ps-stack-top">',
      renderV1CreateAssetForm(model),
      renderProductScoreCard("Findings", String(model.resources.findings.length), "linked security work"),
      "</section>",
      renderV1RecordsTable("Systems and assets", model.resources.assets, ["displayName", "assetType", "source", "lifecycleState"])
    ].join("");
  }

  if (model.routeTail === "suppliers") {
    return [
      renderProductV1Header(model, "Business context", "Suppliers", `${model.resources.suppliers.length} suppliers`),
      subnav,
      '<section class="ps-grid ps-stack-top">',
      renderV1CreateSupplierForm(model),
      renderProductScoreCard("Supplier reviews", String(model.resources.supplierReviews.length), "scheduled governance checks"),
      "</section>",
      renderV1RecordsTable("Suppliers", model.resources.suppliers, ["name", "criticality", "services", "reviewCadenceMonths"])
    ].join("");
  }

  return [
    renderProductV1Header(model, "Business context", "Services", `${model.resources.businessServices.length} services`),
    subnav,
    '<section class="ps-grid ps-stack-top">',
    renderV1CreateBusinessServiceForm(model),
    renderProductScoreCard("People", String(model.resources.people.length), "responsibilities captured"),
    "</section>",
    renderV1RecordsTable("Business services", model.resources.businessServices, ["name", "criticality", "ownerPersonId", "updatedAt"])
  ].join("");
};

const renderV1CreateBusinessServiceForm = (model: ProductV1ConsoleModel): string => [
  `<form class="ps-panel ps-form" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="create-product-v1-service">`,
  '<input type="hidden" name="_action" value="createBusinessService">',
  '<h2 class="ps-panel__title">Add service</h2>',
  ...[
    renderTextInput("name", "Service name", "", true),
    renderSelect("criticality", "Criticality", "high", severityOptions(), "", true)
  ].map((field) => prefixGeneratedFieldIds(field, "createBusinessService")),
  renderCommandButton({ label: "Add service", ariaLabel: "Add business service", tone: "primary", type: "submit" }),
  "</form>"
].join("");

const renderV1CreatePersonForm = (model: ProductV1ConsoleModel): string => [
  `<form class="ps-panel ps-form" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="create-product-v1-person">`,
  '<input type="hidden" name="_action" value="createResponsibility">',
  '<h2 class="ps-panel__title">Add person</h2>',
  ...[
    renderTextInput("displayName", "Display name", "", true),
    renderTextInput("email", "Email", "", false, "email"),
    renderTextInput("responsibilities", "Responsibilities", "security_lead", true)
  ].map((field) => prefixGeneratedFieldIds(field, "createResponsibility")),
  renderCommandButton({ label: "Add person", ariaLabel: "Add responsibility", tone: "primary", type: "submit" }),
  "</form>"
].join("");

const renderV1CreateSupplierForm = (model: ProductV1ConsoleModel): string => [
  `<form class="ps-panel ps-form" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="create-product-v1-supplier">`,
  '<input type="hidden" name="_action" value="createSupplier">',
  '<h2 class="ps-panel__title">Add supplier</h2>',
  ...[
    renderTextInput("name", "Supplier name", "", true),
    renderSelect("criticality", "Criticality", "medium", severityOptions(), "", true),
    renderTextInput("services", "Supported services", "", false),
    renderTextInput("reviewCadenceMonths", "Review cadence months", "12", true, "number", "", ['min="1"', 'inputmode="numeric"'])
  ].map((field) => prefixGeneratedFieldIds(field, "createSupplier")),
  renderCommandButton({ label: "Add supplier", ariaLabel: "Add supplier", tone: "primary", type: "submit" }),
  "</form>"
].join("");

const renderProductV1SecuritySection = (model: ProductV1ConsoleModel): string => {
  const subnav = renderProductV1Subnav(model, "Security work pages", [
    { hrefTail: "security", label: "Overview" },
    { hrefTail: "security/findings", label: "Findings" },
    { hrefTail: "remediation", label: "Remediation" },
    { hrefTail: "tasks", label: "Tasks" }
  ]);

  if (model.routeTail === "remediation") {
    return [
      renderProductV1Header(model, "Security operations", "Remediation plans", `${model.resources.remediationPlans.length} plans`),
      subnav,
      '<section class="ps-grid ps-stack-top">',
      renderV1CreateRemediationForm(model),
      renderProductScoreCard("Open findings", String(model.resources.findings.length), "available for plan scoping"),
      "</section>",
      renderV1RecordsTable("Remediation plans", model.resources.remediationPlans, ["objective", "status", "ownerUserId", "updatedAt"])
    ].join("");
  }

  if (model.routeTail === "tasks") {
    return [
      renderProductV1Header(model, "Security operations", "Tasks", `${model.resources.tasks.length} tasks`),
      subnav,
      '<section class="ps-grid ps-stack-top">',
      renderV1CreateTaskForm(model),
      renderProductScoreCard("Plans", String(model.resources.remediationPlans.length), "remediation workstreams"),
      "</section>",
      renderV1RecordsTable("Tasks", model.resources.tasks, ["title", "priority", "status", "dueDate"])
    ].join("");
  }

  if (model.routeTail === "security") {
    return [
      renderProductV1Header(model, "Security operations", "Security work overview", `${model.resources.findings.length} findings`),
      subnav,
      '<section class="ps-grid ps-grid--dense ps-stack-top" aria-label="Security work summary">',
      renderProductScoreCard("Assets", String(model.resources.assets.length), "systems in scope"),
      renderProductScoreCard("Findings", String(model.resources.findings.length), "manual and provider signals"),
      renderProductScoreCard("Plans", String(model.resources.remediationPlans.length), "approved local work"),
      renderProductScoreCard("Tasks", String(model.resources.tasks.length), "owner-tracked work"),
      "</section>",
      renderV1RecordsTable("Findings", model.resources.findings, ["title", "severity", "status", "sourceType"]),
      renderV1RecordsTable("Tasks", model.resources.tasks, ["title", "priority", "status", "dueDate"])
    ].join("");
  }

  return [
    renderProductV1Header(model, "Security operations", "Findings", `${model.resources.findings.length} findings`),
    subnav,
    '<section class="ps-grid ps-stack-top">',
    renderV1CreateFindingForm(model),
    renderProductScoreCard("Assets", String(model.resources.assets.length), "systems available for triage"),
    "</section>",
    renderV1RecordsTable("Findings", model.resources.findings, ["title", "severity", "status", "sourceType"])
  ].join("");
};

const renderV1CreateAssetForm = (model: ProductV1ConsoleModel): string =>
  renderSmallV1CreateForm(model, "createAsset", "Add asset", [
    renderTextInput("displayName", "Asset name", "", true),
    renderTextInput("assetType", "Asset type", "manual_system", true)
  ]);

const renderV1CreateFindingForm = (model: ProductV1ConsoleModel): string =>
  renderSmallV1CreateForm(model, "createFinding", "Add finding", [
    renderTextInput("title", "Finding title", "", true),
    renderSelect("severity", "Severity", "high", severityOptions(), "", true),
    renderSelect("sourceType", "Source", "manual", [["manual", "Manual"], ["provider", "Provider"]], "", true)
  ]);

const renderV1CreateRemediationForm = (model: ProductV1ConsoleModel): string =>
  renderSmallV1CreateForm(model, "createRemediationPlan", "Add plan", [
    renderTextInput("objective", "Objective", "", true)
  ]);

const renderV1CreateTaskForm = (model: ProductV1ConsoleModel): string =>
  renderSmallV1CreateForm(model, "createTask", "Add task", [
    renderTextInput("title", "Task title", "", true),
    renderSelect("priority", "Priority", "high", severityOptions(), "", true),
    renderTextInput("dueDate", "Due date", "", false)
  ]);

const renderProductV1IncidentsSection = (model: ProductV1ConsoleModel): string => [
  renderProductV1Header(model, "Incidents", "Reporting clocks", `${model.resources.incidents.length} incidents`),
  renderSmallV1CreateForm(model, "createIncident", "Declare incident", [
    renderTextInput("title", "Incident title", "", true),
    renderTextInput("awarenessTime", "Awareness time", "", false)
  ]),
  renderV1RecordsTable("Incident register", model.resources.incidents, ["title", "status", "awarenessTime", "reportingClock"])
].join("");

const renderProductV1RiskSection = (model: ProductV1ConsoleModel): string => {
  const subnav = renderProductV1Subnav(model, "Risk and policy pages", [
    { hrefTail: "risks", label: "Risks" },
    { hrefTail: "policies", label: "Policies" }
  ]);

  if (model.routeTail === "policies") {
    return [
      renderProductV1Header(model, "Risk and policy", "Policies", `${model.resources.policies.length} policies`),
      subnav,
      '<section class="ps-grid ps-stack-top">',
      renderSmallV1CreateForm(model, "createPolicy", "Add policy", [
        renderTextInput("title", "Policy title", "", true),
        renderTextInput("reviewDueAt", "Review due", "", false)
      ]),
      renderProductScoreCard("Policy reviews", String(model.resources.policyReviews.length), "scheduled review checks"),
      "</section>",
      renderV1RecordsTable("Policies", model.resources.policies, ["title", "status", "reviewDueAt", "updatedAt"])
    ].join("");
  }

  return [
    renderProductV1Header(model, "Risk and policy", "Risks", `${model.resources.risks.length} risks`),
    subnav,
    '<section class="ps-grid ps-stack-top">',
    renderSmallV1CreateForm(model, "createRisk", "Add risk", [
      renderTextarea("statement", "Risk statement", "", "", "ps-field--full"),
      renderTextInput("inherentScore", "Inherent score", "3", true, "number", "", ['min="1"', 'max="5"']),
      renderTextInput("residualScore", "Residual score", "2", true, "number", "", ['min="1"', 'max="5"']),
      renderSelect("treatment", "Treatment", "mitigate", [["mitigate", "Mitigate"], ["accept", "Accept"]], "", true)
    ]),
    renderProductScoreCard("Policies", String(model.resources.policies.length), "documents available for control mapping"),
    "</section>",
    renderV1RecordsTable("Risks", model.resources.risks, ["statement", "state", "treatment", "residualScore"])
  ].join("");
};

const renderProductV1GovernanceSection = (model: ProductV1ConsoleModel): string => [
  renderProductV1Header(model, "Governance", "Reviews, attestations, and training", `${model.resources.governanceActivities.length} activities`),
  '<section class="ps-grid">',
  renderSmallV1CreateForm(model, "createSupplierReview", "Schedule supplier review", [
    renderTextInput("supplierId", "Supplier ID", "", true),
    renderTextInput("reviewDueAt", "Review due", "", false)
  ]),
  renderSmallV1CreateForm(model, "createPolicyReview", "Schedule policy review", [
    renderTextInput("policyDocumentId", "Policy ID", "", true),
    renderTextInput("reviewDueAt", "Review due", "", false)
  ]),
  renderSmallV1CreateForm(model, "createGovernanceActivity", "Add activity", [
    renderTextInput("title", "Activity title", "", true),
    renderSelect("activityType", "Activity type", "management_review", [["management_review", "Management review"], ["risk_review", "Risk review"], ["supplier_review", "Supplier review"], ["training", "Training"], ["attestation", "Attestation"]], "", true),
    renderTextInput("dueAt", "Due", "", false)
  ]),
  renderSmallV1CreateForm(model, "createTrainingRecord", "Assign training", [
    renderTextInput("subject", "Subject", "", true),
    renderTextInput("dueAt", "Due", "", false)
  ]),
  "</section>",
  renderV1RecordsTable("Supplier reviews", model.resources.supplierReviews, ["supplierId", "status", "outcome", "reviewDueAt"]),
  renderV1RecordsTable("Policy reviews", model.resources.policyReviews, ["policyDocumentId", "status", "reviewDueAt", "completedAt"]),
  renderV1RecordsTable("Governance activities", model.resources.governanceActivities, ["title", "activityType", "status", "dueAt"]),
  renderV1RecordsTable("Training records", model.resources.trainingRecords, ["subject", "status", "dueAt", "completedAt"]),
  renderV1RecordsTable("Attestations", model.resources.attestations, ["title", "scope", "status", "dueAt"]),
  renderV1RecordsTable("Calendar events", model.resources.governanceCalendarEvents, ["title", "eventType", "startsAt", "status"])
].join("");

const renderProductV1EvidenceSection = (model: ProductV1ConsoleModel): string => [
  renderProductV1Header(model, "Evidence", "File objects and retention gates", `${model.resources.fileObjects.length} files`),
  '<section class="ps-grid">',
  renderSmallV1CreateForm(model, "createRetentionPolicy", "Add retention policy", [
    renderTextInput("name", "Policy name", "", true),
    renderSelect("retentionClass", "Retention class", "evidence", [["evidence", "Evidence"], ["report_snapshot", "Report snapshot"], ["audit_export", "Audit export"], ["temporary", "Temporary"]], "", true),
    renderTextInput("retainForDays", "Retain for days", "365", true, "number", "", ['min="0"', 'max="3650"']),
    renderCheckbox("legalHoldDefault", "Apply legal hold by default", false)
  ]),
  renderSmallV1CreateForm(model, "createFileObject", "Register file metadata", [
    renderTextInput("filename", "Filename", "", true),
    renderTextInput("mimeType", "MIME type", "application/octet-stream", true),
    renderTextInput("sizeBytes", "Size bytes", "0", true, "number", "", ['min="0"']),
    renderTextInput("checksumSha256", "SHA-256", "", true),
    renderTextInput("storageKey", "Storage key", "", true),
    renderSelect("retentionClass", "Retention class", "evidence", [["evidence", "Evidence"], ["report_snapshot", "Report snapshot"], ["audit_export", "Audit export"], ["temporary", "Temporary"]], "", true)
  ]),
  "</section>",
  renderV1RecordsTable("Retention policies", model.resources.retentionPolicies, ["name", "retentionClass", "retainForDays", "legalHoldDefault"]),
  renderV1RecordsTable("File objects", model.resources.fileObjects, ["filename", "purpose", "scanStatus", "retainUntil", "legalHold"])
].join("");

const renderProductV1ReportsSection = (model: ProductV1ConsoleModel): string => [
  renderProductV1Header(model, "Reports", "Immutable report snapshots", `${model.resources.reportSnapshots.length} snapshots`),
  `<form class="ps-panel ps-form" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="create-product-v1-report-snapshot">`,
  '<input type="hidden" name="_action" value="createReportSnapshot">',
  '<div class="ps-form-grid">',
  ...[
    renderSelect("templateKey", "Template", "nis2", reportTemplateOptions(model), "", true),
    renderSelect("locale", "Locale", "en", [["en", "English"], ["ro", "Romanian"], ["pl", "Polish"], ["de", "German"]], "", true),
    renderTextInput("sourceReferences", "Source references", "eu-nis2-art-21", false)
  ].map((field) => prefixGeneratedFieldIds(field, "createReportSnapshot")),
  "</div>",
  renderCommandButton({ label: "Create snapshot", ariaLabel: "Create report snapshot", tone: "primary", type: "submit" }),
  "</form>",
  renderV1RecordsTable("Report templates", model.reportTemplates, ["templateKey", "supportedFormats", "pdfStatus"]),
  renderV1RecordsTable("Report snapshots", model.resources.reportSnapshots, ["templateKey", "locale", "status", "checksumSha256", "createdAt"])
].join("");

const renderProductV1ConnectorsSection = (model: ProductV1ConsoleModel): string => {
  const subnav = renderProductV1Subnav(model, "Connector pages", [
    { hrefTail: "connectors", label: "Overview" },
    { hrefTail: "connectors/microsoft365", label: "Microsoft 365" }
  ]);
  const microsoft365Events = model.resources.internalEvents.filter((event) =>
    String(event.eventType ?? "").includes("microsoft365")
  );

  return [
    renderProductV1Header(model, "Connectors", "Microsoft 365 connector", `${model.providerCapabilities.length} capabilities`),
    subnav,
    '<section class="ps-grid ps-stack-top">',
    '<article class="ps-panel"><h2 class="ps-panel__title">Safety boundary</h2><p class="ps-muted">Baseline read-only sync can be requested when a connection exists. Provider writes remain gated until approval, preflight, snapshots, and verification exist.</p><div class="ps-chip-row">' +
      renderStatusPill({ label: "read-only first", tone: "success" }) +
      renderStatusPill({ label: "writes gated", tone: "warning" }) +
      renderStatusPill({ label: "history retained", tone: "info" }) +
      "</div></article>",
    `<form class="ps-panel ps-form" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="run-product-v1-microsoft-sync">`,
    '<input type="hidden" name="_action" value="runMicrosoft365Sync">',
    '<h2 class="ps-panel__title">Request sync</h2>',
    prefixGeneratedFieldIds(renderTextInput("requestedModules", "Modules", "", false), "runMicrosoft365Sync"),
    renderCommandButton({ label: "Queue sync", ariaLabel: "Queue Microsoft 365 sync", tone: "primary", type: "submit" }),
    "</form>",
    "</section>",
    renderV1RecordsTable("Provider capabilities", model.providerCapabilities, ["moduleKey", "capabilityKey", "state", "statusReason"]),
    renderV1RecordsTable("Recent connector events", microsoft365Events, ["eventType", "outboxStatus", "attempts", "createdAt"])
  ].join("");
};

const renderProductV1NotificationsSection = (model: ProductV1ConsoleModel): string => {
  const notifications = model.resources.notifications;
  const unreadCount = notifications.filter((notification) => notification.status === "unread").length;
  const highPriorityCount = notifications.filter((notification) =>
    notification.severity === "high" || notification.severity === "critical"
  ).length;
  const archivedCount = notifications.filter((notification) => notification.status === "archived").length;
  return [
    renderProductV1Header(model, "Notifications", "Notification center", `${unreadCount} unread`),
    '<section class="ps-grid ps-grid--dense" aria-label="Notification center summary">',
    renderProductScoreCard("Unread", String(unreadCount), `${notifications.length} total items`),
    renderProductScoreCard("High priority", String(highPriorityCount), "high and critical"),
    renderProductScoreCard("Archived", String(archivedCount), "retained in product state"),
    "</section>",
    '<section class="ps-grid ps-stack-top">',
    renderV1CreateNotificationForm(model),
    renderV1NotificationPreferencesForm(model),
    "</section>",
    renderV1NotificationTable(model)
  ].join("");
};

const renderV1CreateNotificationForm = (model: ProductV1ConsoleModel): string =>
  renderSmallV1CreateForm(model, "createNotification", "Add notification", [
    renderTextInput("title", "Title", "", true),
    renderTextarea("body", "Body", "", "", "ps-field--full"),
    renderSelect("category", "Category", "system", notificationCategoryOptions(), "", true),
    renderSelect("severity", "Severity", "info", [["info", "Info"], ...severityOptions()], "", true),
    renderTextInput("sourceResourceType", "Source type", "", false),
    renderTextInput("sourceResourceId", "Source ID", "", false),
    renderTextInput("actionHref", "Action link", "", false)
  ]);

const renderV1NotificationPreferencesForm = (model: ProductV1ConsoleModel): string => {
  const preferences = model.notificationPreferences;
  return [
    `<form class="ps-panel ps-form" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="update-product-v1-notification-preferences">`,
    '<input type="hidden" name="_action" value="updateNotificationPreferences">',
    '<h2 class="ps-panel__title">Preferences</h2>',
    '<div class="ps-form-grid">',
    ...[
      renderSelect(
        "digestFrequency",
        "Digest",
        String(fieldValue(preferences, "digestFrequency") ?? "off"),
        [["daily", "Daily"], ["weekly", "Weekly"], ["off", "Off"]],
        "",
        true
      ),
      renderTextInput(
        "suppressedCategories",
        "Suppressed categories",
        notificationSuppressedCategories(preferences).join(", "),
        false
      ),
      renderTextInput("mutedUntil", "Muted until", String(fieldValue(preferences, "mutedUntil") ?? ""), false)
    ].map((field) => prefixGeneratedFieldIds(field, "updateNotificationPreferences")),
    "</div>",
    renderCommandButton({ label: "Save preferences", ariaLabel: "Save notification preferences", tone: "primary", type: "submit" }),
    "</form>"
  ].join("");
};

const renderV1NotificationTable = (model: ProductV1ConsoleModel): string =>
  renderDataTable<Record<string, unknown>>(
    "Notification center",
    [
      {
        header: "Notification",
        render: (notification) =>
          `<strong>${escapeHtml(String(notification.title ?? "Notification"))}</strong><br><span class="ps-muted">${escapeHtml(
            String(notification.body ?? notification.id ?? "")
          )}</span>`
      },
      { header: "Category", render: (notification) => renderV1FieldValue(notification.category) },
      { header: "Severity", render: (notification) => renderV1FieldValue(notification.severity) },
      { header: "Status", render: (notification) => renderV1FieldValue(notification.status) },
      { header: "Updated", render: (notification) => renderV1FieldValue(notification.updatedAt) },
      {
        header: "Actions",
        render: (notification) => renderV1NotificationActions(model, String(notification.id ?? ""), String(notification.status ?? ""))
      }
    ],
    model.resources.notifications
  );

const renderV1NotificationActions = (model: ProductV1ConsoleModel, notificationId: string, status: string): string => {
  const actionPath = escapeHtml(productV1CurrentHref(model));
  const escapedId = escapeHtml(notificationId);
  return [
    status === "read"
      ? ""
      : `<form class="ps-form ps-form--compact" action="${actionPath}" method="post"><input type="hidden" name="_action" value="markNotificationRead"><input type="hidden" name="notificationId" value="${escapedId}">${renderCommandButton({
          label: "Read",
          ariaLabel: "Mark notification read",
          tone: "secondary",
          type: "submit"
        })}</form>`,
    status === "archived"
      ? ""
      : `<form class="ps-form ps-form--compact" action="${actionPath}" method="post"><input type="hidden" name="_action" value="archiveNotification"><input type="hidden" name="notificationId" value="${escapedId}">${renderCommandButton({
          label: "Archive",
          ariaLabel: "Archive notification",
          tone: "secondary",
          type: "submit"
        })}</form>`
  ].join("");
};

const renderProductV1EventsSection = (model: ProductV1ConsoleModel): string => [
  renderProductV1Header(model, "Internal events", "Outbox-compatible event handoff", `${pendingInternalEventCount(model)} pending`),
  renderV1RecordsTable("Customer-visible support sessions", model.resources.supportSessions, [
    "reason",
    "status",
    "policyBasis",
    "ticketReference",
    "startedAt",
    "expiresAt",
    "endedAt"
  ]),
  renderV1RecordsTable("Internal events", model.resources.internalEvents, ["eventType", "aggregateType", "aggregateId", "outboxStatus", "attempts", "publishedAt", "failureReason"])
].join("");

const renderSmallV1CreateForm = (model: ProductV1ConsoleModel, action: string, title: string, fields: string[]): string => [
  `<form class="ps-panel ps-form" action="${escapeHtml(productV1CurrentHref(model))}" method="post" data-ui-action="${escapeHtml(action)}">`,
  `<input type="hidden" name="_action" value="${escapeHtml(action)}">`,
  `<h2 class="ps-panel__title">${escapeHtml(title)}</h2>`,
  '<div class="ps-form-grid">',
  ...fields.map((field) => prefixGeneratedFieldIds(field, action)),
  "</div>",
  renderCommandButton({ label: title, ariaLabel: title, tone: "primary", type: "submit" }),
  "</form>"
].join("");

const prefixGeneratedFieldIds = (fieldHtml: string, prefix: string): string =>
  fieldHtml.replace(
    /\b(for|id|aria-describedby|data-wizard-question)="([^"]+)"/g,
    (_match, attribute: string, value: string) => `${attribute}="${escapeHtml(prefix)}-${value}"`
  );

const renderV1RecordsTable = (title: string, rows: Array<Record<string, unknown>>, fields: string[]): string =>
  renderDataTable<Record<string, unknown>>(
    title,
    [
      {
        header: "Record",
        render: (row) =>
          `<strong>${escapeHtml(primaryRecordLabel(row))}</strong><br><span class="ps-muted">${escapeHtml(String(row.id ?? ""))}</span>`
      },
      ...fields.map((field) => ({
        header: field.replaceAll(/([A-Z])/g, " $1"),
        render: (row: Record<string, unknown>) => renderV1FieldValue(row[field])
      }))
    ],
    rows
  );

const renderV1FieldValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return escapeHtml(value.map((entry) => String(entry)).join(", "));
  }
  if (value && typeof value === "object") {
    return `<span class="ps-muted">${escapeHtml(JSON.stringify(value).slice(0, 96))}</span>`;
  }
  if (typeof value === "boolean") {
    return renderStatusPill({ label: value ? "yes" : "no", tone: value ? "success" : "neutral" });
  }
  if (typeof value === "string" && ["open", "pending", "failed", "blocked", "review_required"].some((token) => value.toLowerCase().includes(token))) {
    return renderStatusPill({ label: value.replaceAll("_", " "), tone: "warning" });
  }
  if (typeof value === "string" && ["ready", "published", "complete", "completed", "available", "clean"].some((token) => value.toLowerCase().includes(token))) {
    return renderStatusPill({ label: value.replaceAll("_", " "), tone: "success" });
  }
  return escapeHtml(value === undefined || value === null || value === "" ? "Not set" : String(value));
};

const primaryRecordLabel = (row: Record<string, unknown>): string =>
  String(
    row.title ??
      row.name ??
      row.displayName ??
      row.objective ??
      row.statement ??
      row.filename ??
      row.templateKey ??
      row.eventType ??
      row.subject ??
      "Record"
  );

const fieldValue = (record: Record<string, unknown> | null, field: string): unknown =>
  record && typeof record === "object" ? record[field] : undefined;

const completedSetupSteps = (model: ProductV1ConsoleModel): string[] => {
  const completed = fieldValue(model.setup, "completedSteps");
  return Array.isArray(completed) ? completed.filter((entry): entry is string => typeof entry === "string") : [];
};

const setupStatus = (model: ProductV1ConsoleModel): string => String(fieldValue(model.setup, "status") ?? "NOT_STARTED");

const pendingInternalEventCount = (model: ProductV1ConsoleModel): number =>
  model.resources.internalEvents.filter((event) => event.outboxStatus === "pending").length;

const severityOptions = (): Array<readonly [string, string]> => [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["critical", "Critical"]
];

const notificationCategoryOptions = (): Array<readonly [string, string]> => [
  ["system", "System"],
  ["compliance", "Compliance"],
  ["incident", "Incident"],
  ["evidence", "Evidence"],
  ["remediation", "Remediation"],
  ["connector", "Connector"],
  ["governance", "Governance"]
];

const notificationSuppressedCategories = (preferences: Record<string, unknown> | null): string[] => {
  const suppressedCategories = fieldValue(preferences, "suppressedCategories");
  return Array.isArray(suppressedCategories)
    ? suppressedCategories.filter((category): category is string => typeof category === "string")
    : [];
};

const reportTemplateOptions = (model: ProductV1ConsoleModel): Array<readonly [string, string]> => {
  const options = model.reportTemplates
    .map((template) => String(template.templateKey ?? ""))
    .filter((templateKey) => templateKey.length > 0)
    .map((templateKey) => [templateKey, templateKey.replaceAll("_", " ")] as const);
  return options.length > 0 ? options : [["nis2", "nis2"]];
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
    '<p class="ps-muted">The connect action requests the baseline read bundle by default. Optional read or write bundle grants are recorded as permission metadata; provider write execution stays gated by the action lifecycle.</p>',
    '<div class="ps-chip-row">',
    renderStatusPill({ label: "m365_read_baseline", tone: "info" }),
    renderStatusPill({ label: "security optional", tone: "neutral" }),
    renderStatusPill({ label: "Intune optional", tone: "neutral" }),
    renderStatusPill({ label: "writes gated", tone: "neutral" }),
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
    renderCompanyLogoUploadScript(),
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
    renderNotificationOperatorAlertPanel(model),
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
  const locale = copy.locale;
  const activePartner = activePartnerForConsole(model);
  const role = activePartner?.membership.role ?? "no partner role";
  const canCreateCustomer = Boolean(activePartner && ["owner", "admin"].includes(activePartner.membership.role));
  const content = [
    `<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Sari la conținut" : "Skip to content")}</a>`,
    renderActiveTenantAccessBanner(model.activeTenantAccess, { ...options, locale }),
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="partner-console">',
    '<section class="ps-section" aria-labelledby="partner-console-title">',
    '<div class="ps-section__header">',
    `<div><p class="ps-route-hero__eyebrow">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Centrul de operare al partenerului" : "Partner operations center")}</p><h1 class="ps-section__title" id="partner-console-title">${escapeHtml(productText(locale, "Partner portfolio"))}</h1><p class="ps-muted">${escapeHtml(
      model.session.user.displayName ?? (resolveProductLocale(locale) === "ro" ? "Utilizator partener autentificat" : "Signed-in partner user")
    )}</p></div>`,
    renderLocaleSwitcher(locale),
    renderStatusPill({
      label: productStatusText(locale, role),
      tone: canCreateCustomer ? "success" : activePartner ? "info" : "warning"
    }),
    "</div>",
    '<div class="ps-section__body">',
    model.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(model.errorMessage)}</p>` : "",
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<div class="ps-command-row">',
    `<a class="ps-command" href="/" data-ui-action="back-to-dashboard">${escapeHtml(productText(locale, "Back to dashboard"))}</a>`,
    `<a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">${escapeHtml(productText(locale, "Switch workspace"))}</a>`,
    "</div>",
    model.partners.length === 0
      ? renderPartnerCreateOnlyPanel(locale)
      : renderPartnerPortfolioContent(model, canCreateCustomer, { ...options, locale }),
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
    `<title>${escapeHtml(productText(locale, "Partner portfolio"))} | PureSOC</title>`,
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
    renderCountryPackOperationalDifferences(pack),
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

const renderCountryPackOperationalDifferences = (pack: Nis2CountryPackDefinitionSurface): string => {
  const differences = pack.operationalDifferences ?? [];
  if (differences.length === 0) {
    return "";
  }

  return renderDataTable<NonNullable<Nis2CountryPackDefinitionSurface["operationalDifferences"]>[number]>(
    "Country-specific operational differences",
    [
      {
        header: "Area",
        render: (difference) => renderStatusPill({ label: difference.area.replaceAll("_", " "), tone: "info" })
      },
      {
        header: "Difference",
        render: (difference) =>
          `<strong>${escapeHtml(difference.title)}</strong><br><span class="ps-muted">${escapeHtml(difference.summary)}</span>`
      },
      {
        header: "Review",
        render: (difference) =>
          `${renderStatusPill({
            label: difference.reviewStatus.replaceAll("_", " "),
            tone: difference.reviewStatus === "active" || difference.reviewStatus === "reviewed" ? "success" : "warning"
          })}<br><span class="ps-muted">${escapeHtml(difference.sourceIds.join(", "))}</span>`
      }
    ],
    differences
  );
};

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
    renderCompanyLogoUpload({ fieldId: "workspace-create-logo" }),
    renderCommandButton({ label: "Create workspace", ariaLabel: "Create local workspace", tone: "primary", type: "submit" }),
    "</form>",
    "</article>",
    '<p class="ps-stack-top"><a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a> <a class="ps-command" href="/partners" data-ui-action="open-partner-portfolio">Open partner portfolio</a></p>',
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
    renderCompanyLogoUploadScript(),
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
    renderCompanyLogoUploadScript(),
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
    renderCompanyLogoUpload({ fieldId: "romania-company-logo" }),
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
        )}</span><span class="ps-nav__label">${escapeHtml(item.label)}</span><span class="ps-nav__chevron" aria-hidden="true">&rsaquo;</span></a>`
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
          render: (channel) => renderNotificationChannelActions(channel, model.canManageChannels)
        }
      ],
      model.channels
    ),
    "</article>"
  ].join("");

const renderNotificationOperatorAlertPanel = (model: NotificationSettingsScreenModel): string => {
  const openCount = model.operatorAlerts.filter((alert) => alert.status === "open").length;
  const canAcknowledge = model.roleKeys.some((role) =>
    ["owner", "org_admin", "compliance_manager", "security_operator"].includes(role)
  );

  return [
    '<article class="ps-panel ps-stack-top" aria-labelledby="notification-operator-alert-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h2 class="ps-panel__title" id="notification-operator-alert-title">Operator alerts</h2><p class="ps-muted">Local delivery alerts created when notification retry backoff is exhausted.</p></div>',
    renderStatusPill({ label: `${openCount} open`, tone: openCount > 0 ? "danger" : "success" }),
    "</div>",
    renderDataTable(
      "Notification operator alerts",
      [
        {
          header: "Alert",
          render: (alert) => escapeHtml(alert.title)
        },
        {
          header: "Event",
          render: (alert) => escapeHtml(alert.eventType ?? alert.alertType)
        },
        {
          header: "Status",
          render: (alert) =>
            renderStatusPill({ label: alert.status, tone: alert.status === "open" ? "danger" : "neutral" })
        },
        {
          header: "Created",
          render: (alert) => escapeHtml(formatTimestamp(alert.createdAt))
        },
        {
          header: "Actions",
          render: (alert) => renderNotificationOperatorAlertActions(alert.id, alert.status, canAcknowledge)
        }
      ],
      model.operatorAlerts
    ),
    "</article>"
  ].join("");
};

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

const renderNotificationOperatorAlertActions = (
  alertId: string,
  status: string,
  canAcknowledge: boolean
): string =>
  [
    '<div class="ps-chip-row">',
    `<form class="ps-inline-form" action="/settings/notifications/operator-alerts/${escapeHtml(
      alertId
    )}/acknowledge" method="post" data-ui-action="acknowledge-notification-operator-alert">`,
    renderCommandButton({
      label: "Acknowledge",
      ariaLabel: "Acknowledge notification operator alert",
      disabled: !canAcknowledge || status !== "open",
      tone: "secondary",
      type: "submit"
    }),
    "</form>",
    "</div>"
  ].join("");

const renderNotificationChannelActions = (
  channel: NotificationSettingsScreenModel["channels"][number],
  canManage: boolean
): string => {
  const channelId = channel.id;
  const destinationFieldId = `notification-destination-${channelId}`;
  const enabledFieldId = `notification-enabled-${channelId}`;

  return [
    '<div class="ps-chip-row">',
    `<form class="ps-inline-form ps-chip-row ps-chip-row--compact" action="/settings/notifications/channels/${escapeHtml(
      channelId
    )}/update" method="post" data-ui-action="update-notification-channel">`,
    `<label class="ps-sr-only" for="${escapeHtml(destinationFieldId)}">Rotate notification destination</label>`,
    `<input id="${escapeHtml(destinationFieldId)}" name="destination" type="text" autocomplete="off" spellcheck="false" value="${escapeHtml(
      channel.destination ?? ""
    )}" placeholder="${escapeHtml(channel.destination ? "Destination" : channel.destinationPreview)}"${canManage ? "" : " disabled"}>`,
    `<label class="ps-sr-only" for="${escapeHtml(enabledFieldId)}">Notification channel status</label>`,
    `<select id="${escapeHtml(enabledFieldId)}" name="enabled"${canManage ? "" : " disabled"}>`,
    `<option value="true"${channel.enabled ? " selected" : ""}>Enabled</option>`,
    `<option value="false"${channel.enabled ? "" : " selected"}>Disabled</option>`,
    "</select>",
    renderCommandButton({
      label: "Save",
      ariaLabel: "Save notification channel settings",
      disabled: !canManage,
      tone: "primary",
      type: "submit"
    }),
    "</form>",
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
};

const activePartnerForConsole = (model: PartnerConsoleModel) =>
  model.partners.find((entry) => entry.partner.id === model.activePartnerId) ?? model.partners[0] ?? null;

const partnerRouteSegment = (partnerId: string): string => escapeHtml(encodeURIComponent(partnerId));

const partnerConsoleHref = (partnerId: string, options: RenderPartnerConsoleOptions = {}): string =>
  options.routeMode === "app"
    ? `/app/partner/${partnerRouteSegment(partnerId)}`
    : `/partners?partnerId=${partnerRouteSegment(partnerId)}`;

const partnerActionBase = (partnerId: string, options: RenderPartnerConsoleOptions = {}): string =>
  options.routeMode === "app"
    ? `/app/partner/${partnerRouteSegment(partnerId)}`
    : `/partners/${partnerRouteSegment(partnerId)}`;

const renderLocaleSwitcher = (locale?: string | null): string => {
  const selected = resolveProductLocale(locale);
  return [
    '<nav class="ps-locale-switcher" aria-label="Language">',
    '<span class="ps-locale-switcher__label">RO / EN</span>',
    `<a href="/locale/ro"${selected === "ro" ? ' aria-current="page"' : ""} data-ui-action="switch-locale-ro">RO</a>`,
    `<a href="/locale/en"${selected === "en" ? ' aria-current="page"' : ""} data-ui-action="switch-locale-en">EN</a>`,
    `<span class="ps-sr-only">${escapeHtml(localeLabel(locale))}</span>`,
    "</nav>"
  ].join("");
};

const renderActiveTenantAccessBanner = (
  banner?: ActiveTenantAccessBannerSurface | null,
  options: RenderPartnerConsoleOptions = {}
): string => {
  const session = banner?.session;
  if (!banner || !session || session.status !== "active") {
    return "";
  }

  const isRomanian = resolveProductLocale(options.locale) === "ro";

  return [
    `<aside class="ps-tenant-banner" role="status" aria-label="${escapeHtml(isRomanian ? "Sesiune activă la client" : "Active customer session")}">`,
    '<div class="ps-tenant-banner__inner">',
    `<p><strong>${escapeHtml(isRomanian ? `Lucrați pentru ${banner.customerName} prin ${banner.partnerName}.` : `You are accessing ${banner.customerName} through ${banner.partnerName}.`)}</strong> ${escapeHtml(isRomanian ? "Accesul este auditat și nu reprezintă impersonare. Acțiunile sunt înregistrate cu utilizatorul real, iar scrierile către furnizori rămân dezactivate." : "This is review-only customer access, not impersonation. Actions are logged with your real user and provider writes stay disabled.")}</p>`,
    '<div class="ps-chip-row ps-chip-row--compact">',
    renderStatusPill({ label: isRomanian ? "sesiune client activă" : "customer session active", tone: "warning" }),
    banner.grantLevel
      ? renderSourceChip({
          label: isRomanian ? "Acces" : "Grant",
          detail: productStatusText(options.locale, banner.grantLevel)
        })
      : "",
    renderSourceChip({ label: isRomanian ? "Motiv" : "Reason", detail: session.reason }),
    renderSourceChip({ label: isRomanian ? "Expiră" : "Expires", detail: formatTimestamp(session.expiresAt) }),
    "</div>",
    '<nav class="ps-tenant-banner__nav" aria-label="Customer workspace">',
    `<a href="/dashboard">${escapeHtml(productText(options.locale, "Dashboard"))}</a>`,
    `<a href="/onboarding">${escapeHtml(productText(options.locale, "Onboarding"))}</a>`,
    '<a href="/microsoft365">Microsoft 365</a>',
    `<a href="/reports">${escapeHtml(productText(options.locale, "Reports"))}</a>`,
    "</nav>",
    `<form class="ps-inline-form" action="${partnerActionBase(banner.partnerId, options)}/tenant-sessions/${escapeHtml(
      session.id
    )}/exit" method="post" data-ui-action="exit-customer-tenant">`,
    renderCommandButton({ label: isRomanian ? "Închide clientul" : "Exit customer", ariaLabel: isRomanian ? "Închide sesiunea clientului" : "Exit customer session", tone: "danger", type: "submit" }),
    "</form>",
    "</div>",
    "</aside>"
  ].join("");
};

const renderPartnerCreateOnlyPanel = (locale?: string | null): string =>
  [
    '<div class="ps-grid">',
    renderPartnerCreatePanel(locale),
    '<article class="ps-panel ps-panel--quiet" aria-labelledby="partner-empty-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="partner-empty-title">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Portofoliul nu este configurat" : "No partner portfolio yet")}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Creați partenerul pentru a adăuga clienți prin drepturi de acces explicite." : "Create a partner record to add customer companies through explicit grants.")}</p></div>`,
    renderStatusPill({ label: resolveProductLocale(locale) === "ro" ? "configurare necesară" : "setup required", tone: "warning" }),
    "</div>",
    `<p>${escapeHtml(resolveProductLocale(locale) === "ro" ? "Datele rămân proprietatea clientului. Crearea partenerului nu acordă permisiuni Microsoft, nu activează facturarea și nu transmite date către autorități." : "Customer data stays tenant-owned. Creating a partner record does not create Microsoft permissions, billing, or authority submissions.")}</p>`,
    "</article>",
    "</div>"
  ].join("");

const renderPartnerPortfolioContent = (
  model: PartnerConsoleModel,
  canCreateCustomer: boolean,
  options: RenderPartnerConsoleOptions = {}
): string => {
  const activePartner = activePartnerForConsole(model);
  if (!activePartner) {
    return renderPartnerCreateOnlyPanel(options.locale);
  }

  return [
    renderPartnerCommandCenter(model, activePartner.partner.name, options.locale),
    renderPartnerSelector(model, activePartner.partner.id, options),
    '<div class="ps-grid">',
    renderPartnerMetrics(model, options.locale),
    renderPartnerCreateCustomerPanel(activePartner.partner.id, canCreateCustomer, options),
    "</div>",
    renderPartnerOpportunityTable(model, options.locale),
    renderPartnerPortfolioTable(model, activePartner.partner.id, options)
  ].join("");
};

const renderPartnerCommandCenter = (
  model: PartnerConsoleModel,
  partnerName: string,
  locale?: string | null
): string => {
  const isRomanian = resolveProductLocale(locale) === "ro";
  const unfinishedAssessments = model.portfolio.filter((row) => !row.snapshot?.assessmentCompleted).length;
  const disconnectedMicrosoft = model.portfolio.filter(
    (row) => !row.snapshot || row.snapshot.microsoftConnectionState === "disconnected"
  ).length;
  const highPriorityGaps = model.metrics?.highPriorityGaps ?? 0;
  const focusItems = [
    {
      count: unfinishedAssessments,
      label: isRomanian ? "evaluări de finalizat" : "assessments to complete",
      tone: unfinishedAssessments > 0 ? "warning" : "success"
    },
    {
      count: disconnectedMicrosoft,
      label: isRomanian ? "clienți fără Microsoft 365" : "customers without Microsoft 365",
      tone: disconnectedMicrosoft > 0 ? "warning" : "success"
    },
    {
      count: highPriorityGaps,
      label: isRomanian ? "deficiențe cu prioritate ridicată" : "high-priority gaps",
      tone: highPriorityGaps > 0 ? "danger" : "success"
    }
  ] as const;

  return [
    '<section class="ps-partner-command-center" aria-labelledby="partner-command-center-title">',
    '<div class="ps-partner-command-center__intro">',
    `<p class="ps-route-hero__eyebrow">${escapeHtml(isRomanian ? "Portofoliu în lucru" : "Portfolio in motion")}</p>`,
    `<h2 id="partner-command-center-title">${escapeHtml(partnerName)}</h2>`,
    `<p>${escapeHtml(isRomanian ? "Prioritizați clienții care au nevoie de o evaluare, dovezi sau date Microsoft 365. Accesul la fiecare client rămâne explicit și auditat." : "Prioritize customers that need an assessment, evidence, or Microsoft 365 data. Every customer entry remains explicit and audited.")}</p>`,
    '<div class="ps-command-row">',
    `<a class="ps-command ps-command--primary" href="#partner-customer-table-title">${escapeHtml(isRomanian ? "Deschide lista de clienți" : "Open customer queue")}</a>`,
    `<a class="ps-command" href="#partner-opportunities-title">${escapeHtml(isRomanian ? "Vezi oportunitățile" : "Review opportunities")}</a>`,
    "</div>",
    "</div>",
    '<ol class="ps-partner-focus-list" aria-label="Portfolio priorities">',
    ...focusItems.map(
      (item, index) =>
        `<li><span class="ps-partner-focus-list__number">0${index + 1}</span><div><strong>${escapeHtml(String(item.count))}</strong><span>${escapeHtml(item.label)}</span></div>${renderStatusPill({ label: item.count > 0 ? (isRomanian ? "de urmărit" : "follow up") : (isRomanian ? "în regulă" : "clear"), tone: item.tone })}</li>`
    ),
    "</ol>",
    "</section>"
  ].join("");
};

const renderPartnerSelector = (
  model: PartnerConsoleModel,
  activePartnerId: string,
  options: RenderPartnerConsoleOptions = {}
): string =>
  {
    const isRomanian = resolveProductLocale(options.locale) === "ro";
    return [
    '<article class="ps-panel ps-panel--quiet" aria-labelledby="partner-selector-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="partner-selector-title">${escapeHtml(isRomanian ? "Cont de partener" : "Partner account")}</h2><p class="ps-muted">${escapeHtml(isRomanian ? "Acțiunile folosesc rolul de partener și dreptul explicit acordat de client." : "Portfolio actions use partner membership plus an explicit customer grant.")}</p></div>`,
    renderStatusPill({ label: isRomanian ? `${model.partners.length} parteneri` : `${model.partners.length} partner${model.partners.length === 1 ? "" : "s"}`, tone: "info" }),
    "</div>",
    '<div class="ps-chip-row ps-stack-top">',
    ...model.partners.map((entry) => {
      const selected = entry.partner.id === activePartnerId;
      return `<a class="ps-command${selected ? " ps-command--primary" : ""}" href="${partnerConsoleHref(
        entry.partner.id,
        options
      )}" data-ui-action="select-partner">${escapeHtml(entry.partner.name)} (${escapeHtml(
        productStatusText(options.locale, entry.membership.role)
      )})</a>`;
    }),
    "</div>",
    "</article>"
    ].join("");
  };

const renderPartnerCreatePanel = (locale?: string | null): string =>
  [
    '<article class="ps-panel" aria-labelledby="partner-create-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="partner-create-title">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Creează partenerul" : "Create partner")}</h2><p class="ps-muted">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Folosiți numele comercial pe care clienții îl vor recunoaște în istoricul de audit." : "Use the business name customers recognize in audit records.")}</p></div>`,
    renderStatusPill({ label: resolveProductLocale(locale) === "ro" ? "rol de proprietar" : "owner role created", tone: "accent" }),
    "</div>",
    '<form class="ps-form" action="/partners" method="post" data-ui-action="create-partner">',
    `<div class="ps-field"><label for="partnerName">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Numele partenerului" : "Partner name")}</label><input id="partnerName" name="name" type="text" autocomplete="organization" required></div>`,
    `<div class="ps-field"><label for="partnerSlug">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Identificator URL" : "Partner slug")}</label><input id="partnerSlug" name="slug" type="text" autocomplete="off" spellcheck="false"><span class="ps-help">${escapeHtml(resolveProductLocale(locale) === "ro" ? "Opțional. Dacă rămâne gol, identificatorul este generat din nume." : "Optional. Leave blank to derive a stable identifier from the name.")}</span></div>`,
    renderCommandButton({ label: resolveProductLocale(locale) === "ro" ? "Creează partenerul" : "Create partner", ariaLabel: resolveProductLocale(locale) === "ro" ? "Creează contul de partener" : "Create partner account", tone: "primary", type: "submit" }),
    "</form>",
    "</article>"
  ].join("");

const renderPartnerCreateCustomerPanel = (
  partnerId: string,
  canCreateCustomer: boolean,
  options: RenderPartnerConsoleOptions = {}
): string => {
  const isRomanian = resolveProductLocale(options.locale) === "ro";
  return [
    '<article class="ps-panel" aria-labelledby="partner-create-customer-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="partner-create-customer-title">${escapeHtml(productText(options.locale, "Add customer"))}</h2><p class="ps-muted">${escapeHtml(isRomanian ? "Creează spațiul clientului și dreptul explicit al partenerului. Clientul rămâne separat și nu primește automat utilizatori." : "Creates a tenant and a partner grant. It does not add workspace membership.")}</p></div>`,
    renderStatusPill({ label: canCreateCustomer ? (isRomanian ? "proprietar sau administrator" : "owner or admin") : (isRomanian ? "doar vizualizare" : "viewer is read only"), tone: canCreateCustomer ? "success" : "warning" }),
    "</div>",
    `<form class="ps-form" action="${partnerActionBase(
      partnerId,
      options
    )}/customers" method="post" data-ui-action="create-partner-customer">`,
    '<div class="ps-form-grid">',
    `<div class="ps-field"><label for="customerName">${escapeHtml(productText(options.locale, "Company name"))}</label><input id="customerName" name="name" type="text" autocomplete="organization" required${canCreateCustomer ? "" : " disabled"}></div>`,
    `<div class="ps-field"><label for="customerLegalName">${escapeHtml(productText(options.locale, "Legal name"))}</label><input id="customerLegalName" name="legalName" type="text"${canCreateCustomer ? "" : " disabled"}></div>`,
    `<div class="ps-field"><label for="customerCountry">${escapeHtml(productText(options.locale, "Country"))}</label><select id="customerCountry" name="primaryCountryCode" required${canCreateCustomer ? "" : " disabled"}><option value="RO">${escapeHtml(productCountryName(options.locale, "RO"))}</option><option value="PL">${escapeHtml(productCountryName(options.locale, "PL"))}</option><option value="DE">${escapeHtml(productCountryName(options.locale, "DE"))}</option></select></div>`,
    `<div class="ps-field"><label for="customerGrantLevel">${escapeHtml(isRomanian ? "Nivel de acces" : "Grant level")}</label><select id="customerGrantLevel" name="grantLevel"${canCreateCustomer ? "" : " disabled"}><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select></div>`,
    "</div>",
    renderCommandButton({
      label: productText(options.locale, "Add customer"),
      ariaLabel: isRomanian ? "Adaugă spațiul clientului" : "Add customer tenant",
      disabled: !canCreateCustomer,
      tone: canCreateCustomer ? "primary" : "secondary",
      type: "submit"
    }),
    "</form>",
    "</article>"
  ].join("");
};

const renderPartnerMetrics = (model: PartnerConsoleModel, locale?: string | null): string => {
  const isRomanian = resolveProductLocale(locale) === "ro";
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
    `<div><h2 class="ps-panel__title" id="partner-portfolio-metrics-title">${escapeHtml(isRomanian ? "Starea portofoliului" : "Portfolio state")}</h2><p class="ps-muted">${escapeHtml(isRomanian ? "Evaluările, semnalele Microsoft și oportunitățile provin din datele fiecărui client." : "Assessment, Microsoft, and opportunity signals are derived from tenant-owned snapshots.")}</p></div>`,
    renderStatusPill({ label: isRomanian ? `${metrics.totalCustomerTenants} clienți` : `${metrics.totalCustomerTenants} customers`, tone: metrics.totalCustomerTenants > 0 ? "info" : "warning" }),
    "</div>",
    '<div class="ps-grid ps-grid--dense">',
    renderPartnerFact(isRomanian ? "Drepturi active" : "Active grants", String(activeGrants)),
    renderPartnerFact(isRomanian ? "Evaluări finalizate" : "Assessments done", String(metrics.completedAssessments)),
    renderPartnerFact(isRomanian ? "Posibil în domeniul NIS2" : "Likely in scope", String(metrics.customersLikelyOrPossiblyInScope)),
    renderPartnerFact(isRomanian ? "Organizații Microsoft" : "Microsoft tenants", String(metrics.connectedMicrosoftTenants)),
    renderPartnerFact(isRomanian ? "Deficiențe prioritare" : "High-priority gaps", String(metrics.highPriorityGaps)),
    renderPartnerFact(isRomanian ? "Oportunități" : "Opportunities", String(metrics.opportunities)),
    renderPartnerFact(productText(locale, "Current customer"), model.activeTenantAccess?.customerName ?? (isRomanian ? "Niciunul" : "None")),
    "</div>",
    "</article>"
  ].join("");
};

const renderPartnerOpportunityTable = (model: PartnerConsoleModel, locale?: string | null): string => {
  const isRomanian = resolveProductLocale(locale) === "ro";
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
    `<div><h2 class="ps-panel__title" id="partner-opportunities-title">${escapeHtml(isRomanian ? "Oportunități în portofoliu" : "Portfolio opportunities")}</h2><p class="ps-muted">${escapeHtml(isRomanian ? "Oportunități bazate pe nevoile de pregătire. Nu includ prețuri, marje, comisioane sau comenzi." : "Readiness opportunities only. No pricing, margin, commission, or ordering action is included.")}</p></div>`,
    renderStatusPill({ label: isRomanian ? `${opportunities.length} oportunități` : `${opportunities.length} opportunity${opportunities.length === 1 ? "" : "ies"}`, tone: opportunities.length > 0 ? "accent" : "neutral" }),
    "</div>",
    opportunities.length === 0
      ? `<div class="ps-empty-state"><p class="ps-muted">${escapeHtml(isRomanian ? "Nu au fost identificate încă oportunități în portofoliu." : "No portfolio opportunities have been generated yet.")}</p></div>`
      : renderDataTable(
          "Partner portfolio opportunities",
          [
            {
              header: isRomanian ? "Client" : "Customer",
              render: (row) => escapeHtml(row.customerName ?? row.customerId ?? (isRomanian ? "Client necunoscut" : "Unknown customer"))
            },
            {
              header: isRomanian ? "Tip" : "Type",
              render: (row) => escapeHtml(productDataText(locale, row.opportunityType))
            },
            {
              header: productText(locale, "Priority"),
              render: (row) => renderStatusPill({ label: productStatusText(locale, row.priority), tone: toneForPortfolioPriority(row.priority) })
            },
            {
              header: isRomanian ? "Capabilitate sau plan" : "Capability or plan",
              render: (row) => escapeHtml(row.relevantMicrosoftCapabilityOrPlan ?? (isRomanian ? "Serviciu al partenerului" : "Partner service"))
            },
            {
              header: isRomanian ? "Utilizatori" : "Users",
              render: (row) => escapeHtml(row.affectedUsers === undefined ? (isRomanian ? "Necunoscut" : "Unknown") : String(row.affectedUsers))
            },
            {
              header: isRomanian ? "Domenii NIS2" : "NIS2 areas",
              render: (row) => escapeHtml(row.nis2Areas.join(", ") || productText(locale, "Not mapped"))
            },
            {
              header: isRomanian ? "Sursa dovezii" : "Evidence source",
              render: (row) => escapeHtml(productDataText(locale, row.evidenceSource))
            },
            {
              header: productText(locale, "Next action"),
              render: (row) => escapeHtml(productDataText(locale, row.nextAction))
            }
          ],
          opportunities
        ),
    "</article>"
  ].join("");
};

const renderPartnerPortfolioTable = (
  model: PartnerConsoleModel,
  partnerId: string,
  options: RenderPartnerConsoleOptions = {}
): string => {
  const isRomanian = resolveProductLocale(options.locale) === "ro";
  return [
    '<article class="ps-panel ps-panel--wide ps-stack-top" aria-labelledby="partner-customer-table-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h2 class="ps-panel__title" id="partner-customer-table-title">${escapeHtml(productText(options.locale, "Customers"))}</h2><p class="ps-muted">${escapeHtml(isRomanian ? "Deschideți clientul numai după introducerea motivului. Nu poate exista mai mult de o sesiune activă." : "Open a customer only after entering a reason. Nested customer sessions are rejected by the API.")}</p></div>`,
    renderStatusPill({ label: isRomanian ? "sesiuni auditate" : "logged customer sessions", tone: "accent" }),
    "</div>",
    model.portfolio.length === 0
      ? `<div class="ps-empty-state"><p class="ps-muted">${escapeHtml(isRomanian ? "Partenerul nu are încă acces la niciun client." : "No customer grants exist for this partner.")}</p></div>`
      : renderDataTable<PartnerPortfolioCustomerSurface>(
          isRomanian ? "Portofoliul de clienți" : "Partner customer portfolio",
          [
            {
              header: productText(options.locale, "Company"),
              render: (row) => escapeHtml(row.organization?.name ?? row.grant.organizationId)
            },
            {
              header: productText(options.locale, "Country"),
              render: (row) =>
                [
                  escapeHtml(row.organization?.primaryCountryCode ?? "EU"),
                  row.snapshot?.sector
                    ? `<span class="ps-muted">${escapeHtml(productDataText(options.locale, row.snapshot.sector))}</span>`
                    : ""
                ].join("<br>")
            },
            {
              header: isRomanian ? "Încadrare" : "Scope",
              render: (row) =>
                escapeHtml(
                  row.snapshot?.likelyClassification
                    ? productDataText(options.locale, row.snapshot.likelyClassification)
                    : isRomanian
                      ? "Neevaluat"
                      : "Not assessed"
                )
            },
            {
              header: productText(options.locale, "Readiness"),
              render: (row) =>
                [
                  escapeHtml(formatPercent(row.snapshot?.readinessPercent, options.locale)),
                  `<span class="ps-muted">${escapeHtml(isRomanian ? "Dovezi" : "Evidence")} ${escapeHtml(formatPercent(row.snapshot?.evidenceConfidencePercent, options.locale))}</span>`
                ].join("<br>")
            },
            {
              header: "Microsoft",
              render: (row) =>
                renderStatusPill({
                  label: productStatusText(options.locale, row.snapshot?.microsoftConnectionState ?? "disconnected"),
                  tone: toneForMicrosoftConnection(row.snapshot?.microsoftConnectionState)
                })
            },
            {
              header: isRomanian ? "Oportunitate principală" : "Top opportunity",
              render: (row) =>
                escapeHtml(
                  row.snapshot?.topRecommendationOrOpportunity
                    ? productDataText(options.locale, row.snapshot.topRecommendationOrOpportunity)
                    : isRomanian
                      ? "Nicio recomandare încă"
                      : "No recommendation yet"
                )
            },
            {
              header: isRomanian ? "Activitate" : "Activity",
              render: (row) => escapeHtml(row.snapshot?.lastAssessmentOrSyncAt ? formatTimestamp(row.snapshot.lastAssessmentOrSyncAt) : productText(options.locale, "No activity yet"))
            },
            {
              header: isRomanian ? "Lucrează cu clientul" : "Enter customer",
              render: (row) => renderPartnerEnterCustomerForm(partnerId, row, options)
            }
          ],
          model.portfolio
        ),
    "</article>"
  ].join("");
};

const renderPartnerEnterCustomerForm = (
  partnerId: string,
  row: PartnerPortfolioCustomerSurface,
  options: RenderPartnerConsoleOptions = {}
): string => {
  const disabled = row.grant.status !== "active";
  const customerName = row.organization?.name ?? row.grant.organizationId;
  const isRomanian = resolveProductLocale(options.locale) === "ro";
  return [
    `<form class="ps-form ps-form--compact" action="${partnerActionBase(
      partnerId,
      options
    )}/tenant-sessions" method="post" data-ui-action="enter-customer-tenant">`,
    `<input type="hidden" name="organizationId" value="${escapeHtml(row.grant.organizationId)}">`,
    `<label class="ps-sr-only" for="reason-${escapeHtml(row.grant.id)}">${escapeHtml(isRomanian ? `Motivul accesului la ${customerName}` : `Reason for ${customerName}`)}</label>`,
    `<input id="reason-${escapeHtml(row.grant.id)}" name="reason" type="text" minlength="8" placeholder="${escapeHtml(isRomanian ? "Ex: analiză trimestrială" : "Reason for review")}" required${disabled ? " disabled" : ""}>`,
    renderCommandButton({
      label: isRomanian ? "Deschide" : "Enter",
      ariaLabel: isRomanian ? `Deschide ${customerName}` : `Enter ${customerName}`,
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

const formatPercent = (value: number | undefined, locale?: string | null): string =>
  typeof value === "number" ? `${value}%` : resolveProductLocale(locale) === "ro" ? "Necunoscut" : "Unknown";

const humanizeKey = (value: string): string =>
  value
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const renderPartnerConsoleCss = (): string => `
.ps-partner-command-center {
  display: grid;
  grid-template-columns: minmax(20rem, 1.2fr) minmax(24rem, 1fr);
  gap: 1.25rem;
  align-items: center;
  margin-bottom: 1rem;
  border: 1px solid var(--ps-color-accent);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-accent-soft);
  padding: 1.35rem;
}

.ps-partner-command-center__intro h2 {
  margin: 0.2rem 0 0.45rem;
  color: var(--ps-color-ink);
  font-size: 1.55rem;
}

.ps-partner-command-center__intro > p:not(.ps-route-hero__eyebrow) {
  max-width: 65ch;
  margin: 0;
  color: var(--ps-color-muted);
}

.ps-partner-focus-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ps-partner-focus-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  border-bottom: 1px solid var(--ps-color-border);
  padding: 0.7rem 0;
}

.ps-partner-focus-list li:last-child {
  border-bottom: 0;
}

.ps-partner-focus-list__number {
  color: var(--ps-color-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.ps-partner-focus-list li div {
  display: grid;
  min-width: 0;
}

.ps-partner-focus-list li strong {
  color: var(--ps-color-ink);
  font-size: 1.1rem;
}

.ps-partner-focus-list li div span {
  color: var(--ps-color-muted);
  font-size: 0.85rem;
}

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

@media (max-width: 900px) {
  .ps-partner-command-center,
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
    value: "Baseline first",
    detail: "The first connection asks for the baseline application-permission bundle only; optional security and Intune reads need a separate reviewed expansion."
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
    '<p class="ps-help">Admin consent redirects use Microsoft identity platform v2 with Microsoft Graph /.default application permissions. Microsoft shows every Graph permission configured on the Entra app registration; PureSOC records granted roles while keeping provider write execution behind the separate action lifecycle.</p>',
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
