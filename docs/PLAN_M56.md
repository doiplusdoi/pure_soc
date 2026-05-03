# M56 Plan: Multi-Process Audit-Chain Append Concurrency

## Summary

Harden persisted audit append ordering so concurrent API processes cannot fork the per-organization or global audit hash chain by appending against the same latest anchor.

Status: completed.
Created: 2026-05-03.
Started: 2026-05-03.
Completed: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M55.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/packages/audit/src/index.ts`
- `code/packages/audit/src/__tests__/audit-integrity.spec.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/repositories/audit.ts`
- `code/packages/database/src/__tests__/prisma-audit.repository.spec.ts`
- `code/apps/api/src/audit/routes.ts`
- `code/apps/api/src/__tests__/audit-export-checkpoints.test.ts`
- `code/apps/api/src/auth/services.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `code/package.json`
- `code/README.md`

## Goal

Ensure persisted audit writes for the same organization/global scope append as one linear hash chain even when two API processes attempt to write concurrently.

## Scope

Expected implementation areas:

- Add a Prisma-mode audit append concurrency strategy, preferably a transaction-scoped PostgreSQL advisory lock or equivalent repository boundary.
- Preserve in-memory deterministic audit behavior and clearly keep it scoped to tests/local memory mode.
- Add same-scope contention tests and different-organization independence tests.
- Preserve audit redaction, organization scoping, checkpoint/export caveats, and non-WORM/non-notarized guarantees.
- Update GAP-039 and prompt handoff docs.

Locked assumptions:

- This milestone narrows hash-chain fork risk only; it does not create WORM storage or external notarization.
- No live database, external service, provider write, or external-smoke command should run by default.

## Negative Constraints

- Do not claim WORM storage, external notarization, legal certification, or database-admin-proof auditability.
- Do not call live PostgreSQL, Redis, external signing/notary services, object storage, KMS/HSM/secret-manager/cloud APIs, Microsoft Graph, Stripe, OIDC/OAuth providers, public regulatory URLs, production/staging/customer deployments, or provider write executors.
- Do not weaken existing audit redaction, organization scoping, checkpoint/export guarantees, or non-WORM/non-notarized caveats.
- Do not introduce a broad API framework or route migration in this prompt.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit database api
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-039 for multi-process same-scope audit-chain append ordering.
- Preserve WORM/object-storage export writers, real external signing/notarized checkpoints, checkpoint retention operations, legal-hold/deletion procedures, and operational verification/alerting as deferred under GAP-039.
- Preserve GAP-044; M56 must not run external smoke commands.

## Acceptance Criteria

- Same-scope concurrent persisted audit appends produce one linear chain with no duplicate-anchor fork.
- Different organizations can append independently without cross-organization contamination.
- Audit redaction, hash metadata, export/checkpoint caveats, and route authorization remain intact.
- No live external services, provider writes, or external-smoke commands are called.
- Prompt and gap handoff docs are updated and `docs/PLAN_M57.md` is created.

## Completion Log

Started 2026-05-03.

Implementation results:

- Added an audit sink append boundary that lets persistence adapters attach hash-chain integrity inside their own serialized append path.
- `InMemoryAuditSink` now serializes concurrent writes within one Node.js process for deterministic local/test behavior, while remaining explicitly non-persistent and non-multi-process.
- `PrismaAuditSink` now appends inside a transaction, acquires a PostgreSQL advisory lock per audit scope, reads the latest persisted anchor under that lock, and writes `scopeKey`/`chainSequence` ordering metadata.
- Added a Prisma migration, schema drift coverage, and exported helpers for audit scope/advisory-lock keys.
- Latest-anchor reads and audit exports now use persisted `chainSequence` ordering instead of timestamp-only ordering.
- Added deterministic same-scope contention coverage and different-organization independence coverage without live PostgreSQL or external services.
- Preserved redacted canonical payload semantics, organization/global scope handling, database-only checkpoint/export guarantees, and non-WORM/non-notarized caveats.

Changed files:

- `code/README.md`
- `code/apps/api/src/__tests__/auth-organization-rbac-prisma-persistence.test.ts`
- `code/packages/audit/src/__tests__/audit-integrity.spec.ts`
- `code/packages/audit/src/index.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260503020000_audit_scope_sequence/migration.sql`
- `code/packages/database/src/__tests__/prisma-audit.repository.spec.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/repositories/audit.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M56.md`
- `docs/PLAN_M57.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Failed as expected in this environment: `pnpm test -- audit database api` (`pnpm: command not found`).
- Failed as expected in this environment: `npm run test -- audit database api` (`npm: command not found`).
- Passed: `flatpak-spawn --host npm run test -- audit database api` (35 files, 125 tests).
- Passed: `flatpak-spawn --host npm run lint` (layout, schema drift, generated regulatory drift, TypeScript).
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.

Acceptance status:

- Accepted. Same-scope persisted audit appends are serialized in the deterministic Prisma repository contract, different organizations sequence independently, audit redaction/checkpoint/export guarantees remain intact, and no live external services or provider write paths were called.

Gaps updated:

- GAP-039 narrowed for transaction-scoped same-scope audit append locking, persisted scope sequence ordering, and deterministic contention tests without WORM, external notarization, live PostgreSQL, or external services.
- GAP-041 narrowed for audit `scopeKey`/`chainSequence` field and unique scope-sequence attribute drift coverage.
- GAP-044 preserved; no external smoke commands were run.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 55 / PLAN_M56 complete and stages Prompt 56 / PLAN_M57 for memory repository split and API route-table work.
- `docs/PLAN_M57.md` created.

Residual risk:

- The implemented lock path is covered by deterministic fake-Prisma contention tests, not a live multi-replica PostgreSQL deployment. WORM/object-storage export writers, real external signing/notarized checkpoints, checkpoint retention operations, legal-hold/deletion procedures, deployed database migration/replica smoke coverage, and operational verification/alerting remain deferred under GAP-039.
