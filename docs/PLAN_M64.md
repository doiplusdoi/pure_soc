# M64 Plan: Browser Organization Selection Baseline

## Summary

Add a small served-web organization selection surface so local web and browser smokes can choose an API-backed workspace after login instead of relying only on a hidden `organizationId` query parameter.

Status: staged for implementation after M63.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M63.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/organizations/routes.ts`
- `code/package.json`
- `code/README.md`

## Goal

Prove a customer-shaped browser path for selecting an organization in the served web runtime while preserving the current lightweight `node:http` stack and no-live-call posture.

## Scope

Expected implementation areas:

- Add a lightweight API-backed workspace selection route or login-state surface in `apps/web`.
- Use existing API/session/membership contracts so workspace selection never widens organization access.
- Extend `@ui-smoke` to seed multiple organizations, exercise selection, and prove the selected dashboard snapshot renders.
- Extend `@browser-smoke`, when Firefox WebDriver BiDi is available, to select a workspace through visible controls after login.
- Keep M61 screenshots, M62 keyboard traversal, M63 pointer traversal, browser-auth, cookie, Origin, callback-exemption, and Romania route checks intact.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/organizations/routes.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M64.md`
- `docs/PLAN_M65.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone is organization selection for the existing served web runtime, not a Next.js/React, Playwright, router, or layout migration.
- Browser organization selection coverage is claimed only when Firefox WebDriver BiDi is available and the smoke reaches the selection controls.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.
- Do not widen session scope across organizations; organization selection must be constrained to authenticated memberships.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke browser organization selection dashboard session
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` proof.

## Expected Gap Movement

- Narrow GAP-031 for browser organization selection when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M64 must not run external smoke commands or live external targets.

## Acceptance Criteria

- The served web runtime exposes a visible organization-selection path for authenticated users with multiple memberships.
- Local HTTP and browser smokes prove the selected organization controls the rendered dashboard snapshot.
- Existing browser screenshot, keyboard traversal, pointer traversal, auth/cookie/Origin checks and the M60 `@ui-smoke` route snapshot path still pass.
- Prompt and gap handoff docs are updated and `docs/PLAN_M65.md` is created.

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

- Pending. M64 implementation must create `docs/PLAN_M65.md` before final response.

Residual risk:

- Pending.
