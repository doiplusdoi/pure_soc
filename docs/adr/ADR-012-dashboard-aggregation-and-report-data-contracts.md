# ADR-012: Dashboard Aggregation And Report Data Contracts

Status: accepted
Date: 2026-04-28

## Context

PureSOC dashboards and reports must summarize readiness, country-pack completeness, provider health, gaps, recommendations, evidence, and subscription state. If every screen recalculates from live provider calls or local UI logic, outputs will be inconsistent and hard to audit.

## Decision

Create shared dashboard and report data contracts backed by stored analysis records.

- Dashboard aggregation uses compliance assessments, control results, gaps, recommendations, checklist state, evidence metadata, provider module status, country-pack status, and billing entitlements.
- `dashboard_snapshots` store calculated dashboard state for repeatable views and trend comparisons.
- Reports consume report data contracts built from stored analysis, evidence, and source references.
- Scores remain distinct: EU applicability, country-pack completeness, technical posture, process compliance, evidence completeness, and overall internal readiness.
- Missing or partial country-pack data creates explicit warnings and completeness signals, not false technical failures.
- No dashboard or report may label PureSOC output as legal certification.

## Consequences

- UI, exports, and reports can agree on the same source of truth.
- Expensive calculations can be cached or snapshotted without losing traceability.
- Dashboard code must not depend on live provider APIs where stored analysis records exist.
- Report and dashboard contract changes require tests because they affect customer-facing evidence.
