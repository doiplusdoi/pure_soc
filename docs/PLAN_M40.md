# M40 Plan: Browser-Grade Playwright Screenshot And Browser Auth Smoke Slice

## Summary

Implement the next active prompt after M39: further narrow GAP-031 and GAP-035 by adding a real browser screenshot/navigation harness when Playwright/browser binaries are available, while preserving the deterministic M39 HTTP fallback.

Status: completed.
Created: 2026-05-02.
Started: 2026-05-02.
Completed: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M39.md`
- `docs/threat-model.md`
- `code/apps/web/src/**`
- `code/packages/ui/src/**`
- `code/apps/api/src/**`
- `code/packages/config/src/**`
- `code/scripts/run-ui-smoke.mjs`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add browser-grade local screenshot and navigation coverage for the operational console, login flow, auth cookies, and Origin middleware behavior without introducing live external integrations.

## Scope

Expected implementation areas:

- Playwright or equivalent browser harness configuration if browser binaries are available locally or approved for installation.
- Desktop and mobile PNG screenshots for dashboard, login, and at least one approval/evidence-heavy state.
- Browser navigation checks for local login/session/logout cookie behavior, `HttpOnly`, `SameSite`, secure-cookie config expectations, and trusted/untrusted Origin middleware behavior.
- Keep the M39 HTTP-rendered fallback path available for environments without bundled browsers.
- Documentation in `code/README.md`, gap register, current milestone, and prompt handoff docs.

Locked assumptions:

- The first screen remains the PureSOC operational console, not a marketing landing page.
- Browser smoke data stays local/static/in-memory and must not call Microsoft Graph, Stripe APIs, OIDC providers, object storage, scanners, KMS/secret-manager, public regulatory URLs, or provider writes.
- If Playwright/browser installation requires network access, request explicit approval and record the exact substitution or skipped browser path.
- GAP-031 can be narrowed or resolved only for local browser screenshots if actual browser screenshots are captured.
- GAP-035 remains open for deployed TLS/CORS/proxy smoke unless the prompt explicitly implements a deployed environment harness.

Expected files:

- `code/package.json`
- `code/apps/web/src/**`
- `code/packages/ui/src/**`
- `code/apps/api/src/**`
- `code/packages/config/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M40.md`
- `docs/PLAN_M41.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not replace the operational app with a marketing landing page.
- Do not call live Microsoft Graph, Stripe APIs, OIDC providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, or public regulatory URLs.
- Do not enable live provider write/remediation actions, Microsoft write scopes, or provider-token production custody claims.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, origin/rate-limit middleware, regulatory no-auto-activation rules, evidence storage-pointer redaction, or legal caveat enforcement.
- Do not make brittle screenshots depend on live time, public network assets, machine-specific fonts, or nondeterministic data.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui api middleware auth health
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm`, Playwright, or bundled browsers are not available, run equivalent host-node/browser commands and record the substitution here. If a browser cannot be installed or launched safely, preserve the M39 fallback and document the blocker instead of faking PNG screenshot coverage.

## Expected Gap Movement

- Narrow or resolve the local-browser portion of GAP-031 for browser-generated desktop/mobile screenshots and layout assertions.
- Narrow GAP-035 for real local browser auth/cookie/navigation smoke.
- Preserve GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043 unless those production hardening areas are explicitly implemented and accepted.

## Acceptance Criteria

- Browser smoke starts local app/API surfaces deterministically or clearly records why browser launch is unavailable.
- Desktop and mobile screenshots prove the operational UI is nonblank, responsive, readable, and not obviously overlapping.
- Browser auth/session and origin middleware behavior has deterministic local coverage without consuming live callback providers or webhook paths.
- Smoke/test output remains secret-free and does not call live external providers.
- Gap and prompt handoff docs honestly describe remaining deployed browser/CORS/proxy/TLS work.

## Completion Log

Started 2026-05-02.

Implementation approach:

- Preserve the M39 `@ui-smoke` local HTTP fallback as the deterministic baseline.
- Use the host Firefox WebDriver BiDi endpoint when available for real browser navigation, viewport screenshots, DOM/layout assertions, and session-cookie jar checks without downloading Playwright.
- Keep auth and origin checks local-only with memory-mode API services, synthetic accounts, trusted local origins, and no live external integrations.
- If Firefox BiDi is unavailable in a validation environment, the `@browser-smoke` command must report the blocker honestly instead of claiming fake screenshot coverage.

Implementation results:

- Preserved the M39 `@ui-smoke` local HTTP fallback and added `@browser-smoke` to `code/scripts/run-ui-smoke.mjs`.
- Implemented a local Firefox WebDriver BiDi harness that launches a temporary isolated browser profile without downloading Playwright or browser binaries.
- Captured browser-generated PNG screenshots for dashboard desktop/mobile, login mobile, evidence desktop, and approvals desktop under `/tmp/puresoc-browser-smoke-*`.
- Added PNG analysis for dimensions and nonblank pixels, plus browser DOM/layout assertions for readable text, no certification claims, no document horizontal overflow, no obvious grouped-control overlap, measurable controls, skip-link presence, anchor scrolling, and approval fact structure.
- Added a same-origin local browser-auth proxy so Firefox can exercise real register/login/session/logout behavior against the local API without enabling broad CORS. The smoke verifies `document.cookie` cannot read the `HttpOnly` session, WebDriver storage sees `HttpOnly`, `SameSite=lax`, and local HTTP `secure=false`, `/auth/session` authenticates before logout, and logout removes the browser cookie.
- Kept untrusted-Origin rejection and OIDC/Microsoft provider callback exemption checks in the deterministic local HTTP fallback because the API intentionally does not expose permissive browser CORS.
- Documented the browser smoke command, artifacts, Firefox BiDi substitution, and remaining deployed TLS/CORS/proxy/cross-browser work.

Changed files:

- `code/README.md`
- `code/scripts/run-ui-smoke.mjs`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M40.md`
- `docs/PLAN_M41.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` was unavailable in the host environment, so validation used host-node/npm equivalents through `flatpak-spawn --host`.
- `npm run test:e2e -- --grep @ui-smoke` passed. It wrote deterministic HTML snapshots under `/tmp/puresoc-ui-smoke-*`.
- `npm run test:e2e -- --grep @browser-smoke` passed. It used `/usr/bin/firefox` via WebDriver BiDi and wrote PNG screenshots under `/tmp/puresoc-browser-smoke-*`.
- `npm run test -- web ui api middleware auth health` passed: 28 files, 80 tests.
- `npm run lint` passed, including layout, selected schema drift, Romania generated regulatory drift, and TypeScript checks.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for the local browser portion of M40. Firefox browser PNG screenshots, browser DOM layout assertions, and browser cookie-jar session/logout checks are real and deterministic on this host.
- The milestone does not claim Playwright installation, Chromium/WebKit coverage, deployed TLS/CORS/proxy behavior, live OIDC callback cookies, or live external provider/runtime smoke.

Gaps updated:

- GAP-031 narrowed for Firefox WebDriver BiDi browser PNG screenshots and browser DOM layout assertions.
- GAP-035 narrowed for Firefox browser cookie-jar/session/logout coverage, with local HTTP fallback for untrusted-Origin and callback-exemption checks.
- GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043 preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 39 / PLAN_M40 complete and stages Prompt 40 / PLAN_M41 for audit WORM export and external checkpoint operations prep.
- `docs/PLAN_M41.md` was created from the staged M41 prompt.

Residual risk:

- The browser path uses the host Firefox WebDriver BiDi implementation; Playwright, Chromium, and WebKit coverage remain future work.
- Browser auth uses a same-origin local proxy so the API can remain CORS-restrictive; deployed TLS/CORS/proxy and live OIDC callback-cookie behavior remain open under GAP-035/GAP-032.
- No live Microsoft Graph, Stripe API, OIDC provider, object-storage, scanner, KMS/secret-manager, public regulatory, or provider-write smoke was added.
