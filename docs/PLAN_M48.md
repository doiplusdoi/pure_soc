# M48 Plan: Provider-Token Custody Deployment Readiness And Runbook Slice

## Summary

Implement the next active prompt after M47: harden the provider-token custody deployment readiness story for Microsoft 365 credentials without calling live KMS/HSM/secret-manager/cloud APIs or enabling provider writes.

Status: completed.
Created: 2026-05-02.
Started: 2026-05-03.
Completed: 2026-05-03.

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

Started 2026-05-03.
Completed 2026-05-03.

Implementation results:

- Added provider-token custody deployment readiness metadata for `local`, `in_a_box`, and `saas` target kinds.
- Added `provider_token_custody_deployment` to `pnpm external-smoke:readiness`, including supported local key-ring metadata, test-only fake-provider metadata, previous-key window/backfill/retirement confirmation blockers, secret-free configured variable reporting, and SaaS external-custody deferral.
- Expanded `pnpm provider-token:smoke` output with target-specific custody readiness and startup validation blocker codes for unsupported providers, checked-in local-dev keys, missing key IDs, invalid previous-key entries, duplicate/reused previous-key material, and active-key reuse.
- Expanded rotation runbook metadata with operator phases for smoke verification, previous-key staging, ciphertext backfill planning, rollback expectations, key-retirement expectations, and deferred live KMS/HSM/secret-manager custody.
- Preserved `local-env-key-ring` as the only real implemented custody provider, kept `fake-secret-manager-test` deterministic/test-only, and did not enable provider writes or ciphertext backfill.

Changed files:

- `code/.env.example`
- `code/README.md`
- `code/packages/config/src/__tests__/external-smoke-readiness.test.ts`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-readiness-metadata.spec.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-token-encryption.spec.ts`
- `code/packages/providers/microsoft365/src/custody-readiness.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/microsoft365/src/readiness.ts`
- `code/packages/providers/microsoft365/src/rotation-runbook.ts`
- `code/packages/providers/microsoft365/src/rotation-smoke.ts`
- `code/scripts/provider-token-rotation-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M48.md`
- `docs/PLAN_M49.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Host-node/npm equivalents were used because the sandbox cannot start (`bwrap` user-namespace failure) and sandbox-local `npm` was unavailable.
- Failed first, then fixed: `npm run test -- config provider-token custody rotation microsoft365` initially failed due to a test importing the new readiness helper from the wrong module.
- Passed: `flatpak-spawn --host npm run test -- config provider-token custody rotation microsoft365` (52 tests).
- Passed: `flatpak-spawn --host npm run provider-token:smoke` (local/dry synthetic custody smoke; no live custody/provider calls).
- Passed: `flatpak-spawn --host npm run external-smoke:readiness` (metadata-only readiness matrix; no live calls).
- Passed: `flatpak-spawn --host npm run lint`.
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.

Acceptance status:

- Accepted for M48 metadata/runbook scope. The implementation is deterministic and secret-free, reports local/in-a-box/SaaS custody posture, preserves local/fake custody behavior, blocks or reports unsafe provider-token configurations with stable codes, and keeps live KMS/HSM/secret-manager custody, provider writes, and ciphertext backfill out of scope.

Gaps updated:

- GAP-040 narrowed for local/in-a-box/SaaS custody readiness metadata, previous-key window/backfill/retirement blockers, startup validation blocker-code reporting, and expanded runbook phases.
- GAP-030, GAP-039, and GAP-043 preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 47 / PLAN_M48 complete and stages Prompt 48 / PLAN_M49.
- `docs/PLAN_M49.md` created for the external live-smoke target selection and readiness audit slice.

Residual risk:

- Real KMS/HSM/secret-manager custody, deployed rotation smoke, ciphertext backfill/re-encryption, previous-key retirement execution, custody access logging, production rollback exercise, and SaaS custody claims remain deferred under GAP-040.
