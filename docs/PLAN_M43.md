# M43 Plan: Stripe Test-Mode Disposable Smoke Harness And Guardrail Slice

## Summary

Implement the next active prompt after M42: add a guarded Stripe test-mode smoke harness that remains dry-run by default and only allows live Stripe test-mode execution when M42 readiness guardrails report the Stripe path is ready for a disposable/test run.

Status: staged for implementation after M42.
Created: 2026-05-02.

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

- Pending. M43 implementation must create `docs/PLAN_M44.md` before final response.

Residual risk:

- Pending.
