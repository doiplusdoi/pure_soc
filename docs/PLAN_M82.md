# M82 Plan: Romania Readiness Persistence Drift Coverage

## Summary

M82 selects one local, unblocked slice from the recursive gap runner: narrow GAP-041 by adding selected schema drift coverage for the customer-facing Romania onboarding progress and classification run persistence models.

Status: completed.
Created: 2026-05-30.
Depends on: `docs/PLAN_M81.md`, `docs/gap-implementation-path.md`, and the current GAP-041 status in `docs/implementation-gaps.md`.

## Selected Gap Slice

Selected: GAP-041, selected drift/data-quality coverage for persisted Romania onboarding/classification surfaces.

Why this is unblocked:

- The Romania readiness workflow is already customer-facing in local/in-a-box mode.
- The Prisma tables and memory/Prisma repository boundary already exist.
- The slice is local code and tests only; it requires no product/legal approval, no external target, no customer data, and no provider credentials.

Candidate review:

- GAP-006/GAP-042 legal activation and Romanian approved copy remain product/legal blocked.
- GAP-044 and live provider/runtime smokes remain operator/external-target blocked.
- GAP-046 public signup policy still has unresolved open-vs-invite-only and email delivery decisions.
- GAP-041 has a narrow local implementation path that protects a customer-facing persisted workflow.

## Expected Files

- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `docs/PLAN_M82.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md` only if a durable lesson appears
- `docs/PLAN_M83.md` as the next recursive stub

## Negative Constraints

- Do not mark Romania legal logic active.
- Do not add approved Romanian legal/regulatory copy.
- Do not add direct DNSC or national-authority submission.
- Do not expose workbook sheet/cell/range/source-map/debug internals in the normal customer UI.
- Do not add provider write scopes or remediation execution.
- Do not run live external integrations.
- Do not broaden drift coverage into unrelated surfaces beyond this selected slice.

## Validation Plan

Run from `code/`:

```sh
npm run lint
npm run test -- drift
npm run drift:regulatory
git diff --check
```

## Expected Gap Movement

- GAP-041 narrows for lint-gated schema drift coverage of `RoNis2OnboardingProgress` and `RoNis2ClassificationRun`.
- GAP-006, GAP-021, GAP-042, GAP-044, and GAP-046 remain open.

## Implementation Results

Actual changed files:

- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `docs/PLAN_M82.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M83.md`

Implemented:

- Added `RoNis2OnboardingProgress` to the selected Prisma drift expectations, including table name, organization mapping, JSON answer/source fields, missing-field arrays, status enum, and the organization/status index.
- Added `RoNis2ClassificationRun` to the selected Prisma drift expectations, including table name, organization/onboarding links, result enum, input/reason/source JSON fields, missing-field arrays, and the organization/result/classified-at index.
- Added focused drift test coverage proving both Romania readiness persistence models are included in the lint-gated selected schema drift map.

Commands run from `code/`:

```txt
npm run test -- drift
passed, 1 file / 8 tests

npm run lint
passed, schema drift check covered 34 models / 492 fields

npm run drift:regulatory
passed, 3 artifacts

git diff --check
passed
```

Acceptance status: accepted for the selected local slice.

Gaps updated:

- GAP-041 narrowed for lint-gated selected schema drift coverage of Romania onboarding/classification persistence.

Residual risk:

- Drift coverage remains intentionally selected, not exhaustive.
- Checklist/risk-acceptance tables, billing customers, and regulatory source/source-map/decision tables are still outside the selected schema drift map.
- Product/legal and external-target blockers remain unchanged for GAP-006, GAP-021, GAP-042, GAP-044, and GAP-046.

Deferred work:

- Future recursive slices should keep choosing one unblocked local gap at a time, or record blockers when the next highest-priority item requires product/legal/operator input.
