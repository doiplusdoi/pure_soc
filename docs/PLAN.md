# PureSOC Project Plan

This document adapts the shared AI project template plan to PureSOC. The detailed product and implementation roadmap remains in `docs/master-plan.md`; this file records repository-level planning conventions.

## Project Brief

- Project name: PureSOC / SiSoN.
- Problem being solved: recurring EU NIS2 readiness, evidence, provider telemetry, and safe remediation workflows for SMBs, MSPs, and regulated organizations.
- Primary users: Romanian and EU SMBs, MSPs, vCISOs, compliance managers, auditors, and security operators.
- Success criteria: a Docker-first, multitenant, provider-neutral compliance operating system with Microsoft 365 as the first provider and Romania as the first full country pack.
- Non-goals: legal certification claims, provider write automation before safety controls, Microsoft-specific compliance engine logic, Romania-specific EU baseline logic.
- Key constraints: source-linked regulatory data, organization-scoped authorization, read-only provider discovery by default, evidence and audit trails from early phases.
- Target environments: local Docker Compose, SaaS deployment, and customer in-a-box installs.
- Packaging requirement: the application must be runnable through Docker Compose.
- External services and integrations: Microsoft Graph, Stripe, OIDC/social login providers, object storage, PostgreSQL, Redis, optional Keycloak broker.

## Repository Structure

- `README.md`: short project overview and startup pointer.
- `AGENTS.md`: root instructions for agents.
- `docs/`: durable project docs, source vision, prompts, plans, gap register, ADRs.
- `code/`: application monorepo, packages, services, tests, build files, runtime configuration, Compose catalog, and regulatory seed data.

## Current Status

As of 2026-05-02, M1-M45 are implemented at contract/runtime-baseline level.

- Contract-complete foundations exist for schema/data contracts, auth/org/RBAC, EU and Romania regulatory flows, provider connector contracts, Microsoft read-only modules, compliance evaluation, recommendations, readiness plans, evidence, reports, dashboards, billing, safe remediation metadata, UI primitives, OIDC/social login callbacks, request size limits, and regulatory source monitoring.
- M18 adds a runtime truth baseline: `PURESOC_PERSISTENCE_MODE=memory|prisma`, startup config validation, shared Prisma client selection for implemented adapters, and Docker entrypoints that execute workspace code instead of inline `node -e` stubs.
- M19 adds a shared job runtime baseline: typed job registry and dispatch results, in-memory idempotent queue/runner tests, BullMQ-ready adapter boundary, and worker/scheduler/connector-runner runtime loops for safety-checked remediation metadata, regulatory source monitoring, and read-only provider sync.
- M20 adds a focused API middleware baseline for the existing `node:http` server: shared request context, route-family classification, trusted-Origin/Referer checks for browser state-changing routes, and configurable in-memory fixed-window rate limiting without consuming Stripe webhook raw bodies.
- M21 adds an audit-log integrity baseline with per-organization/global hash-chain metadata plus Microsoft 365 provider-token key IDs, previous-key decrypt support, and production rejection of unsafe local-dev provider-token keys.
- M22 adds deterministic drift checks for selected high-risk Prisma schema fields versus contract expectations, plus checked-in Romania generated seed/source-map artifacts versus importer output.
- M23 adds ADR-016 for locale/message strategy and country-pack notification draft persistence, shared legal-caveat fallback contracts, source-mapped Romania notification label keys, generic notification envelope helpers, and selected notification draft table drift coverage.
- M24 adds generic notification draft envelope validation/parsing, Romania generic envelope generation beside the compatibility draft JSON, API response coverage for the generic envelope, and a Prisma-boundary notification draft repository for generic `NotificationDraft` rows plus Romania companion links.
- M25 adds notification draft runtime persistence in memory and Prisma modes, org-scoped generic notification draft create/read/list routes, Romania companion-link creation for RO registration envelopes, and a deterministic Romania legacy payload backfill helper.
- M26 adds an output repository boundary with memory and Prisma adapters for stored analysis records, generated report metadata, and dashboard snapshots. Prisma mode now marks `stored_analysis_reports_dashboards` as persisted while preserving report/dashboard behavior and generated-report evidence links.
- M27 adds a Prisma identity/session/organization/RBAC repository adapter, API runtime selection for that adapter in Prisma mode, RBAC guard wiring through the selected repository, and fake-Prisma/API coverage for org-scoped auth and role checks.
- M28 adds a Prisma audit sink selected in Prisma mode, persists redacted canonical audit payloads plus hash-chain metadata, loads per-organization/global anchors before append, and proves auth/org audit writes persist through fake-Prisma API tests.
- M29 adds a Prisma provider resource store selected in API Prisma mode for mock/Microsoft provider connections, read-only telemetry, module statuses, findings/recommendations, and compliance inputs; provider credential envelopes remain encrypted/redacted and provider write execution remains disabled.
- M30 adds a Prisma OIDC authorization-state store selected in API Prisma mode for social-login begin/callback flows; state and nonce remain hashed, PKCE verifiers persist only inside AES-GCM envelopes, pending callbacks survive service recreation, replay/expiry are rejected, and account-link safeguards remain unchanged.
- M31 adds `pnpm prisma:smoke:postgres`, a disposable PostgreSQL migration/apply and Prisma-mode CRUD smoke that runs checked-in migrations and verifies representative repository writes/reads for the Prisma-backed runtime contexts.
- M32 adds an opt-in Redis-backed queue adapter under `PURESOC_JOB_QUEUE_PROVIDER=bullmq` plus `pnpm jobs:smoke:redis`, a disposable live Redis smoke for enqueue, claim, complete, retry/failure metadata, idempotency, graceful shutdown, worker safety-validation metadata, scheduler regulatory monitor dispatch with fake metadata, and connector-runner read-only provider sync.
- M33 adds audit export/checkpoint contracts, deterministic exported-segment verification, database-only `audit_checkpoints` persistence, and organization-scoped audit export/checkpoint API routes. It explicitly keeps audit checkpoints as tamper-evident database metadata only, not WORM storage, external notarization, legal certification, or protection against a database administrator rewriting all rows.
- M34 adds an explicit Microsoft 365 provider-token `local-env-key-ring` key-provider/custody boundary, redacted custody summaries, stricter key-ring validation, and `pnpm provider-token:smoke` for local/disposable active-key encrypt/decrypt, previous-key decrypt, bad-key failure, secret-free output, and production local-dev-key rejection checks.
- M35 adds a provider-neutral remediation action executor boundary, deterministic fake/mock provider action execution, a Microsoft 365 disabled executor, and worker-side safety checks for persisted preflight, approval, pre-state snapshots, provider write-enabled state, idempotency, failure metadata, post-state snapshot/verification metadata, and audit redaction. It does not enable live Microsoft Graph writes or customer-impacting provider remediation.
- M36 hardens the Redis-backed job adapter with per-job claim locks, bounded command retry/backoff, explicit stale-running recovery and terminal cleanup hooks, queue metadata/failure-detail redaction, configurable Redis queue settings, deterministic contention/recovery/cleanup tests, and an extended disposable Redis smoke for competing worker runtime instances plus fake/read-only scheduler and connector-runner jobs.
- M37 adds audit retention/export policy metadata, explicit `none` and deterministic test-only `fake-local` external checkpoint provider contracts, persisted checkpoint provider/status/local-anchor metadata, API exposure, config defaults/env overrides, and redaction/scoping tests. It still does not claim WORM storage, real external notarization, legal certification, or database-admin-proof auditability.
- M38 adds Microsoft 365 provider-token custody capability/status metadata, deterministic test-only `fake-secret-manager-test` behavior, API/runtime config selection for the custody provider, rotation/backfill runbook metadata, expanded secret-free provider-token custody smoke, and production rejection of the fake provider. It still does not call live KMS/HSM/secret-manager APIs, perform ciphertext backfill, retire keys, or claim production custody.
- M39 replaces the static-only `@ui-smoke` wrapper with a served local web/API smoke that starts real HTTP surfaces in memory mode, fetches the operational console and login routes, writes deterministic desktop/mobile HTML viewport snapshots, checks responsive/no-obvious-overlap UI invariants, and verifies local browser-relevant auth cookies, trusted-Origin rejection/acceptance, and callback Origin exemptions without live external integrations or provider writes.
- M40 adds `@browser-smoke` using host Firefox WebDriver BiDi when available. It captures browser-generated PNG screenshots for dashboard desktop/mobile, login mobile, evidence desktop, and approvals desktop; checks browser DOM/layout invariants; verifies real browser register/login/session/logout cookie-jar behavior through a same-origin local auth proxy; and preserves the M39 HTTP fallback without live external integrations or provider writes.
- M41 adds explicit audit export handoff metadata for `database_only`, `worm_export_pending`, `externally_anchored`, and `external_anchor_failed` states; preserves failed external-anchor attempts with generic secret-free metadata; surfaces handoff status through API and Prisma mappings; and documents that immutable export, real external signing/notarization, legal hold, and verification alerting are operator-owned before production auditability claims.
- M42 adds `pnpm external-smoke:readiness`, a deterministic dry-run readiness matrix for Microsoft 365, Stripe, Microsoft/Google/GitHub OIDC, object-storage/scanner, and evidence/report runtime smokes. It reports configured, blocked, unsafe, or ready-for-disposable-smoke states with secret-free metadata and explicit live-candidate/disposable/per-provider opt-in guardrails, without calling live external services or enabling provider writes.
- M43 adds `pnpm stripe:smoke:test-mode`, a Stripe-specific disposable test-mode smoke harness that stays dry-run by default, reuses the M42 readiness preflight, refuses live execution unless Stripe readiness is `ready_for_disposable_smoke` and all disposable/test opt-ins are set, rejects `sk_live_*`, and keeps Stripe secret values, webhook secrets, Checkout/Portal URLs, and full Stripe object IDs out of output. No live Stripe account was exercised in the default validation.
- M44 adds `pnpm evidence:smoke:runtime`, an object-storage/scanner/evidence/report runtime smoke harness that stays dry-run by default, reuses the M42 readiness preflight for both storage/scanner and evidence/report paths, refuses live execution unless both paths are ready with local/test/disposable target confirmation and opt-ins, exercises renderer/scanner/S3/evidence metadata/access-log behavior through deterministic fake-runtime tests, and keeps endpoint URLs, credentials, storage URIs, full object keys, uploaded bytes, and report bodies out of output. No approved live MinIO/S3, scanner, or report-renderer target was exercised in default validation.
- M45 adds `pnpm microsoft365:smoke:read-only`, a Microsoft 365 read-only disposable tenant smoke harness that stays dry-run by default, reuses the M42 readiness preflight for `microsoft365_read_only_tenant`, refuses live execution unless readiness and disposable/test opt-ins are set, exercises app-only token, encrypted credential-envelope, provider-neutral storage, and read-only Graph module sync behavior through deterministic fake-client tests, and keeps client secrets, tokens, tenant IDs, raw tenant payloads, live user emails, endpoint URLs, and provider credential envelopes out of output. No approved live Microsoft 365 tenant was exercised in default validation.
- Runtime readiness is still partial. Persisted audit concurrency, WORM/immutable export writers, real external audit signing/notarization, live KMS/secret-manager custody, deployed provider-token rotation/backfill operations, cross-browser Playwright/Chromium/WebKit screenshot coverage, deployed TLS/CORS/proxy browser smoke, live provider/OIDC operational smoke, and live provider-write execution remain explicitly deferred in the gap register.
- Next planned milestone: `docs/PLAN_M46.md`, focused on an OIDC/social-login disposable callback smoke harness.

## Milestones

The historic phase roadmap remains useful context:

1. Phase A: template-aligned monorepo skeleton and service image catalog.
2. Phase B: database schema and core data contracts.
3. Phase C: auth, organizations, RBAC, sessions, and audit.
4. Phase D: EU NIS2 foundation and country-pack status.
5. Phase E: Romania workbook importer, classifier, onboarding schema, and notification draft.
6. Phase F: provider core, connector runner, and mock provider pipeline.
7. Phase G: Microsoft 365 consent and read-only sync.
8. Phase H: compliance engine, recommendations, readiness plan, and checklists.
9. Phase I: evidence, reports, dashboards, exports, and billing.
10. Phase J: safe remediation foundation.
11. Phase K: release readiness and threat model review.

Active work now uses incremental milestone files:

- `docs/PLAN_M1.md` records the completed template-aligned skeleton milestone.
- `docs/PLAN_M2.md` through `docs/PLAN_M45.md` record completed incremental milestones.
- `docs/PLAN_M46.md` is staged as the next active milestone and corresponds to the next prompt in `docs/codex-prompts.md`.
- Each subsequent prompt gets the next number unless `docs/codex-prompts.md` is intentionally reordered.

## Incremental PLAN_Mx Workflow

Every implementation prompt must maintain a milestone file in `docs/PLAN_Mx.md`.

At the start of a prompt run, Codex must create or update the current milestone plan with:

- summary and goal,
- source inputs,
- locked decisions and assumptions,
- scope and out-of-scope items,
- expected files and ownership,
- validation plan,
- gap-register items expected to move.

At the end of the same prompt run, Codex must update that milestone file with:

- implementation summary,
- changed files,
- validation results,
- acceptance status,
- gap-register updates,
- residual risks and deferred work.

Before finishing the prompt run, Codex must also update `docs/codex-prompts.md` based on what actually changed. Completed prompts should be retired, split, or rewritten; remaining prompts should be reordered if new gaps or implementation results make that necessary.

After updating `docs/codex-prompts.md`, Codex must create the next incremental plan stub, `docs/PLAN_M{x+1}.md`, from the next active prompt so the next run starts with a concrete milestone handoff.

## Execution Rule

Use the implementation prompts in `docs/codex-prompts.md`, but treat app paths as relative to `code/` unless a prompt explicitly names a root-level document. Every prompt run must update its `docs/PLAN_Mx.md`, update `docs/codex-prompts.md`, and prepare the next `docs/PLAN_M{x+1}.md` stub.
