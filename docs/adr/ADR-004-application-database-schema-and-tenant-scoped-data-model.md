# ADR-004: Application Database Schema And Tenant-Scoped Data Model

Status: accepted
Date: 2026-04-28

## Context

The product needs auth, organizations, provider connections, regulatory sources, country packs, compliance results, recommendations, evidence, reports, dashboards, billing, and audit data to work as one traceable system. Building UI or connector code before the data model would create ad hoc contracts.

## Decision

Use PostgreSQL with Prisma for the application data model.

The schema is organized into these groups:

- Identity, sessions, organizations, roles, and audit logs.
- Customer/business profile data and jurisdiction assessments.
- Provider connections, credentials, permissions, capabilities, sync runs, raw resources, normalized resources, findings, recommendations, and action runs.
- Regulatory frameworks, sources, source versions, source maps, country packs, questions, options, answers, and review tasks.
- Control catalog, control results, gaps, readiness plans, checklist templates/runs, and risk acceptances.
- Evidence artifacts, evidence links, access logs, generated reports, exports, dashboard snapshots, and notification drafts.
- Billing customers, subscriptions, entitlements, and event ledger.

PostgreSQL is the source of truth for metadata, relationships, normalized facts, hashes, findings, results, and report/dashboard contracts. Object storage holds large binary artifacts.

## Consequences

- The main data flow is explicit: business answers and regulatory data plus provider telemetry become normalized resources, findings, control results, gaps, recommendations, plans, evidence requirements, reports, and dashboards.
- Provider raw payloads and normalized records stay distinct, preserving traceability and future reprocessing.
- Feature packages must use shared contracts rather than inventing duplicate local shapes.
- Schema changes that affect tenant data must preserve `organization_id` scoping unless the row is intentionally global seed data.
