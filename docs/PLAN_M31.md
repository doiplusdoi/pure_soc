# M31 Plan: Live PostgreSQL Migration And Prisma Runtime Smoke Slice

## Summary

Implement Prompt 30 from `docs/codex-prompts.md`: add a bounded live PostgreSQL smoke for Prisma migration/apply and representative runtime CRUD against the Prisma adapters.

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

Started and completed 2026-05-02.

Implementation results:

- Added `pnpm prisma:smoke:postgres`, backed by `code/scripts/live-postgres-prisma-smoke.ts`.
- The smoke validates a caller-provided disposable PostgreSQL `DATABASE_URL`, runs checked-in `prisma migrate deploy`, regenerates the Prisma client, then performs representative real CRUD through existing Prisma repository boundaries.
- Runtime smoke coverage includes migrations, identity/session/org/RBAC, audit hash/redaction persistence, OIDC transient authorization state with protected PKCE verifier storage, provider connection/telemetry, compliance result persistence, evidence metadata/access logs, billing records/events/entitlements, regulatory source/version/source-map/review metadata, remediation action metadata, notification drafts, stored analysis, generated report metadata, and dashboard snapshots.
- The smoke preserves M31 exclusions: no Microsoft Graph, Stripe live API, OIDC-provider callback, object storage, scanner, KMS, Redis/BullMQ, browser, public regulatory URL, or provider write execution dependency was added.
- Documented the command and disposable-database safety language in `code/README.md`.

Changed files:

- `code/README.md`
- `code/package.json`
- `code/scripts/live-postgres-prisma-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M31.md`
- `docs/PLAN_M32.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` was not available in the sandbox or host path. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run lint` passed.
- `npm run test -- database prisma persistence auth organization rbac audit oidc provider compliance evidence billing regulatory actions outputs notification` passed: 51 test files, 194 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:<ephemeral>/puresoc_smoke npm run prisma:smoke:postgres` passed against a disposable `postgres:16-alpine` container. It applied all 4 migrations to an empty database and passed 12 live PostgreSQL checks.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M31. The smoke applies checked-in migrations to an empty PostgreSQL database and exercises representative Prisma-mode CRUD through repository boundaries without introducing live third-party dependencies or provider write execution.

Gaps updated:

- GAP-026 resolved for live PostgreSQL migration/apply and representative real-CRUD smoke.
- GAP-030 preserved; no provider write/remediation execution was added.
- GAP-032 preserved; no live Microsoft/Google/GitHub provider registration or callback smoke was added.
- GAP-037 preserved and selected as the next likely runtime durability milestone.
- GAP-039/GAP-040 preserved; no audit WORM/external signing or KMS/key-rotation smoke was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 30 / PLAN_M31 complete and stages Prompt 31 / PLAN_M32.
- `docs/PLAN_M32.md` was created for the live Redis/BullMQ job durability slice.

Residual risk:

- Live PostgreSQL migration/apply and representative adapter CRUD are covered for a disposable database, but production rollout still needs environment-specific migration operations, backup/restore discipline, and deployment sequencing.
- Live Redis/BullMQ queue durability remains open under GAP-037.
- Provider write execution remains disabled and open under GAP-030.
- Live OIDC provider operations, audit WORM/external signing, and KMS/secret-manager rotation remain deferred under their existing gaps.
