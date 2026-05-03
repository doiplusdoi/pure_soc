# M58 Plan: Romanian Message Catalog Runtime

## Summary

Wire the next Romanian message-catalog runtime slice so report, notification, and selected UI copy resolve through shared locale/message contracts with explicit fallback metadata.

Status: completed.
Created: 2026-05-03.
Started: 2026-05-03.
Completed: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M57.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/packages/shared/src/index.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-i18n-notification-model.spec.ts`
- `code/packages/reports/src/builders.ts`
- `code/packages/reports/src/__tests__/report-builders.spec.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/operational-console.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Make Romanian locale behavior deterministic and runtime-consumed without pretending Romanian legal caveat text is approved when the repository only has English legal text.

## Scope

Expected implementation areas:

- Add or refine shared message-catalog resolution for supported locales `en` and `ro`.
- Preserve English legal-caveat fallback for Romanian unless approved Romanian legal copy already exists in repo.
- Wire report builders and Romania notification draft envelopes through the shared resolver.
- Add demo-safe Romanian message entries only for non-legal product copy that does not make regulatory or certification claims.
- Optionally wire the served operational console to consume catalog copy where this does not broaden the frontend runtime.
- Update GAP-042 and prompt handoff docs.

Expected files:

- `code/packages/shared/src/index.ts`
- `code/packages/compliance/nis2/country-packs/core/src/index.ts`
- `code/packages/compliance/nis2/country-packs/core/src/__tests__/country-pack-nis2.spec.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-i18n-notification-model.spec.ts`
- `code/packages/reports/src/builders.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/apps/web/src/app-data.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M58.md`
- `docs/PLAN_M59.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- Product/legal-approved Romanian legal caveat text is not assumed.
- This milestone is runtime catalog wiring and fallback metadata, not a legal translation approval milestone.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add unapproved Romanian legal-caveat text or imply legal/certification approval.
- Do not put Romania-specific copy into EU baseline modules except through country-pack/message-key data.
- Do not hardcode regulatory facts in UI conditionals.
- Do not introduce a broad i18n framework or frontend rewrite.
- Do not change report/notification payload schema keys unless tests and migration posture are updated.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- i18n ro notification reports web
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-042 for runtime message-catalog wiring and explicit fallback metadata.
- Preserve product/legal approval as the blocker for Romanian legal-caveat text if no approved wording exists.
- Preserve GAP-044; M58 must not run external smoke commands.

## Acceptance Criteria

- Locale/message resolution has deterministic tests for English, Romanian, and fallback behavior.
- Reports and Romania notification envelopes expose message keys, requested locale, resolved locale, and fallback status consistently.
- Any Romanian copy added is non-legal/demo-safe and does not claim certification or legal approval.
- `@ui-smoke` still passes if the served UI is touched.
- Prompt and gap handoff docs are updated and `docs/PLAN_M59.md` is created.

## Completion Log

Started 2026-05-03.

Implementation results:

- Added a shared message-catalog contract in `@puresoc/shared` with stable keys, supported-locale normalization, requested/resolved locale metadata, fallback reasons, message kind, and review status.
- Preserved the English legal caveat as the only approved legal caveat text; Romanian legal-caveat requests now explicitly report `missing_translation` fallback to English.
- Added demo-safe Romanian product labels for non-legal UI copy such as dashboard, sign-in, evidence/reports, approval queue, API session, and source/status labels.
- Extended generic country-pack notification envelopes with optional legal-caveat requested-locale, fallback-reason, and review-status metadata.
- Wired Romania notification draft fields and submission notice through a Romania-owned message catalog, keeping regulatory/workbook labels English/source-mapped for Romanian requests with fallback metadata.
- Wired report builders to expose legal-caveat requested-locale, fallback-reason, and review-status metadata.
- Updated the served operational console/login renderer to consume selected shared catalog labels when a locale is requested, without changing layout or adding a frontend framework.

Changed files:

- `code/README.md`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `code/apps/web/src/operational-console.ts`
- `code/packages/compliance/nis2/country-packs/core/src/__tests__/country-pack-nis2.spec.ts`
- `code/packages/compliance/nis2/country-packs/core/src/index.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-i18n-notification-model.spec.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-notification-draft.types.spec.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts`
- `code/packages/reports/src/__tests__/reports-exports.spec.ts`
- `code/packages/reports/src/builders.ts`
- `code/packages/reports/src/report.types.ts`
- `code/packages/shared/src/index.ts`
- `code/tests/i18n-notification-model.spec.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M58.md`
- `docs/PLAN_M59.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Passed: `flatpak-spawn --host npm run test -- i18n ro notification reports web` (30 files, 122 tests).
- Passed after one local shared-catalog index typing fix: `flatpak-spawn --host npm run lint`.
- Passed: `flatpak-spawn --host npm run test:e2e -- --grep @ui-smoke`.
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.
- Used host npm equivalents because sandbox-local `pnpm` is unavailable in this environment.

Acceptance status:

- Accepted. Locale/message resolution is deterministic for English, Romanian, unsupported locale fallback, legal caveat fallback, Romania notification labels, reports, and selected served UI labels. No live external services, external-smoke commands, public regulatory fetches, or provider write paths were called.

Gaps updated:

- GAP-042 narrowed for shared message-catalog runtime wiring, report/notification/UI resolver consumption, demo-safe Romanian product labels, and explicit fallback metadata. Product/legal-approved Romanian legal/regulatory copy remains open.
- GAP-044 preserved; no external-smoke commands were run.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 57 / PLAN_M58 complete and stages Prompt 58 / PLAN_M59 for a served Romania onboarding route baseline.
- `docs/PLAN_M59.md` created.

Residual risk:

- Romanian legal caveat and regulatory/workbook notification labels remain English fallback until product/legal approves Romanian copy.
- Existing persisted Romania notification drafts may need lazy or reviewed batch backfill only after approved copy exists and migration posture is selected.
