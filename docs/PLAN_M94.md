# M94 Plan: Product Milestone 2 - Notification And Alert System

## Summary

M94 is staged for the next implementation slice from the user-provided PureSOC full product prompt: Milestone 2, notification and alert delivery.

Status: staged.
Created: 2026-06-14.
Depends on: `docs/puresoc_vision.md`, `docs/master-plan.md`, `docs/implementation-gaps.md`, `docs/codex-prompts.md`, `docs/LEARNINGS.md`, current auth/RBAC/audit/job/runtime patterns, and the existing email/webhook/provider-event code.

## Intended Scope

- Add Prisma-backed notification channel and notification log models with org-scoped cascade behavior, timestamps, and indexes.
- Implement a `NotificationService.send(orgId, event, payload)` method that dispatches to enabled email, Slack webhook, and Teams webhook channels and logs every attempt without propagating send failures.
- Trigger notification events for critical gaps, Microsoft 365 drift, incident deadlines, expiring evidence, overdue checklists, and verified remediation actions.
- Add a 30-minute scheduler path for upcoming incident and evidence expiry windows.
- Add authenticated organization-scoped API endpoints for notification channels, test sends, and logs.
- Add the Settings -> Notifications UI panel using existing component/CSS patterns.

## Negative Constraints

- Do not implement Milestones 3-9 in this slice.
- Do not send provider write/remediation actions.
- Do not expose notification destinations across organizations.
- Do not add a new UI framework or component library.
- Do not claim production email deliverability without configured SMTP validation.

## Validation Plan

Run from `code/` unless the implementation chooses a narrower equivalent:

```sh
npm run prisma:generate
npm run test -- notifications scheduler evidence compliance actions web
npm run lint
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If sandboxed tests cannot bind local HTTP ports, rerun the same command with approval outside the sandbox.

## Expected Gap Movement

M94 should narrow the alerting/operations gap for org-scoped notification configuration, reliable send-attempt logging, scheduler-triggered deadline/expiry alerts, and local UI/API management.
Live SMTP and real Slack/Teams webhook delivery should only be claimed when configured and validated with approved disposable/test targets.
