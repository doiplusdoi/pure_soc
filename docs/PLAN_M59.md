# M59 Plan: Served Romania Onboarding Route Baseline

## Summary

Add a small served Romania onboarding route that consumes existing Romania country-pack/onboarding contracts and M58 message-catalog behavior without introducing a full frontend framework or live integrations.

Status: completed.
Created: 2026-05-03.
Started: 2026-05-03.
Completed: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M58.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/onboarding.schema.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts`
- `code/package.json`
- `code/README.md`

## Goal

Give the served web runtime one Romania-specific customer-shaped screen that is source-aware, caveated, and locale-ready while preserving the current lightweight `node:http` runtime.

## Scope

Expected implementation areas:

- Add a served `GET /onboarding/romania` or equivalent Romania onboarding route in `apps/web`.
- Render a compact Romania onboarding/readiness view from existing country-pack schema/source-map metadata and M58 catalog/caveat metadata.
- Link to the route from the operational console without changing the dashboard layout or creating a broad frontend/i18n framework.
- Add tests proving the route renders source/caveat/fallback metadata, does not claim legal approval or DNSC submission, and remains compatible with `@ui-smoke`.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files and ownership:

- `code/apps/web/src/server.ts`: add the served `GET /onboarding/romania` route only.
- `code/apps/web/src/operational-console.ts`: add the compact Romania route renderer and operational-console navigation link.
- `code/apps/web/src/app-data.ts`: add any small route model helpers backed by existing contracts.
- `code/apps/web/src/index.ts`: export any new renderer/helper needed by tests.
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`: cover the route, metadata, caveats, fallback, and forbidden claims.
- `code/apps/web/package.json`: declare any new workspace dependency needed for country-pack contracts.
- `code/README.md`: document the served Romania route.
- `docs/PLAN.md`, `docs/PLAN_M59.md`, `docs/PLAN_M60.md`, `docs/codex-prompts.md`, `docs/implementation-gaps.md`, `docs/LEARNINGS.md`: update handoff and gap status.

Locked assumptions:

- This milestone is a served-runtime route slice, not a full Next.js/React migration.
- Romania legal-caveat and regulatory notification copy remain English fallback until product/legal approval exists.
- No live external services or external-smoke commands should run.
- The served route may render demo/runtime contract data from in-repo Romania onboarding and notification-draft helpers; it must not fetch DNSC, Microsoft, Stripe, object storage, or public regulatory URLs.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals; use country-pack/onboarding data contracts.
- Do not introduce a broad frontend framework, router migration, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ro onboarding i18n
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-031 for a served Romania onboarding route and operational-console navigation.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M59 must not run external smoke commands.

## Acceptance Criteria

- A served Romania onboarding route renders locally from in-repo contracts.
- Source, caveat, fallback, unsupported-state, and no-DNSC-submission signals are visible.
- Existing local web/API `@ui-smoke` still passes.
- Prompt and gap handoff docs are updated and `docs/PLAN_M60.md` is created.

## Completion Log

Started 2026-05-03 and completed 2026-05-03.

Implementation results:

- Added a served `GET /onboarding/romania` route to the lightweight `apps/web` server.
- Added a compact Romania onboarding/readiness route model backed by `@puresoc/country-pack-ro` onboarding schema, classification, notification draft, source-map, and M58 message-catalog fallback contracts.
- Rendered source version, services workbook source range, classification, step coverage, notification draft metadata, source-map samples, legal caveat, fallback metadata, unsupported-state signals, and explicit no-DNSC-submission status.
- Linked the operational console navigation to `/onboarding/romania?locale=ro-RO`.
- Added renderer and served-route tests proving source/caveat/fallback/no-DNSC metadata and rejecting legal/certification claims.
- Updated package metadata/lockfile for the web package dependency on `@puresoc/country-pack-ro`.

Changed files:

- `code/README.md`
- `code/apps/web/package.json`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/index.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/pnpm-lock.yaml`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M59.md`
- `docs/PLAN_M60.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Passed: `flatpak-spawn --host npm run lint`.
- Passed after adding the web workspace dependency and making the services source-map range visible on the route: `flatpak-spawn --host npm run test -- web ro onboarding i18n` (25 files, 110 tests).
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @ui-smoke`.
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.
- Used host npm equivalents because sandbox-local `pnpm` and `node` are unavailable in this environment. The local workspace `node_modules` symlink for `@puresoc/country-pack-ro` was refreshed manually for validation because host `pnpm` is not installed.

Acceptance status:

- Accepted. The served route renders locally from in-repo Romania country-pack contracts, shows source/caveat/fallback/unsupported/no-submission metadata, preserves the existing `@ui-smoke` path, and does not call external services or provider write paths.

Gaps updated:

- GAP-031 narrowed for a served Romania onboarding/readiness route and operational-console navigation link.
- GAP-042 preserved for product/legal-approved Romanian legal/regulatory copy.
- GAP-044 preserved; no external-smoke commands or live external calls were run.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 58 / PLAN_M59 complete and stages Prompt 59 / PLAN_M60 for served Romania route UI smoke coverage.
- `docs/PLAN_M60.md` created.

Residual risk:

- The route is a compact server-rendered readiness view, not a persistent Romania onboarding wizard or full React/Next.js runtime.
- The route has unit and served-route tests, and remains compatible with `@ui-smoke`; route-specific `@ui-smoke` viewport snapshots and browser traversal are staged for M60.
- Romanian legal caveat and regulatory/workbook labels still fall back to English/source-mapped copy until product/legal-approved Romanian text exists.
