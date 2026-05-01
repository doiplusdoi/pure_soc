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

As of 2026-05-02, M1-M30 are implemented at contract/runtime-baseline level.

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
- Runtime readiness is still partial. Persisted audit concurrency/retention/export hardening, live Redis/BullMQ operation, external audit signing/WORM export, live KMS/key-rotation smoke, live PostgreSQL migration/apply smoke, live provider/OIDC operational smoke, and live provider-write execution remain explicitly deferred in the gap register.
- Next planned milestone: `docs/PLAN_M31.md`, the live PostgreSQL migration/apply smoke slice.

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
- `docs/PLAN_M2.md` through `docs/PLAN_M30.md` record completed incremental milestones.
- `docs/PLAN_M31.md` is staged as the next active milestone and corresponds to the next prompt in `docs/codex-prompts.md`.
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
