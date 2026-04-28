---
name: puresoc-regulatory-xlsx-importer
description: Use when implementing or reviewing PureSOC regulatory XLSX importers, Romania NIS2 workbook extraction, source maps, generated regulatory seed JSON, workbook classification rules, import validation, or source coverage tests.
---

# PureSOC Regulatory XLSX Importer

Use this skill for official workbook imports and generated regulatory seeds.

## Required Reading

Read:

- `docs/puresoc_vision.md` sections 10, 11, 12, 21, 28, 32
- `docs/master-plan.md` sections 10, 14, 15
- `docs/nis2ro-tool-v-2-1.xlsx`
- `docs/implementation-gaps.md`

## Rules

- Do not manually copy workbook logic into React components.
- Import workbook data into versioned seed JSON with source maps.
- Keep sheet/cell/range provenance for fields, options, advisory text, and classification rules.
- Store uncertainty and missing-data flags instead of pretending all country data is complete.
- Romania-specific importer and classifier logic belongs under `packages/compliance/nis2/country-packs/ro`.

## Romania Workbook Targets

Handle these sheets:

- `Entity data`
- `Entity assessment`
- `Notification form`
- `Liste`
- `Ajutor`
- `Algoritm clasificare`

Extract:

- Workbook versions.
- Entity and contact fields.
- Service sectors and service/entity type options.
- Relationship-with-Romania questions.
- Article 9 questions.
- Notification draft mapping.
- Classification rules.
- Location/helper lists.

## Required Tests

- Workbook version extraction.
- Sheet presence validation.
- Required field extraction.
- Service option extraction.
- Classification rule extraction or encoded rules with source mapping.
- Source map coverage threshold.
- Repeatable generated seed output.

## Completion Checklist

- Generated seed data is deterministic.
- Imported records include source references.
- Classification service tests use imported or source-mapped fixtures.
- Workbook parsing limitations are recorded in `docs/implementation-gaps.md`.
