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
  colorStrategy: "institutional_minimalism",
  typography: "inter_or_system",
  componentModel: "semantic-html-primitives",
  sourceOfTruth: "stored-analysis-contracts"
} as const;

export const pureSocTokens = {
  color: {
    canvas: "#f8f9ff",
    surface: "#eff4ff",
    panel: "#ffffff",
    panelSubtle: "#f3f6ff",
    panelStrong: "#dce9ff",
    ink: "#0b1c30",
    muted: "#434654",
    border: "#c3c6d6",
    borderStrong: "#737685",
    focus: "#003d9b",
    accent: "#003d9b",
    accentStrong: "#0052cc",
    accentSoft: "#d3e4fe",
    info: "#0c56d0",
    infoSoft: "#e5eeff",
    success: "#006846",
    successSoft: "#e2f7ec",
    warning: "#8a5a00",
    warningSoft: "#fff4d8",
    danger: "#ba1a1a",
    dangerSoft: "#ffdad6",
    critical: "#93000a",
    criticalSoft: "#fff1f0"
  },
  radius: {
    xs: "2px",
    sm: "4px",
    md: "6px"
  },
  type: {
    family: 'Inter, Aptos, "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
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
  --ps-color-panel-strong: ${pureSocTokens.color.panelStrong};
  --ps-color-ink: ${pureSocTokens.color.ink};
  --ps-color-muted: ${pureSocTokens.color.muted};
  --ps-color-border: ${pureSocTokens.color.border};
  --ps-color-border-strong: ${pureSocTokens.color.borderStrong};
  --ps-color-focus: ${pureSocTokens.color.focus};
  --ps-color-accent: ${pureSocTokens.color.accent};
  --ps-color-accent-strong: ${pureSocTokens.color.accentStrong};
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
  font-size: 0.875rem;
  line-height: 1.45;
  letter-spacing: 0;
  text-rendering: geometricPrecision;
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

.ps-body p,
.ps-body h1,
.ps-body h2,
.ps-body h3,
.ps-body h4 {
  margin-top: 0;
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
  min-height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 17.5rem;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 0;
}

.ps-brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-height: 6.25rem;
  border-bottom: 1px solid var(--ps-color-border);
  padding: 1.25rem 1.5rem;
}

.ps-brand__identity {
  min-width: 0;
}

.ps-brand__mark {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-accent);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
}

.ps-brand__name {
  margin: 0;
  color: var(--ps-color-accent);
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1.15;
}

.ps-brand__meta,
.ps-muted,
.ps-source-detail {
  color: var(--ps-color-muted);
}

.ps-nav {
  display: grid;
  align-content: start;
  gap: 0.45rem;
  padding: 1.15rem 0.55rem;
}

.ps-nav__link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 2.9rem;
  border: 1px solid transparent;
  border-right-width: 2px;
  border-radius: 0;
  padding: 0.55rem 0.75rem;
  color: var(--ps-color-muted);
  text-decoration: none;
}

.ps-nav__link[aria-current="page"] {
  background: var(--ps-color-accent-soft);
  color: var(--ps-color-accent);
  border-right-color: var(--ps-color-accent);
  font-weight: 700;
}

.ps-nav__link:hover {
  background: var(--ps-color-panel-strong);
  color: var(--ps-color-accent);
}

.ps-nav__icon {
  display: inline-grid;
  place-items: center;
  width: 1.4rem;
  color: currentColor;
  font-size: 1rem;
  font-weight: 800;
}

.ps-nav__chevron {
  margin-left: auto;
  color: var(--ps-color-border-strong);
}

.ps-sidebar__footer {
  display: grid;
  gap: 0.8rem;
  border-top: 1px solid var(--ps-color-border);
  padding: 1.5rem;
}

.ps-main {
  min-width: 0;
  grid-column: 2;
}

.ps-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 4.15rem;
  border-bottom: 1px solid var(--ps-color-border);
  background: var(--ps-color-panel);
  padding: 0.65rem 1.9rem;
  position: sticky;
  top: 0;
  z-index: 3;
}

.ps-topbar__title {
  margin: 0;
  color: var(--ps-color-ink);
  font-size: 0.95rem;
  font-weight: 700;
}

.ps-topbar__tabs {
  display: flex;
  align-items: center;
  gap: 1.35rem;
}

.ps-topbar__tab {
  min-height: 2.4rem;
  display: inline-flex;
  align-items: center;
  border-bottom: 2px solid transparent;
  color: var(--ps-color-muted);
  font-weight: 700;
  text-decoration: none;
}

.ps-topbar__tab[aria-current="page"] {
  border-bottom-color: var(--ps-color-accent);
  color: var(--ps-color-accent);
}

.ps-topbar__actions,
.ps-command-row,
.ps-chip-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.ps-topbar__search {
  width: min(20rem, 30vw);
  min-height: 2.55rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel-subtle);
  color: var(--ps-color-muted);
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.75rem;
}

.ps-topbar__search span {
  color: var(--ps-color-muted);
  white-space: nowrap;
}

.ps-topbar__search input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--ps-color-ink);
  font: inherit;
  outline: 0;
}

.ps-content {
  display: grid;
  gap: 1.4rem;
  width: min(100%, 90rem);
  margin: 0 auto;
  padding: 1.9rem;
}

.ps-content--wizard {
  width: min(100%, 96rem);
  gap: 1rem;
  padding-bottom: 5rem;
}

.ps-content--auth {
  min-height: 100vh;
  align-content: center;
  width: min(100%, 44rem);
  margin: 0 auto;
}

.ps-content--connector {
  min-height: 100vh;
  align-content: center;
  width: min(100%, 80rem);
}

.ps-connector-shell {
  display: grid;
  grid-template-columns: minmax(17rem, 0.48fr) minmax(0, 1fr);
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel);
  overflow: hidden;
}

.ps-connector-roadmap {
  border-right: 1px solid var(--ps-color-border);
  background: var(--ps-color-surface);
  padding: 1.8rem;
}

.ps-connector-roadmap__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2.5rem;
}

.ps-connector-roadmap__list {
  display: grid;
  gap: 1.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ps-connector-step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
}

.ps-connector-step__dot {
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid var(--ps-color-border);
  border-radius: 50%;
  background: var(--ps-color-surface);
  color: var(--ps-color-border-strong);
  font-size: 0.75rem;
  font-weight: 800;
}

.ps-connector-step--complete .ps-connector-step__dot,
.ps-connector-step--active .ps-connector-step__dot {
  border-color: var(--ps-color-accent);
  background: var(--ps-color-accent);
  color: #ffffff;
}

.ps-connector-step strong {
  display: block;
}

.ps-connector-step span {
  color: var(--ps-color-muted);
}

.ps-connector-main {
  display: grid;
  align-content: center;
  gap: 1.4rem;
  padding: 3.5rem;
}

.ps-connector-icon {
  display: inline-grid;
  place-items: center;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-accent-soft);
  color: var(--ps-color-accent);
  font-weight: 850;
}

.ps-connector-main h1 {
  max-width: 28ch;
  margin: 0;
  font-size: 2.15rem;
  line-height: 1.16;
  font-weight: 850;
}

.ps-connector-main > p {
  max-width: 58ch;
  color: var(--ps-color-muted);
  font-size: 1rem;
}

.ps-connector-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel-subtle);
  padding: 1.2rem;
}

.ps-connector-card__logo {
  display: inline-grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  color: var(--ps-color-accent);
  font-weight: 850;
}

.ps-connector-neutrality {
  border-top: 1px solid var(--ps-color-border);
  padding-top: 1.2rem;
}

.ps-section {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel);
  overflow: hidden;
  scroll-margin-top: 5.25rem;
}

.ps-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--ps-color-border);
  padding: 1rem 1.2rem;
}

.ps-section__title {
  margin: 0;
  color: var(--ps-color-ink);
  font-size: 1.15rem;
  line-height: 1.25;
  font-weight: 800;
}

.ps-section__body {
  padding: 1.2rem;
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
  background: var(--ps-color-panel);
  padding: 1rem;
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
  background: var(--ps-color-panel-subtle);
  padding: 0.7rem 0.8rem;
}

.ps-panel__title {
  margin: 0 0 0.45rem;
  color: var(--ps-color-ink);
  font-size: 1rem;
  line-height: 1.3;
  font-weight: 800;
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

.ps-page-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  border-bottom: 1px solid var(--ps-color-border);
  padding-bottom: 1rem;
}

.ps-page-hero h1 {
  margin: 0;
  color: var(--ps-color-ink);
  font-size: 2.45rem;
  line-height: 1.08;
  font-weight: 800;
}

.ps-page-hero p {
  margin: 0.45rem 0 0;
  color: var(--ps-color-muted);
  font-size: 1.05rem;
}

.ps-dashboard-grid {
  display: grid;
  grid-template-columns: minmax(18rem, 0.85fr) minmax(0, 1.85fr);
  gap: 1.5rem;
}

.ps-dashboard-secondary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(18rem, 0.9fr);
  gap: 1.5rem;
}

.ps-readiness-ring-card {
  min-height: 22rem;
  display: grid;
  align-content: space-between;
  justify-items: center;
}

.ps-readiness-ring-card .ps-panel__title {
  justify-self: start;
}

.ps-readiness-ring {
  --ps-ring-value: 0;
  --ps-ring-color: var(--ps-color-accent);
  width: min(13.5rem, 55vw);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, var(--ps-color-panel) 0 56%, transparent 57%),
    conic-gradient(var(--ps-ring-color) calc(var(--ps-ring-value) * 1%), var(--ps-color-accent-soft) 0);
  display: grid;
  place-items: center;
}

.ps-readiness-ring__label {
  display: grid;
  justify-items: center;
  line-height: 1.1;
}

.ps-readiness-ring__value {
  font-size: 2.35rem;
  font-weight: 850;
}

.ps-readiness-ring__caption {
  color: var(--ps-color-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.ps-readiness-ring-card__footer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--ps-color-border);
  padding-top: 0.8rem;
  color: var(--ps-color-muted);
}

.ps-critical-list,
.ps-roadmap-grid,
.ps-evidence-bars {
  display: grid;
  gap: 0.7rem;
}

.ps-critical-gap {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.75rem;
  border: 1px solid var(--ps-color-border);
  border-left-width: 3px;
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel-subtle);
  padding: 0.7rem 0.75rem;
}

.ps-critical-gap--high {
  border-color: var(--ps-color-danger-soft);
  border-left-color: var(--ps-color-danger);
  background: var(--ps-color-critical-soft);
}

.ps-critical-gap--medium {
  border-left-color: var(--ps-color-warning);
}

.ps-critical-gap__dot {
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.45rem;
  border-radius: 50%;
  background: currentColor;
  color: var(--ps-color-danger);
}

.ps-critical-gap h3,
.ps-critical-gap p {
  margin: 0;
}

.ps-critical-gap p {
  margin-top: 0.22rem;
  color: var(--ps-color-muted);
}

.ps-roadmap-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ps-roadmap-card {
  min-height: 8.9rem;
  border: 1px solid var(--ps-color-border);
  border-left: 3px solid var(--ps-color-accent);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel-subtle);
  padding: 0.85rem;
  display: grid;
  align-content: space-between;
}

.ps-roadmap-card--urgent {
  border-left-color: var(--ps-color-danger);
}

.ps-roadmap-card--planned {
  border-left-color: var(--ps-color-success);
}

.ps-evidence-health {
  text-align: center;
}

.ps-evidence-health__value {
  margin: 0.8rem 0 0.15rem;
  font-size: 2.4rem;
  line-height: 1;
  font-weight: 850;
}

.ps-evidence-bar {
  display: grid;
  gap: 0.3rem;
}

.ps-evidence-bar__label {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: 750;
}

.ps-trend-card {
  display: grid;
  gap: 0.85rem;
}

.ps-trend-card__header {
  align-items: center;
}

.ps-trend-toggle-row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;
}

.ps-trend-toggle {
  min-height: 2rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  color: var(--ps-color-muted);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  padding: 0.35rem 0.6rem;
}

.ps-trend-toggle[aria-pressed="true"] {
  border-color: var(--ps-color-accent);
  background: var(--ps-color-accent-soft);
  color: var(--ps-color-accent);
}

.ps-trend-panel[hidden] {
  display: none;
}

.ps-trend-chart {
  --ps-trend-score-color: var(--ps-color-warning);
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel-subtle);
  padding: 0.55rem 0.55rem 0.4rem;
}

.ps-trend-chart--up {
  --ps-trend-score-color: var(--ps-color-success);
}

.ps-trend-chart--down {
  --ps-trend-score-color: var(--ps-color-danger);
}

.ps-trend-svg {
  display: block;
  width: 100%;
  height: auto;
}

.ps-trend-axis {
  stroke: var(--ps-color-border-strong);
  stroke-width: 1;
}

.ps-trend-gridline {
  stroke: var(--ps-color-border);
  stroke-width: 1;
}

.ps-trend-axis-label,
.ps-trend-date-label {
  fill: var(--ps-color-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.ps-trend-axis-label--left {
  text-anchor: end;
}

.ps-trend-date-label--end {
  text-anchor: end;
}

.ps-trend-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ps-trend-line--score {
  stroke: var(--ps-trend-score-color);
  stroke-width: 4;
}

.ps-trend-line--critical {
  stroke: var(--ps-color-critical);
  stroke-dasharray: 7 5;
  stroke-width: 3;
}

.ps-trend-point {
  outline: none;
}

.ps-trend-point__dot {
  fill: var(--ps-color-panel);
  stroke: var(--ps-trend-score-color);
  stroke-width: 3;
}

.ps-trend-tooltip {
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease-out;
}

.ps-trend-point:hover .ps-trend-tooltip,
.ps-trend-point:focus .ps-trend-tooltip {
  opacity: 1;
}

.ps-trend-tooltip rect {
  fill: var(--ps-color-ink);
}

.ps-trend-tooltip text {
  fill: #ffffff;
  font-size: 0.72rem;
  font-weight: 750;
}

.ps-trend-legend,
.ps-trend-stat-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  justify-content: space-between;
}

.ps-trend-legend {
  margin-top: 0.35rem;
  color: var(--ps-color-muted);
  font-size: 0.78rem;
}

.ps-trend-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.ps-trend-legend__swatch {
  display: inline-block;
  width: 1.2rem;
  height: 0.18rem;
  border-radius: 999px;
}

.ps-trend-legend__swatch--score {
  background: var(--ps-trend-score-color);
}

.ps-trend-legend__swatch--critical {
  background: var(--ps-color-critical);
}

.ps-trend-stat-row {
  border-top: 1px solid var(--ps-color-border);
  margin-top: 0.8rem;
  padding-top: 0.75rem;
}

.ps-trend-stat__summary {
  margin: 0;
  font-weight: 850;
}

.ps-trend-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 12rem;
  border: 1px dashed var(--ps-color-border-strong);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel-subtle);
  padding: 1rem;
}

.ps-route-hero {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-panel);
  overflow: hidden;
}

.ps-route-hero__body {
  display: grid;
  grid-template-columns: minmax(20rem, 0.9fr) minmax(28rem, 1.25fr) auto;
  align-items: stretch;
  gap: 0.9rem;
  padding: 1rem 1.2rem;
}

.ps-route-hero__eyebrow {
  margin: 0 0 0.35rem;
  color: var(--ps-color-accent);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.ps-route-hero__title {
  margin: 0;
  font-size: 1.75rem;
  line-height: 1.15;
  font-weight: 800;
}

.ps-route-hero__lede {
  max-width: 54ch;
  margin: 0.2rem 0 0;
  color: var(--ps-color-muted);
  font-size: 0.95rem;
  line-height: 1.35;
}

.ps-route-hero__summary-grid,
.ps-route-hero__status-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0;
}

.ps-route-hero__fact-card,
.ps-route-hero__guardrails,
.ps-route-hero__status-item {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel-subtle);
  padding: 0.65rem;
}

.ps-route-hero__status-item {
  min-width: 0;
}

.ps-route-hero__status-item .ps-meter__label {
  font-size: 0.8125rem;
}

.ps-route-hero__status-item .ps-meter__track {
  height: 0.4rem;
}

.ps-route-hero__status-label {
  display: block;
  color: var(--ps-color-muted);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.ps-route-hero__status-title {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.82rem;
  line-height: 1.25;
}

.ps-route-hero__status-note {
  display: block;
  margin-top: 0.12rem;
  color: var(--ps-color-muted);
  font-size: 0.72rem;
  line-height: 1.2;
}

.ps-route-hero__fact-kicker {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--ps-color-muted);
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
}

.ps-route-hero__fact-title {
  margin: 0 0 0.35rem;
  font-size: 0.96rem;
  line-height: 1.25;
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
  justify-content: flex-end;
  margin-top: 0;
}

.ps-route-hero__boundary-note {
  margin: 0.25rem 0 0;
  color: var(--ps-color-muted);
  font-size: 0.76rem;
}

.ps-route-details {
  border-top: 1px solid var(--ps-color-border);
  padding: 0.35rem 0.75rem;
}

.ps-route-details summary {
  width: fit-content;
  cursor: pointer;
  color: var(--ps-color-ink);
  font-size: 0.82rem;
  font-weight: 800;
}

.ps-route-details[open] .ps-route-hero__facts {
  margin-top: 0.55rem;
}

.ps-plain-list {
  display: grid;
  gap: 0.45rem;
  margin: 0.65rem 0 0;
  padding: 0;
  list-style: none;
}

.ps-plain-list li {
  border-top: 1px solid var(--ps-color-border);
  padding-top: 0.45rem;
}

.ps-route-tabs {
  display: flex;
  gap: 0.4rem;
  border-top: 1px solid var(--ps-color-border);
  padding: 0.55rem 1.2rem 0.7rem;
  overflow-x: auto;
}

.ps-route-tabs__link {
  flex: 0 0 auto;
  min-height: 2rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  padding: 0.34rem 0.62rem;
  text-decoration: none;
}

.ps-route-tabs__link span,
.ps-route-tabs__link small {
  display: block;
}

.ps-route-tabs__link span {
  font-size: 0.86rem;
  line-height: 1.2;
  font-weight: 800;
}

.ps-route-tabs__link small {
  margin-top: 0.25rem;
  color: var(--ps-color-muted);
}

.ps-route-tabs__link[aria-current="page"] {
  border-color: var(--ps-color-accent);
  background: var(--ps-color-accent-soft);
  color: var(--ps-color-accent);
}

.ps-route-tabs__link[aria-current="page"] small {
  color: var(--ps-color-ink);
}

.ps-stepper {
  display: flex;
  gap: 0.4rem;
  margin: 0;
  padding: 0.55rem 1.2rem 0.65rem;
  list-style: none;
  overflow-x: auto;
}

.ps-step {
  flex: 0 0 auto;
  min-width: 8.6rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel-subtle);
  padding: 0.45rem 0.55rem;
}

.ps-step__header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0;
  font-size: 0.76rem;
  font-weight: 800;
}

.ps-step .ps-muted {
  display: none;
}

.ps-step__index {
  display: inline-grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  border: 1px solid var(--ps-color-border);
  background: var(--ps-color-panel);
  font-size: 0.72rem;
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

.ps-section--workflow-stage {
  width: min(100%, 76rem);
  margin: 0 auto;
  border: 0;
  background: transparent;
  overflow: visible;
}

.ps-section--workflow-stage > .ps-section__header {
  max-width: 72rem;
  margin: 0 auto 0.45rem;
  border-bottom: 0;
  padding: 0.15rem 0;
}

.ps-section--workflow-stage > .ps-section__body {
  padding: 0;
}

.ps-workflow-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(17rem, 0.42fr);
  gap: 1.5rem;
  align-items: start;
}

.ps-workflow-main {
  min-width: 0;
}

.ps-workflow-help {
  width: min(100%, 72rem);
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
}

.ps-workflow-form-card {
  width: 100%;
  background: var(--ps-color-panel);
  padding: 1.2rem;
}

.ps-workflow-form-card .ps-form {
  width: 100%;
}

.ps-context-panel {
  position: sticky;
  top: 5rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-surface);
  overflow: hidden;
}

.ps-context-panel__header {
  border-bottom: 1px solid var(--ps-color-border);
  background: var(--ps-color-accent-soft);
  padding: 1rem;
}

.ps-context-panel__body {
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
}

.ps-context-fact {
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-sm);
  background: var(--ps-color-panel);
  padding: 0.75rem;
}

.ps-context-fact strong {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--ps-color-ink);
}

.ps-next-action {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--ps-color-accent);
  border-radius: var(--ps-radius-md);
  background: var(--ps-color-info-soft);
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
  padding: 0 0 0.55rem;
  border-bottom: 0;
}

.ps-chip-row--compact {
  justify-content: flex-end;
  gap: 0.35rem;
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
  height: 0.48rem;
  border-radius: var(--ps-radius-xs);
  background: var(--ps-color-border);
  overflow: hidden;
}

.ps-meter__bar {
  height: 100%;
  border-radius: var(--ps-radius-xs);
  background: var(--ps-color-accent);
}

.ps-status,
.ps-source-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.55rem;
  border: 1px solid var(--ps-color-border);
  border-radius: var(--ps-radius-xs);
  padding: 0.14rem 0.45rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  max-width: 100%;
  white-space: normal;
}

.ps-source-chip {
  background: var(--ps-color-panel);
  font-weight: 650;
}

.ps-status::before {
  content: "";
  flex: 0 0 auto;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: currentColor;
}

.ps-status--neutral {
  background: var(--ps-color-panel);
  color: var(--ps-color-muted);
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
  color: var(--ps-color-warning);
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
  min-width: 46rem;
  border-collapse: collapse;
  background: var(--ps-color-panel);
}

.ps-table th,
.ps-table td {
  border-bottom: 1px solid var(--ps-color-border);
  padding: 0.72rem 0.65rem;
  text-align: left;
  vertical-align: top;
}

.ps-table th {
  color: var(--ps-color-muted);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.ps-table caption {
  caption-side: top;
  padding: 0.2rem 0 0.7rem;
  text-align: left;
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
  font-weight: 800;
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
  color: #ffffff;
}

.ps-command--primary:hover {
  background: var(--ps-color-accent-strong);
  color: #ffffff;
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
  color: var(--ps-color-ink);
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
  color: var(--ps-color-ink);
  font-weight: 800;
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

.ps-field input:focus,
.ps-field select:focus,
.ps-field textarea:focus,
.ps-topbar__search:focus-within {
  border-color: var(--ps-color-focus);
  box-shadow: inset 0 0 0 1px var(--ps-color-focus);
  outline: 0;
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
    min-height: auto;
    position: static;
    width: auto;
    border-right: 0;
    border-bottom: 1px solid var(--ps-color-border);
  }

  .ps-main {
    grid-column: auto;
  }

  .ps-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ps-grid,
  .ps-score-grid,
  .ps-dashboard-grid,
  .ps-dashboard-secondary-grid,
  .ps-workflow-stage,
  .ps-connector-shell {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ps-route-hero__body,
  .ps-route-hero__summary-grid,
  .ps-route-hero__status-strip,
  .ps-route-tabs,
  .ps-stepper,
  .ps-form-grid {
    grid-template-columns: 1fr;
  }

  .ps-panel--wide {
    grid-column: span 2;
  }

  .ps-topbar {
    position: static;
  }

  .ps-topbar__search {
    width: 100%;
  }

  .ps-connector-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .ps-brand {
    min-height: auto;
    padding: 1rem 1.25rem;
  }

  .ps-nav {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.75rem;
  }

  .ps-nav__link {
    flex: 0 0 11rem;
    min-height: 2.55rem;
    border: 1px solid var(--ps-color-border);
    border-radius: var(--ps-radius-sm);
    background: var(--ps-color-panel);
  }

  .ps-nav__link[aria-current="page"] {
    border-color: var(--ps-color-accent);
  }

  .ps-nav__chevron {
    display: none;
  }

  .ps-sidebar__footer {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .ps-sidebar__footer .ps-command--primary {
    grid-column: 1 / -1;
  }

  .ps-sidebar__footer .ps-inline-form,
  .ps-sidebar__footer .ps-inline-form .ps-command {
    width: 100%;
  }

  .ps-topbar,
  .ps-section__header,
  .ps-next-action,
  .ps-trend-card__header,
  .ps-trend-empty,
  .ps-trend-stat-row,
  .ps-page-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .ps-content {
    padding: 0.75rem;
  }

  .ps-topbar__tabs,
  .ps-topbar__actions {
    width: 100%;
  }

  .ps-topbar__actions .ps-command,
  .ps-topbar__actions .ps-status,
  .ps-trend-toggle-row .ps-trend-toggle {
    flex: 1 1 10rem;
  }

  .ps-page-hero h1,
  .ps-connector-main h1 {
    font-size: 1.85rem;
  }

  .ps-connector-main {
    padding: 1.5rem;
  }

  .ps-grid,
  .ps-score-grid,
  .ps-nav,
  .ps-dashboard-grid,
  .ps-dashboard-secondary-grid,
  .ps-roadmap-grid,
  .ps-workflow-stage,
  .ps-connector-shell {
    grid-template-columns: 1fr;
  }

  .ps-connector-roadmap {
    border-right: 0;
    border-bottom: 1px solid var(--ps-color-border);
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
