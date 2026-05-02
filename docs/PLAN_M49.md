# M49 Plan: External Live-Smoke Target Selection And Readiness Audit Slice

## Summary

Implement the next active prompt after M48: add a metadata-only external live-smoke target selection/readiness audit that helps operators choose exactly one approved disposable/test smoke path without making live calls by default.

Status: completed.
Created: 2026-05-03.
Started: 2026-05-03.
Completed: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M48.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/scripts/external-smoke-readiness.ts`
- `code/scripts/*smoke*.ts`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a deterministic external live-smoke target-selection/readiness audit slice that ranks currently configured paths and explains why each is ready, blocked, unsafe, or not configured. Default behavior must remain dry-run and metadata-only.

## Scope

Expected implementation areas:

- Metadata-only selector over `pnpm external-smoke:readiness`.
- Ranking/explanation for Microsoft 365 read-only tenant, Stripe test-mode, OIDC/social callback, object-storage/scanner, evidence/report runtime, auth deployment, and provider-token custody paths.
- Tests for redaction, no live calls by default, unsafe target rejection, and deterministic blocker output.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- No live target is approved merely because it is configured.
- Live execution may happen only if the user provides an approved local/test/ci/disposable target and the existing command guardrails are satisfied.
- Provider writes, Microsoft Graph writes, customer-impacting actions, and production/staging/customer targets remain disabled/rejected.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M49.md`
- `docs/PLAN_M50.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

## Negative Constraints

- Do not call Microsoft Graph, OIDC/OAuth providers, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, public regulatory URLs, production/staging/customer deployments, or provider write executors by default.
- Do not enable live provider writes, Microsoft Graph write/remediation actions, or customer-impacting token/evidence/billing/provider operations.
- Do not print, snapshot, log, or persist provider tokens, OAuth codes, client secrets, key material, decrypted credential payloads, authorization headers, session cookies, endpoint URLs for live services, KMS/secret-manager values, customer tenant identifiers, Stripe object IDs, storage object keys, report bodies, or user emails.
- Do not claim a live smoke ran unless an approved local/test/ci/disposable target was actually exercised and the command output proves it without secrets.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- external-smoke readiness smoke target selection config
pnpm external-smoke:readiness
pnpm external-smoke:select-target
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If no approved live target exists, preserve metadata-only behavior and document blockers instead of faking live execution.

## Expected Gap Movement

- Narrow whichever live-smoke gap receives selector/readiness-audit improvements only for metadata and guardrail work actually implemented.
- Preserve GAP-030, GAP-039, GAP-040, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- Selector output is deterministic, secret-free, and makes no live calls by default.
- Ready, blocked, unsafe, and not-configured states are explained with stable codes.
- Exactly one next live-smoke path can be selected only when explicit local/test/ci/disposable approval exists.
- Prompt and gap handoff docs are updated and `docs/PLAN_M50.md` is created.

## Completion Log

Started 2026-05-03.

Implementation results:

- Added `targetSelection` to the external smoke readiness report. The selector ranks Microsoft 365 read-only tenant, Stripe test-mode, Microsoft/Google/GitHub OIDC callback, combined object-storage/scanner plus evidence/report runtime, auth deployment, and provider-token custody paths.
- Added stable selected-path metadata: candidate ranks, commands, command environment hints, check IDs, areas, aggregate status, blocker/reason codes, guardrails, and guarantees that output is metadata-only and selects exactly one path only when readiness is `ready_for_disposable_smoke`.
- Added `pnpm external-smoke:select-target` for selector-only JSON output.
- Preserved default dry-run/no-live-call posture. The default selector selected no live path because no approved target was configured.

Changed files:

- `code/README.md`
- `code/package.json`
- `code/packages/config/src/__tests__/external-smoke-target-selection.test.ts`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/packages/config/src/index.ts`
- `code/scripts/external-smoke-target-selection.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M49.md`
- `docs/PLAN_M50.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Host-node/npm equivalents were used because the sandbox cannot start (`bwrap` user-namespace failure) and sandbox-local `npm` was unavailable.
- Passed: `flatpak-spawn --host npm run test -- external-smoke readiness smoke target selection config` (13 files, 63 tests).
- Passed: `flatpak-spawn --host npm run external-smoke:readiness` (metadata-only readiness matrix with `targetSelection`; no selected live path and no live calls).
- Passed: `flatpak-spawn --host npm run external-smoke:select-target` (selector-only metadata output; no selected live path and no live calls).
- Passed: `flatpak-spawn --host npm run lint`.
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.

Acceptance status:

- Accepted for M49 metadata/readiness-audit scope. Ready, blocked, unsafe, configured-dry-run, and not-configured candidates are explained with stable codes; the selector chooses one path only when a readiness candidate is actually `ready_for_disposable_smoke`; and no live external service or provider write path was called.

Gaps updated:

- Created GAP-044 for external live-smoke target approval and execution remaining deferred after selector metadata.
- GAP-030, GAP-039, GAP-040, and GAP-043 preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 48 / PLAN_M49 complete and stages Prompt 49 / PLAN_M50.
- `docs/PLAN_M50.md` created for the approved single external live-smoke follow-up or blocker-review slice.

Residual risk:

- No approved disposable/test target was provided or exercised, so Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, report-renderer/browser services, KMS/HSM/secret-manager APIs, external signing services, public regulatory URLs, deployed auth targets, and provider writes remain untested live paths.
