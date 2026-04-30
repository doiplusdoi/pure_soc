# M3 Plan: Schema And Contract Alignment For Persistable Results

## Summary

Implement Prompt 2 from `docs/codex-prompts.md`: align TypeScript contracts and Prisma schema so compliance results, gaps, recommendations, readiness plans, and checklist outputs can be persisted without ID, severity, or date-semantic surprises.

## Source Inputs

- `docs/puresoc_vision.md` sections 14, 15, 17, 18, 21, 22
- `docs/master-plan.md` sections 7, 13, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/claude_rec.md` sections REC-001, REC-002, REC-007, REC-010, REC-021
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- `docs/adr/ADR-008-evidence-storage-metadata-and-export-model.md`
- `docs/adr/ADR-012-dashboard-aggregation-and-report-data-contracts.md`

## Locked Decisions

- Keep logical control IDs provider-neutral and source-linked.
- Do not introduce Microsoft-specific identifiers into generic compliance schema.
- Do not remove legal source references from outputs.
- Keep in-memory implementations available until Prisma adapters are implemented.
- Do not make legal certification claims.

## Current State

PLAN_M2 fixed compliance correctness, input validation, and audit coverage. Remaining persistence blockers are tracked primarily in GAP-022 and GAP-025:

- Control catalog IDs are logical strings such as `nis2.access-control.mfa`, while several Prisma columns are still typed as UUIDs.
- Severity contracts differ between provider findings, compliance gaps, recommendations, and Prisma enums.
- Gap outputs still carry human strings for findings/tasks but not stable provider finding/manual task IDs needed for evidence and audit drilldown.
- Readiness plan due dates are date-like strings while schema storage uses timestamp semantics.
- Evaluation outputs do not yet have a persistence-ready repository port.

## Scope

In scope:

- Align schema/control ID fields for logical control IDs.
- Choose and document severity semantics, or split finding severity from actionable severity.
- Preserve provider finding IDs and manual task IDs in gap/recommendation/readiness-plan outputs where downstream links need them.
- Align readiness-plan due-date semantics with schema storage.
- Add a `ComplianceResultRepository` contract or equivalent persistence-ready port.
- Add/adjust tests for schema contracts, severity round trips, gap identity preservation, due dates, and repository shape.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M4.md` after completion.

Out of scope:

- Prisma generated client and migrations, unless strictly needed for contract tests.
- Broad repository adapter rewrites.
- Live provider calls, Stripe, OIDC, or evidence storage adapters.
- Provider write/remediation actions.

## Expected Files And Ownership

- `docs/PLAN_M3.md`
- `docs/PLAN_M4.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/contracts/*.ts`
- `code/packages/database/src/__tests__/*`
- `code/packages/compliance/core/src/types.ts`
- `code/packages/compliance/core/src/gaps.ts`
- `code/packages/compliance/core/src/readiness-plan.ts`
- `code/packages/recommendations/src/recommendation.types.ts`
- `code/packages/providers/core/src/resources.ts` if severity contracts are touched
- `code/packages/shared/src/index.ts` if shared severity/source-reference types are extracted
- `docs/adr/*` only if a new decision record is needed

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand database schema compliance gaps recommendations readiness-plan
```

Also run from the repository root:

```sh
git diff --check
```

## Acceptance Criteria

- Schema contract test proves control ID fields accept the implemented logical ID strategy.
- Severity round-trip tests prevent unsupported `informational` recommendation/gap records if not supported.
- Gap outputs retain finding/task identity alongside human summaries.
- Readiness plan due-date test matches schema semantics.
- Repository contract test covers write/read shape using in-memory implementation.
- GAP-022 and GAP-025 are updated.
- GAP-020 is updated if Prisma client/migration work is intentionally deferred to M4.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M4.md` exists as the next incremental plan stub.

## Completion Log

Pending implementation.

## Handoff For Next Milestone

After M3 completes, `docs/PLAN_M4.md` should be generated from the next active prompt in `docs/codex-prompts.md`, currently Prompt 3 / `PLAN_M4`: Prisma Migration, Generated Client, And Repository Adapter Slice.
