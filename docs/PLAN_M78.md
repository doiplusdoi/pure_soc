# M78 Plan: Outside-App Stripe, Microsoft 365, And KMS Target Execution

## Summary

Use operator-provided external resources to move from repository readiness to exactly one approved outside-app proof path, prioritizing Stripe test-mode, Microsoft 365 read-only tenant smoke, or provider-token custody/KMS design depending on which target is actually available.

Status: staged.
Created: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/codex_status.md`
- `docs/PLAN_M72.md`
- `docs/PLAN_M77.md`
- `docs/PLAN_M48.md`
- `code/scripts/external-smoke-readiness.ts`
- `code/scripts/external-smoke-target-selection.ts`
- `code/scripts/stripe-test-mode-smoke.ts`
- `code/scripts/microsoft365-read-only-smoke.ts`
- `code/scripts/provider-token-rotation-smoke.ts`

## Goal

Break GAP-044 by configuring, selecting, and running exactly one approved disposable/test outside-app target, or record the concrete blocker if no target is ready.

## Candidate Order

Preferred first candidate:

1. Stripe test-mode, because it is sandboxed and revenue-critical.
2. Microsoft 365 read-only disposable tenant, after app registration and admin consent are ready.
3. Provider-token custody/KMS path, only after the operator selects the SaaS/in-a-box custody backend. The current app has local key-ring and fake test custody contracts; it does not yet include a real KMS/HSM/secret-manager adapter.

## Scope

Expected work:

- Confirm which single external target the operator has prepared.
- Set only that target's guardrail variables.
- Run `npm run external-smoke:readiness` and `npm run external-smoke:select-target`.
- Run only the selected command if the selector returns exactly one ready path.
- Capture a redacted result summary in `docs/codex_status.md` and the relevant gap entry.
- If KMS is chosen and no adapter exists, produce the real adapter/runbook prompt instead of claiming live custody proof.

Expected files:

- `docs/PLAN_M78.md`
- `docs/codex_status.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`
- Code files only if a concrete defect appears during the selected smoke.

## Negative Constraints

- Do not run more than one live candidate in one pass.
- Do not use production, staging, customer, or long-lived shared targets.
- Do not print secrets, tokens, tenant IDs, webhook secrets, endpoint URLs, storage URIs, object keys, full provider IDs, authorization codes, cookies, or key material.
- Do not enable provider writes or Microsoft Graph write scopes.
- Do not call KMS/HSM/secret-manager APIs unless a real non-production custody target and adapter are explicitly selected and guarded.
- Do not treat dry-run readiness as live proof.

## Validation Plan

Always run from `code/`:

```sh
npm run external-smoke:readiness
npm run external-smoke:select-target
```

Then run exactly one selected command only if the selector chooses a single ready path:

```sh
npm run stripe:smoke:test-mode
npm run microsoft365:smoke:read-only
npm run provider-token:smoke
```

Run normal repository acceptance after any code changes:

```sh
npm run lint
npm run test
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

## Expected Gap Movement

- GAP-044 should move only if one selected external smoke actually runs.
- GAP-028 moves if Stripe test-mode runs.
- GAP-007 moves if Microsoft 365 read-only tenant smoke runs.
- GAP-040 moves only if a real custody backend or concrete adapter/runbook decision is implemented; local/fake custody must not be described as KMS proof.

## Acceptance Criteria

- Exactly one approved outside-app target is selected or a blocker is recorded.
- No provider writes, production/customer targets, or direct authority submission are introduced.
- Output and docs remain secret-free.
- The next milestone is based on the actual selected target result, not another generic readiness loop.

## Completion Log

Not started.
