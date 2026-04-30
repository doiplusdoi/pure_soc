# M4 Plan: Prisma Migration, Generated Client, And Repository Adapter Slice

## Summary

Implement Prompt 3 from `docs/codex-prompts.md`: wire Prisma dependencies, generated client workflow, initial migration, and one narrow Prisma-backed repository adapter so the in-memory runtime starts converging with the database contract.

## Source Inputs

- `docs/puresoc_vision.md` sections 7, 21, 22, 27, 28
- `docs/master-plan.md` sections 7, 13, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/claude_rec.md` sections REC-001, REC-002
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- Prompt 2 / PLAN_M3 output and changed files

## Locked Decisions

- Keep logical control IDs and `ActionableSeverity` semantics introduced by PLAN_M3.
- Keep in-memory repositories available for fast unit and API tests.
- Keep organization-scoped query filters on every Prisma-backed tenant read/write.
- Do not add live provider, Stripe, OIDC, or remediation behavior in this milestone.
- Do not log provider credentials, auth tokens, reset tokens, or evidence URLs.

## Current State

PLAN_M3 aligned schema and TypeScript contracts for persistable compliance outputs:

- Control references are logical strings instead of UUID-only fields.
- Gaps and recommendations use actionable severity, while provider findings can remain informational.
- Readiness plan due dates are date-only.
- Gaps, recommendations, and readiness plan items preserve finding/manual task IDs.
- A `ComplianceResultRepository` port and in-memory implementation exist.

Remaining persistence blockers are tracked in GAP-020 and GAP-022:

- No Prisma CLI or `@prisma/client` dependency is installed.
- No generated client or initial migration exists.
- No Prisma-backed repository adapter persists compliance evaluation outputs yet.

## Scope

In scope:

- Add Prisma CLI/client dependencies and package scripts for validate/generate/migrate status where appropriate.
- Generate an initial migration from the current PLAN_M3-aligned schema.
- Implement one Prisma-backed repository slice, preferably compliance evaluation output persistence.
- Keep the in-memory repository path available for unit tests and API tests.
- Add repository integration tests that can run deterministically in the project test environment.
- Document how to run Prisma validation/generation from `code/`.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M5.md` after completion.

Out of scope:

- Replacing every in-memory API repository.
- Live provider credentials or Stripe credentials.
- Provider write/remediation actions.
- Broad schema redesign beyond adapter needs.

## Expected Files And Ownership

- `docs/PLAN_M4.md`
- `docs/PLAN_M5.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/package.json`
- `code/pnpm-lock.yaml`
- `code/packages/database/package.json`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/*`
- `code/packages/database/src/client.ts`
- `code/packages/database/src/repositories/*`
- `code/packages/database/src/__tests__/*`
- `code/apps/api/src/auth/services.ts` only for dependency injection if needed
- `code/apps/api/src/compliance/service.ts` or output-record repository files if compliance persistence is selected
- `code/infra/compose/docker-compose*.yml` only if test database wiring is needed

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand database prisma repository compliance
pnpm exec prisma validate --schema packages/database/prisma/schema.prisma
```

Also run from the repository root:

```sh
git diff --check
```

## Acceptance Criteria

- Prisma schema validates.
- Prisma client generation works.
- Repository integration test rejects cross-organization reads.
- Repository integration test persists and reloads the selected slice.
- Existing in-memory API tests still pass.
- GAP-020 is updated.
- GAP-022 is updated if compliance outputs become persistable through the selected adapter.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M5.md` exists as the next incremental plan stub.

## Completion Log

Implementation started on 2026-04-30.

Working assumptions:

- Use a generated Prisma client from the existing PLAN_M3-aligned schema without broad schema redesign.
- Keep compliance output persistence as the first adapter slice because reports, dashboards, evidence, and future action runs all depend on stored analysis records.
- Prefer deterministic repository tests that do not require a developer to provision live provider, Stripe, or Microsoft credentials.
- Preserve the existing in-memory repository for fast unit/API coverage and add the Prisma adapter behind the same `ComplianceResultRepository` contract.
- If the local environment cannot provide a real PostgreSQL test database, keep Prisma schema validation and client generation executable and make the repository adapter testable through a mocked Prisma delegate boundary rather than silently skipping scope checks.

Implementation completed on 2026-04-30.

Implemented:

- Added pinned Prisma 6.19.3 CLI/client dependencies. Prisma 7 was tested first but rejected for this milestone because it no longer supports `url` in schema datasource blocks and would require unrelated config migration.
- Added workspace and database-package scripts for Prisma validate, generate, and migrate status.
- Generated the initial migration SQL from the current schema under `code/packages/database/prisma/migrations/20260430000000_initial/migration.sql`.
- Added a Prisma client factory boundary in `packages/database/src/client.ts`.
- Added `ProviderRecommendation.assessmentId` so generated compliance recommendations can be replaced/read by assessment scope.
- Added `ComplianceResultSnapshot` to preserve exact `ComplianceResultRepository` contract reloads while granular tables become available for future queries.
- Implemented `PrismaComplianceResultRepository`, which writes granular control results, gaps, recommendations, readiness plans, and readiness-plan items in an organization-scoped transaction, and reloads exact result sets from snapshots.
- Added deterministic repository tests that verify persistence/reload behavior, cross-organization reads returning `null`, and organization-scoped replacement deletes.
- Documented Prisma commands in `code/README.md`.

Changed files:

- `code/README.md`
- `code/.env.example`
- `code/package.json`
- `code/pnpm-lock.yaml`
- `code/packages/database/package.json`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260430000000_initial/migration.sql`
- `code/packages/database/src/client.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/contracts/schema-groups.ts`
- `code/packages/database/src/repositories/compliance-results.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/packages/database/src/__tests__/prisma-compliance-results.repository.spec.ts`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/PLAN_M4.md`
- `docs/PLAN_M5.md`

Validation results:

- `pnpm lint` passed via host `npx pnpm@10.33.2 lint`.
- `pnpm test -- --runInBand database prisma repository compliance` passed via host `npx pnpm@10.33.2 test -- --runInBand database prisma repository compliance` with 31 files / 103 tests passing.
- `pnpm exec prisma validate --schema packages/database/prisma/schema.prisma` passed with `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc`.
- `pnpm exec prisma generate --schema packages/database/prisma/schema.prisma` passed with `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc`.
- `git diff --check` passed.

Acceptance status:

- Accepted for PLAN_M4.

Gaps updated:

- GAP-020 resolved for Prisma dependency, validation/generation, initial migration, and first adapter workflow.
- GAP-022 resolved for the first Prisma-backed compliance-result persistence slice.
- GAP-026 opened for a future live PostgreSQL migration/apply smoke test.

Residual risk:

- The new adapter is tested through a deterministic fake Prisma delegate, not a live PostgreSQL database; GAP-026 tracks the live migration/apply smoke.
- API service construction still defaults to in-memory repositories until runtime database configuration is intentionally wired.
- `ComplianceResultSnapshot` preserves exact domain contracts while granular rows use database UUIDs; future evidence/action links should choose the granular UUID rows deliberately.

## Handoff For Next Milestone

`docs/PLAN_M5.md` has been generated from the next active prompt in `docs/codex-prompts.md`: Prompt 4 / `PLAN_M5`: Workspace Import Policy And Shared Type Boundaries.
