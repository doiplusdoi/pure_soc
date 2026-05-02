# M46 Plan: OIDC/Social Login Disposable Callback Smoke Harness

## Summary

Implement the next active prompt after M45: add a guarded OIDC/social-login disposable callback smoke harness that remains dry-run by default and only allows live provider callback execution when M42 readiness guardrails report the selected provider path is ready.

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
- `docs/PLAN_M45.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/packages/auth/oidc/src/**`
- `code/packages/auth/local/src/**`
- `code/apps/api/src/auth/**`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/rbac/**`
- `code/scripts/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a deterministic OIDC/social smoke command, likely `pnpm oidc:smoke:callback`, that proves planned disposable callback/session operations are safe to run only after the M42 readiness matrix reports the selected provider check as ready.

## Scope

Expected implementation areas:

- OIDC/social callback smoke command with dry-run default.
- Readiness-matrix preflight reuse for `oidc_microsoft_entra_callback`, `oidc_google_callback`, and `oidc_github_callback`.
- Live/disposable guardrails for approved local/test/ci/disposable provider apps only.
- Secret-free output and tests for redaction, unsafe target rejection, missing blockers, dry-run behavior, callback/session metadata, and no account-link bypass.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- Default command mode is dry-run and must not call Microsoft, Google, GitHub, or any external provider.
- Live/disposable execution, if implemented, targets only approved disposable/test provider apps.
- Absence of disposable OIDC provider apps is a blocker to report, not a success to fake.
- State/nonce hashing, PKCE verifier encryption, token/profile redaction, explicit account-linking safeguards, session cookie protections, audit events, and origin/callback exemptions must remain unchanged.
- Provider writes and Microsoft Graph writes remain disabled.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/packages/auth/oidc/src/**`
- `code/packages/auth/local/src/**`
- `code/apps/api/src/auth/**`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/rbac/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M46.md`
- `docs/PLAN_M47.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not call OIDC/OAuth providers, Microsoft Graph, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, public regulatory URLs, or provider write executors in default dry-run mode.
- Do not call production/staging/customer OIDC apps or tenants; live/disposable execution must be local/test/ci/disposable only and explicitly confirmed.
- Do not weaken local auth, session cookies, state/nonce/PKCE storage, account-linking safeguards, origin/rate-limit middleware, audit redaction, regulatory no-auto-activation rules, provider-token redaction, organization scoping, or provider-write disablement.
- Do not print, snapshot, log, or persist client secrets, authorization codes, ID tokens, access tokens, refresh tokens, PKCE code verifiers, state/nonce raw values, session cookies, live profile payloads, user emails from live providers, provider endpoint URLs, Stripe secrets, object-storage credentials, KMS/secret-manager values, or provider tokens.
- Do not treat live smoke absence as success; report blockers honestly.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config auth oidc social login external-smoke api health middleware
pnpm external-smoke:readiness
pnpm oidc:smoke:callback
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If disposable OIDC/social provider apps are unavailable, preserve dry-run behavior and document blockers instead of faking live smoke coverage.

## Expected Gap Movement

- Narrow GAP-032 only for the implemented OIDC/social-login disposable callback smoke harness, dry-run/live-test guardrails, callback/session/cookie metadata checks, and any actual approved disposable app execution result.
- Preserve GAP-007, GAP-028, GAP-029, GAP-030, GAP-035, GAP-039, GAP-040, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- Dry-run command is deterministic and secret-free.
- Live/disposable execution is impossible unless the selected M42 readiness preflight is ready and all disposable/test opt-ins are set.
- Production-like targets, raw state/nonce/PKCE values, endpoint/token/cookie leakage, and account-link bypasses are rejected.
- OIDC callback validation, session safeguards, audit redaction, and origin/callback exemptions are preserved by tests.
- Prompt and gap handoff docs are updated and `docs/PLAN_M47.md` is created.

## Completion Log

Started 2026-05-02.
Completed 2026-05-02.

Implementation results:

- Added `pnpm oidc:smoke:callback` / `npm run oidc:smoke:callback` with dry-run default, selected-provider M42 readiness preflight, production-like target rejection, disposable-target confirmation, provider opt-in checks, and secret-free JSON output.
- Added stricter OIDC readiness behavior so configured OIDC providers must also be enabled before callback readiness can be ready.
- Added a test-only injected disposable callback harness that exercises local API begin/callback/account-link/session-cookie/audit behavior without calling Microsoft, Google, GitHub, or external OIDC endpoints.
- Live real-provider callback execution remains blocked unless a future approved disposable provider app is supplied; no approved Microsoft Entra, Google, or GitHub disposable provider app was exercised in this slice.

Changed files:

- `code/README.md`
- `code/apps/api/src/auth/oidc-smoke.ts`
- `code/apps/api/src/index.ts`
- `code/package.json`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/scripts/oidc-callback-smoke.ts`
- `code/tests/oidc-callback-smoke.spec.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M46.md`
- `docs/PLAN_M47.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Host-node/npm equivalents were used because sandbox-local command execution and local `pnpm`/`npm` were unavailable in this environment.
- Passed: `npm run test -- oidc-callback-smoke external-smoke auth-oidc` (26 tests).
- Passed: `npm run oidc:smoke:callback` (dry-run, no provider calls, no secrets/tokens/cookies/provider URLs in output).
- Passed: `npm run lint`.
- Passed: `npm run test -- config auth oidc social login external-smoke api health middleware` (92 tests).
- Passed: `npm run external-smoke:readiness`.
- Passed: `npm run test:e2e -- --grep @ui-smoke`.
- Passed: `docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.

Acceptance status:

- Accepted for M46 dry-run/disposable-harness scope. The harness is deterministic, secret-free, blocked for unsafe targets, blocked for non-ready selected readiness checks, blocked without an injected disposable harness, and covered by tests for callback/session/account-link/audit redaction behavior.

Gaps updated:

- GAP-032 narrowed for the OIDC/social callback smoke harness, dry-run/live-test guardrails, readiness preflight, and local injected callback/session/cookie metadata checks.
- GAP-007, GAP-028, GAP-029, GAP-030, GAP-035, GAP-039, GAP-040, and GAP-043 remain preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 45 / PLAN_M46 complete and stages Prompt 46 / PLAN_M47.
- `docs/PLAN_M47.md` created for the deployed browser/TLS/proxy auth smoke guardrail slice.

Residual risk:

- No approved live Microsoft Entra, Google, or GitHub disposable provider app was available, so real provider redirect, JWKS/token/profile exchange, and deployed TLS/proxy cookie behavior remain unproven.
- Actual live callback execution remains intentionally blocked by the CLI without an approved disposable target and injected harness.
