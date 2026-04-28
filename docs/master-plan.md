# PureSOC Master Plan

Status: planning baseline for Codex-first implementation.  
Source inputs: `docs/puresoc_vision.md` and `docs/nis2ro-tool-v-2-1.xlsx`.  
Date: 2026-04-28.

## 1. Executive Direction

PureSOC should be built as a compliance operating system for EU SMBs and mid-market organizations that need NIS2 readiness, evidence, Microsoft 365 security posture visibility, and safe remediation workflows.

The core product is not "a Microsoft security checker". It is a provider-neutral NIS2 readiness platform with:

- EU baseline regulatory model.
- Country-pack architecture for national overlays.
- Microsoft 365 as the first cloud provider connector.
- Romania as the first complete country pack.
- Evidence, audit, workflow, reporting, and billing foundations from the start.

The Codex strategy is to make the repository self-driving: every phase gets precise prompts, tests, acceptance gates, and gap updates so future work can proceed quickly without re-litigating the architecture.

## 2. Product Thesis

NIS2 creates recurring operational work, not a one-time questionnaire. The business opportunity is to own the recurring readiness loop:

1. Classify scope and national obligations.
2. Connect cloud provider telemetry.
3. Map findings to controls and legal references.
4. Generate a prioritized readiness plan.
5. Produce evidence packages.
6. Track recurring tasks and incident workflows.
7. Support safe, approved remediation.

V1 should sell a credible internal readiness product, not legal certification. Every report must preserve the legal caveat from the source vision.

## 3. Target Customer and Commercial Opportunities

Primary ICP:

- Romanian and EU SMBs likely to fall under NIS2 as essential or important entities.
- MSPs and vCISOs managing Microsoft 365 tenants for NIS2-affected clients.
- Regulated subsidiaries with limited internal security capacity.
- EU-facing SaaS or digital providers that need repeatable evidence.

Commercial wedges:

- Romania NIS2 onboarding and notification package draft.
- Microsoft 365 NIS2 posture assessment.
- Evidence vault and auditor package export.
- MSP dashboard and multi-client readiness reporting.
- In-a-box deployment for customers that reject SaaS due to sensitivity.
- Country-pack expansion as paid modules or partner-led add-ons.
- Remediation advisory workflows that can later become managed service revenue.

Pricing model hypothesis:

- Free or low-cost preliminary classification.
- Paid readiness workspace per organization.
- Provider connector and evidence vault in paid tier.
- MSP tier based on managed organizations.
- Advanced report exports, recurring checklists, and remediation workflows in Pro tier.
- In-a-box deployment as annual enterprise license plus support.

## 4. Architecture Principles

Non-negotiables:

- Monorepo, TypeScript-first.
- Docker images for every application role, described through Compose YAML as a service catalog.
- Provider-neutral compliance engine.
- Country-pack-driven regulatory differences.
- Regulatory sources versioned and traceable.
- Read-only provider scanning by default.
- Explicit approval for every write action.
- Evidence, audit, and source mapping treated as core data.
- PostgreSQL schema and connector data contracts must be designed before feature UI.

Anti-patterns to prevent:

- Microsoft-specific checks inside generic NIS2 logic.
- Romania-specific form logic inside EU baseline modules.
- Workbook formulas copied directly into React components.
- Regulatory facts hardcoded without source references.
- Remediation without preflight, approval, snapshot, verification, and evidence.
- "Certified compliant" or similar legal overclaiming.

## 5. Recommended Software Stack

Use the stack already selected in the vision document:

- Frontend: Next.js, React, TypeScript.
- API: NestJS, TypeScript.
- Worker: Node.js, BullMQ.
- Scheduler: Node.js service using shared job contracts.
- Database: PostgreSQL with Prisma.
- Queue/cache: Redis.
- Object storage: S3-compatible object storage abstraction; the service catalog may provide a MinIO-compatible default image.
- Auth: local auth plus OIDC abstraction; Keycloak optional as broker.
- Billing: billing provider abstraction with Stripe first.
- Reporting: HTML-to-PDF renderer using Playwright or a dedicated report renderer service.
- Observability: application instrumentation and optional service images where useful; operational observability infrastructure is outside this product plan.
- Deployment artifact: Docker Compose YAML files that define build images, service roles, environment variables, and default configuration. Dev, staging, production, host hardening, supply-chain controls, and operational infrastructure are handled outside this repository's product plan.

Package manager decision: use `pnpm` unless implementation discovery finds a stronger repo-local reason.

## 6. System Boundaries

Repository layout convention:

- The shared AI project template keeps application code under `code/`.
- Paths in this section are app-relative unless they explicitly start with `docs/` or another root-level path.
- For example, `apps/api` means `code/apps/api`.

Apps:

- `apps/web`: user portal, onboarding, dashboards, workflows, reports.
- `apps/api`: auth, orgs, compliance APIs, provider APIs, billing APIs.
- `apps/worker`: long-running scans, imports, exports, billing sync, evidence jobs.
- `apps/scheduler`: recurring jobs and deadlines.
- `apps/regulatory-importer`: one-shot/import jobs for EU and country packs.
- `apps/report-renderer`: PDF/report rendering.
- `apps/connector-runner`: optional isolated runtime for connector sync jobs and mock-provider scenarios.

Packages:

- `packages/database`: Prisma schema, migrations, seed loading, query helpers, and database contract tests.
- `packages/auth/*`: local credentials, OIDC, session, MFA.
- `packages/providers/core`: provider interfaces and neutral domain objects.
- `packages/providers/microsoft365`: Microsoft Graph, Intune, Defender XDR.
- `packages/providers/google-workspace`: stub only for V1.
- `packages/compliance/core`: controls, gaps, assessments, plans.
- `packages/compliance/nis2/eu`: EU baseline.
- `packages/compliance/nis2/country-packs/core`: country-pack contracts.
- `packages/compliance/nis2/country-packs/ro`: Romania.
- `packages/billing/*`: provider abstraction and Stripe.
- `packages/evidence`: evidence artifacts and access controls.
- `packages/audit`: audit writer and redaction utilities.
- `packages/regulatory-sources`: sources, snapshots, review tasks.
- `packages/recommendations`: recommendation model, prioritization, action metadata, and triggerable task generation.
- `packages/reports`: report data contracts, export shapes, and legal caveat enforcement.
- `packages/dashboards`: dashboard aggregation queries and stored snapshot contracts.
- `packages/config`: typed configuration schema and defaults shared by all images.

## 7. Data Architecture

Use a tenant-aware relational model. Every tenant-scoped row should carry `organization_id` unless it is global regulatory seed data.

PostgreSQL is the application source of truth. Object storage holds large binary artifacts such as workbook uploads, provider snapshots, evidence files, generated reports, and export packages. The database stores metadata, hashes, links, provenance, normalized facts, findings, recommendations, control results, and dashboard aggregates.

### 7.1 Schema groups

Identity and organization:

```txt
users
identity_accounts
local_credentials
sessions
mfa_factors
organizations
organization_members
roles
role_bindings
audit_logs
```

Customer and business metadata:

```txt
customer_profiles
business_profiles
business_locations
business_contacts
business_services
business_service_countries
business_nace_codes
business_size_assessments
jurisdiction_assessments
customer_documents
```

Connector configuration and telemetry:

```txt
provider_connections
provider_credentials
provider_permission_bundles
provider_capabilities
provider_sync_runs
provider_sync_modules
provider_raw_resources
provider_normalized_resources
provider_findings
provider_recommendations
provider_action_templates
provider_action_runs
```

Regulatory and country-pack data:

```txt
regulatory_frameworks
regulatory_framework_versions
regulatory_sources
regulatory_source_versions
regulatory_source_snapshots
regulatory_review_tasks
jurisdictions
country_packs
country_pack_versions
regulatory_questions
regulatory_options
regulatory_answers
regulatory_source_maps
```

Compliance analysis:

```txt
control_catalog
control_versions
control_legal_references
control_provider_mappings
control_evidence_requirements
compliance_assessments
compliance_control_results
compliance_gaps
readiness_plans
readiness_plan_items
risk_acceptances
checklist_templates
checklist_template_items
checklist_runs
checklist_run_items
```

Evidence, reports, dashboards, and exports:

```txt
evidence_artifacts
evidence_links
evidence_access_logs
generated_reports
report_exports
dashboard_snapshots
dashboard_widgets
notification_drafts
```

Billing:

```txt
billing_customers
billing_subscriptions
billing_entitlements
billing_events
```

### 7.2 Connector-to-output data flow

The product's main analytical spine is:

```txt
customer profile and jurisdiction answers
+ regulatory source data
+ provider raw telemetry
-> normalized resources
-> provider findings
-> control results
-> gaps
-> recommendations
-> readiness plan items
-> evidence requirements
-> reports, dashboards, checklists, and triggerable actions
```

Connector data must always pass through the same conversion stages:

1. `provider_raw_resources`: immutable-ish provider payload records with source module, external ID, raw JSON, sync run, and timestamps.
2. `provider_normalized_resources`: stable PureSOC resource model used by compliance logic.
3. `provider_findings`: provider-neutral finding records derived from normalized resources.
4. `compliance_control_results`: control-level evaluation records that combine business answers, country-pack rules, provider findings, manual checklist state, and evidence.
5. `compliance_gaps`: missing, failing, unsupported, stale, or incomplete requirements.
6. `provider_recommendations` and `readiness_plan_items`: actionable or triggerable recommendations with permissions, license needs, evidence needs, and action mode.
7. `generated_reports`, `dashboard_snapshots`, and `notification_drafts`: user-facing outputs built from stored analysis, not one-off API calls.

### 7.3 Provider resource contract

Every provider resource row must include:

```txt
id
organization_id
provider_connection_id
provider_key
external_id
external_resource_type
source_module
sync_run_id
raw_json
normalized_json
content_hash
first_seen_at
last_seen_at
deleted_at
```

Idempotency key:

```txt
organization_id + provider_connection_id + provider_key + external_resource_type + external_id
```

### 7.4 Recommendation contract

Recommendations must be structured enough to feed dashboards, checklists, reports, and future approved actions:

```txt
id
organization_id
source_finding_id
control_id
jurisdiction
title
summary
severity
confidence
recommendation_type
automation_mode        // manual, guided, preflightable, executable_later
required_permissions
required_license
expected_change
blast_radius
manual_fallback
evidence_required
status
created_at
updated_at
```

Isolation approach:

- V1: strict organization scoping in service layer and tests.
- V1 hardening: consider PostgreSQL RLS for high-risk tables after API boundaries settle.
- SaaS enterprise option: separate database or schema per high-sensitivity tenant later.

## 8. Docker Image And Service Catalog

This repository only needs to describe the application images, default service configuration, environment variable shape, and service dependencies. Dev, staging, production, host security, supply chain, secret custody, backup/restore execution, and infrastructure pipelines are managed outside this plan.

Compose files should be organized by product role:

```txt
infra/compose/docker-compose.yml              // shared service catalog
infra/compose/docker-compose.data.yml         // postgres, redis
infra/compose/docker-compose.storage.yml      // object storage adapter default
infra/compose/docker-compose.webservices.yml  // web, api
infra/compose/docker-compose.jobs.yml         // worker, scheduler
infra/compose/docker-compose.connectors.yml   // connector runner and mock providers
infra/compose/docker-compose.reports.yml      // report renderer
infra/compose/docker-compose.config.yml       // config/bootstrap/import jobs
```

Required images:

```txt
puresoc-web
puresoc-api
puresoc-worker
puresoc-scheduler
puresoc-connector-runner
puresoc-regulatory-importer
puresoc-report-renderer
puresoc-postgres
puresoc-redis
puresoc-object-storage
```

Optional supporting images:

```txt
puresoc-auth-broker
puresoc-mailer
puresoc-upload-scanner
puresoc-mock-microsoft365
```

Configuration should live in:

```txt
code/.env.example
code/config/defaults/app.json
code/config/defaults/auth.json
code/config/defaults/connectors.json
code/config/defaults/compliance.json
code/config/defaults/reports.json
code/config/defaults/billing.json
```

Compose acceptance is limited to proving that image definitions, service names, environment variables, default config, and dependency wiring are coherent:

```txt
cd code
docker compose -f infra/compose/docker-compose.yml config
```

## 9. Connector Architecture

The compliance engine only calls provider-neutral contracts.

Provider lifecycle:

1. Begin connection.
2. Complete connection.
3. Detect tenant profile and capabilities.
4. Sync inventory and security signals.
5. Normalize provider data.
6. Evaluate provider findings.
7. Generate recommendations.
8. Validate, approve, apply, verify, and collect evidence for write actions.

Microsoft 365 V1 modules:

- Tenant profile and domains.
- Licensing and service plans.
- Users, groups, roles, guests.
- Conditional Access and identity posture.
- Enterprise apps, app registrations, credentials.
- Secure Score.
- Audit/sign-in logs where licensed and permitted.
- Exchange, SharePoint, Teams posture where Graph supports it, otherwise mark source limitations.
- Intune read module.
- Defender XDR read module.

Provider failure rule:

- One failed module must not fail the full sync. Store module-level status and missing permission/license reasons.

Connector invariants:

- Store credentials separately from connector metadata.
- Store every sync attempt in `provider_sync_runs`.
- Store per-module status in `provider_sync_modules`.
- Store raw provider payloads before normalization.
- Normalize into provider-neutral resource types before compliance evaluation.
- Use idempotent upserts by provider connection, resource type, and external ID.
- Record missing permission, missing license, unsupported API, rate limit, and revoked consent as data.
- Add tests for pagination, retry/throttling, redaction, idempotency, partial failure, and no accidental live writes.

## 10. Regulatory Architecture

Regulatory data must be data-driven and source-linked.

EU baseline:

- Member states.
- NIS2 framework version.
- Article 21 baseline controls.
- Article 23 incident workflow baseline.
- Implementing Regulation 2024/2690 overlay for relevant digital entities.

Country-pack model:

- Completeness state.
- Source freshness.
- Registration rules.
- Classification rules.
- Incident reporting overrides.
- Competent authorities.
- Local questions and evidence requirements.
- Unsupported or missing-data flags.

Romania V1:

- Seed from `docs/nis2ro-tool-v-2-1.xlsx`.
- Store workbook source map from sheet/cell to imported field/rule/option.
- Convert `Algoritm clasificare` into a tested classification service.
- Generate internal report, notification draft JSON, and PDF.
- No automatic DNSC submission in V1.

Regulatory source activation lifecycle:

1. Import source into draft seed/source-map records.
2. Validate source completeness and deterministic generation.
3. Create `regulatory_review_tasks` for changed or newly imported legal logic.
4. Activate a reviewed `country_pack_version` or `control_version`.
5. Keep older versions immutable and available for historic assessments.
6. Never auto-activate changed national logic from a source monitor or workbook import.

Workbook scan notes:

- Detected sheets: Introduction, User instructions, Entity data, Entity assessment, Notification form, Liste, Ajutor, Algoritm clasificare.
- `Entity data` includes source version `V2.1 ENG_45915`.
- `Entity assessment` includes source version `V2.0_45898`.
- The workbook contains Romanian classification and notification logic that should become versioned seed data and tested services.

## 11. Security Model

Security is a product feature, not only infrastructure hygiene.

Required from early implementation:

- Argon2id for local password hashing.
- Email verification and reset token expiry.
- Rate limiting for auth endpoints.
- MFA-ready identity model.
- Encrypted provider credentials.
- No secrets in logs or error payloads.
- Audit log for auth, org, provider, remediation, evidence, billing, and regulatory events.
- Evidence object access logs.
- Provider write actions disabled by default.
- Explicit action approval and verification.

Threat model checkpoints:

- Auth/session theft.
- Cross-organization data access.
- OAuth consent abuse.
- Provider token leakage.
- Evidence exfiltration.
- Malicious uploads.
- Regulatory source tampering.
- Billing webhook spoofing.
- Remediation action blast radius.

## 12. UX and UI Direction

The UI should feel like an operational compliance console, not a marketing site.

Primary workflows:

- Register, verify, create organization.
- Complete EU baseline onboarding.
- Complete Romania onboarding.
- Connect Microsoft 365 using permission bundles.
- Review posture, gaps, recommendations, evidence, and reports.
- Maintain recurring checklist tasks.
- Export evidence package and notification draft.

Design principles:

- Dense but calm dashboards.
- Explicit source and confidence indicators.
- Warnings for incomplete country-pack data.
- Clear distinction between legal/regulatory source, user answer, provider finding, and recommendation.
- No scary global "compliance percent" unless its meaning is defined.
- Every risky remediation action must show expected change, blast radius, rollback/manual fallback, and required approval.

## 13. Codex-First Execution Model

Every implementation slice should use this loop:

1. Read relevant docs and current code.
2. State file ownership and intended edits.
3. Implement the smallest coherent slice.
4. Add unit tests first for pure domain logic.
5. Add integration tests for API/database boundaries.
6. Add E2E tests only for user-critical flows.
7. Run accepted commands.
8. Update gap register when decisions or blockers appear.
9. Summarize changed files, tests, and residual risk.

Prompt standards are in `docs/codex-prompts.md`.

Prompt QA is in `docs/prompt-tests.md`.

## 14. Implementation Roadmap

Phase A: Repository, package layout, and service image catalog.

- Create monorepo skeleton.
- Add pnpm workspace, TypeScript base config, linting, formatting, test runner.
- Add Docker Compose service catalog split by data, webservices, jobs, connectors, storage, reports, and config.
- Add health endpoints and CI command.
- Add ADR template and gap register maintenance rule.

Phase B: Database schema and core data contracts.

- Create Prisma schema baseline.
- Add schema groups for identity, customers, connectors, regulatory, compliance, evidence, reports, dashboards, and billing.
- Add seed contracts for EU member states and country-pack status.
- Add database contract tests for organization scoping and provider-resource idempotency.

Phase C: Identity, organizations, and audit.

- Implement local auth.
- Implement organizations and memberships.
- Implement RBAC.
- Implement audit writer.
- Add cross-organization isolation tests.

Phase D: Regulatory foundation.

- Seed EU member states and NIS2 baseline shell.
- Define country-pack interfaces.
- Add country-pack status API.
- Mark Romania as planned full pack and others baseline-only.
- Add regulatory source activation lifecycle skeleton.

Phase E: Romania importer and classifier.

- Parse workbook into seed JSON.
- Persist source map.
- Implement classification service.
- Add classification scenario tests.
- Add onboarding form schema and notification draft data model.

Phase F: Provider abstraction and mock provider.

- Implement provider core interfaces.
- Add provider connection tables, sync runs, module status, raw resources, normalized resources, findings, and recommendations.
- Add Microsoft provider skeleton.
- Add mock Microsoft provider scenarios.
- Verify generic compliance logic has no Microsoft-specific branching.

Phase G: Microsoft 365 onboarding and read-only sync.

- Implement consent flow.
- Store tenant profile and permission bundles.
- Sync licenses, users, roles, apps, secure score, selected logs.
- Add graceful permission/license degradation.

Phase H: Compliance engine and recommendation model.

- Seed control catalog.
- Map provider findings and manual checklist items to controls.
- Calculate gaps and readiness plan.
- Generate structured recommendations.
- Generate recurring tasks.

Phase I: Evidence, reports, dashboards, and billing.

- Evidence vault.
- Report renderer.
- Romania notification draft export.
- Dashboard aggregation and stored dashboard snapshots.
- Stripe billing abstraction and webhook handling.
- Entitlement gates.

Phase J: Safe remediation.

- Recommendation engine.
- Preflight, approval, execution queue, verification, evidence.
- Start with manual/guided actions before write automation.

Phase K: Release readiness.

- Threat model.
- Rate limits.
- Regulatory update runbook.
- Final prompt/test/gap audit.

## 15. Acceptance Gates

Phase A service-catalog gate:

```txt
cd code
pnpm lint
pnpm test
docker compose -f infra/compose/docker-compose.yml config
```

Must prove:

- Health endpoint works.
- Package imports resolve.
- Config defaults load with environment overrides.
- Compose service names, image builds, default environment variables, and dependencies are coherent.
- Required service roles exist: web, api, worker, scheduler, connector-runner, regulatory-importer, report-renderer, postgres, redis, object storage.

Schema and data-contract gate:

```txt
pnpm test -- --runInBand database schema provider-resource country-pack
```

Must prove:

- Prisma schema contains the required schema groups.
- Organization-scoped tables include `organization_id`.
- Provider resources have raw and normalized storage paths.
- Provider resource upserts are idempotent.
- Recommendation records can feed plans, dashboards, and reports.
- EU member state seed loads.
- Country-pack status returns all 27 EU member states.

Auth and organization gate:

```txt
pnpm test -- --runInBand auth organization rbac audit session
```

Must prove:

- Local registration/login works.
- Organization creation works.
- Session creation and logout invalidation work.
- RBAC rejects unauthorized access.
- Audit log records key auth and organization events.
- Cross-organization access is rejected.

Romania gate:

```txt
pnpm test -- --runInBand ro
pnpm test -- --runInBand regulatory-import
```

Must prove:

- Workbook fields import into seed data.
- Source map exists.
- Classification scenarios pass.
- Partial onboarding saves.
- Notification draft exports JSON.

Provider gate:

```txt
pnpm test -- --runInBand provider
pnpm test -- --runInBand microsoft365
```

Must prove:

- Generic compliance code uses provider-neutral contracts.
- Mock provider scenarios generate expected findings.
- Missing Microsoft permissions/licenses degrade module status, not whole sync.
- Provider data flows raw resource -> normalized resource -> finding -> control result -> recommendation.
- Pagination, retry/throttling, token redaction, and partial failure are covered by fixtures.

Output gate:

```txt
pnpm test -- --runInBand recommendations reports dashboards evidence
```

Must prove:

- Gaps generate structured recommendations.
- Reports include legal caveat and source references.
- Dashboard aggregates are derived from stored analysis records.
- Evidence links can be traced back to controls, jurisdictions, and source records.

Security gate:

```txt
pnpm test -- --runInBand auth audit encryption rbac
```

Must prove:

- Passwords and tokens are never logged.
- Provider credentials are encrypted at rest.
- Cross-organization access is rejected.
- Auth failures are rate-limited and audited.

## 16. Key Architecture Decisions to Record

Create ADRs when implementation starts:

- ADR-001 monorepo and package manager.
- ADR-002 Docker image and Compose service catalog.
- ADR-003 multitenancy and RLS posture.
- ADR-004 application database schema and tenant-scoped data model.
- ADR-005 regulatory seed/source-map format.
- ADR-006 provider interface and resource lifecycle versioning.
- ADR-007 report renderer strategy.
- ADR-008 evidence storage metadata and export model.
- ADR-009 Microsoft Graph permission bundles.
- ADR-010 remediation safety model.
- ADR-011 regulatory source activation lifecycle.
- ADR-012 dashboard aggregation and report data contracts.
- ADR-013 auth, OIDC/social login, and managed-provider consent boundaries.

## 17. Immediate Next Step

After skill approval, start with a Phase A implementation prompt from `docs/codex-prompts.md`:

- Bootstrap monorepo.
- Add Docker Compose service catalog.
- Add health endpoints.

Then immediately run the database/data-contract prompt:

- Add Prisma schema skeleton.
- Add EU member state seed and country-pack status endpoint.
- Add provider raw/normalized resource contracts.
- Add recommendation and output contracts.

Do not start Microsoft remediation until provider abstraction, audit, approval, and regulatory scaffolding exist.
