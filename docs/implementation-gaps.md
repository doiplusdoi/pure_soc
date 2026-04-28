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
Next action: Run Prompt 1 from `docs/codex-prompts.md`.  
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
Current state: Vision supports local auth plus Microsoft, Google, GitHub, and optional Keycloak broker. Exact broker/runtime boundary is not yet recorded.  
Impact: Auth implementation could become over-coupled to Keycloak or duplicate OIDC behavior.  
Next action: Record ADR-002 before implementing OIDC beyond placeholders.  
Owner: Codex  
Target phase: Phase B  
Status: Open

### GAP-004: Multitenancy Isolation Strategy Needs Enforcement Tests

Severity: High  
Area: Security  
Current state: Plan requires organization scoping and later RLS consideration, but no schema exists.  
Impact: Cross-tenant data access is the highest product risk.  
Next action: Add organization-scoped service tests and consider RLS ADR after schema baseline.  
Owner: Codex  
Target phase: Phase B  
Status: Open

### GAP-005: Romania Workbook Import Requires Structured Parser

Severity: High  
Area: Regulatory data  
Current state: Workbook is stored under `docs/`; preliminary scan detected sheets and versions, but no importer exists.  
Impact: Romania pack cannot be trusted or updated repeatably without source mapping.  
Next action: Implement Prompt 4 with source-map coverage tests.  
Owner: Codex  
Target phase: Phase D  
Status: Open

### GAP-006: Legal Review Process Undefined

Severity: High  
Area: Regulatory risk  
Current state: Product caveat is defined, but no legal review workflow for country-pack changes exists.  
Impact: Incorrect national guidance could create commercial and customer risk.  
Next action: Add regulatory review task workflow and define reviewer roles.  
Owner: Product/legal  
Target phase: Phase C and Phase J  
Status: Open

### GAP-007: Microsoft Graph Permission Bundle Details Need Validation

Severity: Medium  
Area: Microsoft connector  
Current state: Bundle names and modules are planned, but exact Graph permissions must be validated against current Microsoft docs during implementation.  
Impact: Consent flow may request too much, too little, or unavailable permissions.  
Next action: Validate permissions while implementing Prompt 7 and record mapping table.  
Owner: Codex  
Target phase: Phase F  
Status: Open

### GAP-008: Evidence Storage Encryption Design Needs ADR

Severity: High  
Area: Evidence/security  
Current state: Object storage targets are known, but encryption and key rotation details are not recorded.  
Impact: Evidence vault is sensitive and must be defensible.  
Next action: Record ADR-007 before implementing evidence upload.  
Owner: Codex  
Target phase: Phase H  
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
Impact: Local work can drift without automated gates.  
Next action: Add GitHub Actions or equivalent after package scripts exist.  
Owner: Codex  
Target phase: Phase A or Phase J  
Status: Open

### GAP-012: Billing Plans Need Product Decision

Severity: Medium  
Area: Business/billing  
Current state: Stripe abstraction is planned, but actual products, prices, and entitlements are not defined.  
Impact: Billing implementation can only stub generic plans.  
Next action: Define Base/Pro/MSP/In-a-box entitlements before Phase H.  
Owner: Product  
Target phase: Phase H  
Status: Open
