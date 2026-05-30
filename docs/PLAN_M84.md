# M84 Plan: Recursive Gap Implementation Runner

## Summary

M84 is staged as the next recursive one-slice implementation milestone after M83. Use `docs/recursive-gap-codex-prompt.md` to select exactly one unblocked local slice, validate it, update the gap/status docs, and stage the next milestone.

Status: completed.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Gap Slice

M84 selects a local evidence/report/export hardening slice for GAP-029: add stable CSV output for selected internal-readiness report tables, expose it through the existing authenticated report API, and store the CSV as generated-report evidence when generated-report evidence storage is enabled.

Why this is unblocked:

- GAP-029 explicitly tracks CSV exports as deferred runtime/export work.
- Stable CSV generation can be implemented from already stored analysis records without live object storage, scanners, browser PDF rendering, product/legal copy approval, external targets, or provider writes.
- The existing report/evidence services already provide organization-scoped report generation, generated-report evidence storage, and report export audit events.

## Expected Files

- `code/packages/reports/src/builders.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/reports/src/index.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/reports/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `docs/implementation-gaps.md`
- `docs/gap-implementation-path.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M84.md`
- `docs/PLAN_M85.md`

## Negative Constraints

- Do not implement more than one slice.
- Do not add browser-grade PDF rendering or binary evidence package assembly in this slice.
- Do not add live object-storage/scanner calls or external-smoke execution.
- Do not mark Romania legal logic active.
- Do not add approved Romanian legal/regulatory copy without exact product/legal text.
- Do not add direct DNSC or national-authority submission.
- Do not claim certified, guaranteed, or legally approved compliance.
- Do not add Microsoft/provider write scopes or remediation execution.
- Do not run live external integrations without selector-first disposable/test guardrails and explicit approval.
- Keep application code, tests, Compose files, runtime config, and regulatory data under `code/`.

## Validation

Run from `code/`:

```sh
npm run test -- reports evidence dashboards
npm run test -- evidence reports dashboards
npm run lint
git diff --check
```

Expected gap movement:

- GAP-029 narrows for local stable CSV export generation and generated-report evidence metadata.
- GAP-029 remains open for browser-grade PDF rendering, binary evidence-package assembly, live object-storage/scanner/report-renderer smoke, and production runtime export hardening.

## Actual Implementation

Status: completed 2026-05-30.

Changed files:

- `code/packages/reports/src/builders.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/reports/src/index.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/reports/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `docs/implementation-gaps.md`
- `docs/gap-implementation-path.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M84.md`
- `docs/PLAN_M85.md`

Implemented behavior:

- Added `InternalReadinessCsvExport` and deterministic CSV serialization in `@puresoc/reports`.
- CSV output includes metadata, legal caveat, control results, gaps, recommendations, readiness-plan items, evidence, and source-reference rows from stored analysis report data.
- Added API `POST /organizations/:orgId/reports/internal-readiness/csv`, protected by the same organization roles as JSON report generation.
- Stored CSV exports as `text/csv` generated-report evidence artifacts when generated-report evidence storage is enabled, with report/source links and redacted `report_export_created` audit metadata.
- Kept storage URIs out of API responses and did not call live storage/scanner/report-renderer services.

## Validation Results

Commands run from `code/`:

```txt
npm run test -- reports evidence dashboards
initial sandbox run failed with listen EPERM for API server tests; package-level report/evidence/dashboard tests ran and exposed one CSV row-count assertion mismatch, which was fixed

npm run test -- reports
initial sandbox run failed with listen EPERM for API server tests after package/report assertions passed

npm run test -- reports
passed outside the sandbox, 4 files / 24 tests

npm run test -- evidence reports dashboards
passed outside the sandbox, 9 files / 41 tests

npm run lint
passed; schema drift check covered 34 models / 492 fields and regulatory drift check covered 3 artifacts

git diff --check
passed
```

## Acceptance Status

Accepted for this local evidence/report/export slice.

No live object storage, scanner, report-renderer, browser PDF rendering, binary evidence package assembly, external-smoke call, DNSC submission, provider write path, legal activation, or certification claim was added.

## Gap Movement

- GAP-029 narrowed for local stable internal-readiness CSV exports and generated-report evidence metadata.
- GAP-029 remains open for live object-storage/scanner/report-renderer smoke, browser-grade PDF fidelity, persisted report-export rows, and binary evidence-package assembly.
- GAP-044 remains open because no approved disposable external target was selected or run.

## Residual Risk

The CSV export path is deterministic and locally stored as evidence metadata, but production export runtime still needs live disposable storage/scanner/renderer proof, persisted report-export rows, binary package assembly, and browser-grade PDF validation.

## Next Staged Milestone

`docs/PLAN_M85.md` is staged as the next recursive gap implementation runner.
