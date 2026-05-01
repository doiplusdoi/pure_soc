# M25 Plan: Notification Draft Runtime Persistence And Backfill Contract

## Summary

Implement Prompt 24 from `docs/codex-prompts.md`: wire the M24 generic notification-draft persistence boundary into the API/runtime contract and add a deterministic Romania backfill posture.

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
- `docs/PLAN_M24.md`
- `docs/adr/ADR-016-i18n-and-country-pack-notification-drafts.md`
- `docs/adr/ADR-005-regulatory-seed-and-source-map-format.md`
- `code/packages/shared/src/**`
- `code/packages/compliance/nis2/country-packs/core/src/**`
- `code/packages/compliance/nis2/country-packs/ro/src/**`
- `code/apps/api/src/compliance/nis2/ro/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/server.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/contracts/**`
- `code/packages/database/src/repositories/notification-drafts.ts`
- `code/packages/database/src/__tests__/prisma-notification-drafts.repository.spec.ts`

## Goal

Make notification draft persistence usable from the API runtime in memory and Prisma modes, and define deterministic Romania legacy/backfill behavior without running a live database migration.

## Scope

Expected implementation areas:

- In-memory notification draft repository or adapter matching the Prisma repository contract.
- Runtime repository selection and persistence-context reporting for notification drafts.
- Narrow API/service routes for organization-scoped create/read of generic notification drafts.
- Romania companion-link creation for Romania registration envelopes.
- Deterministic backfill helper for readable legacy Romania companion payloads, with explicit `manual_review_required` for non-convertible payloads.
- Focused API/repository/backfill tests.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- Product/legal-approved Romanian legal-caveat text is not available; Romanian caveat output must continue falling back to English.
- M25 should not rewrite report exports or build a served frontend i18n runtime.
- Live PostgreSQL migration/apply smoke remains out of scope unless a later prompt explicitly brings runtime database infrastructure into scope.

Expected files:

- `code/packages/compliance/nis2/country-packs/core/src/**`
- `code/packages/compliance/nis2/country-packs/ro/src/**`
- `code/packages/database/src/repositories/notification-drafts.ts`
- `code/packages/database/src/index.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/memory-repository.ts`
- `code/apps/api/src/compliance/nis2/ro/**`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/**`
- `docs/PLAN.md`
- `docs/PLAN_M25.md`
- `docs/PLAN_M26.md`
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
- Do not migrate live data or require a live PostgreSQL instance.
- Do not run live Microsoft Graph, Stripe, OIDC, MinIO/S3, public regulatory URL, KMS, or provider-write smoke tests.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- notification database ro api persistence i18n
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-042 for runtime notification-draft persistence and Romania backfill posture.
- Narrow GAP-036 if notification-draft runtime persistence is wired into Prisma mode.
- Preserve GAP-030 and do not enable live provider write execution.
- Preserve browser/live integration gaps unless this milestone directly validates them.

## Acceptance Criteria

- Notification draft API persistence is organization-scoped in memory and Prisma-mode wiring.
- Generic notification draft writes continue to validate envelope semantics.
- Romania companion links are explicit and tested.
- Legacy Romania companion payload conversion is deterministic and does not silently activate unverifiable payloads.
- No live services or provider write paths are required.

## Completion Log

Started and completed 2026-05-01.

Implementation results:

- Added `InMemoryNotificationDraftRepository` with the same organization-scoped generic draft and Romania companion-link contract as `PrismaNotificationDraftRepository`.
- Added runtime repository selection for notification drafts in memory and Prisma modes, and updated persistence-context reporting.
- Added org-scoped generic NIS2 notification-draft create/read/list API routes under `/organizations/:orgId/compliance/nis2/notification-drafts`.
- Added Romania companion-link creation for RO registration envelopes, keeping the schema-specific detection inside the Romania API compatibility surface.
- Added `backfillRoNis2NotificationDraftPayload`, which returns `converted`, `already_generic`, or `manual_review_required` and only converts legacy payloads with valid legal-caveat metadata plus complete source-mapped fields.
- Preserved report/export behavior and did not add provider write/remediation execution or live migration requirements.

Changed files:

- `code/README.md`
- `code/apps/api/src/__tests__/notification-drafts-runtime.test.ts`
- `code/apps/api/src/__tests__/runtime-persistence.test.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/compliance/nis2/index.ts`
- `code/apps/api/src/compliance/nis2/notification-drafts/routes.ts`
- `code/apps/api/src/compliance/nis2/notification-drafts/service.ts`
- `code/apps/api/src/compliance/nis2/ro/notification-draft-companion.ts`
- `code/apps/api/src/index.ts`
- `code/apps/api/src/server.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-notification-draft.types.spec.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/index.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts`
- `code/packages/database/src/__tests__/prisma-notification-drafts.repository.spec.ts`
- `code/packages/database/src/index.ts`
- `code/packages/database/src/repositories/notification-drafts.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M25.md`
- `docs/PLAN_M26.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available. Validation used host-node equivalents through `flatpak-spawn --host`.
- `npm run lint` passed. It reported schema drift coverage for 21 models and 331 fields, and Romania generated regulatory drift for 2 artifacts.
- `npm run test -- notification database ro api persistence i18n` passed: 36 test files, 141 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M25. Notification draft runtime persistence is organization-scoped in memory and Prisma-mode wiring, generic envelope writes still validate semantics before persistence, Romania companion links are explicit and tested, and legacy Romania backfill behavior is deterministic without live migration.

Gaps updated:

- GAP-036 narrowed for notification draft runtime persistence selection in Prisma mode.
- GAP-041 narrowed for runtime notification-draft API semantics.
- GAP-042 narrowed for runtime notification-draft persistence routes and deterministic Romania backfill posture.
- GAP-030 remains open; no provider write/remediation execution was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 24 / PLAN_M25 complete and stages Prompt 25 / PLAN_M26.
- `docs/PLAN_M26.md` created for Stored Output Runtime Persistence Adapter Slice.

Residual risk:

- Product/legal-approved Romanian legal-caveat copy is still unavailable and remains an English fallback.
- No live data migration/backfill has been run; the Romania helper only provides deterministic conversion posture.
- Prisma mode remains partial for identity/session/org/RBAC, audit logs, provider telemetry, stored output records, and OIDC transient state.
