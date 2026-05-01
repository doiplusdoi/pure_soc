# M22 Plan: Schema And Generated Data Drift Detection

## Summary

Implement Prompt 21 from `docs/codex-prompts.md`: add deterministic drift checks for Prisma schema versus TypeScript contract expectations, and for generated Romania regulatory seed/source-map outputs.

Status: staged for implementation after M21.
Created: 2026-05-01.

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

- Pending. M22 implementation must create `docs/PLAN_M23.md` before final response.

Residual risk:

- Pending.
