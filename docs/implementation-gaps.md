# Implementation Gaps

Use this file as the live project gap register. Do not delete resolved gaps; mark them resolved with date.

## Gap Format

```txt
ID:
Severity:
Area:
Current state:
Impact:
Next action:
Owner:
Target phase:
Status:
```

## Open Gaps

### GAP-001: Application Scaffold Missing

Severity: High
Area: Repository
Current state: Phase A scaffold exists under `code/` following the shared AI project template. It includes app/package placeholders, config defaults, service catalog, Dockerfiles, regulatory data folders, the Romania workbook application copy, and initial tests.
Impact: Product behavior is still mostly placeholder, but the executable workspace baseline exists.
Next action: Continue with Prompt 1B for database schema and core data contracts.
Owner: Codex
Target phase: Phase A
Status: Resolved 2026-04-28. Validation passed with `npx pnpm@10.33.2 lint`, `npx pnpm@10.33.2 test`, and `docker compose -f infra/compose/docker-compose.yml config` from `code/`.

### GAP-002: Package Manager Not Confirmed by Implementation

Severity: Medium
Area: Developer platform
Current state: `code/package.json` sets `packageManager` to `pnpm@10.33.2`, `code/pnpm-workspace.yaml` defines workspace packages, and `code/pnpm-lock.yaml` was generated.
Impact: Package manager is now selected for app work. The local sandbox image does not expose pnpm directly, so validation currently uses host `npx pnpm@10.33.2`.
Next action: Ensure developer machines or automation images provide pnpm 10.33.2 directly or invoke it through Corepack/npx.
Owner: Codex
Target phase: Phase A
Status: Resolved 2026-04-28 for repository decision.

### GAP-003: Auth Broker Boundary Needs ADR

Severity: High
Area: Auth
Current state: ADR-013 records the boundary between local auth, OIDC/social login, optional Keycloak broker behavior, and Microsoft 365 managed-provider admin consent. Phase C added local email/password auth, session handling, token redaction tests, and OIDC/social-login placeholders. PLAN_M11 implemented Microsoft Entra, Google, and GitHub user sign-in callback contracts with state, nonce, PKCE, issuer/audience/expiry/signature validation, provider-subject lookup, explicit signed-in account-link approval for email collisions, session creation, audit events, and separation from Microsoft 365 managed-provider consent.
Impact: The product identity boundary is now executable in the in-memory/API harness, and email alone is not accepted for linking. Production live-provider setup and smoke coverage still need real app registrations, redirect URI validation, JWKS/profile endpoint reachability, and deployed secret handling before social login is enabled for customers.
Next action: Use GAP-032 for live-provider OIDC/OAuth operational smoke and secret rotation before production enablement.
Owner: Codex
Target phase: Phase C
Status: Resolved 2026-04-30 for M11 callback/account-linking implementation; live-provider operational validation tracked separately.

### GAP-004: Multitenancy Isolation Strategy Needs Enforcement Tests

Severity: High
Area: Security
Current state: ADR-003 records service-layer organization scoping for V1 with an RLS-ready posture. Phase B added Prisma schema coverage and database contract tests that assert tenant-owned tables carry `organization_id`. Phase C added an RBAC guard and API integration coverage that rejects cross-organization member access.
Impact: V1 service-layer enforcement is covered for the new auth/organization surface, but future tenant-owned services must keep adding scoped query tests as they are implemented.
Next action: Continue adding organization-scoped service tests for each new tenant-owned API surface and revisit PostgreSQL RLS after the Prisma client and API repository boundaries settle.
Owner: Codex
Target phase: Phase B/C
Status: Resolved 2026-04-28 for Phase C auth/organization service-layer enforcement; PostgreSQL RLS remains a later hardening option.

### GAP-005: Romania Workbook Import Requires Structured Parser

Severity: High
Area: Regulatory data
Current state: Phase E added a deterministic XLSX importer under `code/apps/regulatory-importer/src/ro`, generated RO NIS2 seed/source-map/report JSON under `code/data/regulatory/countries/ro`, and added source-map coverage and deterministic-output tests. Parser limitations are explicit in the generated import report: formulas and cached values are preserved but not recalculated, data-validation/drop-down metadata is represented through visible helper tables and source-mapped cells, and generated Romania legal logic remains `review_required`.
Impact: Romania workbook data can now be regenerated and diffed repeatably with source-map coverage. Legal activation still requires the GAP-006 review workflow before generated national logic is treated as active.
Next action: During Prompt 5, build onboarding/notification behavior against the generated seed and keep classification scenarios tied to source-mapped fixtures; do not add direct DNSC submission.
Owner: Codex
Target phase: Phase E
Status: Resolved 2026-04-28 for structured parser and generated source-mapped seed artifacts; legal review activation remains tracked by GAP-006.

### GAP-006: Legal Review Process Undefined

Severity: High
Area: Regulatory risk
Current state: Product caveat is defined, ADR-011 records the source activation lifecycle, and PLAN_M6 added repository-backed regulatory source versions, validation reports, source maps, review tasks, review decisions, activation timestamps, supersession links, API routes, and `regulatory_admin` authorization. Changed Romania and future country-pack legal logic now remains `review_required` until reviewed and activated.
Impact: Technical activation guardrails exist, but incorrect national guidance could still create commercial and customer risk if legal/product reviewer ownership, review evidence standards, escalation rules, and approval UI/operations are not defined before production activation.
Next action: Define reviewer assignment, legal/product operating procedure, required review evidence, approval delegation, and activation UI before production use of source-derived Romania country-pack or control changes.
Owner: Product/legal
Target phase: Phase D and Phase K
Status: Open

### GAP-007: Microsoft Graph Permission Bundle Details Need Validation

Severity: Medium
Area: Microsoft connector
Current state: ADR-009 records the permission-bundle strategy and read-only-first boundary. Phase G validated the initial read-only V1 bundle mapping against Microsoft Learn on 2026-04-28. PLAN_M12 revalidated Microsoft Learn on 2026-04-30 and updated `docs/microsoft365-permissions.md`: `m365_read_baseline` now includes `Policy.Read.All` and `AuditLog.Read.All`; `m365_security_read` now includes `SecurityAlert.Read.All`; fixture-backed modules now cover Conditional Access policies, Entra directory audit logs, Entra sign-in logs, Secure Score, Defender XDR incidents, and Defender XDR alerts. Write bundles remain disabled and separate.
Impact: First onboarding still uses named read-only bundles, tracks granted permissions, and degrades missing permissions, missing licenses, unsupported APIs, China-cloud unsupported Graph security paths, throttling, revoked consent, and connector errors through module status instead of failing the full connection. Exchange, SharePoint, Teams, Purview, app permission-grant introspection, sovereign-cloud base URL selection, and live customer-tenant smoke remain deferred.
Next action: Before production enablement, run live tenant smoke for each enabled read module, validate real service-plan/license detection for Defender XDR and Intune, configure sovereign-cloud Graph base URLs, and keep `docs/microsoft365-permissions.md` current before adding any write/remediation bundle.
Owner: Codex
Target phase: Phase G
Status: Resolved 2026-04-30 for PLAN_M12 read-only module permission revalidation and fixture-backed expansion; deferred Microsoft API/runtime limitations remain documented.

### GAP-008: Evidence Metadata, Access, And Export Model Needs ADR

Severity: High
Area: Evidence/reporting
Current state: ADR-007 records the report-renderer strategy and ADR-008 records evidence metadata, access audit, object-storage, and export-model boundaries. Phase I added evidence metadata/contracts, object-storage and upload-scanner interfaces, in-memory evidence storage, authorization-checked and audited downloads, stable JSON report/export builders, API routes, and output tests. PLAN_M8 added a S3/MinIO-compatible object-storage adapter, explicit no-op/mock/HTTP upload scanner adapters with production fail-closed behavior for unscanned uploads, Prisma-backed evidence artifact/link/access-log persistence, generated-report storage as `generated_report` evidence artifacts, report/export audit events, and deterministic JSON/PDF renderer artifacts under `apps/report-renderer`.
Impact: The evidence/report adapter contract is now executable without public-by-URL report access, and generated reports are stored from stored analysis records as traceable evidence artifacts. Remaining risk is runtime-specific rather than contract-specific: live MinIO bucket provisioning, live scanner service integration, browser-grade PDF rendering, CSV exports, and binary evidence-package assembly still need deployment smoke coverage.
Next action: Use GAP-029 for live object-storage/scanner/PDF/CSV/binary bundle runtime hardening; keep in-memory, mock, and fake adapters as the fast contract harness.
Owner: Codex
Target phase: Phase I
Status: Resolved 2026-04-30 for Phase I contracts and in-memory implementation; resolved further by PLAN_M8 for adapter contracts, Prisma evidence metadata persistence, generated report evidence storage, and deterministic renderer artifacts.

### GAP-009: UX Design System Not Chosen

Severity: Medium
Area: Frontend
Current state: ADR-014 records the PureSOC operational design-system decision. PLAN_M10 added `@puresoc/ui` tokens and semantic primitives, plus an `apps/web` operational console renderer for dashboard, onboarding, Microsoft 365 health, gaps, recommendations, evidence/reports, login focus, and approval affordances backed by stored contracts.
Impact: UI now has a consistent product-console direction and reusable primitives. The frontend runtime remains framework-light until a served Next.js app is intentionally wired.
Next action: Preserve ADR-014 tokens and primitive semantics when implementing the full served React/Next.js runtime and browser screenshot harness tracked by GAP-031.
Owner: Codex/product
Target phase: Phase A
Status: Resolved 2026-04-30 for M10 design-system decision and static operational console primitives.

### GAP-010: Skill Installation Pending Approval

Severity: Medium
Area: Codex velocity
Current state: Hosting-specific Azure skills were removed from the recommendation. Public helper skills and project-local PureSOC connector/business integration skills are proposed in `docs/skill-install-proposal.md`; not installed or created yet.
Impact: Future Codex runs may lack project-local specialized instructions for provider connectors, Microsoft Graph, Stripe, OIDC login, workbook import, evidence, and connector testing.
Next action: User approval for selected bundle and install/create location.
Owner: User
Target phase: Before Phase A implementation
Status: Resolved 2026-04-28. Option A was executed under `.agents/skills/`. Installed public skills: `playwright-interactive`, `security-threat-model`, `frontend-design-review`. Created PureSOC skills: `puresoc-provider-connector`, `puresoc-microsoft365-graph-connector`, `puresoc-oidc-social-login`, `puresoc-stripe-billing`, `puresoc-regulatory-xlsx-importer`, `puresoc-evidence-reporting`, `puresoc-connector-test-harness`. OpenAI `frontend-skill` was attempted but unavailable in the current curated/experimental catalog; use local `impeccable` plus `frontend-design-review`.

### GAP-011: CI Provider Not Chosen

Severity: Low
Area: DevOps
Current state: Test commands are defined but no CI pipeline exists.
Impact: Repo implementation only needs stable commands and acceptance gates; dev/staging/prod pipeline is managed outside this product plan.
Next action: Keep package scripts and acceptance commands current; external DevOps pipeline can consume them.
Owner: DevOps
Target phase: External pipeline
Status: Resolved 2026-04-28. CI provider selection is out of scope for this repo's implementation plan.

### GAP-012: Billing Plans Need Product Decision

Severity: Medium
Area: Business/billing
Current state: PLAN_M7 added a billing provider abstraction, configurable placeholder Base/Pro/MSP plan entitlements, Stripe checkout/customer portal/webhook contracts, idempotent event handling, and `BILLING_PROVIDER=none` behavior. Actual Stripe products, prices, packaging, customer limits, and paid feature policy are still not product-approved.
Impact: The billing foundation is executable, but checked-in plan names, price IDs, and entitlement bundles are implementation placeholders rather than commercial truth.
Next action: Product must define final Base/Pro/MSP/In-a-box products, Stripe price IDs, entitlement bundles, customer limits, trial policy, and upgrade/downgrade behavior before production billing activation.
Owner: Product
Target phase: Phase I
Status: Open

### GAP-013: Docker Image Service Catalog Missing

Severity: High
Area: Service topology
Current state: Compose service catalog and Dockerfiles exist under `code/infra/`. Main Compose config includes web, api, worker, scheduler, connector-runner, regulatory-importer, report-renderer, postgres, redis, and object storage. Split Compose files exist for data, storage, webservices, jobs, connectors, reports, and config. PLAN_M18 replaced inline `node -e` Dockerfile stubs with workspace entrypoint scripts; PLAN_M19 moved worker, scheduler, and connector-runner scripts onto implemented job-runtime entrypoints.
Impact: DevOps can consume a clear application service/image inventory, and Dockerfiles no longer pretend inline placeholder services are the product. Live Redis/BullMQ durable queue operation remains deferred under GAP-037.
Next action: Keep Docker static/runtime smoke in the acceptance gate and add live multi-service Compose smoke when runtime dependencies are intentionally in scope.
Owner: Codex
Target phase: Phase A
Status: Resolved 2026-04-28 for service catalog shape; updated 2026-05-01 by PLAN_M18 for non-stub Docker entrypoints and by PLAN_M19 for worker/scheduler/connector-runner job-runtime entrypoints. Durable Redis/BullMQ queue runtime remains open under GAP-037.

### GAP-014: Application Database Schema And Data Contracts Missing

Severity: High
Area: Database/data model
Current state: Phase B added `code/packages/database/prisma/schema.prisma`, database client factory placeholder, EU Member State seed metadata, connector/output contracts, provider resource contracts, recommendation/report/dashboard contracts, and tests for schema groups, organization scoping, provider resource idempotency, raw vs normalized resources, and output data flow.
Impact: Feature work now has a shared schema and contract baseline. Runtime Prisma migration/client generation is still tracked separately in GAP-020.
Next action: Use the Phase B contracts for auth, provider, compliance, evidence, report, dashboard, and billing implementations.
Owner: Codex
Target phase: Phase B
Status: Resolved 2026-04-28 for schema and data-contract baseline.

### GAP-015: Prompt Suite Initially Did Not Meet Prompt Test Protocol

Severity: High
Area: Codex execution
Current state: The initial prompt suite was rewritten on 2026-04-28. On 2026-04-30, `docs/codex-prompts.md` was refreshed again after implementation and `docs/claude_rec.md` review; completed Phase A through contract-level Phase I output prompts were removed from the active list, and next-step prompts now target hardening, persistence, billing, production adapters, remediation, UI, OIDC, Microsoft expansion, catalog/scoring, and release review. The prompt suite and `docs/PLAN.md` now require every prompt run to update its current `docs/PLAN_Mx.md`, update `docs/codex-prompts.md`, and create the next `PLAN_M{x+1}.md` stub; `docs/PLAN_M2.md` starts the new active sequence.
Impact: Future prompts can still drift if not checked after phases, but the active suite no longer asks Codex to reimplement completed slices and now has an explicit milestone handoff mechanism.
Next action: Use Prompt 14 after each phase to audit prompt quality and update gaps.
Owner: Codex
Target phase: Ongoing
Status: Resolved 2026-04-30 for refreshed next-step prompt suite; ongoing QA remains required.

### GAP-016: Provider Connector Test Harness Incomplete

Severity: High
Area: Provider connectors/testing
Current state: Phase F now includes provider-neutral connector contracts, an in-memory provider resource store, mock provider scenarios, connector-runner job contract, API provider-connection skeleton, and deterministic tests for raw-to-normalized-to-finding-to-recommendation flow, idempotent upsert, module partial failure, pagination, retry/throttling, token/secret redaction, no-live-write guard, and cross-organization resource rejection.
Impact: The provider connector harness is available for mocked Phase F development. Live Microsoft Graph permission validation and exact permission bundle details remain deferred to Phase G and tracked by GAP-007.
Next action: Reuse the mock harness in Phase G Microsoft onboarding and add live-doc-validated Graph permission fixtures without enabling write/remediation actions.
Owner: Codex
Target phase: Phase F
Status: Resolved 2026-04-28 for the provider-neutral mock harness.

### GAP-017: Billing Implementation Prompt Was Missing

Severity: Medium
Area: Billing
Current state: A dedicated billing prompt was added as Prompt 6 and completed by PLAN_M7, covering provider abstraction, Stripe checkout/portal/webhooks, webhook idempotency, entitlements, and `BILLING_PROVIDER=none`. Product pricing and plan definitions remain tracked in GAP-012.
Impact: The missing-prompt issue is resolved; product entitlements still need business decisions before production billing activation.
Next action: Keep GAP-012 open and use GAP-028 for live Stripe runtime and reconciliation work.
Owner: Codex/Product
Target phase: Phase I
Status: Resolved 2026-04-30 for refreshed prompt coverage and PLAN_M7 billing foundation completion.

### GAP-018: Dashboard And Report Data Contracts Not Implemented

Severity: High
Area: Outputs/analytics
Current state: Phase B added report and dashboard TypeScript contracts backed by stored analysis records, plus tests proving recommendations can feed plan items, reports, and dashboard signals. Phase I added concrete internal readiness report builders, Romania notification draft JSON export builders, stable JSON export serialization, dashboard aggregation from stored analysis records, dashboard snapshot records, and API routes that reject cross-organization access. PLAN_M8 now stores generated report JSON exports as evidence artifacts, audits report generation/export creation, and adds deterministic PDF renderer artifacts for contract tests.
Impact: Reports and dashboards now have executable builders with legal caveats, regulatory source references, generated-report evidence links, and deterministic renderer output. Production-quality PDF templates, CSV table exports, and full evidence-package binary bundles remain deferred runtime/product work rather than missing core contracts.
Next action: Expand browser-grade renderer templates, CSV table exports, and evidence-package bundle generation under GAP-029 after runtime storage/scanner smoke coverage exists.
Owner: Codex
Target phase: Phase B/I
Status: Resolved 2026-04-30 for Phase I JSON builders and dashboard aggregation; resolved further by PLAN_M8 for generated-report evidence storage and deterministic renderer contract output.

### GAP-020: Prisma Migration And Generated Client Workflow Not Wired

Severity: Medium
Area: Database/developer platform
Current state: PLAN_M4 added pinned Prisma 6.19.3 CLI/client dependencies, workspace and database-package Prisma scripts, a generated initial migration, a Prisma client factory, documentation for validation/generation commands, and a first Prisma-backed compliance-result repository adapter. Prisma 7 was intentionally not adopted because it requires the newer datasource/client configuration model and would force unrelated migration work.
Impact: The database schema now has an executable validate/generate/migration workflow and the first persistence adapter can be exercised through the generated Prisma delegate boundary. Runtime API services still default to in-memory repositories until production database wiring is intentionally enabled.
Next action: Use the M4 Prisma workflow for future persisted adapters; add a live PostgreSQL migration/apply smoke test when runtime database infrastructure is in scope.
Owner: Codex
Target phase: Phase C/D
Status: Resolved 2026-04-30 for Prisma dependency, validation/generation, initial migration, and first adapter workflow.

### GAP-019: Regulatory Source Activation Lifecycle Not Implemented

Severity: High
Area: Regulatory/country packs
Current state: PLAN_M6 added persisted/domain-level source versions, source maps, import validation reports, review tasks, review decisions, activation timestamps, supersession links, source-map traceability reads, and API routes protected by `regulatory_admin`. Source monitor task creation now produces review tasks without activating legal logic.
Impact: The source activation lifecycle is executable and historic source versions remain readable. Production reviewer policy and UI remain tracked by GAP-006, and live database/scheduler runtime rollout remains separate from this contract slice.
Next action: Use the M6 contracts when wiring production regulatory review UI and any live source-monitor scheduler.
Owner: Codex/Product/legal
Target phase: Phase D/E
Status: Resolved 2026-04-30 for PLAN_M6 persistence, API, source-map traceability, and activation/supersession workflow.

### GAP-021: Control Catalog Coverage And Readiness Scoring Need Product Calibration

Severity: Medium
Area: Compliance engine/scoring
Current state: PLAN_M13 expanded the executable EU Article 21 catalog from three representative controls to all ten Article 21(2)(a)-(j) baseline categories, with source-linked evidence requirements, manual checklist mappings for each control, provider-neutral mappings for existing Microsoft/mock MFA, IAM, and Defender XDR findings, stricter seed validation, configurable readiness-plan targets, stale-evidence handling, accepted-risk scoring below a clean pass, and the dashboard label `PureSOC internal readiness`. ADR-015 records the provisional score model.
Impact: The control-result -> gap -> recommendation -> readiness-plan -> dashboard/report flow now covers the full Article 21 baseline categories as an internal-readiness model, but score weights, evidence freshness windows, and customer-facing score copy remain provisional and are not product/legal-approved. National overlays are still excluded unless source-reviewed and activated.
Next action: Product/legal must review the M13 score weights, accepted-risk credit, stale-evidence freshness policy, evidence expectations per control, and public-facing wording before production use; then expand reviewed country overlays and any Implementing Regulation 2024/2690 overlays through the regulatory activation workflow.
Owner: Product/legal/Codex
Target phase: Phase H/I
Status: Open

### GAP-022: Compliance Results Are Not Persisted And Schema IDs Need Alignment

Severity: High
Area: Compliance persistence/database
Current state: PLAN_M3 aligned TypeScript contracts and Prisma schema so compliance output control references use logical IDs, gaps/recommendations use actionable severity, readiness due dates are date-only, and gaps/recommendations/readiness-plan items retain provider finding and manual task IDs. PLAN_M4 added `PrismaComplianceResultRepository`, a `compliance_result_snapshots` table for exact repository reloads, granular writes for control results, gaps, recommendations, readiness plans, and plan items, and organization-scoped repository tests.
Impact: Compliance evaluation outputs now have a Prisma-backed persistence path while preserving the existing in-memory path for fast API/unit tests. Reports, evidence links, dashboards, and future action runs can build on persisted snapshots and granular output rows once runtime services opt into the Prisma adapter.
Next action: Wire production API/database configuration to use the Prisma adapter when PostgreSQL runtime setup is in scope, and add live database migration/apply coverage.
Owner: Codex
Target phase: Phase H/I hardening
Status: Resolved 2026-04-30 for PLAN_M4 first Prisma-backed compliance-result persistence slice.

### GAP-026: Prisma Adapter Lacks Live PostgreSQL Migration Smoke

Severity: Medium
Area: Database/testing
Current state: PLAN_M4 validates the Prisma schema, generates the Prisma client, generates the initial migration SQL, and tests the compliance-result repository through a deterministic fake Prisma delegate boundary. PLAN_M18 adds `PURESOC_PERSISTENCE_MODE=prisma`, shares one Prisma client boundary from `@puresoc/database`, and selects existing Prisma adapters for compliance results, evidence metadata/access logs, billing, regulatory sources, and remediation action metadata. The acceptance environment still did not run `prisma migrate deploy` or real CRUD against live PostgreSQL.
Impact: Runtime Prisma selection no longer silently defaults every implemented adapter to memory, but database-specific runtime issues such as extension availability, permissions, SQL execution, actual transaction behavior, and deployed migration order remain unproven until a live database smoke test is added.
Next action: Add a Docker-backed PostgreSQL migration/apply smoke test or CI service-container job once runtime database infrastructure is intentionally in scope.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open; partially addressed 2026-05-01 by PLAN_M18 for runtime adapter selection.

### GAP-027: Regulatory Source Monitor Runtime Not Scheduled

Severity: Medium
Area: Regulatory operations
Current state: PLAN_M17 added typed config defaults and environment overrides for `REGULATORY_SOURCE_MONITOR_ENABLED`, request timeout, stale-after days, and optional review-task organization routing. `@puresoc/regulatory-sources` now includes a deterministic regulatory source monitor service with injectable HEAD/metadata clients, stale/unreachable/changed-metadata detection, idempotent open review-task creation, and no automatic activation. `apps/scheduler` exposes the one-shot `regulatory.monitorCountrySources` job contract, and tests cover disabled mode, reachable no-op/update, unreachable, stale, changed metadata, timeout handling, and duplicate-task prevention without live public URL fetches.
Impact: The runtime scheduling contract now exists and can be called by a scheduler loop or deployment-specific trigger while preserving regulatory review guardrails. The monitor creates review work only; source-derived legal logic still requires the GAP-006 review process before activation.
Next action: Wire the one-shot scheduler job into the deployment's actual recurring process/queue when runtime orchestration is selected, and keep production reviewer operating procedure/UI under GAP-006.
Owner: Codex/Product/legal
Target phase: Phase K
Status: Resolved 2026-05-01 for scheduler job contract, configurable source monitor behavior, idempotent review-task creation, and no-auto-activation tests.

### GAP-028: Live Stripe Runtime Reconciliation And Operations Deferred

Severity: Medium
Area: Billing operations
Current state: PLAN_M7 added Stripe API request construction, raw-body webhook signature verification, idempotent billing event storage, subscription transition handling, entitlement recalculation, audit events, and a Prisma billing repository adapter. The implementation is covered with deterministic fake-client and API tests, not a live Stripe account or deployed webhook endpoint.
Impact: Contract behavior is tested, but production-specific risks remain around real Stripe portal configuration, endpoint registration, tax/customer settings, webhook retry ordering, scheduled `stripe.syncCustomer`, `stripe.syncSubscription`, and `stripe.reconcileEntitlements` jobs, and live database migration/apply execution.
Next action: Before production billing activation, run a Stripe test-mode integration pass with real webhook delivery, add worker/scheduler reconciliation jobs, document webhook endpoint operations and secret rotation, and add a live PostgreSQL billing persistence smoke test.
Owner: Codex/DevOps/Product
Target phase: Phase I/K
Status: Open

### GAP-029: Evidence Runtime Smoke, Browser PDF, CSV, And Binary Bundles Deferred

Severity: Medium
Area: Evidence/reporting runtime
Current state: PLAN_M8 added S3/MinIO-compatible object-storage and HTTP/mock/no-op scanner adapters, Prisma evidence metadata/access-log persistence, generated-report evidence artifacts, and deterministic report-renderer JSON/PDF artifacts. PLAN_M14 removed internal evidence `storageUri` values from evidence API upload/list/download responses and marks `storageUri` as sensitive for audit/response checks. Validation uses fake fetches, mock scanners, in-memory API storage, deterministic renderer output, and Prisma schema/client generation, not live MinIO bucket provisioning, live scanner service calls, or browser-backed PDF rendering.
Impact: The contract surface is testable and production-shaped, and object storage pointers now stay server-side at the API boundary. Deployed environments still need smoke coverage for bucket creation/permissions, scanner availability/fail-closed behavior, browser PDF fidelity, CSV export tables, and binary evidence-package assembly.
Next action: Add a runtime smoke that provisions the object-storage bucket, writes/reads an evidence artifact through MinIO/S3, calls the deployed scanner service, renders a browser-grade PDF through `puresoc-report-renderer`, and records report export metadata for CSV and binary evidence-package bundles.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open

### GAP-030: Live Remediation Worker And Provider Execution Deferred

Severity: High
Area: Remediation safety/runtime
Current state: PLAN_M9 added the recommendation-to-action safety foundation: action templates/runs, preflight, approval, pre/post snapshot metadata, verification, evidence links, action audit events, API routes, Prisma action repository metadata, and a future worker job contract. PLAN_M14 added an integrity check so action snapshots must reference the same provider connection as the action run. PLAN_M19 added a worker job-runtime loop that validates remediation job safety metadata and records retry/failure metadata through the shared job harness, but provider write execution remains disabled. No live provider write executor is implemented, no action queue is backed by BullMQ, and provider connector action methods are optional contracts only.
Impact: Future write actions have a stronger guardrail model, but deployed environments still cannot safely execute provider changes. Runtime risks around queue persistence, worker idempotency, provider write-enabled checks against live connection state, retry/failure semantics, live PostgreSQL action persistence, and provider-specific rollback/verification remain unresolved before any write-capable action can be enabled.
Next action: Before enabling any provider write action, implement a persisted BullMQ `action-execution` worker path, wire `ProviderActionRun` persistence in runtime API services, add idempotent worker execution tests, add live database smoke coverage, and create provider-specific preflight/snapshot/apply/verify/evidence tests for each action template.
Owner: Codex/DevOps/Product
Target phase: Phase J/K
Status: Open

### GAP-031: Served Web Runtime And Browser Screenshot Harness Deferred

Severity: Medium
Area: Frontend/runtime
Current state: PLAN_M10 added a deterministic operational console renderer, shared UI tokens/primitives, login form surface, and static `@ui-smoke` checks. The repository still does not include a served Next.js/React runtime, Playwright dependency/configuration, or browser-generated desktop/mobile screenshots.
Impact: Source, caveat, responsive CSS, focus affordance, and approval-state semantics are testable, but real browser layout, screenshot diffing, pointer/keyboard traversal, and text-overlap checks are not yet proven in Chromium/WebKit/Firefox.
Next action: When the served web runtime is in scope, add Next.js route wiring or equivalent, install/configure Playwright, capture desktop and mobile screenshots for dashboard/gaps/evidence/approval/login flows, and fail CI on overlap or inaccessible focus regressions.
Owner: Codex/Frontend
Target phase: Phase K
Status: Open

### GAP-032: Live OIDC Provider Registration And Callback Smoke Deferred

Severity: Medium
Area: Auth operations
Current state: PLAN_M11 added OIDC/social callback contracts, provider config validation, transient state/nonce/PKCE storage, JWKS ID-token verification support, GitHub OAuth profile/email lookup support, explicit account-link approval, session creation, and API tests with deterministic fake token/profile clients. Defaults keep Microsoft Entra, Google, and GitHub sign-in disabled until provider credentials are configured.
Impact: Contract behavior is covered, but deployed environments still need live Microsoft Entra, Google, and GitHub app registrations, exact redirect URI setup, JWKS/profile endpoint smoke tests, callback URL and SameSite cookie validation, provider secret rotation, and operational monitoring before customer-facing social login is enabled.
Next action: Add a deployment smoke that exercises each configured provider in a test tenant/app, verifies callback cookies and audit events, and documents client secret/key rotation.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open

### GAP-033: Microsoft Collaboration And Purview Posture Read Modules Deferred

Severity: Medium
Area: Microsoft connector
Current state: PLAN_M12 intentionally returns `unsupported_api` for requested `exchange-posture`, `sharepoint-posture`, `teams-posture`, and `purview-posture` modules. Reliable Graph-first read-only signal selection, permission mapping, fixture coverage, and control mapping for these collaboration/data-protection areas are not implemented.
Impact: M365 collaboration and Purview posture areas remain manual/guided or covered indirectly by Secure Score until specific read modules are validated. The connector is honest about unsupported state, but technical posture coverage is incomplete for external sharing, Teams guest/external access, mailbox forwarding/risky inbox rules, DLP, retention, and sensitivity-label posture.
Next action: Revalidate current Microsoft Learn endpoints and permissions for each posture area, choose a minimal reliable read-only signal set, add mocked Graph fixtures and module degradation tests, then map provider-neutral findings to NIS2 controls without adding write scopes.
Owner: Codex/Product
Target phase: Microsoft read-module expansion
Status: Open

### GAP-034: API Request Body And Evidence Upload Size Limits Missing

Severity: Medium
Area: API availability/security
Current state: PLAN_M16 added typed defaults and environment overrides for JSON request body, Stripe raw webhook body, decoded evidence upload, and HTTP scanner timeout limits. `parseJsonBody` and `parseRawBody` now reject oversized requests through early `Content-Length` checks and chunk-level streaming enforcement with stable `413 payload_too_large` errors. Evidence uploads now reject decoded content above the configured limit before scanner, storage, artifact, access-log, or audit side effects, including base64 uploads. HTTP scanner calls now abort on timeout and return a failed scan result so production fail-closed behavior is preserved.
Impact: The current JSON/raw-body API harness now has bounded request buffering and evidence scanner calls no longer hang indefinitely. Future large-file upload ergonomics still need a streaming/multipart design before increasing limits substantially.
Next action: Keep runtime object-storage/scanner/PDF smoke under GAP-029 and revisit streaming or multipart evidence upload support when product upload-size requirements exceed the current JSON-body API shape.
Owner: Codex/DevOps
Target phase: Phase K
Status: Resolved 2026-05-01 for configurable parser limits, decoded evidence byte limit, stable 413 errors, and scanner timeout contract tests.

### GAP-035: Production Cookie, CORS, And Browser Auth Smoke Deferred

Severity: Medium
Area: Auth/session operations
Current state: PLAN_M14 wired configurable `Secure` session cookies through `PURESOC_AUTH_COOKIE_SECURE` / `AUTH_COOKIE_SECURE`, while preserving the development default. The current API harness does not yet prove deployed TLS, CORS, SameSite behavior, reverse-proxy headers, or cookie clearing across real browser navigation.
Impact: A misconfigured production deployment could issue session cookies without the expected browser protections or allow unintended cross-origin credentialed requests. Contract tests cover cookie attribute emission, not full browser/runtime behavior.
Next action: Add a deployed/browser smoke that verifies `Secure`, `HttpOnly`, `SameSite`, logout clearing, expected origin/CORS policy, forwarded IP handling, and OIDC callback cookies in SaaS and in-a-box profiles.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open

### GAP-036: Prisma Runtime Mode Still Has Memory-Backed Contexts

Severity: High
Area: Runtime persistence
Current state: PLAN_M18 adds `PURESOC_PERSISTENCE_MODE=memory|prisma` and selects existing Prisma adapters for compliance results, evidence metadata/access logs, billing, regulatory sources, and remediation action metadata. Identity, local credentials, sessions, organizations, RBAC bindings, audit sink, provider connections/telemetry, stored analysis/report records, dashboard snapshots, and OIDC transient state remain memory-backed even in Prisma mode because no production adapters exist yet.
Impact: Prisma mode is now honest and partially persistent, but a deployed API can still lose critical runtime state on restart and cannot yet claim full database-backed operation.
Next action: Add Prisma-backed adapters and organization-scoped tests for identity/session/organization/RBAC, audit logs, provider telemetry, stored analysis/generated reports/dashboard snapshots, and OIDC transient state, or intentionally split those into separate follow-up milestones.
Owner: Codex/DevOps
Target phase: Phase K runtime persistence
Status: Open; created 2026-05-01 by PLAN_M18.

### GAP-037: Worker, Scheduler, And Connector Runner Process Loops Missing

Severity: High
Area: Job runtime
Current state: PLAN_M19 added `@puresoc/jobs` with a typed job registry, dispatch results, failure/retry metadata, idempotency hooks, deterministic in-memory queue/runner, graceful shutdown behavior, and a BullMQ-ready adapter boundary. Worker, scheduler, and connector-runner entrypoints now start runtime loops. Scheduler can enqueue `regulatory.monitorCountrySources` under explicit config without auto-activating legal logic. Worker validates remediation safety metadata only. Connector-runner executes `provider.sync` read-only and rejects non-read-only payloads. Live Redis/BullMQ queue calls are intentionally not implemented.
Impact: Docker job roles now execute implemented runtime loops for the current contract harness, but scheduled/regulatory jobs, billing reconciliation, connector sync dispatch, and future remediation execution are not durable across restarts until Redis/BullMQ-backed queue operation is wired and smoke-tested.
Next action: Add a live Redis/BullMQ adapter implementation and bounded Compose smoke for enqueue/claim/complete/retry/shutdown across worker, scheduler, and connector-runner; keep provider write execution disabled until GAP-030 is satisfied.
Owner: Codex/DevOps
Target phase: Phase K runtime orchestration
Status: Open but narrowed 2026-05-01 by PLAN_M19 for typed runtime loops, in-memory harness, idempotency/retry metadata, graceful shutdown tests, and BullMQ-ready boundary. Live Redis/BullMQ durability remains deferred.

### GAP-023: Compliance Evaluator Can Hide Legal-Review Warnings Or Pass Without Signal

Severity: High
Area: Compliance engine correctness
Current state: PLAN_M2 corrected `requires_legal_review` warning semantics and added provider-signal pending handling so provider-mapped controls cannot pass from silence. Completed manual fallback with evidence remains an explicit pass path. Regression tests cover legal-review warnings, no-signal provider-mapped controls, and manual fallback behavior.
Impact: The evaluator now preserves regulatory-review uncertainty and avoids false readiness from missing provider signals in the current in-memory compliance flow.
Next action: Keep expanding evaluator signal semantics during Prompt 2/Prompt 3 persistence alignment, especially if provider capability/module status becomes a persisted input.
Owner: Codex
Target phase: Phase H hardening
Status: Resolved 2026-04-30 for PLAN_M2 evaluator semantics; persisted provider capability signal modeling remains future refinement.

### GAP-024: Compliance And Recommendation Routes Need Typed Validation And Audit Coverage

Severity: High
Area: API security/compliance audit
Current state: PLAN_M2 added hand-written request parsers for compliance evaluation and recommendation generation, removed unsafe casts on evidence/manual/country-pack/gap inputs, rejects mismatched recommendation gap organization IDs, returns `200` for synchronous evaluation, and audits `compliance.assessment.evaluated` plus `compliance.recommendations.generated` with actor, organization, assessment, and count summaries.
Impact: Invalid or cross-organization request data is rejected before domain generation, and sensitive compliance analysis events now appear in the audit trail.
Next action: Keep using the M2 validation helpers until Prompt 4 consolidates workspace imports/shared type boundaries or a later API contract pass introduces a validation library.
Owner: Codex
Target phase: Phase H hardening
Status: Resolved 2026-04-30 for PLAN_M2 route validation and audit coverage.

### GAP-025: Workspace Import Boundaries And Shared Type Contracts Need Consolidation

Severity: Medium
Area: Developer platform/domain boundaries
Current state: PLAN_M5 switched cross-package imports to `@puresoc/*` package exports, added workspace dependencies for package consumers, moved cross-package integration tests to root `code/tests` to avoid package dependency cycles, and expanded `code/scripts/check-layout.mjs` to reject cross-package deep relative imports, deep `@puresoc/*/src` imports, and missing workspace dependency declarations. Shared source-reference, confidence, recommendation summary, and provider-finding-for-compliance contracts now live in `@puresoc/shared`, and compliance-core no longer imports provider-core types.
Impact: Package export boundaries are now enforced by `pnpm lint`, type drift is reduced for the shared analysis/output contracts touched by M5, and future package-boundary regressions should fail before tests run.
Next action: Keep the layout guard in the standard lint gate and add new shared contracts only when they remove concrete duplication without introducing circular dependencies.
Owner: Codex
Target phase: Platform hardening
Status: Resolved 2026-04-30 for PLAN_M5 workspace import policy and shared type boundary enforcement.
