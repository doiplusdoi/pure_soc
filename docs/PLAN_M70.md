# M70 Plan: Selected Output Drift Coverage Expansion

## Summary

Expand selected schema drift coverage for already-modeled evidence/report/dashboard output surfaces so Prisma schema drift is caught by deterministic local checks.

Status: completed.
Created: 2026-05-03.
Started: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M69.md`
- `docs/threat-model.md`
- `code/scripts/check-schema-contract-drift.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/repositories/output-records.ts`
- `code/packages/database/src/repositories/evidence.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/tests/drift-checks.spec.ts`
- `code/package.json`
- `code/README.md`

## Goal

Narrow GAP-041 by expanding deterministic schema drift coverage to selected evidence/report/dashboard output surfaces that already exist in the Prisma schema and repository contracts.

## Scope

Expected implementation areas:

- Add selected field expectations in `code/scripts/check-schema-contract-drift.ts`, prioritizing `EvidenceLink`, `ReportExport`, and `DashboardWidget` if those Prisma models are present.
- Add or update deterministic drift coverage so `pnpm lint` fails if selected fields disappear, rename, or change type.
- Update GAP-041 and handoff docs to distinguish selected drift coverage from exhaustive schema coverage or live database smoke.
- Create `docs/PLAN_M71.md` from the next selected active prompt.

Expected files:

- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M70.md`
- `docs/PLAN_M71.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- M70 is a schema/contract guard slice only.
- No Prisma migration, generated client change, live database access, runtime repository rewrite, UI change, or external smoke run is expected.
- Coverage should remain selected and reviewable, not a broad attempt to cover every remaining Prisma model.

## Negative Constraints

- Do not change the Prisma schema or generate a migration unless the drift script proves a documented field expectation is wrong and the fix is explicitly a docs/test correction.
- Do not broaden drift coverage to every remaining model.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.
- Do not weaken M68/M69 artifact index behavior, evidence/report/dashboard runtime persistence tests, organization scoping, legal caveats, or no-live-call assertions.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- schema drift evidence reports dashboards output
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-041 for selected evidence/report/dashboard output drift coverage.
- Preserve GAP-031, GAP-042, and GAP-044.

## Acceptance Criteria

- Selected evidence/report/dashboard output field expectations are covered by deterministic drift checks.
- `pnpm lint` includes the new checks and fails on selected schema drift.
- No migrations, live database calls, external integrations, provider writes, UI rewrites, or legal-copy changes are introduced.
- Prompt and gap handoff docs are updated and `docs/PLAN_M71.md` is created.

## Completion Log

Started 2026-05-04.

Completed 2026-05-04.

Implementation results:

- Added selected Prisma drift expectations for `EvidenceLink`, `ReportExport`, and `DashboardWidget`.
- Raised the checked-in drift coverage to 32 selected models and 464 fields.
- Added focused drift-test coverage proving those selected output metadata models are included in the drift map.
- Added database-schema assertions for the selected evidence-link, report-export, and dashboard-widget fields.
- Updated documentation to state that the drift map remains selected coverage, not exhaustive Prisma schema validation.
- Staged M71 for the generated Romania import report drift posture decision.

Changed files:

- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M70.md`
- `docs/PLAN_M71.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Validation:

- Local sandbox command execution could not run `npm` or `pnpm`, so validation used host equivalents through `flatpak-spawn --host sh -lc 'cd /mnt/solodata/SoloCode/pure_soc/code && npm run ...'`.
- `npm run drift:schema` passed: Prisma schema/contract drift check passed with 32 models and 464 fields.
- `npm run lint` passed: layout, Prisma schema drift, Romania generated regulatory drift, and TypeScript.
- `npm run test -- schema drift evidence reports dashboards output` passed: 13 files, 62 tests.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M70: selected evidence-link, report-export, and dashboard-widget output metadata fields are now covered by deterministic drift checks that run in `pnpm lint`/`npm run lint`.
- No Prisma schema changes, migrations, generated client changes, live database access, runtime repository rewrites, UI changes, external smoke calls, external services, or provider writes were introduced.

Gaps updated:

- GAP-041 narrowed for selected evidence-link/report-export/dashboard-widget output metadata drift coverage.
- GAP-031, GAP-042, and GAP-044 remain unchanged.

Prompt handoff:

- `docs/codex-prompts.md` updated to retire M70 and stage M71.
- `docs/PLAN_M71.md` created as the next active milestone stub.

Residual risk:

- Drift coverage is still deliberately selected rather than exhaustive. Checklist/risk-acceptance tables, Romania onboarding/classification persistence tables, billing customers, regulatory source/source-map/decision tables, and the generated Romania import report artifact remain outside the current drift map unless a future prompt narrows them.
