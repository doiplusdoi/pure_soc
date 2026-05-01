# M31 Plan: Live PostgreSQL Migration And Prisma Runtime Smoke Slice

## Summary

Implement Prompt 30 from `docs/codex-prompts.md`: add a bounded live PostgreSQL smoke for Prisma migration/apply and representative runtime CRUD against the Prisma adapters.

Status: staged for implementation after M30.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M30.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- `docs/threat-model.md`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/**`
- `code/packages/database/src/repositories/**`
- `code/apps/api/src/auth/services.ts`
- `code/infra/compose/docker-compose.yml`
- `code/package.json`
- `code/scripts/**`
- `code/tests/**`

## Goal

Prove the checked-in Prisma schema and migrations apply cleanly to a real PostgreSQL runtime and that a small representative Prisma-mode CRUD smoke works against a live database, without introducing live provider, billing, OIDC-provider, object-storage, KMS, or remediation-write dependencies.

## Scope

Expected implementation areas:

- A bounded script or test harness that can start from an empty PostgreSQL database URL, run `prisma migrate deploy`, and execute representative Prisma-mode adapter CRUD.
- Representative coverage for high-risk runtime contexts now selected in Prisma mode, such as identity/session/org/RBAC, audit logs, OIDC transient authorization state, provider connection/telemetry, compliance output, evidence metadata, billing/regulatory/remediation metadata, notification drafts, and stored output.
- Compose or CI-friendly documentation/commands for running the smoke locally without requiring public network calls or live third-party accounts.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- The smoke may use local Docker PostgreSQL or a caller-provided `DATABASE_URL`; it must not require a production database.
- The smoke should create disposable test data with clearly test-prefixed identifiers and should be safe to run repeatedly against a disposable database.
- Provider write/remediation execution remains disabled.
- Live Microsoft Graph, Stripe, OIDC providers, MinIO/S3, scanner, public regulatory URLs, KMS, Redis/BullMQ, and browser runtime smoke remain out of scope unless explicitly added to the prompt after review.

Expected files:

- `code/package.json`
- `code/packages/database/prisma/migrations/**`
- `code/packages/database/src/repositories/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M31.md`
- `docs/PLAN_M32.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not run against or mutate a production database.
- Do not add live Microsoft Graph, Stripe, OIDC-provider, MinIO/S3, scanner, public regulatory URL, KMS, Redis/BullMQ, browser, or provider-write dependencies.
- Do not enable provider write/remediation execution.
- Do not persist plaintext provider tokens, OAuth codes, access tokens, refresh tokens, session tokens, cookies, state values, nonce values, reset tokens, verification tokens, or PKCE verifiers.
- Do not weaken organization scoping, audit redaction, OIDC state/nonce/PKCE safeguards, or provider no-live-write guards.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- database prisma persistence auth organization rbac audit oidc provider compliance evidence billing regulatory actions outputs notification
pnpm prisma:validate
pnpm <new-live-postgres-smoke-command>
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Close or narrow GAP-026 for live PostgreSQL migration/apply and representative real-CRUD smoke.
- Preserve GAP-030; do not enable live provider write/remediation execution.
- Preserve GAP-032 unless live OIDC provider registration/callback smoke is intentionally performed.
- Preserve GAP-037 unless live Redis/BullMQ queue durability is intentionally added.
- Preserve GAP-039/GAP-040 unless audit WORM/external signing or KMS/key rotation smoke is intentionally added.

## Acceptance Criteria

- The smoke applies checked-in migrations to an empty PostgreSQL database.
- The smoke executes representative Prisma-mode CRUD through repository/service boundaries rather than only `prisma validate`.
- The smoke is documented and safe for disposable local/CI databases.
- The implementation does not introduce live third-party dependencies or provider write execution.
- Gap and prompt handoff docs honestly distinguish live PostgreSQL smoke from remaining runtime operations gaps.

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

- Pending. M31 implementation must create `docs/PLAN_M32.md` before final response.

Residual risk:

- Pending.
