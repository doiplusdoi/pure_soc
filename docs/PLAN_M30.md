# M30 Plan: OIDC Transient Authorization State Persistence Adapter Slice

## Summary

Implement Prompt 29 from `docs/codex-prompts.md`: move OIDC/social-login transient authorization state behind explicit memory and Prisma stores selected by `PURESOC_PERSISTENCE_MODE`.

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
- `docs/PLAN_M29.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- `docs/adr/ADR-013-auth-oidc-social-login-and-managed-provider-consent-boundaries.md`
- `docs/threat-model.md`
- `code/packages/auth/oidc/src/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/server.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/repositories/**`
- `code/packages/database/src/index.ts`
- `code/apps/api/src/__tests__/**`
- `code/packages/database/src/__tests__/**`

## Goal

Make OIDC transient authorization state persist through the runtime repository set in memory and Prisma modes while preserving state/nonce/PKCE validation, single-use consumption, account-linking safeguards, and redaction behavior.

## Scope

Expected implementation areas:

- Prisma OIDC authorization-state store implementing the current `OidcAuthorizationStateStore` contract or a narrowly evolved protected-verifier contract.
- Runtime OIDC state-store selection in `createApiServices()`.
- Deterministic fake-Prisma repository tests for save/consume, expiry, single-use behavior, and protected verifier storage.
- API/runtime tests proving pending OIDC state survives service recreation in Prisma mode, consumed states cannot be reused, expired states fail, and account-link safeguards remain unchanged.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- User social-login OIDC and Microsoft 365 managed-provider admin consent remain separate boundaries.
- OIDC state and nonce values remain hashed. Authorization codes, access tokens, refresh tokens, session tokens, cookies, and nonce values must not be persisted in plaintext.
- If the PKCE code verifier is persisted durably, it must be stored in a reversible protected envelope or equivalent local boundary because callback exchange still needs it.
- Live OIDC provider registration/callback smoke remains out of scope.

Expected files:

- `code/packages/auth/oidc/src/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/__tests__/**`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/repositories/**`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/__tests__/**`
- `docs/PLAN.md`
- `docs/PLAN_M30.md`
- `docs/PLAN_M31.md`
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
- Do not persist plaintext OIDC authorization codes, access tokens, refresh tokens, client secrets, session tokens, cookies, state values, nonce values, reset tokens, or verification tokens.
- Do not weaken OIDC issuer/audience/expiry/signature checks, nonce checks, PKCE checks, explicit account-link approval, email-collision handling, session creation, token redaction, or audit behavior.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- auth oidc social login database prisma persistence api organization rbac audit
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Close or narrow GAP-036 for OIDC transient-state runtime persistence in Prisma mode.
- Narrow GAP-041 if OIDC transient-state schema/repository/API semantics receive deterministic coverage.
- Preserve GAP-032 unless live OIDC provider registration/callback smoke is intentionally performed.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve live database/browser/provider integration gaps unless this milestone directly validates them.

## Acceptance Criteria

- OIDC begin/callback flows use the runtime-selected authorization-state store.
- Memory mode remains deterministic for existing OIDC tests.
- Prisma mode selects the new OIDC state store and runtime persistence reporting is honest.
- Repository/API tests prove pending state survives service recreation, state consumption is single-use, expired state is rejected, and protected transient secrets are not stored as plaintext.
- Existing OIDC account-link and email-collision protections remain behavior-compatible.

## Completion Log

Started and completed 2026-05-02.

Implementation results:

- Added `PrismaOidcAuthorizationStateStore` under `@puresoc/database`, implementing the OIDC authorization-state store contract for Prisma mode.
- Added `oidc_authorization_states` schema/migration metadata with hashed `stateHash`/`nonceHash`, a protected `codeVerifierEnvelope`, TTL/consumption timestamps, and selected schema drift coverage.
- Added an auth-owned `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` config/default/env path. Production Prisma-mode startup rejects the checked-in local-dev key.
- `createApiServices()` now selects the runtime authorization-state store. Memory mode keeps `InMemoryOidcAuthorizationStateStore`; Prisma mode uses `PrismaOidcAuthorizationStateStore`.
- Runtime persistence reporting now marks `oidc_transient_state` as persisted in Prisma mode and leaves no tracked API repository context memory-backed.
- Added deterministic fake-Prisma repository tests for save/consume, protected verifier storage, expiry rejection, and single-use behavior.
- Added API/runtime tests proving pending OIDC state survives service recreation in Prisma mode, consumed state cannot replay, expired state fails before token exchange, and email-collision account linking still requires explicit approval.

Changed files:

- `code/.env.example`
- `code/README.md`
- `code/apps/api/src/__tests__/auth-oidc-prisma-persistence.test.ts`
- `code/apps/api/src/__tests__/auth-organization-rbac-prisma-persistence.test.ts`
- `code/apps/api/src/__tests__/provider-connections-prisma-persistence.test.ts`
- `code/apps/api/src/__tests__/runtime-persistence.test.ts`
- `code/apps/api/src/auth/services.ts`
- `code/config/defaults/auth.json`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/config/src/index.ts`
- `code/packages/database/prisma/migrations/20260502020000_oidc_authorization_state/migration.sql`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/packages/database/src/__tests__/prisma-oidc-authorization-state.repository.spec.ts`
- `code/packages/database/src/contracts/schema-groups.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/repositories/oidc-authorization-state.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M30.md`
- `docs/PLAN_M31.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm`, sandbox-local `npm`, and sandbox-local `docker` were not available. Validation used host-node/host-Docker equivalents through `flatpak-spawn --host`.
- `npm run lint` passed. It reported schema drift coverage for 28 models and 413 fields, and Romania generated regulatory drift for 2 artifacts.
- `npm run test -- auth-oidc-prisma-persistence prisma-oidc-authorization-state runtime-persistence config database-schema provider-connections-prisma-persistence auth-organization-rbac-prisma-persistence` passed: 8 test files, 32 tests.
- `npm run test -- auth oidc social login database prisma persistence api organization rbac audit` passed: 36 test files, 103 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M30. OIDC begin/callback flows use the runtime-selected authorization-state store; memory mode remains deterministic; Prisma mode selects the new store and reports `oidc_transient_state` as persisted; tests prove service-recreation survival, single-use consumption, expiry rejection, protected verifier storage, and unchanged account-link safeguards.

Gaps updated:

- GAP-036 resolved for tracked API runtime repository contexts. Live PostgreSQL migration/apply smoke remains open under GAP-026.
- GAP-041 narrowed for OIDC authorization-state schema/repository/API runtime semantics.
- GAP-026 updated to include the new OIDC migration metadata while preserving live PostgreSQL smoke as open.
- GAP-032 preserved for live Microsoft/Google/GitHub provider registration and callback smoke.
- GAP-030 preserved; no provider write/remediation execution was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 29 / PLAN_M30 complete and stages Prompt 30 / PLAN_M31.
- `docs/PLAN_M31.md` created for the live PostgreSQL migration/apply smoke slice.

Residual risk:

- Live PostgreSQL `prisma migrate deploy` and real CRUD smoke remain deferred under GAP-026; M30 used deterministic fake-Prisma delegates plus schema validation.
- Live Microsoft Entra, Google, and GitHub app registration/callback smoke remains deferred under GAP-032.
- OIDC transient-state key custody is environment-secret based; broader KMS/secret-manager custody remains tracked with production secret hardening work.
