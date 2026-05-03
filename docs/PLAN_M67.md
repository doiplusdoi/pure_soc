# M67 Plan: Browser Anchor-Driven Section Screenshot Baseline

## Summary

Extend the Firefox browser smoke so operational-console section screenshots are captured from anchor-activated browser state instead of direct scripted scroll targets.

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
- `docs/PLAN_M66.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Use the M66 anchor workflow to produce browser screenshot artifacts for dashboard, onboarding/country packs, Microsoft 365, gaps, evidence/reports, and approval queue sections without Playwright, golden images, framework migration, or external calls.

## Scope

Expected implementation areas:

- Reuse stable visible operational-console anchor selectors and browser helpers.
- Prepare section screenshots through real anchor activation rather than direct `scrollIntoView` calls for section captures.
- Add or extend secret-free artifact metadata for section id/title, hash/scroll state, route marker, and anchor action used.
- Preserve M66 keyboard/pointer anchor workflow coverage, M65 visual metrics, M64 workspace selection, Romania route traversal/screenshots, browser-auth/cookie/Origin checks, and no-live-call posture.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M67.md`
- `docs/PLAN_M68.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone adds Firefox anchor-driven section screenshot artifacts, not Playwright, Chromium/WebKit matrix coverage, committed golden PNGs, pixel-perfect review, frontend framework migration, or client-side routing.
- Browser screenshot coverage is claimed only when Firefox WebDriver BiDi is available and screenshots are captured after anchor activation.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, Chromium/WebKit setup, committed golden PNG baseline set, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.
- Do not weaken existing screenshot visual thresholds, browser workspace selection, session cookie, RBAC/organization scoping, Romania route, M66 anchor workflow, or no-live-call assertions.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke browser anchor screenshot visual dashboard gaps evidence approvals microsoft onboarding romania
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` proof without claiming browser anchor-driven screenshot coverage.

## Expected Gap Movement

- Narrow GAP-031 for Firefox anchor-driven operational-console section screenshot artifacts when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M67 must not run external smoke commands or live external targets.

## Acceptance Criteria

- Browser smoke captures operational-console section screenshots from anchor-activated state when Firefox WebDriver BiDi is available.
- Artifact metadata records route id, section id/title, hash/scroll state, readable section text, and the anchor action used without secrets.
- Existing visual threshold manifest, M66 anchor workflow, workspace selection, Romania route, auth/cookie/Origin, and no-live-call checks still pass.
- Prompt and gap handoff docs are updated and `docs/PLAN_M68.md` is created.

## Completion Log

Started 2026-05-03.

Completed 2026-05-03.

Implementation results:

- Added anchor-driven screenshot preparation to `code/scripts/run-ui-smoke.mjs` through an `anchorActivation` capture mode.
- Dashboard, onboarding/country-pack, Microsoft 365, gaps, evidence/reports, and approval queue section PNGs are now captured only after clicking the visible operational-console sidebar anchor for each section.
- Added `puresoc.ui_smoke.anchor_section_capture.v1` metadata into screenshot artifacts and the visual metrics manifest, including anchor action, target bounds, hash/scroll state, section id/title, readable text sample, route marker, and no-overflow/no-certification assertions.
- Increased the Firefox visual metrics manifest from 7 to 10 captures while preserving dashboard mobile, login mobile, Romania desktop/mobile, workspace selection, route traversal, browser-auth, cookie, Origin, callback-exemption, and no-live-call checks.
- Removed direct evidence/approval section `scrollTarget` captures from `@browser-smoke`; the generic scroll helper remains available for non-section future use.

Changed files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M67.md`
- `docs/PLAN_M68.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Validation:

- Local sandbox command execution still lacked direct `npm`/`pnpm`; validation used host equivalents through `flatpak-spawn --host sh -lc 'cd .../code && npm run ...'`.
- `npm run test -- web ui-smoke browser anchor screenshot visual dashboard gaps evidence approvals microsoft onboarding romania` passed: 18 files, 85 tests.
- `npm run test:e2e -- --grep @browser-smoke` passed with host Firefox `/usr/bin/firefox` version `150.0`; artifacts were written under `/tmp/puresoc-browser-smoke-mHFUr8`, including `/tmp/puresoc-browser-smoke-mHFUr8/visual-metrics-manifest.json` with 10 captures and anchor-section metadata.
- `npm run test:e2e -- --grep @ui-smoke` passed and wrote HTML artifacts under `/tmp/puresoc-ui-smoke-5fEx7Z`.
- `npm run lint` passed: layout, Prisma schema drift, Romania generated regulatory drift, and TypeScript.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M67: Firefox browser smoke now captures operational-console section screenshots from visible anchor-activated state, records route/section/hash/scroll/anchor metadata in secret-free artifacts, preserves M66 keyboard/pointer anchor workflow assertions, and keeps the existing no-live-call posture.

Gaps updated:

- GAP-031 narrowed for Firefox anchor-driven operational-console section screenshot PNG artifacts and visual-manifest metadata.
- GAP-042 remains open for product/legal-approved Romanian legal/regulatory copy.
- GAP-044 remains open and unchanged; no external smoke commands or live external targets were run.

Prompt handoff:

- `docs/codex-prompts.md` updated to retire M67 and stage M68.
- `docs/PLAN_M68.md` created as the next active milestone stub.

Residual risk:

- Anchor-driven section screenshot coverage is still limited to the available Firefox WebDriver BiDi path.
- The visual thresholding remains gross-regression coverage, not committed golden-image or pixel-perfect review.
- Cross-browser Playwright/Chromium/WebKit parity, full Next.js/React runtime behavior, deployed TLS/proxy browser smoke, approved Romanian legal/regulatory copy, and live external integration smokes remain out of scope.
