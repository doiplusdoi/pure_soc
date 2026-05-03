# M75 Plan: Billing Product Decision Handoff

## Summary

Define the product decisions needed before placeholder billing plans can become production Stripe products, prices, and entitlements.

Status: completed app-side handoff.
Created: 2026-05-04.
Completed: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/PLAN_M7.md`
- `docs/PLAN_M43.md`
- `code/packages/billing`
- `code/scripts/stripe-test-mode-smoke.ts`

## Goal

Narrow GAP-012 by making the missing commercial truth explicit before Stripe test-mode execution and paid launch.

## Product Decision Template

Product must fill and approve:

- Plan names: Base, Pro, MSP, In-a-box, or replacements.
- Billing interval: monthly, annual, both, or negotiated.
- Customer limits: users, organizations, evidence storage, reports, Microsoft 365 tenants, countries, and MSP-managed clients.
- Feature entitlements: Romania pack, EU baseline, evidence/report exports, provider connectors, readiness scoring, MSP features, audit/export retention.
- Trial policy: trial length, trial limits, card required or not, conversion handling.
- Upgrade/downgrade behavior: immediate, end-of-period, proration, evidence/report retention after downgrade.
- Free/development behavior: `BILLING_PROVIDER=none` allowed only for dev/in-a-box contexts explicitly approved by product.
- Stripe mapping: test price IDs first, production price IDs later, both injected by environment/config and not hardcoded as legal/commercial truth.
- Customer portal policy: allowed plan changes, cancellations, payment method changes, invoices, and tax settings.
- Launch support policy: refunds, failed payment grace period, account suspension, and manual override process.

## Negative Constraints

- Do not invent production prices.
- Do not treat checked-in placeholder entitlements as approved packaging.
- Do not use live Stripe keys in repository validation.
- Do not disable `BILLING_PROVIDER=none` for local/dev/in-a-box paths.
- Do not print Stripe secrets or full object IDs in smoke output.

## Completion Log

Completed 2026-05-04 as the billing product-decision handoff.

Changed files:

- `docs/PLAN_M75.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Acceptance status:

- GAP-012 now has a concrete decision template.
- GAP-012 remains open until product approves packaging and provides Stripe test/production mappings.
