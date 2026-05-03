# M63 Plan: Browser Pointer Route Navigation Traversal

## Summary

Extend the local browser smoke so Firefox WebDriver BiDi, when available, proves pointer/click route navigation across the API-backed dashboard and Romania onboarding route while preserving the deterministic `@ui-smoke` HTTP fallback, M61 screenshots, M62 keyboard traversal, and no-live-call posture.

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
- `docs/PLAN_M62.md`
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

Add browser pointer/click route-navigation traversal for the existing served dashboard and Romania onboarding route without changing the lightweight web runtime or making live external calls.

## Scope

Expected implementation areas:

- Update `@browser-smoke` to click from the operational console to `/onboarding/romania?locale=ro-RO` through the visible "Romania onboarding" navigation link.
- Exercise pointer/click behavior for the dashboard-to-Romania navigation link and the Romania "Back to dashboard" link using browser pointer actions against visible elements.
- Record browser pointer navigation assertions for visible target bounds, URL changes, route markers, back-navigation to dashboard, no horizontal overflow, no certification claims, no direct DNSC submit command, and no-live-call posture.
- Keep existing dashboard, login, evidence, approvals, Romania route screenshots, browser-auth, cookie, Origin, callback-exemption, and M62 keyboard traversal checks intact.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M63.md`
- `docs/PLAN_M64.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone is pointer/click browser coverage for existing served routes, not a Next.js/React, Playwright, router, or layout migration.
- Romanian legal-caveat and regulatory notification copy remain English fallback until product/legal approval exists.
- Browser pointer navigation coverage is claimed only when Firefox WebDriver BiDi is available and the smoke reaches the route.
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
pnpm test -- web ui-smoke browser navigation pointer romania onboarding
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` route snapshot proof.

## Expected Gap Movement

- Narrow GAP-031 for Firefox browser pointer/click traversal across dashboard and Romania onboarding routes when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M63 must not run external smoke commands or live external targets.

## Acceptance Criteria

- `@browser-smoke` includes pointer/click traversal between the dashboard and Romania onboarding route when Firefox is available.
- Browser checks prove visible target bounds, route changes, route markers, no horizontal overflow, no forbidden legal/certification claims, and no direct DNSC submission command.
- Existing browser screenshot, keyboard traversal, auth/cookie/Origin checks and the M60 `@ui-smoke` route snapshot path still pass.
- Prompt and gap handoff docs are updated and `docs/PLAN_M64.md` is created.

## Completion Log

Started 2026-05-03 and completed 2026-05-03.

Implementation results:

- Extended `pnpm test:e2e -- --grep @browser-smoke` with a Firefox pointer traversal helper that runs after the existing local web login and M62 keyboard route checks.
- The pointer helper measures visible dashboard-to-Romania and Romania back-link bounds in the browser, clicks each target center through BiDi pointer actions, and records route transitions plus target bounds.
- Added pointer assertions for target visibility, URL changes, route markers, no horizontal overflow, no certification claims, no direct DNSC submit command, and no-live-call posture.
- Preserved dashboard desktop/mobile, login, evidence, approvals, Romania route desktop/mobile screenshots, browser-auth, cookie, Origin, callback-exemption, M60 HTTP fallback, and M62 keyboard traversal.
- Added focused renderer coverage that keeps the route navigation anchors real `href` links with stable action markers and no inline click handlers.
- Documented the screenshot/keyboard/pointer split and staged M64 for browser organization selection.

Changed files:

- `code/README.md`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/scripts/run-ui-smoke.mjs`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M63.md`
- `docs/PLAN_M64.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Sandbox-local `npm` was unavailable (`npm: command not found`), so host npm equivalents were used.
- Passed: `flatpak-spawn --host npm run lint`.
- Passed: `flatpak-spawn --host npm run test -- web ui-smoke browser navigation pointer romania onboarding` (4 files, 19 tests).
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @ui-smoke`; output included Romania route desktop/mobile HTML snapshots under `/tmp/puresoc-ui-smoke-Q1QRqN`.
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @browser-smoke`; output included dashboard/login/evidence/approvals screenshots plus Romania route desktop/mobile PNGs under `/tmp/puresoc-browser-smoke-qxG2AK`, with keyboard and pointer route-navigation results.
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.

Acceptance status:

- Accepted. Firefox WebDriver BiDi now proves pointer/click traversal between the authenticated API-backed dashboard and the Romania onboarding route by clicking visible links with measured target bounds. The deterministic HTTP fallback and previous browser screenshot/auth/keyboard checks remain intact. No live external services or provider write paths were called.

Gaps updated:

- GAP-031 narrowed for Firefox pointer/click traversal of the dashboard-to-Romania and Romania back-to-dashboard links with target-bounds assertions.
- GAP-042 preserved for product/legal-approved Romanian legal/regulatory copy.
- GAP-044 preserved; no external-smoke commands or live external targets were run.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 62 / PLAN_M63 complete and stages Prompt 63 / PLAN_M64 for browser organization selection.
- `docs/PLAN_M64.md` created.

Residual risk:

- Browser coverage remains Firefox WebDriver BiDi only, not Chromium/WebKit/Playwright parity.
- Browser organization selection, screenshot diff thresholds, full Next.js/React runtime, and a persistent Romania onboarding wizard remain deferred under GAP-031.
- Romanian legal caveat and regulatory/workbook labels still fall back to English/source-mapped copy until product/legal-approved Romanian text exists under GAP-042.
