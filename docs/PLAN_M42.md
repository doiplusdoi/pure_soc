# M42 Plan: External Integration Smoke Readiness Matrix And Guardrail Slice

## Summary

Implement the next active prompt after M41: prepare live external smoke work with a deterministic, secret-free readiness matrix and guardrail command before any real provider calls are attempted.

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
- `docs/PLAN_M41.md`
- `docs/threat-model.md`
- `docs/microsoft365-permissions.md`
- `code/packages/config/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/apps/api/src/provider-connections/**`
- `code/packages/billing/**`
- `code/apps/api/src/billing/**`
- `code/packages/auth/oidc/src/**`
- `code/apps/api/src/auth/**`
- `code/packages/evidence/src/**`
- `code/apps/api/src/evidence/**`
- `code/scripts/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Build a dry-run readiness matrix for Microsoft 365, Stripe, OIDC/social login, object-storage/scanner, and evidence/report runtime smokes. The default command must not call live services; it should report readiness, blockers, unsafe targets, and explicit opt-in requirements.

## Scope

Expected implementation areas:

- Secret-free external smoke readiness contracts and report output.
- A deterministic readiness command, likely `pnpm external-smoke:readiness`.
- Guardrails for disposable/test target confirmation and per-provider live opt-in flags.
- Tests for redaction, missing-secret blockers, unsafe production targets, and no-live-call default behavior.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- Default readiness mode is dry-run only.
- Provider writes, Microsoft write scopes, live remediation, and production custody claims remain disabled.
- Absence of live credentials is a blocker to report, not a success to fake.
- Any future live mode must require explicit confirmation and disposable/test target checks.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/packages/billing/**`
- `code/packages/auth/oidc/src/**`
- `code/packages/evidence/src/**`
- `code/apps/api/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M42.md`
- `docs/PLAN_M43.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/microsoft365-permissions.md`

## Negative Constraints

- Do not call live Microsoft Graph, Stripe, OIDC providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, or public regulatory URLs in the default readiness command.
- Do not enable live provider write/remediation actions, Microsoft write scopes, or provider-token production custody claims.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, origin/rate-limit middleware, regulatory no-auto-activation rules, evidence storage-pointer redaction, or legal caveat enforcement.
- Do not print, snapshot, log, or persist secrets in readiness outputs, tests, docs, or failure metadata.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config provider microsoft365 billing oidc evidence api health
pnpm external-smoke:readiness
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-007, GAP-028, GAP-029, and GAP-032 only for readiness metadata, opt-in guardrails, and blocker reporting unless actual live disposable smoke is intentionally implemented and accepted.
- Preserve GAP-030, GAP-035, GAP-039, GAP-040, and GAP-043 unless those production hardening areas are intentionally implemented and accepted.

## Acceptance Criteria

- Readiness output is deterministic and secret-free.
- Default readiness command makes no live external calls.
- Missing credentials, unsupported providers, unsafe production targets, and disabled integrations are reported as blockers or skipped states.
- Documentation explains how to move from readiness to an approved disposable live smoke without enabling provider writes.
- Prompt and gap handoff docs are updated and `docs/PLAN_M43.md` is created.

## Completion Log

Started 2026-05-02.

Implementation results:

- Added a secret-free external smoke readiness contract under `@puresoc/config`.
- Added a Microsoft 365 metadata helper that exposes read-only permission bundles, read modules, deferred modules, and disabled write bundles for readiness reporting without calling Graph.
- Added `pnpm external-smoke:readiness`, implemented as a deterministic dry-run JSON report that evaluates Microsoft 365, Stripe, Microsoft/Google/GitHub OIDC, object-storage/scanner, and evidence/report runtime smoke prerequisites.
- Gated future live-candidate readiness behind `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, `PURESOC_EXTERNAL_SMOKE_TARGET_KIND`, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, and per-provider opt-in variables.
- Readiness output uses statuses `not_configured`, `configured_dry_run_only`, `ready_for_disposable_smoke`, `blocked_missing_secret`, and `unsafe_production_target`.
- Output includes only variable names, booleans, config-path-level metadata, blocker codes, and permission/module metadata. It does not print secret values, provider tokens, OAuth codes, webhook secrets, storage credentials, scanner endpoints, object-storage endpoints, session cookies, key material, or storage URIs.
- Updated application documentation and `.env.example` with the dry-run defaults and live-candidate guardrails.

Changed files:

- `code/.env.example`
- `code/README.md`
- `code/package.json`
- `code/pnpm-lock.yaml`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/external-smoke-readiness.test.ts`
- `code/packages/providers/microsoft365/src/readiness.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-readiness-metadata.spec.ts`
- `code/scripts/external-smoke-readiness.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M42.md`
- `docs/PLAN_M43.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/microsoft365-permissions.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable, so validation used host-node/npm equivalents through `flatpak-spawn --host`.
- `pnpm test -- external-smoke microsoft365-readiness config` could not run because `pnpm` is not installed in this environment.
- `npm run test -- external-smoke microsoft365-readiness config` passed: 4 files, 19 tests.
- `npm run lint` passed.
- `npm run test -- config provider microsoft365 billing oidc evidence api health` passed: 38 files, 140 tests.
- `npm run external-smoke:readiness` passed and reported default dry-run readiness without live network calls. Default summary: `not_configured=5`, `configured_dry_run_only=1`, `ready_for_disposable_smoke=0`, `blocked_missing_secret=1`, `unsafe_production_target=0`.
- `npm run test:e2e -- --grep @ui-smoke` passed and wrote deterministic HTML snapshots under `/tmp/puresoc-ui-smoke-*`.
- `docker compose -f infra/compose/docker-compose.yml config` passed through the host Docker CLI.
- `git diff --check` passed.

Acceptance status:

- Accepted for M42. The core readiness matrix is deterministic, dry-run by default, secret-free, and does not call live external services.

Gaps updated:

- GAP-007 narrowed for Microsoft 365 read-only smoke prerequisite metadata and disabled write-bundle reporting without live Graph calls.
- GAP-028 narrowed for Stripe test-mode readiness metadata, missing-secret/placeholder-price blockers, and live-key unsafe-target detection without live Stripe calls.
- GAP-029 narrowed for object-storage/scanner and evidence/report readiness metadata, no endpoint/storage-pointer output, and live-candidate guardrails without bucket/scanner/PDF calls.
- GAP-032 narrowed for Microsoft Entra, Google, and GitHub OIDC readiness metadata, provider enablement/secret/redirect blockers, and live-candidate guardrails without live provider calls.
- GAP-030, GAP-035, GAP-039, GAP-040, and GAP-043 preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 41 / PLAN_M42 complete and stages Prompt 42 / PLAN_M43 for a guarded Stripe test-mode disposable smoke harness.
- `docs/PLAN_M43.md` was created from the staged M43 prompt.

Residual risk:

- The readiness command is metadata-only. It does not prove live Microsoft Graph, Stripe, OIDC, object-storage, scanner, report-renderer, browser PDF, deployed TLS/proxy, KMS/secret-manager, or external signing behavior.
- `ready_for_disposable_smoke` means local configuration and guardrails are present for a future approved disposable/test run; it is not a claim that a live smoke was executed.
- Provider writes and Microsoft write scopes remain disabled.
