# M52 Plan: API Redis Rate-Limit Store Adapter Contract Slice

## Summary

Narrow GAP-038 further by implementing the shared-store side of the API rate-limit store boundary added in M51, without changing route-family semantics or trusting forwarded headers by default.

Status: staged for implementation after M51.
Created: 2026-05-03.

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

- Pending. M52 implementation must create `docs/PLAN_M53.md` before final response.

Residual risk:

- Pending.
