# M52 Plan: API Redis Rate-Limit Store Adapter Contract Slice

## Summary

Narrow GAP-038 further by implementing the shared-store side of the API rate-limit store boundary added in M51, without changing route-family semantics or trusting forwarded headers by default.

Status: completed.
Created: 2026-05-03.
Started: 2026-05-03.
Completed: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M51.md`
- `docs/threat-model.md`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/middleware.ts`
- `code/apps/api/src/rate-limit.ts`
- `code/packages/config/src/**`
- `code/packages/jobs/src/**`
- `code/scripts/*redis*`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Implement or deliberately split the Redis/shared API rate-limit store path so `PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis` no longer has to remain a configuration-only deferred adapter.

## Scope

Expected implementation areas:

- Redis-backed fixed-window API rate-limit store adapter behind the existing `RateLimitStore` boundary.
- Runtime selection from `PURESOC_API_RATE_LIMIT_STORE_PROVIDER`.
- Deterministic fake-client tests for command shape, TTL/window behavior, retry/failure behavior, and secret-free errors.
- Optional local/test/ci/disposable smoke command only if it follows existing guardrails and stays dry-run or fake-client by default.
- Documentation and GAP-038 handoff updates.

Locked assumptions:

- Process-local memory remains the default for development and tests.
- Route-family classification, authenticated user/org keys, webhook raw-body handling, Origin exemptions, and trusted-proxy behavior must not change.
- No production/staging/customer Redis target is approved by default.

## Negative Constraints

- Do not call Microsoft Graph, OIDC/OAuth providers, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external signing services, public regulatory URLs, production/staging/customer deployments, or provider write executors.
- Do not trust arbitrary `X-Forwarded-For` or `Forwarded` headers.
- Do not silently fall back from configured Redis/shared rate limiting to memory in production-like modes.
- Do not print Redis URLs containing credentials, session cookies, authorization headers, OAuth codes, provider tokens, client secrets, key material, live endpoint URLs, user emails, or object-storage keys.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- api middleware rate limit redis config
pnpm external-smoke:readiness
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-038 if the Redis/shared API rate-limit adapter is implemented and tested.
- Keep GAP-035 open for deployed browser/TLS/proxy smoke until an approved deployed target is exercised.
- Keep GAP-043 open unless production multi-process queue/Redis operations beyond API rate limiting are intentionally changed and validated.
- Keep GAP-044 open unless an approved external live-smoke target is selected and exercised.

## Acceptance Criteria

- Memory rate limiting remains the default and deterministic.
- Redis/shared rate-limit configuration selects an implemented adapter or remains explicitly blocked with documented reasons.
- Route-family rate-limit behavior remains unchanged across memory and shared-store paths.
- Redis configuration and errors remain secret-free in command output and API responses.
- Prompt and gap handoff docs are updated and `docs/PLAN_M53.md` is created.

## Completion Log

Started 2026-05-03.

Implementation results:

- Added `RedisFixedWindowRateLimitStore` behind the existing API `RateLimitStore` boundary and runtime selection for `PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis`.
- Preserved process-local memory as the default provider and kept route-family keys, authenticated user/org keying, trusted-proxy behavior, webhook raw-body handling, and OIDC/provider/webhook Origin exemptions unchanged.
- Reused the shared Redis command client with a new EVAL command path. The API adapter uses a Redis Lua fixed-window script, configurable retry/backoff, and hashed Redis keys so raw IP/user/org material is not embedded in key names.
- Removed the deferred Redis startup blocker and replaced it with missing/invalid Redis URL validation. `PURESOC_API_RATE_LIMIT_REQUIRE_SHARED_STORE=true` still rejects memory mode instead of silently falling back.
- Added secret-free 503 behavior when the configured shared rate-limit store is unavailable.
- Updated readiness/deployment-smoke metadata from `shared_external_deferred` to `shared_external`.

Changed files:

- `code/.env.example`
- `code/README.md`
- `code/apps/api/package.json`
- `code/apps/api/src/__tests__/api-middleware-rate-limit-origin.test.ts`
- `code/apps/api/src/auth/deployment-smoke.ts`
- `code/apps/api/src/middleware.ts`
- `code/apps/api/src/rate-limit.ts`
- `code/config/defaults/api.json`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/packages/config/src/index.ts`
- `code/packages/jobs/src/__tests__/job-runtime.spec.ts`
- `code/packages/jobs/src/index.ts`
- `code/pnpm-lock.yaml`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M52.md`
- `docs/PLAN_M53.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Failed first, expected: `pnpm lint` (`pnpm: command not found`).
- Passed: `flatpak-spawn --host npm run lint`.
- Passed: `flatpak-spawn --host npm run test -- api middleware rate limit redis config` (25 files, 99 tests).
- Passed: `flatpak-spawn --host npm run test -- jobs rate limit redis config` (7 files, 55 tests).
- Passed after `.env.example`/Redis URL fallback update: `flatpak-spawn --host npm run test -- config rate limit redis` (6 files, 47 tests).
- Passed: `flatpak-spawn --host npm run external-smoke:readiness` (dry-run metadata only; no live calls; `startupValidationIssueCodes: []`; `ready_for_disposable_smoke: 0`).
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.

Acceptance status:

- Accepted for M52. Redis/shared API rate limiting is implemented behind the existing store boundary, memory remains the deterministic default, route-family/origin/proxy semantics are preserved, Redis keys are hashed, Redis command/failure behavior is covered deterministically, and no live external services, Redis targets, or provider writes were called.

Gaps updated:

- GAP-038 remains open and was narrowed for the implemented Redis shared-store adapter, hashed Redis keys, EVAL fixed-window command coverage, retry/failure tests, secret-free store-unavailable API responses, and startup validation.
- GAP-035 remains open for deployed browser/TLS/proxy smoke.
- GAP-043 remains open for production multi-process queue/Redis operations; M52 did not change job queue orchestration.
- GAP-044 remains open because no approved external live-smoke target was selected or exercised.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 51 / PLAN_M52 complete and stages Prompt 52 / PLAN_M53.
- `docs/PLAN_M53.md` created as the next active milestone stub.

Residual risk:

- The API Redis adapter has deterministic fake-client coverage but no bounded live Redis smoke was added or run for API rate limiting.
- Deployed TLS/proxy/browser behavior remains unproven until an approved local/test/ci/disposable target is exercised under GAP-035.
- Double-submit CSRF tokens remain deferred until the served browser runtime can safely carry token issuance and header submission end to end.
