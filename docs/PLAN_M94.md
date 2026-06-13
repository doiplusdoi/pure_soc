# M94 Plan: Product Milestone 2 - Notification And Alert System

## Summary

M94 implements Milestone 2 from the user-provided PureSOC full product prompt: organization-scoped notification channels, alert delivery attempts, event triggers, scheduler scans, API management, and served Settings -> Notifications UI.

Status: completed.
Created: 2026-06-14.
Completed: 2026-06-14.
Depends on: `docs/puresoc_vision.md`, `docs/master-plan.md`, `docs/implementation-gaps.md`, `docs/codex-prompts.md`, `docs/LEARNINGS.md`, current auth/RBAC/audit/job/runtime patterns, and the existing provider/compliance/report/evidence boundaries.

## Implemented Scope

- Added `@puresoc/notifications` with event types, template rendering, payload hashing, non-throwing `NotificationService.send`, disabled SMTP fallback, SMTP delivery, Slack webhook delivery, and Teams webhook delivery.
- Added org-scoped `notification_channels`, `notification_logs`, and `notification_deadlines` Prisma models, migration SQL, database repositories, schema group coverage, and runtime persistence selection.
- Added typed notification config defaults and environment overrides for SMTP, webhook timeout, and scheduler deadline scan interval.
- Added API endpoints for listing/creating/deleting channels, sending test notifications, and listing delivery logs with RBAC and audit events.
- Triggered notifications from persisted critical compliance gaps, newly observed open Microsoft 365 drift findings, and verified remediation action completion.
- Added scheduler support for incident deadline, evidence expiry, and overdue checklist notifications using local repository candidates and Prisma queries.
- Added served web `/settings/notifications` with channel creation, safe webhook previews, test/delete actions, and recent log rendering.
- Updated Compose/env defaults and dependency wiring so API/scheduler can use the notification package in memory or Prisma mode.

## Negative Constraints Preserved

- Did not implement Milestones 3-9.
- Did not enable provider write/remediation actions.
- Did not expose full Slack/Teams webhook URLs in API or UI responses; only redacted previews are returned.
- Did not claim live SMTP, Slack, or Teams delivery. Tests use injected transports and local HTTP/service boundaries.
- Did not invent a full incident workflow domain model; `notification_deadlines` is a minimal alert-source table until that workflow exists.

## Actual Files Changed

- `code/packages/notifications/**`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260614010000_notifications/migration.sql`
- `code/packages/database/src/repositories/notifications.ts`
- `code/packages/database/src/contracts/schema-groups.ts`
- `code/packages/database/src/index.ts`
- `code/packages/config/src/index.ts`
- `code/config/defaults/notifications.json`
- `code/apps/api/src/notifications/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/compliance/service.ts`
- `code/apps/api/src/provider-connections/microsoft365/service.ts`
- `code/apps/api/src/actions/service.ts`
- `code/apps/scheduler/src/notifications.ts`
- `code/apps/scheduler/src/runtime.ts`
- `code/apps/scheduler/src/main.ts`
- `code/apps/scheduler/src/index.ts`
- `code/apps/scheduler/src/runtime-status.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/index.ts`
- `code/.env.example`
- `code/infra/compose/docker-compose.yml`
- package manifests and `code/pnpm-lock.yaml`
- focused API, scheduler, web, schema, and runtime tests

## Validation Results

Run from `code/`:

```sh
npm run typecheck
# passed

npm test -- apps/api/src/__tests__/notifications-api.test.ts apps/scheduler/src/__tests__/notifications.test.ts apps/web/src/__tests__/web-dashboard-reports-ui.test.ts
# passed outside the sandbox after sandboxed execution hit local listen EPERM

npm run lint
# passed; layout, schema drift, generated regulatory drift, and typecheck all clean

DATABASE_URL=postgresql://pure_soc:pure_soc@127.0.0.1:5432/pure_soc npm run prisma:validate
# passed

npm test
# passed outside the sandbox; 87 files / 410 tests
```

Notes:

- `npm run prisma:validate` without `DATABASE_URL` failed because Prisma requires the env var while loading config. The dummy local URL validation passed and did not connect to PostgreSQL.
- No live SMTP, Slack, Teams, Microsoft Graph, object storage, scanner, Stripe, OIDC, public regulatory, or provider-write call was made.

## Gap Movement

M94 narrows local alerting/operations coverage: notification settings are org-scoped, delivery attempts are logged, webhook destinations are redacted, runtime persistence exists in memory and Prisma modes, and scheduler/API/UI paths have deterministic tests.

Remaining blockers:

- Live SMTP/Slack/Teams disposable smoke is not run.
- Production notification deliverability, bounce handling, webhook retry/backoff, and endpoint secret rotation are not proven.
- Incident deadlines use the new `notification_deadlines` table as a minimal source until a full incident workflow exists.

Next staged milestone: `docs/PLAN_M95.md` for Product Milestone 3 - Compliance Score Trend Chart.
