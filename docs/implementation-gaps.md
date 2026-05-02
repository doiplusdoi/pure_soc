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
Current state: ADR-009 records the permission-bundle strategy and read-only-first boundary. Phase G validated the initial read-only V1 bundle mapping against Microsoft Learn on 2026-04-28. PLAN_M12 revalidated Microsoft Learn on 2026-04-30 and updated `docs/microsoft365-permissions.md`: `m365_read_baseline` now includes `Policy.Read.All` and `AuditLog.Read.All`; `m365_security_read` now includes `SecurityAlert.Read.All`; fixture-backed modules now cover Conditional Access policies, Entra directory audit logs, Entra sign-in logs, Secure Score, Defender XDR incidents, and Defender XDR alerts. Write bundles remain disabled and separate. PLAN_M42 adds Microsoft 365 read-only external-smoke readiness metadata, disabled write-bundle reporting, missing client/tenant prerequisite blockers, and live-candidate/disposable guardrails without calling Microsoft Graph.
Impact: First onboarding still uses named read-only bundles, tracks granted permissions, and degrades missing permissions, missing licenses, unsupported APIs, China-cloud unsupported Graph security paths, throttling, revoked consent, and connector errors through module status instead of failing the full connection. Exchange, SharePoint, Teams, Purview, app permission-grant introspection, sovereign-cloud base URL selection, and live customer-tenant smoke remain deferred. Operators can now see whether a disposable Microsoft 365 read-only smoke is configured, blocked, unsafe, or ready before any live call is attempted.
Next action: Before production enablement, run a guarded live tenant smoke for each enabled read module against a disposable/test tenant selected from the readiness matrix, validate real service-plan/license detection for Defender XDR and Intune, configure sovereign-cloud Graph base URLs, and keep `docs/microsoft365-permissions.md` current before adding any write/remediation bundle.
Owner: Codex
Target phase: Phase G
Status: Resolved 2026-04-30 for PLAN_M12 read-only module permission revalidation and fixture-backed expansion; deferred Microsoft API/runtime limitations remain documented; narrowed 2026-05-02 by PLAN_M42 for read-only external-smoke readiness metadata and opt-in/disposable guardrails without live Graph calls.

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
Current state: PLAN_M4 validates the Prisma schema, generates the Prisma client, generates the initial migration SQL, and tests the compliance-result repository through a deterministic fake Prisma delegate boundary. PLAN_M18 adds `PURESOC_PERSISTENCE_MODE=prisma`, shares one Prisma client boundary from `@puresoc/database`, and selects existing Prisma adapters for compliance results, evidence metadata/access logs, billing, regulatory sources, and remediation action metadata. PLAN_M30 adds the `oidc_authorization_states` migration metadata and Prisma adapter tests. PLAN_M31 adds `pnpm prisma:smoke:postgres`, which validates a disposable `DATABASE_URL`, runs checked-in `prisma migrate deploy`, regenerates the Prisma client, and performs representative real CRUD against a live PostgreSQL database through the existing Prisma repository boundaries for identity/session/org/RBAC, audit, OIDC transient state, provider telemetry, compliance output, evidence metadata/access logs, billing, regulatory sources, remediation metadata, notification drafts, and stored outputs.
Impact: Runtime Prisma selection and checked-in migration order now have a bounded live PostgreSQL proof on a disposable database. Database-specific issues around basic SQL execution, enum/table/index creation, and representative transaction/upsert behavior are no longer untested at the project harness level.
Next action: Keep `pnpm prisma:smoke:postgres` available for disposable local/CI database runs and add it to external CI when CI service-container orchestration is selected. Production migration operations, backup/restore discipline, and deployment sequencing remain operational concerns outside this gap.
Owner: Codex/DevOps
Target phase: Phase K
Status: Resolved 2026-05-02 by PLAN_M31 for live PostgreSQL migration/apply and representative real-CRUD smoke on a disposable database.

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
Current state: PLAN_M7 added Stripe API request construction, raw-body webhook signature verification, idempotent billing event storage, subscription transition handling, entitlement recalculation, audit events, and a Prisma billing repository adapter. The implementation is covered with deterministic fake-client and API tests, not a live Stripe account or deployed webhook endpoint. PLAN_M42 adds Stripe test-mode external-smoke readiness metadata, missing secret blockers, placeholder price-ID blockers, live-key unsafe-target detection, and live-candidate/disposable guardrails without calling Stripe. PLAN_M43 adds `pnpm stripe:smoke:test-mode`, a dry-run-by-default Stripe test-mode smoke harness that first evaluates M42 readiness, reports planned customer/Checkout/Portal/webhook-signature operations and missing/configured variable names without live calls, refuses live execution unless readiness is `ready_for_disposable_smoke` plus disposable/test opt-ins are set, rejects `sk_live_*`, requires `sk_test_*`, and keeps Stripe secret values, webhook secrets, Checkout/Portal URLs, and full Stripe object IDs out of output.
Impact: Contract behavior is tested, and operators can now tell whether a Stripe test-mode smoke is not configured, blocked, unsafe, dry-run planned, or ready to execute against an explicitly confirmed disposable/test account. The command shape for creating a synthetic Stripe test-mode customer, Checkout Session, Customer Portal Session, and local webhook-signature verification now exists, but no real Stripe test account or webhook delivery was exercised in M43. Production-specific risks remain around real Stripe portal configuration, endpoint registration, tax/customer settings, webhook retry ordering, scheduled `stripe.syncCustomer`, `stripe.syncSubscription`, and `stripe.reconcileEntitlements` jobs, and live database migration/apply execution.
Next action: Before production billing activation, run the guarded Stripe test-mode smoke with real disposable/test credentials and real webhook delivery selected from the readiness matrix, add worker/scheduler reconciliation jobs, document webhook endpoint operations and secret rotation, and add a live PostgreSQL billing persistence smoke test.
Owner: Codex/DevOps/Product
Target phase: Phase I/K
Status: Open; narrowed 2026-05-02 by PLAN_M42 for Stripe test-mode readiness metadata, blocker reporting, live-key unsafe detection, and opt-in/disposable guardrails without live Stripe calls; narrowed 2026-05-02 by PLAN_M43 for a dry-run-first Stripe test-mode smoke command, M42 readiness preflight reuse, `sk_test_*`/`sk_live_*` guardrails, sanitized output, and deterministic fake-client coverage without real Stripe calls or webhook delivery.

### GAP-029: Evidence Runtime Smoke, Browser PDF, CSV, And Binary Bundles Deferred

Severity: Medium
Area: Evidence/reporting runtime
Current state: PLAN_M8 added S3/MinIO-compatible object-storage and HTTP/mock/no-op scanner adapters, Prisma evidence metadata/access-log persistence, generated-report evidence artifacts, and deterministic report-renderer JSON/PDF artifacts. PLAN_M14 removed internal evidence `storageUri` values from evidence API upload/list/download responses and marks `storageUri` as sensitive for audit/response checks. PLAN_M42 adds object-storage/scanner and evidence/report external-smoke readiness metadata, missing S3/scanner prerequisite blockers, endpoint-class reporting without endpoint values, legal-caveat/generated-report evidence checks, and live-candidate/disposable guardrails without provisioning buckets, uploading files, calling scanners, or rendering browser PDFs. Validation uses fake fetches, mock scanners, in-memory API storage, deterministic renderer output, and Prisma schema/client generation, not live MinIO bucket provisioning, live scanner service calls, or browser-backed PDF rendering.
Impact: The contract surface is testable and production-shaped, object storage pointers now stay server-side at the API boundary, and operators can see whether storage/scanner/report smoke prerequisites are not configured, blocked, unsafe, or ready before live runtime calls. Deployed environments still need smoke coverage for bucket creation/permissions, scanner availability/fail-closed behavior, browser PDF fidelity, CSV export tables, and binary evidence-package assembly.
Next action: Add a guarded runtime smoke selected from the readiness matrix that provisions a disposable object-storage bucket, writes/reads an evidence artifact through MinIO/S3, calls the deployed scanner service, renders a browser-grade PDF through `puresoc-report-renderer`, and records report export metadata for CSV and binary evidence-package bundles.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open; narrowed 2026-05-02 by PLAN_M42 for object-storage/scanner/evidence/report readiness metadata, blocker reporting, endpoint/storage-pointer redaction, and opt-in/disposable guardrails without live storage/scanner/PDF calls.

### GAP-030: Live Remediation Worker And Provider Execution Deferred

Severity: High
Area: Remediation safety/runtime
Current state: PLAN_M9 added the recommendation-to-action safety foundation: action templates/runs, preflight, approval, pre/post snapshot metadata, verification, evidence links, action audit events, API routes, Prisma action repository metadata, and a future worker job contract. PLAN_M14 added an integrity check so action snapshots must reference the same provider connection as the action run. PLAN_M19 added a worker job-runtime loop that validates remediation job safety metadata and records retry/failure metadata through the shared job harness. PLAN_M35 adds a provider-neutral action executor boundary, a deterministic `@puresoc/provider-mock` fake executor, a Microsoft 365 disabled executor, and worker execution tests proving persisted preflight/approval/pre-state snapshot checks, provider write-enabled checks, queue/job idempotency, failure metadata, post-state snapshot/verification metadata, and audit redaction. Provider write execution remains disabled by default and no live Microsoft Graph write endpoint is called.
Impact: Future write actions now have an executable safety shape with fake/mock providers, but deployed environments still cannot safely execute customer-impacting provider changes. Runtime risks around production multi-process queue orchestration, live provider write-enabled checks against real tenant state, provider-specific rollback and verification, evidence artifact creation beyond metadata, and customer-facing enablement remain unresolved before any write-capable action can be enabled.
Next action: Before enabling any live provider write action, harden production `action-execution` queue orchestration under GAP-043, add provider-specific preflight/snapshot/apply/verify/evidence contracts for each action template, run live database/queue smoke for action execution, implement real rollback/verification runbooks, and keep Microsoft write scopes behind explicit separate consent and approval paths.
Owner: Codex/DevOps/Product
Target phase: Phase J/K
Status: Open; narrowed 2026-05-02 by PLAN_M35 for fake/mock provider action executor contracts, worker-side persisted safety checks, idempotency, failure/verification metadata, and redacted audit coverage without live provider writes.

### GAP-031: Served Web Runtime And Browser Screenshot Harness Deferred

Severity: Medium
Area: Frontend/runtime
Current state: PLAN_M10 added a deterministic operational console renderer, shared UI tokens/primitives, login form surface, and static `@ui-smoke` checks. PLAN_M39 replaces the static-only `@ui-smoke` command with a served local web/API smoke that starts real HTTP surfaces in memory mode, fetches the operational console and login routes, writes deterministic desktop/mobile HTML viewport snapshots under `/tmp/puresoc-ui-smoke-*`, checks responsive/no-obvious-overlap layout invariants, preserves the operational console design direction, and avoids live external integrations. PLAN_M40 adds `@browser-smoke`, a Firefox WebDriver BiDi harness that starts local web/API surfaces in memory mode, captures browser-generated PNG screenshots for dashboard desktop/mobile, login mobile, evidence desktop, and approvals desktop under `/tmp/puresoc-browser-smoke-*`, checks viewport/nonblank/readability/no-obvious-overlap/no-horizontal-overflow invariants in the browser DOM, and preserves the M39 HTTP fallback. The repository still does not include a served Next.js/React runtime or Playwright configuration, and it only proves the available Firefox browser path rather than a full browser matrix.
Impact: Source, caveat, responsive CSS, focus affordance, approval-state semantics, local web/API startup, deterministic viewport snapshots, Firefox PNG screenshots, and browser DOM layout invariants are testable without live external integrations. Cross-browser screenshot parity, pointer/keyboard traversal, screenshot diffing, and full served React/Next.js runtime behavior remain unproven.
Next action: Add Playwright or another approved browser matrix when browser binaries are available, cover Chromium/WebKit/Firefox where practical, add pointer/keyboard traversal and screenshot-diff thresholds for dashboard/gaps/evidence/approval/login flows, and wire a full served React/Next.js runtime only when product scope requires it.
Owner: Codex/Frontend
Target phase: Phase K
Status: Open; narrowed 2026-05-02 by PLAN_M39 for local served web/API startup, deterministic desktop/mobile HTML viewport snapshots, responsive/no-obvious-overlap assertions, and static operational-console design preservation without browser PNG screenshots; narrowed 2026-05-02 by PLAN_M40 for Firefox WebDriver BiDi browser PNG screenshots and browser DOM layout assertions without claiming cross-browser or full React/Next.js runtime coverage.

### GAP-032: Live OIDC Provider Registration And Callback Smoke Deferred

Severity: Medium
Area: Auth operations
Current state: PLAN_M11 added OIDC/social callback contracts, provider config validation, transient state/nonce/PKCE storage, JWKS ID-token verification support, GitHub OAuth profile/email lookup support, explicit account-link approval, session creation, and API tests with deterministic fake token/profile clients. PLAN_M30 persists OIDC transient callback state in Prisma mode with hashed state/nonce values and an encrypted PKCE verifier envelope. Defaults keep Microsoft Entra, Google, and GitHub sign-in disabled until provider credentials are configured. PLAN_M42 adds per-provider OIDC/social-login external-smoke readiness metadata, provider enablement/client secret/redirect blockers, transient-state production-safety issue reporting, and live-candidate/disposable guardrails without calling Microsoft, Google, or GitHub.
Impact: Contract behavior is covered, and operators can now see whether each provider callback smoke is not configured, blocked, unsafe, or ready for a disposable/test app before any live provider call. Deployed environments still need live Microsoft Entra, Google, and GitHub app registrations, exact redirect URI setup, JWKS/profile endpoint smoke tests, callback URL and SameSite cookie validation, provider secret rotation, and operational monitoring before customer-facing social login is enabled.
Next action: Add a guarded deployment smoke selected from the readiness matrix that exercises each configured provider in a test tenant/app, verifies callback cookies and audit events, and documents client secret/key rotation.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open; narrowed 2026-05-02 by PLAN_M42 for per-provider OIDC readiness metadata, blocker reporting, and opt-in/disposable guardrails without live OIDC/OAuth provider calls.

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
Current state: PLAN_M14 wired configurable `Secure` session cookies through `PURESOC_AUTH_COOKIE_SECURE` / `AUTH_COOKIE_SECURE`, while preserving the development default. PLAN_M20 added contract-level Origin/Referer allowlist checks for browser state-changing routes, with explicit webhook/OIDC/provider callback exemptions. PLAN_M39 adds a local served API/web smoke that verifies `HttpOnly`, `SameSite=Lax`, secure-cookie config on issued and cleared cookies, trusted-Origin acceptance, untrusted-Origin rejection, and OIDC/Microsoft provider callback Origin exemptions through local fetches without consuming live callback providers. PLAN_M40 adds a Firefox WebDriver BiDi browser smoke that uses a same-origin local auth proxy to verify real browser register/login/session/logout navigation, `document.cookie` cannot read the `HttpOnly` session token, WebDriver storage sees `HttpOnly`, `SameSite=lax`, and local HTTP `secure=false`, and logout removes the session cookie. Untrusted-Origin rejection and callback exemptions remain covered through deterministic local HTTP fallback because the API does not enable broad browser CORS. The current harness still does not prove deployed TLS, CORS, reverse-proxy headers, secure-cookie behavior over HTTPS, or OIDC callback cookies with live providers.
Impact: Local browser cookie-jar behavior, logout clearing, and local Origin middleware behavior now have deterministic served-runtime and Firefox browser coverage, but a misconfigured production deployment could still issue session cookies or CORS/proxy behavior differently behind TLS/ingress.
Next action: Add a deployed/browser smoke that verifies `Secure`, `HttpOnly`, `SameSite`, logout clearing, expected origin/CORS policy, forwarded IP handling, and OIDC callback cookies in SaaS and in-a-box profiles with real browser navigation over TLS.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open; narrowed 2026-05-01 by PLAN_M20 for contract-level Origin/Referer protection; narrowed 2026-05-02 by PLAN_M39 for local served API/web cookie, trusted-Origin, untrusted-Origin, and callback-exemption smoke coverage without deployed browser/TLS/proxy claims; narrowed 2026-05-02 by PLAN_M40 for Firefox browser cookie-jar/session/logout coverage with local HTTP fallback for untrusted-Origin and callback-exemption checks.

### GAP-036: Prisma Runtime Mode Still Has Memory-Backed Contexts

Severity: High
Area: Runtime persistence
Current state: PLAN_M18 adds `PURESOC_PERSISTENCE_MODE=memory|prisma` and selects existing Prisma adapters for compliance results, evidence metadata/access logs, billing, regulatory sources, and remediation action metadata. PLAN_M25 adds runtime selection for notification drafts, using the in-memory repository in memory mode and the Prisma notification-draft repository in Prisma mode. PLAN_M26 adds an output repository boundary with memory and Prisma adapters for stored analysis records, generated report metadata, and dashboard snapshots; Prisma mode now marks `stored_analysis_reports_dashboards` as persisted. PLAN_M27 adds a Prisma identity/session/organization/RBAC adapter, wires API auth/org services and RBAC guards through the selected runtime repository, and marks `identity_sessions_organizations_rbac` as persisted in Prisma mode. PLAN_M28 adds a Prisma audit sink selected in Prisma mode, persists redacted audit payloads and hash-chain metadata, and marks `audit_logs` as persisted. PLAN_M29 adds `PrismaProviderResourceStore`, wires API provider connection/Microsoft connection/compliance inputs through the runtime-selected provider store, and marks `provider_connections_and_telemetry` as persisted in Prisma mode. PLAN_M30 adds `PrismaOidcAuthorizationStateStore`, wires OIDC begin/callback flows through the runtime-selected authorization-state store, stores state/nonce hashes with protected PKCE verifier envelopes, and marks `oidc_transient_state` as persisted in Prisma mode.
Impact: Prisma mode now has explicit adapters for the API runtime repository contexts that were previously tracked here. A deployed API should no longer lose pending OIDC/social-login callback state solely because the process restarts, but live database migration/apply behavior remains unproven until GAP-026 is completed.
Next action: Treat API runtime repository-selection coverage as complete for this gap. Use GAP-026 for live PostgreSQL migration/apply smoke and the runtime-specific gaps for Redis/BullMQ, audit WORM/export, KMS/key rotation, browser smoke, and live provider/OIDC operations.
Owner: Codex/DevOps
Target phase: Phase K runtime persistence
Status: Resolved 2026-05-02 by PLAN_M30 for the tracked API runtime repository contexts. Live PostgreSQL migration/apply smoke remains open under GAP-026.

### GAP-037: Worker, Scheduler, And Connector Runner Process Loops Missing

Severity: High
Area: Job runtime
Current state: PLAN_M19 added `@puresoc/jobs` with a typed job registry, dispatch results, failure/retry metadata, idempotency hooks, deterministic in-memory queue/runner, graceful shutdown behavior, and a BullMQ-ready adapter boundary. Worker, scheduler, and connector-runner entrypoints now start runtime loops. Scheduler can enqueue `regulatory.monitorCountrySources` under explicit config without auto-activating legal logic. Worker validates remediation safety metadata only. Connector-runner executes `provider.sync` read-only and rejects non-read-only payloads. PLAN_M32 replaced the placeholder boundary with an opt-in Redis-backed adapter under `PURESOC_JOB_QUEUE_PROVIDER=bullmq`, added `pnpm jobs:smoke:redis`, and proved enqueue, duplicate idempotency, claim, complete, retry/failure metadata, graceful shutdown, worker remediation safety-validation metadata, scheduler regulatory monitor dispatch with a fake metadata client, and connector-runner read-only provider sync against a disposable Redis container.
Impact: The bounded live Redis queue durability gap is resolved for the current job-runtime contract without changing the deterministic memory default or enabling provider writes. Production-grade multi-process BullMQ worker orchestration, queue retention/observability, and long-running deployed loop smoke remain separate release-hardening work.
Next action: Use GAP-043 for production queue orchestration hardening. Keep provider write execution disabled until GAP-030 is satisfied.
Owner: Codex/DevOps
Target phase: Phase K runtime orchestration
Status: Resolved 2026-05-02 by PLAN_M32 for bounded live Redis queue adapter and durability smoke while preserving memory mode and no-provider-write constraints.

### GAP-038: Distributed Rate Limiting, Proxy-Aware IP Trust, And Strict CSRF Tokens Deferred

Severity: Medium
Area: API security/runtime
Current state: PLAN_M20 added a shared API middleware layer for the existing `node:http` server, route-family classification, trusted-Origin/Referer checks for state-changing browser routes, explicit non-browser callback/webhook exemptions, and configurable in-memory fixed-window rate limits keyed by unauthenticated IP or authenticated user/organization. The limiter is deterministic and contract-tested, but it is process-local. The middleware continues to rely on the existing request-context IP extraction and does not introduce a CSRF token or reverse-proxy trust policy.
Impact: A multi-process or multi-container deployment would not share rate-limit counters, reverse-proxy forwarding headers could be trusted incorrectly if ingress is misconfigured, and strict CSRF-token coverage is not yet available for the future served browser runtime.
Next action: Before production internet exposure, add a Redis/BullMQ or dedicated shared rate-limit store, define a trusted-proxy/client-IP policy, decide whether browser routes require Origin/Referer headers strictly or a double-submit CSRF token, and cover the behavior in deployed browser/API smoke tests.
Owner: Codex/DevOps/Security
Target phase: Phase K
Status: Open; created 2026-05-01 by PLAN_M20.

### GAP-039: Audit WORM Storage, External Signing, And Retention Export Deferred

Severity: Medium
Area: Audit integrity/runtime
Current state: PLAN_M21 added package-level audit integrity metadata: `previousHash`, `entryHash`, `hashAlgorithm`, and a redacted canonical payload. `AuditWriter` chains entries by organization/global scope, `InMemoryAuditSink` exposes verification helpers, and Prisma audit metadata columns/migration exist. PLAN_M28 adds a Prisma audit sink that stores redacted canonical payloads and hash metadata in `AuditLog`, loads the latest per-organization/global anchor before appending, uses an in-process anchor for same-process writes, and is selected by API Prisma mode. PLAN_M33 adds explicit audit export/checkpoint contracts, deterministic exported-segment verification for intact chains, missing rows, tampered payloads, broken previous-hash links, and wrong terminal checkpoints, memory and Prisma checkpoint repositories, an `audit_checkpoints` table/migration, and organization-scoped audit export/checkpoint API routes that return explicit non-WORM/non-notarized guarantees. PLAN_M37 adds audit retention/export policy metadata, a `none` external checkpoint provider, a deterministic test-only `fake-local` provider, persisted provider/status/local-anchor metadata on checkpoints, config defaults/env overrides, API exposure, and secret-free tests without live external calls. PLAN_M41 adds explicit audit export handoff metadata on export segments and checkpoints for `database_only`, `worm_export_pending`, `externally_anchored`, and `external_anchor_failed` states, records failed-anchor checkpoints with generic secret-free failure metadata, preserves non-WORM/non-notarized guarantees, and documents operator-owned immutable export/signing/legal-hold/alerting responsibilities.
Impact: Audit entries now persist in Prisma mode with tamper-evident hash metadata, and operators can export and checkpoint redacted chain segments with terminal hashes, retention-policy metadata, explicit external-anchor provider status, and deterministic handoff/runbook state. This is still not append-only storage. A database administrator or full storage compromise could rewrite all rows and recompute hashes, delete the final row in a chain and its database-only checkpoint, bypass retention/export expectations, or replace the database-only/fake/failed anchor metadata unless a real external anchor or immutable export exists. Concurrent multi-process append ordering is not hardened beyond deterministic contract coverage.
Next action: Before production auditability claims, design and implement transaction/concurrency semantics for persisted audit chaining, optional WORM/object-storage export writers, real external signing or notarized checkpoints, checkpoint export/retention operations, legal-hold/deletion procedures, and operational verification/alerting.
Owner: Codex/DevOps/Security
Target phase: Phase K
Status: Open; created 2026-05-01 by PLAN_M21; narrowed 2026-05-02 by PLAN_M28 for persisted audit sink/hash-chain adapter coverage; narrowed 2026-05-02 by PLAN_M33 for explicit export/checkpoint contracts, database-only checkpoint persistence, and organization-scoped API routes without WORM or external signing claims; narrowed 2026-05-02 by PLAN_M37 for retention/export policy metadata and deterministic none/fake external-anchor contracts without WORM, notarization, or legal certification claims; narrowed 2026-05-02 by PLAN_M41 for explicit audit export handoff states, failed-anchor checkpoint preservation, and operator-owned immutable/export/signing responsibility metadata without live WORM or external-anchor claims.

### GAP-040: Provider Token KMS Custody And Live Rotation Smoke Deferred

Severity: Medium
Area: Provider connector/security runtime
Current state: PLAN_M21 added provider-token key IDs and previous-key decrypt support for the Microsoft 365 local token cipher, config defaults/env overrides for `PURESOC_PROVIDER_TOKEN_KEY_ID`, `PURESOC_PROVIDER_TOKEN_KEY`, and `PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS`, production startup validation for unsafe local-dev keys, and deterministic active/previous/legacy decrypt tests. PLAN_M34 adds an explicit `local-env-key-ring` key-provider/custody boundary for Microsoft 365 token encryption, redacted custody summaries, config validation for unsupported custody providers and duplicate/reused key material, and `pnpm provider-token:smoke`, a local/disposable smoke proving active-key encrypt/decrypt, previous-key decrypt, bad-key failure, secret-free output, and production rejection of checked-in local-dev active/previous provider-token keys. PLAN_M38 adds secret-free custody capability/status metadata, deterministic test-only `fake-secret-manager-test` provider behavior for active/previous lookup, key-version metadata and missing-key failure, runtime/config selection through the API service factory, rotation/backfill runbook metadata, production rejection of the fake provider, and an expanded provider-token custody smoke. Provider write execution remains disabled.
Impact: The checked-in local-dev key is no longer acceptable for production startup, staged rotation is modeled in code, fake secret-manager custody contracts can be tested deterministically without live services, and operator rotation/backfill expectations are captured as metadata. Production key custody is still environment-variable/local key-ring based unless a deployment layer injects secrets, and the running API process can still access plaintext key material. There is no real KMS/secret-manager adapter, deployed KMS-backed rotation smoke, ciphertext backfill/re-encryption execution, key retirement automation, custody access logging, or production rollback exercise.
Next action: Before production customer-provider onboarding, select the SaaS/in-a-box key custody model, add real KMS/secret-manager adapter boundaries where required, run a deployed rotation smoke against the selected custody backend, implement ciphertext backfill/re-encryption with rollback guidance, define access logging/incident response, and execute operator rotation/backout steps in a non-production deployment.
Owner: Codex/DevOps/Security
Target phase: Phase K
Status: Open; created 2026-05-01 by PLAN_M21; narrowed 2026-05-02 by PLAN_M34 for explicit local key-provider custody, local/disposable rotation smoke, and stricter key-ring validation without claiming KMS/secret-manager custody; narrowed 2026-05-02 by PLAN_M38 for custody capability/status metadata, deterministic fake secret-manager contracts, rotation/backfill runbook metadata, and production fake-provider rejection without live custody claims.

### GAP-041: Drift Detection Coverage Is Deliberately Selected, Not Exhaustive

Severity: Medium
Area: Database/regulatory data quality
Current state: PLAN_M22 added deterministic drift checks to `pnpm lint`. PLAN_M23 expanded the selected schema drift map to include generic `NotificationDraft` and `RoNis2NotificationDraft` table fields after ADR-016 chose generic notification-draft envelopes with Romania compatibility/workflow companions. PLAN_M24 added deterministic payload-envelope semantic validation in the country-pack core contract and repository write-time validation for generic notification draft persistence. PLAN_M25 added runtime API tests for generic notification-draft create/read/list semantics, Romania companion-link creation, invalid-envelope rejection, and organization scoping. PLAN_M26 added deterministic output repository tests for stored analysis, generated report metadata, dashboard snapshots, latest-snapshot reads, checklist-preserving stored-analysis upserts, and cross-organization rejection. PLAN_M27 added deterministic fake-Prisma and API runtime coverage for identity/session/organization/RBAC persistence, provider-subject uniqueness, session revocation, member listing, RBAC scoping, and cross-organization rejection. PLAN_M28 added deterministic fake-Prisma and API runtime coverage for audit-log persistence, redacted payload storage, organization/global anchors, hash metadata, and Prisma-mode auth/org audit writes. PLAN_M29 expanded the selected schema drift map to provider connection, credential, permission bundle, capability, sync run, and sync module models, added provider telemetry contract fields for credential provider key, finding resource identity, and recommendation source finding key, and added deterministic fake-Prisma/API coverage for provider-store persistence semantics. PLAN_M30 adds selected drift coverage and deterministic repository/API tests for OIDC transient authorization state. PLAN_M33 adds selected drift coverage for `AuditCheckpoint`, and PLAN_M37 expands it for retention policy plus external-anchor metadata fields. The schema check now covers 29 high-risk persisted models and 438 fields, and the generated-data check covers `ro-nis2.seed.generated.json` and `ro-nis2-source-map.generated.json` against importer output.
Impact: REC-110, REC-112, and REC-113 are narrowed for the named high-risk surfaces, notification envelope shape/caveat/source-map semantics are covered by deterministic tests, and the stored output, identity/org/RBAC, audit sink/checkpoint export, provider telemetry, and OIDC transient-state adapter paths have repository/runtime coverage. Lower-risk or less mature persisted models can still drift silently. Excluded surfaces include checklist/risk-acceptance tables, evidence links/report exports/dashboard widgets, Romania onboarding/classification persistence tables, billing customers, regulatory source/source-map/decision tables, and the generated Romania import report artifact.
Next action: Expand the drift maps as each excluded surface receives production adapters or customer-facing workflows; add lint-gated fixture checks for notification envelope examples if customer-facing payload schemas broaden beyond the current deterministic unit/repository coverage; decide whether `ro-nis2-import-report.generated.json` should become a lint-gated artifact or remain a diagnostic output.
Owner: Codex
Target phase: Phase K/data-quality hardening
Status: Open; created 2026-05-01 by PLAN_M22, narrowed 2026-05-01 by PLAN_M23 for notification draft table field drift, narrowed 2026-05-01 by PLAN_M24 for payload-envelope semantic validation, narrowed 2026-05-01 by PLAN_M25 for runtime notification-draft API semantics, narrowed 2026-05-02 by PLAN_M26 for output repository runtime semantics, narrowed 2026-05-02 by PLAN_M27 for identity/session/organization/RBAC repository and API runtime semantics, narrowed 2026-05-02 by PLAN_M28 for audit sink repository and API runtime semantics, narrowed 2026-05-02 by PLAN_M29 for provider resource store repository/API runtime semantics and selected provider schema drift coverage, narrowed 2026-05-02 by PLAN_M30 for OIDC transient authorization-state schema/repository/API runtime semantics, narrowed 2026-05-02 by PLAN_M33 for audit checkpoint schema/repository/API runtime semantics, and narrowed 2026-05-02 by PLAN_M37 for audit checkpoint retention/external-anchor metadata drift coverage.

### GAP-042: Romanian Product Copy, Message Catalog Runtime, And Notification Draft Migration Deferred

Severity: Medium
Area: i18n/country-pack notifications
Current state: PLAN_M23 added ADR-016, shared locale/legal-caveat fallback contracts, country-pack notification envelope helpers, Romania notification label message keys, report legal-caveat locale metadata, and selected notification draft table drift coverage. PLAN_M24 added a generic notification envelope parser/validator, a Romania generic envelope builder alongside the compatibility draft JSON, API response coverage for the generic envelope, and a Prisma-boundary notification draft repository that persists generic `NotificationDraft.payloadJson` envelopes plus Romania companion links with organization-scoped tests. PLAN_M25 added an in-memory repository, API runtime repository selection, org-scoped generic notification-draft create/read/list routes, Romania companion-link creation for RO registration envelopes, and a deterministic Romania backfill helper that converts only source-mapped/caveat-valid legacy payloads while marking non-convertible payloads `manual_review_required`. Supported contract locales are `en` and `ro`, but only the English legal caveat is active. Romania legal-caveat copy, a broader message catalog, served frontend i18n wiring, runtime report/UI consumers of the message catalog, and live/batch migration execution remain deferred.
Impact: Reports and drafts now expose fallback state instead of silently pretending Romanian product copy exists, future country packs have a generic draft direction, and new generic notification draft writes have tested persistence and API boundaries. Customer-facing Romanian UI/export copy will still be mixed-language until product/legal approves Romanian product text and the runtime consumes the message catalog. Existing Romania companion rows can be evaluated deterministically for conversion readiness, but no live data migration has been run.
Next action: Add product/legal-approved Romanian caveat/message entries when available, wire report/UI consumers to the catalog after approved copy exists, and decide whether the Romania backfill helper is run lazily or through a reviewed batch migration.
Owner: Codex/Product/legal
Target phase: Phase K/i18n and country-pack export hardening
Status: Open; created 2026-05-01 by PLAN_M23, narrowed 2026-05-01 by PLAN_M24 for generic envelope validation, Romania envelope generation, and Prisma-boundary notification draft persistence, and narrowed 2026-05-01 by PLAN_M25 for runtime persistence routes and deterministic Romania backfill posture.

### GAP-043: Production Queue Orchestration And Multi-Process BullMQ Hardening Deferred

Severity: Medium
Area: Job runtime/operations
Current state: PLAN_M32 added an opt-in Redis-backed adapter under the existing `bullmq` queue-provider boundary and a disposable live Redis smoke for bounded queue durability. PLAN_M36 hardens the current adapter with per-job claim locks, bounded Redis command retry/backoff, explicit stale-running recovery and terminal cleanup hooks, queue metadata/failure-detail redaction, job Redis config defaults/env overrides, deterministic contention/recovery/cleanup/retry tests, and an extended disposable Redis smoke proving competing worker runtime instances claim only one shared job while scheduler and connector-runner still use fake/read-only jobs.
Impact: Normal duplicate-claim races are now covered by deterministic and disposable Redis tests, and retention/recovery behavior is explicit instead of implicit. Production queue operations still depend on operator-owned Redis durability, eviction policy, metrics/alerts, cleanup cadence, recovery thresholds, and deployed long-running multi-container behavior.
Next action: Before relying on Redis queues for production remediation or high-volume provider sync, add a multi-container Compose or CI smoke with independently started worker/scheduler/connector-runner processes, define queue metrics/alerts and cleanup scheduling, tune stale-running recovery thresholds per job family, document Redis persistence/eviction requirements, and revisit whether the current minimal Redis adapter should be replaced by or wrapped with a full BullMQ worker implementation.
Owner: Codex/DevOps
Target phase: Phase K runtime orchestration
Status: Open; created 2026-05-02 by PLAN_M32 after the bounded live Redis smoke resolved GAP-037; narrowed 2026-05-02 by PLAN_M36 for claim-lock contention safety, bounded command retry, explicit recovery/retention hooks, queue redaction, and disposable Redis smoke coverage without claiming deployed production orchestration readiness.

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
