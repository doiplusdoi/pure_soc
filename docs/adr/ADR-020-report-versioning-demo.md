# ADR-020: Report Versioning Demo

Status: accepted for demo v1.

## Decision

The partner demo will represent generated assessment reports as immutable versions. Microsoft verification creates a later version that compares declared and verified evidence instead of rewriting the initial onboarding-based report.

Milestone 4 stores version 1 metadata inside `InternalReadinessReport.version` and concept-level scoring inside `InternalReadinessReport.concepts`. Existing `generated_reports`, report export rows, generated evidence artifacts, and content hashes remain the immutable storage and delivery mechanism; no new report-version table is introduced until query requirements justify it.

## Consequences

- Methodology versions, country-pack versions, input snapshots, evidence confidence, recommendations, and trigger type must be recorded with report snapshots.
- Existing generated-report evidence and export records remain the delivery mechanism for JSON, CSV, PDF, and evidence packages.
