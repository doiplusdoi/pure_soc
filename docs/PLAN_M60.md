# M60 Plan: Served Romania Route UI Smoke Coverage

## Summary

Extend the local served UI smoke so the Romania onboarding route added in M59 is exercised through the served web runtime, not only through unit/server tests.

Status: staged for implementation after M59.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M59.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Make the served Romania onboarding route part of the deterministic local UI smoke path while preserving the lightweight `node:http` runtime and no-live-call posture.

## Scope

Expected implementation areas:

- Update `@ui-smoke` to fetch `GET /onboarding/romania?locale=ro-RO` from the local web server.
- Write deterministic route snapshot metadata or desktop/mobile HTML viewport snapshots for the Romania route.
- Assert source-map, caveat, fallback, unsupported-state, no-DNSC-submission, responsive/focus, and forbidden legal/certification claim behavior.
- Keep existing dashboard, login/session proxy, cookie, Origin, and callback exemption checks intact.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M60.md`
- `docs/PLAN_M61.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone is route-specific smoke coverage, not a full Next.js/React or Playwright migration.
- Romanian legal-caveat and regulatory notification copy remain English fallback until product/legal approval exists.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals.
- Do not introduce a broad frontend framework, router migration, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke romania onboarding
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-031 for local served UI smoke coverage of the Romania onboarding route.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M60 must not run external smoke commands.

## Acceptance Criteria

- `@ui-smoke` fetches and checks the served Romania onboarding route.
- The route smoke proves source-map, legal-caveat, fallback, unsupported-state, and no-DNSC-submission signals.
- Existing dashboard/login/session/cookie/Origin checks still pass.
- Prompt and gap handoff docs are updated and `docs/PLAN_M61.md` is created.

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

- Pending. M60 implementation must create `docs/PLAN_M61.md` before final response.

Residual risk:

- Pending.
