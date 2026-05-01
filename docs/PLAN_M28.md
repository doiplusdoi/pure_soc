# M28 Plan: Audit Log Persistence Sink Slice

## Summary

Implement Prompt 27 from `docs/codex-prompts.md`: move audit log writes behind explicit memory and Prisma audit sinks selected by `PURESOC_PERSISTENCE_MODE`.

Status: staged for implementation after M27.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M27.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- `docs/threat-model.md`
- `code/packages/audit/src/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/server.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/repositories/**`
- `code/packages/database/src/index.ts`
- `code/apps/api/src/__tests__/**`
- `code/packages/database/src/__tests__/**`

## Goal

Make audit log writes persist through the runtime repository set in memory and Prisma modes while preserving existing hash-chain and redaction semantics.

## Scope

Expected implementation areas:

- Prisma audit sink implementing the existing `AuditSink` contract.
- Runtime audit sink selection and persistence-context reporting updates.
- Deterministic fake-Prisma sink/repository tests for per-organization/global integrity anchors and append behavior.
- API/runtime tests proving auth/org/RBAC audit events persist through the Prisma sink.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- Existing in-memory audit sink remains the deterministic memory-mode harness.
- M28 does not claim WORM storage, external signing, legal notarization, or retention/export completeness.
- Live PostgreSQL migration/apply smoke remains out of scope unless a later prompt explicitly brings runtime database infrastructure into scope.

Expected files:

- `code/packages/audit/src/index.ts`
- `code/packages/audit/src/__tests__/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/__tests__/**`
- `code/packages/database/src/repositories/**`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/__tests__/**`
- `docs/PLAN.md`
- `docs/PLAN_M28.md`
- `docs/PLAN_M29.md`
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
- Do not claim audit entries are WORM, externally signed, legally notarized, or tamper-proof.
- Do not persist plaintext passwords, reset tokens, verification tokens, session tokens, OAuth codes, provider secrets, cookies, evidence storage URIs, or OIDC nonce/PKCE values in audit payloads.
- Do not weaken redaction, hash-chain verification, organization scoping, or existing auth/RBAC behavior.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit database prisma persistence api auth organization rbac evidence billing regulatory actions
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-036 for audit-log runtime persistence in Prisma mode.
- Narrow GAP-039 for persisted audit sink/hash-chain adapter coverage while keeping external signing/WORM/retention open.
- Narrow GAP-041 if audit persistence semantics receive deterministic API/repository coverage.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve browser/live integration gaps unless this milestone directly validates them.

## Acceptance Criteria

- Audit writes are accessed through an explicit runtime-selected sink.
- Memory mode remains deterministic for existing API tests.
- Prisma mode selects the new audit sink and runtime persistence reporting is honest.
- Repository/API tests prove audit event persistence and organization/global hash-chain anchor behavior.
- Existing auth, organization, RBAC, evidence, billing, regulatory, and remediation audit events remain behavior-compatible.

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

- Pending. M28 implementation must create `docs/PLAN_M29.md` before final response.

Residual risk:

- Pending.
