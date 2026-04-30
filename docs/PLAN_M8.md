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

Pending implementation.

## Handoff For Next Milestone

After M8 completes, `docs/PLAN_M9.md` should be generated from the next active prompt in `docs/codex-prompts.md`, currently Prompt 8 / `PLAN_M9`: Safe Remediation Foundation.
