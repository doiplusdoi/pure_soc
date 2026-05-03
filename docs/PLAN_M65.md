# M65 Plan: Browser Screenshot Diff Threshold Baseline

## Summary

Add lightweight screenshot/artifact threshold checks to the existing served web and Firefox browser smoke so blank, wrong-size, and gross visual-regression failures are caught without adopting Playwright or committed golden PNG baselines.

Status: staged.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M64.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Add deterministic visual threshold coverage to the current local smoke artifacts while keeping the lightweight `node:http` runtime, Firefox WebDriver BiDi harness, and no-live-call posture intact.

## Scope

Expected implementation areas:

- Add secret-free screenshot/artifact metric metadata for current browser captures.
- Check dashboard desktop/mobile, login mobile, evidence desktop, approval desktop, and Romania onboarding desktop/mobile captures for stable dimensions, nonblank pixels, color/contrast diversity, route state, and severe visual collapse.
- Emit a per-capture visual metrics manifest under `/tmp/puresoc-browser-smoke-*` when Firefox WebDriver BiDi is available.
- Avoid pixel-perfect golden comparisons and avoid checking in generated screenshots.
- Preserve M64 workspace selection, M63 pointer traversal, M62 keyboard traversal, M61 screenshots, M60 UI route snapshots, browser-auth, cookie, Origin, callback-exemption, and no-live-call checks.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M65.md`
- `docs/PLAN_M66.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone adds metric thresholding to the current smoke artifacts, not Playwright, Chromium/WebKit coverage, golden-image review workflows, or a Next.js/React migration.
- Browser screenshot-threshold coverage is claimed only when Firefox WebDriver BiDi is available and screenshots are actually captured.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, Chromium/WebKit setup, committed golden PNG baseline set, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.
- Do not weaken existing browser workspace selection, session cookie, RBAC/organization scoping, Romania route, or no-live-call assertions.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke browser screenshot visual threshold dashboard romania
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` proof without claiming browser screenshot-threshold coverage.

## Expected Gap Movement

- Narrow GAP-031 for screenshot-threshold coverage when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M65 must not run external smoke commands or live external targets.

## Acceptance Criteria

- Browser smoke emits a visual metrics manifest for captured screenshots when Firefox WebDriver BiDi is available.
- Threshold checks fail blank, wrong-size, missing-route, or severe visual-collapse captures without brittle pixel-perfect golden comparisons.
- Existing workspace selection, Romania route, screenshot, keyboard, pointer, auth/cookie/Origin, and no-live-call coverage still pass.
- Prompt and gap handoff docs are updated and `docs/PLAN_M66.md` is created.

## Completion Log

Not started.
