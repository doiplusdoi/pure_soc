# M69 Plan: Served UI Smoke Artifact Index Baseline

## Summary

Persist a secret-free served UI smoke artifact index under `/tmp/puresoc-ui-smoke-*` so reviewers can inspect deterministic local HTTP snapshot outputs from files, not only stdout.

Status: staged.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M68.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Write a deterministic, secret-free artifact index for `@ui-smoke` that summarizes HTML snapshots, workspace selection, Romania route snapshots, API-backed dashboard/source metadata, browser-relevant auth/cookie/Origin checks, callback exemptions, checks, and no-live-call guarantees.

## Scope

Expected implementation areas:

- Add `/tmp/puresoc-ui-smoke-*/ui-smoke-artifact-index.json` for `@ui-smoke`.
- Include schema/version, artifact directory, HTML snapshot summaries, workspace-selection route summaries, Romania route summaries, API-backed dashboard/source metadata, auth/cookie/Origin/callback-exemption check summaries, check count/status, and non-live guarantees.
- Keep the index secret-free and avoid session cookies, passwords, session tokens, authorization headers, user emails, provider secrets, storage URIs, raw provider payloads, external endpoint URLs, and local port-bearing URL leakage.
- Preserve M68 browser-smoke artifact index behavior, M67 section screenshots, M66 anchor workflows, M65 visual thresholds, M64 workspace selection, M63/M62 Romania route traversal, M61/M60 route screenshots/snapshots, browser-auth/cookie/Origin checks, and no-live-call posture.
- Update GAP-031 and preserve GAP-042/GAP-044 blockers.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M69.md`
- `docs/PLAN_M70.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- This milestone adds a local HTTP UI artifact index only, not Playwright, Chromium/WebKit matrix coverage, committed golden PNGs, pixel-perfect review, frontend framework migration, or client-side routing.
- Browser PNG coverage remains claimed only through the existing Firefox WebDriver BiDi path.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, Chromium/WebKit setup, committed golden PNG baseline set, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.
- Do not weaken existing HTTP snapshots, browser artifact index, screenshot visual thresholds, anchor-driven section screenshots, browser workspace selection, session cookie, RBAC/organization scoping, Romania route, M66 anchor workflow, or no-live-call assertions.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke artifact index browser screenshot visual dashboard gaps evidence approvals microsoft onboarding romania
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If Firefox/WebDriver BiDi is unavailable, record the blocked `@browser-smoke` result and preserve the `@ui-smoke` artifact-index proof without claiming browser PNG coverage.

## Expected Gap Movement

- Narrow GAP-031 for a persisted served UI smoke artifact index in the deterministic HTTP fallback path.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; M69 must not run external smoke commands or live external targets.

## Acceptance Criteria

- `@ui-smoke` writes a secret-free artifact-index JSON beside deterministic HTML snapshots.
- The index references snapshot files and route/workspace/auth summaries without embedding session secrets, cookies, raw emails, provider secrets, storage URIs, endpoint secrets, or local port-bearing URLs.
- Existing M68/M67/M66/M65/M64/M63/M62/M61/M60 browser and UI smoke coverage still passes.
- Prompt and gap handoff docs are updated and `docs/PLAN_M70.md` is created.

## Completion Log

Not started.
