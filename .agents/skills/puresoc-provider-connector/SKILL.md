---
name: puresoc-provider-connector
description: Use when implementing or reviewing any PureSOC provider connector, provider abstraction, provider connection lifecycle, sync module, normalized resource model, provider finding, recommendation, capability detection, or connector contract test.
---

# PureSOC Provider Connector

Use this skill before touching provider connector code.

## Required Reading

Read:

- `docs/puresoc_vision.md` sections 8, 9, 14, 15, 20, 21, 22, 23, 29
- `docs/master-plan.md` sections 6, 9, 11, 13, 15
- `docs/implementation-gaps.md`

## Architecture Rules

- Generic compliance code imports provider-neutral contracts only.
- Provider-specific code belongs under `packages/providers/<provider-key>/`.
- Store both `raw_json` and `normalized_json` for every external resource.
- One failed module must not fail the whole provider sync.
- Write/remediation actions are disabled unless the approval model, preflight, snapshots, verification, and evidence exist.

## Implementation Workflow

1. Define or reuse provider-neutral types from `packages/providers/core`.
2. Add provider connection, credential, module status, resource, finding, recommendation, and sync-run changes together.
3. Implement capability, permission, and license checks as data, not scattered conditionals.
4. Normalize external objects into stable PureSOC resource types.
5. Emit audit events for connection, consent, sync start, sync completion, failure, and permission changes.
6. Redact tokens, OAuth codes, secrets, and raw auth headers from logs and errors.
7. Add contract tests and mock scenarios before live-provider assumptions.

## Required Tests

- Provider contract test.
- Module partial-failure test.
- Pagination and retry test where the provider API is paginated.
- Missing permission/capability test.
- Token redaction test.
- Cross-organization access rejection test for provider resources.

## Completion Checklist

- No provider-specific imports from generic compliance packages.
- Module statuses are visible through API/UI surfaces.
- Sync output is idempotent for repeated external IDs.
- `docs/implementation-gaps.md` is updated for any API, permission, or source limitation.
