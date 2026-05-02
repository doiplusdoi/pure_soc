# M37 Plan: Audit Export Retention And External Checkpoint Contract Slice

## Summary

Implement the next active prompt after M36: narrow GAP-039 by making audit export/checkpoint operations more production-shaped without claiming WORM storage, external notarization, legal certification, or protection against a database administrator rewriting all rows.

Status: completed.
Created: 2026-05-02.
Started: 2026-05-02.
Completed: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M36.md`
- `docs/threat-model.md`
- `code/packages/audit/src/**`
- `code/packages/database/src/**`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/packages/evidence/src/**`
- `code/config/defaults/**`
- `code/package.json`
- `code/README.md`
- `code/tests/**`

## Goal

Add explicit audit export/checkpoint operations contracts for retention/export policy metadata and external checkpoint provider status, using deterministic fake/local adapters only.

## Scope

Expected implementation areas:

- Audit export/checkpoint contract metadata for retention/export policy and external-anchor state.
- `none` and deterministic fake external checkpoint providers.
- Persistence/API exposure for anchor metadata while preserving database-only guarantees by default.
- Tests for redacted exports, fake anchors, no-provider guarantees, retention metadata, organization scoping, tamper detection, and secret-free payloads.
- Documentation in `code/README.md`, gap register, current milestone, and prompt handoff docs.

Locked assumptions:

- Current database-only checkpoints remain honest and non-WORM unless an explicit fake/test provider is injected.
- No live external signing, notarization, KMS/HSM, cloud WORM, object-storage, or MinIO/S3 services are called.
- GAP-039 can be narrowed by contracts and fake adapters but remains open for true WORM/external notarization operations.
- GAP-030, GAP-040, and GAP-043 remain out of scope unless explicitly selected later.

Expected files:

- `code/package.json`
- `code/packages/audit/src/**`
- `code/packages/database/src/**`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/packages/evidence/src/**`
- `code/config/defaults/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M37.md`
- `docs/PLAN_M38.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not claim audit rows are WORM, externally notarized, legally certified, or database-admin-proof unless a real accepted implementation exists.
- Do not call live external signing, timestamping, KMS/HSM, object-storage WORM, MinIO/S3, or cloud APIs.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, provider-token custody, regulatory no-auto-activation rules, or provider-write startup disablement.
- Do not broaden into Stripe, OIDC, browser UI, Microsoft Graph, provider writes, public regulatory fetches, or queue runtime work.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit api database config evidence reports exports rbac
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-039 for audit export/checkpoint retention and external-anchor contracts.
- Preserve GAP-030 unless live provider write execution is explicitly implemented and accepted.
- Preserve GAP-040 unless live KMS/secret-manager custody is explicitly implemented and accepted.
- Preserve GAP-043 unless deployed multi-container queue orchestration is explicitly implemented and accepted.

## Acceptance Criteria

- Audit export/checkpoint operations expose retention/export policy metadata and external checkpoint status.
- Default/no-provider mode remains explicitly database-only and non-WORM/non-notarized.
- Fake external checkpoint provider metadata is deterministic and testable without live services.
- Export/checkpoint payloads remain redacted, organization-scoped, and secret-free.
- Gap and prompt handoff docs honestly describe remaining WORM/external signing work.

## Completion Log

Started 2026-05-02.

Implementation results:

- Added audit retention/export policy metadata to exported segments and checkpoints, including config defaults/env overrides for audit-log retention, checkpoint/export retention, checkpoint cadence, and external checkpoint provider selection.
- Added `none` and deterministic test-only `fake-local` external checkpoint providers in `@puresoc/audit`; the fake provider records local hash/reference metadata only and explicitly avoids live external services, WORM storage, external notarization, and legal certification claims.
- Extended checkpoint records with provider/status/local-anchor metadata and persisted it through Prisma schema, migration, repository mapping, and schema drift checks.
- Wired API services/routes to expose org-scoped retention/provider metadata and to audit checkpoint creation without leaking sensitive fields.
- Added deterministic package, Prisma-boundary, config, and API coverage for database-only guarantees, fake-anchor metadata, retention policy metadata, cross-organization rejection, tamper detection, and secret-free payloads.
- Documented the remaining operator-owned requirements for append-only/WORM storage, retention/legal-hold/deletion policy, immutable checkpoint export, external signing/notarization, alerting, and concurrent append semantics.

Changed files:

- `code/.env.example`
- `code/README.md`
- `code/apps/api/src/__tests__/audit-export-checkpoints.test.ts`
- `code/apps/api/src/audit/routes.ts`
- `code/apps/api/src/auth/services.ts`
- `code/config/defaults/audit.json`
- `code/packages/audit/src/__tests__/audit-integrity.spec.ts`
- `code/packages/audit/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/config/src/index.ts`
- `code/packages/database/prisma/migrations/20260502040000_audit_checkpoint_policy_external_anchor/migration.sql`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/__tests__/prisma-audit.repository.spec.ts`
- `code/packages/database/src/repositories/audit.ts`
- `code/scripts/check-layout.mjs`
- `code/scripts/check-schema-contract-drift.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M37.md`
- `docs/PLAN_M38.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run lint` passed, including layout checks, schema drift checks for 29 models / 438 fields, generated Romania regulatory drift checks, and TypeScript.
- `npm run test -- audit api database config evidence reports exports rbac` passed: 39 test files, 130 tests.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M37. The milestone narrows audit export/checkpoint operations with retention/export policy metadata and deterministic none/fake external-anchor contracts while preserving explicit non-WORM, non-notarized, non-certified guarantees.

Gaps updated:

- GAP-039 narrowed for retention/export policy metadata, deterministic `none` and `fake-local` external checkpoint providers, persisted anchor metadata, API exposure, and redaction/scoping tests.
- GAP-041 narrowed for selected audit checkpoint retention/external-anchor schema drift coverage.
- GAP-030 preserved; no live provider write execution was added.
- GAP-040 preserved; no live KMS/secret-manager custody was added.
- GAP-043 preserved; no deployed multi-container queue orchestration was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 36 / PLAN_M37 complete and stages Prompt 37 / PLAN_M38 for provider-token secret-manager custody contracts and rotation-runbook metadata.
- `docs/PLAN_M38.md` was created from the staged M38 prompt.

Residual risk:

- Audit checkpoints remain database metadata only unless a future real external anchor is implemented. `fake-local` is test-only and not a timestamp authority, signer, WORM store, KMS/HSM, legal certification, or production provider.
- A database administrator or full storage compromise can still rewrite rows and checkpoint metadata unless immutable export or external anchoring is added.
- Application-level retention metadata is recorded, but retention deletion, legal hold, immutable export, external signing/notarization, alerting, and concurrent append ordering remain operator/product/security work under GAP-039.
