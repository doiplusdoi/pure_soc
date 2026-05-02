# M41 Plan: Audit WORM Export And External Checkpoint Operations Prep Slice

## Summary

Implement the next active prompt after M40: further narrow GAP-039 by preparing audit export/checkpoint operations for immutable or externally anchored deployments while keeping the current database-only guarantees honest.

Status: staged for implementation after M40.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M40.md`
- `docs/threat-model.md`
- `code/packages/audit/src/**`
- `code/apps/api/src/audit/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/packages/database/src/repositories/audit.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/evidence/src/**`
- `code/packages/config/src/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Narrow GAP-039 with explicit audit export handoff contracts, checkpoint/export retention metadata, provider status reporting, redaction checks, and operator documentation for future WORM/object-storage exports and external signing or notarization.

## Scope

Expected implementation areas:

- Audit export/checkpoint metadata and API response guarantees.
- Optional local/test-only export artifact writer or handoff contract.
- Redaction, hash-chain verification, and organization-scoping tests.
- Documentation for real immutable storage, external anchor providers, legal hold/deletion, and verification alerting.
- Gap register, prompt handoff, and next milestone stub updates.

Locked assumptions:

- Current audit checkpoints remain database-only unless a real immutable/external provider is implemented and tested.
- No live object storage, external timestamping, signer, KMS/HSM, cloud API, Microsoft Graph, Stripe, OIDC provider, or provider-write path is called by default.
- Audit export responses must continue to avoid secrets and unsupported legal/compliance claims.

Expected files:

- `code/package.json`
- `code/packages/audit/src/**`
- `code/apps/api/src/audit/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/packages/database/src/repositories/audit.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/evidence/src/**`
- `code/packages/config/src/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M41.md`
- `docs/PLAN_M42.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not claim WORM storage, external notarization, legal certification, or database-admin-proof auditability unless the implementation actually provides and tests it.
- Do not call live Microsoft Graph, Stripe, OIDC providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, or public regulatory URLs.
- Do not enable live provider write/remediation actions, Microsoft write scopes, or provider-token production custody claims.
- Do not weaken audit redaction, hash-chain verification, organization scoping, auth/session safeguards, origin/rate-limit middleware, regulatory no-auto-activation rules, evidence storage-pointer redaction, or legal caveat enforcement.
- Do not introduce destructive retention/deletion behavior or irreversible local file writes outside `/tmp` without explicit approval.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit api rbac evidence health
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-039 for explicit audit export/checkpoint operational metadata, export handoff contracts, and non-WORM/non-notarized guarantees.
- Preserve GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-040, and GAP-043 unless those hardening areas are intentionally implemented and accepted.

## Acceptance Criteria

- Audit export/checkpoint responses remain organization-scoped and redacted.
- Export/checkpoint verification failure modes are deterministic and covered by tests.
- Provider/status metadata distinguishes database-only, pending immutable export, externally anchored, and failed states without overclaiming.
- Documentation clearly states operator-owned WORM storage, external signing/notarization, retention/legal hold, and verification alerting responsibilities.
- Prompt and gap handoff docs are updated and `docs/PLAN_M42.md` is created.

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

- Pending. M41 implementation must create `docs/PLAN_M42.md` before final response.

Residual risk:

- Pending.
