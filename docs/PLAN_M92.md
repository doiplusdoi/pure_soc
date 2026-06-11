# M92 Plan: Customer Onboarding Wizard UX Slice

## Summary

M92 implements one local frontend workflow slice requested by the user: make the customer journey read as signup -> workspace/company data -> short NIS2 readiness wizard -> Microsoft 365 connector -> gap list/export. It preserves the current lightweight `node:http` served runtime and existing organization-scoped Romania readiness persistence.

Status: completed.
Created: 2026-06-11.
Selected gap slice: frontend workflow polish that preserves the current UI/browser smoke artifacts and narrows the customer-grade onboarding portion of GAP-031/GAP-046 without product/legal/operator decisions.
Depends on: existing local auth, workspace creation, saved Romania onboarding progress, Microsoft 365 provider-connection routes, report export routes, and UI smoke coverage.

## Why This Is Unblocked

- The API already supports local signup, session-backed organization/workspace creation, organization-scoped Romania readiness answers, classification, readiness evaluation, Microsoft 365 tenant consent health, JSON/CSV/evidence-package exports, and local evidence uploads.
- The user request is UX/product-flow oriented and can be implemented locally without schema changes, real email delivery, live Microsoft Graph, legal activation, billing decisions, or provider write scopes.
- The current route stores answers as structured JSON, so the wizard can split the questions into smaller logical screens while keeping the same repository and API contract.

## Expected Files

- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M92.md`
- `docs/PLAN_M93.md`

## Implementation Plan

1. Replace the large Romania-first tabs with logical onboarding wizard screens capped at five user questions per page.
2. Keep each wizard page backed by `POST /onboarding/romania/save` and the existing answer JSON shape.
3. Show the customer journey explicitly: account/workspace, company/legal, services/scope, contacts/systems, Article 9, outputs, Microsoft tenant connector, gaps/export.
4. Add UI affordances for CSV and evidence-package export after readiness evaluation.
5. Surface gaps from missing onboarding answers, incomplete readiness output, and Microsoft 365 module/connection status without fabricating customer data.
6. Preserve no-DNSC-submission, no-certification, no-provider-write, no-live-call, and source-safe customer UI constraints.

## Negative Constraints

- Do not implement more than this frontend workflow slice.
- Do not mark Romania legal logic active.
- Do not add approved Romanian legal/regulatory copy without exact product/legal text.
- Do not add direct DNSC or national-authority submission.
- Do not claim certified, guaranteed, or legally approved compliance.
- Do not add Microsoft/provider write scopes or remediation execution.
- Do not run Microsoft Graph, Stripe, OIDC provider, object-storage/scanner, KMS/HSM/secret-manager, public regulatory fetches, or provider-token live smokes.
- Do not expose workbook sheet/cell/range/source-map/debug internals in the normal customer UI.
- Keep application code, tests, Compose files, runtime config, and regulatory data under `code/`.

## Validation Plan

Run from `code/`:

```sh
npm run test -- apps/web/src/__tests__/web-dashboard-reports-ui.test.ts
npm run test -- ro regulatory-import web notification dashboards reports
npm run test:e2e -- --grep @ui-smoke
npm run lint
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If the sandbox cannot bind local HTTP ports for `@ui-smoke`, rerun the same command with approved escalation as established by previous milestones.

## Expected Gap Movement

- GAP-031 narrows for local served-web workflow maturity because the customer journey becomes a short-page wizard with connector/export/gap handoff.
- GAP-046 narrows only for signup-to-workspace UX continuity; real email delivery, invite/open-registration policy, broad verified-email enforcement, and public abuse controls remain open.
- GAP-007/GAP-044 do not close because no live Microsoft tenant or external proof target is run.
- GAP-006/GAP-021/GAP-042 remain open because legal activation, score calibration, and approved Romanian regulatory copy are human/product/legal decisions.

## Actual Changes

- Updated the served Romania route into a customer-facing NIS2 wizard with logical screens for company identity, address, legal representative, business scale, services/jurisdiction, contacts, systems, Article 9 context, readiness outputs, Microsoft 365 connector status, and gap exports.
- Kept data-entry screens capped at five customer questions by rendering wizard question markers and asserting the cap in web render tests.
- Preserved organization-scoped saved Romania answer persistence through the existing `POST /onboarding/romania/save` flow and existing answer JSON shape.
- Added the Microsoft 365 tenant connector handoff screen using existing provider-connection/module health state and existing connect/sync form actions.
- Added a local gap list derived from missing onboarding data, missing readiness outputs/evidence, and Microsoft 365 module status, plus JSON/CSV/evidence-package export controls backed by existing authenticated report routes.
- Redirected new workspace creation into the first wizard screen so the signup -> workspace -> company data path is explicit in the served UI.

## Changed Files

- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/scripts/run-ui-smoke.mjs`
- `code/README.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M92.md`
- `docs/PLAN_M93.md`

## Validation Results

Run from `code/` unless noted:

```sh
npm run test -- apps/web/src/__tests__/web-dashboard-reports-ui.test.ts
passed, 1 file / 17 tests

npm run test -- ro regulatory-import web notification dashboards reports
passed, 32 files / 153 tests

npm run test:e2e -- --grep @ui-smoke
passed, with no-live-call guarantees and deterministic served UI artifacts under /tmp/puresoc-ui-smoke-*

npm run lint
passed, including layout, TypeScript, selected Prisma schema drift at 39 models / 547 fields, and Romania generated-data drift at 3 artifacts

docker compose -f infra/compose/docker-compose.yml config
passed

git diff --check
passed
```

## Acceptance Status

Accepted for the local UX slice. The customer journey now supports signup/workspace continuation, business and legal data capture, a short-screen NIS2 readiness wizard, Microsoft 365 tenant connector handoff, a derived gap list, and export controls without live external calls or provider writes.

## Residual Risk And Deferred Work

- Real email delivery, invite-only/open-registration policy, platform-admin bootstrap, and public abuse operations remain GAP-046 launch work.
- Live Microsoft Graph tenant proof remains blocked on a selected disposable/test tenant and the existing external-smoke guardrails.
- The wizard still runs in the lightweight `node:http` served runtime, not a full React/Next.js customer frontend.
- Legal activation, Romanian approved regulatory copy, readiness-score calibration, DNSC submission, certification claims, and provider write remediation remain out of scope.
