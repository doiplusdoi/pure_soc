# M22 Plan: Schema And Generated Data Drift Detection

## Summary

Implement Prompt 21 from `docs/codex-prompts.md`: add deterministic drift checks for Prisma schema versus TypeScript contract expectations, and for generated Romania regulatory seed/source-map outputs.

Status: completed.
Created: 2026-05-01.
Started: 2026-05-01.
Completed: 2026-05-01.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/claude_rec2.md`
- `docs/PLAN_M21.md`
- `docs/adr/ADR-005-regulatory-seed-and-source-map-format.md`

## Goal

Prevent two recurring implementation drifts from landing silently:

- persisted TypeScript contract fields that do not line up with Prisma model fields,
- checked-in generated Romania seed/source-map files that no longer match importer output.

## Scope

Expected implementation areas:

- Static/schema-backed drift expectations for high-risk persisted surfaces.
- Fast, deterministic generated-data drift check for Romania workbook outputs.
- Script or test coverage for positive and negative drift cases.
- Optional `lint` wiring if the checks remain fast and local.
- Docs and gap updates explaining any intentionally excluded model/artifact coverage.

Locked assumptions:

- Drift checks must read local files only; they must not require a live database, generated Prisma client runtime, provider credentials, or public URL access.
- Schema/contract drift coverage will start with explicit field maps for the highest-risk persisted models named in Prompt 21 rather than trying to infer every TypeScript shape automatically.
- Romania generated-output drift should compare importer output with checked-in generated files through canonical JSON serialization; any mismatch means importer logic or generated files need a deliberate regeneration path.
- If the checks are fast enough under the host-node command path, wire them into `lint` so the recurring bug class is caught before tests.

Expected files:

- `code/package.json`
- `code/scripts/check-layout.mjs` or new focused scripts under `code/scripts/`
- `code/packages/database/src/**` or `code/tests/**`
- `code/apps/regulatory-importer/src/ro/**` and/or `code/scripts/**`
- `code/data/regulatory/countries/ro/ro-nis2.seed.generated.json`
- `code/data/regulatory/countries/ro/ro-nis2-source-map.generated.json`
- `README.md`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M22.md`
- `docs/PLAN_M23.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not introduce a live database requirement for drift checks.
- Do not fetch public regulatory URLs or rely on live network access.
- Do not manually edit generated Romania seed/source-map outputs to make drift pass.
- Do not add provider write/remediation execution.
- Do not add Romania-specific logic outside Romania country-pack/importer surfaces.
- Do not add Microsoft-specific logic outside Microsoft provider/config surfaces.
- Do not hardcode regulatory facts in UI conditionals.
- Do not make legal certification claims.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- database schema drift regulatory-import ro
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow schema/TypeScript drift risk from REC-110.
- Narrow generated Romania regulatory output drift risk from REC-113.
- Preserve runtime/browser/live integration gaps unless this milestone directly validates them.
- Create or update gaps for any intentionally excluded model or generated artifact coverage.

## Acceptance Criteria

- Drift checks fail on at least one intentional mismatch fixture or test case.
- Drift checks pass against the current Prisma schema and generated Romania outputs.
- Any lint integration is fast, local, and deterministic.
- No live database, live provider, public regulatory URL, or provider-write path is required.

## Completion Log

Completed 2026-05-01.

Implementation results:

- Added `code/scripts/check-schema-contract-drift.ts`, a deterministic static Prisma parser and schema/contract drift checker.
- The schema drift map covers 19 high-risk persisted models and 308 fields across audit logs, provider resources/findings/recommendations, compliance outputs, evidence, billing, regulatory review, remediation action runs, generated reports, and dashboard snapshots.
- Added `code/scripts/check-generated-regulatory-drift.ts`, which regenerates Romania NIS2 seed/source-map artifacts in memory from the checked-in workbook and compares canonical JSON with checked-in generated files.
- Added `code/tests/drift-checks.spec.ts` with real checked-in pass cases plus intentional mismatch fixtures for schema drift and generated-data drift.
- Wired the checks into `pnpm lint` and added named `drift`, `drift:schema`, and `drift:regulatory` scripts.
- No generated Romania seed/source-map files needed changes; the checked-in artifacts already matched importer output.

Changed files:

- `README.md`
- `code/README.md`
- `code/package.json`
- `code/scripts/check-generated-regulatory-drift.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `docs/PLAN.md`
- `docs/PLAN_M22.md`
- `docs/PLAN_M23.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available. Validation used host-node equivalents through `flatpak-spawn --host`.
- `npm run drift:schema` passed: 19 models and 308 fields checked.
- `npm run drift:regulatory` passed: 2 Romania generated artifacts checked.
- `npm run test -- database schema drift regulatory-import ro` passed: 20 test files, 84 tests.
- Full `npm run test` passed: 59 test files, 223 tests.
- `npm run lint` passed and now runs layout, schema drift, generated regulatory drift, and TypeScript checks.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M22. The implementation adds deterministic local drift checks for the two targeted bug classes, includes negative mismatch coverage, keeps checks free of live database/network/provider dependencies, and wires them into lint.

Gaps updated:

- GAP-041 created to track intentionally excluded drift coverage: lower-risk or less mature persisted models, notification draft surfaces, and `ro-nis2-import-report.generated.json`.
- GAP-030 remains open; no provider write/remediation execution was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 21 / PLAN_M22 complete and stages Prompt 22 / PLAN_M23.
- `docs/PLAN_M23.md` created for i18n And Country-Pack Notification Model Decision.

Residual risk:

- The schema drift checker is intentionally explicit and selected, not exhaustive. It does not yet cover every Prisma model or every TypeScript interface in the repository.
- The Romania generated-data checker covers seed and source-map artifacts only. The import report remains diagnostic and is tracked in GAP-041.
- Drift checks are static/local and do not replace live PostgreSQL migration/apply, runtime adapter, or legal review workflows.
