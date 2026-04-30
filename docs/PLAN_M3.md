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

Implementation started on 2026-04-30.

Working assumptions:

- Use logical control IDs such as `nis2.access-control.mfa` as provider-neutral persisted references, not UUID-only database fields.
- Split severities into provider finding severity, which may be `informational`, and actionable severity for gaps/recommendations, which cannot be `informational`.
- Treat readiness plan due dates as date-only SLA targets, persisted as PostgreSQL `date` semantics.
- Add a persistence-ready compliance result repository port now, while deferring Prisma client generation, migrations, and the first Prisma adapter to PLAN_M4.

Implementation completed on 2026-04-30.

Implemented:

- Prisma control-reference fields now accept logical string IDs across compliance, catalog mapping, evidence, checklist template, risk acceptance, and provider recommendation records.
- Prisma now splits `FindingSeverity` from `ActionableSeverity`; provider findings can remain informational, while compliance gaps and recommendations cannot persist informational severity.
- Readiness plan item due dates now use `@db.Date`, matching the existing `YYYY-MM-DD` contract.
- Gap outputs now retain `findingIds` and `manualTaskIds` alongside human summaries, provider signal keys, and manual task labels.
- Structured recommendations and readiness plan items now carry source finding/manual task identity forward for future evidence and audit drilldown.
- Added a generic `ComplianceResultRepository` port plus `InMemoryComplianceResultRepository` covering control results, gaps, recommendations, readiness plans, and checklist items.
- The API compliance evaluation service now writes generated result sets through the repository port while preserving the existing stored-analysis path used by reports and dashboards.

Changed files:

- `code/packages/shared/src/index.ts`
- `code/packages/providers/core/src/resources.ts`
- `code/packages/compliance/core/src/types.ts`
- `code/packages/compliance/core/src/gaps.ts`
- `code/packages/compliance/core/src/readiness-plan.ts`
- `code/packages/compliance/core/src/results-repository.ts`
- `code/packages/compliance/core/src/index.ts`
- `code/packages/compliance/core/src/__tests__/compliance-gaps-recommendations-readiness-plan-checklist.spec.ts`
- `code/packages/recommendations/src/generator.ts`
- `code/packages/recommendations/src/recommendation.types.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/contracts/connector.ts`
- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/packages/database/src/__tests__/recommendations-reports-dashboards.spec.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/compliance/service.ts`
- `code/apps/api/src/compliance/validation.ts`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/PLAN_M3.md`
- `docs/PLAN_M4.md`

Validation results:

- `pnpm lint` passed via host `npx pnpm@10.33.2 lint`.
- `pnpm test -- --runInBand database schema compliance gaps recommendations readiness-plan` passed via host `npx pnpm@10.33.2 test -- --runInBand database schema compliance gaps recommendations readiness-plan` with 30 files / 100 tests passing.
- `git diff --check` passed.

Acceptance status:

- Accepted for PLAN_M3.

Gaps updated:

- GAP-020 updated to keep Prisma dependencies, generated client, migration, and adapter work open for PLAN_M4.
- GAP-022 updated for PLAN_M3 schema/contract alignment and repository-port completion; Prisma-backed persistence remains open under PLAN_M4/GAP-020.
- GAP-025 updated to record the shared actionable/finding severity extraction while keeping broader workspace import and shared type consolidation open.

Residual risk:

- The new repository port is in-memory only; no Prisma client, migration, or database adapter exists yet.
- Provider capability/module status is still not persisted as evaluator input, so Prompt 3 should preserve room for unavailable/missing-permission signal semantics.
- Shared type extraction is intentionally narrow; Prompt 4 still needs the workspace import and package-boundary pass.

## Handoff For Next Milestone

`docs/PLAN_M4.md` has been generated from the next active prompt in `docs/codex-prompts.md`: Prompt 3 / `PLAN_M4`: Prisma Migration, Generated Client, And Repository Adapter Slice.
