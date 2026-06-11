import type { DashboardWidgetContract } from "@puresoc/dashboards";
import type { ActionRun } from "@puresoc/recommendations";
import type { ReportEvidenceSummary, ReportSourceReference } from "@puresoc/reports";
import {
  PURESOC_MESSAGE_KEYS,
  resolvePureSocLocale,
  resolvePureSocMessage,
  type PureSocLocale
} from "@puresoc/shared";
import {
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
  CountryPackSurface,
  GapSurface,
  Microsoft365ModuleSurface,
  OnboardingSurface,
  OrganizationInvitationScreenModel,
  OperationalConsoleModel,
  OperationalStatus,
  Microsoft365HealthSurface,
  RomaniaOnboardingRouteModel,
  RomaniaReadinessGapSurface,
  RecommendationSurface,
  ReportSurface,
  WorkspaceSelectionModel
} from "./app-data";

export interface RenderOperationalConsoleOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface RenderLoginScreenOptions {
  activeOrganizationId?: string | null;
  errorMessage?: string;
  locale?: string | null;
  productName?: string;
}

export interface RenderRegisterScreenOptions {
  errorMessage?: string;
  locale?: string | null;
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

export interface RenderWorkspaceSelectionOptions {
  includeDocumentShell?: boolean;
  locale?: string | null;
}

export interface RenderOrganizationInvitationsOptions {
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
    `<div class="ps-field"><label for="email">${escapeHtml(copy.email)}</label><input id="email" name="email" type="email" autocomplete="email" required></div>`,
    `<div class="ps-field"><label for="password">${escapeHtml(copy.password)}</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>`,
    normalized.activeOrganizationId
      ? `<input type="hidden" name="activeOrganizationId" value="${escapeHtml(normalized.activeOrganizationId)}">`
      : "",
    renderCommandButton({ label: copy.signIn, ariaLabel: `${copy.signIn} PureSOC`, tone: "primary", type: "submit" }),
    "</form>",
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
    '<div class="ps-field"><label for="displayName">Display name</label><input id="displayName" name="displayName" type="text" autocomplete="name" required><span class="ps-help">Use the name your teammates will recognize in audit history.</span></div>',
    `<div class="ps-field"><label for="email">${escapeHtml(copy.email)}</label><input id="email" name="email" type="email" autocomplete="email" required></div>`,
    `<div class="ps-field"><label for="password">${escapeHtml(
      copy.password
    )}</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="12" required><span class="ps-help">Minimum 12 characters for local development accounts.</span></div>`,
    renderCommandButton({ label: "Register", ariaLabel: "Register local PureSOC account", tone: "primary", type: "submit" }),
    "</form>",
    '<p class="ps-muted"><a class="ps-command" href="/login" data-ui-action="back-to-login">Back to sign in</a></p>',
    "</div>",
    "</section>",
    "</main>",
    "</body>",
    "</html>"
  ].join("");
};

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

export const renderWorkspaceSelectionScreen = (
  model: WorkspaceSelectionModel,
  options: RenderWorkspaceSelectionOptions = {}
): string => {
  const copy = resolveOperationalConsoleCopy(options.locale);
  const activeOrganizationId = model.session.session.activeOrganizationId ?? null;
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="workspace-selection">',
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
  const requiredFieldCount = model.steps.reduce((total, step) => total + step.requiredFieldPaths.length, 0);
  const completedRequiredFieldCount = requiredFieldCount - model.progress.missingRequiredFields.length;
  const requiredFieldCoverage =
    requiredFieldCount === 0 ? 100 : Math.round((completedRequiredFieldCount / requiredFieldCount) * 100);
  const labelFallbackCount = model.notificationDraft.fields.filter((field) => field.labelFallbackUsed).length;
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="romania-onboarding-route">',
    renderRomaniaRouteHero({
      completedRequiredFieldCount,
      labelFallbackCount,
      model,
      requiredFieldCount,
      requiredFieldCoverage,
      screen: activeScreen
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
  screen: RomaniaOnboardingScreen;
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
    '<div>',
    '<p class="ps-route-hero__eyebrow">Customer onboarding workspace</p>',
    '<h1 class="ps-route-hero__title" id="romania-route-title">NIS2 Readiness Wizard</h1>',
    '<p class="ps-route-hero__lede">Complete business data in short screens, run the Romania NIS2 readiness checks, connect Microsoft 365 when the local assessment is ready, and export the resulting gap list.</p>',
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<div class="ps-route-hero__summary-grid" aria-label="Romania readiness summary">',
    `<article class="ps-route-hero__fact-card"><span class="ps-route-hero__fact-kicker">Progress</span>${renderMeter({
      label: "Required answers",
      value: requiredFieldCoverage,
      source: "saved Romania answers"
    })}<p class="ps-muted">${escapeHtml(savedFieldsLabel)}.</p></article>`,
    `<article class="ps-route-hero__fact-card"><span class="ps-route-hero__fact-kicker">Next action</span><h2 class="ps-route-hero__fact-title">${escapeHtml(
      nextAction.label
    )}</h2><p class="ps-muted">${escapeHtml(nextAction.summary)}</p></article>`,
    `<article class="ps-route-hero__fact-card"><span class="ps-route-hero__fact-kicker">Output</span><h2 class="ps-route-hero__fact-title">${escapeHtml(
      classificationLabel
    )}</h2><p class="ps-muted">PureSOC creates draft readiness materials for review only.</p></article>`,
    "</div>",
    '<div class="ps-route-hero__actions">',
    `<a class="ps-command ps-command--primary" href="${escapeHtml(activeRomaniaScreenHref(screen))}#romania-workflow" data-ui-action="focus-romania-guided-workflow">Continue workflow</a>`,
    '<a class="ps-command" href="/onboarding/romania/gaps?locale=ro-RO#romania-gap-list" data-ui-action="open-romania-gap-list">Open gap list</a>',
    "</div>",
    "</div>",
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
    "</div>",
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
        `<a class="ps-route-tabs__link" href="${escapeHtml(item.href)}"${item.key === screen ? ' aria-current="page"' : ""} data-ui-action="open-romania-${escapeHtml(
          item.key
        )}-screen"><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.summary)}</small></a>`
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
    Exclude<RomaniaOnboardingScreen, "outputs" | "connector" | "gaps">,
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

  return renderSection({
    id: "romania-workflow",
    title: screenLabels[screen].title,
    eyebrow: renderStatusPill({ label: screenLabels[screen].status, tone: "accent" }),
    body: renderRomaniaWorkflowForms(model, screen)
  });
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
      summary: connectorComplete ? "Tenant OAuth connection is present." : "Connect Microsoft 365 after local onboarding data is ready."
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
  screen: Exclude<RomaniaOnboardingScreen, "outputs" | "connector" | "gaps">
): string => {
  const nextAction = resolveRomaniaNextAction(model);

  return [
    '<div class="ps-next-action">',
    `<div><h3>${escapeHtml(nextAction.label)}</h3><p>${escapeHtml(nextAction.summary)}</p></div>`,
    renderStatusPill({ label: "guided step", tone: nextAction.tone }),
    "</div>",
    '<p class="ps-help">This screen is capped at five customer questions. Empty fields remain explicit gaps; PureSOC does not fabricate answers.</p>',
    screen === "company" ? renderRomaniaCompanyForm(model) : "",
    screen === "address" ? renderRomaniaAddressForm(model) : "",
    screen === "legal" ? renderRomaniaLegalRepresentativeForm(model) : "",
    screen === "size" ? renderRomaniaSizeForm(model) : "",
    screen === "services" ? renderRomaniaServicesForm(model) : "",
    screen === "contacts" ? renderRomaniaContactsForm(model) : "",
    screen === "systems" ? renderRomaniaSystemsForm(model) : "",
    screen === "article9" ? renderRomaniaArticle9Form(model) : ""
  ].join("");
};

const renderRomaniaSaveForm = (input: {
  body: string;
  model: RomaniaOnboardingRouteModel;
  nextScreen: RomaniaOnboardingScreen;
  screen: RomaniaOnboardingScreen;
  submitLabel: string;
  summary: string;
  title: string;
}): string =>
  [
    '<article class="ps-panel ps-panel--wide ps-stack-top">',
    '<div class="ps-section__header ps-section__header--flat">',
    `<div><h3 class="ps-panel__title">${escapeHtml(input.title)}</h3><p class="ps-muted">${escapeHtml(input.summary)}</p></div>`,
    renderStatusPill({ label: input.model.hasSavedProgress ? "updates saved data" : "creates local progress", tone: input.model.hasSavedProgress ? "success" : "warning" }),
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
    title: "Company identity",
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
        : "After the onboarding answers are saved, an owner or organization admin can start Microsoft Entra tenant admin consent."
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
    { label: copy.dashboard, href: "#dashboard", action: "open-dashboard-anchor" },
    { label: "Onboarding", href: "#onboarding", action: "open-onboarding-anchor" },
    { label: "NIS2 wizard", href: "/onboarding/romania/company?locale=ro-RO", action: "open-romania-onboarding" },
    { label: "Microsoft 365", href: "#microsoft365", action: "open-microsoft365-anchor" },
    { label: "Gaps", href: "#gaps", action: "open-gaps-anchor" },
    { label: copy.evidenceReports, href: "#evidence", action: "open-evidence-reports-anchor" },
    { label: copy.approvalQueue, href: "#approvals", action: "open-approval-queue-anchor" }
  ] as const;

  return [
    '<aside class="ps-sidebar" aria-label="Primary navigation">',
    '<div class="ps-brand">',
    `<div><p class="ps-brand__name">PureSOC</p><span class="ps-brand__meta">${escapeHtml(model.organization.primaryCountryCode)} workspace</span></div>`,
    renderStatusPill({ label: copy.internalReadiness, tone: "accent" }),
    "</div>",
    '<nav class="ps-nav">',
    ...items.map(
      (item, index) =>
        `<a class="ps-nav__link" href="${item.href}"${index === 0 ? ' aria-current="page"' : ""} data-ui-action="${item.action}"><span>${escapeHtml(item.label)}</span><span aria-hidden="true">&rsaquo;</span></a>`
    ),
    "</nav>",
    "</aside>"
  ].join("");
};

const renderTopbar = (model: OperationalConsoleModel): string =>
  [
    '<header class="ps-topbar">',
    `<div><p class="ps-topbar__title">${escapeHtml(model.organization.name)}</p><span class="ps-muted">${escapeHtml(model.user.displayName)} | ${escapeHtml(model.user.role)}</span></div>`,
    '<div class="ps-topbar__actions">',
    '<a class="ps-command" href="/invitations" data-ui-action="open-organization-invitations">Invite members</a>',
    '<a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">Switch workspace</a>',
    '<form class="ps-inline-form" action="/auth/logout" method="post" data-ui-action="sign-out">',
    renderCommandButton({ label: "Sign out", ariaLabel: "Sign out of PureSOC", tone: "secondary", type: "submit" }),
    "</form>",
    renderStatusPill({ label: `Plan: ${model.organization.subscriptionStatus}`, tone: "info" }),
    model.runtimeSource ? renderSourceChip(model.runtimeSource) : "",
    renderSourceChip({ label: "Dashboard source", detail: model.dashboard.source }),
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

  return renderSection({
    id: "dashboard",
    title: copy.dashboard,
    eyebrow: renderSourceChip({ label: copy.storedAggregate, detail: model.dashboard.snapshotType }),
    body: [
      renderDashboardNextAction(model),
      '<div class="ps-score-grid">',
      ...scoreMeters.map(([label, value]) => `<div class="ps-panel">${renderMeter({ label, value, source: "dashboard_snapshots" })}</div>`),
      "</div>",
      '<div class="ps-grid ps-stack-top">',
      ...model.dashboard.widgets.map(renderDashboardWidget),
      "</div>"
    ].join("")
  });
};

const renderDashboardNextAction = (model: OperationalConsoleModel): string => {
  const readiness = model.dashboard.readinessScores.overallInternalReadiness;
  const romaniaCompleteness = model.onboarding.romania.completeness;
  const label = romaniaCompleteness < 100 ? "Continue wizard" : "Review evidence";
  const href = romaniaCompleteness < 100 ? "/onboarding/romania/company?locale=ro-RO" : "#evidence";
  const action = romaniaCompleteness < 100 ? "open-romania-onboarding" : "open-evidence-reports-anchor";
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
      renderSourceChip({ label: "Last sync", detail: model.microsoft365.lastSyncAt }),
      renderSourceChip({ label: "Connector", detail: model.microsoft365.connectorMode }),
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
    item: "Entra app registration",
    value: "Multitenant Microsoft Entra app for the PureSOC connector",
    detail: "The app registration belongs to the PureSOC deployment, not to a customer workspace."
  },
  {
    item: "Application client ID",
    value: "PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID",
    detail: "Use the Application (client) ID from the app registration overview."
  },
  {
    item: "Client credential",
    value: "PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET",
    detail: "Store only an app client secret or equivalent credential; never store a tenant admin password."
  },
  {
    item: "Redirect URI",
    value: "PURESOC_CONNECTOR_MICROSOFT365_REDIRECT_URI",
    detail: "Register the exact web callback URI, normally /providers/microsoft365/callback on the public web origin."
  },
  {
    item: "Authority host",
    value: "PURESOC_CONNECTOR_MICROSOFT365_AUTHORITY_HOST",
    detail: "Default is https://login.microsoftonline.com unless a reviewed cloud environment requires a different host."
  },
  {
    item: "Workspace tenant consent",
    value: "Connect Microsoft 365",
    detail: "Each organization grants tenant consent from the GUI; tenant ID, permission bundles, and encrypted token metadata stay on ProviderConnection."
  }
];

const renderMicrosoft365ConnectorSetup = (): string =>
  [
    '<div class="ps-stack-top">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h3 class="ps-panel__title">Connector setup</h3><p class="ps-muted">Configure the connector app once, then connect each customer tenant through OAuth admin consent.</p></div>',
    '<div class="ps-chip-row">',
    renderStatusPill({ label: "platform app registration", tone: "info" }),
    renderStatusPill({ label: "tenant OAuth per workspace", tone: "accent" }),
    renderStatusPill({ label: "read-only first", tone: "success" }),
    "</div>",
    "</div>",
    renderDataTable<Microsoft365ConnectorSetupRow>(
      "Microsoft 365 connector app registration setup",
      [
        {
          header: "Item",
          render: (row) => escapeHtml(row.item)
        },
        {
          header: "Configured as",
          render: (row) => `<code>${escapeHtml(row.value)}</code>`
        },
        {
          header: "Operational note",
          render: (row) => escapeHtml(row.detail)
        }
      ],
      microsoft365ConnectorSetupRows
    ),
    '<p class="ps-help">Admin consent redirects use the registered client ID and redirect URI. Background Graph reads use the tenant grant with the client credentials flow and Microsoft Graph /.default scope.</p>',
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
