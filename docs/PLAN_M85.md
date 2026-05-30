# M85 Plan: Recursive Gap Implementation Runner

## Summary

M85 implements one recursive local evidence/report/export slice after M84 and stages the next recursive milestone.

Status: completed.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Gap Slice

M85 selects a local evidence/report/export hardening slice for GAP-029: persist generated report export metadata rows for local JSON and CSV exports through the existing output repository boundary.

Why this is unblocked:

- GAP-029 explicitly lists persisted report-export rows as deferred evidence/report runtime work.
- The `report_exports` Prisma model and selected schema drift coverage already exist, but the output repository and report service do not yet write rows for generated exports.
- This can be completed with local memory/fake-Prisma tests and API tests, without live object storage, scanners, browser PDF rendering, binary bundle assembly, external smoke targets, product/legal approval, or provider writes.

## Expected Files

- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/repositories/output-records.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/__tests__/prisma-output-records.repository.spec.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M85.md`
- `docs/PLAN_M86.md`

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

Run from `code/`:

```sh
npm run test -- output-records reports evidence dashboards
npm run test -- evidence reports dashboards
npm run lint
git diff --check
```

Expected gap movement:

- GAP-029 narrows for local persisted `report_exports` metadata rows for generated JSON and CSV report exports.
- GAP-029 remains open for live object-storage/scanner/report-renderer smoke, browser-grade PDF fidelity, binary evidence-package assembly, and production runtime export hardening.

## Actual Implementation

Status: completed 2026-05-30.

Changed files:

- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/repositories/output-records.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/__tests__/prisma-output-records.repository.spec.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `docs/implementation-gaps.md`
- `docs/gap-implementation-path.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M85.md`
- `docs/PLAN_M86.md`

Implemented behavior:

- Added a `ReportExportRecordContract` for server-side generated export lifecycle metadata.
- Extended the memory and Prisma output repositories with `saveReportExport`, `findReportExport`, and `listReportExportsForReport`.
- JSON report generation now persists a ready `json` export row with a content hash.
- Internal-readiness CSV generation now persists a ready `csv` export row with a content hash in addition to the generated-report evidence artifact when evidence storage is enabled.
- Focused tests prove organization-scoped report-export reads and verify API responses still avoid `storageUri` exposure.

## Validation Results

Commands run from `code/`:

```txt
npm run test -- output-records reports evidence dashboards
initial sandbox run partially passed package-level tests but API server tests failed with listen EPERM

npm run test -- output-records reports evidence dashboards
passed outside the sandbox, 10 files / 43 tests

npm run test -- evidence reports dashboards
passed outside the sandbox, 9 files / 41 tests

npm run lint
passed; schema drift check covered 34 models / 492 fields and regulatory drift check covered 3 artifacts

git diff --check
passed
```

## Acceptance Status

Accepted for this local evidence/report/export metadata slice.

No live object storage, scanner, report-renderer, browser PDF rendering, binary evidence package assembly, external-smoke call, DNSC submission, provider write path, legal activation, or certification claim was added.

## Gap Movement

- GAP-029 narrowed for local persisted JSON/CSV `report_exports` metadata rows with organization-scoped memory and Prisma-boundary repository coverage.
- GAP-029 remains open for live object-storage/scanner/report-renderer smoke, browser-grade PDF fidelity, report-export persistence for future PDF/binary bundle outputs, binary evidence-package assembly, and production runtime export hardening.
- GAP-044 remains open because no approved disposable external target was selected or run.

## Residual Risk

Generated JSON and CSV exports now have local persisted lifecycle metadata, but production export runtime still needs live disposable storage/scanner/renderer proof, browser-grade PDF validation, future PDF/bundle export metadata, and real binary package assembly.

## Next Staged Milestone

`docs/PLAN_M86.md` is staged as the next recursive gap implementation runner.
