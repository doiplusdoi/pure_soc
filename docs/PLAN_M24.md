# M24 Plan: Generic Notification Draft Envelope Persistence

## Summary

Implement Prompt 23 from `docs/codex-prompts.md`: turn the ADR-016 notification-draft model decision into the first small persistence-oriented slice for generic `NotificationDraft.payloadJson` envelopes and Romania compatibility/workflow links.

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
- `docs/PLAN_M23.md`
- `docs/adr/ADR-016-i18n-and-country-pack-notification-drafts.md`
- `docs/adr/ADR-005-regulatory-seed-and-source-map-format.md`
- `code/packages/shared/src/**`
- `code/packages/compliance/nis2/country-packs/core/src/**`
- `code/packages/compliance/nis2/country-packs/ro/src/**`
- `code/packages/reports/src/**`
- `code/apps/api/src/reports/**`
- `code/apps/api/src/compliance/nis2/ro/**`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/contracts/**`
- `code/scripts/check-schema-contract-drift.ts`

## Goal

Implement the first generic notification-draft persistence contract so country-pack notification drafts use versioned payload envelopes and Romania-specific rows remain compatibility/workflow companions.

## Scope

Expected implementation areas:

- Generic notification draft repository/service contract with organization scoping.
- Payload-envelope parser/validator for schema key, schema version, locale/caveat metadata, source-mapped fields, and legal caveat presence.
- Romania notification draft generation path that can produce the generic payload envelope while preserving onboarding/classification link compatibility.
- Focused in-memory/fake/Prisma-boundary tests if a repository adapter is added.
- Optional deterministic payload-envelope drift/static check if it stays local and fast.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- M24 validates and persists the generic envelope shape, but does not migrate real production rows because no live database/runtime migration smoke is in scope.
- Romania-specific workflow fields stay in the Romania compatibility companion surface; future country packs should target the generic `NotificationDraft` contract first.
- The active Romanian legal caveat remains the English fallback from `@puresoc/shared`; M24 must not invent Romanian legal copy.
- API compatibility can expose generic envelope data alongside existing Romania draft JSON, but M24 should avoid broad route or frontend rewrites.

Expected files:

- `code/packages/compliance/nis2/country-packs/core/src/**`
- `code/packages/compliance/nis2/country-packs/ro/src/**`
- `code/packages/database/src/contracts/**`
- `code/packages/database/src/repositories/**`
- `code/apps/api/src/reports/**`
- `code/apps/api/src/compliance/nis2/ro/**`
- `code/tests/**`
- `code/scripts/check-schema-contract-drift.ts` or a focused notification-envelope check if added
- `docs/PLAN.md`
- `docs/PLAN_M24.md`
- `docs/PLAN_M25.md`
- `docs/LEARNINGS.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not add provider write/remediation execution.
- Do not add Romania-specific logic outside Romania country-pack/importer/API compatibility surfaces.
- Do not add Microsoft-specific logic outside Microsoft provider/config surfaces.
- Do not hardcode regulatory facts in UI conditionals.
- Do not make legal certification claims.
- Do not add a broad served frontend/i18n runtime.
- Do not approve or invent Romanian legal-caveat wording.
- Do not run live Microsoft Graph, Stripe, OIDC, MinIO/S3, public regulatory URL, KMS, or provider-write smoke tests.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- reports compliance ro notification i18n database prisma
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-042 for generic notification draft persistence and Romania compatibility.
- Narrow GAP-041 if payload-envelope semantic checks are added.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve runtime/browser/live integration gaps unless this milestone directly validates them.

## Acceptance Criteria

- Generic notification draft payload envelopes have a tested parser or validator.
- Persistence or repository contracts are organization-scoped.
- Romania draft compatibility is explicit and tested.
- Legal caveat metadata remains present and does not claim certification.
- No live services or provider write paths are required.

## Completion Log

Completed 2026-05-01.

Implementation results:

- Added a deterministic generic country-pack notification draft envelope validator/parser in `@puresoc/country-packs-core`.
- Added Romania generic notification envelope generation for `ro.nis2.registration_notification.v1` while preserving the existing Romania compatibility draft JSON.
- Updated the Romania notification API route to return `notificationDraftEnvelope` beside the existing `draft`.
- Added `PrismaNotificationDraftRepository` for organization-scoped generic `NotificationDraft` records and Romania companion draft links.
- Added write-time generic envelope validation for notification draft repository saves.
- Added focused tests for valid/invalid envelope semantics, Romania envelope generation, API envelope response coverage, Prisma-boundary persistence, organization scoping, companion links, and malformed-payload rejection.

Changed files:

- `code/apps/api/src/__tests__/ro-nis2-api-routes.test.ts`
- `code/apps/api/src/compliance/nis2/ro/routes.ts`
- `code/packages/compliance/nis2/country-packs/core/src/__tests__/country-pack-nis2.spec.ts`
- `code/packages/compliance/nis2/country-packs/core/src/index.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-notification-draft.types.spec.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/index.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts`
- `code/packages/database/src/__tests__/prisma-notification-drafts.repository.spec.ts`
- `code/packages/database/src/contracts/outputs.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/repositories/notification-drafts.ts`
- `docs/PLAN.md`
- `docs/PLAN_M24.md`
- `docs/PLAN_M25.md`
- `docs/LEARNINGS.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available. Validation used host-node equivalents through `flatpak-spawn --host`.
- `npm run lint` passed. It reported schema drift coverage for 21 models and 331 fields, and Romania generated regulatory drift for 2 artifacts.
- `npm run test -- reports compliance ro notification i18n database prisma` passed: 30 test files, 122 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M24. Generic notification draft envelopes now have deterministic semantic validation, Romania can emit a generic envelope suitable for `NotificationDraft.payloadJson`, and the Prisma-boundary persistence contract is organization-scoped with Romania companion-link coverage. No provider write/remediation path or live external service was added.

Gaps updated:

- GAP-041 narrowed for payload-envelope semantic validation coverage.
- GAP-042 narrowed for generic envelope validation/generation and Prisma-boundary notification draft persistence.
- GAP-030 remains open; no provider write/remediation execution was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 23 / PLAN_M24 complete and stages Prompt 24 / PLAN_M25.
- `docs/PLAN_M25.md` created for Notification Draft Runtime Persistence And Backfill Contract.

Residual risk:

- Runtime API persistence routes for notification drafts are not wired yet; M25 is staged for that.
- Existing Romania companion draft payload backfill/migration is not implemented yet.
- Romanian legal-caveat/product copy remains unapproved and falls back to English.
- Live PostgreSQL migration/apply smoke remains deferred under existing runtime/database gaps.
