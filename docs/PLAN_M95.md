# M95 Plan: Product Milestone 3 - Compliance Score Trend Chart

## Summary

M95 implemented the next product slice from the user-provided PureSOC full product prompt: Milestone 3, compliance score trend chart.

Status: completed.
Created: 2026-06-14.
Completed: 2026-06-14.
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

- `code/packages/dashboards/src/dashboard.types.ts`
- `code/packages/dashboards/src/aggregation.ts`
- `code/packages/database/src/repositories/output-records.ts`
- `code/apps/api/src/dashboards/service.ts`
- `code/apps/api/src/dashboards/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/scheduler/src/dashboard-snapshots.ts`
- `code/apps/scheduler/src/runtime.ts`
- `code/apps/scheduler/src/main.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/packages/ui/src/index.ts`
- Focused tests under `code/apps/api/src/__tests__`, `code/apps/scheduler/src/__tests__`, `code/apps/web/src/__tests__`, and possibly `code/packages/database/src/__tests__`.

## Implementation Notes

- Store trend-specific metrics inside each `DashboardSnapshotContract` as `trendMetrics` so existing weighted readiness scores remain unchanged.
- Use UTC calendar days for daily de-duplication.
- Count provider health from provider-neutral connections only: connected and read-enabled connections are healthy.
- Keep the chart dependency-free with server-rendered HTML/SVG plus a small inline dashboard script for range toggles and pointer tooltip metadata.

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

## Actual Changed Files

- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `code/apps/api/src/dashboards/routes.ts`
- `code/apps/api/src/dashboards/service.ts`
- `code/apps/api/src/index.ts`
- `code/apps/api/src/server.ts`
- `code/apps/scheduler/package.json`
- `code/apps/scheduler/src/__tests__/runtime.test.ts`
- `code/apps/scheduler/src/dashboard-snapshots.ts`
- `code/apps/scheduler/src/index.ts`
- `code/apps/scheduler/src/main.ts`
- `code/apps/scheduler/src/runtime.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/packages/dashboards/src/__tests__/dashboards.spec.ts`
- `code/packages/dashboards/src/aggregation.ts`
- `code/packages/dashboards/src/dashboard.types.ts`
- `code/packages/database/src/__tests__/prisma-output-records.repository.spec.ts`
- `code/packages/database/src/repositories/output-records.ts`
- `code/packages/ui/src/index.ts`
- `code/pnpm-lock.yaml`
- `docs/codex-prompts.md`
- `docs/PLAN_M95.md`
- `docs/PLAN_M96.md`
- `docs/LEARNINGS.md`
- `docs/codex_status.md`
- `docs/implementation-gaps.md`

## Validation Results

Passed from `code/` unless noted:

```sh
npm test -- dashboards scheduler web output-records
npm run typecheck
npm run lint
DATABASE_URL=postgresql://pure_soc:pure_soc@127.0.0.1:5432/pure_soc npm run prisma:validate
```

Passed from repository root:

```sh
git diff --check
```

## Acceptance Status

Accepted for local/API/runtime scope:

- Dashboard snapshots now include additive `trendMetrics` with compliant/accepted-risk score, severity counts, compliant/total controls, and provider connection health.
- `GET /organizations/:orgId/dashboards/snapshots?days=90` returns ascending `{ date, overall_score, critical_gaps, high_gaps }` rows and collapses duplicate manual snapshots to the latest same-day record.
- Scheduler runtime registers `dashboards.createDailySnapshots`, enqueues it on startup and interval, and skips existing UTC-day snapshots.
- Main dashboard renders a dependency-free SVG trend chart with 30/90/180 day toggles, exact-value point labels, not-enough-data state, and movement stat copy.

## Gaps Updated

- `docs/implementation-gaps.md` records the UTC-day and connected/read-enabled provider-health assumptions for M95.

## Residual Risk And Deferred Work

- Daily de-duplication is enforced by repository/runtime logic rather than a database unique index. Add a partial/date index later if multi-writer scheduler deployments need database-level enforcement.
- Score calibration remains subject to GAP-021 product/legal review; M95 uses a narrow compliant-or-accepted-risk trend score and does not replace the existing weighted readiness model.
- M96 is staged for Milestone 4 and was not implemented in this slice.
