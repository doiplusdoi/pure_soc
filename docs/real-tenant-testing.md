# PureSOC Real Tenant Testing Runbook

Status: operator runbook for read-only tenant validation.
Created: 2026-05-29.

This runbook explains how to test PureSOC against real Microsoft 365 tenants without turning the test into an accidental production rollout.

The current product posture is:

- read-only Microsoft 365 provider testing only;
- no Microsoft Graph write scopes;
- no remediation execution;
- no direct DNSC or authority submission;
- no legal certification claim;
- no production/customer tenant until disposable and friendly-pilot evidence exists.
- customer tenants connect through the PureSOC platform Microsoft Entra app and tenant admin consent; they must not create their own Azure app registrations for the product GUI flow.

## Tenant Ladder

Use this order. Do not start with a paying customer's production tenant.

| Stage | Tenant type | Purpose | Allowed? |
|---|---|---|---|
| 1 | Disposable/test tenant | Prove app registration, admin consent, token acquisition, module degradation, and sanitized output. | Yes, first live target. |
| 2 | Friendly/internal pilot tenant | Prove realistic licenses, users, Conditional Access, audit logs, Intune, Defender XDR, and module status behavior. | Yes, after stage 1 passes. |
| 3 | Friendly customer pilot tenant | Prove customer consent workflow, data minimization, support process, and report usefulness. | Yes, only with written authorization. |
| 4 | Production customer tenant | Private beta readiness. | Only after product/legal approval and at least one earlier real tenant pass. |

## Current Repo Capability

The repository already has a guarded Microsoft 365 live-smoke path:

```sh
cd code
pnpm external-smoke:readiness
pnpm external-smoke:select-target
pnpm microsoft365:smoke:read-only
```

The Microsoft 365 smoke runner is dry-run by default. In live-candidate mode it refuses to proceed unless:

- the selected path is `microsoft365_read_only_tenant`;
- exactly one approved disposable/test target is ready;
- `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`;
- `PURESOC_EXTERNAL_SMOKE_TARGET_KIND` is `local`, `development`, `test`, `ci`, or `disposable`;
- `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`;
- `PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true`;
- Microsoft 365 client ID, client secret, and tenant ID are configured;
- connector defaults remain read-only and Microsoft write scopes remain disabled.

The current smoke runner uses the public Microsoft cloud endpoints:

```txt
https://login.microsoftonline.com
https://graph.microsoft.com/v1.0
```

Sovereign-cloud tenant testing is not ready yet because endpoint selection remains deferred.

## Microsoft App Registration And Consent

For the product GUI connector, PureSOC owns one configured multitenant Microsoft Entra app registration per deployment/environment. Customer tenants use Microsoft admin consent to approve that PureSOC platform app; they do not create customer-owned Azure app registrations.

Create a dedicated app registration for live-smoke testing only. Do not reuse a future production app registration for disposable smoke.

Recommended names:

```txt
PureSOC disposable read-only smoke
PureSOC friendly pilot read-only
PureSOC production read-only
```

For one disposable tenant, a single-tenant app is acceptable for the smoke CLI. For testing the customer admin-consent product flow across multiple tenants, use a multi-tenant app registration in the PureSOC-controlled home tenant and have each test tenant admin grant consent from the PureSOC workspace connector page.

Record these values securely:

```txt
Application/client ID
Directory/tenant ID for the test tenant
Client secret, certificate, or federated credential
Admin-consent redirect URI
Consent timestamp
Admin who approved consent
Permission set approved
```

Client secrets are acceptable for disposable smoke, but production should move to certificates or federated credentials.

## Permission Bundles

Use only the read bundles for V1 tenant testing.

| Bundle | Permissions |
|---|---|
| `m365_read_baseline` | `Organization.Read.All`, `Domain.Read.All`, `LicenseAssignment.Read.All`, `User.Read.All`, `GroupMember.Read.All`, `RoleManagement.Read.Directory`, `Application.Read.All`, `Policy.Read.All`, `AuditLog.Read.All` |
| `m365_security_read` | `SecurityEvents.Read.All`, `SecurityIncident.Read.All`, `SecurityAlert.Read.All` |
| `m365_intune_read` | `DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All` |

Do not grant these write bundles during real-tenant testing:

```txt
m365_remediation_write
m365_defender_write
```

In Microsoft Entra, configure these as Microsoft Graph application permissions on the PureSOC connector app, then grant tenant-wide admin consent.

For application permissions, use Microsoft identity platform v2 admin consent with `scope=https://graph.microsoft.com/.default`. Use `organizations` before the tenant is known, or a tenant ID when the tenant is known; do not use `common`.

## Tenant Data Matrix

At minimum, test these tenant shapes before customer launch:

| Scenario | Tenant shape | Expected result |
|---|---|---|
| Healthy baseline | Users, groups, roles, apps, domains, licenses. | Tenant profile, licensing, identity, and app modules pass. |
| Missing optional license | No Intune and/or no Defender XDR. | Optional modules degrade with `missing_license`, not full sync failure. |
| Missing optional permission | Consent baseline only, omit security or Intune bundle. | Affected modules degrade with `missing_permission`, not full sync failure. |
| Audit/log retention limitation | Tenant has limited sign-in/audit history. | Log modules return explicit module status and no crash. |
| Throttling/retry | Repeated smoke or large test tenant. | 429 handling respects retry/backoff metadata. |
| Revoked consent | Remove enterprise-app consent after a successful test. | Connector reports revoked consent/degraded state. |
| Conditional Access present | Tenant has one or more CA policies. | CA module reads policies or returns permission/license limitation. |
| Defender XDR present | Tenant has Defender XDR incidents/alerts capability. | Security modules read or degrade honestly. |
| Intune present | Tenant has managed devices and Intune service plan. | Intune module reads or degrades honestly. |

Do not create fake customer data in product routes. Synthetic data is fine inside disposable tenants as long as the test record labels say it is synthetic.

## Stage 1: Disposable Tenant Smoke

1. Create or choose a disposable Microsoft 365 tenant.
2. Register the read-only smoke app.
3. Add only the read application permissions above.
4. Grant admin consent in that tenant.
5. Use `docs/microsoft365-read-only-smoke.env.example` as the environment shape. Put real values only in a private, ignored local environment file or an operator-owned secret store.
6. Optional but recommended: create a private local env file from the example and keep it out of git:

```sh
cp ../docs/microsoft365-read-only-smoke.env.example .env.microsoft365-smoke.local
```

Then replace only placeholder values in that private file. The sample is dry-run by default; enable the live-candidate guardrails only after the disposable/test tenant is approved.

7. Run readiness first:

```sh
cd code
pnpm external-smoke:readiness
pnpm external-smoke:select-target
```

8. Only continue if the selector reports:

```txt
outcome=ready_path_selected
selectedPathId=microsoft365_read_only_tenant
readyCandidateCount=1
```

9. Set the live-candidate environment:

```sh
export PURESOC_EXTERNAL_SMOKE_MODE=live_candidate
export PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable
export PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true
export PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true

export PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID="<test-app-client-id>"
export PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET="<test-app-client-secret>"
export PURESOC_MICROSOFT365_SMOKE_TENANT_ID="<test-tenant-id>"

export PURESOC_PROVIDER_TOKEN_KEY_ID="m365-smoke-local"
export PURESOC_PROVIDER_TOKEN_KEY="<strong-local-disposable-key-material>"
export PURESOC_CONNECTOR_RUNNER_ALLOW_PROVIDER_WRITES=false
```

10. Re-run the selector. Then run:

```sh
pnpm microsoft365:smoke:read-only > /tmp/puresoc-m365-read-only-smoke.json
```

11. Preserve the sanitized JSON report as evidence. It should not contain client secrets, access tokens, tenant IDs, endpoint URLs, raw tenant payloads, live user emails, or credential envelopes.

## Stage 1 Acceptance

The disposable tenant run is acceptable when the smoke report proves:

- status is `passed`, or any failure is limited to clear module-level permission/license/availability status;
- app-only token acquisition succeeded;
- provider credential envelope was created without being returned;
- provider connection is read-enabled and write-disabled;
- provider pipeline ran read-only modules;
- module statuses are visible;
- raw/normalized/finding/recommendation counts are present;
- write scopes were not requested;
- provider writes were disabled.

If the run fails before token acquisition, fix app registration, tenant ID, consent, or secret setup before touching product code.

## Stage 2: Friendly/Internal Pilot Tenant

After one disposable pass:

1. Use a tenant where you can safely inspect expected state.
2. Keep the same read-only permission set.
3. Document license expectations before the run:

```txt
Intune present? yes/no
Defender XDR present? yes/no
Conditional Access policies present? yes/no
Audit/sign-in logs available? yes/no/limited retention
Expected user/group/app count range
```

4. Run the same selector-first process.
5. Compare module status to the known tenant shape.
6. Record any mismatch as a product bug or a gap-register update.

## Stage 3: Friendly Customer Pilot

Before using a customer tenant, require:

- written authorization from the customer;
- tenant admin approval for the exact read-only permission list;
- a named PureSOC operator and customer contact;
- a test window and rollback plan, even though this is read-only;
- data handling agreement or equivalent approval;
- confirmation that no remediation/write action will run;
- agreement that output is internal readiness, not legal certification.

Run the same selector-first flow. Do not bypass `external-smoke:select-target`.

For the first customer pilot, prefer a tenant where the customer already understands their Microsoft 365 posture and can tell whether module output looks plausible.

## Stage 4: Production Customer Readiness

Do not treat one successful smoke as production readiness. Before broader production tenant onboarding:

- run at least one disposable tenant and one friendly pilot tenant;
- review sanitized output for accidental sensitive data;
- verify module-level degradation behavior for missing licenses and missing permissions;
- document customer support triage for 401, 403, 429, consent revoked, and missing-license outcomes;
- confirm provider-token custody for the deployment target;
- confirm audit retention/export posture;
- confirm legal copy and readiness score wording;
- decide whether production will use a dedicated production app registration and certificate/federated credential.

## Common Failure Triage

| Symptom | Likely cause | Action |
|---|---|---|
| `microsoft365_client_id_missing` | Connector app client ID env missing. | Set `PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID`. |
| `microsoft365_client_secret_missing` | Connector app secret env missing. | Set `PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET` from a disposable app credential. |
| `microsoft365_tenant_id_missing` | Tenant ID env missing. | Set `PURESOC_MICROSOFT365_SMOKE_TENANT_ID`. |
| `readiness_status_not_ready` | Selector/readiness did not approve target. | Fix blockers before running the live command. |
| `external_smoke_disposable_target_not_confirmed` | Missing safe target kind or confirmation. | Set safe target kind and confirmation only for approved test targets. |
| Tenant mismatch | Token tenant differs from configured tenant. | Check tenant ID and app registration/consent target. |
| 401 or invalid client | Bad secret, wrong client ID, expired secret, or wrong authority. | Rotate secret or fix app registration. |
| 403 forbidden | Missing Graph application permission or admin consent. | Add permission and re-consent. |
| 429 throttling | Graph throttling. | Respect `Retry-After`; reduce frequency and avoid immediate retries. |
| Missing license status | Intune/Defender feature not licensed or unavailable. | Record as expected degradation if tenant lacks the service. |
| Revoked consent | Enterprise app consent removed or app disabled. | Re-consent or mark connection revoked. |

## Evidence To Keep

Use `docs/real-tenant-test-record-template.md` for each run. Store completed records in a private test-evidence location, but do not commit secrets:

```txt
Date and operator
Tenant class: disposable, internal pilot, customer pilot
App registration name
Permission bundles approved
Consent timestamp
Expected license/service-plan notes
Readiness selector output
Sanitized smoke JSON output
Module status summary
Known failures and gap IDs
Confirmation that no write scopes/actions ran
```

Do not store:

```txt
Client secrets
Access tokens
Refresh tokens
Tenant IDs in shared/public docs
Raw Graph payloads
Live user emails
Endpoint URLs containing tenant/customer identifiers
Provider credential envelopes
```

## Current Product Gaps Before Broad Customer Testing

These gaps must remain visible:

- `GAP-044`: no approved live external smoke target has run yet.
- `GAP-007`: Microsoft live tenant validation is still deferred until the first approved tenant smoke succeeds.
- `GAP-033`: Exchange, SharePoint, Teams, and Purview read modules remain deferred.
- `GAP-040`: real SaaS KMS/HSM/secret-manager custody is not implemented.
- `GAP-030`: provider write execution remains disabled and should stay out of V1 testing.
- `GAP-021`: readiness scoring still needs product/legal calibration.

## Official References

- Microsoft Graph app-only access and client credentials flow: https://learn.microsoft.com/en-us/graph/auth-v2-service
- Microsoft identity platform admin consent endpoint: https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft Graph throttling guidance: https://learn.microsoft.com/en-us/graph/throttling
