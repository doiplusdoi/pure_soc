# M91 Plan: Recursive Gap Implementation Runner

## Summary

M91 is staged as the next recursive one-slice implementation milestone after M90. Use `docs/recursive-gap-codex-prompt.md` to select exactly one unblocked local slice, validate it, update the gap/status docs, and stage the next milestone.

Status: completed.
Created: 2026-06-09.
Completed: 2026-06-09.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Slice

Selected gap slice: GAP-041 selected schema/data-quality drift coverage for billing customer persistence.

Why this is unblocked:

- At selection time, GAP-041 explicitly said selected drift coverage was not exhaustive and still called out billing customers as excluded.
- Billing customer records are customer-facing and production-backed through the billing repository, even though final product pricing and live Stripe runtime remain unresolved.
- This slice can be implemented with static drift checks and focused tests only.
- It does not require product pricing decisions, live Stripe credentials, webhook delivery, external calls, or billing runtime changes.

Expected files:

- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `docs/PLAN_M91.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M92.md`

Expected gap movement:

- Narrow GAP-041 for selected drift coverage of `BillingCustomer`.
- Do not close GAP-041, because selected drift coverage remains intentionally non-exhaustive and checklist/risk-acceptance surfaces remain outside the selected map.

## Candidate Review

Start by rebuilding the candidate list from the latest gap register. Current likely candidates:

1. Public signup/auth hardening that does not require choosing open versus invite-only registration, real email delivery, or enforcing a broad launch policy.
2. Frontend workflow polish that preserves the current UI and browser smoke artifacts.
3. Additional selected drift coverage only for newly customer-facing or production-backed surfaces, such as billing customer persistence if it becomes the next best local data-quality slice.
4. Evidence/report/export improvements using local or fake adapters only.
5. Queue/runtime operation hardening with local/disposable adapters only, keeping provider writes disabled.
6. Microsoft read-only fixture expansion only after checking current official Microsoft documentation and without adding write scopes.

If the highest-priority slice requires product/legal/operator decisions, record the blocker and move to the next unblocked local implementation slice.

## Negative Constraints

- Do not implement more than one slice.
- Do not mark Romania legal logic active.
- Do not add approved Romanian legal/regulatory copy without exact product/legal text.
- Do not add direct DNSC or national-authority submission.
- Do not claim certified, guaranteed, or legally approved compliance.
- Do not add Microsoft/provider write scopes or remediation execution.
- Do not run live external integrations without selector-first disposable/test guardrails and explicit approval.
- Keep application code, tests, Compose files, runtime config, and regulatory data under `code/`.

## Validation

Use the targeted commands from `docs/recursive-gap-codex-prompt.md` for the selected slice and always run:

```sh
git diff --check
```

Targeted commands for this slice from `code/`:

```sh
npm run test -- drift
npm run lint
git diff --check
```

## Implementation Results

Changed files:

- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `docs/PLAN_M91.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M92.md`

What changed:

- Added selected Prisma schema drift expectations for `BillingCustomer`.
- Guarded organization linkage, billing provider key, optional external customer ID, optional billing email, metadata JSON, and timestamp mappings.
- Added a focused drift regression test proving billing customer persistence remains in the selected drift map.

Validation:

```txt
npm run test -- drift
passed, 1 file / 11 tests

npm run lint
passed; schema drift check covered 39 models / 547 fields and Romania generated regulatory drift covered 3 artifacts

git diff --check
passed
```

Acceptance status:

- Targeted test and lint validation passed.
- No Prisma schema or migration changes were made.
- No live Stripe calls, webhook delivery, pricing decisions, product entitlement changes, external integrations, provider writes, DNSC/national-authority submission, legal activation, or certification claims were added.

Gap movement:

- GAP-041 narrowed for lint-gated selected schema drift coverage of billing customer persistence.
- GAP-041 remains open because selected drift coverage is still not exhaustive; checklist/risk-acceptance surfaces remain outside the selected map.

Residual risk:

- Drift coverage protects table/field shape only; it does not prove live Stripe runtime, webhook delivery, pricing/product decisions, or entitlement policy.
- GAP-012 and GAP-028 remain open for product billing decisions and live/test-mode Stripe proof.

Next staged prompt:

- `docs/PLAN_M92.md` continues the recursive one-slice gap implementation runner.
