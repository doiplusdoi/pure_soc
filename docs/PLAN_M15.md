# M15 Plan: Gap Register And Prompt QA

## Summary

Implement Prompt 14 from `docs/codex-prompts.md`: keep the project executable by auditing the gap register and validating the remaining active prompt suite against the prompt test protocol.

Started: 2026-05-01.

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

Out of scope:

- Feature implementation under `code/`.
- Reopening completed Phase A-I, M11-M14, or remediation-runtime work without a gap-driven prompt.
- Product/legal decisions that must remain assigned to Product/legal.

## Assumptions

- The M14 working tree is clean and the latest changed files/test output are represented by `docs/PLAN_M14.md` and the latest commit file list.
- M15 is a docs-only prompt unless prompt QA finds a blocker requiring code changes.
- The next prompt should prioritize a concrete, testable open engineering gap over Product/legal-only decisions.

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

Completed: 2026-05-01.

QA findings:

- The active prompt suite did not ask Codex to reimplement completed Phase A-I, M11-M14, or remediation write-runtime work.
- The active prompt suite stopped at the M15 maintenance prompt even though concrete open engineering gaps remained.
- GAP-034 is the clearest next executable security/availability slice because it has bounded API/evidence/config files and focused tests.
- Product/legal-only gaps remain open and should not block the next engineering prompt.

Changed files:

- `docs/PLAN_M15.md`
- `docs/PLAN_M16.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `git diff --check` passed.

Acceptance status:

- Accepted for the M15 docs-only prompt QA slice.

Gaps updated:

- GAP-034 now points to Prompt 15 / `docs/PLAN_M16.md`.

Prompt handoff:

- `docs/codex-prompts.md` now retires Prompt 14 and makes Prompt 15 / `PLAN_M16` the next active prompt.
- `docs/PLAN_M16.md` was created from the new active prompt.

Residual risk:

- M15 did not run code tests because no implementation files changed.
- GAP-034 remains open until M16 implements and validates request/upload limits.
- Runtime deployment smokes and Product/legal decisions remain tracked in their existing gaps.
