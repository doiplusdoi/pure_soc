# PureSOC Product Register

Updated: 2026-06-19

PureSOC is an operational compliance console for small and midsize European organizations that need NIS2 readiness evidence, internal reports, and Microsoft 365 posture signals without buying an enterprise GRC program.

The product is not a legal determination engine, certification body, DNSC filing service, managed security provider marketplace, or Microsoft license reseller. Every readiness output must preserve the legal caveat from the product vision until product/legal review explicitly changes it.

## Primary Users

- Owner or managing director: needs a plain readiness picture, gaps, next actions, and review exports.
- Compliance manager: owns onboarding answers, evidence, internal reports, notifications, and audit exports.
- IT/security operator: connects Microsoft 365 read-only data, reviews findings, and executes approved manual remediation outside PureSOC.
- Auditor or reviewer: reads readiness evidence, source mappings, reports, and audit history without mutating tenant state.
- Partner operator: reviews explicitly granted customer tenants through tenant-access sessions and portfolio summaries.

## Current Product Shape

- Web app: API-backed operational console, local auth, workspace selection, Microsoft 365 connector, Romania NIS2 workflow, reports/evidence, notifications, and partner portfolio.
- API: provider-neutral compliance and reporting services, tenant RBAC, audit writer, evidence vault abstraction, notification transports, billing abstraction, Microsoft provider package.
- Data boundary: tenant-owned organization data remains organization-scoped; partner access is grant/session scoped and logged against the real actor.

## Must-Hold Product Rules

- Read-only Microsoft connector by default. Provider write/remediation actions remain disabled until approval, audit, preflight, snapshots, and verification are production-ready.
- Compliance engine remains provider-neutral. Microsoft-specific logic belongs in the Microsoft provider package.
- Country-specific logic remains in country-pack modules. Romania logic must not leak into EU core.
- Source mappings are data. UI must not hardcode workbook-derived legal rules.
- Partner access is not impersonation. It requires a partner membership, explicit tenant grant, active tenant session, and route-level RBAC intersection.
- Reports and outputs are internal readiness support, not legal advice, legal certification, authority submission, or guaranteed compliance.

## Demo Acceptance Focus

Partner-demo closure depends on these local behaviors:

- Partner customer creation is atomic in Prisma mode: organization and partner grant are created in one transaction.
- Exiting a partner customer session clears the active organization context.
- Active customer banner is persistent across the main operational routes.
- Customer-scoped audited routes carry partner tenant-session metadata.
- Viewer, analyst, admin, and grant-level combinations enforce least privilege for tenant-scoped reads and writes.

## Open Decisions

- Product/legal review for Romanian legal copy and NIS2 claims.
- Stripe live products, prices, invoice behavior, and entitlement rules.
- Evidence storage provider, virus scanning, KMS/key custody, WORM/export signing, and retention guarantees.
- Production notification incident model and delivery providers.
- Production queue/workflow provider for remediation and report generation.
- Live Microsoft tenant, live OIDC providers, and external smoke-test target approval.
