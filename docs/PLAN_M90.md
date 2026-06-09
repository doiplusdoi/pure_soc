# M90 Plan: Recursive Gap Implementation Runner

## Summary

M90 is staged as the next recursive one-slice implementation milestone after M89. Use `docs/recursive-gap-codex-prompt.md` to select exactly one unblocked local slice, validate it, update the gap/status docs, and stage the next milestone.

Status: completed.
Created: 2026-05-30.
Completed: 2026-06-09.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Slice

Selected gap slice: GAP-041 selected schema/data-quality drift coverage for regulatory source activation persistence.

Why this is unblocked:

- GAP-041 explicitly says the selected drift map is not exhaustive and calls out regulatory source/source-map/decision tables as excluded surfaces.
- Regulatory source records, source maps, and review decisions are production-backed guardrail data for the no-auto-activation legal-review lifecycle.
- This slice can be implemented with local static checks and focused tests only.
- It does not require product/legal approval, approved Romanian legal copy, public regulatory fetches, live services, or provider writes.

Expected files:

- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `docs/PLAN_M90.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M91.md`

Expected gap movement:

- Narrow GAP-041 for selected drift coverage of `RegulatorySource`, `RegulatorySourceMap`, and `RegulatoryReviewDecision`.
- Do not close GAP-041, because drift coverage remains intentionally selected and other lower-risk/excluded tables may still be uncovered.

## First Candidate Review

Start by rebuilding the candidate list from the latest gap register. Current likely candidates:

1. Public signup/auth hardening that does not require choosing open versus invite-only registration, real email delivery, or enforcing a broad launch policy.
2. Frontend workflow polish that preserves the current UI and browser smoke artifacts.
3. Additional selected drift coverage only for newly customer-facing or production-backed surfaces.
4. Evidence/report/export improvements using local or fake adapters only, such as browser-PDF metadata prep or streaming-design scaffolding without live storage calls.
5. Queue/runtime operation hardening with local/disposable adapters only, keeping provider writes disabled.
6. Microsoft read-only fixture expansion only after checking current official Microsoft documentation and without adding write scopes.

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

Targeted commands for this slice from `code/`:

```sh
npm run test -- drift
npm run lint
git diff --check
```

## Negative Constraints

- Do not mark Romania legal logic active.
- Do not add or approve Romanian legal/regulatory copy.
- Do not fetch public regulatory URLs or call external services.
- Do not change customer UI or expose workbook/source-map internals in normal routes.
- Do not add provider write scopes, remediation execution, or direct DNSC/national-authority submission.

## Implementation Results

Changed files:

- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `docs/PLAN_M90.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M91.md`

What changed:

- Added selected Prisma schema drift expectations for `RegulatorySource`, `RegulatorySourceMap`, and `RegulatoryReviewDecision`.
- Guarded source activation status, active source version references, source-map target/source fields, source-map JSON payloads, and review decision metadata.
- Added a focused drift regression test proving those regulatory source activation models stay in the selected drift map.

Validation:

```txt
npm run test -- drift
passed, 1 file / 10 tests

npm run lint
passed; schema drift check covered 38 models / 539 fields and Romania generated regulatory drift covered 3 artifacts

git diff --check
passed
```

Acceptance status:

- Targeted test and lint validation passed.
- No Prisma schema or migration changes were made.
- No live external integrations, public regulatory fetches, DNSC/national-authority submission, legal activation, approved Romanian legal copy, provider write scopes, or remediation execution were added.

Gap movement:

- GAP-041 narrowed for lint-gated selected schema drift coverage of regulatory source activation/source-map/review-decision persistence.
- GAP-041 remains open because selected drift coverage is still not exhaustive; checklist/risk-acceptance tables and billing customers remain outside the selected map.

Residual risk:

- Drift coverage protects field/table shape only; it is not a substitute for repository/API behavioral tests or legal-review operating approval.
- Product/legal blockers for Romania activation, score calibration, and Romanian regulatory copy remain unchanged.

Next staged prompt:

- `docs/PLAN_M91.md` continues the recursive one-slice gap implementation runner.
