# M48 Plan: Provider-Token Custody Deployment Readiness And Runbook Slice

## Summary

Implement the next active prompt after M47: harden the provider-token custody deployment readiness story for Microsoft 365 credentials without calling live KMS/HSM/secret-manager/cloud APIs or enabling provider writes.

Status: staged for implementation after M47.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M47.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/packages/providers/microsoft365/src/crypto.ts`
- `code/packages/providers/microsoft365/src/rotation-runbook.ts`
- `code/packages/providers/microsoft365/src/rotation-smoke.ts`
- `code/packages/providers/microsoft365/src/readiness.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/microsoft365/src/__tests__/**`
- `code/scripts/provider-token-rotation-smoke.ts`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a deterministic provider-token custody deployment readiness/runbook slice that helps operators choose and validate the current supported custody posture (`local-env-key-ring`) versus future KMS/secret-manager custody, while remaining secret-free and dry-run/local-only by default.

## Scope

Expected implementation areas:

- Provider-token custody deployment readiness metadata and/or command output for local/in-a-box/SaaS target kinds.
- Stricter operator-facing blockers for production use of unsupported custody providers, checked-in local-dev keys, duplicate/reused key material, missing key IDs, and unsafe previous-key windows.
- Rotation/backfill runbook metadata that distinguishes smoke verification, previous-key staging, ciphertext backfill planning, rollback expectations, and deferred live KMS custody.
- Tests proving output redaction, production-safety blockers, local/test fake provider behavior, and no provider-token/key-material leakage.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- `local-env-key-ring` remains the only real implemented custody provider in this repository.
- `fake-secret-manager-test` remains deterministic and test-only.
- Production KMS/HSM/secret-manager/cloud adapters remain deferred unless this prompt explicitly implements a no-live-call interface boundary only.
- Provider write execution and Microsoft Graph writes remain disabled.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/scripts/provider-token-rotation-smoke.ts`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M48.md`
- `docs/PLAN_M49.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

## Negative Constraints

- Do not call KMS/HSM/secret-manager/cloud APIs, Microsoft Graph, OIDC/OAuth providers, Stripe, object storage, scanners, browser/PDF services, public regulatory URLs, external timestamp/signing services, or provider write executors.
- Do not enable live provider writes, Microsoft Graph write/remediation actions, or customer-impacting token backfill by default.
- Do not print, snapshot, log, or persist provider tokens, OAuth codes, client secrets, key material, decrypted credential payloads, authorization headers, session cookies, endpoint URLs for live services, KMS/secret-manager values, or customer tenant identifiers.
- Do not claim KMS/HSM/secret-manager custody, WORM storage, external notarization, or production readiness unless a real adapter and approved live deployment smoke are implemented and validated.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config provider-token custody rotation microsoft365
pnpm provider-token:smoke
pnpm external-smoke:readiness
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If no approved live custody backend exists, preserve local/dry-run behavior and document blockers instead of faking KMS/HSM/secret-manager coverage.

## Expected Gap Movement

- Narrow GAP-040 only for implemented custody readiness/runbook metadata, local/test smoke guardrails, stricter production-safety blockers, and any deterministic local/fake custody tests.
- Preserve GAP-030, GAP-039, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- Provider-token custody output is deterministic and secret-free.
- Production-unsafe custody/key configurations are blocked or reported with stable codes.
- Local/fake custody tests prove active/previous-key decrypt behavior without leaking key material or credential payloads.
- Documentation clearly states that real KMS/HSM/secret-manager custody, deployed rotation, ciphertext backfill/re-encryption, key retirement, custody access logging, and operator rollback execution remain deferred unless actually implemented.
- Prompt and gap handoff docs are updated and `docs/PLAN_M49.md` is created.

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

- Pending. M48 implementation must create `docs/PLAN_M49.md` before final response.

Residual risk:

- Pending.
