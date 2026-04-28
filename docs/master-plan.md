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
- Docker-first local, SaaS, and in-a-box deployment.
- Provider-neutral compliance engine.
- Country-pack-driven regulatory differences.
- Regulatory sources versioned and traceable.
- Read-only provider scanning by default.
- Explicit approval for every write action.
- Evidence, audit, and source mapping treated as core data.

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
- Object storage: MinIO locally, S3 or Azure Blob in managed deployments.
- Auth: local auth plus OIDC abstraction; Keycloak optional as broker.
- Billing: billing provider abstraction with Stripe first.
- Reporting: HTML-to-PDF renderer using Playwright or a dedicated report renderer service.
- Observability: OpenTelemetry, Prometheus, Grafana, Loki.
- Deployment: Docker Compose first, later Kubernetes or managed container platform.

Package manager decision: use `pnpm` unless implementation discovery finds a stronger repo-local reason.

## 6. System Boundaries

Apps:

- `apps/web`: user portal, onboarding, dashboards, workflows, reports.
- `apps/api`: auth, orgs, compliance APIs, provider APIs, billing APIs.
- `apps/worker`: long-running scans, imports, exports, billing sync, evidence jobs.
- `apps/scheduler`: recurring jobs and deadlines.
- `apps/regulatory-importer`: one-shot/import jobs for EU and country packs.
- `apps/report-renderer`: PDF/report rendering.

Packages:

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

## 7. Data Architecture

Use a tenant-aware relational model. Every tenant-scoped row should carry `organization_id` unless it is global regulatory seed data.

Recommended first-schema groups:

- Identity and organization.
- Provider connections and normalized provider resources.
- Regulatory frameworks, jurisdictions, country packs, sources.
- NIS2 questions, answers, options, classification runs.
- Controls, mappings, findings, gaps, plans.
- Evidence artifacts and access logs.
- Billing customers, subscriptions, entitlements.
- Audit logs.

Isolation approach:

- V1: strict organization scoping in service layer and tests.
- V1 hardening: consider PostgreSQL RLS for high-risk tables after API boundaries settle.
- SaaS enterprise option: separate database or schema per high-sensitivity tenant later.

## 8. Infrastructure Architecture

Local and in-a-box must run from Docker Compose profiles:

- `core`: web, api, worker, scheduler, postgres, redis, minio, traefik.
- `auth-broker`: Keycloak and realm import.
- `observability`: Prometheus, Grafana, Loki.
- `reports`: report renderer.
- `security`: ClamAV or equivalent upload scanning.
- `regulatory`: importer jobs and source monitor.

Managed SaaS targets:

- App containers on a managed container service or Kubernetes.
- Managed PostgreSQL.
- Managed Redis.
- S3 or Azure Blob for object storage.
- Azure Key Vault or another KMS for envelope encryption.
- Centralized logs, metrics, traces, and alerts.

In-a-box targets:

- Docker Compose with MinIO and local master key provided through Docker secret.
- Offline-capable regulatory seed import.
- Backup and restore scripts mandatory before release.

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

Phase A: Repository and developer platform.

- Create monorepo skeleton.
- Add pnpm workspace, TypeScript base config, linting, formatting, test runner.
- Add Docker Compose core profile.
- Add health endpoints and CI command.
- Add ADR template and gap register maintenance rule.

Phase B: Identity, organizations, and audit.

- Implement local auth.
- Implement organizations and memberships.
- Implement RBAC.
- Implement audit writer.
- Add cross-organization isolation tests.

Phase C: Regulatory foundation.

- Seed EU member states and NIS2 baseline shell.
- Define country-pack interfaces.
- Add country-pack status API.
- Mark Romania as planned full pack and others baseline-only.

Phase D: Romania importer and classifier.

- Parse workbook into seed JSON.
- Persist source map.
- Implement classification service.
- Add classification scenario tests.
- Add onboarding form schema and notification draft data model.

Phase E: Provider abstraction and mock provider.

- Implement provider core interfaces.
- Add provider connection tables and module status.
- Add Microsoft provider skeleton.
- Add mock Microsoft provider scenarios.
- Verify generic compliance logic has no Microsoft-specific branching.

Phase F: Microsoft 365 onboarding and read-only sync.

- Implement consent flow.
- Store tenant profile and permission bundles.
- Sync licenses, users, roles, apps, secure score, selected logs.
- Add graceful permission/license degradation.

Phase G: Compliance engine.

- Seed control catalog.
- Map provider findings and manual checklist items to controls.
- Calculate gaps and readiness plan.
- Generate recurring tasks.

Phase H: Evidence, reports, and billing.

- Evidence vault.
- Report renderer.
- Romania notification draft export.
- Stripe billing abstraction and webhook handling.
- Entitlement gates.

Phase I: Safe remediation.

- Recommendation engine.
- Preflight, approval, execution queue, verification, evidence.
- Start with manual/guided actions before write automation.

Phase J: Hardening and release.

- Threat model.
- Observability.
- Backup/restore.
- Rate limits.
- Vulnerability scan.
- In-a-box docs.
- Regulatory update runbook.

## 15. Acceptance Gates

Phase 0/1 gate:

```txt
pnpm lint
pnpm test
docker compose --profile core up --build
```

Must prove:

- Health endpoint works.
- Local registration/login works.
- Organization creation works.
- Audit log records key events.
- EU member state seed loads.
- Country-pack status returns all 27 EU member states.

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
- ADR-002 auth model and Keycloak role.
- ADR-003 multitenancy and RLS posture.
- ADR-004 regulatory seed/source-map format.
- ADR-005 provider interface versioning.
- ADR-006 report renderer strategy.
- ADR-007 evidence storage and encryption.
- ADR-008 SaaS versus in-a-box deployment boundaries.
- ADR-009 Microsoft Graph permission bundles.
- ADR-010 remediation safety model.

## 17. Immediate Next Step

After skill approval, start with a Phase A implementation prompt from `docs/codex-prompts.md`:

- Bootstrap monorepo.
- Add Docker Compose core profile.
- Add health endpoints.
- Add Prisma schema skeleton.
- Add EU member state seed and country-pack status endpoint.

Do not start Microsoft remediation until provider abstraction, audit, approval, and regulatory scaffolding exist.
