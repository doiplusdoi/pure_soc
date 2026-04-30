# M8 Plan: Production Evidence, Object Storage, Scanner, And PDF Adapters

## Summary

Implement Prompt 7 from `docs/codex-prompts.md`: move the Phase I evidence/report contracts from in-memory behavior toward production adapters while preserving the current tested contracts.

## Source Inputs

- `docs/puresoc_vision.md` sections 17, 19, 20, 21, 22, 25, 27, 28
- `docs/master-plan.md` sections 7, 8, 12, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/adr/ADR-007-report-renderer-strategy.md`
- `docs/adr/ADR-008-evidence-storage-metadata-and-export-model.md`
- `docs/adr/ADR-012-dashboard-aggregation-and-report-data-contracts.md`
- Skill: `puresoc-evidence-reporting`

## Locked Decisions

- Do not make evidence or reports public by URL alone.
- Do not generate reports from live provider API calls; use stored analysis records.
- Do not omit the legal caveat or regulatory source references.
- Do not mix cross-organization evidence or report data.
- Do not silently skip malware scanning in production mode.

## Current State

Evidence metadata, access audit, JSON report/export builders, dashboard aggregation, and API routes are implemented against in-memory repositories and stored analysis records. Runtime production adapters for object storage, upload scanning, persisted metadata/access logs, report artifact storage, binary evidence packages, and PDF rendering remain deferred.

## Scope

In scope:

- S3/MinIO-compatible object-storage adapter behind the evidence interface.
- Upload scanner interface adapter, with local no-op or mock mode explicit and auditable.
- Prisma-backed metadata/access-log repository if the current Prisma workflow is sufficient.
- Generated report storage as evidence artifacts.
- PDF rendering route/job behind `apps/report-renderer`.
- Evidence package export metadata that can later point to a binary bundle.
- Audit for upload, download, report generation, and export creation.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M9.md` after completion.

Out of scope:

- Public-by-URL evidence/report access.
- Live provider API calls during report generation.
- Production malware-scan bypasses.
- Final CSV/binary evidence bundle polish unless required by the adapter contract.

## Expected Files And Ownership

- `docs/PLAN_M8.md`
- `docs/PLAN_M9.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/packages/evidence/**`
- `code/packages/reports/**`
- `code/packages/dashboards/**` if persisted dashboard snapshots are touched
- `code/apps/api/src/evidence/**`
- `code/apps/api/src/reports/**`
- `code/apps/api/src/dashboards/**`
- `code/apps/report-renderer/**`
- `code/packages/database/prisma/schema.prisma` and repository files if Prisma is used
- `code/infra/compose/docker-compose*.yml` if object storage or scanner wiring changes
- `code/config/defaults/reports.json`
- `code/config/defaults/app.json` or storage config if needed

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand evidence reports dashboards exports renderer storage scanner
```

Also run Prisma validation/generation if persistence changes:

```sh
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma
```

## Acceptance Criteria

- Object-storage adapter contract has fake/local coverage.
- Upload scanner pass/fail behavior is covered.
- Evidence metadata persists and links to controls, jurisdictions, and source records.
- Download authorization and audit are preserved.
- Report generation stores an evidence artifact.
- PDF renderer returns deterministic output or a stable mocked artifact in tests.
- Cross-organization evidence/report rejection is covered.
- GAP-008 and GAP-018 are updated.
- Runtime gaps are added for deferred PDF/CSV/binary bundle features.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M9.md` exists as the next incremental plan stub.

## Completion Log

Implementation started 2026-04-30.

Planned adapter path:

- Keep `@puresoc/evidence` as the provider-neutral contract owner.
- Add a S3/MinIO-compatible object-storage adapter without making storage URIs public URLs.
- Add explicit mock/no-op/HTTP scanner adapters and make production no-op scanner use fail closed unless deliberately allowed.
- Add a Prisma-backed evidence metadata/access-log repository while preserving the in-memory repository.
- Wire API report generation so generated JSON reports are stored as `generated_report` evidence artifacts and audited.
- Expand the report-renderer app to return deterministic JSON/PDF renderer artifacts for contract tests while deferring browser-grade PDF rendering.
- Add tests for scanner pass/fail, S3 adapter behavior, Prisma evidence persistence, report evidence storage, and deterministic PDF renderer output.

Completed 2026-04-30.

Actual changed files:

- `code/packages/evidence/src/index.ts`
- `code/packages/evidence/src/__tests__/evidence-vault.spec.ts`
- `code/packages/database/src/repositories/evidence.ts`
- `code/packages/database/src/__tests__/prisma-evidence.repository.spec.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260430000000_initial/migration.sql`
- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/index.ts`
- `code/apps/api/src/evidence/service.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/reports/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `code/apps/report-renderer/src/index.ts`
- `code/apps/report-renderer/src/__tests__/report-renderer.spec.ts`
- `code/packages/config/src/index.ts`
- `code/config/defaults/storage.json`
- `code/config/defaults/reports.json`
- `code/.env.example`
- `code/package.json`
- `code/packages/database/package.json`
- `code/apps/report-renderer/package.json`
- `code/scripts/check-layout.mjs`
- `code/pnpm-lock.yaml`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/PLAN_M8.md`
- `docs/PLAN_M9.md`

Implementation results:

- Added S3/MinIO-compatible object storage with signed PUT/GET requests and `s3://` storage URIs, not public URLs.
- Added explicit no-op, mock, and HTTP upload scanner adapters. No-op scanner creation fails in production unless deliberately overridden, and evidence uploads can fail closed unless a clean scan completes.
- Added scanner metadata fields to evidence artifacts and Prisma schema/migration metadata.
- Added `PrismaEvidenceRepository` for artifacts, links, and access logs.
- Added storage/scanner runtime config and preserved the in-memory default harness.
- Report generation now stores generated JSON exports as `generated_report` evidence artifacts, links them to reports and source records, and audits report generation/export creation.
- `apps/report-renderer` now returns deterministic JSON and stable placeholder PDF artifacts.

Validation results:

```sh
pnpm lint
pnpm test -- --runInBand evidence reports dashboards exports renderer storage scanner
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma
```

All commands passed. In this environment `pnpm` was invoked through the pinned host runner `npx pnpm@10.33.2` because `pnpm` is not installed directly in the sandbox shell.

Gaps updated:

- GAP-008 updated for M8 adapter contracts and remaining runtime hardening.
- GAP-018 updated for generated-report evidence storage and deterministic renderer artifacts.
- GAP-029 added for live MinIO/scanner/browser-PDF/CSV/binary evidence-package runtime work.

Acceptance status:

Accepted for Prompt 7 / PLAN_M8. Runtime smoke for live object storage, scanner services, browser-grade PDFs, CSV exports, and binary evidence bundles is explicitly deferred to GAP-029.

## Handoff For Next Milestone

`docs/PLAN_M9.md` was generated from the next active prompt in `docs/codex-prompts.md`: Prompt 8 / `PLAN_M9`: Safe Remediation Foundation.
