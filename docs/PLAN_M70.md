# M70 Plan: Selected Output Drift Coverage Expansion

## Summary

Expand selected schema drift coverage for already-modeled evidence/report/dashboard output surfaces so Prisma schema drift is caught by deterministic local checks.

Status: staged.
Created: 2026-05-03.

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
- `code/packages/database/src/repositories/output.ts`
- `code/packages/database/src/repositories/evidence.ts`
- `code/packages/database/src/__tests__/schema-contract.test.ts`
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
- `code/packages/database/src/__tests__/schema-contract.test.ts`
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

Not started.
