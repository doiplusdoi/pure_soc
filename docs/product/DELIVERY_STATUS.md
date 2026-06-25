# PureSOC Delivery Status And Implementation Plan

This is the one-go implementation plan for aligning the current repository with the canonical product constitution. It is ordered as vertical slices so each step can end with code, tests, and a gap-register update.

## Current Baseline

The codebase currently provides:

- Docker-oriented local stack under `code/`.
- Node/http API and web runtime.
- PostgreSQL/Prisma schema with broad NIS2, provider, evidence, report, audit, billing, partner, and auth foundations.
- Product facade routes under `/api/*`.
- Lightweight product shell routes for dashboard, onboarding, gaps, Microsoft 365, remediation, evidence, reports, settings, and partner customers.
- Microsoft 365 read-only connector foundation with fixture/live/auto modes.
- Romania source-mapping and NIS2 classification foundation.
- Evidence, report, notification, audit, billing, and remediation scaffolds.
- Disabled Microsoft write executor and guarded destructive aliases.

The codebase does not yet meet the production launch target for partner lifecycle, country packs, four locales, full operational security domain, API v1, live proofs, safe writes, or operations hardening.

## Implementation Progress: 2026-06-25

The first constitution-alignment slice is implemented locally and test-backed:

- `/api/v1` exists with request ID/correlation headers, v1 error envelopes, a checked-in OpenAPI contract, pagination/filter helpers, idempotent async operations, and compatibility with the existing `/api/*` facade.
- Local product v1 workflows cover organization setup, business services, people/responsibilities, suppliers, partner relationship lifecycle, partner assignments, separate support sessions, product assets, findings, remediation plans, tasks, incidents with reporting clocks, risks, policy documents, supplier reviews, policy reviews, policy acknowledgements, governance activities, governance calendar events, attestations, and training records.
- The web server now renders organization-scoped `/app/o/:organizationId/*` product v1 console routes for overview, setup, business context, security work, incidents, risk, governance, evidence, reports, connector capabilities, notifications, internal events, and customer-visible support-session audit entries. `/app/setup/*` resolves the active organization and renders the v1 setup workflow directly. `/app/partner/:partnerId/*` renders the existing partner portfolio console through partner APIs, and its add-customer, enter-customer, and exit-customer forms post through app-prefixed aliases while legacy `/partners/*` routes remain compatible. `/app/admin/*` renders an explicit blocked state until platform-admin RBAC, support operations, country-pack activation controls, and production audit review exist.
- Country-pack v1 metadata includes Romania, Poland, and Germany plus `en`, `ro`, `pl`, and `de` locale infrastructure. These packs remain review-gated and legal-activation-blocked unless approval metadata is added.
- Microsoft 365 disconnect now deletes stored local credentials, preserves historical provider observations, revokes local read/write state, and marks stored capabilities unavailable with `revoked_consent`.
- Product v1 now exposes provider-action preflight/read/approval safety aliases over the existing action-run lifecycle. Preflight creates or reuses an idempotent local `ActionRun`, records safe preflight details, and never mutates a provider tenant. Execute can complete approved non-executable actions as zero-blast local outputs by creating a product task, evidence FileObject metadata, immutable remediation-progress report snapshot, product-v1 action operation, audit entry, and internal event. Executable provider-write actions still return `provider_action_execution_blocked` until all write-safety gates and disposable-tenant proof exist.
- Product v1 contract state now has a Prisma-backed durable state table for setup, relationship, support, operation, incident, risk, policy, finding, task, remediation, asset, service, people, supplier, supplier-review, policy-review, policy-acknowledgement, governance, attestation, and training records in Prisma mode, with memory mode still using the in-memory repository.
- Product v1 lifecycle resources now have audited PATCH transitions for findings, remediation plans, tasks, incidents, risks, policies, supplier reviews, policy reviews, policy acknowledgements, governance activities, governance calendar events, attestations, and training records. Audit entries include before/after state.
- Product v1 now has durable internal event/outbox-compatible records for workflow creates, lifecycle updates, file object events, report snapshots, and Microsoft sync/disconnect completion. Publisher result recording is explicit and audited, without claiming external queue delivery.
- Product v1 now exposes audit export and checkpoint routes that delegate to the existing redacted audit segment/checkpoint service. These routes keep database-only/fake-anchor guarantees explicit and do not claim WORM storage, external notarization, or legal certification.
- Product v1 now exposes notification channel, channel rotation/disable, channel test-send, delivery-log, and local operator-alert routes that delegate to the existing notification service with tenant isolation, destination redaction, and audit behavior. It also exposes in-app notification-center item and preference routes with read/archive/suppression state, audit entries, internal events, org-scoped web rendering, and form-forwarding tests. API-triggered and scheduled transport sends now honor organization mute/suppressed-category preferences and defer non-urgent events when daily or weekly digest mode is selected. Deferred sends are persisted as digest items and the scheduler dispatches due daily/weekly summaries through the same channel/log service. Failed transport sends are persisted as delivery-retry items and retried by the scheduler with bounded backoff; exhausted retries create local operator alerts visible and acknowledgeable from notification settings. Live transport proof remains separate work.
- Product v1 now exposes report templates, immutable JSON/PDF report snapshots, deterministic artifact downloads with checksum verification, FileObject metadata, retention policies, legal hold updates, retention-aware tombstone/delete gates, and delete-blocked/tombstone/download audit events. Browser-grade renderer output and physical object-storage persistence remain separate production-hardening work.
- Backup and restore placeholders were replaced with guarded PostgreSQL plus opt-in S3/MinIO object-storage operator scripts, dry-run tests, package entry points, and `docs/operations-backup-restore.md`. A completed restore drill remains blocked until an approved target exists.
- API observability now includes a local Prometheus-compatible `/metrics` endpoint with process-local request counters by method, route family, and status code. The endpoint intentionally avoids paths, IDs, cookies, IP addresses, and user identifiers. Traces, alerts, dashboards, and deployed scrape proof remain separate hardening work.
- The deterministic served `@ui-smoke` now follows the current product shell route split, captures `/dashboard`, `/onboarding`, `/app/o/:organizationId/security/findings`, `/app/setup/microsoft365`, `/app/partner/:partnerId/customers`, and `/app/admin/health`, and verifies app-route context, app-prefixed partner actions, admin blocked state, duplicate-ID regressions, and no certification/DNSC/provider-write claims without live external calls.
- `@browser-smoke` was attempted in this environment and returned the explicit blocked status `firefox_not_found`; browser PNG coverage is not claimed here.
- Focused tests now cover v1 error shape, OpenAPI, pagination/filtering, idempotent sync operations, relationship transitions, partner assignment authorization, organization-scoped support sessions and delegated-partner bypass rejection, setup persistence, country-pack outcome normalization, Microsoft capability states, disconnect semantics, provider-action preflight idempotency, action-run redaction, approval, zero-blast local artifact creation, blocked provider-write execution, action tenant rejection, incident clocks, product aggregate creation/update, supplier/policy/governance workflows, report snapshots, FileObject retention gates, legal hold behavior, notification v1 aliases, notification-center item/preference lifecycle and tenant rejection, notification suppression/digest-deferral policy behavior, scheduler notification preference enforcement, digest queue/dispatch behavior, delivery retry/backoff behavior, internal event/outbox status recording, product v1 app-route rendering/form forwarding/setup-route rendering/partner-route rendering/admin blocked state/organization-scope rejection/customer-visible support audit rendering, local health/metrics shape, cross-organization rejection, and Product V1 durable repository reload/update.

Production blockers remain explicit:

- Product v1 domain records are durable in Prisma mode through a typed state-record table, but explicit relational models, richer query constraints, and migration/backfill design for each aggregate are still required before treating the v1 schema as final production modeling.
- Organization-scoped product v1 workflows, active-organization setup routes, and partner portfolio routes now have compact server-rendered UI surfaces, including tested app-prefixed partner add-customer/session mutation aliases, customer-visible support-session audit entries, and deterministic served UI smoke snapshots. `/app/admin/*` is explicitly blocked until platform-admin authorization and support operations exist; richer workflow-specific screens and cross-browser/browser-PNG smoke coverage still need parity work.
- Legal/product approval is still required before activating Romania, Poland, or Germany country-pack content.
- Live Microsoft Graph proof requires approved disposable credentials and remains unexecuted here.
- Microsoft provider writes beyond zero-blast local/report/task/evidence-style actions remain disabled. The v1 provider-action execute route creates local artifacts only for non-executable actions and intentionally blocks provider-write actions without queueing provider mutation.
- Object-storage deletion proof, browser-grade localized PDF renderer wiring, WORM/external signing, notification live transport proof and bounce handling, external queue/worker outbox delivery, completed restore drills, deployed observability traces/alerts/dashboards, and production smoke coverage remain future slices.

## Phase 0: Codebase Truth And Foundation

Goal: make the product target explicit and create the contract scaffolding needed for safe migration.

Steps:

1. Create product baseline docs under `docs/product/`.
2. Add `/api/v1` namespace with shared request ID, error helper, and compatibility delegation.
3. Add OpenAPI generation or checked-in OpenAPI contract for current v1 routes.
4. Add pagination, filtering, idempotency, and async operation helpers.
5. Add tenant-isolation tests for organization ID swapping across the highest-risk route families.
6. Add job status resources for sync, report generation, evidence packages, and provider actions.
7. Document backup/restore, health checks, and local operational smoke commands.

Acceptance commands:

- `npm run typecheck`
- `npm test`
- Focused API contract and authorization tests.
- `npm run prisma:validate`
- `docker compose config`

## Phase 1: Organizations, Partners, And Onboarding

Goal: implement the product access model and guided setup flow before adding broader operational features.

Steps:

1. Add `OrganizationRelationship`, `PartnerAssignment`, and support-session models.
2. Backfill current partner tenant grants into active relationship records.
3. Implement customer invitation, customer acceptance, suspension, termination request, termination, and expiry workflows.
4. Implement partner team/member assignment scopes.
5. Add support sessions with reason, expiry, policy authorization, customer-visible audit, and termination.
6. Migrate web routes toward `/app/setup/*`, `/app/o/:organizationId/*`, `/app/partner/:partnerId/*`, and `/app/admin/*`.
7. Upgrade onboarding to cover organization, jurisdiction, services, people, systems, suppliers, Microsoft 365, and review/launch.
8. Add business services, people/responsibilities, suppliers, and setup state tests.

Acceptance commands:

- `npm run typecheck`
- `npm test -- --runInBand`
- Focused partner authorization tests.
- Browser smoke for setup, direct customer navigation, partner customer navigation, and support audit visibility.

## Phase 2: Microsoft 365 Connection And Baseline Posture

Goal: make read-only Microsoft posture reliable, transparent, scheduled, and externally proven.

Steps:

1. Prove live read-only consent and sync against an approved disposable tenant.
2. Add durable per-module sync cursors, stale-state handling, and module-level health.
3. Verify Defender incident and current alerts API usage. Avoid legacy `/security/alerts`.
4. Add risky users, risk detections, service health, and message center if approved for selected bundles.
5. Map provider resources into product assets and source links.
6. Map provider findings into product findings with lifecycle state.
7. Add scheduled sync jobs, dead-letter visibility, operation status, and connector health UI.
8. Add disconnect behavior that deletes secrets, preserves history, and marks dependent controls stale.

Acceptance commands:

- `npm run typecheck`
- Microsoft provider unit and contract tests.
- Connector smoke in fixture mode.
- Live smoke only with approved disposable tenant and no write permissions.

## Phase 3: Operational Security Loop

Goal: turn posture observations into managed work without unsafe provider writes.

Steps:

1. Add product asset, finding, task, and remediation-plan models.
2. Add finding lifecycle: open, in progress, accepted risk, suppressed, remediated, verified, reopened.
3. Add task assignment, due dates, comments, evidence links, SLA, and audit.
4. Implement zero-blast Microsoft actions that generate evidence and tasks without tenant mutation.
5. Add action policy, idempotency, preflight, approval, recent-auth, async operation, verification, and evidence for real action paths.
6. Add class 1 Microsoft actions after disposable-tenant proof.
7. Add incident aggregate, source links, timeline, reportability review, reporting clock, and post-incident review.
8. Add notification live transport proof and bounce handling.

Acceptance commands:

- `npm run typecheck`
- `npm test`
- Focused action safety tests.
- Incident lifecycle tests.
- Browser smoke for findings, tasks, remediation approvals, incidents, and notifications.

## Phase 4: NIS2 Governance, Risk, Evidence, And Country Packs

Goal: make NIS2 a real governance workflow, not only a classifier and readiness score.

Steps:

1. Upgrade country-pack contract with versioning, review status, effective dates, authority data, incident rules, localized terms, and impact analysis.
2. Normalize classification outcomes to the constitution enum.
3. Extend locales to `en`, `ro`, `pl`, and `de` with missing-locale tests.
4. Prepare Romania active-pack migration, but keep review-required until legal/product approval exists.
5. Implement full Poland country pack from source data and keep review-required until approved.
6. Implement full Germany country pack from source data and keep review-required until approved.
7. Add organization controls, control assessments, exceptions, evidence requirements, and management approvals.
8. Add risk register, supplier reviews, policy lifecycle, attestations, training records, and governance calendar.
9. Add incident reporting package generation with human-review gates.

Acceptance commands:

- `npm run typecheck`
- Country-pack importer and source-map tests.
- Localization completeness tests.
- Compliance/control/risk/supplier/policy workflow tests.
- Report snapshot tests for each country pack.

## Phase 5: Reports, Partner Scale, And GA Hardening

Goal: make the product operate safely for real customers and partners.

Steps:

1. Add immutable report snapshots and templates for security baseline, executive summary, NIS2, controls/evidence, risk register, incident package, remediation progress, partner portfolio, customer service, and audit reports.
2. Add browser-grade PDF rendering in all launch locales with deterministic snapshots and object-storage-backed artifacts.
3. Add scheduled reports and export jobs.
4. Add file object abstraction, retention policies, legal hold, evidence deletion gates, and storage-provider checks.
5. Add WORM or external signing/export support for audit records.
6. Add transactional outbox and internal event log.
7. Add KMS-backed provider token custody and rotation proof.
8. Add distributed rate limits, strict CSRF, proxy-aware IP handling, production cookie/CORS smoke, and RLS or equivalent tenant isolation proof.
9. Add observability: structured logs, metrics, traces, health checks, alerts, and runbooks.
10. Add backup/restore drills, migration rollback process, and disaster recovery smoke.
11. Add accessibility, responsive, and browser regression tests for the final route map.
12. Add live smokes for Microsoft, OIDC, Stripe, object storage, notifications, PDF runtime, and approved provider actions.

Acceptance commands:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- Security and authorization focused tests.
- Production-like Compose smoke.
- External live smokes only against approved disposable targets.

## Ordered Vertical Slices

1. Product documentation and umbrella gap registration.
2. API v1 foundation: request ID, error shape, OpenAPI, pagination, idempotency, operations.
3. Partner relationship lifecycle and customer acceptance.
4. Support sessions and customer-visible support audit.
5. Unified setup and business context: services, people, systems, suppliers.
6. Route migration to `/app/setup`, `/app/o`, `/app/partner`, and `/app/admin`.
7. Country-pack contract and four-locale infrastructure.
8. Microsoft 365 live read proof, sync cursors, capabilities, and disconnect.
9. Product assets and findings.
10. Tasks, remediation plans, and zero-blast actions.
11. Incident aggregate and reporting clock.
12. Risk register, supplier reviews, policies, governance calendar, and attestations.
13. Active Romania/Poland/Germany preparation with legal review gates.
14. Immutable reports, report templates, and localized PDF exports.
15. Audit WORM/export, retention, file objects, and evidence deletion gates.
16. Safe Microsoft write waves after disposable-target proof.
17. Production operations hardening and external smoke suite.

## Non-Negotiable Guardrails

- Do not activate legal country content without review metadata.
- Do not automate provider writes until action safety gates and live disposable-target proof exist.
- Do not broaden Microsoft permissions by default.
- Do not collapse partner access and support impersonation into one workflow.
- Do not treat provider findings as human workflow state.
- Do not generate compliance, incident, or audit reports from mutable live state without snapshots.
- Do not run live external smokes against customer tenants or customer billing accounts.
- Do not claim certification or legal advice.
