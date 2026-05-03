# M61 Plan: Romania Route Browser Smoke Traversal

## Summary

Extend the local browser smoke so the Romania onboarding route is exercised by the existing Firefox WebDriver BiDi path when a browser is available, while preserving the deterministic `@ui-smoke` HTTP fallback and no-live-call posture.

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
- `docs/PLAN_M60.md`
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

Add route-specific browser traversal and screenshot coverage for the served Romania onboarding route without changing the lightweight web runtime or making live external calls.

## Scope

Expected implementation areas:

- Update `@browser-smoke` to navigate to `GET /onboarding/romania?locale=ro-RO` after the existing local web login path is established.
- Capture Romania route desktop/mobile PNG screenshots under `/tmp/puresoc-browser-smoke-*` when Firefox WebDriver BiDi is available.
- Assert source-map, caveat, fallback, unsupported-state, no-DNSC-submission, responsive/focus/readability, no horizontal overflow, and forbidden legal/certification claim behavior in browser DOM/layout checks.
- Keep existing dashboard, login, evidence, approvals, browser-auth, cookie, Origin, and callback-exemption checks intact.
- Preserve the M60 `@ui-smoke` HTTP fallback and record any browser blocker honestly if Firefox/WebDriver BiDi is unavailable.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M61.md`
- `docs/PLAN_M62.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone is browser traversal coverage for the existing served route, not a Next.js/React, Playwright, or router migration.
- Romanian legal-caveat and regulatory notification copy remain English fallback until product/legal approval exists.
- Browser PNG coverage is claimed only when Firefox WebDriver BiDi is available and the smoke reaches the route.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals; use country-pack/onboarding data contracts.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke browser romania onboarding
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` route snapshot proof.

## Expected Gap Movement

- Narrow GAP-031 for route-specific Firefox browser traversal coverage of the Romania onboarding route when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M61 must not run external smoke commands or live external targets.

## Acceptance Criteria

- `@browser-smoke` includes the Romania onboarding route in its browser traversal when Firefox is available.
- Browser checks prove route source-map, legal-caveat, fallback, unsupported-state, and no-DNSC-submission signals without certification claims.
- Existing browser dashboard/login/evidence/approval/auth checks and the M60 `@ui-smoke` route snapshot path still pass.
- Prompt and gap handoff docs are updated and `docs/PLAN_M62.md` is created.

## Completion Log

Started 2026-05-03 and completed 2026-05-03.

Implementation results:

- Extended `pnpm test:e2e -- --grep @browser-smoke` to capture `GET /onboarding/romania?locale=ro-RO` as `romania-route-desktop` and `romania-route-mobile` Firefox WebDriver BiDi PNG screenshots under `/tmp/puresoc-browser-smoke-*`.
- Added route-specific browser DOM/layout checks for Romania route marker, `<html lang="ro">`, skip link, focus target, source-map sample, workbook source-map cells, legal caveat, fallback metadata, unsupported-state messaging, no-DNSC-submission metadata, no direct DNSC submit command, no horizontal overflow, readable text, nonblank PNG pixels, and forbidden legal/certification claims.
- Preserved existing dashboard desktop/mobile, login mobile, evidence desktop, approvals desktop, browser-auth, cookie, Origin, and callback-exemption checks.
- Kept the M60 `@ui-smoke` HTTP fallback intact and clarified blocked-browser output so Romania route browser PNG coverage is not claimed when Firefox/WebDriver BiDi is unavailable.
- Adjusted the local smoke API clock from a fixed 2026-05-02 timestamp to the current runtime clock so browser-stored session cookies do not expire as calendar time moves forward.
- Added stable Romania route DOM anchors to the focused web renderer test.

Changed files:

- `code/README.md`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/scripts/run-ui-smoke.mjs`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M61.md`
- `docs/PLAN_M62.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Passed: `flatpak-spawn --host npm run lint`.
- Passed: `flatpak-spawn --host npm run test -- web ui-smoke browser romania onboarding` (4 files, 18 tests).
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @ui-smoke`; output included Romania route desktop/mobile HTML snapshots under `/tmp/puresoc-ui-smoke-c94Wyn`.
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @browser-smoke`; output included dashboard/login/evidence/approvals screenshots plus Romania route desktop/mobile PNGs under `/tmp/puresoc-browser-smoke-ll68v5`.
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.
- Used host npm equivalents because sandbox-local `pnpm` and `npm` were unavailable in this environment.

Acceptance status:

- Accepted. The Firefox browser smoke now traverses and screenshots the served Romania onboarding route with source/caveat/fallback/unsupported/no-DNSC DOM assertions while preserving the local HTTP fallback and existing browser auth/cookie/origin coverage. No live external services or provider write paths were called.

Gaps updated:

- GAP-031 narrowed for route-specific Firefox browser traversal, desktop/mobile PNG screenshots, and Romania route DOM/layout assertions when Firefox/WebDriver BiDi is available.
- GAP-042 preserved for product/legal-approved Romanian legal/regulatory copy.
- GAP-044 preserved; no external-smoke commands or live external targets were run.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 60 / PLAN_M61 complete and stages Prompt 61 / PLAN_M62 for browser keyboard and route navigation traversal.
- `docs/PLAN_M62.md` created.

Residual risk:

- Browser coverage remains Firefox WebDriver BiDi only, not Chromium/WebKit/Playwright parity.
- Browser organization selection, pointer/keyboard traversal, screenshot diff thresholds, full Next.js/React runtime, and a persistent Romania onboarding wizard remain deferred under GAP-031.
- Romanian legal caveat and regulatory/workbook labels still fall back to English/source-mapped copy until product/legal-approved Romanian text exists under GAP-042.
