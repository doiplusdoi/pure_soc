# ADR-021: Microsoft Consent And Demo Mode

Status: accepted for demo fixture/live boundary.

## Decision

The partner demo uses one platform-owned multitenant Microsoft Entra application with tenant-wide admin consent. Fixture mode must pass through the same normalization, evidence, report, and recommendation paths as live mode. Explicit live mode fails safely when required connector configuration is missing.

Milestone 5 implements `fixture`, `live`, and `auto` connector modes. Fixture mode completes the PureSOC consent callback with a synthetic tenant and encrypted synthetic app-only token, then runs the same provider connector pipeline as live mode. Auto mode uses live only when the platform connector app has both client ID and client secret; otherwise it uses fixture mode and exposes the effective mode through health metadata.

The demo module set is tenant profile, subscription/license inventory, users/groups/roles, MFA registration, and Secure Score. The MFA module uses Microsoft Graph v1.0 `/reports/authenticationMethods/userRegistrationDetails`, which Microsoft documents with `AuditLog.Read.All` application permission. Secure Score uses `/security/secureScores` with `SecurityEvents.Read.All`; subscribed SKUs use `/subscribedSkus` with `LicenseAssignment.Read.All`.

## Consequences

- Customer tenants do not create their own app registrations.
- The platform credential remains environment-provided and is never stored as a customer secret.
- Microsoft writes, write scopes, and live remediation stay disabled.
- Live Microsoft smoke remains optional and must use an approved disposable tenant.
- Report version 2 and opportunity logic must consume stored provider resources from the connector pipeline, not a separate fixture-only state model.
