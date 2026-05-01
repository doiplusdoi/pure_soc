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

Completed on 2026-05-01.

Implemented:

- Expanded `code/data/regulatory/eu/nis2-control-catalog.seed.json` to all ten Article 21(2)(a)-(j) baseline categories with source-linked evidence requirements and manual checklist mappings.
- Aligned `code/data/regulatory/eu/nis2-article21-controls.seed.json` with executable control IDs.
- Added stricter catalog seed validation for duplicate IDs/codes, missing legal references, and missing checklist templates.
- Added stale-evidence handling to compliance evaluation and API parsing.
- Refined confidence semantics so concrete provider findings and missing evidence are not masked by implicit manual-work state.
- Made readiness-plan target percentage configurable with a conservative default.
- Added provisional dashboard internal-readiness scoring that gives accepted risk partial credit rather than a clean pass.
- Added `PureSOC internal readiness` score labeling and ADR-015 for provisional scoring.
- Replaced brittle control-ID literals in the main compliance flow test with code-based helper lookups.

Actual changed files:

- `docs/PLAN_M13.md`
- `docs/PLAN_M14.md`
- `docs/adr/ADR-015-internal-readiness-scoring.md`
- `docs/adr/README.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/data/regulatory/eu/nis2-control-catalog.seed.json`
- `code/data/regulatory/eu/nis2-article21-controls.seed.json`
- `code/package.json`
- `code/pnpm-lock.yaml`
- `code/apps/api/src/compliance/validation.ts`
- `code/apps/api/src/__tests__/compliance-validation-audit.test.ts`
- `code/packages/compliance/core/src/control-catalog.ts`
- `code/packages/compliance/core/src/evaluator.ts`
- `code/packages/compliance/core/src/readiness-plan.ts`
- `code/packages/compliance/core/src/types.ts`
- `code/packages/dashboards/src/aggregation.ts`
- `code/packages/dashboards/src/dashboard.types.ts`
- `code/packages/dashboards/src/__tests__/dashboards.spec.ts`
- `code/packages/evidence/src/index.ts`
- `code/packages/reports/src/builders.ts`
- `code/packages/reports/src/report.types.ts`
- `code/tests/compliance-gaps-recommendations-readiness-plan-checklist.spec.ts`
- `code/tests/control-catalog-scoring.spec.ts`

Validation results:

```sh
flatpak-spawn --host sh -lc 'cd /mnt/solodata/SoloCode/pure_soc/code && npx pnpm@10.33.2 test -- --runInBand control-catalog compliance scoring readiness-plan reports dashboards'
flatpak-spawn --host sh -lc 'cd /mnt/solodata/SoloCode/pure_soc/code && npx pnpm@10.33.2 lint'
```

Acceptance status:

- Control catalog seed validation covers required fields, unique IDs/codes, source references, dangling checklist templates, and evidence requirements.
- Representative Article 21 coverage exists for all ten Article 21(2)(a)-(j) groups.
- Provider-neutral findings map to controls without raw Microsoft payload coupling.
- Manual controls create checklist items.
- Dashboard score label preserves PureSOC internal-readiness wording.
- Accepted-risk and stale-evidence behavior are tested.

Gaps updated:

- GAP-021 updated and kept open for product/legal scoring calibration, stale-evidence freshness policy, evidence expectations, and public wording review.

Residual risk:

- ADR-015 score weights and accepted-risk credit are provisional.
- Evidence freshness currently uses artifact `freshnessStatus` or `validUntil`; product/legal still need to define per-control freshness windows.
- No national overlays or Implementing Regulation 2024/2690 overlays were added in M13.
