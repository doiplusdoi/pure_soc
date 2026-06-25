# PureSOC Route Map

The current web app is a lightweight `node:http` product shell. It already exposes useful product pages, but the canonical route model is organization-contextual and partner-aware. This document defines the target route tree and migration plan.

## Current Web Routes

Current product shell routes include:

- `/dashboard`
- `/onboarding`
- `/gap-analyzer`
- `/microsoft365`
- `/connectors`
- `/connectors/microsoft365`
- `/remediation`
- `/evidence`
- `/reports`
- `/settings`
- `/customers`
- Legacy provider routes such as `/providers/microsoft365`

These routes are useful for the current local product, but they do not make the active organization, partner relationship, or setup context explicit in the URL.

## Target Route Tree

### Setup

- `/app/setup`
- `/app/setup/organization`
- `/app/setup/jurisdiction`
- `/app/setup/services`
- `/app/setup/people`
- `/app/setup/systems`
- `/app/setup/suppliers`
- `/app/setup/microsoft365`
- `/app/setup/review`

Purpose: guided customer setup with resumable state, autosave, validation, and launch readiness.

### Direct Customer Organization

- `/app/o/:organizationId`
- `/app/o/:organizationId/overview`
- `/app/o/:organizationId/security`
- `/app/o/:organizationId/security/assets`
- `/app/o/:organizationId/security/findings`
- `/app/o/:organizationId/security/incidents`
- `/app/o/:organizationId/security/remediation`
- `/app/o/:organizationId/compliance`
- `/app/o/:organizationId/compliance/nis2`
- `/app/o/:organizationId/compliance/controls`
- `/app/o/:organizationId/compliance/evidence`
- `/app/o/:organizationId/compliance/risks`
- `/app/o/:organizationId/compliance/suppliers`
- `/app/o/:organizationId/compliance/policies`
- `/app/o/:organizationId/compliance/calendar`
- `/app/o/:organizationId/connectors`
- `/app/o/:organizationId/connectors/microsoft365`
- `/app/o/:organizationId/reports`
- `/app/o/:organizationId/reports/:reportId`
- `/app/o/:organizationId/audit`
- `/app/o/:organizationId/settings`
- `/app/o/:organizationId/settings/members`
- `/app/o/:organizationId/settings/billing`

Purpose: daily customer workspace with explicit tenant context.

### Partner Workspace

- `/app/partner/:partnerId`
- `/app/partner/:partnerId/customers`
- `/app/partner/:partnerId/customers/invitations`
- `/app/partner/:partnerId/customers/:organizationId`
- `/app/partner/:partnerId/customers/:organizationId/overview`
- `/app/partner/:partnerId/customers/:organizationId/security`
- `/app/partner/:partnerId/customers/:organizationId/compliance`
- `/app/partner/:partnerId/customers/:organizationId/reports`
- `/app/partner/:partnerId/assignments`
- `/app/partner/:partnerId/team`
- `/app/partner/:partnerId/audit`
- `/app/partner/:partnerId/settings`

Purpose: partner portfolio operations, customer assignments, and delegated access without hiding customer boundaries.

### Platform Administration

- `/app/admin`
- `/app/admin/organizations`
- `/app/admin/partners`
- `/app/admin/country-packs`
- `/app/admin/connectors`
- `/app/admin/audit`
- `/app/admin/support-sessions`
- `/app/admin/health`

Purpose: platform operations, country-pack review, connector health, and exceptional support access.

## Route Migration Plan

Implementation note, 2026-06-25: `/app/o/:organizationId/*` now renders a compact product v1 console against `/api/v1`, including setup, business context, security work, incidents, risks, governance, evidence, reports, connector capabilities, and internal events. The route keeps the organization ID explicit, forwards create/save forms to organization-scoped v1 endpoints, and surfaces v1 authorization rejection instead of silently changing context. `/app/setup/*`, `/app/partner/:partnerId/*`, and `/app/admin/*` remain compatibility aliases until equivalent dedicated screens and smokes exist.

1. **Add context resolver**
   - Resolve active organization, partner, relationship, assignment, and role from the URL.
   - Render an always-visible organization/customer context in partner and support views.
   - Keep current routes as compatibility redirects or aliases.

2. **Move setup routes**
   - Implement `/app/setup/*` using existing onboarding services first.
   - Add missing steps for people, systems, suppliers, Microsoft 365, and review.
   - Save each step independently and make completion state explicit.

3. **Introduce organization routes**
   - Status: partially implemented for direct `/app/o/:organizationId/*` product v1 console routes.
   - Map remaining legacy route-specific details from `/dashboard`, `/microsoft365`, `/evidence`, `/reports`, `/settings`, and `/remediation` into richer `/app/o/:organizationId/*` screens.
   - Keep authorization tests that prove a user cannot swap organization IDs.

4. **Introduce partner routes**
   - Move `/customers` into `/app/partner/:partnerId/customers`.
   - Add relationship lifecycle and assignment UI before expanding partner operations.
   - Require partner context and customer context for every delegated action.

5. **Add admin/support routes**
   - Add read-only country-pack and connector health operations first.
   - Add support-session workflows only after the support access domain model exists.

6. **Deprecate old routes**
   - Keep compatibility redirects until browser smokes and API clients use the new route tree.
   - Remove old route handlers only after route-level tests prove parity.

## Route Guardrails

- Do not infer tenant context from local storage or display names.
- Do not let partner navigation hide that the user is acting inside a customer organization.
- Do not allow support-session routes to reuse normal partner delegated access.
- Keep destructive or provider-write actions behind explicit confirmation screens, policy checks, and recent auth where required.
- Preserve existing working routes until the new routes have tests and smoke coverage.
