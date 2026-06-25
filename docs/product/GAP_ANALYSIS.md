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
| Partner/customer model | `Partner`, `PartnerMember`, `PartnerTenantGrant`, `TenantAccessSession`, v1 relationship/assignment records, portfolio routes | Partially real / needs migration | Local customer acceptance, relationship states, partner assignments, delegated scopes, termination workflow, and app-prefixed partner routes exist; production hardening, explicit relational models, richer UI, and admin operations remain. |
| Support impersonation | V1 `SupportSession` records with expiry, policy basis, audit events, organization-scoped listing, and read-only customer-visible `/app/o/:organizationId/audit` rendering | Partially real | Needs real platform-admin support operation policy, approval/recent-auth gates, break-glass operating procedure, end-to-end customer notification/audit proof, and hard separation from normal partner access in production RBAC. |
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
| Microsoft 365 write actions | Action lifecycle, v1 provider-action preflight/read/approval aliases, zero-blast local task/evidence/report output, and disabled Microsoft executor | Partially real / disabled | Non-executable actions can create local artifacts only; executable provider-write actions still need capability bundles, approval policies, recent-auth policy, async execution, verification, rollback metadata, evidence, audit, and live disposable-target proof before any provider mutation. |
| Findings | Provider findings, recommendations, gaps | Partially real | Needs product-level finding lifecycle, severity/priority model, ownership, SLA, suppression, acceptance, service/asset mapping, and audit. |
| Remediation work | Action templates/runs, fake/mock execution, v1 safe preflight/read/approval aliases, zero-blast local output, blocked provider-write execution, preflight and approvals | Partially real | Needs richer task/planning UI, safe real provider execution, policy engine, async provider execution, retry semantics, verification/evidence UX, and disposable-target proof. |
| Incidents | Defender data can become findings; notification/deadline primitives exist | Absent / scaffold only | Needs incident aggregate, source links, significance workflow, reporting clock, timeline, post-incident review, and incident package reports. |
| Evidence vault | Evidence records, metadata, access logs, bundles, local object storage, scanning hooks | Partially real | Needs runtime smoke, retention/deletion policy, WORM or external signing, confidentiality workflow, evidence request tracking, and production object-store proof. |
| Reports/PDF | Generated reports, PDF/CSV/bundle support, local renderer, v1 immutable JSON/PDF snapshot artifacts | Partially real | Needs browser-grade four-locale rendering, object-storage-backed artifacts, runtime browser proof, scheduled exports, and WORM/signing where required. |
| Notifications | Channels, logs, deadline alerts, draft messages, v1 channel/log aliases, tenant-scoped channel rotation/disable, local operator alerts for exhausted retries, in-app notification-center items/preferences, read/archive/suppression state, org-scoped UI, API/scheduler send suppression/digest deferral, scheduled digest dispatch, and bounded delivery retry/backoff | Partially real | Needs live email/Teams proof and bounce handling. |
| Billing | Stripe abstraction, webhooks, entitlements | Partially real | Needs pricing/product approval, live reconciliation, customer portal proof, tax/invoice operations, and entitlement UX. |
| API | Product facade under `/api/*`, internal service routes, `/api/v1` compatibility layer with OpenAPI metadata, provider-action safety aliases, notification-center resources, and selected existing-service aliases | Partially real / needs migration | Needs generated schema validation, older route migration, final resource schemas, and broader tenant-isolation proof before deprecating compatibility facades. |
| Web app routes | Node/http product shell with dashboard, onboarding, gaps, M365, remediation, evidence, reports, settings, partner customers, `/app/o/:organizationId`, active-org `/app/setup/*`, `/app/partner/:partnerId/*` portfolio rendering plus app-prefixed partner mutation aliases, deterministic served app-route smoke, notifications, support-session audit visibility, and `/app/admin/*` blocked state | Needs migration | Needs platform-admin RBAC before real admin screens, richer customer context, role-aware navigation, accessibility, and cross-browser responsive QA. |
| Jobs | Custom Redis job adapter, scheduler, sync/action/report workers | Partially real | Needs production queue operations, dead-letter handling, retry visibility, job status APIs, worker concurrency controls, and outbox coordination. |
| Audit | Audit logs, chain/checkpoint concepts, v1 audit export/checkpoint route exposure, customer-visible support-session list | Partially real | Needs WORM/export/signing proof, immutable storage handoff, support-operation notification proof, and external proof. |
| Security operations | Rate limits, CSRF/session defenses, threat-model docs, redaction, and local request metrics | Partially real | Needs deployed Redis/proxy smoke, strict CSRF-token workflow if required, KMS custody, token rotation proof, RLS/tenant tests, completed restore drills, and production observability proof. |
| Production operations | Compose dev stack, health checks, smoke scripts, and API `/metrics` counters | Scaffold only / partially real | Needs deployment profile proof, centralized logs, traces, alerts, dashboards, backup/restore drills, migration rollback, and external live smoke targets. |

## Critical Launch Blockers

1. Legal/product activation is unresolved for Romania and not started for Poland/Germany. Country packs must remain review-gated until approved.
2. Microsoft write actions are intentionally disabled. V1 provider-action execute can create zero-blast local artifacts only; real provider execution requires safety gates and disposable-target proof before any customer use.
3. Partner/customer access has local v1 lifecycle coverage, but production launch still needs explicit relational modeling, platform-admin support-operation policy, break-glass approval/recent-auth gates, customer notification/audit proof, and broader tenant-isolation proof.
4. Product domain breadth is incomplete. Risks, suppliers, policies, governance calendar, incidents, product assets, and task lifecycle are not fully modeled.
5. API and route shapes need migration. Current `/api/*` and web shell are useful but not the final `/api/v1` and `/app/*` contract.
6. Four-locale launch is not supported. `pl` and `de` require shared infrastructure plus reviewed content.
7. External live proof is missing for Microsoft, OIDC, Stripe, object storage, notifications, PDF runtime, backups, and provider writes.
8. Operational controls are incomplete: RLS or equivalent tenant isolation proof, outbox, WORM audit, KMS rotation, rate limits, observability, backups, and restore drills.

## Implementation Posture

The right path is migration by vertical slice, not a rewrite. Keep current tested foundations, add versioned product contracts beside them, migrate routes and APIs through compatibility aliases, and turn demo/scaffold behavior into explicit review-gated states. Every slice should end with runnable tests and an update to `docs/implementation-gaps.md` when a blocker or assumption remains.
