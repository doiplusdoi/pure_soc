# M74 Plan: Customer-Shaped Romania Readiness Flow Handoff

## Summary

Define the V1 customer-shaped Romania readiness path from account access through onboarding, source-linked gaps, evidence, report/export, billing state, and audit trail.

Status: completed app-side handoff.
Created: 2026-05-04.
Completed: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/PLAN_M53.md`
- `docs/PLAN_M59.md`
- `docs/PLAN_M60.md`
- `docs/PLAN_M64.md`
- `docs/PLAN_M69.md`
- `code/apps/web`
- `code/apps/api`
- `code/packages/compliance/nis2/country-packs/ro`

## Goal

Stop treating product finish as isolated package contracts and define one coherent Romania-first path that can become the private-beta demo and onboarding flow.

## V1 Flow

The target read-only customer path is:

```txt
register/login
create/select workspace
open Romania readiness/onboarding
capture organization profile and preliminary classification
generate source-linked notification draft and readiness plan
connect mock or live-read-only Microsoft 365 posture data
produce gaps, recommendations, and accepted-risk state
upload/link evidence
generate report/export with legal caveat
show billing entitlement state
show audit trail and review-required country-pack status
```

Current app-side support:

- Login/session/workspace selection is API-backed in the served web runtime.
- Dashboard snapshots render from API output records for selected organizations.
- Romania onboarding/readiness route exists and displays source-map, caveat, fallback, unsupported-state, and no-DNSC metadata.
- Local UI/browser smokes cover the route without live external calls.
- Evidence/report/dashboard/billing/audit contracts exist and have runtime adapters, but they are not yet one polished customer wizard.

Remaining app gaps:

- Persisted Romania onboarding wizard state.
- Customer-facing classification progression through API-backed form steps.
- Visible source-map review affordances for each generated readiness item.
- Report/export action wired into the served customer path.
- Billing entitlement state visible in the served flow.
- Full customer-grade Next.js/React or deliberately chosen alternative runtime, if the lightweight web server is not the launch frontend.

## Negative Constraints

- Keep V1 provider integrations read-only.
- Do not implement direct authority submission.
- Do not claim legal compliance or certification.
- Do not route workbook-derived legal logic around review-required activation.
- Do not implement Microsoft Graph write actions.

## Completion Log

Completed 2026-05-04 as the customer-flow handoff for the next product-runtime slice.

Changed files:

- `docs/PLAN_M74.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`

Acceptance status:

- The V1 demo/private-beta path is explicit.
- Runtime implementation remains a future slice after the outside-app Stripe/O365/KMS work begins.
