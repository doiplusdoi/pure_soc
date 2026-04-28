# ADR-007: Report Renderer Strategy

Status: accepted
Date: 2026-04-28

## Context

PureSOC must generate internal readiness reports, EU and country classification reports, Romania notification drafts, Microsoft posture summaries, evidence packages, incident draft packages, and source traceability reports. Reports need stable inputs, legal caveats, source references, and exportable PDFs/JSON.

## Decision

Use a dedicated report-renderer application role and shared report data contracts.

- `code/apps/report-renderer` renders PDF outputs from stored report data contracts.
- Report builders live in packages such as `code/packages/reports` and consume stored analysis records, not live provider API calls.
- Generated reports are persisted as metadata records and linked to evidence artifacts where appropriate.
- Every readiness/compliance-style report includes the PureSOC legal caveat from the vision document.
- JSON exports use stable schemas suitable for tests and external review.
- The renderer may use Playwright/Puppeteer or another HTML-to-PDF engine behind the service boundary.

## Consequences

- Reports are reproducible and auditable because their inputs are stored records.
- API services do not need browser/PDF dependencies in-process.
- Report templates must be versioned carefully because they become customer-facing evidence.
- Rendering failures can be isolated from compliance calculation and provider sync jobs.
