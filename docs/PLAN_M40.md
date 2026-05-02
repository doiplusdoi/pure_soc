# M40 Plan: Browser-Grade Playwright Screenshot And Browser Auth Smoke Slice

## Summary

Implement the next active prompt after M39: further narrow GAP-031 and GAP-035 by adding a real browser screenshot/navigation harness when Playwright/browser binaries are available, while preserving the deterministic M39 HTTP fallback.

Status: staged for implementation after M39.
Created: 2026-05-02.

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

Not started.

Implementation results:

- Pending.

Changed files:

- Pending.

Validation:

- Pending.

Acceptance status:

- Pending.

Gaps updated:

- Pending.

Prompt handoff:

- Pending. M40 implementation must create `docs/PLAN_M41.md` before final response.

Residual risk:

- Pending.
