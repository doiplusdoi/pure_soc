# M23 Plan: i18n And Country-Pack Notification Model Decision

## Summary

Implement Prompt 22 from `docs/codex-prompts.md`: make an explicit i18n/message strategy and country-pack notification-draft model decision before expanding customer-facing notification exports or additional country packs.

Status: staged for implementation after M22.
Created: 2026-05-01.

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

- Pending. M23 implementation must create `docs/PLAN_M24.md` before final response.

Residual risk:

- Pending.
