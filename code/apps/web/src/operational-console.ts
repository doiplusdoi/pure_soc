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
  RomaniaOnboardingRouteModel,
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

export interface RenderRomaniaOnboardingRouteOptions {
  includeDocumentShell?: boolean;
}

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
    '<div><h1 class="ps-section__title" id="register-title">Register local account</h1><p class="ps-muted">Create a PureSOC account, verify the email address, then continue to workspace setup.</p></div>',
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
    '<div class="ps-field"><label for="legalName">Legal name</label><input id="legalName" name="legalName" type="text"><span class="ps-help">Optional now. Romania onboarding asks for the legal name later.</span></div>',
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
  const completedSteps = new Set(model.progress.completedSteps);
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
      requiredFieldCoverage
    }),
    renderSection({
      id: "romania-workflow",
      title: "Guided Workflow",
      eyebrow: renderStatusPill({ label: "saved data only", tone: "accent" }),
      body: renderRomaniaWorkflowForms(model)
    }),
    renderRomaniaOutputsSection(model, labelFallbackCount),
    renderRomaniaBoundariesSection(model),
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
}

const renderRomaniaRouteHero = ({
  completedRequiredFieldCount,
  labelFallbackCount,
  model,
  requiredFieldCount,
  requiredFieldCoverage
}: RomaniaRouteHeroInput): string =>
  [
    '<section class="ps-route-hero" id="romania-onboarding" data-ui-section="romania-onboarding" aria-labelledby="romania-route-title">',
    '<div class="ps-route-hero__body">',
    '<div>',
    '<p class="ps-route-hero__eyebrow">Guided local workflow</p>',
    '<h1 class="ps-route-hero__title" id="romania-route-title">Romania NIS2 Onboarding</h1>',
    '<p class="ps-route-hero__lede">Capture entity facts, run preliminary classification, generate internal readiness outputs, and keep DNSC submission outside PureSOC.</p>',
    model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
    '<div class="ps-route-hero__actions">',
    '<a class="ps-command ps-command--primary" href="#romania-workflow" data-ui-action="focus-romania-guided-workflow">Continue workflow</a>',
    '<a class="ps-command" href="#romania-boundaries" data-ui-action="open-romania-boundaries">Review boundaries</a>',
    "</div>",
    "</div>",
    '<div class="ps-route-hero__facts">',
    renderStatusPill({ label: model.countryPack.countryPackStatus.replaceAll("_", " "), tone: "warning" }),
    renderStatusPill({
      label: model.hasSavedProgress ? "saved organization data" : "empty state",
      tone: model.hasSavedProgress ? "success" : "warning"
    }),
    renderStatusPill({ label: `requested ${model.requestedLocale ?? model.resolvedLocale}`, tone: "info" }),
    renderStatusPill({ label: `caveat ${model.notificationDraft.legalCaveatLocale}`, tone: "warning" }),
    renderStatusPill({
      label: model.notificationDraft.legalCaveatFallbackReason ?? "no caveat fallback",
      tone: model.notificationDraft.legalCaveatFallbackUsed ? "warning" : "success"
    }),
    renderStatusPill({ label: `classification ${model.classification.result.replaceAll("_", " ")}`, tone: "warning" }),
    `<p class="ps-muted">${escapeHtml(model.progress.completedSteps.length)} of ${escapeHtml(
      model.steps.length
    )} contract steps are saved for this workspace.</p>`,
    labelFallbackCount > 0
      ? `<p class="ps-muted">${escapeHtml(labelFallbackCount)} draft labels still need approved Romanian legal copy.</p>`
      : '<p class="ps-muted">Draft labels are available for the selected locale.</p>',
    renderMeter({
      label: "Required field coverage",
      value: requiredFieldCoverage,
      source: "saved Romania answers"
    }),
    `<span class="ps-source-detail">${escapeHtml(completedRequiredFieldCount)} of ${escapeHtml(
      requiredFieldCount
    )} required fields currently have saved answers.</span>`,
    '<div class="ps-chip-row">',
    model.progressRecordId ? renderSourceChip({ label: "Progress", detail: model.progressRecordId }) : "",
    model.assessmentId ? renderSourceChip({ label: "Assessment", detail: model.assessmentId }) : "",
    model.latestNotificationDraftId ? renderSourceChip({ label: "Notification draft", detail: model.latestNotificationDraftId }) : "",
    renderStatusPill({ label: `${model.serviceCatalogGroups.reduce((total, group) => total + group.options.length, 0)} service options`, tone: "info" }),
    "</div>",
    "</div>",
    "</div>",
    renderRomaniaGuidedStepper(model, labelFallbackCount),
    "</section>"
  ].join("");

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
    '<ol class="ps-stepper" aria-label="Romania onboarding guided steps">',
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
  const completedSteps = new Set(model.progress.completedSteps);
  const businessComplete = completedSteps.has("organization_identity") && completedSteps.has("entity_address_contact");
  const scopeComplete =
    completedSteps.has("activity_nace") &&
    completedSteps.has("entity_size") &&
    completedSteps.has("services") &&
    completedSteps.has("relationship_with_romania") &&
    completedSteps.has("network_system_data");
  const outputsComplete = model.classificationPersisted && Boolean(model.latestNotificationDraftId) && Boolean(model.assessmentId);
  const evidenceComplete = model.evidence.count > 0 && model.evidence.generatedReportCount > 0;
  const definitions = [
    {
      complete: businessComplete,
      label: "Business details",
      summary: model.hasSavedProgress ? "Entity, CUI, address, and contact saved." : "Start with legal identity and contact fields."
    },
    {
      complete: scopeComplete,
      label: "Scope and services",
      summary: "NACE, service code, size, relationships, and systems."
    },
    {
      complete: outputsComplete,
      label: "Readiness outputs",
      summary: model.classificationPersisted ? "Classification, draft, and assessment are ready." : "Run local outputs after answers are saved."
    },
    {
      complete: evidenceComplete,
      label: "Evidence and trace",
      summary:
        labelFallbackCount > 0
          ? `${labelFallbackCount} draft labels still use fallback metadata.`
          : "Attach evidence and review the boundaries."
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
  key: "boundaries" | "classify" | "draft" | "evaluate" | "evidence" | "save";
  label: string;
  summary: string;
  tone: PureSocUiTone;
}

const renderRomaniaWorkflowForms = (model: RomaniaOnboardingRouteModel): string => {
  const nextAction = resolveRomaniaNextAction(model);
  const saveButtonTone = nextAction.key === "save" ? "primary" : "secondary";
  const evidenceButtonTone = nextAction.key === "evidence" ? "primary" : "secondary";

  return [
    '<div class="ps-next-action">',
    `<div><h3>${escapeHtml(nextAction.label)}</h3><p>${escapeHtml(nextAction.summary)}</p></div>`,
    renderStatusPill({ label: "guided step", tone: nextAction.tone }),
    "</div>",
    '<div class="ps-grid ps-stack-top">',
    '<article class="ps-panel ps-panel--wide">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<div><h3 class="ps-panel__title">Steps 1 and 2: Save organization answers</h3><p class="ps-muted">The form stays explicit so reviewers can understand exactly what the organization provided.</p></div>',
    renderStatusPill({ label: "15-step Romania workflow", tone: "info" }),
    "</div>",
    '<form class="ps-form ps-form--wide" action="/onboarding/romania/save" method="post" data-ui-action="save-romania-onboarding">',
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Business details</legend>',
    '<p class="ps-help">Required fields can stay blank in the empty state. PureSOC will not fabricate customer answers.</p>',
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
    renderTextInput("country", "Country", answerText(model, "address.country") || "Romania", true),
    renderTextInput("county", "County", answerText(model, "address.county"), true),
    renderTextInput("city", "City", answerText(model, "address.city"), true),
    renderTextInput("street", "Street", answerText(model, "address.street"), true),
    renderTextInput("number", "Street number", answerText(model, "address.number"), false),
    renderTextInput("postalCode", "Postal code", answerText(model, "address.postalCode"), false),
    renderTextInput("email", "Security contact email", answerText(model, "contact.email"), true, "email", "This contact appears in local notification draft metadata."),
    renderTextInput("phone", "Telephone", answerText(model, "contact.phone"), false),
    renderTextInput("mobilePhone", "Mobile phone", answerText(model, "contact.mobilePhone"), false),
    renderTextInput("websiteUrl", "Website URL", answerText(model, "contact.websiteUrl"), false),
    "</div>",
    "</fieldset>",
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Scope and relationships</legend>',
    '<p class="ps-help">These answers drive local classification and readiness outputs only.</p>',
    '<div class="ps-form-grid">',
    renderTextInput("mainNaceCode", "Main NACE code", answerText(model, "activity.mainNaceCode"), true, "text", "Use the main NACE activity code from source records."),
    renderTextInput(
      "secondaryNaceCodes",
      "Secondary NACE codes",
      answerArrayText(model, "activity.secondaryNaceCodes"),
      false,
      "text",
      "Separate multiple codes with commas."
    ),
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
    renderRomaniaServiceSelector(model),
    renderCheckbox("establishedInRomania", "Established in Romania", answerBoolean(model, "relationship.establishedInRomania")),
    renderCheckbox("mainOfficeInRomania", "Main office in Romania", answerBoolean(model, "relationship.mainOfficeInRomania")),
    renderCheckbox("providesServicesInRomania", "Provides services in Romania", answerBoolean(model, "relationship.providesServicesInRomania")),
    renderCheckbox(
      "providesServicesInAnotherEuMemberState",
      "Provides services in another EU member state",
      answerBoolean(model, "relationship.providesServicesInAnotherEuMemberState")
    ),
    renderCheckbox(
      "publicAdministrationEstablishedByRomania",
      "Public administration entity established by Romania",
      answerBoolean(model, "relationship.publicAdministrationEstablishedByRomania")
    ),
    renderCheckbox(
      "criticalEntityInRomaniaLaw294",
      "Critical entity under Romania Law 294/2024",
      answerBoolean(model, "relationship.criticalEntityInRomaniaLaw294")
    ),
    "</div>",
    "</fieldset>",
    renderRomaniaPeopleNetworkFields(model),
    renderRomaniaArticle9AndDocumentsFields(model),
    '<div class="ps-command-row ps-stack-top">',
    renderCommandButton({
      label: "Save progress",
      ariaLabel: "Save Romania onboarding progress",
      tone: saveButtonTone,
      type: "submit"
    }),
    renderStatusPill({ label: model.hasSavedProgress ? "updates saved data" : "creates local progress", tone: model.hasSavedProgress ? "success" : "warning" }),
    "</div>",
    "</form>",
    "</article>",
    '<article class="ps-panel">',
    '<h3 class="ps-panel__title">Step 3: Generate readiness outputs</h3>',
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
      label: "Readiness export",
      reason: model.assessmentId ? "Exports the current internal readiness report." : "Evaluate readiness first.",
      uiAction: "generate-internal-readiness-export"
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
    '<h3 class="ps-panel__title">Step 4: Attach evidence</h3>',
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
    '<div class="ps-field ps-field--full">',
    '<label for="serviceCodes">Services by sector and subsector</label>',
    '<input id="serviceSearch" type="search" placeholder="Search services" autocomplete="off" aria-controls="serviceCodes" data-ui-action="search-romania-services">',
    '<select id="serviceCodes" name="serviceCodes" multiple size="12" required aria-describedby="serviceCodes-help">',
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

const renderRomaniaPeopleNetworkFields = (model: RomaniaOnboardingRouteModel): string =>
  [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Responsible people and monitoring</legend>',
    '<div class="ps-form-grid">',
    renderTextInput("cybersecurityName", "Cybersecurity responsible person", answerText(model, "cybersecurityResponsible.name"), true),
    renderTextInput("cybersecurityRole", "Cybersecurity role", answerText(model, "cybersecurityResponsible.role"), true),
    renderTextInput("cybersecurityEmail", "Cybersecurity email", answerText(model, "cybersecurityResponsible.email"), true, "email"),
    renderTextInput("cybersecurityPhone", "Cybersecurity phone", answerText(model, "cybersecurityResponsible.phone"), true),
    renderTextInput("monitoringName", "Permanent monitoring contact", answerText(model, "permanentMonitoringContact.name"), true),
    renderTextInput("monitoringRole", "Monitoring role", answerText(model, "permanentMonitoringContact.role"), false),
    renderTextInput("monitoringEmail", "Monitoring email", answerText(model, "permanentMonitoringContact.email"), true, "email"),
    renderTextInput("monitoringPhone", "Monitoring phone", answerText(model, "permanentMonitoringContact.phone"), true),
    "</div>",
    "</fieldset>",
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Network and public IP ranges</legend>',
    '<div class="ps-form-grid">',
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
  ].join("");

const renderRomaniaArticle9AndDocumentsFields = (model: RomaniaOnboardingRouteModel): string =>
  [
    '<fieldset class="ps-fieldset">',
    '<legend class="ps-fieldset__legend">Article 9, documents, and legal representative</legend>',
    '<p class="ps-help">Article 9 answers are used when the classification path requires them.</p>',
    '<div class="ps-form-grid">',
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
    renderTextarea(
      "attachedDocumentIds",
      "Attached document references",
      answerArrayText(model, "attachedDocumentIds"),
      "List local evidence or document IDs separated by commas or line breaks.",
      "ps-field--full"
    ),
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

  return `<div class="ps-field"><label for="${fieldId}">${escapeHtml(label)}</label><input id="${fieldId}" name="${fieldId}" type="${type}" value="${escapeHtml(
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

  return `<div class="${classes}"><label for="${fieldId}">${escapeHtml(label)}</label><textarea id="${fieldId}" name="${fieldId}" rows="4"${describedBy}>${escapeHtml(
    value
  )}</textarea>${help ? `<span class="ps-help" id="${helpId}">${escapeHtml(help)}</span>` : ""}</div>`;
};

const renderSelect = (
  name: string,
  label: string,
  value: string,
  options: Array<readonly [string, string]>,
  help = ""
): string => {
  const fieldId = escapeHtml(name);
  const helpId = `${fieldId}-help`;
  const describedBy = help ? ` aria-describedby="${helpId}"` : "";

  return [
    `<div class="ps-field"><label for="${fieldId}">${escapeHtml(label)}</label><select id="${fieldId}" name="${fieldId}" required${describedBy}>`,
    ...options.map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}"${optionValue === value ? " selected" : ""}>${escapeHtml(optionLabel)}</option>`
    ),
    `</select>${help ? `<span class="ps-help" id="${helpId}">${escapeHtml(help)}</span>` : ""}</div>`
  ].join("");
};

const renderCheckbox = (name: string, label: string, checked: boolean): string =>
  `<label class="ps-field ps-field--checkbox"><input name="${escapeHtml(name)}" type="checkbox" value="true"${
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
    { label: "Romania onboarding", href: "/onboarding/romania?locale=ro-RO", action: "open-romania-onboarding" },
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
  const label = romaniaCompleteness < 100 ? "Continue Romania" : "Review evidence";
  const href = romaniaCompleteness < 100 ? "/onboarding/romania?locale=ro-RO" : "#evidence";
  const action = romaniaCompleteness < 100 ? "open-romania-onboarding" : "open-evidence-reports-anchor";
  const summary =
    readiness >= 75
      ? "Internal readiness is in a reviewable range. Keep the evidence trail current before sharing exports."
      : "The fastest path to a useful snapshot is saving Romania answers, then generating readiness outputs.";

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
    eyebrow: renderStatusPill({ label: model.microsoft365.status, tone: toneForStatus(model.microsoft365.status) }),
    body: [
      '<div class="ps-grid">',
      '<article class="ps-panel">',
      '<h3 class="ps-panel__title">Tenant</h3>',
      `<p>${escapeHtml(model.microsoft365.tenantDisplayName)}</p>`,
      `<p class="ps-muted">${escapeHtml(model.microsoft365.tenantId)}</p>`,
      renderSourceChip({ label: "Last sync", detail: model.microsoft365.lastSyncAt }),
      "</article>",
      '<article class="ps-panel">',
      '<h3 class="ps-panel__title">Permission bundles</h3>',
      '<div class="ps-chip-row">',
      ...model.microsoft365.permissionBundles.map((bundle) => renderStatusPill({ label: bundle, tone: "info" })),
      "</div>",
      "</article>",
      "</div>",
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
