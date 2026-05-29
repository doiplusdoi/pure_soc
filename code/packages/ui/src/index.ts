export type PureSocUiTone = "neutral" | "info" | "success" | "warning" | "danger" | "critical" | "accent";

export interface PureSocStatusPillInput {
  label: string;
  tone?: PureSocUiTone;
}

export interface PureSocSourceChipInput {
  label: string;
  detail?: string;
  href?: string;
}

export interface PureSocMeterInput {
  label: string;
  value: number;
  source: string;
}

export interface PureSocCommandButtonInput {
  label: string;
  ariaLabel?: string;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  icon?: string;
  type?: "button" | "submit";
}

export interface PureSocTableColumn<T> {
  header: string;
  render: (row: T) => string;
}

export const pureSocDesignSystemDecision = {
  name: "PureSOC operational design system",
  register: "product",
  primarySurface: "operational_console",
  colorStrategy: "restrained",
  typography: "system-ui",
  componentModel: "semantic-html-primitives",
  sourceOfTruth: "stored-analysis-contracts"
} as const;

export const pureSocTokens = {
  color: {
    canvas: "oklch(98.5% 0.007 165)",
    surface: "oklch(96.9% 0.008 170)",
    panel: "oklch(99.1% 0.006 160)",
    panelSubtle: "oklch(94.6% 0.011 178)",
    ink: "oklch(24% 0.018 225)",
    muted: "oklch(47% 0.017 222)",
    border: "oklch(85.5% 0.015 190)",
    focus: "oklch(59% 0.16 162)",
    accent: "oklch(48% 0.13 165)",
    accentSoft: "oklch(90.5% 0.055 160)",
    info: "oklch(55% 0.105 230)",
    infoSoft: "oklch(91% 0.04 225)",
    success: "oklch(50% 0.12 150)",
    successSoft: "oklch(91% 0.045 145)",
    warning: "oklch(68% 0.145 76)",
    warningSoft: "oklch(93% 0.055 82)",
    danger: "oklch(56% 0.17 28)",
    dangerSoft: "oklch(92% 0.055 28)",
    critical: "oklch(44% 0.19 18)",
    criticalSoft: "oklch(88% 0.07 18)"
  },
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px"
  },
  type: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
  }
} as const;

export const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const renderPureSocDesignSystemCss = (): string => `
:root {
  color-scheme: light;
  --ps-color-canvas: ${pureSocTokens.color.canvas};
  --ps-color-surface: ${pureSocTokens.color.surface};
  --ps-color-panel: ${pureSocTokens.color.panel};
  --ps-color-panel-subtle: ${pureSocTokens.color.panelSubtle};
  --ps-color-ink: ${pureSocTokens.color.ink};
  --ps-color-muted: ${pureSocTokens.color.muted};
  --ps-color-border: ${pureSocTokens.color.border};
  --ps-color-focus: ${pureSocTokens.color.focus};
  --ps-color-accent: ${pureSocTokens.color.accent};
  --ps-color-accent-soft: ${pureSocTokens.color.accentSoft};
  --ps-color-info: ${pureSocTokens.color.info};
  --ps-color-info-soft: ${pureSocTokens.color.infoSoft};
  --ps-color-success: ${pureSocTokens.color.success};
  --ps-color-success-soft: ${pureSocTokens.color.successSoft};
  --ps-color-warning: ${pureSocTokens.color.warning};
  --ps-color-warning-soft: ${pureSocTokens.color.warningSoft};
  --ps-color-danger: ${pureSocTokens.color.danger};
  --ps-color-danger-soft: ${pureSocTokens.color.dangerSoft};
  --ps-color-critical: ${pureSocTokens.color.critical};
  --ps-color-critical-soft: ${pureSocTokens.color.criticalSoft};
  --ps-radius-xs: ${pureSocTokens.radius.xs};
  --ps-radius-sm: ${pureSocTokens.radius.sm};
  --ps-radius-md: ${pureSocTokens.radius.md};
  --ps-font-sans: ${pureSocTokens.type.family};
}

* {
  box-sizing: border-box;
}

body.ps-body {
  margin: 0;
  background: var(--ps-color-canvas);
  color: var(--ps-color-ink);
  font-family: var(--ps-font-sans);
  font-size: 0.9375rem;
  line-height: 1.45;
  letter-spacing: 0;
}

body.ps-body,
.ps-panel,
.ps-fact,
.ps-table td,
.ps-source-chip,
.ps-status,
.ps-command {
  overflow-wrap: anywhere;
}

a {
  color: inherit;
}

.ps-skip-link {
  position: absolute;
  left: 1rem;
  top: 0.75rem;
  z-index: 5;
  transform: translateY(-4rem);
  border: 1px solid var(--ps-color-focus);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  padding: 0.5rem 0.75rem;
  transition: transform 180ms ease-out;
}

.ps-skip-link:focus-visible {
  transform: translateY(0);
}

.ps-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 17.5rem minmax(0, 1fr);
}

.ps-sidebar {
  background: var(--ps-color-surface);
  border-right: 1px solid var(--ps-color-border);
  padding: 1rem;
}

.ps-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0.25rem 1rem;
}

.ps-brand__name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}

.ps-brand__meta,
.ps-muted,
.ps-source-detail {
  color: var(--ps-color-muted);
}

.ps-nav {
  display: grid;
  gap: 0.25rem;
}

.ps-nav__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2.35rem;
  border-radius: var(--ps-radius-sm);
  padding: 0.45rem 0.6rem;
  text-decoration: none;
}

.ps-nav__link[aria-current="page"] {
  background: var(--ps-color-accent-soft);
  color: var(--ps-color-accent);
  font-weight: 700;
}

.ps-main {
  min-width: 0;
}

.ps-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--ps-color-border);
  background: var(--ps-color-panel);
  padding: 0.85rem 1.25rem;
}

.ps-topbar__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.ps-topbar__actions,
.ps-command-row,
.ps-chip-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.ps-content {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
}

.ps-content--auth {
  min-height: 100vh;
  align-content: center;
  width: min(100%, 44rem);
  margin: 0 auto;
}

.ps-section {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel);
  overflow: hidden;
}

.ps-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--ps-color-border);
  padding: 0.85rem 1rem;
}

.ps-section__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
}

.ps-section__body {
  padding: 1rem;
}

.ps-grid,
.ps-score-grid,
.ps-action-list {
  display: grid;
  gap: 0.75rem;
}

.ps-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ps-score-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.ps-panel {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel-subtle);
  padding: 0.85rem;
}

.ps-panel--quiet {
  background: var(--ps-color-panel);
}

.ps-panel--wide {
  grid-column: span 2;
}

.ps-fact {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  padding: 0.7rem 0.8rem;
}

.ps-panel__title {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 750;
}

.ps-panel__meta,
.ps-source-detail {
  font-size: 0.8125rem;
}

.ps-stack-top {
  margin-top: 0.75rem;
}

.ps-source-stack {
  margin-top: 0.5rem;
}

.ps-dashboard-number {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
}

.ps-route-hero {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel);
  overflow: hidden;
}

.ps-route-hero__body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.65fr);
  gap: 1rem;
  padding: 1rem;
}

.ps-route-hero__eyebrow {
  margin: 0 0 0.35rem;
  color: var(--ps-color-muted);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.ps-route-hero__title {
  margin: 0;
  font-size: 1.65rem;
  line-height: 1.15;
  font-weight: 800;
}

.ps-route-hero__lede {
  max-width: 58rem;
  margin: 0.55rem 0 0;
  color: var(--ps-color-muted);
}

.ps-route-hero__facts {
  display: grid;
  gap: 0.5rem;
  align-content: start;
}

.ps-route-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.ps-stepper {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0 1rem 1rem;
  list-style: none;
}

.ps-step {
  min-height: 5.5rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel-subtle);
  padding: 0.7rem;
}

.ps-step__header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.35rem;
  font-weight: 800;
}

.ps-step__index {
  display: inline-grid;
  place-items: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 999px;
  border: 1px solid var(--ps-color-border);
  background: var(--ps-color-panel);
  font-size: 0.78rem;
}

.ps-step--active {
  border-color: var(--ps-color-accent);
  background: var(--ps-color-accent-soft);
}

.ps-step--complete {
  border-color: var(--ps-color-success);
  background: var(--ps-color-success-soft);
}

.ps-step--blocked {
  color: var(--ps-color-muted);
}

.ps-next-action {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--ps-color-accent);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-accent-soft);
  padding: 0.85rem;
}

.ps-next-action h3,
.ps-next-action p {
  margin: 0;
}

.ps-next-action p {
  color: var(--ps-color-muted);
}

.ps-section__header--flat {
  padding: 0 0 0.7rem;
  border-bottom: 0;
}

.ps-meter {
  display: grid;
  gap: 0.35rem;
}

.ps-meter__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: 700;
}

.ps-meter__track {
  height: 0.55rem;
  border-radius: 999px;
  background: var(--ps-color-border);
  overflow: hidden;
}

.ps-meter__bar {
  height: 100%;
  border-radius: 999px;
  background: var(--ps-color-accent);
}

.ps-status,
.ps-source-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  border: 1px solid var(--ps-color-border);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.8125rem;
  font-weight: 700;
  max-width: 100%;
  white-space: normal;
}

.ps-source-chip {
  background: var(--ps-color-panel);
  font-weight: 650;
}

.ps-status--neutral {
  background: var(--ps-color-panel);
}

.ps-status--info {
  border-color: var(--ps-color-info);
  background: var(--ps-color-info-soft);
  color: var(--ps-color-info);
}

.ps-status--success {
  border-color: var(--ps-color-success);
  background: var(--ps-color-success-soft);
  color: var(--ps-color-success);
}

.ps-status--warning {
  border-color: var(--ps-color-warning);
  background: var(--ps-color-warning-soft);
  color: oklch(38% 0.11 72);
}

.ps-status--danger {
  border-color: var(--ps-color-danger);
  background: var(--ps-color-danger-soft);
  color: var(--ps-color-danger);
}

.ps-status--critical {
  border-color: var(--ps-color-critical);
  background: var(--ps-color-critical-soft);
  color: var(--ps-color-critical);
}

.ps-status--accent {
  border-color: var(--ps-color-accent);
  background: var(--ps-color-accent-soft);
  color: var(--ps-color-accent);
}

.ps-table-wrap {
  overflow-x: auto;
}

.ps-table {
  width: 100%;
  min-width: 44rem;
  border-collapse: collapse;
}

.ps-table th,
.ps-table td {
  border-bottom: 1px solid var(--ps-color-border);
  padding: 0.65rem 0.55rem;
  text-align: left;
  vertical-align: top;
}

.ps-table th {
  color: var(--ps-color-muted);
  font-size: 0.78rem;
  font-weight: 750;
  text-transform: uppercase;
}

.ps-command {
  min-height: 2.75rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  color: var(--ps-color-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.8rem;
  font: inherit;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 160ms ease-out,
    border-color 160ms ease-out,
    color 160ms ease-out;
}

.ps-command:hover {
  border-color: var(--ps-color-accent);
  background: var(--ps-color-accent-soft);
  color: var(--ps-color-accent);
}

.ps-command--primary {
  border-color: var(--ps-color-accent);
  background: var(--ps-color-accent);
  color: oklch(98% 0.01 165);
}

.ps-command--primary:hover {
  background: oklch(43% 0.13 165);
  color: oklch(98% 0.01 165);
}

.ps-command--danger {
  border-color: var(--ps-color-danger);
  color: var(--ps-color-danger);
}

.ps-command:disabled,
.ps-command[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.62;
}

.ps-command:disabled:hover,
.ps-command[aria-disabled="true"]:hover {
  border-color: var(--ps-color-border);
  background: var(--ps-color-panel);
  color: var(--ps-color-ink);
}

.ps-legal-caveat {
  border: 1px solid var(--ps-color-warning);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-warning-soft);
  color: oklch(31% 0.07 70);
  padding: 0.85rem;
}

.ps-form {
  width: min(100%, 28rem);
  display: grid;
  gap: 0.85rem;
}

.ps-form--wide {
  width: 100%;
}

.ps-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.ps-fieldset {
  min-width: 0;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  padding: 0.85rem;
}

.ps-fieldset + .ps-fieldset {
  margin-top: 0.85rem;
}

.ps-fieldset__legend {
  padding: 0 0.35rem;
  font-weight: 800;
}

.ps-inline-form {
  margin: 0;
  display: inline-flex;
}

.ps-field {
  display: grid;
  gap: 0.35rem;
}

.ps-field--full {
  grid-column: 1 / -1;
}

.ps-field label {
  font-weight: 750;
}

.ps-help {
  color: var(--ps-color-muted);
  font-size: 0.8125rem;
}

.ps-field input,
.ps-field select,
.ps-field textarea {
  min-height: 2.75rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  color: var(--ps-color-ink);
  padding: 0.5rem 0.65rem;
  font: inherit;
}

.ps-field textarea {
  resize: vertical;
}

.ps-field--checkbox {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.75rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  padding: 0.45rem 0.6rem;
}

.ps-field--checkbox input {
  min-height: auto;
  width: 1.15rem;
  height: 1.15rem;
  margin: 0;
  flex: 0 0 auto;
}

.ps-action-form {
  display: grid;
  gap: 0.35rem;
  align-items: start;
}

.ps-disclosure {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel);
  padding: 0.75rem;
}

.ps-disclosure summary {
  cursor: pointer;
  font-weight: 800;
}

.ps-trace {
  background: var(--ps-color-panel-subtle);
}

.ps-trace-section .ps-section__header {
  background: var(--ps-color-panel-subtle);
}

.ps-empty-state {
  border: 1px dashed var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel);
  padding: 0.85rem;
}

:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 3px solid var(--ps-color-focus);
  outline-offset: 2px;
}

@media (max-width: 980px) {
  .ps-shell {
    grid-template-columns: 1fr;
  }

  .ps-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--ps-color-border);
  }

  .ps-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ps-grid,
  .ps-score-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ps-route-hero__body,
  .ps-stepper,
  .ps-form-grid {
    grid-template-columns: 1fr;
  }

  .ps-panel--wide {
    grid-column: span 2;
  }
}

@media (max-width: 640px) {
  .ps-topbar,
  .ps-section__header,
  .ps-next-action {
    align-items: stretch;
    flex-direction: column;
  }

  .ps-content {
    padding: 0.75rem;
  }

  .ps-grid,
  .ps-score-grid,
  .ps-nav {
    grid-template-columns: 1fr;
  }

  .ps-panel--wide {
    grid-column: auto;
  }

  .ps-table {
    min-width: 38rem;
  }

  .ps-status,
  .ps-source-chip {
    min-height: auto;
  }
}

@media (max-width: 420px) {
  .ps-content {
    padding: 0.5rem;
  }

  .ps-section__body {
    padding: 0.75rem;
  }

  .ps-table {
    min-width: 32rem;
  }
}
`;

export const renderStatusPill = ({ label, tone = "neutral" }: PureSocStatusPillInput): string =>
  `<span class="ps-status ps-status--${tone}">${escapeHtml(label)}</span>`;

export const renderSourceChip = ({ label, detail, href }: PureSocSourceChipInput): string => {
  const content = `${escapeHtml(label)}${detail ? ` <span class="ps-source-detail">${escapeHtml(detail)}</span>` : ""}`;

  if (href) {
    return `<a class="ps-source-chip" href="${escapeHtml(href)}">${content}</a>`;
  }

  return `<span class="ps-source-chip">${content}</span>`;
};

export const renderMeter = ({ label, value, source }: PureSocMeterInput): string => {
  const percent = clampPercent(value);

  return [
    `<div class="ps-meter" role="meter" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">`,
    `<div class="ps-meter__label"><span>${escapeHtml(label)}</span><span>${percent}%</span></div>`,
    `<div class="ps-meter__track"><div class="ps-meter__bar" style="width: ${percent}%"></div></div>`,
    `<span class="ps-source-detail">Source: ${escapeHtml(source)}</span>`,
    "</div>"
  ].join("");
};

export const renderCommandButton = ({
  label,
  ariaLabel,
  tone = "secondary",
  disabled = false,
  icon,
  type = "button"
}: PureSocCommandButtonInput): string => {
  const classes = ["ps-command", tone !== "secondary" ? `ps-command--${tone}` : ""].filter(Boolean).join(" ");
  const disabledAttributes = disabled ? ' disabled aria-disabled="true"' : "";
  const accessibleLabel = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : "";
  const iconMarkup = icon ? `<span aria-hidden="true">${escapeHtml(icon)}</span>` : "";

  return `<button type="${type}" class="${classes}"${accessibleLabel}${disabledAttributes}>${iconMarkup}<span>${escapeHtml(label)}</span></button>`;
};

export const renderLegalCaveat = (caveat: string): string =>
  `<aside class="ps-legal-caveat" aria-label="Legal caveat">${escapeHtml(caveat)}</aside>`;

export const renderDataTable = <T>(caption: string, columns: readonly PureSocTableColumn<T>[], rows: readonly T[]): string => {
  const header = columns.map((column) => `<th scope="col">${escapeHtml(column.header)}</th>`).join("");
  const body =
    rows.length === 0
      ? `<tr><td colspan="${columns.length}">No records</td></tr>`
      : rows
          .map((row) => `<tr>${columns.map((column) => `<td>${column.render(row)}</td>`).join("")}</tr>`)
          .join("");

  return [
    '<div class="ps-table-wrap">',
    '<table class="ps-table">',
    `<caption class="ps-muted">${escapeHtml(caption)}</caption>`,
    `<thead><tr>${header}</tr></thead>`,
    `<tbody>${body}</tbody>`,
    "</table>",
    "</div>"
  ].join("");
};
