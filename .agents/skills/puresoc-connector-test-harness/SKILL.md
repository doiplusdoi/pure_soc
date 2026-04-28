---
name: puresoc-connector-test-harness
description: Use when designing, implementing, or reviewing tests for PureSOC external integrations, provider connectors, OAuth flows, billing webhooks, regulatory imports, HTTP fixtures, mocked provider scenarios, retry/rate-limit behavior, token redaction, or accidental live write prevention.
---

# PureSOC Connector Test Harness

Use this skill whenever external integration code changes.

## Required Reading

Read:

- `docs/puresoc_vision.md` sections 20, 22, 28, 29
- `docs/master-plan.md` sections 13, 15
- `docs/prompt-tests.md`
- `docs/implementation-gaps.md`

## Test Principles

- Prefer deterministic mocked fixtures before live API tests.
- Keep live tests opt-in and read-only unless explicitly approved.
- No test should perform a live write by accident.
- Partial failures are first-class scenarios.
- Test redaction and audit behavior, not only happy paths.

## Standard Test Types

Use:

- Contract tests for provider interfaces.
- Fixture tests for API response normalization.
- Retry and backoff tests.
- Pagination tests.
- Permission denied tests.
- License/capability unavailable tests.
- Token/secret redaction tests.
- Idempotency tests.
- Cross-organization isolation tests.

## Mock Provider Scenarios

For Microsoft, cover:

- Healthy tenant.
- Missing MFA.
- No Intune license.
- Risky admin roles.
- Stale guests.
- Defender incidents.
- Missing permissions.
- Revoked consent.
- Throttled Graph response.

## Completion Checklist

- New integration code has unit or integration tests.
- Live-provider assumptions have mock fixtures.
- Write-capable paths require explicit test flags and approval.
- Failing modules produce inspectable status.
- Gaps in fixture coverage are recorded in `docs/implementation-gaps.md`.
