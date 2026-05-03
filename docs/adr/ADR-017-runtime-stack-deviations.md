# ADR-017: Runtime Stack Deviations

Status: accepted
Date: 2026-05-03

## Context

`docs/master-plan.md` names NestJS for the API, Next.js/React for the web portal, BullMQ for queue workers, and Playwright for browser/report rendering. The implementation has deliberately stayed lighter during the contract/runtime-baseline phase:

- `apps/api` uses `node:http` with shared middleware for request context, Origin/Referer protection, and rate limiting.
- `apps/web` uses a `node:http` served HTML runtime with shared PureSOC UI primitives.
- `@puresoc/jobs` uses a minimal Redis-backed queue adapter under the existing job boundary instead of the BullMQ npm package.
- UI smoke coverage uses deterministic HTTP snapshots and host Firefox WebDriver BiDi when available instead of a checked-in Playwright browser matrix.

The deviations are now large enough to document. They are not a change in product direction: PureSOC remains a Docker-first, TypeScript, provider-neutral NIS2 readiness platform with read-only provider discovery by default.

## Decision

Keep the current lightweight runtime stack for the next customer-shaped demo baseline.

- API: continue with `node:http` plus the existing middleware boundary. Re-evaluate a small route table or Hono-style router before adding another broad route family, and re-evaluate NestJS only if dependency injection, OpenAPI generation, or module lifecycle needs become stronger than the cost of migration.
- Web: continue with `node:http` served HTML for M53, now backed by real API auth/session/dashboard responses. Re-evaluate Next.js/React after the first authenticated dashboard, organization-selection flow, and Romania onboarding screens prove they need client-side state or richer routing.
- Jobs: continue with the current job registry and Redis adapter while provider writes remain disabled. Re-evaluate BullMQ once production queue metrics, repeatable scheduling, delayed jobs, and multi-container operations exceed the minimal adapter.
- Browser/UI smoke: continue deterministic HTTP snapshots plus host Firefox WebDriver BiDi. Re-evaluate Playwright when Chromium/WebKit/Firefox binaries are available in CI or a release gate requires cross-browser screenshot diffs.

## Consequences

- The repo avoids package installs and framework migration during M53.
- The served web runtime can prove a real auth/session/dashboard path now, while leaving full Next.js/React as a product-runtime decision rather than an assumption.
- Future prompts should not describe the current implementation as NestJS, Next.js, BullMQ, or Playwright-backed unless those migrations happen.
- The gap register should keep distinguishing "served runtime exists" from "full framework/browser matrix exists."

## Non-Decisions

- This ADR does not reject Next.js, NestJS, BullMQ, or Playwright permanently.
- This ADR does not enable provider write execution or Microsoft Graph write scopes.
- This ADR does not change the provider-neutral compliance boundary.
- This ADR does not make the current audit chain, queue runtime, or browser coverage production-complete.
