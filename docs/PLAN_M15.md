# M15 Plan: Gap Register And Prompt QA

## Summary

Implement Prompt 14 from `docs/codex-prompts.md`: keep the project executable by auditing the gap register and validating the remaining active prompt suite against the prompt test protocol.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/claude_rec.md`
- Latest changed files
- Latest test output

## Scope

Check that active prompts:

- Do not ask Codex to reimplement completed Phase A-I contract work.
- Include expected files/packages.
- Include negative constraints.
- Include tests and acceptance commands.
- Include gap update instructions.
- Include expected final summary requirements.
- Match current implementation reality and open gaps.

Expected outputs:

- `docs/PLAN_M15.md`
- `docs/PLAN_M16.md` if a next active prompt exists after QA
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not reopen completed implementation prompts without a concrete gap-driven reason.
- Do not remove resolved gaps; keep them for auditability with resolved dates.
- Do not invent new implementation scope beyond prompt/gap maintenance unless the QA finds a blocker.

## Validation Plan

- Run `git diff --check` for docs-only cleanup.
- Run `pnpm lint` if code changes.
- Run focused tests for any touched implementation area.

## Acceptance Criteria

- Active prompt order matches the actual next work.
- Gap register reflects blockers, assumptions, deferred decisions, and missing tests.
- Prompt suite passes the prompt quality expectations in `docs/prompt-tests.md`.
- Next milestone handoff is explicit.

## Completion Log

Pending implementation.
