# M2 Plan: Compliance Correctness, Input Validation, And Audit Hardening

## Summary

Implement the first active post-Phase-H hardening prompt from `docs/codex-prompts.md`: fix compliance evaluator correctness, harden compliance/recommendation request validation, add missing audit coverage, and prepare the next incremental milestone plan.

This milestone starts the new `PLAN_Mx` workflow. `PLAN_M1.md` records the completed skeleton milestone; this file is the first active prompt milestone.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/claude_rec.md` sections REC-003, REC-004, REC-005, REC-008, REC-011, REC-012, REC-013, REC-020, REC-024

## Locked Decisions

- Keep the compliance engine provider-neutral.
- Keep Microsoft-specific behavior out of generic compliance packages.
- Keep Romania-specific behavior out of EU baseline packages.
- Preserve source and legal-review uncertainty in user-facing outputs.
- Do not add provider write/remediation actions in this milestone.
- A synchronous compliance evaluation response should use `200`; reserve `202` for queued work.

## Current State

The codebase has a representative Phase H compliance engine and Phase I output contracts. Open gaps for this milestone are:

- GAP-023: `requires_legal_review` warnings and no-signal provider-mapped controls.
- GAP-024: typed validation and audit coverage for compliance and recommendation routes.

Claude review also flagged the same issues as high-priority recommendations.

## Scope

In scope:

- `requires_legal_review` country-pack completeness warning behavior.
- Provider-mapped controls must not pass from silence.
- Typed validation for compliance evaluation body data.
- Typed validation for recommendation body gaps and organization ownership.
- Audit events for compliance evaluation and recommendation generation.
- Synchronous evaluation status-code correction.
- Checklist-generation precedence cleanup or explicit test coverage.
- Update `docs/codex-prompts.md` based on results.
- Create `docs/PLAN_M3.md` as the next prompt handoff after this milestone completes.

Out of scope:

- Prisma persistence and generated client workflow.
- Billing implementation.
- Production object storage/PDF adapters.
- Live Microsoft Graph expansion.
- Provider write actions or remediation execution.

## Expected Files And Ownership

- `docs/PLAN_M2.md`
- `docs/PLAN_M3.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/packages/compliance/core/src/evaluator.ts`
- `code/packages/compliance/core/src/gaps.ts` if needed
- `code/packages/compliance/core/src/__tests__/*`
- `code/apps/api/src/compliance/routes.ts`
- `code/apps/api/src/compliance/service.ts`
- `code/apps/api/src/recommendations/routes.ts`
- `code/apps/api/src/recommendations/service.ts`
- `code/apps/api/src/__tests__/*`
- `code/packages/audit` only if a small shared audit helper is required

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand compliance recommendations audit validation
```

Also run from the repository root:

```sh
git diff --check
```

## Acceptance Criteria

- `requires_legal_review` emits a warning.
- A provider-mapped control with no successful provider signal does not return `passing`.
- Wrong-organization gaps sent to recommendations are rejected.
- Malformed compliance evaluation bodies are rejected.
- Cross-organization compliance/recommendation access is rejected.
- Compliance evaluation and recommendation generation produce audit events.
- Synchronous evaluation returns `200`.
- Existing happy-path compliance/recommendation tests still pass.
- `docs/codex-prompts.md` is updated based on the actual result.
- `docs/PLAN_M3.md` exists as the next incremental plan stub.

## Completion Log

Implementation started on 2026-04-30.

Working assumptions:

- Use hand-written route parsers for this milestone to avoid adding a validation dependency before the workspace import and Prisma alignment prompts.
- Keep M2 focused on the existing in-memory API/runtime; persistence and schema status alignment remain in the next milestones.
- Treat caller-supplied manual tasks as authoritative evaluation input. Generated checklist items are only produced when manual tasks are not supplied.
- Do not introduce live provider calls or remediation behavior.

Implementation completed on 2026-04-30.

Implemented:

- `requires_legal_review` country-pack completeness now emits a user-visible warning instead of being suppressed.
- Provider-mapped controls now remain non-passing when no mapped provider signal exists, unless completed manual fallback plus evidence explicitly satisfies the control.
- Compliance evaluation input parsing now validates evidence artifacts, manual tasks, country-pack completeness, unsupported features, and source references before calling domain logic.
- Recommendation generation input parsing now validates gaps and rejects mismatched `organizationId` values against the route organization.
- Synchronous compliance evaluation now returns `200`; `202` remains reserved for future queued evaluation work.
- Compliance evaluation and recommendation generation now write audit records with actor, organization, target assessment, and count summaries.
- Supplied manual tasks take precedence without generating unused checklist items.

Changed files:

- `code/packages/compliance/core/src/evaluator.ts`
- `code/packages/compliance/core/src/__tests__/compliance-gaps-recommendations-readiness-plan-checklist.spec.ts`
- `code/apps/api/src/compliance/routes.ts`
- `code/apps/api/src/compliance/service.ts`
- `code/apps/api/src/compliance/validation.ts`
- `code/apps/api/src/recommendations/routes.ts`
- `code/apps/api/src/recommendations/service.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/compliance-validation-audit.test.ts`
- `code/apps/api/src/__tests__/compliance-recommendations-readiness-plan-checklist.test.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `code/packages/audit/src/index.ts`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/PLAN_M2.md`
- `docs/PLAN_M3.md`

Validation results:

- `pnpm lint` passed via host `npx pnpm@10.33.2 lint`.
- `pnpm test -- --runInBand compliance recommendations audit validation` passed via host `npx pnpm@10.33.2 test -- --runInBand compliance recommendations audit validation` with 30 files / 95 tests passing.
- `git diff --check` passed.

Acceptance status:

- Accepted for PLAN_M2.

Gaps updated:

- GAP-023 resolved for PLAN_M2 evaluator semantics.
- GAP-024 resolved for PLAN_M2 route validation and audit coverage.

Residual risk:

- Validation is currently hand-written and route-local; Prompt 4 should revisit shared type and validation boundaries.
- Provider capability/module status is not yet part of persisted evaluation input; Prompt 2/Prompt 3 should keep that in view when aligning persistable results.

## Handoff For Next Milestone

`docs/PLAN_M3.md` has been generated from the next active prompt in `docs/codex-prompts.md`: Prompt 2 / `PLAN_M3`: Schema And Contract Alignment For Persistable Results.
