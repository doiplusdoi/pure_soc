# ADR-009: Microsoft Graph Permission Bundles

Status: accepted
Date: 2026-04-28

## Context

Microsoft 365 is the first provider connector. A single broad consent screen would over-request permissions and blur read-only posture discovery with future remediation. The connector also needs to degrade cleanly when licenses or permissions are missing.

## Decision

Use Microsoft permission bundles and read-only onboarding by default.

- `m365_read_baseline` is the required baseline bundle for tenant profile, users, groups, roles, policies, licenses, and available audit data.
- `m365_security_read`, `m365_intune_read`, and other read bundles are optional modules.
- Write bundles such as `m365_remediation_write` and `m365_defender_write` are disabled by default and must not be requested during first onboarding unless an explicit future flow enables them.
- Granted permissions, missing permissions, required licenses, detected licenses, and module availability are stored as provider capability data.
- PureSOC never asks for or stores Global Administrator credentials. Tenant admin consent is an OAuth/admin-consent event, not a permanent human admin session.
- Exact Graph permission names must be validated against current Microsoft documentation during implementation and recorded in `docs/microsoft365-permissions.md`.

## Consequences

- Customers can connect Microsoft 365 for safe read-only assessment first.
- Missing licenses or permissions produce module status reasons instead of full connector failure.
- The future write path remains possible but gated by separate consent, entitlements, audit, preflight, approval, snapshots, verification, and evidence.
- Tests must assert token redaction, permission persistence, revoked consent handling, and graceful missing-permission behavior.
