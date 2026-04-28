# Codex Prompts

Use these prompts as implementation tickets. Each prompt must end with tests run, changed files, and gap updates.

## Prompt 1: Bootstrap Monorepo

```txt
You are implementing PureSOC Phase A.

Read:
- docs/puresoc_vision.md
- docs/master-plan.md
- docs/implementation-gaps.md

Goal:
Create the initial TypeScript monorepo and Docker-first developer platform.

Implement:
- pnpm workspace
- apps/web
- apps/api
- apps/worker
- apps/scheduler
- apps/regulatory-importer
- apps/report-renderer
- packages/shared
- packages/config
- packages/audit
- packages/providers/core
- packages/compliance/core
- packages/compliance/nis2/eu
- packages/compliance/nis2/country-packs/core
- packages/compliance/nis2/country-packs/ro
- packages/billing/core
- infra/compose
- infra/docker
- .env.example

Acceptance:
- pnpm install works
- pnpm lint works
- pnpm test works
- docker compose --profile core up --build starts core services
- API health endpoint returns OK

Constraints:
- Do not implement Microsoft-specific logic outside packages/providers/microsoft365.
- Do not implement Romania-specific logic outside the Romania country-pack package.
- Do not add provider write/remediation actions.

Update docs/implementation-gaps.md with any unresolved decisions.
```

## Prompt 2: Auth, Organization, RBAC, Audit

```txt
You are implementing PureSOC Phase B.

Goal:
Add local auth, organizations, RBAC, and audit events.

Implement:
- local email/password registration
- Argon2id password hashing
- email verification token model
- password reset token model
- login/logout/session endpoints
- organization creation
- organization membership model
- basic RBAC middleware/guard
- audit writer and audit table
- rate limit for failed login attempts

Tests:
- password hash verification
- token expiry
- local registration/login integration
- organization creation
- cross-organization access rejection
- failed login audit event
- no password/token serialization in logs or responses

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand auth organization rbac audit

Update docs/implementation-gaps.md with any deferred auth/OIDC decisions.
```

## Prompt 3: EU Regulatory Foundation

```txt
You are implementing PureSOC Phase C.

Goal:
Create the EU NIS2 regulatory foundation without country-specific leakage.

Implement:
- EU member state seed for all 27 countries
- regulatory framework model for NIS2
- country-pack interface
- country-pack completeness state
- country-pack status API
- Romania marked as planned full pack
- other EU countries marked baseline-only until researched
- regulatory source model skeleton

Tests:
- all 27 EU member states load
- country-pack status returns all member states
- Romania status differs from baseline-only countries
- generic EU code has no Romania-specific conditionals

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand nis2 country-pack regulatory
```

## Prompt 4: Romania Workbook Importer

```txt
You are implementing PureSOC Phase D importer.

Source:
- docs/nis2ro-tool-v-2-1.xlsx
- docs/puresoc_vision.md section 11

Goal:
Convert the Romanian NIS2@RO workbook into versioned regulatory seed data.

Implement:
- XLSX parser/importer for relevant workbook sheets
- generated seed JSON for Romania
- source map from sheet/cell/range to question, option, field, or rule
- importer validation report
- no hardcoded workbook logic in UI

Required sheets:
- Entity data
- Entity assessment
- Notification form
- Liste
- Ajutor
- Algoritm clasificare

Tests:
- workbook version extraction
- key fields extracted
- service sector options extracted
- classification rules extracted or encoded with source mapping
- source map coverage for imported fields

Acceptance commands:
- pnpm test -- --runInBand regulatory-import ro-workbook
```

## Prompt 5: Romania Classification Service

```txt
You are implementing PureSOC Phase D classification.

Goal:
Build a pure, testable Romania NIS2 classification service.

Implement:
- packages/compliance/nis2/country-packs/ro/classification.service.ts
- packages/compliance/nis2/country-packs/ro/classification.service.spec.ts
- result type:
  - insufficient_data
  - out_of_scope
  - voluntary_registration_possible
  - important_entity
  - essential_entity
- reasons, matchedRules, missingRequiredFields, article9Required, notificationRecommended, sourceVersion

Test scenarios:
- insufficient data
- out of scope
- voluntary registration possible
- important entity by sector/size
- essential entity by special category
- Article 9 required
- public administration special case
- critical entity Law 294/2024 case

Acceptance:
- classification logic is pure and deterministic
- tests use seed data/source mappings
- no React/UI logic in classification service
```

## Prompt 6: Provider Core and Mock Microsoft Provider

```txt
You are implementing PureSOC Phase E.

Goal:
Create provider-neutral connector contracts and a mock Microsoft provider.

Implement:
- CloudProviderConnector interface
- provider-neutral resource types
- ProviderConnection model
- ProviderModuleStatus model
- ProviderResource model with raw_json and normalized_json
- ProviderFinding model
- Microsoft provider skeleton
- Google Workspace stub
- mock Microsoft provider scenarios

Tests:
- provider contract tests
- mock healthy tenant
- mock missing MFA
- mock no Intune license
- mock risky admin roles
- mock Defender incidents
- one module failure does not fail full sync

Acceptance:
- compliance packages import only provider core types
- Microsoft-specific code remains under Microsoft provider package
```

## Prompt 7: Microsoft 365 Consent and Read-Only Sync

```txt
You are implementing PureSOC Phase F.

Goal:
Add Microsoft 365 tenant onboarding and read-only discovery.

Implement:
- begin consent endpoint
- callback endpoint
- permission bundle tracking
- tenant profile sync
- license sync
- users/groups/roles sync
- app registrations/service principals sync
- Secure Score sync
- module status and connection health UI/API

Constraints:
- Do not request write scopes during first onboarding.
- Do not store Global Admin credentials.
- Do not fail the whole connection if one module lacks permission or license.

Tests:
- consent URL generation
- callback validation
- token storage is encrypted
- missing permission module status
- missing license module status
- mocked Graph sync happy path
```

## Prompt 8: Compliance Gap Engine

```txt
You are implementing PureSOC Phase G.

Goal:
Map provider findings and manual tasks to NIS2 controls and produce a readiness plan.

Implement:
- control catalog seed
- control mapping model
- gap calculation service
- readiness plan and plan items
- manual checklist generation
- country-pack warnings in assessment output

Tests:
- Microsoft findings map to controls through provider-neutral findings
- manual controls generate checklist items
- country-pack missing data creates warning, not false technical failure
- gap plan has owner, due date, status, source references
```

## Prompt 9: Evidence and Reports

```txt
You are implementing PureSOC Phase H.

Goal:
Add evidence vault and report generation.

Implement:
- evidence upload
- provider snapshot evidence
- evidence-control linking
- evidence access audit
- report renderer service
- internal readiness report
- Romania notification draft JSON and PDF export

Tests:
- upload and download authorization
- access audit entry
- report includes legal caveat
- report includes source references
- Romania draft includes source-mapped fields
```

## Prompt 10: UX Review and Polish

```txt
You are improving PureSOC frontend UX.

Use the approved UX/UI skill for this repo.

Goal:
Review and improve the operational UI for clarity, density, accessibility, and workflow speed.

Check:
- app shell navigation
- dashboard information hierarchy
- onboarding save/resume behavior
- country-pack warnings
- Microsoft connection health
- gap report scanning
- remediation approval affordances
- mobile and desktop layout
- keyboard/focus states
- legal caveat placement

Acceptance:
- no overlapping text
- no marketing-style landing page in app shell
- source/confidence indicators are visible
- risky actions show blast radius and approval state
- Playwright screenshots pass desktop and mobile checks
```

## Prompt 11: Security Threat Model

```txt
You are threat-modeling PureSOC before release.

Goal:
Find concrete security risks and convert them into tests or implementation tickets.

Review:
- local auth
- OIDC callback handling
- provider token storage
- organization scoping
- evidence downloads
- upload scanning
- report export URLs
- Stripe webhook validation
- audit log integrity
- remediation approval and execution

Output:
- ranked findings
- exploit path
- affected files
- required test
- proposed fix
- residual risk

Do not make legal compliance claims.
```

## Prompt 12: Gap Register Update

```txt
You are maintaining project velocity.

Read:
- docs/implementation-gaps.md
- latest changed files
- latest test output

Goal:
Update the gap register with any new blockers, assumptions, deferred decisions, or missing tests.

For each gap include:
- id
- severity
- area
- current state
- impact
- next action
- owner
- target phase
- status

Keep resolved gaps for auditability, marked as resolved with date.
```
