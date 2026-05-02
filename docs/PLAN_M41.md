# M41 Plan: Audit WORM Export And External Checkpoint Operations Prep Slice

## Summary

Implement the next active prompt after M40: further narrow GAP-039 by preparing audit export/checkpoint operations for immutable or externally anchored deployments while keeping the current database-only guarantees honest.

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

Started 2026-05-02.

Implementation approach:

- Inspect the existing audit export/checkpoint contracts, API routes, Prisma metadata, config, and tests before changing behavior.
- Add only deterministic local/database-only handoff metadata unless the existing code already has a safe test-only writer surface.
- Preserve redacted exports, organization-scoped access, database-only checkpoint guarantees, and no live external service calls.

Implementation results:

- Added `AuditExportHandoff` metadata to audit export segments and checkpoint records.
- Handoff states now distinguish `database_only`, `worm_export_pending`, `externally_anchored`, and `external_anchor_failed` without changing non-WORM/non-notarized guarantees.
- Checkpoint recording now preserves failed external-anchor attempts as checkpoints with generic secret-free failure metadata instead of returning provider error text.
- API checkpoint recording validates handoff guarantees and includes handoff status in the audit event summary.
- Prisma checkpoint repository reads compute handoff metadata from persisted checkpoint/provider/guarantee fields without adding a schema migration.
- Documentation now explains operator-owned immutable export, real external signing/notarization, legal hold/deletion, retry, and verification alerting responsibilities.

Changed files:

- `code/README.md`
- `code/apps/api/src/__tests__/audit-export-checkpoints.test.ts`
- `code/apps/api/src/audit/routes.ts`
- `code/packages/audit/src/__tests__/audit-integrity.spec.ts`
- `code/packages/audit/src/index.ts`
- `code/packages/database/src/__tests__/prisma-audit.repository.spec.ts`
- `code/packages/database/src/repositories/audit.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M41.md`
- `docs/PLAN_M42.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm`/sandbox-local `npm` were unavailable, so validation used host-node/npm equivalents through `flatpak-spawn --host`.
- `npm run lint` passed.
- `npm run test -- audit api rbac evidence health` passed: 27 files, 86 tests.
- `npm run test -- audit` passed as a focused pre-check: 7 files, 28 tests.
- `npm run test:e2e -- --grep @ui-smoke` passed and wrote deterministic HTML snapshots under `/tmp/puresoc-ui-smoke-*`.
- Sandbox-local `docker` was unavailable, so Compose validation used the host Docker CLI through `flatpak-spawn --host`.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M41. The slice adds deterministic handoff/runbook state and failed-anchor handling while preserving redaction, organization scoping, database-only guarantees, and no-live-external-call behavior.

Gaps updated:

- GAP-039 narrowed for explicit audit export handoff states, failed-anchor checkpoint preservation, and operator-owned immutable/export/signing responsibility metadata without claiming WORM storage, external notarization, legal certification, or database-admin-proof auditability.
- GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-040, and GAP-043 preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 40 / PLAN_M41 complete and stages Prompt 41 / PLAN_M42 for external integration smoke readiness matrix and guardrails.
- `docs/PLAN_M42.md` was created from the staged M42 prompt.

Residual risk:

- Audit checkpoints remain database/tamper-evident metadata only. There is still no WORM/object-storage audit export writer, real external signing/notarization provider, database-admin-proof auditability, legal certification, legal-hold/deletion workflow, or production verification alerting.
- Persisted audit chain concurrency semantics remain release-hardening work.
- Live Microsoft Graph, Stripe, OIDC provider, object-storage/scanner, KMS/secret-manager, public regulatory, and provider-write smokes remain deferred.
