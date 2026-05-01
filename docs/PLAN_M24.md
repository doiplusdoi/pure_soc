# M24 Plan: Generic Notification Draft Envelope Persistence

## Summary

Implement Prompt 23 from `docs/codex-prompts.md`: turn the ADR-016 notification-draft model decision into the first small persistence-oriented slice for generic `NotificationDraft.payloadJson` envelopes and Romania compatibility/workflow links.

Status: staged for implementation after M23.
Created: 2026-05-01.

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

Not started.

Implementation results:

- Pending.

Changed files:

- Pending.

Validation:

- Pending.

Acceptance status:

- Pending.

Gaps updated:

- Pending.

Prompt handoff:

- Pending. M24 implementation must create `docs/PLAN_M25.md` before final response.

Residual risk:

- Pending.
