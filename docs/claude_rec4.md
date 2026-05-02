# PureSOC Implementation Review 4 — Findings & Recommendations

Date: 2026-05-03
Reviewer: Claude (analysis only; no code modified, no tests run)
Scope reviewed: every commit M1–M51 (`git log` head 47674fd), the in-progress M52 working tree (rate-limit Redis adapter, middleware, config), [docs/PLAN.md](PLAN.md), [docs/master-plan.md](master-plan.md), the full [docs/implementation-gaps.md](implementation-gaps.md) (44 gaps; 14 Open, 30 Resolved), [docs/threat-model.md](threat-model.md), all 16 ADRs, [docs/PLAN_M34.md](PLAN_M34.md)–[docs/PLAN_M52.md](PLAN_M52.md), the prior reviews [docs/claude_rec.md](claude_rec.md) / [docs/claude_rec2.md](claude_rec2.md) / [docs/claude_rec3.md](claude_rec3.md), the API server/middleware/rate-limit/services surfaces under [code/apps/api/src/](../code/apps/api/src/), the served-web stub at [apps/web/src/server.ts](../code/apps/web/src/server.ts), and the Prisma schema and adapters under [code/packages/database/](../code/packages/database/).

This review extends `claude_rec.md` (Phase H baseline; REC-001..026), `claude_rec2.md` (M16 baseline; REC-101..130), and `claude_rec3.md` (M33 go-live estimate). Resolved items are not re-litigated; new findings start at `REC-201`.

---

## 1. Headline assessment

The repo has continued the disciplined PLAN_Mx cadence visible at the time of `claude_rec3.md`. In the 18 commits since (M34–M51) the team:

- Executed every "narrow gap-N to dry-run smoke" item in `claude_rec3.md` §3 — five disposable smoke commands (`pnpm provider-token:smoke`, `pnpm stripe:smoke:test-mode`, `pnpm evidence:smoke:runtime`, `pnpm microsoft365:smoke:read-only`, `pnpm oidc:smoke:callback`, `pnpm auth:smoke:deployment`) all exist and are deterministic against fake clients ([code/scripts/](../code/scripts/), gated by [external-smoke-readiness.ts](../code/packages/config/src/external-smoke-readiness.ts)).
- Built an external-smoke readiness matrix (M42), a single-target selector (M49), and a blocker-review posture (M50) that refuses to run anything live until the operator names an approved disposable target.
- Hardened the audit chain three further times (M37 retention/export policy + `fake-local` external anchor; M41 export-handoff state; checkpoint persistence in M33/M37 already shipped).
- Hardened the Redis job adapter (M36) with claim locks, retry/backoff, recovery hooks, and competing-worker disposable smoke.
- Added a Firefox WebDriver BiDi browser smoke (M40) on top of the M39 served HTTP/HTML viewport smoke.
- Locked down API middleware (M51): proxy-aware client-IP trust requires both `PURESOC_API_TRUST_FORWARDED_HEADERS=true` and a non-empty `PURESOC_API_TRUSTED_PROXY_IPS`; production startup now refuses to boot without `PURESOC_AUTH_COOKIE_SECURE=true`, `originProtection.enabled=true`, and `requireOriginOrReferer=true` ([config/src/index.ts:645-711](../code/packages/config/src/index.ts#L645-L711)).
- Built the Redis fixed-window rate-limit store ([rate-limit.ts:135-203](../code/apps/api/src/rate-limit.ts#L135-L203)) — sitting in the working tree as the in-progress M52 slice.

What has **not** moved since `claude_rec3.md`:

- **No live external smoke has actually run.** Every `pnpm *-smoke:*` command exits dry-run by default, M50 explicitly recorded `readyCandidateCount: 0` and `selectedPathId: null`, and GAP-044 ("External Live-Smoke Target Approval And Execution Deferred") was opened to track exactly this. Six other gaps (007 deferred portion, 028, 029, 030, 032, 035, 040) cannot close further without it. The runway of "narrow by adding readiness metadata" milestones has hit diminishing returns.
- **`apps/web` is still a 51-line `node:http` static-HTML renderer** ([apps/web/src/server.ts](../code/apps/web/src/server.ts)). M39/M40 instrument it with deterministic snapshots and Firefox WebDriver, but no Next.js/React runtime exists. A real first-customer demo cannot be screen-recorded out of this surface yet.
- **`InMemoryPureSocRepository` still spans 6 unrelated bounded contexts** ([memory-repository.ts:25-26](../code/apps/api/src/auth/memory-repository.ts#L25-L26)) — `LocalAuthRepository`, `OidcIdentityRepository`, `OrganizationRepository`, `RbacRepository`, `EvidenceRepository`, plus `extends InMemoryBillingRepository`. REC-103 from `claude_rec2.md`. Untouched.
- **`apps/api/src/server.ts` is still a 722-line `node:http` regex dispatcher** with no real router or shared per-route middleware composition. REC-104 from `claude_rec2.md`. Untouched.
- **`createActionRun` still has no idempotency key.** A network-retried client creates duplicate `provider_action_runs` rows; the only `@@unique` constraints in the schema are on resource identity, sessions, and OIDC state hashes — none on action-run dedup. REC-108 from `claude_rec2.md`. Untouched.
- **Romanian product copy is still not approved or wired.** ADR-016 + M23–M25 give the *shape*, but [shared/src/index.ts:50](../code/packages/shared/src/index.ts#L50) still has `legalCaveatMessages = { en: PURESOC_LEGAL_CAVEAT }` only; reports emit `legalCaveatFallbackUsed: true` for any RO request. GAP-042. Untouched.
- **In-process audit hash-chain anchor**. M28 explicitly uses an in-process anchor for same-process writes; multi-process append ordering and concurrent-write conflict handling are not hardened. The threat model (TM under "Audit logs" — `I/C`) and GAP-039 acknowledge it; nothing has closed it.

**One-sentence summary.** The platform is now exceptionally well instrumented for a first live external smoke and a first served web demo, but it has spent four milestones building the *scaffolding* for those proofs while the proofs themselves, the long-known internal architecture cleanups (REC-103, REC-104, REC-108), and the served-UI/Romanian-copy product slices have stayed deferred. The next 1–2 milestones should pivot from readiness instrumentation to an actual customer-shaped demonstration.

---

## 2. Status of prior recommendations

### From `claude_rec.md` (Phase H baseline) — REC-001..REC-026

All 26 items were either resolved or rolled into the gap register by 2026-04-30 (per `claude_rec2.md` §1). No regression detected.

### From `claude_rec2.md` (M16 baseline) — REC-101..REC-130

| ID | Headline | Status |
|---|---|---|
| REC-101 | Runtime services default to in-memory; Prisma adapters never selected | **Resolved** by M18/M25/M26/M27/M28/M29/M30 — `PURESOC_PERSISTENCE_MODE=memory|prisma` switches every persisted bounded context. |
| REC-102 | Dockerfiles run inline stubs | **Resolved** by M18 — Docker entrypoints execute workspace code, not `node -e`. |
| REC-103 | `InMemoryPureSocRepository` god-object across 5+ contexts | **Open**. Still extends `InMemoryBillingRepository` and implements 5 unrelated repository contracts. See REC-203. |
| REC-104 | 619-line `node:http` dispatcher with no shared middleware | **Partially addressed**. Server is now 722 lines; M20 + M51 added a `createApiMiddleware` wrapper for Origin/rate-limit/request-context concerns ([middleware.ts](../code/apps/api/src/middleware.ts)). The regex-dispatch body of `server.ts` and per-route boilerplate were not factored. See REC-204. |
| REC-105 | No CSRF/Origin protection | **Resolved** by M20 (Origin/Referer allowlist) + M51 (production-required strict Origin). Double-submit CSRF tokens still deferred until served browser runtime. |
| REC-106 | Only login is rate-limited | **Resolved** by M20 (route-family rate limits, default in-memory) + M51 (injectable store) + M52 in flight (Redis-backed store). |
| REC-107 | No startup configuration validation | **Resolved** by M18 + M21 + M37 + M38 + M48 + M51 — `validateConfigForStartup` enforces production secure cookie, Origin protection, trusted-proxy IP list, Stripe secrets, S3 secrets, scanner mode, provider-token custody, audit checkpoint provider, billing provider ([config/src/index.ts:640-925](../code/packages/config/src/index.ts#L640-L925)). |
| REC-108 | Action-run creation has no idempotency key | **Open**. `createActionRun` still creates a fresh row every call ([recommendations/src/actions.ts:404-454](../code/packages/recommendations/src/actions.ts#L404-L454)); no `@@unique([organizationId, idempotencyKey])` on `provider_action_runs`. See REC-205. |
| REC-109 | Audit log lacks tamper-evident structure | **Resolved** at the integrity level by M21/M28/M33/M37/M41 (per-org/global hash chain, redacted canonical payload, exported segments, retention policy, external-anchor handoff metadata, fake-local provider). WORM/notarized export remains explicitly deferred under GAP-039. |
| REC-110 | No schema↔TS round-trip drift test | **Partially addressed** by M22/M23/M27/M28/M29/M30/M33/M37 — drift map covers 29 high-risk persisted models / 438 fields. GAP-041 acknowledges remaining surfaces (checklist/risk-acceptance, evidence links, dashboard widgets, RO onboarding/classification, billing customers, regulatory source/decision tables). |
| REC-111 | i18n is not modeled despite Romania-first product | **Partially addressed** by M23/M24/M25 (ADR-016 + generic envelopes + `legalCaveatFallbackUsed` plumbing). Romanian product copy and a runtime-consumed message catalog are still not in code. GAP-042. |
| REC-112 | `NotificationDraft`/`RoNis2NotificationDraft` overlap | **Resolved** by M23/M24/M25 — generic `NotificationDraft.payloadJson` is the active path; Romania companion link is documented in ADR-016. Deprecation of `RoNis2NotificationDraft` not scheduled. |
| REC-113 | Romania importer outputs not drift-checked | **Resolved** by M22 — `pnpm lint` regenerates and diffs `ro-nis2.seed.generated.json` and `ro-nis2-source-map.generated.json`. |
| REC-114 | `scopeTraceabilityReviewTasks` readability | Not changed; no observed regression. Low priority. |
| REC-115 | `ProviderActionRun` JSON sprawl + weak referential integrity | **Open**. Still 7+ JSON columns + `evidenceArtifactIds: String[]` + `checklistTaskIds: String[]`. Defer until before live remediation execution (GAP-030); no current milestone is blocked. |
| REC-116 | `CountryPack.completeness` duplicated | Not changed. Low priority. |
| REC-117 | Synthetic manual-task IDs collide with UUIDs | Not changed. Low priority until persisted compliance + checklist joins exist. |
| REC-118 | `apps/scheduler` and `apps/worker` are runtime-empty | **Resolved** by M19 (job runtime baseline), M32 (Redis adapter), M36 (claim locks/recovery), M35 (action executor boundary). Multi-process production orchestration remains under GAP-043. |
| REC-119 | Provider-credential encryption falls back to a public default key | **Resolved** by M21/M34/M38/M48 — `validateConfigForStartup` rejects production with the `local-dev` key; key-ring/KMS adapter contracts exist; live KMS is GAP-040. |
| REC-120 | Master-plan stack deviation lacks ADR | **Open**. NestJS is mentioned in `master-plan.md §5.2`; the API runs on `node:http`. Next.js is mentioned for the web app; `apps/web` is 51 lines of `node:http` HTML render. No ADR records the deviation. See REC-206. |
| REC-121 | `PORT` defaults inconsistent | Not blocking. |
| REC-122 | OIDC state store does not purge expired records | **Resolved** in Prisma mode by M30 (timestamps + replay rejection); in-memory mode unchanged but ephemeral. |
| REC-123 | `connector-runner` has no entrypoint | **Resolved** by M19. |
| REC-124 | No warning for unknown `PURESOC_*` env vars | Not changed. Low priority. |
| REC-125 | Vitest parallel safety not documented | Not changed. |
| REC-126 | Layout linter does not enforce ADR file existence | Not changed. |
| REC-127 | Prisma adapter tests are shallow | **Largely addressed** by M27/M28/M29/M30/M31 (live PostgreSQL CRUD smoke) and the fake-Prisma test pattern. Concurrent write coverage still light — see REC-207. |
| REC-128 | The PLAN_Mx loop is the project's core asset | Confirmed — 18 more milestones at the same cadence. |
| REC-129 | Gap inflation: every milestone closes one and opens one | **Mitigated**. M34–M51 closed/narrowed many old gaps and opened only GAP-044. Net trend is now closing. |
| REC-130 | `docs/PLAN.md` should track aggregate status | **Resolved** — `PLAN.md` now has a milestone-by-milestone status block that runs M1..M51. |

### From `claude_rec3.md` (M33 go-live estimate)

The six suggested milestones (M34, M35, M36, M37, M38, M40) have all shipped, several with multiple companion slices:

| Suggested in `claude_rec3.md` | Delivered |
|---|---|
| M34 — provider-token KMS / rotation smoke | M34 ✓ + M38 (custody capability/status) + M48 (deployment readiness/runbook) |
| M35 — served web runtime baseline | **Not delivered.** M39 added a served `node:http` HTML viewport smoke; M40 added Firefox WebDriver. No Next.js/React runtime. See REC-201. |
| M36 — live external smoke pack (M365/OIDC/Stripe/MinIO) | Delivered as readiness/dry-run only (M42 + M43 + M44 + M45 + M46 + M47 + M49 + M50). **No live execution yet.** See REC-202. |
| M37 — Romanian product copy + message catalog runtime | **Not delivered.** GAP-042 still open with no Romanian text in code. See REC-208. |
| M38 — production deployment hardening | Partially delivered as M51 (proxy-aware IP, prod startup validation, rate-limit store boundary). Distributed Redis rate limiter committed in M52 working tree. Remaining: deployed browser/TLS/proxy smoke (GAP-035), WORM/external signing (GAP-039). |
| M39 — provider write / remediation execution | Skipped on purpose (read-only V1 posture). M35 added the executor boundary with the M365 executor explicitly disabled. |
| M40 — release-readiness audit | Not started. Appropriate — there's nothing to audit end-to-end on a deployed environment yet. |

The pattern is clear: when the work could be done deterministically inside the repo (M34, M36 readiness, M38 hardening) it shipped; when it required external approval (live smoke target, served web runtime, Romanian copy from counsel) it deferred behind another readiness layer.

---

## 3. New findings (REC-201+)

### REC-201 (High) — `apps/web` is still a 51-line static HTML renderer; `claude_rec3.md` M35 was not delivered

[apps/web/src/server.ts](../code/apps/web/src/server.ts) is still `createServer((req, res) => res.end(url.pathname === "/login" ? renderLoginScreen() : renderOperationalConsole(...)))`. There is no `package.json` next to it that pulls Next.js, no React runtime, no client-side state, no fetch against `apps/api`, no service-worker / routing / form-post wiring against `/auth/login`. M39 and M40 instrument this surface — they don't replace it.

Because GAP-031 was **narrowed** by M39 and M40 ("desktop/mobile snapshots / Firefox PNGs / DOM invariants"), the gap reads like the served runtime work is moving forward. It is not. The gap entry says verbatim: *"The repository still does not include a served Next.js/React runtime or Playwright configuration"* ([implementation-gaps.md:322](implementation-gaps.md#L322)).

**Impact.** A first-customer screen recording cannot be cut from this. Every demo has to either show JSON in the API, the Firefox-rendered static HTML, or imagery from a separate design tool. The threat model's TM-002/TM-005 (session theft, OIDC link abuse) assume a real browser flow that does not yet exist outside fixture-driven smoke. GAP-035 (production cookie/CORS smoke) cannot honestly close until a real browser navigates real `apps/web`.

**Recommendation.**

1. Decide and ADR (extends REC-206): Next.js, Hono+JSX, Astro, or remain on `node:http` + small SSR template.
2. Single milestone (suggest `PLAN_M53` after M52 ships):
   - Wire login form → `POST /auth/login` → cookie → `/auth/session` → render dashboard from real API, not `createOperationalConsoleDemoModel`.
   - Wire one tenant route end-to-end (suggest the dashboard snapshot or evidence list — both are `GET` and exist already).
   - Capture a real desktop + mobile screenshot diff in `pnpm lint` and replace `createOperationalConsoleDemoModel` with the shape of an actual API response.
3. Reopen GAP-031's headline state from "narrowed" to "served runtime missing" in the gap register; "narrowed by M39/M40" was true for *coverage* but not for the *served runtime* the gap is named after.

This is the single highest-leverage productionability move now that the persistence + middleware tracks have landed.

### REC-202 (High) — The dry-run readiness ladder has hit diminishing returns; one approved live smoke would close more gaps than another readiness layer

M42 (readiness matrix) → M43 (Stripe dry-run) → M44 (evidence dry-run) → M45 (M365 dry-run) → M46 (OIDC dry-run) → M47 (auth deployment dry-run) → M48 (custody readiness) → M49 (target selector) → M50 (blocker-review) → M51 (middleware lockdown).

That is 10 milestones in 2026-05-02..2026-05-03. Every one of them is technically excellent and well-tested. They share one dependency: **operator approval of a single disposable target**. M50 recorded the literal posture: `outcome: no_ready_path`, `selectedPathId: null`, `readyCandidateCount: 0`. GAP-044 captures this precisely.

**Impact.** GAP-007 deferred portion, GAP-028, GAP-029, GAP-030, GAP-032, GAP-035, GAP-040 are all *engineering complete for a disposable smoke* and are blocked on external operator action. Building more readiness layers cannot move them. Customers cannot be onboarded behind seven dry-run smokes.

**Recommendation.**

1. Treat GAP-044 as a release-management problem, not an engineering one. Explicit owner, written approval criteria, target identity, and disposable confirmation.
2. The cheapest first live target is almost certainly **`pnpm provider-token:smoke`** (no external account at all — local key-ring rotation). That should already be runnable; if it isn't, the readiness ladder has a misclassification.
3. Second cheapest: **OIDC against a personal GitHub OAuth app** (`pnpm oidc:smoke:callback --provider=github`). One person, one account, one deletion.
4. Third: **Stripe test-mode** (`sk_test_*` against a personal Stripe test account). Sandboxed by Stripe.
5. Microsoft 365 read-only and MinIO require a tenant or storage account; defer until the operator is comfortable with the smaller three.
6. **Stop adding readiness milestones until at least one runs live.** The pattern of "M42 readiness → M43 dry-run → M50 confirms-no-target" should not repeat for a second pass. If a readiness layer keeps producing `not_configured`, the readiness layer is not the bottleneck.

### REC-203 (High) — `InMemoryPureSocRepository` god-object — REC-103 has not moved in 18 milestones

[memory-repository.ts:24-26](../code/apps/api/src/auth/memory-repository.ts#L24-L26):

```ts
export class InMemoryPureSocRepository
  extends InMemoryBillingRepository
  implements LocalAuthRepository, OidcIdentityRepository, OrganizationRepository, RbacRepository, EvidenceRepository
```

The Prisma side of this was correctly split into 11 per-context repositories under [packages/database/src/repositories/](../code/packages/database/src/repositories/). The in-memory side stayed monolithic. Memory mode is the **default** in tests and any operator that omits `PURESOC_PERSISTENCE_MODE`. Every test still runs through this god-object, and `createApiServices` still wires it as `evidenceRepository`, `billingRepository`, and the inner state behind `identityRepository` ([services.ts:343-347](../code/apps/api/src/auth/services.ts#L343-L347)).

**Impact.**

- Cross-context drift is invisible: the Prisma `Evidence` adapter's behavior cannot be verified against an in-memory peer that shares storage with billing.
- Test isolation is harder than it should be: editing an evidence helper can break a billing test through the inheritance chain.
- Future refactors (audit, RBAC) keep accidentally touching adjacent contexts.

**Recommendation.**

1. Extract `InMemoryAuthRepository`, `InMemoryEvidenceRepository`, `InMemoryBillingRepository` (already exists), and remove the `extends InMemoryBillingRepository` link.
2. `createApiServices` already calls `createRuntimeRepositories` ([services.ts:311-391](../code/apps/api/src/auth/services.ts#L311-L391)) which returns a per-context map in Prisma mode. Mirror the same shape in memory mode.
3. Single milestone, fully in-repo, no external dependency. Pairs naturally with REC-204.

### REC-204 (Medium) — `apps/api/src/server.ts` is 722 lines of regex `match` + `if`; route registration scales linearly with cognitive load

The middleware composition added in M20/M51 handles request context, Origin, and rate limiting. Route-table dispatch is still a sequence of `pathname.match(...)` + `request.method === "POST"` blocks that re-extracts cookies and re-parses JSON in each handler.

**Impact.**

- Adding the next route family (e.g., served `apps/web`'s session bridge in REC-201) costs another ~30 lines of regex glue.
- Per-route audit context propagation, OpenAPI surfacing, and request-shape validation all live in handler bodies. The threat model lists `server.ts` as the central focus path for TM-001/TM-004/TM-008 because of this concentration.
- Migration cost grows with every milestone.

**Recommendation.**

1. Either:
   a. Add a tiny route table inside `server.ts`: `[{ method, pattern: RegExp, family, handler }]` and one dispatcher loop. Two-day refactor with no external dependency.
   b. Adopt `hono` (zero-dep, Node-native, Cloudflare-tested) — the middleware shape from M20/M51 maps onto it cleanly and the wrapper can stay.
2. Either way, an ADR (REC-206) should record the choice. The repo's existing `master-plan.md` answer (NestJS) is two years stale relative to the actual implementation.

### REC-205 (High) — Idempotency on `createActionRun` is still missing; this is a pre-condition of GAP-030

[actions.ts:404-454](../code/packages/recommendations/src/actions.ts#L404-L454) `createActionRun` builds a new `id` from `input.id ?? this.idFactory()` and calls `repository.saveActionRun`. There is no `Idempotency-Key` header recognized by the route, no `(organizationId, idempotencyKey)` unique constraint on `provider_action_runs`, and no in-process dedup window.

M35 ships a worker-side action executor with persisted preflight/approval/snapshot/idempotency checks at the **executor** level, but the **API** that creates the run is still racy: a network-retried `POST /organizations/.../actions/runs` makes two rows.

**Impact.** Until idempotency exists at the create-run boundary, GAP-030 cannot enable any live provider write safely — a TLS retry could create two queued runs and the worker could execute both. The threat model's TM-006 ("Unsafe future remediation") does not protect against this.

**Recommendation.**

1. Schema: add `idempotencyKey String?` and `@@unique([organizationId, idempotencyKey], where: { idempotencyKey: { not: null } })` on `provider_action_runs`.
2. Route: read `Idempotency-Key` header in `createActionRunRoute`; if present, call `repository.findActionRunByIdempotencyKey` first and return the existing row 200/idempotent on second submit.
3. Memory + Prisma adapters get one new method each.
4. Add a regression test that double-POSTs the same body + key and asserts a single row.
5. Single milestone, fully in-repo. Pairs with M52 (which wraps up the rate-limit store) naturally.

This is the single most-quoted item from `claude_rec.md` REC-014, `claude_rec2.md` REC-108, and now `claude_rec3.md` §3 M39 prerequisites; it has not closed in three reviews. The longer it waits, the larger the migration when persisted action runs already exist.

### REC-206 (Medium) — Master-plan stack deviation still lacks an ADR

`master-plan.md §5` names NestJS, Next.js, BullMQ, Playwright. The implementation is `node:http` + custom HTML render + a custom Redis queue adapter that does not depend on the BullMQ npm package + Firefox WebDriver BiDi (no Playwright in the repo).

The four deviations are defensible — `node:http` is light, `hono`-style routing is overkill at 9 packages, the Redis adapter is well-tested, Firefox WebDriver was the only browser available at M40 time. None are documented. ADR-014 (operational design system) and ADR-015 (scoring) and ADR-016 (i18n) exist; an ADR-017 stack-deviation note is the cheapest cleanup possible.

**Recommendation.** Single ADR, ~80 lines, that records (a) `node:http` + middleware composition over NestJS, (b) `node:http` HTML render → planned Next.js or hono+JSX move (depends on REC-201), (c) custom Redis queue adapter over BullMQ npm, (d) Firefox WebDriver BiDi over Playwright. Mark each as "current decision" with the explicit re-evaluation trigger.

### REC-207 (Medium) — Multi-process audit-chain append concurrency is not hardened

[packages/audit/src/](../code/packages/audit/src/) `AuditWriter` and the M28 `PrismaAuditSink` use an in-process anchor for chain previousHash lookup ([implementation-gaps.md:411](implementation-gaps.md#L411): *"loads the latest per-organization/global anchor before appending, uses an in-process anchor for same-process writes"*). The threat-model gives audit logs `I/C` and GAP-039 acknowledges *"Concurrent multi-process append ordering is not hardened beyond deterministic contract coverage."*

In a deployed environment with two API replicas behind a load balancer, two simultaneous writes for the same organization can:

- Read the same `previousHash`.
- Compute different `entryHash` values from different canonical payloads.
- Both succeed.

The chain is then no longer a chain — it forks. Verification will fail, but only after the fact, and the operator cannot tell which branch is "real."

**Impact.** Until this is closed, audit verification under any multi-replica deployment is best-effort. WORM/external signing (GAP-039) does not solve it — they observe whatever the chain stored, fork or not.

**Recommendation.**

1. Cheapest: serialize per-organization audit writes through a Postgres advisory lock (`SELECT pg_advisory_xact_lock(hash(organization_id))`) inside the same transaction as the `INSERT`.
2. Or: a Redis Redlock per organization scope, released on commit. Single-region only.
3. Or: a strict ordering column + unique `(scope, sequenceNumber)` constraint with retry-on-conflict.
4. Add a deterministic two-process contention test as the acceptance gate; the M36 contention test is a template.
5. Single milestone, fully in-repo. Should land before any production deployment that could run two API replicas — i.e., before GAP-035 closes.

### REC-208 (Medium) — Romanian message catalog still has no Romanian copy; demo path is mixed-language

[shared/src/index.ts:50](../code/packages/shared/src/index.ts#L50):

```ts
const legalCaveatMessages: Partial<Record<PureSocLocale, string>> = {
  en: PURESOC_LEGAL_CAVEAT
};
```

A report or notification draft requested with `locale=ro` returns the English caveat with `legalCaveatFallbackUsed: true`. Country-pack warnings, dashboard score copy, error/empty states — all English. The product is positioned as Romania-first (`README.md`, `master-plan.md §3`); the first-demo screenshot will show Romanian onboarding flowing into English caveat text.

GAP-042 captures it. The decision is product/legal, not engineering — but the engineering side is unblocked: ADR-016 + the catalog plumbing + the fallback metadata are all there.

**Recommendation.**

1. Product/legal owner identifies the **minimum Romanian copy set** required for a demo: legal caveat, dashboard score copy, "incomplete country-pack" warning, login form labels, evidence upload affordances, notification draft labels. ~40 strings.
2. Single milestone seeds them into the shared catalog and wires `apps/web` (post-REC-201) + report builders to consume the catalog by locale.
3. Romanian backfill helper for existing notification draft rows (M25 already wrote it; just hasn't been run against any data) decides lazy-on-read vs. one-time batch — pick lazy unless legal sign-off is uniform.
4. Romanian-counsel sign-off on the legal caveat string is the only external blocker.

### REC-209 (Low) — `PLAN_M52.md` shows the M52 work as in progress; the working tree already implements it

[PLAN_M52.md:8-9](PLAN_M52.md#L8-L9): *"Status: in progress. Created: 2026-05-03. Started: 2026-05-03."* The "Implementation results" / "Changed files" / "Validation" / "Acceptance status" / "Gaps updated" sections are all *"Pending."*

The working tree (`git status`) shows the implementation is substantively done: [rate-limit.ts:135-203](../code/apps/api/src/rate-limit.ts#L135-L203) has `RedisFixedWindowRateLimitStore` with the Lua atomic-INCR script, [config/src/index.ts:684-711](../code/packages/config/src/index.ts#L684-L711) validates `redis://` URLs and refuses `provider=memory` when `requireSharedStore=true`, the test file is modified, and `external-smoke-readiness.ts` has new lines. The PLAN_Mx workflow expects the milestone file to capture changed files / validation / acceptance status / gap-register movement before the run finishes.

**Impact.** A reader of `PLAN_M52.md` thinks the work has not started. The PLAN_Mx audit trail is the project's main asset — keeping it in sync is cheap.

**Recommendation.** Before the M52 commit, fill in "Implementation results", "Changed files", "Validation results", "Acceptance status", "Gap-register updates" (GAP-038 narrows again), and prepare `PLAN_M53.md`. Per `docs/PLAN.md §Incremental PLAN_Mx Workflow`, this is required before the prompt run finishes.

### REC-210 (Low) — Vitest test count grows linearly; no cross-cutting mutation/contract assertion

Test inventory has grown from ~155 (claude_rec2.md) to ~190 deterministic specs across 78 spec files ([code/tests/](../code/tests/) + per-package `__tests__`). The drift map in M22/M23/M27/M28/M29/M30/M33/M37 captures structural drift on 29 high-risk persisted models. There is still no single property-based test that, given a recommendation tree, asserts (gap → recommendation → readiness plan item → report → dashboard) shape preservation.

**Impact.** Future regressions in the spine `customer profile + regulatory + provider → control_results → gaps → recommendations → readiness plan → reports/dashboards` ([master-plan.md §7.2](master-plan.md#L259)) are caught by ~a dozen integration tests with hand-written shapes. A property-based / shape-preservation test would catch a class the integration tests do not.

**Recommendation.** Add one `fast-check` test (or a hand-rolled shape generator) that builds a deterministic synthetic gap tree and asserts every downstream stage preserves `controlId`, `severity`, `manualTaskIds` as an invariant. Not urgent.

---

## 4. What `claude_rec3.md`'s "go-live checklist" looks like as of M51

For a paying Romanian / EU customer self-onboarding, paying through Stripe, and receiving evidence:

| Pre-launch checklist item from `claude_rec3.md` §5 | Status as of M51 |
|---|---|
| M34–M40 (or M34–M38 + M40 for read-only) merged and validated | M34/M35/M36/M37/M38/M40/M41/M42/M43/M44/M45/M46/M47/M48/M49/M50/M51 merged. M52 in flight. **`claude_rec3.md` M35 (served web) skipped — see REC-201.** **`claude_rec3.md` M37 (Romanian copy) not started.** |
| All 14 currently-Open gaps either closed or accepted with a written deferral | 14 still open: 006, 012, 021, 028 (narrowed), 029 (narrowed), 030 (narrowed), 031 (narrowed), 032 (narrowed), 033, 035 (narrowed), 038 (narrowed), 039 (narrowed), 040 (narrowed), 041, 042, 043 (narrowed), 044 (new). None *accepted with a written deferral* — narrowing is not deferral. |
| Threat model re-walked against deployed code | Still walks contract code; no deployed code exists. |
| Production config validation refuses to boot with insecure values | **Done** by M51 + M48 + M37 + M21 (REC-107 closed). |
| Live Microsoft 365 smoke against a real tenant | Not run. Dry-run command exists. |
| Live OIDC smoke for at least one of Microsoft Entra / Google / GitHub | Not run. Dry-run command exists per provider. |
| Live Stripe test-mode smoke including webhook retry ordering | Not run. Dry-run command exists. |
| Backup/restore drill with a redacted runbook | Not addressed (out of repo per master-plan). |
| Romanian product copy reviewed by Romanian-speaking counsel | Not addressed. |
| Reviewer SOP for regulatory activation operational | Not addressed (GAP-006). |
| Customer ToS / DPA / Privacy / DPIA / sub-processor list | Not addressed (out of repo). |
| Status page, support inbox, incident-response rota | Not addressed (out of repo). |
| External party security review | Not addressed. |

Engineering progress against `claude_rec3.md`'s estimate has been excellent on the bottom-up internal work and zero on the top-down external dependencies. The blocker pattern is unchanged.

---

## 5. Suggested sequencing for M52 → M58

The following sequence prioritizes (a) closing one live external smoke, (b) shipping a real served web demo, (c) the long-deferred internal cleanups, and (d) Romanian product copy. After this run, the repo would be ready for `claude_rec3.md`'s release-readiness audit on a deployed environment.

### M52 — finish Redis rate-limit store adapter (in flight)

Already implemented in working tree. Per REC-209: fill in `PLAN_M52.md` completion log, run validation, narrow GAP-038, create `PLAN_M53.md`, commit.

### M53 — Served web runtime baseline (REC-201 + REC-206)

Closes the core of GAP-031 — not "narrows" it.

- ADR-017: stack deviations + chosen served runtime (Next.js, hono+JSX, or `node:http` + small SSR helper).
- Login form → real `/auth/login` → cookie → `/auth/session` → render dashboard from a real API response.
- One tenant route end-to-end (suggest `GET /organizations/.../dashboards/snapshots/latest` since dashboard service is persisted).
- Capture real desktop + mobile screenshots in `pnpm lint`.
- Reopen GAP-031 to "served runtime missing" before this lands; close it with this milestone.

### M54 — One approved live external smoke (REC-202)

Closes GAP-044 from `no-ready-path` to a single executed disposable smoke. Suggested order in REC-202 §1–4. Delivers concrete proof for whichever target is chosen and a redacted log artifact in the repo.

### M55 — Action-run idempotency (REC-205)

Single milestone, fully in-repo. Adds idempotency-key recognition to `createActionRunRoute`, persisted unique constraint, regression test, schema migration. Pre-condition for any later GAP-030 enablement.

### M56 — Multi-process audit-chain concurrency (REC-207)

Per-organization advisory lock on append, two-process contention test, retry-on-conflict semantics. Pre-condition for any multi-replica deployment behind GAP-035.

### M57 — Memory-repo split (REC-203) + server route table (REC-204)

Both fully in-repo, low-risk, both clear cross-cutting cognitive load. Should not be one milestone if either grows; separate them if memory-repo split touches > 10 files.

### M58 — Romanian message catalog runtime (REC-208 / `claude_rec3.md` M37)

Single milestone after M53 (so the served web has somewhere to render the Romanian copy). Romanian-counsel approval is the only external blocker; engineering side is unblocked.

After M58, the project re-enters `claude_rec3.md`'s release-readiness phase with the engineering side genuinely complete and the four external dependencies (live smoke target, Romanian counsel, regulatory reviewer SOP, Stripe pricing decision) clearly identified to product/operator.

---

## 6. What this review did not check

- The actual disposable PostgreSQL and Redis smokes (`pnpm prisma:smoke:postgres`, `pnpm jobs:smoke:redis`, `pnpm provider-token:smoke`) were not executed by this review.
- Live Microsoft Graph, Stripe, OIDC, MinIO/S3, scanner, KMS, browser behavior — none touched (consistent with the dry-run posture in the repo).
- Romania workbook legal correctness — explicitly out of engineering scope (GAP-006).
- Cryptographic primitive correctness in `Argon2idPasswordHasher`, OIDC JWKS verification, and the M21/M34/M38 token cipher — assumed correct based on Node `crypto` primitives; not separately reviewed.
- Performance / load characteristics — no load harness exists.
- Whether the operator has the legal standing to host Romanian compliance data — out of engineering scope.
- Cross-package import boundaries beyond what `pnpm lint` already covers (M5 layout linter).
- The contents of the prior `claude_rec*.md` files were re-read but not merged into a single REC namespace; old IDs in §2 link to the originating review.

---

## 7. Summary table — new findings

| ID | Severity | Area | Headline |
|---|---|---|---|
| REC-201 | High | Frontend | `apps/web` is still a 51-line static HTML render; M35 from `claude_rec3.md` was not delivered |
| REC-202 | High | External integration | Dry-run readiness ladder has hit diminishing returns; one approved live smoke would close 6 gaps |
| REC-203 | High | Architecture | `InMemoryPureSocRepository` god-object has not moved in 18 milestones (REC-103) |
| REC-204 | Medium | API | 722-line `node:http` regex dispatcher in `server.ts`; route registration scales linearly with cognitive load |
| REC-205 | High | Remediation | `createActionRun` still has no idempotency key; pre-condition of GAP-030 (REC-108) |
| REC-206 | Medium | Docs | Master-plan stack deviation (NestJS, Next.js, BullMQ, Playwright) still lacks an ADR (REC-120) |
| REC-207 | Medium | Audit integrity | Multi-process audit-chain append concurrency not hardened |
| REC-208 | Medium | i18n | Romanian message catalog has no Romanian copy; demo will be mixed-language |
| REC-209 | Low | Process | `PLAN_M52.md` is in-progress while the working tree already implements M52 |
| REC-210 | Low | Tests | No cross-cutting property/shape-preservation test for the gap → recommendation → report spine |
