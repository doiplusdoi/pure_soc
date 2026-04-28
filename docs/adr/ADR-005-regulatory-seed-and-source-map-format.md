# ADR-005: Regulatory Seed And Source-Map Format

Status: accepted
Date: 2026-04-28

## Context

PureSOC must support the EU NIS2 baseline, EU overlays, and country-specific national implementations. Romania is the first complete country pack and is seeded from the official workbook stored in the repo. Regulatory facts, workbook-derived classification rules, and source mappings must remain auditable and updateable.

## Decision

Store regulatory content as source-linked data under `code/data/regulatory` and load it through package contracts.

- EU baseline, Article 21 controls, Article 23 incident workflow defaults, Implementing Regulation 2024/2690 overlays, Member States, country-pack statuses, questions, options, rules, and evidence requirements are represented as seed data.
- Country-pack source records include jurisdiction, source type, title, URL or local file path, publication/version metadata, trust level, status, last checked date, and notes.
- Workbook-derived Romania artifacts are generated deterministically and include a source map from sheet/cell or workbook region to imported question, option, rule, notification field, or classification reason.
- Romania classification logic is implemented in the Romania country-pack package using source-mapped rules, not copied into API controllers or React components.
- Secondary trackers may inform research but must be marked as secondary and cannot be treated as primary legal truth.

## Consequences

- Regulatory behavior can be reviewed, versioned, tested, and regenerated when sources change.
- UI components display configured content and source confidence instead of hardcoding legal facts.
- Country-specific classification can evolve without leaking Romania-specific logic into the EU baseline.
- More importer and validation code is required, but the resulting traceability is a core product feature.
