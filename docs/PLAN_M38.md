# M38 Plan: Provider Token Secret-Manager Custody Contract And Rotation Runbook Slice

## Summary

Implement the next active prompt after M37: narrow GAP-040 by making provider-token custody and rotation more production-shaped without claiming live KMS/secret-manager custody.

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
- The M38 fake custody provider is deterministic and test-only; it may model secret-manager version metadata but must not call a real secret-manager, KMS, HSM, cloud API, or Microsoft Graph.
- Unsupported custody providers should fail startup/config validation and provider construction explicitly instead of silently falling back.
- Rotation/backfill helpers are metadata/runbook contracts only; they do not rewrite stored credentials or claim deployed ciphertext backfill.
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

Started 2026-05-02.

Implementation results:

- Extended Microsoft 365 provider-token custody metadata with explicit capability/status fields, key-version metadata, rotation-readiness metadata, and non-live guarantees while preserving the existing AES-GCM credential envelope format and previous-key decrypt behavior.
- Kept `local-env-key-ring` as the default provider and added deterministic test-only `fake-secret-manager-test` custody behavior for active/previous lookup, missing-key failure, key-version summaries, and secret-free runbook metadata without live KMS/HSM/secret-manager/cloud/Microsoft Graph calls.
- Added `createMicrosoft365ProviderTokenRotationRunbook` metadata contracts for staged previous-key windows, startup/decrypt prechecks, backfill/re-encryption prerequisites, key-retirement checks, rollback expectations, and operator-owned secret injection.
- Wired API runtime config to construct the selected Microsoft 365 provider-token custody provider, while startup validation now accepts the fake provider only outside production and rejects unsupported provider names.
- Expanded `pnpm provider-token:smoke` to prove local and fake custody paths, fake missing-key failure, rotation-runbook metadata, unsupported-provider rejection, production fake-provider rejection, and secret-free output.
- Documented remaining operator-owned production custody requirements and staged M39 for served web/browser smoke.

Changed files:

- `code/.env.example`
- `code/README.md`
- `code/apps/api/src/__tests__/startup-config.test.ts`
- `code/apps/api/src/auth/services.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/config/src/index.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-token-encryption.spec.ts`
- `code/packages/providers/microsoft365/src/crypto.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/microsoft365/src/rotation-runbook.ts`
- `code/packages/providers/microsoft365/src/rotation-smoke.ts`
- `code/scripts/provider-token-rotation-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M38.md`
- `docs/PLAN_M39.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run lint` passed, including workspace layout, selected schema drift, generated Romania regulatory drift, and TypeScript checks.
- `npm run test -- config provider microsoft365 encryption api audit worker actions` passed: 38 test files, 138 tests.
- `npm run provider-token:smoke` passed with `puresoc.microsoft365.provider-token.rotation-smoke.v2` secret-free output and non-live guarantees.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M38. The milestone narrows provider-token custody and rotation with deterministic contracts, fake secret-manager metadata, and runbook planning without claiming live KMS/secret-manager custody, deployed rotation, ciphertext backfill execution, key retirement, or production readiness.

Gaps updated:

- GAP-040 narrowed for custody capability/status metadata, deterministic `fake-secret-manager-test` behavior, rotation/backfill runbook metadata, API/runtime config selection, expanded provider-token smoke, and production fake-provider rejection.
- GAP-030 preserved; no live provider write execution was added.
- GAP-039 preserved; no audit WORM/external signing work was added.
- GAP-043 preserved; no deployed multi-container queue orchestration work was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 37 / PLAN_M38 complete and stages Prompt 38 / PLAN_M39 for served web runtime and browser auth/middleware smoke.
- `docs/PLAN_M39.md` was created from the staged M39 prompt.

Residual risk:

- Production provider-token custody remains local environment/runtime-secret injection unless a future real KMS/secret-manager backend is selected and implemented.
- `fake-secret-manager-test` is deterministic test metadata only; it is not a real secret manager, KMS/HSM, access log, signer, or production custody provider.
- Ciphertext backfill/re-encryption, deployed rotation smoke, previous-key retirement, access logging, rollback exercises, and incident response remain operator/security work under GAP-040.
- Provider write execution remains disabled; no Microsoft Graph write scopes or live remediation were enabled.
