# Codex Prompts

Use these prompts as the active PureSOC implementation tickets. This file was refreshed on 2026-05-01 after completing PLAN_M21, reviewing the implemented code, `docs/PLAN.md`, `docs/PLAN_M21.md`, `docs/threat-model.md`, `docs/prompt-tests.md`, `docs/implementation-gaps.md`, `docs/claude_rec.md`, and `docs/claude_rec2.md`, and staging Prompt 21 / `docs/PLAN_M22.md`.

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

Known major remaining work is tracked in `docs/implementation-gaps.md`, `docs/claude_rec.md`, and `docs/claude_rec2.md`.

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
- Prompt 21 / `docs/PLAN_M22.md` is staged as the next active implementation prompt.
- Continue incrementing one milestone number per prompt unless this file is intentionally reordered.

During each prompt run:

1. Create or update the current `docs/PLAN_Mx.md` at the start of implementation with scope, assumptions, expected files, validation plan, and expected gap movement.
2. Complete the implementation and validation.
3. Update the same `docs/PLAN_Mx.md` with actual changed files, validation results, acceptance status, gaps updated, residual risk, and deferred work.
4. Update `docs/codex-prompts.md` based on the implementation results, retiring completed work and rewriting or reordering the remaining prompts as needed.
5. Create the next `docs/PLAN_M{x+1}.md` stub from the next active prompt after `docs/codex-prompts.md` has been updated.

## Active Prompt Order

Recommended next sequence:

1. Prompt 21 / `docs/PLAN_M22.md`: Schema And Generated Data Drift Detection.
2. Expected next handoff after M22: i18n And Country-Pack Notification Model Decision, unless M22 implementation results require a different next slice.

Do not implement provider write actions before the deferred M9/GAP-030 runtime safety work exists and passes.

## Active Prompt 21 / PLAN_M22: Schema And Generated Data Drift Detection

Read:

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/claude_rec2.md`
- `docs/PLAN_M21.md`
- `docs/adr/ADR-005-regulatory-seed-and-source-map-format.md`

Goal:

Add cheap, deterministic drift detection for two historic failure classes: Prisma-schema versus TypeScript contract drift, and generated regulatory seed/source-map drift from source importers.

Context:

- `docs/claude_rec2.md` REC-110 notes that schema/TypeScript contract drift has been a recurring bug class.
- REC-113 notes that Romania importer outputs are deterministic but checked-in generated seed/source-map files are not diff-checked by lint.
- M21 added Prisma audit integrity fields; M22 should make future contract/schema changes harder to forget.
- Keep the check deterministic and local. Do not run live regulatory URL fetches or require Microsoft/Stripe/OIDC/provider credentials.

Deliverables:

- Add a schema/contract drift check that compares selected Prisma model fields to TypeScript contract expectations for the highest-risk persisted surfaces: audit logs, provider resources/findings/recommendations, compliance results/gaps/recommendations/readiness plans, evidence artifacts/access logs, billing events/subscriptions/entitlements, regulatory source versions/review tasks, remediation action runs, generated reports, and dashboard snapshots.
- Prefer a static/scripted check that reads `code/packages/database/prisma/schema.prisma` and explicit expected field maps over broad runtime reflection that requires a live database.
- Add a generated-data drift check for Romania workbook outputs so `ro-nis2.seed.generated.json` and `ro-nis2-source-map.generated.json` cannot diverge silently from `apps/regulatory-importer` logic and the checked-in workbook.
- Wire the drift checks into `npm run lint`/`pnpm lint` only if they are fast and deterministic; otherwise add named scripts and document why lint wiring is deferred.
- Add tests for the drift-check scripts themselves, including at least one negative fixture or intentional mismatch case.
- Update docs/gaps/prompts and create `docs/PLAN_M23.md` from the next selected active prompt before final response.

Expected files:

- `code/package.json`
- `code/scripts/check-layout.mjs` or new focused drift scripts under `code/scripts/`
- `code/packages/database/src/**` or `code/tests/**` for schema/contract drift expectations
- `code/apps/regulatory-importer/src/ro/**` and/or `code/scripts/**` for generated regulatory drift checks
- `code/data/regulatory/countries/ro/ro-nis2.seed.generated.json`
- `code/data/regulatory/countries/ro/ro-nis2-source-map.generated.json`
- `README.md`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M22.md`
- `docs/PLAN_M23.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Negative constraints:

- Do not introduce a live database requirement for drift checks.
- Do not fetch public regulatory URLs or rely on live network access.
- Do not manually edit generated Romania seed/source-map outputs to make drift pass; fix importer logic or regenerate deterministically.
- Do not add provider write/remediation execution.
- Do not add Romania-specific logic outside Romania country-pack/importer surfaces.
- Do not add Microsoft-specific logic outside Microsoft provider/config surfaces.
- Do not hardcode regulatory facts in UI conditionals.
- Do not make legal certification claims.
- Do not run live Microsoft Graph, Stripe, OIDC, MinIO/S3, public regulatory URL, KMS, or provider-write smoke tests.

Tests and acceptance commands:

Run from `code/`:

```sh
pnpm lint
pnpm test -- database schema drift regulatory-import ro
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, use the host-node equivalents used in recent milestones and record the substitution in `docs/PLAN_M22.md`.

Expected gap movement:

- Address or narrow schema/TypeScript drift risk from REC-110.
- Address or narrow Romania importer generated-output drift risk from REC-113.
- Preserve GAP-030: do not enable live provider write/remediation execution.
- Preserve runtime/browser/live integration gaps unless M22 directly validates them.
- Create or update gaps for any generated artifact, Prisma model, or contract surface intentionally excluded from the first drift map.

Final response must include:

- Changed files
- Tests run
- Acceptance status
- Gaps updated
- `PLAN_M22` updated
- `PLAN_M23` created
- Codex prompts updated
- Residual risk

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
