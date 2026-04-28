# Prompt Test Protocol

Codex prompts are implementation controls. A prompt is not ready to run unless it passes this checklist.

## 1. Prompt Readiness Test

A prompt must include:

- Source documents to read.
- Phase or goal.
- File or package ownership.
- Deliverables.
- Negative constraints.
- Required tests.
- Acceptance commands.
- Gap register update instruction.
- Expected final summary.

Reject prompts that ask for broad implementation without file boundaries or tests.

## 2. Architecture Regression Test

Every prompt touching compliance or providers must answer:

- Does generic compliance import only provider-neutral contracts?
- Is Microsoft-specific logic isolated under `packages/providers/microsoft365`?
- Is Romania-specific logic isolated under `packages/compliance/nis2/country-packs/ro`?
- Are regulatory facts stored as seed/source data rather than UI conditionals?
- Are legal caveats preserved in report surfaces?

## 3. Test Sufficiency Check

For each prompt, require at least one of:

- Unit tests for pure domain logic.
- Integration tests for database/API boundaries.
- E2E tests for critical user workflows.
- Static checks for forbidden imports or secret leakage.

Examples:

- Classification prompt needs scenario unit tests.
- Auth prompt needs integration tests and secret serialization tests.
- Provider prompt needs contract tests and mock provider scenarios.
- UI prompt needs Playwright screenshots for desktop and mobile.

## 4. Security Check

Any prompt touching auth, provider tokens, evidence, billing, or remediation must include checks for:

- Cross-organization isolation.
- Secret redaction.
- Audit event creation.
- Permission/entitlement validation.
- Failure behavior.

## 5. Completion Report Template

Each implementation response should include:

```txt
Changed files:
- path

Tests run:
- command: result

Acceptance status:
- pass/fail with reason

Gaps updated:
- gap id or "none"

Residual risk:
- concise risk or "none known"
```

## 6. Prompt Review Cadence

Review prompts at the end of each phase:

- Remove obsolete file paths.
- Add missed tests from bugs found.
- Split prompts that caused broad, hard-to-review changes.
- Add negative constraints when architecture drift appears.
