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
PURESOC_PROVIDER_TOKEN_KEY_PROVIDER=local-env-key-ring
PURESOC_PROVIDER_TOKEN_KEY_ID=current
PURESOC_PROVIDER_TOKEN_KEY=replace-with-secret-material
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS=previous-a=old-secret,previous-b=older-secret
```

New Microsoft 365 credential envelopes include the active key ID. Decryption can use the active key or configured previous keys so rotation can be staged deliberately. `local-env-key-ring` means the API process can read the configured key material from environment or secret-mounted environment injection; it is suitable for local development, tests, and in-a-box deployments that inject a strong secret through an operator-controlled Docker secret or equivalent runtime secret source. It is not KMS, HSM custody, or external signing.

M34 adds a bounded local rotation smoke:

```sh
pnpm provider-token:smoke
```

The smoke refuses production targets, uses only synthetic local key material and synthetic credential payloads, and proves active-key encrypt/decrypt, previous-key decrypt, bad-key failure, and production rejection of the checked-in local-dev active/previous provider-token keys. Smoke output contains only key IDs, check names, and non-live guarantees; it must not include plaintext provider tokens, OAuth codes, client secrets, key material, or decrypted credential payloads.

For Docker Compose or in-a-box deployments, prefer injecting `PURESOC_PROVIDER_TOKEN_KEY` and any staged `PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS` through a secret manager or Docker-secret-to-env bridge owned by the deployment layer. Keep one previous key configured only while old ciphertext still needs to decrypt, then remove it after a verified re-encryption/backfill window. Production startup rejects the checked-in local-dev key and duplicate/reused key material, but live SaaS KMS/secret-manager custody, deployed rotation smoke, ciphertext backfill/re-encryption, and operator rollback runbooks remain release hardening work.

OIDC/social-login callback state in Prisma mode stores state and nonce as hashes and stores the PKCE verifier in a local AES-GCM envelope. Configure the auth-owned envelope key with:

```sh
PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY=replace-with-secret-material
```

Production Prisma-mode startup rejects the checked-in local-dev OIDC transient-state key. Live Microsoft/Google/GitHub provider registration and callback smoke remain separate auth operations work.

Audit records written through `@puresoc/audit` include `previousHash`, `entryHash`, `hashAlgorithm`, and a redacted canonical payload. The in-memory sink can verify per-organization and global chains for contract tests. This is tamper-evident metadata only; it is not WORM storage, external signing, or proof that a database administrator could not rewrite all rows.

M33 adds audit export/checkpoint contracts and organization-scoped API routes:

```sh
GET  /organizations/:organizationId/audit/export
POST /organizations/:organizationId/audit/checkpoints
GET  /organizations/:organizationId/audit/checkpoints
```

Exports serialize the redacted canonical payloads, previous/current hash anchors, terminal hash, export metadata, verification status, retention/export policy metadata, external checkpoint provider status, and explicit guarantees. The default guarantees intentionally say `databaseRowsAreWorm=false`, `externalCheckpoint=not_configured`, `externalNotarization=false`, and `legalCertification=false`.

M37 adds configurable audit retention/export policy metadata and explicit external checkpoint provider contracts:

```sh
PURESOC_AUDIT_RETENTION_POLICY_KEY=puresoc-audit-database-only-7y
PURESOC_AUDIT_LOG_RETENTION_DAYS=2555
PURESOC_AUDIT_CHECKPOINT_RETENTION_DAYS=2555
PURESOC_AUDIT_EXPORT_RETENTION_DAYS=2555
PURESOC_AUDIT_CHECKPOINT_CADENCE_DAYS=30
PURESOC_AUDIT_EXTERNAL_CHECKPOINT_PROVIDER=none
```

The only runtime providers are `none` and deterministic `fake-local` for tests. `fake-local` creates a local hash/reference so contract tests can prove anchor metadata shape, but it is not an external timestamp authority, signing service, WORM store, KMS/HSM, legal certification, or production provider; production startup rejects it.

Checkpoint records are database-only terminal-hash records that can support later external anchoring. They persist retention policy, provider status, local/fake anchor metadata, and non-WORM/non-notarized guarantees. They are not WORM object-storage exports, HSM/KMS signatures, notarized checkpoints, retention enforcement, or legal certification. Creating a checkpoint appends an `audit_checkpoint_recorded` audit entry after the covered segment, so the checkpoint covers records up to the exported terminal hash, not the audit event that recorded the checkpoint.

Operators still own append-only/WORM storage, retention deletion/legal-hold policy, checkpoint export to immutable storage, external signing/notarization, audit verification alerts, and concurrent multi-process append semantics before making production auditability claims.

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

The job runtime baseline lives in `packages/jobs`. It provides a typed registry, dispatch results, failure/retry metadata, idempotent in-memory queue behavior for deterministic tests, graceful shutdown hooks, and an opt-in Redis-backed adapter under the `bullmq` queue-provider boundary. The Redis adapter uses a bounded command retry policy, atomic per-job claim locks, explicit stale-running recovery hooks, terminal-job cleanup hooks, and redaction for queue metadata/failure details. The worker validates remediation job safety metadata by default and keeps provider write execution disabled unless a caller injects the bounded fake-provider action-execution dependencies used by tests. The scheduler can enqueue the regulatory source monitor job under explicit config. The connector-runner executes read-only provider sync jobs and rejects non-read-only payloads.

M35 adds a provider-neutral action executor boundary in `@puresoc/providers-core` and a deterministic fake executor in `@puresoc/provider-mock`. The worker action-execution path checks the persisted action run, preflight result, approval, pre-state snapshot, provider connection, write-enabled state, and idempotency before invoking that fake executor. It records post-state snapshot and verification metadata and writes redacted `action_applied`, `action_verified`, or `action_failed` audit payloads. Microsoft 365 exports only a disabled action executor; no Microsoft Graph write endpoint is called and no Microsoft write scope is enabled by default. Live provider write execution, rollback/verification against real tenants, customer-facing enablement, and production multi-process queue orchestration remain deferred release-hardening work.

`PURESOC_JOB_QUEUE_PROVIDER=memory` is the default. `bullmq` is now covered by bounded live Redis smoke tests, but those smokes are not a claim that provider sync orchestration or remediation execution is production-ready.

Redis queue hardening settings:

```sh
PURESOC_JOB_REDIS_COMMAND_MAX_ATTEMPTS=3
PURESOC_JOB_REDIS_COMMAND_RETRY_BACKOFF_MS=100
PURESOC_JOB_REDIS_CLAIM_LEASE_MS=30000
PURESOC_JOB_REDIS_STALE_RUNNING_RECOVERY_MS=900000
PURESOC_JOB_REDIS_COMPLETED_RETENTION_MS=86400000
PURESOC_JOB_REDIS_FAILED_RETENTION_MS=604800000
```

Operators still own Redis durability mode, persistence/AOF policy, eviction policy, memory limits, backup/restore, retention cleanup cadence, queue metrics and alerts, multi-process deployment sizing, and shutdown/recovery runbooks. Stale-running recovery is intentionally explicit because recovering a genuinely long-running job too aggressively can create duplicate work.

### Live Redis/BullMQ Smoke

M36 extends `pnpm jobs:smoke:redis`. It targets `PURESOC_REDIS_URL`, `REDIS_URL`, or `redis://127.0.0.1:6379/0` and writes only synthetic `puresoc-m36-smoke-*` job keys under unique queue names. Use a local/disposable Redis instance, such as the Compose `puresoc-redis` service or an ephemeral CI service. Do not point it at production, staging, customer, or long-lived shared Redis data.

```sh
REDIS_URL=redis://127.0.0.1:6379/0 pnpm jobs:smoke:redis
```

For a non-local disposable Redis target, explicitly confirm the target is disposable:

```sh
PURESOC_REDIS_SMOKE_CONFIRM_DISPOSABLE=true \
REDIS_URL=redis://redis-ci.example.internal:6379/0 \
pnpm jobs:smoke:redis
```

The smoke proves enqueue, duplicate idempotency, single-claim behavior under competing worker runtimes, complete, retry/failure metadata, stale-running recovery, terminal retention cleanup, graceful shutdown, worker safety-validation metadata, scheduler regulatory monitor dispatch with a fake metadata client, and connector-runner read-only provider sync. It does not call Microsoft Graph, Stripe, OIDC providers, object storage, scanners, public regulatory URLs, KMS, browser runtimes, or provider write executors.

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
