# M77 Plan: Microsoft 365 Read-Only Disposable Tenant Smoke Handoff

## Summary

Prepare the outside-app disposable Microsoft 365 read-only tenant smoke with no write scopes and no remediation execution.

Status: completed app-side handoff.
Created: 2026-05-04.
Completed: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/microsoft365-permissions.md`
- `docs/PLAN_M12.md`
- `docs/PLAN_M45.md`
- `code/scripts/microsoft365-read-only-smoke.ts`
- `code/packages/providers/microsoft365`

## Goal

Convert Microsoft 365 readiness from deterministic fake-client coverage into an operator-ready outside-app checklist for a real disposable/test tenant, while preserving the read-only V1 posture.

## Handoff Checklist

External setup needed:

- Disposable/test Microsoft Entra tenant.
- PureSOC smoke app registration.
- Client ID and client secret for the disposable app.
- Tenant ID for the disposable tenant.
- Admin consent for read-only permission bundles only.
- Known license/service-plan state for Defender XDR, Intune, and Secure Score expectations.
- No customer production data.
- No Microsoft Graph write permissions.

Required guardrails:

- `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`
- `PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable`
- `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`
- `PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true`
- Microsoft 365 client ID/secret configured.
- Disposable/test tenant ID configured.

Execution sequence for the operator:

```sh
cd code
npm run external-smoke:readiness
npm run external-smoke:select-target
npm run microsoft365:smoke:read-only
```

Only run the final command if the selector chooses `microsoft365_read_only_tenant` as the single ready candidate.

Acceptance evidence to record:

- App-only token path works.
- Tenant profile and license/service-plan detection works.
- Users, groups, roles, applications, Conditional Access, audit/sign-in, Secure Score, Defender, and Intune modules either sync or degrade with explicit module status.
- Missing permission/license states degrade the module, not the entire connection.
- Provider-neutral resources/findings are stored through the existing contracts.
- No write scopes are requested or granted.
- No tenant IDs, tokens, raw payloads, live user emails, endpoint URLs, or credential envelopes are printed.

## Negative Constraints

- Do not request Microsoft Graph write scopes.
- Do not use production/customer tenants.
- Do not execute remediation/provider write actions.
- Do not add collaboration/Purview posture modules in this milestone.
- Do not represent fixture-backed fake-client tests as live Microsoft 365 proof.

## Completion Log

Completed 2026-05-04 as the Microsoft 365 read-only smoke handoff.

Changed files:

- `docs/PLAN_M77.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Acceptance status:

- The outside-app tenant checklist is ready.
- GAP-044 and the deferred Microsoft live-smoke portion of GAP-007 remain open until an approved disposable tenant is configured, selected, and executed.
- GAP-033 remains open for future collaboration/Purview read-module expansion.
