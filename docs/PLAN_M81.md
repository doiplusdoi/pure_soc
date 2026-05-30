# M81 Plan: Recursive Gap Implementation Runner

## Summary

M80 remains the decision-gated handoff for Romania legal/product activation or one approved disposable external proof target. M81 is the reusable recursive implementation runner: it should pick one unblocked gap slice, implement it, validate it, update the gap/status docs, and stage the next milestone.

Status: staged.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md` and the current open gaps in `docs/implementation-gaps.md`.

## Single Codex Prompt

Use the prompt in `docs/recursive-gap-codex-prompt.md`.

## First-Run Guidance

On the first recursive run, do not assume a product/legal/operator decision exists. Start by reading the required docs and classifying candidate gaps as:

- locally implementable,
- product/legal blocked,
- external-target blocked,
- unsafe for V1.

Then choose exactly one locally implementable slice. If nothing is safely implementable, perform blocker-only documentation updates and stop.

Likely first local candidates:

1. Public signup/auth hardening that does not require a product policy decision.
2. Selected schema/generated-data drift coverage for customer-facing persisted surfaces.
3. Evidence/report export improvements using local/fake adapters only.
4. Frontend workflow polish that preserves the current served UI and smoke artifacts.
5. Microsoft read-only fixture expansion only after checking current official Microsoft documentation.

## Negative Constraints

- Do not mark Romania legal logic active.
- Do not invent product/legal-approved Romanian copy, readiness score policy, billing plans, or launch packaging.
- Do not add direct DNSC or national-authority submission.
- Do not add provider write scopes or remediation execution.
- Do not run live external integrations without the existing selector-first disposable/test guardrails and explicit approval.
- Do not implement more than one slice in this milestone.

## Validation

Use the validation commands for the selected slice from `docs/recursive-gap-codex-prompt.md` and always run:

```sh
git diff --check
```

## Expected Gap Movement

The selected open gap should narrow with concrete code/docs/tests, or the plan should record why it is blocked. Do not close a gap unless the current state, tests, and acceptance evidence satisfy the registered next action.
