# PureSOC Partner Demo Runbook

Status: draft, updated as milestones land.

## Local Baseline

Run from `code/`:

```sh
npm run typecheck
env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate
npm run compose:config
```

## Demo Startup

Start the local stack, apply migrations, seed the deterministic partner demo, then verify it:

```sh
npm run compose:up
env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:migrate:deploy
env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run demo:seed
env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run demo:verify
```

Use `npm run demo:reset` with the same `DATABASE_URL` to remove only the deterministic demo records.

## Demo Mode

Microsoft 365 fixture mode is the default target for the partner demo:

```sh
PURESOC_CONNECTOR_MICROSOFT365_MODE=fixture
```

`live` requires a configured PureSOC platform multitenant Entra app client ID and client secret. `auto` uses live only when those values are configured; otherwise it uses fixture mode and labels the effective mode in connector health. Live Microsoft verification remains optional and must use an approved disposable tenant, read-only permissions, and the existing selector-first smoke discipline.

## Partner API Foundation

Milestone 1 exposes the backend partner flow through authenticated API routes:

```txt
POST /partners
GET /partners
GET /partners/:partnerId/portfolio
POST /partners/:partnerId/customers
GET /partners/:partnerId/tenant-access-sessions/current
POST /partners/:partnerId/tenant-access-sessions
POST /partners/:partnerId/tenant-access-sessions/:sessionId/exit
```

Partner customer creation creates a tenant-only organization and then creates an explicit partner grant. Tenant-access sessions require a reason, reject nested active sessions, expire after the configured short lifetime, and audit real actor plus effective tenant context.

## Partner Console Foundation

Milestone 2 adds a served partner entry point:

```txt
GET /partners
POST /partners
POST /partners/:partnerId/customers
POST /partners/:partnerId/tenant-sessions
POST /partners/:partnerId/tenant-sessions/:sessionId/exit
```

Use `/partners` after signing in to create or select a partner, add customer tenants, enter a customer with a reason, see the active customer-session banner, and exit the customer session.

## Country-Pack Onboarding Foundation

Milestone 3 exposes the country-pack registry and demo classifier:

```txt
GET /compliance/nis2/country-packs
GET /compliance/nis2/country-packs/:countryCode
POST /compliance/nis2/country-packs/:countryCode/classification
```

Use `/onboarding/nis2` after signing in to select EU, Romania, Poland, or Germany, review official source metadata, inspect dynamic country-pack questions, and run a preliminary demo scope check. Use `/onboarding/romania/company?locale=ro-RO` for the persisted Romania saved-answer workflow.

## Initial Report Version 1

Milestone 4 keeps report generation local and immutable through existing report/evidence/export storage:

```txt
POST /organizations/:orgId/reports/internal-readiness
POST /organizations/:orgId/reports/internal-readiness/csv
POST /organizations/:orgId/reports/internal-readiness/evidence-package
```

The Romania workflow posts the same version context from these served routes:

```txt
POST /onboarding/romania/reports/internal-readiness
POST /onboarding/romania/reports/internal-readiness/csv
POST /onboarding/romania/reports/internal-readiness/evidence-package
```

Initial reports record report version, trigger type, methodology version, renderer version, onboarding schema version, country-pack version, input snapshot counts, and classification snapshot. Report summaries separate applicability, declared readiness, evidence confidence, and priority.

## Microsoft Consent And Fixture Sync

Milestone 5 keeps the existing tenant-owned provider connection routes and adds fixture/live/auto behavior:

```txt
POST /organizations/:orgId/provider-connections/microsoft365/consent/begin
GET|POST /organizations/:orgId/provider-connections/microsoft365/consent/callback
POST /organizations/:orgId/provider-connections/:providerConnectionId/microsoft365/sync
GET /organizations/:orgId/provider-connections/:providerConnectionId/health
```

Use `/providers/microsoft365` after signing in. In fixture mode, Connect Microsoft 365 redirects back through the PureSOC callback with a synthetic tenant and still consumes the one-time consent state. Run read-only sync to populate the five core modules: tenant profile, licenses, users/groups/roles, MFA registration, and Secure Score. The web connector page shows configured/effective connector mode and keeps write actions disabled.

## Verified Report Version 2

Milestone 6 adds the Microsoft-verified report route:

```txt
POST /organizations/:orgId/reports/internal-readiness/verified-microsoft365
```

Body requirements:

```json
{
  "assessmentId": "assessment_id",
  "previousReportId": "generated_report_v1_id",
  "providerConnectionId": "microsoft365_provider_connection_id"
}
```

The route reads stored normalized Microsoft resources and module statuses from the latest read-only sync. It creates a new immutable internal-readiness report with `version.reportVersion = 2`, links to version 1 through `version.previousReportId`, and includes verified observations, unavailable signals, contradictions, changed control areas, readiness/evidence-confidence deltas, new verified findings, resolved unknowns, and new recommendations. It does not mutate the previous report and does not enable provider writes.

## Dynamic Recommendations And Opportunities

Milestone 7 extends the existing recommendation route:

```txt
POST /organizations/:orgId/recommendations/generate
```

The route still requires organization-scoped `gaps`. It now also accepts optional context:

```json
{
  "gaps": [],
  "context": {
    "countryCode": "RO",
    "sector": "food distributor",
    "employeeCount": 72,
    "operationalDependencies": ["supplier delivery", "cold-chain continuity"],
    "microsoft365": {
      "userCount": 72,
      "subscriptions": [
        {
          "skuPartNumber": "O365_BUSINESS_PREMIUM",
          "consumedUnits": 72,
          "servicePlans": ["EXCHANGE_S_STANDARD"]
        }
      ]
    }
  }
}
```

The response includes the legacy `recommendations` array plus a `snapshot` with rule versions, catalog versions, input summary, and Microsoft SKU/capability diagnostics. When conditions match, the deterministic Business Premium rule adds an opportunity-style recommendation with customer and partner CTAs. Unknown Microsoft SKU identifiers remain in diagnostics and do not trigger product guesses. This route does not execute provider writes, purchase licenses, create Partner Center orders, or claim legal compliance.

## Partner Portfolio And Seeded Demo

Milestone 8 makes `/partners` the seeded demo entry point after local sign-in.

Demo users:

```txt
mara@asterion.example / PureSOC-Demo-2026!
leo@asterion.example / PureSOC-Demo-2026!
```

Seeded partner structure:

```txt
Northstar Distributor
Asterion Cloud Partners
```

Seeded customer portfolio:

```txt
MedicaNova SRL, Romania, pharmaceutical manufacturer, assessment complete, Microsoft fixture connected.
NordFrucht GmbH, Germany, food distributor, assessment complete, lower Microsoft 365 business-plan fixture, Business Premium opportunity.
SecureOps Polska Sp. z o.o., Poland, managed service provider, partial assessment, Microsoft disconnected.
```

The partner portfolio derives metrics and opportunity rows from tenant-owned stored analysis snapshots and Microsoft provider connection/module state. Rows show company, country, sector, classification, readiness, evidence confidence, Microsoft connection state, top opportunity, last assessment/sync activity, and the reason-gated enter-customer action. The opportunities table is readiness-only and intentionally excludes pricing, margin, commission, and Partner Center ordering actions.

## Current Limitations

- The active customer-session banner now appears across the main operational routes when a partner tenant session is active. Browser-level route traversal can still be expanded beyond renderer tests.
- Partner customer creation is transactional in Prisma mode across organization and grant creation.
- Active partner tenant-session context is attached centrally to customer-scoped audit writes when an active session matches the audited organization.
- Poland and Germany are present as source-backed demo country packs, but they do not yet have persisted six-screen onboarding storage or report generation.
- `demo:seed` requires a migrated local/disposable PostgreSQL database. If PostgreSQL is unavailable, `demo:verify` reports `database_unreachable`.
- Independent external/product/legal review remains outside the local run.
- No production credentials or external live services are required or used by the current implementation slice.
