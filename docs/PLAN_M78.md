# M78 Plan: Local Deployable Romania Readiness Product Slice

## Summary

Implement one coherent, deployable local/in-a-box PureSOC V1 slice without external services, live provider integrations, fabricated tenant data, direct authority submission, or provider write actions.

Status: completed.
Created: 2026-05-04.
Started: 2026-05-04.
Supersedes: the earlier outside-app Stripe/Microsoft 365/KMS M78 direction. The current user direction is local deployable functionality only.

## Implementation Notes

- Keep the current `node:http` API/web runtime and add only the smallest local product flow needed for M78.
- Reuse existing Prisma models for Romania onboarding progress and classification runs; no schema change is expected unless implementation discovery proves one is required.
- Make the served Romania route authenticated and active-workspace backed. Test fixtures may seed synthetic local answers, but product routes must read saved organization data from the API.
- Use `BILLING_PROVIDER=none` surfaces only; no Stripe checkout/portal path should be presented as the M78 launch path.
- Keep provider data absent unless the user connects a real provider in a later milestone; no mock Microsoft/provider posture should be rendered as product state.

## Single Codex Prompt

You are Codex working in `/mnt/solodata/SoloCode/pure_soc`. Build the next PureSOC phases as one local-only, deployable product slice.

Read first, in order:

1. `docs/puresoc_vision.md`
2. `docs/master-plan.md`
3. `docs/implementation-gaps.md`
4. `docs/codex-prompts.md`
5. `docs/LEARNINGS.md`
6. `docs/codex_status.md`
7. `docs/PLAN_M74.md`
8. `docs/PLAN_M59.md`
9. `code/README.md`

Goal:

Create a usable Romania-first NIS2 readiness workflow that runs locally or in an in-a-box deployment with only repository code, checked-in regulatory data, local auth, local persistence, and local reports/evidence. The user should be able to use real entered organization data, save it, reopen it, classify it, generate a source-linked notification draft, generate an internal readiness plan, attach evidence, generate/export reports, and see dashboard/audit/billing state without calling Microsoft, Stripe, OIDC providers, object storage clouds, KMS/HSM/secret-manager APIs, public regulatory URLs, or DNSC.

Product definition for this milestone:

```txt
register/login
create/select workspace
open authenticated Romania readiness workflow
save/reopen organization-owned Romania onboarding answers
run preliminary Romania classification from saved answers
generate source-linked Romania notification draft from saved answers
evaluate Article 21 internal readiness from user answers, evidence, manual checklist state, and country-pack warning state
upload/link local evidence
generate internal readiness and Romania notification draft exports with legal caveat
render dashboard from stored outputs for the selected workspace
show billing-provider-none entitlement state without Stripe
show audit trail/export metadata for actions taken
```

This is a product slice, not another smoke-readiness layer.

## Functional Requirements

### 1. Local Auth And Workspace Entry

- Preserve existing local email/password registration, login, session, logout, workspace creation, workspace listing, and active-workspace selection.
- If the served web runtime lacks a user-facing register or organization creation screen needed for the local flow, add the smallest server-rendered screens/forms that use existing API routes.
- Do not enable Microsoft/Google/GitHub social login for this milestone.

### 2. Persisted Romania Onboarding

- Add or complete organization-scoped repository/service/API support for Romania onboarding progress using existing schema concepts and Prisma models such as `RoNis2OnboardingProgress`.
- Support memory mode and Prisma mode through the existing runtime repository-selection pattern.
- The product route must use saved user answers. It must not render fabricated customer answers as the product state.
- Empty state is acceptable and should ask the user to fill required fields.
- Save partial progress across sessions.
- Preserve workbook source version, source-map IDs, missing required fields, completed steps, current step, status, saved-by, and timestamps.

Expected API shape, adjust only if an existing local pattern strongly suggests a better route:

```txt
GET  /organizations/:orgId/compliance/nis2/ro/onboarding
PUT  /organizations/:orgId/compliance/nis2/ro/onboarding
POST /organizations/:orgId/compliance/nis2/ro/classification
POST /organizations/:orgId/compliance/nis2/ro/notification-draft/from-onboarding
```

Keep existing public/schema helper endpoints only as contract helpers; customer product routes must be organization-scoped and session-protected.

### 3. Classification From Real Saved Answers

- Use `@puresoc/country-pack-ro` classification logic.
- Store classification runs with source version, matched rules, reasons, source references, missing required fields, notification recommendation, and Article 9 requirement.
- Do not mark Romania legal logic as production-activated unless the existing regulatory review workflow says it is activated.
- Display review-required/legal-caveat/fallback metadata honestly.

### 4. Notification Draft From Real Saved Answers

- Generate the Romania notification draft from saved onboarding answers and the latest stored classification run.
- Persist the generic `NotificationDraft.payloadJson` envelope plus the Romania companion row through the existing notification-draft repository pattern.
- Include source references and legal caveat metadata.
- Explicitly show `submittedToDnsc=false` and no direct submission capability.
- Do not add DNSC submission, browser automation, email submission, or API posting to any authority.

### 5. Internal Readiness Evaluation

- Evaluate the full EU Article 21 catalog using saved Romania/country-pack warning state, uploaded evidence, manual checklist state, and user-provided answers where already modeled.
- Do not use mock Microsoft/provider scenarios as product data.
- If no real provider connection exists, provider-mapped controls must become pending/manual/unsupported as appropriate, not passing from silence.
- Generate gaps, recommendations, checklist items, and readiness plan from stored analysis.
- Keep the label `PureSOC internal readiness`.
- Keep scoring/calibration caveats because GAP-021 remains product/legal-owned.

### 6. Evidence And Reports

- Keep evidence local-only for this milestone. Use existing local/in-memory adapters in memory mode and existing Prisma metadata in Prisma mode. If durable file storage is required for local deployment, add a minimal local filesystem object-storage adapter behind the existing `ObjectStorageAdapter` interface instead of requiring S3/MinIO/cloud storage.
- Upload/list/download evidence through authenticated organization-scoped API routes.
- Never expose `storageUri` or local file paths in API responses.
- Generate internal readiness JSON export, Romania notification draft JSON export, and generated-report metadata linked to evidence where supported.
- Browser-grade PDF, CSV exports, and binary evidence bundles may be implemented if small and local-only; otherwise keep them explicitly deferred under GAP-029.

### 7. Dashboard, Billing State, And Audit Trail

- The served dashboard must render from stored organization output, not static demo data.
- Add or wire visible local product surfaces for latest Romania onboarding state, latest classification result, notification draft status, readiness score/gap summary, evidence count, generated report count, billing-provider-none entitlement summary, and audit export/checkpoint availability with the non-WORM/non-notarized caveat.
- Billing must use `BILLING_PROVIDER=none` / `PURESOC_BILLING_PROVIDER=none` behavior only. Do not create Stripe checkout/customer portal product UI as a launch path in this milestone.

### 8. Web Runtime

- Preserve the current lightweight `node:http` served runtime unless a dedicated ADR and implementation are included.
- Make `/onboarding/romania` an authenticated, active-workspace route for product use.
- The route should show saved state and provide forms/actions for saving progress, classifying, generating a draft, evaluating readiness, uploading evidence links where practical, and generating reports.
- Keep current source-map, caveat, fallback, unsupported-state, and no-DNSC-submission signals visible.
- Keep the UI operational and dense, not a landing page.

## Expected Files

Likely code files:

```txt
code/apps/api/src/server.ts
code/apps/api/src/auth/routes.ts
code/apps/api/src/organizations/routes.ts
code/apps/api/src/compliance/nis2/ro/routes.ts
code/apps/api/src/compliance/nis2/ro/service.ts
code/apps/api/src/compliance/nis2/notification-drafts/service.ts
code/apps/api/src/compliance/routes.ts
code/apps/api/src/evidence/routes.ts
code/apps/api/src/reports/routes.ts
code/apps/api/src/dashboards/routes.ts
code/apps/web/src/server.ts
code/apps/web/src/app-data.ts
code/apps/web/src/operational-console.ts
code/apps/web/src/index.ts
code/packages/database/prisma/schema.prisma
code/packages/database/src/*
code/packages/evidence/src/index.ts
code/packages/compliance/nis2/country-packs/ro/src/*
code/apps/api/src/__tests__/*
code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts
code/tests/*
```

Docs to update:

```txt
docs/PLAN_M78.md
docs/codex_status.md
docs/codex-prompts.md
docs/implementation-gaps.md
docs/LEARNINGS.md
docs/PLAN_M79.md
```

Only edit files that are actually needed. Do not add broad scaffolding.

## Negative Constraints

- Do not call Microsoft Graph.
- Do not call Stripe.
- Do not call Microsoft/Google/GitHub OIDC/OAuth providers.
- Do not call object-storage clouds, scanner services, KMS/HSM/secret-manager APIs, external signing services, public regulatory URLs, DNSC, or any national authority.
- Do not run `external-smoke:*`, `stripe:smoke:*`, `microsoft365:smoke:*`, `oidc:smoke:*`, `evidence:smoke:runtime`, `auth:smoke:deployment`, `provider-token:smoke`, or live external smoke commands for acceptance.
- Do not use mock Microsoft/provider scenario output as customer-facing product data.
- Do not seed fake customer organizations, fake tenant posture, fake evidence, fake invoices, fake legal approval, or fake source review into product routes.
- Test fixtures may be synthetic, but they must stay in tests/smokes and must not become default product data.
- Do not add direct DNSC submission.
- Do not add legal certification/compliance-guarantee language.
- Do not activate Romania legal logic or Romanian regulatory copy without the GAP-006/GAP-042 product/legal approvals.
- Do not implement Microsoft/provider write remediation.
- Do not expose secrets, session cookies, authorization headers, storage URIs, local file paths, report bodies containing private user answers, raw provider payloads, or full emails in logs or smoke artifacts.

## Validation And Acceptance Commands

Run from `code/`.

Core acceptance:

```sh
npm run lint
npm run test -- ro onboarding notification compliance evidence reports dashboards audit billing auth organization
npm run test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If Firefox/WebDriver BiDi is available:

```sh
npm run test:e2e -- --grep @browser-smoke
```

If Prisma schema, migrations, or Prisma adapters change:

```sh
npm run prisma:validate
npm run prisma:generate
```

Optional local-only persistence smoke, only if a disposable local PostgreSQL database is available:

```sh
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc_smoke npm run prisma:smoke:postgres
```

Do not require optional live/local service smokes to call external services. If a command cannot run because the local host lacks Node/npm/pnpm, use the existing approved host command pattern and record the substitution.

## Acceptance Criteria

- A user can complete the local product path with real entered data: register or log in locally, create/select a workspace, save Romania onboarding answers, reopen saved progress, run classification, create a notification draft, evaluate readiness, attach evidence, generate reports/exports, see dashboard state, see billing-provider-none entitlement state, and see audit trail/export metadata.
- Product UI does not depend on random or fabricated demo data.
- Provider integrations are read-only-disabled/manual unless real external setup happens in a separate future track.
- All reports and drafts include legal caveat/source references and no-certification/no-DNSC-submission posture.
- Memory mode remains deterministic; Prisma mode uses persisted repository adapters for customer-owned data touched by this flow.
- Existing local UI/browser smoke remains no-live-call.
- Gap register is updated for completed local functionality and for any deferred local-only gaps.

## Expected Gap Movement

- GAP-031 narrows if the served web route becomes a customer-shaped authenticated workflow rather than a compact read-only route.
- GAP-042 remains open unless product/legal-approved Romanian legal/regulatory copy is added.
- GAP-006 remains open unless product/legal approves activation ownership and production activation operations.
- GAP-021 remains open unless product/legal approves scoring calibration.
- GAP-029 narrows only for local evidence/report functionality actually implemented; browser PDF/CSV/binary bundles stay open if deferred.
- GAP-030 remains open; provider writes stay disabled.
- GAP-044 remains open; no external live smoke is run by this milestone.

## Final Response Requirements

Report:

- Local product path implemented.
- Files changed.
- Commands run.
- Whether any external call was made. Expected: no.
- Whether any fabricated product data remains. Expected: no, except test fixtures.
- Gaps updated.
- Residual risk and next local-only milestone.

## Completion Log

Completed: 2026-05-04.

Implemented:

- Added organization-scoped Romania onboarding progress and classification-run persistence in memory and Prisma modes through `RoNis2ReadinessRepository`.
- Added authenticated API routes for saving/reopening Romania onboarding progress, running classification from saved answers, and generating source-linked notification drafts from saved answers.
- Wired the API runtime repository selection so memory and Prisma modes report `ro_nis2_onboarding_classification` persistence.
- Turned `/onboarding/romania` into an authenticated active-workspace product workflow backed by saved organization data, with local forms for save, classify, draft, evaluate, evidence upload, report export, and audit checkpoint metadata.
- Added local register and workspace-creation screens needed for the in-a-box path.
- Removed fabricated Microsoft/provider posture, fake evidence, fake reports, and fake customer answers from product route defaults; synthetic data remains only in tests/smokes.
- Extended served UI and browser smoke coverage for the saved-data Romania workflow while preserving no-live-call guarantees.

Key changed files:

```txt
code/apps/api/src/auth/services.ts
code/apps/api/src/compliance/nis2/ro/routes.ts
code/apps/api/src/compliance/nis2/ro/service.ts
code/apps/api/src/server.ts
code/apps/web/src/app-data.ts
code/apps/web/src/operational-console.ts
code/apps/web/src/server.ts
code/packages/database/src/repositories/ro-nis2-readiness.ts
code/scripts/run-ui-smoke.mjs
code/README.md
docs/PLAN_M78.md
docs/codex_status.md
docs/codex-prompts.md
docs/implementation-gaps.md
docs/LEARNINGS.md
docs/PLAN_M79.md
```

Validation:

```txt
flatpak-spawn --host npm run lint
passed

flatpak-spawn --host npm run test -- ro onboarding notification compliance evidence reports dashboards audit billing auth organization
passed, 55 files / 229 tests

flatpak-spawn --host npm run test -- ro onboarding notification web-dashboard-reports-ui runtime-persistence prisma-ro-nis2-readiness
passed, 27 files / 121 tests

flatpak-spawn --host npm run test:e2e -- --grep @ui-smoke
passed

flatpak-spawn --host npm run test:e2e -- --grep @browser-smoke
passed with Firefox WebDriver BiDi

flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config
passed

git diff --check
passed

flatpak-spawn --host env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate
passed

flatpak-spawn --host env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:generate
passed
```

Notes:

- Direct sandbox commands are unavailable in this environment because namespace creation fails; host `flatpak-spawn --host` commands were used for Node/npm/Docker validation.
- The first Prisma validation attempt failed only because `DATABASE_URL` was unset; rerun with the local Compose-style URL passed.
- No Microsoft Graph, Stripe, OIDC provider, object-storage cloud, scanner, KMS/HSM/secret-manager, public regulatory URL, DNSC, national authority, external-smoke, or provider write command was called.

Gaps updated:

- GAP-029 narrowed for local authenticated evidence attachment and report/export metadata in the Romania workflow.
- GAP-031 narrowed for the customer-shaped authenticated saved-data Romania workflow and smoke/browser coverage.
- GAP-041 narrowed for Romania onboarding/classification repository and API runtime coverage without adding selected schema-drift fields.
- GAP-006, GAP-021, GAP-030, GAP-042, and GAP-044 remain open and were explicitly preserved.

Residual risk and deferred work:

- Romania legal activation, Romanian legal/regulatory copy, and score calibration still require product/legal approval.
- The route is still `node:http` server-rendered UI; richer inline workflow error handling, framework migration, cross-browser Playwright parity, golden-image review, browser-grade PDF/CSV/binary evidence bundles, live external smoke, and provider writes remain deferred.
