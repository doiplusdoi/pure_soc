# M10 Plan: Operational UI And Design System

## Summary

Implement Prompt 9 from `docs/codex-prompts.md`: choose and document the PureSOC design-system direction, then build or polish the operational console UI for the main compliance, connector, evidence, report, dashboard, and remediation approval surfaces.

## Source Inputs

- `docs/puresoc_vision.md` sections 13, 24, 25
- `docs/master-plan.md` sections 7, 12, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/claude_rec.md` lower-priority UI/readme notes if relevant
- Skills: `impeccable`, `frontend-design-review`, and `playwright-interactive` where browser verification is needed

## Locked Decisions

- Build the operational app, not a marketing landing page.
- Preserve source, confidence, legal caveat, blast-radius, and approval-state signals.
- Do not show legal certification claims.
- Do not create risky remediation controls without visible blast radius and approval state.
- Do not make UI depend on live provider calls when stored analysis data exists.
- Do not put Romania-specific conditionals in EU baseline UI components.

## Current State

The backend now has stored analysis/report/evidence/dashboard surfaces and M9 action approval metadata. The frontend design system remains undecided, and GAP-009 is still open.

## Scope

In scope:

- Design-system decision and reusable UI primitives.
- App shell navigation for the operational console.
- Dashboard from stored aggregate data.
- EU/country/Romania onboarding status surfaces.
- Microsoft connection health surface.
- Gap report and recommendation backlog surfaces.
- Evidence/report export surfaces with legal caveat and source indicators.
- Remediation approval affordances using the M9 model.
- Responsive desktop and mobile layouts.
- Keyboard/focus states for critical flows.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M11.md` after completion.

Out of scope:

- Marketing landing page as the primary app screen.
- Live provider API calls from UI views that can use stored data.
- Legal certification wording.
- Risky remediation execution controls.

## Expected Files And Ownership

- `docs/PLAN_M10.md`
- `docs/PLAN_M11.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/apps/web/**`
- `code/packages/ui/**`
- `code/packages/dashboards/**` shared types if needed
- `code/packages/reports/**` shared types if needed
- `code/README.md` if user-facing app state changes
- `docs/adr/*` if a design-system ADR is created

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand web dashboard reports
pnpm test:e2e -- --grep "@ui-smoke"
```

Use browser verification where UI behavior or layout is changed, and record any unavailable browser/e2e environment as a gap.

## Acceptance Criteria

- Design-system decision is documented.
- GAP-009 is updated.
- App shell and operational surfaces render from stored data/contracts.
- Evidence/report screens show legal caveat and source indicators.
- Remediation approval affordances reflect M9 approval/preflight/snapshot/verification state without enabling live writes.
- Desktop and mobile layouts are checked for text overlap.
- Keyboard/focus behavior is checked for login, dashboard, gaps, evidence/report export, and approval flows.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M11.md` exists as the next incremental plan stub.

## Completion Log

Completed on 2026-04-30.

Actual changes:

- Added ADR-014 for the PureSOC operational UI design-system decision.
- Replaced the placeholder `@puresoc/ui` package with OKLCH design tokens, semantic CSS, status/source/meter/table/button/legal-caveat primitives, and primitive tests.
- Replaced the placeholder `apps/web` export with a contract-backed operational console renderer, demo stored-analysis model, login form surface, dashboard/onboarding/provider/gap/recommendation/evidence/report/approval sections, and UI smoke tests.
- Added `pnpm test:e2e -- --grep "@ui-smoke"` support through a static Vitest smoke runner.
- Updated `code/README.md`, `docs/implementation-gaps.md`, `docs/codex-prompts.md`, and created `docs/PLAN_M11.md`.

Validation results:

```sh
pnpm lint
pnpm test -- --runInBand web dashboard reports
pnpm test:e2e -- --grep "@ui-smoke"
```

Acceptance status:

- Design-system decision is documented in ADR-014.
- GAP-009 is resolved for the M10 design-system decision.
- Dashboard, report, evidence, source, legal-caveat, focus, responsive CSS, and approval-state semantics are covered by unit/static smoke tests.
- Remediation UI shows preflight, approval, snapshot, blast radius, and disabled queue state without exposing a provider write/apply control.
- Browser-grade Playwright screenshots were not added because the repo still lacks a served web runtime and Playwright configuration; this is tracked in GAP-031.

Residual risk:

- The UI is a semantic static renderer rather than a Next.js route tree.
- Desktop/mobile no-overlap verification is static/heuristic until Playwright and a served runtime are added.

## Handoff From M9

M9 completed the backend action lifecycle and approval model. M10 can display approval/preflight/snapshot/verification states, but must not add provider write execution controls.
