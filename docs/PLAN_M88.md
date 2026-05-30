# M88 Plan: Recursive Gap Implementation Runner

## Summary

M88 implements one recursive local auth/product-hardening slice after M87 and stages the next recursive milestone.

Status: completed.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Gap Slice

M88 selects a public signup/auth hardening slice for GAP-046: owner/org-admin managed organization invitations with hashed invitation tokens, local injected delivery for tests, verified-email acceptance, RBAC checks, and audit events.

Why this is unblocked:

- GAP-046 explicitly leaves owner-managed invitations and role assignment open.
- The slice can be implemented with local API, memory repository, Prisma-boundary repository, schema/migration, and tests.
- It does not require choosing open versus invite-only registration, adding a real email delivery provider, enforcing broad verified-email launch policy, adding platform-admin recovery operations, running external targets, or touching Romania legal copy.

## Expected Files

- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260530010000_organization_invitations/migration.sql`
- `code/packages/database/src/contracts/schema-groups.ts`
- `code/packages/database/src/repositories/identity-organization-rbac.ts`
- `code/packages/database/src/__tests__/prisma-identity-organization-rbac.repository.spec.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/organizations/service.ts`
- `code/apps/api/src/organizations/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/auth-organization-rbac-audit-session.test.ts`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M88.md`
- `docs/PLAN_M89.md`

## Negative Constraints

- Do not implement more than one slice.
- Do not mark Romania legal logic active.
- Do not add approved Romanian legal/regulatory copy without exact product/legal text.
- Do not add direct DNSC or national-authority submission.
- Do not claim certified, guaranteed, or legally approved compliance.
- Do not add Microsoft/provider write scopes or remediation execution.
- Do not run live external integrations without selector-first disposable/test guardrails and explicit approval.
- Keep application code, tests, Compose files, runtime config, and regulatory data under `code/`.

## Validation

Run from `code/`:

```txt
npm run prisma:generate
npm run test -- auth organization rbac audit web
npm run test -- drift
npm run lint
git diff --check
```

Expected gap movement:

- GAP-046 narrows for local owner/org-admin invitation creation, secret-free token delivery, verified-email acceptance, organization membership/role assignment, and audit coverage.
- GAP-046 remains open for choosing open versus invite-only registration, real email delivery, broad verified-email enforcement policy, platform-admin bootstrap/recovery, and public abuse operations.

## Actual Implementation

Status: completed 2026-05-30.

Changed files:

- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260530010000_organization_invitations/migration.sql`
- `code/packages/database/src/contracts/schema-groups.ts`
- `code/packages/database/src/repositories/identity-organization-rbac.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/packages/database/src/__tests__/prisma-identity-organization-rbac.repository.spec.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/organizations/service.ts`
- `code/apps/api/src/organizations/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/auth-organization-rbac-audit-session.test.ts`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M88.md`
- `docs/PLAN_M89.md`

Implemented behavior:

- Added `OrganizationInvitation` persistence with hashed token storage, organization/email/status index, and selected schema drift coverage.
- Added no-op and in-memory organization invitation delivery ports; real email delivery remains deferred.
- Added API `POST /organizations/:orgId/invitations` for owners/org admins with verified email.
- Added API `POST /organizations/:orgId/invitations/accept` for authenticated users whose verified email matches the invitation.
- Acceptance creates or reactivates the organization membership, binds the invited role, marks the invitation accepted, and audits `member_invited`, `member_invitation_accepted`, and `role_changed` without logging plaintext tokens.
- Inviteable roles are deliberately limited to non-owner/non-regulatory-admin roles until a broader product/admin policy exists.

## Validation Results

Commands run from `code/`:

```txt
npm run prisma:generate
passed

npm run test -- auth organization rbac audit web
initial sandbox run failed because local API tests hit `listen EPERM`

npm run test -- auth organization rbac audit web
passed outside the sandbox, 17 files / 83 tests

npm run test -- drift
passed, 1 file / 9 tests

npm run lint
passed; schema drift check covered 35 models / 505 fields and regulatory drift check covered 3 artifacts

git diff --check
passed
```

## Acceptance Status

Accepted for this local owner-managed organization invitation slice.

No real email provider, invite-only registration policy, served invite management UI, platform-admin bootstrap, external call, DNSC submission, provider write path, legal activation, or certification claim was added.

## Gap Movement

- GAP-046 narrowed for local owner/org-admin invitation creation, verified-email invitation creation/acceptance, hashed invitation token storage, membership/role assignment, audit coverage, and selected schema drift coverage.
- GAP-046 remains open for real email delivery, open-vs-invite-only launch policy, served invite UX, broader privileged-action email-verification policy, platform-admin bootstrap/recovery, and public abuse operations.

## Residual Risk

The invitation API is suitable for local/test contract proof, but the product is still not broad public SaaS ready. Production needs real email delivery, product-approved registration policy, invite UX, platform-admin recovery, and abuse monitoring/rate-limit operations.

## Next Staged Milestone

`docs/PLAN_M89.md` is staged as the next recursive gap implementation runner.
