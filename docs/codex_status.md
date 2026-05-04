---
title: PureSOC Codex Status, Remediation, And Local Product Progress
date: 2026-05-04
author: Codex
scope: Repository-level product-finish status after M71-M78, with local deployable Romania readiness implemented and M79 staged.
aligned_with:
  - docs/claude_status.md
  - docs/puresoc_vision.md
  - docs/master-plan.md
  - docs/implementation-gaps.md
  - docs/codex-prompts.md
  - docs/LEARNINGS.md
---

# PureSOC Codex Status - 2026-05-04

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
| GAP-029 Evidence runtime | Run disposable MinIO/S3 + scanner + report-renderer smoke; add browser PDF, CSV exports, and binary evidence package assembly. |
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
| GAP-041 Drift coverage | M71 lint-gates the Romania import report; stop expanding drift coverage unless it protects a customer-facing or production adapter path. |

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
