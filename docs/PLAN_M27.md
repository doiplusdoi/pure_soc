# M27 Plan: Identity, Session, Organization, And RBAC Persistence Adapter Slice

## Summary

Implement Prompt 26 from `docs/codex-prompts.md`: move identity, local credential, session, organization membership, and RBAC data behind explicit memory and Prisma repository adapters selected by `PURESOC_PERSISTENCE_MODE`.

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
- `docs/PLAN_M26.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-013-auth-oidc-social-login-managed-provider-consent.md`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/organizations/**`
- `code/apps/api/src/rbac/**`
- `code/apps/api/src/server.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/contracts/**`
- `code/packages/database/src/repositories/**`
- `code/packages/auth/local/src/**`
- `code/packages/auth/oidc/src/**`
- `code/packages/auth/core/src/**`
- `code/apps/api/src/__tests__/**`

## Goal

Make identity/session/organization/RBAC runtime data persist through the runtime repository set in memory and Prisma modes without changing auth semantics or requiring live PostgreSQL.

## Scope

Expected implementation areas:

- Prisma repository adapters for local auth, OIDC identity lookup/linking, organizations, memberships, roles, and role bindings.
- Memory-mode behavior preserved through the existing in-memory repository or narrower in-memory adapters.
- Runtime repository selection and persistence-context reporting updates.
- Focused repository/API/runtime tests for registration, login/session lookup, logout invalidation, organization creation, member listing, RBAC checks, OIDC provider-subject lookup/linking, and cross-organization rejection.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- OIDC transient authorization state can remain in-memory unless the implementation finds a narrow, tested adapter path.
- Live OIDC provider registration and callback smoke remain out of scope.
- Live PostgreSQL migration/apply smoke remains out of scope unless a later prompt explicitly brings runtime database infrastructure into scope.

Expected files:

- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/organizations/**`
- `code/apps/api/src/rbac/**`
- `code/apps/api/src/__tests__/**`
- `code/packages/database/src/contracts/**`
- `code/packages/database/src/repositories/**`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/__tests__/**`
- `code/packages/auth/local/src/**`
- `code/packages/auth/oidc/src/**`
- `code/packages/auth/core/src/**`
- `docs/PLAN.md`
- `docs/PLAN_M27.md`
- `docs/PLAN_M28.md`
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
- Do not relax password hashing, rate limiting, session revocation, account-linking, email-collision, organization-scope, or role-check semantics.
- Do not persist plaintext passwords, reset tokens, verification tokens, session tokens, OAuth codes, provider secrets, or OIDC nonce/PKCE values.
- Do not broaden role permissions or let frontend checks substitute for backend authorization.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- auth organization rbac session database prisma persistence api
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-036 for identity/session/organization/RBAC runtime persistence in Prisma mode.
- Narrow GAP-041 if identity/org/RBAC persistence semantics receive deterministic API/repository coverage.
- Preserve GAP-032 unless live OIDC provider smoke is explicitly added.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve browser/live integration gaps unless this milestone directly validates them.

## Acceptance Criteria

- Identity/session/organization/RBAC services use explicit runtime-selected repositories.
- Memory mode remains deterministic for existing API tests.
- Prisma mode selects the new adapters and runtime persistence reporting is honest.
- Repository/API tests prove organization-scoped reads and no cross-organization leakage.
- Existing local auth, OIDC linking, organization creation, and RBAC behavior remains compatible.

## Completion Log

Started and completed 2026-05-02.

Implementation results:

- Added `PrismaIdentityOrganizationRbacRepository` for users, identity accounts, local credentials, sessions, reset/verification tokens, organizations, memberships, roles, and role bindings.
- API local auth, OIDC social login, organization service, and RBAC guards now use the runtime-selected identity/RBAC repository.
- Prisma mode now marks `identity_sessions_organizations_rbac` as persisted; OIDC transient state remains memory-backed by design.
- Route-level backend authorization checks now use `services.rbacRepository` instead of the legacy in-memory `services.repository` field.
- Added deterministic fake-Prisma repository tests for hashed secret storage, provider-subject uniqueness, session revocation, membership listing, role bindings, and organization scoping.
- Added API Prisma-mode coverage proving organization creation/member listing and cross-organization RBAC rejection use the Prisma adapter.

Changed files:

- `code/README.md`
- `code/apps/api/src/__tests__/auth-organization-rbac-prisma-persistence.test.ts`
- `code/apps/api/src/__tests__/runtime-persistence.test.ts`
- `code/apps/api/src/actions/routes.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/billing/routes.ts`
- `code/apps/api/src/compliance/nis2/notification-drafts/routes.ts`
- `code/apps/api/src/compliance/routes.ts`
- `code/apps/api/src/dashboards/routes.ts`
- `code/apps/api/src/evidence/routes.ts`
- `code/apps/api/src/organizations/routes.ts`
- `code/apps/api/src/provider-connections/microsoft365/routes.ts`
- `code/apps/api/src/provider-connections/routes.ts`
- `code/apps/api/src/recommendations/routes.ts`
- `code/apps/api/src/regulatory-sources/routes.ts`
- `code/apps/api/src/reports/routes.ts`
- `code/packages/database/src/__tests__/prisma-identity-organization-rbac.repository.spec.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/repositories/identity-organization-rbac.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M27.md`
- `docs/PLAN_M28.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available. Validation used host-node equivalents through `flatpak-spawn --host`.
- `npm run lint` passed. It reported schema drift coverage for 21 models and 331 fields, and Romania generated regulatory drift for 2 artifacts.
- `npm run test -- auth organization rbac session database prisma persistence api` passed: 30 test files, 89 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M27. Identity/session/organization/RBAC services use explicit runtime-selected repositories; memory mode remains deterministic; Prisma mode selects the new adapter and reports persisted identity/org/RBAC contexts honestly; repository/API tests cover organization-scoped reads and cross-organization rejection; existing local auth, OIDC linking, organization creation, and RBAC behavior remains compatible.

Gaps updated:

- GAP-036 narrowed for identity/session/organization/RBAC runtime persistence selection in Prisma mode.
- GAP-041 narrowed for deterministic identity/session/organization/RBAC repository and API runtime semantics.
- GAP-032 remains open; no live OIDC provider smoke was added.
- GAP-030 remains open; no provider write/remediation execution was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 26 / PLAN_M27 complete and stages Prompt 27 / PLAN_M28.
- `docs/PLAN_M28.md` created for Audit Log Persistence Sink Slice.

Residual risk:

- Live PostgreSQL migration/apply smoke remains deferred; Prisma adapters were validated with deterministic fake delegates and schema validation only.
- Audit logs, provider connections/telemetry, and OIDC transient state remain memory-backed in Prisma mode.
- The database adapter structurally mirrors auth/org/RBAC contracts without importing auth packages directly, avoiding workspace dependency churn but requiring future contract changes to keep the adapter shape aligned.
