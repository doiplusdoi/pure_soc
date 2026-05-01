# M26 Plan: Stored Output Runtime Persistence Adapter Slice

## Summary

Implement Prompt 25 from `docs/codex-prompts.md`: move stored analysis, generated report records, and dashboard snapshots behind an explicit output repository boundary with memory and Prisma adapters selected by `PURESOC_PERSISTENCE_MODE`.

Status: completed.
Created: 2026-05-01.
Started: 2026-05-02.
Completed: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M25.md`
- `docs/adr/ADR-007-report-renderer-strategy.md`
- `docs/adr/ADR-008-evidence-storage-metadata-and-export-model.md`
- `docs/adr/ADR-012-dashboard-aggregation-and-report-data-contracts.md`
- `code/apps/api/src/output-records.ts`
- `code/apps/api/src/reports/**`
- `code/apps/api/src/dashboards/**`
- `code/apps/api/src/compliance/service.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/server.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/contracts/**`
- `code/packages/database/src/repositories/**`
- `code/packages/reports/src/**`
- `code/packages/dashboards/src/**`
- `code/apps/api/src/__tests__/**`

## Goal

Make stored output metadata persist through the runtime repository set in memory and Prisma modes without changing report/dashboard semantics or requiring live PostgreSQL.

## Scope

Expected implementation areas:

- Output repository contract for stored analyses, generated reports, and dashboard snapshots.
- In-memory adapter preserving the current fast test behavior.
- Prisma adapter boundary using existing output/report/dashboard schema fields and deterministic fake delegates.
- `createApiServices()` runtime selection and persistence-context reporting updates.
- Compliance, report, and dashboard services updated to use the output repository boundary for stored output records.
- Focused repository/API/runtime tests.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- Evidence generated-report artifacts already have their own persistence path; M26 should not redesign evidence storage.
- Report builders and dashboard aggregation stay behavior-compatible.
- Live PostgreSQL migration/apply smoke remains out of scope.

Expected files:

- `code/apps/api/src/output-records.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/compliance/service.ts`
- `code/apps/api/src/reports/**`
- `code/apps/api/src/dashboards/**`
- `code/apps/api/src/__tests__/**`
- `code/packages/database/src/contracts/**`
- `code/packages/database/src/repositories/**`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/__tests__/**`
- `code/tests/**`
- `docs/PLAN.md`
- `docs/PLAN_M26.md`
- `docs/PLAN_M27.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/README.md`

## Negative Constraints

- Do not add provider write/remediation execution.
- Do not add Romania-specific logic outside Romania country-pack/importer/API compatibility surfaces.
- Do not add Microsoft-specific logic outside Microsoft provider/config surfaces.
- Do not hardcode regulatory facts in UI conditionals.
- Do not make legal certification claims.
- Do not migrate live data or require a live PostgreSQL instance.
- Do not run live Microsoft Graph, Stripe, OIDC, MinIO/S3, public regulatory URL, KMS, or provider-write smoke tests.
- Do not rewrite report builders, dashboard aggregation semantics, or legal caveat wording unless a failing test proves a narrow persistence compatibility adjustment is required.
- Do not expose internal evidence `storageUri` values in API responses.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- outputs reports dashboards database prisma persistence api
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-036 for stored analysis/report/dashboard runtime persistence in Prisma mode.
- Narrow GAP-041 if output runtime persistence semantics receive deterministic API/repository coverage.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve browser/live integration gaps unless M26 directly validates them.

## Acceptance Criteria

- Stored analyses, generated report records, and dashboard snapshots are accessed through an output repository boundary.
- Memory mode remains deterministic for existing API tests.
- Prisma mode selects the new output adapter and runtime persistence reporting is honest.
- Repository tests prove organization-scoped reads and no cross-org leakage.
- Existing report/dashboard API behavior remains compatible.

## Completion Log

Started and completed 2026-05-02.

Implementation results:

- Added `OutputRecordRepository` with in-memory and Prisma adapters for stored analysis records, generated report metadata, and dashboard snapshots.
- Re-exported output record contracts through `@puresoc/database` and kept the API `output-records.ts` as a compatibility alias for existing report/dashboard services.
- Removed stored-analysis/report/dashboard storage from `InMemoryPureSocRepository`; API compliance, report, and dashboard services now use the runtime-selected output repository.
- Prisma mode now selects `PrismaOutputRecordRepository` and reports `stored_analysis_reports_dashboards` as persisted.
- Stored analysis persistence uses the existing `compliance_result_snapshots.resultSetJson` JSON payload and preserves checklist items already written by the compliance-result repository.
- Added deterministic repository tests for memory and Prisma adapters, including organization-scoped reads, generated report persistence, latest dashboard snapshot selection, and checklist-preserving stored-analysis upserts.
- Preserved generated-report evidence artifact creation, legal caveats, source references, report export behavior, and dashboard aggregation semantics.

Changed files:

- `code/README.md`
- `code/apps/api/src/__tests__/runtime-persistence.test.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/compliance/service.ts`
- `code/apps/api/src/dashboards/service.ts`
- `code/apps/api/src/output-records.ts`
- `code/apps/api/src/reports/service.ts`
- `code/packages/database/src/__tests__/prisma-output-records.repository.spec.ts`
- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/repositories/output-records.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M26.md`
- `docs/PLAN_M27.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available. Validation used host-node equivalents through `flatpak-spawn --host`.
- `npm run lint` passed. It reported schema drift coverage for 21 models and 331 fields, and Romania generated regulatory drift for 2 artifacts.
- `npm run test -- outputs reports dashboards database prisma persistence api` passed: 29 test files, 90 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M26. Stored analyses, generated report records, and dashboard snapshots are accessed through an output repository boundary; memory mode remains deterministic; Prisma mode selects the new adapter and reports persisted output contexts honestly; repository tests cover organization-scoped reads and no cross-organization output leakage; existing report/dashboard API behavior remains compatible.

Gaps updated:

- GAP-036 narrowed for stored analysis/report/dashboard runtime persistence selection in Prisma mode.
- GAP-041 narrowed for deterministic output repository runtime semantics.
- GAP-030 remains open; no provider write/remediation execution was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 25 / PLAN_M26 complete and stages Prompt 26 / PLAN_M27.
- `docs/PLAN_M27.md` created for Identity, Session, Organization, And RBAC Persistence Adapter Slice.

Residual risk:

- Live PostgreSQL migration/apply smoke remains deferred; Prisma adapters were validated with deterministic fake delegates and schema validation only.
- Prisma mode remains partial for identity/session/org/RBAC, audit logs, provider telemetry, and OIDC transient state.
- Stored analysis in Prisma mode shares `compliance_result_snapshots.resultSetJson`; future changes must preserve the compliance-result payload fields, especially `checklistItems`.
