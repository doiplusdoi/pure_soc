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
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="login-screen">',
    '<section class="ps-section" aria-labelledby="login-title">',
    '<div class="ps-section__header">',
    `<div><h1 class="ps-section__title" id="login-title">${escapeHtml(copy.signIn)}</h1><p class="ps-muted">${escapeHtml(copy.internalReadinessConsole)}</p></div>`,
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
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="register-screen">',
    '<section class="ps-section" aria-labelledby="register-title">',
    '<div class="ps-section__header">',
    '<div><h1 class="ps-section__title" id="register-title">Register Local Account</h1><p class="ps-muted">Create a local PureSOC account for the in-a-box Romania readiness workflow.</p></div>',
    renderStatusPill({ label: "local auth", tone: "info" }),
    "</div>",
    '<div class="ps-section__body">',
    options.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(options.errorMessage)}</p>` : "",
    '<form class="ps-form" action="/auth/register" method="post">',
    '<div class="ps-field"><label for="displayName">Display name</label><input id="displayName" name="displayName" type="text" autocomplete="name" required></div>',
    `<div class="ps-field"><label for="email">${escapeHtml(copy.email)}</label><input id="email" name="email" type="email" autocomplete="email" required></div>`,
    `<div class="ps-field"><label for="password">${escapeHtml(copy.password)}</label><input id="password" name="password" type="password" autocomplete="new-password" required></div>`,
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
    `<div><h1 class="ps-section__title" id="workspace-selection-title">Select A Workspace</h1><p class="ps-muted">${escapeHtml(model.session.user.displayName ?? model.session.user.email)}</p></div>`,
    renderStatusPill({ label: copy.apiSession, tone: "info" }),
    "</div>",
    '<div class="ps-section__body">',
    model.errorMessage ? `<p class="ps-legal-caveat" role="alert">${escapeHtml(model.errorMessage)}</p>` : "",
    model.organizations.length === 0
      ? '<p class="ps-muted">No active workspace memberships are available for this session.</p>'
      : [
          '<div class="ps-grid">',
          ...model.organizations.map((organization) => renderWorkspaceSelectionPanel(organization, activeOrganizationId)),
          "</div>"
        ].join(""),
    '<section class="ps-section ps-stack-top" aria-labelledby="workspace-create-title">',
    '<div class="ps-section__header ps-section__header--flat">',
    '<h2 class="ps-section__title" id="workspace-create-title">Create Workspace</h2>',
    renderStatusPill({ label: "local organization", tone: "accent" }),
    "</div>",
    '<form class="ps-form" action="/organizations" method="post" data-ui-action="create-local-workspace">',
    '<div class="ps-field"><label for="name">Workspace name</label><input id="name" name="name" type="text" required></div>',
    '<div class="ps-field"><label for="legalName">Legal name</label><input id="legalName" name="legalName" type="text"></div>',
    '<div class="ps-field"><label for="primaryCountryCode">Primary country</label><input id="primaryCountryCode" name="primaryCountryCode" type="text" value="RO" maxlength="2" required></div>',
    renderCommandButton({ label: "Create workspace", ariaLabel: "Create local workspace", tone: "primary", type: "submit" }),
    "</form>",
    "</section>",
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
  const labelFallbackCount = model.notificationDraft.fields.filter((field) => field.labelFallbackUsed).length;
  const servicesSourceMap = model.sourceMapLinks.find((link) => link.targetCollection === "service_options");
  const content = [
    '<a class="ps-skip-link" href="#content" data-ui-action="skip-to-content">Skip to content</a>',
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="romania-onboarding-route">',
    renderSection({
      id: "romania-onboarding",
      title: "Romania NIS2 Onboarding",
      eyebrow: renderStatusPill({ label: model.countryPack.countryPackStatus.replaceAll("_", " "), tone: "warning" }),
      body: [
        model.actionMessage ? `<p class="ps-legal-caveat" role="status">${escapeHtml(model.actionMessage)}</p>` : "",
        '<div class="ps-grid">',
        '<article class="ps-panel">',
        '<h3 class="ps-panel__title">Workbook-backed progress</h3>',
        `<p>${escapeHtml(model.progress.completedSteps.length)} of ${escapeHtml(model.steps.length)} steps are saved for this workspace.</p>`,
        renderMeter({
          label: "Required field coverage",
          value: Math.round((completedRequiredFieldCount / requiredFieldCount) * 100),
          source: "roNis2OnboardingSchema"
        }),
        renderStatusPill({ label: model.hasSavedProgress ? "saved organization data" : "empty state", tone: model.hasSavedProgress ? "success" : "warning" }),
        model.progressRecordId ? renderSourceChip({ label: "Progress", detail: model.progressRecordId }) : "",
        model.assessmentId ? renderSourceChip({ label: "Assessment", detail: model.assessmentId }) : "",
        renderSourceChip({ label: "Source version", detail: model.progress.sourceVersion }),
        servicesSourceMap
          ? renderSourceChip({ label: "Services source", detail: servicesSourceMap.workbookRange ?? servicesSourceMap.sourceMapId })
          : "",
        "</article>",
        '<article class="ps-panel">',
        '<h3 class="ps-panel__title">Preliminary classification</h3>',
        renderStatusPill({ label: model.classification.result.replaceAll("_", " "), tone: "warning" }),
        `<p>${escapeHtml(model.classification.reasons[0] ?? "Classification awaits more source-mapped answers.")}</p>`,
        renderStatusPill({
          label: model.classificationPersisted ? "stored classification run" : "preview from saved answers",
          tone: model.classificationPersisted ? "success" : "info"
        }),
        model.classificationRunId ? renderSourceChip({ label: "Classification run", detail: model.classificationRunId }) : "",
        renderSourceChip({ label: "Matched rules", detail: `${model.classification.matchedRules.length}` }),
        "</article>",
        '<article class="ps-panel">',
        '<h3 class="ps-panel__title">Locale and fallback</h3>',
        renderStatusPill({ label: `requested ${model.requestedLocale ?? model.resolvedLocale}`, tone: "info" }),
        renderStatusPill({ label: `caveat ${model.notificationDraft.legalCaveatLocale}`, tone: "warning" }),
        renderStatusPill({
          label: model.notificationDraft.legalCaveatFallbackReason ?? "no caveat fallback",
          tone: model.notificationDraft.legalCaveatFallbackUsed ? "warning" : "success"
        }),
        `<p class="ps-muted">${escapeHtml(labelFallbackCount)} notification labels currently use fallback metadata for this locale.</p>`,
        "</article>",
        '<article class="ps-panel">',
        '<h3 class="ps-panel__title">Local product state</h3>',
        renderStatusPill({ label: `Evidence ${model.evidence.count}`, tone: "info" }),
        renderStatusPill({ label: `Reports ${model.evidence.generatedReportCount}`, tone: "accent" }),
        renderStatusPill({ label: `Entitlements ${model.billing.entitlementCount}`, tone: "success" }),
        renderStatusPill({ label: `Audit checkpoints ${model.audit.checkpointCount}`, tone: "neutral" }),
        model.dashboard
          ? renderSourceChip({ label: model.dashboard.readinessScoreLabel, detail: `${model.dashboard.readinessScores.overallInternalReadiness}` })
          : renderStatusPill({ label: "dashboard not generated", tone: "warning" }),
        model.latestNotificationDraftId ? renderSourceChip({ label: "Notification draft", detail: model.latestNotificationDraftId }) : "",
        "</article>",
        "</div>"
      ].join("")
    }),
    renderSection({
      id: "romania-workflow",
      title: "Local Workflow",
      eyebrow: renderStatusPill({ label: "saved data only", tone: "accent" }),
      body: renderRomaniaWorkflowForms(model)
    }),
    renderSection({
      id: "romania-unsupported",
      title: "Boundaries And Unsupported States",
      eyebrow: renderStatusPill({ label: "internal readiness only", tone: "accent" }),
      body: [
        '<div class="ps-grid">',
        ...model.unsupportedSignals.map(
          (signal) =>
            `<article class="ps-panel"><h3 class="ps-panel__title">${escapeHtml(signal.label)}</h3>${renderStatusPill({
              label: signal.tone === "warning" ? "unsupported" : "documented",
              tone: signal.tone
            })}<p>${escapeHtml(signal.detail)}</p></article>`
        ),
        "</div>",
        '<div class="ps-chip-row ps-stack-top">',
        renderStatusPill({ label: model.billing.planLabel, tone: "success" }),
        renderSourceChip({ label: "Billing provider", detail: model.billing.providerKey }),
        renderSourceChip({ label: "Audit export", detail: model.audit.guarantees }),
        "</div>",
        renderLegalCaveat(model.notificationDraft.legalCaveat)
      ].join("")
    }),
    renderSection({
      id: "romania-steps",
      title: "Onboarding Contract Steps",
      eyebrow: renderSourceChip({ label: "Schema", detail: "roNis2OnboardingSchema" }),
      body: renderDataTable(
        "Romania onboarding steps",
        [
          {
            header: "Step",
            render: (step) => `<strong>${escapeHtml(formatKeyLabel(step.key))}</strong><br><span class="ps-muted">${escapeHtml(step.key)}</span>`
          },
          {
            header: "Status",
            render: (step) =>
              renderStatusPill({
                label: completedSteps.has(step.key) ? "source-mapped" : step.key === model.progress.currentStep ? "current" : "pending",
                tone: completedSteps.has(step.key) ? "success" : step.key === model.progress.currentStep ? "info" : "neutral"
              })
          },
          {
            header: "Required fields",
            render: (step) =>
              step.requiredFieldPaths.length === 0
                ? '<span class="ps-muted">None in current contract</span>'
                : step.requiredFieldPaths.map((field) => escapeHtml(field)).join("<br>")
          },
          {
            header: "Source maps",
            render: (step) => escapeHtml(`${step.sourceMapIds.length} source map ids`)
          }
        ],
        model.steps
      )
    }),
    renderSection({
      id: "romania-draft",
      title: "Notification Draft Metadata",
      eyebrow: renderStatusPill({ label: "no DNSC submission", tone: "warning" }),
      body: [
        '<div class="ps-grid">',
        '<article class="ps-panel">',
        '<h3 class="ps-panel__title">Draft envelope</h3>',
        renderStatusPill({ label: model.notificationDraft.status, tone: "info" }),
        renderSourceChip({ label: "Payload schema", detail: model.notificationDraft.payloadSchemaKey }),
        renderSourceChip({ label: "Submitted to DNSC", detail: String(model.notificationDraft.submission.submittedToDnsc) }),
        "</article>",
        '<article class="ps-panel">',
        '<h3 class="ps-panel__title">Submission notice</h3>',
        `<p>${escapeHtml(model.notificationDraft.submission.notice)}</p>`,
        renderStatusPill({
          label: model.notificationDraft.submission.noticeFallbackReason ?? "source approved",
          tone: model.notificationDraft.submission.noticeFallbackUsed ? "warning" : "success"
        }),
        "</article>",
        "</div>",
        renderDataTable(
          "First source-mapped draft fields",
          [
            {
              header: "Field",
              render: (field) => `<strong>${escapeHtml(field.label)}</strong><br><span class="ps-muted">${escapeHtml(field.key)}</span>`
            },
            {
              header: "Locale",
              render: (field) =>
                [
                  renderStatusPill({ label: field.labelLocale, tone: field.labelFallbackUsed ? "warning" : "success" }),
                  field.labelFallbackReason ? renderStatusPill({ label: field.labelFallbackReason, tone: "warning" }) : ""
                ].join(" ")
            },
            {
              header: "Source",
              render: (field) =>
                `${renderSourceChip({ label: field.sourceMapId, detail: `Notification form!${field.targetCell}` })}<br>${escapeHtml(
                  formatRoSourceReferences(field.sourceReferences)
                )}`
            }
          ],
          model.notificationDraft.fields.slice(0, 6)
        )
      ].join("")
    }),
    renderSection({
      id: "romania-source-map",
      title: "Source Map Sample",
      eyebrow: renderSourceChip({ label: "Workbook-derived mappings", detail: `${model.sourceMapLinks.length} unique ids` }),
      body: renderDataTable(
        "Source map links",
        [
          {
            header: "Target",
            render: (link) => `<strong>${escapeHtml(link.targetCollection)}</strong><br><span class="ps-muted">${escapeHtml(link.targetKey)}</span>`
          },
          {
            header: "Workbook range",
            render: (link) => escapeHtml(link.workbookRange ?? formatRoSourceReferences(link.sourceReferences))
          },
          {
            header: "Source map id",
            render: (link) => escapeHtml(link.sourceMapId)
          }
        ],
        model.sourceMapLinks.slice(0, 8)
      )
    }),
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

const renderRomaniaWorkflowForms = (model: RomaniaOnboardingRouteModel): string =>
  [
    '<div class="ps-grid">',
    '<article class="ps-panel">',
    '<h3 class="ps-panel__title">Save Romania answers</h3>',
    '<form class="ps-form" action="/onboarding/romania/save" method="post" data-ui-action="save-romania-onboarding">',
    renderTextInput("legalName", "Legal name", answerText(model, "entity.legalName"), true),
    renderTextInput("cui", "CUI", answerText(model, "entity.cui"), true),
    renderTextInput("nationalRegistrationNumber", "National registration number", answerText(model, "entity.nationalRegistrationNumber"), true),
    renderTextInput("country", "Country", answerText(model, "address.country") || "Romania", true),
    renderTextInput("county", "County", answerText(model, "address.county"), true),
    renderTextInput("city", "City", answerText(model, "address.city"), true),
    renderTextInput("street", "Street", answerText(model, "address.street"), true),
    renderTextInput("email", "Security contact email", answerText(model, "contact.email"), true, "email"),
    renderTextInput("mainNaceCode", "Main NACE code", answerText(model, "activity.mainNaceCode"), true),
    renderTextInput("employeeCount", "Employee count", answerText(model, "size.employeeCount"), false, "number"),
    renderSelect("sizeCategory", "Size category", answerText(model, "size.sizeCategory"), [
      ["", "Select size"],
      ["small_micro", "Small or micro"],
      ["medium", "Medium"],
      ["large", "Large"]
    ]),
    renderTextInput("serviceCode", "Romania service code", firstStringAnswer(model, "selectedServiceTypeCodes"), true),
    renderTextarea("systemsDescription", "Network and information systems", answerText(model, "network.systemsDescription")),
    renderCheckbox("establishedInRomania", "Established in Romania", answerBoolean(model, "relationship.establishedInRomania")),
    renderCheckbox("mainOfficeInRomania", "Main office in Romania", answerBoolean(model, "relationship.mainOfficeInRomania")),
    renderCheckbox("providesServicesInRomania", "Provides services in Romania", answerBoolean(model, "relationship.providesServicesInRomania")),
    renderCheckbox(
      "providesServicesInAnotherEuMemberState",
      "Provides services in another EU member state",
      answerBoolean(model, "relationship.providesServicesInAnotherEuMemberState")
    ),
    renderCheckbox(
      "criticalEntityInRomaniaLaw294",
      "Critical entity under Romania Law 294/2024",
      answerBoolean(model, "relationship.criticalEntityInRomaniaLaw294")
    ),
    renderCommandButton({ label: "Save progress", ariaLabel: "Save Romania onboarding progress", tone: "primary", type: "submit" }),
    "</form>",
    "</article>",
    '<article class="ps-panel">',
    '<h3 class="ps-panel__title">Generate readiness outputs</h3>',
    '<div class="ps-action-list">',
    renderWorkflowActionForm("/onboarding/romania/classify", "Run classification", "run-romania-classification", !model.hasSavedProgress),
    renderWorkflowActionForm("/onboarding/romania/notification-draft", "Generate draft", "generate-romania-notification-draft", !model.hasSavedProgress),
    renderWorkflowActionForm("/onboarding/romania/evaluate", "Evaluate readiness", "evaluate-romania-readiness", !model.hasSavedProgress),
    renderWorkflowActionForm(
      "/onboarding/romania/reports/internal-readiness",
      "Readiness export",
      "generate-internal-readiness-export",
      !model.assessmentId
    ),
    renderWorkflowActionForm(
      "/onboarding/romania/reports/notification-draft",
      "Draft export",
      "generate-romania-draft-export",
      !model.latestNotificationDraftId
    ),
    renderWorkflowActionForm("/onboarding/romania/audit/checkpoint", "Record checkpoint", "record-audit-checkpoint", false),
    "</div>",
    '<form class="ps-form ps-stack-top" action="/onboarding/romania/evidence" method="post" data-ui-action="upload-local-evidence">',
    renderTextInput("evidenceTitle", "Evidence title", "Romania readiness note", true),
    renderTextInput("controlId", "Control ID", "nis2.governance.risk-management", false),
    renderTextarea("evidenceContent", "Evidence text", "Describe the local evidence or paste a short policy excerpt."),
    renderCommandButton({ label: "Attach evidence", ariaLabel: "Attach local evidence", tone: "primary", type: "submit" }),
    "</form>",
    "</article>",
    "</div>",
    '<div class="ps-chip-row ps-stack-top">',
    model.evidence.latestTitles.length > 0
      ? model.evidence.latestTitles.map((title) => renderSourceChip({ label: "Latest evidence", detail: title })).join("")
      : renderStatusPill({ label: "No evidence attached yet", tone: "warning" }),
    "</div>"
  ].join("");

const renderWorkflowActionForm = (action: string, label: string, uiAction: string, disabled: boolean): string =>
  [
    `<form action="${escapeHtml(action)}" method="post" data-ui-action="${escapeHtml(uiAction)}">`,
    renderCommandButton({
      label,
      ariaLabel: label,
      disabled,
      tone: disabled ? "secondary" : "primary",
      type: "submit"
    }),
    "</form>"
  ].join("");

const renderTextInput = (
  name: string,
  label: string,
  value: string,
  required = false,
  type: "email" | "number" | "text" = "text"
): string =>
  `<div class="ps-field"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><input id="${escapeHtml(
    name
  )}" name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}"${required ? " required" : ""}></div>`;

const renderTextarea = (name: string, label: string, value: string): string =>
  `<div class="ps-field"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><textarea id="${escapeHtml(
    name
  )}" name="${escapeHtml(name)}" rows="4">${escapeHtml(value)}</textarea></div>`;

const renderSelect = (name: string, label: string, value: string, options: Array<readonly [string, string]>): string =>
  [
    `<div class="ps-field"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><select id="${escapeHtml(
      name
    )}" name="${escapeHtml(name)}" required>`,
    ...options.map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}"${optionValue === value ? " selected" : ""}>${escapeHtml(optionLabel)}</option>`
    ),
    "</select></div>"
  ].join("");

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

const firstStringAnswer = (model: RomaniaOnboardingRouteModel, path: string): string => {
  const value = valueAtPath(model.progress.answers, path);
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
};

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
    '<a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">Switch workspace</a>',
    renderStatusPill({ label: `Plan: ${model.organization.subscriptionStatus}`, tone: "info" }),
    model.runtimeSource ? renderSourceChip(model.runtimeSource) : "",
    renderSourceChip({ label: "Dashboard source", detail: model.dashboard.source }),
    "</div>",
    "</header>"
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
    '<div class="ps-chip-row">',
    renderSourceChip({ label: "Organization", detail: organization.id }),
    renderStatusPill({ label: `Billing ${organization.billingStatus}`, tone: "neutral" }),
    "</div>",
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
      '<div class="ps-score-grid">',
      ...scoreMeters.map(([label, value]) => `<div class="ps-panel">${renderMeter({ label, value, source: "dashboard_snapshots" })}</div>`),
      "</div>",
      '<div class="ps-grid ps-stack-top">',
      ...model.dashboard.widgets.map(renderDashboardWidget),
      "</div>"
    ].join("")
  });
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

const renderSection = ({ id, title, eyebrow, body }: { id: string; title: string; eyebrow: string; body: string }): string =>
  [
    `<section class="ps-section" id="${escapeHtml(id)}" data-ui-section="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}-title">`,
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

const formatRoSourceReferences = (references?: readonly { cell?: string; range?: string; sheet: string }[]): string =>
  (references ?? []).map((reference) => [reference.sheet, reference.cell ?? reference.range].filter(Boolean).join("!")).join(", ");

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
