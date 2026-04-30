# M6 Plan: Regulatory Review Workflow And Source Activation Persistence

## Summary

Implement Prompt 5 from `docs/codex-prompts.md`: persist regulatory source versions, review tasks, review decisions, activation, and supersession so Romania and future country-pack legal logic cannot silently become active.

## Source Inputs

- `docs/puresoc_vision.md` sections 2, 10, 11, 20, 21, 22, 28
- `docs/master-plan.md` sections 10, 13, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/adr/ADR-005-regulatory-seed-and-source-map-format.md`
- `docs/adr/ADR-011-regulatory-source-activation-lifecycle.md`
- Skill: `puresoc-regulatory-xlsx-importer`

## Locked Decisions

- Do not auto-activate changed national legal logic from importer output or source monitor output.
- Do not treat secondary trackers as primary legal truth.
- Do not put Romania-specific review logic in EU baseline packages.
- Do not submit anything to DNSC or national authorities.
- Do not make legal certification claims.

## Current State

Phase D added the source activation lifecycle skeleton, and Phase E added deterministic Romania importer outputs and source maps. GAP-006 remains open for reviewer roles and legal/product operating procedure. GAP-019 is resolved for the domain skeleton, but persistence, immutable version history, review decisions, activation, and source-map traceability still need implementation.

## Scope

In scope:

- Persist source versions, source maps, import validation reports, review tasks, reviewer decisions, activation timestamps, and supersession links.
- Create API routes for listing review tasks, marking reviewed/rejected/activated, and reading source-map traceability.
- Enforce `regulatory_admin` role for review and activation actions.
- Keep changed legal logic in `review_required` until an authorized review decision activates it.
- Preserve immutable source/version history for historic assessments.
- Add optional source-monitor task creation without auto-activation if it fits the existing scheduler/source lifecycle shape.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M7.md` after completion.

Out of scope:

- DNSC or national-authority submissions.
- Country-specific review branching inside EU baseline packages.
- Legal certification language.
- Broad UI beyond API/domain workflow unless the implementation needs a small operational route surface.

## Expected Files And Ownership

- `docs/PLAN_M6.md`
- `docs/PLAN_M7.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/packages/regulatory-sources/**`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/**` repository files if persistence uses the Prisma boundary
- `code/apps/api/src/regulatory-sources/**`
- `code/apps/scheduler/src/regulatory-sources/**` only if source-monitor scheduling is touched
- `code/data/regulatory/countries/ro/*.generated.json` only if source metadata needs regeneration

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand regulatory source-activation review-task source-map
```

Also run from the repository root:

```sh
git diff --check
```

## Acceptance Criteria

- Changed source import creates `review_required` state and review task.
- `regulatory_admin` can activate reviewed source version.
- Non-regulatory admin cannot activate source version.
- Superseded versions remain readable for historic assessments.
- Source-map traceability survives activation.
- Source monitor creates a review task, not active legal logic.
- GAP-006 and GAP-019-related notes are updated.
- Product/legal workflow gaps are added or preserved if reviewer ownership or policy remains undefined.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M7.md` exists as the next incremental plan stub.

## Completion Log

Pending implementation.

## Handoff For Next Milestone

After M6 completes, `docs/PLAN_M7.md` should be generated from the next active prompt in `docs/codex-prompts.md`, currently Prompt 6 / `PLAN_M7`: Billing Provider And Entitlements.
