# M86 Plan: Recursive Gap Implementation Runner

## Summary

M86 implements one recursive local evidence/report/export slice after M85 and stages the next recursive milestone.

Status: completed.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Gap Slice

M86 selects a local evidence/report/export hardening slice for GAP-029: deterministic internal-readiness evidence package bundle assembly with local export metadata.

Why this is unblocked:

- GAP-029 explicitly leaves binary evidence-package assembly open after M84/M85 added CSV output and JSON/CSV `report_exports` metadata.
- Existing stored analysis, evidence metadata, local evidence download, report generation, and export metadata repositories are already available.
- This can be completed with local memory/fake tests, without live object storage, upload scanners, browser PDF rendering, external smoke targets, product/legal approval, DNSC submission, or provider writes.

## Expected Files

- `code/packages/reports/src/report.types.ts`
- `code/packages/reports/src/builders.ts` or a focused reports package helper
- `code/packages/reports/src/index.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/packages/database/src/contracts/outputs.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/reports/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M86.md`
- `docs/PLAN_M87.md`

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

- GAP-029 narrows for deterministic local binary evidence-package bundle assembly, source-caveated manifest metadata, local generated-report evidence storage, and `binary_evidence_package` report-export metadata rows.
- GAP-029 remains open for approved live object-storage/scanner/report-renderer smoke, browser-grade PDF fidelity, production bucket/permission checks, and broader binary package runtime hardening.

## Actual Implementation

Status: completed 2026-05-30.

Changed files:

- `code/packages/reports/src/evidence-package.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/reports/src/index.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/packages/database/src/contracts/outputs.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/reports/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `docs/implementation-gaps.md`
- `docs/gap-implementation-path.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M86.md`
- `docs/PLAN_M87.md`

Implemented behavior:

- Added a deterministic local tar bundle builder for internal-readiness evidence packages.
- Package bundles include `manifest.json`, stable internal-readiness JSON, stable internal-readiness CSV, and locally readable evidence artifact files when available through the authenticated evidence service.
- Package manifests carry legal caveat metadata, source references, included file hashes, included evidence metadata, and stored-analysis provenance without storage URIs.
- Added authenticated API `POST /organizations/:orgId/reports/internal-readiness/evidence-package`.
- Generated evidence packages are stored as generated-report evidence artifacts when generated-report evidence storage is enabled.
- Package exports write redacted `report_export_created` audit metadata and ready `binary_evidence_package` `report_exports` rows with content hashes.

## Validation Results

Commands run from `code/`:

```txt
npm run test -- reports
initial sandbox run partially passed package-level tests but API server tests failed with listen EPERM

npm run test -- reports
passed outside the sandbox, 4 files / 26 tests

npm run test -- evidence reports dashboards
passed outside the sandbox, 9 files / 43 tests

npm run lint
passed; schema drift check covered 34 models / 492 fields and regulatory drift check covered 3 artifacts

git diff --check
passed
```

## Acceptance Status

Accepted for this local evidence/report/export package slice.

No live object storage, scanner, report-renderer, browser PDF rendering, external-smoke call, DNSC submission, provider write path, legal activation, or certification claim was added.

## Gap Movement

- GAP-029 narrowed for deterministic local binary evidence-package tar assembly, local generated-report evidence storage, redacted audit metadata, and `binary_evidence_package` export rows.
- GAP-029 remains open for approved live object-storage/scanner/report-renderer smoke, browser-grade PDF fidelity, production-size/streaming bundle hardening, and deployed runtime validation.
- GAP-044 remains open because no approved disposable external target was selected or run.

## Residual Risk

The bundle assembly is deterministic and local, but production export runtime still needs live disposable storage/scanner/renderer proof, browser-grade PDF validation, bucket/permission checks, streaming or large-package behavior, and deployed runtime evidence.

## Next Staged Milestone

`docs/PLAN_M87.md` is staged as the next recursive gap implementation runner.
