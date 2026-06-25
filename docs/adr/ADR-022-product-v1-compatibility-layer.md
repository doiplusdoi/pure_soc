# ADR-022: Product V1 Compatibility Layer

Status: accepted for local constitution-alignment slice.
Date: 2026-06-25

## Context

The product constitution requires a stable `/api/v1` contract, explicit organization/partner/support workflows, country-pack metadata, async operations, and route migration while the existing product shell and `/api/*` facade remain in use. A full Prisma schema migration for every new product aggregate would be too broad for the first vertical slice and could destabilize the working demo flows.

## Decision

Add `/api/v1` as a compatibility layer on the existing `node:http` API route table. The layer owns request/correlation IDs, v1 error envelopes, pagination/filter helpers, idempotent operation records, OpenAPI metadata, partner relationship lifecycle, support sessions, setup state, country-pack contracts, product aggregates, audited lifecycle transitions, supplier reviews, policy reviews, policy acknowledgements, governance activities/calendar events, attestations, training records, Microsoft connector capability/disconnect views, FileObject metadata, retention policies, legal-hold/delete gates, immutable JSON report snapshots, and durable internal event/outbox-compatible records.

For the first slice, new product v1 domain state was held in an in-memory `ProductV1Service` and covered by HTTP tests. The follow-up persistence slice keeps the same domain service contract but backs Prisma mode with a durable `product_v1_state_records` table and repository. Existing durable systems remain durable: organizations/RBAC, partner grants, Microsoft provider resources, credentials, audit, reports, evidence, and country-pack source data continue to use their established repositories. `/api/*` facade routes stay compatible. Direct `/app/o/:organizationId/*` web routes now render a compact v1 console against `/api/v1`; `/app/setup/*`, `/app/partner/:partnerId/*`, and `/app/admin/*` continue as compatibility aliases until route parity is implemented and tested.

FileObject and report-snapshot records created in this compatibility layer are metadata contracts and safety gates. ADR-023 adds deterministic state-backed JSON/PDF snapshot artifacts and audited downloads for local/demo workflows. These records do not claim physical object-storage deletion, WORM retention, browser-grade localized PDF readiness, or production report runtime proof until those paths are explicitly wired to the existing evidence/report-renderer infrastructure and proven with runtime tests.

Internal event records created in this layer are durable handoff contracts for workflow creates, lifecycle updates, file object events, report snapshots, and Microsoft sync/disconnect completion. Publisher results can be recorded and audited, but this ADR does not claim external queue delivery, worker retry execution, or production transaction-boundary proof.

## Consequences

- The API contract and authorization behavior can be exercised end to end before committing a large per-aggregate schema migration.
- Product v1 state created through the new relationship, setup, support, asset, finding, remediation, task, incident, risk, policy, supplier-review, policy-review, policy-acknowledgement, governance, attestation, training, file-object, retention-policy, and report-snapshot routes is restart-proof in Prisma mode through the state-record table.
- Product workflow lifecycle transitions are audited with before/after state, but this compatibility layer still uses generic status validators rather than final per-domain approval policy engines.
- Product v1 emits durable internal event records and accepts audited publisher-result updates, but external queue workers, retry processors, and transaction-boundary proof remain separate hardening work.
- Organization-scoped app routes now exercise `/api/v1` directly and expose create/save forms for the main v1 workflow records, but setup, partner, admin, and richer per-workflow UI parity remains future work.
- A later modeling slice must add explicit relational Prisma models/repositories and richer restart-proof API tests before claiming final production readiness for these workflows.
- Physical object-storage deletion, browser-grade localized PDF rendering, WORM/external signing, and final report/evidence storage guarantees remain blocked until separate implementation and external/runtime proof.
- Microsoft live calls and provider writes remain gated. Disconnect deletes local stored credentials and marks capabilities unavailable, but provider-side revocation is still an operator/manual action.
- Romania, Poland, and Germany country packs remain review-gated until legal/product approval metadata exists.
