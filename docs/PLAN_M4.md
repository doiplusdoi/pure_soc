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

Pending implementation.

## Handoff For Next Milestone

After M4 completes, `docs/PLAN_M5.md` should be generated from the next active prompt in `docs/codex-prompts.md`, currently Prompt 4 / `PLAN_M5`: Workspace Import Policy And Shared Type Boundaries.
