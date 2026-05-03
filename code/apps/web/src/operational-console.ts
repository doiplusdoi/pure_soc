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
  ReportSurface
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

export interface RuntimeMessageScreenInput {
  actionHref?: string;
  actionLabel?: string;
  locale?: string | null;
  statusLabel: string;
  statusTone?: PureSocUiTone;
  summary: string;
  title: string;
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
    '<a class="ps-skip-link" href="#content">Skip to content</a>',
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
    '<main class="ps-content" id="content" tabindex="-1">',
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
    '<a class="ps-skip-link" href="#content">Skip to content</a>',
    '<main class="ps-content" id="content" tabindex="-1" data-ui-smoke="romania-onboarding-route">',
    renderSection({
      id: "romania-onboarding",
      title: "Romania NIS2 Onboarding",
      eyebrow: renderStatusPill({ label: model.countryPack.countryPackStatus.replaceAll("_", " "), tone: "warning" }),
      body: [
        '<div class="ps-grid">',
        '<article class="ps-panel">',
        '<h3 class="ps-panel__title">Workbook-backed progress</h3>',
        `<p>${escapeHtml(model.progress.completedSteps.length)} of ${escapeHtml(model.steps.length)} steps have contract data on this served route.</p>`,
        renderMeter({
          label: "Required field coverage",
          value: Math.round((completedRequiredFieldCount / requiredFieldCount) * 100),
          source: "roNis2OnboardingSchema"
        }),
        renderSourceChip({ label: "Source version", detail: model.progress.sourceVersion }),
        servicesSourceMap
          ? renderSourceChip({ label: "Services source", detail: servicesSourceMap.workbookRange ?? servicesSourceMap.sourceMapId })
          : "",
        "</article>",
        '<article class="ps-panel">',
        '<h3 class="ps-panel__title">Preliminary classification</h3>',
        renderStatusPill({ label: model.classification.result.replaceAll("_", " "), tone: "warning" }),
        `<p>${escapeHtml(model.classification.reasons[0] ?? "Classification awaits more source-mapped answers.")}</p>`,
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
        "</div>"
      ].join("")
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
    '<p><a class="ps-command" href="/">Back to dashboard</a></p>',
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
    [copy.dashboard, "#dashboard"],
    ["Onboarding", "#onboarding"],
    ["Romania onboarding", "/onboarding/romania?locale=ro-RO"],
    ["Microsoft 365", "#microsoft365"],
    ["Gaps", "#gaps"],
    [copy.evidenceReports, "#evidence"],
    [copy.approvalQueue, "#approvals"]
  ] as const;

  return [
    '<aside class="ps-sidebar" aria-label="Primary navigation">',
    '<div class="ps-brand">',
    `<div><p class="ps-brand__name">PureSOC</p><span class="ps-brand__meta">${escapeHtml(model.organization.primaryCountryCode)} workspace</span></div>`,
    renderStatusPill({ label: copy.internalReadiness, tone: "accent" }),
    "</div>",
    '<nav class="ps-nav">',
    ...items.map(([label, href], index) =>
      `<a class="ps-nav__link" href="${href}"${index === 0 ? ' aria-current="page"' : ""}><span>${escapeHtml(label)}</span><span aria-hidden="true">&rsaquo;</span></a>`
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
    renderStatusPill({ label: `Plan: ${model.organization.subscriptionStatus}`, tone: "info" }),
    model.runtimeSource ? renderSourceChip(model.runtimeSource) : "",
    renderSourceChip({ label: "Dashboard source", detail: model.dashboard.source }),
    "</div>",
    "</header>"
  ].join("");

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
    `<section class="ps-section" id="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}-title">`,
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

const formatRoSourceReferences = (references: readonly { cell?: string; range?: string; sheet: string }[]): string =>
  references.map((reference) => [reference.sheet, reference.cell ?? reference.range].filter(Boolean).join("!")).join(", ");

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
