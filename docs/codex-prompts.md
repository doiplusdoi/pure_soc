# Codex Prompts

Use these prompts as the active PureSOC implementation tickets. This file was refreshed on 2026-04-30 after reviewing the implemented code, `docs/PLAN.md`, `docs/PLAN_M1.md`, `docs/claude_rec.md`, and `docs/implementation-gaps.md`.

Completed Phase A through the contract-level Phase I output work and M11 OIDC/social-login callback work has been removed from the active prompt list. Do not re-run old bootstrap, schema-contract, local-auth/OIDC, EU foundation, Romania importer/classifier, provider-core, Microsoft consent/read-only baseline, compliance-engine, or in-memory evidence/report/dashboard prompts unless a prompt below explicitly asks you to modify that surface.

## Repository Path Convention

PureSOC uses the shared AI project template layout. Application paths in implementation prompts are relative to `code/` unless they explicitly start with `docs/` or another root-level path.

Examples:

```txt
apps/api -> code/apps/api
packages/config -> code/packages/config
infra/compose/docker-compose.yml -> code/infra/compose/docker-compose.yml
data/regulatory -> code/data/regulatory
```

Run package manager, test, and Compose commands from `code/`.

## Current Implementation Baseline

The repository currently contains:

- Template-aligned `code/` monorepo, Compose catalog, config defaults, Dockerfiles, and smoke tests.
- Prisma schema and TypeScript data contracts for identity, organizations, providers, regulatory sources, compliance, evidence, reports, dashboards, and billing.
- Local auth, session, organization, RBAC, and audit foundations using in-memory repositories for API tests.
- EU NIS2 foundation, all 27 member-state country-pack statuses, and source activation skeleton.
- Romania workbook importer outputs, source maps, classification service, onboarding schema, and notification-draft contracts.
- Provider-neutral connector contracts, connector runner, mock provider scenarios, and Microsoft 365 consent/read-only baseline with documented permission bundles.
- Compliance evaluator, gap generation, recommendation generation, readiness plan, checklist generation, and representative control catalog.
- Evidence metadata, access audit, JSON report/export builders, dashboard aggregation, and API routes backed by stored in-memory analysis records.
- PLAN_M2 hardening: legal-review country-pack warnings, no-signal provider-mapped control guard, compliance/recommendation request validation, synchronous `200` evaluation response, and audit events for evaluation/recommendation generation.
- PLAN_M3 contract alignment: logical control IDs in Prisma output references, split finding/actionable severity, date-only readiness due dates, gap/recommendation/plan source identity fields, and an in-memory `ComplianceResultRepository` port.
- PLAN_M4 Prisma persistence slice: pinned Prisma 6.19.3 CLI/client workflow, generated initial migration, Prisma client factory, compliance-result snapshot table, and `PrismaComplianceResultRepository` with organization-scoped adapter tests.
- PLAN_M5 workspace import policy: cross-package imports now go through `@puresoc/*` package exports, workspace dependencies are declared, shared source/reference/recommendation/finding contracts live in `@puresoc/shared`, compliance-core no longer imports provider-core types, and `scripts/check-layout.mjs` enforces package boundaries.
- PLAN_M6 regulatory review workflow: source versions, validation reports, source maps, review tasks, review decisions, activation timestamps, supersession links, source-map traceability routes, and `regulatory_admin` authorization now prevent source-derived legal logic from silently becoming active.
- PLAN_M7 billing foundation: billing provider contracts, configurable placeholder plans/entitlements, Stripe checkout/portal adapter, raw-body webhook signature verification, idempotent billing event ledger, subscription status mapping, `BILLING_PROVIDER=none` bypass behavior, Prisma billing repository adapter, API routes, and billing audit events.
- PLAN_M8 production evidence/report adapters: S3/MinIO object-storage adapter, explicit no-op/mock/HTTP scanner adapters with production fail-closed behavior, Prisma evidence metadata/access-log repository, generated-report evidence artifacts, report/export audit events, and deterministic report-renderer JSON/PDF artifacts.
- PLAN_M9 safe remediation foundation: recommendation-to-action templates/runs, preflight/approval/snapshot/verification/evidence metadata, action audit events, action API routes, Prisma action repository metadata, and future worker job contracts without live provider writes.
- PLAN_M10 operational UI/design system: ADR-014, `@puresoc/ui` OKLCH tokens and semantic primitives, `apps/web` contract-backed operational console renderer, login focus surface, source/caveat indicators, approval affordances, and static `@ui-smoke` coverage.
- PLAN_M11 OIDC/social-login callbacks: Microsoft Entra, Google, and GitHub user sign-in callback contracts with state, nonce, PKCE, issuer/audience/expiry/signature validation, provider-subject lookup, explicit signed-in account-link approval, session creation, audit events, redaction coverage, and separation from Microsoft 365 managed-provider consent.

Known major remaining work is tracked in `docs/implementation-gaps.md` and `docs/claude_rec.md`.

## Incremental Milestone Plan Rule

Each active prompt is paired with an incremental milestone file under `docs/PLAN_Mx.md`.

- `docs/PLAN_M1.md` records the completed template-aligned skeleton milestone.
- Prompt 1 / `docs/PLAN_M2.md` is completed.
- Prompt 2 / `docs/PLAN_M3.md` is completed.
- Prompt 3 / `docs/PLAN_M4.md` is completed.
- Prompt 4 / `docs/PLAN_M5.md` is completed.
- Prompt 5 / `docs/PLAN_M6.md` is completed.
- Prompt 6 / `docs/PLAN_M7.md` is completed.
- Prompt 7 / `docs/PLAN_M8.md` is completed.
- Prompt 8 / `docs/PLAN_M9.md` is completed.
- Prompt 9 / `docs/PLAN_M10.md` is completed.
- Prompt 10 / `docs/PLAN_M11.md` is completed.
- Prompt 11 starts at `docs/PLAN_M12.md`.
- Continue incrementing one milestone number per prompt unless this file is intentionally reordered.

During each prompt run:

1. Create or update the current `docs/PLAN_Mx.md` at the start of implementation with scope, assumptions, expected files, validation plan, and expected gap movement.
2. Complete the implementation and validation.
3. Update the same `docs/PLAN_Mx.md` with actual changed files, validation results, acceptance status, gaps updated, residual risk, and deferred work.
4. Update `docs/codex-prompts.md` based on the implementation results, retiring completed work and rewriting or reordering the remaining prompts as needed.
5. Create the next `docs/PLAN_M{x+1}.md` stub from the next active prompt after `docs/codex-prompts.md` has been updated.

## Active Prompt Order

Recommended next sequence:

1. Prompt 11 / `PLAN_M12`: Microsoft 365 Read-Only Module Expansion.
2. Prompt 12 / `PLAN_M13`: Full Control Catalog And Readiness Scoring Calibration.
3. Prompt 13 / `PLAN_M14`: Security Threat Model And Release Hardening.
4. Prompt 14 / `PLAN_M15`: Gap Register And Prompt QA.

Prompts 11 through 13 can be reordered when dependencies are satisfied, but do not implement provider write actions before the deferred M9/GAP-030 runtime safety work exists and passes.

## Required Prompt Template

Each implementation prompt must include:

```txt
Read:
- docs/puresoc_vision.md
- docs/master-plan.md
- docs/implementation-gaps.md
- docs/codex-prompts.md
- docs/LEARNINGS.md
```

Add narrower source files, ADRs, skills, or review documents inside the prompt as needed.

Each implementation prompt must include:

```txt
Negative constraints:
- Do not put Microsoft-specific logic in generic compliance packages.
- Do not put Romania-specific logic in EU baseline packages.
- Do not hardcode regulatory facts in UI conditionals.
- Do not add provider write/remediation actions unless the prompt explicitly asks for an approved safety-gated model.
- Do not make legal certification claims.
```

Each implementation prompt must end with:

```txt
Final response must include:
- Changed files
- Tests run
- Acceptance status
- Gaps updated
- PLAN_Mx updated
- Next PLAN_Mx created
- Codex prompts updated
- Residual risk
```

Gap updates:

```txt
Update docs/implementation-gaps.md with blockers, assumptions, deferred decisions, missing tests, or resolved gap status.
Keep resolved gaps for auditability.
```

Milestone plan updates:

```txt
At the start of implementation:
- Create or update the current docs/PLAN_Mx.md for this prompt.

Before final response:
- Update the same docs/PLAN_Mx.md with implementation results and validation.
- Update docs/codex-prompts.md based on completed work, changed ordering, split prompts, or newly discovered gaps.
- Create the next docs/PLAN_M{x+1}.md stub from the next active prompt.
```

## Completed Prompt 1 / PLAN_M2: Compliance Correctness, Input Validation, And Audit Hardening

Completed on 2026-04-30.

Summary:
- `requires_legal_review` country-pack completeness now emits a visible warning.
- Provider-mapped controls no longer pass from silence; they require a mapped signal or completed manual fallback with evidence.
- Compliance and recommendation routes now validate request bodies before handing data to domain services.
- Recommendation gaps with mismatched organizations are rejected.
- Synchronous compliance evaluation returns `200`.
- Compliance evaluation and recommendation generation write audit events with count summaries.
- Caller-supplied manual tasks take precedence without generating unused checklist items.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand compliance recommendations audit validation`

## Completed Prompt 2 / PLAN_M3: Schema And Contract Alignment For Persistable Results

Completed on 2026-04-30.

Summary:
- Logical control IDs such as `nis2.access-control.mfa` are now compatible with Prisma output/control-reference fields instead of UUID-only columns.
- Provider finding severity is split from actionable gap/recommendation severity; `informational` remains valid for findings but not gaps or recommendations.
- Readiness plan item due dates now use date-only schema semantics.
- Gap, recommendation, and readiness plan outputs retain provider finding IDs and manual task IDs alongside human-readable summaries.
- A `ComplianceResultRepository` port and in-memory implementation now cover control results, gaps, recommendations, readiness plans, and checklist items.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand database schema compliance gaps recommendations readiness-plan`

## Completed Prompt 3 / PLAN_M4: Prisma Migration, Generated Client, And Repository Adapter Slice

Completed on 2026-04-30.

Summary:
- Prisma CLI and `@prisma/client` are pinned to 6.19.3 to preserve the current schema datasource workflow; Prisma 7 migration is intentionally deferred.
- Workspace and database-package scripts now cover Prisma validate, generate, and migrate status commands.
- The initial migration SQL is generated under `packages/database/prisma/migrations/20260430000000_initial`.
- `packages/database/src/client.ts` now exposes a Prisma client factory boundary.
- A `compliance_result_snapshots` table preserves exact compliance result-set reloads, while granular control result, gap, recommendation, readiness-plan, and plan-item rows are written by `PrismaComplianceResultRepository`.
- Repository tests cover persistence/reload behavior and organization-scoped reads/deletes through a deterministic fake Prisma delegate boundary.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand database prisma repository compliance`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 4 / PLAN_M5: Workspace Import Policy And Shared Type Boundaries

Completed on 2026-04-30.

Summary:
- Cross-package imports now use `@puresoc/*` package exports instead of deep relative `packages/.../src` paths.
- Workspace package manifests declare the `@puresoc/*` dependencies they consume, and `code/pnpm-lock.yaml` was refreshed.
- `scripts/check-layout.mjs` now rejects cross-package deep relative imports, deep `@puresoc/*/src` imports, and missing workspace dependency declarations.
- Shared source-reference, confidence, recommendation summary, and provider-finding-for-compliance contracts live in `@puresoc/shared`.
- Compliance-core evaluates neutral `ProviderFindingForCompliance` inputs instead of importing provider-core types.
- Cross-package integration tests were moved to root `code/tests` to avoid package dependency cycles.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand import-smoke compliance recommendations provider`

## Completed Prompt 5 / PLAN_M6: Regulatory Review Workflow And Source Activation Persistence

Completed on 2026-04-30.

Summary:
- Regulatory source imports now persist source records, source versions, validation reports, source maps, review tasks, review decisions, activation timestamps, and supersession links through `@puresoc/regulatory-sources`.
- Changed legal logic remains `review_required` and creates a `regulatory_admin` review task; source-monitor task creation creates review work without activating legal logic.
- API routes list review tasks, mark tasks reviewed/rejected/activated, and read source-map traceability under organization RBAC.
- Prisma schema, initial migration metadata, and a structural Prisma repository adapter now include source-version activation state, validation reports, review decisions, and supersession links.
- GAP-006 remains open for product/legal reviewer operating procedure and UI; GAP-027 tracks runtime source-monitor scheduling.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand regulatory source-activation review-task source-map`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 6 / PLAN_M7: Billing Provider And Entitlements

Completed on 2026-04-30.

Summary:
- `@puresoc/billing-core` now defines billing provider contracts, repository records, entitlement keys, plan-based entitlement calculation, Stripe subscription status mapping, safe webhook event payloads, and `none` / `offline_license` provider behavior.
- `@puresoc/billing-stripe` now creates Checkout, Customer Portal, and Customer API requests through an injectable Stripe client and verifies webhook signatures against the raw request body.
- API billing routes now cover entitlement listing, Stripe checkout, Stripe portal, and unauthenticated-but-signature-verified webhook ingestion with RBAC on organization billing actions.
- Billing events are idempotent, subscription transitions recalculate entitlements, `BILLING_PROVIDER=none` bypasses external billing while enabling configured base entitlements, and billing changes write audit events.
- Prisma schema and migration metadata now include `paused` and `incomplete_expired` billing subscription statuses, and `PrismaBillingRepository` provides a persistence adapter boundary.
- GAP-012 remains open for final product/pricing decisions; GAP-028 tracks deferred live Stripe runtime reconciliation and operations.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand billing stripe entitlement webhook audit`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 7 / PLAN_M8: Production Evidence, Object Storage, Scanner, And PDF Adapters

Completed on 2026-04-30.

Summary:
- `@puresoc/evidence` now includes a S3/MinIO-compatible object-storage adapter, explicit no-op/mock/HTTP upload scanner adapters, scanner metadata on artifacts, and fail-closed upload behavior when clean scan completion is required.
- API evidence services can select configured storage/scanner adapters while preserving the in-memory default harness.
- `@puresoc/database` now includes a Prisma-backed evidence artifact/link/access-log repository and schema/migration metadata for scanner details.
- Report generation now stores JSON report exports as `generated_report` evidence artifacts, links them to reports/regulatory sources, and writes `report_generated` plus `report_export_created` audit events.
- `apps/report-renderer` now returns deterministic JSON and stable placeholder PDF artifacts for contract tests.
- GAP-008 and GAP-018 were updated, and GAP-029 now tracks live MinIO/scanner/browser-PDF/CSV/binary-bundle runtime work.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand evidence reports dashboards exports renderer storage scanner`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 8 / PLAN_M9: Safe Remediation Foundation

Completed on 2026-04-30.

Summary:
- `@puresoc/recommendations` now owns a remediation action lifecycle with action templates, action runs, preflight results, approval state, snapshot metadata, verification results, manual/guided follow-up tasks, high-risk V1-forbidden executable default protection, and an in-memory repository.
- `@puresoc/providers-core` now exposes provider-neutral action validation/apply/verify/evidence contracts as optional future connector capabilities; no provider write implementation was added.
- API action routes and service methods now create action runs, record preflight, request/approve, attach snapshots, queue future jobs, fail, verify, and close actions with RBAC and audit events.
- Evidence uploads now link action pre/post-state artifacts to `action_run` targets.
- Prisma schema, migration metadata, and `PrismaActionRepository` now carry action safety-state metadata for later persisted runtime wiring.
- `apps/worker` now has a future action execution job contract that requires explicit safety-gate confirmations.
- GAP-030 tracks deferred live worker/provider execution.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand actions remediation approval preflight evidence audit`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 9 / PLAN_M10: Operational UI And Design System

Completed on 2026-04-30.

Summary:
- ADR-014 now documents the PureSOC operational design-system direction: restrained product UI, OKLCH tokens, semantic primitives, visible source/caveat/safety states, and stored-analysis-backed screens.
- `@puresoc/ui` now provides reusable CSS tokens and primitives for status pills, source chips, meters, legal caveats, command buttons, and tables.
- `apps/web` now renders a deterministic operational console from stored dashboard/report/evidence/remediation contracts, including dashboard, onboarding, country-pack, Microsoft 365 health, gaps, recommendations, evidence/report, login focus, and approval surfaces.
- Remediation approval UI shows preflight checks, approval status, pre-state snapshots, blast radius, manual fallback, and a disabled queue affordance without adding provider write execution.
- `pnpm test:e2e -- --grep "@ui-smoke"` now runs the static UI smoke check. Browser-grade Playwright screenshots remain deferred in GAP-031 until the served web runtime exists.
- GAP-009 is resolved for the design-system decision; GAP-031 tracks the deferred served runtime and screenshot harness.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand web dashboard reports`
- `pnpm test:e2e -- --grep "@ui-smoke"`

## Completed Prompt 10 / PLAN_M11: OIDC/Social Login Callback Implementation

Completed on 2026-04-30.

Summary:
- `@puresoc/auth-oidc` now implements disabled-by-default Microsoft Entra, Google, and GitHub user sign-in callbacks through the auth abstraction, separate from Microsoft 365 managed-provider consent.
- Callback state, nonce, PKCE verifier exchange, issuer, audience, expiry, signature status, verified email, and provider subject are validated before session creation.
- Email collisions require a signed-in user to explicitly approve account linking; email alone is not trusted.
- Social-login sessions reuse the existing PureSOC session model, and login, failed login, account-linked, and account-link-rejected paths write audit events without serializing OAuth codes, tokens, state, nonce, cookies, or PKCE verifiers.
- API routes now expose `POST /auth/oidc/:provider/begin` and `GET|POST /auth/oidc/:provider/callback`.
- GAP-003 is resolved for callback/account-linking implementation; GAP-032 tracks live provider registration, callback smoke, secret rotation, and deployed cookie validation.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand auth oidc social-login session audit redaction`

## Prompt 11 / PLAN_M12: Microsoft 365 Read-Only Module Expansion

```txt
You are expanding Microsoft 365 read-only discovery after revalidating current official Microsoft documentation.

Use skills:
- puresoc-provider-connector
- puresoc-microsoft365-graph-connector
- puresoc-connector-test-harness

Read:
- docs/puresoc_vision.md sections 8, 9, 20, 22, 23, 29, 32
- docs/master-plan.md sections 9, 11, 14, 15
- docs/implementation-gaps.md
- docs/codex-prompts.md
- docs/LEARNINGS.md
- docs/microsoft365-permissions.md
- docs/adr/ADR-009-microsoft-graph-permission-bundles.md

Goal:
Add deferred read-only Microsoft modules with module-level degradation and updated permission documentation.

Milestone plan:
- Current milestone file: `docs/PLAN_M12.md`.
- Completion handoff: update `docs/codex-prompts.md`, then create `docs/PLAN_M13.md` from the next active prompt.

Expected file ownership:
- docs/PLAN_M12.md
- docs/PLAN_M13.md
- docs/codex-prompts.md
- packages/providers/microsoft365
- apps/api/src/provider-connections/microsoft365
- apps/connector-runner/src/microsoft365
- packages/providers/core if neutral resource/finding types need extension
- docs/microsoft365-permissions.md
- mock Graph fixtures/tests

Implement candidates:
- Conditional Access read sync if permissions and API behavior are validated.
- Entra audit/sign-in logs read sync where licensed and permitted.
- Exchange/SharePoint/Teams/Purview posture read modules where Graph supports reliable read-only signals.
- Defender XDR incidents/alerts read module if docs and fixtures support it.
- Capability detection for missing license, missing permission, unsupported API, national-cloud limitation, and connector error.
- Provider-neutral resources/findings only after raw payload capture.

Negative constraints:
- Do not request write scopes during onboarding.
- Do not store Global Administrator credentials.
- Do not fail the whole connection if one module lacks permission or license.
- Do not put Microsoft-specific branching in the generic NIS2 evaluator.
- Do not log OAuth codes, access tokens, refresh tokens, tenant secrets, or authorization headers.
- Do not rely on stale Microsoft permission assumptions; re-check official docs during implementation and cite/update `docs/microsoft365-permissions.md`.

Tests:
- Permission mapping fixture tests.
- Missing permission module status.
- Missing license module status.
- Unsupported API module status.
- Graph pagination handling.
- Throttling/retry behavior.
- Mocked Graph sync happy paths for each new module.
- Token redaction assertions.
- Generic compliance still consumes provider-neutral findings.

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand microsoft365 graph-sync permissions redaction provider

Gap updates:
- Update GAP-007 with revalidated permission details and unresolved Microsoft API limitations.
- Add deferred module gaps if docs/API coverage is insufficient.

Final response must include:
- Changed files
- Tests run
- Acceptance status
- Gaps updated
- PLAN_M12 updated
- PLAN_M13 created
- Codex prompts updated
- Residual risk
```

## Prompt 12 / PLAN_M13: Full Control Catalog And Readiness Scoring Calibration

```txt
You are expanding the representative Phase H control catalog into a fuller internal-readiness model.

Read:
- docs/puresoc_vision.md sections 10, 14, 15, 16, 23, 25, 28, 32
- docs/master-plan.md sections 7, 10, 12, 14, 15
- docs/implementation-gaps.md
- docs/codex-prompts.md
- docs/LEARNINGS.md
- docs/claude_rec.md sections REC-014, REC-015, REC-016

Goal:
Expand EU NIS2 controls and provider/manual/evidence mappings while keeping scores conservative, source-linked, and clearly labeled as PureSOC internal readiness.

Milestone plan:
- Current milestone file: `docs/PLAN_M13.md`.
- Completion handoff: update `docs/codex-prompts.md`, then create `docs/PLAN_M14.md` from the next active prompt.

Expected file ownership:
- docs/PLAN_M13.md
- docs/PLAN_M14.md
- docs/codex-prompts.md
- data/regulatory/eu/*control*.seed.json
- packages/compliance/core/src/control-catalog.ts
- packages/compliance/core/src/evaluator.ts if score/confidence semantics change
- packages/compliance/core/src/readiness-plan.ts
- packages/compliance/core/src/__tests__/*
- packages/reports and packages/dashboards if score presentation contracts change
- docs/adr/* if scoring/confidence semantics need a decision record
- docs/implementation-gaps.md

Implement:
- Expand Article 21 control coverage beyond the current representative controls.
- Keep every control source-linked to EU directive or reviewed regulatory source records.
- Add provider-neutral mappings for Microsoft findings where available and manual checklist mappings for process controls.
- Replace brittle test control-ID literals with helper lookups by intent or code.
- Define provisional score weighting, stale-evidence handling, and accepted-risk behavior, or explicitly leave score calibration as a product/legal gap.
- Refine or remove confidence if it remains decorative.

Negative constraints:
- Do not make legal certification claims.
- Do not treat baseline-only country packs as technical failures.
- Do not hardcode regulatory facts in UI components.
- Do not map Microsoft raw payloads directly to controls.
- Do not add national overlays without source review/activation.

Tests:
- Control catalog seed validation for required fields, unique IDs/codes, source references, and evidence requirements.
- Representative tests for every Article 21 group.
- Provider-neutral findings map to controls.
- Manual controls create checklist items.
- Score labels remain internal-readiness wording.
- Accepted-risk and stale-evidence behavior is tested if implemented.

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand control-catalog compliance scoring readiness-plan reports dashboards

Gap updates:
- Update GAP-021.
- Add product/legal calibration gaps for unresolved score weights or legal-source review.

Final response must include:
- Changed files
- Tests run
- Acceptance status
- Gaps updated
- PLAN_M13 updated
- PLAN_M14 created
- Codex prompts updated
- Residual risk
```

## Prompt 13 / PLAN_M14: Security Threat Model And Release Hardening

```txt
This is a review-and-fix prompt for release readiness.

Use skills:
- security-threat-model

Read:
- docs/puresoc_vision.md sections 6, 8, 9, 17, 18, 22, 23, 28
- docs/master-plan.md sections 7, 9, 11, 14, 15
- docs/implementation-gaps.md
- docs/codex-prompts.md
- docs/LEARNINGS.md
- docs/claude_rec.md

Goal:
Threat model the implemented product surfaces, convert concrete risks into tests/fixes, and prepare the release-readiness checklist.

Milestone plan:
- Current milestone file: `docs/PLAN_M14.md`.
- Completion handoff: update `docs/codex-prompts.md`, then create `docs/PLAN_M15.md` from the next active prompt.

Review:
- local auth and sessions
- OIDC callbacks if implemented
- provider token storage
- organization scoping
- provider raw payload storage
- evidence uploads/downloads
- upload scanning hook
- report export access
- Stripe webhook validation if implemented
- audit log coverage and integrity
- remediation approval and execution model if implemented
- regulatory source activation workflow

Expected outputs/files:
- docs/PLAN_M14.md
- docs/PLAN_M15.md
- docs/codex-prompts.md
- docs/threat-model.md or equivalent concise threat model
- targeted code/test fixes for high-confidence issues
- docs/implementation-gaps.md updates
- backup/restore/rotate-secret script notes only if product code depends on them

Negative constraints:
- Do not make legal compliance claims.
- Do not focus on host/infrastructure hardening unless it affects product code or data contracts.
- Do not enable provider write actions as part of review.
- Do not suppress a finding just because it is deferred; track it.

Tests:
- Add or update tests for every fixed high/medium issue.
- Cross-organization isolation checks for affected surfaces.
- Secret redaction checks for tokens, passwords, OAuth codes, provider credentials, webhook secrets, and evidence URLs.
- Audit event checks for sensitive actions.

Acceptance commands:
- pnpm lint
- pnpm test -- --runInBand auth audit encryption rbac evidence reports billing provider remediation regulatory

Gap updates:
- Update or add gaps for every unresolved high/medium threat.
- Mark fixed security gaps resolved with date.

Final response must include:
- Changed files
- Tests run
- Acceptance status
- Gaps updated
- PLAN_M14 updated
- PLAN_M15 created
- Codex prompts updated
- Residual risk
```

## Prompt 14 / PLAN_M15: Gap Register And Prompt QA

```txt
This is a maintenance prompt.

Read:
- docs/puresoc_vision.md
- docs/master-plan.md
- docs/implementation-gaps.md
- docs/codex-prompts.md
- docs/LEARNINGS.md
- docs/prompt-tests.md
- docs/claude_rec.md
- latest changed files
- latest test output

Goal:
Keep the project executable by updating gaps and validating active prompts against the prompt test protocol.

Milestone plan:
- Current milestone file: `docs/PLAN_M15.md`.
- Completion handoff: update `docs/codex-prompts.md`, then create `docs/PLAN_M16.md` from the next active prompt if a next prompt exists after QA.

Check:
- active prompts do not ask Codex to reimplement completed Phase A-I contract work.
- every implementation prompt has expected files/packages.
- every implementation prompt has negative constraints.
- every implementation prompt has tests.
- every implementation prompt has acceptance commands.
- every implementation prompt has gap update instruction.
- every implementation prompt has expected final summary.
- prompt order still matches implementation reality and open gaps.

Update docs/implementation-gaps.md with:
- blockers
- assumptions
- deferred decisions
- missing tests
- prompt quality issues

Keep resolved gaps for auditability, marked as resolved with date.

Expected files:
- docs/PLAN_M15.md
- docs/PLAN_M16.md if a next active prompt exists after QA
- docs/codex-prompts.md
- docs/implementation-gaps.md

Acceptance commands:
- pnpm lint if code changed
- pnpm test for any touched implementation area
- no test command required for docs-only prompt cleanup; run `git diff --check` instead

Final response must include:
- Changed files
- Tests run
- Acceptance status
- Gaps updated
- PLAN_M15 updated
- PLAN_M16 created or explicitly not needed
- Codex prompts updated
- Residual risk
```
