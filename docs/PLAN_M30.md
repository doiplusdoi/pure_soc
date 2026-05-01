# M30 Plan: OIDC Transient Authorization State Persistence Adapter Slice

## Summary

Implement Prompt 29 from `docs/codex-prompts.md`: move OIDC/social-login transient authorization state behind explicit memory and Prisma stores selected by `PURESOC_PERSISTENCE_MODE`.

Status: staged for implementation after M29.
Created: 2026-05-02.

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

- Pending. M30 implementation must create `docs/PLAN_M31.md` before final response.

Residual risk:

- Pending.
