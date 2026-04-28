---
name: puresoc-stripe-billing
description: Use when implementing or reviewing PureSOC billing provider abstraction, Stripe checkout, customer portal, subscription webhook handling, billing event idempotency, entitlement calculation, or BILLING_PROVIDER=none behavior.
---

# PureSOC Stripe Billing

Use this skill for billing and entitlement work.

## Required Reading

Read:

- `docs/puresoc_vision.md` sections 18, 19, 20, 21, 22, 27, 28
- `docs/master-plan.md` sections 3, 7, 11, 14, 15
- `docs/implementation-gaps.md`

Verify current Stripe docs before finalizing event names or object mappings.

## Architecture Rules

- Implement `packages/billing/core` before Stripe-specific code.
- Stripe code belongs under `packages/billing/stripe`.
- In-a-box installs must work with `BILLING_PROVIDER=none`.
- Entitlements gate features; they do not replace RBAC.
- Webhook handlers must be idempotent.
- Never trust client-provided subscription state.

## Stripe Workflows

Implement:

- Checkout session creation.
- Customer portal session creation.
- Webhook signature verification.
- Customer mapping.
- Subscription status mapping.
- Price/product to entitlement mapping.
- Billing event storage and replay-safe processing.

## Required Tests

- Webhook signature rejection.
- Duplicate webhook idempotency.
- Subscription status transitions.
- Entitlement calculation.
- `BILLING_PROVIDER=none` bypass behavior.
- Cross-organization billing access rejection.
- Audit event creation for billing changes.

## Completion Checklist

- Stripe secrets are never logged.
- Webhook raw body handling is correct for signature verification.
- Entitlements are checked at feature boundaries.
- Unknown Stripe events are stored or logged safely without failing known-event processing.
