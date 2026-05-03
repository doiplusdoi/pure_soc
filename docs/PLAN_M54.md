# M54 Plan: External Live-Smoke Target Approval Follow-Up Or Blocker Review

## Summary

Keep GAP-044 honest by running the metadata-only readiness/selector flow first, then either record that no live smoke target is approved or run exactly one selected local/test/ci/disposable smoke path under its existing guardrails.

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
- `docs/PLAN_M53.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/scripts/external-smoke-readiness.ts`
- `code/scripts/external-smoke-target-selection.ts`
- `code/packages/config/src/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Run the external-smoke readiness and target-selector guardrails before any live smoke command, preserving dry-run-only behavior unless exactly one approved local/test/ci/disposable path is selected and configured.

## Scope

Expected implementation areas:

- Run `external-smoke:readiness` and `external-smoke:select-target` first.
- If no path is selected, update GAP-044 and docs with blocker posture only.
- If exactly one path is selected, run only that selected command under its existing opt-in/disposable guardrails and keep every other live path blocked.
- Preserve secret-free output and avoid endpoint/credential/token/cookie/key/payload leakage.
- Update prompt and milestone handoff docs.

Locked assumptions:

- No live target is approved by default.
- The selector remains metadata-only unless existing path-specific guardrails are satisfied.
- Provider writes and Microsoft Graph write/remediation scopes remain disabled.

## Negative Constraints

- Do not call Microsoft Graph, OIDC/OAuth providers, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external signing services, public regulatory URLs, production/staging/customer deployments, Redis targets, or provider write executors unless the selector chooses exactly one approved local/test/ci/disposable path and the path-specific guardrails explicitly allow only that command.
- Do not run more than one live smoke path in this milestone.
- Do not print endpoint URLs, Redis URLs containing credentials, session cookies, authorization headers, OAuth codes, provider tokens, client secrets, key material, user emails, object-storage keys, provider payloads, or rendered report bodies.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm external-smoke:readiness
pnpm external-smoke:select-target
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Keep GAP-044 open if no path is selected or no live smoke command is run.
- Narrow GAP-044 only if exactly one approved local/test/ci/disposable path is selected and exercised through its existing guarded command.
- Preserve GAP-035, GAP-043, and other runtime gaps unless their selected guarded smoke path is intentionally exercised.

## Acceptance Criteria

- The readiness report is generated before target selection.
- The selector either reports no selected path or exactly one selected path.
- No live command is run unless the selected path and guardrails permit it.
- Secret-free output and no-provider-write constraints remain intact.
- Prompt and gap handoff docs are updated and `docs/PLAN_M55.md` is created.

## Completion Log

Started 2026-05-03.

Implementation results:

- Ran the required metadata-only readiness flow before any selector or live-smoke command.
- `pnpm` and sandbox-local `npm` were unavailable, so M54 used the documented host npm package-script equivalent.
- `external-smoke:readiness` remained in default dry-run posture: target kind `unknown`, disposable confirmation `false`, no live network calls, provider writes disabled, `ready_for_disposable_smoke: 0`, `not_configured: 6`, `configured_dry_run_only: 2`, `blocked_missing_secret: 1`, and `unsafe_production_target: 0`.
- `external-smoke:select-target` returned `outcome: no_ready_path`, `selectedPathId: null`, `selectedCommand: null`, `selectedCheckIds: []`, `readyCandidateCount: 0`, and `candidateCount: 8`.
- Because no path was selected, no live smoke command was run. No Microsoft Graph, Stripe, OIDC/OAuth provider, object-storage, scanner, browser/PDF service, KMS/HSM/secret-manager/cloud API, external signing service, public regulatory URL, Redis target, production/staging/customer deployment, or provider write executor was called.
- GAP-044 remains open with the M54 blocker posture recorded.

Changed files:

- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M54.md`
- `docs/PLAN_M55.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Passed: `flatpak-spawn --host npm run external-smoke:readiness` (metadata-only dry run; no live calls; `ready_for_disposable_smoke: 0`).
- Passed: `flatpak-spawn --host npm run external-smoke:select-target` (`outcome: no_ready_path`; `selectedPathId: null`; no selected command).
- Passed: `flatpak-spawn --host npm run lint` (layout coherent; schema drift passed; Romania drift passed; TypeScript passed).
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.
- Substitution recorded: `pnpm external-smoke:readiness` failed with `pnpm: command not found`, and sandbox-local `npm run external-smoke:readiness` failed with `npm: command not found`; host npm equivalents were used.

Acceptance status:

- Accepted for the no-selected-target M54 path. Since the selector did not choose exactly one approved local/test/ci/disposable target, the correct acceptance behavior was blocker documentation only and no live smoke execution.

Gaps updated:

- GAP-044 remains open and is preserved with M54's explicit no-ready-path result.
- GAP-035, GAP-043, and the other external/runtime gaps are preserved because no guarded smoke path was selected or exercised.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 53 / PLAN_M54 complete and stages Prompt 54 / PLAN_M55 for action-run idempotency.
- `docs/PLAN_M55.md` created for the next active milestone.

Residual risk:

- No live external runtime behavior was proven. Operators still need to approve exactly one local/test/ci/disposable target and satisfy that path's existing guardrails before any live smoke command can run.
- The provider-token custody path remains configured dry-run only by default; it was not selected because live-candidate target approval and path-specific selection prerequisites were absent.
