# M7 Plan: Billing Provider And Entitlements

## Summary

Implement Prompt 6 from `docs/codex-prompts.md`: add the billing provider abstraction, Stripe integration boundary, webhook idempotency, entitlement calculation, and `BILLING_PROVIDER=none` behavior.

## Source Inputs

- `docs/puresoc_vision.md` sections 18, 19, 20, 21, 22, 27, 28
- `docs/master-plan.md` sections 3, 7, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- Skill: `puresoc-stripe-billing`

## Locked Decisions

- Do not trust client-provided subscription state.
- Do not log Stripe secrets, webhook signatures, customer secrets, or raw payment payloads beyond safe IDs.
- Do not let entitlements replace RBAC.
- Do not block core app operation when `BILLING_PROVIDER=none`.
- Do not invent final commercial packaging while GAP-012 remains open; use configurable defaults.

## Current State

Billing tables and placeholder packages exist, but the provider abstraction, Stripe adapter, webhook ledger/idempotency, entitlement calculation, API routes, and audit events still need implementation. GAP-012 remains open for final product/pricing decisions.

## Implementation Start Notes

- Reuse the existing billing Prisma models instead of changing schema unless tests reveal a missing contract.
- Keep the first runtime adapter deterministic and testable by injecting Stripe HTTP/signature dependencies rather than requiring live Stripe credentials.
- Use configurable, placeholder plan/price mappings from `code/config/defaults/billing.json`; do not encode final prices or packaging.
- Store billing events and calculated entitlements through the API repository boundary for this milestone, with Prisma-backed billing repositories deferred unless runtime wiring is intentionally enabled.

## Scope

In scope:

- Billing provider interface.
- Stripe checkout and customer-portal session contracts.
- Webhook endpoint with raw-body signature verification.
- Billing event ledger with idempotent handling.
- Subscription status mapping.
- Entitlement calculation from configured plan/price mapping.
- `BILLING_PROVIDER=none` behavior for core app usage without external billing.
- `BILLING_PROVIDER=offline_license` placeholder with explicit unsupported-state behavior.
- Billing audit events.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M8.md` after completion.

Out of scope:

- Final product packaging or hardcoded commercial prices.
- Replacing RBAC with entitlement checks.
- Trusting browser/client-provided billing state.
- Logging payment secrets or raw sensitive Stripe payloads.

## Expected Files And Ownership

- `docs/PLAN_M7.md`
- `docs/PLAN_M8.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/packages/billing/core/**`
- `code/packages/billing/stripe/**`
- `code/apps/api/src/billing/**`
- `code/packages/database/prisma/schema.prisma` and billing repository files if Prisma is available
- `code/config/defaults/billing.json`
- `code/packages/audit/**` only if billing audit helpers are needed

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand billing stripe entitlement webhook audit
```

Also run Prisma validation if billing persistence changes:

```sh
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma
```

## Acceptance Criteria

- Webhook signature rejection is covered.
- Duplicate webhook idempotency is covered.
- Subscription status transitions are covered.
- Entitlement calculation from config is covered.
- `BILLING_PROVIDER=none` bypass behavior is covered.
- Cross-organization billing access is rejected.
- Billing changes write audit events.
- Stripe secrets are redacted from errors/log-shaped outputs.
- GAP-012 remains open or is updated until actual products/prices are decided.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M8.md` exists as the next incremental plan stub.

## Completion Log

Completed on 2026-04-30.

Implemented:

- Billing provider contracts, repository records, entitlement keys, plan-based entitlement calculation, safe webhook payload shaping, and subscription status mapping in `code/packages/billing/core`.
- Stripe Checkout, Customer, Customer Portal, and raw-body webhook signature verification in `code/packages/billing/stripe`, using injectable API clients for deterministic tests.
- API billing service/routes for entitlement listing, checkout session creation, portal session creation, and Stripe webhook handling under `code/apps/api/src/billing`.
- Raw-body webhook server handling before JSON parsing, billing error serialization, and API service wiring.
- In-memory billing repository support through the existing API repository and a `PrismaBillingRepository` adapter under `code/packages/database/src/repositories/billing.ts`.
- Billing config defaults for placeholder Base/Pro/MSP plans and environment-overridable Stripe price/secret settings.
- Prisma billing subscription status alignment for `paused` and `incomplete_expired`.
- Tests for entitlement calculation, status mapping, Stripe form/session behavior, webhook signature rejection/acceptance, duplicate webhook idempotency, subscription transitions, `BILLING_PROVIDER=none`, cross-organization rejection, audit creation, and secret redaction.

Validation:

- Passed: `pnpm lint` via `flatpak-spawn --host npx pnpm@10.33.2 lint`
- Passed: `pnpm test -- --runInBand billing stripe entitlement webhook audit` via `flatpak-spawn --host npx pnpm@10.33.2 test -- --runInBand billing stripe entitlement webhook audit`
- Passed: `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma` via host `npx pnpm@10.33.2`
- Passed: `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma` via host `npx pnpm@10.33.2`

Acceptance status:

- Accepted for the M7 contract slice.
- GAP-012 remains open for final commercial packaging.
- GAP-028 was added for live Stripe runtime reconciliation, webhook operations, and live persistence smoke coverage.

Residual risk:

- Stripe calls are covered with fake-client tests, not a live Stripe test-mode account.
- Worker/scheduler reconciliation jobs are not wired yet.
- Checked-in plan names, price IDs, and entitlement bundles remain configurable placeholders.
- Live PostgreSQL migration/apply coverage remains deferred.

## Handoff For Next Milestone

`docs/PLAN_M8.md` has been generated from Prompt 7 / `PLAN_M8`: Production Evidence, Object Storage, Scanner, And PDF Adapters.
