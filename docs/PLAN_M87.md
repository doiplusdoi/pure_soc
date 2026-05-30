# M87 Plan: Recursive Gap Implementation Runner

## Summary

M87 implements one recursive local evidence/report/export slice after M86 and stages the next recursive milestone.

Status: completed.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Gap Slice

M87 selects a local evidence/report/export hardening slice for GAP-029: configurable local evidence-package guardrails for file count and bundle/file size limits.

Why this is unblocked:

- GAP-029 explicitly leaves production-size/streaming package hardening open after M86 added deterministic local binary evidence packages.
- Evidence package assembly is already local and deterministic, so adding guardrails can be validated with package/API tests.
- This does not require product/legal approval, live object storage, scanners, browser PDF rendering, external smoke targets, DNSC submission, or provider writes.

## Expected Files

- `code/config/defaults/reports.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/reports/src/evidence-package.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/reports/src/index.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M87.md`
- `docs/PLAN_M88.md`

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
npm run test -- reports
npm run test -- evidence reports dashboards
npm run lint
git diff --check
```

Expected gap movement:

- GAP-029 narrows for deterministic evidence-package file-count, per-evidence-file size, and total bundle-size guardrails with stable API errors.
- GAP-029 remains open for approved live object-storage/scanner/report-renderer smoke, browser-grade PDF fidelity, streaming package assembly, and deployed runtime validation.

## Actual Implementation

Status: completed 2026-05-30.

Changed files:

- `code/config/defaults/reports.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/reports/src/evidence-package.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/reports/src/index.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `docs/implementation-gaps.md`
- `docs/gap-implementation-path.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M87.md`
- `docs/PLAN_M88.md`

Implemented behavior:

- Added default evidence-package limits: 250 evidence files, 10 MiB per evidence file, and 50 MiB total bundle size.
- Added environment overrides through `PURESOC_REPORT_EVIDENCE_PACKAGE_MAX_EVIDENCE_FILES`, `PURESOC_REPORT_EVIDENCE_PACKAGE_MAX_EVIDENCE_FILE_BYTES`, and `PURESOC_REPORT_EVIDENCE_PACKAGE_MAX_BUNDLE_BYTES`.
- Successful evidence-package manifests record the active package limits with the existing legal caveat, source references, and file hashes.
- Oversized package attempts raise stable `ReportExportError` responses and avoid storing generated package evidence artifacts or `binary_evidence_package` report-export rows.
- The API preflights evidence count before downloads and checks per-file/bundle limits during deterministic package assembly.

## Validation Results

Commands run from `code/`:

```txt
npm run test -- reports
initial sandbox run passed package/web/database tests but API server tests failed with listen EPERM

npm run test -- reports
passed outside the sandbox, 4 files / 28 tests

npm run test -- evidence reports dashboards config
passed outside the sandbox, 13 files / 73 tests

npm run lint
initial run found a TypeScript narrowing issue in `positiveIntegerOrDefault`

npm run lint
passed; schema drift check covered 34 models / 492 fields and regulatory drift check covered 3 artifacts

git diff --check
passed
```

## Acceptance Status

Accepted for this local evidence-package guardrail slice.

No live object storage, scanner, report-renderer, browser PDF rendering, external-smoke call, DNSC submission, provider write path, legal activation, or certification claim was added.

## Gap Movement

- GAP-029 narrowed for configurable local evidence-package file-count, per-file byte, and total bundle byte guardrails with manifest metadata and stable API errors.
- GAP-029 remains open for approved live object-storage/scanner/report-renderer smoke, browser-grade PDF fidelity, streaming package assembly for larger exports, and deployed runtime validation.
- GAP-044 remains open because no approved disposable external target was selected or run.

## Residual Risk

The local package builder is bounded and deterministic, but it still builds packages in memory. Larger production exports need streaming assembly, live disposable object-storage/scanner/renderer proof, browser-grade PDF validation, and deployed runtime evidence.

## Next Staged Milestone

`docs/PLAN_M88.md` is staged as the next recursive gap implementation runner.
