# M50 Plan: Approved Single External Live-Smoke Follow-Up Or Blocker Review

## Summary

Use the M49 selector to run exactly one approved disposable/test live-smoke follow-up if the selector chooses one ready path and the user has explicitly approved that target. If no approved target exists, keep every live path blocked and document the blockers.

Status: staged for implementation after M49.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M49.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/scripts/external-smoke-readiness.ts`
- `code/scripts/external-smoke-target-selection.ts`
- `code/scripts/*smoke*.ts`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Run or block the next external live-smoke step using the selector output as the source of truth. The milestone may execute at most one selected smoke command, and only with explicit approved local/test/ci/disposable target approval and existing guardrails satisfied.

## Scope

Expected implementation areas:

- `pnpm external-smoke:readiness`
- `pnpm external-smoke:select-target`
- At most one selected smoke command if approval and guardrails exist.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- No live target is approved merely because environment variables are configured.
- If `targetSelection.selectedPathId` is null, no live command may be run.
- Provider writes, Microsoft Graph writes, customer-impacting actions, production/staging/customer targets, and unselected smoke paths remain disabled/rejected.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M50.md`
- `docs/PLAN_M51.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

## Negative Constraints

- Do not call Microsoft Graph, OIDC/OAuth providers, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, public regulatory URLs, production/staging/customer deployments, or provider write executors unless the selector chooses exactly one path and the user explicitly approves the disposable/test target.
- Do not run more than one live smoke command.
- Do not enable live provider writes, Microsoft Graph write/remediation actions, or customer-impacting token/evidence/billing/provider operations.
- Do not print, snapshot, log, or persist provider tokens, OAuth codes, client secrets, key material, decrypted credential payloads, authorization headers, session cookies, endpoint URLs for live services, KMS/secret-manager values, customer tenant identifiers, Stripe object IDs, storage object keys, report bodies, or user emails.
- Do not claim a live smoke ran unless an approved local/test/ci/disposable target was actually exercised and the command output proves it without secrets.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm external-smoke:readiness
pnpm external-smoke:select-target
# Run exactly one selected smoke command only if explicit target approval exists.
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If no approved live target exists, preserve metadata-only behavior and document blockers instead of faking live execution.

## Expected Gap Movement

- Narrow whichever live-smoke gap receives actual approved live/disposable execution.
- Keep GAP-044 open if no approved target is selected or no approved target is provided.
- Preserve GAP-030, GAP-039, GAP-040, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- The selector is run before any live smoke command.
- At most one selected smoke command is run, and only with explicit approved local/test/ci/disposable target approval.
- If no path is selected or no target is approved, no live service is called and blockers are documented.
- Prompt and gap handoff docs are updated and `docs/PLAN_M51.md` is created.

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

- Pending. M50 implementation must create `docs/PLAN_M51.md` before final response.

Residual risk:

- Pending.
