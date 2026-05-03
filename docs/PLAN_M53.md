# M53 Plan: Served Web Runtime Baseline

## Summary

Re-sequence M53 from another external-smoke blocker review to the served web runtime baseline recommended by `docs/claude_rec4.md`: keep the current lightweight `node:http` runtime for now, document the stack deviation, and make the web surface consume real API auth/session/dashboard responses instead of rendering only the static demo model.

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
- `docs/PLAN_M52.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/apps/web/src/**`
- `code/apps/api/src/auth/**`
- `code/apps/api/src/dashboards/**`
- `code/apps/api/src/server.ts`
- `code/scripts/run-ui-smoke.mjs`
- `code/packages/ui/src/**`
- `code/packages/database/src/repositories/output-records.ts`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Give PureSOC a real served web baseline that proves browser-facing login can post to the API, receive the API-issued session cookie through the web server, resolve `/auth/session`, and render the dashboard from an organization-scoped API dashboard snapshot.

## Scope

Expected implementation areas:

- Add ADR-017 documenting current stack deviations from the master plan and the re-evaluation triggers for web/API/router/queue/browser tooling.
- Add an API `GET /organizations/:orgId/dashboards/snapshots/latest` route with RBAC and organization scoping.
- Update `apps/web` so:
  - `GET /login` renders a real submit form.
  - `POST /auth/login` proxies to API `/auth/login`, preserves the session cookie, and redirects to the dashboard.
  - `GET /auth/session` proxies to API `/auth/session`.
  - `GET /` resolves the current session and active organization, then renders the console from the latest dashboard snapshot API response.
  - unauthenticated or no-active-organization states render explicit, non-certification UI states.
- Extend local `@ui-smoke` coverage to seed an API organization/dashboard snapshot, log in through the web server, and assert rendered dashboard data came from the API response.
- Update the active prompt sequence so the external live-smoke follow-up becomes M54.

Locked assumptions:

- No package install or network dependency is required for this milestone.
- The current `node:http` runtime remains acceptable for the baseline while ADR-017 records the deviation from Next.js/NestJS/BullMQ/Playwright.
- Provider write execution and live external integrations remain disabled.
- The web dashboard needs an active organization in the session; creating/selecting organizations in the browser remains a later product flow.

## Negative Constraints

- Do not call Microsoft Graph, OIDC/OAuth providers, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external signing services, public regulatory URLs, production/staging/customer deployments, Redis targets, or provider write executors.
- Do not add Microsoft-specific logic to generic compliance or dashboard rendering.
- Do not hardcode Romania regulatory rules into UI conditionals.
- Do not print or persist session tokens, session cookies, authorization headers, OAuth codes, provider tokens, client secrets, key material, user emails from live targets, endpoint secrets, object keys, provider payloads, or rendered report bodies.
- Do not claim legal certification or use banned wording such as certified compliant, guaranteed NIS2 compliance, or legal compliance approved.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web dashboard auth session api
pnpm test:e2e -- --grep @ui-smoke
pnpm external-smoke:readiness
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-031 for a real served web/API auth/session/dashboard route, while keeping full Next.js/React and cross-browser Playwright parity deferred.
- Narrow GAP-035 only for local same-origin web login/session proxy behavior; deployed TLS/proxy/browser smoke remains open.
- Keep GAP-044 open and move the external-smoke target approval follow-up to M54.
- Preserve GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043.

## Acceptance Criteria

- `PLAN_M53` reflects the claude_rec4 re-sequencing before implementation finishes.
- ADR-017 records the current runtime/tooling stack decisions and re-evaluation triggers.
- A logged-in browser flow through the web server reaches API `/auth/login`, `/auth/session`, and the organization dashboard snapshot route.
- The served dashboard includes source metadata from the API response and does not rely solely on `createOperationalConsoleDemoModel`.
- Local UI smoke still produces desktop/mobile artifacts and no-live-external guarantees.
- Prompt and gap handoff docs are updated and `docs/PLAN_M54.md` is created.

## Completion Log

Started 2026-05-03.

Implementation results:

- Re-sequenced M53 per `docs/claude_rec4.md` from another external-smoke blocker review to a served web runtime baseline, with the external live-smoke selector follow-up staged as M54.
- Added ADR-017 to document the current `node:http` API/web runtime, lightweight router, custom Redis adapter, and HTTP/Firefox smoke-tooling deviations from the master plan, plus re-evaluation triggers for NestJS/Next.js/BullMQ/Playwright migration.
- Added `GET /organizations/:orgId/dashboards/snapshots/latest` with organization RBAC, optional `assessmentId` filtering, and a secret-free not-found response.
- Updated the web server so `/login` renders a submit form, `POST /auth/login` proxies API login and preserves the API-issued session cookie, `POST /auth/logout` proxies API logout, `GET /auth/session` proxies the API session surface, and `GET /` resolves the active organization before rendering the dashboard from the latest API dashboard snapshot.
- Added an API-backed runtime model for the operational console, including session user/workspace metadata and visible dashboard-source metadata from the API route.
- Extended `@ui-smoke` so it starts API and web servers, seeds a local API user/organization/evaluation/dashboard snapshot, logs in through the web server, verifies `/auth/session`, asserts the served dashboard came from the API latest-snapshot route, and preserves the existing no-live-external guarantees.
- Updated `.env.example`, README, prompt order, gap notes, learnings, and global plan status for the new M53/M54 sequence.

Changed files:

- `code/.env.example`
- `code/README.md`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `code/apps/api/src/dashboards/routes.ts`
- `code/apps/api/src/dashboards/service.ts`
- `code/apps/api/src/index.ts`
- `code/apps/api/src/server.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/index.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/packages/ui/src/index.ts`
- `code/scripts/run-ui-smoke.mjs`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M53.md`
- `docs/PLAN_M54.md`
- `docs/adr/ADR-017-runtime-stack-deviations.md`
- `docs/adr/README.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Passed: `flatpak-spawn --host npm run test -- web dashboard auth session api` (30 files, 94 tests).
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @ui-smoke` (`puresoc.ui_smoke.served_web.v1`; seeded API-backed dashboard; no live Graph, Stripe, OIDC, storage, scanner, KMS, regulatory, provider-write, staging, production, or customer calls).
- Passed: `flatpak-spawn --host npm run lint` (layout coherent; schema drift passed; Romania drift passed).
- Passed: `flatpak-spawn --host npm run external-smoke:readiness` (dry-run metadata only; `liveNetworkCalls: false`; `startupValidationIssueCodes: []`; `ready_for_disposable_smoke: 0`).
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.
- Substitution recorded: sandbox-local `pnpm`/Node were unavailable, so host npm equivalents were used.

Acceptance status:

- Accepted for M53. The served web baseline now proves browser-facing login through the web server can reach API auth, preserve the API session cookie, proxy API session state, and render the operational console from an organization-scoped API dashboard snapshot instead of only the static demo model.

Gaps updated:

- GAP-031 remains open but was narrowed for API-backed served login/session/dashboard rendering and ADR-017 runtime-stack documentation. Full Next.js/React migration, browser organization selection, Romania onboarding screens, and Playwright parity remain deferred.
- GAP-035 remains open but was narrowed for local same-origin web-server login/session proxying and API-issued cookie preservation in smoke coverage. Deployed TLS/proxy/browser and live OIDC behavior remain unproven.
- GAP-044 remains open. M53 did not select or exercise any live external-smoke target; that follow-up is now staged as M54.
- GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043 were preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 52 / PLAN_M53 complete and stages Prompt 53 / PLAN_M54 as the external live-smoke blocker follow-up from `claude_rec4.md`.
- `docs/PLAN_M54.md` created for the next active milestone.

Residual risk:

- The web runtime is still a lightweight `node:http` server, not the final Next.js runtime from the master plan. ADR-017 makes that explicit and gives triggers for replacing it.
- The dashboard depends on the active organization already being present in the API session; in-browser organization creation/selection remains a later product flow.
- The local UI smoke proves same-origin cookie/session behavior with local servers, but not deployed TLS/proxy behavior or live OIDC redirects.
