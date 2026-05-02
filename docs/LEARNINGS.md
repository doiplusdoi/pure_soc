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
- Audit export/checkpoint data is database-only and tamper-evident, not WORM storage or external notarization. Checkpoints preserve terminal hashes for later anchoring, and checkpoint creation audits are appended after the covered segment.
- Provider connection/telemetry runtime data now uses the selected `ProviderResourceStore`; Prisma mode persists provider-neutral connection metadata, encrypted credential envelopes, permission bundles, capabilities, sync runs/modules, raw and normalized resources, findings, and recommendations.
- OIDC/social-login transient authorization state now uses the runtime-selected state store. Prisma mode persists state and nonce only as hashes, stores the PKCE verifier inside an auth-owned encrypted envelope, and requires `PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY` outside local development.
- Live PostgreSQL migration/runtime smoke is `pnpm prisma:smoke:postgres` from `code/`; it must target a disposable database URL and covers checked-in migrations plus representative Prisma repository CRUD without third-party providers or provider writes.
- Live Redis job-runtime smoke is `pnpm jobs:smoke:redis` from `code/`; it must target a local/disposable Redis URL and covers the `@puresoc/jobs` Redis-backed queue adapter without enabling provider writes or live external integrations.

## How To Add Learnings

- Add lessons that should survive across milestones and future agent sessions.
- Prefer architecture docs for system invariants and data-flow decisions.
- Prefer milestone plans for decisions that only apply to one milestone.
