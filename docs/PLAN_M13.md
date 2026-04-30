# M13 Plan: Full Control Catalog And Readiness Scoring Calibration

## Summary

Implement Prompt 12 from `docs/codex-prompts.md`: expand the representative Phase H NIS2 control catalog into a fuller PureSOC internal-readiness model, with conservative scoring semantics, source-linked controls, provider-neutral mappings, manual checklist mappings, and clear non-certification wording.

## Source Inputs

- `docs/puresoc_vision.md` sections 10, 14, 15, 16, 23, 25, 28, 32
- `docs/master-plan.md` sections 7, 10, 12, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/claude_rec.md` sections REC-014, REC-015, REC-016

## Locked Decisions

- Scores must be labeled as PureSOC internal readiness, not legal certification.
- Baseline-only country packs must not be treated as technical control failures.
- Microsoft raw payloads must not map directly to controls; mappings use provider-neutral findings/resources.
- National overlays must not be added unless source-reviewed and activated.
- Regulatory facts stay in seed/source data, not UI conditionals.

## Scope

In scope:

- Expand Article 21 EU NIS2 control coverage beyond the current representative seed.
- Keep each control source-linked to EU Directive or reviewed regulatory source records.
- Add provider-neutral Microsoft finding mappings where available, including M12 Defender signals where appropriate.
- Add manual checklist mappings for process controls.
- Define provisional internal-readiness scoring, stale-evidence handling, accepted-risk handling, and confidence semantics, or explicitly leave unresolved parts in the gap register.
- Replace brittle control-ID literals in tests with helper lookups by intent/code where useful.

Out of scope:

- Legal certification claims.
- Unreviewed country overlays.
- Provider write/remediation actions.
- Direct Microsoft raw-payload-to-control mapping.

## Expected Files And Ownership

- `docs/PLAN_M13.md`
- `docs/PLAN_M14.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/data/regulatory/eu/*control*.seed.json`
- `code/packages/compliance/core/src/control-catalog.ts`
- `code/packages/compliance/core/src/evaluator.ts` if score/confidence semantics change
- `code/packages/compliance/core/src/readiness-plan.ts`
- `code/packages/compliance/core/src/__tests__/*`
- `code/packages/reports/**` and `code/packages/dashboards/**` if score presentation contracts change
- `docs/adr/*` if scoring/confidence semantics need a decision record

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand control-catalog compliance scoring readiness-plan reports dashboards
```

## Acceptance Criteria

- Control catalog seed validation covers required fields, unique IDs/codes, source references, and evidence requirements.
- Representative tests exist for every Article 21 group.
- Provider-neutral findings map to controls.
- Manual controls create checklist items.
- Score labels preserve internal-readiness wording.
- Accepted-risk and stale-evidence behavior is tested if implemented.
- GAP-021 is updated with resolved and remaining scoring/catalog calibration work.

## Completion Log

Pending implementation.
