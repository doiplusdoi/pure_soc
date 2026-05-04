# M79 Plan: Local Romania Workflow Hardening And Handoff

## Summary

Harden the M78 local/in-a-box Romania readiness workflow so the saved-data path is easier to operate, review, and hand off without adding external services, DNSC submission, provider writes, legal activation, or a frontend framework migration.

Status: not started.
Created: 2026-05-04.
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

Not started.
