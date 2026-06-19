# ADR-018: Partner Tenant Access

Status: accepted for demo implementation.

## Decision

PureSOC models partner-led access as explicit partner records, partner memberships, partner-to-tenant grants, and short-lived tenant-access sessions. The real actor remains the authenticated user. The effective tenant is carried by the tenant-access session and audit context; PureSOC does not issue a customer impersonation identity.

## Consequences

- Partner access requires an active partner membership and an active explicit tenant grant.
- Optional parent partner references are stored for future hierarchy, but inherited access is not implemented.
- Tenant-access sessions require a reason, can expire or end, and nested sessions are rejected.
- Customer data remains owned by `Organization`.
