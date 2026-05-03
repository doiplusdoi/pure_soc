# M72 Plan: Live-Smoke Target Selection And Stripe Test-Mode Handoff

## Summary

Prepare the repository-side operator handoff for the first approved external live-smoke target, with Stripe test-mode as the preferred first candidate.

Status: completed app-side handoff.
Created: 2026-05-04.
Completed: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/codex_status.md`
- `docs/PLAN_M43.md`
- `docs/PLAN_M49.md`
- `docs/PLAN_M50.md`
- `docs/PLAN_M54.md`
- `code/scripts/external-smoke-readiness.ts`
- `code/scripts/external-smoke-target-selection.ts`
- `code/scripts/stripe-test-mode-smoke.ts`

## Goal

Move GAP-044 and GAP-028 from generic readiness discussion to a concrete outside-app operator checklist for a single Stripe test-mode live candidate, without running live Stripe from this repo session.

## Handoff Checklist

External setup needed before execution:

- Stripe test account only.
- `sk_test_*` secret key, never `sk_live_*`.
- Disposable webhook signing secret.
- Test-mode product/price IDs for Base, Pro, and MSP placeholders, or a product-approved replacement mapping.
- Customer portal test-mode configuration.
- Disposable webhook delivery path or local forwarding path.
- Confirmation that the target is local/test/ci/disposable and not staging, production, or customer data.

Required guardrails:

- `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`
- `PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable`
- `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`
- `PURESOC_EXTERNAL_SMOKE_STRIPE=true`
- `PURESOC_BILLING_PROVIDER=stripe`
- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- non-placeholder Stripe price IDs

Execution sequence for the operator:

```sh
cd code
npm run external-smoke:readiness
npm run external-smoke:select-target
npm run stripe:smoke:test-mode
```

Only run the final command if the selector chooses exactly `stripe_test_mode_billing` with one ready candidate.

## Negative Constraints

- Do not run Stripe with live keys.
- Do not run against production, staging, customer, or long-lived shared data.
- Do not print Stripe secrets, webhook secrets, Checkout/Portal URLs, or full Stripe object IDs.
- Do not enable provider writes or remediation actions.
- Do not treat this handoff as proof that Stripe has been live-tested.

## Completion Log

Completed 2026-05-04 as a documentation and operator-readiness milestone.

Changed files:

- `docs/PLAN_M72.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Acceptance status:

- App-side handoff is complete.
- Live Stripe execution is pending outside-app operator setup.

Residual risk:

- GAP-028 and GAP-044 remain open until an approved Stripe test-mode target is configured, selected, executed, and recorded with redacted evidence.
