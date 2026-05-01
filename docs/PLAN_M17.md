# M17 Plan: Regulatory Source Monitor Runtime Scheduling

## Summary

Implement Prompt 16 from `docs/codex-prompts.md`: close GAP-027 by wiring `regulatory.monitorCountrySources` into the scheduler/runtime contract with configurable enablement, URL metadata checks, review-task creation, and no automatic legal activation.

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

## Acceptance Criteria

- Disabled monitor performs no source checks and creates no tasks.
- Reachable unchanged source updates/checks metadata without activation work.
- Unreachable source creates an open `regulatory_admin` review task.
- Stale source creates an open `regulatory_admin` review task.
- Changed metadata/hash creates a `needs_review` task without activation.
- Repeated runs do not duplicate existing open source/status tasks.
- Tests use injected fake clients and do not call live regulatory websites.

## Completion Log

Pending implementation.
