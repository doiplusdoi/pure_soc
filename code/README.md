# PureSOC Application Workspace

This directory contains the PureSOC application monorepo.

Run application tooling from this directory:

```sh
pnpm install
pnpm lint
pnpm test
pnpm test:e2e -- --grep "@ui-smoke"
docker compose -f infra/compose/docker-compose.yml config
```

Repository-level docs remain in `../docs/`. App code, packages, tests, runtime config, Compose files, Dockerfiles, scripts, and regulatory seed data belong here.

## Prisma

Prisma commands run from this directory and expect `DATABASE_URL` in the environment or an ignored local `code/.env` file:

```sh
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm prisma:validate
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm prisma:generate
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm prisma:migrate:status
```

## Runtime Modes

`PURESOC_PERSISTENCE_MODE=memory` is the deterministic default used by tests and local contract runs.

`PURESOC_PERSISTENCE_MODE=prisma` selects the existing Prisma adapters for compliance results, evidence metadata/access logs, billing, regulatory sources, and remediation action metadata through one shared Prisma client boundary. Identity, organization/RBAC/session data, audit sink, provider telemetry, stored analysis/report records, dashboard snapshots, and OIDC transient state remain memory-backed until follow-up runtime slices add their adapters.

Startup validation fails fast for production-sensitive combinations such as insecure session cookies in production, Stripe billing without secrets, S3 storage without required connection settings, HTTP scanners without endpoints, production noop upload scanning, and the default provider-token encryption key.

Dockerfiles under `infra/docker/` run workspace entrypoint scripts. API, web, and report-renderer start implemented HTTP processes. Worker, scheduler, and connector-runner start typed job-runtime loops.

## API Middleware

The API still uses the focused `node:http` server. M20 adds a shared middleware layer that runs before JSON body parsing for non-health routes. It creates a request context, classifies route families, applies trusted-Origin/Referer checks for browser state-changing requests, and enforces configurable in-memory fixed-window rate limits by unauthenticated IP or authenticated user/organization.

Stripe webhooks and OIDC/Microsoft provider callbacks are explicit Origin-check exemptions so raw-body signature verification and external callback flows are not consumed or blocked by browser-only protections.

Configure the contract-level middleware with:

```sh
PURESOC_API_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001
PURESOC_API_ORIGIN_PROTECTION_ENABLED=true
PURESOC_API_REQUIRE_ORIGIN_OR_REFERER=false
PURESOC_API_RATE_LIMIT_ENABLED=true
PURESOC_API_RATE_LIMIT_MAX_REQUESTS=120
```

Distributed rate limiting, proxy-aware client-IP trust policy, strict CSRF-token rollout, and deployed browser/CORS smoke remain tracked as release hardening work.

The job runtime baseline lives in `packages/jobs`. It provides a typed registry, dispatch results, failure/retry metadata, idempotent in-memory queue behavior for deterministic tests, graceful shutdown hooks, and a BullMQ-ready adapter boundary. The worker validates remediation job safety metadata only and keeps provider write execution disabled. The scheduler can enqueue the regulatory source monitor job under explicit config. The connector-runner executes read-only provider sync jobs and rejects non-read-only payloads.

`PURESOC_JOB_QUEUE_PROVIDER=memory` is the default. `bullmq` is modeled as an adapter boundary for future Redis-backed deployment work; live Redis/BullMQ calls are not claimed as production-ready by this milestone.

## Layout

- `apps/`: service entrypoints and application roles.
- `packages/`: shared contracts and domain packages.
- `config/defaults/`: checked-in default config.
- `data/regulatory/`: EU and country-pack regulatory source data.
- `infra/compose/`: project-owned service catalog.
- `infra/docker/`: service Dockerfiles.
- `scripts/`: workspace maintenance scripts.
- `tests/`: cross-package smoke tests.

## Web UI

The M10 UI milestone adds a contract-backed operational console renderer in `apps/web` and shared design-system primitives in `packages/ui`. The console renders from stored dashboard, report, evidence, and remediation action contracts; it does not call live providers directly and does not make legal certification claims.

`pnpm test:e2e -- --grep "@ui-smoke"` runs the current static UI smoke checks. Browser-grade Playwright screenshots are tracked as deferred runtime hardening until the served web runtime is wired.
