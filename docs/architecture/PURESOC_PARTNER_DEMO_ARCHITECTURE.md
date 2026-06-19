# PureSOC Partner Demo Architecture

Status: living architecture note for the partner-led NIS2 and Microsoft evidence demo.

## Boundary Decisions

- Tenant boundary: `Organization`.
- Partner boundary: `Partner`.
- Explicit relationship: `PartnerTenantGrant`.
- Contextual access: `TenantAccessSession`.
- Real actor: never replaced; audit keeps `actorUserId`.
- Effective customer tenant: represented by the tenant-access session and audit context.
- Partner API responses avoid field names containing `access` or `token` because the API response guard and audit redactor intentionally treat those fragments as sensitive.

## Data Flow

1. Partner user signs in through existing local/OIDC auth.
2. Partner membership authorizes access to a partner portfolio.
3. Partner creates a customer through a tenant-only organization creation path.
4. The same application flow creates an explicit partner tenant grant.
5. Partner starts a tenant-access session with a reason.
6. The served partner console reads the current tenant-access session and renders the active customer banner.
7. Onboarding, evidence, provider connections, reports, and recommendations remain tenant-owned by organization ID.

## Implemented Milestone 1 Model

- `Partner` stores the partner business, stable slug, status, and optional parent partner reference.
- `PartnerMember` ties users to partner roles: owner, admin, analyst, or viewer.
- `PartnerTenantGrant` ties a partner to an `Organization` through an explicit active/revoked/suspended grant.
- `TenantAccessSession` stores the real actor, partner, effective organization, required reason, lifecycle timestamps, request metadata, IP, and user agent.
- `AuditLog.contextJson` stores partner/effective-tenant context without changing the canonical actor or organization fields.
- Memory and Prisma repositories expose the same partner-domain operations; the API chooses them through the existing runtime repository selection.

## Implemented Milestone 2 UI

- `/partners` is the served partner entry point.
- Partner users can create a partner record, switch among partner memberships, add customer tenants, enter a customer with a reason, and exit the active customer session.
- Partner-created customers do not create ordinary organization membership for the partner user; the relationship is represented by `PartnerTenantGrant`.
- The active customer-session banner is sticky on the partner console and includes customer, partner, reason, expiry, and exit action.
- Portfolio rows include organization display metadata from tenant records, but report/onboarding/provider state aggregation remains future work.

## Implemented Milestone 3 Country Packs

- `@puresoc/country-packs-core` now owns the versioned NIS2 country-pack definition contract, validation helper, EU baseline pack, Poland demo pack, Germany demo pack, and structured demo classification helper.
- `@puresoc/country-pack-ro` exports a Romania DNSC country-pack definition while keeping the existing Romania saved-answer, classification, notification-draft, and source-map behavior under the Romania package.
- API country-pack registry routes expose source-backed pack metadata and structured classification output without enabling legal activation or authority submission.
- `/onboarding/nis2` is the served country-aware entry point. It renders a pack selector, six business workflow screens, country-pack dynamic questions, official sources, and demo classification output. Romania remains the persisted country workflow and is linked from the entry page.
- RO, PL, and DE are marked as planned full packs in member-state status data. The pack lifecycle status remains `demo` until legal review explicitly activates a pack.

## Implemented Milestone 4 Report Version 1

- Initial readiness reports keep using existing generated-report storage, `report_data_json`, content hashes, report export rows, and generated evidence artifacts as the immutable delivery mechanism.
- `InternalReadinessReport.version` records report version, trigger type, methodology version, renderer version, onboarding schema version, optional country-pack version, previous report ID, generated timestamp, input snapshot counts, and optional classification snapshot.
- `InternalReadinessReport.concepts` separates applicability, declared readiness, evidence confidence, and priority so future Microsoft verification can compare declared and observed state without rewriting the initial report.
- The Romania report-export forms now pass onboarding/classification provenance into JSON, CSV, and evidence-package generation.
- The PDF HTML templates show the four concepts distinctly while preserving legal caveats and source references.

## Implemented Milestone 5 Microsoft Read-Only Sync

- The Microsoft 365 connector now has explicit runtime modes: `fixture`, `live`, and `auto`.
- Fixture mode uses the same provider connection, one-time consent state, callback validation, encrypted credential storage, permission bundle persistence, and provider connector pipeline as live mode. Its begin-consent URL loops back to the PureSOC callback with a synthetic tenant, so the local demo never calls Microsoft.
- Auto mode uses live only when the platform connector app has both client ID and client secret; otherwise it falls back to fixture mode and reports the effective mode through health metadata.
- Explicit live mode fails startup validation when connector app secrets are missing.
- The partner-demo read-only module set is tenant profile, subscription/license inventory, users/groups/roles, MFA registration, and Secure Score.
- The MFA registration module reads `/reports/authenticationMethods/userRegistrationDetails` in live mode and uses deterministic synthetic fixture data in fixture mode.
- Connector mode is recorded in connection metadata, audit metadata, API health responses, and the served connector UI.

## Implemented Milestone 6 Verified Report Version 2

- Version 2 is a new generated report record, not an update to version 1.
- `InternalReadinessReport.verifiedEvidence` records provider key, provider connection ID, sync run ID, verified observations, unavailable signals, and contradictions.
- `InternalReadinessReport.comparison` records previous report ID, readiness delta, evidence-confidence delta, changed control areas, new verified findings, resolved unknowns, contradictions, and new recommendations.
- Report finding provenance is explicit: declared by customer, uploaded evidence, verified through Microsoft, inferred by rule, unavailable due permission, or unavailable due product/license.
- The API route `POST /organizations/:orgId/reports/internal-readiness/verified-microsoft365` builds the v2 report from stored analysis plus stored normalized Microsoft resources and module statuses.
- The current Microsoft v2 mapper derives demo observations from MFA registration coverage and Secure Score, plus unavailable module signals for missing permissions or license-gated modules.
- PDF HTML templates render declared-vs-verified comparison rows and numeric deltas with text labels, so the comparison is not color-only.
- Generated report audit metadata includes previous report ID, readiness delta, evidence-confidence delta, and contradiction count.

## Implemented Milestone 7 Dynamic Recommendations

- The recommendation package keeps the existing gap-driven `RecommendationContract` fields as the stable integration contract for plans, dashboards, and action lifecycle.
- Rule-generated recommendations attach optional `rule`, `decision`, `opportunity`, `capabilityDiagnostics`, and `snapshotId` metadata instead of replacing legacy fields.
- `generateRecommendationSnapshot` produces deterministic snapshots containing recommendation rows, rule versions, catalog versions, input summary, and diagnostics.
- The Microsoft 365 capability catalog is versioned data in `@puresoc/recommendations`; it maps known SKU/service-plan identifiers to normalized capabilities and leaves unknown SKU identifiers visible in diagnostics.
- The first rule evaluates Microsoft 365 Business Premium for organizations up to 300 users that have relevant NIS2 gaps, a known lower Microsoft 365 business plan, and missing verified identity/device/endpoint/email capabilities.
- Business Premium source references use Microsoft Learn metadata, and recommendation copy states the license must be paired with configuration, evidence capture, and legal review.
- Sector context adjusts priority/action text for food distributors, managed service providers, and pharmaceutical manufacturers without using an LLM.
- The API route `POST /organizations/:orgId/recommendations/generate` accepts optional recommendation context and returns/audits the generated snapshot.

## Implemented Milestone 8 Portfolio And Seeded Demo

- Partner portfolio aggregation is backend-derived through `RepositoryBackedPartnerPortfolioReader`, not hardcoded in the served web route.
- Tenant snapshots read only tenant-owned stored analysis records and provider connection/module status. They derive assessment completion, sector, classification, readiness percent, evidence confidence percent, Microsoft connection state, high-priority gap count, top opportunity, last assessment/sync timestamp, and opportunity rows.
- Partner portfolio metrics aggregate those tenant snapshots into total customer tenants, completed assessments, likely/possibly in-scope customers, connected Microsoft tenants, high-priority gaps, and opportunities.
- Opportunity rows come from `RecommendationContract.opportunity` metadata and are flattened for partner review with customer, opportunity type, priority, relevant Microsoft capability/plan, affected users, NIS2 areas, evidence source, and next action.
- The served `/partners` console renders portfolio metrics, the opportunity table, enriched customer rows, and existing reason-gated tenant-session entry without adding customer organization membership.
- `scripts/seed.ts` owns deterministic demo reset/seed/verify commands for Asterion Cloud Partners, parent distributor metadata, owner/analyst demo users, and three customer tenants. The seed writes stored analysis snapshots and Microsoft fixture provider connections/modules through existing repository boundaries.
- The demo seed uses fixture/local data only. It does not call Microsoft Graph, create provider writes, submit to authorities, create billing artifacts, or perform Partner Center ordering.

## Safety Rules

- No partner hierarchy inheritance in this demo.
- No customer impersonation token.
- No Microsoft write scopes or executors.
- No direct authority submission or certification language.
- No unscoped database reads from route handlers.

## Runtime Compatibility

The design follows the current runtime stack recorded in ADR-017:

- `node:http` API and web.
- Prisma plus memory-mode repository boundaries.
- Docker Compose service catalog under `code/infra`.
- Existing UI smoke runner and host Firefox browser smoke where available.

## Future Milestone Hooks

- A later customer-context slice will resolve active tenant-access sessions into customer dashboard/onboarding/report routes and attach tenant-session audit context to customer-scoped actions.
- Poland and Germany need persisted six-screen onboarding storage before they can produce report versions from saved answers.
- A disposable/local PostgreSQL run should complete `demo:reset`, `demo:seed`, and `demo:verify` once Docker or another database is available in the validation environment.
