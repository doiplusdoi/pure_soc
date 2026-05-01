# M20 Plan: API Middleware And Rate-Limit Baseline

## Summary

Implement Prompt 19 from `docs/codex-prompts.md`: add a focused API middleware baseline for the current `node:http` server, including shared request context helpers, Origin/Referer protection for browser state-changing requests, and configurable deterministic rate limiting.

Status: completed.
Created: 2026-05-01.
Started: 2026-05-01.
Completed: 2026-05-01.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/threat-model.md`
- `docs/claude_rec2.md`
- `docs/PLAN_M19.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-008-evidence-storage-metadata-and-export-model.md`
- `docs/adr/ADR-010-remediation-safety-model.md`
- `docs/adr/ADR-013-auth-oidc-social-login-and-managed-provider-consent-boundaries.md`

## Goal

Reduce API security drift in the existing server without a broad framework migration.

The milestone should make it harder for future routes to forget shared protection decisions while preserving current route behavior, Stripe raw-body verification, M16 body-size limits, organization-scoped authorization, evidence redaction, regulatory no-auto-activation, and remediation safety checks.

## Scope

Expected implementation areas:

- Shared API request context and middleware helpers compatible with the current `node:http` server.
- Typed config defaults and environment overrides for trusted origins and route-family rate limits.
- Deterministic in-memory rate limiter for tests, with clear keys for unauthenticated IP and authenticated user/org dimensions.
- Origin/Referer allowlist enforcement for browser state-changing methods.
- Explicit route exemptions where browser Origin checks do not apply, especially Stripe webhook raw-body verification and provider/OIDC callback shapes.
- Focused application to high-risk existing routes: auth/OIDC callbacks, evidence, billing, remediation actions, regulatory review actions, provider connection/sync routes, and other tenant state-changing APIs.
- Tests for middleware ordering, rate-limit rejection, allowed/rejected origins, Stripe raw-body preservation, evidence upload limit compatibility, and auth/RBAC regression.

Assumptions for implementation:

- Keep the existing `node:http` dispatcher and add shared helpers around it; do not migrate to a new API framework in this milestone.
- Treat Origin/Referer protection and rate limiting as contract-level controls. Deployed browser/CORS/cookie smoke remains tracked separately unless this run performs a real browser deployment smoke.
- Preserve public provider/webhook callback behavior by applying explicit middleware policies per route family instead of a blanket body-consuming wrapper.
- Use deterministic in-memory rate limiting for now; distributed/proxy-aware rate limiting remains a runtime hardening follow-up if not implemented here.

Expected files:

- `code/.env.example`
- `code/config/defaults/api.json` or adjacent config defaults as appropriate
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/middleware.ts` or `code/apps/api/src/http/middleware.ts`
- `code/apps/api/src/rate-limit.ts`
- `code/apps/api/src/__tests__/*.test.ts`
- Existing route modules under `code/apps/api/src/**/routes.ts` as needed
- `README.md`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M20.md`
- `docs/PLAN_M21.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not introduce a broad API framework migration.
- Do not weaken Stripe raw-body signature verification.
- Do not consume request bodies twice or bypass M16 body-size limits.
- Do not weaken organization-scoped authorization, evidence response redaction, audit redaction, regulatory no-auto-activation guardrails, or remediation safety checks.
- Do not add provider write/remediation execution.
- Do not add Microsoft-specific logic to generic API middleware.
- Do not add Romania-specific logic outside Romania country-pack/importer surfaces.
- Do not hardcode regulatory facts in UI conditionals.
- Do not make legal certification claims.
- Do not claim deployed browser/CORS/CSRF production smoke is complete from unit tests alone.
- Do not run live Stripe, Microsoft Graph, OIDC, MinIO/S3, public regulatory URL, or provider-write smoke tests in unit tests.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- api middleware rate-limit origin csrf auth billing evidence actions regulatory
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

If Docker/API runtime smoke is available, also run a bounded API smoke that proves `/health` still works and at least one protected route returns the expected middleware-shaped error. If Docker is unavailable, add static/unit coverage and record live Docker/browser smoke as residual risk.

## Expected Gap Movement

- Narrow API security/runtime gaps by adding contract-level middleware, Origin, and rate-limit protection.
- Preserve GAP-035 as deployed cookie/CORS/browser-auth smoke unless this milestone runs a real deployed browser smoke.
- Preserve GAP-030: do not enable live provider write/remediation execution.
- Preserve GAP-028, GAP-029, GAP-031, GAP-032, GAP-033, GAP-036, and GAP-037 unless this milestone directly validates those runtime areas.
- Create or update gaps for distributed rate limiting, proxy-aware client IP handling, CSRF token rollout, or browser/deployment smoke intentionally deferred.

## Acceptance Criteria

- Existing API tests keep passing with shared middleware in place.
- State-changing browser routes reject untrusted Origin/Referer values with stable JSON errors.
- Allowed same-origin requests continue to work.
- Rate-limited route families return stable `429` responses without consuming large request bodies unnecessarily.
- Stripe webhook raw-body verification still receives the original raw body.
- Evidence upload size-limit behavior remains compatible with M16.
- Auth, RBAC, regulatory review, evidence redaction, and remediation safety regressions are covered by focused tests.

## Completion Log

Completed 2026-05-01.

Implementation results:

- Added `code/apps/api/src/middleware.ts` with shared request context, route-family classification, trusted-Origin/Referer validation for state-changing browser routes, and explicit exemptions for Stripe webhook, OIDC callback, and Microsoft/provider callback route families.
- Added `code/apps/api/src/rate-limit.ts` with a deterministic in-memory fixed-window limiter.
- Wired middleware into `apps/api/src/server.ts` before JSON/raw-body parsing for non-health routes, preserving Stripe raw-body verification.
- Added typed API config defaults and environment overrides for trusted origins, origin protection toggles, route-family exemptions, and fixed-window rate-limit windows/counts.
- Added focused middleware tests covering route classification, rate-limit responses, untrusted-Origin rejection before JSON parsing, trusted same-origin requests, Stripe raw-body preservation with webhook Origin exemption, and compatibility with existing auth/RBAC/evidence/body-limit behavior.
- Updated docs and prompt handoff to mark M20 complete and stage M21.

Changed files:

- `README.md`
- `code/.env.example`
- `code/README.md`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/middleware.ts`
- `code/apps/api/src/rate-limit.ts`
- `code/apps/api/src/__tests__/api-middleware-rate-limit-origin.test.ts`
- `code/config/defaults/api.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `docs/PLAN.md`
- `docs/PLAN_M20.md`
- `docs/PLAN_M21.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available, so host-node equivalents were used through `flatpak-spawn --host`.
- `npm run lint` passed.
- `npm run test -- api middleware rate-limit origin csrf auth billing evidence actions regulatory` passed: 31 test files, 104 tests.
- `npm run test -- config` passed: 2 test files, 9 tests.
- After provider-neutralizing the consent-callback route classifier, `npm run test -- middleware` passed: 1 test file, 6 tests, and `npm run lint` passed again.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- Bounded host API smoke passed: `/health` returned `status:"ok"`, and `POST /organizations/org_smoke/evidence/upload` with `Origin: https://evil.example.test` returned `403 origin_not_allowed` without requiring body parsing/auth first.
- `git diff --check` passed.
- New untracked files were checked for trailing whitespace with `rg -n "[ \t]$" ...`; no matches.

Acceptance status:

- Accepted for M20. The current code satisfies the route-family middleware, Origin, rate-limit, Stripe raw-body, evidence body-limit, and no-auth/RBAC-regression acceptance criteria.

Gaps updated:

- GAP-035 narrowed for contract-level Origin/Referer protection while preserving deployed browser/CORS/cookie smoke as open.
- GAP-038 created for distributed/shared rate limiting, proxy-aware client-IP trust policy, strict CSRF-token rollout, and deployed smoke follow-up.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 19 / PLAN_M20 complete and stages Prompt 20 / PLAN_M21.
- `docs/PLAN_M21.md` created for Audit Log Integrity And Provider Key Handling.

Residual risk:

- Rate limiting is process-local and in-memory; multi-process/shared Redis-backed limits remain deferred in GAP-038.
- IP extraction still relies on the existing request-context behavior and does not define a trusted reverse-proxy policy; deferred in GAP-038.
- Origin/Referer checks are contract-level protections and do not replace a strict CSRF token for a future served browser runtime; deferred in GAP-038/GAP-035.
- No live browser/CORS/cookie smoke was run; GAP-035 remains open.
- Provider write/remediation execution remains disabled; GAP-030 remains open.
