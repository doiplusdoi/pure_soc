# PureSOC Partner Demo Execution Plan

Status: local fixture demo complete; external/live proof remains gated.
Source prompt: `/Users/solo/Downloads/PURESOC_CODEX_AUTONOMOUS_IMPLEMENTATION_PROMPT.md`.  
Started: 2026-06-19.

## Repository Findings

- Application code lives under `code/`; root files are durable docs and discovery files.
- Current runtime is `node:http` API/web, Prisma schema/migrations, local memory/Prisma repository selection, and Docker Compose service catalog.
- Canonical tenant boundary is `Organization`.
- User tenancy is represented by `OrganizationMember` and organization-scoped `RoleBinding`.
- Session state already has `activeOrganizationId`; partner customer access will use a separate tenant-access session so the real actor is not impersonated.
- Audit rows are hash-chained and exported through `@puresoc/audit`; partner access metadata will be added as explicit audit context.
- Microsoft 365 connector already has tenant-owned provider connections, admin-consent state persistence, read-only bundles, and disabled write scopes.
- Romania readiness flow already saves onboarding/classification state through `RoNis2ReadinessRepository`.

## Product Terms To Code Entities

| Product term | Existing or new code entity |
|---|---|
| Company / tenant / customer | `Organization` |
| Partner business | New `Partner` |
| Partner user | New `PartnerMember` tied to `User` |
| Customer relationship | New `PartnerTenantGrant` tied to `Organization` |
| Enter customer session | New `TenantAccessSession` |
| Real actor | Existing session `userId` and audit `actorUserId` |
| Effective tenant | `TenantAccessSession.effectiveOrganizationId` |
| Read-only Microsoft evidence | Existing Microsoft 365 provider connection and fixture/live boundaries |

## Baseline Results

- `git status --short --branch`: on `main...origin/main`; untracked `pure_soc_june19.md` existed before this work and is not touched.
- `npm run typecheck` from `code/`: passed.
- `npm run compose:config` from `code/`: passed.
- `npm run prisma:validate` from `code/`: failed because `DATABASE_URL` was unset.
- `env DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` from `code/`: passed.

## Milestones

- [x] Milestone 0: repository audit and execution foundation.
- [x] Milestone 1: tenant safety and partner domain API foundation.
- [x] Milestone 2: partner console and logged customer access foundation.
- [x] Milestone 3: country-pack framework and three-country onboarding foundation.
- [x] Milestone 4: initial assessment and report version 1.
- [x] Milestone 5: Microsoft consent and read-only synchronization.
- [x] Milestone 6: verified evidence and report version 2.
- [x] Milestone 7: dynamic recommendations and Microsoft opportunities.
- [x] Milestone 8: complete partner portfolio and seeded demo.
- [x] Milestone 9: local hardening, self-review, and final local validation.
- [x] Milestone 10: persisted country-aware demo closure and served fixture smoke.

## Current Slice

Milestone 10 closes the local fixture-demo code path:

- RO/PL/DE country-aware onboarding is persisted through shared Prisma/memory repositories.
- `/onboarding/nis2` now saves the six-screen questionnaire, runs source-linked classification, and generates report v1 from stored declared analysis.
- Deterministic seed data includes country-aware onboarding, classification, and report v1 artifacts for the three synthetic customers.
- `npm run test:e2e -- --grep @fixture-demo` exercises a served partner/customer flow through web forms, Germany onboarding/report v1, Microsoft partial fixture connect/sync, verified report v2 with deltas, Business Premium recommendation/opportunity verification, CSV/evidence package generation, portfolio verification, and customer tenant exit.
- Read-only posture is preserved: no provider writes, ordering, remediation execution, DNSC submission, live external calls, or compliance-certification claims were enabled.

## Assumptions

- `Organization` remains the only tenant boundary.
- Partner hierarchy is stored through an optional parent partner reference, but inherited access is not implemented.
- Partner access does not add customer organization membership by default; authorization inside a customer tenant is checked through partner role plus explicit grant level.
- Existing customer-member organization flows continue to work unchanged.
- No Microsoft write executor, live external calls, DNSC submission, or legal certification path is enabled by this milestone.
- Local deterministic demo seeding runs against a migrated PostgreSQL database. Compose host-port overrides can be used when another local stack already owns the default dependency ports.

## Validation Plan

- `npm run lint`.
- `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:5432/puresoc npm run prisma:validate`.
- `npm test`.
- `npm run test:e2e -- --grep @fixture-demo`.
- `npm run compose:config` and `npm run compose:config:build`.
- `npm run compose:up`.
- `demo:reset` -> `demo:seed` -> `demo:verify` against migrated PostgreSQL.

## Results Log

- Milestone 0 completed with documentation and baseline validation only.
- Milestone 1 completed the backend/API foundation for partner tenancy:
  - Added Prisma enums, tables, and migration for `Partner`, `PartnerMember`, `PartnerTenantGrant`, and `TenantAccessSession`.
  - Added `AuditLog.contextJson` so tenant-access metadata can be stored without replacing the real actor.
  - Added memory and Prisma partner repository boundaries.
  - Added `PartnerService` and API routes for partner creation, portfolio listing, partner-created customers, tenant-access session start, and tenant-access session exit.
  - Wired partner repositories into API memory and Prisma modes.
  - Added focused partner API coverage for explicit grants, revoked grants, nested sessions, viewer restrictions, and audit context.
  - Added selected schema-contract drift coverage for the new audit context field.
  - Kept Microsoft writes, provider writes, DNSC submission, and live external calls disabled.
  - Validation results are recorded in `docs/demo/PURESOC_PARTNER_DEMO_VALIDATION.md`.
- Milestone 2 completed the served partner-console foundation:
  - Added `/partners` served web route with partner creation, partner selector, portfolio metrics, add-customer form, reason-gated enter-customer forms, active customer-session banner, and exit form.
  - Added web POST handlers that call the partner API using the browser session cookie and trusted Origin.
  - Added current tenant-session API lookup for banner state.
  - Changed partner-created customers to use a tenant-only organization creation path, so adding a customer does not silently create ordinary workspace membership for the partner user.
  - Enriched partner portfolio rows with customer organization name and country.
  - Added renderer tests for partner-console owner and viewer states.
  - Added API tests proving portfolio metadata, no ordinary workspace membership for partner-created customers, current-session lookup, nested-session rejection, exit behavior, and audit context.
- Milestone 3 completed the country-pack/onboarding foundation:
  - Added a typed, versioned NIS2 country-pack definition contract, validation helper, and structured demo classifier in `@puresoc/country-packs-core`.
  - Added the EU NIS2 baseline pack, demo Poland KSC pack, demo Germany BSI pack, and Romania DNSC pack definition. Romania saved onboarding/classification behavior remains in `@puresoc/country-pack-ro`.
  - Updated EU member-state seed status so RO, PL, and DE are data-driven `planned_full_pack` countries while all packs remain demo/review-required until legal activation.
  - Added public API routes for country-pack registry lookup and structured country-pack classification: `GET /compliance/nis2/country-packs`, `GET /compliance/nis2/country-packs/:countryCode`, and `POST /compliance/nis2/country-packs/:countryCode/classification`.
  - Added served `/onboarding/nis2` as the country-aware onboarding entry point with pack selector, six business workflow screens, dynamic country-pack questions, official source table, and demo classification output. Romania links into the existing persisted `/onboarding/romania` route.
  - Added package, API, and web renderer tests for country-pack validation, source metadata, classification caveats, and country-aware onboarding UI.
- Milestone 4 completed initial report version 1:
  - Extended `InternalReadinessReport` with immutable report-version metadata, trigger type, methodology version, renderer version, onboarding schema version, country-pack version, input snapshot, and optional classification snapshot.
  - Added separate report concepts for applicability, declared readiness, evidence confidence, and priority. The readiness methodology uses met/partial/not-met style values and excludes `not_applicable` controls from the applicable-control average.
  - Threaded optional version context through report API routes and the Romania report-export workflow so initial reports can carry Romania onboarding/classification provenance.
  - Updated PDF HTML templates to show the four concepts distinctly.
  - Preserved existing generated-report IDs, JSON content hashes, report export rows, generated evidence storage, and audit events as the immutable storage mechanism for version 1.
  - Added report package, renderer, API route, and web renderer coverage.
- Milestone 5 completed Microsoft consent and read-only synchronization foundation:
  - Added explicit Microsoft connector runtime modes: `fixture`, `live`, and `auto`. Local/demo defaults to fixture; explicit live mode now fails startup validation when connector app secrets are missing.
  - Added fixture admin-consent completion through the same signed one-time state and callback path, using a synthetic tenant and encrypted synthetic app-only token.
  - Added the missing MFA registration read module using Microsoft Graph v1.0 `/reports/authenticationMethods/userRegistrationDetails` and `AuditLog.Read.All`.
  - Added a five-module partner-demo sync set: tenant profile, subscriptions/licenses, users/groups/roles, MFA registration, and Secure Score.
  - Added deterministic fixture Graph responses that pass through the same provider connector normalization pipeline as live responses.
  - Exposed configured/effective connector mode in Microsoft health responses and web connector labels.
  - Kept Microsoft write bundles and the disabled action executor unchanged.
  - Rechecked official Microsoft documentation for v2 admin consent, subscribed SKUs, MFA registration details, and Secure Score before changing module assumptions.
- Milestone 6 completed verified evidence and report version 2:
  - Added provider-neutral verified-evidence report DTOs for observation provenance, unavailable signals, contradiction records, and version comparison deltas.
  - Added finding provenance categories: declared by customer, uploaded evidence, verified through Microsoft, inferred by rule, unavailable due permission, and unavailable due product/license.
  - Added a Microsoft-verified internal readiness report path that reads stored normalized Microsoft resources and module statuses, derives MFA registration and Secure Score observations, and persists a new immutable report version.
  - Added `POST /organizations/:orgId/reports/internal-readiness/verified-microsoft365`, requiring a previous report ID and provider connection ID; version 1 remains unchanged and version 2 links back through `version.previousReportId`.
  - Added comparison output for readiness delta, evidence-confidence delta, changed controls, new verified findings, resolved unknowns, contradictions, and new recommendations.
  - Added PDF/HTML comparison rendering with explicit text and numeric deltas, not color-only signaling.
  - Added audit metadata for previous report ID, deltas, and contradiction count on generated report events.
  - Kept Microsoft writes, provider writes, DNSC submission, live external calls, and legal/certification claims disabled.
- Milestone 7 completed dynamic recommendations and Microsoft opportunities:
  - Added optional rule, decision, opportunity, capability-diagnostic, and snapshot metadata to the existing recommendation contract without breaking legacy recommendation consumers.
  - Added a deterministic `generateRecommendationSnapshot` path that preserves the existing gap-driven recommendations, appends rule-generated opportunities, and records rule versions, catalog versions, input summary, and diagnostics.
  - Added a versioned Microsoft 365 capability catalog for identity policy, conditional access, device management, endpoint protection, advanced email protection, Secure Score availability, and known plan/add-on mappings.
  - Added unknown Microsoft SKU diagnostics; unknown identifiers remain visible and do not trigger product guesses.
  - Added the required Business Premium evaluation rule for organizations up to 300 users on lower Microsoft 365 business plans with relevant NIS2 gaps and missing verified capabilities.
  - Added sector-sensitive prioritization/action text for food distribution, managed service provider, and pharmaceutical manufacturer contexts.
  - Added customer and partner CTAs plus explicit readiness-only disclaimer language.
  - Extended `POST /organizations/:orgId/recommendations/generate` to accept optional recommendation context and return/audit recommendation snapshots.
  - Rechecked official Microsoft Learn metadata for Business Premium security/user-limit/capability assumptions before encoding source references.
  - Kept Microsoft writes, provider writes, purchasing/ordering, live external calls, DNSC submission, and legal/certification claims disabled.
- Milestone 8 completed the partner portfolio and seeded demo:
  - Added a repository-backed partner portfolio reader that derives tenant snapshots from the latest stored analysis and Microsoft provider connection/module state.
  - Portfolio metrics now include total customer tenants, completed assessments, likely/possibly in-scope customers, connected Microsoft tenants, high-priority gaps, and opportunity count.
  - Portfolio rows now show company, country, sector, classification, readiness, evidence confidence, Microsoft connection state, top recommendation/opportunity, last assessment/sync time, and reason-gated enter action.
  - Portfolio opportunities are flattened from recommendation opportunity metadata and show customer, opportunity type, priority, relevant Microsoft capability/plan, affected users, NIS2 areas, evidence source, and next action.
  - Added deterministic `demo:reset`, `demo:seed`, and `demo:verify` commands for Asterion Cloud Partners, a parent distributor, owner/analyst demo users, and three customer tenants: MedicaNova SRL, NordFrucht GmbH, and SecureOps Polska Sp. z o.o.
  - Seeded customer snapshots demonstrate Romania pharmaceutical, Germany food distribution, and Poland MSP contexts, with Microsoft fixture connections for the first two and a disconnected partial assessment for the MSP.
  - Kept portfolio opportunity output readiness-only; it includes no pricing, margin, commission, Partner Center ordering, provider writes, live external calls, DNSC submission, or legal/certification claims.

- Milestone 9 locally closed the hardening pass:
  - Added Prisma transaction-backed partner customer organization plus grant creation.
  - Changed customer-session exit flow to clear active organization context.
  - Added central audit enrichment for active partner tenant-session context on customer-scoped audited writes.
  - Extended active customer banner rendering across operational web routes and moved its styling into the shared UI package.
  - Tightened compliance evaluation and recommendation generation to manager/admin roles, so partner viewers remain read-only.
  - Added focused API and Prisma tests for transaction behavior, tenant-session role/grant/action authorization, and audit context.
  - Added web renderer tests for active customer banner persistence.
  - Added root `PRODUCT.md` and `DESIGN.md` registers for product/design boundaries.
  - Full local validation passed: typecheck, lint, Prisma schema validation, Compose config, full Vitest suite, and `git diff --check`.
- Milestone 10 completed the local fixture-demo path:
  - Added shared persisted country-aware NIS2 onboarding/classification tables, migration, memory/Prisma repositories, and runtime wiring for RO/PL/DE.
  - Added API routes for reading/saving onboarding progress, classifying saved answers, and generating report v1 from stored declared analysis.
  - Updated `/onboarding/nis2` to load/save persisted progress, render all six screens, classify saved answers, and generate report v1 with country-pack version context and legal caveat.
  - Seeded deterministic country-aware onboarding/classification/report artifacts for MedicaNova SRL, NordFrucht GmbH, and SecureOps Polska Sp. z o.o.
  - Added `@fixture-demo` served web smoke coverage that creates partner/customer records through web forms, enters the tenant, completes Germany onboarding/report v1, connects/syncs partial Microsoft fixture evidence, generates report v2/CSV/evidence package, verifies v2 deltas plus Business Premium recommendation/opportunity state, and exits the customer tenant.
  - Added stale-Prisma-client guardrails to demo commands so missing generated model delegates return an actionable `prisma_client_outdated` blocker.
  - Final local validation passed: `npm run typecheck`, `npm run lint`, explicit-URL `npm run prisma:validate`, `npm test` (91 files, 442 tests), unfiltered `npm run test:e2e`, and `npm run test:e2e -- --grep @fixture-demo`.
  - `npm run compose:config` and `npm run compose:config:build` passed.
  - Compose host-port bindings are configurable while preserving defaults; this local run used `PURESOC_POSTGRES_PORT=15432`, `PURESOC_REDIS_PORT=16379`, `PURESOC_OBJECT_STORAGE_PORT=19000`, and `PURESOC_OBJECT_STORAGE_CONSOLE_PORT=19001` because unrelated `radar_*` containers occupied the default dependency ports.
  - `npm run compose:up` passed with those host-port overrides: local app images built, all 14 migrations applied through the migrator, and API/web health checks passed with provider writes disabled.
  - `DATABASE_URL=postgresql://puresoc:puresoc@127.0.0.1:15432/puresoc npm run prisma:migrate:deploy` passed with no pending migrations.
  - `demo:reset`, `demo:seed`, and `demo:verify` passed against the migrated PostgreSQL database, and rerunning seed plus verify without a reset proved the deterministic seed path is idempotent.

## Deferred Work

- Independent external/product/legal review remains outside this local code run.
- Live Microsoft Graph, Stripe, OIDC provider, object storage/scanner, KMS, deployment, DNSC submission, provider-write, and legal/certification proof remain gated by the existing external-smoke and product/legal blockers.
