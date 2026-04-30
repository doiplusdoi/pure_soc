# ADR-014: Operational UI Design System

Status: accepted
Date: 2026-04-30

## Context

PureSOC needs a usable operational console for compliance work: customer metadata, onboarding state, provider health, gaps, recommendations, evidence, reports, dashboards, and approval workflows. The current web and UI packages were placeholders, while the backend already exposes stored dashboard, report, evidence, and remediation-action contracts.

The UI must feel like a compliance operations tool, not a marketing site. It must preserve source, confidence, legal caveat, country-pack uncertainty, and approval-state signals. It must not claim legal certification or fetch live provider data when stored analysis records exist.

## Decision

Adopt the PureSOC operational design system as a restrained, contract-backed product UI layer:

- Use `@puresoc/ui` for semantic design tokens, status primitives, meters, source chips, legal-caveat blocks, command buttons, and tables.
- Use OKLCH CSS variables with tinted neutrals, restrained teal action color, and explicit success/warning/danger/critical roles.
- Use system UI typography, fixed rem sizing, 8px-or-less radii, visible focus states, and dense but calm spacing.
- Use semantic HTML generated from stored contracts in `apps/web` until the full Next.js runtime is intentionally wired.
- Build dashboards from `DashboardSnapshotContract`, reports from `InternalReadinessReport`, and approval affordances from the M9 `ActionRun` model.
- Keep the primary screen an authenticated operational console. Do not add a marketing landing page as the first app surface.

## Consequences

- The design-system direction is now selected without adding a large component dependency before the web runtime exists.
- UI tests can assert legal caveats, source indicators, focus affordances, responsive CSS, and action safety states against deterministic stored data.
- Future React/Next.js components should preserve the tokens and primitive semantics from `@puresoc/ui` rather than inventing a separate visual language.
- Browser-grade Playwright screenshot coverage remains a runtime-hardening task because this milestone does not add Playwright or a served Next.js app.
