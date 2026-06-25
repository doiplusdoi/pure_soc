# PureSOC Product Gap Analysis

Source baseline:

- Canonical product vision: `/Users/solo/Downloads/puresoc_product_vision.md`
- Repository blueprint: `docs/puresoc_vision.md`
- Delivery plan: `docs/master-plan.md`
- Gap register: `docs/implementation-gaps.md`
- Prompt queue: `docs/codex-prompts.md`
- Durable repo learnings: `docs/LEARNINGS.md`

This analysis treats the product vision as the target constitution and the current repository as the implementation baseline. The current codebase has a useful NIS2/Microsoft 365 local product foundation, but it is not yet the full production platform described in the constitution.

## Status Definitions

- **Absent**: no meaningful product implementation exists.
- **Scaffold only**: schema, route, or placeholder exists but no complete workflow.
- **Mocked**: behavior works through fixtures or fake execution only.
- **Partially real**: real persistence or integration exists, but is incomplete, disabled, or not production proven.
- **Functional but unsafe**: workflow exists but lacks required safety, policy, legal, or operational gates.
- **Production-ready**: implemented, tested, tenant-safe, observable, documented, and externally proven.
- **Needs migration**: implemented against an older product shape and must be adapted without breaking current tests.

## Executive Summary

The repository is strongest in local Docker-oriented development, provider-neutral compliance primitives, Romania NIS2 source mapping, Microsoft 365 read-only connector foundations, evidence/reporting/audit scaffolds, and a lightweight product shell.

The product constitution expands the scope materially. Launch now requires partner/customer relationship lifecycle, support impersonation, full onboarding across business services and suppliers, active Romania/Poland/Germany country packs, four locales, product-level assets/findings/incidents/risks/policies, API v1/OpenAPI, safe Microsoft write actions, immutable report snapshots, notification operations, backups, observability, tenant isolation hardening, and external live proofs.

No current surface should be treated as production-ready until tenant-isolation, legal/product approvals, live integration smokes, retention policy, backup/restore, observability, and security gates are complete.

## Capability Matrix

| Product area | Current implementation | Status | Main gap |
| --- | --- | --- | --- |
| Organization tenancy | `Organization`, members, invitations, roles, sessions, org-scoped services | Partially real | Needs stricter authorization layers, RLS or equivalent isolation tests, permission grants, recent reauth, and object-level restrictions. |
| Partner/customer model | `Partner`, `PartnerMember`, `PartnerTenantGrant`, `TenantAccessSession`, portfolio routes | Partially real / needs migration | Missing customer acceptance lifecycle, explicit relationship states, partner assignments, delegated scopes, termination workflow, and support-session separation. |
| Support impersonation | Tenant access sessions with reason exist | Scaffold only | Needs exceptional support session model with expiry, approval or policy gates, customer visibility, audit, and hard separation from normal partner access. |
| User authentication | Local auth plus OIDC/social login infrastructure | Partially real | Live OIDC registration/callback proof, production cookie/CORS smoke, MFA/recent-auth policy, and recovery hardening remain open. |
| Onboarding | Generic NIS2 onboarding, business profile fragments, product facade routes | Partially real | Needs unified setup flow for organization, jurisdiction, people, systems, suppliers, Microsoft 365, review/launch, autosave, and resumability. |
| Business services/assets | Business services and provider normalized resources exist | Scaffold only / needs migration | Needs product asset model, dependencies, owners, criticality, supplier links, and source/human merge rules. |
| Suppliers | Limited questionnaire/source support | Absent / scaffold only | Needs supplier records, contracts, risk, review cadence, evidence, and NIS2 supplier obligations. |
| Country packs | EU structure, Romania detailed importer, Poland/Germany demo packs | Partially real | Romania legal activation pending; Poland/Germany need real source ingestion/review; all three need active status, review metadata, localized terms, registration/incident rules, and impact analysis. |
| Localization | Shared locale support for `en` and `ro` | Partially real | Product target requires `en`, `ro`, `pl`, and `de`, including UI, reports, country terminology, notifications, and fallback rules. |
| NIS2 classification | Generic and Romania-specific classifiers | Partially real | Needs normalized constitution outcomes, legal review gates, override workflow, jurisdiction-specific disclaimers, and history preservation. |
| Controls/readiness | Control catalog, control results, readiness runs, gaps, recommendations | Partially real | Needs calibrated control model, product/legal scoring decisions, control assessment lifecycle, evidence requirements, exceptions, and management accountability. |
| Risk register | Risk acceptance exists | Scaffold only | Needs first-class risk aggregate, scoring, treatment plan, ownership, review cadence, supplier/service links, and report output. |
| Policies/governance | Control and evidence metadata exist | Absent / scaffold only | Needs policy lifecycle, governance calendar, attestations, training records, approvals, and management review. |
| Microsoft 365 consent | Admin consent URL, callback state, encrypted credentials, read-only permission enforcement | Partially real | Needs live external proof, revocation handling, capability UX, scheduled refresh, expired consent handling, and customer-facing consent diagnostics. |
| Microsoft 365 read sync | Tenant, license, users/groups/roles, MFA, apps, CA, logs, Secure Score, Intune, Defender XDR modules | Partially real | Needs service health, risky users, current `alerts_v2` proof, sync cursors/delta strategy, scheduled jobs, stale-state handling, and production rate-limit monitoring. |
| Microsoft 365 write actions | Action lifecycle and disabled Microsoft executor | Mocked / functional but disabled | Needs zero-blast write wave, capability bundles, approval policies, preflight/diff, idempotency, verification, rollback metadata, and live disposable-target proof. |
| Findings | Provider findings, recommendations, gaps | Partially real | Needs product-level finding lifecycle, severity/priority model, ownership, SLA, suppression, acceptance, service/asset mapping, and audit. |
| Remediation work | Action templates/runs, fake/mock execution, preflight and approvals | Partially real | Needs task/planning layer, safe real provider execution, policy engine, async operation status, retry semantics, and UI for approvals. |
| Incidents | Defender data can become findings; notification/deadline primitives exist | Absent / scaffold only | Needs incident aggregate, source links, significance workflow, reporting clock, timeline, post-incident review, and incident package reports. |
| Evidence vault | Evidence records, metadata, access logs, bundles, local object storage, scanning hooks | Partially real | Needs runtime smoke, retention/deletion policy, WORM or external signing, confidentiality workflow, evidence request tracking, and production object-store proof. |
| Reports/PDF | Generated reports, PDF/CSV/bundle support, local renderer, v1 immutable JSON/PDF snapshot artifacts | Partially real | Needs browser-grade four-locale rendering, object-storage-backed artifacts, runtime browser proof, scheduled exports, and WORM/signing where required. |
| Notifications | Channels, logs, deadline alerts, draft messages | Partially real | Needs in-app notification center, delivery operations, retry/backoff, suppression, digest rules, and live email/Teams proof. |
| Billing | Stripe abstraction, webhooks, entitlements | Partially real | Needs pricing/product approval, live reconciliation, customer portal proof, tax/invoice operations, and entitlement UX. |
| API | Product facade under `/api/*`, internal service routes, first `/api/v1` compatibility layer with OpenAPI metadata | Partially real / needs migration | Needs generated schema validation, older route migration, final resource schemas, and broader tenant-isolation proof before deprecating compatibility facades. |
| Web app routes | Node/http product shell with dashboard, onboarding, gaps, M365, remediation, evidence, reports, settings, partner customers | Needs migration | Needs `/app/setup`, `/app/partner/:partnerId`, `/app/o/:organizationId`, `/app/admin`, customer context, role-aware navigation, accessibility, and responsive QA. |
| Jobs | Custom Redis job adapter, scheduler, sync/action/report workers | Partially real | Needs production queue operations, dead-letter handling, retry visibility, job status APIs, worker concurrency controls, and outbox coordination. |
| Audit | Audit logs, chain/checkpoint concepts | Partially real | Needs WORM/export/signing, retention policy, customer-visible support audit, and external proof. |
| Security operations | Rate limits, CSRF/session defenses, threat-model docs, redaction | Partially real | Needs distributed rate limiting, proxy-aware IP, strict CSRF, KMS custody, token rotation proof, RLS/tenant tests, backups/restore, and observability. |
| Production operations | Compose dev stack and smoke scripts | Scaffold only / partially real | Needs deployment profile, health checks, metrics, logs, alerts, backup/restore drills, migration rollback, and external live smoke targets. |

## Critical Launch Blockers

1. Legal/product activation is unresolved for Romania and not started for Poland/Germany. Country packs must remain review-gated until approved.
2. Microsoft write actions are intentionally disabled. Real provider execution requires safety gates and disposable-target proof before any customer use.
3. Partner/customer access is not yet the constitution lifecycle. Customer acceptance, assignment, support session, termination, and customer-visible audit are launch-blocking.
4. Product domain breadth is incomplete. Risks, suppliers, policies, governance calendar, incidents, product assets, and task lifecycle are not fully modeled.
5. API and route shapes need migration. Current `/api/*` and web shell are useful but not the final `/api/v1` and `/app/*` contract.
6. Four-locale launch is not supported. `pl` and `de` require shared infrastructure plus reviewed content.
7. External live proof is missing for Microsoft, OIDC, Stripe, object storage, notifications, PDF runtime, backups, and provider writes.
8. Operational controls are incomplete: RLS or equivalent tenant isolation proof, outbox, WORM audit, KMS rotation, rate limits, observability, backups, and restore drills.

## Implementation Posture

The right path is migration by vertical slice, not a rewrite. Keep current tested foundations, add versioned product contracts beside them, migrate routes and APIs through compatibility aliases, and turn demo/scaffold behavior into explicit review-gated states. Every slice should end with runnable tests and an update to `docs/implementation-gaps.md` when a blocker or assumption remains.
