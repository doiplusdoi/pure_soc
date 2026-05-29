# M79 Plan: Local Romania Workflow Hardening And Handoff

## Summary

Harden the M78 local/in-a-box Romania readiness workflow so the saved-data path is easier to operate, review, and hand off without adding external services, DNSC submission, provider writes, legal activation, or a frontend framework migration.

Status: completed.
Created: 2026-05-04.
Started: 2026-05-30.
Completed: 2026-05-30.
Depends on: completed `docs/PLAN_M78.md`.

## Single Codex Prompt

You are Codex working in `/mnt/solodata/SoloCode/pure_soc`. Harden the M78 local Romania readiness workflow.

Read first, in order:

1. `docs/puresoc_vision.md`
2. `docs/master-plan.md`
3. `docs/implementation-gaps.md`
4. `docs/codex-prompts.md`
5. `docs/LEARNINGS.md`
6. `docs/codex_status.md`
7. `docs/PLAN_M79.md`
8. `docs/PLAN_M78.md`
9. `code/README.md`
10. `code/package.json`

Goal:

Improve the local product ergonomics around the M78 saved-data Romania path. Keep the existing lightweight `node:http` runtime. The user should be guided from local register/login and workspace creation to saved Romania onboarding, classification, draft, readiness evaluation, evidence, reports, billing-none state, and audit metadata with clearer first-run, success, and failure states.

## Functional Requirements

- Preserve the authenticated, active-workspace, saved-data Romania workflow from M78.
- Render local form errors and action results clearly without leaking private answers, cookies, storage paths, report bodies, endpoint URLs, or secrets.
- Improve continuity after save/classify/draft/evaluate/evidence/report/audit actions by showing stored IDs/statuses already returned by local APIs.
- Improve first-run empty/manual/provider-unsupported states without seeding fake customer/provider data.
- Improve local export/report affordances using existing authenticated report APIs. Defer browser-grade PDF, CSV, and binary bundles if they require new runtime services.
- Document the in-a-box operator path in `code/README.md` or an appropriate docs file.

## Expected Files

Likely files:

```txt
code/apps/web/src/server.ts
code/apps/web/src/app-data.ts
code/apps/web/src/operational-console.ts
code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts
code/scripts/run-ui-smoke.mjs
code/README.md
docs/PLAN_M79.md
docs/codex_status.md
docs/codex-prompts.md
docs/implementation-gaps.md
docs/LEARNINGS.md
docs/PLAN_M80.md
```

Only edit API/database files if a concrete hardening issue requires it.

## Negative Constraints

- Do not call Microsoft Graph, Stripe, Microsoft/Google/GitHub OIDC/OAuth providers, object-storage clouds, scanner services, KMS/HSM/secret-manager APIs, external signing services, public regulatory URLs, DNSC, or any national authority.
- Do not run `external-smoke:*`, `stripe:smoke:*`, `microsoft365:smoke:*`, `oidc:smoke:*`, `evidence:smoke:runtime`, `auth:smoke:deployment`, or `provider-token:smoke` as acceptance.
- Do not use mock Microsoft/provider scenarios as product data.
- Do not seed fake customer organizations, tenant posture, evidence, invoices, legal approval, or source review into product routes.
- Do not add direct authority submission, certification claims, Romania legal activation, approved Romanian legal/regulatory copy, or provider write remediation.
- Do not rewrite the runtime into Next.js/React or add Playwright unless the prompt is explicitly changed.

## Validation And Acceptance Commands

Run from `code/`:

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

## Expected Gap Movement

- GAP-031 narrows only for concrete local workflow hardening, first-run UX, or UI/browser smoke coverage.
- GAP-029 narrows only for local evidence/report/export functionality actually implemented.
- GAP-006, GAP-021, GAP-030, GAP-042, and GAP-044 remain open unless their product/legal/external conditions are truly satisfied.

## Completion Log

- 2026-05-30: Started against the broader Romania/DNSC readiness-flow request. Initial discovery found three concrete M79/M80-level gaps to close in this pass: customer-visible debug/source-map/workbook language on the Romania route, a hardcoded service-code datalist instead of the generated service catalog, and a notification draft builder that still covers only a subset of the imported mapping.
- 2026-05-30: Completed the Romania readiness-flow hardening slice. The Romania route now presents a product workflow instead of a workbook/debug inspector, uses a searchable grouped service selector backed by the generated catalog, captures the expanded onboarding fields required by the country pack, preserves source provenance internally, and keeps direct DNSC submission unavailable. The notification draft builder now covers all 74 imported mapping rows, and tests/smoke assertions prove customer UI hides workbook/source-map/cell/range internals.

## Actual Files Touched

```txt
code/apps/api/src/__tests__/ro-nis2-api-routes.test.ts
code/apps/api/src/compliance/nis2/ro/routes.ts
code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts
code/apps/web/src/app-data.ts
code/apps/web/src/operational-console.ts
code/apps/web/src/server.ts
code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-classification.service.spec.ts
code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-notification-draft.types.spec.ts
code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-onboarding.schema.spec.ts
code/packages/compliance/nis2/country-packs/ro/src/index.ts
code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts
code/packages/compliance/nis2/country-packs/ro/src/onboarding.schema.ts
code/packages/compliance/nis2/country-packs/ro/src/runtime-model.ts
code/scripts/run-ui-smoke.mjs
code/README.md
docs/PLAN_M79.md
docs/PLAN_M80.md
docs/codex-prompts.md
docs/codex_status.md
docs/implementation-gaps.md
docs/LEARNINGS.md
```

Pre-existing unrelated local changes in `.DS_Store`, `code/infra/compose/docker-compose.yml`, `code/packages/ui/src/index.ts`, `code/pnpm-lock.yaml`, and `.impeccable/` were left in place.

## Validation Results

Run from `code/` with npm equivalents because this environment used npm rather than pnpm:

```txt
npm run lint
passed

npm run drift:regulatory
passed

npm run test -- ro regulatory-import web notification dashboards reports
passed, 32 files / 144 tests

npm run test -- ro notification web-dashboard-reports-ui
passed, 26 files / 128 tests

npm run test:e2e -- --grep @ui-smoke
passed

docker compose -f infra/compose/docker-compose.yml config
passed

git diff --check
passed
```

The Vitest selections that start local API servers were run outside the sandbox after sandboxed execution hit `listen EPERM` for ephemeral localhost listeners.

## Gap Movement

- GAP-031 narrowed for the customer-shaped Romania workflow, generated-catalog service selector, source-safe UI assertions, and route smoke coverage without claiming Next.js/React, Playwright, or cross-browser parity.
- GAP-042 narrowed for complete imported notification mapping coverage and product-safe fallback display. It remains open because approved Romanian legal/regulatory copy was not added.
- GAP-006, GAP-021, GAP-029, GAP-030, and GAP-044 remain open. No legal activation, score calibration approval, browser-grade PDF/CSV/binary bundle, provider write execution, public regulatory fetch, DNSC submission, or live external smoke was added.

## Residual Risk

- The route is still a lightweight server-rendered local workflow, not a full multi-page frontend wizard.
- Generated source provenance remains in internal country-pack/API payloads and reports; the normal customer route hides it.
- Browser-grade PDF, CSV, and binary evidence bundles remain deferred under GAP-029.
- Romanian legal caveat and regulatory notification labels remain unapproved fallback content under GAP-042.
