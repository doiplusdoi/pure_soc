# M68 Plan: Browser Smoke Artifact Index Baseline

## Summary

Persist a secret-free browser-smoke artifact index beside the existing Firefox visual metrics manifest so reviewers can inspect local smoke outputs from files, not only stdout.

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
- `docs/PLAN_M67.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Write a deterministic, secret-free artifact index for `@browser-smoke` that summarizes screenshots, visual metrics, M67 anchor-driven section capture metadata, M66 anchor workflow metadata, route traversal, browser/auth smoke status, checks, and no-live-call guarantees.

## Scope

Expected implementation areas:

- Add `/tmp/puresoc-browser-smoke-*/browser-smoke-artifact-index.json` when Firefox WebDriver BiDi is available.
- Include schema/version, artifact directory, screenshot summaries, visual metrics manifest path, anchor-driven section capture summaries, keyboard/pointer anchor workflow summaries, route traversal summaries, browser/auth status, check count/status, and non-live guarantees.
- Keep the index secret-free and avoid cookies, passwords, session tokens, authorization headers, user emails, provider secrets, storage URIs, raw provider payloads, and endpoint secrets.
- Preserve M67 section screenshots, M66 anchor workflows, M65 visual thresholds, M64 workspace selection, M63/M62 Romania route traversal, M61/M60 route screenshots/snapshots, browser-auth/cookie/Origin checks, and no-live-call posture.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M68.md`
- `docs/PLAN_M69.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone adds a local artifact index only, not Playwright, Chromium/WebKit matrix coverage, committed golden PNGs, pixel-perfect review, frontend framework migration, or client-side routing.
- Browser artifact-index coverage is claimed only when Firefox WebDriver BiDi is available and the index file is written.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, Chromium/WebKit setup, committed golden PNG baseline set, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.
- Do not weaken existing screenshot visual thresholds, anchor-driven section screenshots, browser workspace selection, session cookie, RBAC/organization scoping, Romania route, M66 anchor workflow, or no-live-call assertions.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke browser artifact index screenshot visual dashboard gaps evidence approvals microsoft onboarding romania
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` proof without claiming browser artifact-index coverage.

## Expected Gap Movement

- Narrow GAP-031 for a persisted Firefox browser-smoke artifact index when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M68 must not run external smoke commands or live external targets.

## Acceptance Criteria

- Browser smoke writes a secret-free artifact-index JSON beside the visual metrics manifest when Firefox WebDriver BiDi is available.
- The index references screenshot files and visual metrics without embedding screenshot bytes, session secrets, cookies, raw emails, provider secrets, storage URIs, or endpoint secrets.
- Existing M67/M66/M65/M64/M63/M62/M61/M60 browser and UI smoke coverage still passes.
- Prompt and gap handoff docs are updated and `docs/PLAN_M69.md` is created.

## Completion Log

Started 2026-05-03.

Completed 2026-05-03.

Implementation results:

- Added `puresoc.ui_smoke.browser_artifact_index.v1` and `/tmp/puresoc-browser-smoke-*/browser-smoke-artifact-index.json` to `code/scripts/run-ui-smoke.mjs` for the Firefox WebDriver BiDi path.
- The index records the artifact directory, browser metadata, screenshot filenames and metrics, the visual metrics manifest reference, M67 anchor-driven section capture summaries, M66 keyboard/pointer anchor workflow summaries, Romania route traversal summaries, browser auth/session status, passed check count/names, and no-live-call guarantees.
- The index keeps reviewer metadata secret-free by avoiding PNG bytes, raw session values, passwords, session tokens, authorization headers, provider/client secrets, raw provider payloads, object-storage URIs, external endpoint URLs, and full user emails.
- Preserved the existing visual metrics manifest, anchor-driven screenshot capture flow, browser workspace selection, Romania route traversal, auth/cookie/Origin/callback checks, and no-live-call assertions.
- Updated handoff docs and staged M69 for a served UI smoke artifact index.

Changed files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M68.md`
- `docs/PLAN_M69.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Validation:

- Local sandbox command execution lacked direct `npm`/`pnpm`; validation used host equivalents through `flatpak-spawn --host sh -lc 'cd /mnt/solodata/SoloCode/pure_soc/code && npm run ...'`.
- Initial direct `npm run test -- web-dashboard-reports-ui` attempt failed with `/bin/sh: npm: command not found`; host `npm` was used for all accepted validation.
- `npm run test -- web-dashboard-reports-ui` passed: 1 file, 13 tests.
- `npm run test -- web ui-smoke browser artifact index screenshot visual dashboard gaps evidence approvals microsoft onboarding romania` passed: 18 files, 86 tests.
- `npm run test:e2e -- --grep @ui-smoke` passed and wrote HTML artifacts under `/tmp/puresoc-ui-smoke-brhNlB`.
- `npm run test:e2e -- --grep @browser-smoke` passed with host Firefox `/usr/bin/firefox` version `150.0`; artifacts were written under `/tmp/puresoc-browser-smoke-3QutiU`, including `/tmp/puresoc-browser-smoke-3QutiU/visual-metrics-manifest.json` and `/tmp/puresoc-browser-smoke-3QutiU/browser-smoke-artifact-index.json`.
- The generated browser-smoke artifact index was inspected for obvious secret patterns; only policy words such as `passwords` and `authorization headers` appeared, not raw secret values, cookies, tokens, emails, storage URIs, or external URLs.
- `npm run lint` passed: layout, Prisma schema drift, Romania generated regulatory drift, and TypeScript.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M68: Firefox browser smoke now writes a secret-free artifact index beside the visual metrics manifest, records the existing screenshot/visual/anchor/workflow/route/auth/check/no-live posture from files, and preserves the current lightweight local runtime without Playwright, golden images, external calls, or framework migration.

Gaps updated:

- GAP-031 narrowed for a persisted Firefox browser-smoke artifact index when browser support is available.
- GAP-042 remains open for product/legal-approved Romanian legal/regulatory copy.
- GAP-044 remains open and unchanged; no external smoke commands or live external targets were run.

Prompt handoff:

- `docs/codex-prompts.md` updated to retire M68 and stage M69.
- `docs/PLAN_M69.md` created as the next active milestone stub.

Residual risk:

- Artifact-index coverage is still limited to the available Firefox WebDriver BiDi path and is not cross-browser Playwright parity.
- Visual metrics remain gross-regression checks, not committed golden-image or pixel-perfect review.
- The served UI HTTP fallback has snapshot artifacts but no dedicated UI artifact index yet; that is staged for M69.
- Full Next.js/React runtime behavior, deployed TLS/proxy browser smoke, approved Romanian legal/regulatory copy, and live external integration smokes remain out of scope.
