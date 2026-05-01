# M17 Plan: Regulatory Source Monitor Runtime Scheduling

## Summary

Implement Prompt 16 from `docs/codex-prompts.md`: close GAP-027 by wiring `regulatory.monitorCountrySources` into the scheduler/runtime contract with configurable enablement, URL metadata checks, review-task creation, and no automatic legal activation.

Started: 2026-05-01.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/threat-model.md`
- `docs/PLAN_M16.md`
- Latest changed files
- Latest test output

## Scope

Expected implementation areas:

- Runtime config defaults and environment overrides for regulatory source monitor enablement, timeout, stale threshold, and review-task routing.
- Regulatory-source monitor domain/service behavior in `code/packages/regulatory-sources`.
- Scheduler-facing job contract under `code/apps/scheduler`.
- Focused tests using injected fake clients/fixtures, not live public regulatory URLs.

Expected files:

- `code/.env.example`
- `code/config/defaults/compliance.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/regulatory-sources/src/index.ts`
- `code/packages/regulatory-sources/src/__tests__/source-monitor.spec.ts`
- `code/packages/database/src/repositories/regulatory-sources.ts`
- `code/apps/scheduler/package.json`
- `code/apps/scheduler/src/index.ts`
- `code/apps/scheduler/src/regulatory-source-monitor.ts`
- `code/apps/scheduler/src/__tests__/regulatory-source-monitor.test.ts`
- `docs/PLAN_M17.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not auto-activate new or changed legal logic from the source monitor.
- Do not fetch live external regulatory URLs in tests.
- Do not put Romania-specific source-monitor logic in generic scheduler or regulatory-source packages.
- Do not put Microsoft-specific logic in generic compliance, scheduler, or regulatory-source packages.
- Do not add provider write/remediation execution.
- Do not make legal certification claims.
- Do not require the monitor to run in in-a-box deployments when `REGULATORY_SOURCE_MONITOR_ENABLED=false`.
- Do not log source response bodies or sensitive headers.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand regulatory source-monitor scheduler config
git diff --check
```

## Expected Gap Movement

- Resolve GAP-027 only if the monitor can be run deterministically through the scheduler contract, honors disabled config, creates review tasks for stale/unreachable/changed sources, avoids duplicate open tasks, and never activates legal logic.
- Keep legal reviewer SOP/UI under GAP-006 and live deployment smoke under the relevant runtime gaps.

## Assumptions

- `lastCheckedAt` represents the last trusted/reviewed successful source check. When the monitor detects stale, unreachable, or changed metadata, it should leave that timestamp unchanged and create review work instead of silently refreshing the source.
- Changed metadata detection can compare returned `ETag`, `Last-Modified`, or content hash indicators against active source-version metadata when those indicators exist. Lack of prior metadata is not itself a legal-logic change.
- Review tasks are global by default (`organizationId = null`) but can be routed to a configured organization ID for deployments that manage regulatory administration inside a dedicated organization.
- Tests will use injected fake metadata clients only; live regulatory URLs remain out of scope.

## Acceptance Criteria

- Disabled monitor performs no source checks and creates no tasks.
- Reachable unchanged source updates/checks metadata without activation work.
- Unreachable source creates an open `regulatory_admin` review task.
- Stale source creates an open `regulatory_admin` review task.
- Changed metadata/hash creates a `needs_review` task without activation.
- Repeated runs do not duplicate existing open source/status tasks.
- Tests use injected fake clients and do not call live regulatory websites.

## Completion Log

Completed: 2026-05-01.

Implementation results:

- Added regulatory source monitor config defaults under compliance config and `.env.example` entries for enablement, request timeout, stale threshold, and optional review-task organization routing.
- Added `RegulatorySourceMonitorService` in `@puresoc/regulatory-sources` with injectable metadata clients, HEAD-based default metadata checks, stale/unreachable/changed-metadata detection, sanitized metadata captured on review tasks, and no source-version activation.
- Extended regulatory source repositories with source listing support and made source-monitor review task creation idempotent for open source/status/organization combinations.
- Added a scheduler-facing one-shot job wrapper for `regulatory.monitorCountrySources`.
- Added focused tests for disabled monitor behavior, reachable no-op/update, unreachable review tasks, stale review tasks, changed metadata `needs_review` tasks, timeout handling, duplicate-task prevention, scheduler delegation, and config overrides.

Changed files:

- `code/.env.example`
- `code/package.json`
- `code/pnpm-lock.yaml`
- `code/config/defaults/compliance.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/regulatory-sources/src/index.ts`
- `code/packages/regulatory-sources/src/__tests__/source-monitor.spec.ts`
- `code/packages/database/src/repositories/regulatory-sources.ts`
- `code/apps/scheduler/package.json`
- `code/apps/scheduler/src/index.ts`
- `code/apps/scheduler/src/regulatory-source-monitor.ts`
- `code/apps/scheduler/src/__tests__/regulatory-source-monitor.test.ts`
- `docs/PLAN_M17.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm lint` could not run because `pnpm` is not installed on this host.
- `pnpm test -- --runInBand regulatory source-monitor scheduler config` could not run because `pnpm` is not installed on this host.
- `npm run test -- --runInBand regulatory source-monitor scheduler config` could not run because Vitest 3.2.4 rejects the `--runInBand` option.
- `npm run lint` passed through host Node/npm.
- `npm run test -- regulatory source-monitor scheduler config` passed through host Node/npm: 7 test files, 31 tests.
- `git diff --check` passed.

Acceptance status:

- Accepted for M17 using host-node equivalents. The exact `pnpm` commands remain unavailable in this environment, and the prompt's `--runInBand` flag remains unsupported by the installed Vitest version.

Gaps updated:

- GAP-027 is resolved for scheduler job contract, configurable source monitor behavior, URL metadata checks through injectable clients, idempotent review-task creation, and no-auto-activation tests.
- GAP-006 remains open for legal/product reviewer SOP and activation UI before production use.

Prompt handoff:

- `docs/codex-prompts.md` now marks Prompt 16 / `PLAN_M17` completed.
- `docs/PLAN_M18.md` was not created because no next active prompt exists after the M17 handoff.

Residual risk:

- The monitor is exposed as a deterministic one-shot scheduler contract; deployment-specific recurring process wiring remains a runtime orchestration task.
- Live public regulatory URL behavior is covered by the default HEAD client shape but not smoke-tested against public websites.
- Production reviewer assignment, evidence standards, and activation UI remain tracked by GAP-006.
