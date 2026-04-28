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
Current state: Repo contains source docs and planning artifacts only. No application monorepo exists yet.
Impact: No executable product code or tests.
Next action: Run Prompt 1A from `docs/codex-prompts.md`.
Owner: Codex
Target phase: Phase A
Status: Open

### GAP-002: Package Manager Not Confirmed by Implementation

Severity: Medium
Area: Developer platform
Current state: Master plan recommends pnpm, but no package files exist.
Impact: Tooling choices are still reversible.
Next action: Confirm pnpm during Phase A bootstrap and record ADR-001.
Owner: Codex
Target phase: Phase A
Status: Open

### GAP-003: Auth Broker Boundary Needs ADR

Severity: High
Area: Auth
Current state: Vision supports local auth plus Microsoft, Google, GitHub, and optional Keycloak broker. Prompt 2 now explicitly separates local auth, OIDC/social sign-in, and Microsoft 365 admin consent, but the final app boundary is not yet implemented or recorded.
Impact: Auth implementation could become over-coupled to Keycloak, duplicate OIDC behavior, or confuse user sign-in with managed-provider connection onboarding.
Next action: Record an auth/OIDC boundary ADR before implementing OIDC callbacks beyond placeholders.
Owner: Codex
Target phase: Phase C
Status: Open

### GAP-004: Multitenancy Isolation Strategy Needs Enforcement Tests

Severity: High
Area: Security
Current state: Plan requires organization scoping and later RLS consideration, but no schema exists.
Impact: Cross-tenant data access is the highest product risk.
Next action: Add organization-scoped service tests in Prompt 1B and Prompt 2; consider RLS ADR after schema baseline.
Owner: Codex
Target phase: Phase B/C
Status: Open

### GAP-005: Romania Workbook Import Requires Structured Parser

Severity: High
Area: Regulatory data
Current state: Workbook is stored under `docs/`; preliminary scan detected sheets and versions, but no importer exists.
Impact: Romania pack cannot be trusted or updated repeatably without source mapping.
Next action: Implement Prompt 4 with source-map coverage tests.
Owner: Codex
Target phase: Phase E
Status: Open

### GAP-006: Legal Review Process Undefined

Severity: High
Area: Regulatory risk
Current state: Product caveat is defined, but no legal review workflow for country-pack changes exists.
Impact: Incorrect national guidance could create commercial and customer risk.
Next action: Implement regulatory source activation lifecycle in Prompt 3 and define reviewer roles before activating country-pack legal changes.
Owner: Product/legal
Target phase: Phase D and Phase K
Status: Open

### GAP-007: Microsoft Graph Permission Bundle Details Need Validation

Severity: Medium
Area: Microsoft connector
Current state: Bundle names and modules are planned, but exact Graph permissions must be validated against current Microsoft docs during implementation.
Impact: Consent flow may request too much, too little, or unavailable permissions.
Next action: Validate permissions while implementing Prompt 7 and record mapping table in `docs/microsoft365-permissions.md`.
Owner: Codex
Target phase: Phase G
Status: Open

### GAP-008: Evidence Metadata, Access, And Export Model Needs ADR

Severity: High
Area: Evidence/reporting
Current state: Object storage targets are known, and Prompt 9 now requires metadata, checksums, access audit, cross-org rejection, legal caveat, source references, and stable export JSON. The final evidence/report data model is not yet recorded.
Impact: Evidence vault, reports, and dashboards could diverge or expose incomplete traceability if implemented without one contract.
Next action: Record evidence/report/export ADR before implementing evidence upload and report generation.
Owner: Codex
Target phase: Phase I
Status: Open

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
Current state: Master plan now limits repository-owned Docker work to image definitions, Compose service catalog, default config, and service dependencies. No Compose files or Dockerfiles exist yet.
Impact: DevOps cannot begin pipeline work from a clear application service/image inventory.
Next action: Run Prompt 1A and create the Compose split for data, storage, webservices, jobs, connectors, reports, and config.
Owner: Codex
Target phase: Phase A
Status: Open

### GAP-014: Application Database Schema And Data Contracts Missing

Severity: High
Area: Database/data model
Current state: Master plan now defines schema groups and the connector-to-output analytical spine, but no Prisma schema or type contracts exist.
Impact: Feature work could drift into ad hoc models that make recommendations, reports, dashboards, and provider telemetry hard to connect.
Next action: Run Prompt 1B before auth, connector, compliance, evidence, or UI implementation.
Owner: Codex
Target phase: Phase B
Status: Open

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
Current state: Prompt 6 now requires sync-run, pagination, retry/throttling, redaction, idempotency, partial-failure, and no-live-write tests, but the harness is not implemented.
Impact: Provider integrations could silently fail, leak secrets, create duplicate resources, or accidentally exercise live write paths.
Next action: Implement Prompt 6 before Microsoft live onboarding work.
Owner: Codex
Target phase: Phase F
Status: Open

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
Current state: Master plan and Prompt 9 require dashboards and reports to derive from stored analysis records, but no report/dashboard contracts exist.
Impact: UI and reports could drift into one-off calculations or live provider calls instead of repeatable, auditable output.
Next action: Implement report and dashboard type contracts in Prompt 1B, then concrete builders in Prompt 9.
Owner: Codex
Target phase: Phase B/I
Status: Open

### GAP-019: Regulatory Source Activation Lifecycle Not Implemented

Severity: High
Area: Regulatory/country packs
Current state: Master plan now defines draft, validation, review, activation, supersession, and immutable-history expectations. No implementation exists yet.
Impact: Workbook or source-monitor changes could accidentally affect legal logic without review if this lifecycle is skipped.
Next action: Implement the skeleton in Prompt 3 and expand it during Romania importer work.
Owner: Codex/Product/legal
Target phase: Phase D/E
Status: Open
