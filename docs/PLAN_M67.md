# M67 Plan: Browser Anchor-Driven Section Screenshot Baseline

## Summary

Extend the Firefox browser smoke so operational-console section screenshots are captured from anchor-activated browser state instead of direct scripted scroll targets.

Status: staged.
Created: 2026-05-03.

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

Not started.
