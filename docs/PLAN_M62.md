# M62 Plan: Browser Keyboard And Route Navigation Traversal

## Summary

Extend the local browser smoke so Firefox WebDriver BiDi, when available, proves keyboard and route navigation across the API-backed dashboard and Romania onboarding route while preserving the deterministic `@ui-smoke` HTTP fallback and no-live-call posture.

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
- `docs/PLAN_M61.md`
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

Add browser keyboard and route-navigation traversal for the existing served dashboard and Romania onboarding route without changing the lightweight web runtime or making live external calls.

## Scope

Expected implementation areas:

- Update `@browser-smoke` to navigate from the operational console to `/onboarding/romania?locale=ro-RO` through the visible "Romania onboarding" navigation link.
- Exercise keyboard/focus behavior for the dashboard skip link, Romania route skip link, dashboard-to-Romania navigation link, and Romania "Back to dashboard" link.
- Record browser navigation assertions for URL changes, focus target movement, route markers, back-navigation to dashboard, no horizontal overflow, no certification claims, no direct DNSC submit command, and no-live-call posture.
- Keep existing dashboard, login, evidence, approvals, Romania route screenshots, browser-auth, cookie, Origin, and callback-exemption checks intact.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M62.md`
- `docs/PLAN_M63.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone is keyboard/navigation browser coverage for existing served routes, not a Next.js/React, Playwright, router, or layout migration.
- Romanian legal-caveat and regulatory notification copy remain English fallback until product/legal approval exists.
- Browser keyboard/navigation coverage is claimed only when Firefox WebDriver BiDi is available and the smoke reaches the route.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke browser navigation romania onboarding
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` route snapshot proof.

## Expected Gap Movement

- Narrow GAP-031 for Firefox browser keyboard/navigation traversal across dashboard and Romania onboarding routes when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M62 must not run external smoke commands or live external targets.

## Acceptance Criteria

- `@browser-smoke` includes keyboard/navigation traversal between the dashboard and Romania onboarding route when Firefox is available.
- Browser checks prove route changes, focus movement, source/caveat/no-DNSC markers, no horizontal overflow, and no forbidden legal/certification claims.
- Existing browser screenshot and auth/cookie/Origin checks and the M60 `@ui-smoke` route snapshot path still pass.
- Prompt and gap handoff docs are updated and `docs/PLAN_M63.md` is created.

## Completion Log

Started 2026-05-03 and completed 2026-05-03.

Implementation results:

- Added stable non-visible `data-ui-action` markers for the dashboard skip link, Romania onboarding navigation link, Romania route skip link, and Romania "Back to dashboard" link.
- Extended `pnpm test:e2e -- --grep @browser-smoke` with a Firefox keyboard traversal helper that runs after the local web login path. It tabs to skip links, activates the Romania navigation/back links with keyboard input, and records route-navigation output.
- Added browser assertions for URL changes, focus target movement, route markers, no horizontal overflow, no certification claims, no direct DNSC submit command, and preserved no-live-call posture.
- Preserved existing dashboard desktop/mobile, login, evidence, approvals, Romania route desktop/mobile, browser-auth, cookie, Origin, callback-exemption, and M60 `@ui-smoke` fallback checks.
- Documented the new keyboard traversal and narrowed GAP-031 while keeping GAP-042 and GAP-044 open.

Changed files:

- `code/README.md`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/web/src/operational-console.ts`
- `code/scripts/run-ui-smoke.mjs`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M62.md`
- `docs/PLAN_M63.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Passed: `flatpak-spawn --host npm run lint`.
- Passed: `flatpak-spawn --host npm run test -- web ui-smoke browser navigation romania onboarding` (4 files, 18 tests).
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @ui-smoke`; output included Romania route desktop/mobile HTML snapshots under `/tmp/puresoc-ui-smoke-TGNlVG`.
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @browser-smoke`; output included dashboard/login/evidence/approvals screenshots plus Romania route desktop/mobile PNGs under `/tmp/puresoc-browser-smoke-eHBY1c` and route-navigation results for dashboard skip, dashboard-to-Romania, Romania skip, and back-to-dashboard traversal.
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.
- Used host npm equivalents because sandbox-local `pnpm` and `npm` were unavailable in this environment.

Acceptance status:

- Accepted. Firefox WebDriver BiDi now proves keyboard traversal between the authenticated API-backed dashboard and the Romania onboarding route, including skip-link focus targets and keyboard activation of the visible route links. The local HTTP fallback and previous browser screenshot/auth checks remain intact. No live external services or provider write paths were called.

Gaps updated:

- GAP-031 narrowed for Firefox keyboard traversal of dashboard and Romania skip links plus dashboard-to-Romania and back-to-dashboard route activation.
- GAP-042 preserved for product/legal-approved Romanian legal/regulatory copy.
- GAP-044 preserved; no external-smoke commands or live external targets were run.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 61 / PLAN_M62 complete and stages Prompt 62 / PLAN_M63 for browser pointer route navigation traversal.
- `docs/PLAN_M63.md` created.

Residual risk:

- Browser coverage remains Firefox WebDriver BiDi only, not Chromium/WebKit/Playwright parity.
- Pointer/click route traversal, screenshot diff thresholds, browser organization selection, full Next.js/React runtime, and a persistent Romania onboarding wizard remain deferred under GAP-031.
- Romanian legal caveat and regulatory/workbook labels still fall back to English/source-mapped copy until product/legal-approved Romanian text exists under GAP-042.
