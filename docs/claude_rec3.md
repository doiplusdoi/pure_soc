# PureSOC Go-Live Estimate

Date: 2026-05-02
Reviewer: Claude (analysis only; no files modified)
Scope reviewed: every PLAN_Mx (M1–M34 stub), `docs/PLAN.md`, `docs/master-plan.md`, `docs/implementation-gaps.md` (43 gaps), `docs/threat-model.md`, all 16 ADRs, `docs/codex-prompts.md`, the Prisma schema (1,607 lines), the `apps/api/src/server.ts` dispatcher (722 lines), the `apps/web` contract renderer, every Dockerfile, the Compose catalog, and the prior reviews `docs/claude_rec.md` and `docs/claude_rec2.md`.

Frame of reference: "go live" = a paying Romanian / EU customer can self-onboard, connect Microsoft 365 read-only, generate an internal-readiness report and Romania notification draft, pay through Stripe, and receive evidence/audit guarantees that the legal caveat truthfully describes — without exposing the operator to data-loss, takeover, or regulatory miscommunication risk.

This is **not a code-change task**. The repository is in `main` with M34 (provider-token KMS smoke) staged but unimplemented and a small set of working-tree edits to auth/services, config, M365 crypto, and PLAN_M34. No file in this estimate has been edited.

---

## 1. Headline assessment

The contract surface is impressively complete; the runtime/product surface still has a small number of large blockers.

**What is real today (M1–M33):**

- Provider-neutral compliance pipeline end-to-end: catalog → evaluator → gaps → recommendations → readiness plan → reports/dashboards/evidence ([packages/compliance/core](../code/packages/compliance/core/), [packages/recommendations](../code/packages/recommendations/)).
- All 10 Article 21(2) categories seeded with source-linked evidence ([nis2-control-catalog.seed.json](../code/data/regulatory/eu/nis2-control-catalog.seed.json)).
- Romania workbook deterministically imported with source map + classification + notification draft.
- `PURESOC_PERSISTENCE_MODE=memory|prisma` switches identity/session/org/RBAC, audit (with hash-chain), provider telemetry, OIDC transient state, evidence metadata, billing, regulatory sources, action metadata, notification drafts, and stored outputs onto a single Prisma client.
- `pnpm prisma:smoke:postgres` and `pnpm jobs:smoke:redis` provide bounded live PostgreSQL and Redis proofs.
- Worker / scheduler / connector-runner have job-runtime loops with an opt-in BullMQ Redis adapter (M19, M32).
- API middleware harness (M20): trusted-Origin/Referer checks for browser state-changing routes, configurable in-memory rate limits, request-context.
- Audit integrity (M21/M28/M33): per-org / global hash chain, redacted canonical payload, exported segments, database-only checkpoints.
- Threat model (M14) with eight numbered abuse paths, each tied to repo paths.

**What does not exist yet:**

- Anything resembling a served Next.js / React UI for a real customer. `apps/web` is a `node:http` server that returns a static HTML render of demo data ([apps/web/src/server.ts:6-25](../code/apps/web/src/server.ts#L6-L25)). No login form posts to it, no session cookie traversal, no responsive layout in a browser.
- Live Microsoft Graph onboarding against a real tenant (`docs/microsoft365-permissions.md` is reconciled with Microsoft Learn but no smoke has touched a real tenant — GAP-007 deferred portion, GAP-033).
- Live Stripe in test mode (GAP-028).
- Live MinIO / S3 / scanner / browser PDF (GAP-029).
- Provider-write executor (GAP-030).
- Live OIDC provider app registrations (GAP-032).
- Production secret custody / KMS for provider tokens (GAP-040; M34 is the in-flight planning slice but only a local-key rotation smoke).
- Multi-process BullMQ orchestration (GAP-043).
- Audit WORM / external signing (GAP-039).
- Romanian product copy and a runtime-consumed message catalog (GAP-042).
- Product-approved score weights, accepted-risk credit, and customer-facing wording (GAP-021).
- Reviewer SOP, approval UI, and operator playbook for regulatory source activation (GAP-006).
- Final Stripe products / prices / entitlement bundles approved by the business (GAP-012).

**One-sentence summary.** PureSOC has a high-quality contract harness and runtime backbone but no served UI, no live external integrations, and several product/legal decisions still owned by humans. Going live from where M33 ended is realistically **5–8 engineering milestones plus a roughly equal weight of product/legal/DevOps work that is mostly outside this repository.**

---

## 2. Go-live readiness scorecard

Status keys: `ready` = production-acceptable; `runtime-gap` = contract works, deployed runtime missing; `decision-gap` = code can ship but a non-engineering decision is missing; `not-built`.

| Area | Status | Anchor | Comment |
|---|---|---|---|
| Monorepo, package layout, Compose catalog | ready | M1, M18 | Real entrypoints in Docker; Compose `config` validates. |
| Database schema (60+ models) and contracts | ready | M3–M4 | Drift map covers 29 high-risk persisted models / 432 fields (M22–M33). |
| Live PostgreSQL migration/apply | runtime-gap (resolved on disposable DB) | M31 | GAP-026 closed for disposable; production migration discipline still operational. |
| Auth (local, MFA-ready) | ready | M11, M27 | Argon2id, hashed sessions, rate-limited login. |
| OIDC / social login | runtime-gap | M11, M30 | Contract-complete; live Microsoft Entra / Google / GitHub apps not registered (GAP-032). |
| RBAC + cross-org isolation | ready (service-layer) | M27 | RLS deferred; service-layer tests cover persisted adapters. |
| Audit chain | ready (DB-only) | M21, M28, M33 | WORM / external notarization deferred (GAP-039). |
| Provider abstraction | ready | M16 | Mock harness covers raw → finding → recommendation. |
| Microsoft 365 read-only | runtime-gap | M12 | Permission bundles match Microsoft Learn; no live tenant smoke (GAP-007 deferred portion). |
| Microsoft 365 collaboration / Purview posture | not-built | — | Returns `unsupported_api` (GAP-033). |
| Microsoft 365 token encryption | runtime-gap | M21, M34 (in flight) | Local key-ring rotation smoke planned; live KMS deferred (GAP-040). |
| Provider write / remediation execution | not-built | M9 metadata only | GAP-030 — no live executor; lifecycle metadata is solid. |
| Compliance evaluator (10 categories) | ready (engineering); decision-gap (legal) | M13 | ADR-015 score model is provisional; product/legal must approve weights and wording (GAP-021). |
| Romania country pack | ready (engineering); decision-gap (legal) | M5, M6 | Source-mapped seed; reviewer SOP and activation UI missing (GAP-006). |
| Romania notification draft | runtime-gap | M23–M25 | Generic envelope + companion link; live DNSC submission was always out-of-scope. |
| i18n (Romanian product copy + runtime catalog) | not-built | ADR-016 | Only English caveat is active (GAP-042). |
| Evidence vault contracts | ready | M8 | In-memory + Prisma adapters. |
| Evidence runtime (MinIO/S3, scanner, browser PDF, CSV, bundles) | runtime-gap | — | GAP-029. |
| Reports / dashboards | ready (JSON); runtime-gap (PDF) | M8 | Deterministic JSON; browser-grade PDF deferred. |
| Billing contracts | ready | M7 | Stripe webhook HMAC, idempotency, entitlements. |
| Live Stripe smoke + reconciliation jobs | not-built | — | GAP-028. |
| Stripe products / prices / packaging | decision-gap | — | GAP-012; placeholders only. |
| Job runtime (memory + Redis) | runtime-gap | M19, M32 | GAP-043 — multi-process orchestration / observability. |
| Web served UI (Next.js, browser smoke) | not-built | M10 contract renderer | GAP-031. |
| API middleware (CSRF / distributed RL / proxy IP) | runtime-gap | M20 | GAP-038. |
| Threat model | ready (current scope) | M14 | TM-001..TM-008 mitigations match shipped code. |
| Production secret custody / key rotation | not-built | M34 stub | Env-var / Docker-secret guidance only; no KMS adapter. |
| Backups / DR / observability | not-built | — | Out-of-scope per `master-plan.md` §5; the operator must own it before launch. |
| Legal: ToS / DPA / Privacy / DPIA / sub-processor list | not-built | — | Out of repo scope; required to take a Romanian/EU customer. |

---

## 3. Critical-path engineering steps to launch

The PLAN_Mx loop has worked. The remaining work fits roughly six to eight more milestones, then a release-readiness slice. Numbers below are a suggested sequencing; M34 is already staged.

### M34 — Provider-token KMS / rotation smoke (in flight)

Already planned in [docs/PLAN_M34.md](PLAN_M34.md). Narrows GAP-040 with a local key-ring rotation smoke and clearer custody docs without enabling live KMS.

### M35 — Served web runtime baseline

Closes GAP-031 enough to take a real first-customer screenshot.

- Pick Next.js (master-plan §5) or stay with `node:http` + a real HTML/JS pipeline; **either way add an ADR.** The current `apps/web/src/server.ts:6` is a static demo renderer — it is not a UI.
- Wire login form → `POST /auth/login` → session cookie → dashboard render against the real API.
- Install Playwright; capture desktop + mobile screenshots for dashboard / gaps / evidence / approval / login (GAP-031 acceptance).
- Add at least one screenshot diff in the lint gate.

### M36 — Live external smoke pack (Microsoft / OIDC / Stripe / MinIO)

Closes the bulk of the runtime-gap surface. This is one milestone organizationally; the work splits into four scripts that share one disposable `docker compose -f infra/compose/docker-compose.yml` profile and explicit `--smoke` env files. Each must produce a pass-or-fail JSON artifact and a redacted log.

- Microsoft 365 read-only against an Anthropic-controlled or partner test tenant: validate every read module's permission bundle, sovereign-cloud base URLs, missing-permission/missing-license module degradation, and provider token round-trip (GAP-007 deferred portion + GAP-033 deferral note).
- OIDC for Microsoft Entra, Google, and GitHub against real test apps: verify redirect URI, JWKS, callback cookies, audit events, account-link approval (GAP-032).
- Stripe in test mode: real webhook delivery, retry ordering, scheduled `stripe.syncCustomer` / `stripe.syncSubscription` / `stripe.reconcileEntitlements` jobs through the M19/M32 runtime, secret rotation runbook (GAP-028).
- MinIO/S3 + scanner + report-renderer: bucket provisioning, scanner fail-closed, browser-grade PDF, CSV table export, binary evidence bundle (GAP-029).

This is the largest single milestone — likely 2–3× the size of M32. Splitting it into M36a..M36d is reasonable.

### M37 — Romanian product copy + message catalog runtime

Closes most of GAP-042 and unblocks the first Romanian demo.

- Product/legal-approved Romanian legal caveat string.
- Product-approved Romanian message catalog covering: report wrappers, country-pack warnings, notification draft labels, dashboard score copy, error/empty states, evidence/upload affordances.
- Wire `@puresoc/i18n` (or `@puresoc/shared/i18n`) into report builders, evaluator warnings, and UI primitives so they consume the catalog instead of hardcoded English.
- Decide whether the Romania backfill helper runs lazily on read or as a one-time reviewed batch migration; document either way.

### M38 — Production deployment hardening

Closes GAP-035, GAP-038, the runtime portion of GAP-043, and starts GAP-039.

- Browser auth smoke: Secure / HttpOnly / SameSite, logout clearing, expected origin / CORS, X-Forwarded-For trust policy, OIDC callback cookies in both SaaS and in-a-box profiles.
- Distributed rate limiter (Redis-backed token bucket replacing the M20 in-memory fixed window).
- Multi-process Compose smoke for worker + scheduler + connector-runner claiming the same BullMQ queue concurrently; queue retention; metric/alert hooks; reconnect/backoff.
- Optional WORM / external signing for audit checkpoints — at minimum, periodic checkpoint export to an immutable object-storage prefix.

### M39 — Provider write / remediation execution (only if write actions are in V1)

Closes GAP-030. **Skip this milestone if V1 ships read-only**, which is the safer launch posture.

- Persisted BullMQ `action-execution` queue.
- Worker idempotency by action key + `Idempotency-Key` header (REC-108).
- Provider-specific preflight / snapshot / apply / verify / evidence tests for each enabled action template.
- Live database smoke for action persistence.
- Tighten Prisma `provider_action_runs` integrity (REC-115): foreign-key tables for snapshots, `evidence_links` instead of `evidenceArtifactIds: String[]`.

### M40 — Release-readiness audit (Phase K close-out)

The repository's existing Phase K acceptance gate, but executed end-to-end on a deployed environment.

- All eight TM threats re-walked against deployed code, not contract code.
- All open gaps either closed, accepted with a written deferral, or reassigned to a post-launch milestone.
- Romania workbook activation reviewed and signed off through GAP-006 (depends on the product/legal track below).
- ADR for any deviations from `master-plan.md` §5 (NestJS not adopted; Next.js status; etc. — REC-120).

### Rough sizing

Each of M34, M35, M37, M38 is "single milestone" sized — comparable to M14, M20, M22 in scope. M36 is roughly three to four such slices. M39 is dependent on whether V1 enables provider writes.

**If V1 ships read-only and Romania-first:** roughly six to eight milestones (M34 + M35 + M36a–d + M37 + M38 + M40).
**If V1 ships with provider writes:** add M39, plus operational risk that argues for an extra release-readiness pass.

At the historical cadence visible in the PLAN_M log (one milestone every 1–3 days of focused work plus product review time), the engineering-only path is on the order of **three to six weeks of focused build**, not counting the parallel non-engineering work below.

---

## 4. Non-engineering work that gates launch

These cannot be solved by code milestones alone. They run in parallel with M34–M40.

### Product / legal

- **Reviewer SOP + activation UI for regulatory source activation (GAP-006).** Defines who reviews what, what counts as evidence, and how activation gets approved.
- **Romanian legal caveat copy approved by Romanian counsel.** This is the literal text printed on every report and notification draft. Currently English-only.
- **Score-model approval (GAP-021).** Weights, accepted-risk credit, evidence-freshness window, customer-facing wording for "PureSOC internal readiness."
- **Stripe packaging (GAP-012).** Real Base / Pro / MSP / In-a-box products, prices, entitlement bundles, customer limits, trial policy, upgrade/downgrade behavior.
- **Decision: provider writes in V1 or read-only.** Safer answer: read-only. Drives whether M39 is in or out of the launch scope.
- **Decision: SaaS or in-a-box first?** Affects M36 and M38 emphasis. Master-plan calls out both; pick the order.

### Compliance / customer-facing legal

These are not in `docs/` and have to exist before contracting a Romanian / EU customer.

- Terms of Service.
- Data Processing Addendum (GDPR Article 28).
- Privacy Policy.
- DPIA (likely required given multi-tenant cloud telemetry processing).
- Sub-processor list (Stripe, OIDC providers, object storage, hosting, etc.).
- Security disclosures: encryption, retention, incident response SLA.
- Cybersecurity insurance policy.

### DevOps / operations

These are explicitly out of `docs/master-plan.md` §5 ("operational observability infrastructure is outside this product plan"). The operator must still own them before customer onboarding.

- CI provider chosen and wired to `pnpm lint`, `pnpm test`, `pnpm prisma:smoke:postgres`, `pnpm jobs:smoke:redis`, `docker compose ... config`. (GAP-011 marked resolved as out-of-repo, but still has to exist somewhere before launch.)
- Production hosting decision (cloud, region — Romania/EU-resident is implied).
- TLS termination model.
- Secrets custody (KMS, secret manager, Docker secrets — depends on M34 outcome).
- Backups / restore drill for PostgreSQL and object storage.
- Observability: logs, metrics, traces, alerting (especially for the threat-model detection ideas — 403/404 spikes, invalid Stripe signatures, account-link rejections, action queue transitions).
- Incident response runbook.
- On-call rota.

### Go-to-market

- First-customer onboarding script and demo dataset.
- Pricing page (depends on GAP-012).
- Sales / support inbox.
- Status page.

---

## 5. Pre-launch checklist

A short list operators can walk through before flipping the door open:

- [ ] M34–M40 (or M34–M38 + M40 for read-only) merged and validated.
- [ ] All 14 currently-Open gaps either closed or accepted with a written deferral that the operator has signed off on.
- [ ] Threat model re-walked against deployed code (not just `node:http` contract code) — every TM-00x has a live mitigation, not just a test.
- [ ] Production config validation refuses to boot with `PURESOC_AUTH_COOKIE_SECURE=false`, default `PURESOC_PROVIDER_TOKEN_KEY`, missing Stripe secrets when `BILLING_PROVIDER=stripe`, missing object-storage credentials when `OBJECT_STORAGE_PROVIDER=s3`. (REC-107 still applies; current `loadConfig` does not enforce.)
- [ ] Live Microsoft 365 smoke against a real tenant succeeds end-to-end (consent → sync → finding → recommendation → readiness plan → report → evidence).
- [ ] Live OIDC smoke for at least one of Microsoft Entra / Google / GitHub.
- [ ] Live Stripe test-mode smoke including webhook retry ordering and reconciliation cron.
- [ ] Backup/restore drill completed with a redacted runbook attached to the release.
- [ ] Romanian product copy reviewed by Romanian-speaking counsel; legal caveat signed off.
- [ ] Reviewer SOP for regulatory activation operational; reviewer accounts and audit trail tested.
- [ ] Customer ToS / DPA / Privacy / DPIA / sub-processor list published.
- [ ] Status page, support inbox, and incident-response rota live.
- [ ] At least one external party (security review or pentest) has independently looked at the deployed system, not just the repo.

---

## 6. What this estimate did not check

- The actual disposable PostgreSQL and Redis smokes (`pnpm prisma:smoke:postgres`, `pnpm jobs:smoke:redis`) were not executed by this review — only the test inventory and the M31/M32 plans were read.
- Live Microsoft Graph, Stripe, OIDC, MinIO/S3, scanner, KMS, or browser behavior — none touched.
- Romania workbook legal correctness — explicitly out of engineering scope; reviewer SOP addresses it.
- Cryptographic primitive correctness in `Argon2idPasswordHasher` and OIDC JWKS verification — assumed correct based on Node primitives, consistent with prior reviews.
- Performance under load — no load testing harness exists.
- Pricing strategy validation — out of engineering scope.
- Whether Anthropic or the operating company has the legal standing to host Romanian compliance data — out of engineering scope.

---

## 7. Working-tree note (informational only — nothing changed)

`git status` at the start of this conversation reported uncommitted edits to:

- `code/apps/api/src/auth/services.ts`
- `code/config/defaults/connectors.json`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/config/src/index.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-token-encryption.spec.ts`
- `code/packages/providers/microsoft365/src/crypto.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `docs/PLAN_M34.md`

These are consistent with M34 being mid-implementation (provider-token KMS / rotation smoke). Per the user's instruction, this estimate did not modify, stage, or revert any of them.
