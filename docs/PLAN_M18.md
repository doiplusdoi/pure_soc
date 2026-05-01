# M18 Plan: Runtime Truth Baseline

## Summary

Implement Prompt 17 from `docs/codex-prompts.md`: make the runtime honest by adding environment-driven persistence selection, startup configuration validation, and Docker entrypoints that execute the implemented application code instead of placeholder stubs.

Status: completed.  
Created: 2026-05-01.
Started: 2026-05-01.
Completed: 2026-05-01.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/threat-model.md`
- `docs/claude_rec.md`
- `docs/claude_rec2.md`
- `docs/PLAN_M17.md`
- `docs/adr/ADR-002-docker-image-and-compose-service-catalog.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- `docs/adr/ADR-008-evidence-storage-metadata-and-export-model.md`
- `docs/adr/ADR-011-regulatory-source-activation-lifecycle.md`
- Latest changed files
- Latest test output

## Goal

Close the gap between contract-tested implementation and deployable runtime behavior.

The current codebase has many strong adapters and contracts, but:

- `createApiServices()` still wires in-memory repositories by default.
- Prisma adapters are not selected by runtime configuration.
- Dockerfiles execute inline placeholder commands instead of real app entrypoints.
- Startup config does not fail fast for production-incompatible settings.
- The aggregate docs still understate the completed M1-M17 implementation and overstate runtime readiness.

M18 should establish a clear runtime truth baseline without attempting broad feature expansion.

## Scope

Expected implementation areas:

- Add a persistence-mode config such as `PURESOC_PERSISTENCE_MODE=memory|prisma`.
- Update `createApiServices()` so `memory` remains the fast default for tests and local contract runs, while `prisma` constructs Prisma-backed repositories where adapters already exist.
- Share one Prisma client boundary from `@puresoc/database` when Prisma mode is selected.
- Keep unsupported repository areas explicitly in memory or fail clearly, rather than silently pretending all runtime data is persisted.
- Add startup configuration validation and call it from API startup.
- Replace Dockerfile placeholder commands with real application entrypoints for API and the service roles touched by this milestone.
- Add package scripts or minimal entrypoint modules required for Docker runtime execution.
- Add tests for persistence-mode selection, config validation, and Dockerfile/Compose runtime command shape.
- Update docs to distinguish contract readiness from runtime readiness.
- Update `docs/implementation-gaps.md` to reopen or create gaps for runtime issues confirmed during implementation.

Expected files:

- `code/.env.example`
- `code/config/defaults/app.json`
- `code/config/defaults/api.json`
- `code/config/defaults/storage.json`
- `code/config/defaults/billing.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/database/src/client.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/index.ts`
- `code/apps/api/src/__tests__/runtime-persistence.test.ts`
- `code/apps/api/src/__tests__/startup-config.test.ts`
- `code/infra/docker/Dockerfile.api`
- `code/infra/docker/Dockerfile.worker`
- `code/infra/docker/Dockerfile.scheduler`
- `code/infra/docker/Dockerfile.connector-runner`
- `code/infra/docker/Dockerfile.regulatory-importer`
- `code/infra/docker/Dockerfile.report-renderer`
- `code/infra/docker/Dockerfile.web`
- `code/infra/compose/docker-compose.yml`
- `code/package.json`
- `code/apps/*/package.json` as needed
- `code/scripts/*` as needed for Docker/runtime smoke checks
- `README.md`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M18.md`
- `docs/PLAN_M19.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

The exact Dockerfile list may be narrowed if the implementation proves some service roles still have no real long-running runtime. If a role remains intentionally non-runtime, document that explicitly in `code/README.md`, `docs/PLAN_M18.md`, and the gap register.

## Negative Constraints

- Do not add provider write/remediation execution.
- Do not add Microsoft-specific logic to generic compliance, persistence, config, Docker, or API wiring.
- Do not add Romania-specific logic outside the Romania country-pack/importer surfaces.
- Do not hardcode regulatory facts in UI conditionals.
- Do not make legal certification claims.
- Do not weaken organization-scoped authorization or evidence response redaction.
- Do not remove the in-memory test harness; it is still required for fast deterministic tests.
- Do not claim full production readiness from Docker build/config success alone.
- Do not introduce a broad API framework migration in this milestone; route/middleware refactor is reserved for the next API hardening milestone.
- Do not run live Stripe, Microsoft Graph, OIDC, MinIO/S3, public regulatory URL, or provider-write smoke tests in unit tests.

## Assumptions

- `memory` persistence remains the default for unit/integration tests unless an individual test opts into Prisma mode.
- `prisma` persistence may initially cover only adapters that already exist: compliance results, evidence metadata/access logs, billing, regulatory sources, and action metadata.
- Identity, organization, RBAC, session, provider resource, report/dashboard, or output repositories may still require additional Prisma adapters. If they remain in memory, M18 must record that as explicit residual risk and gap-register work.
- Runtime config validation should be environment-aware. Development can keep permissive defaults; production must reject insecure or incomplete combinations.
- The host environment used by prior milestones lacks `pnpm`, and Vitest 3 rejects `--runInBand`. If those constraints remain, use documented host-node equivalents and record exact validation differences.
- Docker runtime work may require a TypeScript build strategy, runtime loader strategy, or app-specific compiled entrypoints. Choose the smallest option that executes implemented app code and can be validated.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config persistence runtime docker api
pnpm prisma:validate
pnpm prisma:generate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent `npm` or direct binary commands already used in M14-M17 and record the substitution in `docs/PLAN_M18.md`.

If Docker build/run is available in the implementation environment, also run at least one bounded smoke:

```sh
docker compose -f infra/compose/docker-compose.yml build puresoc-api
docker compose -f infra/compose/docker-compose.yml up -d puresoc-postgres puresoc-redis puresoc-object-storage puresoc-api
```

Then verify that `puresoc-api` serves an implemented route such as `/health` from the real app entrypoint, not an inline Dockerfile stub. If Docker is unavailable, add static tests that fail on known stub command patterns and record live Docker smoke as residual risk.

## Expected Gap Movement

- Reopen or replace the resolved GAP-013 state if Docker images still do not execute real implemented apps.
- Partially address GAP-026 by adding runtime Prisma selection and keeping live PostgreSQL migration/apply smoke as a separate runtime/database item if not run.
- Create or update an open gap for any bounded context still stuck on in-memory runtime persistence after M18.
- Create or update an open gap for production config validation items intentionally deferred.
- Preserve GAP-028, GAP-029, GAP-030, GAP-031, GAP-032, GAP-033, and GAP-035 unless M18 directly validates those runtime areas.
- Add backlinks from gap entries to `PLAN_M18` when a gap is consciously deferred.

## Acceptance Criteria

- A config value selects `memory` vs `prisma` persistence mode.
- API service construction uses Prisma-backed repositories in Prisma mode for every adapter already implemented, and tests prove the selection.
- Any repository area not yet Prisma-backed is explicitly documented and tracked as residual risk, not hidden.
- Startup config validation rejects production-incompatible settings, including insecure session cookies in production, missing Stripe secrets when Stripe is enabled, missing S3 settings when S3 storage is enabled, and default provider-token encryption keys in production.
- Dockerfiles no longer contain inline placeholder `node -e` stubs for roles that are claimed as runnable apps.
- Compose config still validates.
- Docs explain the difference between contract-level readiness and runtime readiness.
- `docs/codex-prompts.md` marks M18 as the active prompt before implementation and, after implementation, marks it completed or rewrites it based on actual results.
- At the end of the M18 implementation run, create `docs/PLAN_M19.md` from the next active prompt selected after updating `docs/codex-prompts.md`.

## Next Plan Creation Requirement

M18 must preserve the recursive milestone loop.

Before the final response of the M18 implementation run:

1. Update `docs/PLAN_M18.md` with implementation results, changed files, validation output, acceptance status, gap movement, and residual risk.
2. Update `docs/codex-prompts.md`, retiring or rewriting the M18 prompt based on what actually shipped.
3. Select the next active implementation slice. The expected default is `PLAN_M19: Job Runtime Baseline`, covering `@puresoc/jobs`, worker/scheduler process loops, and shared queue adapters.
4. Create `docs/PLAN_M19.md` as a concrete stub with scope, expected files, validation plan, negative constraints, expected gap movement, and acceptance criteria.
5. In the final response, explicitly report whether `docs/PLAN_M19.md` was created.

## Completion Log

Implementation results:

- Added `PURESOC_PERSISTENCE_MODE=memory|prisma` with defaults and `.env.example` coverage.
- Added startup config validation for production-sensitive settings: secure cookies, Stripe secrets, S3 object-storage settings, HTTP scanner endpoint, production noop scanning, and default provider-token encryption key.
- Wired API service construction so Prisma mode shares one `@puresoc/database` Prisma client and selects existing Prisma adapters for compliance results, evidence metadata/access logs, billing, regulatory sources, and remediation action metadata.
- Exposed API runtime persistence status that lists persisted contexts and memory-backed contexts.
- Kept identity, local credentials, sessions, organizations, RBAC, audit sink, provider telemetry, stored analysis/generated reports/dashboard snapshots, and OIDC transient state memory-backed and tracked that explicitly in GAP-036.
- Replaced inline Docker `node -e` stubs with workspace entrypoint scripts. API, web, and report-renderer run implemented HTTP entrypoints; worker, scheduler, and connector-runner run explicit contract-status entrypoints pending the job runtime in GAP-037/PLAN_M19.
- Added `.dockerignore` and `CI=true` to Dockerfiles so image builds do not copy/purge local `node_modules`.
- Added focused tests for persistence selection, startup validation, and Docker runtime command shape.

Changed files:

- `README.md`
- `code/.dockerignore`
- `code/.env.example`
- `code/README.md`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/main.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/runtime-persistence.test.ts`
- `code/apps/api/src/__tests__/startup-config.test.ts`
- `code/apps/connector-runner/src/runtime-status.ts`
- `code/apps/regulatory-importer/src/cli.ts`
- `code/apps/report-renderer/src/server.ts`
- `code/apps/scheduler/src/runtime-status.ts`
- `code/apps/web/src/server.ts`
- `code/apps/worker/src/runtime-status.ts`
- `code/config/defaults/app.json`
- `code/config/defaults/connectors.json`
- `code/infra/docker/Dockerfile.api`
- `code/infra/docker/Dockerfile.connector-runner`
- `code/infra/docker/Dockerfile.regulatory-importer`
- `code/infra/docker/Dockerfile.report-renderer`
- `code/infra/docker/Dockerfile.scheduler`
- `code/infra/docker/Dockerfile.web`
- `code/infra/docker/Dockerfile.worker`
- `code/package.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/pnpm-lock.yaml`
- `code/tests/docker-runtime-shape.spec.ts`
- `docs/PLAN.md`
- `docs/PLAN_M18.md`
- `docs/PLAN_M19.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` was not available in this environment, so host-node equivalents were used.
- `npm run lint` passed through host Node/npm.
- `npm run test -- config persistence runtime docker api` passed through host Node/npm: 18 test files, 56 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:generate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `docker compose -f infra/compose/docker-compose.yml build puresoc-api` passed after adding `.dockerignore` and `CI=true`.
- Bounded API image smoke passed: `docker run ... puresoc-api:local` served `/health` from the implemented API entrypoint.
- `git diff --check` passed.

Acceptance status:

- Accepted for M18. Runtime truth is improved without claiming full production readiness.

Gaps updated:

- GAP-013 updated to record non-stub Docker entrypoints and defer worker-style process loops to GAP-037.
- GAP-026 updated as partially addressed by runtime Prisma adapter selection while live PostgreSQL migration/apply smoke remains open.
- GAP-036 created for contexts that remain memory-backed in Prisma runtime mode.
- GAP-037 created for missing worker, scheduler, and connector-runner process loops.

Prompt handoff:

- `docs/codex-prompts.md` now marks Prompt 17 / PLAN_M18 completed and stages Prompt 18 / PLAN_M19.
- `docs/PLAN_M19.md` created for Job Runtime Baseline.

Residual risk:

- Prisma mode is partial: identity/session/org/RBAC, audit logs, provider telemetry, stored analysis/report/dashboard state, and OIDC transient state remain memory-backed.
- Live PostgreSQL migration/apply and real CRUD smoke remain open under GAP-026.
- Worker, scheduler, and connector-runner still do not have durable queue-backed loops; they are staged for PLAN_M19/GAP-037.
- Docker API image build/run smoke passed, but full Compose service startup with all roles and live dependencies was not run.
