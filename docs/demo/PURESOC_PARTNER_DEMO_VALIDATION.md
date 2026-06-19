# PureSOC Partner Demo Validation

Status: living validation record.

## Baseline Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Passed | Run from `code/`. |
| `npm run compose:config` | Passed | Run from `code/`. |
| `npm run prisma:validate` | Failed | `DATABASE_URL` was unset. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | Run from `code/`. |

## Milestone 1 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Passed | Run from `code/` after partner-domain changes. |
| `npm run lint` | Passed | Layout, selected Prisma contract drift, generated Romania regulatory drift, and typecheck passed. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | Prisma schema with partner tables and audit context is valid. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:generate` | Passed | Required elevated local execution because Prisma updated `~/.cache/prisma` outside the workspace sandbox. |
| `npm run compose:config` | Passed | Compose topology remains valid. |
| `git diff --check` | Passed | No whitespace errors. |
| `npm run test -- packages/audit/src/__tests__/audit-integrity.spec.ts packages/database/src/__tests__/prisma-audit.repository.spec.ts` | Passed | 2 files, 13 tests. |
| `npm run test -- apps/api/src/__tests__/partner-tenant-access.test.ts` | Passed | 1 file, 4 tests. Required elevated local execution because the test binds a localhost HTTP server, which the workspace sandbox rejects with `EPERM`. |

## Sandbox-Only Failures

- `npm run test -- partner audit` in the workspace sandbox reached API server tests that bind `0.0.0.0` and failed with `listen EPERM`. The focused partner API server test passed when run with the approved local-server permission.
- `npm run prisma:generate` in the workspace sandbox failed while touching Prisma's engine cache under `~/.cache/prisma`. The same command passed with the approved Prisma generation permission.

## Milestone 2 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Passed | Run from `code/` after partner-console route and renderer changes. |
| `npm run lint` | Passed | Layout, selected Prisma contract drift, generated Romania regulatory drift, and typecheck passed. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | No additional schema changes beyond Milestone 1. |
| `npm run test -- apps/web/src/__tests__/web-dashboard-reports-ui.test.ts` | Passed | 1 file, 22 tests. Covers partner-console render states. |
| `npm run test -- apps/api/src/__tests__/partner-tenant-access.test.ts` | Passed | 1 file, 4 tests. Required elevated local execution because the test binds a localhost HTTP server. |
| `git diff --check` | Passed | No whitespace errors. |

## Milestone 3 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Passed | Run from `code/` after country-pack contract, API, and web route changes. |
| `npm run lint` | Passed | Layout, selected Prisma contract drift, generated Romania regulatory drift, and typecheck passed. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | No schema changes beyond Milestone 1 partner/audit migration. |
| `npm run compose:config` | Passed | Compose topology remains valid. |
| `npm run test -- packages/compliance/nis2/country-packs/core/src/__tests__/country-pack-nis2.spec.ts packages/compliance/nis2/country-packs/ro/src/__tests__/ro-onboarding.schema.spec.ts` | Passed | 2 files, 11 tests. Covers EU/PL/DE validation, structured demo classification, and Romania pack definition compatibility. |
| `npm run test -- apps/web/src/__tests__/web-dashboard-reports-ui.test.ts packages/compliance/nis2/country-packs/core/src/__tests__/country-pack-nis2.spec.ts packages/compliance/nis2/country-packs/ro/src/__tests__/ro-onboarding.schema.spec.ts` | Passed | 3 files, 34 tests. Covers `/onboarding/nis2` renderer and existing Romania route coverage. |
| `npm run test -- apps/api/src/__tests__/country-pack-api-routes.test.ts` | Passed | 1 file, 3 tests. Required elevated local execution because the test binds a localhost HTTP server. |
| `git diff --check` | Passed | No whitespace errors. |

## Milestone 4 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Passed | Run from `code/` after report-version metadata, API, and web route changes. |
| `npm run test -- packages/reports/src/__tests__/reports-exports.spec.ts apps/report-renderer/src/__tests__/report-renderer.spec.ts` | Passed | 2 files, 8 tests. Covers report JSON/CSV/evidence package and renderer template compatibility. |
| `npm run test -- apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts` | Passed | 1 file, 7 tests. Required elevated local execution because the test binds a localhost HTTP server. |
| `npm run test -- apps/web/src/__tests__/web-dashboard-reports-ui.test.ts` | Passed | 1 file, 23 tests. Covers Romania export forms carrying initial report-version context. |
| `npm run lint` | Passed | Layout, selected Prisma contract drift, generated Romania regulatory drift, and typecheck passed. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | No schema changes beyond Milestone 1 partner/audit migration. |
| `npm run compose:config` | Passed | Compose topology remains valid. |
| `git diff --check` | Passed | No whitespace errors. |

## Milestone 5 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run test -- packages/config/src/__tests__/config.test.ts packages/providers/microsoft365/src/__tests__/microsoft365-consent-graph-sync-permissions-redaction.spec.ts apps/api/src/provider-connections/microsoft365/__tests__/microsoft365-api-consent-health.test.ts apps/web/src/__tests__/web-dashboard-reports-ui.test.ts` | Passed | 4 files, 53 tests. Covers connector mode config, fixture consent/sync, MFA registration module, API health mode metadata, and web renderer compatibility. |
| `npm run typecheck` | Passed | Run from `code/` after Microsoft fixture/live/auto mode and module changes. |
| `npm run test -- packages/providers/microsoft365/src/__tests__/microsoft365-read-only-smoke.spec.ts packages/providers/microsoft365/src/__tests__/microsoft365-readiness-metadata.spec.ts packages/config/src/__tests__/external-smoke-readiness.test.ts` | Passed | 3 files, 15 tests. Covers read-only smoke/readiness metadata after adding the MFA module. |
| `npm run test -- microsoft365` | Passed | 6 files, 34 tests. Covers Microsoft token encryption, disabled write executor, readiness, smoke, API service, consent, Graph sync, permissions, and redaction. |
| `npm run lint` | Passed | Layout, selected Prisma contract drift, generated Romania regulatory drift, and typecheck passed. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | No schema changes for Milestone 5. |
| `npm run compose:config` | Passed | Compose includes the new Microsoft connector fixture/live/auto environment variables. |
| `git diff --check` | Passed | No whitespace errors. |

## Milestone 6 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Passed | Run from `code/` after verified-evidence report v2 changes. |
| `npm run test -- packages/reports/src/__tests__/reports-exports.spec.ts apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts` | Passed | 2 files, 15 tests. Required elevated local execution for the API test because it binds a localhost HTTP server; package tests also passed in the workspace sandbox. |
| `npm run lint` | Passed | Layout, selected Prisma contract drift, generated Romania regulatory drift, and typecheck passed. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | No schema changes for Milestone 6. |
| `npm run compose:config` | Passed | Compose remains valid with the existing Microsoft fixture-mode environment. |
| `git diff --check` | Passed | No whitespace errors. |

## Milestone 7 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run test -- packages/recommendations/src/__tests__/dynamic-recommendations.spec.ts` | Passed | 1 file, 4 tests. Covers Business Premium rule firing conditions, existing-capability suppression, unknown SKU diagnostics, sector-sensitive priority/action text, source metadata, CTAs, and forbidden-copy guardrails. |
| `npm run test -- packages/recommendations/src/__tests__/actions.spec.ts packages/recommendations/src/__tests__/dynamic-recommendations.spec.ts` | Passed | 2 files, 12 tests. Confirms existing remediation action contracts still accept the extended recommendation shape. |
| `npm run test -- apps/api/src/__tests__/compliance-validation-audit.test.ts` | Passed | 1 file, 5 tests. Required elevated local execution because the API test binds a localhost HTTP server; the sandbox run failed with `listen EPERM 0.0.0.0`. |
| `npm run test -- packages/recommendations/src/__tests__/dynamic-recommendations.spec.ts apps/api/src/__tests__/compliance-validation-audit.test.ts` | Passed | 2 files, 9 tests. Required elevated local execution because the API test binds a localhost HTTP server; the sandbox run failed with `listen EPERM 0.0.0.0`. |
| `npm run typecheck` | Passed | Run from `code/` after recommendation snapshot, catalog, API validation, and tests. |
| `npm run lint` | Passed | Layout, selected Prisma contract drift, generated Romania regulatory drift, and typecheck passed. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | No schema changes for Milestone 7. |
| `npm run compose:config` | Passed | Compose remains valid with fixture-mode Microsoft defaults. |
| `rg -n "Become NIS2 compliant|guaranteed nis2 compliance|certified compliant|legal compliance approved|compliance score" code/packages/recommendations/src code/apps/api/src/recommendations code/apps/api/src/compliance/validation.ts` | Passed | No matches; the new recommendation/customer-facing text does not introduce forbidden compliance-guarantee wording. |
| `git diff --check` | Passed | No whitespace errors. |

## Milestone 8 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Passed | Run from `code/` after partner portfolio aggregation, web surface, and demo seed script changes. |
| `npm run test -- apps/web/src/__tests__/web-dashboard-reports-ui.test.ts packages/recommendations/src/__tests__/dynamic-recommendations.spec.ts` | Passed | 2 files, 27 tests. Covers portfolio metric/opportunity rendering and deterministic recommendation rules. |
| `npm run test -- apps/api/src/__tests__/partner-tenant-access.test.ts` | Passed | 1 file, 4 tests. Required elevated local execution because the API test binds a localhost HTTP server; covers portfolio metrics, tenant snapshots, and opportunity rows. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run demo:verify` | Blocked | PostgreSQL was not reachable at `localhost:5432` because Docker Desktop/daemon was unavailable. The script returned a clean `database_unreachable` JSON blocker instead of a Prisma stack trace. |
| `docker compose -f infra/compose/docker-compose.yml up -d puresoc-postgres` | Blocked | Failed both sandboxed and elevated with missing Docker socket `/Users/solo/.docker/run/docker.sock`; no database container was started. |

## Milestone 9 Commands

| Command | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Passed | Run from `code/` after transactional partner customer creation, audit enrichment, route auth, and web banner propagation changes. |
| `npm run test -- --run apps/api/src/__tests__/partner-tenant-access.test.ts apps/api/src/__tests__/auth-organization-rbac-prisma-persistence.test.ts apps/web/src/__tests__/web-dashboard-reports-ui.test.ts` | Passed | 3 files, 31 tests. Required elevated local execution because API integration tests bind localhost and the workspace sandbox rejects that with `listen EPERM`. |
| `npm run test -- --run apps/api/src/__tests__/provider-connections-prisma-persistence.test.ts apps/api/src/__tests__/partner-tenant-access.test.ts` | Passed | 2 files, 6 tests. Covered the compatibility fix for audit enrichment with older Prisma fakes plus partner tenant-access coverage. |
| `npm run lint` | Passed | Layout, selected Prisma contract drift, generated Romania regulatory drift, and typecheck passed. |
| `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` | Passed | Prisma schema remained valid. |
| `npm run compose:config` | Passed | Compose topology remains valid; this does not prove the Docker daemon is available. |
| `npm test` | Passed | Full suite passed outside the sandbox: 90 files, 438 tests. Required elevated local execution because API tests bind localhost. |
| `git diff --check` | Passed | No whitespace errors. |

## Final Fixture Demo Closure Commands

Run from `code/` on 2026-06-19 after persisted country-aware onboarding/report changes.

| Command | Result | Notes |
|---|---:|---|
| `npm run lint` | Passed | Layout, schema-contract drift, generated Romania regulatory drift, and typecheck passed. Schema drift covered 42 Prisma models and 589 fields. |
| `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:5432/puresoc npm run prisma:validate` | Passed | Prisma schema with `nis2_onboarding_progress` and `nis2_classification_runs` is valid. |
| `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:5432/puresoc npm run prisma:generate` | Passed | Updated the local generated Prisma client after adding country-aware onboarding models. |
| `npm test` | Passed | Full suite passed outside the sandbox: 91 files, 442 tests. Required elevated local execution because API integration tests bind localhost. |
| `npm run test:e2e` | Passed | Unfiltered served web smoke passed with local HTTP browser substitute, API-backed renderer, UI/auth/origin checks, Romania route coverage, and non-live guarantees. |
| `npm run test:e2e -- --grep @fixture-demo` | Passed | Served web fixture flow created a partner and customer through web forms, entered a tenant session, opened DE onboarding, generated report v1, connected Microsoft partial fixture, synced read-only evidence, generated report v2/CSV/evidence package, verified v2 linked to v1 with comparison deltas, verified the Business Premium recommendation and partner portfolio opportunity, and exited the customer tenant. Non-live guarantees reported no Microsoft Graph, Stripe, OIDC, object-storage/scanner, KMS, public regulatory fetch, or provider-write calls. |
| `npm run compose:config` | Passed | Default Compose topology renders with fixture-mode Microsoft defaults and configurable host-port bindings. |
| `npm run compose:config:build` | Passed | Build-enabled Compose topology renders. |
| `PURESOC_POSTGRES_PORT=15432 PURESOC_REDIS_PORT=16379 PURESOC_OBJECT_STORAGE_PORT=19000 PURESOC_OBJECT_STORAGE_CONSOLE_PORT=19001 npm run compose:up` | Passed | Default host ports `5432`, `6379`, `9000`, and `9001` were occupied by unrelated local `radar_*` containers, so the PureSOC stack was started on alternate host ports without stopping other services. Compose built the local app images, ran the migrator, and started API, web, worker, scheduler, connector-runner, report-renderer, PostgreSQL, Redis, and MinIO. |
| `curl -fsS http://127.0.0.1:3001/health` | Passed | API reported `status=ok`, `environment=development`, and `providerWrites=disabled`. The sandboxed localhost probe failed, then the approved local probe passed. |
| `curl -fsS http://127.0.0.1:3000/health` | Passed | Web reported `status=ok`, `runtime=api-backed-renderer`, and `apiBacked=true`. The sandboxed localhost probe failed, then the approved local probe passed. |
| `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:15432/puresoc npm run prisma:migrate:deploy` | Passed | The Compose migrator had already applied all 14 migrations, including `20260619020000_nis2_country_onboarding`; the explicit deploy command reported no pending migrations. |
| `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:15432/puresoc npm run demo:reset` | Passed | Reset removed only deterministic demo records. |
| `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:15432/puresoc npm run demo:seed` | Passed | Seed produced Asterion Cloud Partners plus RO/DE/PL customers with persisted country-aware onboarding and expected Microsoft fixture states. |
| `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:15432/puresoc npm run demo:verify` | Passed | Verification returned `status=ready` for MedicaNova SRL, NordFrucht GmbH, and SecureOps Polska Sp. z o.o. |
| Second `demo:seed` followed by second `demo:verify` using the same `DATABASE_URL` | Passed | Rerunning seed followed by verify without a reset returned the same ready demo shape, proving the deterministic seed path is idempotent. |

Additional guardrail validation:

- Before `prisma:generate`, `demo:verify` returned structured `prisma_client_outdated` instead of a raw missing-delegate error, so stale generated Prisma clients now fail with an actionable message.
- The initial sandboxed `npm test` failed only because API tests could not bind `0.0.0.0` (`listen EPERM`). The same suite passed with local-server permission.
- No `postgres`, `initdb`, `pg_ctl`, or `psql` binary is available on PATH in this environment. Docker Desktop was used for the migrated PostgreSQL traversal. Unrelated `radar_*` containers kept the default database/cache/object-storage ports occupied, so Compose host-port overrides were used instead of stopping those services.

## External Calls

No Microsoft Graph, Stripe, OIDC provider, object storage, scanner, DNSC, KMS, deployment, or provider-write external call was made for Milestone 0 through final fixture-demo closure. Milestone 3 used public official-source browsing for EU/Poland/Germany source verification only. Milestone 5 used Microsoft Learn browsing to verify current admin-consent and Graph endpoint/permission assumptions. Milestone 7 used Microsoft Learn browsing to verify Business Premium capability/user-limit source metadata before encoding recommendation source references. No application runtime called those services. Milestone 6 through final closure local tests consumed only fixture/local inputs.

## Pending Milestone Validation

- Independent external/product/legal review remains outside this local validation run.
