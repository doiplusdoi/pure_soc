# ADR-011: Regulatory Source Activation Lifecycle

Status: accepted
Date: 2026-04-28

## Context

NIS2 national implementation data changes over time. Country packs may be generated from official law, authority guidance, portals, Commission pages, ENISA references, secondary trackers, or workbook seeds. Changed legal logic must not silently alter customer assessments.

## Decision

Use a draft-to-active regulatory source activation lifecycle.

Lifecycle states:

```txt
draft
validated
review_required
active
superseded
deprecated
```

- Imports create draft source records, seed records, source maps, and validation reports.
- Deterministic validation checks required fields, source-map coverage, schema shape, and generated output stability.
- New or changed legal/classification logic becomes `review_required`.
- A regulatory admin or defined legal/product reviewer activates a country-pack version, control version, or source-derived rule set.
- Active versions remain immutable for historic assessments.
- Source monitoring may mark sources as stale, unreachable, changed, or needing review, but it never auto-activates new legal logic.
- Source trust follows the hierarchy from official national law and authority sources down to secondary trackers marked as non-authoritative.

## Consequences

- Regulatory changes are auditable and cannot silently rewrite existing customer conclusions.
- Country-pack incompleteness can be represented honestly in dashboards and reports.
- Importers and source monitors must create review tasks instead of applying legal changes directly.
- Historic assessments can continue to reference the source version active at the time.
