# M57 Plan: Memory Repository Split And API Route Table

## Summary

Split the default in-memory repository god-object into per-context memory repositories and replace the long API regex dispatcher with a small route table/dispatcher loop.

Status: staged for implementation after M56.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M56.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/middleware.ts`
- `code/apps/api/src/__tests__/auth-organization-rbac-audit-session.test.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `code/apps/api/src/__tests__/billing-stripe-entitlement-webhook-audit.test.ts`
- `code/apps/api/src/__tests__/api-middleware-rate-limit-origin.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Reduce internal coupling and dispatcher boilerplate without changing API behavior, persistence semantics, middleware ordering, or external integration posture.

## Scope

Expected implementation areas:

- Extract memory-mode auth/identity/org/RBAC, evidence, and billing repository ownership so the default runtime mirrors Prisma mode's per-context repository wiring.
- Remove the `InMemoryPureSocRepository extends InMemoryBillingRepository` god-object shape while preserving all existing memory-mode tests.
- Add a small route table in `apps/api/src/server.ts` with method, pattern, route family, and handler metadata.
- Preserve Stripe raw-body handling, OIDC/provider callback exemptions, request limits, cookies, Origin/rate-limit middleware behavior, and existing response contracts.
- Update docs and handoff state for REC-203/REC-204.

Locked assumptions:

- This milestone is an internal refactor only.
- Prisma repository wiring should not change except where type boundaries need to stay compatible.
- If the memory split grows beyond ten touched implementation files or changes behavior, finish the memory split and restage route-table work separately.

## Negative Constraints

- Do not introduce NestJS, Hono, Express, or another API framework.
- Do not change route URLs, methods, status codes, response bodies, request validation semantics, session cookie behavior, or middleware ordering.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- api auth evidence billing
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow the `docs/claude_rec4.md` REC-203/REC-204 architecture risks in the implementation handoff docs.
- Preserve GAP-044; M57 must not run external smoke commands.

## Acceptance Criteria

- Memory-mode repositories are split by context and no longer rely on a billing-inherited god-object.
- Existing memory-mode auth/org/RBAC, evidence/report/dashboard, billing, middleware, and UI-smoke behavior remains compatible.
- API route dispatch uses a route-table loop while preserving middleware route-family behavior and raw-body/callback exemptions.
- No live external services, provider writes, or external-smoke commands are called.
- Prompt and gap handoff docs are updated and `docs/PLAN_M58.md` is created.

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

- Pending. M57 implementation must create `docs/PLAN_M58.md` before final response.

Residual risk:

- Pending.
