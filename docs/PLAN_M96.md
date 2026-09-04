# M96 Plan: Product Milestone 4 - Write Actions Wave 1 Zero Blast Radius

## Summary

M96 is staged for the next implementation slice from the user-provided PureSOC full product prompt: Milestone 4, write actions wave 1 with zero blast radius.

Status: completed locally on 2026-09-04.
Created: 2026-06-14.
Depends on: `docs/puresoc_vision.md`, `docs/master-plan.md`, `docs/implementation-gaps.md`, `docs/codex-prompts.md`, `docs/LEARNINGS.md`, completed remediation foundation work, existing provider/action lifecycle contracts, Microsoft 365 read-only connector fixtures, evidence metadata, audit logging, and served approval/recommendation UI.

## Intended Scope

- Implement four Microsoft 365 action templates that produce evidence or manual work only:
  - `AUDIT_LOG_EXPORT_SETUP`
  - `MFA_COVERAGE_REPORT`
  - `GUEST_USER_REVIEW_TASK`
  - `APP_REGISTRATION_CREDENTIAL_EXPIRY_REPORT`
- Keep the existing lifecycle: preflight, approval by `remediation_approver`, apply, post-snapshot, verify, evidence.
- Surface the four actions as available recommendation actions when relevant gaps exist.
- Update the approval queue UI with action type, preflight summary, and approver-only approval controls.

## Expected Files

- `code/packages/recommendations/src/*`
- `code/packages/providers/core/src/*`
- `code/packages/providers/microsoft365/src/*`
- `code/apps/api/src/actions/*`
- `code/apps/worker/src/*`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/operational-console.ts`
- Focused tests under `code/packages/**/__tests__`, `code/apps/api/src/__tests__`, `code/apps/worker/src/__tests__`, and `code/apps/web/src/__tests__`.

## Negative Constraints

- Do not implement Milestones 5-9.
- Do not enable broad provider writes.
- Do not modify Microsoft 365 configuration.
- Do not call live Microsoft Graph in tests or local validation.
- Do not bypass approval, audit, preflight, snapshots, verification, or evidence metadata.
- Do not claim remediation is fully automated; this wave only produces reports, setup guidance, evidence, or manual review tasks.

## Validation Plan

Run from `code/`:

```sh
npm run typecheck
npm test -- actions remediation microsoft365 recommendations web
npm run lint
DATABASE_URL=postgresql://pure_soc:pure_soc@127.0.0.1:5432/pure_soc npm run prisma:validate
git diff --check
```

If sandboxed tests cannot bind local HTTP ports, rerun the same command with approval outside the sandbox.

## Acceptance Criteria

- All four zero-blast-radius actions appear in Recommendations when their corresponding gaps are open.
- Each action follows the existing action lifecycle and produces evidence artifacts or manual checklist tasks.
- No Microsoft 365 configuration is modified by any action.
- Approval Queue shows pending actions with preflight summary.
- `remediation_approver` can approve; other roles see read-only state.

## Implementation Result

The remediation page now closes the previously disconnected product loop. A stored readiness analysis can offer four deterministic Microsoft 365 zero-blast actions, an authorized operator can start one without submitting a client-defined template, preflight creates an immutable pre-state report snapshot, an approver grants approval, and execution creates only PureSOC-local task/report/evidence records before attaching a post-state snapshot, verifying, and closing the action run. No Microsoft Graph write executor was enabled.

Delivered behavior:

- Added a Microsoft 365-owned action catalog and stored-resource output builders for audit-log setup guidance, MFA coverage, guest review, and application credential expiry.
- Added provider-neutral recommendation action-offer metadata and deterministic gap-to-action recommendation generation when a Microsoft 365 connection exists.
- Added `POST /api/remediation/actions` with stored-recommendation validation, organization-scoped idempotency, preview checks, and a pre-state snapshot.
- Completed the zero-blast lifecycle through local artifacts, post-state snapshot, verification, close, audit, and internal event creation.
- Added role-derived start/approve/execute controls. `remediation_approver` receives read and approve access but not start/execute access.
- Added actionable remediation UI controls, safety copy, preflight summaries, evidence counts, completed state, and checksum-verified JSON output download through the active workspace.
- Kept existing generic or executable-later provider action behavior gated; the four catalog actions are the only product-facade actions that receive the zero-blast execute control.

## Actual Changed Files

- `code/packages/providers/microsoft365/src/zero-blast-actions.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/recommendations/src/recommendation.types.ts`
- `code/packages/recommendations/src/index.ts`
- `code/apps/api/src/actions/routes.ts`
- `code/apps/api/src/product/routes.ts`
- `code/apps/api/src/product-v1/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/scripts/run-ui-smoke.mjs` (accepts both intentional absolute-position accessibility helpers: skip link and screen-reader-only text)
- Focused Microsoft 365, API lifecycle, and web tests under the corresponding `__tests__` directories.
- `docs/PLAN_M96.md`, `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and `docs/LEARNINGS.md`.

## Validation Results

Run from `code/` on 2026-09-04:

- `npm run typecheck` — passed.
- `npm test -- actions remediation microsoft365 recommendations web` — passed, 18 files and 138 tests.
- `npm run lint` — passed, including layout, schema-contract drift, regulatory generated-data drift, and TypeScript checks.
- `DATABASE_URL=postgresql://pure_soc:pure_soc@127.0.0.1:5432/pure_soc npm run prisma:validate` — passed.
- `npm test` — passed, 101 files and 551 tests.
- `npm run test:e2e -- --grep @ui-smoke` — passed after correcting the stale accessibility-helper positioning assertion; deterministic desktop/mobile HTML snapshots and no-live-call checks passed.
- `git diff --check` — passed.

No deploy, live Microsoft Graph request, provider mutation, regulator submission, or other external call was made.

## Gap Movement And Residual Risk

- GAP-030 is narrowed for customer-facing, approval-gated zero-blast actions with complete snapshot/verification/evidence lifecycle. It remains open for every provider write, recent-auth enforcement, live queue/executor proof, rollback, and disposable-tenant validation.
- GAP-053 is narrowed for the canonical remediation workflow and downloadable outputs. It remains open for final relational product models and richer cross-domain screens.
- GAP-054 remains open. Local JSON report snapshots use the existing product-v1 state-backed artifact contract; deployed object storage, browser-grade PDF output, live tenant proof, and production operations are not claimed.
- Output accuracy depends on the latest stored Microsoft 365 read snapshot. When no matching resource data exists, the generated output says so and provides a manual review/setup path rather than claiming verified coverage.

`docs/PLAN_M98.md` remains the next staged implementation plan. It covers retention-aware evidence deletion and optional provider-side revocation proof; it must not be broadened into provider configuration writes.
