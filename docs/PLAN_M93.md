# M93 Plan: Product Milestone 1 - PDF Report Generation

## Summary

M93 was redirected by the user-provided PureSOC full product prompt to implement Milestone 1: real PDF report generation.
The slice narrows GAP-029 for browser-backed PDF rendering, PDF report templates, generated-report PDF evidence metadata, audited PDF downloads, and internal-only renderer Compose wiring.

Status: complete.
Created: 2026-06-11.
Redirected: 2026-06-13.
Completed: 2026-06-14.
Depends on: `docs/puresoc_vision.md`, `docs/master-plan.md`, `docs/implementation-gaps.md`, `docs/codex-prompts.md`, `docs/LEARNINGS.md`, current report/evidence/output code, and the existing report-renderer stub.

## Scope Completed

- Replaced the deterministic PDF placeholder in `code/apps/report-renderer` with a Playwright-backed HTML-to-PDF renderer.
- Preserved the existing deterministic JSON/local render helper for fast tests and compatibility.
- Added `POST /render` support for `{ html: string, filename: string }` with `application/pdf` output.
- Added HTML templates for executive summary, gap report, Romania notification draft, and evidence-package index using existing report data structures.
- Added PDF API routes for the milestone acceptance paths:
  - `GET /organizations/:orgId/compliance/reports/gap-report?format=pdf&assessmentId=...`
  - `GET /organizations/:orgId/onboarding/romania/reports/notification-draft?format=pdf&notificationDraftId=...`
- Stored generated PDF artifacts as generated-report evidence and recorded `contentHashSha256` on the `GeneratedReport` row.
- Recorded PDF `report_exports` rows and returned the stored PDF through the audited evidence download path so `EvidenceAccessLog` records the download.
- Kept the renderer container on the internal Compose network only through `expose` instead of host `ports`.

## Files Changed

- `code/apps/report-renderer/src/index.ts`
- `code/apps/report-renderer/src/server.ts`
- `code/apps/report-renderer/src/__tests__/report-renderer.spec.ts`
- `code/apps/report-renderer/package.json`
- `code/apps/api/src/reports/service.ts`
- `code/apps/api/src/reports/routes.ts`
- `code/apps/api/src/reports/renderer-client.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `code/packages/reports/src/html-templates.ts`
- `code/packages/reports/src/index.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/reports/src/evidence-package.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260613020000_generated_report_content_hash/migration.sql`
- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/repositories/output-records.ts`
- `code/packages/database/src/__tests__/database-schema.spec.ts`
- `code/packages/database/src/__tests__/prisma-output-records.repository.spec.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `code/scripts/live-postgres-prisma-smoke.ts`
- `code/infra/docker/Dockerfile.report-renderer`
- `code/infra/compose/docker-compose.yml`
- `code/infra/compose/docker-compose.reports.yml`
- `code/.env.example`
- `code/pnpm-lock.yaml`

## Negative Constraints Honored

- Did not implement Milestones 2-9.
- Did not add DNSC submission, provider writes, remediation execution, legal activation, approved Romanian regulatory copy, or certification claims.
- Did not run live external storage/scanner/Microsoft/Stripe/OIDC integrations.
- Kept application code, tests, Compose files, runtime config, and generated schema artifacts under `code/`.

## Validation Results

Run from `code/` unless noted:

```txt
npm run prisma:generate
passed

npm run test -- report-renderer
passed, 1 file / 2 tests

npm run test -- apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts
passed outside the sandbox after the local HTTP listener path previously hit sandbox `listen EPERM`, 1 file / 7 tests

npm run test -- reports evidence dashboards
passed outside the sandbox after the local HTTP listener path previously hit sandbox `listen EPERM`, 9 files / 50 tests

npm run lint
passed, including layout, selected schema drift, generated regulatory drift, and TypeScript

docker compose -f infra/compose/docker-compose.yml config
passed

npx prisma migrate dev --schema packages/database/prisma/schema.prisma --name generated_report_content_hash
blocked before database access because `DATABASE_URL` was not set

DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npx prisma migrate dev --schema packages/database/prisma/schema.prisma --name generated_report_content_hash
blocked because no local PostgreSQL server was listening at `localhost:5432`
```

`git diff --check` is part of the final pre-commit validation.

## Acceptance Coverage

- `GET /organizations/:orgId/compliance/reports/gap-report?format=pdf` returns PDF bytes through the renderer client path in the API integration test.
- `GET /organizations/:orgId/onboarding/romania/reports/notification-draft?format=pdf` returns PDF bytes through the renderer client path in the API integration test.
- PDF HTML embeds the legal caveat, and the Playwright renderer injects it through the page footer template for every rendered page.
- `GeneratedReport.contentHashSha256` and `report_exports.contentHashSha256` are recorded for PDF exports.
- PDF artifacts are stored as generated-report evidence and are re-downloaded through `EvidenceApiService.download`, producing `EvidenceAccessLog` rows.
- The report-renderer service has its own Dockerfile and an internal-only Compose service entry.

## Gap Movement

GAP-029 is narrowed for local Playwright-backed browser PDF rendering, report template coverage, generated PDF evidence/hash/access-log metadata, and internal-only renderer Compose wiring.
It remains open for approved disposable/live object storage and scanner smoke, deployed renderer runtime smoke, bucket provisioning and permission checks, production-size/streaming evidence-package hardening, and broader browser PDF fidelity proof.

## Residual Risk

- `prisma migrate dev` could not be applied locally because this workspace has no running PostgreSQL target. The checked-in migration exists and `prisma generate` passed.
- Playwright browser launch was not smoke-tested on the host because the local environment does not install browser binaries; the renderer Dockerfile now uses the official Playwright image that includes Chromium.
- PDF rendering is verified through API integration with an injected renderer and renderer-template unit coverage. A full containerized renderer smoke remains a deployment/runtime validation item under GAP-029.
