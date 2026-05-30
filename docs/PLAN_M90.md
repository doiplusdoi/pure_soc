# M90 Plan: Recursive Gap Implementation Runner

## Summary

M90 is staged as the next recursive one-slice implementation milestone after M89. Use `docs/recursive-gap-codex-prompt.md` to select exactly one unblocked local slice, validate it, update the gap/status docs, and stage the next milestone.

Status: staged.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## First Candidate Review

Start by rebuilding the candidate list from the latest gap register. Current likely candidates:

1. Public signup/auth hardening that does not require choosing open versus invite-only registration, real email delivery, or enforcing a broad launch policy.
2. Frontend workflow polish that preserves the current UI and browser smoke artifacts.
3. Additional selected drift coverage only for newly customer-facing or production-backed surfaces.
4. Evidence/report/export improvements using local or fake adapters only, such as browser-PDF metadata prep or streaming-design scaffolding without live storage calls.
5. Queue/runtime operation hardening with local/disposable adapters only, keeping provider writes disabled.
6. Microsoft read-only fixture expansion only after checking current official Microsoft documentation and without adding write scopes.

If the highest-priority slice requires product/legal/operator decisions, record the blocker and move to the next unblocked local implementation slice.

## Negative Constraints

- Do not implement more than one slice.
- Do not mark Romania legal logic active.
- Do not add approved Romanian legal/regulatory copy without exact product/legal text.
- Do not add direct DNSC or national-authority submission.
- Do not claim certified, guaranteed, or legally approved compliance.
- Do not add Microsoft/provider write scopes or remediation execution.
- Do not run live external integrations without selector-first disposable/test guardrails and explicit approval.
- Keep application code, tests, Compose files, runtime config, and regulatory data under `code/`.

## Validation

Use the targeted commands from `docs/recursive-gap-codex-prompt.md` for the selected slice and always run:

```sh
git diff --check
```
