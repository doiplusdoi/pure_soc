# M33 Plan: Audit WORM Export And External Checkpoint Planning Slice

## Summary

Implement Prompt 32 from `docs/codex-prompts.md`: narrow GAP-039 by adding an audit export/checkpoint contract that makes the current tamper-evident audit hash chain easier to verify and export without claiming WORM storage or external notarization exists yet.

Status: staged for implementation after M32.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M32.md`
- `docs/threat-model.md`
- `code/packages/audit/src/**`
- `code/packages/database/src/**`
- `code/apps/api/src/**`
- `code/config/defaults/**`
- `code/package.json`
- `code/README.md`
- `code/tests/**`

## Goal

Add a bounded audit export/checkpoint foundation that can serialize and verify organization/global audit chain segments with redacted canonical payloads, hash anchors, exported-at metadata, and verification status, while preserving honest product claims about what is and is not WORM or externally signed.

## Scope

Expected implementation areas:

- Audit export/checkpoint data contracts under `@puresoc/audit` or an adjacent existing boundary.
- Deterministic verification helpers for intact, missing-row, tampered-payload, broken-link, and wrong-terminal-checkpoint scenarios.
- Repository or service boundaries for recording/exporting audit checkpoints where appropriate.
- Documentation in `code/README.md`, `docs/implementation-gaps.md`, and milestone/prompt handoff docs.

Locked assumptions:

- Existing audit hash-chain metadata is tamper-evident only.
- This milestone may create an export/checkpoint contract without adding object-storage WORM, external signing, KMS/HSM, or legal certification claims.
- Provider write/remediation execution remains disabled until GAP-030 is intentionally addressed.
- Live Microsoft Graph, Stripe, OIDC providers, MinIO/S3, scanner, public regulatory URL, KMS, browser runtime, and provider writes remain out of scope.

Expected files:

- `code/package.json`
- `code/packages/audit/src/**`
- `code/packages/database/src/**`
- `code/apps/api/src/**`
- `code/config/defaults/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M33.md`
- `docs/PLAN_M34.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not enable provider write/remediation execution.
- Do not claim database hash chains are WORM storage, legal evidence certification, external notarization, or proof against a database administrator rewriting all rows.
- Do not add live Microsoft Graph, Stripe, OIDC-provider, MinIO/S3, scanner, public regulatory URL, KMS, browser, or provider-write dependencies.
- Do not expose sensitive audit payload values or internal storage URIs in exports.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, or regulatory no-auto-activation rules.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit database api auth organization rbac evidence reports
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Close or narrow GAP-039 for audit export/checkpoint contracts.
- Preserve GAP-030 unless remediation worker/provider execution safety is explicitly implemented and accepted in a later prompt.
- Preserve GAP-040 unless KMS/key rotation smoke is intentionally added.
- Preserve GAP-043 unless production queue orchestration hardening is intentionally added.

## Acceptance Criteria

- Audit export/checkpoint contracts are deterministic and organization/global chain aware.
- Verification helpers detect intact and broken/tampered exported audit segments.
- Documentation clearly distinguishes hash-chain exports from WORM storage and external signing.
- No sensitive payload values, storage URIs, provider tokens, OAuth values, cookies, or session secrets are exposed.
- Gap and prompt handoff docs honestly describe what remains deferred.

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

- Pending. M33 implementation must create `docs/PLAN_M34.md` before final response.

Residual risk:

- Pending.
