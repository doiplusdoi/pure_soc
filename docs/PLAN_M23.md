# M23 Plan: i18n And Country-Pack Notification Model Decision

## Summary

Implement Prompt 22 from `docs/codex-prompts.md`: make an explicit i18n/message strategy and country-pack notification-draft model decision before expanding customer-facing notification exports or additional country packs.

Status: completed.
Created: 2026-05-01.
Started: 2026-05-01.
Completed: 2026-05-01.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/claude_rec2.md`
- `docs/PLAN_M22.md`
- `docs/adr/ADR-005-regulatory-seed-and-source-map-format.md`
- `code/packages/reports/src/**`
- `code/packages/compliance/nis2/country-packs/ro/src/**`
- `code/packages/database/prisma/schema.prisma`

## Goal

Decide how PureSOC handles localized product/report messages and how future country-pack notification drafts should be stored, versioned, and migrated without hardcoding legal facts in UI code.

## Scope

Expected implementation areas:

- ADR for locale/message ownership, fallback behavior, legal caveat handling, and source-mapped country-pack text.
- ADR or ADR section for generic versus country-specific notification draft persistence.
- Minimal contract helpers or fixtures only if needed to make the decision testable.
- Tests/static checks for any new helpers.
- Gap and prompt updates based on the decision.

Locked assumptions:

- M23 is a decision and contract-clarification milestone, not a broad UI/runtime localization implementation.
- English and Romanian locale codes are supported at the contract layer now, but Romanian product/legal copy must fall back to English until product/legal approves a Romanian legal-caveat translation.
- Country-pack source text and notification labels remain source-mapped data. M23 may add message keys and locale metadata, but must not hardcode regulatory source text into UI conditionals.
- Generic `NotificationDraft` should become the canonical future persistence target unless the ADR records a stronger reason for country-specific draft tables.
- Existing Romania draft records must keep a compatibility path because the schema already has `RoNis2NotificationDraft.notificationDraftId`.

Expected files:

- `docs/adr/ADR-016-*.md` or another next-number ADR if ADR-016 already exists
- `code/packages/reports/src/**`
- `code/packages/compliance/nis2/country-packs/core/src/**`
- `code/packages/compliance/nis2/country-packs/ro/src/**`
- `code/packages/database/src/contracts/**`
- `code/tests/**`
- `README.md`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M23.md`
- `docs/PLAN_M24.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not add provider write/remediation execution.
- Do not add Romania-specific logic outside Romania country-pack/importer surfaces.
- Do not add Microsoft-specific logic outside Microsoft provider/config surfaces.
- Do not hardcode regulatory facts in UI conditionals.
- Do not make legal certification claims.
- Do not translate or paraphrase legal/regulatory source text as authoritative unless a reviewed source provides that language.
- Do not implement a broad served frontend/i18n runtime unless the decision slice proves it is necessary.
- Do not run live Microsoft Graph, Stripe, OIDC, MinIO/S3, public regulatory URL, KMS, or provider-write smoke tests.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- reports compliance ro notification i18n
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Address or narrow i18n/message-model risk from REC-111.
- Address or narrow notification-draft model overlap from REC-112.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve runtime/browser/live integration gaps unless this milestone directly validates them.
- Update GAP-041 if notification draft surfaces are added to or intentionally remain outside drift coverage.
- Create or update gaps for deferred locale, translation, legal-review, or migration work.

## Acceptance Criteria

- ADR captures the i18n/message strategy and notification-draft model decision clearly enough for follow-up implementation.
- Legal caveat handling and source-mapped country-pack text ownership are explicit.
- Existing Romania notification behavior has a compatibility/migration posture.
- Any added helper contracts have focused tests.
- No live services or provider write paths are required.

## Completion Log

Completed 2026-05-01.

Implementation results:

- Added ADR-016 for the i18n/message strategy and country-pack notification draft model.
- Added shared locale normalization and legal-caveat message resolution with `en`/`ro` locale support and English fallback.
- Added country-pack notification envelope contracts and schema-key helpers in `@puresoc/country-packs-core`.
- Updated Romania notification draft contracts with payload schema key/version, locale/legal-caveat fallback metadata, source-mapped label message keys, and a separate no-DNSC-submission notice.
- Updated report builders and report contracts to carry legal-caveat message key, resolved locale, requested locale fallback state, and selected report locale.
- Added selected schema drift coverage for `NotificationDraft` and `RoNis2NotificationDraft`.
- Added tests for legal-caveat fallback, generic country-pack notification envelopes, and Romania source-mapped notification labels.

Changed files:

- `README.md`
- `code/README.md`
- `code/apps/api/src/compliance/nis2/ro/routes.ts`
- `code/apps/api/src/reports/routes.ts`
- `code/apps/api/src/reports/service.ts`
- `code/apps/web/src/app-data.ts`
- `code/packages/compliance/nis2/country-packs/core/package.json`
- `code/packages/compliance/nis2/country-packs/core/src/index.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-i18n-notification-model.spec.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-notification-draft.types.spec.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/index.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts`
- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/index.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/packages/reports/src/builders.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/shared/src/index.ts`
- `code/pnpm-lock.yaml`
- `code/scripts/check-schema-contract-drift.ts`
- `code/tests/i18n-notification-model.spec.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M23.md`
- `docs/PLAN_M24.md`
- `docs/adr/ADR-016-i18n-and-country-pack-notification-drafts.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available. Validation used host-node equivalents through `flatpak-spawn --host`.
- `npm run lint` passed. It reported schema drift coverage for 21 models and 331 fields, and Romania generated regulatory drift for 2 artifacts.
- `npm run test -- reports compliance ro notification i18n` passed: 26 test files, 102 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M23. ADR-016 records the decision, code contracts expose legal-caveat fallback and source-mapped notification labels, notification draft table drift coverage is narrowed, and no live provider/write/remediation path was added.

Gaps updated:

- GAP-041 narrowed for selected notification draft table drift coverage.
- GAP-042 created for Romanian product-copy approval, runtime message catalog wiring, generic notification draft persistence, and Romania draft migration/backfill.
- GAP-030 remains open; no provider write/remediation execution was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 22 / PLAN_M23 complete and stages Prompt 23 / PLAN_M24.
- `docs/PLAN_M24.md` created for Generic Notification Draft Envelope Persistence.

Residual risk:

- Romanian legal-caveat and product copy are not approved or implemented; Romanian locale currently falls back to English for the legal caveat.
- Generic `NotificationDraft` persistence, payload-envelope validation at write time, and Romania draft migration/backfill are deferred to M24/GAP-042.
- Served frontend i18n wiring and browser/runtime localization checks remain deferred under existing frontend/runtime gaps.
