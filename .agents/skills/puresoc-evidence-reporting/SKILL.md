---
name: puresoc-evidence-reporting
description: Use when implementing or reviewing PureSOC evidence vault, evidence metadata, evidence-control links, object storage abstraction, upload scanning hooks, access logs, readiness reports, notification exports, or legal caveat enforcement.
---

# PureSOC Evidence And Reporting

Use this skill for evidence storage and exports.

## Required Reading

Read:

- `docs/puresoc_vision.md` sections 17, 19, 20, 21, 22, 25, 27, 28
- `docs/master-plan.md` sections 7, 8, 11, 14, 15
- `docs/implementation-gaps.md`

## Architecture Rules

- Evidence storage must be provider-neutral and self-host-friendly first.
- Object storage implementation must support local/in-a-box deployment.
- Evidence downloads are authorization-checked and audited.
- Reports must include source references and the legal caveat from `docs/puresoc_vision.md`.
- Generated files must not expose cross-organization data.

## Evidence Requirements

Track:

- Organization.
- Control/jurisdiction links.
- Source type.
- Provider connection or manual upload source.
- Hash/checksum.
- Created by.
- Access log.
- Retention metadata.
- Related assessment or report.

## Reporting Requirements

Reports should include:

- Internal readiness status.
- Classification result.
- Control status.
- Gaps and plan items.
- Evidence links.
- Provider findings.
- Regulatory sources.
- Legal caveat.

## Required Tests

- Upload authorization.
- Download authorization.
- Access audit event.
- Cross-organization rejection.
- Report includes legal caveat.
- Report includes source references.
- Generated export has stable JSON shape.

## Completion Checklist

- Evidence and reports are not public by URL alone.
- Upload scanning hook exists even if scanner implementation is deferred.
- Object storage secrets are redacted.
- Any unsupported export format is tracked in `docs/implementation-gaps.md`.
