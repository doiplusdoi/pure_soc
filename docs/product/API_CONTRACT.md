# PureSOC API Contract Plan

The product constitution requires an API-first product with stable `/api/v1` resource and command endpoints, a consistent error shape, OpenAPI documentation, and async operation semantics. The current implementation has a useful product facade under `/api/*` plus older internal routes. This plan migrates without breaking the current local product.

## Current API Shape

Current API surfaces include:

- Product facade routes for dashboard, workspaces, customers, country packs, onboarding, readiness, gaps, recommendations, Microsoft 365, connectors, remediation, evidence, reports, and audit.
- Organization-scoped internal routes for auth, partners, provider connections, compliance, evidence, reports, notifications, billing, and regulatory data.
- Some routes are compatibility aliases for the current web shell.

Current gaps:

- `/api/v1` now exists for the first constitution-alignment slice, but it is still a compatibility layer over mixed mature repositories and product-v1 state records.
- OpenAPI exists as checked-in route metadata, but generated schema validation is not yet the source of truth.
- Error, pagination, filtering, idempotency, and async operation shapes are enforced for current v1 routes but not uniformly across older compatibility routes.
- Product commands and resources are mixed with older route semantics.
- Destructive and provider-write aliases are correctly guarded, but their final command contracts are not yet defined.

Implementation note, 2026-06-25: `/api/v1` includes request/correlation IDs, error envelopes, pagination/filtering, idempotent operation records, organization/partner/support/setup resources, country-pack metadata, Microsoft capability/disconnect views, product workflow aggregates, FileObject/retention resources, immutable report snapshots, and internal-event handoff records. Existing `/api/*` routes remain compatibility facades.

## Target Cross-Cutting Contract

### Error Shape

Every failed request should return:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable summary",
    "details": {},
    "requestId": "req_...",
    "fieldErrors": []
  }
}
```

Rules:

- `code` is stable and localization-friendly.
- `message` is safe for customers.
- `details` contains no secrets, tokens, stack traces, raw provider credentials, or unnecessary provider payloads.
- `requestId` maps to logs and audit where appropriate.
- Validation errors include field paths.

### Pagination And Filtering

List endpoints should support:

- `limit`
- `cursor`
- `sort`
- `filter[...]`
- `include`

Responses should include:

```json
{
  "data": [],
  "page": {
    "nextCursor": null,
    "limit": 50
  }
}
```

### Idempotency

Command endpoints that create external effects should accept:

- `Idempotency-Key`
- `X-PureSOC-Request-Reason` for audited sensitive operations where applicable

The server must persist command identity for provider actions, report generation, relationship invitations, and billing-affecting commands.

### Async Operations

Long-running commands should return `202 Accepted` with:

```json
{
  "operationId": "op_...",
  "status": "queued",
  "links": {
    "self": "/api/v1/operations/op_..."
  }
}
```

Operation resources should expose queued, running, succeeded, failed, canceled, and expired states with safe progress metadata.

## Target Resource Areas

### Identity And Organizations

- `GET /api/v1/me`
- `GET /api/v1/organizations`
- `POST /api/v1/organizations`
- `GET /api/v1/organizations/:organizationId`
- `PATCH /api/v1/organizations/:organizationId`
- `GET /api/v1/organizations/:organizationId/members`
- `POST /api/v1/organizations/:organizationId/invitations`
- `GET /api/v1/organizations/:organizationId/permissions`

### Partners And Relationships

- `GET /api/v1/partners`
- `POST /api/v1/partners`
- `GET /api/v1/partners/:partnerId`
- `GET /api/v1/partners/:partnerId/customers`
- `POST /api/v1/partners/:partnerId/customer-invitations`
- `POST /api/v1/organization-relationships/:relationshipId/accept`
- `POST /api/v1/organization-relationships/:relationshipId/suspend`
- `POST /api/v1/organization-relationships/:relationshipId/request-termination`
- `POST /api/v1/organization-relationships/:relationshipId/terminate`
- `GET /api/v1/partners/:partnerId/assignments`
- `POST /api/v1/partners/:partnerId/assignments`

### Support Sessions

- `POST /api/v1/support-sessions`
- `GET /api/v1/support-sessions`
- `POST /api/v1/support-sessions/:supportSessionId/end`

Support sessions require reason, expiry, policy authorization, customer-visible audit, and strict separation from delegated partner access.

### Setup And Business Context

- `GET /api/v1/organizations/:organizationId/setup`
- `PUT /api/v1/organizations/:organizationId/setup/:step`
- `POST /api/v1/organizations/:organizationId/setup/launch`
- `GET /api/v1/organizations/:organizationId/business-services`
- `POST /api/v1/organizations/:organizationId/business-services`
- `GET /api/v1/organizations/:organizationId/suppliers`
- `POST /api/v1/organizations/:organizationId/suppliers`
- `GET /api/v1/organizations/:organizationId/responsibilities`
- `PUT /api/v1/organizations/:organizationId/responsibilities/:responsibilityId`

### Country Packs And Compliance

- `GET /api/v1/country-packs`
- `GET /api/v1/country-packs/:countryCode`
- `GET /api/v1/organizations/:organizationId/compliance/classification`
- `POST /api/v1/organizations/:organizationId/compliance/classification/run`
- `GET /api/v1/organizations/:organizationId/controls`
- `PATCH /api/v1/organizations/:organizationId/controls/:controlId`
- `GET /api/v1/organizations/:organizationId/evidence`
- `POST /api/v1/organizations/:organizationId/evidence`
- `GET /api/v1/organizations/:organizationId/risks`
- `POST /api/v1/organizations/:organizationId/risks`
- `GET /api/v1/organizations/:organizationId/policies`
- `POST /api/v1/organizations/:organizationId/policies`

### Microsoft 365 And Connectors

- `GET /api/v1/organizations/:organizationId/connectors`
- `GET /api/v1/organizations/:organizationId/connectors/microsoft365`
- `POST /api/v1/organizations/:organizationId/connectors/microsoft365/consent-sessions`
- `POST /api/v1/organizations/:organizationId/connectors/microsoft365/callback`
- `POST /api/v1/organizations/:organizationId/connectors/microsoft365/sync-runs`
- `POST /api/v1/organizations/:organizationId/connectors/microsoft365/disconnect`
- `GET /api/v1/organizations/:organizationId/provider-capabilities`

### Security Operations

- `GET /api/v1/organizations/:organizationId/assets`
- `GET /api/v1/organizations/:organizationId/findings`
- `PATCH /api/v1/organizations/:organizationId/findings/:findingId`
- `GET /api/v1/organizations/:organizationId/remediation-plans`
- `POST /api/v1/organizations/:organizationId/remediation-plans`
- `GET /api/v1/organizations/:organizationId/tasks`
- `PATCH /api/v1/organizations/:organizationId/tasks/:taskId`
- `GET /api/v1/organizations/:organizationId/incidents`
- `POST /api/v1/organizations/:organizationId/incidents`
- `POST /api/v1/organizations/:organizationId/incidents/:incidentId/reportability-review`

### Provider Actions

- `POST /api/v1/organizations/:organizationId/provider-actions/:actionTemplateId/preflight`
- `POST /api/v1/organizations/:organizationId/provider-actions/:actionRunId/approve`
- `POST /api/v1/organizations/:organizationId/provider-actions/:actionRunId/execute`
- `GET /api/v1/organizations/:organizationId/provider-actions/:actionRunId`

Provider action endpoints must enforce capability, safety class, approval policy, recent auth, idempotency, async operation, verification, evidence, and audit.

### Reports, Audit, And Notifications

- `GET /api/v1/report-templates`
- `GET /api/v1/organizations/:organizationId/report-snapshots`
- `POST /api/v1/organizations/:organizationId/report-snapshots`
- `GET /api/v1/organizations/:organizationId/report-snapshots/:reportSnapshotId/download`
- `GET /api/v1/organizations/:organizationId/reports`
- `POST /api/v1/organizations/:organizationId/reports`
- `GET /api/v1/organizations/:organizationId/reports/:reportId`
- `GET /api/v1/organizations/:organizationId/reports/:reportId/download`
- `GET /api/v1/organizations/:organizationId/audit-events`
- `GET /api/v1/organizations/:organizationId/notifications`
- `PATCH /api/v1/organizations/:organizationId/notifications/:notificationId`

## Migration Plan

1. Add request ID, correlation logging, and standard error helper to the current API runtime.
2. Introduce `/api/v1` route namespace that delegates to current services where safe.
3. Generate or maintain OpenAPI from route schemas and validate it in CI.
4. Add pagination, filtering, and idempotency helpers before expanding list and command endpoints.
5. Add operation resources for sync, report generation, evidence packages, and provider actions.
6. Keep current product facade routes as compatibility aliases until the web app uses `/api/v1`.
7. Add tenant isolation tests for every route family before removing old route assumptions.

## Acceptance Gates

- `npm run typecheck`
- `npm test`
- Focused API contract tests for error shape, pagination, idempotency, authorization, and async operations.
- OpenAPI generation and schema validation in CI.
- Negative tests proving organization ID swapping, partner/customer scope swapping, and support-session bypass fail.
