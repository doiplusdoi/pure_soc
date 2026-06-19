# PureSOC Implementation Status - June 19, 2026

## Current State

PureSOC is in a strong local product/proof state, but it is not launch-ready.

The repo has moved well beyond scaffolding. The `code/` monorepo includes API, web, worker, scheduler, connector-runner, regulatory-importer, report-renderer, Prisma schema/migrations, Docker Compose service catalog, and typed packages for auth, providers, compliance, billing, evidence, audit, jobs, reports, dashboards, notifications, and shared contracts.

## What Works Locally

- Local registration, login, sessions, organization/workspace selection, RBAC, audit logging, email-verification flow, and owner-managed invitations.
- Romania NIS2 readiness workflow with saved onboarding answers, generated service catalog, classification, notification draft generation, evidence upload, dashboard state, JSON/CSV/PDF exports, and local evidence-package export.
- EU NIS2 Article 21 control catalog, gap generation, recommendations, readiness plan, checklist mapping, dashboard snapshots, and trend chart.
- Microsoft 365 connector architecture with tenant-owned provider connections, read-only permission bundles, mocked/fixture-backed read modules, consent flow shape, and module-health reporting.
- Evidence/reporting stack with metadata, access logs, JSON/CSV/PDF reports, generated-report evidence, report-export rows, and deterministic local package bundles.
- Notification plumbing with SMTP/Slack/Teams transport boundaries, notification channels/logs/deadlines, Settings UI, and local alert triggers.
- Billing abstraction with Stripe checkout/portal/webhook contracts and `BILLING_PROVIDER=none` behavior.
- Remediation/action safety foundation: action templates/runs, preflight, approval, snapshots, verification, evidence metadata, idempotency, audit events, and disabled Microsoft write executor.

## Current Validation Signal

As of June 19, local validation is healthy after refreshing dependencies:

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm test -- dashboards scheduler web output-records` passes outside sandbox.
- `docker compose -f infra/compose/docker-compose.yml config` passes.
- `npm run external-smoke:select-target` returns `no_ready_path`, so no external live smoke target is currently configured.
- `prisma:validate` passes outside sandbox.

## Major Open Gaps

- No approved Romania legal activation, Romanian legal copy, or DNSC submission path.
- No approved product/legal calibration for readiness scoring and customer-facing score semantics.
- No approved billing packaging, Stripe price mappings, or live Stripe test-mode smoke.
- No live Microsoft 365 disposable-tenant smoke has run.
- No live object-storage/scanner/report-renderer smoke has run.
- Public signup is controlled-test ready, not broad SaaS ready: real email delivery, open-vs-invite-only policy, platform-admin bootstrap, and abuse controls remain open.
- Notification delivery is locally modeled, but no disposable SMTP/Slack/Teams smoke or retry/suppression policy exists.
- Audit is tamper-evident in database, not WORM/notarized.
- Provider-token custody is local-env/fake-test only, not KMS/HSM/secret-manager backed.
- Production multi-process queue orchestration and deployed runtime proof remain open.

## Recommended Next Engineering Step

Implement `docs/PLAN_M96.md`: Product Milestone 4, Write Actions Wave 1 Zero Blast Radius.

Scope should be limited to four non-mutating Microsoft 365 action templates:

- Audit-log export setup guide.
- MFA coverage report.
- Guest-user review task creation.
- App-registration credential-expiry report.

These must stay inside the existing lifecycle: preflight, approval, snapshot, verification, and evidence. They should generate reports, setup guidance, checklist tasks, or evidence metadata only. They must not modify Microsoft 365 configuration, enable generic provider writes, call live Microsoft Graph, or bypass the disabled Microsoft write executor.

## Best Ideas To Explore Next

- Productize the zero-blast-radius action queue as "guided remediation packets" rather than real automation.
- Add a reviewer/admin-only Romania legal review dashboard without exposing workbook/source-map internals to customers.
- Prepare a single disposable Microsoft 365 read-only tenant smoke and record sanitized evidence.
- Decide public signup policy: open signup, invite-only, or hybrid waitlist.
- Improve customer-facing workflow around "what to do next" after Romania classification and Microsoft connector setup.
- Turn existing reports/evidence packages into a polished auditor handoff experience.

