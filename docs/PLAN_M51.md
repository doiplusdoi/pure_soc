# M51 Plan: API Rate-Limit Store, Trusted Proxy, And CSRF Decision Slice

## Summary

Narrow GAP-038 by hardening the API middleware model around distributed-rate-limit readiness, proxy-aware client-IP trust, and a concrete CSRF-token decision for browser state-changing routes.

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
- `docs/PLAN_M50.md`
- `docs/threat-model.md`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/middleware/**`
- `code/apps/api/src/auth/**`
- `code/packages/config/src/**`
- `code/packages/jobs/src/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a bounded API security hardening slice that preserves the current memory-mode default while making production rate limiting and browser request integrity less process-local and less proxy-ambiguous.

## Scope

Expected implementation areas:

- Add or refine a rate-limit store boundary that can support an external/shared store without changing route-family semantics.
- Preserve deterministic in-memory rate limiting for local tests and default development runs.
- Add proxy-aware client-IP trust configuration so forwarded headers are ignored unless an explicit trusted-proxy policy is configured.
- Record and implement the near-term CSRF stance for browser state-changing routes, either strict Origin/Referer only with explicit limitations or a double-submit token contract if the existing server shape can support it safely.
- Add tests for trusted/untrusted forwarded headers, route-family rate-limit behavior, secret-free error responses, and CSRF/Origin behavior.
- Update GAP-038 and docs with what remains deferred.

Locked assumptions:

- Browser session cookies remain `HttpOnly` and `SameSite=Lax` unless a deliberate cookie ADR/config change is made.
- Webhook, OIDC callback, and provider callback exemptions must remain explicit and tested.
- No live Redis, browser, provider, billing, object storage, scanner, KMS, or external network target is required for this milestone.
- This slice must not weaken existing body-size limits, Stripe raw-body preservation, evidence upload limits, or callback exemptions.
- The near-term CSRF decision is strict Origin/Referer validation for production startup and configurable local/development enforcement. A double-submit token is deferred until a served browser runtime can carry the token contract end to end.
- Shared/distributed API rate limiting remains deferred at runtime; this milestone adds the store boundary and explicit configuration/readiness metadata while preserving process-local memory defaults.

Expected files:

- `code/apps/api/src/**`
- `code/packages/config/src/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M51.md`
- `docs/PLAN_M52.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

## Negative Constraints

- Do not call Microsoft Graph, OIDC/OAuth providers, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external signing services, public regulatory URLs, production/staging/customer deployments, or provider write executors.
- Do not introduce a broad trusted-proxy default that trusts arbitrary `X-Forwarded-For` or `Forwarded` headers.
- Do not rate-limit Stripe webhook raw-body parsing in a way that consumes or mutates the raw body before signature verification.
- Do not remove OIDC/provider/webhook callback Origin exemptions without replacement tests proving those flows still work.
- Do not store or print session cookies, authorization headers, OAuth codes, provider tokens, client secrets, key material, live endpoint URLs, user emails, or object-storage keys.
- Do not enable provider write execution or Microsoft Graph write/remediation scopes.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- api middleware rate limit proxy csrf config
pnpm external-smoke:readiness
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-038 for proxy-aware IP trust and whichever rate-limit/CSRF behavior is implemented.
- Keep GAP-035 open for deployed browser/TLS/proxy smoke until an approved deployed target is exercised.
- Keep GAP-043 open unless production multi-process queue/Redis operations are intentionally changed and validated.
- Keep GAP-044 open unless an approved external live-smoke target is selected and exercised.

## Acceptance Criteria

- Forwarded client IPs are ignored by default and honored only under explicit trusted-proxy configuration.
- Route-family rate limits still work in memory mode and have a documented/typed path toward a shared store.
- Browser state-changing route integrity is stricter or explicitly documented with tests for the chosen near-term CSRF posture.
- Existing webhook/OIDC/provider callback exemptions and raw-body behavior remain covered.
- Prompt and gap handoff docs are updated and `docs/PLAN_M52.md` is created.

## Completion Log

Started 2026-05-03.

Implementation results:

- Added an explicit API rate-limit store boundary: `RateLimitStore`, `FixedWindowRateLimiter`, and an in-memory fixed-window store while keeping existing memory behavior deterministic.
- Added API rate-limit store configuration with memory defaults, Redis/shared-store env names, startup blockers for deferred Redis adapter selection, and a `requireSharedStore` refusal path for deployments that must not use process-local memory.
- Made request context proxy-aware. Socket IPs are used by default; `X-Forwarded-For` and `Forwarded` are honored only when `PURESOC_API_TRUST_FORWARDED_HEADERS=true` and the socket peer matches `PURESOC_API_TRUSTED_PROXY_IPS`.
- Preserved route-family semantics, webhook raw-body handling, and OIDC/provider/webhook Origin exemptions.
- Chose and documented the near-term CSRF stance: production startup requires Origin/Referer protection enabled and `PURESOC_API_REQUIRE_ORIGIN_OR_REFERER=true`; double-submit CSRF tokens remain deferred until a served browser runtime can carry the token contract safely.
- Updated auth deployment readiness/smoke metadata so forwarded-header rate-limit checks distinguish configured trusted-proxy behavior from ignored forwarded headers.

Changed files:

- `code/README.md`
- `code/apps/api/src/__tests__/api-middleware-rate-limit-origin.test.ts`
- `code/apps/api/src/auth/deployment-smoke.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/middleware.ts`
- `code/apps/api/src/rate-limit.ts`
- `code/config/defaults/api.json`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/packages/config/src/index.ts`
- `code/tests/auth-deployment-smoke.spec.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M51.md`
- `docs/PLAN_M52.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Failed first, expected: `pnpm test -- api middleware rate limit proxy csrf config` (`pnpm: command not found`).
- Passed: `flatpak-spawn --host npm run test -- api middleware rate limit proxy csrf config` (25 files, 95 tests).
- Passed: `flatpak-spawn --host npm run test -- auth-deployment-smoke` (1 file, 4 tests).
- Failed first, expected: `pnpm lint` (`pnpm: command not found`).
- Passed: `flatpak-spawn --host npm run lint`.
- Failed first, expected: `pnpm external-smoke:readiness` (`pnpm: command not found`).
- Passed: `flatpak-spawn --host npm run external-smoke:readiness` (dry-run metadata only, no live calls; startup validation issue codes empty).
- Failed first, expected: `docker compose -f infra/compose/docker-compose.yml config` (`docker: command not found`).
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.

Acceptance status:

- Accepted for M51. The middleware now has a shared-store-compatible rate-limit boundary, proxy-aware client-IP trust defaults to socket-only, production strict Origin/Referer posture is enforced by startup validation, exemptions remain covered, and no live external services or provider writes were called.

Gaps updated:

- GAP-038 remains open and was narrowed for rate-limit store boundary/config validation, proxy-aware client-IP trust, and production strict Origin/Referer startup validation.
- GAP-035, GAP-043, and GAP-044 remain open.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 50 / PLAN_M51 complete and stages Prompt 51 / PLAN_M52.
- `docs/PLAN_M52.md` created as the next active milestone stub.

Residual risk:

- API rate limiting is still process-local in the implemented runtime store; Redis/shared API rate-limit store execution is staged for M52.
- Deployed TLS/proxy/browser behavior remains unproven until an approved local/test/ci/disposable target is exercised under GAP-035.
- Double-submit CSRF tokens remain deferred until the served browser runtime can safely issue and submit token headers end to end.
