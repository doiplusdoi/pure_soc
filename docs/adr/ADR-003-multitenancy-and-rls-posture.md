# ADR-003: Multitenancy And RLS Posture

Status: accepted
Date: 2026-04-28

## Context

PureSOC stores sensitive organization profiles, provider telemetry, evidence, reports, billing state, and regulatory answers for multiple customers. Cross-organization access is the highest product risk. The vision allows PostgreSQL Row Level Security later but does not require it to block V1.

## Decision

Use organization-scoped multitenancy from the first schema.

- Every tenant-owned table carries `organization_id`.
- Every request resolves an authenticated user, active organization, role bindings, provider connection scope, and jurisdiction scope.
- API services must scope queries by organization and authorization context.
- Cross-organization access rejection is a required automated test category.
- PostgreSQL RLS is not mandatory for the first vertical slices, but schemas, query helpers, and tests must remain RLS-ready.
- Global regulatory seed data, country-pack metadata, framework versions, and public source records may be organization-independent.

## Consequences

- V1 can move quickly with service-layer enforcement and strong tests.
- Future RLS hardening remains possible because tenant-owned data is explicitly scoped.
- Developers must treat unscoped queries as security defects, not convenience shortcuts.
- Data contracts must clearly distinguish global regulatory data from customer-owned answers, telemetry, evidence, reports, and plans.
