# M43 Plan: Stripe Test-Mode Disposable Smoke Harness And Guardrail Slice

## Summary

Implement the next active prompt after M42: add a guarded Stripe test-mode smoke harness that remains dry-run by default and only allows live Stripe test-mode execution when M42 readiness guardrails report the Stripe path is ready for a disposable/test run.

Status: completed.
Created: 2026-05-02.
Started: 2026-05-02.
Completed: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M42.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/packages/billing/core/src/**`
- `code/packages/billing/stripe/src/**`
- `code/apps/api/src/billing/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/scripts/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a deterministic Stripe smoke command, likely `pnpm stripe:smoke:test-mode`, that proves the planned test-mode checkout/customer-portal/webhook path is safe to run only after the M42 readiness matrix reports `stripe_test_mode_billing` as `ready_for_disposable_smoke`.

## Scope

Expected implementation areas:

- Stripe smoke command with dry-run default.
- Readiness-matrix preflight reuse.
- Live-test guardrails for Stripe test mode only.
- Secret-free output and tests for redaction, live-key rejection, missing blockers, and dry-run behavior.
- Documentation and gap/prompt handoff updates.

Implementation approach:

- Keep the M42 readiness matrix as the first preflight for the command.
- Add Stripe-specific smoke orchestration under `@puresoc/billing-stripe`, with dry-run output that never creates Stripe objects.
- Add the CLI wrapper under `code/scripts/stripe-test-mode-smoke.ts` and expose it as `pnpm stripe:smoke:test-mode`.
- Require live/test execution to use `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, a safe disposable/test target, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, `PURESOC_EXTERNAL_SMOKE_STRIPE=true`, `PURESOC_BILLING_PROVIDER=stripe`, `sk_test_*` credentials, and M42 readiness status `ready_for_disposable_smoke`.
- Return only operation names, endpoint paths, status, configured/missing environment variable names, object ID prefixes, and booleans; never return Stripe secret values, webhook secrets, Checkout/Portal URLs, or full object IDs.

Locked assumptions:

- Default command mode is dry-run and must not call Stripe.
- Live execution, if implemented, targets only Stripe test mode and a disposable/test account.
- Absence of live Stripe credentials is a blocker to report, not a success to fake.
- Stripe webhook raw-body verification, idempotency, entitlement/RBAC separation, and audit semantics must remain unchanged.
- Provider writes and Microsoft write scopes remain disabled.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/packages/billing/core/src/**`
- `code/packages/billing/stripe/src/**`
- `code/apps/api/src/billing/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M43.md`
- `docs/PLAN_M44.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not call live Stripe in default dry-run mode.
- Do not call Stripe live mode; reject `sk_live_*` and production-like targets.
- Do not call Microsoft Graph, OIDC providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, public regulatory URLs, or provider write executors.
- Do not enable live provider write/remediation actions, Microsoft write scopes, or provider-token production custody claims.
- Do not print, snapshot, log, or persist Stripe secret keys, webhook secrets, checkout URLs from live-mode sessions, session cookies, provider tokens, OAuth codes, object-storage credentials, KMS/secret-manager values, or internal storage URIs.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config billing stripe external-smoke api health
pnpm external-smoke:readiness
pnpm stripe:smoke:test-mode
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If live Stripe test credentials or a disposable target are unavailable, preserve dry-run behavior and document blockers instead of faking live smoke coverage.

## Expected Gap Movement

- Narrow GAP-028 only for the implemented Stripe test-mode smoke harness, dry-run/live-test guardrails, and any actual approved test-mode execution result.
- Preserve GAP-007, GAP-029, GAP-030, GAP-032, GAP-035, GAP-039, GAP-040, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- Dry-run command is deterministic and secret-free.
- Live/test execution is impossible unless the M42 readiness preflight is ready for Stripe and all disposable/test opt-ins are set.
- Stripe live-mode keys and production-like targets are rejected.
- Webhook signature verification and billing event idempotency are preserved by tests.
- Prompt and gap handoff docs are updated and `docs/PLAN_M44.md` is created.

## Completion Log

Started 2026-05-02.

Implementation results:

- Added `pnpm stripe:smoke:test-mode`, implemented by `code/scripts/stripe-test-mode-smoke.ts`.
- Added Stripe smoke orchestration in `@puresoc/billing-stripe`, with a dry-run default, M42 readiness preflight input, live/test guardrail checks, synthetic customer/Checkout/Portal/webhook-signature operations for explicit live-candidate mode, and sanitized result output.
- Tightened Stripe external-smoke readiness so a ready Stripe path requires `PURESOC_BILLING_PROVIDER=stripe` and Base/Pro/MSP price variables, not only secret-shaped values.
- Added deterministic tests for dry-run no-call behavior, readiness/live-key blocking, `sk_test_*` enforcement, fake-client live-candidate execution, and output redaction.
- Updated README, learnings, milestone index, gap register, active prompts, and staged `docs/PLAN_M44.md`.
- Verified current official Stripe docs for Checkout Sessions, Customer Portal Sessions, and webhook signature handling. M43 preserved the existing server-side Checkout/Portal request shape and raw-body webhook signature contract.

Changed files:

- `code/README.md`
- `code/package.json`
- `code/packages/billing/stripe/src/index.ts`
- `code/packages/billing/stripe/src/__tests__/stripe-test-mode-smoke.test.ts`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/packages/config/src/__tests__/external-smoke-readiness.test.ts`
- `code/scripts/stripe-test-mode-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M43.md`
- `docs/PLAN_M44.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable, so validation used host-node/npm equivalents through `flatpak-spawn --host`.
- `npm run test -- stripe external-smoke config` passed: 6 files, 31 tests.
- `npm run lint` passed.
- `npm run test -- config billing stripe external-smoke api health` passed: 27 files, 92 tests.
- `npm run external-smoke:readiness` passed. Default summary remained dry-run/no-live-call with `not_configured=5`, `configured_dry_run_only=1`, `ready_for_disposable_smoke=0`, `blocked_missing_secret=1`, `unsafe_production_target=0`; Stripe now reports missing `PURESOC_BILLING_PROVIDER` and Base/Pro/MSP price variables in its required environment.
- `npm run stripe:smoke:test-mode` passed in default dry-run mode. It planned customer, Checkout Session, Customer Portal Session, and webhook-signature operations, reported missing variable names, and made no live network calls.
- `npm run test:e2e -- --grep @ui-smoke` passed and wrote deterministic HTML snapshots under `/tmp/puresoc-ui-smoke-*`.
- `docker compose -f infra/compose/docker-compose.yml config` passed through the host Docker CLI.
- `git diff --check` passed.

Acceptance status:

- Accepted for M43. The Stripe smoke command is deterministic and dry-run by default; live/test execution is blocked unless M42 readiness and all disposable/test guardrails are satisfied; `sk_live_*` and non-`sk_test_*` secrets are rejected; output is secret-free and omits Checkout/Portal URLs and full Stripe object IDs.

Gaps updated:

- GAP-028 narrowed for a dry-run-first Stripe test-mode smoke command, M42 readiness preflight reuse, `sk_test_*`/`sk_live_*` guardrails, sanitized output, and deterministic fake-client coverage without real Stripe calls or webhook delivery.
- GAP-007, GAP-029, GAP-030, GAP-032, GAP-035, GAP-039, GAP-040, and GAP-043 preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 42 / PLAN_M43 complete and stages Prompt 43 / PLAN_M44 for an object-storage/scanner/evidence runtime disposable smoke harness.
- `docs/PLAN_M44.md` was created from the staged M44 prompt.

Residual risk:

- No live Stripe test account was exercised and no real Stripe webhook delivery was verified.
- Stripe portal configuration, endpoint registration, webhook retry ordering, scheduled billing reconciliation jobs, live database migration/apply operations, and final product/price decisions remain open under GAP-028 and GAP-012.
- The smoke creates Stripe objects only when explicitly run in live-candidate mode against a confirmed disposable/test target; default validation is dry-run only.
