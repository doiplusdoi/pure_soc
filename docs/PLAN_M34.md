# M34 Plan: Provider Token KMS And Rotation Smoke Planning Slice

## Summary

Implement the next active prompt after M33: narrow GAP-040 by adding a bounded provider-token key-custody and rotation smoke foundation for the existing Microsoft 365 credential envelope, without adding live Microsoft Graph calls or enabling provider writes.

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

Started 2026-05-02.

Implementation results:

- Added an explicit Microsoft 365 `local-env-key-ring` key-provider/custody boundary around the existing local AES-GCM token cipher. New credential encryption uses the active key through the boundary, and decryption resolves key-ID and legacy no-key-ID envelopes through configured active/previous keys.
- Added redacted custody summaries that expose provider kind, active/previous key IDs, and non-KMS guarantees without exposing key material.
- Added `pnpm provider-token:smoke`, backed by a local/disposable smoke helper, proving active-key encrypt/decrypt, previous-key decrypt, bad-key failure, secret-free output, and production rejection of checked-in local-dev active/previous provider-token keys.
- Tightened config validation for unsupported provider-token custody providers plus duplicate/reused provider-token key material.
- Added focused token-custody, smoke, config, and API/audit redaction assertions while preserving provider write disablement.
- Documented local env/Docker-secret guidance and clearly kept SaaS KMS/secret-manager custody, deployed rotation smoke, ciphertext backfill/re-encryption, and operator rollback deferred.

Changed files:

- `code/README.md`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/provider-connections/microsoft365/__tests__/microsoft365-api-consent-health.test.ts`
- `code/config/defaults/connectors.json`
- `code/package.json`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/config/src/index.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-token-encryption.spec.ts`
- `code/packages/providers/microsoft365/src/crypto.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/microsoft365/src/rotation-smoke.ts`
- `code/scripts/provider-token-rotation-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M34.md`
- `docs/PLAN_M35.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run lint` passed, including layout checks, schema drift checks for 29 models / 432 fields, generated Romania regulatory drift checks, and TypeScript.
- `npm run test -- config provider microsoft365 encryption api audit` passed: 31 test files, 112 tests.
- `npm run provider-token:smoke` passed with secret-free metadata output.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M34. The milestone adds a deterministic local key-custody/rotation smoke and stricter local key-ring validation without claiming external KMS/secret-manager custody or enabling provider writes.

Gaps updated:

- GAP-040 narrowed for explicit local key-provider custody, deterministic local/disposable rotation smoke, and stricter key-ring validation.
- GAP-030 preserved; no provider write/remediation execution was enabled.
- GAP-039 preserved; no external audit signing/WORM storage was added.
- GAP-043 preserved; no production queue orchestration hardening was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 33 / PLAN_M34 complete and stages Prompt 34 / PLAN_M35.
- `docs/PLAN_M35.md` was created for the remediation worker/provider execution safety contract slice.

Residual risk:

- `local-env-key-ring` custody still leaves plaintext provider-token key material available to the API process; it is not KMS, HSM custody, or external signing.
- No live KMS/secret-manager adapter, deployed rotation smoke, ciphertext backfill/re-encryption workflow, or operator rollback runbook exists yet.
- Provider write execution remains disabled and open under GAP-030.
