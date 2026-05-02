# Learnings

This file stores durable engineering lessons for future agents working on PureSOC.
Keep entries short, specific, and actionable.

## Current Learnings

- The repository uses the shared AI project template layout: root files are for discovery and durable docs, while application code lives under `code/`.
- PureSOC path references in implementation prompts are app-relative unless they explicitly start with `docs/` or another root-level path. For example, `apps/api` means `code/apps/api`.
- The compliance engine must remain provider-neutral. Microsoft 365 details belong under `code/packages/providers/microsoft365`.
- EU NIS2 baseline logic and Romania country-pack logic must stay separate. Romania-specific code belongs under `code/packages/compliance/nis2/country-packs/ro`.
- Regulatory workbook/source mappings are application data under `code/data/regulatory`; do not hardcode workbook-derived rules in UI code.
- Provider write/remediation actions stay disabled until audit logging, approval, preflight, snapshots, verification, and evidence metadata exist.
- Cross-package TypeScript imports must use `@puresoc/*` package exports; `code/scripts/check-layout.mjs` rejects deep relative package imports, deep package subpaths, and missing workspace dependency declarations.
- Legal-caveat copy is message-keyed and falls back to English for Romanian locale until product/legal approves Romanian wording.
- Future country-pack notification drafts should use the generic `NotificationDraft.payloadJson` envelope with a versioned schema key; Romania-specific draft tables are compatibility/workflow companions, not the default pattern for new countries.
- Generic notification draft writes should validate the payload envelope semantics before persistence, including keyed legal caveat metadata and source-mapped fields.
- Runtime notification draft writes should create the generic `NotificationDraft` first; Romania companion rows only add RO workflow links such as onboarding/classification IDs.
- Stored analysis/report/dashboard runtime data uses the `OutputRecordRepository` boundary; the Prisma adapter stores analysis evidence alongside existing `compliance_result_snapshots.resultSetJson` and must preserve checklist items written by compliance-result persistence.
- Identity/session/organization/RBAC runtime data now uses the selected identity repository boundary; backend authorization checks should use `services.rbacRepository`, not the legacy in-memory `services.repository` field.
- Audit log runtime data now uses the selected audit sink boundary; Prisma mode persists redacted canonical payloads and hash metadata.
- Audit export/checkpoint data is database-only and tamper-evident, not WORM storage or external notarization. Checkpoints preserve terminal hashes for later anchoring, include retention/export policy metadata, and checkpoint creation audits are appended after the covered segment.
- The audit external checkpoint provider contract currently supports only `none` and deterministic `fake-local`; `fake-local` is test-only local metadata, not a timestamp authority, signer, KMS/HSM, WORM store, or production notarization.
- Audit export handoff metadata is descriptive runbook state. `database_only`, `worm_export_pending`, `externally_anchored`, and `external_anchor_failed` do not change the default non-WORM/non-notarized guarantees; failed anchor metadata must remain generic and secret-free.
- Provider connection/telemetry runtime data now uses the selected `ProviderResourceStore`; Prisma mode persists provider-neutral connection metadata, encrypted credential envelopes, permission bundles, capabilities, sync runs/modules, raw and normalized resources, findings, and recommendations.
- OIDC/social-login transient authorization state now uses the runtime-selected state store. Prisma mode persists state and nonce only as hashes, stores the PKCE verifier inside an auth-owned encrypted envelope, and requires `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` outside local development.
- Live PostgreSQL migration/runtime smoke is `pnpm prisma:smoke:postgres` from `code/`; it must target a disposable database URL and covers checked-in migrations plus representative Prisma repository CRUD without third-party providers or provider writes.
- Live Redis job-runtime smoke is `pnpm jobs:smoke:redis` from `code/`; it must target a local/disposable Redis URL and covers the `@puresoc/jobs` Redis-backed queue adapter without enabling provider writes or live external integrations.
- Redis-backed job claiming uses per-job claim locks and explicit stale-running recovery/terminal cleanup hooks; recovery thresholds and cleanup cadence are operator-owned and must be tuned so long-running jobs are not retried while still legitimately running.
- Provider-token custody smoke is `pnpm provider-token:smoke` from `code/`; it is local/disposable only, covers Microsoft 365 `local-env-key-ring` plus deterministic `fake-secret-manager-test` metadata, and must not print provider tokens, OAuth codes, client secrets, key material, or decrypted credential payloads.
- `fake-secret-manager-test` is a Microsoft 365 provider-token custody contract fixture only. It models key-version metadata, active/previous lookup, missing-key failure, and rotation/backfill runbook summaries without live secret-manager/KMS calls; production startup must reject it.
- Remediation worker provider execution is still fake/mock only. The M35 worker path requires persisted preflight, approval, pre-state snapshot, provider write-enabled state, and a test-injected fake executor; Microsoft 365 exports only a disabled action executor until live write contracts are explicitly implemented.
- M39 `pnpm test:e2e -- --grep @ui-smoke` is a served local web/API smoke, not a static-only vitest wrapper. It writes deterministic desktop/mobile HTML viewport snapshots and validates local auth cookie/origin behavior without Playwright/browser binaries, live external providers, object storage, scanners, KMS/secret-manager calls, public regulatory fetches, or provider writes.
- M40 `pnpm test:e2e -- --grep @browser-smoke` uses host Firefox WebDriver BiDi when available. It writes real PNG screenshots under `/tmp/puresoc-browser-smoke-*`, checks browser DOM/layout invariants, and verifies the browser cookie jar for local auth/session/logout through a same-origin local proxy; untrusted-Origin rejection and callback exemptions still use deterministic local HTTP fallback because the API does not enable broad browser CORS.
- M42 `pnpm external-smoke:readiness` is a dry-run, metadata-only readiness matrix. It must not call Microsoft Graph, Stripe, OIDC providers, object storage, scanners, KMS/secret-manager, external signing services, public regulatory URLs, or provider write executors; output may include variable names and blocker codes, but not secret values, endpoint values, storage URIs, tokens, OAuth codes, webhook secrets, cookies, or key material.
- External live-smoke readiness requires `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, a safe `PURESOC_EXTERNAL_SMOKE_TARGET_KIND`, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, and a per-provider opt-in. `ready_for_disposable_smoke` is readiness metadata only, not proof that a live smoke ran.
- M43 `pnpm stripe:smoke:test-mode` is dry-run by default and first evaluates the M42 readiness matrix. Live/test execution requires Stripe readiness `ready_for_disposable_smoke`, `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, a safe disposable/test target, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, `PURESOC_EXTERNAL_SMOKE_STRIPE=true`, `PURESOC_BILLING_PROVIDER=stripe`, `sk_test_*` credentials, a webhook secret, and non-placeholder price IDs. The command must not print Stripe secrets, webhook secrets, Checkout/Portal URLs, or full Stripe object IDs.

## How To Add Learnings

- Add lessons that should survive across milestones and future agent sessions.
- Prefer architecture docs for system invariants and data-flow decisions.
- Prefer milestone plans for decisions that only apply to one milestone.
