# M5 Plan: Workspace Import Policy And Shared Type Boundaries

## Summary

Implement Prompt 4 from `docs/codex-prompts.md`: tighten monorepo package boundaries by moving cross-package consumers toward `@puresoc/*` exports, adding a layout guard against deep relative package imports, and extracting shared types only where duplication is already causing drift.

## Source Inputs

- `docs/puresoc_vision.md` sections 5, 8, 10, 14
- `docs/master-plan.md` sections 6, 7, 9, 13, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/claude_rec.md` sections REC-006, REC-009, REC-017, REC-023
- `docs/adr/ADR-001-template-aligned-monorepo.md`
- `docs/adr/ADR-006-provider-interface-and-resource-lifecycle-versioning.md`
- Prompt 3 / PLAN_M4 output and changed files

## Locked Decisions

- Keep package-internal relative imports acceptable.
- Prefer package exports for cross-package imports.
- Do not change runtime behavior except import paths and shared type definitions.
- Do not make generic compliance packages import Microsoft-specific packages.
- Do not weaken package `exports` boundaries to make deep imports pass.
- Do not create circular package dependencies.

## Current State

PLAN_M4 added the first Prisma-backed compliance-result adapter, but cross-package imports still mostly use deep relative paths. GAP-025 remains open:

- Package names and exports exist, but consumers frequently bypass them.
- Some shared source-reference, recommendation summary, and provider-finding-for-compliance types remain duplicated.
- Compliance core still depends on provider-core types instead of a smaller neutral finding shape.

## Scope

In scope:

- Add workspace dependencies for package consumers that import `@puresoc/*` packages.
- Switch cross-package imports from deep relative `../../../packages/.../src` paths to package exports.
- Add or extend a layout guard that rejects cross-package deep relative imports.
- Extract shared source-reference, severity, recommendation summary, or provider-finding-for-compliance types only where they reduce real duplication.
- Remove compliance-core's direct dependency on provider implementation types if a smaller neutral type is enough.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M6.md` after completion.

Out of scope:

- Runtime behavior changes.
- Broad package reshaping unrelated to import boundaries.
- Microsoft connector behavior changes.
- Prisma adapter behavior changes except import path updates.

## Expected Files And Ownership

- `docs/PLAN_M5.md`
- `docs/PLAN_M6.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/tsconfig.base.json`
- `code/package.json` files for affected apps/packages
- `code/scripts/check-layout.mjs`
- `code/packages/shared/src/*`
- `code/packages/compliance/core/src/*`
- `code/packages/providers/core/src/*`
- `code/packages/recommendations/src/*`
- `code/packages/reports/src/*`
- `code/packages/dashboards/src/*`
- `code/apps/*/src/*` imports as needed
- `docs/adr/*` only if a workspace import decision needs a durable ADR

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand import-smoke compliance recommendations provider
```

Also run from the repository root:

```sh
git diff --check
```

## Acceptance Criteria

- Workspace import smoke tests pass through package exports.
- Layout guard fails on cross-package deep relative imports.
- Compliance/recommendation/provider tests still pass.
- Typecheck catches package boundary regressions.
- GAP-025 is updated.
- Any deferred import-boundary decision is recorded in the gap register or an ADR.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M6.md` exists as the next incremental plan stub.

## Completion Log

Completed on 2026-04-30.

Actual changed files:

- Rewrote cross-package imports across `code/apps`, `code/packages`, and `code/tests` to use `@puresoc/*` package exports.
- Updated affected package manifests and `code/pnpm-lock.yaml` so consumers declare workspace dependencies.
- Expanded `code/scripts/check-layout.mjs` with an import-boundary guard for cross-package deep relative imports, deep `@puresoc/*/src` imports, and missing workspace dependencies; the guard includes a self-test for the negative cases.
- Added shared source-reference, confidence, recommendation summary, provider finding for compliance, and recommendation status/action-mode contracts in `code/packages/shared/src/index.ts`.
- Updated compliance, provider, recommendation, report, and dashboard packages to consume the shared contracts where they remove duplication.
- Removed compliance-core's type dependency on provider-core by evaluating against `ProviderFindingForCompliance`.
- Moved cross-package integration tests from package-local `src/__tests__` folders to root `code/tests` so package manifests do not need circular dev dependencies.
- `code/tsconfig.base.json` did not require changes; package-name imports resolve through pnpm workspace links, and dependency declarations are enforced by the layout guard.

Validation results:

```sh
pnpm lint
pnpm test -- --runInBand import-smoke compliance recommendations provider
```

Both commands passed on 2026-04-30.

Acceptance status:

- Workspace import smoke tests now import through `@puresoc/*` package exports.
- Layout guard rejects cross-package deep relative imports, deep package-path imports, and missing workspace dependency declarations.
- Compliance/recommendation/provider tests passed after the package-boundary migration.
- Typecheck passed through `pnpm lint`.

Gaps updated:

- `GAP-025` resolved for PLAN_M5.

Residual risk:

- The guard enforces root package exports only; if future packages intentionally add public subpath exports, the policy should be revised deliberately instead of bypassed.

## Handoff For Next Milestone

`docs/PLAN_M6.md` was generated from Prompt 5 / `PLAN_M6`: Regulatory Review Workflow And Source Activation Persistence.
