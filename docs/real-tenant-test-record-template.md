# PureSOC Real Tenant Test Record Template

Use this template for each real Microsoft 365 tenant validation run. Keep the completed record in a private test-evidence location. Do not commit secrets, tenant identifiers, raw Graph payloads, live user emails, endpoint URLs, or credential envelopes.

## Run Summary

```txt
Record ID:
Date:
Operator:
Reviewer:
Tenant class: disposable | internal_pilot | customer_pilot | production_readiness
Tenant label or pseudonym:
Customer authorization reference, if applicable:
PureSOC commit SHA:
PureSOC deployment mode: local | in_a_box | ci | disposable_deployment
Command run:
Sanitized output path:
Overall result: passed | failed | blocked | partial
```

## Safety Confirmation

```txt
Written customer authorization required? yes | no
Written customer authorization obtained? yes | no | not_applicable
Permission set reviewed? yes | no
Read-only bundles only? yes | no
Microsoft write scopes absent? yes | no
Provider write jobs disabled? yes | no
Remediation execution disabled? yes | no
No direct DNSC/national-authority submission? yes | no
Output labeled internal readiness, not legal certification? yes | no
```

## Tenant/App Setup

```txt
App registration name:
App registration tenant model: single_tenant | multi_tenant
Admin consent granted? yes | no
Admin consent timestamp:
Consenting admin role:
Credential type used: client_secret | certificate | federated_credential
Credential expiry date:
Tenant expected Intune availability: yes | no | unknown
Tenant expected Defender XDR availability: yes | no | unknown
Tenant expected Conditional Access policies: yes | no | unknown
Tenant expected audit/sign-in logs: yes | no | limited_retention | unknown
Expected user count range:
Expected group count range:
Expected application/service-principal count range:
```

## Approved Permission Bundles

```txt
m365_read_baseline approved? yes | no
m365_security_read approved? yes | no
m365_intune_read approved? yes | no
m365_remediation_write approved? must_be_no
m365_defender_write approved? must_be_no
Unexpected Microsoft Graph permissions found? yes | no
Unexpected permission notes:
```

## Readiness Selector Evidence

```txt
external-smoke readiness command:
external-smoke selector command:
selector outcome:
selectedPathId:
readyCandidateCount:
blocker codes:
guardrail issues:
```

## Smoke Command Evidence

```txt
Smoke command:
Smoke status: passed | failed | blocked | partial
Exit code:
liveNetworkCallsMade: true | false
providerWritesEnabled: true | false
writeScopesRequested: true | false
writeBundlesEnabled: true | false
secretValuesReturned: true | false
tokenValuesReturned: true | false
tenantPayloadsReturned: true | false
endpointUrlsReturned: true | false
```

## Module Results

```txt
Sync run status:
Raw resource count:
Normalized resource count:
Finding count:
Recommendation count:
```

| Module | Expected | Actual status | Notes |
|---|---|---|---|
| tenant-profile |  |  |  |
| licensing |  |  |  |
| users-groups-roles |  |  |  |
| applications |  |  |  |
| conditional-access |  |  |  |
| entra-audit-logs |  |  |  |
| entra-sign-in-logs |  |  |  |
| secure-score |  |  |  |
| intune-devices |  |  |  |
| defender-xdr |  |  |  |

## Failure Or Degradation Notes

```txt
Missing permissions:
Missing licenses:
Unsupported APIs/clouds:
Throttling or retry behavior:
Revoked consent behavior:
Connector errors:
Unexpected sensitive output:
```

## Follow-Up

```txt
Accepted for next testing stage? yes | no
Next stage: disposable | internal_pilot | customer_pilot | production_readiness | stop
Gap IDs updated:
Product bugs filed:
Docs updated:
Operator notes:
Reviewer sign-off:
```

## Data Handling Reminder

Do not include:

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
