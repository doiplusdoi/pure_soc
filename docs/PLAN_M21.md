# M21 Plan: Audit Log Integrity And Provider Key Handling

## Summary

Implement Prompt 20 from `docs/codex-prompts.md`: add an audit-log integrity baseline and harden provider-token key handling without enabling provider write actions.

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
- `docs/threat-model.md`
- `docs/claude_rec2.md`
- `docs/PLAN_M20.md`
- `docs/adr/ADR-009-microsoft-graph-permission-bundles.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-013-auth-oidc-social-login-and-managed-provider-consent-boundaries.md`

## Goal

Make audit records tamper-evident at the package/contract level and remove remaining provider-token key ambiguity before runtime hardening proceeds.

## Scope

Expected implementation areas:

- Audit hash-chain metadata and deterministic canonical payload construction.
- In-memory audit sink support for previous/entry hash metadata and tamper-detection tests.
- Redaction-sensitive audit hashing tests proving secrets do not enter canonical payloads.
- Provider token key configuration hardening, including key IDs or a key-ring boundary if feasible.
- Microsoft 365 token cipher tests for active and previous key behavior if the cipher format changes.
- Prisma schema/migration metadata for audit integrity fields if it fits the slice cleanly.
- Documentation and gap updates that clearly separate tamper-evident hashes from WORM storage, external signing, KMS custody, or legal certification.

Expected files:

- `code/.env.example`
- `code/config/defaults/connectors.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/audit/src/index.ts`
- `code/packages/audit/src/__tests__/*.spec.ts`
- `code/packages/providers/microsoft365/src/crypto.ts`
- `code/packages/providers/microsoft365/src/__tests__/*.spec.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/**` if schema fields are added
- `README.md`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M21.md`
- `docs/PLAN_M22.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not weaken audit redaction or add sensitive data to canonical hashes.
- Do not claim tamper-proof or legally certified audit logs.
- Do not require external KMS/HSM or WORM storage in this milestone.
- Do not break existing audit sink APIs unless all callers and tests are updated.
- Do not invalidate existing local-dev provider token behavior outside production/startup validation unless tests and docs explain the migration.
- Do not add provider write/remediation execution.
- Do not add Microsoft-specific logic outside Microsoft provider/config surfaces.
- Do not make legal certification claims.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit encryption provider microsoft365 config auth
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow or resolve the audit-log integrity risk from REC-109.
- Narrow or resolve provider-token default-key/key-rotation risk from REC-119.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve runtime/browser/live integration gaps unless M21 directly validates them.
- Create or update gaps for WORM storage, external signing/KMS, audit retention/export, or live key-rotation smoke intentionally deferred.

## Acceptance Criteria

- Audit records include deterministic integrity metadata without exposing secrets.
- Tests can detect tampering or broken chain continuity in the in-memory audit harness.
- Provider token key behavior is explicit in config and tests.
- Production startup still rejects unsafe provider-token key settings.
- Existing auth/provider/audit tests keep passing.

## Completion Log

Completed 2026-05-01.

Implementation results:

- Added audit-log integrity metadata in `@puresoc/audit`: `previousHash`, `entryHash`, `hashAlgorithm`, and a redacted canonical payload.
- `AuditWriter` computes integrity metadata after redaction and before sink append. The optional sink anchor hook keeps the existing sink API small while allowing chain continuity.
- `InMemoryAuditSink` now chains independently by organization ID and null/global scope, and exposes verification helpers for tamper detection.
- Added Prisma `AuditLog` integrity metadata fields and a nullable migration so existing rows stay readable until a persisted audit sink/backfill policy is selected.
- Added Microsoft 365 provider-token key IDs/key-ring support. New envelopes use `version: 2` and include `keyId`; decrypt supports current keys, previous keys, and legacy version-1 envelopes without key IDs.
- Added config defaults/env overrides for `PURESOC_PROVIDER_TOKEN_KEY_ID`, `PURESOC_PROVIDER_TOKEN_KEY`, and `PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS`, plus startup validation for duplicate/invalid key IDs and unsafe local-dev keys in production.
- Rewired API Microsoft 365 token cipher construction to use the typed config key ring.
- Updated docs to state that audit hash chains are tamper-evident metadata only, not WORM storage, external signing, HSM/KMS custody, or legal certification.

Changed files:

- `README.md`
- `code/.env.example`
- `code/README.md`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/provider-connections/microsoft365/service.ts`
- `code/config/defaults/connectors.json`
- `code/packages/audit/src/index.ts`
- `code/packages/audit/src/__tests__/audit-integrity.spec.ts`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260501000000_audit_integrity/migration.sql`
- `code/packages/providers/microsoft365/src/crypto.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-token-encryption.spec.ts`
- `docs/PLAN.md`
- `docs/PLAN_M21.md`
- `docs/PLAN_M22.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available, so host-node equivalents were used through `flatpak-spawn --host`.
- `npm run test -- audit encryption provider microsoft365 config auth` passed: 17 test files, 72 tests.
- Full `npm run test` passed: 58 test files, 218 tests.
- `npm run lint` passed.
- `npm run prisma:validate` first failed because `DATABASE_URL` was not set in the shell; rerun with `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M21. The implementation satisfies the audit integrity metadata, redaction-before-hashing, per-organization/global in-memory verification, Prisma metadata migration, provider-token key ID/key-ring, previous-key decrypt, production default-key rejection, and no-provider-write acceptance criteria.

Gaps updated:

- GAP-039 created for persisted audit chain concurrency, WORM/object-storage export, external signing/notarized checkpoints, retention/export policy, and operational verification.
- GAP-040 created for provider-token KMS/secret-manager custody, live key-rotation smoke, ciphertext backfill/re-encryption workflow, and operator rotation/backout runbook.
- GAP-030 remains open; no provider write/remediation execution was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 20 / PLAN_M21 complete and stages Prompt 21 / PLAN_M22.
- `docs/PLAN_M22.md` created for Schema And Generated Data Drift Detection.

Residual risk:

- Hash chains detect ordinary record tampering and broken continuity in the contract harness, but do not provide append-only storage, external notarization, protection from a full database rewrite, or detection of final-row deletion.
- Prisma audit integrity columns are present, but no persisted audit sink/backfill/concurrency semantics are implemented yet.
- Provider-token rotation is modeled with active/previous keys, but live KMS/secret-manager custody, runtime rotation smoke, and ciphertext re-encryption are deferred.
- Provider write/remediation execution remains disabled under GAP-030.
