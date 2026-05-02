# M37 Plan: Audit Export Retention And External Checkpoint Contract Slice

## Summary

Implement the next active prompt after M36: narrow GAP-039 by making audit export/checkpoint operations more production-shaped without claiming WORM storage, external notarization, legal certification, or protection against a database administrator rewriting all rows.

Status: staged for implementation after M36.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M36.md`
- `docs/threat-model.md`
- `code/packages/audit/src/**`
- `code/packages/database/src/**`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/packages/evidence/src/**`
- `code/config/defaults/**`
- `code/package.json`
- `code/README.md`
- `code/tests/**`

## Goal

Add explicit audit export/checkpoint operations contracts for retention/export policy metadata and external checkpoint provider status, using deterministic fake/local adapters only.

## Scope

Expected implementation areas:

- Audit export/checkpoint contract metadata for retention/export policy and external-anchor state.
- `none` and deterministic fake external checkpoint providers.
- Persistence/API exposure for anchor metadata while preserving database-only guarantees by default.
- Tests for redacted exports, fake anchors, no-provider guarantees, retention metadata, organization scoping, tamper detection, and secret-free payloads.
- Documentation in `code/README.md`, gap register, current milestone, and prompt handoff docs.

Locked assumptions:

- Current database-only checkpoints remain honest and non-WORM unless an explicit fake/test provider is injected.
- No live external signing, notarization, KMS/HSM, cloud WORM, object-storage, or MinIO/S3 services are called.
- GAP-039 can be narrowed by contracts and fake adapters but remains open for true WORM/external notarization operations.
- GAP-030, GAP-040, and GAP-043 remain out of scope unless explicitly selected later.

Expected files:

- `code/package.json`
- `code/packages/audit/src/**`
- `code/packages/database/src/**`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/packages/evidence/src/**`
- `code/config/defaults/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M37.md`
- `docs/PLAN_M38.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not claim audit rows are WORM, externally notarized, legally certified, or database-admin-proof unless a real accepted implementation exists.
- Do not call live external signing, timestamping, KMS/HSM, object-storage WORM, MinIO/S3, or cloud APIs.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, provider-token custody, regulatory no-auto-activation rules, or provider-write startup disablement.
- Do not broaden into Stripe, OIDC, browser UI, Microsoft Graph, provider writes, public regulatory fetches, or queue runtime work.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit api database config evidence reports exports rbac
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-039 for audit export/checkpoint retention and external-anchor contracts.
- Preserve GAP-030 unless live provider write execution is explicitly implemented and accepted.
- Preserve GAP-040 unless live KMS/secret-manager custody is explicitly implemented and accepted.
- Preserve GAP-043 unless deployed multi-container queue orchestration is explicitly implemented and accepted.

## Acceptance Criteria

- Audit export/checkpoint operations expose retention/export policy metadata and external checkpoint status.
- Default/no-provider mode remains explicitly database-only and non-WORM/non-notarized.
- Fake external checkpoint provider metadata is deterministic and testable without live services.
- Export/checkpoint payloads remain redacted, organization-scoped, and secret-free.
- Gap and prompt handoff docs honestly describe remaining WORM/external signing work.

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

- Pending. M37 implementation must create `docs/PLAN_M38.md` before final response.

Residual risk:

- Pending.
