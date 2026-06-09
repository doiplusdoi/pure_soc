---
title: PureSOC Codex Status, Remediation, Local Product Progress, Served Invitation UX, CSV Exports, Export Metadata, Evidence Packages, Package Guardrails, Regulatory Drift Coverage, And Billing Customer Drift Coverage
date: 2026-06-09
author: Codex
scope: Repository-level current status after M91 billing customer drift coverage on 2026-06-09, preserving the 2026-05-04 M71-M78 product-finish snapshot as history.
aligned_with:
  - docs/claude_status.md
  - docs/puresoc_vision.md
  - docs/master-plan.md
  - docs/implementation-gaps.md
  - docs/gap-implementation-path.md
  - docs/codex-prompts.md
  - docs/LEARNINGS.md
---

# PureSOC Codex Status - 2026-06-09

## Current Snapshot

PureSOC is in a strong local product/proof state, but it is not launch-ready.

The repository has moved well beyond scaffolding: the `code/` monorepo contains API, web, worker, scheduler, connector-runner, regulatory-importer, and report-renderer apps; typed packages for auth, providers, compliance, billing, evidence, audit, jobs, reports, dashboards, database, shared contracts, and UI; Prisma migrations; generated regulatory seed data; split Docker Compose files; and local smoke scripts.

The current executable product path is still the local/in-a-box Romania readiness workflow:

- local registration/login and organization/workspace selection,
- organization-scoped saved Romania onboarding answers,
- generated-catalog Romania service selection with internal source provenance,
- source-linked notification-draft generation covering the imported registration mapping,
- Article 21 internal readiness evaluation,
- local evidence/report/dashboard/audit surfaces,
- billing-provider-none state,
- customer-facing UI that hides workbook/source-map/cell/range/debug internals,
- explicit no-DNSC-submission, no-certification, and no-provider-write posture.

M82 added a small data-quality hardening slice: `pnpm lint` now guards the customer-facing Romania onboarding progress and classification run Prisma models through the selected schema drift map. The drift gate covers 34 selected high-risk models and 492 fields; it is still selected coverage, not an exhaustive schema proof.

M83 narrows public signup hardening without choosing a registration policy: the existing hashed local email-verification token lifecycle is now exposed through `POST /auth/email/verify`, the served web runtime has a `/verify-email` form, web registration lands on that verification step, and focused tests prove injected local delivery, one-time token use, `email_verified` audit events, and token redaction from responses/audit logs. Real email delivery and verified-email enforcement still remain launch blockers.

M84 narrows evidence/report runtime work without calling external services: internal-readiness reports now have stable CSV output for selected control, gap, recommendation, readiness-plan, evidence, source-reference, and metadata rows. The authenticated API route stores the CSV as generated-report evidence metadata when generated-report evidence storage is enabled, includes legal-caveat/source-reference metadata, audits the CSV export without storage URIs, and rejects cross-organization access.

M85 narrows the same evidence/report gap by persisting local generated export lifecycle metadata: JSON and CSV report generation now writes organization-scoped `report_exports` rows through the memory and Prisma output repository boundary, including ready status, format, and content hash. These rows remain server-side metadata; API responses still do not expose storage URIs.

M86 narrows the evidence/report gap again with deterministic local binary evidence-package assembly: internal-readiness exports can now produce a tar bundle with a manifest, stable JSON report, stable CSV export, and locally readable evidence artifact files. The API route is organization-scoped and authenticated, stores the bundle as generated-report evidence when enabled, audits the export with redacted metadata, and records a `binary_evidence_package` `report_exports` row. This is still local/runtime-contract proof, not deployed object-storage/scanner/browser-PDF proof.

M87 adds bounded local evidence-package behavior: package assembly now has configurable maximum evidence-file count, per-file byte limit, and total bundle byte limit. The API returns stable report-export errors for packages that exceed limits, records the active limits in the manifest for successful packages, and avoids storing generated package evidence artifacts or `binary_evidence_package` rows for oversized bundles. This is guardrail hardening, not streaming large-export support or live storage proof.

M88 narrows public signup hardening without choosing a registration policy: owners/org admins can create local organization invitations only after their account email is verified, invitations store only hashed tokens, local tests can receive plaintext tokens through an injected delivery port, and invited users must authenticate with the matching verified email before acceptance creates the active membership and role binding.

M89 adds the served local invitation UX on top of that API: the operational console links to `/invitations`, owners/org admins can create invitations for the active workspace, invited users can accept by organization ID plus token through the served web runtime, successful acceptance selects the workspace for the browser session, and render/UI-smoke coverage proves the flow stays token-redacted. Real email delivery, invite-only policy, platform-admin bootstrap, and public abuse operations remain launch blockers.

M90 narrows selected data-quality coverage without changing runtime behavior: `pnpm lint` now includes `RegulatorySource`, `RegulatorySourceMap`, and `RegulatoryReviewDecision` in the selected Prisma schema drift map. The drift gate covers source activation status, active version linkage, source-map target/source fields, and review decision metadata. This protects the no-auto-activation legal-review data model, but it remains selected coverage rather than exhaustive schema validation.

M91 continues that selected data-quality path for billing persistence: `pnpm lint` now includes `BillingCustomer` in the selected Prisma schema drift map, guarding organization/customer/provider mapping, optional external customer ID, billing email, metadata JSON, and timestamps. This protects billing customer table shape only; it does not approve product pricing, prove live Stripe runtime, or change entitlement behavior.

The main unfinished work is not another architecture pass. It is product/legal approval, one approved live/disposable external smoke target, runtime hardening, and customer-grade UX polish.

## Repo Inspection

Inspected and validated on 2026-06-09:

- Required project docs were read in order: `docs/puresoc_vision.md`, `docs/master-plan.md`, `docs/implementation-gaps.md`, `docs/codex-prompts.md`, and `docs/LEARNINGS.md`.
- `docs/PLAN_M79.md` is completed. It hardened the Romania route into a product-safe guided workflow, added the generated service catalog selector, expanded required onboarding capture, and moved workbook/source-map provenance out of the normal customer UI.
- `docs/PLAN_M80.md` is staged as a decision-gated handoff for Romanian legal/product activation or a single approved external proof target.
- `docs/real-tenant-testing.md` was added on 2026-05-29 as the Microsoft 365 real-tenant testing runbook, with `docs/real-tenant-test-record-template.md` for sanitized evidence capture and `docs/microsoft365-read-only-smoke.env.example` for placeholder-only environment shape.
- `docs/PLAN_M82.md` narrows GAP-041 with lint-gated selected schema drift coverage for `RoNis2OnboardingProgress` and `RoNis2ClassificationRun`.
- `docs/PLAN_M83.md` narrows GAP-046 with local email-verification completion routes and served UI.
- `docs/PLAN_M84.md` narrows GAP-029 with local stable CSV export generation and generated-report evidence metadata.
- `docs/PLAN_M85.md` narrows GAP-029 with persisted local JSON/CSV `report_exports` metadata rows and organization-scoped repository/API coverage.
- `docs/PLAN_M86.md` narrows GAP-029 with deterministic local `binary_evidence_package` tar assembly, generated-report evidence storage, and organization-scoped API coverage.
- `docs/PLAN_M87.md` narrows GAP-029 with configurable local evidence-package file-count/file-size/bundle-size guardrails and stable API errors for oversized packages.
- `docs/PLAN_M88.md` narrows GAP-046 with local owner/org-admin invitations, hashed invitation tokens, verified-email acceptance, membership/role assignment, audit coverage, and selected invitation schema drift checks.
- `docs/PLAN_M89.md` narrows GAP-046 with served invitation creation/acceptance UX, console navigation, token-redaction copy, and focused web/UI-smoke validation.
- `docs/PLAN_M90.md` narrows GAP-041 with lint-gated selected schema drift coverage for regulatory source activation records, source maps, and review decisions.
- `docs/PLAN_M91.md` narrows GAP-041 with lint-gated selected schema drift coverage for billing customer persistence.
- `git diff --check` passed for the M90 changes.
- The workspace has 371 files under `code/` according to `rg --files code`.
- The app layout and package layout match the docs' `code/` convention.
- `docs/implementation-gaps.md` still shows the major launch/runtime gaps open; M79 narrowed GAP-031 and GAP-042 but did not add legal activation, DNSC submission, provider writes, or live external proof.

The M79 baseline validation below remains the latest broad local product snapshot. M82 additionally ran the lint gate, regulatory drift check, and focused drift tests with npm tooling; M83 added focused auth/web/UI validation; M84 added focused evidence/report/dashboard validation; M85 added focused output-record/report-export validation; M86 added focused report/evidence-package validation; M87 added focused evidence-package guardrail validation; M88 added focused auth/organization invitation validation; M89 added focused web/invitation UI validation; M90 added focused regulatory source activation drift validation; M91 added focused billing customer drift validation:

```txt
npm run lint
passed, schema drift check covered 39 models / 547 fields

npm run drift:regulatory
passed

npm run test -- drift
passed, 1 file / 11 tests

npm run test -- ro regulatory-import web notification dashboards reports
passed, 32 files / 144 tests

npm run test:e2e -- --grep @ui-smoke
passed

docker compose -f infra/compose/docker-compose.yml config
passed

git diff --check
passed

npm run test -- auth organization rbac audit web
passed outside the sandbox after sandboxed execution hit `listen EPERM`, 17 files / 83 tests

npm run test:e2e -- --grep @ui-smoke
passed outside the sandbox after sandboxed execution hit `listen EPERM`

npm run test -- reports
passed outside the sandbox after sandboxed execution hit `listen EPERM`, 4 files / 24 tests

npm run test -- evidence reports dashboards
passed outside the sandbox, 9 files / 41 tests

npm run test -- output-records reports evidence dashboards
passed outside the sandbox after sandboxed execution hit `listen EPERM`, 10 files / 43 tests

npm run test -- reports
passed outside the sandbox after sandboxed execution hit `listen EPERM`, 4 files / 26 tests

npm run test -- evidence reports dashboards
passed outside the sandbox, 9 files / 43 tests

npm run test -- reports
passed outside the sandbox after sandboxed execution hit `listen EPERM`, 4 files / 28 tests

npm run test -- evidence reports dashboards config
passed outside the sandbox, 13 files / 73 tests

npm run test -- auth organization rbac audit web
passed outside the sandbox, 17 files / 85 tests

npm run test:e2e -- --grep @ui-smoke
passed outside the sandbox and wrote served UI snapshots/artifact index
```

Vitest selections that bind ephemeral local API servers were run outside the sandbox after sandboxed execution hit `listen EPERM`.

## Implementation Baseline

| Area | Current status | Notes |
|---|---|---|
| Monorepo and service catalog | Strong local baseline | `code/` contains app services, packages, config defaults, Dockerfiles, Compose service catalog, scripts, and regulatory data. |
| Runtime stack | Lightweight and documented | Current API/web runtime is custom `node:http`, not NestJS/Next.js. ADR-017 records this deviation. |
| Auth, sessions, orgs, RBAC | Strong contract/runtime baseline | Local auth, session, organization creation/selection, RBAC, local email-verification completion route/UI, owner-managed invitation API plus served invitation UX, OIDC callback contracts, and Prisma adapters exist. Real email delivery/enforcement, invite policy, platform-admin operations, and live OIDC provider smoke remain open. |
| Regulatory model | Strong data/guardrail baseline | EU member states, NIS2 seed data, country-pack model, source maps, review tasks, and no-auto-activation guardrails exist. Selected drift coverage now guards source records, source maps, and review decisions. |
| Romania country pack | Best current product path | Workbook import, generated seed/source map/import report, runtime catalog model, classification, onboarding schema, complete imported notification draft mapping, saved progress, and product-safe local workflow exist. Legal activation/copy approval remain open. |
| Microsoft 365 | Read-only contract/fixture baseline | Permission bundles and read modules are modeled. No approved disposable tenant/live Graph smoke has run. Write executor remains disabled. |
| Compliance engine | Strong internal-readiness baseline | Article 21 catalog, gaps, recommendations, readiness plan, checklist and dashboard/report integration exist. Score calibration still needs product/legal approval. |
| Evidence/reports/dashboard | Good local JSON/CSV/package baseline | Local authenticated evidence, JSON report metadata, stable internal-readiness CSV export, persisted JSON/CSV report-export metadata rows, deterministic local binary evidence-package tar bundles, and configurable package size/file-count guardrails exist. Browser-grade PDF, streaming large-package support, and live storage/scanner smoke remain open. |
| Billing | Contract-complete, product-incomplete | Stripe adapter/webhook/entitlements exist. Pricing, plan packaging, and real test-mode smoke remain product/operator work. |
| Audit | Tamper-evident database baseline | Hash chain/checkpoint/export metadata exists. WORM storage, external signing, and legal-grade retention are deferred. |
| Jobs/queues | Local/disposable baseline | Job runtime and Redis adapter exist. Production multi-container queue orchestration remains open. |
| Frontend | Useful local served console | Register/login/workspaces/dashboard/Romania route, generated service selector, customer-safe source-hiding assertions, and UI/browser smoke coverage exist. Customer-grade framework work and cross-browser parity remain open. |

## Highest-Priority Open Gaps

Launch/product gates:

- `GAP-006`: legal review process and Romania activation ownership remain open.
- `GAP-012`: billing products, prices, trial/downgrade policy, and entitlement packaging need product approval.
- `GAP-021`: readiness score weights, stale-evidence policy, accepted-risk credit, and customer-facing copy need product/legal approval.
- `GAP-042`: Romanian legal caveat and regulatory notification copy remain English/source-mapped fallback until approved.
- `GAP-044`: no approved live/disposable external smoke target has been selected or run.
- `GAP-046`: self-service signup now has local email-verification completion, API-level owner-managed invitations, and served invitation creation/acceptance UX, but real delivery, open-vs-invite-only policy, platform-admin operations, and abuse controls remain open.

Runtime/production proof gates:

- `GAP-028`: real Stripe test-mode runtime and webhook delivery are deferred.
- `GAP-029`: live object storage/scanner/report-renderer smoke, browser PDF, streaming large-package hardening, and deployed export runtime proof are deferred; local stable internal-readiness CSV export, JSON/CSV report-export metadata rows, deterministic binary evidence-package tar bundles, and package size/file-count guardrails exist.
- `GAP-030`: live provider write execution remains intentionally deferred.
- `GAP-032`: live Microsoft/Google/GitHub OIDC callback smoke is deferred.
- `GAP-033`: Microsoft Exchange/SharePoint/Teams/Purview read modules are deferred.
- `GAP-035`: deployed TLS/proxy/browser auth smoke is deferred.
- `GAP-038`: deployed/shared rate-limit/proxy/CSRF hardening remains open.
- `GAP-039`: WORM/external audit signing and retention export remain open.
- `GAP-040`: real KMS/HSM/secret-manager custody and live rotation smoke remain open.
- `GAP-043`: production multi-process queue orchestration remains open.

## Recommended Next Step

M91 is complete. The next high-leverage motion is still a product/operator decision rather than another workbook-debug UI pass:

```txt
Choose either Romanian legal/product activation work or exactly one approved disposable external proof target.
```

`docs/PLAN_M80.md` records that decision-gated handoff. Until a reviewer or disposable/test target is explicitly selected, keep GAP-006, GAP-042, and GAP-044 open and avoid adding DNSC submission, certification claims, provider writes, public regulatory fetches, or live external calls.

For the full gap-by-gap execution sequence, use `docs/gap-implementation-path.md`. It groups the remaining gaps into human decision gates, external proof gates, production runtime hardening, and post-proof feature expansion. For recursive one-slice-at-a-time implementation, use `docs/recursive-gap-codex-prompt.md` with the staged `docs/PLAN_M92.md` runner.

For Microsoft 365 real-life tenant testing, use `docs/real-tenant-testing.md`, prepare local environment values from `docs/microsoft365-read-only-smoke.env.example`, and record each run with `docs/real-tenant-test-record-template.md`. The required order is disposable/test tenant first, friendly/internal pilot second, customer pilot only with written authorization, and production customer testing only after earlier evidence exists. The current runner remains read-only and selector-gated.

## Historical Snapshot - 2026-05-04

## Current Direction Override

M78 is now implemented as a local/in-a-box product slice rather than an outside-app Stripe/Microsoft 365/KMS smoke path. The repository now has an authenticated Romania readiness workflow that uses local auth, active workspaces, saved organization-owned onboarding answers, stored classification runs, source-linked notification drafts, internal readiness evaluation, local evidence/report/dashboard surfaces, billing-provider-none state, and audit metadata.

External-smoke work remains useful later, but it is still not the immediate product path until one approved disposable/test target is selected.

## Executive Position

PureSOC is technically healthy but not product-finished.

The repository has a strong contract/runtime baseline: schema contracts, Prisma adapters, auth, RBAC, regulatory source activation guardrails, Romania workbook import/source maps, Microsoft 365 read-only fixture modules, compliance evaluation, recommendations, evidence/report/dashboard contracts, billing contracts, audit integrity metadata, job runtime, local served UI routes, and local UI/browser smoke coverage.

The remaining product risk is not lack of scaffolding. The risk is that recent work has shifted toward smoke/drift guardrails while live integration, legal/product activation, customer-shaped workflows, and deployment operations remain deferred.

Codex agrees with the central diagnosis in `docs/claude_status.md`:

- M71-M77 are complete at repository/app-side handoff level.
- The contract surface is thick; the production runtime surface is still thin.
- GAP-044 is the keystone blocker for live external proof.
- Romania legal activation and Romanian regulatory copy are human/product/legal blockers.
- More smoke metadata will not by itself finish the product.

Codex nuance:

- The served web runtime has moved beyond the older static stub: it now proxies register/login/logout/session to the API, supports workspace creation/selection, renders from latest dashboard snapshots, and serves the saved-data Romania onboarding/readiness workflow.
- It is still framework-light `node:http`, not the full Next.js/React product shell from the master plan. It is acceptable for local smoke and internal demonstration, but not yet the final customer-grade frontend.
- M72-M77 deliberately did not fake live proof. M78 then converted the local Romania customer flow from handoff into an executable local product path without calling external services.

## Current Validation Snapshot

Fresh local validation on 2026-05-04, using host `npm`/Docker because the sandbox cannot create a namespace for local command execution:

```txt
flatpak-spawn --host npm run lint
passed

flatpak-spawn --host npm run test -- ro onboarding notification compliance evidence reports dashboards audit billing auth organization
passed, 55 files / 229 tests

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

No live external calls were made. No provider write actions were enabled. No DNSC submission path exists or should be added for V1.

## Product-Finish Definition For V1

The safest V1 should be:

```txt
Read-only NIS2 readiness and evidence product
Romania-first country-pack workflow
Microsoft 365 read-only posture connector
Stripe test-mode validated billing path before paid launch
Evidence/report export path with legal caveat
No automated provider remediation writes
No direct authority submission
No legal certification claim
```

Provider write/remediation automation should remain post-V1 unless the product explicitly funds a separate hardening track for action-specific rollback, verification, evidence, live tenant testing, and operational support.

## What Is Implemented Enough To Build On

| Area | Status | Product meaning |
|---|---|---|
| Monorepo, Docker catalog, package layout | Strong | The service inventory is coherent and Compose config validates. |
| Local auth, sessions, organizations, RBAC | Strong | Customer workspace fundamentals exist, with Prisma adapters and tests. |
| OIDC/social login | Contract-complete | Live Microsoft/Google/GitHub apps still need approved smoke. |
| Regulatory model | Strong contract | EU baseline and source activation lifecycle exist. |
| Romania country pack | Strong local product baseline | Workbook import, source map, classifier, onboarding schema, saved onboarding/classification persistence, and notification draft flow exist; legal activation still needs review. |
| Microsoft 365 provider | Read-only fixture-complete | Permissions and modules are modeled; no approved live tenant smoke yet. |
| Compliance engine | Strong contract | Article 21 controls, gaps, recommendations, readiness plan, and scoring exist; calibration needs product/legal approval. |
| Evidence/reports/dashboard | Strong local JSON/metadata baseline | Local Romania evidence/report/dashboard surfaces exist; browser-grade PDF, CSV, real bundles, and live object storage/scanner need runtime smoke. |
| Billing | Strong contract | Stripe adapter/webhook/entitlements exist; products/prices/live test-mode still missing. |
| Audit | Good database-level tamper evidence | WORM/export/notarized external anchor remains deferred. |
| Jobs/queues | Good local/disposable baseline | Production multi-container queue operations remain open. |
| Web UI | Good local served product console | Register, workspace creation/selection, dashboard, and saved-data Romania workflow run locally; full Next.js/React/cross-browser product runtime remains open. |

## Open Gaps That Matter Most

### Launch Blockers

| Gap | Remediation |
|---|---|
| GAP-044 External live-smoke target approval | Pick exactly one disposable/test target and run its guarded smoke. Start with Stripe test-mode, Microsoft 365 read-only tenant, or a real custody/KMS track if an adapter/target exists. |
| GAP-006 Legal review process | Product/legal must approve the M73 SOP, assign reviewers, and verify activation UI/ops before activating Romania legal logic. |
| GAP-012 Billing product decision | Product must fill the M75 template for packaging, Stripe prices, entitlements, customer limits, trial and downgrade rules. |
| GAP-021 Score calibration | Product/legal must approve readiness score weights, accepted-risk credit, evidence freshness, and customer-facing copy. |
| GAP-042 Romanian legal/regulatory copy | Add approved Romanian legal caveat and regulatory notification labels, or keep mixed-language fallback explicit for non-production demos. |

### Runtime Proof Blockers

| Gap | Remediation |
|---|---|
| GAP-028 Stripe runtime | Run test-mode Stripe smoke with real disposable/test credentials, webhook signing, and reconciliation job coverage. |
| GAP-029 Evidence runtime | Run disposable MinIO/S3 + scanner + report-renderer smoke; add browser PDF and production-size/streaming evidence package hardening. |
| GAP-032 OIDC live callback | Register one disposable provider app first, preferably GitHub for lowest setup friction, then Microsoft/Google. |
| GAP-033 Microsoft collaboration/Purview posture | Add read-only Exchange/SharePoint/Teams/Purview signal set only after live read-only baseline is proven. |
| GAP-035 Deployed auth/browser | Run deployed TLS/proxy auth smoke against a disposable deployment. |
| GAP-038 API runtime hardening | Add live Redis rate-limit smoke if needed and revisit double-submit CSRF after final browser runtime. |
| GAP-040 Provider token custody | Decide SaaS/in-a-box custody model; add real KMS/secret-manager adapter before SaaS customer provider onboarding. |
| GAP-043 Queue operations | Add multi-container worker/scheduler/connector-runner smoke and queue metrics/retention/cleanup guidance. |

### Deferred By Intent

| Gap | Position |
|---|---|
| GAP-030 Live provider write execution | Defer for V1. Keep Microsoft 365 write executors disabled. |
| GAP-039 WORM/external audit signing | Do not claim WORM or notarization until implemented and operated. Database hash chain is useful but not immutable storage. |
| GAP-031 Full frontend runtime | The current served UI is good for local proof. A customer-grade Next.js/React or deliberately chosen alternative shell remains future product work. |
| GAP-041 Drift coverage | M91 lint-gates billing customer persistence shape after M90 regulatory source activation/source-map/review-decision coverage. Keep future expansion selected and tied to a customer-facing or production adapter path. |

## Remediation Plan

### Track A - Local Product Hardening

M78 is complete. The next useful engineering motion is M79:

- Tighten the local Romania workflow around form errors, success/result continuity, first-run empty states, and export ergonomics.
- Document the in-a-box operator path from register through saved Romania readiness outputs.
- Keep the route saved-data-only, local-only, and explicit about unsupported provider writes, DNSC submission, legal activation, and external services.

Acceptance stays local: lint, focused tests, UI smoke, optional Firefox browser smoke, Compose config, and diff hygiene.

### Track B - Product Scope Cut

Make a written V1 scope decision:

```txt
V1 is read-only for provider integrations.
V1 may generate recommendations and manual/guided plans.
V1 does not execute Microsoft Graph write actions.
V1 does not submit to DNSC or any national authority.
V1 reports internal readiness, not legal compliance.
```

This single decision removes the biggest unsafe path from the launch critical path.

### Track C - Human/Product Decisions

These are not solved by code:

1. Romania reviewer SOP and activation process.
2. Romanian legal caveat and regulatory notification copy.
3. Readiness score wording and calibration.
4. Stripe packages/prices/entitlements.
5. SaaS-first or in-a-box-first deployment target.
6. First approved disposable live-smoke target.

Codex can implement around these decisions, but it cannot invent legal approval or pricing truth.

### Track D - Customer-Shaped Workflow

Prioritize one coherent demo path over more platform breadth:

```txt
register/login
create/select workspace
complete Romania readiness/onboarding path
generate preliminary classification and notification draft
connect mock or live-read-only Microsoft 365
produce gaps and readiness plan
upload/link evidence
generate report/export
show billing entitlement state
show audit trail
```

Each step should run through API-backed routes or stored outputs, not only package-level unit tests.

## Near-Live Testing Plan

The goal is not to run everything live at once. The goal is to select exactly one disposable/test target, prove the guardrails work, then expand.

### Phase 0 - Keep Default Safe

Run these with no secrets and no live calls:

```sh
cd code
npm run external-smoke:readiness
npm run external-smoke:select-target
```

Expected current result:

```txt
mode=dry_run
outcome=no_ready_path
readyCandidateCount=0
providerWritesEnabled=false
```

If this changes unexpectedly, stop and inspect the readiness matrix before running any live command.

### Phase 1 - Lowest-Risk Live Candidate

Preferred first live-ish proof: provider-token custody smoke, because it requires no third-party account and should remain local/disposable.

Required:

```txt
PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND=local
PURESOC_PROVIDER_TOKEN_KEY_PROVIDER=local-env-key-ring
PURESOC_PROVIDER_TOKEN_KEY_ID=<synthetic key id>
PURESOC_PROVIDER_TOKEN_KEY=<synthetic strong local key>
```

Command:

```sh
cd code
npm run provider-token:smoke
```

Acceptance:

- Secret-free output.
- Active-key encrypt/decrypt passes.
- Previous-key behavior is covered if configured.
- Production/test-only custody rejection still works.
- No Microsoft Graph call.
- No provider write.

### Phase 2 - First Real External App Smoke

Recommended first true external target: Stripe test-mode.

Why Stripe first:

- Fully sandboxed.
- Does not require customer tenant approval.
- Tests a revenue-critical path.
- Less risky than Microsoft tenant consent.

External app/setup needed:

```txt
Stripe test account
Test secret key beginning with sk_test_
Webhook signing secret for a disposable/local endpoint path
Test product and price IDs for Base, Pro, and MSP placeholders
Customer portal test-mode configuration
Disposable webhook delivery path or local forwarding mechanism
```

Environment shape:

```txt
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_STRIPE=true
PURESOC_BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASE=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_MSP=price_...
```

Preflight:

```sh
cd code
npm run external-smoke:readiness
npm run external-smoke:select-target
```

Only continue if selector chooses:

```txt
selectedPathId=stripe_test_mode_billing
selectedCommand=pnpm stripe:smoke:test-mode
readyCandidateCount=1
```

Run:

```sh
npm run stripe:smoke:test-mode
```

Acceptance:

- Test customer/session path works.
- Webhook signature verification works.
- Event idempotency works.
- Entitlement recalculation is deterministic.
- No live keys are accepted.
- No secrets or full Stripe object IDs are printed.

### Phase 3 - OIDC App Smoke

Recommended order:

1. GitHub OAuth app.
2. Google OAuth app.
3. Microsoft Entra app.

External app/setup needed:

```txt
Disposable OAuth/OIDC app registration
Client ID
Client secret
Redirect URI pointing to disposable/local auth callback
Provider enabled in PureSOC config
Safe test user identity
Secret rotation note
```

GitHub example shape:

```txt
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_OIDC_GITHUB=true
PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER=github
PURESOC_AUTH_GITHUB_ENABLED=true
PURESOC_AUTH_GITHUB_CLIENT_ID=...
PURESOC_AUTH_GITHUB_CLIENT_SECRET=...
PURESOC_AUTH_GITHUB_REDIRECT_URI=...
```

Acceptance:

- State/nonce/PKCE flow passes.
- Callback creates/links identity only through approved path.
- Audit events are written.
- Session cookie behavior is correct.
- No authorization codes, tokens, secrets, or live emails are printed.

### Phase 4 - Microsoft 365 Read-Only Tenant Smoke

Do this after Stripe or OIDC proves the live-smoke path works.

External app/setup needed:

```txt
Disposable/test Microsoft Entra tenant
Multitenant or tenant-scoped app registration for PureSOC smoke
Client ID and client secret
Admin consent for read-only permission bundles only
Test tenant ID
Known license state for Intune/Defender expectations
No write permission bundles
No customer production data
```

Environment shape:

```txt
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true
MICROSOFT365_CLIENT_ID=...
MICROSOFT365_CLIENT_SECRET=...
PURESOC_MICROSOFT365_SMOKE_TENANT_ID=...
```

Acceptance:

- App-only token path works.
- Tenant profile/licensing/users/groups/roles/applications/Conditional Access/audit/sign-in/Secure Score modules behave as expected.
- Missing license/permission states degrade module status, not the whole sync.
- Provider resources are stored through provider-neutral contracts.
- No write scopes requested.
- No tenant IDs, tokens, raw payloads, or live user emails are printed.

### Phase 5 - Evidence Runtime Smoke

External app/setup needed:

```txt
Disposable MinIO/S3 bucket
Access key and secret for that bucket only
HTTP scanner endpoint, or explicit local test scanner
Report-renderer endpoint
Bucket cleanup policy
No production/customer evidence
```

Environment shape:

```txt
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_STORAGE=true
PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS=true
PURESOC_OBJECT_STORAGE_PROVIDER=s3
PURESOC_OBJECT_STORAGE_ENDPOINT=...
PURESOC_OBJECT_STORAGE_BUCKET=...
PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID=...
PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY=...
PURESOC_UPLOAD_SCANNER_MODE=http
PURESOC_UPLOAD_SCANNER_ENDPOINT=...
PURESOC_REPORT_RENDERER=...
```

Acceptance:

- Object write/read/delete or cleanup path works.
- Scanner fail-closed behavior works.
- Generated report is stored as evidence metadata.
- Download/access audit logs are written.
- Storage URIs and object keys stay server-side.
- CSV and binary bundle gaps are either implemented or explicitly deferred.

### Phase 6 - Deployed Auth Smoke

External/deployment setup needed:

```txt
Disposable deployed API/web URL
TLS termination
Trusted browser origin
Secure cookie enabled
Proxy forwarded-header policy configured
No production customer data
```

Acceptance:

- Browser login/session/logout works over TLS.
- Secure/HttpOnly/SameSite cookie behavior is correct.
- Trusted Origin accepted; untrusted Origin rejected.
- Callback/webhook exemptions still work.
- Forwarded IP trust behaves only for configured proxy IPs.

## External App Gaps Needed

These are the concrete external resources required to break the current no-live-proof deadlock.

| Priority | External target | Needed from operator/product | Gap(s) moved |
|---|---|---|---|
| 1 | Stripe test-mode | Test Stripe account, `sk_test_` key, webhook secret, test products/prices, portal config | GAP-028, GAP-044, GAP-012 partially |
| 2 | GitHub OAuth app | Disposable OAuth app, client ID/secret, redirect URI, test identity | GAP-032, GAP-044 |
| 3 | Microsoft 365 test tenant | Disposable tenant, app registration, read-only admin consent, known license state | GAP-007 deferred portion, GAP-033, GAP-044 |
| 4 | MinIO/S3 + scanner | Disposable bucket, restricted credentials, scanner endpoint, renderer endpoint | GAP-029, GAP-044 |
| 5 | Deployed local/test environment | TLS URL, trusted origin, proxy policy, disposable database/storage | GAP-035, GAP-038, GAP-043 |
| 6 | Secret custody backend | KMS/Key Vault/Vault decision, non-prod credentials, rotation runbook | GAP-040 |

## Milestone Batch Status

M71-M78 are now complete inside the repository:

| Milestone | Result | Still external or human-owned |
|---|---|---|
| M71 | Romania generated import report is lint-gated with seed and source map. | Legal activation remains review-required. |
| M72 | Stripe test-mode handoff is ready. | Real Stripe test account, webhook delivery, product/price mappings. |
| M73 | Romania legal-review SOP checklist is written. | Product/legal reviewer assignment, approval, activation UI/ops. |
| M74 | Customer-shaped Romania readiness path is defined. | Persisted wizard/customer-grade runtime slice. |
| M75 | Billing product decision template is written. | Product-approved packaging, pricing, trial/downgrade policy. |
| M76 | Evidence runtime disposable-smoke handoff is ready. | Disposable storage/scanner/renderer execution and PDF/CSV/bundle completion. |
| M77 | Microsoft 365 read-only tenant handoff is ready. | Disposable tenant, app registration, read-only consent, live run. |
| M78 | Local deployable Romania readiness product slice is implemented. | Legal activation/copy approval, score calibration, cross-browser/full frontend runtime, live external smoke. |

## Recommended Next Milestone

### M79 - Local Romania Workflow Hardening And Handoff

Harden the local/in-a-box path that M78 made usable:

- improve workflow form error rendering and success/result continuity,
- add clearer local export/download links where existing report APIs support them,
- tighten empty/manual/provider-unsupported states for first-run customers,
- document the local operator runbook for using the M78 path,
- keep all external integrations, DNSC submission, provider writes, and legal activation out of scope.

## Stop-Doing List

Until at least one live target runs:

- Do not add another external-smoke readiness layer.
- Do not add more artifact index metadata unless a reviewer specifically needs it.
- Do not broaden drift checks unless tied to customer-facing output or a production adapter.
- Do not implement Microsoft write actions.
- Do not add direct DNSC submission.
- Do not imply Romania legal logic is active until GAP-006 is satisfied.

## Product/Legal Checklist

Before any customer launch:

- Romania legal-review SOP approved.
- Romanian legal caveat approved or English fallback explicitly accepted for launch.
- Readiness score labels and weights approved.
- Terms, privacy policy, DPA, DPIA, subprocessors, and support/incident channels prepared outside the repo.
- Stripe packaging approved.
- V1 read-only provider posture approved.
- First target market and deployment mode selected: SaaS first or in-a-box first.

## Release Readiness Gates

Minimum engineering gate for a read-only private beta:

```txt
npm run lint
npm run test
docker compose -f infra/compose/docker-compose.yml config
npm run test:e2e -- --grep @ui-smoke
npm run test:e2e -- --grep @browser-smoke  # when Firefox/WebDriver is available
npm run prisma:smoke:postgres              # disposable database
npm run jobs:smoke:redis                   # disposable Redis
one selected external smoke passes          # Stripe, OIDC, Microsoft 365, or evidence runtime
```

Minimum product gate:

```txt
Romania review process documented
No certification/legal-compliance wording
No provider writes
No direct authority submission
Billing package decision recorded
Known unsupported country/provider/runtime areas visible to users
```

## Bottom Line

The project does not need more generic scaffolding. It needs a controlled transition from contract confidence to product proof.

The next useful move is now:

```txt
Run M79: harden the local Romania workflow handoff around form errors, export ergonomics, first-run states, and operator documentation, with no external service dependency.
```

After that, shift the result into Romania legal/product review and only then return to external-smoke proof for Stripe, Microsoft 365, OIDC, evidence runtime, or custody.
