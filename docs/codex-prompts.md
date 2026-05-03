# Codex Prompts

Use these prompts as the active PureSOC implementation tickets. This file was refreshed on 2026-05-03 after completing PLAN_M60, narrowing local served UI smoke coverage for the Romania onboarding route, and staging Prompt 60 / `docs/PLAN_M61.md`.

Completed Phase A through the contract-level Phase I output work, M11 OIDC/social-login callback work, M12 Microsoft read-only module expansion work, and M13 Article 21 catalog/scoring work has been removed from the active prompt list. Do not re-run old bootstrap, schema-contract, local-auth/OIDC, EU foundation, Romania importer/classifier, provider-core, Microsoft consent/read-only baseline, compliance-engine, catalog/scoring, or in-memory evidence/report/dashboard prompts unless a prompt below explicitly asks you to modify that surface.

## Repository Path Convention

PureSOC uses the shared AI project template layout. Application paths in implementation prompts are relative to `code/` unless they explicitly start with `docs/` or another root-level path.

Examples:

```txt
apps/api -> code/apps/api
packages/config -> code/packages/config
infra/compose/docker-compose.yml -> code/infra/compose/docker-compose.yml
data/regulatory -> code/data/regulatory
```

Run package manager, test, and Compose commands from `code/`.

## Current Implementation Baseline

The repository currently contains:

- Template-aligned `code/` monorepo, Compose catalog, config defaults, Dockerfiles, and smoke tests.
- Prisma schema and TypeScript data contracts for identity, organizations, providers, regulatory sources, compliance, evidence, reports, dashboards, and billing.
- Local auth, session, organization, RBAC, and audit foundations using in-memory repositories for API tests.
- EU NIS2 foundation, all 27 member-state country-pack statuses, and source activation skeleton.
- Romania workbook importer outputs, source maps, classification service, onboarding schema, and notification-draft contracts.
- Provider-neutral connector contracts, connector runner, mock provider scenarios, and Microsoft 365 consent/read-only baseline with documented permission bundles.
- Compliance evaluator, gap generation, recommendation generation, readiness plan, checklist generation, and representative control catalog.
- Evidence metadata, access audit, JSON report/export builders, dashboard aggregation, and API routes backed by stored in-memory analysis records.
- PLAN_M2 hardening: legal-review country-pack warnings, no-signal provider-mapped control guard, compliance/recommendation request validation, synchronous `200` evaluation response, and audit events for evaluation/recommendation generation.
- PLAN_M3 contract alignment: logical control IDs in Prisma output references, split finding/actionable severity, date-only readiness due dates, gap/recommendation/plan source identity fields, and an in-memory `ComplianceResultRepository` port.
- PLAN_M4 Prisma persistence slice: pinned Prisma 6.19.3 CLI/client workflow, generated initial migration, Prisma client factory, compliance-result snapshot table, and `PrismaComplianceResultRepository` with organization-scoped adapter tests.
- PLAN_M5 workspace import policy: cross-package imports now go through `@puresoc/*` package exports, workspace dependencies are declared, shared source/reference/recommendation/finding contracts live in `@puresoc/shared`, compliance-core no longer imports provider-core types, and `scripts/check-layout.mjs` enforces package boundaries.
- PLAN_M6 regulatory review workflow: source versions, validation reports, source maps, review tasks, review decisions, activation timestamps, supersession links, source-map traceability routes, and `regulatory_admin` authorization now prevent source-derived legal logic from silently becoming active.
- PLAN_M7 billing foundation: billing provider contracts, configurable placeholder plans/entitlements, Stripe checkout/portal adapter, raw-body webhook signature verification, idempotent billing event ledger, subscription status mapping, `BILLING_PROVIDER=none` bypass behavior, Prisma billing repository adapter, API routes, and billing audit events.
- PLAN_M8 production evidence/report adapters: S3/MinIO object-storage adapter, explicit no-op/mock/HTTP scanner adapters with production fail-closed behavior, Prisma evidence metadata/access-log repository, generated-report evidence artifacts, report/export audit events, and deterministic report-renderer JSON/PDF artifacts.
- PLAN_M9 safe remediation foundation: recommendation-to-action templates/runs, preflight/approval/snapshot/verification/evidence metadata, action audit events, action API routes, Prisma action repository metadata, and future worker job contracts without live provider writes.
- PLAN_M10 operational UI/design system: ADR-014, `@puresoc/ui` OKLCH tokens and semantic primitives, `apps/web` contract-backed operational console renderer, login focus surface, source/caveat indicators, approval affordances, and static `@ui-smoke` coverage.
- PLAN_M11 OIDC/social-login callbacks: Microsoft Entra, Google, and GitHub user sign-in callback contracts with state, nonce, PKCE, issuer/audience/expiry/signature validation, provider-subject lookup, explicit signed-in account-link approval, session creation, audit events, redaction coverage, and separation from Microsoft 365 managed-provider consent.
- PLAN_M12 Microsoft read-only module expansion: Microsoft Learn permissions were revalidated on 2026-04-30; `@puresoc/provider-microsoft365` now has fixture-backed Conditional Access, Entra directory audit log, Entra sign-in log, Defender XDR incident, and Defender XDR alert read modules, provider-neutral incident/alert resources and findings, module-level degradation for missing permissions/licenses, unsupported APIs, China-cloud Graph security limitations, throttling/revoked consent/connector errors, and updated permission documentation.
- PLAN_M13 full Article 21 catalog/scoring: EU Article 21(2)(a)-(j) controls now have source-linked evidence requirements, manual checklist mappings, provider-neutral mappings for existing Microsoft/mock MFA, IAM, and Defender XDR findings, stricter catalog seed validation, stale-evidence handling, configurable readiness-plan targets, accepted-risk partial scoring, ADR-015 provisional score calibration, and `PureSOC internal readiness` dashboard score labeling.
- PLAN_M14 security threat model and release hardening: `docs/threat-model.md` now records assets, trust boundaries, abuse paths, priorities, focus paths, and M14 fixes. Session cookies honor secure-cookie config, evidence API responses no longer expose internal storage URIs, regulatory review task actions/source-map reads are organization-scoped, and remediation snapshots must match the action run provider connection.
- PLAN_M15 prompt QA: the active prompt queue was checked against `docs/prompt-tests.md`, the latest M14 changed files/test output were reviewed, and GAP-034 was promoted into the next concrete implementation prompt.
- PLAN_M16 API request/evidence upload limits: central JSON and Stripe raw-body parsing now enforces configurable byte limits through early `Content-Length` checks plus chunk-level enforcement, oversized payloads return stable `413 payload_too_large` errors, decoded evidence uploads are capped before scanner/storage/audit side effects, HTTP upload scanners time out, and GAP-034 is resolved for the current JSON/raw-body API shape.
- PLAN_M17 regulatory source monitor runtime scheduling: configurable source-monitor enablement, timeout, stale threshold, and review-task routing are now in config; `@puresoc/regulatory-sources` has deterministic URL metadata monitoring with injectable clients, stale/unreachable/changed-metadata review task creation, duplicate open-task prevention, and no automatic legal activation; `apps/scheduler` exposes a one-shot `regulatory.monitorCountrySources` job contract. GAP-027 is resolved for the scheduler/runtime contract.
- PLAN_M18 runtime truth baseline: `PURESOC_PERSISTENCE_MODE=memory|prisma`, startup validation for production-sensitive settings, shared Prisma client selection for implemented adapters, explicit memory-backed runtime context tracking, non-stub Docker entrypoints, minimal web/report-renderer servers, and static Docker runtime-shape tests. GAP-026 is partially addressed and GAP-036 remains open for remaining runtime persistence.
- PLAN_M19 job runtime baseline: `@puresoc/jobs` now provides typed job registration, dispatch results, retry/failure metadata, idempotent in-memory queue behavior, graceful shutdown hooks, and a BullMQ-ready adapter boundary. Worker, scheduler, and connector-runner entrypoints now start runtime loops for remediation metadata validation, regulatory source monitoring, and read-only provider sync. GAP-037 is narrowed but remains open for live Redis/BullMQ durability; GAP-030 remains open because provider write execution is still disabled.
- PLAN_M20 API middleware baseline: the `node:http` API server now has shared request context and route-family classification, trusted-Origin/Referer checks for state-changing browser routes with explicit webhook/OIDC/provider callback exemptions, configurable in-memory fixed-window rate limits keyed by unauthenticated IP or authenticated user/organization, and focused tests proving middleware ordering, Stripe raw-body preservation, and evidence/body-limit compatibility. GAP-035 is narrowed and GAP-038 tracks distributed rate limiting, proxy-aware IP trust, and strict CSRF-token rollout.
- PLAN_M21 audit integrity/provider key handling: `@puresoc/audit` now emits per-organization/global hash-chain metadata with a redacted canonical payload and in-memory tamper verification helpers; Prisma audit integrity columns/migration exist for future persisted sinks; Microsoft 365 token encryption now writes key IDs, decrypts active/previous/legacy envelopes, and production startup rejects unsafe local-dev provider token keys. GAP-039 and GAP-040 track external audit signing/WORM/retention and live KMS/key-rotation smoke.
- PLAN_M22 schema/generated-data drift detection: `pnpm lint` now runs deterministic local checks that parse selected high-risk Prisma models against explicit contract field expectations, and regenerate Romania NIS2 seed/source-map artifacts in memory to diff against checked-in JSON. GAP-041 tracks intentionally excluded drift surfaces and the Romania import report artifact.
- PLAN_M23 i18n/notification model decision: ADR-016 records supported `en`/`ro` locale contracts, English legal-caveat fallback until Romanian wording is product/legal-approved, source-mapped country-pack message ownership, and the decision that future country-pack notification drafts converge on generic `NotificationDraft.payloadJson` envelopes with versioned schema keys while Romania-specific draft rows remain compatibility/workflow companions.
- PLAN_M24 generic notification draft envelope persistence: `@puresoc/country-packs-core` now validates/parses generic notification envelopes, Romania notification generation emits a generic envelope beside the compatibility JSON, the API route returns the envelope, and `@puresoc/database` has a Prisma-boundary notification draft repository for generic rows plus Romania companion links with organization-scoped tests.
- PLAN_M25 notification draft runtime persistence and backfill: `@puresoc/database` now has an in-memory notification draft repository matching the Prisma-boundary contract, API runtime persistence selection includes notification drafts in memory and Prisma modes, org-scoped NIS2 notification draft create/read/list routes persist generic envelopes and create Romania companion links for RO registration envelopes, and `@puresoc/country-pack-ro` exposes deterministic backfill status for legacy Romania payloads.
- PLAN_M26 stored output runtime persistence: `@puresoc/database` now has memory and Prisma output repositories for stored analysis records, generated report metadata, and dashboard snapshots; API compliance/report/dashboard services use the output repository boundary; Prisma mode marks `stored_analysis_reports_dashboards` as persisted; and deterministic tests cover organization-scoped output reads plus checklist-preserving stored-analysis upserts.
- PLAN_M27 identity/session/organization/RBAC runtime persistence: `@puresoc/database` now has a Prisma identity/session/organization/RBAC repository adapter; API local auth, OIDC identity lookup/linking, organization creation/member listing, and RBAC guards use the runtime-selected repository; Prisma mode marks `identity_sessions_organizations_rbac` as persisted; and deterministic tests cover provider-subject uniqueness, session revocation, org-scoped member listing, RBAC checks, and cross-organization rejection.
- PLAN_M28 audit log persistence sink: `@puresoc/database` now has a Prisma audit sink selected by API Prisma mode; audit writes persist redacted canonical payloads and hash-chain metadata in `AuditLog`; latest per-organization/global anchors are loaded before append with same-process anchor continuity; Prisma mode marks `audit_logs` as persisted; and deterministic tests cover persisted sink append/anchor behavior plus auth/org audit writes through fake-Prisma API flows.
- PLAN_M29 provider connection and telemetry persistence: `@puresoc/database` now has a `PrismaProviderResourceStore` implementing the provider-neutral `ProviderResourceStore` contract for provider connections, encrypted credential envelopes, permission bundles, capabilities, sync runs/modules, raw/normalized resources, findings, and recommendations; API Prisma mode selects it for mock/Microsoft provider flows and compliance inputs; provider telemetry is now reported as persisted.
- PLAN_M30 OIDC transient authorization-state persistence: `@puresoc/database` now has a `PrismaOidcAuthorizationStateStore` selected by API Prisma mode for social-login begin/callback flows; state and nonce remain hashed, PKCE verifiers persist only as AES-GCM envelopes, callbacks survive service recreation, replay/expiry are rejected, and runtime reporting marks `oidc_transient_state` as persisted.
- PLAN_M31 live PostgreSQL migration and Prisma runtime smoke: `pnpm prisma:smoke:postgres` validates a disposable `DATABASE_URL`, applies checked-in migrations to PostgreSQL, regenerates Prisma Client, and performs representative real CRUD through Prisma repositories for identity/session/org/RBAC, audit, OIDC transient state, provider telemetry, compliance output, evidence, billing, regulatory sources, remediation metadata, notification drafts, and stored outputs. GAP-026 is resolved for disposable live PostgreSQL smoke.
- PLAN_M32 live Redis/BullMQ job durability smoke: `@puresoc/jobs` now has an opt-in Redis-backed queue adapter under `PURESOC_JOB_QUEUE_PROVIDER=bullmq`; `pnpm jobs:smoke:redis` targets a local/disposable Redis URL and proves enqueue, duplicate idempotency, claim, complete, retry/failure metadata, graceful shutdown, worker remediation safety-validation metadata, scheduler regulatory monitor dispatch with a fake metadata client, and connector-runner read-only provider sync without live external services or provider writes. GAP-037 is resolved for the bounded live queue smoke, while GAP-043 tracks production multi-process queue hardening.
- PLAN_M33 audit export/checkpoint contracts: `@puresoc/audit` now exports redacted audit chain segments with verification status, non-WORM/non-notarized guarantees, deterministic violation detection for missing rows, tampered payloads, broken links, and wrong terminal checkpoints; memory and Prisma checkpoint repositories persist database-only checkpoint metadata in `audit_checkpoints`; API routes expose organization-scoped audit export/checkpoint operations; GAP-039 is narrowed without claiming WORM storage or external notarization.
- PLAN_M34 provider-token key custody and rotation smoke: `@puresoc/provider-microsoft365` now has an explicit `local-env-key-ring` key-provider/custody boundary around the local token cipher, redacted custody summaries, and a package-level rotation smoke helper; config validation rejects unsupported custody providers and duplicate/reused provider-token key material; `pnpm provider-token:smoke` proves active-key encrypt/decrypt, previous-key decrypt, bad-key failure, secret-free output, and production rejection of checked-in local-dev active/previous provider-token keys without live Microsoft Graph, external KMS, or provider writes. GAP-040 is narrowed without claiming KMS/secret-manager custody.
- PLAN_M35 remediation worker provider execution safety: `@puresoc/providers-core` now has a provider-neutral action executor boundary; `@puresoc/provider-mock` has deterministic fake action execution; Microsoft 365 exports only a disabled action executor; worker execution can use injected fake-provider dependencies to prove persisted preflight, approval, pre-state snapshot, provider write-enabled checks, idempotency, failure metadata, post-state snapshot/verification metadata, and audit redaction without live Graph writes or customer-impacting remediation.
- PLAN_M36 production queue orchestration hardening: `@puresoc/jobs` now uses Redis per-job claim locks, bounded command retry/backoff, explicit stale-running recovery and terminal cleanup hooks, queue metadata/failure-detail redaction, configurable Redis queue settings, deterministic contention/recovery/cleanup/retry tests, and an extended disposable Redis smoke proving competing worker runtime instances claim only one shared job while scheduler and connector-runner remain fake/read-only.
- PLAN_M37 audit export retention/external checkpoint contracts: `@puresoc/audit` now exposes retention/export policy metadata, `none` and deterministic test-only `fake-local` external checkpoint providers, non-WORM/non-notarized guarantees, and fake-anchor metadata; Prisma checkpoint persistence stores provider/status/local-anchor metadata; API routes expose org-scoped policy/provider metadata while preserving redaction; config defaults/env overrides cover audit retention/checkpoint provider settings.
- PLAN_M38 provider-token secret-manager custody contracts: `@puresoc/provider-microsoft365` now exposes secret-free custody capability/status metadata, keeps `local-env-key-ring` as the default, adds deterministic test-only `fake-secret-manager-test` behavior, models key-version/rotation-readiness metadata, exposes rotation/backfill runbook contracts, wires API config selection, expands `pnpm provider-token:smoke`, and rejects fake/unsupported custody providers in production/startup validation without live KMS/secret-manager calls or provider writes.
- PLAN_M39 served web runtime and browser auth/middleware smoke: `pnpm test:e2e -- --grep @ui-smoke` now starts local web/API HTTP surfaces in memory mode, fetches the operational console and login pages, writes deterministic desktop/mobile HTML viewport snapshots, checks responsive/no-obvious-overlap UI invariants, and verifies local `HttpOnly`/`SameSite=Lax`/secure-cookie config behavior plus trusted-Origin, untrusted-Origin, and OIDC/Microsoft provider callback Origin exemption behavior without live external integrations or provider writes.
- PLAN_M40 browser-grade local smoke: `pnpm test:e2e -- --grep @browser-smoke` now uses host Firefox WebDriver BiDi when available, captures browser-generated PNG screenshots for dashboard desktop/mobile, login mobile, evidence desktop, and approvals desktop, checks browser DOM/layout invariants, and verifies real browser cookie-jar register/login/session/logout behavior through a same-origin local auth proxy while preserving the M39 `@ui-smoke` fallback and avoiding live external integrations.
- PLAN_M41 audit export handoff operations prep: `@puresoc/audit` now exposes explicit export/checkpoint handoff metadata for `database_only`, `worm_export_pending`, `externally_anchored`, and `external_anchor_failed` states; checkpoint recording preserves failed external-anchor attempts with generic secret-free failure metadata; API/database mappings return handoff status while preserving redaction, organization scoping, and non-WORM/non-notarized guarantees.
- PLAN_M42 external integration smoke readiness matrix: `@puresoc/config` now exposes a secret-free external smoke readiness contract; `@puresoc/provider-microsoft365` exposes read-only smoke metadata; `pnpm external-smoke:readiness` reports Microsoft 365, Stripe, Microsoft/Google/GitHub OIDC, object-storage/scanner, and evidence/report runtime readiness without live network calls; future live-candidate paths require disposable/test confirmation and per-provider opt-in while preserving provider-write disablement.
- PLAN_M43 Stripe test-mode disposable smoke harness: `pnpm stripe:smoke:test-mode` now defaults to dry-run, first evaluates the M42 readiness matrix, reports planned Stripe test-mode customer/Checkout/Portal/webhook-signature operations plus configured/missing variable names without calling Stripe, refuses live execution unless Stripe readiness is `ready_for_disposable_smoke` with disposable/test opt-ins, rejects `sk_live_*`, requires `sk_test_*`, and keeps Stripe secret values, webhook secrets, Checkout/Portal URLs, and full Stripe object IDs out of output.
- PLAN_M44 object-storage/scanner/evidence runtime disposable smoke harness: `pnpm evidence:smoke:runtime` now defaults to dry-run, first evaluates the M42 readiness matrix for both `object_storage_scanner_runtime` and `evidence_report_runtime`, reports planned report-renderer, scanner, S3 write/read, generated-report evidence, access-log, CSV metadata, and binary evidence-package metadata operations without live calls, refuses live execution unless both readiness paths and local/test/disposable opt-ins are ready, and keeps storage credentials, endpoint URLs, storage URIs, full object keys, uploaded bytes, and report bodies out of output.
- PLAN_M45 Microsoft 365 read-only disposable tenant smoke harness: `pnpm microsoft365:smoke:read-only` now defaults to dry-run, first evaluates the M42 readiness matrix for `microsoft365_read_only_tenant`, reports planned app-only token, encrypted credential-envelope, provider-neutral storage, and read-only Graph module operations without live calls, refuses live execution unless readiness and disposable/test opt-ins are ready, checks disabled write-bundle metadata, and keeps client secrets, tokens, tenant IDs, tenant payloads, user emails, endpoint URLs, and provider credential envelopes out of output.
- PLAN_M46 OIDC/social-login disposable callback smoke harness: `pnpm oidc:smoke:callback` now defaults to dry-run, first evaluates the M42 readiness matrix for `oidc_microsoft_entra_callback`, `oidc_google_callback`, or `oidc_github_callback` based on `PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER`, reports planned authorization, callback, token/JWKS/profile/email lookup, account-link, session-cookie, audit, and callback-Origin-exemption operations without live provider calls, refuses live-candidate execution unless readiness and disposable/test opt-ins are ready, requires provider enablement, and keeps client secrets, authorization codes, ID/access/refresh tokens, raw state/nonce, PKCE verifiers, cookies, profile payloads, user emails, and endpoint URLs out of output. Deterministic tests exercise local callback/session/account-link behavior with an injected provider harness; no approved live Microsoft/Google/GitHub provider app was exercised.
- PLAN_M47 deployed-auth smoke guardrail slice: `pnpm auth:smoke:deployment` now defaults to dry-run, first evaluates the M42 readiness matrix for `auth_deployment_browser`, reports planned registration/login/session/logout, cookie-attribute, trusted-Origin, untrusted-Origin, callback-exemption, forwarded-header, health, and RBAC checks without target calls, refuses live-candidate execution unless local/test/ci/disposable guardrails and `PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT=true` are set, and keeps endpoint URLs, passwords, session tokens/cookies, authorization headers, provider endpoint URLs, live user emails, and secrets out of output. Deterministic tests exercise a local disposable API target; no approved deployed TLS/reverse-proxy/browser target was exercised.
- PLAN_M48 provider-token custody deployment readiness/runbook slice: `pnpm provider-token:smoke` now reports local, in-a-box, and SaaS provider-token custody deployment readiness; `pnpm external-smoke:readiness` includes a provider-token custody check with supported local key-ring metadata, previous-key window/backfill/retirement confirmation blockers, and SaaS external-custody deferral. Rotation runbook metadata separates smoke verification, previous-key staging, ciphertext backfill planning, rollback expectations, key-retirement expectations, and deferred live KMS/HSM/secret-manager custody. The only real implemented custody provider remains `local-env-key-ring`; `fake-secret-manager-test` remains deterministic and test-only; no live KMS/HSM/secret-manager, Microsoft Graph, provider writes, or ciphertext backfill was executed.
- PLAN_M49 external live-smoke target selection/readiness audit: `pnpm external-smoke:readiness` now embeds a `targetSelection` block, and `pnpm external-smoke:select-target` prints that selector alone. The selector ranks Microsoft 365 read-only tenant, Stripe test-mode, Microsoft/Google/GitHub OIDC callback, object-storage/scanner plus evidence/report runtime, deployed auth, and provider-token custody smoke paths; emits stable ready/blocked/unsafe/not-configured reason codes; and selects exactly one path only when readiness is `ready_for_disposable_smoke`. Default validation selected no live path and made no external calls.
- PLAN_M50 approved single external live-smoke follow-up/blocker review: the M49 selector was run first through host-node/npm equivalents. Readiness stayed dry-run with unknown target kind, no disposable confirmation, `ready_for_disposable_smoke: 0`, and no live network calls. The selector returned `outcome: no_ready_path`, `selectedPathId: null`, `selectedCommand: null`, and `readyCandidateCount: 0`, so no live smoke command was run and GAP-044 remains open with explicit blockers.
- PLAN_M51 API rate-limit store, trusted proxy, and CSRF decision slice: API rate limiting now has an injectable fixed-window store boundary while preserving process-local memory defaults; Redis/shared-store configuration is explicit and rejected until the adapter exists; request context ignores `X-Forwarded-For` and `Forwarded` unless an explicit trusted-proxy IP policy is configured; production startup requires strict Origin/Referer validation for browser state-changing routes; and deterministic tests cover trusted/untrusted forwarded headers, secret-free rate-limit errors, strict Origin/Referer behavior, and callback/webhook exemptions.
- PLAN_M52 API Redis rate-limit store adapter: `PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis` now selects an implemented Redis fixed-window store when a Redis URL is configured; Redis keys hash route-family/user/IP/org material before storage; the Redis command path uses an EVAL script through the shared Redis command client with configurable retry/backoff; middleware returns secret-free 503 responses for store failures; and startup validation rejects missing/invalid Redis URLs without silently falling back to memory.
- PLAN_M53 served web runtime baseline: after reading `docs/claude_rec4.md`, M53 was re-sequenced away from another external-smoke blocker review and implemented an authenticated web/API path. ADR-017 records current runtime stack deviations; API now exposes `GET /organizations/:orgId/dashboards/snapshots/latest`; `apps/web` proxies login/logout/session to the API, preserves API session cookies, and renders the operational console from the latest organization dashboard snapshot; `@ui-smoke` seeds a local API organization/evaluation/dashboard snapshot and proves the web dashboard came from that API response without live external calls.
- PLAN_M54 external-smoke blocker review: `external-smoke:readiness` stayed metadata-only in dry-run mode with target kind `unknown`, no disposable confirmation, no live network calls, provider writes disabled, and `ready_for_disposable_smoke: 0`; `external-smoke:select-target` returned `outcome: no_ready_path`, `selectedPathId: null`, `selectedCommand: null`, and `readyCandidateCount: 0`. No live smoke command was run, and GAP-044 remains open until exactly one approved local/test/ci/disposable target is configured and selected.
- PLAN_M55 action-run idempotency: action-run creation now accepts a normalized organization-scoped `Idempotency-Key`, rejects empty/oversized/malformed keys, returns existing same-org runs for retries, stores the optional key in memory and Prisma repositories with unique `(organizationId, idempotencyKey)` schema coverage, keeps raw keys out of API responses, and preserves provider-write disablement.
- PLAN_M56 audit-chain append concurrency: Prisma audit writes now use a transaction-scoped PostgreSQL advisory lock per audit scope, persisted `scopeKey`/`chainSequence` ordering metadata, and a unique `(scopeKey, chainSequence)` index so same-scope concurrent appends produce one deterministic chain. In-memory audit writes serialize only within one process for tests/local mode and remain non-persistent/non-multi-process.
- PLAN_M57 memory repository split and API route table: memory-mode API repositories now expose separate identity/org/RBAC, evidence, and billing adapters through `services.memoryRepositories`; the old `InMemoryPureSocRepository` god-object was removed; `apps/api/src/server.ts` dispatches through `apiRouteTable` method/pattern/route-family/handler metadata while preserving raw Stripe body handling, JSON limits, callbacks, cookies, middleware ordering, authorization, and response contracts.
- PLAN_M58 Romanian message catalog runtime: `@puresoc/shared` now exposes shared `en`/`ro` message-catalog resolution with requested/resolved locale, fallback reason, message key, message kind, and review status metadata. Reports, generic country-pack envelopes, Romania notification drafts, and selected served-web labels consume the resolver. Romanian legal-caveat and regulatory/workbook notification labels remain English fallback with explicit `missing_translation` metadata until product/legal-approved copy exists.
- PLAN_M59 served Romania onboarding route baseline: `apps/web` now serves `GET /onboarding/romania` from existing Romania onboarding schema, classification, notification-draft, source-map, and message-catalog fallback contracts. The operational console links to the route, and tests cover source/caveat/fallback/no-DNSC metadata without legal/certification claims or live external calls.
- PLAN_M60 served Romania route UI smoke coverage: `pnpm test:e2e -- --grep @ui-smoke` now fetches `GET /onboarding/romania?locale=ro-RO`, asserts route-specific source-map, legal-caveat, fallback, unsupported-state, no-DNSC-submission, responsive, focus, and forbidden-claim behavior, and writes deterministic Romania desktop/mobile HTML snapshots beside the existing dashboard snapshots without live external calls.

Known major remaining work is tracked in `docs/implementation-gaps.md`, `docs/claude_rec.md`, `docs/claude_rec2.md`, `docs/claude_rec3.md`, and `docs/claude_rec4.md`.

## Incremental Milestone Plan Rule

Each active prompt is paired with an incremental milestone file under `docs/PLAN_Mx.md`.

- `docs/PLAN_M1.md` records the completed template-aligned skeleton milestone.
- Prompt 1 / `docs/PLAN_M2.md` is completed.
- Prompt 2 / `docs/PLAN_M3.md` is completed.
- Prompt 3 / `docs/PLAN_M4.md` is completed.
- Prompt 4 / `docs/PLAN_M5.md` is completed.
- Prompt 5 / `docs/PLAN_M6.md` is completed.
- Prompt 6 / `docs/PLAN_M7.md` is completed.
- Prompt 7 / `docs/PLAN_M8.md` is completed.
- Prompt 8 / `docs/PLAN_M9.md` is completed.
- Prompt 9 / `docs/PLAN_M10.md` is completed.
- Prompt 10 / `docs/PLAN_M11.md` is completed.
- Prompt 11 / `docs/PLAN_M12.md` is completed.
- Prompt 12 / `docs/PLAN_M13.md` is completed.
- Prompt 13 / `docs/PLAN_M14.md` is completed.
- Prompt 14 / `docs/PLAN_M15.md` is completed.
- Prompt 15 / `docs/PLAN_M16.md` is completed.
- Prompt 16 / `docs/PLAN_M17.md` is completed.
- Prompt 17 / `docs/PLAN_M18.md` is completed.
- Prompt 18 / `docs/PLAN_M19.md` is completed.
- Prompt 19 / `docs/PLAN_M20.md` is completed.
- Prompt 20 / `docs/PLAN_M21.md` is completed.
- Prompt 21 / `docs/PLAN_M22.md` is completed.
- Prompt 22 / `docs/PLAN_M23.md` is completed.
- Prompt 23 / `docs/PLAN_M24.md` is completed.
- Prompt 24 / `docs/PLAN_M25.md` is completed.
- Prompt 25 / `docs/PLAN_M26.md` is completed.
- Prompt 26 / `docs/PLAN_M27.md` is completed.
- Prompt 27 / `docs/PLAN_M28.md` is completed.
- Prompt 28 / `docs/PLAN_M29.md` is completed.
- Prompt 29 / `docs/PLAN_M30.md` is completed.
- Prompt 30 / `docs/PLAN_M31.md` is completed.
- Prompt 31 / `docs/PLAN_M32.md` is completed.
- Prompt 32 / `docs/PLAN_M33.md` is completed.
- Prompt 33 / `docs/PLAN_M34.md` is completed.
- Prompt 34 / `docs/PLAN_M35.md` is completed.
- Prompt 35 / `docs/PLAN_M36.md` is completed.
- Prompt 36 / `docs/PLAN_M37.md` is completed.
- Prompt 37 / `docs/PLAN_M38.md` is completed.
- Prompt 38 / `docs/PLAN_M39.md` is completed.
- Prompt 39 / `docs/PLAN_M40.md` is completed.
- Prompt 40 / `docs/PLAN_M41.md` is completed.
- Prompt 41 / `docs/PLAN_M42.md` is completed.
- Prompt 42 / `docs/PLAN_M43.md` is completed.
- Prompt 43 / `docs/PLAN_M44.md` is completed.
- Prompt 44 / `docs/PLAN_M45.md` is completed.
- Prompt 45 / `docs/PLAN_M46.md` is completed.
- Prompt 46 / `docs/PLAN_M47.md` is completed.
- Prompt 47 / `docs/PLAN_M48.md` is completed.
- Prompt 48 / `docs/PLAN_M49.md` is completed.
- Prompt 49 / `docs/PLAN_M50.md` is completed.
- Prompt 50 / `docs/PLAN_M51.md` is completed.
- Prompt 51 / `docs/PLAN_M52.md` is completed.
- Prompt 52 / `docs/PLAN_M53.md` is completed.
- Prompt 53 / `docs/PLAN_M54.md` is completed.
- Prompt 54 / `docs/PLAN_M55.md` is completed.
- Prompt 55 / `docs/PLAN_M56.md` is completed.
- Prompt 56 / `docs/PLAN_M57.md` is completed.
- Prompt 57 / `docs/PLAN_M58.md` is completed.
- Prompt 58 / `docs/PLAN_M59.md` is completed.
- Prompt 59 / `docs/PLAN_M60.md` is completed.
- Prompt 60 / `docs/PLAN_M61.md` is staged as the next active implementation prompt.
- Continue incrementing one milestone number per prompt unless this file is intentionally reordered.

During each prompt run:

1. Create or update the current `docs/PLAN_Mx.md` at the start of implementation with scope, assumptions, expected files, validation plan, and expected gap movement.
2. Complete the implementation and validation.
3. Update the same `docs/PLAN_Mx.md` with actual changed files, validation results, acceptance status, gaps updated, residual risk, and deferred work.
4. Update `docs/codex-prompts.md` based on the implementation results, retiring completed work and rewriting or reordering the remaining prompts as needed.
5. Create the next `docs/PLAN_M{x+1}.md` stub from the next active prompt after `docs/codex-prompts.md` has been updated.

## Active Prompt Order

Recommended next sequence:

1. Prompt 60 / `docs/PLAN_M61.md`: Romania Route Browser Smoke Traversal.

Do not enable live provider writes, Microsoft Graph write/remediation actions, or customer-impacting external calls by default. M61 must stay fully in-repo: extend local browser smoke traversal for the Romania onboarding route without invoking provider executors, live queues, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, Redis targets, or external smoke commands.

## Active Prompt 60 / PLAN_M61: Romania Route Browser Smoke Traversal

Read:

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M60.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/package.json`
- `code/README.md`

Goal:

Extend the local browser smoke so the Romania onboarding route is exercised by the existing Firefox WebDriver BiDi path when a browser is available, while preserving the deterministic `@ui-smoke` HTTP fallback and no-live-call posture.

Deliverables:

- Update `@browser-smoke` to navigate to `GET /onboarding/romania?locale=ro-RO` after the existing local web login path is established.
- Capture route-specific desktop/mobile PNG screenshots under `/tmp/puresoc-browser-smoke-*` when Firefox WebDriver BiDi is available.
- Add browser DOM/layout assertions for Romania route source-map, caveat, fallback, unsupported-state, no-DNSC-submission, responsive/focus/readability, no horizontal overflow, and forbidden legal/certification claims.
- Keep the existing dashboard desktop/mobile, login, evidence, approvals, browser-auth, cookie, Origin, and callback-exemption checks intact.
- Preserve the M60 `@ui-smoke` HTTP fallback and make blocked browser output clear that Romania browser PNG coverage is not claimed when Firefox is unavailable.
- Add focused tests for browser assertion helpers if they are factored.
- Update GAP-031 and handoff docs to distinguish local HTML route snapshots from route-specific browser PNG traversal.
- Create `docs/PLAN_M62.md` from the next selected active prompt before final response.

Expected files:

- `code/scripts/run-ui-smoke.mjs`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M61.md`
- `docs/PLAN_M62.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Negative constraints:

- Do not add direct DNSC submission or imply that PureSOC submits to DNSC.
- Do not add unapproved Romanian legal/regulatory translations or certification claims.
- Do not hardcode workbook-derived regulatory rules in UI conditionals; use country-pack/onboarding data contracts.
- Do not introduce a broad frontend framework, router migration, Playwright dependency, or layout rewrite.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.

Tests and acceptance commands:

Run from `code/`:

```sh
pnpm lint
pnpm test -- web ui-smoke browser romania onboarding
pnpm test:e2e -- --grep @ui-smoke
pnpm test:e2e -- --grep @browser-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, use host-node/npm equivalents and record the substitution in `docs/PLAN_M61.md`. If Firefox/WebDriver BiDi is unavailable, `@browser-smoke` may return its existing blocked status; record the blocker and preserve the `@ui-smoke` route snapshot proof.

Expected gap movement:

- Narrow GAP-031 for route-specific Firefox browser traversal coverage of the Romania onboarding route when browser support is available, or preserve the browser blocker explicitly if not.
- Preserve GAP-042 for approved Romanian legal/regulatory copy.
- Preserve GAP-044; this prompt must not run external smoke commands or live external targets.

Final response must include:

- Changed files
- Tests run
- Acceptance status
- Gaps updated
- `PLAN_M61` updated
- `PLAN_M62` created
- Codex prompts updated
- Residual risk

## Completed Prompt 59 / PLAN_M60: Served Romania Route UI Smoke Coverage

Completed on 2026-05-03.

Summary:
- Extended `pnpm test:e2e -- --grep @ui-smoke` to fetch `GET /onboarding/romania?locale=ro-RO` from the local web server.
- Added route-specific smoke assertions for source-map, legal-caveat, locale fallback, unsupported-state, no-DNSC-submission, responsive/focus, no undefined/object leaks, unique ids, and forbidden legal/certification claims.
- Wrote deterministic Romania desktop/mobile HTML snapshots under the existing `/tmp/puresoc-ui-smoke-*` artifact directory and included them in the smoke output.
- Preserved dashboard, login/session proxy, cookie, Origin, and callback-exemption checks.
- Added focused renderer test coverage for the route's responsive and focus affordances.
- No live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, deployments, external-smoke commands, or provider write executors were called.

Validated with host npm equivalents because sandbox-local `pnpm` was unavailable:
- `npm run lint`
- `npm run test -- web ui-smoke romania onboarding`
- `npm run test:e2e -- --grep @ui-smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`
- Additional M60 acceptance command results are recorded in `docs/PLAN_M60.md`.

GAP-031 is narrowed for local served `@ui-smoke` coverage of the Romania onboarding route. GAP-042 remains open for product/legal-approved Romanian legal/regulatory copy. GAP-044 is unchanged.

## Completed Prompt 58 / PLAN_M59: Served Romania Onboarding Route Baseline

Completed on 2026-05-03.

Summary:
- Added `GET /onboarding/romania` to the lightweight `apps/web` server.
- Added a compact Romania onboarding/readiness route model and renderer using `@puresoc/country-pack-ro` onboarding schema, classification, notification draft, source-map, and M58 message-catalog fallback metadata.
- Linked the operational console navigation to `/onboarding/romania?locale=ro-RO`.
- Rendered visible source, caveat, fallback, unsupported-state, and no-DNSC-submission signals without direct DNSC submission, unapproved Romanian legal/regulatory translations, broad frontend framework changes, or certification/legal approval claims.
- Added focused renderer and served-route tests, and documented the route in `code/README.md`.
- No live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, deployments, external-smoke commands, or provider write executors were called.

Validated with host npm equivalents because sandbox-local `pnpm` was unavailable:
- `npm run lint`
- `npm run test -- web ro onboarding i18n`
- `npm run test:e2e -- --grep @ui-smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`
- Additional M59 acceptance command results are recorded in `docs/PLAN_M59.md`.

GAP-031 is narrowed for the served Romania onboarding route and operational-console navigation. GAP-042 remains open for product/legal-approved Romanian legal/regulatory copy. GAP-044 is unchanged.

## Completed Prompt 57 / PLAN_M58: Romanian Message Catalog Runtime

Completed on 2026-05-03.

Summary:
- Added shared `en`/`ro` message-catalog resolution with requested/resolved locale, fallback reason, message key, message kind, and review status metadata.
- Preserved the English legal caveat as the only approved legal caveat text; Romanian legal-caveat requests explicitly fall back to English with `missing_translation`.
- Added demo-safe Romanian product labels for selected non-legal UI copy.
- Wired reports, generic country-pack notification envelopes, Romania notification draft generation, and selected served-web labels through the resolver.
- Kept Romania regulatory/workbook notification labels English/source-mapped for Romanian requests until approved Romanian regulatory copy exists.
- No live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, deployments, external-smoke commands, or provider write executors were called.

Validated with host npm equivalents because sandbox-local `pnpm` was unavailable:
- `npm run lint`
- `npm run test -- i18n ro notification reports web`
- `npm run test:e2e -- --grep @ui-smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`
- Additional M58 acceptance command results are recorded in `docs/PLAN_M58.md`.

GAP-042 is narrowed for runtime message-catalog wiring and explicit fallback metadata. Romanian legal-caveat and regulatory/workbook copy approval remains open. GAP-044 is unchanged.

## Completed Prompt 56 / PLAN_M57: Memory Repository Split And API Route Table

Completed on 2026-05-03.

Summary:
- Split memory-mode API runtime repositories into separate identity/org/RBAC, evidence, and billing adapters exposed through `services.memoryRepositories`.
- Removed the old `InMemoryPureSocRepository` god-object and billing inheritance shape while preserving memory-mode auth, organization/RBAC, evidence, billing, reports, dashboards, notification drafts, and remediation behavior.
- Replaced the long linear API regex dispatcher with `apiRouteTable` method/pattern/route-family/handler entries and shared operation handlers.
- Preserved middleware ordering, Stripe raw-body handling, JSON request limits, OIDC/provider callback exemptions, cookies, authorization checks, route URLs/methods, and response contracts.
- Added route-table metadata regression coverage for webhook, OIDC callback, and evidence route families.
- No live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, deployments, external-smoke commands, or provider write executors were called.

Validated with host npm equivalents because sandbox-local `pnpm` was unavailable:
- `npm run lint`
- `npm run test -- api auth evidence billing`
- `npm run test:e2e -- --grep @ui-smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`
- Additional M57 acceptance command results are recorded in `docs/PLAN_M57.md`.

GAP-045 records the narrowed REC-203/REC-204 maintainability risk for per-context memory repositories and route-table dispatch. GAP-044 is unchanged.

## Completed Prompt 55 / PLAN_M56: Multi-Process Audit-Chain Append Concurrency

Completed on 2026-05-03.

Summary:
- Added an audit sink boundary that lets persistence adapters attach hash-chain integrity inside their own serialized append path.
- Prisma audit writes now run in a transaction, acquire a PostgreSQL advisory lock per audit scope, and persist `scopeKey` plus `chainSequence` with a unique `(scopeKey, chainSequence)` index.
- Latest-anchor reads and audit exports now use the persisted chain sequence rather than timestamp-only ordering.
- Added deterministic same-scope contention tests and different-organization independence tests; in-memory audit writes now serialize within one process while remaining explicitly non-persistent/non-multi-process.
- Redacted canonical payload semantics, organization/global scopes, database-only checkpoints, and non-WORM/non-notarized guarantees were preserved; no live PostgreSQL, external services, provider writes, Redis targets, or external-smoke commands were run.

Validated with host npm equivalents because sandbox-local `pnpm`/`npm` were unavailable:
- `npm run lint`
- `npm run test -- audit database api`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`
- Additional M56 acceptance command results are recorded in `docs/PLAN_M56.md`.

GAP-039 is narrowed for transaction-scoped same-scope audit append locking and persisted chain ordering. GAP-041 is narrowed for audit scope-sequence schema drift coverage. WORM/object-storage export writers, real external signing/notarized checkpoints, checkpoint retention operations, legal-hold/deletion procedures, deployed database migration/replica smoke coverage, and operational verification/alerting remain deferred under GAP-039. GAP-044 is unchanged.

## Completed Prompt 54 / PLAN_M55: Action-Run Idempotency

Completed on 2026-05-03.

Summary:
- Added optional action-run idempotency keys to the recommendation domain model, in-memory remediation repository, Prisma action repository, and Prisma schema.
- `POST /organizations/:orgId/actions/runs` now reads `Idempotency-Key`, trims it, rejects empty/oversized/malformed keys with `invalid_idempotency_key`, and returns the existing same-organization action run for retries.
- Added a unique `(organizationId, idempotencyKey)` Prisma model/index plus migration and schema drift coverage.
- API action-run responses redact the raw key and expose only `idempotencyKeyPresent: true`.
- Existing preflight, approval, snapshot, provider write-enabled, verification, evidence, and audit gates were preserved; no provider writes, live queues, external services, or external-smoke commands were run.

Validated with host npm equivalents because sandbox-local `pnpm` was unavailable:
- `npm run lint`
- `npm run test -- actions remediation api database audit`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`
- Additional M55 acceptance command results are recorded in `docs/PLAN_M55.md`.

GAP-030 is narrowed for duplicate action-run creation risk at the API/domain/repository boundary. Live provider execution, provider-specific rollback/verification, live queue orchestration, and customer-facing remediation enablement remain deferred under GAP-030/GAP-043. GAP-044 is unchanged.

## Completed Prompt 53 / PLAN_M54: External Live-Smoke Target Approval Follow-Up Or Blocker Review

Completed on 2026-05-03.

Summary:
- Ran the required metadata-only `external-smoke:readiness` and `external-smoke:select-target` flow before any live smoke command.
- Used host npm package-script equivalents because sandbox-local `pnpm` and `npm` were unavailable.
- Readiness stayed dry-run with target kind `unknown`, no disposable confirmation, no live network calls, provider writes disabled, `ready_for_disposable_smoke: 0`, `not_configured: 6`, `configured_dry_run_only: 2`, `blocked_missing_secret: 1`, and `unsafe_production_target: 0`.
- Selector returned `outcome: no_ready_path`, `selectedPathId: null`, `selectedCommand: null`, `selectedCheckIds: []`, `readyCandidateCount: 0`, and `candidateCount: 8`.
- No live smoke command was run; GAP-044 remains open until exactly one approved local/test/ci/disposable target is configured and selected.

Validated with host npm equivalents because sandbox-local `pnpm`/`npm` were unavailable:
- `npm run external-smoke:readiness`
- `npm run external-smoke:select-target`
- Additional M54 acceptance command results are recorded in `docs/PLAN_M54.md`.

GAP-044 is preserved with an explicit no-ready-path blocker review. GAP-035, GAP-043, and other runtime/external gaps remain unchanged because no guarded live path was selected or run.

## Completed Prompt 52 / PLAN_M53: Served Web Runtime Baseline

Completed on 2026-05-03.

Summary:
- Read `docs/claude_rec4.md` and re-sequenced M53 from another external-smoke blocker review to the served web runtime baseline recommended by REC-201 and REC-206.
- Added ADR-017 documenting current stack deviations from the master plan: `node:http` API/web runtime, custom Redis job adapter, and Firefox/HTTP UI smoke in place of immediate NestJS/Next.js/BullMQ/Playwright migration.
- Added API `GET /organizations/:orgId/dashboards/snapshots/latest` with RBAC and organization scoping.
- Updated `apps/web` so login/logout/session are proxied to the API, the API session cookie is preserved through the web server, unauthenticated/no-active-workspace states are explicit, and the console renders from the latest API dashboard snapshot.
- Extended `@ui-smoke` to seed a local API user, organization, compliance evaluation, and dashboard snapshot, then log in through the web server and assert dashboard source metadata came from the API route.
- No live external services, provider writes, Redis targets, public regulatory URLs, object storage, scanners, KMS/HSM/secret-manager, or browser/PDF services were called.

Validated with host-node/npm equivalents because sandbox-local `node`/`pnpm` were unavailable:
- `npm run test -- web dashboard auth session api`
- `npm run test:e2e -- --grep @ui-smoke`
- Additional M53 acceptance command results are recorded in `docs/PLAN_M53.md`.

GAP-031 is narrowed for an authenticated served web/API auth/session/dashboard path while full Next.js/React and cross-browser Playwright parity remain deferred. GAP-035 is narrowed for local web login/session proxy behavior only. GAP-044 remains open and is moved to M54.

## Completed Prompt 51 / PLAN_M52: API Redis Rate-Limit Store Adapter Contract Slice

Completed on 2026-05-03.

Summary:
- Added a Redis fixed-window API rate-limit store behind `PURESOC_API_RATE_LIMIT_STORE_PROVIDER=redis` while preserving process-local memory as the default.
- Reused the shared Redis command client with EVAL support, configurable retry/backoff, and startup validation for missing or invalid Redis URLs.
- Hashes route-family/user/IP/organization rate-limit keys before writing Redis keys.
- Preserved route-family semantics, trusted-proxy behavior, webhook raw-body handling, and OIDC/provider/webhook Origin exemptions.
- Added deterministic command-shape, TTL/window, retry/failure, and secret-free API error tests without calling a live Redis target.

Validated with host-node/npm equivalents because sandbox-local `pnpm`/`npm` were unavailable:
- `npm run lint`
- `npm run test -- api middleware rate limit redis config`
- `npm run test -- jobs rate limit redis config`
- `npm run test -- config rate limit redis`
- `npm run external-smoke:readiness`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`
- Full acceptance results are recorded in `docs/PLAN_M52.md`.

## Completed Prompt 50 / PLAN_M51: API Rate-Limit Store, Trusted Proxy, And CSRF Decision Slice

Completed on 2026-05-03.

Summary:
- Added an injectable fixed-window rate-limit store boundary while preserving deterministic process-local memory behavior.
- Added explicit API rate-limit store config with memory defaults, deferred Redis/shared-store startup blockers, and a `requireSharedStore` refusal path.
- Made API request context ignore `X-Forwarded-For` and `Forwarded` by default; forwarded client IPs are honored only when the socket peer matches configured trusted proxy IPs.
- Kept webhook/OIDC/provider callback Origin exemptions and Stripe raw-body behavior intact.
- Chose the near-term CSRF stance: production startup requires strict Origin/Referer validation; double-submit tokens remain deferred until the served browser runtime can carry the token contract safely.

Validated with host-node/npm equivalents because sandbox-local `pnpm` was unavailable:
- `npm run test -- api middleware rate limit proxy csrf config`
- `npm run test -- auth-deployment-smoke`
- Full acceptance results are recorded in `docs/PLAN_M51.md`.

## Completed Prompt 49 / PLAN_M50: Approved Single External Live-Smoke Follow-Up Or Blocker Review

Completed on 2026-05-03.

Summary:
- Ran `external-smoke:readiness` and `external-smoke:select-target` before any live smoke command.
- Used host-node/npm equivalents because `pnpm` and sandbox-local `npm` were unavailable.
- Readiness remained dry-run with unknown target kind, no disposable confirmation, no live calls, no provider writes, and zero ready disposable-smoke candidates.
- Selector returned `outcome: no_ready_path`, `selectedPathId: null`, `selectedCommand: null`, and `readyCandidateCount: 0`.
- No live smoke command was run; GAP-044 remains open with explicit blockers.

Validated:
- `flatpak-spawn --host npm run external-smoke:readiness`
- `flatpak-spawn --host npm run external-smoke:select-target`
- Full acceptance results are recorded in `docs/PLAN_M50.md`.

## Completed Prompt 48 / PLAN_M49: External Live-Smoke Target Selection And Readiness Audit Slice

Completed on 2026-05-03.

Summary:
- Added `targetSelection` to `pnpm external-smoke:readiness`, with ranked candidates, stable reason/blocker codes, safe command metadata, and an exactly-one selected-path guarantee.
- Added `pnpm external-smoke:select-target` to print the selector by itself.
- Covered Microsoft 365 read-only tenant, Stripe test-mode, Microsoft/Google/GitHub OIDC callback, object-storage/scanner plus evidence/report runtime, auth deployment, and provider-token custody paths.
- Default validation selected no live path, kept all live commands in dry-run posture, and made no Microsoft Graph, Stripe, OIDC, object-storage, scanner, browser/PDF, KMS/HSM/secret-manager, external signing, public regulatory URL, deployment, or provider write calls.

Validated with host-node/npm equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- external-smoke readiness smoke target selection config`
- `npm run external-smoke:readiness`
- `npm run external-smoke:select-target`
- Full acceptance results are recorded in `docs/PLAN_M49.md`.

## Completed Prompt 47 / PLAN_M48: Provider-Token Custody Deployment Readiness And Runbook Slice

Completed on 2026-05-03.

Summary:
- Added provider-token custody deployment readiness metadata for local, in-a-box, and SaaS target kinds.
- Added `provider_token_custody_deployment` to `pnpm external-smoke:readiness`, including supported local key-ring metadata, test-only fake-provider metadata, previous-key window/backfill/retirement confirmation blockers, and SaaS external-custody deferral.
- Expanded `pnpm provider-token:smoke` output with target-specific custody readiness, startup validation blocker codes, and rotation runbook phases for smoke verification, previous-key staging, ciphertext backfill planning, rollback, key retirement, and deferred live KMS/HSM/secret-manager custody.
- Preserved `local-env-key-ring` as the only real implemented custody provider and kept `fake-secret-manager-test` deterministic and test-only.
- No KMS/HSM/secret-manager/cloud APIs, Microsoft Graph, external providers, object storage, scanners, browser/PDF services, public regulatory URLs, provider writes, or ciphertext backfill were called or enabled.

Validated with host-node/npm equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- config provider-token custody rotation microsoft365`
- `npm run provider-token:smoke`
- `npm run external-smoke:readiness`
- Full acceptance results are recorded in `docs/PLAN_M48.md`.

## Completed Prompt 46 / PLAN_M47: Deployed Browser/TLS/Proxy Auth Smoke Guardrail Slice

Completed on 2026-05-02.

Summary:
- Added `pnpm auth:smoke:deployment`, a dry-run-first deployed-auth smoke command.
- Added an M42 readiness check `auth_deployment_browser` with local/test/ci/disposable guardrails, endpoint-class metadata, secure-cookie/TLS posture checks, Origin/callback-exemption metadata, rate-limit metadata, and secret-free output.
- Live-candidate execution is refused unless readiness is `ready_for_disposable_smoke`, target kind/disposable confirmation are safe, `PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT=true` is set, and explicit base URL/trusted-Origin variables are configured.
- Dry-run output reports planned registration, login, session, logout, cookie, trusted-Origin, untrusted-Origin, callback-exemption, forwarded-header, health, and RBAC checks without deployment calls.
- Deterministic tests exercise a local disposable API target and prove cookie metadata, logout clearing, trusted/untrusted Origin behavior, OIDC/provider callback exemptions, forwarded-IP rate limiting, RBAC cross-organization rejection, and sanitized output.
- No approved deployed TLS/reverse-proxy/browser target or live OIDC provider app was used during M47 validation.

Validated with host-node/npm equivalents because the sandbox cannot start and sandbox-local `npm`/`pnpm` were unavailable:
- `npm run test -- auth-deployment-smoke external-smoke-readiness`
- `npm run auth:smoke:deployment`
- Full acceptance results are recorded in `docs/PLAN_M47.md`.

## Completed Prompt 45 / PLAN_M46: OIDC/Social Login Disposable Callback Smoke Harness

Completed on 2026-05-02.

Summary:
- Added `pnpm oidc:smoke:callback`, a dry-run-first OIDC/social callback smoke command.
- The command evaluates the M42 readiness matrix before any live-candidate execution and selects `oidc_microsoft_entra_callback`, `oidc_google_callback`, or `oidc_github_callback` through `PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER`.
- Live-candidate execution is refused unless readiness is `ready_for_disposable_smoke`, provider enablement is set, disposable/test guardrails are set, and the provider-specific opt-in is present. The checked-in CLI does not claim real Microsoft/Google/GitHub callback coverage without approved provider apps.
- Dry-run output reports planned authorization, callback, token/JWKS/profile/email lookup, account-link, session-cookie, audit, and callback-Origin-exemption operations without provider network calls.
- Deterministic tests exercise local callback/session/account-link behavior through an injected disposable provider harness while keeping secrets, authorization codes, tokens, raw state/nonce, PKCE verifiers, cookies, profile payloads, user emails, and endpoint URLs out of output.
- No approved live Microsoft Entra, Google, or GitHub disposable provider app was used during M46 validation.

Validated with host-node/npm equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run test -- oidc-callback-smoke external-smoke auth-oidc`
- `npm run oidc:smoke:callback`
- Full acceptance results are recorded in `docs/PLAN_M46.md`.

## Completed Prompt 44 / PLAN_M45: Microsoft 365 Read-Only Disposable Tenant Smoke Harness

Completed on 2026-05-02.

Summary:
- Added `pnpm microsoft365:smoke:read-only`, a dry-run-first Microsoft 365 read-only smoke command.
- The command evaluates the M42 readiness matrix before any live/disposable execution and refuses live execution unless `microsoft365_read_only_tenant` is `ready_for_disposable_smoke`.
- Live/disposable execution requires `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, a safe disposable/test target, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, `PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true`, Microsoft 365 client ID/secret, and a disposable/test tenant ID.
- The smoke harness plans or, when explicitly enabled, executes app-only token acquisition, local encrypted provider credential-envelope creation, provider-neutral in-memory connection/permission/credential storage, and read-only Microsoft Graph module sync through the connector pipeline. Output omits client secrets, tokens, tenant IDs, tenant payloads, live user emails, endpoint URLs, provider credential envelopes, and provider-write metadata.
- No approved live Microsoft 365 disposable tenant was used during M45 validation.

Validated with host-node/npm equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- microsoft365-read-only-smoke microsoft365-readiness external-smoke`
- `npm run microsoft365:smoke:read-only`
- Full acceptance results are recorded in `docs/PLAN_M45.md`.

## Completed Prompt 43 / PLAN_M44: Object-Storage, Scanner, And Evidence Runtime Disposable Smoke Harness

Completed on 2026-05-02.

Summary:
- Added `pnpm evidence:smoke:runtime`, a dry-run-first evidence runtime smoke command.
- The command evaluates the M42 readiness matrix before any live/disposable execution and refuses live execution unless both `object_storage_scanner_runtime` and `evidence_report_runtime` are `ready_for_disposable_smoke`.
- Live/disposable execution requires `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, a safe disposable/test target, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, `PURESOC_EXTERNAL_SMOKE_STORAGE=true`, `PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS=true`, S3-compatible object storage, an HTTP scanner, and a local/test/disposable report-renderer URL.
- The smoke harness plans or, when explicitly enabled, executes synthetic report-renderer, scanner, S3 put/read, generated-report evidence metadata, evidence access-log, CSV metadata, and binary evidence-package metadata checks. Output omits object-storage credentials, endpoint URLs, storage URIs, full object keys, uploaded bytes, and rendered report bodies.
- `PURESOC_REPORT_RENDERER` now overrides report renderer config, and readiness metadata includes scanner/renderer endpoint classes without returning endpoint values.
- No approved live MinIO/S3, scanner, or report-renderer target was used during M44 validation.

Validated with host-node/npm equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run test -- evidence-runtime-smoke external-smoke`
- `npm run evidence:smoke:runtime`
- Full acceptance results are recorded in `docs/PLAN_M44.md`.

## Completed Prompt 42 / PLAN_M43: Stripe Test-Mode Disposable Smoke Harness And Guardrail Slice

Completed on 2026-05-02.

Summary:
- Added `pnpm stripe:smoke:test-mode`, a dry-run-first Stripe test-mode smoke command.
- The command evaluates the M42 readiness matrix before any live/test execution and refuses live execution unless `stripe_test_mode_billing` is `ready_for_disposable_smoke`.
- Live/test execution requires `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, a safe disposable/test target, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, `PURESOC_EXTERNAL_SMOKE_STRIPE=true`, `PURESOC_BILLING_PROVIDER=stripe`, `sk_test_*` credentials, webhook secret, and non-placeholder price IDs.
- The smoke harness plans or, when explicitly enabled, executes synthetic customer, Checkout Session, Customer Portal Session, and local webhook-signature checks. Output omits Stripe secret values, webhook secrets, Checkout/Portal URLs, and full Stripe object IDs.
- Stripe readiness now includes `PURESOC_BILLING_PROVIDER` and Base/Pro/MSP price variables, so a ready Stripe smoke cannot be reported from credentials alone while billing remains `none`.
- No live Stripe account or webhook delivery was used during M43 validation.

Validated with host-node/npm equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run test -- stripe external-smoke config`
- `npm run stripe:smoke:test-mode`
- Full acceptance results are recorded in `docs/PLAN_M43.md`.

## Completed Prompt 41 / PLAN_M42: External Integration Smoke Readiness Matrix And Guardrail Slice

Completed on 2026-05-02.

Summary:
- Added a secret-free external smoke readiness contract under `@puresoc/config`.
- Added Microsoft 365 readiness metadata under `@puresoc/provider-microsoft365` for read-only bundles, read modules, deferred modules, and disabled write bundles.
- Added `pnpm external-smoke:readiness`, a deterministic dry-run JSON report for Microsoft 365, Stripe, Microsoft/Google/GitHub OIDC, object-storage/scanner, and evidence/report runtime smoke prerequisites.
- Readiness output reports `not_configured`, `configured_dry_run_only`, `ready_for_disposable_smoke`, `blocked_missing_secret`, and `unsafe_production_target` without live network calls.
- Future live-candidate readiness requires `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, a safe `PURESOC_EXTERNAL_SMOKE_TARGET_KIND`, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, and per-provider opt-in flags.
- Readiness output includes variable names, blocker codes, booleans, and non-secret metadata only; it does not print secrets, tokens, webhook secrets, endpoint values, storage URIs, cookies, key material, or provider-write data.
- Updated `.env.example`, `code/README.md`, gap register entries, `docs/microsoft365-permissions.md`, and milestone handoff docs.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- external-smoke microsoft365-readiness config`
- `npm run test -- config provider microsoft365 billing oidc evidence api health`
- `npm run external-smoke:readiness`
- `npm run test:e2e -- --grep @ui-smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

GAP-007, GAP-028, GAP-029, and GAP-032 are narrowed for readiness metadata, blocker reporting, and opt-in/disposable guardrails without live external calls. GAP-030, GAP-035, GAP-039, GAP-040, and GAP-043 remain preserved.

## Completed Prompt 40 / PLAN_M41: Audit WORM Export And External Checkpoint Operations Prep Slice

Completed on 2026-05-02.

Summary:
- Added `AuditExportHandoff` metadata to audit export segments and checkpoint records, including `database_only`, `worm_export_pending`, `externally_anchored`, and `external_anchor_failed` states.
- Preserved existing audit hash-chain, exported-segment verification, redaction, organization scoping, database-only checkpoint persistence, retention policy metadata, and explicit non-WORM/non-notarized guarantees.
- Kept the current providers as `none` and deterministic test-only `fake-local`; `fake-local` remains a local metadata fixture, not a real timestamp authority, signer, WORM store, KMS/HSM, or production notarization provider.
- Updated checkpoint recording so an external-anchor provider failure preserves a checkpoint with `external_anchor_failed` status and generic secret-free failure metadata instead of leaking provider error text.
- Surfaced handoff metadata through API and Prisma repository mappings, and documented operator-owned responsibilities for immutable export handoff, external signing/notarization, retention/legal hold, retry, and verification alerting.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- audit api rbac evidence health`
- `npm run test:e2e -- --grep @ui-smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

GAP-039 is narrowed for explicit audit export handoff states, failed-anchor checkpoint preservation, and operator-owned immutable/export/signing responsibility metadata without claiming WORM storage, external notarization, legal certification, or database-admin-proof auditability. GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-040, and GAP-043 remain preserved.

## Completed Prompt 39 / PLAN_M40: Browser-Grade Playwright Screenshot And Browser Auth Smoke Slice

Completed on 2026-05-02.

Summary:
- Preserved the M39 `@ui-smoke` served HTTP fallback and added `@browser-smoke` to the existing local smoke runner.
- Used host Firefox WebDriver BiDi as the local browser harness without downloading Playwright or browser binaries.
- Captured browser-generated PNG screenshots for dashboard desktop/mobile, login mobile, evidence desktop, and approvals desktop under `/tmp/puresoc-browser-smoke-*`.
- Added browser DOM/layout assertions for viewport size, nonblank/readable surfaces, no obvious grouped-control overlap, no document horizontal overflow, legal caveat and source/copy signals, and no certification claims.
- Added real browser register/login/session/logout coverage through a same-origin local auth proxy, including `HttpOnly` invisibility to `document.cookie`, WebDriver storage checks for `HttpOnly`, `SameSite=lax`, local HTTP `secure=false`, and logout cookie removal.
- Kept untrusted-Origin rejection and OIDC/Microsoft provider callback exemption checks in the deterministic local HTTP fallback because the API intentionally does not enable broad browser CORS.

Validated with host-node equivalents because sandbox-local `pnpm` was unavailable:
- `npm run lint`
- `npm run test -- web ui api middleware auth health`
- `npm run test:e2e -- --grep @ui-smoke`
- `npm run test:e2e -- --grep @browser-smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

GAP-031 is narrowed for Firefox browser PNG screenshots and browser DOM layout assertions. GAP-035 is narrowed for Firefox browser cookie-jar/session/logout coverage with local HTTP fallback for untrusted-Origin and callback-exemption checks. GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043 remain preserved.

## Completed Prompt 38 / PLAN_M39: Served Web Runtime And Browser Auth/Middleware Smoke Slice

Completed on 2026-05-02.

Summary:
- Exported the web server startup path so the operational console can be served and tested through local HTTP without breaking `npm run start:web`.
- Hardened the operational UI CSS for compact/mobile wrapping, added a non-card fact block for approval metadata, preserved source/legal-caveat indicators, and kept provider write execution unavailable.
- Replaced the static-only `@ui-smoke` runner with a deterministic served web/API smoke. The smoke starts local HTTP surfaces in memory mode, fetches the console/login/health routes, writes desktop and mobile HTML viewport snapshots under `/tmp/puresoc-ui-smoke-*`, checks responsive/no-obvious-overlap invariants, and validates local auth cookies plus trusted-Origin/untrusted-Origin/callback-exemption middleware behavior.
- Documented that no Playwright/browser binary was bundled during M39; M39 uses HTTP-rendered viewport snapshots and fetch assertions as a local browser-smoke substitute, and M40 later added real Firefox browser PNG screenshot/navigation coverage.

Validated with host-node equivalents because sandbox-local `node`/`pnpm` were unavailable:
- `npm run test:e2e -- --grep @ui-smoke`
- `npm run test -- web ui api middleware auth health`
- Additional M39 acceptance command results are recorded in `docs/PLAN_M39.md`.

GAP-031 is narrowed for served local web/API startup, deterministic desktop/mobile HTML viewport snapshots, responsive/no-obvious-overlap assertions, and operational-console design preservation without browser PNG screenshots. GAP-035 is narrowed for local served cookie, trusted-Origin, untrusted-Origin, and callback-exemption smoke coverage without deployed browser/TLS/proxy claims. GAP-007, GAP-028, GAP-029, GAP-030, GAP-032, GAP-039, GAP-040, and GAP-043 remain preserved.

## Completed Prompt 37 / PLAN_M38: Provider Token Secret-Manager Custody Contract And Rotation Runbook Slice

Completed on 2026-05-02.

Summary:
- Added Microsoft 365 provider-token custody capability/status metadata, key-version metadata, rotation-readiness summaries, and secret-free custody descriptions while preserving existing AES-GCM credential envelope behavior and previous-key decrypt support.
- Kept `local-env-key-ring` as the default and added deterministic test-only `fake-secret-manager-test` behavior for active/previous lookup, missing-key failure, key-version metadata, and rotation/backfill planning without live KMS/HSM/secret-manager/cloud/Microsoft Graph calls.
- Added rotation/backfill runbook metadata covering staged previous-key windows, startup/decrypt prechecks, re-encryption/backfill prerequisites, rollback/backout expectations, key retirement, and operator-owned secret injection.
- Wired API runtime config selection for provider-token custody, expanded startup validation for fake/unsupported providers, and kept production rejection of local-dev/default provider-token keys.
- Expanded `pnpm provider-token:smoke` to prove local/fake custody behavior, fake missing-key failure, unsupported-provider rejection, production fake-provider rejection, production default-key rejection, and secret-free output.
- Documented remaining operator-owned custody requirements: selected SaaS/in-a-box secret backend, deployed smoke, ciphertext backfill/re-encryption execution, key retirement, access logging, rollback, and incident response.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- config provider microsoft365 encryption api audit worker actions`
- `npm run provider-token:smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

GAP-040 is narrowed for custody contracts, deterministic fake secret-manager behavior, rotation/backfill runbook metadata, API/runtime config selection, and expanded provider-token smoke without claiming real KMS/secret-manager custody, deployed rotation, ciphertext backfill execution, key retirement, access logging, or production readiness. GAP-030, GAP-039, and GAP-043 remain preserved.

## Completed Prompt 36 / PLAN_M37: Audit Export Retention And External Checkpoint Contract Slice

Completed on 2026-05-02.

Summary:
- Added audit retention/export policy metadata in `@puresoc/audit` and config defaults/env overrides for audit log retention, checkpoint/export retention, checkpoint cadence, and external checkpoint provider selection.
- Added `none` and deterministic test-only `fake-local` external checkpoint providers. The fake provider records local hash/reference metadata only and explicitly avoids live external services, WORM storage, external notarization, and legal certification claims.
- Extended audit export segments and checkpoint records with retention policy, external provider status, fake/local anchor metadata, and non-WORM/non-notarized guarantees.
- Persisted the new checkpoint metadata through Prisma schema/migration, repository mapping, and selected drift-check coverage.
- Exposed the metadata through organization-scoped audit export/checkpoint API routes while keeping exported payloads redacted and cross-organization access rejected.
- Documented remaining operator-owned audit requirements: append-only/WORM storage, retention/legal-hold/deletion policy, immutable checkpoint export, external signing/notarization, alerts, and concurrent append semantics.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- audit api database config evidence reports exports rbac`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

GAP-039 is narrowed for retention/export policy metadata and deterministic none/fake external-anchor contracts without claiming WORM storage, external notarization, legal certification, or database-admin-proof auditability. GAP-030, GAP-040, and GAP-043 remain preserved.

## Completed Prompt 35 / PLAN_M36: Production Queue Orchestration And Multi-Process BullMQ Hardening Slice

Completed on 2026-05-02.

Summary:
- Hardened the Redis-backed `bullmq` adapter in `@puresoc/jobs` with per-job claim locks, bounded Redis command retry/backoff, explicit stale-running recovery, terminal cleanup hooks, and queue metadata/failure-detail redaction.
- Added Redis job settings to config defaults and environment overrides for command attempts/backoff, claim lease, stale-running recovery threshold, and completed/failed retention windows.
- Extended deterministic tests for multi-worker claim contention, retry/failure metadata, recovery, cleanup, Redis command retry, and secret-free queue metadata.
- Extended `pnpm jobs:smoke:redis` to use synthetic `puresoc-m36-smoke-*` queues and prove duplicate idempotency, single shared-job claim under competing worker runtime instances, recovery, cleanup, graceful shutdown, scheduler fake metadata dispatch, and connector-runner read-only provider sync.
- Kept `PURESOC_JOB_QUEUE_PROVIDER=memory` as the default and did not enable live provider writes, live Microsoft Graph, external providers, KMS, WORM storage, browser runtime, object storage, or public regulatory fetches.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- jobs worker scheduler connector-runner provider actions queue redis api database audit`
- `REDIS_URL=redis://127.0.0.1:<ephemeral>/0 npm run jobs:smoke:redis` against a disposable `redis:7-alpine` container
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

GAP-043 is narrowed for claim-lock contention safety, bounded command retry, explicit recovery/retention hooks, queue redaction, and disposable Redis smoke coverage without claiming deployed production orchestration readiness. GAP-030, GAP-039, and GAP-040 remain preserved.

## Completed Prompt 34 / PLAN_M35: Remediation Worker Provider Execution Safety Contract Slice

Completed on 2026-05-02.

Summary:
- Added a provider-neutral action executor boundary in `@puresoc/providers-core`, including a disabled executor and redacted provider-action execution errors.
- Added a deterministic fake action executor in `@puresoc/provider-mock` and a Microsoft 365 disabled action executor in `@puresoc/provider-microsoft365`.
- Wired `apps/worker` so the default runtime still validates safety metadata only, while tests can inject fake-provider execution dependencies for action-run execution.
- Worker execution now checks persisted preflight, approval, pre-state snapshot, provider connection identity, provider write-enabled state, executor identity, duplicate/idempotent completion, apply failure semantics, post-state snapshot metadata, verification metadata, and redacted audit payloads.
- Kept live Microsoft Graph writes, Microsoft write scopes, production provider remediation, Stripe, OIDC, object storage/scanners, public regulatory fetches, KMS, and audit WORM/signing out of scope.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- actions worker jobs provider remediation api database audit`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

GAP-030 is narrowed for fake/mock provider action execution contracts and worker-side safety/idempotency/failure/verification/audit coverage. GAP-039, GAP-040, and GAP-043 remain preserved.

## Completed Prompt 33 / PLAN_M34: Provider Token KMS And Rotation Smoke Planning Slice

Completed on 2026-05-02.

Summary:
- Added an explicit Microsoft 365 `local-env-key-ring` key-provider/custody boundary around the existing local AES-GCM token cipher, with redacted custody summaries and active/previous key selection through the boundary.
- Added `pnpm provider-token:smoke`, backed by a local/disposable smoke helper, proving active-key encrypt/decrypt, previous-key decrypt, bad-key failure, secret-free output, and production rejection of checked-in local-dev active/previous provider-token keys.
- Tightened config validation for unsupported provider-token custody providers and duplicate/reused provider-token key material.
- Kept provider write execution disabled and did not call live Microsoft Graph, external KMS/secret-manager, Stripe, OIDC providers, object storage, scanners, browsers, or public regulatory URLs.
- Documented local env/Docker-secret guidance and clearly kept SaaS KMS/secret-manager custody, deployed rotation smoke, ciphertext backfill/re-encryption, and operator rollback deferred under GAP-040.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- config provider microsoft365 encryption api audit`
- `npm run provider-token:smoke`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

GAP-040 is narrowed for explicit local key-provider custody, deterministic local/disposable rotation smoke, and stricter key-ring validation. GAP-030, GAP-039, and GAP-043 remain preserved.

## Completed Prompt 32 / PLAN_M33: Audit WORM Export And External Checkpoint Planning Slice

Completed on 2026-05-02.

Summary:
- Added audit export/checkpoint contracts in `@puresoc/audit`, including redacted canonical payload export records, organization/global scopes, export guarantees that explicitly avoid WORM/notarization/legal-certification claims, export hashing, checkpoint records, and `AuditCheckpointService`.
- Added deterministic verification helpers for exported segments covering intact chains, missing rows, tampered payloads, broken previous-hash links, wrong terminal checkpoints, scope mismatches, and record-count mismatches.
- Added `InMemoryAuditCheckpointRepository` and `PrismaAuditCheckpointRepository`, plus `audit_checkpoints` Prisma schema/migration metadata and selected drift-check coverage.
- Added organization-scoped API routes for audit export, checkpoint creation, and checkpoint listing; checkpoint creation appends an `audit_checkpoint_recorded` audit event after the covered segment.
- Documented that checkpoints are database-only terminal-hash records, not WORM storage, external notarization, legal certification, retention enforcement, or protection against a database administrator rewriting all rows.
- GAP-039 is narrowed for export/checkpoint contracts and database-only checkpoint persistence. GAP-030, GAP-040, and GAP-043 remain preserved.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- audit database api auth organization rbac evidence reports`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 31 / PLAN_M32: Live Redis/BullMQ Job Durability Smoke Slice

Completed on 2026-05-02.

Summary:
- Replaced the placeholder BullMQ boundary in `@puresoc/jobs` with an opt-in Redis-backed queue adapter selected by `PURESOC_JOB_QUEUE_PROVIDER=bullmq`, while preserving deterministic `memory` mode as the default.
- Added `pnpm jobs:smoke:redis`, backed by `code/scripts/live-redis-bullmq-smoke.ts`, with local/disposable Redis target guards and unique synthetic `m32-smoke-*` queue names.
- The live smoke proves Redis ping, enqueue, duplicate idempotency, claim, complete, retry/failure metadata, graceful shutdown, worker remediation safety-validation metadata without provider writes, scheduler regulatory monitor dispatch with a fake metadata client, and connector-runner read-only provider sync plus non-read-only rejection.
- Documented Redis smoke usage and safety constraints in `code/README.md`.
- GAP-037 is resolved for the bounded live Redis queue durability smoke; GAP-043 tracks production multi-process queue orchestration hardening. GAP-030, GAP-039, and GAP-040 remain preserved.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- jobs worker scheduler connector-runner provider regulatory actions`
- `REDIS_URL=redis://127.0.0.1:<ephemeral>/0 npm run jobs:smoke:redis` against a disposable `redis:7-alpine` container
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 30 / PLAN_M31: Live PostgreSQL Migration And Prisma Runtime Smoke Slice

Completed on 2026-05-02.

Summary:
- Added `pnpm prisma:smoke:postgres`, backed by `code/scripts/live-postgres-prisma-smoke.ts`.
- The smoke validates a disposable `DATABASE_URL`, runs checked-in `prisma migrate deploy`, regenerates Prisma Client, and performs representative real CRUD through existing Prisma repository boundaries.
- Live CRUD coverage includes identity/session/org/RBAC, audit hash/redaction persistence, OIDC transient state with protected PKCE verifier storage, provider connections/telemetry, compliance results, evidence metadata/access logs, billing records/events/entitlements, regulatory source/version/source-map/review metadata, remediation action metadata, notification drafts, stored analysis, generated reports, and dashboard snapshots.
- Documented disposable-database usage and safety constraints in `code/README.md`.
- GAP-026 is resolved for live PostgreSQL migration/apply and representative real-CRUD smoke. GAP-030, GAP-032, GAP-037, GAP-039, and GAP-040 remain preserved.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` and host `pnpm` were unavailable:
- `npm run lint`
- `npm run test -- database prisma persistence auth organization rbac audit oidc provider compliance evidence billing regulatory actions outputs notification`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:<ephemeral>/puresoc_smoke npm run prisma:smoke:postgres` against a disposable `postgres:16-alpine` container
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 29 / PLAN_M30: OIDC Transient Authorization State Persistence Adapter Slice

Completed on 2026-05-02.

Summary:
- Added `PrismaOidcAuthorizationStateStore` for API Prisma mode, storing OIDC state/nonce as hashes and PKCE verifiers as AES-GCM envelopes.
- Added `oidc_authorization_states` schema/migration metadata, selected drift coverage, and an auth-owned `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` config path with production Prisma-mode startup validation.
- `createApiServices()` now selects the runtime authorization-state store; Prisma mode reports `oidc_transient_state` as persisted and has no tracked API repository context left memory-backed.
- Added deterministic fake-Prisma repository tests for save/consume, protected verifier storage, expiry rejection, and single-use behavior.
- Added API/runtime tests proving pending OIDC state survives service recreation in Prisma mode, consumed states cannot replay, expired states fail before token exchange, and email-collision account linking remains explicit.
- GAP-036 is resolved for tracked API runtime repository contexts; GAP-041 is narrowed; GAP-026 remains open for live PostgreSQL migration/apply smoke; GAP-032 remains open for live provider registration/callback smoke.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- auth oidc social login database prisma persistence api organization rbac audit`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 28 / PLAN_M29: Provider Connection And Telemetry Persistence Adapter Slice

Completed on 2026-05-02.

Summary:
- Added `PrismaProviderResourceStore` for provider connections, encrypted credential envelopes, permission bundles, capabilities, sync runs/modules, raw resources, normalized resources, findings, and recommendations.
- Added provider telemetry contract fields to Prisma schema/migration coverage: provider credential `providerKey`, provider finding resource identity fields, and provider recommendation `sourceFindingKey`.
- `createApiServices()` now selects the Prisma provider store in Prisma mode for provider connection APIs, Microsoft 365 connection APIs, and compliance evaluation inputs.
- Prisma mode now reports `provider_connections_and_telemetry` as persisted and leaves only `oidc_transient_state` memory-backed.
- Added deterministic fake-Prisma repository and API/runtime coverage for persisted mock provider connection creation, sync telemetry, idempotent raw/normalized resource upserts, findings/recommendations, module status reads, compliance inputs, encrypted credential envelope storage, and cross-organization rejection.
- GAP-036 and GAP-041 were narrowed; GAP-030 remains open and no provider write execution or live Graph smoke was added.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- provider microsoft365 connector database prisma persistence api auth organization rbac audit compliance recommendations`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 27 / PLAN_M28: Audit Log Persistence Sink Slice

Completed on 2026-05-02.

Summary:
- Added `PrismaAuditSink` for API Prisma mode, persisting redacted canonical audit payloads, `previousHash`, `entryHash`, and hash algorithm metadata into `AuditLog`.
- `createApiServices()` now selects the audit sink through the runtime repository set; Prisma mode marks `audit_logs` as persisted and leaves provider telemetry plus OIDC transient state memory-backed.
- Same-process audit writes use the in-process latest anchor, while restarted sink instances can load the latest per-organization/global persisted anchor before append.
- Added deterministic fake-Prisma sink tests for redacted payload storage and organization/global anchors.
- Added Prisma-mode API coverage proving auth/org audit events persist through the Prisma audit sink while preserving hash metadata and avoiding plaintext password persistence.
- GAP-036, GAP-039, and GAP-041 were narrowed; GAP-030 remains open and no provider write execution was added.

Validated with host-node equivalents because sandbox-local `npm` and `pnpm` were unavailable:
- `npm run lint`
- `npm run test -- audit database prisma persistence api auth organization rbac evidence billing regulatory actions`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 26 / PLAN_M27: Identity, Session, Organization, And RBAC Persistence Adapter Slice

Completed on 2026-05-02.

Summary:
- Added `PrismaIdentityOrganizationRbacRepository` for durable users, identity accounts, local credentials, sessions, reset/verification tokens, organizations, memberships, roles, and role bindings.
- API runtime selection now injects the selected identity repository into local auth, OIDC social login, organization service, and RBAC guards; Prisma mode marks `identity_sessions_organizations_rbac` as persisted while OIDC transient state remains memory-backed.
- RBAC route checks now use `services.rbacRepository` instead of the legacy memory harness field.
- Added deterministic fake-Prisma repository tests for local auth records, hashed secrets, provider-subject uniqueness, session revocation, memberships, and role bindings.
- Added API Prisma-mode coverage proving organization creation/member listing and cross-organization RBAC rejection use the Prisma adapter.
- GAP-036 and GAP-041 were narrowed for identity/session/organization/RBAC runtime persistence semantics.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run test -- auth organization rbac session database prisma persistence api`
- Remaining M27 acceptance command results are recorded in `docs/PLAN_M27.md`.

## Completed Prompt 25 / PLAN_M26: Stored Output Runtime Persistence Adapter Slice

Completed on 2026-05-02.

Summary:
- Added `OutputRecordRepository` with in-memory and Prisma adapters for stored analysis records, generated report metadata, and dashboard snapshots.
- API compliance, report, and dashboard services now depend on the output repository boundary instead of output methods on `InMemoryPureSocRepository`.
- Prisma mode selects `PrismaOutputRecordRepository` and marks `stored_analysis_reports_dashboards` as persisted while memory mode remains deterministic.
- Stored analysis persistence uses existing `compliance_result_snapshots.resultSetJson` and preserves checklist items written by the compliance-result adapter.
- Repository/runtime tests cover organization-scoped reads, latest dashboard snapshot selection, generated report persistence, and checklist-preserving stored-analysis upserts.
- GAP-036 and GAP-041 were narrowed for the stored output persistence path.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- outputs reports dashboards database prisma persistence api`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 24 / PLAN_M25: Notification Draft Runtime Persistence And Backfill Contract

Completed on 2026-05-01.

Summary:
- Added `InMemoryNotificationDraftRepository` with the same organization-scoped generic draft and Romania companion-link contract as the Prisma-boundary repository.
- Runtime repository selection now includes notification drafts: memory mode uses the in-memory adapter, and Prisma mode uses `PrismaNotificationDraftRepository`.
- Added org-scoped NIS2 notification draft create/read/list API routes that validate generic envelopes, persist records, audit creation, and create `RoNis2NotificationDraft.notificationDraftId` companion links for Romania registration envelopes.
- Added a Romania backfill helper that returns `converted`, `already_generic`, or `manual_review_required` and only converts legacy payloads with source-mapped fields plus valid keyed legal-caveat metadata.
- Updated runtime persistence reporting, code runtime docs, GAP-036, GAP-041, and GAP-042.

Validated with host-node equivalents because sandbox-local `npm`/`pnpm` were unavailable:
- `npm run lint`
- `npm run test -- notification database ro api persistence i18n`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 23 / PLAN_M24: Generic Notification Draft Envelope Persistence

Completed on 2026-05-01.

Summary:
- `@puresoc/country-packs-core` now validates and parses generic country-pack notification draft envelopes, including schema key/version, supported locale metadata, keyed legal caveat text/fallback state, source references, and source-mapped fields.
- Romania notification draft generation now emits a generic `ro.nis2.registration_notification.v1` envelope suitable for `NotificationDraft.payloadJson`, while preserving the existing Romania compatibility draft JSON.
- The Romania notification API response now includes `notificationDraftEnvelope` alongside the existing `draft`.
- `@puresoc/database` now has a `PrismaNotificationDraftRepository` with organization-scoped generic draft reads/lists/writes and Romania companion draft links.
- Tests cover valid and invalid envelope semantics, Romania envelope generation, API envelope responses, repository organization scoping, companion-link persistence, and write-time rejection of malformed payloads.
- GAP-041 is narrowed for payload-envelope semantic checks; GAP-042 is narrowed for generic envelope validation/generation and Prisma-boundary persistence.

Validated with host-node equivalents because `pnpm`/sandbox-local `npm` were unavailable:
- `npm run lint`
- `npm run test -- reports compliance ro notification i18n database prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`
- Full M24 acceptance command results are recorded in `docs/PLAN_M24.md`.

## Completed Prompt 22 / PLAN_M23: i18n And Country-Pack Notification Model Decision

Completed on 2026-05-01.

Summary:
- ADR-016 now records the `en`/`ro` locale contract, English legal-caveat fallback until Romanian wording is product/legal-approved, source-mapped country-pack message ownership, and the generic notification-draft envelope strategy.
- `@puresoc/shared` now exposes locale normalization and keyed legal-caveat resolution with fallback metadata.
- `@puresoc/country-packs-core` now exposes generic country-pack notification envelope contracts and schema-key helpers.
- Romania notification drafts now carry payload schema keys, locale/caveat metadata, submission notice separation, and source-mapped label message keys.
- Report builders include locale/legal-caveat key/fallback metadata, and generated report records persist the rendered caveat from report data.
- Notification draft table fields were added to the selected schema drift map; GAP-041 is narrowed and GAP-042 tracks deferred Romanian copy/runtime catalog/persistence migration work.

Validated with host-node equivalents because `pnpm` and sandbox-local `npm` were unavailable:
- `npm run lint`
- `npm run test -- reports compliance ro notification i18n`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 21 / PLAN_M22: Schema And Generated Data Drift Detection

Completed on 2026-05-01.

Summary:
- Added `scripts/check-schema-contract-drift.ts`, a static Prisma parser plus explicit high-risk field expectations for 19 models and 308 fields.
- Added `scripts/check-generated-regulatory-drift.ts`, which regenerates Romania NIS2 seed/source-map artifacts in memory and compares them with checked-in generated JSON.
- Wired both deterministic local checks into `pnpm lint` and added named `drift`, `drift:schema`, and `drift:regulatory` scripts.
- Added `tests/drift-checks.spec.ts` with real-schema/generated-artifact pass cases and intentional mismatch fixtures.
- GAP-041 records that the drift map is selected rather than exhaustive, including excluded notification draft surfaces and the generated Romania import report.

Validated with host-node equivalents because `pnpm`/`npm` were not available inside the sandbox:
- `npm run lint`
- `npm run test -- database schema drift regulatory-import ro`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- `docker compose -f infra/compose/docker-compose.yml config`
- `git diff --check`

## Completed Prompt 20 / PLAN_M21: Audit Log Integrity And Provider Key Handling

Completed on 2026-05-01.

Summary:
- `@puresoc/audit` now emits per-organization/global hash-chain metadata (`previousHash`, `entryHash`, `hashAlgorithm`, and redacted canonical payload) before writing to sinks.
- `InMemoryAuditSink` can verify independent chains and detect field tampering, canonical-payload mismatch, entry-hash mismatch, and broken previous-hash continuity.
- Prisma `AuditLog` now has nullable audit integrity metadata fields and a migration for future persisted sinks.
- Microsoft 365 token encryption now writes active key IDs into new envelopes, decrypts current/previous/legacy envelopes, parses previous keys from config/env, and rejects local-dev provider token keys in production startup/default env paths.
- Docs now state that hash chains are tamper-evident metadata only, not WORM storage, HSM/KMS signing, external notarization, or legal certification.
- GAP-039 and GAP-040 track external audit signing/WORM/retention work and live KMS/key-rotation smoke.

Validated with host-node equivalents because `pnpm` is not installed on this host:
- `npm run lint`
- `npm run test -- audit encryption provider microsoft365 config auth`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate`
- Additional acceptance results are recorded in `docs/PLAN_M21.md`.

## Completed Prompt 19 / PLAN_M20: API Middleware And Rate-Limit Baseline

Completed on 2026-05-01.

Summary:
- Added `code/apps/api/src/middleware.ts` for shared request context, route-family classification, trusted-Origin/Referer checks for state-changing browser routes, and explicit webhook/OIDC/provider callback exemptions.
- Added `code/apps/api/src/rate-limit.ts` with a deterministic in-memory fixed-window limiter and route-family keys for unauthenticated IP or authenticated user/organization dimensions.
- Added API config defaults and environment overrides for trusted origins, Origin policy, route-family exemptions, and rate-limit windows/counts.
- Wired the middleware into `apps/api/src/server.ts` before JSON/raw-body parsing for non-health routes, while preserving Stripe raw-body verification.
- Added focused tests for middleware ordering, rejected/allowed origins, route-family rate-limit responses, Stripe raw-body preservation under webhook Origin exemption, route classification, and existing auth/RBAC/body-limit compatibility.
- GAP-035 is narrowed for contract-level Origin protection. GAP-038 tracks distributed/shared rate limiting, proxy-aware IP trust policy, and strict CSRF-token/browser smoke follow-up.

Validated with host-node equivalents because `pnpm` is not installed on this host:
- `npm run lint`
- `npm run test -- api middleware rate-limit origin csrf auth billing evidence actions regulatory`
- `npm run test -- config`
- Additional acceptance results are recorded in `docs/PLAN_M20.md`.

## Completed Prompt 18 / PLAN_M19: Job Runtime Baseline

Completed on 2026-05-01.

Summary:
- Added `@puresoc/jobs` with typed job definitions, dispatch results, failure/retry metadata, idempotency hooks, deterministic in-memory queue/runner behavior, graceful shutdown handling, and a BullMQ-ready adapter boundary without live Redis calls.
- Added job runtime config defaults and environment overrides for queue provider, Redis URL, attempts, retry backoff, poll interval, shutdown grace, scheduler cadence, and provider-write disablement.
- Worker runtime now validates `actions.execute` remediation safety metadata and returns provider-write execution as disabled.
- Scheduler runtime can enqueue and execute `regulatory.monitorCountrySources` under explicit config without auto-activating legal logic.
- Connector-runner runtime executes `provider.sync` through the neutral provider pipeline with `allowProviderWrites=false` and rejects non-read-only payloads.
- Docker job service scripts now point at runtime loop entrypoints, and runtime-status files report the implemented entrypoints instead of contract-only deferrals.
- GAP-013 and GAP-030 were updated; GAP-037 is narrowed but remains open for live Redis/BullMQ durability.

Validated with host-node equivalents because `pnpm` is not installed on this host:
- `npm run lint`
- `npm run test -- config jobs worker scheduler connector runtime docker`
- Additional acceptance results are recorded in `docs/PLAN_M19.md`.

## Completed Prompt 17 / PLAN_M18: Runtime Truth Baseline

Completed on 2026-05-01.

Summary:
- Added `PURESOC_PERSISTENCE_MODE=memory|prisma` and config loading for provider-token encryption keys.
- Added startup config validation for production-sensitive cookies, Stripe secrets, S3 settings, HTTP scanner endpoints, production noop scanning, and default provider-token keys.
- Wired `createApiServices()` so Prisma mode shares one Prisma client and selects existing adapters for compliance results, evidence metadata/access logs, billing, regulatory sources, and remediation action metadata.
- Exposed runtime persistence status naming memory-backed contexts that remain deferred.
- Replaced inline Docker `node -e` stubs with workspace entrypoints; API, web, and report-renderer serve implemented code, while worker/scheduler/connector-runner now report contract-only status pending job runtime.
- Updated root/runtime docs and opened GAP-036 and GAP-037 for remaining runtime persistence and job process work.

Validated with:
- Host-node equivalent of `pnpm test -- config persistence runtime docker api`.
- Static Docker runtime-shape tests.
- Full acceptance results are recorded in `docs/PLAN_M18.md`.

## Required Prompt Template

Each implementation prompt must include:

```txt
Read:
- docs/puresoc_vision.md
- docs/master-plan.md
- docs/implementation-gaps.md
- docs/codex-prompts.md
- docs/LEARNINGS.md
```

Add narrower source files, ADRs, skills, or review documents inside the prompt as needed.

Each implementation prompt must include:

```txt
Negative constraints:
- Do not put Microsoft-specific logic in generic compliance packages.
- Do not put Romania-specific logic in EU baseline packages.
- Do not hardcode regulatory facts in UI conditionals.
- Do not add provider write/remediation actions unless the prompt explicitly asks for an approved safety-gated model.
- Do not make legal certification claims.
```

Each implementation prompt must end with:

```txt
Final response must include:
- Changed files
- Tests run
- Acceptance status
- Gaps updated
- PLAN_Mx updated
- Next PLAN_Mx created
- Codex prompts updated
- Residual risk
```

Gap updates:

```txt
Update docs/implementation-gaps.md with blockers, assumptions, deferred decisions, missing tests, or resolved gap status.
Keep resolved gaps for auditability.
```

Milestone plan updates:

```txt
At the start of implementation:
- Create or update the current docs/PLAN_Mx.md for this prompt.

Before final response:
- Update the same docs/PLAN_Mx.md with implementation results and validation.
- Update docs/codex-prompts.md based on completed work, changed ordering, split prompts, or newly discovered gaps.
- Create the next docs/PLAN_M{x+1}.md stub from the next active prompt.
```

## Completed Prompt 1 / PLAN_M2: Compliance Correctness, Input Validation, And Audit Hardening

Completed on 2026-04-30.

Summary:
- `requires_legal_review` country-pack completeness now emits a visible warning.
- Provider-mapped controls no longer pass from silence; they require a mapped signal or completed manual fallback with evidence.
- Compliance and recommendation routes now validate request bodies before handing data to domain services.
- Recommendation gaps with mismatched organizations are rejected.
- Synchronous compliance evaluation returns `200`.
- Compliance evaluation and recommendation generation write audit events with count summaries.
- Caller-supplied manual tasks take precedence without generating unused checklist items.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand compliance recommendations audit validation`

## Completed Prompt 2 / PLAN_M3: Schema And Contract Alignment For Persistable Results

Completed on 2026-04-30.

Summary:
- Logical control IDs such as `nis2.access-control.mfa` are now compatible with Prisma output/control-reference fields instead of UUID-only columns.
- Provider finding severity is split from actionable gap/recommendation severity; `informational` remains valid for findings but not gaps or recommendations.
- Readiness plan item due dates now use date-only schema semantics.
- Gap, recommendation, and readiness plan outputs retain provider finding IDs and manual task IDs alongside human-readable summaries.
- A `ComplianceResultRepository` port and in-memory implementation now cover control results, gaps, recommendations, readiness plans, and checklist items.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand database schema compliance gaps recommendations readiness-plan`

## Completed Prompt 3 / PLAN_M4: Prisma Migration, Generated Client, And Repository Adapter Slice

Completed on 2026-04-30.

Summary:
- Prisma CLI and `@prisma/client` are pinned to 6.19.3 to preserve the current schema datasource workflow; Prisma 7 migration is intentionally deferred.
- Workspace and database-package scripts now cover Prisma validate, generate, and migrate status commands.
- The initial migration SQL is generated under `packages/database/prisma/migrations/20260430000000_initial`.
- `packages/database/src/client.ts` now exposes a Prisma client factory boundary.
- A `compliance_result_snapshots` table preserves exact compliance result-set reloads, while granular control result, gap, recommendation, readiness-plan, and plan-item rows are written by `PrismaComplianceResultRepository`.
- Repository tests cover persistence/reload behavior and organization-scoped reads/deletes through a deterministic fake Prisma delegate boundary.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand database prisma repository compliance`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 4 / PLAN_M5: Workspace Import Policy And Shared Type Boundaries

Completed on 2026-04-30.

Summary:
- Cross-package imports now use `@puresoc/*` package exports instead of deep relative `packages/.../src` paths.
- Workspace package manifests declare the `@puresoc/*` dependencies they consume, and `code/pnpm-lock.yaml` was refreshed.
- `scripts/check-layout.mjs` now rejects cross-package deep relative imports, deep `@puresoc/*/src` imports, and missing workspace dependency declarations.
- Shared source-reference, confidence, recommendation summary, and provider-finding-for-compliance contracts live in `@puresoc/shared`.
- Compliance-core evaluates neutral `ProviderFindingForCompliance` inputs instead of importing provider-core types.
- Cross-package integration tests were moved to root `code/tests` to avoid package dependency cycles.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand import-smoke compliance recommendations provider`

## Completed Prompt 5 / PLAN_M6: Regulatory Review Workflow And Source Activation Persistence

Completed on 2026-04-30.

Summary:
- Regulatory source imports now persist source records, source versions, validation reports, source maps, review tasks, review decisions, activation timestamps, and supersession links through `@puresoc/regulatory-sources`.
- Changed legal logic remains `review_required` and creates a `regulatory_admin` review task; source-monitor task creation creates review work without activating legal logic.
- API routes list review tasks, mark tasks reviewed/rejected/activated, and read source-map traceability under organization RBAC.
- Prisma schema, initial migration metadata, and a structural Prisma repository adapter now include source-version activation state, validation reports, review decisions, and supersession links.
- GAP-006 remains open for product/legal reviewer operating procedure and UI; GAP-027 tracks runtime source-monitor scheduling.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand regulatory source-activation review-task source-map`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 6 / PLAN_M7: Billing Provider And Entitlements

Completed on 2026-04-30.

Summary:
- `@puresoc/billing-core` now defines billing provider contracts, repository records, entitlement keys, plan-based entitlement calculation, Stripe subscription status mapping, safe webhook event payloads, and `none` / `offline_license` provider behavior.
- `@puresoc/billing-stripe` now creates Checkout, Customer Portal, and Customer API requests through an injectable Stripe client and verifies webhook signatures against the raw request body.
- API billing routes now cover entitlement listing, Stripe checkout, Stripe portal, and unauthenticated-but-signature-verified webhook ingestion with RBAC on organization billing actions.
- Billing events are idempotent, subscription transitions recalculate entitlements, `BILLING_PROVIDER=none` bypasses external billing while enabling configured base entitlements, and billing changes write audit events.
- Prisma schema and migration metadata now include `paused` and `incomplete_expired` billing subscription statuses, and `PrismaBillingRepository` provides a persistence adapter boundary.
- GAP-012 remains open for final product/pricing decisions; GAP-028 tracks deferred live Stripe runtime reconciliation and operations.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand billing stripe entitlement webhook audit`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 7 / PLAN_M8: Production Evidence, Object Storage, Scanner, And PDF Adapters

Completed on 2026-04-30.

Summary:
- `@puresoc/evidence` now includes a S3/MinIO-compatible object-storage adapter, explicit no-op/mock/HTTP upload scanner adapters, scanner metadata on artifacts, and fail-closed upload behavior when clean scan completion is required.
- API evidence services can select configured storage/scanner adapters while preserving the in-memory default harness.
- `@puresoc/database` now includes a Prisma-backed evidence artifact/link/access-log repository and schema/migration metadata for scanner details.
- Report generation now stores JSON report exports as `generated_report` evidence artifacts, links them to reports/regulatory sources, and writes `report_generated` plus `report_export_created` audit events.
- `apps/report-renderer` now returns deterministic JSON and stable placeholder PDF artifacts for contract tests.
- GAP-008 and GAP-018 were updated, and GAP-029 now tracks live MinIO/scanner/browser-PDF/CSV/binary-bundle runtime work.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand evidence reports dashboards exports renderer storage scanner`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 8 / PLAN_M9: Safe Remediation Foundation

Completed on 2026-04-30.

Summary:
- `@puresoc/recommendations` now owns a remediation action lifecycle with action templates, action runs, preflight results, approval state, snapshot metadata, verification results, manual/guided follow-up tasks, high-risk V1-forbidden executable default protection, and an in-memory repository.
- `@puresoc/providers-core` now exposes provider-neutral action validation/apply/verify/evidence contracts as optional future connector capabilities; no provider write implementation was added.
- API action routes and service methods now create action runs, record preflight, request/approve, attach snapshots, queue future jobs, fail, verify, and close actions with RBAC and audit events.
- Evidence uploads now link action pre/post-state artifacts to `action_run` targets.
- Prisma schema, migration metadata, and `PrismaActionRepository` now carry action safety-state metadata for later persisted runtime wiring.
- `apps/worker` now has a future action execution job contract that requires explicit safety-gate confirmations.
- GAP-030 tracks deferred live worker/provider execution.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand actions remediation approval preflight evidence audit`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma validate --schema packages/database/prisma/schema.prisma`
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc pnpm exec prisma generate --schema packages/database/prisma/schema.prisma`

## Completed Prompt 9 / PLAN_M10: Operational UI And Design System

Completed on 2026-04-30.

Summary:
- ADR-014 now documents the PureSOC operational design-system direction: restrained product UI, OKLCH tokens, semantic primitives, visible source/caveat/safety states, and stored-analysis-backed screens.
- `@puresoc/ui` now provides reusable CSS tokens and primitives for status pills, source chips, meters, legal caveats, command buttons, and tables.
- `apps/web` now renders a deterministic operational console from stored dashboard/report/evidence/remediation contracts, including dashboard, onboarding, country-pack, Microsoft 365 health, gaps, recommendations, evidence/report, login focus, and approval surfaces.
- Remediation approval UI shows preflight checks, approval status, pre-state snapshots, blast radius, manual fallback, and a disabled queue affordance without adding provider write execution.
- `pnpm test:e2e -- --grep "@ui-smoke"` now runs the static UI smoke check. Browser-grade Playwright screenshots remain deferred in GAP-031 until the served web runtime exists.
- GAP-009 is resolved for the design-system decision; GAP-031 tracks the deferred served runtime and screenshot harness.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand web dashboard reports`
- `pnpm test:e2e -- --grep "@ui-smoke"`

## Completed Prompt 10 / PLAN_M11: OIDC/Social Login Callback Implementation

Completed on 2026-04-30.

Summary:
- `@puresoc/auth-oidc` now implements disabled-by-default Microsoft Entra, Google, and GitHub user sign-in callbacks through the auth abstraction, separate from Microsoft 365 managed-provider consent.
- Callback state, nonce, PKCE verifier exchange, issuer, audience, expiry, signature status, verified email, and provider subject are validated before session creation.
- Email collisions require a signed-in user to explicitly approve account linking; email alone is not trusted.
- Social-login sessions reuse the existing PureSOC session model, and login, failed login, account-linked, and account-link-rejected paths write audit events without serializing OAuth codes, tokens, state, nonce, cookies, or PKCE verifiers.
- API routes now expose `POST /auth/oidc/:provider/begin` and `GET|POST /auth/oidc/:provider/callback`.
- GAP-003 is resolved for callback/account-linking implementation; GAP-032 tracks live provider registration, callback smoke, secret rotation, and deployed cookie validation.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand auth oidc social-login session audit redaction`

## Completed Prompt 11 / PLAN_M12: Microsoft 365 Read-Only Module Expansion

Completed on 2026-04-30.

Summary:
- Microsoft Learn endpoint and permission assumptions were revalidated for Conditional Access policies, Entra directory audit logs, Entra sign-in logs, Secure Score, Defender XDR incidents, and Defender XDR alerts.
- `m365_read_baseline` now includes `Policy.Read.All` and `AuditLog.Read.All`; `m365_security_read` now includes `SecurityAlert.Read.All`; write bundles remain disabled.
- `@puresoc/provider-microsoft365` now syncs Conditional Access policies, Entra audit/sign-in events, Defender XDR incidents, and Defender XDR alerts as raw resources before provider-neutral normalization.
- Open high severity Defender incidents and alerts produce provider-neutral findings, and high severity incidents produce manual incident-triage recommendations without adding write-back.
- Missing permissions, missing licenses, deferred/unsupported posture modules, China-cloud Graph security limitations, throttling, revoked consent, and connector errors are recorded as module statuses.
- `docs/microsoft365-permissions.md` and GAP-007 were updated; GAP-033 tracks deferred Exchange, SharePoint, Teams, and Purview posture modules.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand microsoft365 graph-sync permissions redaction provider`

## Completed Prompt 12 / PLAN_M13: Full Control Catalog And Readiness Scoring Calibration

Completed on 2026-05-01.

Summary:
- The executable EU control catalog now covers all ten Article 21(2)(a)-(j) baseline categories.
- Each control has EU Directive source references, evidence requirements, and manual checklist mappings.
- Existing provider-neutral Microsoft/mock findings map to MFA, IAM/access-asset, and Defender incident controls without raw payload coupling.
- Catalog loading rejects duplicate IDs/codes, missing legal references, and dangling checklist templates.
- Stale evidence does not satisfy evidence requirements, accepted risk avoids gap generation while receiving partial score credit, and readiness-plan targets are configurable.
- ADR-015 records provisional PureSOC internal-readiness scoring and GAP-021 remains open for product/legal calibration.

Validated with:
- `pnpm lint`
- `pnpm test -- --runInBand control-catalog compliance scoring readiness-plan reports dashboards`

## Completed Prompt 13 / PLAN_M14: Security Threat Model And Release Hardening

Completed on 2026-05-01.

Summary:
- `docs/threat-model.md` now documents implemented product assets, trust boundaries, attacker model, abuse paths, threat priorities, and review focus paths.
- Session cookies now honor `PURESOC_AUTH_COOKIE_SECURE` / `AUTH_COOKIE_SECURE` while preserving the development default.
- Evidence API upload/list/download responses no longer expose internal `storageUri` values, and `storageUri` is treated as sensitive in audit/response checks.
- Regulatory review task review/reject/activate actions and source-map traceability reads are scoped to the route organization.
- Remediation action snapshots must reference the same provider connection as the action run before they can satisfy safety gates.
- GAP-029 and GAP-030 were updated; GAP-034 and GAP-035 now track request/upload limits and deployed cookie/CORS/browser auth smoke.

Validated with host-node equivalents because `pnpm`, `npx`, and `node` were not available on the sandbox PATH:
- `npm run lint`
- `npm run test -- auth audit encryption rbac evidence reports billing provider remediation regulatory`
- `node scripts/check-layout.mjs && ./node_modules/.bin/tsc -p tsconfig.base.json --noEmit`
- `./node_modules/.bin/vitest run auth audit encryption rbac evidence reports billing provider remediation regulatory`
- `./node_modules/.bin/vitest run packages/recommendations/src/__tests__/actions.spec.ts apps/api/src/__tests__/actions-remediation-approval-preflight-evidence-audit.test.ts`
- `git diff --check`

## Completed Prompt 14 / PLAN_M15: Gap Register And Prompt QA

Completed on 2026-05-01.

Summary:
- Reviewed the required architecture docs, gap register, prompt test protocol, Claude recommendations, latest M14 changed files, and latest M14 validation output.
- Confirmed the prompt suite no longer asks Codex to reimplement completed Phase A-I, M11-M14, or remediation write-runtime work.
- Identified that the active prompt queue ended at the maintenance prompt while concrete engineering gaps remained open.
- Promoted GAP-034 into Prompt 15 / `PLAN_M16` as the next testable hardening slice.
- Updated the M15 milestone, GAP-034 next action, and created the M16 handoff stub.

Validated with:
- `git diff --check`

## Completed Prompt 15 / PLAN_M16: API Request Body And Evidence Upload Limits

Completed on 2026-05-01.

Summary:
- Added typed config defaults and environment overrides for JSON request body, Stripe raw webhook body, decoded evidence upload, and HTTP scanner timeout limits.
- `parseJsonBody` and `parseRawBody` now enforce limits through early `Content-Length` checks and chunk-level streaming checks.
- Oversized parser and evidence upload failures return stable `413 payload_too_large` JSON errors.
- Evidence uploads reject oversized decoded content before scanner, storage, artifact, access-log, or audit side effects, including base64 upload content.
- HTTP upload scanner calls now abort on timeout and return failed scan results so production fail-closed upload behavior remains intact.
- GAP-034 is resolved for the current JSON/raw-body API shape; future large-file streaming/multipart work remains deferred under GAP-029/runtime upload planning.

Validated with host-node equivalents because `pnpm` is not installed on this host and Vitest 3 rejects the prompt's `--runInBand` option:
- `npm run lint`
- `npm run test -- api http evidence storage scanner config billing webhook`
- `git diff --check`

## Completed Prompt 16 / PLAN_M17: Regulatory Source Monitor Runtime Scheduling

Completed on 2026-05-01.

Summary:
- Added typed compliance config defaults and environment overrides for regulatory source monitor enablement, request timeout, stale-after days, and optional review-task organization routing.
- Added `RegulatorySourceMonitorService` with injectable metadata clients, URL-backed source checks, stale/unreachable/changed-metadata detection, sanitized metadata capture, and no automatic legal activation.
- Added idempotent open review-task behavior so repeated monitor runs do not create duplicate source/status tasks.
- Added a scheduler-facing one-shot `regulatory.monitorCountrySources` job contract under `apps/scheduler`.
- Added config, regulatory-source monitor, and scheduler tests using fake clients/fixtures only; GAP-027 is resolved for this runtime contract.
- No `PLAN_M18` was created because no next active prompt exists yet after this handoff.

Validated with host-node equivalents because `pnpm` is not installed on this host and Vitest 3 rejects the prompt's `--runInBand` option:
- `npm run lint`
- `npm run test -- regulatory source-monitor scheduler config`
- `git diff --check`
