# M54 Plan: External Live-Smoke Target Approval Follow-Up Or Blocker Review

## Summary

Keep GAP-044 honest by running the metadata-only readiness/selector flow first, then either record that no live smoke target is approved or run exactly one selected local/test/ci/disposable smoke path under its existing guardrails.

Status: staged for implementation after M53.
Created: 2026-05-03.

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

- Pending. M54 implementation must create `docs/PLAN_M55.md` before final response.

Residual risk:

- Pending.
