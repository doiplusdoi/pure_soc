# PureSOC Deployment Guide

Status: deployment guide for the current repository state as of 2026-06-20.
Scope: local development, in-a-box deployments, and SaaS-like deployment preparation.

PureSOC is Docker-first, TypeScript-first, provider-neutral, and Romania-first for V1. The current runtime is intentionally lighter than the original target stack: `apps/api` and `apps/web` use `node:http`, jobs use the local `@puresoc/jobs` adapter, and the browser smoke path uses deterministic HTTP snapshots plus host Firefox WebDriver BiDi when available. Do not describe the current implementation as NestJS, Next.js, BullMQ-package, or Playwright-backed unless those migrations are actually implemented.

PureSOC must not be deployed or marketed as legal certification. Reports and workflows are for `PureSOC internal readiness`, evidence support, and preliminary classification only.

## Deployment Profiles

| Profile | Purpose | Default posture |
|---|---|---|
| Local development | Fast contract work and UI smoke validation | Tests and smoke harnesses set `PURESOC_PERSISTENCE_MODE=memory`; Compose first-run uses durable Prisma/Postgres by default |
| In-a-box | Customer-controlled install with local services | `PURESOC_PERSISTENCE_MODE=prisma`, local or managed PostgreSQL/Redis/object storage, local auth, external integrations only when explicitly configured |
| SaaS/staging/production | Hosted multi-tenant service | Managed PostgreSQL, Redis, object storage, TLS ingress, secrets manager or equivalent, scanner, backups, monitoring, and approved external-service smokes |

Provider writes and remediation execution remain disabled. Microsoft 365 is read-only until a separate approval-gated write path exists with audit logging, preflight, snapshots, verification, and evidence.

## Compose-First Runtime Surface

The first-run environment is meant to bring the local/in-a-box stack up with `docker compose up --build`: API, web, worker, scheduler, connector runner, Postgres, Redis, MinIO/S3-compatible storage, report renderer, ClamAV/FreshClam, and the local HTTP upload-scanner adapter.

The Compose defaults use local email/password auth only. Microsoft Entra, Google, and GitHub user sign-in are opt-in. Microsoft 365 customer tenant connection is a separate managed-provider connector and does not require PureSOC users to sign in with Microsoft.

For the local/in-a-box path, the default shape is:

```sh
PURESOC_PERSISTENCE_MODE=prisma
PURESOC_BILLING_PROVIDER=none
PURESOC_OBJECT_STORAGE_PROVIDER=s3
PURESOC_JOB_QUEUE_PROVIDER=memory
PURESOC_API_RATE_LIMIT_STORE_PROVIDER=memory
PURESOC_AUTH_MICROSOFT_ENTRA_ENABLED=false
```

The expected first-boot operator secret is the PostgreSQL password. `DATABASE_URL` is built for the Compose network from the default DB/user/password unless a deployment overrides it for managed Postgres:

```sh
PURESOC_POSTGRES_DB=puresoc
PURESOC_POSTGRES_USER=puresoc_admin
PURESOC_POSTGRES_PASSWORD=...
DATABASE_URL=postgresql://puresoc_admin:...@puresoc-postgres:5432/puresoc
```

Add optional secrets only when enabling the matching feature:

| Feature | Enable when needed | Secrets introduced |
|---|---|---|
| Microsoft 365 managed provider | set `PURESOC_CONNECTOR_MICROSOFT365_MODE=live` or keep `auto` with connector client ID/secret configured | PureSOC platform app client secret and provider-token key material |
| Microsoft Entra user sign-in | `PURESOC_AUTH_MICROSOFT_ENTRA_ENABLED=true` | Entra app client ID/secret, deployed web callback URI, `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` when social login is enabled |
| Google/GitHub social login | `PURESOC_AUTH_*_ENABLED=true` | provider client secret, `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` in production Prisma mode |
| Stripe billing | `PURESOC_BILLING_PROVIDER=stripe` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| MinIO/S3 object storage | enabled by default for Compose | object-storage access key and secret key when replacing the bundled MinIO defaults |
| ClamAV upload scanning | enabled by default for Compose | none for bundled ClamAV; only image/policy overrides |
| Redis-backed jobs/rate limits | `PURESOC_JOB_QUEUE_PROVIDER=bullmq` or `PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis` | Redis URL if the Redis service requires credentials |

This Compose-first surface is not a claim that production operations are solved. Backups, monitoring, ingress/TLS, secret rotation, scanner resource sizing, and external proof smokes still need operator-owned configuration before launch.

## Service Topology

The main service catalog is `code/compose.yml`. It includes application `build:` entries and `pull_policy: build` for PureSOC application services, so Compose builds service images from the checked-out `code/` workspace using public base images from the Dockerfiles instead of pulling prepublished PureSOC images. `code/infra/compose/docker-compose.build.yml` is kept only as a compatibility override for older local scripts; single-file deployments should not need it.

Non-secret runtime defaults are embedded in the Compose file through `x-puresoc-default-environment` with `${VAR:-default}` interpolation. When using Docker Compose directly, `code/.env` or shell variables override those defaults; when using a deployment app, configure the same variables through that platform's environment/secret settings.

Application build output tags:

```txt
puresoc-web:local
puresoc-api:local
puresoc-worker:local
puresoc-scheduler:local
puresoc-connector-runner:local
puresoc-regulatory-importer:local
puresoc-report-renderer:local
```

Those tags are local build outputs, not public registry images. The Dockerfiles use the public ECR Docker Library Node image to avoid Docker Hub anonymous-token failures during app builds; bundled Postgres and Redis also use public ECR, and MinIO uses Quay. A Compose-reading deployment app must support `build:` and `pull_policy: build`, and must have access to the repository build context plus those public base-image registries.

| Service | Purpose | Notes |
|---|---|---|
| `puresoc-web` | Served web UI | Current `node:http` renderer, public port `3000` |
| `puresoc-api` | API, auth, orgs, compliance, billing, evidence, provider routes | Current `node:http` API, internal Compose port `3001` |
| `puresoc-migrator` | One-shot Prisma migration deployment | Runs checked-in migrations with `prisma migrate deploy`; does not reset data |
| `puresoc-worker` | Async job runtime | Uses configured job queue provider |
| `puresoc-scheduler` | Periodic scheduled jobs | Regulatory source monitor is disabled by default |
| `puresoc-connector-runner` | Provider sync jobs | Read-only; `PURESOC_CONNECTOR_RUNNER_ALLOW_PROVIDER_WRITES=true` is rejected |
| `puresoc-regulatory-importer` | One-shot regulatory import task | Compose profile `regulatory` |
| `puresoc-report-renderer` | Report rendering service | Current internal renderer, port `3002` |
| `puresoc-clamav` | ClamAV daemon and FreshClam updater | Internal-only `clamd` TCP service, persistent signature database volume |
| `puresoc-upload-scanner` | HTTP upload-scanner adapter | Accepts `/scan`, validates payload integrity, streams bytes to internal ClamAV |
| `puresoc-postgres` | PostgreSQL | Local Compose uses Postgres 16 |
| `puresoc-redis` | Redis | Jobs and optional shared API rate limits |
| `puresoc-object-storage` | MinIO/S3-compatible object storage | Local evidence/report binary storage path |
| `puresoc-object-storage-init` | MinIO bucket bootstrap | Creates the configured evidence bucket if missing |

Optional production services such as TLS reverse proxy, auth broker, mailer, monitoring, backups, WORM/archive storage, and external secret custody are deployment-layer responsibilities today.

## Baseline Deployment Process

Run repository tooling from `code/`.

1. Install and validate the workspace:

```sh
cd code
pnpm install
pnpm lint
pnpm test
pnpm test:e2e -- --grep "@ui-smoke"
docker compose config
```

2. Create a deployment environment file:

```sh
cd code
cp .env.example .env
```

The template omits optional integration secrets by default. Add Microsoft Entra sign-in credentials only when the deployed app should offer Microsoft login. Do not add Microsoft 365 connector, Google/GitHub, or Stripe credentials unless that feature is intentionally enabled.

3. Choose persistence:

The Compose and `.env.example` defaults are durable Prisma/Postgres:

```sh
PURESOC_PERSISTENCE_MODE=prisma
PURESOC_POSTGRES_DB=puresoc
PURESOC_POSTGRES_USER=puresoc_admin
PURESOC_POSTGRES_PASSWORD=...
DATABASE_URL=postgresql://puresoc_admin:...@puresoc-postgres:5432/puresoc
```

Memory mode is only for deterministic local/test runs and must be selected explicitly:

```sh
PURESOC_PERSISTENCE_MODE=memory
```

Prisma mode is required for durable in-a-box, staging, and production installs.

4. Prepare the database:

```sh
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:status
```

For a real deployment pipeline, apply checked-in migrations after backup and before starting app services. The repository-owned backup/restore entry points and verification expectations are documented in `docs/operations-backup-restore.md`.

```sh
pnpm exec prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

The Compose catalog includes `puresoc-migrator`, which runs this deploy command before `puresoc-api` starts. Pipelines can still run the same command explicitly after backup and before rolling app services.

5. Build application images from the repository:

```sh
COMPOSE_BAKE=false docker compose build
```

6. Start the Compose catalog and rebuild application images when needed:

```sh
docker compose up --build -d
```

7. Verify health:

```sh
curl -fsS http://localhost:3000/health
docker compose exec puresoc-api node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

8. Exercise the local product path:

- open `http://localhost:3000/register`;
- create a local user;
- create/select a workspace;
- open `/onboarding/romania`;
- save Romania onboarding answers;
- classify, create the notification draft, evaluate readiness, upload evidence, generate JSON exports, and review dashboard/audit/billing state.

This path must not call Microsoft Graph, Stripe, OIDC providers, object-storage clouds, external scanner services, KMS/HSM/secret-manager APIs, public regulatory URLs, DNSC, or any national authority unless a later explicitly configured integration path is used. The bundled Compose ClamAV scanner is local to the deployment network.

## Deployment Guardrails

For a Compose deployment behind Traefik where only `puresoc-web` is public, set at least:

```sh
PURESOC_APP_ENV=production
PURESOC_PERSISTENCE_MODE=prisma
PURESOC_AUTH_COOKIE_SECURE=true
PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION=true
PURESOC_PUBLIC_BASE_URL=https://app.example.com
PURESOC_API_BASE_URL=http://puresoc-api:3001
```

`puresoc-web` calls `puresoc-api` on the Compose network through `PURESOC_WEB_API_BASE_URL=http://puresoc-api:3001` from the service catalog. `PURESOC_WEB_PUBLIC_BASE_URL` is only an optional web override when the proxy does not send usable forwarded host/proto headers. Use `PURESOC_API_TRUSTED_ORIGINS` only if DevOps deliberately exposes the API to browser traffic.

If the deployment is Romania/local readiness only, leave optional integration credentials unset:

```sh
PURESOC_BILLING_PROVIDER=none
```

With Microsoft Entra sign-in enabled, Prisma startup requires the Entra app client ID, client secret, web callback URI, and `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` in production. Local/internal account deployments keep `PURESOC_AUTH_MICROSOFT_ENTRA_ENABLED=false`; then startup does not require OIDC secrets. Configuring Microsoft 365 connector, Google/GitHub login, Stripe, S3, or Redis-backed services re-enables their own fail-fast startup checks.

If a reverse proxy supplies forwarded client IPs, trust them only from explicit proxy IPs:

```sh
PURESOC_API_TRUST_FORWARDED_HEADERS=true
PURESOC_API_TRUSTED_PROXY_IPS=127.0.0.1,::1
PURESOC_API_TRUSTED_PROXY_HOPS=1
```

For multi-process API deployments, prefer Redis-backed rate limits:

```sh
PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis
PURESOC_API_RATE_LIMIT_REDIS_URL=redis://...
PURESOC_API_RATE_LIMIT_REQUIRE_SHARED_STORE=true
```

For production upload handling, do not leave scanning as noop unless there is a deliberate, documented override:

```sh
PURESOC_UPLOAD_SCANNER_MODE=http
PURESOC_UPLOAD_SCANNER_ENDPOINT=http://puresoc-upload-scanner:3310/scan
PURESOC_UPLOAD_SCANNER_ENGINE=clamav
```

For jobs, use Redis-backed queues when durable multi-service execution is required:

```sh
PURESOC_JOB_QUEUE_PROVIDER=bullmq
PURESOC_REDIS_URL=redis://...
```

Despite the `bullmq` config value, the current implementation uses the repository's Redis-backed job adapter boundary rather than the BullMQ npm package.

## External Services

### PostgreSQL

Required for durable deployments.

Variables:

```sh
PURESOC_POSTGRES_DB=puresoc
PURESOC_POSTGRES_USER=puresoc_admin
PURESOC_POSTGRES_PASSWORD=...
DATABASE_URL=postgresql://puresoc_admin:...@puresoc-postgres:5432/puresoc
```

Operator responsibilities:

- backups and restore drills using the selected production storage target;
- migration deployment;
- encryption at rest where required;
- connection pooling if the hosting platform needs it;
- tenant data retention and deletion procedures.

### Redis

The Compose service is available by default at `redis://puresoc-redis:6379/0`, but jobs and rate limits stay process-local until explicitly switched to Redis-backed providers.

Variables:

```sh
PURESOC_REDIS_URL=redis://puresoc-redis:6379/0
PURESOC_JOB_QUEUE_PROVIDER=bullmq
PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis
```

Operator responsibilities:

- persistence/retention policy;
- cleanup and stale-running job thresholds;
- network isolation;
- metrics and alerting.

### Object Storage

Evidence binaries, generated reports, provider snapshots, exports, and source snapshots should live in object storage while metadata lives in PostgreSQL.

Local Compose provides MinIO and creates the configured bucket through `puresoc-object-storage-init`. SaaS/in-a-box deployments can use the bundled MinIO service or an S3-compatible service.

The Compose defaults point the app at the internal MinIO service:

Variables:

```sh
PURESOC_OBJECT_STORAGE_PROVIDER=s3
PURESOC_OBJECT_STORAGE_ENDPOINT=http://puresoc-object-storage:9000
PURESOC_OBJECT_STORAGE_REGION=us-east-1
PURESOC_OBJECT_STORAGE_BUCKET=puresoc-evidence
PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID=puresoc_minio_admin
PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY=...
PURESOC_OBJECT_STORAGE_FORCE_PATH_STYLE=true
PURESOC_MINIO_ROOT_USER=puresoc_minio_admin
PURESOC_MINIO_ROOT_PASSWORD=...
```

Do not expose storage URIs, bucket names, full object keys, or local file paths in API responses, logs, smoke output, or user-visible artifacts.

### Upload Scanner

Evidence uploads go through an upload-scanner hook before object storage. In HTTP mode, the API sends a JSON POST to the scanner endpoint with organization ID, object key, MIME type, byte size, SHA-256 hash, and `bodyBase64`. The scanner returns `clean`, `infected`, or `failed`; anything other than `clean` is rejected before storage.

Compose includes `puresoc-clamav` plus `puresoc-upload-scanner`. `puresoc-clamav` runs the official ClamAV container with `clamd` and `freshclam`; signatures live in the `puresoc-clamav-db` volume so a normal restart does not redownload the full database. `puresoc-upload-scanner` remains the app-facing HTTP adapter, validates base64/integrity metadata and request size, then streams the uploaded bytes to `clamd` with ClamAV's `INSTREAM` protocol before object storage.

Keep ClamAV internal to the Compose network. The ClamAV TCP protocol is not authenticated or encrypted, so do not publish port `3310` through a public ingress or host port. First boot can take longer while signatures download. Size hosts with enough memory for ClamAV signature loading; the official Docker guide recommends at least 3 GiB and prefers 4 GiB for the container.

Variables:

```sh
PURESOC_UPLOAD_SCANNER_MODE=http
PURESOC_UPLOAD_SCANNER_ENDPOINT=http://puresoc-upload-scanner:3310/scan
PURESOC_UPLOAD_SCANNER_ENGINE=clamav
PURESOC_UPLOAD_SCANNER_TIMEOUT_MS=10000
PURESOC_CLAMAV_IMAGE=clamav/clamav:1.4_base
PURESOC_CLAMAV_HOST=puresoc-clamav
PURESOC_CLAMAV_PORT=3310
PURESOC_CLAMAV_TIMEOUT_MS=10000
PURESOC_CLAMAV_FRESHCLAM_CHECKS=12
```

`PURESOC_CLAMAV_IMAGE` is intentionally overridable because the upstream ClamAV image is still Docker Hub-hosted. If the deployment platform cannot pull Docker Hub images, point it at an operator-managed mirror of the same image tag.

`noop` is acceptable for local development only. Production startup rejects noop scanning unless `PURESOC_UPLOAD_SCANNER_ALLOW_NOOP_IN_PRODUCTION=true` is explicitly set.

### Stripe Billing

Stripe is the first billing provider, behind the billing abstraction. Local and in-a-box workflows can keep billing disabled:

```sh
PURESOC_BILLING_PROVIDER=none
```

To enable Stripe:

```sh
PURESOC_BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASE=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_MSP=price_...
```

External setup needed:

- Stripe account;
- test-mode product and price IDs for the approved PureSOC plans;
- customer portal configuration;
- webhook endpoint and signing secret;
- event handling/reconciliation runbook;
- product-approved plan names, limits, entitlements, trials, downgrade behavior, and launch support policy.

Run Stripe test-mode only after readiness selects Stripe as the single approved disposable target:

```sh
cd code
pnpm external-smoke:readiness
pnpm external-smoke:select-target
pnpm stripe:smoke:test-mode
```

Do not use `sk_live_*` keys until product, finance, support, tax, refund, and operational policies are approved. Do not print Stripe secrets, webhook secrets, Checkout URLs, Portal URLs, or full Stripe object IDs.

### Microsoft 365 Managed Provider

Microsoft 365 is a managed provider connection, not a sign-in identity. Keep it separate from Microsoft Entra social login.

The Microsoft 365 connector routes are available by default. Configure the app credentials only when a read-only Microsoft tenant proof or customer onboarding is in scope.

For a SaaS or hosted deployment, PureSOC owns one Microsoft Entra app registration per environment, usually one for production and one for staging/test. Register it in the PureSOC-operated tenant as a multitenant app for work or school accounts, add a Web redirect URI that exactly matches the deployed connector callback, and configure Microsoft Graph application permissions for the read-only V1 bundles. Customer tenants do not create their own Azure app registration for the GUI flow; their tenant admin approves the PureSOC platform app from the workspace connector page.

For an in-a-box deployment owned by a single customer, the operator may register the connector app in that customer's tenant instead. The runtime variables are the same, but the app is not a PureSOC SaaS multitenant asset.

Do not use `PURESOC_AUTH_MICROSOFT_ENTRA_*` values for this flow. Those variables control Microsoft as a PureSOC user sign-in provider, not Microsoft 365 Graph connection.

External setup needed:

- disposable/test Microsoft Entra tenant for smoke;
- PureSOC app registration for Microsoft 365 provider consent;
- supported account type selected for the deployment model: multitenant for SaaS/customer onboarding, single tenant only for a customer-owned in-a-box app;
- Web redirect URI exactly matching the deployed `/providers/microsoft365/callback` URL derived from the public host/proxy headers;
- Microsoft Graph application permissions matching the read-only V1 bundles;
- client ID and client secret;
- each customer workspace connects its own Microsoft tenant through the provider-connection OAuth/admin-consent flow;
- admin consent for read-only permission bundles only during first onboarding;
- provider-token key material for encrypted tenant credential envelopes;
- known license/service-plan expectations for Intune, Defender XDR, and Secure Score;
- no customer production data;
- no Graph write permissions.

Environment:

```sh
PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID=<entra-application-client-id>
PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET=<entra-client-secret-value>
PURESOC_CONNECTOR_MICROSOFT365_AUTHORITY_HOST=https://login.microsoftonline.com
PURESOC_CONNECTOR_MICROSOFT365_WRITE_SCOPES_ALLOWED=false
PURESOC_PROVIDER_TOKEN_KEY_PROVIDER=local-env-key-ring
PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND=in_a_box
# Optional; defaults to live-current when PURESOC_PROVIDER_TOKEN_KEY is set.
PURESOC_PROVIDER_TOKEN_KEY_ID=live-current
PURESOC_PROVIDER_TOKEN_KEY=<strong-provider-token-key-material>
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS=
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED=false
PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED=false
PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED=false
```

`PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND=in_a_box` is the supported profile for deployments that inject `local-env-key-ring` material through an operator-controlled secret source. Use `local` only for development/disposable smoke. `saas` currently reports external custody as deferred until a real KMS/HSM/secret-manager adapter exists.

`PURESOC_MICROSOFT365_SMOKE_TENANT_ID` is not a customer onboarding variable. Set it only for an approved disposable/test smoke tenant:

```sh
PURESOC_MICROSOFT365_SMOKE_TENANT_ID=<disposable-test-tenant-id>
```

Read-only V1 bundles are documented in `docs/microsoft365-permissions.md`:

- `m365_read_baseline`;
- `m365_security_read`;
- `m365_intune_read`.

Write bundles remain disabled. Do not request write scopes for V1 onboarding.

Run Microsoft 365 smoke only after readiness selects it as the single approved disposable target:

```sh
cd code
pnpm external-smoke:readiness
pnpm external-smoke:select-target
pnpm microsoft365:smoke:read-only
```

The smoke must not print client secrets, access tokens, tenant IDs, raw tenant payloads, live user emails, endpoint URLs, or provider credential envelopes.

### Microsoft Entra, Google, And GitHub Login

Social login is separate from managed provider consent. Local email/password auth is the default. Microsoft Entra user sign-in is just "let a PureSOC user log into the PureSOC app with Microsoft"; it is not required for customer Microsoft 365 tenant onboarding.

Keep `PURESOC_AUTH_MICROSOFT_ENTRA_ENABLED=false` for deployments where PureSOC users authenticate exclusively with local/internal accounts and connect Microsoft 365 Graph from inside the app.

Shared requirements:

- provider app registration;
- callback/redirect URI for the deployed callback endpoint; Microsoft Entra browser sign-in uses the web callback, while the current Google/GitHub contract examples use API callbacks;
- client ID and secret;
- issuer/JWKS/profile endpoints as needed by the provider;
- strong `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` when any social-login provider is enabled in production Prisma mode;
- account-linking policy that does not trust email alone.

Variables:

```sh
PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY=replace-with-strong-secret

PURESOC_AUTH_MICROSOFT_ENTRA_ENABLED=true
PURESOC_AUTH_MICROSOFT_ENTRA_CLIENT_ID=...
PURESOC_AUTH_MICROSOFT_ENTRA_CLIENT_SECRET=...
PURESOC_AUTH_MICROSOFT_ENTRA_REDIRECT_URI=https://app.example.com/auth/oidc/microsoft_entra/callback

PURESOC_AUTH_GOOGLE_ENABLED=true
PURESOC_AUTH_GOOGLE_CLIENT_ID=...
PURESOC_AUTH_GOOGLE_CLIENT_SECRET=...
PURESOC_AUTH_GOOGLE_REDIRECT_URI=https://api.example.com/auth/oidc/google/callback

PURESOC_AUTH_GITHUB_ENABLED=true
PURESOC_AUTH_GITHUB_CLIENT_ID=...
PURESOC_AUTH_GITHUB_CLIENT_SECRET=...
PURESOC_AUTH_GITHUB_REDIRECT_URI=https://api.example.com/auth/oidc/github/callback
```

Run OIDC smoke only after selecting exactly one provider and one disposable/test target:

```sh
cd code
PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER=github pnpm oidc:smoke:callback
```

Do not print OAuth codes, access tokens, ID tokens, refresh tokens, PKCE verifiers, session cookies, provider secrets, or full user emails.

### Provider Token Custody

Provider-token custody protects stored Microsoft 365 provider credentials. It is not required for the minimal local/Romania installer while Microsoft 365 connector credentials are unset.

The implemented real custody provider is currently `local-env-key-ring`.

```sh
PURESOC_PROVIDER_TOKEN_KEY_PROVIDER=local-env-key-ring
PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND=in_a_box
PURESOC_PROVIDER_TOKEN_KEY_ID=current
PURESOC_PROVIDER_TOKEN_KEY=replace-with-strong-secret
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS=previous-a=old-secret
```

For SaaS production, a real KMS/HSM/secret-manager adapter is still deferred. Do not claim KMS custody from `local-env-key-ring` or the deterministic `fake-secret-manager-test` fixture.

When previous keys are configured, also require operator confirmation of the previous-key window, backfill plan, and key-retirement plan:

```sh
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED=true
PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED=true
PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED=true
```

### Regulatory Sources

Checked-in regulatory data is used by default. The regulatory source monitor is disabled unless explicitly configured:

```sh
PURESOC_REGULATORY_SOURCE_MONITOR_ENABLED=false
```

If enabled later, the scheduler needs network access to configured official sources and must create review tasks without automatically activating legal logic.

### DNSC And National Authorities

There is no direct DNSC submission path and no national-authority submission integration in V1. Romania notification drafts are source-linked internal artifacts with `submittedToDnsc=false` until a separately approved authority workflow exists.

## External Smoke Readiness

Default external readiness is metadata-only and dry-run:

```sh
cd code
pnpm external-smoke:readiness
pnpm external-smoke:select-target
```

Live-candidate execution requires exactly one approved local/test/ci/disposable target and the global guardrails:

```sh
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
```

Then enable only one provider-specific opt-in, for example:

```sh
PURESOC_EXTERNAL_SMOKE_STRIPE=true
```

or:

```sh
PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true
```

Do not run live external smokes against production, staging, customer, or long-lived shared data.

## Pre-Launch Checklist

- `pnpm lint` passes.
- `pnpm test` passes.
- `pnpm test:e2e -- --grep "@ui-smoke"` passes.
- `docker compose config` passes.
- The deployment platform supports Compose `build:` and `pull_policy: build`, has the repository build context, and can pull public base images. If it tries to pull `puresoc-*:local`, it is not using the build-capable catalog correctly.
- Prisma migrations have been applied to the target database.
- `GET /health` passes for API and web.
- TLS and secure cookies are enabled.
- Origin/Referer protection is strict in production.
- Trusted proxy IPs are explicit if forwarded headers are trusted.
- Object storage and scanner are configured before relying on durable production evidence uploads.
- ClamAV/FreshClam has enough memory, persistent signature storage, and no public `clamd` TCP exposure.
- Provider token key material is non-default and injected through a deployment secret channel when Microsoft 365 connector credentials are configured.
- Billing is either explicitly `none` for local/in-a-box or Stripe is configured with approved test/production mappings.
- Microsoft 365 provider onboarding requests read-only permissions only.
- No provider write execution is enabled.
- Reports retain the PureSOC legal caveat.
- Romania legal logic remains review-required unless GAP-006/GAP-042 approvals are complete.
- Backups, restores, log retention, monitoring, incident response, and secret rotation have an operator-owned runbook. Repository backup/restore script entry points exist, but a production restore drill still has to be executed against an approved target.

## Known Deployment Gaps

These are known limitations, not deployment steps to paper over:

- no automated backup/restore service or completed restore drill in the current Compose catalog;
- no approved live Stripe smoke yet;
- no approved live Microsoft 365 tenant smoke yet;
- no approved live OIDC provider callback smoke yet;
- no production KMS/HSM/secret-manager provider-token custody adapter;
- no WORM or external audit notarization;
- no direct authority submission;
- no Microsoft Graph write/remediation execution;
- no product/legal-approved Romania legal activation or Romanian regulatory copy;
- readiness score calibration remains product/legal-owned.

See `docs/implementation-gaps.md`, `docs/codex_status.md`, `docs/PLAN_M72.md`, `docs/PLAN_M75.md`, `docs/PLAN_M76.md`, and `docs/PLAN_M77.md` for the active blockers and handoff details.

## Reference Docs

Local PureSOC docs:

- `code/README.md`
- `code/.env.example`
- `docs/microsoft365-permissions.md`
- `docs/adr/ADR-002-docker-image-and-compose-service-catalog.md`
- `docs/adr/ADR-008-evidence-storage-metadata-and-export-model.md`
- `docs/adr/ADR-013-auth-oidc-social-login-and-managed-provider-consent-boundaries.md`
- `docs/adr/ADR-017-runtime-stack-deviations.md`

External vendor docs:

- Stripe API keys: https://docs.stripe.com/keys
- Stripe webhooks: https://docs.stripe.com/webhooks
- Stripe Checkout: https://docs.stripe.com/checkout/quickstart
- Stripe customer portal: https://docs.stripe.com/no-code/customer-portal
- Microsoft identity platform OAuth/OIDC: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols
- Microsoft identity platform authorization-code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- GitHub OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Amazon S3 user guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
- MinIO container docs: https://min.io/docs/minio/container/index.html
- ClamAV Docker images: https://docs.clamav.net/manual/Installing/Docker.html
- ClamAV scanning and `clamd`: https://docs.clamav.net/manual/Usage/Scanning.html
