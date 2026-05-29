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
Current state: Product caveat is defined, ADR-011 records the source activation lifecycle, and PLAN_M6 added repository-backed regulatory source versions, validation reports, source maps, review tasks, review decisions, activation timestamps, supersession links, API routes, and `regulatory_admin` authorization. Changed Romania and future country-pack legal logic now remains `review_required` until reviewed and activated. PLAN_M73 defines the app-side legal review SOP checklist: regulatory owner, technical importer owner, product owner, legal reviewer/delegated Romanian counsel, required workbook/import-report/source-map/caveat evidence, approval delegation, escalation, audited activation, and supersession/rollback expectations.
Impact: Technical activation guardrails and a draft operating procedure exist, but incorrect national guidance could still create commercial and customer risk if real reviewer ownership, approved legal/product procedures, evidence standards, and activation UI/operations are not in place before production activation.
Next action: Product/legal must assign reviewers, approve the SOP, define activation delegation, and verify the activation UI/operations path before production use of source-derived Romania country-pack or control changes.
Owner: Product/legal
Target phase: Phase D and Phase K
Status: Open; narrowed 2026-05-04 by PLAN_M73 for reviewer roles, review evidence, approval delegation, escalation, audited activation, and supersession/rollback SOP without legal activation or approved Romanian legal copy; preserved 2026-05-04 by PLAN_M78 because the local workflow keeps Romania country-pack logic review-required and does not activate legal/regulatory copy.

### GAP-007: Microsoft Graph Permission Bundle Details Need Validation

Severity: Medium
Area: Microsoft connector
Current state: ADR-009 records the permission-bundle strategy and read-only-first boundary. Phase G validated the initial read-only V1 bundle mapping against Microsoft Learn on 2026-04-28. PLAN_M12 revalidated Microsoft Learn on 2026-04-30 and updated `docs/microsoft365-permissions.md`: `m365_read_baseline` now includes `Policy.Read.All` and `AuditLog.Read.All`; `m365_security_read` now includes `SecurityAlert.Read.All`; fixture-backed modules now cover Conditional Access policies, Entra directory audit logs, Entra sign-in logs, Secure Score, Defender XDR incidents, and Defender XDR alerts. Write bundles remain disabled and separate. PLAN_M42 adds Microsoft 365 read-only external-smoke readiness metadata, disabled write-bundle reporting, missing client/tenant prerequisite blockers, and live-candidate/disposable guardrails without calling Microsoft Graph. PLAN_M45 adds `pnpm microsoft365:smoke:read-only`, a dry-run-by-default Microsoft 365 read-only smoke harness that first evaluates M42 readiness, reports planned app-only token, encrypted credential-envelope, provider-neutral storage, and read-only Graph module operations without live calls, and refuses live/disposable execution unless readiness is `ready_for_disposable_smoke` plus disposable/test opt-ins are set. PLAN_M77 records the outside-app disposable tenant checklist: test tenant, app registration, read-only admin consent, known license/service-plan state, selector-first execution, module degradation expectations, and no Graph write scopes.
Impact: First onboarding still uses named read-only bundles, tracks granted permissions, and degrades missing permissions, missing licenses, unsupported APIs, China-cloud unsupported Graph security paths, throttling, revoked consent, and connector errors through module status instead of failing the full connection. Exchange, SharePoint, Teams, Purview, app permission-grant introspection, sovereign-cloud base URL selection, and approved live customer-tenant smoke remain deferred. Operators can now see whether a disposable Microsoft 365 read-only smoke is configured, blocked, unsafe, dry-run planned, or ready before any live call is attempted. The M45 command has deterministic fake-client coverage for token/Graph execution and redaction, but no approved disposable Microsoft 365 tenant was exercised.
Next action: Before production enablement, use the PLAN_M77 checklist to run `pnpm microsoft365:smoke:read-only` in guarded live-candidate mode against an approved disposable/test tenant selected from the readiness matrix, validate real service-plan/license detection for Defender XDR and Intune, configure sovereign-cloud Graph base URLs, and keep `docs/microsoft365-permissions.md` current before adding any write/remediation bundle.
Owner: Codex
Target phase: Phase G
Status: Resolved 2026-04-30 for PLAN_M12 read-only module permission revalidation and fixture-backed expansion; deferred Microsoft API/runtime limitations remain documented; narrowed 2026-05-02 by PLAN_M42 for read-only external-smoke readiness metadata and opt-in/disposable guardrails without live Graph calls; narrowed 2026-05-02 by PLAN_M45 for a dry-run-first Microsoft 365 read-only smoke command, M42 readiness preflight reuse, disabled write-bundle checks, sanitized output, and deterministic fake token/Graph coverage without approved live Microsoft Graph calls; narrowed 2026-05-04 by PLAN_M77 for a disposable tenant handoff checklist without live Graph calls, tenant consent, write scopes, or provider remediation.

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
Current state: PLAN_M7 added a billing provider abstraction, configurable placeholder Base/Pro/MSP plan entitlements, Stripe checkout/customer portal/webhook contracts, idempotent event handling, and `BILLING_PROVIDER=none` behavior. PLAN_M75 adds the product decision template for plan names, billing intervals, customer limits, feature entitlements, trial policy, upgrade/downgrade behavior, Stripe price mappings, portal policy, and launch support. Actual Stripe products, prices, packaging, customer limits, and paid feature policy are still not product-approved.
Impact: The billing foundation is executable and the missing product decisions are explicit, but checked-in plan names, price IDs, and entitlement bundles are implementation placeholders rather than commercial truth.
Next action: Product must complete and approve the billing decision template, provide Stripe test-mode and production price mappings, and confirm entitlement/downgrade/trial policy before production billing activation.
Owner: Product
Target phase: Phase I
Status: Open; narrowed 2026-05-04 by PLAN_M75 for a concrete billing product decision template without inventing production pricing or Stripe product truth.

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
Status: Open; preserved 2026-05-04 by PLAN_M78 because the local workflow labels results as `PureSOC internal readiness` and keeps scoring/calibration caveats visible without product/legal approval.

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
Current state: PLAN_M7 added Stripe API request construction, raw-body webhook signature verification, idempotent billing event storage, subscription transition handling, entitlement recalculation, audit events, and a Prisma billing repository adapter. The implementation is covered with deterministic fake-client and API tests, not a live Stripe account or deployed webhook endpoint. PLAN_M42 adds Stripe test-mode external-smoke readiness metadata, missing secret blockers, placeholder price-ID blockers, live-key unsafe-target detection, and live-candidate/disposable guardrails without calling Stripe. PLAN_M43 adds `pnpm stripe:smoke:test-mode`, a dry-run-by-default Stripe test-mode smoke harness that first evaluates M42 readiness, reports planned customer/Checkout/Portal/webhook-signature operations and missing/configured variable names without live calls, refuses live execution unless readiness is `ready_for_disposable_smoke` plus disposable/test opt-ins are set, rejects `sk_live_*`, requires `sk_test_*`, and keeps Stripe secret values, webhook secrets, Checkout/Portal URLs, and full Stripe object IDs out of output. PLAN_M72 records the outside-app Stripe test-mode handoff: disposable/test Stripe account, `sk_test_*` key, webhook secret, non-placeholder test price IDs, portal configuration, selector-first execution, and no live-key or production/customer targets.
Impact: Contract behavior is tested, and operators can now tell whether a Stripe test-mode smoke is not configured, blocked, unsafe, dry-run planned, or ready to execute against an explicitly confirmed disposable/test account. The command shape and operator checklist for creating a synthetic Stripe test-mode customer, Checkout Session, Customer Portal Session, and local webhook-signature verification now exist, but no real Stripe test account or webhook delivery was exercised in M43 or M72. Production-specific risks remain around real Stripe portal configuration, endpoint registration, tax/customer settings, webhook retry ordering, scheduled `stripe.syncCustomer`, `stripe.syncSubscription`, and `stripe.reconcileEntitlements` jobs, and live database migration/apply execution.
Next action: Before production billing activation, use the PLAN_M72 checklist to run the guarded Stripe test-mode smoke with real disposable/test credentials and real webhook delivery selected from the readiness matrix, add worker/scheduler reconciliation jobs, document webhook endpoint operations and secret rotation, and add a live PostgreSQL billing persistence smoke test.
Owner: Codex/DevOps/Product
Target phase: Phase I/K
Status: Open; narrowed 2026-05-02 by PLAN_M42 for Stripe test-mode readiness metadata, blocker reporting, live-key unsafe detection, and opt-in/disposable guardrails without live Stripe calls; narrowed 2026-05-02 by PLAN_M43 for a dry-run-first Stripe test-mode smoke command, M42 readiness preflight reuse, `sk_test_*`/`sk_live_*` guardrails, sanitized output, and deterministic fake-client coverage without real Stripe calls or webhook delivery; narrowed 2026-05-04 by PLAN_M72 for a concrete Stripe test-mode outside-app handoff without live Stripe calls or webhook delivery.

### GAP-029: Evidence Runtime Smoke, Browser PDF, CSV, And Binary Bundles Deferred

Severity: Medium
Area: Evidence/reporting runtime
Current state: PLAN_M8 added S3/MinIO-compatible object-storage and HTTP/mock/no-op scanner adapters, Prisma evidence metadata/access-log persistence, generated-report evidence artifacts, and deterministic report-renderer JSON/PDF artifacts. PLAN_M14 removed internal evidence `storageUri` values from evidence API upload/list/download responses and marks `storageUri` as sensitive for audit/response checks. PLAN_M42 adds object-storage/scanner and evidence/report external-smoke readiness metadata, missing S3/scanner prerequisite blockers, endpoint-class reporting without endpoint values, legal-caveat/generated-report evidence checks, and live-candidate/disposable guardrails without provisioning buckets, uploading files, calling scanners, or rendering browser PDFs. PLAN_M44 adds `pnpm evidence:smoke:runtime`, a dry-run-by-default evidence runtime smoke harness that first evaluates the M42 readiness matrix, reports planned object-storage write/read, HTTP upload-scanner, generated-report evidence, report-renderer, CSV metadata, and binary evidence-package metadata operations without live calls, and refuses live/disposable execution unless both storage/scanner and evidence/report readiness checks are ready with local/test/disposable target confirmation and per-path opt-ins. Deterministic tests use injected fake runtime fetches to exercise renderer -> scanner -> S3 put/read -> generated-report evidence metadata -> evidence access log while keeping endpoint URLs, credentials, storage URIs, object keys, uploaded bytes, and report bodies out of output. PLAN_M76 records the outside-app disposable evidence runtime checklist for MinIO/S3-compatible storage, scanner endpoint, report renderer, cleanup policy, generated-report evidence, access logs, CSV status, and binary bundle status. PLAN_M78 wires local authenticated evidence upload, generated-report metadata, internal readiness export, and Romania notification-draft export into the served Romania workflow using existing local/memory adapters and authenticated API routes. Default validation remains dry-run/local only and does not call live MinIO/S3, scanner, browser/PDF, or report-renderer services.
Impact: The contract surface is testable and production-shaped, object storage pointers now stay server-side at the API boundary, and operators can see whether storage/scanner/report smoke prerequisites are not configured, blocked, unsafe, dry-run planned, or ready before live runtime calls. The local Romania product path can attach local evidence and create report/export metadata without external storage or scanner dependencies. A guarded live-candidate command shape and operator checklist still exist for local/test/disposable storage, scanner, and renderer targets, including scanner fail-closed behavior and generated-report evidence metadata. Deployed environments still need approved live execution against real disposable services, bucket creation/permission coverage, browser-grade PDF fidelity, persisted CSV export tables, and binary evidence-package assembly beyond smoke metadata.
Next action: Use the PLAN_M76 checklist to run the guarded smoke against approved disposable MinIO/S3, scanner, and report-renderer targets, then add explicit bucket provisioning/permission checks, browser-backed PDF rendering coverage, persisted CSV export records, and real binary evidence-package assembly.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open; narrowed 2026-05-02 by PLAN_M42 for object-storage/scanner/evidence/report readiness metadata, blocker reporting, endpoint/storage-pointer redaction, and opt-in/disposable guardrails without live storage/scanner/PDF calls; narrowed 2026-05-02 by PLAN_M44 for a dry-run-first evidence runtime smoke command, M42 readiness preflight reuse, local/test/disposable endpoint guardrails, sanitized output, deterministic fake-runtime coverage of renderer/scanner/S3/evidence metadata/access logs, and scanner fail-closed behavior without approved live runtime service calls; narrowed 2026-05-04 by PLAN_M76 for a disposable evidence runtime handoff checklist without live storage, scanner, report-renderer, or browser/PDF calls; narrowed 2026-05-04 by PLAN_M78 for local authenticated evidence attachment and readiness/draft export metadata in the Romania workflow without external storage, scanner, browser PDF, CSV, or binary bundle completion.

### GAP-030: Live Remediation Worker And Provider Execution Deferred

Severity: High
Area: Remediation safety/runtime
Current state: PLAN_M9 added the recommendation-to-action safety foundation: action templates/runs, preflight, approval, pre/post snapshot metadata, verification, evidence links, action audit events, API routes, Prisma action repository metadata, and a future worker job contract. PLAN_M14 added an integrity check so action snapshots must reference the same provider connection as the action run. PLAN_M19 added a worker job-runtime loop that validates remediation job safety metadata and records retry/failure metadata through the shared job harness. PLAN_M35 adds a provider-neutral action executor boundary, a deterministic `@puresoc/provider-mock` fake executor, a Microsoft 365 disabled executor, and worker execution tests proving persisted preflight/approval/pre-state snapshot checks, provider write-enabled checks, queue/job idempotency, failure metadata, post-state snapshot/verification metadata, and audit redaction. PLAN_M55 adds organization-scoped action-run creation idempotency through a normalized `Idempotency-Key` header, memory and Prisma repository lookup, an optional `ProviderActionRun.idempotencyKey`, and a unique `(organizationId, idempotencyKey)` index. Provider write execution remains disabled by default and no live Microsoft Graph write endpoint is called.
Impact: Future write actions now have an executable safety shape with fake/mock providers, and retried action-run creation requests can no longer create duplicate rows when callers provide an idempotency key. Deployed environments still cannot safely execute customer-impacting provider changes. Runtime risks around production multi-process queue orchestration, live provider write-enabled checks against real tenant state, provider-specific rollback and verification, evidence artifact creation beyond metadata, and customer-facing enablement remain unresolved before any write-capable action can be enabled.
Next action: Before enabling any live provider write action, harden production `action-execution` queue orchestration under GAP-043, add provider-specific preflight/snapshot/apply/verify/evidence contracts for each action template, run live database/queue smoke for action execution with idempotency-key retry coverage, implement real rollback/verification runbooks, and keep Microsoft write scopes behind explicit separate consent and approval paths.
Owner: Codex/DevOps/Product
Target phase: Phase J/K
Status: Open; narrowed 2026-05-02 by PLAN_M35 for fake/mock provider action executor contracts, worker-side persisted safety checks, idempotency, failure/verification metadata, and redacted audit coverage without live provider writes; narrowed 2026-05-03 by PLAN_M55 for API/domain/repository action-run creation idempotency, organization-scoped key lookup, response redaction, Prisma field/index coverage, and deterministic tests without live provider writes; preserved 2026-05-04 by PLAN_M78 because the local product path shows provider-write execution disabled and does not add live remediation actions.

### GAP-031: Served Web Runtime And Browser Screenshot Harness Deferred

Severity: Medium
Area: Frontend/runtime
Current state: PLAN_M10 added a deterministic operational console renderer, shared UI tokens/primitives, login form surface, and static `@ui-smoke` checks. PLAN_M39 replaces the static-only `@ui-smoke` command with a served local web/API smoke that starts real HTTP surfaces in memory mode, fetches the operational console and login routes, writes deterministic desktop/mobile HTML viewport snapshots under `/tmp/puresoc-ui-smoke-*`, checks responsive/no-obvious-overlap layout invariants, preserves the operational console design direction, and avoids live external integrations. PLAN_M40 adds `@browser-smoke`, a Firefox WebDriver BiDi harness that starts local web/API surfaces in memory mode, captures browser-generated PNG screenshots for dashboard desktop/mobile, login mobile, evidence desktop, and approvals desktop under `/tmp/puresoc-browser-smoke-*`, checks viewport/nonblank/readability/no-obvious-overlap/no-horizontal-overflow invariants in the browser DOM, and preserves the M39 HTTP fallback. PLAN_M53 adds ADR-017 for current runtime stack deviations, adds API `GET /organizations/:orgId/dashboards/snapshots/latest`, and changes the served web runtime so login/logout/session proxy to the API, API session cookies are preserved through the web server, and the operational console renders from an organization-scoped latest dashboard snapshot instead of only the static demo model. `@ui-smoke` now seeds a local API user, organization, compliance evaluation, and dashboard snapshot, logs in through the web server, and asserts dashboard source metadata came from the API response. PLAN_M59 adds a served `GET /onboarding/romania` route linked from the operational console; it renders from existing Romania onboarding schema, classification, notification-draft, source-map, and message-catalog fallback contracts, explicitly states no DNSC submission, and avoids live external calls. PLAN_M60 adds that Romania route to the local served `@ui-smoke` traversal with `GET /onboarding/romania?locale=ro-RO`, route-specific source-map/caveat/fallback/unsupported/no-DNSC/responsive/focus assertions, and deterministic route desktop/mobile HTML snapshots under `/tmp/puresoc-ui-smoke-*`. PLAN_M61 adds that Romania route to the Firefox WebDriver BiDi `@browser-smoke` path, captures desktop/mobile route PNGs under `/tmp/puresoc-browser-smoke-*` when Firefox is available, and asserts route-specific source-map, caveat, fallback, unsupported-state, no-DNSC-submission, focus/readability, no-horizontal-overflow, and no-certification-claim browser DOM invariants. PLAN_M62 adds Firefox keyboard route traversal after local web login: Tab reaches the dashboard and Romania skip links, Enter activates the visible Romania onboarding navigation link and the Romania "Back to dashboard" link, and the smoke records URL changes, focus targets, route markers, no horizontal overflow, no certification claims, no direct DNSC submit command, and no-live-call posture. PLAN_M63 adds Firefox pointer route traversal after local web login: the smoke measures visible dashboard-to-Romania and Romania back-link bounds, clicks their centers with BiDi pointer actions, records URL changes/target bounds/route markers, and repeats no-overflow/no-certification/no-direct-DNSC/no-live-call assertions. PLAN_M64 adds visible served workspace selection after login: API `GET /organizations` lists the current user's memberships, API `POST /auth/session/active-organization` changes the session only after an active-membership check, web `GET /workspaces` and `POST /workspaces/select` render/select workspaces, `@ui-smoke` seeds two organizations and proves the selected dashboard snapshot, and `@browser-smoke` clicks a visible workspace control when Firefox is available. PLAN_M65 adds lightweight visual metrics thresholding to the existing Firefox captures and writes `/tmp/puresoc-browser-smoke-*/visual-metrics-manifest.json` with route id, viewport/PNG size, color-diversity, non-light, edge, luminance, dominant-color, and threshold result metadata for dashboard desktop/mobile, login mobile, evidence desktop, approval desktop, and Romania desktop/mobile screenshots. PLAN_M66 adds stable operational-console section anchor actions and Firefox workflow coverage after local login/workspace selection: the browser smoke activates dashboard, onboarding/country-pack, Microsoft 365, gaps, evidence/reports, and approval queue anchors through keyboard focus/Enter and visible pointer clicks, then records hashes, scroll positions, target bounds, route markers, readable section text, no-overflow/no-certification assertions, and no-live-call posture. PLAN_M67 makes the operational-console section screenshot artifacts anchor-driven: the Firefox smoke now captures dashboard, onboarding/country-pack, Microsoft 365, gaps, evidence/reports, and approval queue PNGs only after visible anchor activation, extends the visual metrics manifest to 10 captures, and records secret-free anchor action, hash/scroll, section id/title, readable text, bounds, route marker, and no-live-call metadata. PLAN_M68 adds `/tmp/puresoc-browser-smoke-*/browser-smoke-artifact-index.json` beside the visual metrics manifest when Firefox is available, summarizing screenshot files, visual metrics, M67 anchor-section captures, M66 keyboard/pointer anchor workflows, route traversal, browser auth/session status, passed checks, and no-live-call guarantees without embedding screenshot bytes, raw session values, secrets, provider payloads, object-storage URIs, external endpoint URLs, or full user emails. PLAN_M69 adds `/tmp/puresoc-ui-smoke-*/ui-smoke-artifact-index.json` for the deterministic served HTTP fallback path, summarizing dashboard/workspace/Romania HTML snapshot filenames, hashes, route metadata, API-backed dashboard source proof, auth/cookie/Origin/callback-exemption summaries, passed checks, and no-live-call guarantees without embedding HTML bodies, session cookies, raw emails, local port-bearing endpoint URLs, secrets, provider payloads, object-storage URIs, external URLs, or direct DNSC submission claims. PLAN_M78 turns the Romania route into an authenticated active-workspace workflow backed by saved organization onboarding answers, stored classification runs, notification drafts, local evidence/report/dashboard/billing-none/audit state, register/workspace creation forms, workflow POST actions, deterministic `@ui-smoke`, and Firefox `@browser-smoke` coverage without fabricated customer/provider data. The repository still does not include a full Next.js/React runtime or Playwright configuration, and it only proves the available Firefox browser path rather than a full browser matrix.
Impact: Source, caveat, responsive CSS, focus affordance, approval-state semantics, local web/API startup, authenticated web login/session proxying, organization-scoped dashboard snapshot rendering, authenticated workspace selection/creation, saved Romania onboarding/reopen/classify/draft/evaluate/evidence/report/audit workflow rendering, route-specific deterministic UI smoke snapshots plus a served HTTP artifact index, route-specific Firefox PNG screenshots, browser DOM layout invariants, Firefox keyboard plus pointer navigation between dashboard and Romania routes, visible local browser organization selection through active memberships, gross visual-regression thresholds for blank/wrong-size/missing-route/severe-collapse failures, broader Firefox keyboard/pointer section-anchor workflow coverage, and anchor-driven section screenshot artifacts are testable without live external integrations when Firefox/WebDriver BiDi is available. Cross-browser screenshot parity, committed golden-image/pixel-diff review, richer inline workflow error UX, and full served React/Next.js runtime behavior remain unproven.
Next action: Add Playwright or another approved browser matrix when browser binaries are available, cover Chromium/WebKit/Firefox where practical, and continue broadening served workflow coverage beyond local Firefox anchor-driven traversal and section screenshots without weakening the current local Firefox threshold manifest.
Owner: Codex/Frontend
Target phase: Phase K
Status: Open; narrowed 2026-05-02 by PLAN_M39 for local served web/API startup, deterministic desktop/mobile HTML viewport snapshots, responsive/no-obvious-overlap assertions, and static operational-console design preservation without browser PNG screenshots; narrowed 2026-05-02 by PLAN_M40 for Firefox WebDriver BiDi browser PNG screenshots and browser DOM layout assertions without claiming cross-browser or full React/Next.js runtime coverage; narrowed 2026-05-03 by PLAN_M53 for API-backed web login/session/dashboard rendering and ADR-017 stack-deviation documentation without claiming full Next.js/React, organization-selection, Romania onboarding, or cross-browser Playwright parity; narrowed 2026-05-03 by PLAN_M59 for a served Romania onboarding/readiness route, operational-console navigation link, source/caveat/fallback/no-DNSC metadata, and deterministic route tests without full Next.js/React, browser organization selection, route-specific smoke screenshots, or cross-browser Playwright parity; narrowed 2026-05-03 by PLAN_M60 for local served `@ui-smoke` coverage of the Romania route with route-specific desktop/mobile HTML snapshots and source/caveat/fallback/unsupported/no-DNSC/responsive/focus assertions without browser PNG traversal, external calls, or framework migration; narrowed 2026-05-03 by PLAN_M61 for route-specific Firefox browser traversal, desktop/mobile PNG screenshots when WebDriver BiDi is available, and Romania route DOM/layout assertions without cross-browser Playwright parity, pointer/keyboard traversal, framework migration, external calls, or legal-copy approval; narrowed 2026-05-03 by PLAN_M62 for Firefox keyboard traversal of dashboard and Romania skip links plus dashboard-to-Romania and back-to-dashboard route activation without pointer traversal, cross-browser Playwright parity, framework migration, external calls, or legal-copy approval; narrowed 2026-05-03 by PLAN_M63 for Firefox pointer/click traversal of visible dashboard-to-Romania and Romania back-to-dashboard links with target-bounds assertions, without cross-browser Playwright parity, framework migration, external calls, or legal-copy approval; narrowed 2026-05-03 by PLAN_M64 for visible web/API workspace selection, active-membership-checked session switching, HTTP selection smoke, and Firefox browser workspace selection without cross-browser Playwright parity, screenshot diffing, framework migration, external calls, or legal-copy approval; narrowed 2026-05-03 by PLAN_M65 for Firefox screenshot visual-threshold metrics and a secret-free manifest covering blank, wrong-size, missing-route, and severe-collapse failures without Playwright, committed golden PNGs, cross-browser parity, framework migration, external calls, or legal-copy approval; narrowed 2026-05-03 by PLAN_M66 for broader Firefox operational-console section-anchor keyboard and pointer workflows with target-bounds, hash/scroll, section-text, no-overflow, no-certification, and no-live-call assertions without Playwright, cross-browser parity, framework migration, external calls, or legal-copy approval; narrowed 2026-05-03 by PLAN_M67 for Firefox anchor-driven operational-console section screenshot PNG artifacts and visual-manifest anchor metadata without direct section scroll captures, Playwright, golden images, cross-browser parity, framework migration, external calls, or legal-copy approval; narrowed 2026-05-03 by PLAN_M68 for a persisted secret-free Firefox browser-smoke artifact index beside the visual metrics manifest, without Playwright, committed golden images, cross-browser parity, framework migration, external calls, or legal-copy approval; narrowed 2026-05-03 by PLAN_M69 for a persisted secret-free served HTTP `@ui-smoke` artifact index beside deterministic HTML snapshots without Playwright, committed golden images, cross-browser parity, framework migration, external calls, local port-bearing URLs, or legal-copy approval; narrowed 2026-05-04 by PLAN_M78 for a customer-shaped authenticated local Romania workflow backed by saved organization data, workflow forms/actions, local evidence/report/dashboard/billing/audit state, UI smoke, and Firefox browser smoke without external calls, fabricated provider/customer product data, framework migration, or cross-browser parity.

### GAP-032: Live OIDC Provider Registration And Callback Smoke Deferred

Severity: Medium
Area: Auth operations
Current state: PLAN_M11 added OIDC/social callback contracts, provider config validation, transient state/nonce/PKCE storage, JWKS ID-token verification support, GitHub OAuth profile/email lookup support, explicit account-link approval, session creation, and API tests with deterministic fake token/profile clients. PLAN_M30 persists OIDC transient callback state in Prisma mode with hashed state/nonce values and an encrypted PKCE verifier envelope. Defaults keep Microsoft Entra, Google, and GitHub sign-in disabled until provider credentials are configured. PLAN_M42 adds per-provider OIDC/social-login external-smoke readiness metadata, provider enablement/client secret/redirect blockers, transient-state production-safety issue reporting, and live-candidate/disposable guardrails without calling Microsoft, Google, or GitHub. PLAN_M46 adds `pnpm oidc:smoke:callback`, a dry-run-first OIDC/social callback smoke command that selects a provider from the M42 readiness matrix, reports planned authorization/callback/token/JWKS/profile/email/account-link/session-cookie/audit/origin-exemption operations without live provider calls, refuses live-candidate execution unless readiness plus disposable/test guardrails and provider opt-ins are set, and uses deterministic injected-provider tests to exercise local callback/session/account-link behavior without returning secrets, raw state/nonce, PKCE verifiers, codes, tokens, cookies, profile payloads, user emails, or endpoint URLs.
Impact: Contract behavior is covered, and operators can now see whether each provider callback smoke is not configured, blocked, unsafe, dry-run planned, or ready for a disposable/test app before any live provider call. The command also proves local callback/session/cookie metadata, explicit account-link approval, audit redaction, and callback Origin exemption with injected deterministic provider clients. Deployed environments still need real Microsoft Entra, Google, and GitHub app registrations, exact redirect URI setup, an approved browser/code-capture flow that does not expose raw state/nonce/PKCE/code/token/cookie values, live JWKS/profile endpoint smoke tests, provider secret rotation, and operational monitoring before customer-facing social login is enabled.
Next action: Add a guarded deployed/live OIDC smoke for approved disposable provider apps that exercises real Microsoft Entra, Google, and/or GitHub redirect/callback flows, verifies callback cookies and audit events over the deployed TLS/proxy path, and documents client secret/key rotation.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open; narrowed 2026-05-02 by PLAN_M42 for per-provider OIDC readiness metadata, blocker reporting, and opt-in/disposable guardrails without live OIDC/OAuth provider calls; narrowed 2026-05-02 by PLAN_M46 for a dry-run-first OIDC/social callback smoke command, selected-provider M42 preflight reuse, stricter provider-enabled readiness, sanitized output, and deterministic injected local callback/session/account-link/audit coverage without approved live Microsoft/Google/GitHub provider calls.

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
Current state: PLAN_M14 wired configurable `Secure` session cookies through `PURESOC_AUTH_COOKIE_SECURE` / `AUTH_COOKIE_SECURE`, while preserving the development default. PLAN_M20 added contract-level Origin/Referer allowlist checks for browser state-changing routes, with explicit webhook/OIDC/provider callback exemptions. PLAN_M39 adds a local served API/web smoke that verifies `HttpOnly`, `SameSite=Lax`, secure-cookie config on issued and cleared cookies, trusted-Origin acceptance, untrusted-Origin rejection, and OIDC/Microsoft provider callback Origin exemptions through local fetches without consuming live callback providers. PLAN_M40 adds a Firefox WebDriver BiDi browser smoke that uses a same-origin local auth proxy to verify real browser register/login/session/logout navigation, `document.cookie` cannot read the `HttpOnly` session token, WebDriver storage sees `HttpOnly`, `SameSite=lax`, and local HTTP `secure=false`, and logout removes the session cookie. Untrusted-Origin rejection and callback exemptions remain covered through deterministic local HTTP fallback because the API does not enable broad browser CORS. PLAN_M47 adds `pnpm auth:smoke:deployment`, a dry-run-first deployed-auth smoke harness and M42 readiness check for `auth_deployment_browser`; it reports planned registration/login/session/logout, cookie attributes, trusted/untrusted Origin behavior, callback exemptions, forwarded-header rate-limit behavior, health, and RBAC/organization scoping using endpoint classes and configured/missing variable names only. Live-candidate execution is refused unless local/test/ci/disposable guardrails, explicit disposable confirmation, `PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT=true`, and safe base URL/trusted-Origin endpoint classes are present. Deterministic tests exercise an approved local disposable API target and prove sanitized output, local forwarded-IP rate limiting, callback exemptions, cookie metadata, logout clearing, and cross-organization rejection without external providers. PLAN_M53 extends the local served web smoke so the web server proxies login/logout/session to the API, preserves the API-issued session cookie, resolves `/auth/session`, and renders an organization dashboard after a same-origin web login with an active organization.
Impact: Local browser cookie-jar behavior, logout clearing, local Origin middleware behavior, same-origin web login/session proxying, and guarded local/disposable deployed-auth smoke behavior now have deterministic coverage. A misconfigured production deployment could still behave differently behind real TLS/ingress because no approved deployed TLS target, reverse proxy, browser navigation over TLS, or live OIDC provider callback was exercised.
Next action: Run `pnpm auth:smoke:deployment` against approved SaaS and in-a-box disposable TLS targets after ingress/proxy configuration exists, add real browser navigation over TLS, verify deployed CORS/preflight behavior where applicable, and keep live provider OIDC callback cookies under GAP-032.
Owner: Codex/DevOps
Target phase: Phase K
Status: Open; narrowed 2026-05-01 by PLAN_M20 for contract-level Origin/Referer protection; narrowed 2026-05-02 by PLAN_M39 for local served API/web cookie, trusted-Origin, untrusted-Origin, and callback-exemption smoke coverage without deployed browser/TLS/proxy claims; narrowed 2026-05-02 by PLAN_M40 for Firefox browser cookie-jar/session/logout coverage with local HTTP fallback for untrusted-Origin and callback-exemption checks; narrowed 2026-05-02 by PLAN_M47 for a dry-run-first deployed-auth smoke command, auth deployment readiness metadata, safe endpoint-class guardrails, local disposable API execution, forwarded-IP rate-limit check, cookie/logout/callback/RBAC metadata checks, and sanitized output without approved deployed TLS/proxy/browser or live OIDC provider execution; narrowed 2026-05-03 by PLAN_M53 for same-origin web-server login/session proxying and API-issued cookie preservation in local smoke without claiming deployed TLS/proxy/browser or live OIDC provider execution.

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
Current state: PLAN_M20 added a shared API middleware layer for the existing `node:http` server, route-family classification, trusted-Origin/Referer checks for state-changing browser routes, explicit non-browser callback/webhook exemptions, and configurable in-memory fixed-window rate limits keyed by unauthenticated IP or authenticated user/organization. PLAN_M51 adds an injectable fixed-window rate-limit store boundary while preserving deterministic process-local memory defaults, adds explicit rate-limit store configuration metadata, and fails startup validation for deployments that require a shared store while memory is configured. PLAN_M51 also makes client-IP extraction proxy-aware: `X-Forwarded-For` and RFC `Forwarded` are ignored unless `PURESOC_API_TRUST_FORWARDED_HEADERS=true` and `PURESOC_API_TRUSTED_PROXY_IPS` explicitly matches the socket peer. Production startup now requires Origin/Referer protection to remain enabled and `PURESOC_API_REQUIRE_ORIGIN_OR_REFERER=true`; webhook, OIDC callback, and provider callback exemptions remain tested. PLAN_M52 adds the Redis shared-store adapter behind `PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis`, using a Redis EVAL fixed-window script, hashed Redis keys, configurable Redis command retry/backoff, secret-free 503 behavior on store failures, and startup validation for missing/invalid Redis URLs without falling back to memory.
Impact: Spoofed forwarded headers no longer affect audit context or route-family rate-limit keys by default, production cannot silently start with optional missing Origin/Referer checks, and the API now has an implemented shared fixed-window rate-limit store path for configured Redis deployments. M52 validation used deterministic fake Redis command clients and did not exercise a live API Redis target, deployed TLS/ingress behavior, or browser CSRF-token flows.
Next action: Add a bounded local/test/ci/disposable API Redis rate-limit smoke if runtime Redis behavior needs live proof beyond deterministic command-client coverage, add deployed/browser proxy smoke coverage for real ingress/TLS behavior under GAP-035, and revisit double-submit CSRF tokens when the served browser runtime can carry token issuance and header submission.
Owner: Codex/DevOps/Security
Target phase: Phase K
Status: Open; created 2026-05-01 by PLAN_M20; narrowed 2026-05-03 by PLAN_M51 for rate-limit store boundary/config validation, proxy-aware client-IP trust, production strict Origin/Referer startup validation, and deterministic middleware tests without a live shared rate-limit store or deployed proxy/browser smoke; narrowed 2026-05-03 by PLAN_M52 for an implemented Redis shared-store adapter, hashed Redis keys, EVAL fixed-window command coverage, retry/failure tests, secret-free store-unavailable API responses, and startup validation without live Redis or deployed proxy/browser smoke.

### GAP-039: Audit WORM Storage, External Signing, And Retention Export Deferred

Severity: Medium
Area: Audit integrity/runtime
Current state: PLAN_M21 added package-level audit integrity metadata: `previousHash`, `entryHash`, `hashAlgorithm`, and a redacted canonical payload. `AuditWriter` chains entries by organization/global scope, `InMemoryAuditSink` exposes verification helpers, and Prisma audit metadata columns/migration exist. PLAN_M28 adds a Prisma audit sink that stores redacted canonical payloads and hash metadata in `AuditLog`, loads the latest per-organization/global anchor before appending, uses an in-process anchor for same-process writes, and is selected by API Prisma mode. PLAN_M33 adds explicit audit export/checkpoint contracts, deterministic exported-segment verification for intact chains, missing rows, tampered payloads, broken previous-hash links, and wrong terminal checkpoints, memory and Prisma checkpoint repositories, an `audit_checkpoints` table/migration, and organization-scoped audit export/checkpoint API routes that return explicit non-WORM/non-notarized guarantees. PLAN_M37 adds audit retention/export policy metadata, a `none` external checkpoint provider, a deterministic test-only `fake-local` provider, persisted provider/status/local-anchor metadata on checkpoints, config defaults/env overrides, API exposure, and secret-free tests without live external calls. PLAN_M41 adds explicit audit export handoff metadata on export segments and checkpoints for `database_only`, `worm_export_pending`, `externally_anchored`, and `external_anchor_failed` states, records failed-anchor checkpoints with generic secret-free failure metadata, preserves non-WORM/non-notarized guarantees, and documents operator-owned immutable export/signing/legal-hold/alerting responsibilities. PLAN_M56 adds Prisma-mode transaction-scoped PostgreSQL advisory locking per audit scope, persisted `scopeKey`/`chainSequence` ordering metadata with a unique `(scopeKey, chainSequence)` index, deterministic same-scope contention coverage, and different-organization independence coverage. Memory mode now serializes deterministic writes within one process only and remains explicitly non-persistent/non-multi-process.
Impact: Audit entries now persist in Prisma mode with tamper-evident hash metadata, serialized same-scope append ordering, deterministic scope sequence ordering for exports/latest-anchor reads, and operators can export and checkpoint redacted chain segments with terminal hashes, retention-policy metadata, explicit external-anchor provider status, and deterministic handoff/runbook state. This is still not append-only storage. A database administrator or full storage compromise could rewrite all rows and recompute hashes, delete the final row in a chain and its database-only checkpoint, bypass retention/export expectations, or replace the database-only/fake/failed anchor metadata unless a real external anchor or immutable export exists.
Next action: Before production auditability claims, design and implement optional WORM/object-storage export writers, real external signing or notarized checkpoints, checkpoint export/retention operations, legal-hold/deletion procedures, operational verification/alerting, and deployed database migration/replica smoke coverage for the audit append lock path.
Owner: Codex/DevOps/Security
Target phase: Phase K
Status: Open; created 2026-05-01 by PLAN_M21; narrowed 2026-05-02 by PLAN_M28 for persisted audit sink/hash-chain adapter coverage; narrowed 2026-05-02 by PLAN_M33 for explicit export/checkpoint contracts, database-only checkpoint persistence, and organization-scoped API routes without WORM or external signing claims; narrowed 2026-05-02 by PLAN_M37 for retention/export policy metadata and deterministic none/fake external-anchor contracts without WORM, notarization, or legal certification claims; narrowed 2026-05-02 by PLAN_M41 for explicit audit export handoff states, failed-anchor checkpoint preservation, and operator-owned immutable/export/signing responsibility metadata without live WORM or external-anchor claims; narrowed 2026-05-03 by PLAN_M56 for transaction-scoped same-scope audit append locking, persisted scope sequence ordering, and deterministic contention tests without WORM, external notarization, live PostgreSQL, or external services.

### GAP-040: Provider Token KMS Custody And Live Rotation Smoke Deferred

Severity: Medium
Area: Provider connector/security runtime
Current state: PLAN_M21 added provider-token key IDs and previous-key decrypt support for the Microsoft 365 local token cipher, config defaults/env overrides for `PURESOC_PROVIDER_TOKEN_KEY_ID`, `PURESOC_PROVIDER_TOKEN_KEY`, and `PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS`, production startup validation for unsafe local-dev keys, and deterministic active/previous/legacy decrypt tests. PLAN_M34 adds an explicit `local-env-key-ring` key-provider/custody boundary for Microsoft 365 token encryption, redacted custody summaries, config validation for unsupported custody providers and duplicate/reused key material, and `pnpm provider-token:smoke`, a local/disposable smoke proving active-key encrypt/decrypt, previous-key decrypt, bad-key failure, secret-free output, and production rejection of checked-in local-dev active/previous provider-token keys. PLAN_M38 adds secret-free custody capability/status metadata, deterministic test-only `fake-secret-manager-test` provider behavior for active/previous lookup, key-version metadata and missing-key failure, runtime/config selection through the API service factory, rotation/backfill runbook metadata, production rejection of the fake provider, and an expanded provider-token custody smoke. PLAN_M48 adds provider-token custody deployment readiness metadata for local, in-a-box, and SaaS targets; a `provider_token_custody_deployment` readiness check in `pnpm external-smoke:readiness`; previous-key window/backfill/retirement confirmation blockers; SaaS external-custody deferral; startup validation blocker-code reporting in `pnpm provider-token:smoke`; and expanded runbook phases for smoke verification, previous-key staging, ciphertext backfill planning, rollback, key retirement, and deferred live KMS/HSM/secret-manager custody. Provider write execution remains disabled.
Impact: The checked-in local-dev key is no longer acceptable for production startup, staged rotation is modeled in code, fake secret-manager custody contracts can be tested deterministically without live services, operator rotation/backfill expectations are captured as metadata, and operators can now see whether local/in-a-box/SaaS custody posture is supported, blocked, or deferred without leaking key material. Production key custody is still environment-variable/local key-ring based unless a deployment layer injects secrets, and the running API process can still access plaintext key material. There is no real KMS/secret-manager adapter, deployed KMS-backed rotation smoke, ciphertext backfill/re-encryption execution, key retirement automation, custody access logging, or production rollback exercise.
Next action: Before production customer-provider onboarding, select the SaaS/in-a-box key custody model, add real KMS/secret-manager adapter boundaries where required, run a deployed rotation smoke against the selected custody backend, implement ciphertext backfill/re-encryption with rollback guidance, define access logging/incident response, and execute operator rotation/backout steps in a non-production deployment. A future outside-app custody track may choose this path only after a real custody backend and adapter/runbook path are selected; local key-ring and fake test custody must not be claimed as KMS proof.
Owner: Codex/DevOps/Security
Target phase: Phase K
Status: Open; created 2026-05-01 by PLAN_M21; narrowed 2026-05-02 by PLAN_M34 for explicit local key-provider custody, local/disposable rotation smoke, and stricter key-ring validation without claiming KMS/secret-manager custody; narrowed 2026-05-02 by PLAN_M38 for custody capability/status metadata, deterministic fake secret-manager contracts, rotation/backfill runbook metadata, and production fake-provider rejection without live custody claims; narrowed 2026-05-03 by PLAN_M48 for local/in-a-box/SaaS custody readiness metadata, previous-key window/backfill/retirement blockers, startup validation blocker-code reporting, and expanded runbook phases without real KMS/HSM/secret-manager custody, deployed rotation, ciphertext backfill, key retirement, access logging, or provider writes.

### GAP-041: Drift Detection Coverage Is Deliberately Selected, Not Exhaustive

Severity: Medium
Area: Database/regulatory data quality
Current state: PLAN_M22 added deterministic drift checks to `pnpm lint`. PLAN_M23 expanded the selected schema drift map to include generic `NotificationDraft` and `RoNis2NotificationDraft` table fields after ADR-016 chose generic notification-draft envelopes with Romania compatibility/workflow companions. PLAN_M24 added deterministic payload-envelope semantic validation in the country-pack core contract and repository write-time validation for generic notification draft persistence. PLAN_M25 added runtime API tests for generic notification-draft create/read/list semantics, Romania companion-link creation, invalid-envelope rejection, and organization scoping. PLAN_M26 added deterministic output repository tests for stored analysis, generated report metadata, dashboard snapshots, latest-snapshot reads, checklist-preserving stored-analysis upserts, and cross-organization rejection. PLAN_M27 added deterministic fake-Prisma and API runtime coverage for identity/session/organization/RBAC persistence, provider-subject uniqueness, session revocation, member listing, RBAC scoping, and cross-organization rejection. PLAN_M28 added deterministic fake-Prisma and API runtime coverage for audit-log persistence, redacted payload storage, organization/global anchors, hash metadata, and Prisma-mode auth/org audit writes. PLAN_M29 expanded the selected schema drift map to provider connection, credential, permission bundle, capability, sync run, and sync module models, added provider telemetry contract fields for credential provider key, finding resource identity, and recommendation source finding key, and added deterministic fake-Prisma/API coverage for provider-store persistence semantics. PLAN_M30 adds selected drift coverage and deterministic repository/API tests for OIDC transient authorization state. PLAN_M33 adds selected drift coverage for `AuditCheckpoint`, and PLAN_M37 expands it for retention policy plus external-anchor metadata fields. PLAN_M56 adds selected drift coverage for audit `scopeKey`, `chainSequence`, and the unique scope-sequence attribute. PLAN_M70 adds selected schema drift coverage for `EvidenceLink`, `ReportExport`, and `DashboardWidget` output metadata. PLAN_M71 adds the generated Romania import report to `pnpm drift:regulatory`. PLAN_M78 adds memory and Prisma repository tests plus API route tests for Romania onboarding progress and classification run persistence. The schema check still covers 32 high-risk persisted models and 464 fields, and the generated-data check covers `ro-nis2.seed.generated.json`, `ro-nis2-source-map.generated.json`, and `ro-nis2-import-report.generated.json` against importer output.
Impact: REC-110, REC-112, and REC-113 are narrowed for the named high-risk surfaces, notification envelope shape/caveat/source-map semantics are covered by deterministic tests, and the stored output, selected evidence/report/dashboard output metadata, identity/org/RBAC, audit sink/checkpoint export, provider telemetry, OIDC transient-state adapter paths, Romania onboarding/classification repositories, and Romania generated import evidence have repository/runtime or generated-data coverage. Lower-risk or less mature persisted models can still drift silently. Excluded selected schema-drift surfaces include checklist/risk-acceptance tables, Romania onboarding/classification table fields, billing customers, and regulatory source/source-map/decision tables.
Next action: Expand the drift maps as each excluded surface receives production adapters or customer-facing workflows; add lint-gated fixture checks for notification envelope examples if customer-facing payload schemas broaden beyond the current deterministic unit/repository coverage.
Owner: Codex
Target phase: Phase K/data-quality hardening
Status: Open; created 2026-05-01 by PLAN_M22, narrowed 2026-05-01 by PLAN_M23 for notification draft table field drift, narrowed 2026-05-01 by PLAN_M24 for payload-envelope semantic validation, narrowed 2026-05-01 by PLAN_M25 for runtime notification-draft API semantics, narrowed 2026-05-02 by PLAN_M26 for output repository runtime semantics, narrowed 2026-05-02 by PLAN_M27 for identity/session/organization/RBAC repository and API runtime semantics, narrowed 2026-05-02 by PLAN_M28 for audit sink repository and API runtime semantics, narrowed 2026-05-02 by PLAN_M29 for provider resource store repository/API runtime semantics and selected provider schema drift coverage, narrowed 2026-05-02 by PLAN_M30 for OIDC transient authorization-state schema/repository/API runtime semantics, narrowed 2026-05-02 by PLAN_M33 for audit checkpoint schema/repository/API runtime semantics, narrowed 2026-05-02 by PLAN_M37 for audit checkpoint retention/external-anchor metadata drift coverage, narrowed 2026-05-03 by PLAN_M56 for audit scope-sequence ordering field/index drift coverage, narrowed 2026-05-04 by PLAN_M70 for selected evidence-link/report-export/dashboard-widget output metadata drift coverage, narrowed 2026-05-04 by PLAN_M71 for lint-gated Romania import-report generated-data drift coverage, and narrowed 2026-05-04 by PLAN_M78 for Romania onboarding/classification repository and API runtime coverage without adding those tables to selected schema drift yet.

### GAP-042: Romanian Product Copy, Message Catalog Runtime, And Notification Draft Migration Deferred

Severity: Medium
Area: i18n/country-pack notifications
Current state: PLAN_M23 added ADR-016, shared locale/legal-caveat fallback contracts, country-pack notification envelope helpers, Romania notification label message keys, report legal-caveat locale metadata, and selected notification draft table drift coverage. PLAN_M24 added a generic notification envelope parser/validator, a Romania generic envelope builder alongside the compatibility draft JSON, API response coverage for the generic envelope, and a Prisma-boundary notification draft repository that persists generic `NotificationDraft.payloadJson` envelopes plus Romania companion links with organization-scoped tests. PLAN_M25 added an in-memory repository, API runtime repository selection, org-scoped generic notification-draft create/read/list routes, Romania companion-link creation for RO registration envelopes, and a deterministic Romania backfill helper that converts only source-mapped/caveat-valid legacy payloads while marking non-convertible payloads `manual_review_required`. PLAN_M58 adds a shared message-catalog resolver for `en`/`ro` with requested/resolved locale, fallback reason, message key, message kind, and review status metadata; report builders, generic country-pack envelopes, Romania notification draft generation, and selected served-web labels now consume the resolver. Demo-safe Romanian product labels exist for non-legal UI copy only. Romania legal-caveat text and Romania regulatory notification labels still fall back to English/source-mapped copy with `missing_translation` metadata until product/legal-approved copy exists.
Impact: Reports, generic envelopes, Romania drafts, and selected UI surfaces now expose deterministic message metadata instead of silently pretending Romanian legal/regulatory copy is approved. Customer-facing Romanian output remains intentionally mixed-language for legal/regulatory surfaces because Romanian legal-caveat and workbook/regulatory copy approval is still absent. Existing Romania companion rows can be evaluated deterministically for conversion readiness, but no live data migration has been run.
Next action: Add product/legal-approved Romanian legal caveat and regulatory notification/message entries when available, then decide whether Romania legacy draft backfill runs lazily or through a reviewed batch migration.
Owner: Codex/Product/legal
Target phase: Phase K/i18n and country-pack export hardening
Status: Open; created 2026-05-01 by PLAN_M23, narrowed 2026-05-01 by PLAN_M24 for generic envelope validation, Romania envelope generation, and Prisma-boundary notification draft persistence, narrowed 2026-05-01 by PLAN_M25 for runtime persistence routes and deterministic Romania backfill posture, narrowed 2026-05-03 by PLAN_M58 for shared message-catalog runtime wiring, report/notification/UI resolver consumption, demo-safe Romanian product labels, and explicit fallback metadata without approved Romanian legal/regulatory copy, and preserved 2026-05-04 by PLAN_M78 because saved-data Romania drafts still expose fallback metadata and no approved Romanian legal/regulatory copy was invented.

### GAP-043: Production Queue Orchestration And Multi-Process BullMQ Hardening Deferred

Severity: Medium
Area: Job runtime/operations
Current state: PLAN_M32 added an opt-in Redis-backed adapter under the existing `bullmq` queue-provider boundary and a disposable live Redis smoke for bounded queue durability. PLAN_M36 hardens the current adapter with per-job claim locks, bounded Redis command retry/backoff, explicit stale-running recovery and terminal cleanup hooks, queue metadata/failure-detail redaction, job Redis config defaults/env overrides, deterministic contention/recovery/cleanup/retry tests, and an extended disposable Redis smoke proving competing worker runtime instances claim only one shared job while scheduler and connector-runner still use fake/read-only jobs.
Impact: Normal duplicate-claim races are now covered by deterministic and disposable Redis tests, and retention/recovery behavior is explicit instead of implicit. Production queue operations still depend on operator-owned Redis durability, eviction policy, metrics/alerts, cleanup cadence, recovery thresholds, and deployed long-running multi-container behavior.
Next action: Before relying on Redis queues for production remediation or high-volume provider sync, add a multi-container Compose or CI smoke with independently started worker/scheduler/connector-runner processes, define queue metrics/alerts and cleanup scheduling, tune stale-running recovery thresholds per job family, document Redis persistence/eviction requirements, and revisit whether the current minimal Redis adapter should be replaced by or wrapped with a full BullMQ worker implementation.
Owner: Codex/DevOps
Target phase: Phase K runtime orchestration
Status: Open; created 2026-05-02 by PLAN_M32 after the bounded live Redis smoke resolved GAP-037; narrowed 2026-05-02 by PLAN_M36 for claim-lock contention safety, bounded command retry, explicit recovery/retention hooks, queue redaction, and disposable Redis smoke coverage without claiming deployed production orchestration readiness.

### GAP-044: External Live-Smoke Target Approval And Execution Deferred

Severity: Medium
Area: External integration smoke operations
Current state: PLAN_M49 adds a metadata-only external smoke target selector embedded in `pnpm external-smoke:readiness` and exposed as `pnpm external-smoke:select-target`. It ranks Microsoft 365 read-only tenant, Stripe test-mode, Microsoft/Google/GitHub OIDC callback, object-storage/scanner plus evidence/report runtime, auth deployment, and provider-token custody paths; reports stable ready/blocked/unsafe/not-configured reason codes; and selects exactly one path only when the underlying readiness is `ready_for_disposable_smoke`. PLAN_M50 ran the selector follow-up in the default environment: `external-smoke:readiness` stayed in dry-run mode with unknown target kind, no disposable confirmation, `ready_for_disposable_smoke: 0`, and no live network calls; `external-smoke:select-target` returned `outcome: no_ready_path`, `selectedPathId: null`, `selectedCommand: null`, and `readyCandidateCount: 0`. No live smoke command was run. PLAN_M53 intentionally moved the next external-smoke blocker review to PLAN_M54 after `docs/claude_rec4.md` recommended stopping additional readiness scaffolding and first landing an API-backed served web runtime. PLAN_M54 reran the metadata-only readiness/selector gate: readiness stayed `mode: dry_run`, target kind `unknown`, disposable confirmation `false`, `ready_for_disposable_smoke: 0`, and no live network calls; the selector again returned `outcome: no_ready_path`, `selectedPathId: null`, `selectedCommand: null`, and `readyCandidateCount: 0`. No live smoke command was run. PLAN_M72, PLAN_M76, and PLAN_M77 record concrete outside-app checklists for Stripe test-mode, evidence runtime, and Microsoft 365 read-only tenant smoke. PLAN_M78 was explicitly redirected to a local-only deployable Romania product slice and did not run external-smoke, Stripe, Microsoft 365, OIDC, object-storage/scanner, KMS/HSM/secret-manager, public regulatory fetch, DNSC, national-authority, or provider-write commands. `docs/real-tenant-testing.md` now records a real-tenant testing ladder for Microsoft 365: disposable/test tenant first, then friendly/internal pilot, then friendly customer pilot with written authorization, then production customer readiness only after earlier evidence exists. It also captures the selector-first Microsoft 365 smoke commands, read-only permission bundles, consent expectations, failure triage, and evidence to retain. `docs/real-tenant-test-record-template.md` provides a reusable sanitized evidence template for each tenant run, and `docs/microsoft365-read-only-smoke.env.example` provides a placeholder-only environment shape.
Impact: Operators can audit which single disposable/test path is safe to run next without exposing secrets or endpoints, and the M72/M76/M77 handoffs identify the external resources needed instead of adding another readiness layer. M78 improves local product proof but still does not prove any live Microsoft Graph, Stripe, OIDC, object-storage/scanner, report-renderer, deployed-auth, KMS/HSM/secret-manager, external-anchor, or provider-write runtime behavior.
Next action: Choose one approved disposable/test Microsoft 365 tenant or another single approved external target, set only that path's guardrails until `external-smoke:select-target` selects exactly one path, run only the selected smoke command, and record the sanitized evidence described in `docs/real-tenant-testing.md`. If no target is approved, preserve dry-run-only metadata and record the concrete blocker instead of adding more generic readiness scaffolding.
Owner: Codex/DevOps/Product
Target phase: Phase K external-smoke operations
Status: Open; created 2026-05-03 by PLAN_M49 for selector/readiness-audit metadata without live external calls or provider writes; narrowed 2026-05-03 by PLAN_M50 with an explicit no-ready-path blocker review, no approved target, and no live external calls; preserved 2026-05-03 by PLAN_M53, which moved the next selector follow-up to PLAN_M54 and made no live external calls; preserved 2026-05-03 by PLAN_M54 with a repeated no-ready-path selector result, no selected command, no approved target, and no live external calls; narrowed 2026-05-04 by PLAN_M72, PLAN_M76, and PLAN_M77 for concrete outside-app Stripe, evidence runtime, and Microsoft 365 handoff checklists without live external calls; preserved 2026-05-04 by PLAN_M78 because the milestone intentionally ran only local product acceptance and made no external calls; narrowed 2026-05-29 by `docs/real-tenant-testing.md`, `docs/real-tenant-test-record-template.md`, and `docs/microsoft365-read-only-smoke.env.example` for a concrete Microsoft 365 real-tenant testing ladder, placeholder-only environment shape, and sanitized evidence protocol without running a live tenant.

### GAP-045: Memory Repository And API Dispatcher Coupling

Severity: Medium
Area: API maintainability
Current state: PLAN_M57 split memory-mode API repository ownership into separate identity/org/RBAC, evidence, and billing adapters exposed through `services.memoryRepositories`, and removed the old `InMemoryPureSocRepository` god-object/inheritance shape. `apps/api/src/server.ts` now dispatches through `apiRouteTable` entries with method, path pattern, route-family metadata, raw-body metadata, and handler functions while preserving middleware ordering, Stripe raw-body parsing, JSON body limits, callback exemptions, cookies, and response contracts.
Impact: REC-203 and REC-204 from `docs/claude_rec4.md` are narrowed for the current `node:http` runtime: bounded-context memory repositories are no longer coupled through one default test harness, and route additions no longer require extending a single long linear `if`/regex dispatcher. The API is still intentionally not NestJS/Hono/Express, and full OpenAPI/schema-driven routing remains outside this internal refactor.
Next action: Keep future memory-mode adapters per-context and add new routes through `apiRouteTable`; evaluate a larger framework/router migration only through a dedicated ADR/prompt if route-table metadata becomes insufficient.
Owner: Codex
Target phase: Phase K maintainability
Status: Resolved 2026-05-03 by PLAN_M57 for per-context memory repository split and route-table dispatch without API behavior changes or external calls.

### GAP-046: Public Self-Service Signup Hardening Deferred

Severity: High
Area: Auth/product operations
Current state: Local registration is open in the served web/API runtime. A new user can register, sign in, create a local organization, and become that organization's `owner`. The public deploy preparation now aligns browser copy, password minimums, forwarded/public Origin selection, logout affordance, workspace country-code validation, and post-creation active-workspace selection. API registration still reports `emailVerificationRequired: true`, but the repository does not yet deliver or enforce email verification; there is no invite-only signup switch, owner-managed invite flow, platform-admin bootstrap, or abuse operations surface.
Impact: This is suitable for controlled public UI interaction testing where creating self-owned test organizations is acceptable. It is not broad public SaaS readiness: anyone who can reach `/register` can create an account and workspace, email ownership is not proved, and there is no product-approved tenant invitation or platform-admin operating model.
Next action: Before broad public/customer launch, choose open vs invite-only registration policy, wire email delivery and verification enforcement, add owner-managed member invitations/role assignment, define platform-admin bootstrap and recovery operations, and add abuse monitoring/rate-limit evidence for public signup.
Owner: Codex/Product/DevOps
Target phase: Phase K auth/product hardening
Status: Open; created 2026-05-29 by public-deploy UI preparation after syncing served web signup/workspace flows with API organization ownership semantics.

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
