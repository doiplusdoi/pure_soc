# Skill Install Proposal

Status: Option A executed on 2026-04-28.  
Decision: PureSOC will be hosted on our own infrastructure, so Azure hosting/runtime skills are not part of the recommended bundle.

## Goal

Install or create only skills that accelerate PureSOC's real work:

- Business integrations.
- Provider connectors.
- Billing and entitlement integration.
- OAuth/OIDC login integrations.
- Regulatory workbook import.
- Evidence/report export.
- Connector testing, security, and diagnostics.

## Research Summary

Searched OpenAI and Microsoft GitHub skill repositories for relevant `SKILL.md` files.

OpenAI source:

- `openai/skills`: https://github.com/openai/skills

Microsoft source:

- `microsoft/skills`: https://github.com/microsoft/skills

Useful public skills exist for UI, browser validation, threat modeling, and MCP tooling. There is no sufficiently precise public skill for PureSOC's core connector work, especially Microsoft Graph plus NIS2 country-pack logic. Those should be project-local PureSOC skills.

## Keep From Public Catalogs

### 1. OpenAI `playwright-interactive`

Source:

- https://github.com/openai/skills/tree/main/skills/.curated/playwright-interactive

Why:

- Browser-verifies auth, onboarding, Microsoft connection health, country-pack warnings, reports, and remediation approval flows.

Priority: Required.

Install result:

- Installed to `.agents/skills/playwright-interactive`.

### 2. OpenAI `security-threat-model`

Source:

- https://github.com/openai/skills/tree/main/skills/.curated/security-threat-model

Why:

- Connectors handle OAuth codes, provider tokens, evidence, tenant inventory, billing webhooks, and write-capable remediation. These need repo-grounded threat modeling.

Priority: Required.

Install result:

- Installed to `.agents/skills/security-threat-model`.

### 3. OpenAI `frontend-skill`

Source:

- https://github.com/openai/skills/tree/main/skills/.curated/frontend-skill

Why:

- Useful for React/Next.js implementation work. For PureSOC it should be used in operational UI mode, not landing-page mode.

Priority: Recommended, but not installed.

Install result:

- Not available in the current OpenAI curated or experimental skill listings when installation was attempted.
- Use local `impeccable` plus Microsoft `frontend-design-review` for frontend work.

### 4. Microsoft `frontend-design-review`

Source:

- https://github.com/microsoft/skills/tree/main/.github/skills/frontend-design-review

Why:

- Strong review skill for dashboards, onboarding forms, warnings, accessibility, and remediation approval UX.

Priority: Recommended.

Install result:

- Installed to `.agents/skills/frontend-design-review`.

### 5. Microsoft `mcp-builder`

Source:

- https://github.com/microsoft/skills/tree/main/.github/skills/mcp-builder

Why:

- Useful later if PureSOC exposes internal support/admin/regulatory tools through MCP. This is not needed for Phase A.

Priority: Optional.

## Do Not Install Now

Do not install Azure hosting/runtime skills for this project:

- `cloud-solution-architect`
- `azure-identity-ts`
- `azure-keyvault-keys-ts`
- `azure-keyvault-secrets-ts`
- `azure-storage-blob-ts`
- `azure-postgres-ts`
- `azure-monitor-opentelemetry-ts`

Reason:

- We are not targeting Azure hosting as the implementation baseline.
- Identity, storage, encryption, PostgreSQL, and observability should be designed provider-neutral and self-host-friendly first.

Also do not install Microsoft `m365-agents-ts` for the core connector phase.

Reason:

- It is for Microsoft 365 Agents SDK patterns, not the Microsoft Graph compliance connector we need first.

## Project-Local PureSOC Skills To Create

These are more important than public catalog installs because they encode PureSOC's connector rules and business architecture.

Recommended location:

```txt
.agents/skills/
```

Optional mirror for GitHub Copilot workflows:

```txt
.github/skills/
```

### 1. `puresoc-provider-connector`

Purpose:

- Standard workflow for implementing any provider connector.

Should cover:

- `CloudProviderConnector` interface.
- Connection lifecycle.
- Module-level sync status.
- Pagination, throttling, retries, idempotency.
- Raw and normalized resource storage.
- Capability/license/permission detection.
- Audit events.
- Token redaction.
- Failure isolation.
- Contract tests and mock scenarios.

Priority: Required before provider work.

### 2. `puresoc-microsoft365-graph-connector`

Purpose:

- Microsoft 365 connector implementation skill focused on Graph, Intune, Defender XDR, and permission bundles.

Should cover:

- Admin consent flow.
- Permission bundle design.
- MSAL/client credential handling.
- Graph pagination and throttling.
- Tenant profile, licenses, users, groups, roles.
- Conditional Access, apps/service principals, Secure Score.
- Intune and Defender module availability.
- Missing permission/license behavior.
- No write scopes on first onboarding.

Priority: Required for Microsoft phase.

### 3. `puresoc-oidc-social-login`

Purpose:

- Keep user login integrations separate from cloud-provider connectors.

Should cover:

- Local auth boundary.
- Microsoft, Google, and GitHub sign-in.
- OIDC versus OAuth differences.
- Account linking.
- Email verification assumptions.
- Callback validation, state, nonce, PKCE where applicable.
- Session creation and audit events.

Priority: Required before OIDC work.

### 4. `puresoc-stripe-billing`

Purpose:

- Stripe integration skill for subscriptions and entitlements.

Should cover:

- Billing provider abstraction.
- Checkout session.
- Customer portal.
- Webhook signature verification.
- Idempotent event processing.
- Subscription status mapping.
- Entitlement calculation.
- `BILLING_PROVIDER=none` for in-a-box installs.

Priority: Required for billing phase.

### 5. `puresoc-regulatory-xlsx-importer`

Purpose:

- Convert official/regulatory Excel workbooks into versioned seed data with source maps.

Should cover:

- XLSX extraction.
- Sheet/cell/range source mapping.
- Formula and data validation handling.
- Romania NIS2 workbook fields and classification rules.
- Generated seed JSON.
- Import validation reports.
- Tests for source coverage and repeatability.

Priority: Required for Romania country pack.

### 6. `puresoc-evidence-reporting`

Purpose:

- Evidence vault and report/export implementation skill.

Should cover:

- Evidence metadata and control links.
- Object storage abstraction for self-hosted infrastructure.
- Upload scanning hook.
- Access logs.
- PDF/JSON export.
- Legal caveat enforcement.
- Source references in reports.

Priority: Required before evidence/report work.

### 7. `puresoc-connector-test-harness`

Purpose:

- Standard testing strategy for all external integrations.

Should cover:

- Mock provider fixtures.
- Contract tests.
- Replayable HTTP fixtures where appropriate.
- Rate limit and retry tests.
- Permission denied tests.
- Token redaction tests.
- Partial module failure tests.
- No accidental live write tests.

Priority: Required before Microsoft read-only sync.

## Recommended Bundle

Option A: Best fit for PureSOC now.

Install public skills:

- `playwright-interactive`
- `security-threat-model`
- `frontend-design-review`

Attempted but unavailable:

- `frontend-skill`

Create project-local PureSOC skills:

- `puresoc-provider-connector`
- `puresoc-microsoft365-graph-connector`
- `puresoc-oidc-social-login`
- `puresoc-stripe-billing`
- `puresoc-regulatory-xlsx-importer`
- `puresoc-evidence-reporting`
- `puresoc-connector-test-harness`

Execution result:

- Installed `.agents/skills/playwright-interactive`.
- Installed `.agents/skills/security-threat-model`.
- Installed `.agents/skills/frontend-design-review`.
- Created all seven PureSOC project-local skills under `.agents/skills/`.
- Added `agents/openai.yaml` metadata for all seven PureSOC skills.
- Validated all seven PureSOC `SKILL.md` files with the skill-creator quick validator.

Option B: Connector-only minimal bundle.

Create project-local PureSOC skills only:

- `puresoc-provider-connector`
- `puresoc-microsoft365-graph-connector`
- `puresoc-oidc-social-login`
- `puresoc-stripe-billing`
- `puresoc-regulatory-xlsx-importer`
- `puresoc-connector-test-harness`

Option C: Public skills only.

Install:

- `playwright-interactive`
- `security-threat-model`
- `frontend-design-review`

## Future Approval Needed

Approve only if the team wants to additionally:

1. Mirror skills into `.github/skills/` for GitHub Copilot workflows.
2. Add Microsoft `mcp-builder` later for internal MCP/admin tooling.
3. Replace the unavailable OpenAI `frontend-skill` with another public frontend skill if one becomes available.
