# M38 Plan: Provider Token Secret-Manager Custody Contract And Rotation Runbook Slice

## Summary

Implement the next active prompt after M37: narrow GAP-040 by making provider-token custody and rotation more production-shaped without claiming live KMS/secret-manager custody.

Status: staged for implementation after M37.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M37.md`
- `docs/threat-model.md`
- `docs/microsoft365-permissions.md`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/packages/providers/core/src/**`
- `code/apps/worker/src/**`
- `code/config/defaults/**`
- `code/package.json`
- `code/README.md`
- `code/tests/**`

## Goal

Add explicit provider-token key-custody provider contracts, deterministic fake/test custody behavior, rotation/backfill planning metadata, and operator runbook documentation while preserving the current `local-env-key-ring` behavior.

## Scope

Expected implementation areas:

- Microsoft 365 provider-token custody provider status/capability metadata.
- Deterministic fake/test secret-manager custody provider behavior without live external calls.
- Config validation for supported/unsupported custody providers and production safety.
- Rotation/backfill runbook metadata for staged previous-key windows, rollback, and key retirement.
- Tests for secret-free summaries, active/previous decrypt, missing-key failure, unsupported provider rejection, and no provider writes.
- Documentation in `code/README.md`, gap register, current milestone, and prompt handoff docs.

Locked assumptions:

- `local-env-key-ring` remains the default provider-token custody provider.
- No live KMS/HSM/secret-manager/cloud APIs are called in this slice.
- GAP-040 can be narrowed by contracts, fake custody behavior, and runbook metadata but remains open for real custody/deployed rotation/backfill.
- GAP-030, GAP-039, and GAP-043 remain out of scope unless explicitly selected later.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/packages/providers/core/src/**`
- `code/apps/worker/src/**`
- `code/config/defaults/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M38.md`
- `docs/PLAN_M39.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not call live KMS/HSM/secret-manager/cloud APIs, Microsoft Graph, Stripe, OIDC providers, object storage, scanners, or public regulatory URLs.
- Do not store plaintext provider tokens, OAuth codes, client secrets, key material, or decrypted credential payloads in logs, API responses, test snapshots, or smoke output.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, regulatory no-auto-activation rules, provider-token previous-key decrypt behavior, or provider-write startup disablement.
- Do not enable live provider write/remediation actions or Microsoft write scopes.
- Do not claim KMS/secret-manager custody, deployed rotation, ciphertext backfill, or customer production readiness unless a real accepted implementation exists.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config provider microsoft365 encryption api audit worker actions
pnpm provider-token:smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-040 for provider-token custody contracts, deterministic fake secret-manager behavior, and operator rotation/backfill runbook metadata.
- Preserve GAP-030 unless live provider write execution is explicitly implemented and accepted.
- Preserve GAP-039 unless audit WORM/external signing is explicitly implemented and accepted.
- Preserve GAP-043 unless deployed multi-container queue orchestration is explicitly implemented and accepted.

## Acceptance Criteria

- Provider-token custody providers expose explicit status/capability metadata without leaking key material.
- Default local env key-ring behavior and previous-key decrypt support remain intact.
- Deterministic fake/test custody provider proves rotation-readiness metadata without live external services.
- Production startup still rejects unsafe local-dev provider-token keys and unsupported custody providers.
- Smoke/test output remains secret-free and no provider writes or live Graph calls occur.
- Gap and prompt handoff docs honestly describe remaining real KMS/secret-manager custody, deployed rotation, backfill, rollback, and operator work.

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

- Pending. M38 implementation must create `docs/PLAN_M39.md` before final response.

Residual risk:

- Pending.
