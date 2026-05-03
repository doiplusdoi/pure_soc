# M64 Plan: Browser Organization Selection Baseline

## Summary

Add a small served-web organization selection surface so local web and browser smokes can choose an API-backed workspace after login instead of relying only on a hidden `organizationId` query parameter.

Status: completed.
Created: 2026-05-03.
Started: 2026-05-03.

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

Started 2026-05-03.
Completed 2026-05-03.

Implementation results:

- Added API-backed current-session organization listing via `GET /organizations` and active-organization selection via `POST /auth/session/active-organization`.
- Extended memory and Prisma identity/organization repositories so session active organization changes and current-user organization memberships share the same repository boundary as auth/RBAC.
- Added a served web workspace selector at `GET /workspaces` plus `POST /workspaces/select`; `/` now renders the selector when a valid session has no active organization.
- Added visible operational-console workspace switching affordance and selected-organization source metadata.
- Extended UI/browser smoke seeding to create two organizations, log in without an active organization, select a workspace through the web/API contract, and prove the selected dashboard snapshot renders.
- Preserved Romania route, keyboard traversal, pointer traversal, browser screenshots, auth cookie, Origin, callback-exemption, and no-live-call checks.

Changed files:

- `code/apps/api/src/__tests__/auth-organization-rbac-audit-session.test.ts`
- `code/apps/api/src/__tests__/auth-organization-rbac-prisma-persistence.test.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/organizations/routes.ts`
- `code/apps/api/src/organizations/service.ts`
- `code/apps/api/src/server.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/index.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/packages/auth/local/src/index.ts`
- `code/packages/database/src/__tests__/prisma-identity-organization-rbac.repository.spec.ts`
- `code/packages/database/src/repositories/identity-organization-rbac.ts`
- `code/scripts/run-ui-smoke.mjs`
- `code/README.md`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M64.md`
- `docs/PLAN_M65.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Local sandbox did not expose `node`, `npm`, or `pnpm`; validation used host `flatpak-spawn --host npm` equivalents.
- `npm run test -- web ui-smoke browser organization selection dashboard session` passed: 10 files, 34 tests.
- `npm run test:e2e -- --grep @ui-smoke` passed and wrote artifacts under `/tmp/puresoc-ui-smoke-lEzRiS`, including `workspaces-desktop-1440x900.html` and `workspaces-mobile-390x844.html`.
- `npm run test:e2e -- --grep @browser-smoke` passed with host Firefox `/usr/bin/firefox` version `150.0` in headless mode and wrote artifacts under `/tmp/puresoc-browser-smoke-DOmxed`.
- `npm run lint` initially caught an invalid `AuthErrorCode` for the new route; after changing the rejection to `forbidden`, `npm run lint` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed after documentation updates.

Acceptance status:

- Accepted for M64: served web exposes a visible authenticated workspace selector, HTTP and Firefox browser smokes prove selected organization dashboard rendering, and existing auth/Romania/browser traversal coverage is preserved.

Gaps updated:

- GAP-031 narrowed for visible web/API workspace selection, active-membership-checked session switching, HTTP selection smoke, and Firefox browser workspace selection.
- GAP-042 remains open for product/legal-approved Romanian legal/regulatory copy.
- GAP-044 remains open and unchanged; no external smoke commands or live external targets were run.

Prompt handoff:

- `docs/codex-prompts.md` updated to retire M64 and stage M65.
- `docs/PLAN_M65.md` created as the next active milestone stub.

Residual risk:

- Browser workspace selection is proven only for the available Firefox WebDriver BiDi path; cross-browser Playwright/Chromium/WebKit parity remains deferred.
- Screenshot-diff thresholds remain deferred to M65.
- Full Next.js/React runtime behavior, deployed TLS/CORS/proxy browser smoke, live OIDC callback cookies, and external integration smokes remain out of scope.
