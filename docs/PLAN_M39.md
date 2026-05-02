# M39 Plan: Served Web Runtime And Browser Auth/Middleware Smoke Slice

## Summary

Implement the next active prompt after M38: narrow GAP-031 and GAP-035 by turning the operational web console/UI smoke into a served local browser smoke with real web/API startup boundaries and browser auth/middleware checks.

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
- `docs/PLAN_M38.md`
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

Add deterministic served-web/browser smoke coverage for local web/API startup, responsive operational UI rendering, browser cookies, and Origin/Referer middleware behavior without adding live external integrations.

## Scope

Expected implementation areas:

- Served local web/API smoke harness and `@ui-smoke` browser checks.
- Desktop and mobile screenshots or equivalent browser assertions for nonblank rendering, readable layout, and no obvious overlap.
- Local auth/session-cookie and API middleware smoke coverage for secure-cookie configuration, `HttpOnly`, `SameSite`, Origin/Referer protections, and callback exemptions.
- Documentation in `code/README.md`, gap register, current milestone, and prompt handoff docs.

Locked assumptions:

- The first screen remains the PureSOC operational console, not a marketing landing page.
- Smoke data stays local/static/in-memory and must not call Microsoft Graph, Stripe, OIDC providers, object storage, scanners, KMS/secret-manager, public regulatory URLs, or provider writes.
- GAP-031 and GAP-035 can be narrowed by deterministic local browser/runtime coverage but remain open for deployed TLS/proxy/CORS production smoke unless explicitly completed.
- GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043 remain out of scope unless explicitly selected later.

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
- `docs/PLAN_M39.md`
- `docs/PLAN_M40.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not replace the operational app with a marketing landing page.
- Do not call live Microsoft Graph, Stripe, OIDC providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, or public regulatory URLs.
- Do not enable live provider write/remediation actions, Microsoft write scopes, or provider-token production custody claims.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, origin/rate-limit middleware, regulatory no-auto-activation rules, evidence storage-pointer redaction, or legal caveat enforcement.
- Do not introduce brittle screenshot assertions that depend on live time, public network assets, or non-deterministic data.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui api middleware auth health
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` or bundled browsers are not available, run equivalent host-node/Playwright commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-031 for served web runtime and deterministic browser screenshot smoke coverage.
- Narrow GAP-035 for local browser auth/cookie/origin middleware smoke coverage.
- Preserve GAP-007, GAP-028, GAP-029, and GAP-032 unless live external provider/runtime smoke is explicitly implemented and accepted.
- Preserve GAP-030, GAP-039, GAP-040, and GAP-043 unless those production hardening areas are explicitly implemented and accepted.

## Acceptance Criteria

- Served web/browser smoke starts local app/API surfaces or equivalent local HTTP fixtures deterministically.
- Desktop and mobile browser checks prove the operational UI is nonblank, responsive, and not obviously overlapping.
- Browser auth/session and origin middleware behavior has deterministic local coverage without consuming callback/webhook raw-body paths.
- Smoke/test output remains secret-free and does not call live external providers.
- Gap and prompt handoff docs honestly describe remaining deployed browser/CORS/proxy/TLS work.

## Completion Log

Started 2026-05-02.

Implementation results:

- Exported `startWebServer` so the web app can be started by the CLI entrypoint and by local smoke harnesses without double-starting during imports.
- Hardened the operational console CSS for mobile/compact wrapping, stable overflow behavior, focus visibility, and non-nested approval fact blocks while preserving the operational console design direction, legal caveat, source indicators, and disabled provider-write affordance.
- Replaced the static-only `@ui-smoke` wrapper with a deterministic served web/API smoke. The smoke starts local HTTP surfaces in memory mode, fetches `/`, `/login`, and `/health`, writes desktop/mobile HTML viewport snapshots under `/tmp/puresoc-ui-smoke-*`, checks nonblank/readable/responsive/no-obvious-overlap invariants, and validates local auth cookie plus Origin middleware behavior.
- The smoke proves `HttpOnly`, `SameSite=Lax`, secure-cookie config on issued and cleared cookies, trusted-Origin acceptance, untrusted-Origin rejection, and OIDC/Microsoft provider callback Origin exemptions without calling live external providers, object storage, scanners, KMS/secret-manager, public regulatory URLs, or provider write executors.
- Documented that this workspace does not currently bundle Playwright/browser binaries, so M39 records deterministic HTTP-rendered viewport snapshots and fetch assertions instead of PNG screenshots. M40 is staged for real browser screenshot/navigation coverage when browser binaries are available or approved for installation.

Changed files:

- `code/README.md`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/packages/ui/src/index.ts`
- `code/scripts/run-ui-smoke.mjs`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M39.md`
- `docs/PLAN_M40.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `node` were unavailable. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run test:e2e -- --grep @ui-smoke` passed. It wrote deterministic snapshots under `/tmp/puresoc-ui-smoke-*/desktop-1440x900.html` and `/tmp/puresoc-ui-smoke-*/mobile-390x844.html`.
- `npm run test -- web ui api middleware auth health` passed: 28 test files, 80 tests.
- Supplemental `timeout 2 npm run start:web` confirmed the web CLI entrypoint still starts and reports `puresoc-web` listening.
- `npm run lint` passed, including workspace layout, selected schema drift, generated Romania regulatory drift, and TypeScript checks.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M39. The milestone narrows served web/runtime and browser-relevant auth middleware coverage with deterministic local HTTP smoke and explicit no-live-integration guarantees. It does not claim real browser PNG screenshot coverage, deployed TLS/CORS/proxy behavior, or full Playwright/Chromium traversal.

Gaps updated:

- GAP-031 narrowed for local served web/API startup, deterministic desktop/mobile HTML viewport snapshots, responsive/no-obvious-overlap assertions, and operational-console design preservation without browser PNG screenshots.
- GAP-035 narrowed for local served API/web cookie, trusted-Origin, untrusted-Origin, and callback-exemption smoke coverage without deployed browser/TLS/proxy claims.
- GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043 preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 38 / PLAN_M39 complete and stages Prompt 39 / PLAN_M40 for browser-grade Playwright screenshot and browser auth smoke.
- `docs/PLAN_M40.md` was created from the staged M40 prompt.

Residual risk:

- M39 uses HTTP-rendered HTML viewport snapshots and fetch-level browser-relevant assertions because Playwright/browser binaries are not bundled in this workspace. Real browser PNG screenshots, pointer/keyboard traversal, and browser layout engine overlap checks remain staged for M40/GAP-031.
- GAP-035 remains open for deployed TLS, CORS, reverse-proxy header trust, browser cookie traversal, SameSite behavior, and OIDC callback cookies in SaaS and in-a-box profiles.
- No live Microsoft Graph, Stripe API, OIDC provider, object-storage, scanner, KMS/secret-manager, public regulatory, or provider-write smoke was added.
