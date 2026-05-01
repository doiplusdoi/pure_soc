# M21 Plan: Audit Log Integrity And Provider Key Handling

## Summary

Implement Prompt 20 from `docs/codex-prompts.md`: add an audit-log integrity baseline and harden provider-token key handling without enabling provider write actions.

Status: staged for implementation after M20.
Created: 2026-05-01.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/threat-model.md`
- `docs/claude_rec2.md`
- `docs/PLAN_M20.md`
- `docs/adr/ADR-009-microsoft-graph-permission-bundles.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-013-auth-oidc-social-login-and-managed-provider-consent-boundaries.md`

## Goal

Make audit records tamper-evident at the package/contract level and remove remaining provider-token key ambiguity before runtime hardening proceeds.

## Scope

Expected implementation areas:

- Audit hash-chain metadata and deterministic canonical payload construction.
- In-memory audit sink support for previous/entry hash metadata and tamper-detection tests.
- Redaction-sensitive audit hashing tests proving secrets do not enter canonical payloads.
- Provider token key configuration hardening, including key IDs or a key-ring boundary if feasible.
- Microsoft 365 token cipher tests for active and previous key behavior if the cipher format changes.
- Prisma schema/migration metadata for audit integrity fields if it fits the slice cleanly.
- Documentation and gap updates that clearly separate tamper-evident hashes from WORM storage, external signing, KMS custody, or legal certification.

Expected files:

- `code/.env.example`
- `code/config/defaults/connectors.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/audit/src/index.ts`
- `code/packages/audit/src/__tests__/*.spec.ts`
- `code/packages/providers/microsoft365/src/crypto.ts`
- `code/packages/providers/microsoft365/src/__tests__/*.spec.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/**` if schema fields are added
- `README.md`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M21.md`
- `docs/PLAN_M22.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not weaken audit redaction or add sensitive data to canonical hashes.
- Do not claim tamper-proof or legally certified audit logs.
- Do not require external KMS/HSM or WORM storage in this milestone.
- Do not break existing audit sink APIs unless all callers and tests are updated.
- Do not invalidate existing local-dev provider token behavior outside production/startup validation unless tests and docs explain the migration.
- Do not add provider write/remediation execution.
- Do not add Microsoft-specific logic outside Microsoft provider/config surfaces.
- Do not make legal certification claims.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit encryption provider microsoft365 config auth
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow or resolve the audit-log integrity risk from REC-109.
- Narrow or resolve provider-token default-key/key-rotation risk from REC-119.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve runtime/browser/live integration gaps unless M21 directly validates them.
- Create or update gaps for WORM storage, external signing/KMS, audit retention/export, or live key-rotation smoke intentionally deferred.

## Acceptance Criteria

- Audit records include deterministic integrity metadata without exposing secrets.
- Tests can detect tampering or broken chain continuity in the in-memory audit harness.
- Provider token key behavior is explicit in config and tests.
- Production startup still rejects unsafe provider-token key settings.
- Existing auth/provider/audit tests keep passing.

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

- Pending. M21 implementation must create `docs/PLAN_M22.md` before final response.

Residual risk:

- Pending.
