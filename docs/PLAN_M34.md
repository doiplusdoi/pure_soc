# M34 Plan: Provider Token KMS And Rotation Smoke Planning Slice

## Summary

Implement the next active prompt after M33: narrow GAP-040 by adding a bounded provider-token key-custody and rotation smoke foundation for the existing Microsoft 365 credential envelope, without adding live Microsoft Graph calls or enabling provider writes.

Status: staged for implementation after M33.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M33.md`
- `docs/threat-model.md`
- `code/packages/providers/microsoft365/src/**`
- `code/packages/config/src/**`
- `code/config/defaults/**`
- `code/apps/api/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a testable key-custody/rotation boundary for provider-token encryption so local/dev key-ring behavior, active-key encryption, previous-key decrypt, unsafe production config rejection, and a deterministic rotation smoke are explicit before any production Microsoft 365 onboarding.

## Scope

Expected implementation areas:

- Provider-token key-provider or custody boundary around the existing local Microsoft 365 token cipher.
- Deterministic rotation smoke or script that proves active-key encrypt, previous-key decrypt, bad-key failure, and operator-safe target restrictions without live KMS.
- Config validation and docs for local env/Docker-secret style custody versus future SaaS KMS/secret-manager custody.
- Tests proving no provider token, key material, OAuth code, refresh token, or credential envelope plaintext leaks into logs, audit records, responses, or smoke output.

Locked assumptions:

- Existing local key-ring support remains the default contract harness.
- A deterministic local smoke can narrow GAP-040 but does not close live KMS/secret-manager custody.
- Provider write/remediation execution remains disabled.
- No live Microsoft Graph, Stripe, OIDC-provider, MinIO/S3, scanner, public regulatory URL, browser, external KMS, or provider-write dependency is added.

Expected files:

- `code/package.json`
- `code/packages/providers/microsoft365/src/**`
- `code/packages/config/src/**`
- `code/config/defaults/**`
- `code/apps/api/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M34.md`
- `docs/PLAN_M35.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not enable provider write/remediation execution.
- Do not call live Microsoft Graph or any live external KMS/secret-manager.
- Do not print, log, return, or persist plaintext provider tokens, client secrets, OAuth codes, key material, or decrypted credential payloads in smoke output.
- Do not claim env-var/local key-ring custody is production KMS, HSM custody, or equivalent to external signing.
- Do not weaken existing startup validation for production provider-token keys.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config provider microsoft365 encryption api audit
pnpm <new-provider-token-rotation-smoke-command>
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-040 for provider-token key-custody/rotation smoke.
- Preserve GAP-030 unless provider write execution safety is explicitly implemented and accepted in a later prompt.
- Preserve GAP-039 unless external audit signing/WORM storage is intentionally added.
- Preserve GAP-043 unless production queue orchestration hardening is intentionally added.

## Acceptance Criteria

- Rotation smoke proves encrypt with active key and decrypt through active/previous-key configuration without live providers.
- Unsafe production local-dev keys still fail startup validation.
- Smoke output and audit/log surfaces do not contain plaintext token or key material.
- Documentation clearly distinguishes local key-ring/Docker-secret guidance from future live KMS or secret-manager custody.
- Gap and prompt handoff docs honestly describe deferred live KMS/secret-manager work.

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

- Pending. M34 implementation must create `docs/PLAN_M35.md` before final response.

Residual risk:

- Pending.
