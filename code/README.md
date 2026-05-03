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

Memory mode mirrors Prisma mode's per-context repository shape. API services expose separate in-memory adapters under `services.memoryRepositories` for identity/session/organization/RBAC, evidence metadata/access logs, and billing records/events/entitlements. The old shared `services.repository` test harness has been removed so changes in one bounded context do not implicitly own another.

`PURESOC_PERSISTENCE_MODE=prisma` selects the existing Prisma adapters for audit logs, identity/session/organization/RBAC data, OIDC transient authorization state, provider connections and read-only telemetry, compliance results, stored analysis/report/dashboard output records, evidence metadata/access logs, billing, regulatory sources, remediation action metadata, and notification drafts through one shared Prisma client boundary.

Startup validation fails fast for production-sensitive combinations such as insecure session cookies in production, Stripe billing without secrets, S3 storage without required connection settings, HTTP scanners without endpoints, production noop upload scanning, and the default provider-token encryption key.

## Audit Hash-Chain Persistence

Audit records are tamper-evident database rows, not WORM storage, external notarization, legal certification, or protection from a database administrator rewriting all rows.

In memory mode, audit writes are serialized only inside the current Node.js process so local tests and contract runs produce deterministic chains. Memory mode is not a multi-process persistence model.

In Prisma mode, audit append uses a transaction-scoped PostgreSQL advisory lock per audit scope (`global` or one organization) before reading the latest anchor and inserting the next row. New rows also store `scopeKey` and `chainSequence`; the unique `(scopeKey, chainSequence)` index gives each scope a deterministic chain order for latest-anchor reads and audit exports even when timestamps tie. Different organization scopes use different advisory-lock keys and sequence independently.

Audit export and checkpoint APIs continue to expose database-only, non-WORM, non-notarized guarantees. Immutable export storage, external signing/notarization, retention operations, legal hold/deletion procedures, and operational verification/alerting remain operator-owned release hardening work.

## Served Web Runtime

The current web runtime is the lightweight `node:http` server documented in ADR-017, not a Next.js runtime yet. It is API-backed:

```sh
PURESOC_WEB_API_BASE_URL=http://127.0.0.1:3001 pnpm start:web
```

If `PURESOC_WEB_API_BASE_URL` is unset, the web server falls back to `PURESOC_API_BASE_URL`, `API_BASE_URL`, and then `http://127.0.0.1:3001`. `PURESOC_WEB_PUBLIC_BASE_URL` can be set when the web server needs a stable Origin value for proxied browser state-changing API calls.

Implemented web paths:

- `GET /login`: renders the local email/password sign-in form.
- `POST /auth/login`: forwards form credentials to API `/auth/login`, preserves the API-issued `puresoc_session` cookie, and redirects to `/`.
- `POST /auth/logout`: forwards to API `/auth/logout`, preserves the cleared cookie, and redirects to `/login`.
- `GET /auth/session`: proxies API `/auth/session` for same-origin browser checks.
- `GET /workspaces`: lists the authenticated user's active organization memberships from API `/organizations` and renders a visible workspace selector.
- `POST /workspaces/select`: forwards the selected organization to API `/auth/session/active-organization`; the API only accepts active memberships for the current user.
- `GET /`: resolves the API session and active organization, renders the workspace selector when no organization is active, and otherwise renders the operational console from `GET /organizations/:orgId/dashboards/snapshots/latest`.
- `GET /onboarding/romania`: renders a compact Romania NIS2 onboarding/readiness route from the checked-in Romania country-pack onboarding schema, classification helper, notification draft metadata, source-map links, and message-catalog fallback metadata. The route is an internal readiness view only; it prepares no DNSC submission, makes no live external calls, and does not claim legal certification.

The local UI smoke seeds a synthetic in-memory API user, two organizations, compliance evaluations, and dashboard snapshots before logging in through the web server without an active workspace:

```sh
pnpm test:e2e -- --grep @ui-smoke
```

This smoke fetches the workspace selector, posts a selection through the web/API session contract, proves the selected organization controls the dashboard snapshot, and writes deterministic workspace desktop/mobile HTML snapshots. It also fetches `GET /onboarding/romania?locale=ro-RO`, checks the route-specific source-map, legal caveat, fallback, unsupported-state, no-DNSC-submission, responsive, and focus metadata, and writes deterministic Romania desktop/mobile HTML snapshots beside the dashboard snapshots.

When host Firefox WebDriver BiDi is available, the browser smoke also selects the visible workspace after login and proves keyboard and pointer route traversal after the selected dashboard is established:

```sh
pnpm test:e2e -- --grep @browser-smoke
```

It clicks the visible workspace control, asserts the browser session and dashboard reflect the selected organization snapshot, tabs to the dashboard skip link, activates the visible Romania onboarding navigation link, tabs to the Romania route skip link, and activates the Romania "Back to dashboard" link. It then clicks the visible dashboard-to-Romania and Romania back-to-dashboard links with browser pointer actions after checking target bounds. The command records URL changes, focus targets, pointer target bounds, route markers, no horizontal overflow, no certification claims, no direct DNSC submit command, and the same no-live-call posture as the HTTP fallback.

This smoke stays local and does not call Microsoft Graph, Stripe, OIDC providers, object storage, scanners, KMS/secret-manager, public regulatory URLs, or provider write executors. Full Next.js/React routing, a persistent Romania onboarding wizard, golden-image/pixel-diff review, and cross-browser Playwright screenshot parity remain future frontend-runtime work.

### Message Catalog Runtime

Supported product locales are `en` and `ro`. Shared message resolution lives in `@puresoc/shared` and returns the requested locale, normalized locale, resolved locale, fallback reason, message key, and review status.

Romanian demo-safe product labels such as dashboard, sign-in, evidence/report, and approval headings resolve from the shared catalog. Romanian legal-caveat text is not approved in this repository, so legal caveat requests for `ro` deliberately fall back to the English source text with `missing_translation` metadata. Romania notification draft labels are owned by the Romania country pack and remain English/source-mapped until product/legal-approved Romanian regulatory copy is added.

## API Middleware Security

The API middleware keeps route-family rate limits, browser Origin/Referer checks, and request context extraction ahead of JSON body parsing. Stripe webhooks still use the raw-body path before signature verification, and webhook/OIDC/provider callbacks remain explicit Origin exemptions.

The API server still uses the focused `node:http` runtime from ADR-017, but route dispatch now goes through `apiRouteTable` entries with method, path pattern, route family metadata, and a handler. The dispatcher matches the route before body parsing only to preserve raw-body routes such as Stripe webhooks; normal POST requests still pass through the configured JSON body limit before handler execution, including unknown POST routes.

## Remediation Action Idempotency

Action-run creation accepts an optional `Idempotency-Key` header on:

```txt
POST /organizations/:orgId/actions/runs
```

Keys are scoped to the organization, normalized by trimming outer whitespace, limited to 128 ASCII characters, and may contain only letters, numbers, dot, underscore, colon, or hyphen. Retrying the same organization/key pair returns the existing action run instead of creating a duplicate. Requests without a key keep the existing create-new-run behavior.

The API does not return the raw idempotency key in action-run responses; it only exposes `idempotencyKeyPresent: true` when a stored run has one. This idempotency boundary does not queue or execute provider writes. Existing preflight, approval, pre-state snapshot, provider write-enabled, verification, evidence, and audit gates remain required before any future executable action path can proceed.

Client IPs come from the socket by default. `X-Forwarded-For` and `Forwarded` are ignored unless an operator configures an explicit trusted-proxy policy:

```sh
PURESOC_API_TRUST_FORWARDED_HEADERS=true
PURESOC_API_TRUSTED_PROXY_IPS=127.0.0.1,::1
PURESOC_API_TRUSTED_PROXY_HOPS=1
```

Do not enable forwarded-header trust for arbitrary networks. The remote socket address must match one of the configured proxy IPs before forwarded client IPs affect audit context or rate-limit keys.

API rate limiting uses an injectable fixed-window store boundary. The default provider is process-local memory:

```sh
PURESOC_API_RATE_LIMIT_STORE_PROVIDER=memory
```

Redis can be selected as a shared fixed-window store for local/test/ci/disposable deployments:

```sh
PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis
PURESOC_API_RATE_LIMIT_REDIS_URL=redis://puresoc-redis:6379/0
PURESOC_API_RATE_LIMIT_REDIS_KEY_PREFIX=puresoc:api-rate-limit
PURESOC_API_RATE_LIMIT_REDIS_COMMAND_MAX_ATTEMPTS=3
PURESOC_API_RATE_LIMIT_REDIS_COMMAND_RETRY_BACKOFF_MS=100
```

Rate-limit keys are hashed before they are written to Redis so raw IP addresses, user IDs, and organization IDs are not embedded in Redis key names. Deployments that require a shared API rate-limit store can set `PURESOC_API_RATE_LIMIT_REQUIRE_SHARED_STORE=true` so process-local memory is rejected instead of silently accepted. Do not point the API rate-limit store at production, staging, customer, or long-lived shared Redis targets during contract tests.

The near-term CSRF stance is strict Origin/Referer validation for production browser state-changing routes:

```sh
PURESOC_API_ORIGIN_PROTECTION_ENABLED=true
PURESOC_API_REQUIRE_ORIGIN_OR_REFERER=true
```

Development keeps the historical optional-missing-header behavior unless configured otherwise, while still rejecting untrusted Origin/Referer values when present. A double-submit CSRF-token contract remains deferred until a served browser runtime can carry token issuance and header submission end to end.

Provider-token encryption supports a small custody-provider shape for Microsoft 365 credentials. The default remains the local environment key ring:

```sh
PURESOC_PROVIDER_TOKEN_KEY_PROVIDER=local-env-key-ring
PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND=local
PURESOC_PROVIDER_TOKEN_KEY_ID=current
PURESOC_PROVIDER_TOKEN_KEY=replace-with-secret-material
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS=previous-a=old-secret,previous-b=older-secret
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED=false
PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED=false
PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED=false
```

New Microsoft 365 credential envelopes include the active key ID. Decryption can use the active key or configured previous keys so rotation can be staged deliberately. `local-env-key-ring` means the API process can read the configured key material from environment or secret-mounted environment injection; it is suitable for local development, tests, and in-a-box deployments that inject a strong secret through an operator-controlled Docker secret or equivalent runtime secret source. It is not KMS, HSM custody, or external signing.

M38 also adds `fake-secret-manager-test`, a deterministic test-only custody provider that models active/previous lookup, key-version metadata, missing-key failure, and rotation readiness summaries without calling a real secret manager, KMS, HSM, cloud API, Microsoft Graph, or provider write path. Non-production tests may select it with `PURESOC_PROVIDER_TOKEN_KEY_PROVIDER=fake-secret-manager-test`; production startup rejects it. Unsupported provider names fail validation instead of falling back.

M48 extends the bounded local custody smoke and readiness metadata:

```sh
pnpm provider-token:smoke
```

The smoke refuses production targets, uses only synthetic local key material and synthetic credential payloads, and proves active-key encrypt/decrypt, previous-key decrypt, fake secret-manager active/previous lookup, fake missing-key failure, key-version metadata, target-specific custody readiness metadata, rotation-runbook metadata, bad-key failure, unsupported-provider rejection, and production rejection of checked-in/test-only provider-token custody settings. Smoke output contains only key IDs, key-version IDs, deployment target kinds, blocker codes, runbook stage names, check names, and non-live guarantees; it must not include plaintext provider tokens, OAuth codes, client secrets, key material, or decrypted credential payloads.

Provider-token custody readiness distinguishes three target profiles:

- `local`: supported with `local-env-key-ring` for development and disposable CI smoke.
- `in_a_box`: supported only when operators inject strong `local-env-key-ring` material through Docker secrets or an equivalent runtime secret channel.
- `saas`: currently blocked with `provider_token_saas_external_custody_deferred` until a real KMS/HSM/secret-manager adapter and approved deployed custody smoke exist.

When `PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS` is configured, readiness reports blockers until the operator explicitly confirms the temporary previous-key window, ciphertext backfill plan, and key-retirement plan:

```sh
PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED=true
PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED=true
PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED=true
```

Those confirmation flags document operator readiness only. They do not execute ciphertext backfill, retire keys, call a live secret manager, or prove deployed KMS/HSM custody.

Rotation runbook metadata is generated by code as a contract artifact only. It now separates smoke verification, previous-key staging, ciphertext backfill planning, rollback expectations, key-retirement expectations, and deferred live KMS/HSM/secret-manager custody. It does not execute ciphertext backfill, retire keys, call a live secret manager, or prove deployed production custody.

For Docker Compose or in-a-box deployments, prefer injecting `PURESOC_PROVIDER_TOKEN_KEY` and any staged `PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS` through a secret manager or Docker-secret-to-env bridge owned by the deployment layer. Keep one previous key configured only while old ciphertext still needs to decrypt, then remove it after a verified re-encryption/backfill window. Production startup rejects the checked-in local-dev key, test-only fake custody provider, unsupported provider names, and duplicate/reused key material, but live SaaS KMS/secret-manager custody, deployed rotation smoke, ciphertext backfill/re-encryption, key retirement, access logging, incident response, and operator rollback execution remain release hardening work.

## External Smoke Readiness

M42 adds a metadata-only readiness matrix for future live external smokes:

```sh
pnpm external-smoke:readiness
```

The command does not call Microsoft Graph, Stripe, OIDC providers, object storage, scanners, KMS/secret-manager backends, external signing services, public regulatory URLs, or provider write executors. Output is deterministic JSON containing statuses, blocker codes, required environment variable names, guardrails, and non-secret metadata only. It does not print provider tokens, OAuth codes, client secrets, webhook secrets, object-storage credentials, session cookies, key material, internal storage URIs, or scanner/object-storage endpoints.

Default mode is dry-run:

```sh
PURESOC_EXTERNAL_SMOKE_MODE=dry_run pnpm external-smoke:readiness
```

Before any future live smoke runner is allowed to proceed, operators must select exactly one approved disposable/test path, keep provider writes disabled, and set the live-candidate guardrails:

```sh
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
```

Per-provider opt-ins are separate:

```sh
PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true
PURESOC_EXTERNAL_SMOKE_STRIPE=true
PURESOC_EXTERNAL_SMOKE_OIDC_MICROSOFT_ENTRA=true
PURESOC_EXTERNAL_SMOKE_OIDC_GOOGLE=true
PURESOC_EXTERNAL_SMOKE_OIDC_GITHUB=true
PURESOC_EXTERNAL_SMOKE_STORAGE=true
PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS=true
PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT=true
```

The matrix reports these paths independently:

- Microsoft 365 read-only tenant smoke prerequisites: client ID, client secret, test tenant ID, read-only permission bundles, module metadata, and disabled write bundles.
- Provider-token custody deployment readiness: local/in-a-box/SaaS target kind, supported local key-ring custody, previous-key window confirmations, and deferred KMS/HSM/secret-manager blockers.
- Stripe test-mode prerequisites: test secret key, webhook secret, non-placeholder price IDs, checkout/portal URLs, and live-key rejection.
- Microsoft Entra, Google, and GitHub social-login callback prerequisites: provider enablement, client ID/secret, redirect URI, PKCE/nonce posture, and transient-state production safety.
- Object-storage/scanner prerequisites: S3/MinIO metadata, bucket/access configuration, HTTP scanner metadata, and no-op scanner warnings.
- Evidence/report runtime prerequisites: legal-caveat enforcement, generated-report evidence storage, export format, upload limits, and storage-pointer redaction.
- Auth deployment smoke prerequisites: local/test/disposable API base URL, trusted browser Origin, secure-cookie posture, Origin/callback exemptions, rate-limit posture, and endpoint-class guardrails.

M49 adds a selector over that readiness matrix:

```sh
pnpm external-smoke:select-target
```

The selector is also embedded as `targetSelection` in `pnpm external-smoke:readiness`. It ranks the available smoke paths, explains ready/blocked/unsafe/not-configured states with stable reason codes, and selects exactly one path only when the underlying readiness check is `ready_for_disposable_smoke`. It is metadata-only and does not call Microsoft Graph, Stripe, OIDC providers, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager APIs, external signing services, public regulatory URLs, deployments, or provider write executors. If no path is selected, keep every live smoke command in dry-run mode and configure exactly one approved local/test/ci/disposable target before retrying.

### Auth Deployment Smoke

M47 adds a deployed-auth guardrail smoke harness:

```sh
pnpm auth:smoke:deployment
```

The default command is a dry-run. It first evaluates the M42 readiness matrix for `auth_deployment_browser`, then prints planned registration, login, session, logout, cookie-attribute, trusted-Origin, untrusted-Origin, callback-exemption, forwarded-header, health, and RBAC/organization-scope checks without contacting any deployment. Output includes endpoint classes and configured/missing environment variable names only; it does not print endpoint URLs, passwords, session tokens, session cookies, authorization headers, provider endpoint URLs, live user emails, provider tokens, or secrets.

Live/disposable execution is refused unless `auth_deployment_browser` is `ready_for_disposable_smoke` in `pnpm external-smoke:readiness` and all of these are true:

```sh
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=local|development|test|ci|disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT=true
PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL=http://127.0.0.1:3001
PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN=http://127.0.0.1:3000
```

Live targets must be local/test/ci/disposable. Non-TLS targets are accepted only for local loopback; non-local TLS targets require secure-cookie config. The harness rejects production, staging, customer, public unknown, and non-TLS non-local endpoint classes, and it does not call OIDC/OAuth providers, Microsoft Graph, Stripe, object storage, scanners, browser/PDF services, KMS/secret-manager/cloud APIs, public regulatory URLs, or provider write executors.

### OIDC/Social Callback Smoke

M46 adds an OIDC/social-login callback smoke harness:

```sh
pnpm oidc:smoke:callback
```

The default command is a dry-run. It first evaluates the M42 readiness matrix, then prints planned authorization, callback, token/JWKS/profile/email lookup, explicit account-link approval, session cookie, audit, and callback-Origin-exemption operations without contacting Microsoft, Google, GitHub, or any other external provider. Output includes selected-provider metadata, configured/missing environment variable names, endpoint classes, guardrail statuses, and non-secret booleans only. It does not print client secrets, authorization codes, ID/access/refresh tokens, raw `state` or `nonce` values, PKCE code verifiers, session cookies, live provider profile payloads, user emails, provider endpoint URLs, Stripe secrets, object-storage credentials, provider tokens, or key material.

Select a provider for live-candidate readiness checks with:

```sh
PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER=microsoft_entra|google|github
```

Live-candidate execution is refused unless the selected readiness path is `ready_for_disposable_smoke` in `pnpm external-smoke:readiness` and all of these are true:

```sh
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=local|development|test|ci|disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER=google
PURESOC_EXTERNAL_SMOKE_OIDC_GOOGLE=true
PURESOC_AUTH_GOOGLE_ENABLED=true
PURESOC_AUTH_GOOGLE_CLIENT_ID=...
PURESOC_AUTH_GOOGLE_CLIENT_SECRET=...
PURESOC_AUTH_GOOGLE_REDIRECT_URI=...
```

Use the matching provider opt-in for Microsoft Entra or GitHub. The checked-in CLI still does not perform a real Microsoft/Google/GitHub interactive callback because doing so safely requires an approved disposable provider app plus an operator-owned browser/code-capture flow that does not expose raw `state`, `nonce`, PKCE verifier, code, tokens, or cookies. Contract tests exercise the local callback/session path through an injected disposable provider harness and explicitly report `realProviderAppExercised=false`.

### Microsoft 365 Read-Only Smoke

M45 adds a Microsoft 365 read-only disposable tenant smoke harness:

```sh
pnpm microsoft365:smoke:read-only
```

The default command is a dry-run. It first evaluates the M42 readiness matrix, then prints planned app-only token, encrypted credential envelope, provider-neutral storage, and read-only Graph module operations without calling Microsoft Graph or Microsoft identity endpoints. Output includes configured/missing environment variable names, read-only permission bundle metadata, module metadata, disabled write bundle metadata, and guardrail statuses; it does not print client secrets, provider tokens, refresh tokens, OAuth codes, tenant IDs, raw tenant payloads, user emails from live tenants, endpoint URLs, session cookies, Stripe secrets, object-storage credentials, or key material.

Live/disposable execution is refused unless `microsoft365_read_only_tenant` is `ready_for_disposable_smoke` in `pnpm external-smoke:readiness` and all of these are true:

```sh
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=local|development|test|ci|disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true
MICROSOFT365_CLIENT_ID=...
MICROSOFT365_CLIENT_SECRET=...
MICROSOFT365_TENANT_ID=...
```

`PURESOC_MICROSOFT365_SMOKE_TENANT_ID` or `M365_TENANT_ID` can be used instead of `MICROSOFT365_TENANT_ID`; `M365_CLIENT_ID` and `M365_CLIENT_SECRET` are also accepted. The live path only uses the official Microsoft public-cloud identity and Graph endpoints for this smoke; sovereign-cloud endpoint selection remains deferred. When explicitly enabled, it acquires an app-only token, stores it only inside a local encrypted provider credential envelope, seeds a provider-neutral in-memory connection, and runs the implemented read-only modules through the connector pipeline. Missing permissions, unavailable licenses, national-cloud unsupported modules, revoked consent, throttling, and connector errors remain module statuses rather than provider writes or remediation actions.

### Stripe Test-Mode Smoke

M43 adds a Stripe-specific disposable smoke harness:

```sh
pnpm stripe:smoke:test-mode
```

The default command is a dry-run. It first evaluates the M42 readiness matrix, then prints the planned Stripe test-mode operations and configured/missing environment variable names without calling Stripe. It does not print Stripe secret keys, webhook secrets, Checkout URLs, Portal URLs, full customer IDs, full session IDs, cookies, provider tokens, or storage pointers.

Live/test execution is refused unless all of these are true:

```sh
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_STRIPE=true
PURESOC_BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASE=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_MSP=price_...
```

The live path rejects `sk_live_*`, production/customer/staging targets, placeholder price IDs, non-Stripe billing mode, and non-default Stripe API base URLs. When explicitly enabled, it creates a synthetic Stripe test-mode customer, Checkout Session, Customer Portal Session, and verifies a synthetic webhook signature locally. Absence of a disposable Stripe test account remains a blocker, not a successful live smoke.

### Evidence Runtime Smoke

M44 adds an object-storage/scanner/evidence/report runtime smoke harness:

```sh
pnpm evidence:smoke:runtime
```

The default command is a dry-run. It first evaluates the M42 readiness matrix, then prints planned object-storage write/read, upload-scanner, generated-report evidence, report-renderer, CSV metadata, and binary evidence-package metadata operations without calling object storage, scanners, report-renderer/browser services, or external providers. Output includes configured and missing environment variable names, endpoint classes, scanner mode, upload/report limits, and guardrail statuses; it does not print object-storage credentials, scanner or renderer endpoint URLs, storage URIs, public object URLs, full object keys, uploaded file contents, rendered report bodies, session cookies, provider tokens, OAuth codes, Stripe secrets, or KMS/secret-manager values.

Live/disposable execution is refused unless both `object_storage_scanner_runtime` and `evidence_report_runtime` are `ready_for_disposable_smoke` in `pnpm external-smoke:readiness` and all of these are true:

```sh
PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
PURESOC_EXTERNAL_SMOKE_TARGET_KIND=local|development|test|ci|disposable
PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
PURESOC_EXTERNAL_SMOKE_STORAGE=true
PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS=true
PURESOC_OBJECT_STORAGE_PROVIDER=s3
PURESOC_OBJECT_STORAGE_ENDPOINT=http://localhost:9000
PURESOC_OBJECT_STORAGE_REGION=us-east-1
PURESOC_OBJECT_STORAGE_BUCKET=puresoc-smoke
PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID=...
PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY=...
PURESOC_UPLOAD_SCANNER_MODE=http
PURESOC_UPLOAD_SCANNER_ENDPOINT=http://localhost:3310/scan
PURESOC_REPORT_RENDERER=http://localhost:3002
PURESOC_REPORT_STORE_GENERATED_AS_EVIDENCE=true
```

The live path only accepts local/test/disposable endpoint classes, renders synthetic report data through the renderer, uploads the rendered artifact as generated-report evidence through the scanner and S3-compatible storage adapter, reads it back through the evidence vault, records an access log, and reports CSV/binary bundle metadata as smoke metadata. It does not provision buckets, call production/staging/customer targets, use real customer data, or claim browser-grade PDF fidelity.

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

M41 adds an explicit audit export handoff contract to exported segments and checkpoint records. The handoff status can be:

- `database_only`: the default database checkpoint/hash-chain state; useful for later export, but not WORM or externally anchored.
- `worm_export_pending`: the export/checkpoint metadata needs an operator-owned immutable/WORM handoff before stronger auditability claims.
- `externally_anchored`: reserved for a future approved provider that records an external checkpoint reference; it still does not imply legal certification or WORM storage by itself.
- `external_anchor_failed`: the checkpoint was preserved but the anchor provider failed; retry through an operator runbook and do not claim external anchoring for that checkpoint.

The current application does not write audit exports to object storage, WORM storage, timestamping services, signing services, KMS/HSMs, or external notarization providers. Handoff metadata always reports `storagePointerReturnedToClient=false`, `publicUrlReturnedToClient=false`, `wormStorage=false`, `externalNotarization=false`, and `legalCertification=false` unless a future implementation genuinely changes those guarantees and tests it. If an external checkpoint provider fails, the failure metadata is intentionally generic and secret-free; provider error strings are not returned to browser clients.

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

`pnpm test:e2e -- --grep "@ui-smoke"` runs the M39 served-web/runtime smoke. It starts local web and API HTTP surfaces in deterministic memory mode, fetches the operational console, login, and workspace selection pages, writes desktop and mobile HTML viewport snapshots under `/tmp/puresoc-ui-smoke-*`, and checks browser-relevant local auth/session-cookie behavior:

```sh
pnpm test:e2e -- --grep "@ui-smoke"
```

The smoke proves `HttpOnly`, `SameSite=Lax`, secure-cookie config behavior, trusted-Origin acceptance, untrusted-Origin rejection, workspace selection through authenticated memberships, selected dashboard snapshot rendering, and OIDC/Microsoft provider callback Origin exemptions without calling Microsoft Graph, Stripe APIs, OIDC providers, object storage, scanners, KMS/secret-manager backends, public regulatory URLs, or provider write executors.

`pnpm test:e2e -- --grep "@browser-smoke"` runs the M40 browser-grade local smoke when a compatible browser is available. The harness uses host Firefox WebDriver BiDi when present, starts local web/API surfaces plus a same-origin local auth proxy in memory mode, captures deterministic PNG screenshots under `/tmp/puresoc-browser-smoke-*`, and verifies browser DOM/layout invariants:

```sh
pnpm test:e2e -- --grep "@browser-smoke"
```

The browser smoke captures dashboard desktop/mobile, login mobile, evidence desktop, approval desktop, and Romania onboarding desktop/mobile screenshots. It asserts viewport dimensions, nonblank PNG pixels, readable text, no obvious grouped-control overlap, no document horizontal overflow, legal caveat presence, and no certification claims. M65 also writes `visual-metrics-manifest.json` under `/tmp/puresoc-browser-smoke-*` when Firefox captures images. The manifest records each capture's route id, viewport size, PNG size, color diversity, non-light pixel ratio, edge ratio, luminance spread, dominant-color ratio, and threshold result so blank images, wrong dimensions, missing route state, and severe visual collapse fail without committed golden PNGs or pixel-perfect comparisons. The M64 path logs in without an active organization, clicks a visible workspace selection control, and asserts `/auth/session` plus the dashboard snapshot reflect the selected organization. For the Romania route it also checks the route marker, Romanian locale, source-map sample, workbook cell references, legal-caveat fallback metadata, unsupported-state messaging, no-DNSC-submission metadata, skip-link/focus target, and absence of a direct DNSC submit command. The M62 path uses keyboard input to tab to dashboard and Romania skip links, activate the visible Romania onboarding navigation link, and activate the route's "Back to dashboard" link while recording URL changes and focus targets. The M63 path uses pointer actions against visible link centers and records target bounds before asserting the same dashboard-to-Romania and back-to-dashboard route changes. It also verifies a real browser cookie jar can register, log in, authenticate `/auth/session`, hide the `HttpOnly` session token from `document.cookie`, inspect `SameSite=lax`/`HttpOnly`/local `secure=false` attributes through WebDriver storage, and remove the session on logout. Untrusted-Origin rejection and callback exemptions remain covered through the deterministic local HTTP fallback because the API intentionally does not expose permissive browser CORS.

If Firefox/WebDriver BiDi is unavailable, the command reports a `blocked` status and does not claim PNG, visual-threshold, browser-auth, Romania route browser PNG, keyboard traversal, pointer traversal, or browser workspace-selection coverage; keep the M39/M60/M64 `@ui-smoke` fallback passing in that environment. Deployed TLS/CORS/reverse-proxy browser smoke, cross-browser Playwright parity, golden-image/pixel-diff review, and live OIDC callback cookies remain release-hardening work.
