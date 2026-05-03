# M59 Plan: Served Romania Onboarding Route Baseline

## Summary

Add a small served Romania onboarding route that consumes existing Romania country-pack/onboarding contracts and M58 message-catalog behavior without introducing a full frontend framework or live integrations.

Status: staged for implementation after M58.
Created: 2026-05-03.

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

Locked assumptions:

- This milestone is a served-runtime route slice, not a full Next.js/React migration.
- Romania legal-caveat and regulatory notification copy remain English fallback until product/legal approval exists.
- No live external services or external-smoke commands should run.

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

Not started.

Implementation results:

- Pending.

Changed files:

- Pending.

Validation:

- Pending.

Acceptance status:

- Pending.

Gaps updated:

- Pending.

Prompt handoff:

- Pending. M59 implementation must create `docs/PLAN_M60.md` before final response.

Residual risk:

- Pending.
