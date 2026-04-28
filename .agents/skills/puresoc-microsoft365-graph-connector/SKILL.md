---
name: puresoc-microsoft365-graph-connector
description: Use when implementing or reviewing the PureSOC Microsoft 365 connector, Microsoft Graph admin-consent flow, permission bundles, tenant profile sync, license sync, Entra users/groups/roles/apps sync, Secure Score, Intune, Defender XDR, or Microsoft module capability detection.
---

# PureSOC Microsoft 365 Graph Connector

Use this skill for Microsoft 365 provider work. Also use `puresoc-provider-connector`.

## Required Reading

Read:

- `docs/puresoc_vision.md` sections 8, 9, 20, 22, 23, 29, 32
- `docs/master-plan.md` sections 9, 11, 15
- `docs/implementation-gaps.md`

Verify current Microsoft docs before finalizing permissions or endpoints.

## Non-Negotiables

- Do not request write scopes during first onboarding.
- Do not store or request Global Administrator credentials.
- Track permission bundles, granted scopes, tenant ID, consent timestamp, and module availability.
- Missing Graph permission, missing license, or unsupported endpoint becomes module status, not full connector failure.
- Microsoft logic stays under `packages/providers/microsoft365`.

## V1 Read Modules

Implement in small modules:

- Tenant profile and verified domains.
- Subscribed SKUs, service plans, license assignment.
- Users, guests, groups, directory roles, role assignments.
- Conditional Access and identity posture where accessible.
- Enterprise applications, service principals, app registrations, credentials.
- Secure Score and recommended actions.
- Audit/sign-in logs where licensed and permitted.
- Intune devices, compliance policies, compliance states.
- Defender XDR incidents and alerts where available.

## Permission Bundle Pattern

Use named bundles:

- `m365_read_baseline`
- `m365_security_read`
- `m365_intune_read`
- `m365_remediation_write`
- `m365_defender_write`

Write bundles are disabled by default and must be separate consent/enablement paths.

## Required Tests

- Consent URL generation.
- Callback state/tenant validation.
- Encrypted token storage.
- Permission bundle persistence.
- Missing permission module status.
- Missing license module status.
- Graph pagination handling.
- Throttling/retry behavior.
- Mock tenant scenarios from `docs/puresoc_vision.md` section 29.

## Completion Checklist

- No Microsoft-specific branching in generic NIS2 evaluator.
- Each synced object stores raw and normalized JSON.
- Dangerous write/remediation actions are absent or feature-gated and approval-gated.
- Gaps and unsupported Graph areas are recorded in `docs/implementation-gaps.md`.
