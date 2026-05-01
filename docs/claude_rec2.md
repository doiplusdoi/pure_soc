# PureSOC Implementation Review 2 — Findings & Recommendations

Date: 2026-05-01
Reviewer: Claude (analysis only; no code modified)
Scope reviewed: M1–M16 implemented work + M17 in-progress prompt. All milestone plans (`docs/PLAN_M1.md`–`PLAN_M17.md`), `docs/codex-prompts.md`, `docs/implementation-gaps.md`, `docs/threat-model.md`, all 15 ADRs, the Prisma schema, every app entry point, the major package services, the evaluator/regulatory/auth/billing/evidence/action surfaces, the Compose catalog, Dockerfiles, and the test inventory.

This review complements the prior `docs/claude_rec.md` (Phase H baseline). All `REC-001`–`REC-026` items from that file have either been resolved (M2–M13) or are otherwise tracked. New findings are numbered `REC-101+`. References use `file_path:line` so they remain navigable as the codebase evolves.

---

## 1. Top-level assessment

**Strong points.** The project has done a remarkable amount of grounded scaffolding in 16 milestones:

- A complete provider-neutral compliance pipeline: catalog → evaluator → gaps → recommendations → readiness plan → reports/dashboards/evidence ([packages/compliance/core](../code/packages/compliance/core/), [packages/recommendations](../code/packages/recommendations/), [packages/dashboards](../code/packages/dashboards/), [packages/reports](../code/packages/reports/)).
- All ten Article 21(2) control groups are seeded with source-linked evidence requirements and manual checklist mappings ([nis2-control-catalog.seed.json](../code/data/regulatory/eu/nis2-control-catalog.seed.json)).
- A 1,555-line Prisma schema covering identity, providers, regulatory sources, compliance, evidence, billing, RO NIS2, and dashboards ([schema.prisma](../code/packages/database/prisma/schema.prisma)).
- A full safety-gated remediation lifecycle with preflight / approval / snapshot / verification metadata ([packages/recommendations/src/actions.ts](../code/packages/recommendations/src/actions.ts)).
- A workspace import policy enforced by a custom layout linter ([scripts/check-layout.mjs](../code/scripts/check-layout.mjs)).
- A repo-grounded threat model with 8 numbered abuse paths and concrete fixes shipped in M14 ([threat-model.md](threat-model.md)).
- A disciplined PLAN_Mx milestone protocol that materially reduces drift between docs and code ([docs/codex-prompts.md](codex-prompts.md)).
- Strong negative-constraint hygiene: Microsoft-specific/Romania-specific/legal-certification leakage are blocked by both ADRs and tests; layout linter rejects deep cross-package imports.
- 51 test files, ~155 passing tests, deterministic and runnable on host node.

**Biggest unaddressed risks.** The list below is sorted by deployability impact:

1. **The runtime never actually uses the Prisma adapters that have been built.** Every API service is wired with the in-memory implementation by default. The Prisma adapters for compliance/evidence/billing/actions/regulatory-sources are reachable only via tests. (`REC-101`).
2. **The Dockerfiles do not run the real apps.** `Dockerfile.api` and `Dockerfile.worker` execute inline Node stubs; building & running the Compose catalog produces a hollow product. (`REC-102`).
3. **The `apps/scheduler` app is a one-line constant** and `apps/worker` exposes only a job-shape contract — no queue runtime, no BullMQ. M17 is the first scheduler runtime work. (`REC-118`).
4. **A god-object in-memory repository implements 5+ unrelated repository contracts** ([memory-repository.ts:29](../code/apps/api/src/auth/memory-repository.ts#L29)). This is the only object many production paths can talk to today. (`REC-103`).
5. **The HTTP layer is a hand-rolled `node:http` server with regex routes** and no shared auth/RBAC/audit middleware ([server.ts:67](../code/apps/api/src/server.ts#L67)). The threat model assumes a hardened runtime; the implementation is a 619-line dispatcher. (`REC-104`).
6. **No CSRF / Origin protection on state-changing routes** despite session cookies being `SameSite=Lax`. (`REC-105`).
7. **No general request rate limiting** beyond `FailedLoginRateLimiter`. Stripe webhook, OIDC callback, evidence upload, action lifecycle, organization listing — none are rate-limited. (`REC-106`).

These are contract-level sound; they are runtime-level absent. The repository will be correct in tests and exposed-as-stubs in deployment until they are addressed.

**Project pace and method.** The PLAN_Mx + codex-prompts loop is producing high-quality, sequenced milestones. M14's threat model and M16's body-limit work are textbook examples of small, testable, gap-closing slices. The same loop should keep working for the runtime gaps below — most are bounded enough to fit a single milestone.

---

## 2. Critical / High recommendations

### REC-101 (Critical) — Runtime services default to in-memory; Prisma adapters are never selected

[apps/api/src/auth/services.ts:111-165](../code/apps/api/src/auth/services.ts#L111-L165) constructs every service with the in-memory implementation:

- `InMemoryComplianceResultRepository` ([line 111](../code/apps/api/src/auth/services.ts#L111))
- `InMemoryRegulatorySourceRepository` ([line 112](../code/apps/api/src/auth/services.ts#L112))
- `InMemoryRemediationActionRepository` ([line 113](../code/apps/api/src/auth/services.ts#L113))
- All other repositories share the single `InMemoryPureSocRepository`.

There is no environment-driven branch like `if (config.database.useReal) { return new PrismaXxx(client) }`, and no `PURESOC_USE_DATABASE` config knob. The `PrismaComplianceResultRepository`, `PrismaEvidenceRepository`, `PrismaBillingRepository`, `PrismaActionRepository`, and `PrismaRegulatorySourceRepository` adapters that M4–M9 added are **only exercised by adapter tests** ([packages/database/src/__tests__](../code/packages/database/src/__tests__/)). A live deployment of the API today would persist nothing.

**Impact.** GAP-026 (live PostgreSQL migration smoke), GAP-028 (Stripe runtime), GAP-029 (object storage runtime), and GAP-030 (worker execution) all assume the runtime can opt into the persistent layer — but the wiring step itself does not exist. Every milestone has built the adapter; no milestone has built the *selection*.

**Recommendation.**

1. Add a `PURESOC_PERSISTENCE_MODE=memory|prisma` config (or per-area knobs) in [`@puresoc/config`](../code/packages/config/src/index.ts).
2. Update `createApiServices` to construct Prisma-backed repositories when the mode is `prisma`, sharing one `PrismaClient` instance from `@puresoc/database`.
3. Add a "runtime wiring" smoke test that boots the API in prisma mode against an ephemeral PostgreSQL (e.g., `pglite` is already in `node_modules`) and exercises one route end-to-end through Prisma.
4. Promote this to its own milestone (suggest `PLAN_M18` after M17 ships); it is the single highest-leverage productionability move.

### REC-102 (Critical) — Dockerfiles do not run the implemented apps

[infra/docker/Dockerfile.api](../code/infra/docker/Dockerfile.api):

```dockerfile
FROM node:22-alpine
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages ./packages
COPY config ./config
CMD ["node", "-e", "require('node:http').createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ service: 'puresoc-api', status: 'ok' })); }).listen(process.env.PORT || 3001)"]
```

The `CMD` is an inline stub that returns `{status:"ok"}` and never imports `apps/api/src/server.ts`. Same shape for [Dockerfile.worker](../code/infra/docker/Dockerfile.worker) (`setInterval(() => {}, 1000)`), [Dockerfile.web](../code/infra/docker/Dockerfile.web), [Dockerfile.scheduler](../code/infra/docker/Dockerfile.scheduler), etc. There is also no `pnpm install` step, no TypeScript build (`tsc` or `tsx`), and no Prisma `generate` in the image.

**Impact.** Anyone running `docker compose up` gets a service catalog of placeholders. The threat model's assumption that "API routes are intended to be internet-reachable behind TLS in SaaS mode" ([threat-model.md:27](threat-model.md#L27)) is not satisfied by what these Dockerfiles produce. GAP-013 was prematurely marked resolved on 2026-04-28 because `docker compose config` validates — but that only checks the YAML.

**Recommendation.**

1. Add real build stages to each Dockerfile: `pnpm install --frozen-lockfile`, `pnpm prisma:generate`, `tsc -p tsconfig.base.json`, multi-stage `node:22-alpine` runtime.
2. Run the actual entrypoint (`node apps/api/dist/server.js` or `tsx apps/api/src/server.ts` for dev images).
3. Reopen GAP-013 as "Docker images do not execute implemented apps" with a Compose-build smoke test that asserts the API container responds to a real route, not just `/health`.
4. Pair with REC-101 because the runtime mode selection feeds image entrypoints.

### REC-103 (High) — `InMemoryPureSocRepository` is a god-object across unrelated bounded contexts

[apps/api/src/auth/memory-repository.ts:29-47](../code/apps/api/src/auth/memory-repository.ts#L29-L47) extends `InMemoryBillingRepository` and implements `LocalAuthRepository`, `OidcIdentityRepository`, `OrganizationRepository`, `RbacRepository`, and `EvidenceRepository`. It also stores `storedAnalyses`, `generatedReports`, and `dashboardSnapshots` directly on the same class.

**Impact.**

- Once even one Prisma adapter goes live (REC-101), the rest will still flow through this monolith, creating subtle cross-context drift.
- Tests cannot easily isolate one repository concern from the others.
- `EvidenceRepository` and billing both share state, but they have no shared invariant — a future refactor of one will keep accidentally touching the other.
- The `extends InMemoryBillingRepository` pattern hides which methods are billing-owned.

**Recommendation.** Split into one in-memory class per bounded context (`InMemoryAuthRepository`, `InMemoryEvidenceRepository`, etc.) and let `createApiServices` compose them. This is purely structural and should ride alongside REC-101 because that work has to instantiate them anyway.

### REC-104 (High) — Hand-rolled `node:http` dispatcher with regex routing and inline auth

[apps/api/src/server.ts](../code/apps/api/src/server.ts) is a 619-line `createServer` callback. Each route is a regex match + manual `sendJson(...)` + manual `request.headers.cookie` extraction. There is no shared middleware for:

- Authentication (every handler re-parses `request.headers.cookie`).
- RBAC (each route calls `requireOrganizationRole` or doesn't, with no central enforcement).
- Body parsing (path-specific decisions about `parseRawBody` vs `parseJsonBody` are duplicated).
- Audit-context propagation.
- Error mapping (wrapped only by a single try/catch around the dispatcher).
- Request logging or correlation IDs.

**Impact.** Every new route (M11 added 2 OIDC, M12 added 5 Microsoft sync, M9 added 9 action-lifecycle, M6 added 4 regulatory) increased the surface that has to remember to call the right guards. Master-plan §5 promises NestJS; the implementation chose vanilla http without an ADR explaining the deviation. The threat-model points at `server.ts` as a focus path for TM-001/TM-004/TM-008 because of this.

**Recommendation.** Either:

1. Adopt a small router (`hono`, `fastify`, or even `express` + middleware), with a single `requireAuth`/`requireOrgRole` middleware composed once. This is a 1-day refactor, not a rewrite.
2. Or write an ADR that records the deliberate choice to stay with `node:http` and at least extract a route table + middleware composition function in `server.ts` so route additions stop duplicating boilerplate.

The first option is preferable because it also gives you per-route rate limiting (REC-106) and CSRF (REC-105) for free.

### REC-105 (High) — No CSRF / Origin enforcement for browser state-changing endpoints

Session cookies are issued with `HttpOnly; SameSite=Lax` ([http.ts:138](../code/apps/api/src/http.ts#L138)). `SameSite=Lax` blocks third-party cookies on cross-site `POST`, but it permits **top-level navigation `GET`** with cookies and does **not** protect against malicious same-site iframes or compromised subdomains. There is also no `Origin` / `Referer` check on POSTs and no anti-CSRF token issued.

**Impact.** When `apps/web` becomes a real served runtime (GAP-031), or when an MSP front-end is hosted on a sibling domain, a malicious page could trigger destructive POSTs (action approval, evidence upload, billing portal session creation) on behalf of an authenticated user.

**Recommendation.**

1. Add `Origin` allowlist verification for POST/PUT/DELETE: reject if `Origin` is set and not in the allowlist.
2. Once browser UI is live, switch to `SameSite=Strict` for the session cookie or add a double-submit CSRF token cookie.
3. Add to GAP-035 (production cookie/CORS smoke) explicitly.

### REC-106 (High) — Only login is rate-limited; webhook, OIDC, evidence, actions are not

[`FailedLoginRateLimiter`](../code/packages/auth/local/src/index.ts) protects login. Nothing else is rate-limited. In particular:

- `POST /billing/stripe/webhook` accepts unlimited Stripe-signed payloads.
- `POST /auth/oidc/:provider/callback` accepts unlimited OIDC callbacks.
- `POST /organizations/:org/evidence/upload` is bounded only by configurable upload bytes (M16) but not by rate.
- The remediation action lifecycle has 9 endpoints, none rate-limited.
- All `GET` listing routes (`/organizations/:org/regulatory-sources/review-tasks`, `/organizations/:org/billing/entitlements`, etc.) accept unlimited tenant-scoped reads.

**Impact.** Webhook flooding, OIDC callback DoS, evidence upload spam, and information-leak via timing-based ID enumeration are all open. The threat model's TM-008 (oversized upload/request DoS) is partially mitigated by M16, but rate limiting was not part of that scope.

**Recommendation.** Add a token-bucket rate limiter, configurable per route family, with a per-IP and per-user dimension. Wire it as middleware (depends on REC-104). Track as a new GAP-036.

### REC-107 (High) — No startup configuration validation

[`@puresoc/config`](../code/packages/config/src/index.ts) loads typed defaults but does not validate that **required-when-mode-X** values are set. Examples:

- `PURESOC_OBJECT_STORAGE_PROVIDER=s3` does not require `PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID`. `S3ObjectStorageAdapter` is constructed with empty credentials and fails on first request.
- `PURESOC_BILLING_PROVIDER=stripe` does not require `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` at startup; Stripe routes return `503` lazily.
- `PURESOC_AUTH_COOKIE_SECURE=false` is the default; a production deployment that forgets to set it ships insecure session cookies. There is no `production`-mode check that flips it.
- The auth social-login providers can be `enabled=true` with empty `clientId`; the validation happens only when the begin route is hit.

**Impact.** Misconfigured deployments fail late (at first user request) instead of early (at boot), wasting customer trust on the first attempted upload, login, or webhook.

**Recommendation.** Add a `validateConfigForEnvironment(config)` invariant at the top of `startApiServer`. Fail fast with a clear "production requires `PURESOC_AUTH_COOKIE_SECURE=true`" / "stripe billing requires `STRIPE_SECRET_KEY`" message. Cover with `config.test.ts` cases.

### REC-108 (High) — Action-run creation has no idempotency key

[apps/api/src/actions/routes.ts](../code/apps/api/src/actions/routes.ts) `createActionRun` accepts a body and creates a fresh action run on every call. There is no idempotency key, no client-supplied `requestId`, and no dedup window.

**Impact.** Once worker execution exists (GAP-030), a network-retried client will create duplicate runs. For safety-gated remediation, "queue twice and execute the second one" is exactly the failure mode the M9 design was intended to prevent. The Prisma `provider_action_runs` table also has no uniqueness constraint on `(organizationId, recommendationId, actionKey)`.

**Recommendation.**

1. Add an optional `Idempotency-Key` request header recognized by `createActionRun`.
2. Add a `(organizationId, idempotencyKey)` unique constraint on `provider_action_runs` (or a separate ledger table).
3. Cover with a test that double-submits the same payload + key and asserts a single run.

This is a small precondition for GAP-030 to be safe to enable.

### REC-109 (High) — Audit log integrity has no append-only / tamper-evident structure

[`AuditWriter`](../code/packages/audit/src/index.ts) writes to the `AuditLog` Prisma table or `InMemoryAuditSink`. The threat model lists audit logs under "Assets and security objectives" with `I/C` ([threat-model.md:97](threat-model.md#L97)) — but the implementation has no chain-of-hashes, no signed envelope, no append-only constraint, and no per-org rotation or retention.

**Impact.** A future Postgres-level compromise (or an admin with `DELETE` on `audit_logs`) can rewrite history without leaving a trace. Customer auditability promised by the legal-caveat reports cannot be defended.

**Recommendation.**

1. Short term: add `previousHash` and `entryHash` columns to `audit_logs` and chain entries per organization.
2. Medium term: ADR-016 for audit-log integrity (rotating signing key, optional WORM export, retention policy).
3. This is a Phase K release-readiness item; surface as a new GAP-037.

---

## 3. Medium recommendations

### REC-110 (Medium) — Schema↔TS contract round-trip drift detection is not in tests

The Prisma schema has 60+ models and the TS contracts (gaps, recommendations, evidence, actions, etc.) cover ~80% of them. M3 fixed the historical drift around control IDs and severity, but there is **no test that asserts every TS contract has a Prisma model with type-compatible columns**. Schema-group tests ([packages/database/src/__tests__/database-schema.spec.ts](../code/packages/database/src/__tests__/database-schema.spec.ts)) check presence of group strings, not field type alignment.

**Impact.** When new TS fields are added, Prisma can silently lag (REC-007/REC-021 in `claude_rec.md` were exactly this). Drift is the #1 historical bug class on this project.

**Recommendation.** Add a contract-introspection test that:

1. Loads the Prisma DMMF (`Prisma.dmmf.datamodel`) for each model.
2. Asserts the TS contract for that model has a property for every non-relation field, with compatible types.
3. Fails if `findingIds: string[]` exists in TS but not as `String[]` in Prisma.

This catches drift at lint/test time instead of on first row insert.

### REC-111 (Medium) — i18n is not modeled despite Romania-first product

`User.locale` and `Organization.defaultLocale` exist, but:

- The legal caveat string is hardcoded English ([packages/reports/src/builders.ts](../code/packages/reports/src/builders.ts)).
- Romania notification drafts are produced from Romanian workbook text, but the report wrapper text is English.
- Country-pack warnings emit English strings ([evaluator.ts:62](../code/packages/compliance/core/src/evaluator.ts#L62)).
- The UI design system has no i18n hook ([packages/ui](../code/packages/ui/)).

**Impact.** A Romanian customer exporting a notification draft to DNSC gets mixed-language artifacts. This is product-visible and will surface in early demos.

**Recommendation.** Add a small `@puresoc/i18n` (or `@puresoc/shared/i18n`) layer with a typed message map keyed by `("en"|"ro")`, used by report builders, country-pack warnings, and the UI primitives. Track as new GAP-038 (or extend GAP-021 since product/legal calibration overlaps).

### REC-112 (Medium) — `NotificationDraft` and `RoNis2NotificationDraft` overlap

[schema.prisma:1464-1496](../code/packages/database/prisma/schema.prisma#L1464-L1496) declares both `NotificationDraft` (generic) and `RoNis2NotificationDraft` (Romania-specific). They share `payloadJson`, `sourceReferencesJson`, `status`, `assessmentId`, etc. The generic `NotificationDraft.notificationType` and `RoNis2NotificationDraft.classificationRunId` partly cover the same domain.

**Impact.** Future country packs (Bulgaria, Poland, …) will face the same fork choice: another `BgNis2NotificationDraft`, or shoehorn into `NotificationDraft`? The current schema does not record that decision.

**Recommendation.**

1. ADR-016 (or extend ADR-005) on country-pack table strategy: generic `notification_drafts.payloadJson` + a `country_pack_payload_schema_id` foreign key to a versioned schema record vs. country-specific tables.
2. If choosing the generic path, plan the deprecation of `RoNis2NotificationDraft`.
3. This is decision-level work, not implementation; document in a small milestone.

### REC-113 (Medium) — Romania importer outputs are not drift-checked on lint

`code/data/regulatory/countries/ro/ro-nis2.seed.generated.json` and `ro-nis2-source-map.generated.json` are checked-in artifacts produced by `apps/regulatory-importer`. Tests verify the importer is deterministic ([ro-workbook.regulatory-import.source-map.spec.ts](../code/apps/regulatory-importer/src/ro/__tests__/ro-workbook.regulatory-import.source-map.spec.ts)) but **nothing asserts that running the importer over the workbook produces the files currently checked in**.

**Impact.** Editing the importer can silently regenerate seeds during CI, and a developer can edit the JSON by hand without regenerating it from the workbook. Either case breaks the "source map is data, not React conditionals" invariant.

**Recommendation.** Add a `regenerate-and-diff` script that runs the importer in-memory, computes the JSON, and diffs against the checked-in files. Run it from `pnpm lint`. Fail loudly on drift. Cheap and high-leverage.

### REC-114 (Medium) — `RegulatorySourceReviewService.scopeTraceabilityReviewTasks` is hard to read and partially incorrect

[packages/regulatory-sources/src/index.ts:606-627](../code/packages/regulatory-sources/src/index.ts#L606-L627):

```ts
const scopedTasks = tasks.filter(
  (task) => task.organizationId === null || task.organizationId === undefined || task.organizationId === organizationId
);
const hasTenantScopedTasks = tasks.some((task) => task.organizationId !== null && task.organizationId !== undefined);
if (hasTenantScopedTasks && !tasks.some((task) => task.organizationId === organizationId)) {
  throw new RegulatorySourceReviewError("source_version_not_found", ...);
}
return scopedTasks;
```

The intent (M14 fix) was to prevent cross-org leak via the source-map traceability route. The actual logic:

- If tasks include any tenant-scoped tasks **but none for this org**, throw `404`. ✓
- If tasks are global-only, return all global. ✓
- If tasks include tenant-scoped tasks, **including for this org**, return globals + this org's tasks. ✓
- But: there is no test that covers the "tasks exist for this org plus another org" case, where the function returns globals + this-org tasks (correct) but the caller may not realize the other-org tasks were silently filtered.

**Impact.** Subtle. The behavior is right, but the readability is low and tests don't pin it.

**Recommendation.** Refactor to two helpers (`hasOtherOrgScopedTasks(tasks, orgId)`, `keepGlobalAndOrgScoped(tasks, orgId)`) and add coverage for the multi-org case.

### REC-115 (Medium) — `ProviderActionRun` has 7+ JSON columns and weak referential integrity

[schema.prisma:836-889](../code/packages/database/prisma/schema.prisma#L836-L889) on `ProviderActionRun`:

- `preflightJson`, `preStateSnapshotJson`, `postStateSnapshotJson`, `verificationJson`, `workerJobJson`, `runJson`, `sourceReferencesJson`, `preconditionsJson`.
- `evidenceArtifactIds: String[]` — array of UUID strings, **not** a foreign-key relation.
- `checklistTaskIds: String[]` — same.

**Impact.** Once persistent (REC-101), querying "actions whose snapshot is broken" requires JSON path queries; orphan evidence cannot be detected; the threat-model's TM-006 mitigation about snapshot/run consistency relies on application-layer checks only.

**Recommendation.**

1. Pull pre-state and post-state snapshot metadata into separate tables (`provider_action_pre_snapshots`, `provider_action_post_snapshots`) with proper FKs.
2. Replace `evidenceArtifactIds: String[]` with an `evidence_links` row of type `target_type='action_run'`, which already exists ([schema.prisma:1384](../code/packages/database/prisma/schema.prisma#L1384)).
3. Keep `runJson` as a freeform overflow if needed.
4. Defer until before live remediation execution (GAP-030); not blocking any current milestone.

### REC-116 (Medium) — `CountryPack.completeness` is duplicated in `Jurisdiction.countryPackStatus`

[schema.prisma:1004](../code/packages/database/prisma/schema.prisma#L1004) and [schema.prisma:1016](../code/packages/database/prisma/schema.prisma#L1016) both store `CountryPackCompleteness`. There is no DB constraint enforcing they agree, and `CountryPackVersion.completeness` adds a third copy.

**Impact.** Future writes to one will leave the others stale. The country-pack-status API ([apps/api/src/compliance/nis2](../code/apps/api/src/compliance/nis2/)) reads from one of them — the right one — but maintenance is a footgun.

**Recommendation.** Pick `CountryPack.completeness` (or `CountryPack.activeVersionId → CountryPackVersion.completeness`) as the single source of truth. Drop the duplicates. Add a test that the country-pack-status endpoint reads from the chosen source.

### REC-117 (Medium) — Synthetic manual-task IDs can collide with real checklist run item IDs

[evaluator.ts:367-372](../code/packages/compliance/core/src/evaluator.ts#L367-L372):

```ts
{ id: [input.assessmentId, control.id, "manual-checklist-not-generated"].join(":"), ... }
```

This pseudo-ID is built when `implicitManualMissing` is true. Real `ChecklistRunItem.id` values are UUIDs, so collisions are statistically zero **today**, but consumers who index by ID (e.g. a future evidence-link table that joins both) will end up with non-UUID strings in fields typed as UUIDs.

**Impact.** When `gap.manualTaskIds` flows into `compliance_gaps.manual_task_ids: String[]` and `provider_action_runs.checklistTaskIds`, a synthetic `assessment-id:control-id:manual-checklist-not-generated` string lands in those arrays alongside real UUIDs. Later JOINs against `checklist_run_items.id` will not match.

**Recommendation.** Either generate a real UUID for the synthetic record (and document it as a virtual placeholder) or namespace it (`virtual:assessment-id:control-id:…`) and exclude `virtual:*` IDs at the persistence boundary. Add a regression test in [tests/compliance-gaps-recommendations-readiness-plan-checklist.spec.ts](../code/tests/compliance-gaps-recommendations-readiness-plan-checklist.spec.ts).

### REC-118 (Medium) — `apps/scheduler` and `apps/worker` are runtime-empty

[apps/scheduler/src/index.ts](../code/apps/scheduler/src/index.ts) is one line. [apps/worker/src/index.ts](../code/apps/worker/src/index.ts) exposes `RemediationActionExecutionJob` types but no queue runner. There is no BullMQ dependency, no Redis client, no job loop. M17 will partially close this for the regulatory monitor, but the worker remains bare.

**Impact.** The Compose catalog brings up `puresoc-worker` and `puresoc-scheduler`, but neither does work. Future milestones for live billing reconciliation (GAP-028), remediation execution (GAP-030), and source monitor (M17 in progress) will need the same harness — better to add it once.

**Recommendation.** Add a small `@puresoc/jobs` package with a typed job dispatcher, a Redis-backed BullMQ adapter, and an in-memory adapter for tests. M17 should ride on this rather than reinventing it. Track as new GAP-039.

### REC-119 (Medium) — Provider-credential encryption uses an env-var fallback default key

[providers/microsoft365/src/index.ts:115](../code/packages/providers/microsoft365/src/index.ts#L115):

```ts
const defaultTokenKey = "local-dev-provider-token-key-change-me";
…
options.tokenCipher ?? createLocalMicrosoft365TokenCipher({ masterKey: process.env.PURESOC_PROVIDER_TOKEN_KEY ?? defaultTokenKey });
```

If `PURESOC_PROVIDER_TOKEN_KEY` is not set, a string `"local-dev-provider-token-key-change-me"` is used as the master key. There is no startup error, no production check, no rotation strategy.

**Impact.** A production deployment that forgets `PURESOC_PROVIDER_TOKEN_KEY` will encrypt customer Microsoft 365 OAuth tokens with a documented, public string. The threat model's TM-008 mitigation around "Microsoft connector crypto" assumes a real key.

**Recommendation.**

1. Refuse to start in `production` mode if `PURESOC_PROVIDER_TOKEN_KEY` matches the default (overlap with REC-107).
2. Add a key-rotation path: support multiple keys, identify ciphertext by key ID prefix, decrypt with whichever key matches.
3. Track as a new GAP-040 or extend GAP-007.

---

## 4. Lower-priority / housekeeping

### REC-120 (Low) — Master-plan stack vs. implementation deviation

[docs/master-plan.md §5](master-plan.md#L86) names NestJS for the API and Next.js for the web app. The implementation chose vanilla `node:http` and a string-render web layer. Neither deviation has an ADR.

**Recommendation.** Add ADR-016 (or amend ADR-001) recording the deliberate deviation, especially if the choice is to keep vanilla `node:http` (REC-104).

### REC-121 (Low) — `PORT` defaults are inconsistent across docs and code

`startApiServer` defaults to `3001` ([server.ts:66](../code/apps/api/src/server.ts#L66)). The Compose `puresoc-api` sets `PORT=3001`. The `report-renderer` Compose sets `PORT=3002`. The web app Dockerfile sets `PORT=3000` but the `apps/web` package has no served entrypoint. Consistent, but worth verifying once a real served runtime arrives (GAP-031).

### REC-122 (Low) — `OidcAuthorizationStateStore` does not purge expired records

[packages/auth/oidc/src/index.ts:67-93](../code/packages/auth/oidc/src/index.ts#L67-L93) consumes records on callback but never drops expired-and-unconsumed records. In a long-running process, the in-memory map grows.

**Recommendation.** Add `purgeExpired(now)` + a periodic call from the (yet-to-exist) job runtime (REC-118).

### REC-123 (Low) — `connector-runner` has no entrypoint that ingests a job

[apps/connector-runner/src/index.ts](../code/apps/connector-runner/src/index.ts) exports `runConnectorRunnerJob` and `connectorRunnerAppRole`, but no `main()` or process loop. The Compose service runs the placeholder Dockerfile (REC-102).

**Recommendation.** Add a tiny `cli.ts` that consumes a job from the future job runtime (REC-118) when persistence is wired (REC-101). Until then, document in `code/README.md` that `puresoc-connector-runner` is a worker library, not a process.

### REC-124 (Low) — `loadConfig()` does not warn on unknown `PURESOC_*` env vars

A typo like `PURESOC_BILLING_PROVIDR=stripe` (missing `E`) is silently ignored; the configured value stays `none`.

**Recommendation.** In `validateConfigForEnvironment` (REC-107), enumerate known prefixes and warn on `PURESOC_*` env vars that are not consumed.

### REC-125 (Low) — Vitest tests are not parallel-safe by default

`vitest run` runs tests in parallel by default. Tests use module-scoped `InMemoryPureSocRepository` constructions inside each `beforeEach`, which is fine, but cross-package integration tests in `code/tests/` are co-located. M14's completion log notes that Vitest 3.2.4 rejects `--runInBand`. As more Prisma tests are added, this will need explicit isolation.

**Recommendation.** Document the test isolation expectation in `code/tests/README.md` (or per-test `describe.concurrent` opt-in) and pin a fixed isolation strategy before live PostgreSQL adapters multiply.

### REC-126 (Low) — `code/scripts/check-layout.mjs` enforces required paths but not required ADRs

The layout linter checks that all 30+ required files exist but does not check that `docs/adr/ADR-XXX-*.md` files mentioned in `docs/codex-prompts.md` actually exist in `docs/adr/`. Not a frequent failure mode, but cheap to add.

### REC-127 (Low) — Test count for Prisma adapters is shallow

Prisma adapters have 4 test files: compliance (2 tests), evidence (1 test), actions (1 test), schema (12 tests). Granular CRUD behavior, transaction rollback, and concurrent write contention are not covered.

**Recommendation.** Once REC-101 wires Prisma at runtime, add a per-adapter "concurrent writes do not corrupt" test using an ephemeral pglite instance.

---

## 5. Observations on the planning method

### REC-128 — The PLAN_Mx + codex-prompts loop is the project's core asset

The cadence of "create PLAN_Mx → implement → update gaps → update prompts → create PLAN_M{x+1}" is producing tight, testable slices. M14 (threat model) and M16 (body limits) are exemplary — narrow scope, concrete acceptance, gap movement, residual risk. Keep this.

Two micro-improvements:

1. **Mark which gaps a milestone explicitly does *not* address.** Some milestones implicitly leave related gaps open (e.g., M9 covered action lifecycle but explicitly deferred GAP-030). PLAN_Mx already does this in "Residual risk" sections, but reading the gap register, not all open gaps cite the milestone that consciously deferred them. A gap → deferring milestone backlink would help future agents.
2. **Add a "Production vs. contract coverage" axis.** Several gaps say "resolved" because the contract test passed (e.g., GAP-013 `docker compose config`), even though the runtime is not actually exercised (REC-102). Splitting status into `contract_resolved` vs. `runtime_resolved` would make the resolved set honest.

### REC-129 — Gap inflation pattern: every milestone closes one gap and opens one or two

M5 closed GAP-025, M6 opened GAP-027, M7 opened GAP-028, M8 opened GAP-029, M9 opened GAP-030, M10 opened GAP-031, M11 opened GAP-032, M12 opened GAP-033, M14 opened GAP-034 + GAP-035, M16 closed GAP-034. The net is +6 open gaps over 11 milestones, and most of the opened ones are runtime/operational (live PostgreSQL, live Stripe, live MinIO, browser smoke, deployed cookie). This is honest accounting, but it suggests the next significant milestone should be a single "runtime wiring" milestone that addresses REC-101 + REC-102 + REC-107 in one slice — otherwise these will keep accumulating.

### REC-130 — `docs/PLAN.md` should track aggregate status

There is no top-level dashboard. `docs/codex-prompts.md` lists completed prompts, but a reader who lands on `docs/PLAN.md` (which exists at 4459 bytes — minimal) does not see "16 milestones completed, 11 open gaps, current status, next ETA". A 50-line `PLAN.md` that summarizes the live state would be high-leverage onboarding for future agents.

---

## 6. Suggested sequencing for the next 4–6 milestones

After M17 (regulatory source monitor) lands, prioritize in this order:

1. **PLAN_M18: Runtime persistence selection.** REC-101 + REC-102 + REC-107. Add `PURESOC_PERSISTENCE_MODE`, real Dockerfile build/run, startup config validation. Closes GAP-026 partially and unblocks all "live X smoke" gaps.
2. **PLAN_M19: Job runtime baseline.** REC-118. Add `@puresoc/jobs` with BullMQ + in-memory adapters, a worker process loop, and a scheduler process loop. Unblocks GAP-028 (Stripe reconciliation), GAP-030 (remediation worker), and rebases M17's monitor on a shared harness.
3. **PLAN_M20: HTTP middleware harness.** REC-104 + REC-105 + REC-106. Pick a small router, port the existing routes, add CSRF/Origin checks, add per-route rate limiting. Strong protection improvement, no new domain logic.
4. **PLAN_M21: Audit log integrity + provider key handling.** REC-109 + REC-119. Hash-chain audit, refuse-default provider key in production. ADR-016. Closes a real release-readiness risk.
5. **PLAN_M22: Schema↔TS contract drift detection + Romania importer drift.** REC-110 + REC-113. Cheap, prevents an entire bug class.
6. **PLAN_M23: i18n + country-pack model decision.** REC-111 + REC-112. Required before second country pack.

Each fits a single milestone slice with the existing PLAN_Mx + acceptance-test rhythm.

---

## 7. What this review did not check

- Live Microsoft Graph permission accuracy beyond [docs/microsoft365-permissions.md](microsoft365-permissions.md) and the M12 revalidation log (already tracked in GAP-007).
- Romania workbook semantic correctness (the importer determinism is tested; the legal interpretation is product/legal).
- Frontend visual fidelity beyond the static smoke (GAP-031).
- Live billing flows (GAP-028).
- Cryptographic primitive correctness in `Argon2idPasswordHasher` and OIDC JWKS verification — assumed correct based on Node primitives, not separately reviewed.
- Romania notification draft legal correctness — explicitly out of scope for engineering review.
- Performance characteristics under load.
- Backup/restore strategy for Postgres / object storage (out of repo scope per master-plan §5).

---

## 8. Summary table

| ID | Severity | Area | Headline |
|---|---|---|---|
| REC-101 | Critical | Runtime | API services default to in-memory; Prisma adapters never selected |
| REC-102 | Critical | Runtime | Dockerfiles run inline stubs, not the implemented apps |
| REC-103 | High | Architecture | God-object in-memory repository spans 5+ bounded contexts |
| REC-104 | High | API | 619-line `node:http` dispatcher with no shared middleware |
| REC-105 | High | Security | No CSRF / Origin enforcement on state-changing routes |
| REC-106 | High | Security | Only login is rate-limited |
| REC-107 | High | Config | No startup configuration validation |
| REC-108 | High | Remediation | Action-run creation has no idempotency key |
| REC-109 | High | Audit | Audit log lacks tamper-evident structure |
| REC-110 | Medium | Database | No schema↔TS round-trip drift test |
| REC-111 | Medium | Product | i18n is not modeled |
| REC-112 | Medium | Schema | `NotificationDraft` and `RoNis2NotificationDraft` overlap |
| REC-113 | Medium | Regulatory | Romania importer outputs not drift-checked |
| REC-114 | Medium | Regulatory | `scopeTraceabilityReviewTasks` readability/coverage |
| REC-115 | Medium | Schema | `ProviderActionRun` JSON sprawl + weak referential integrity |
| REC-116 | Medium | Schema | `CountryPack` completeness duplicated in three places |
| REC-117 | Medium | Compliance | Synthetic manual-task IDs can collide with UUIDs |
| REC-118 | Medium | Runtime | `apps/scheduler` and `apps/worker` are runtime-empty |
| REC-119 | Medium | Security | Provider-credential encryption falls back to a public default key |
| REC-120 | Low | Docs | Master-plan stack deviation (NestJS, Next.js) lacks ADR |
| REC-121 | Low | Config | `PORT` defaults inconsistent |
| REC-122 | Low | Auth | OIDC state store does not purge expired records |
| REC-123 | Low | Runtime | `connector-runner` has no process entrypoint |
| REC-124 | Low | Config | No warning for unknown `PURESOC_*` env vars |
| REC-125 | Low | Tests | Vitest parallel safety not documented |
| REC-126 | Low | Layout linter | Does not enforce ADR file existence |
| REC-127 | Low | Tests | Prisma adapter tests are shallow |
| REC-128 | Process | Planning | Add gap-deferring-milestone backlinks; split contract vs. runtime resolution |
| REC-129 | Process | Planning | Gap inflation pattern; bundle runtime gaps into one slice |
| REC-130 | Process | Docs | `docs/PLAN.md` should be a live status dashboard |
