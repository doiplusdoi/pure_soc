---
title: PureSOC Status Analysis
date: 2026-05-04
author: Claude (Opus 4.7, 1M context)
scope: Repository-level status snapshot at end of M70, before M71 starts.
inputs:
  - docs/PLAN.md
  - docs/PLAN_M70.md
  - docs/PLAN_M71.md
  - docs/implementation-gaps.md
  - docs/LEARNINGS.md
  - code/README.md
  - git log
---

# Status Analysis — 2026-05-04 (post-M70)

## TL;DR

PureSOC is at **M70 implemented, M71 staged**. The repo has a thick *contract* surface (45 gaps tracked, 28 resolved, 17 open) and a thin *production runtime* surface. Most recent milestones (M58–M70) are not building new product capability — they are tightening drift coverage, smoke-artifact indexes, and Firefox-only browser traversal around an already-existing operational console. The staged M71 continues that pattern.

Risk lens: the ratio of "deferred-with-readiness-metadata" gaps to "actually shipped against real services" is now the dominant signal. Nothing live (Microsoft Graph, Stripe, KMS/HSM, deployed TLS/proxy, real OIDC apps, Playwright/Chromium) has been exercised; GAP-044 keeps blocking that on operator-approved disposable targets.

## Where the project actually stands

### Implemented (contract + in-memory + Prisma adapter)

- Schema/data contracts, multitenant org scoping, RBAC.
- Auth: local email/password, sessions, OIDC/social-login *callback contracts* with state/nonce/PKCE, account-link approval. Prisma-backed identity/org/RBAC adapter selected in Prisma mode (M27).
- EU NIS2 baseline + Romania country pack (workbook importer, generated seed/source-map artifacts, classifier, onboarding schema, notification drafts, generic envelope persistence).
- Provider-neutral connector contracts; Microsoft 365 read-only modules with fixture-backed Conditional Access, Audit, Sign-in, Secure Score, Defender XDR, etc. Provider resource store persisted in Prisma mode (M29).
- Compliance evaluator, recommendations, readiness plan, evidence metadata, report/dashboard JSON builders, billing abstraction with Stripe checkout/webhook contracts.
- Audit: hash-chain metadata per scope, transaction-scoped advisory-lock ordering (M56), export/checkpoint contracts with `none` and `fake-local` external-anchor providers.
- Job runtime baseline: typed registry, BullMQ-shaped Redis adapter with claim locks/recovery (M36), worker/scheduler/connector-runner loops.
- API middleware: trusted-Origin, request size limits, in-memory + Redis fixed-window rate limit (M52), proxy-aware client IP trust (M51), production strict-Origin requirement.
- Provider-token custody: `local-env-key-ring` + deterministic `fake-secret-manager-test`, key-ID envelopes, previous-key decrypt, runbook readiness metadata (M48).
- Served web runtime: `apps/web` proxies login/logout/session to API, renders dashboard from latest snapshot (M53), workspace selection (M64), Romania onboarding route (M59).
- Local smoke harnesses: `@ui-smoke` (HTML snapshots + artifact index, M69), `@browser-smoke` (Firefox WebDriver BiDi PNGs + visual-threshold manifest + anchor-driven section captures + artifact index, M65–M68).
- Disposable smokes: `pnpm prisma:smoke:postgres`, `pnpm jobs:smoke:redis`, `pnpm provider-token:smoke`. All require local/disposable targets.
- Dry-run readiness matrix: `pnpm external-smoke:readiness` + `pnpm external-smoke:select-target` covering Microsoft 365, Stripe, OIDC, auth deployment, evidence runtime, provider-token custody (M42, M48, M49).
- Drift checks (M22–M70): 32 selected Prisma models / 464 fields, plus generated Romania seed/source-map artifacts. **Selected, not exhaustive.**

### Deferred (acknowledged in gap register)

| Gap | Theme | What's still missing |
|---|---|---|
| GAP-006 | Legal review | Reviewer assignment, evidence standards, approval UI for activating Romania country-pack. |
| GAP-012 | Billing | Real product/price IDs, packaging, entitlement bundles, trial policy. |
| GAP-021 | Compliance | Control catalog/readiness-scoring product calibration. |
| GAP-028 | Stripe | Live test-mode reconciliation, real webhook delivery. |
| GAP-029 | Evidence runtime | Live MinIO/S3, scanner, browser-grade PDF, CSV, binary bundles. |
| GAP-030 | Remediation | Live provider-write executor (Microsoft 365 stays disabled). |
| GAP-031 | Web runtime | Full React/Next.js, cross-browser Playwright, golden-image diffs. |
| GAP-032 | OIDC | Live Microsoft Entra/Google/GitHub callback smoke. |
| GAP-033 | Microsoft posture | Exchange, SharePoint, Teams, Purview, sovereign clouds. |
| GAP-035 | Auth deployment | Deployed TLS/CORS/proxy browser smoke. |
| GAP-038 | API hardening | Live shared rate-limit store, double-submit CSRF tokens. |
| GAP-039 | Audit | WORM storage, real external notarization, legal hold, verification alerts. |
| GAP-040 | Provider tokens | Live KMS/HSM/secret-manager custody, deployed rotation, ciphertext backfill. |
| GAP-041 | Drift coverage | Risk-acceptance, RO onboarding/classification persistence, billing/regulatory tables, RO import-report drift posture (← M71 picks at this). |
| GAP-042 | i18n | Approved Romanian legal/regulatory copy + notification-draft migration. |
| GAP-043 | Queue ops | Multi-process BullMQ hardening, deployed orchestration. |
| GAP-044 | Live smoke | **No approved disposable target has ever been selected.** Selector returns `outcome: no_ready_path` on every audit (M50, M54). |

GAP-044 is the keystone — until an operator approves a disposable target, every "ready_for_disposable_smoke" path stays metadata-only.

## Recent trajectory (M58 → M70)

| Milestone | What it added | Category |
|---|---|---|
| M58 | Shared `en`/`ro` message-catalog resolver | i18n contract |
| M59 | Served `/onboarding/romania` route | UI surface |
| M60 | Romania route in `@ui-smoke` HTML snapshots | Smoke |
| M61 | Romania route in Firefox `@browser-smoke` | Smoke |
| M62 | Firefox keyboard route traversal | Smoke |
| M63 | Firefox pointer/click route traversal | Smoke |
| M64 | Workspace selection (web + API + smokes) | UI surface |
| M65 | Visual threshold metrics manifest | Smoke artifact |
| M66 | Section-anchor keyboard/pointer workflow | Smoke |
| M67 | Anchor-driven section screenshots | Smoke artifact |
| M68 | Browser-smoke artifact index JSON | Smoke artifact |
| M69 | UI-smoke artifact index JSON | Smoke artifact |
| M70 | Drift coverage for `EvidenceLink`/`ReportExport`/`DashboardWidget` | Drift |

**13 of the last 13 milestones are smoke/drift/UI-glue work.** Zero of them moved a deferred-runtime gap (GAP-028, -029, -030, -032, -033, -035, -039, -040, -043) toward live execution. M64 added a real product capability (workspace switching); the rest hardened existing surfaces.

This is consistent with the project's stated discipline (no live writes, no unapproved live external calls), but it means progress is measured in *guard rails* and *snapshot fidelity*, not in product readiness.

## Codebase shape

```
code/apps/        api, web, worker, scheduler, connector-runner,
                  regulatory-importer, report-renderer
code/packages/    audit, auth, billing, compliance, config, dashboards,
                  database, evidence, jobs, providers, recommendations,
                  regulatory-sources, reports, shared, ui
docs/             ARCHITECTURE.md, master-plan.md, PLAN_M1..PLAN_M71.md (71 milestone files),
                  17 ADRs (ADR-001..ADR-017), 4 claude_rec*.md, gap register, learnings
```

- ~247 TypeScript source files, ~83 test files (`.test.ts` / `.spec.ts`) outside `node_modules`. Reasonable test density for the contract surface.
- One commit per milestone, terse messages (`M68`, `M69`, `M70`). Author `Codex <silviu@doiplusdoi.ro>`. Branch `main`, clean, up-to-date with origin.
- 71 PLAN_Mx files. They follow the documented summary/source-inputs/scope/negative-constraints/validation/acceptance/completion-log pattern.

## What M71 commits to

From [PLAN_M71.md](PLAN_M71.md): decide whether `ro-nis2-import-report.generated.json` is lint-gated drift or explicitly diagnostic, then encode that decision in the drift script + tests + docs. Status: staged, not started. This continues to narrow GAP-041 in the same selected-coverage style as M70.

It is a small, low-risk slice. It will not move any of the deferred-runtime gaps.

## Observations and risks

1. **Smoke-artifact treadmill.** Six of the last twelve milestones (M65, M67, M68, M69, plus parts of M66/M64) were artifact-index/visual-manifest work around a Firefox-only smoke. There is real value (regression detection without Playwright), but the marginal value of additional manifest fields is dropping. Worth asking whether the next slice should keep extending smoke artifacts or pivot.
2. **GAP-044 deadlock.** Every external-smoke milestone (M42–M50) ended with "no approved live target" and the selector outputting `no_ready_path`. The blocker is operator approval of a disposable Microsoft 365 / Stripe test-mode / OIDC dev-app target — not code. Until that lands, M45/M43/M46/M47 remain dry-run-only and their value is not realized.
3. **Provider-token custody is local-only.** GAP-040: SaaS deployment cannot ship without a real KMS/HSM/secret-manager adapter. The `fake-secret-manager-test` is fixture-only and production startup rejects it. This is a known SaaS blocker, not a surprise, but it does not move with smoke/drift work.
4. **Romania legal activation is gated on humans.** GAP-006 is owned by Product/legal. Generated RO logic remains `review_required`. Code work has done what it can; the bottleneck is process.
5. **Drift coverage is deliberately partial.** GAP-041's text now lists ~15 narrowing notes from M22 → M70. The drift map has grown to 32 models / 464 fields, but checklists, risk-acceptance, RO onboarding/classification persistence, billing customers, and regulatory-source tables are still outside it. M71 picks at one more artifact (the import report). Exhaustive coverage is not on the active roadmap.
6. **Audit hardening is contract-deep, runtime-shallow.** M21/M28/M33/M37/M41/M56 added hash chains, advisory-lock ordering, retention metadata, handoff states, fake-anchor providers. None of it is WORM, none of it is externally signed, and the docs say so explicitly. Good discipline; do not let later milestones soften that language.
7. **Single-author/single-agent cadence.** All 71 milestones are committed by `Codex`. Each PLAN_Mx run also rewrites `docs/codex-prompts.md` and creates the next stub. This is reproducible but means the *only* feedback loop is the next prompt — there is no human reviewer signal in the commit graph.

## Recommended next moves (not commits, just options)

In priority order, with the understanding that each requires a conscious decision rather than another smoke-artifact slice:

1. **Unblock GAP-044.** Pick *one* disposable target (Stripe test-mode is lowest-risk, fully sandboxed, no tenant approval needed). Run `pnpm stripe:smoke:test-mode` against it. Until something runs live, M42–M50 are theoretical.
2. **Decide GAP-006 process.** Even a one-page reviewer assignment + activation checklist would let Romania country-pack legal logic move out of `review_required` for the EU/RO-baseline subset.
3. **Plan GAP-040 SaaS custody.** Adapter selection (AWS KMS vs Azure Key Vault vs HashiCorp Vault) is a one-ADR decision that gates SaaS shipping. Doing it now lets disposable smoke land before live customers.
4. **Finish M71** as scheduled (low-cost, narrows GAP-041).
5. **Avoid M72-M80 being more smoke-artifact churn.** If the next 5 milestones repeat the M65–M69 pattern, the runtime gaps will not close by themselves.

## Validation posture

Last validation (M70 completion log): `npm run drift:schema`, `npm run lint`, `npm run test -- schema drift evidence reports dashboards output` (13 files, 62 tests), `docker compose ... config`, `git diff --check` — all passed via `flatpak-spawn --host` because the local sandbox lacks `npm`/`pnpm`. **No live external calls; no provider writes; no approved live targets exercised.** This matches every recent milestone.
