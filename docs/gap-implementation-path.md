# PureSOC Gap Implementation Path

Status: planning artifact for turning the current open gap register into executable work.
Date: 2026-05-30.
Source docs: `docs/puresoc_vision.md`, `docs/master-plan.md`, `docs/implementation-gaps.md`, `docs/codex-prompts.md`, and `docs/LEARNINGS.md`.
Recursive prompt: `docs/recursive-gap-codex-prompt.md`.

## 1. Current Diagnosis

PureSOC is no longer blocked by initial scaffolding. The repository has a local/in-a-box Romania readiness workflow, provider-neutral compliance contracts, Prisma-backed persistence paths, local auth and organizations, generated Romania regulatory data, read-only Microsoft 365 contract fixtures, local evidence/report/dashboard flows, billing contracts, audit metadata, queue adapters, and served UI smoke coverage.

The remaining gaps fall into four categories:

1. Human decision gates: product/legal/operator choices that Codex must not invent.
2. External proof gates: live or disposable smoke runs that require approved targets.
3. Production runtime hardening: operational proof for queues, auth deployment, audit export, key custody, storage/scanner, billing, and rate limiting.
4. Feature expansion after proof: Microsoft collaboration/Purview read modules, broader frontend runtime, selected schema drift coverage, and eventually safe remediation.

The next implementation path should therefore avoid another broad architecture pass. It should convert one decision or one runtime proof into a narrow, validated slice.

## 2. Gap Clusters

| Cluster | Gaps | Meaning | Implementation posture |
|---|---|---|---|
| Romania legal/product activation | GAP-006, GAP-021, GAP-042 | Legal review ownership, readiness score calibration, Romanian legal/regulatory copy, and source-derived activation remain unapproved. | Prepare reviewer/admin operations only. Do not mark legal logic active or invent approved copy. |
| Billing product and Stripe runtime | GAP-012, GAP-028 | Product packaging and Stripe price mappings are not approved; Stripe test-mode runtime has not been exercised. | Product must approve pricing first; then run guarded Stripe test-mode smoke. |
| First external proof target | GAP-044 plus GAP-007/GAP-028/GAP-029/GAP-032/GAP-035 | No live/disposable target has been selected. | Select exactly one approved target through `external-smoke:select-target`, then run only that smoke. |
| Public signup and launch auth | GAP-046, GAP-032, GAP-035, GAP-038 | Self-service registration is controlled-test ready, not broad SaaS ready; live OIDC, deployed TLS/proxy auth, rate limiting, and CSRF hardening remain. | Decide open vs invite-only, add email verification/invites/platform admin, then run deployment smoke. |
| Evidence/report runtime | GAP-029 | Local metadata, JSON exports, stable internal-readiness CSV output, persisted JSON/CSV report-export rows, deterministic local binary evidence-package tar bundles, and package size/file-count guardrails exist; live storage/scanner, browser PDF, streaming large bundles, and deployed runtime proof do not. | Run disposable storage/scanner/renderer smoke, then add browser PDF and streaming bundle hardening. |
| Queue/runtime operations | GAP-043, GAP-030 | Redis adapter and fake remediation executor exist; production multi-process orchestration and live write execution do not. | Harden queue orchestration first. Keep provider writes disabled. |
| Security custody and audit export | GAP-039, GAP-040 | Audit is tamper-evident in the database, not WORM/notarized; provider-token custody is local-env/fake only. | Add optional production adapters only after custody/export targets are selected. |
| Microsoft connector expansion | GAP-033, deferred part of GAP-007 | Core read-only modules exist; Exchange/SharePoint/Teams/Purview read signals and live tenant proof remain. | Revalidate official Microsoft docs, add fixture-backed read modules, no write scopes. |
| Frontend/runtime maturity | GAP-031 | Served local UI and Firefox smoke exist; full Next.js/React runtime and cross-browser parity remain. | Continue workflow coverage or migrate deliberately through ADR; do not weaken current smoke artifacts. |
| Selected drift/data-quality coverage | GAP-041 | Drift checks cover high-risk models, not every persisted surface. | Expand only as surfaces become production-backed or customer-facing. |

## 3. Recommended Execution Order

### Step 0: Preserve The Known-Good Local Product Baseline

Goal: keep M79's local Romania product path stable before branching into external proof or legal activation.

Expected files:

- No product files by default.
- Update `docs/codex_status.md` only when a new validation snapshot or blocker changes.

Negative constraints:

- Do not add legal activation, direct DNSC submission, provider writes, or live external calls.

Acceptance commands from `code/`:

```sh
npm run lint
npm run drift:regulatory
npm run test -- ro regulatory-import web notification dashboards reports
npm run test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

Gap movement:

- No gap should close here. This step prevents regression while later work narrows a specific gap.

### Step 1: Resolve The M80 Decision Gate

Goal: choose one path from `docs/PLAN_M80.md`.

Path A is best if product/legal reviewers are ready. It narrows GAP-006 and GAP-042 by adding reviewer-facing Romania review operations while customer UI remains source-safe.

Path B is best if an approved disposable/test target exists. It narrows GAP-044 and one runtime gap by running exactly one guarded external smoke.

Path C is best if neither reviewers nor disposable targets are available. It records the concrete blocker and stops without product churn.

Expected files:

- Always: `docs/PLAN_M80.md`, `docs/codex_status.md`, `docs/implementation-gaps.md`, `docs/LEARNINGS.md`.
- Path A likely: admin/review docs, Romania review summaries, focused tests.
- Path B likely: sanitized smoke evidence under docs, target-specific runbook updates.
- Path C likely: docs only.

Negative constraints:

- Do not run more than one external proof target.
- Do not use customer/production/live-key targets.
- Do not mark Romania legal logic active unless product/legal supplies exact approval and text.
- Do not add provider write scopes or write executors.

Acceptance:

- Path A uses the M80 Path A commands.
- Path B starts with `npm run external-smoke:readiness` and `npm run external-smoke:select-target`, then only the selected guarded smoke.
- Path C runs `git diff --check` after docs updates.

### Step 2: Product And Legal Decision Workstream

Goal: remove the main human launch blockers without pretending they are engineering facts.

Implementation slices:

1. Romania review operations for GAP-006/GAP-042.
2. Readiness score calibration review for GAP-021.
3. Billing product-decision completion for GAP-012.
4. Public signup policy for GAP-046.

Expected files:

- `docs/romania-legal-review-sop.md` or existing SOP docs if present.
- `docs/billing-product-decision.md` or existing billing decision template.
- `docs/implementation-gaps.md`.
- `docs/codex_status.md`.
- App/admin code only if a specific review UI or workflow is selected.

Negative constraints:

- Do not invent product pricing, Romanian legal copy, legal approval, or score weights.
- Do not expose source-map internals in normal customer UI.
- Do not label readiness as certification or legal compliance.

Tests and acceptance commands:

```sh
npm run lint
npm run test -- ro notification reports dashboards billing auth organization
npm run test:e2e -- --grep @ui-smoke
git diff --check
```

Done when:

- Review owners and activation delegation are assigned, or the blocker is explicitly documented.
- Approved copy/pricing/scoring values are either implemented exactly as supplied or still marked open.
- Public signup policy is chosen and reflected in product behavior.

### Step 3: First External Proof Workstream

Goal: get one real external proof instead of adding more readiness metadata.

Recommended first target:

1. Microsoft 365 read-only disposable tenant if the business priority is core compliance posture proof.
2. Stripe test-mode if the business priority is paid launch readiness.
3. Evidence runtime if the business priority is evidence/report export confidence.
4. OIDC callback or auth deployment if the business priority is login/production ingress confidence.

Expected files:

- Target-specific sanitized evidence record, preferably using the existing template for Microsoft 365 where applicable.
- `docs/implementation-gaps.md`.
- `docs/codex_status.md`.
- `docs/LEARNINGS.md` only for durable runbook lessons.

Negative constraints:

- Select exactly one target.
- Keep Microsoft and provider paths read-only.
- Do not print secrets, tokens, endpoint URLs, tenant IDs, full emails, raw provider payloads, storage URIs, or webhook secrets.
- Do not run if `external-smoke:select-target` returns `no_ready_path`.

Common acceptance sequence from `code/`:

```sh
npm run external-smoke:readiness
npm run external-smoke:select-target
```

Then run only the selected command:

```sh
npm run microsoft365:smoke:read-only
npm run stripe:smoke:test-mode
npm run evidence:smoke:runtime
npm run oidc:smoke:callback
npm run auth:smoke:deployment
```

Done when:

- One selected smoke is executed against an approved disposable/test target, or the exact blocker is recorded.
- GAP-044 is narrowed with evidence, not closed by intention alone.

### Step 4: Public Signup And Deployment Auth Hardening

Goal: turn controlled-test self-service signup into a launch-safe auth posture.

Implementation slices:

1. Decide open registration vs invite-only.
2. Wire email delivery and enforce verification before privileged actions.
3. Add owner-managed invitations and role assignment.
4. Define platform-admin bootstrap and recovery.
5. Add abuse/rate-limit evidence and deployed auth smoke.

Expected files:

- `code/apps/api/src/**` auth, organization, invite, and verification routes.
- `code/apps/web/src/**` registration, verification, invitation, and workspace UI.
- `code/packages/database/prisma/schema.prisma` only if new persisted invitation/admin fields are required.
- Tests under existing package or e2e locations.
- `docs/implementation-gaps.md`, `docs/codex_status.md`.

Negative constraints:

- Do not silently keep open registration if product chooses invite-only.
- Do not allow unverified users to perform privileged actions if verification is required.
- Do not weaken existing RBAC or organization-scoped checks.

Acceptance commands:

```sh
npm run lint
npm run test -- auth organization rbac audit web
npm run test:e2e -- --grep @ui-smoke
git diff --check
```

### Step 5: Evidence, Reports, And Export Runtime

Goal: move from local metadata/JSON exports to credible export runtime.

Implementation slices:

1. Run disposable storage/scanner/renderer smoke.
2. Add bucket provisioning/permission checks.
3. Add browser-backed PDF rendering coverage.
4. Extend persisted report-export records to generated PDF metadata.
5. Harden binary evidence-package assembly for production-size/streaming exports.

Expected files:

- `code/packages/evidence/**`
- `code/packages/reports/**`
- `code/apps/report-renderer/**`
- `code/apps/api/src/**` evidence/report routes as needed.
- `code/tests/**` or package tests.
- `docs/implementation-gaps.md`.

Negative constraints:

- Keep storage URIs server-side.
- Fail closed for production upload scanning when scanner is required.
- Keep legal caveat in every report.

Acceptance commands:

```sh
npm run lint
npm run test -- evidence reports dashboards
npm run evidence:smoke:runtime
git diff --check
```

### Step 6: Runtime Operations Hardening

Goal: prove deployed-like operations before production volume or write actions.

Implementation slices:

1. Multi-container queue smoke for worker/scheduler/connector-runner using Redis.
2. Shared Redis rate-limit smoke and deployed proxy/TLS auth smoke.
3. Audit export to immutable or WORM-capable target, if selected.
4. Real KMS/HSM/secret-manager custody adapter, if selected.
5. Backup/restore and operational runbooks.

Expected files:

- `code/packages/jobs/**`
- `code/apps/worker/**`
- `code/apps/scheduler/**`
- `code/apps/connector-runner/**`
- `code/packages/audit/**`
- `code/packages/providers/microsoft365/**` for token custody only.
- `code/infra/compose/**`
- `docs/runbooks/**` if runbook folder exists, otherwise `docs/`.

Negative constraints:

- Do not enable remediation writes as part of queue hardening.
- Do not claim WORM/notarization/KMS proof from fake or local-only providers.
- Do not point smoke commands at production, staging, customer, or long-lived shared targets.

Acceptance commands:

```sh
npm run lint
npm run jobs:smoke:redis
npm run auth:smoke:deployment
npm run provider-token:smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

### Step 7: Microsoft Read-Only Expansion

Goal: add business-relevant Microsoft read-only posture coverage without weakening provider neutrality.

Implementation slices:

1. Revalidate official Microsoft Learn docs for Exchange, SharePoint, Teams, and Purview read endpoints and permissions.
2. Add minimal reliable read-only modules with mocked Graph fixtures.
3. Add module-level missing permission/license/unsupported API degradation.
4. Map provider-neutral findings to NIS2 controls.
5. Update `docs/microsoft365-permissions.md`.

Expected files:

- `code/packages/providers/microsoft365/**`
- `code/packages/providers/core/**` only for provider-neutral contracts.
- `code/packages/compliance/**` only for provider-neutral mappings.
- `docs/microsoft365-permissions.md`.
- Tests and fixtures under existing provider package locations.

Negative constraints:

- No write scopes.
- No Microsoft-specific logic in generic NIS2 evaluator.
- No live Graph call unless selected through the external proof path.

Acceptance commands:

```sh
npm run lint
npm run test -- microsoft365 provider compliance
git diff --check
```

### Step 8: Frontend Runtime Maturity

Goal: keep the current served product proof while deciding whether to migrate toward the master-plan Next.js runtime.

Implementation slices:

1. Add richer form validation and error handling to the current served Romania workflow.
2. Add cross-browser coverage if approved browser tooling exists.
3. Decide through ADR whether to migrate from current `node:http` web runtime to Next.js/React.
4. Preserve existing UI smoke and browser artifact indexes during any migration.

Expected files:

- `code/apps/web/**`
- `code/packages/ui/**`
- `code/tests/**`
- ADR only if runtime migration is selected.

Negative constraints:

- Do not replace working smoke coverage with a thinner path.
- Do not show workbook/source-map/cell/range/debug internals to normal customers.
- Do not turn the console into a marketing landing page.

Acceptance commands:

```sh
npm run lint
npm run test -- web ui-smoke browser romania onboarding
npm run test:e2e -- --grep @ui-smoke
npm run test:e2e -- --grep @browser-smoke
git diff --check
```

### Step 9: Safe Remediation After V1 Proof

Goal: defer live provider writes until the read-only product and runtime proof are stable.

Prerequisites:

- GAP-043 production queue orchestration narrowed with deployed-like smoke.
- Provider-specific preflight, snapshot, apply, verify, rollback, and evidence contracts exist for each action.
- Separate Microsoft write consent is implemented and explicitly enabled.
- Live disposable tenant write proof is approved, scoped, and reversible.

Negative constraints:

- Do not automate disabling users, deleting apps, changing mail flow, enforcing tenant-wide Conditional Access, revoking sessions tenant-wide, or editing Defender incidents by default.
- Do not bundle write scopes into first Microsoft onboarding.

Acceptance:

- Future prompt must be action-specific and include rollback, verification, evidence, approval, and operator support plans.

## 4. Practical Next Five Tickets

1. M80 decision execution: choose Path A, B, or C and update only the relevant docs/code.
2. Public signup policy and verification: narrow GAP-046 before broad public UI sharing.
3. One external proof target: prefer Microsoft 365 read-only disposable tenant for core product proof, or Stripe test-mode for monetization proof.
4. Evidence/report runtime: run disposable storage/scanner/renderer smoke, then add browser PDF and streaming binary bundle hardening.
5. Runtime operations: add multi-container queue smoke and deployed auth/proxy/rate-limit evidence before any provider write work.

## 5. Do Not Do Yet

- Do not add direct DNSC or national-authority submission.
- Do not claim certified or guaranteed NIS2 compliance.
- Do not activate Romania source-derived legal logic without approved review.
- Do not add Microsoft/provider write scopes or write automation to V1.
- Do not run customer or production external targets without explicit approval and sanitized evidence protocol.
- Do not broaden the root repository; app code, tests, configs, Compose files, and regulatory data stay under `code/`.
