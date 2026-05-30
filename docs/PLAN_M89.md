# M89 Plan: Recursive Gap Implementation Runner

## Summary

M89 was staged as the next recursive one-slice implementation milestone after M88. This run selected one unblocked local slice, validated it, updated the gap/status docs, and staged the next milestone.

Status: completed.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Slice

M89 selects a local public signup/auth hardening slice for GAP-046: add a served owner-managed organization invitation workflow on top of the M88 invitation API. This is safe to implement now because it uses existing local auth/session/RBAC APIs, requires no open-vs-invite-only registration policy decision, does not add real email delivery, and keeps invitation tokens out of web responses.

## Expected Files

- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/index.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `docs/PLAN_M89.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md` only if a durable lesson appears
- `docs/PLAN_M90.md`

## Validation Plan

Run focused web/auth validation first, then the required diff check:

```sh
npm run test -- web auth organization rbac audit
npm run test:e2e -- --grep @ui-smoke
npm run lint
git diff --check
```

If the sandbox cannot bind local HTTP ports for the served UI smoke, rerun the same command with approved escalation as required by the repo's existing validation pattern.

## Expected Gap Movement

- GAP-046 should narrow for served local invitation creation and acceptance screens backed by the existing API.
- GAP-046 should remain open for real email delivery, product-approved open-vs-invite-only policy, broad verified-email launch gating, platform-admin recovery, abuse controls, and deployment auth proof.
- No external proof gaps should move because no live external calls are in scope.

## First Candidate Review

Start by rebuilding the candidate list from the latest gap register. Current likely candidates:

1. Public signup/auth hardening that does not require choosing open versus invite-only registration, real email delivery, or enforcing a broad launch policy.
2. Frontend workflow polish that preserves the current UI and browser smoke artifacts.
3. Additional selected drift coverage only for newly customer-facing or production-backed surfaces.
4. Evidence/report/export improvements using local or fake adapters only, such as browser-PDF metadata prep or streaming-design scaffolding without live storage calls.
5. Microsoft read-only fixture expansion only after checking current official Microsoft documentation and without adding write scopes.

If the highest-priority slice requires product/legal/operator decisions, record the blocker and move to the next unblocked local implementation slice.

## Negative Constraints

- Do not implement more than one slice.
- Do not mark Romania legal logic active.
- Do not add approved Romanian legal/regulatory copy without exact product/legal text.
- Do not add direct DNSC or national-authority submission.
- Do not claim certified, guaranteed, or legally approved compliance.
- Do not add Microsoft/provider write scopes or remediation execution.
- Do not run live external integrations without selector-first disposable/test guardrails and explicit approval.
- Keep application code, tests, Compose files, runtime config, and regulatory data under `code/`.

## Validation

Use the targeted commands from `docs/recursive-gap-codex-prompt.md` for the selected slice and always run:

```sh
git diff --check
```

## Actual Changed Files

- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/index.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `docs/PLAN_M89.md`
- `docs/PLAN_M90.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`

## Implementation Summary

- Added served invitation screen model data and inviteable role options.
- Added `/invitations` and `/invitations/accept` render paths for owner/admin invite creation and invited-user acceptance.
- Added web POST proxy routes that call the existing organization invitation API and select the workspace after successful acceptance.
- Added an `Invite members` command in the operational console.
- Added focused render tests for create/accept forms, non-admin disabled creation, token-redaction copy, console navigation, and no plaintext token/email leakage.

## Validation Results

```txt
npm run test -- apps/web/src/__tests__/web-dashboard-reports-ui.test.ts
passed, 1 file / 17 tests

npm run test -- auth organization rbac audit web
passed outside the sandbox, 17 files / 85 tests

npm run test:e2e -- --grep @ui-smoke
passed outside the sandbox and wrote served UI snapshots/artifact index

npm run lint
passed

git diff --check
passed
```

`npm run test -- web` was also attempted inside the sandbox; the web render tests passed, but the broader grep matched an API webhook test that failed to bind a local server with `listen EPERM`, so the focused auth/org/web validation was rerun outside the sandbox.

## Acceptance Status

Accepted for this local served invitation UX slice.

## Gaps Updated

- GAP-046 narrowed for served local invitation creation/acceptance UX and console navigation.

## Residual Risk

The invitation workflow remains local/test-ready, not launch-ready. Real email delivery, product-approved open-vs-invite-only policy, broader verified-email gating, platform-admin bootstrap/recovery, public abuse controls, deployed auth proof, and live OIDC smoke remain deferred.

## Next Milestone

Created `docs/PLAN_M90.md` as the next recursive gap implementation runner.
