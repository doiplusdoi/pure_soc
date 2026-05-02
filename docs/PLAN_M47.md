# M47 Plan: Deployed Browser/TLS/Proxy Auth Smoke Guardrail Slice

## Summary

Implement the next active prompt after M46: add a guarded deployed-auth smoke harness for browser/session behavior across TLS, reverse-proxy, forwarded-header, cookie, Origin/CORS, and callback-exemption boundaries. Dry-run mode must remain the default.

Status: staged for implementation after M46.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M46.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/packages/auth/local/src/**`
- `code/packages/auth/oidc/src/**`
- `code/apps/api/src/auth/**`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/middleware.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/rbac/**`
- `code/scripts/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a deterministic deployed-auth smoke command, likely `pnpm auth:smoke:deployment`, that can prove auth/session/cookie/origin/proxy prerequisites are safe to exercise only against explicitly approved local/test/ci/disposable targets.

## Scope

Expected implementation areas:

- Deployed-auth smoke command with dry-run default.
- Live/disposable guardrails for local/test/ci/disposable deployment targets only.
- Secret-free output for registration/login/session/logout, cookie attributes, trusted/untrusted Origin behavior, callback exemptions, forwarded-header metadata, and health checks.
- Tests for redaction, unsafe target rejection, missing blockers, dry-run behavior, and any local/disposable execution path.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- Default command mode is dry-run and must not call deployed targets or browser/external services.
- Live/disposable execution, if implemented, targets only approved local/test/ci/disposable base URLs.
- Absence of an approved deployed/local target is a blocker to report, not a success to fake.
- Session cookie, local auth, Origin middleware, callback exemption, RBAC, audit redaction, and provider-write disablement must remain unchanged.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/packages/auth/local/src/**`
- `code/packages/auth/oidc/src/**`
- `code/apps/api/src/auth/**`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/middleware.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/rbac/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M47.md`
- `docs/PLAN_M48.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not call production/staging/customer deployments or public unknown targets; live/disposable execution must be explicitly approved for local/test/ci/disposable targets only.
- Do not call OIDC/OAuth providers, Microsoft Graph, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, public regulatory URLs, or provider write executors in default dry-run mode.
- Do not weaken local auth, session cookies, state/nonce/PKCE storage, account-linking safeguards, origin/rate-limit middleware, audit redaction, regulatory no-auto-activation rules, provider-token redaction, organization scoping, provider-write disablement, or callback exemptions.
- Do not print, snapshot, log, or persist passwords, session tokens, session cookies, authorization headers, client secrets, authorization codes, ID/access/refresh tokens, raw state/nonce values, PKCE code verifiers, live profile payloads, user emails from live providers, provider endpoint URLs, Stripe secrets, object-storage credentials, KMS/secret-manager values, or provider tokens.
- Do not treat live smoke absence as success; report blockers honestly.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config auth deployment-smoke api health middleware
pnpm auth:smoke:deployment
pnpm external-smoke:readiness
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If approved disposable deployed/local auth targets are unavailable, preserve dry-run behavior and document blockers instead of faking deployed TLS/proxy coverage.

## Expected Gap Movement

- Narrow GAP-035 only for the implemented deployed-auth smoke harness, dry-run/live-test guardrails, cookie/TLS/proxy/origin metadata checks, and any actual approved disposable/local execution result.
- Narrow GAP-038 only if distributed/proxy-aware rate-limit or CSRF-token behavior is intentionally implemented and accepted.
- Preserve GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- Dry-run command is deterministic and secret-free.
- Live/disposable execution is impossible unless target and opt-in guardrails are satisfied.
- Production/staging/customer targets, cookie/token leakage, endpoint leakage, and auth middleware bypasses are rejected.
- Existing local auth, session, Origin/callback exemption, audit redaction, and UI-smoke behavior are preserved by tests.
- Prompt and gap handoff docs are updated and `docs/PLAN_M48.md` is created.

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

- Pending. M47 implementation must create `docs/PLAN_M48.md` before final response.

Residual risk:

- Pending.
