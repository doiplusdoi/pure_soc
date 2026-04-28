# Codex Prompts

Use these prompts as implementation tickets. Each implementation prompt must include source documents, expected files or packages, negative constraints, tests, acceptance commands, gap-register updates, and a final summary.

## Required Prompt Template

Each implementation prompt must end with:

```txt
Final response must include:
- Changed files
- Tests run
- Acceptance status
- Gaps updated
- Residual risk
```

Each implementation prompt must also include:

```txt
Read:
- docs/puresoc_vision.md
- docs/master-plan.md
- docs/implementation-gaps.md

Negative constraints:
- Do not put Microsoft-specific logic in generic compliance packages.
- Do not put Romania-specific logic in EU baseline packages.
- Do not hardcode regulatory facts in UI conditionals.
- Do not add provider write/remediation actions unless the prompt explicitly asks for an approved safety-gated path.
- Do not make legal certification claims.

Gap updates:
- Update docs/implementation-gaps.md with blockers, assumptions, deferred decisions, or missing tests.
```

## Prompt 1A: Bootstrap Monorepo And Service Image Catalog

```txt
You are implementing PureSOC Phase A.

Read:
- docs/puresoc_vision.md
- docs/master-plan.md
- docs/implementation-gaps.md
- docs/prompt-tests.md

Goal:
Create the TypeScript monorepo skeleton and Docker Compose service catalog. Compose is only a project-owned image/service manifest; do not design dev/staging/prod infrastructure.

Expected files/packages:
- package.json
- pnpm-workspace.yaml
- tsconfig.base.json
- .env.example
- apps/web
- apps/api
- apps/worker
- apps/scheduler
- apps/connector-runner
- apps/regulatory-importer
- apps/report-renderer
- packages/shared
- packages/config
- packages/database
- packages/audit
- packages/providers/core
- packages/providers/microsoft365
- packages/providers/google-workspace
- packages/providers/mock
- packages/compliance/core
- packages/compliance/nis2/eu
- packages/compliance/nis2/implementing-regulation-2024-2690
- packages/compliance/nis2/country-packs/core
- packages/compliance/nis2/country-packs/ro
- packages/recommendations
- packages/evidence
- packages/reports
- packages/dashboards
- packages/billing/core
- packages/billing/stripe
- infra/docker
- infra/compose/docker-compose.yml
- infra/compose/docker-compose.data.yml
- infra/compose/docker-compose.storage.yml
- infra/compose/docker-compose.webservices.yml
- infra/compose/docker-compose.jobs.yml
- infra/compose/docker-compose.connectors.yml
- infra/compose/docker-compose.reports.yml
- infra/compose/docker-compose.config.yml
- config/defaults/app.json
- config/defaults/auth.json
- config/defaults/connectors.json
- config/defaults/compliance.json
- config/defaults/reports.json
- config/defaults/billing.json

Implement:
- pnpm workspace scripts for lint, test, typecheck
- minimal API health endpoint
- minimal package exports
- Dockerfiles for web, api, worker, scheduler, connector-runner, regulatory-importer, report-renderer
- Compose services for puresoc-web, puresoc-api, puresoc-worker, puresoc-scheduler, puresoc-connector-runner, puresoc-regulatory-importer, puresoc-report-renderer, puresoc-postgres, puresoc-redis, puresoc-object-storage
- typed config loader with defaults and environment override support
- ADR template under docs/adr/

Negative constraints:
- Do not implement real Microsoft Graph calls.
- Do not implement Romania workbook parsing yet.
- Do not add provider write/remediation actions.
- Do not add production infrastructure hardening policy; keep Compose focused on image definitions and default config.

Tests:
- API health endpoint unit or integration test
- config loader test
- package import smoke tests

Acceptance commands:
- pnpm install
- pnpm lint
- pnpm test
- docker compose -f infra/compose/docker-compose.yml config

Gap updates:
- Resolve or update GAP-001 and GAP-002 where applicable.
```

## Prompt 1B: Database Schema And Core Data Contracts

```txt
You are implementing PureSOC Phase B.

Read:
- docs/puresoc_vision.md sections 6, 7, 8, 10, 14, 15, 17, 18, 21, 22, 23
- docs/master-plan.md sections 7, 9, 10, 14, 15
- docs/implementation-gaps.md
- docs/prompt-tests.md

Goal:
Create the application database schema and core data contracts before feature implementation.

Expected files/packages:
- packages/database/prisma/schema.prisma
- packages/database/src/client.ts
- packages/database/src/seed/eu-member-states.ts
- packages/database/src/contracts/*.ts
- packages/database/src/__tests__/*.spec.ts
- packages/providers/core/src/resources.ts
- packages/recommendations/src/recommendation.types.ts
- packages/reports/src/report.types.ts
- packages/dashboards/src/dashboard.types.ts

Implement schema groups:
- identity and organization
- customer/business metadata
- connector configuration and telemetry
- regulatory and country-pack data
- compliance analysis
- evidence, reports, dashboards, and exports
- billing
- audit logs

Implement connector data contracts:
- provider_connections
- provider_sync_runs
- provider_sync_modules
- provider_raw_resources
- provider_normalized_resources
- provider_findings
- provider_recommendations
- provider_action_templates
- provider_action_runs

Implement output contracts:
- compliance_control_results
- compliance_gaps
- readiness_plans
- readiness_plan_items
- evidence_artifacts
- generated_reports
- dashboard_snapshots
- notification_drafts

Negative constraints:
- Do not add provider-specific schema names to generic compliance tables except through provider_key/module_key fields.
- Do not store regulatory facts as UI-only constants.
- Do not store credentials in provider connection metadata.
- Do not skip organization_id on tenant-owned rows unless the row is global seed data.

Tests:
- required schema groups exist
- tenant-owned tables include organization_id
- provider resource idempotency key is represented
- raw and normalized resource models are distinct
- recommendation model can feed plan items, reports, and dashboards
- EU member state seed includes all 27 Member States

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand database schema provider-resource recommendations reports dashboards

Gap updates:
- Update GAP-004 and add any unresolved schema decisions.
```

## Prompt 2: Auth, Organization, RBAC, Audit

```txt
You are implementing PureSOC Phase C.

Read:
- docs/puresoc_vision.md sections 6, 7, 21, 22, 27, 28
- docs/master-plan.md sections 7, 11, 14, 15
- docs/implementation-gaps.md
- docs/prompt-tests.md

Goal:
Add local auth, organizations, RBAC, session handling, and audit events.

Expected files/packages:
- packages/auth/core
- packages/auth/local
- packages/auth/oidc
- packages/audit
- apps/api/src/auth
- apps/api/src/organizations
- apps/api/src/rbac
- packages/database/prisma/schema.prisma updates

Implement:
- local email/password registration
- Argon2id password hashing
- email verification token model
- password reset token model
- login/logout/session endpoints
- organization creation
- organization membership model
- RBAC guard
- audit writer and audit table integration
- rate limiting for failed login attempts
- OIDC/social-login abstraction placeholders only

Negative constraints:
- Do not implement Microsoft 365 tenant admin consent here.
- Do not treat Microsoft/Google/GitHub sign-in as cloud provider connections.
- Do not trust email alone for account linking.
- Do not serialize passwords, reset tokens, verification tokens, OAuth codes, access tokens, refresh tokens, or cookies in logs or responses.
- Do not implement OIDC callbacks before ADR-013 is recorded or updated.

Tests:
- password hash verification
- token expiry
- local registration/login integration
- session creation and logout invalidation
- organization creation
- cross-organization access rejection
- failed login audit event
- no password/token serialization in logs or responses

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand auth organization rbac audit session

Gap updates:
- Update GAP-003 and GAP-004 with any deferred auth/OIDC or isolation decisions.
```

## Prompt 3: EU Regulatory Foundation And Country-Pack Status

```txt
You are implementing PureSOC Phase D.

Read:
- docs/puresoc_vision.md sections 10, 12, 14, 20, 21, 28, 32
- docs/master-plan.md sections 10, 14, 15
- docs/implementation-gaps.md
- docs/prompt-tests.md

Goal:
Create the EU NIS2 regulatory foundation, country-pack interface, and source activation skeleton without country-specific leakage.

Expected files/packages:
- packages/compliance/nis2/eu
- packages/compliance/nis2/implementing-regulation-2024-2690
- packages/compliance/nis2/country-packs/core
- packages/regulatory-sources
- packages/database/src/seed/eu-member-states.ts
- apps/api/src/compliance/nis2
- data/regulatory/eu/*.seed.json
- data/regulatory/countries/member-states.seed.json

Implement:
- EU member state seed for all 27 countries
- NIS2 framework and framework version records
- Article 21 control seed shell
- Article 23 incident workflow seed shell
- Implementing Regulation 2024/2690 overlay shell
- country-pack interface
- country-pack completeness state
- country-pack status API
- Romania marked as planned full pack
- other EU countries marked baseline-only until researched
- regulatory source model skeleton
- source activation lifecycle skeleton: draft, validated, review_required, active, superseded

Negative constraints:
- Do not put Romania-specific conditionals in EU modules.
- Do not auto-activate changed legal logic.
- Do not use secondary trackers as primary legal truth.
- Do not hardcode regulatory facts in React components.

Tests:
- all 27 EU member states load
- country-pack status returns all member states
- Romania status differs from baseline-only countries
- generic EU code has no Romania-specific imports or conditionals
- regulatory source activation defaults to review_required for changed legal logic

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand nis2 country-pack regulatory source-activation

Gap updates:
- Update GAP-006 and add source lifecycle gaps if implementation is deferred.
```

## Prompt 4: Romania Workbook Importer And Source Map

```txt
You are implementing PureSOC Phase E importer.

Use skill:
- puresoc-regulatory-xlsx-importer

Read:
- docs/nis2ro-tool-v-2-1.xlsx
- docs/puresoc_vision.md section 11
- docs/master-plan.md sections 10, 14, 15
- docs/implementation-gaps.md

Goal:
Convert the Romanian NIS2@RO workbook into deterministic, versioned regulatory seed data with source maps.

Expected files/packages:
- apps/regulatory-importer/src/ro/*
- packages/compliance/nis2/country-packs/ro
- data/regulatory/countries/ro/ro-nis2.seed.generated.json
- data/regulatory/countries/ro/ro-nis2-source-map.generated.json
- data/regulatory/countries/ro/ro-nis2-import-report.generated.json
- packages/database/prisma/schema.prisma updates if needed

Required sheets:
- Entity data
- Entity assessment
- Notification form
- Liste
- Ajutor
- Algoritm clasificare

Implement extraction for:
- workbook versions
- entity/contact fields
- service sectors and service/entity type options
- relationship-with-Romania questions
- Article 9 questions
- notification draft mapping
- classification rules or encoded rules with source mapping
- location/helper lists
- importer validation report

Negative constraints:
- Do not manually copy workbook logic into React components.
- Do not activate generated Romania legal logic without source-map validation.
- Do not mix Romania-specific importer logic into EU baseline packages.

Tests:
- workbook version extraction
- required sheet presence validation
- key field extraction
- service option extraction
- classification rule extraction or encoded source mapping
- source map coverage threshold
- deterministic generated seed output

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand regulatory-import ro-workbook source-map

Gap updates:
- Update GAP-005 with parser limitations or unresolved workbook assumptions.
```

## Prompt 5: Romania Classification, Onboarding Schema, And Notification Draft

```txt
You are implementing PureSOC Phase E Romania business logic.

Use skill:
- puresoc-regulatory-xlsx-importer

Read:
- docs/puresoc_vision.md sections 11, 12, 13, 25, 28
- docs/master-plan.md sections 10, 12, 14, 15
- docs/implementation-gaps.md

Goal:
Build a pure Romania classification service plus onboarding and notification-draft data contracts.

Expected files/packages:
- packages/compliance/nis2/country-packs/ro/classification.service.ts
- packages/compliance/nis2/country-packs/ro/classification.service.spec.ts
- packages/compliance/nis2/country-packs/ro/onboarding.schema.ts
- packages/compliance/nis2/country-packs/ro/notification-draft.types.ts
- apps/api/src/compliance/nis2/ro
- packages/database/prisma/schema.prisma updates for Romania module tables

Implement:
- result type: insufficient_data, out_of_scope, voluntary_registration_possible, important_entity, essential_entity
- reasons, matchedRules, missingRequiredFields, article9Required, notificationRecommended, sourceVersion
- Romania onboarding schema for saved partial progress
- notification draft JSON shape
- source-map links from classification reasons and notification fields

Negative constraints:
- Do not put classification logic in API controllers or React components.
- Do not submit to DNSC.
- Do not make legal certification claims.
- Do not use workbook text without source mapping.

Tests:
- insufficient data
- out of scope
- voluntary registration possible
- important entity by sector/size
- essential entity by special category
- Article 9 required
- public administration special case
- critical entity Law 294/2024 case
- partial onboarding save shape
- notification draft source-mapped fields

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand ro classification onboarding notification-draft

Gap updates:
- Update Romania workbook or legal-review gaps with unresolved decisions.
```

## Prompt 6: Provider Core And Connector Data Pipeline

```txt
You are implementing PureSOC Phase F provider core.

Use skills:
- puresoc-provider-connector
- puresoc-connector-test-harness

Read:
- docs/puresoc_vision.md sections 8, 9, 14, 15, 20, 21, 22, 23, 29
- docs/master-plan.md sections 7, 9, 14, 15
- docs/implementation-gaps.md

Goal:
Create provider-neutral connector contracts and the raw-to-normalized-to-finding data pipeline.

Expected files/packages:
- packages/providers/core
- packages/providers/mock
- packages/providers/microsoft365 skeleton
- packages/providers/google-workspace stub
- packages/database/prisma/schema.prisma provider updates
- apps/connector-runner
- apps/api/src/provider-connections

Implement:
- CloudProviderConnector interface
- provider-neutral resource types
- provider connection lifecycle types
- provider sync-run and sync-module records
- raw resource storage contract
- normalized resource storage contract
- provider finding contract
- provider recommendation contract
- connector runner job contract
- mock provider scenarios

Negative constraints:
- Do not make live Microsoft Graph calls.
- Do not add write/remediation actions.
- Do not allow compliance packages to import Microsoft provider code.
- Do not drop raw_json or normalized_json from provider resources.

Tests:
- provider contract tests
- raw resource -> normalized resource -> finding -> recommendation pipeline test
- idempotent upsert by external ID
- module partial-failure test
- pagination fixture test
- retry/throttle fixture test
- token/secret redaction test
- no-live-write guard test
- cross-organization provider-resource rejection

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand provider connector pipeline mock redaction idempotency

Gap updates:
- Update provider connector test harness gaps for missing scenarios.
```

## Prompt 7: Microsoft 365 Consent And Read-Only Sync

```txt
You are implementing PureSOC Phase G Microsoft provider onboarding and read-only discovery.

Use skills:
- puresoc-provider-connector
- puresoc-microsoft365-graph-connector
- puresoc-connector-test-harness

Read:
- docs/puresoc_vision.md sections 8, 9, 20, 22, 23, 29, 32
- docs/master-plan.md sections 9, 11, 14, 15
- docs/implementation-gaps.md

Goal:
Add Microsoft 365 tenant onboarding and read-only sync modules using provider-neutral storage.

Expected files/packages:
- packages/providers/microsoft365
- apps/api/src/provider-connections/microsoft365
- apps/connector-runner/src/microsoft365
- packages/database/prisma/schema.prisma provider updates if needed
- docs/microsoft365-permissions.md

Implement:
- begin consent endpoint
- callback endpoint with state validation
- permission bundle tracking
- tenant profile sync
- license sync
- users/groups/roles sync
- app registrations/service principals sync
- Secure Score sync
- module status and connection health API
- permission mapping documentation

Negative constraints:
- Do not request write scopes during first onboarding.
- Do not store Global Administrator credentials.
- Do not fail the whole connection if one module lacks permission or license.
- Do not put Microsoft-specific branching in the generic NIS2 evaluator.
- Do not log OAuth codes, access tokens, refresh tokens, tenant secrets, or authorization headers.

Tests:
- consent URL generation
- callback state validation
- tenant validation
- encrypted token storage
- permission bundle persistence
- missing permission module status
- missing license module status
- revoked consent status
- Graph pagination handling through fixtures
- throttling/retry behavior through fixtures
- mocked Graph sync happy path
- token redaction assertions

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand microsoft365 consent graph-sync permissions redaction

Gap updates:
- Update GAP-007 with validated permission bundle details and unresolved API limitations.
```

## Prompt 8: Compliance Engine, Recommendations, And Readiness Plan

```txt
You are implementing PureSOC Phase H.

Use skill:
- puresoc-provider-connector

Read:
- docs/puresoc_vision.md sections 14, 15, 16, 20, 21, 28
- docs/master-plan.md sections 7, 9, 10, 14, 15
- docs/implementation-gaps.md

Goal:
Map customer metadata, regulatory rules, provider findings, manual tasks, and evidence state into control results, gaps, recommendations, and readiness plans.

Expected files/packages:
- packages/compliance/core
- packages/recommendations
- apps/api/src/compliance
- apps/api/src/recommendations
- packages/database/prisma/schema.prisma compliance updates if needed
- data/regulatory/eu/*control*.seed.json

Implement:
- control catalog seed loader
- control mapping model
- compliance control result evaluator
- gap calculation service
- structured recommendation generator
- readiness plan and plan item generator
- manual checklist generation
- country-pack warning handling
- source references in gap and recommendation output

Negative constraints:
- Do not map Microsoft raw API payloads directly to controls; use provider-neutral findings.
- Do not let country-pack missing data become a false technical failure.
- Do not label scores as legal certification.
- Do not trigger provider write actions.

Tests:
- Microsoft mock findings map to controls through provider-neutral findings
- manual controls generate checklist items
- country-pack missing data creates warning, not false technical failure
- evidence absence affects evidence completeness
- gap plan has owner, due date, status, dependencies, and source references
- recommendation records can feed reports, dashboards, and future action flows

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand compliance gaps recommendations readiness-plan checklist

Gap updates:
- Update unresolved control mapping and scoring gaps.
```

## Prompt 9: Evidence, Reports, Dashboards, And Exports

```txt
You are implementing PureSOC Phase I outputs.

Use skill:
- puresoc-evidence-reporting

Read:
- docs/puresoc_vision.md sections 17, 19, 20, 21, 22, 25, 27, 28
- docs/master-plan.md sections 7, 8, 12, 14, 15
- docs/implementation-gaps.md

Goal:
Build evidence metadata, report/export contracts, and dashboard aggregation from stored analysis records.

Expected files/packages:
- packages/evidence
- packages/reports
- packages/dashboards
- apps/api/src/evidence
- apps/api/src/reports
- apps/api/src/dashboards
- apps/report-renderer
- packages/database/prisma/schema.prisma evidence/report/dashboard updates if needed

Implement:
- evidence metadata model
- evidence upload metadata and object-storage adapter interface
- upload scanning hook interface
- evidence-control/jurisdiction/source links
- evidence access audit
- report data contract
- internal readiness report data builder
- Romania notification draft export data builder
- dashboard aggregation queries
- dashboard snapshot records
- stable JSON export shapes

Negative constraints:
- Do not make evidence or reports public by URL alone.
- Do not generate reports from live provider API calls; use stored analysis records.
- Do not omit the legal caveat.
- Do not omit regulatory source references.
- Do not mix cross-organization evidence or report data.

Tests:
- upload authorization
- download authorization
- evidence access audit entry
- cross-organization evidence/report rejection
- report includes legal caveat
- report includes source references
- Romania draft includes source-mapped fields
- dashboard aggregates derive from stored compliance records
- stable JSON export snapshot test

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand evidence reports dashboards exports

Gap updates:
- Update GAP-008 and evidence/report gaps for deferred storage or renderer decisions.
```

## Prompt 10: Billing Provider And Entitlements

```txt
You are implementing PureSOC billing foundation.

Use skill:
- puresoc-stripe-billing

Read:
- docs/puresoc_vision.md sections 18, 19, 20, 21, 22, 27, 28
- docs/master-plan.md sections 3, 7, 14, 15
- docs/implementation-gaps.md

Goal:
Add billing provider abstraction, Stripe integration, and entitlement gates.

Expected files/packages:
- packages/billing/core
- packages/billing/stripe
- apps/api/src/billing
- packages/database/prisma/schema.prisma billing updates if needed
- config/defaults/billing.json

Implement:
- billing provider interface
- Stripe checkout session creation
- Stripe customer portal session creation
- webhook endpoint with raw-body signature verification
- billing event ledger
- idempotent webhook processing
- subscription status mapping
- entitlement calculation
- BILLING_PROVIDER=none behavior
- BILLING_PROVIDER=offline_license placeholder
- billing audit events

Negative constraints:
- Do not trust client-provided subscription state.
- Do not log Stripe secrets or webhook signatures.
- Do not let entitlements replace RBAC.
- Do not block core app operation when BILLING_PROVIDER=none.

Tests:
- webhook signature rejection
- duplicate webhook idempotency
- subscription status transitions
- entitlement calculation
- BILLING_PROVIDER=none bypass behavior
- cross-organization billing access rejection
- audit event creation for billing changes

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand billing stripe entitlement webhook

Gap updates:
- Keep GAP-012 open until actual product plans/prices are decided; add implementation gaps separately.
```

## Prompt 11: Safe Remediation Foundation

```txt
You are implementing the remediation safety foundation, not broad automation.

Read:
- docs/puresoc_vision.md sections 9.4, 9.5, 9.6, 15, 22, 23, 28
- docs/master-plan.md sections 4, 9, 11, 14, 15
- docs/implementation-gaps.md

Goal:
Create the recommendation-to-action lifecycle and approval model so future write actions have the required guardrails.

Expected files/packages:
- packages/recommendations
- packages/providers/core action types
- apps/api/src/actions
- apps/worker/src/actions
- packages/database/prisma/schema.prisma action updates if needed

Implement:
- action template model
- action run model
- preflight result model
- approval state model
- pre-state and post-state snapshot metadata
- verification result model
- evidence link from action run
- manual/guided action support

Negative constraints:
- Do not implement live provider write actions.
- Do not allow action apply without approval state.
- Do not skip preflight, snapshot, verification, or evidence metadata in the model.
- Do not include high-risk V1-forbidden actions as executable defaults.

Tests:
- action cannot apply without approval
- action cannot apply without preflight
- manual/guided action can create checklist/evidence tasks
- failed action is auditable
- action model links to recommendation, control, provider connection, and evidence

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand actions remediation approval preflight

Gap updates:
- Update remediation safety gaps with any deferred execution behavior.
```

## Prompt 12: Operational UI And Dashboard UX

```txt
You are improving PureSOC frontend UX.

Use skills:
- impeccable
- frontend-design-review
- playwright-interactive where browser verification is needed

Read:
- docs/puresoc_vision.md sections 13, 24, 25
- docs/master-plan.md sections 7, 12, 14, 15
- docs/implementation-gaps.md

Goal:
Build or polish the operational UI for customer metadata, connector health, compliance gaps, recommendations, evidence, reports, and dashboards.

Expected files/packages:
- apps/web
- packages/ui if created
- packages/dashboards
- packages/reports shared types

Check:
- app shell navigation
- customer/business profile editing
- EU and Romania onboarding save/resume behavior
- country-pack warnings
- Microsoft connection health
- gap report scanning
- recommendation backlog
- remediation approval affordances
- evidence/report exports
- mobile and desktop layout
- keyboard/focus states
- legal caveat placement

Negative constraints:
- Do not build a marketing landing page as the primary app screen.
- Do not hide source/confidence indicators.
- Do not show legal certification claims.
- Do not create risky remediation controls without blast radius and approval state.
- Do not let UI depend on live provider calls where stored analysis data exists.

Tests:
- Playwright screenshots for desktop and mobile
- no overlapping text
- keyboard/focus checks for critical flows
- dashboard renders stored aggregate data
- evidence/report surfaces show legal caveat and source indicators

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand web dashboard reports
- pnpm test:e2e -- --grep "@ui-smoke"

Gap updates:
- Update UX/design-system gaps as decisions are made.
```

## Prompt 13: Security Threat Model Review

```txt
This is a review prompt, not an implementation prompt.

Use skill:
- security-threat-model

Read:
- docs/puresoc_vision.md sections 6, 8, 9, 17, 18, 22, 23, 28
- docs/master-plan.md sections 7, 9, 11, 14, 15
- docs/implementation-gaps.md

Goal:
Find concrete product security risks and convert them into tests or implementation tickets.

Review:
- local auth
- OIDC callback handling
- provider token storage
- organization scoping
- provider raw payload storage
- evidence downloads
- upload scanning hook
- report export access
- Stripe webhook validation
- audit log integrity
- remediation approval and execution model

Output:
- ranked findings
- exploit path
- affected files
- required test
- proposed fix
- residual risk

Negative constraints:
- Do not make legal compliance claims.
- Do not focus on host/infrastructure hardening unless it affects product code or data contracts.
```

## Prompt 14: Gap Register And Prompt QA

```txt
This is a maintenance prompt.

Read:
- docs/implementation-gaps.md
- docs/codex-prompts.md
- docs/prompt-tests.md
- latest changed files
- latest test output

Goal:
Keep the project executable by updating gaps and validating prompts against the prompt test protocol.

Check:
- every implementation prompt has expected files/packages
- every implementation prompt has negative constraints
- every implementation prompt has tests
- every implementation prompt has acceptance commands
- every implementation prompt has gap update instruction
- every implementation prompt has expected final summary

Update docs/implementation-gaps.md with:
- blockers
- assumptions
- deferred decisions
- missing tests
- prompt quality issues

Keep resolved gaps for auditability, marked as resolved with date.
```
