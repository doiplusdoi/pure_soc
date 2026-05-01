# M29 Plan: Provider Connection And Telemetry Persistence Adapter Slice

## Summary

Implement Prompt 28 from `docs/codex-prompts.md`: move provider connection metadata and read-only provider telemetry behind explicit memory and Prisma provider stores selected by `PURESOC_PERSISTENCE_MODE`.

Status: staged for implementation after M28.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M28.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- `docs/adr/ADR-006-provider-interface-and-resource-lifecycle-versioning.md`
- `docs/threat-model.md`
- `code/packages/providers/core/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/apps/api/src/provider-connections/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/server.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/repositories/**`
- `code/packages/database/src/index.ts`
- `code/apps/api/src/__tests__/**`
- `code/packages/database/src/__tests__/**`

## Goal

Make provider connection state and read-only provider telemetry persist through the runtime repository set in memory and Prisma modes while preserving provider-neutral contracts, organization scoping, idempotency, and existing no-live-write behavior.

## Scope

Expected implementation areas:

- Prisma provider resource store implementing the existing `ProviderResourceStore` contract.
- Runtime provider store selection in `createApiServices()` for provider connection APIs, Microsoft 365 connection APIs, and compliance evaluation inputs.
- Deterministic fake-Prisma store tests for connections, credentials, permission bundles, capabilities, sync runs/modules, raw resources, normalized resources, findings, recommendations, idempotent upserts, and cross-organization rejection.
- API/runtime tests proving mock provider connection creation, sync telemetry, findings/recommendations, module status reads, and cross-organization rejection use the Prisma store in Prisma mode.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- Provider write/remediation execution remains disabled and out of scope.
- Provider credentials must already be encrypted/redacted before persistence; this milestone must not introduce plaintext provider secret storage.
- OIDC transient callback state can remain memory-backed unless implementation finds a narrow, tested adapter path and updates the prompt/gap register explicitly.
- Live PostgreSQL migration/apply smoke and live Microsoft Graph calls remain out of scope.

Expected files:

- `code/packages/providers/core/src/**`
- `code/packages/providers/core/src/__tests__/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/provider-connections/**`
- `code/apps/api/src/provider-connections/microsoft365/**`
- `code/apps/api/src/__tests__/**`
- `code/packages/database/src/repositories/**`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/__tests__/**`
- `docs/PLAN.md`
- `docs/PLAN_M29.md`
- `docs/PLAN_M30.md`
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
- Do not request or enable Microsoft write scopes.
- Do not persist plaintext provider tokens, refresh tokens, client secrets, authorization codes, cookies, reset tokens, verification tokens, session tokens, or OIDC nonce/PKCE values.
- Do not weaken provider redaction, organization scoping, idempotent resource upserts, module-level degradation, or no-live-write guards.
- Do not put Microsoft-specific logic into generic provider or compliance packages.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- provider microsoft365 connector database prisma persistence api auth organization rbac audit compliance recommendations
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-036 for provider connection and telemetry runtime persistence in Prisma mode.
- Narrow GAP-041 if provider persistence semantics receive deterministic API/repository coverage.
- Preserve GAP-007 and GAP-033 unless live Microsoft docs are intentionally revalidated and fixture-backed scope changes are made.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve live database/browser/provider integration gaps unless this milestone directly validates them.

## Acceptance Criteria

- Provider connection APIs and Microsoft 365 provider connection APIs use the runtime-selected provider store.
- Memory mode remains deterministic for existing provider/API tests.
- Prisma mode selects the new provider store and runtime persistence reporting is honest.
- Repository/API tests prove organization-scoped provider state reads and no cross-organization leakage.
- Existing provider-neutral mock and Microsoft read-only behavior remains compatible, including module-level degradation and no-live-write guards.

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

- Pending. M29 implementation must create `docs/PLAN_M30.md` before final response.

Residual risk:

- Pending.
