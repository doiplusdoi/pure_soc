# Microsoft 365 Permission Bundles

Validated on 2026-04-30 against current Microsoft Learn references.

## Read-Only V1 Bundles

| Bundle | Permissions | Modules enabled |
|---|---|---|
| `m365_read_baseline` | `Organization.Read.All`, `Domain.Read.All`, `LicenseAssignment.Read.All`, `User.Read.All`, `GroupMember.Read.All`, `RoleManagement.Read.Directory`, `Application.Read.All`, `Policy.Read.All`, `AuditLog.Read.All` | Tenant profile, domains, licenses, users, groups, directory roles, role members, app registrations, service principals, Conditional Access policies, Entra directory audit logs, Entra sign-in logs |
| `m365_security_read` | `SecurityEvents.Read.All`, `SecurityIncident.Read.All`, `SecurityAlert.Read.All` | Secure Score and Defender XDR incidents/alerts where licensed and available |
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
| Conditional Access | `GET /identity/conditionalAccess/policies` | `Policy.Read.All` |
| Entra directory audit logs | `GET /auditLogs/directoryAudits` | `AuditLog.Read.All` |
| Entra sign-in logs | `GET /auditLogs/signIns` | `AuditLog.Read.All`; `Policy.Read.All` is required for applied Conditional Access policy details |
| Secure Score | `GET /security/secureScores` | `SecurityEvents.Read.All`; unsupported in China operated by 21Vianet |
| Intune devices | `GET /deviceManagement/managedDevices` | `DeviceManagementManagedDevices.Read.All` plus detected Intune license |
| Defender XDR incidents | `GET /security/incidents` | `SecurityIncident.Read.All` plus detected Defender XDR capability; unsupported in China operated by 21Vianet |
| Defender XDR alerts | `GET /security/alerts_v2` | `SecurityAlert.Read.All` plus detected Defender XDR capability; unsupported in China operated by 21Vianet |

## Implementation Notes

- The onboarding flow uses Microsoft Entra admin consent at `/adminconsent`, then app-only client credentials with `https://graph.microsoft.com/.default`.
- Granted app permissions are read from the token roles in the mocked/test path and persisted as permission bundle data.
- Provider credentials are stored encrypted; OAuth codes, access tokens, refresh tokens, client secrets, tenant secrets, and authorization headers must not be logged or returned by API responses.
- Graph pagination follows `@odata.nextLink`; retry handling honors throttled responses through module retry telemetry.
- Missing permission, missing license, revoked consent, throttling, or unsupported Graph areas produce module status data rather than failing the whole provider connection.
- M12 uses Microsoft Graph v1.0 security incidents and alerts v2. Legacy Defender XDR REST incident APIs remain a deferred fallback path and are not used by default.
- Exchange, SharePoint, Teams, and Purview posture modules intentionally return `unsupported_api` until a reliable read-only Graph-first signal model is selected and tested.

## Current Limitations

- Conditional Access, Entra audit/sign-in logs, Secure Score, Defender XDR incidents, and Defender XDR alerts are fixture-backed read modules. Live tenant rollout still needs production smoke coverage for customer licensing, retention windows, tenant security-provider enablement, and national-cloud endpoint behavior.
- Exchange, SharePoint, Teams, and Purview posture reads remain deferred because M12 did not select reliable Graph-first read-only signals for those modules.
- Secure Score, Defender XDR incidents, and Defender XDR alerts are not available in China operated by 21Vianet according to the Microsoft Learn Graph pages checked on 2026-04-30.
- Intune reads are gated by both permissions and detected service plans; `INTUNE_A` is the V1 detector used by the fixture and capability model.
- Defender XDR reads are gated by both Graph security permissions and detected `DEFENDER_XDR` service-plan fixture data. Real-world license/service-plan mapping still needs live tenant validation before production enablement.
- Application permission grant introspection through service principal app-role assignments is not yet persisted as a separate resource module.
- National cloud behavior is modeled at module-status level for documented unsupported Graph security paths; endpoint base-URL selection for sovereign clouds still needs runtime configuration before production use.

## External Smoke Readiness

M42 adds `pnpm external-smoke:readiness` as a dry-run readiness matrix for future Microsoft 365 live tenant smoke work. The command does not call Microsoft Graph or exchange tokens. It reports only prerequisite metadata:

- required client ID, client secret, and disposable/test tenant ID variable names;
- read-only bundle and module metadata from `@puresoc/provider-microsoft365`;
- disabled write bundles (`m365_remediation_write`, `m365_defender_write`);
- blocker status for missing configuration;
- unsafe status for production-like target indicators or write-scope/write-job enablement;
- live-candidate guardrails for explicit disposable/test confirmation and per-provider opt-in.

`ready_for_disposable_smoke` in this report means the local configuration and guardrails are present for a future approved read-only test-tenant run. It is not evidence that a live Microsoft tenant smoke has been executed.

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
- List Conditional Access policies: https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-policies
- List directory audit logs: https://learn.microsoft.com/en-us/graph/api/directoryaudit-list
- List sign-ins: https://learn.microsoft.com/en-us/graph/api/signin-list
- List Secure Scores: https://learn.microsoft.com/en-us/graph/api/security-list-securescores
- List Defender XDR incidents through Microsoft Graph security API: https://learn.microsoft.com/en-us/graph/api/security-list-incidents
- List Defender XDR alerts v2 through Microsoft Graph security API: https://learn.microsoft.com/en-us/graph/api/security-list-alerts_v2
- Microsoft Graph security API overview: https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview
- Microsoft Defender XDR incidents API overview, legacy REST fallback reference: https://learn.microsoft.com/en-us/defender-xdr/api-incident
- Graph paging: https://learn.microsoft.com/en-us/graph/paging
- Graph throttling guidance: https://learn.microsoft.com/en-us/graph/throttling
