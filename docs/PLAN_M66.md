# M66 Plan: Browser Operational Console Anchor Workflow Baseline

## Summary

Extend the existing Firefox browser smoke so operational-console section anchors are exercised through visible keyboard and pointer workflows, not only direct URL loads or scripted scroll targets.

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
- `docs/PLAN_M65.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Broaden the local Firefox browser workflow proof across existing operational-console anchors for dashboard, gaps, evidence/reports, approvals, Microsoft 365, and onboarding sections while preserving the lightweight `node:http` runtime and no-live-call posture.

## Scope

Expected implementation areas:

- Add stable visible selectors for operational-console anchor navigation where current markup is too generic.
- Extend `@browser-smoke`, when Firefox WebDriver BiDi is available, to activate the target section anchors through keyboard and pointer paths.
- Record URL/hash or scroll state, target bounds, route id, readable section text, no horizontal overflow, no certification claims, and no-live-call posture.
- Keep M65 visual threshold manifest checks, M64 workspace selection, M63 Romania pointer traversal, M62 Romania keyboard traversal, M61 screenshots, M60 UI route snapshots, browser-auth, cookie, Origin, and callback-exemption checks intact.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M66.md`
- `docs/PLAN_M67.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone adds browser workflow coverage for current anchors, not a Next.js/React migration, Playwright adoption, Chromium/WebKit matrix, golden-image workflow, or visual redesign.
- Browser anchor workflow coverage is claimed only when Firefox WebDriver BiDi is available and the smoke activates the controls.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, Chromium/WebKit setup, committed golden PNG baseline set, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.
- Do not weaken existing screenshot visual thresholds, browser workspace selection, session cookie, RBAC/organization scoping, Romania route, or no-live-call assertions.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke browser anchor navigation dashboard gaps evidence approvals microsoft onboarding romania
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` proof without claiming browser anchor workflow coverage.

## Expected Gap Movement

- Narrow GAP-031 for broader Firefox anchor workflow coverage when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M66 must not run external smoke commands or live external targets.

## Acceptance Criteria

- Browser smoke activates current operational-console section anchors through visible keyboard and pointer controls when Firefox WebDriver BiDi is available.
- The smoke records section route/scroll state, target bounds, readable section text, and no-overflow/no-certification/no-live-call assertions.
- Existing screenshot visual threshold manifest, workspace selection, Romania route, screenshot, keyboard, pointer, auth/cookie/Origin, and no-live-call coverage still pass.
- Prompt and gap handoff docs are updated and `docs/PLAN_M67.md` is created.

## Completion Log

Started 2026-05-03.

Completed 2026-05-03.

Implementation results:

- Added stable visible `data-ui-action` markers for operational-console dashboard, onboarding/country-pack, Microsoft 365, gaps, evidence/reports, and approval queue anchors.
- Added neutral `data-ui-section` markers on rendered operational-console sections.
- Extended the Firefox WebDriver BiDi `@browser-smoke` to activate those anchors through keyboard focus/Enter and visible pointer clicks after local login and workspace selection.
- The browser smoke now records dashboard skip-link focus, nav target bounds, hash/scroll state, route marker, section id/title/text, no horizontal overflow, no certification claims, and no-live-call posture for the section-anchor workflow.
- Preserved M65 visual metrics manifest/threshold checks, M64 workspace selection, M63 Romania pointer traversal, M62 Romania keyboard traversal, M61 screenshots, M60 UI route snapshots, browser-auth, cookie, Origin, callback-exemption, and no-live-call posture.

Changed files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M66.md`
- `docs/PLAN_M67.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Local sandbox command execution still required host tooling; validation used `flatpak-spawn --host sh -lc 'cd .../code && npm run ...'` equivalents instead of direct `pnpm`.
- `npm run test -- web ui-smoke browser anchor navigation dashboard gaps evidence approvals microsoft onboarding romania` passed: 18 files, 84 tests.
- `npm run test:e2e -- --grep @browser-smoke` passed with host Firefox `/usr/bin/firefox` version `150.0`; artifacts were written under `/tmp/puresoc-browser-smoke-oUo4Ih`, including `/tmp/puresoc-browser-smoke-oUo4Ih/visual-metrics-manifest.json`.
- `npm run lint` passed: layout, Prisma schema drift, Romania generated regulatory drift, and TypeScript.
- `npm run test:e2e -- --grep @ui-smoke` passed and wrote HTML artifacts under `/tmp/puresoc-ui-smoke-g3uVaD`.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M66: Firefox browser smoke activates the required operational-console anchors through keyboard and pointer workflows, records target/section/hash/scroll/no-overflow/no-certification/no-live-call assertions, and preserves existing visual, workspace, Romania, auth, cookie, Origin, callback, and no-live-call coverage.

Gaps updated:

- GAP-031 narrowed for broader Firefox operational-console section-anchor keyboard and pointer workflows with target-bounds, hash/scroll, section-text, no-overflow, no-certification, and no-live-call assertions.
- GAP-042 remains open for product/legal-approved Romanian legal/regulatory copy.
- GAP-044 remains open and unchanged; no external smoke commands or live external targets were run.

Prompt handoff:

- `docs/codex-prompts.md` updated to retire M66 and stage M67.
- `docs/PLAN_M67.md` created as the next active milestone stub.

Residual risk:

- Anchor workflow coverage is still limited to the available Firefox WebDriver BiDi path.
- The section screenshots for evidence and approvals still keep their existing direct `scrollTarget` captures; M67 is staged to make section screenshot artifacts anchor-driven.
- Cross-browser Playwright/Chromium/WebKit parity, committed golden-image review, full Next.js/React runtime behavior, deployed TLS/proxy browser smoke, approved Romanian legal/regulatory copy, and live external integration smokes remain out of scope.
