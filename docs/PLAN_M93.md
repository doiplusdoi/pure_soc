# M93 Plan: Recursive Gap Implementation Runner

## Summary

M93 is staged as the next one-slice implementation runner. It should use `docs/recursive-gap-codex-prompt.md` to select exactly one unblocked local gap slice, implement it, validate it, update the gap/status docs, and stage `docs/PLAN_M94.md`.

Status: staged.
Created: 2026-06-11.
Depends on: `docs/puresoc_vision.md`, `docs/master-plan.md`, `docs/implementation-gaps.md`, `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, `docs/codex-prompts.md`, `docs/LEARNINGS.md`, and the latest completed plan.

## Candidate Slices

- Public signup/auth hardening that does not require choosing open versus invite-only registration, real email delivery, or launch enforcement policy.
- Frontend workflow polish that preserves the current served UI and smoke artifacts.
- Additional selected drift coverage only for newly customer-facing or production-backed surfaces.
- Evidence/report/export improvements using local or fake adapters only.
- Microsoft read-only fixture expansion only after checking current official Microsoft documentation and without adding write scopes.

## Negative Constraints

- Do not implement more than one slice.
- Do not invent product/legal/operator decisions.
- Do not mark Romania legal logic active.
- Do not add direct DNSC or national-authority submission.
- Do not claim certified, guaranteed, or legally approved compliance.
- Do not add provider write scopes or remediation execution.
- Do not run live external integrations without explicit disposable/test selection and existing guardrails.
- Keep application code, tests, Compose files, runtime config, and regulatory data under `code/`.

## Validation Plan

Use the targeted commands from `docs/recursive-gap-codex-prompt.md` for the selected slice. Always run from the repository root or `code/` as appropriate:

```sh
git diff --check
```

If the selected slice touches served UI, also run the focused web render tests and `@ui-smoke`. If it touches runtime contracts, run the relevant package/API tests and `npm run lint`.

## Expected Gap Movement

One gap should narrow only by the implemented and validated local slice. Product/legal approval, live external proof, provider writes, DNSC submission, certification claims, public regulatory fetches, real email delivery, and production platform operations remain open unless explicitly selected and proven by the relevant guarded workflow.
