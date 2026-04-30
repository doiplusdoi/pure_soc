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
Current state: ADR-013 records the boundary between local auth, OIDC/social login, optional Keycloak broker behavior, and Microsoft 365 managed-provider admin consent. Phase C added local email/password auth, session handling, token redaction tests, and OIDC/social-login placeholders that keep user sign-in separate from managed-provider onboarding.
Impact: OIDC callback and account-linking behavior remains intentionally deferred; Microsoft/Google/GitHub sign-in must still avoid trusting email alone and must not share code paths with Microsoft 365 admin consent.
Next action: When OIDC callbacks are explicitly in scope, update or confirm ADR-013 and add state, nonce, PKCE, issuer/audience/expiry/signature, account-linking conflict, and provider-consent separation tests.
Owner: Codex
Target phase: Phase C
Status: Resolved 2026-04-28 for Phase C local auth and boundary placeholders; OIDC callback implementation remains deferred by design.

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
Current state: Product caveat is defined, ADR-011 records the source activation lifecycle, and Phase D added a regulatory source lifecycle skeleton in `code/packages/regulatory-sources` where changed legal logic defaults to `review_required` and creates a `regulatory_admin` review-task skeleton. Phase E now has source-mapped Romania preliminary classification, onboarding progress, and notification-draft contracts, but reviewer assignment rules, review persistence, approval UI, and legal/product operating procedure are still undefined.
Impact: Incorrect national guidance could create commercial and customer risk if reviewers, approvals, and activation authority are not defined before source-derived Romania country-pack legal logic is activated for production guidance.
Next action: Define reviewer roles and approval workflow, then implement persisted `regulatory_review_tasks` and activation/supersession UI before activating source-derived Romania country-pack or control changes.
Owner: Product/legal
Target phase: Phase D and Phase K
Status: Open

### GAP-007: Microsoft Graph Permission Bundle Details Need Validation

Severity: Medium
Area: Microsoft connector
Current state: ADR-009 records the permission-bundle strategy and read-only-first boundary. Phase G validated the read-only V1 bundle mapping against Microsoft Learn on 2026-04-28 and recorded endpoint-to-permission details in `docs/microsoft365-permissions.md`. Implemented bundles are `m365_read_baseline`, `m365_security_read`, and `m365_intune_read`; write bundles remain disabled and separate.
Impact: First onboarding now requests read-only Graph permissions through named bundles, tracks granted permissions, and degrades unavailable modules through module status instead of failing the full connection. Conditional Access, Entra audit/sign-in logs, Exchange, SharePoint, Teams, Purview, Defender XDR live coverage, national-cloud behavior, and app permission-grant introspection still need per-endpoint validation before production enablement.
Next action: Revalidate Microsoft Learn endpoint permissions before enabling the deferred modules or any write/remediation bundle, and keep `docs/microsoft365-permissions.md` current with API limitations.
Owner: Codex
Target phase: Phase G
Status: Resolved 2026-04-28 for Phase G read-only onboarding and discovery bundles; deferred Microsoft API limitations remain documented.

### GAP-008: Evidence Metadata, Access, And Export Model Needs ADR

Severity: High
Area: Evidence/reporting
Current state: ADR-007 records the report-renderer strategy and ADR-008 records evidence metadata, access audit, object-storage, and export-model boundaries. Phase I now adds evidence metadata/contracts, object-storage and upload-scanner interfaces, in-memory evidence storage, evidence-control/jurisdiction/source links, authorization-checked and audited downloads, stable JSON report/export builders, API routes, and tests for cross-organization rejection, legal caveats, source references, Romania source-mapped draft exports, dashboard aggregation, and JSON snapshot stability.
Impact: The Phase I product contract is executable without making evidence or reports public by URL, and outputs are generated from stored analysis records. Runtime production adapters are still deferred: MinIO/S3 object storage, ClamAV or equivalent upload scanner service, persisted Prisma repositories, generated report evidence-package storage, and PDF rendering behind `apps/report-renderer`.
Next action: Implement production storage/scanner/Prisma adapters and PDF rendering when runtime dependencies are wired; keep the current in-memory adapter as the contract and test harness.
Owner: Codex
Target phase: Phase I
Status: Resolved 2026-04-30 for Phase I contracts, in-memory implementation, and output tests; production adapters remain deferred as runtime work.

### GAP-009: UX Design System Not Chosen

Severity: Medium
Area: Frontend
Current state: UX direction is defined, but component library/design tokens are not selected.
Impact: UI may drift or slow down.
Next action: Decide on Tailwind/shadcn or alternative during web app bootstrap; record in ADR.
Owner: Codex/product
Target phase: Phase A
Status: Open

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
Current state: Stripe abstraction is planned, but actual products, prices, and entitlements are not defined.
Impact: Billing implementation can only stub generic plans.
Next action: Define Base/Pro/MSP/In-a-box entitlements before Phase I billing implementation.
Owner: Product
Target phase: Phase I
Status: Open

### GAP-013: Docker Image Service Catalog Missing

Severity: High
Area: Service topology
Current state: Compose service catalog and Dockerfiles exist under `code/infra/`. Main Compose config includes web, api, worker, scheduler, connector-runner, regulatory-importer, report-renderer, postgres, redis, and object storage. Split Compose files exist for data, storage, webservices, jobs, connectors, reports, and config.
Impact: DevOps can consume a clear application service/image inventory. Runtime commands are still placeholders until each app is implemented.
Next action: Replace placeholder service commands as real app builds are added.
Owner: Codex
Target phase: Phase A
Status: Resolved 2026-04-28. `docker compose -f infra/compose/docker-compose.yml config` passes from `code/`.

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
Current state: The previous prompt suite was uneven against `docs/prompt-tests.md`. `docs/codex-prompts.md` now includes a required template and project-specific prompts with expected files, constraints, tests, acceptance commands, and gap updates.
Impact: Future prompts can still drift if not checked after phases.
Next action: Use Prompt 14 after each phase to audit prompt quality and update gaps.
Owner: Codex
Target phase: Ongoing
Status: Resolved 2026-04-28 for initial prompt rewrite; ongoing QA remains required.

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
Current state: A dedicated billing prompt now exists as Prompt 10, covering provider abstraction, Stripe, webhook idempotency, entitlements, and `BILLING_PROVIDER=none`. Product pricing and plan definitions remain tracked in GAP-012.
Impact: Billing implementation is now executable, but product entitlements still need business decisions.
Next action: Keep GAP-012 open; run Prompt 10 when Phase I billing foundation starts.
Owner: Codex/Product
Target phase: Phase I
Status: Resolved 2026-04-28 for prompt coverage.

### GAP-018: Dashboard And Report Data Contracts Not Implemented

Severity: High
Area: Outputs/analytics
Current state: Phase B added report and dashboard TypeScript contracts backed by stored analysis records, plus tests proving recommendations can feed plan items, reports, and dashboard signals. Phase I now adds concrete internal readiness report builders, Romania notification draft JSON export builders, stable JSON export serialization, dashboard aggregation from stored control/gap/recommendation/evidence records, dashboard snapshot records, and API routes that reject cross-organization access.
Impact: Reports and dashboards now have executable builders with legal caveats and regulatory source references. PDF rendering, CSV table exports, and full evidence-package binary bundling remain deferred to the production renderer/storage adapters tracked under GAP-008.
Next action: Expand renderer templates and export formats after the production report-renderer and object-storage adapters are wired.
Owner: Codex
Target phase: Phase B/I
Status: Resolved 2026-04-30 for Phase I JSON builders and dashboard aggregation; PDF/CSV/evidence-package binary exports remain deferred.

### GAP-020: Prisma Migration And Generated Client Workflow Not Wired

Severity: Medium
Area: Database/developer platform
Current state: `schema.prisma` defines the Phase B database model and Phase C auth indexes, while `packages/database/src/client.ts` exposes a client factory boundary. Phase C auth/organization behavior uses repository interfaces with an in-memory API adapter for tests; the workspace still does not include Prisma CLI or `@prisma/client` dependencies, generated client output, or an initial migration.
Impact: Auth, organization, RBAC, and audit behavior can be tested, but the API does not yet persist these flows through PostgreSQL/Prisma.
Next action: Add Prisma dependencies, generate the initial migration, and replace the in-memory API adapter with a Prisma-backed repository when the first database-backed service slice is implemented.
Owner: Codex
Target phase: Phase C/D
Status: Open

### GAP-019: Regulatory Source Activation Lifecycle Not Implemented

Severity: High
Area: Regulatory/country packs
Current state: Phase D added a source activation lifecycle skeleton in `code/packages/regulatory-sources`, including `draft`, `validated`, `review_required`, `active`, and `superseded` states, changed-legal-logic defaulting to `review_required`, and tests that prevent auto-activation of changed legal logic.
Impact: The domain guard now exists for imports and source monitors, but persistence, immutable source-version history, and reviewer workflow still need concrete implementation before legal changes become operational.
Next action: Expand the skeleton during Phase E importer work with persisted source versions, source maps, validation reports, and review-task writes.
Owner: Codex/Product/legal
Target phase: Phase D/E
Status: Resolved 2026-04-28 for Phase D skeleton; persistence and review workflow remain tracked by GAP-006 and Phase E tasks.

### GAP-021: Control Catalog Coverage And Readiness Scoring Need Product Calibration

Severity: Medium
Area: Compliance engine/scoring
Current state: Phase H added a provider-neutral control catalog seed loader, initial source-linked EU controls, provider finding mappings, evidence completeness, gap generation, structured recommendations, readiness plan items, and checklist generation. The current readiness status is an internal operational model and intentionally does not claim legal certification.
Impact: The engine can prove the control-result -> gap -> recommendation -> readiness-plan flow, but the catalog only covers the first representative controls and does not yet encode a product-approved weighting/scoring methodology across the full NIS2 baseline and country overlays.
Next action: Expand the control catalog to the full EU baseline and reviewed country overlays, define score weighting and stale-evidence rules with product/legal, and keep score labels framed as internal readiness only.
Owner: Product/legal/Codex
Target phase: Phase H/I
Status: Open
