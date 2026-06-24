# M98 Plan: Product MVP Remaining Destructive Semantics

## Summary

M98 should continue GAP-050 after PLAN_M97. The product facade now has real persisted workspace, gap, report download, Microsoft local disconnect, callback, and remediation alias behavior. The remaining unsafe facade operation is evidence deletion, with optional Microsoft provider-side revocation proof if the implementation can stay honest and local-testable.

Status: staged.
Created: 2026-06-24.

## Intended Scope

- Design and implement product-safe evidence deletion or retention behavior for `DELETE /api/evidence/:evidenceId`.
- Preserve auditability through tombstone, retention, legal-hold, access-log, and object-storage semantics instead of hard-delete shortcuts.
- Add memory and Prisma repository support only where existing evidence contracts are insufficient.
- Optionally add Microsoft provider-side revocation proof or a first-class manual revocation handoff if live/provider-side revocation cannot be safely tested locally.

## Expected Files

- `code/apps/api/src/product/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/product-mvp-facade.test.ts`
- `code/packages/evidence/src/index.ts`
- `code/packages/database/src/repositories/evidence.ts`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`
- `docs/codex-prompts.md`

## Negative Constraints

- Do not hard-delete evidence without retention, tombstone/legal-hold, authorization, audit, and storage behavior.
- Do not delete or mutate evidence generated as report exports unless product policy explicitly allows it.
- Do not claim Microsoft Entra consent/token revocation unless the code actually performs or proves that provider-side operation.
- Do not enable Microsoft configuration writes, remediation writes, DNSC submission, live external calls, or legal/certification claims.

## Validation Plan

Run from `code/`:

```sh
node_modules/.bin/tsc -p tsconfig.base.json --noEmit
node scripts/check-layout.mjs
node_modules/.bin/jiti scripts/check-schema-contract-drift.ts
node_modules/.bin/jiti scripts/check-generated-regulatory-drift.ts
node_modules/.bin/vitest run apps/api/src/__tests__/product-mvp-facade.test.ts packages/evidence/src/__tests__/evidence-vault.spec.ts
node_modules/.bin/vitest run
git diff --check
```

Run `npm run demo:seed` and `npm run demo:verify` only when `DATABASE_URL` is configured for a disposable/local database.

## Acceptance Criteria

- Evidence delete returns a real policy-backed result or remains blocked with a customer-safe reason.
- Deletion/tombstone behavior is organization-scoped, role-checked, audited, and covered in memory plus Prisma-relevant tests.
- Generated-report evidence, legal holds, and retained artifacts cannot disappear silently.
- Microsoft revocation behavior is either truly provider-side and tested through an approved harness, or explicitly documented as manual handoff.
