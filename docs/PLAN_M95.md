# M95 Plan: Product Milestone 3 - Compliance Score Trend Chart

## Summary

M95 is staged for the next implementation slice from the user-provided PureSOC full product prompt: Milestone 3, compliance score trend chart.

Status: staged.
Created: 2026-06-14.
Depends on: `docs/puresoc_vision.md`, `docs/master-plan.md`, `docs/implementation-gaps.md`, `docs/codex-prompts.md`, `docs/LEARNINGS.md`, completed M94 notification work, existing dashboard snapshot/output repository patterns, scheduler runtime, and served operational-console UI.

## Intended Scope

- Ensure the scheduler creates at most one `DashboardSnapshot` per organization per day.
- Ensure each daily snapshot contains:
  - `overall_score` from compliant plus accepted-risk controls as a 0-100 percentage.
  - `gap_count_by_severity` for critical, high, medium, and low gaps.
  - `controls_compliant` and `controls_total`.
  - `provider_connection_health` as the number of healthy provider connections.
  - a `created_at` timestamp.
- Add `GET /organizations/:orgId/dashboards/snapshots?days=90` returning ascending `{ date, overall_score, critical_gaps, high_gaps }` history.
- Add a main-dashboard trend chart using a simple SVG line chart, no new charting library.
- Support 30/90/180 day toggles, score Y axis from 0-100, critical gap secondary line, hover tooltip, not-enough-data state for fewer than three snapshots, and a score movement stat row.

## Expected Files

- `code/packages/database/src/repositories/output-records.ts`
- `code/apps/api/src/dashboards/service.ts`
- `code/apps/api/src/server.ts`
- `code/apps/scheduler/src/runtime.ts`
- `code/apps/scheduler/src/main.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- Focused tests under `code/apps/api/src/__tests__`, `code/apps/scheduler/src/__tests__`, `code/apps/web/src/__tests__`, and possibly `code/packages/database/src/__tests__`.

## Negative Constraints

- Do not implement Milestones 4-9.
- Do not add provider writes or remediation actions.
- Do not add an external charting dependency unless the repo already has one and the existing UI pattern clearly uses it.
- Do not fabricate live Microsoft/Stripe/storage evidence; dashboard health must be derived from existing local/provider repository state.
- Do not make country-specific regulatory logic leak into the EU core.

## Validation Plan

Run from `code/`:

```sh
npm run typecheck
npm test -- dashboards scheduler web output-records
npm run lint
DATABASE_URL=postgresql://pure_soc:pure_soc@127.0.0.1:5432/pure_soc npm run prisma:validate
git diff --check
```

If sandboxed tests cannot bind local HTTP ports, rerun the same command with approval outside the sandbox.

## Acceptance Criteria

- Dashboard shows the trend chart when at least three daily snapshots exist.
- New organizations render a clear "Not enough data" state when fewer than three snapshots exist.
- Scheduler creates one daily snapshot per organization without duplicates.
- API returns correct ascending historical data for the requested day window.
- The stat row correctly reports improvement, decline, or unchanged score over the selected window.
