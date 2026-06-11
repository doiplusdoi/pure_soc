# PureSOC Deployment Guide

Status: deployment guide for the current repository state as of 2026-06-09.
Scope: local development, in-a-box deployments, and SaaS-like deployment preparation.

PureSOC is Docker-first, TypeScript-first, provider-neutral, and Romania-first for V1. The current runtime is intentionally lighter than the original target stack: `apps/api` and `apps/web` use `node:http`, jobs use the local `@puresoc/jobs` adapter, and the browser smoke path uses deterministic HTTP snapshots plus host Firefox WebDriver BiDi when available. Do not describe the current implementation as NestJS, Next.js, BullMQ-package, or Playwright-backed unless those migrations are actually implemented.

PureSOC must not be deployed or marketed as legal certification. Reports and workflows are for `PureSOC internal readiness`, evidence support, and preliminary classification only.

## Deployment Profiles

| Profile | Purpose | Default posture |
|---|---|---|
| Local development | Fast contract work and UI smoke validation | `PURESOC_PERSISTENCE_MODE=memory`, `PURESOC_BILLING_PROVIDER=none`, no live external calls |
| In-a-box | Customer-controlled install with local services | `PURESOC_PERSISTENCE_MODE=prisma`, local or managed PostgreSQL/Redis/object storage, local auth, external integrations only when explicitly configured |
| SaaS/staging/production | Hosted multi-tenant service | Managed PostgreSQL, Redis, object storage, TLS ingress, secrets manager or equivalent, scanner, backups, monitoring, and approved external-service smokes |

Provider writes and remediation execution remain disabled. Microsoft 365 is read-only until a separate approval-gated write path exists with audit logging, preflight, snapshots, verification, and evidence.

## Minimal Installer Secret Surface

The first-run environment is intentionally small. `code/.env.example` keeps Microsoft 365, social login, Stripe, and S3 disabled, so another infrastructure installer does not need to ask for their client secrets or access keys during the Romania/local readiness bootstrap.

For a minimal local or in-a-box path, start with:

```sh
PURESOC_PERSISTENCE_MODE=memory
PURESOC_MICROSOFT365_PROVIDER_ENABLED=false
PURESOC_BILLING_PROVIDER=none
PURESOC_OBJECT_STORAGE_PROVIDER=memory
PURESOC_JOB_QUEUE_PROVIDER=memory
PURESOC_API_RATE_LIMIT_STORE_PROVIDER=memory
```

For durable Prisma mode, the only required first-boot secret-like value is the PostgreSQL `DATABASE_URL`. Add optional secrets only when enabling the matching feature:

| Feature | Enable when needed | Secrets introduced |
|---|---|---|
| Microsoft 365 managed provider | `PURESOC_MICROSOFT365_PROVIDER_ENABLED=true` | `MICROSOFT365_CLIENT_SECRET`, `PURESOC_PROVIDER_TOKEN_KEY` |
| Microsoft/Google/GitHub social login | `PURESOC_AUTH_*_ENABLED=true` | provider client secret, `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` in production Prisma mode |
| Stripe billing | `PURESOC_BILLING_PROVIDER=stripe` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| S3/MinIO object storage | `PURESOC_OBJECT_STORAGE_PROVIDER=s3` | object-storage access key and secret key |
| Redis-backed jobs/rate limits | `PURESOC_JOB_QUEUE_PROVIDER=bullmq` or `PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis` | Redis URL if the Redis service requires credentials |

This smaller installer surface is not a claim that production operations are solved. Durable evidence storage, upload scanning, backups, monitoring, and external proof smokes still need operator-owned configuration before launch.

## Service Topology

The main service catalog is `code/infra/compose/docker-compose.yml`. It is runtime-only and uses local image tags without `build:` entries, so ordinary Compose starts do not invoke Docker Buildx/Bake. Local image build metadata lives in the opt-in `code/infra/compose/docker-compose.build.yml` override.

| Service | Purpose | Notes |
|---|---|---|
| `puresoc-web` | Served web UI | Current `node:http` renderer, port `3000` |
| `puresoc-api` | API, auth, orgs, compliance, billing, evidence, provider routes | Current `node:http` API, port `3001` |
| `puresoc-worker` | Async job runtime | Uses configured job queue provider |
| `puresoc-scheduler` | Periodic scheduled jobs | Regulatory source monitor is disabled by default |
| `puresoc-connector-runner` | Provider sync jobs | Read-only; `PURESOC_CONNECTOR_RUNNER_ALLOW_PROVIDER_WRITES=true` is rejected |
| `puresoc-regulatory-importer` | One-shot regulatory import task | Compose profile `regulatory` |
| `puresoc-report-renderer` | Report rendering service | Current deterministic renderer, port `3002` |
| `puresoc-postgres` | PostgreSQL | Local Compose uses Postgres 16 |
| `puresoc-redis` | Redis | Jobs and optional shared API rate limits |
| `puresoc-object-storage` | MinIO/S3-compatible object storage | Local evidence/report binary storage path |

Optional production services such as TLS reverse proxy, auth broker, mailer, upload scanner, monitoring, backups, WORM/archive storage, and external secret custody are deployment-layer responsibilities today.

## Baseline Deployment Process

Run repository tooling from `code/`.

1. Install and validate the workspace:

```sh
cd code
pnpm install
pnpm lint
pnpm test
pnpm test:e2e -- --grep "@ui-smoke"
docker compose -f infra/compose/docker-compose.yml config
```

2. Create a deployment environment file:

```sh
cd code
cp .env.example .env
```

The template omits optional integration secrets by default. Do not add Microsoft, social-login, Stripe, S3, or Redis credentials unless that feature is intentionally enabled.

3. Choose persistence:

```sh
PURESOC_PERSISTENCE_MODE=memory
```

Memory mode is only for deterministic local/test runs.

```sh
PURESOC_PERSISTENCE_MODE=prisma
DATABASE_URL=postgresql://...
```

Prisma mode is required for durable in-a-box, staging, and production installs.

4. Prepare the database:

```sh
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:status
```

For a real deployment pipeline, apply checked-in migrations after backup and before starting app services:

```sh
pnpm exec prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

The current Compose catalog does not include a dedicated migrator container, so migration execution is operator/pipeline owned.

5. Build local application images when the deployment pipeline has not already produced them:

```sh
COMPOSE_BAKE=false docker compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.build.yml \
  build
```

6. Start the Compose catalog without a build step:

```sh
docker compose -f infra/compose/docker-compose.yml up -d
```

7. Verify health:

```sh
curl -fsS http://localhost:3001/health
curl -fsS http://localhost:3000/health
```

8. Exercise the local product path:

- open `http://localhost:3000/register`;
- create a local user;
- create/select a workspace;
- open `/onboarding/romania`;
- save Romania onboarding answers;
- classify, create the notification draft, evaluate readiness, upload evidence, generate JSON exports, and review dashboard/audit/billing state.

This path must not call Microsoft Graph, Stripe, OIDC providers, object-storage clouds, scanners, KMS/HSM/secret-manager APIs, public regulatory URLs, DNSC, or any national authority unless a later explicitly configured integration path is used.

## Production Guardrails

For production-like deployment, set at least:

```sh
PURESOC_APP_ENV=production
PURESOC_PERSISTENCE_MODE=prisma
PURESOC_AUTH_COOKIE_SECURE=true
PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION=true
PURESOC_API_ORIGIN_PROTECTION_ENABLED=true
PURESOC_API_REQUIRE_ORIGIN_OR_REFERER=true
PURESOC_PUBLIC_BASE_URL=https://app.example.com
PURESOC_API_BASE_URL=https://api.example.com
PURESOC_WEB_PUBLIC_BASE_URL=https://app.example.com
PURESOC_API_TRUSTED_ORIGINS=https://app.example.com,https://api.example.com
```

If the deployment is Romania/local readiness only, keep optional integrations disabled:

```sh
PURESOC_MICROSOFT365_PROVIDER_ENABLED=false
PURESOC_BILLING_PROVIDER=none
```

With those integrations disabled and no social-login provider enabled, production startup does not require provider-token, OIDC, Stripe, or S3 secrets. Enabling those features re-enables their fail-fast startup checks.

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
PURESOC_UPLOAD_SCANNER_ENDPOINT=http://scanner:3310/scan
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
DATABASE_URL=postgresql://...
```

Operator responsibilities:

- backups and restore drills;
- migration deployment;
- encryption at rest where required;
- connection pooling if the hosting platform needs it;
- tenant data retention and deletion procedures.

### Redis

Required only when durable job queues or shared API rate limiting are enabled. The minimal installer keeps jobs and rate limits process-local.

Variables:

```sh
PURESOC_REDIS_URL=redis://...
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

Local Compose provides MinIO. SaaS/in-a-box deployments can use MinIO or an S3-compatible service.

The minimal installer leaves `PURESOC_OBJECT_STORAGE_PROVIDER=memory`, which is suitable only for local/test bootstrap and the current local Romania workflow. Set `s3` before relying on durable evidence binaries.

Variables:

```sh
PURESOC_OBJECT_STORAGE_PROVIDER=s3
PURESOC_OBJECT_STORAGE_ENDPOINT=https://...
PURESOC_OBJECT_STORAGE_REGION=eu-central-1
PURESOC_OBJECT_STORAGE_BUCKET=puresoc-evidence
PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID=...
PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY=...
PURESOC_OBJECT_STORAGE_FORCE_PATH_STYLE=true
```

Do not expose storage URIs, bucket names, full object keys, or local file paths in API responses, logs, smoke output, or user-visible artifacts.

### Upload Scanner

Production evidence upload scanning needs an HTTP scanner endpoint or equivalent adapter.

Variables:

```sh
PURESOC_UPLOAD_SCANNER_MODE=http
PURESOC_UPLOAD_SCANNER_ENDPOINT=http://scanner:3310/scan
PURESOC_UPLOAD_SCANNER_TIMEOUT_MS=10000
```

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

The minimal installer keeps this disabled:

```sh
PURESOC_MICROSOFT365_PROVIDER_ENABLED=false
```

Only enable it when a read-only Microsoft tenant proof or customer onboarding is in scope:

External setup needed:

- disposable/test Microsoft Entra tenant for smoke;
- PureSOC app registration for Microsoft 365 provider consent;
- client ID and client secret;
- each customer workspace connects its own Microsoft tenant through the provider-connection OAuth/admin-consent flow;
- admin consent for read-only permission bundles only during first onboarding;
- known license/service-plan expectations for Intune, Defender XDR, and Secure Score;
- no customer production data;
- no Graph write permissions.

Environment:

```sh
PURESOC_MICROSOFT365_PROVIDER_ENABLED=true
PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID=...
PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET=...
PURESOC_CONNECTOR_MICROSOFT365_AUTHORITY_HOST=https://login.microsoftonline.com
PURESOC_CONNECTOR_MICROSOFT365_REDIRECT_URI=https://app.example.test/providers/microsoft365/callback
PURESOC_MICROSOFT365_SMOKE_TENANT_ID=...
PURESOC_PROVIDER_TOKEN_KEY_PROVIDER=local-env-key-ring
PURESOC_PROVIDER_TOKEN_KEY_ID=...
PURESOC_PROVIDER_TOKEN_KEY=...
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

Social login is optional and separate from managed provider consent. Local email/password auth is enabled by default.

Shared requirements:

- provider app registration;
- callback/redirect URI for the deployed API;
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
PURESOC_AUTH_MICROSOFT_ENTRA_REDIRECT_URI=https://api.example.com/auth/oidc/microsoft_entra/callback

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

Provider-token custody protects stored Microsoft 365 provider credentials. It is not required for the minimal local/Romania installer while `PURESOC_MICROSOFT365_PROVIDER_ENABLED=false`.

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
- `docker compose -f infra/compose/docker-compose.yml config` passes.
- Prisma migrations have been applied to the target database.
- `GET /health` passes for API and web.
- TLS and secure cookies are enabled.
- Origin/Referer protection is strict in production.
- Trusted proxy IPs are explicit if forwarded headers are trusted.
- Object storage and scanner are configured before relying on durable production evidence uploads.
- Provider token key material is non-default and injected through a deployment secret channel when Microsoft 365 provider onboarding is enabled.
- Billing is either explicitly `none` for local/in-a-box or Stripe is configured with approved test/production mappings.
- Microsoft 365 provider onboarding is either disabled or requests read-only permissions only.
- No provider write execution is enabled.
- Reports retain the PureSOC legal caveat.
- Romania legal logic remains review-required unless GAP-006/GAP-042 approvals are complete.
- Backups, restores, log retention, monitoring, incident response, and secret rotation have an operator-owned runbook.

## Known Deployment Gaps

These are known limitations, not deployment steps to paper over:

- no dedicated migrator container in the current Compose catalog;
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
