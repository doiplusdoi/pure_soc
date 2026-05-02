# M39 Plan: Served Web Runtime And Browser Auth/Middleware Smoke Slice

## Summary

Implement the next active prompt after M38: narrow GAP-031 and GAP-035 by turning the operational web console/UI smoke into a served local browser smoke with real web/API startup boundaries and browser auth/middleware checks.

Status: staged for implementation after M38.
Created: 2026-05-02.

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

- Pending. M39 implementation must create `docs/PLAN_M40.md` before final response.

Residual risk:

- Pending.
