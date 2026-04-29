# Microsoft 365 Permission Bundles

Validated on 2026-04-28 against current Microsoft Learn references.

## Read-Only V1 Bundles

| Bundle | Permissions | Modules enabled |
|---|---|---|
| `m365_read_baseline` | `Organization.Read.All`, `Domain.Read.All`, `LicenseAssignment.Read.All`, `User.Read.All`, `GroupMember.Read.All`, `RoleManagement.Read.Directory`, `Application.Read.All` | Tenant profile, domains, licenses, users, groups, directory roles, role members, app registrations, service principals |
| `m365_security_read` | `SecurityEvents.Read.All`, `SecurityIncident.Read.All` | Secure Score and future Defender XDR incident reads where licensed |
| `m365_intune_read` | `DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All` | Intune managed device reads where `INTUNE_A` is detected |

Write bundles stay separate and are not requested during first onboarding:

| Bundle | Status |
|---|---|
| `m365_remediation_write` | Disabled until approval, preflight, snapshots, verification, audit logging, and evidence exist |
| `m365_defender_write` | Disabled until Defender write-back has a separate approval-gated consent path |

## Endpoint Mapping

| Module | Graph endpoints | Least-privilege permissions used |
|---|---|---|
| Tenant profile | `GET /organization`, `GET /domains` | `Organization.Read.All`, `Domain.Read.All` |
| Licensing | `GET /subscribedSkus` | `LicenseAssignment.Read.All` |
| Users/groups/roles | `GET /users`, `GET /groups`, `GET /directoryRoles`, `GET /directoryRoles/{id}/members` | `User.Read.All`, `GroupMember.Read.All`, `RoleManagement.Read.Directory` |
| Applications | `GET /applications`, `GET /servicePrincipals` | `Application.Read.All` |
| Secure Score | `GET /security/secureScores` | `SecurityEvents.Read.All` |
| Intune devices | `GET /deviceManagement/managedDevices` | `DeviceManagementManagedDevices.Read.All` plus detected Intune license |

## Implementation Notes

- The onboarding flow uses Microsoft Entra admin consent at `/adminconsent`, then app-only client credentials with `https://graph.microsoft.com/.default`.
- Granted app permissions are read from the token roles in the mocked/test path and persisted as permission bundle data.
- Provider credentials are stored encrypted; OAuth codes, access tokens, refresh tokens, client secrets, tenant secrets, and authorization headers must not be logged or returned by API responses.
- Graph pagination follows `@odata.nextLink`; retry handling honors throttled responses through module retry telemetry.
- Missing permission, missing license, revoked consent, throttling, or unsupported Graph areas produce module status data rather than failing the whole provider connection.

## Current Limitations

- Conditional Access, Entra audit/sign-in logs, Exchange, SharePoint, Teams, Purview, and Defender XDR live reads need separate endpoint validation before production enablement.
- Secure Score is available through Graph security APIs, but customer licensing and tenant feature availability can still produce module-level unavailable or forbidden statuses.
- Intune reads are gated by both permissions and detected service plans; `INTUNE_A` is the V1 detector used by the fixture and capability model.
- Application permission grant introspection through service principal app-role assignments is not yet persisted as a separate resource module.
- National cloud behavior is not yet modeled beyond using standard Microsoft Graph endpoint shapes.

## Microsoft Learn References

- App-only access and admin consent: https://learn.microsoft.com/en-us/graph/auth-v2-service
- Permission overview and least privilege guidance: https://learn.microsoft.com/en-us/graph/permissions-overview
- Permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- List organizations: https://learn.microsoft.com/en-us/graph/api/organization-list
- List domains: https://learn.microsoft.com/en-us/graph/api/domain-list
- List subscribed SKUs: https://learn.microsoft.com/en-us/graph/api/subscribedsku-list
- List users: https://learn.microsoft.com/en-us/graph/api/user-list
- List groups: https://learn.microsoft.com/en-us/graph/api/group-list
- List directory roles: https://learn.microsoft.com/en-us/graph/api/directoryrole-list
- List service principals: https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list
- List applications: https://learn.microsoft.com/en-us/graph/api/application-list
- List Secure Scores: https://learn.microsoft.com/en-us/graph/api/security-list-securescores
- Graph paging: https://learn.microsoft.com/en-us/graph/paging
- Graph throttling guidance: https://learn.microsoft.com/en-us/graph/throttling
