# M12 Plan: Microsoft 365 Read-Only Module Expansion

## Summary

Implement Prompt 11 from `docs/codex-prompts.md`: expand Microsoft 365 read-only discovery modules after revalidating current official Microsoft documentation, while preserving module-level degradation and provider-neutral compliance outputs.

## Source Inputs

- `docs/puresoc_vision.md` sections 8, 9, 20, 22, 23, 29, 32
- `docs/master-plan.md` sections 9, 11, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/microsoft365-permissions.md`
- `docs/adr/ADR-009-microsoft-graph-permission-bundles.md`
- Skills: `puresoc-provider-connector`, `puresoc-microsoft365-graph-connector`, `puresoc-connector-test-harness`

## Locked Decisions

- Microsoft-specific logic stays under the Microsoft provider/API connector surface.
- Generic NIS2 compliance evaluation must consume provider-neutral resources and findings only.
- Read-only discovery must not request write scopes or store Global Administrator credentials.
- One missing permission/license/unsupported API must degrade that module, not fail the whole connection.
- Microsoft permission assumptions must be rechecked against official Microsoft documentation before implementation.

## Scope

In scope:

- Revalidate read-only Microsoft Graph permissions and update `docs/microsoft365-permissions.md`.
- Add supported read modules such as Conditional Access, Entra audit/sign-in logs, collaboration/security posture, or Defender XDR only where docs and fixtures support reliable read-only behavior.
- Add capability/module status for missing license, missing permission, unsupported API, national-cloud limitation, and connector error.
- Store raw payloads before normalization and emit provider-neutral resources/findings.
- Add mock Graph fixture tests for permission mapping, pagination, throttling/retry, module degradation, and redaction.

Out of scope:

- Provider write/remediation actions.
- Requesting write scopes during onboarding.
- Compliance-engine Microsoft branching.
- Live customer tenant writes or Global Administrator credential handling.

## Expected Files And Ownership

- `docs/PLAN_M12.md`
- `docs/PLAN_M13.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/microsoft365-permissions.md`
- `code/packages/providers/microsoft365/**`
- `code/apps/api/src/provider-connections/microsoft365/**`
- `code/apps/connector-runner/src/microsoft365/**`
- `code/packages/providers/core/**` only if neutral resource/finding contracts need extension
- mock Graph fixtures/tests

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand microsoft365 graph-sync permissions redaction provider
```

## Acceptance Criteria

- Permission mapping fixtures are updated and source-documented.
- Missing permissions, missing licenses, unsupported APIs, national-cloud limitations, and connector errors create module status records instead of failing the connection.
- Graph pagination and retry/throttling behavior are covered by tests.
- Each new module stores raw payloads before normalized resources/findings.
- Generic compliance code remains provider-neutral.
- GAP-007 is updated with revalidated permission details and unresolved Microsoft API limitations.

## Completion Log

Pending implementation.
