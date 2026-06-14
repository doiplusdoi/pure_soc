# M96 Plan: Product Milestone 4 - Write Actions Wave 1 Zero Blast Radius

## Summary

M96 is staged for the next implementation slice from the user-provided PureSOC full product prompt: Milestone 4, write actions wave 1 with zero blast radius.

Status: staged.
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
