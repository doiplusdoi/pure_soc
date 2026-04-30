# M9 Plan: Safe Remediation Foundation

## Summary

Implement Prompt 8 from `docs/codex-prompts.md`: create the recommendation-to-action lifecycle and approval model so future provider write actions have the required safety gates, audit trail, and evidence hooks.

## Source Inputs

- `docs/puresoc_vision.md` sections 9.4, 9.5, 9.6, 15, 22, 23, 28
- `docs/master-plan.md` sections 4, 9, 11, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/adr/ADR-010-remediation-safety-model.md`
- `docs/claude_rec.md` sections REC-001, REC-010

## Locked Decisions

- Do not implement live provider write actions.
- Do not allow action apply without approval state.
- Do not skip preflight, snapshot, verification, or evidence metadata in the model.
- Do not include high-risk V1-forbidden actions as executable defaults.
- Do not let entitlements replace RBAC or explicit approval.

## Current State

Recommendations, readiness plans, evidence metadata, audit writing, provider abstractions, and generated-report evidence storage exist. Provider write/remediation automation is still disabled; action lifecycle models and approval/preflight/snapshot/verification contracts are the next safety layer.

## Scope

In scope:

- Action template model.
- Action run model.
- Preflight result model.
- Approval state model.
- Pre-state and post-state snapshot metadata.
- Verification result model.
- Evidence link from action run.
- Manual/guided action support.
- Worker job contract for future execution.
- Audit events for preflight, approval, queued, failed, verified, and closed states.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M10.md` after completion.

Out of scope:

- Live provider write actions.
- Executable defaults for V1-forbidden high-risk actions.
- Replacing RBAC/approval with entitlements.
- UI approval affordances beyond model/API support unless required by tests.

## Expected Files And Ownership

- `docs/PLAN_M9.md`
- `docs/PLAN_M10.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/packages/recommendations/**`
- `code/packages/providers/core/**` if neutral action types need extension
- `code/apps/api/src/actions/**`
- `code/apps/worker/src/actions/**`
- `code/packages/database/prisma/schema.prisma` and repository files if Prisma is available
- `code/packages/evidence/**` only for action evidence-link integration
- `code/packages/audit/**` only for action audit helper additions

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand actions remediation approval preflight evidence audit
```

Also run Prisma validation/generation if schema changes:

```sh
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma
```

## Acceptance Criteria

- Action cannot apply without approval.
- Action cannot apply without preflight.
- Manual/guided action can create checklist/evidence tasks.
- Failed action is auditable.
- Action model links to recommendation, control, provider connection, and evidence.
- Cross-organization action access is rejected.
- High-risk forbidden action template cannot be executable by default.
- Remediation safety gaps are updated with any deferred execution behavior.
- Provider write/remediation automation remains disabled unless all safety preconditions are present.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M10.md` exists as the next incremental plan stub.

## Completion Log

Implementation started 2026-04-30.

Planned implementation path:

- Keep live provider write actions disabled.
- Add action lifecycle domain types and in-memory repository under `@puresoc/recommendations`.
- Add optional provider-neutral action contracts under `@puresoc/providers-core` without making connector implementations write-capable.
- Add API action routes with RBAC and audit events.
- Link action snapshot evidence through the existing evidence vault metadata/link model.
- Add Prisma schema/repository metadata for future persisted action runs.
- Add worker job contracts only; no worker execution.

Completed 2026-04-30.

Actual changed files:

- `code/packages/recommendations/src/actions.ts`
- `code/packages/recommendations/src/index.ts`
- `code/packages/recommendations/src/__tests__/actions.spec.ts`
- `code/packages/providers/core/src/actions.ts`
- `code/packages/providers/core/src/connector.ts`
- `code/packages/providers/core/src/index.ts`
- `code/packages/evidence/src/index.ts`
- `code/packages/evidence/src/__tests__/evidence-vault.spec.ts`
- `code/packages/audit/src/index.ts`
- `code/apps/api/src/actions/service.ts`
- `code/apps/api/src/actions/routes.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/actions-remediation-approval-preflight-evidence-audit.test.ts`
- `code/apps/worker/package.json`
- `code/apps/worker/src/actions.ts`
- `code/apps/worker/src/index.ts`
- `code/apps/worker/src/__tests__/actions.spec.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260430000000_initial/migration.sql`
- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/repositories/actions.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/packages/database/src/__tests__/prisma-actions.repository.spec.ts`
- `code/pnpm-lock.yaml`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/PLAN_M9.md`
- `docs/PLAN_M10.md`

Implementation results:

- Added a recommendation-to-action lifecycle covering templates, runs, preflight, approvals, pre/post snapshots, verification, evidence IDs, and closure.
- Added manual/guided follow-up checklist and evidence task generation.
- Added V1-forbidden high-risk executable default protection for actions such as disabling users, deleting applications, broad Conditional Access enforcement, tenant-wide session revocation, blind mail-flow changes, and broad DLP/retention changes.
- Added action audit coverage for preflight, approval requested, approved, queued, failed, verified, and closed states.
- Added API routes for the action lifecycle under organization-scoped action-run paths with RBAC.
- Added future worker job metadata with safety-gate confirmations but no provider executor.
- Added action-run evidence links through the existing evidence vault.
- Added Prisma action schema metadata and a Prisma repository adapter for future persisted action runs.
- Refreshed `code/pnpm-lock.yaml` after adding the worker workspace dependency.

Validation results:

```sh
pnpm lint
pnpm test -- --runInBand actions remediation approval preflight evidence audit
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma
```

All commands passed. In this environment, validation was run through the host command `flatpak-spawn --host sh -lc 'cd /mnt/solodata/SoloCode/pure_soc/code && npx pnpm@10.33.2 ...'` because the sandbox shell does not expose Node, npm, pnpm, or npx directly.

Gaps updated:

- GAP-030 added for deferred live remediation worker/provider execution, queue persistence, and live PostgreSQL action-runtime smoke coverage.

Acceptance status:

Accepted for Prompt 8 / PLAN_M9. M9 creates the safety foundation and future execution job contract, but no live provider write action is implemented or enabled.

## Handoff From M8

M8 completed production-shaped evidence/report adapter contracts. M9 can link action snapshots and verification evidence to the existing evidence artifact/link model, but it should not create live write execution paths.

## Handoff For Next Milestone

`docs/PLAN_M10.md` was generated from the next active prompt in `docs/codex-prompts.md`: Prompt 9 / `PLAN_M10`: Operational UI And Design System.
