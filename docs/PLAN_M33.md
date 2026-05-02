# M33 Plan: Audit WORM Export And External Checkpoint Planning Slice

## Summary

Implement Prompt 32 from `docs/codex-prompts.md`: narrow GAP-039 by adding an audit export/checkpoint contract that makes the current tamper-evident audit hash chain easier to verify and export without claiming WORM storage or external notarization exists yet.

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
- `docs/PLAN_M32.md`
- `docs/threat-model.md`
- `code/packages/audit/src/**`
- `code/packages/database/src/**`
- `code/apps/api/src/**`
- `code/config/defaults/**`
- `code/package.json`
- `code/README.md`
- `code/tests/**`

## Goal

Add a bounded audit export/checkpoint foundation that can serialize and verify organization/global audit chain segments with redacted canonical payloads, hash anchors, exported-at metadata, and verification status, while preserving honest product claims about what is and is not WORM or externally signed.

## Scope

Expected implementation areas:

- Audit export/checkpoint data contracts under `@puresoc/audit` or an adjacent existing boundary.
- Deterministic verification helpers for intact, missing-row, tampered-payload, broken-link, and wrong-terminal-checkpoint scenarios.
- Repository or service boundaries for recording/exporting audit checkpoints where appropriate.
- Documentation in `code/README.md`, `docs/implementation-gaps.md`, and milestone/prompt handoff docs.

Locked assumptions:

- Existing audit hash-chain metadata is tamper-evident only.
- This milestone may create an export/checkpoint contract without adding object-storage WORM, external signing, KMS/HSM, or legal certification claims.
- Audit exports will contain the redacted canonical payload that is already hashed into each audit entry; exports must not include unredacted before/after payloads.
- Checkpoints recorded by this milestone are database records only. They can preserve terminal hash metadata for later external anchoring, but they are not external anchors themselves.
- A checkpoint creation audit event may be appended after the exported segment; that event is not covered by the checkpoint it records.
- Provider write/remediation execution remains disabled until GAP-030 is intentionally addressed.
- Live Microsoft Graph, Stripe, OIDC providers, MinIO/S3, scanner, public regulatory URL, KMS, browser runtime, and provider writes remain out of scope.

Expected files:

- `code/package.json`
- `code/packages/audit/src/**`
- `code/packages/database/src/**`
- `code/packages/database/prisma/**`
- `code/apps/api/src/**`
- `code/config/defaults/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M33.md`
- `docs/PLAN_M34.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not enable provider write/remediation execution.
- Do not claim database hash chains are WORM storage, legal evidence certification, external notarization, or proof against a database administrator rewriting all rows.
- Do not add live Microsoft Graph, Stripe, OIDC-provider, MinIO/S3, scanner, public regulatory URL, KMS, browser, or provider-write dependencies.
- Do not expose sensitive audit payload values or internal storage URIs in exports.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, or regulatory no-auto-activation rules.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit database api auth organization rbac evidence reports
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Close or narrow GAP-039 for audit export/checkpoint contracts.
- Preserve GAP-030 unless remediation worker/provider execution safety is explicitly implemented and accepted in a later prompt.
- Preserve GAP-040 unless KMS/key rotation smoke is intentionally added.
- Preserve GAP-043 unless production queue orchestration hardening is intentionally added.

## Acceptance Criteria

- Audit export/checkpoint contracts are deterministic and organization/global chain aware.
- Verification helpers detect intact and broken/tampered exported audit segments.
- Documentation clearly distinguishes hash-chain exports from WORM storage and external signing.
- No sensitive payload values, storage URIs, provider tokens, OAuth values, cookies, or session secrets are exposed.
- Gap and prompt handoff docs honestly describe what remains deferred.

## Completion Log

Started 2026-05-02.

Implementation results:

- Added audit export/checkpoint contracts in `@puresoc/audit`, including redacted exported records, scope metadata, verification status, explicit non-WORM/non-notarized guarantees, export hashing, checkpoint records, and `AuditCheckpointService`.
- Added deterministic exported-segment verification for intact chains, missing rows, tampered payloads, broken previous-hash links, wrong terminal checkpoint expectations, scope mismatches, and record-count mismatches.
- Added in-memory and Prisma checkpoint repositories plus an `audit_checkpoints` Prisma model, migration, schema-group coverage, and drift-check coverage.
- Added organization-scoped API routes for audit export, checkpoint creation, and checkpoint listing. Checkpoint creation appends an `audit_checkpoint_recorded` audit event after the covered segment.
- Documented that checkpoints are database-only terminal-hash records and not WORM storage, external notarization, legal certification, retention enforcement, or proof against a database administrator rewriting rows.

Changed files:

- `code/README.md`
- `code/apps/api/src/audit/routes.ts`
- `code/apps/api/src/__tests__/audit-export-checkpoints.test.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/server.ts`
- `code/packages/audit/src/index.ts`
- `code/packages/audit/src/__tests__/audit-integrity.spec.ts`
- `code/packages/database/package.json`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260502030000_audit_checkpoints/migration.sql`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/contracts/schema-groups.ts`
- `code/packages/database/src/repositories/audit.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/packages/database/src/__tests__/prisma-audit.repository.spec.ts`
- `code/pnpm-lock.yaml`
- `code/scripts/check-schema-contract-drift.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M33.md`
- `docs/PLAN_M34.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run lint` passed, including layout checks, schema drift checks for 29 models / 432 fields, generated Romania regulatory drift checks, and TypeScript.
- `npm run test -- audit database api auth organization rbac evidence reports` passed: 40 test files, 121 tests.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M33. Audit exports/checkpoints are deterministic, organization-scoped, redacted, and explicit about non-WORM/non-notarized guarantees.

Gaps updated:

- GAP-039 narrowed for audit export/checkpoint contracts, database-only checkpoint persistence, and organization-scoped API routes.
- GAP-041 narrowed for selected `AuditCheckpoint` schema drift and repository/API runtime coverage.
- GAP-030 preserved; no provider write/remediation execution was added.
- GAP-040 preserved; no KMS/key-rotation smoke was added.
- GAP-043 preserved; no production queue orchestration hardening was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 32 / PLAN_M33 complete and stages Prompt 33 / PLAN_M34.
- `docs/PLAN_M34.md` was created for the provider-token KMS and rotation smoke planning slice.

Residual risk:

- Database checkpoints are still mutable database rows. WORM object-storage export, external signing/notarization, retention/export operations, and audit-chain concurrency semantics remain open under GAP-039.
- Live KMS/secret-manager custody and key-rotation smoke remain open under GAP-040.
- Provider write execution remains disabled and open under GAP-030.
