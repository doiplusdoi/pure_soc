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

## Drift Checks

`pnpm lint` includes two deterministic local drift checks before TypeScript:

```sh
pnpm drift:schema
pnpm drift:regulatory
```

`drift:schema` parses `packages/database/prisma/schema.prisma` and checks selected high-risk persisted models against explicit field expectations for audit, provider telemetry, compliance outputs, evidence, billing, regulatory review, remediation actions, reports, dashboards, and notification drafts.

`drift:regulatory` regenerates Romania NIS2 seed and source-map artifacts in memory from `data/regulatory/countries/ro/nis2ro-tool-v-2-1.xlsx` and compares them with the checked-in generated JSON. It does not fetch public regulatory URLs or activate legal logic.

## Prisma

Prisma commands run from this directory and expect `DATABASE_URL` in the environment or an ignored local `code/.env` file:

```sh
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm prisma:validate
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm prisma:generate
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm prisma:migrate:status
```

### Live PostgreSQL Smoke

M31 adds a live PostgreSQL migration and Prisma-mode CRUD smoke. It is for disposable local or CI databases only; do not point it at production, staging, customer, or long-lived developer data.

The command runs checked-in Prisma migrations, regenerates the Prisma client, then writes and reads synthetic `m31-smoke-*` records through the existing Prisma repository boundaries for identity/session/org/RBAC, audit, OIDC transient state, provider telemetry, compliance output, evidence metadata, billing, regulatory source review metadata, remediation action metadata, notification drafts, generated reports, and dashboard snapshots. It does not call Microsoft Graph, Stripe, OIDC providers, object storage, KMS, Redis/BullMQ, browser runtimes, public regulatory URLs, or provider write executors.

Use a disposable database name containing `smoke`, `test`, `ci`, `tmp`, or `disposable`, or set the explicit confirmation variable after verifying the target is disposable:

```sh
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc_smoke pnpm prisma:smoke:postgres

PURESOC_DATABASE_SMOKE_CONFIRM_DISPOSABLE=true \
DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc \
pnpm prisma:smoke:postgres
```

## Runtime Modes

`PURESOC_PERSISTENCE_MODE=memory` is the deterministic default used by tests and local contract runs.

`PURESOC_PERSISTENCE_MODE=prisma` selects the existing Prisma adapters for audit logs, identity/session/organization/RBAC data, OIDC transient authorization state, provider connections and read-only telemetry, compliance results, stored analysis/report/dashboard output records, evidence metadata/access logs, billing, regulatory sources, remediation action metadata, and notification drafts through one shared Prisma client boundary.

Startup validation fails fast for production-sensitive combinations such as insecure session cookies in production, Stripe billing without secrets, S3 storage without required connection settings, HTTP scanners without endpoints, production noop upload scanning, and the default provider-token encryption key.

Provider-token encryption supports a small local key-ring shape for Microsoft 365 credentials:

```sh
PURESOC_PROVIDER_TOKEN_KEY_ID=current
PURESOC_PROVIDER_TOKEN_KEY=replace-with-secret-material
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS=previous-a=old-secret,previous-b=older-secret
```

New Microsoft 365 credential envelopes include the active key ID. Decryption can use the active key or configured previous keys so rotation can be staged deliberately. Production startup rejects the checked-in local-dev key, but live KMS/secret-manager custody and rotation smoke remain release hardening work.

OIDC/social-login callback state in Prisma mode stores state and nonce as hashes and stores the PKCE verifier in a local AES-GCM envelope. Configure the auth-owned envelope key with:

```sh
PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY=replace-with-secret-material
```

Production Prisma-mode startup rejects the checked-in local-dev OIDC transient-state key. Live Microsoft/Google/GitHub provider registration and callback smoke remain separate auth operations work.

Audit records written through `@puresoc/audit` include `previousHash`, `entryHash`, `hashAlgorithm`, and a redacted canonical payload. The in-memory sink can verify per-organization and global chains for contract tests. This is tamper-evident metadata only; it is not WORM storage, external signing, or proof that a database administrator could not rewrite all rows.

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

The job runtime baseline lives in `packages/jobs`. It provides a typed registry, dispatch results, failure/retry metadata, idempotent in-memory queue behavior for deterministic tests, graceful shutdown hooks, and an opt-in Redis-backed adapter under the `bullmq` queue-provider boundary. The worker validates remediation job safety metadata only and keeps provider write execution disabled. The scheduler can enqueue the regulatory source monitor job under explicit config. The connector-runner executes read-only provider sync jobs and rejects non-read-only payloads.

`PURESOC_JOB_QUEUE_PROVIDER=memory` is the default. `bullmq` is now covered by a bounded live Redis durability smoke, but that smoke is not a claim that Redis/BullMQ operations, provider sync orchestration, or remediation execution are production-ready.

### Live Redis/BullMQ Smoke

M32 adds `pnpm jobs:smoke:redis`. It targets `PURESOC_REDIS_URL`, `REDIS_URL`, or `redis://127.0.0.1:6379/0` and writes only synthetic `m32-smoke-*` job keys under unique queue names. Use a local/disposable Redis instance, such as the Compose `puresoc-redis` service or an ephemeral CI service. Do not point it at production, staging, customer, or long-lived shared Redis data.

```sh
REDIS_URL=redis://127.0.0.1:6379/0 pnpm jobs:smoke:redis
```

For a non-local disposable Redis target, explicitly confirm the target is disposable:

```sh
PURESOC_REDIS_SMOKE_CONFIRM_DISPOSABLE=true \
REDIS_URL=redis://redis-ci.example.internal:6379/0 \
pnpm jobs:smoke:redis
```

The smoke proves enqueue, duplicate idempotency, claim, complete, retry/failure metadata, graceful shutdown, worker safety-validation metadata, scheduler regulatory monitor dispatch with a fake metadata client, and connector-runner read-only provider sync. It does not call Microsoft Graph, Stripe, OIDC providers, object storage, scanners, public regulatory URLs, KMS, browser runtimes, or provider write executors.

## Locale And Notification Draft Contracts

M23 adds a small contract-level locale model in `@puresoc/shared`: `en` and `ro` are supported locale codes, locale tags normalize to their base language, and unsupported locales fall back to English. The legal caveat is keyed as `puresoc.legal_caveat.internal_readiness.v1`; Romanian legal-caveat copy intentionally falls back to English until product/legal approves localized wording.

Country-pack notification drafts should converge on the generic `NotificationDraft.payloadJson` envelope model with a versioned schema key such as `ro.nis2.registration_notification.v1`. Romania-specific draft tables remain compatibility/workflow companions for onboarding and classification links, not the pattern for every future country pack.

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
