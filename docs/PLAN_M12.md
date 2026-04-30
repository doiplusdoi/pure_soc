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
- Add supported Graph v1.0 read modules for Conditional Access, Entra directory audit logs, Entra sign-in logs, and Defender XDR incidents/alerts.
- Keep Exchange, SharePoint, Teams, and Purview posture reads as documented unsupported/deferred modules until reliable Graph-first signals are selected.
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

## Revalidated Microsoft Learn Inputs

Checked on 2026-04-30:

- Conditional Access policy list: `GET /identity/conditionalAccess/policies`, application `Policy.Read.All`, available in global, US Gov L4/L5, and China clouds.
- Sign-in logs: `GET /auditLogs/signIns`, application `AuditLog.Read.All`, with `Policy.Read.All` or related Conditional Access read permission needed for applied CA policy details.
- Directory audit logs: `GET /auditLogs/directoryAudits`, application `AuditLog.Read.All`.
- Secure Score: `GET /security/secureScores`, application `SecurityEvents.Read.All`, not available in China cloud.
- Defender incidents: `GET /security/incidents`, application `SecurityIncident.Read.All`, not available in China cloud.
- Defender alerts v2: `GET /security/alerts_v2`, application `SecurityAlert.Read.All`, not available in China cloud.

Implementation assumption: M12 uses Microsoft Graph v1.0 paths only. Legacy Defender XDR REST APIs remain documented as a deferred/non-default path because Graph security incidents and alerts now cover the V1 read-only fixture needs.

## Acceptance Criteria

- Permission mapping fixtures are updated and source-documented.
- Missing permissions, missing licenses, unsupported APIs, national-cloud limitations, and connector errors create module status records instead of failing the connection.
- Graph pagination and retry/throttling behavior are covered by tests.
- Each new module stores raw payloads before normalized resources/findings.
- Generic compliance code remains provider-neutral.
- GAP-007 is updated with revalidated permission details and unresolved Microsoft API limitations.

## Completion Log

Completed on 2026-04-30.

Changed files:

- `code/packages/providers/microsoft365/src/permissions.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-consent-graph-sync-permissions-redaction.spec.ts`
- `docs/microsoft365-permissions.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/PLAN_M12.md`
- `docs/PLAN_M13.md`

Implementation results:

- Added read-only module metadata for Conditional Access, Entra directory audit logs, Entra sign-in logs, and expanded Defender XDR incidents/alerts.
- Updated `m365_read_baseline` with `Policy.Read.All` and `AuditLog.Read.All`.
- Updated `m365_security_read` with `SecurityAlert.Read.All`.
- Added Graph v1.0 sync paths for Conditional Access policies, directory audit logs, sign-in logs, Defender incidents, and Defender alerts v2.
- Defender incidents and alerts now store raw payloads, normalize to provider-neutral resources, and emit high-severity provider findings.
- High severity Defender incidents create manual incident-triage recommendations; no write-back or write scopes were added.
- Requested Exchange, SharePoint, Teams, and Purview posture modules now return `unsupported_api` with a clear deferred status.
- Secure Score and Defender XDR modules return `unsupported_api` for the configured China national cloud.
- Tests now cover permission mapping, module happy paths, missing permissions, missing licenses, unsupported modules, national-cloud limitations, connector errors, pagination, throttling/retry, and token redaction.

Validation results:

```sh
flatpak-spawn --host sh -lc 'cd /mnt/solodata/SoloCode/pure_soc/code && npx pnpm@10.33.2 lint'
flatpak-spawn --host sh -lc 'cd /mnt/solodata/SoloCode/pure_soc/code && npx pnpm@10.33.2 test -- --runInBand microsoft365 graph-sync permissions redaction provider'
```

Both passed. Direct `pnpm` and `npx` were unavailable inside the sandbox shell, so validation used the repo-documented host Node/npm path.

Gaps updated:

- GAP-007 updated for 2026-04-30 Microsoft Learn permission revalidation and remaining runtime limitations.
- GAP-033 added for deferred Exchange, SharePoint, Teams, and Purview posture modules.

Acceptance status: passed for the fixture-backed M12 scope.

Residual risk:

- Live tenant smoke remains required for real Microsoft license/service-plan behavior, tenant security-provider enablement, sovereign-cloud base URL configuration, and collaboration/Purview posture module selection.
