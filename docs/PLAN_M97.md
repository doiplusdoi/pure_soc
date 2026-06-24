# M97 Plan: Product MVP Facade Hardening

## Summary

M97 hardens the canonical product MVP facade created on 2026-06-24. The user asked for the full product MVP rather than a plan; the safe local slice is to replace facade placeholders with real persisted flows where existing repository/service semantics already exist, and keep destructive operations explicit where the repo still lacks retention or revocation contracts.

Status: completed for this bounded facade-hardening slice.
Created: 2026-06-24.

## Intended Scope

- Implement real `PATCH /api/workspaces/:workspaceId` backed by the organization repository.
- Implement real `PATCH /api/gaps/:gapId` against the latest stored analysis, including matching readiness-plan item status/owner/due-date updates where possible.
- Implement Microsoft 365 product disconnect as a persisted local disable/revoke state with honest manual provider-revocation guidance, not a fake token-revocation claim.
- Implement product remediation `preview`, `approve`, and `execute` aliases by delegating to the existing action lifecycle.
- Implement `GET /api/reports/:reportId/download` by delegating to stored generated-report PDF rendering.
- Keep `DELETE /api/evidence/:evidenceId` unsupported until evidence retention/delete/object-storage semantics exist.

## Expected Files

- `code/apps/api/src/product/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/product-mvp-facade.test.ts`
- `code/apps/api/src/organizations/service.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/packages/database/src/repositories/identity-organization-rbac.ts`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`
- `docs/codex-prompts.md`

## Negative Constraints

- Do not fake Microsoft token revocation or evidence deletion.
- Do not enable Microsoft provider writes.
- Do not bypass action preflight, approval, queue safety checks, audit, or RBAC.
- Do not expose internal provider/OAuth route names or Prisma model names in product facade responses.
- Do not add broad schema migrations unless the existing repository contracts cannot support the slice.

## Validation Plan

Run from `code/`:

```sh
node_modules/.bin/tsc -p tsconfig.base.json --noEmit
node scripts/check-layout.mjs
node_modules/.bin/jiti scripts/check-schema-contract-drift.ts
node_modules/.bin/jiti scripts/check-generated-regulatory-drift.ts
node_modules/.bin/vitest run apps/api/src/__tests__/product-mvp-facade.test.ts
npm run demo:seed
npm run demo:verify
git diff --check
```

Run broader tests if focused validation exposes shared contract risk.

## Acceptance Criteria

- Product facade update/download/remediation aliases are backed by persisted state or existing lifecycle services.
- Unsupported evidence deletion remains explicit and honest.
- Focused tests prove no internal route-name/jargon leak and no fake success for unsupported destructive flows.

## Actual Changes

- `code/apps/api/src/server.ts` now parses JSON bodies for `PATCH` requests and routes the Microsoft 365 product callback through the product facade.
- `code/apps/api/src/product/routes.ts` now implements persisted workspace updates, gap/readiness-plan updates, Microsoft 365 consent callback, local Microsoft 365 disconnect, generated-report PDF download, and remediation preview/approve/execute aliases.
- `code/apps/api/src/organizations/service.ts`, `code/apps/api/src/auth/memory-repository.ts`, and `code/packages/database/src/repositories/identity-organization-rbac.ts` now support organization profile updates in memory and Prisma modes.
- `code/apps/api/src/provider-connections/microsoft365/service.ts`, `code/packages/providers/core/src/storage.ts`, and `code/packages/database/src/repositories/provider-resources.ts` now support local provider connection state updates used by disconnect.
- `code/apps/api/src/__tests__/product-mvp-facade.test.ts` now covers canonical product workspace/gap/report flows, the product Microsoft callback/disconnect flow, connector-hub language, and remediation aliases that do not fake execution success.

## Validation Results

Passed from `code/`:

```sh
node_modules/.bin/tsc -p tsconfig.base.json --noEmit
node scripts/check-layout.mjs
node_modules/.bin/jiti scripts/check-schema-contract-drift.ts
node_modules/.bin/jiti scripts/check-generated-regulatory-drift.ts
node_modules/.bin/vitest run apps/api/src/__tests__/product-mvp-facade.test.ts
node_modules/.bin/vitest run
git diff --check
```

Blocked by missing local database configuration:

```sh
npm run demo:seed
npm run demo:verify
```

Both demo commands failed before app logic with Prisma `DATABASE_URL` missing.

## Residual Risk And Deferred Work

- This is not the full product MVP. It narrows the product facade update/download aliases that were explicitly deferred in GAP-050.
- Microsoft 365 disconnect is a local revoke/read-disable/write-disable state plus manual provider-revocation guidance. It does not revoke consent in Microsoft Entra.
- Evidence delete remains unsupported until retention policy, tombstone/audit semantics, and object-storage deletion or legal-hold behavior are designed and tested.
- Remediation `execute` still delegates to the existing safety lifecycle and can correctly reject runs that lack pre-state snapshots or write gates.
