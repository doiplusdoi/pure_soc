# ADR-023: Product V1 Report Snapshot Artifacts

Status: accepted for local constitution-alignment slice.
Date: 2026-06-25

## Context

The product constitution requires immutable report snapshots, localized output, file metadata, checksums, retention gates, and download audit. The existing report/evidence stack has a browser-grade renderer and object-storage-backed evidence flow, but product v1 report snapshots currently live in the compatibility-layer state repository while the final per-aggregate schema and object-storage contract are still being designed.

## Decision

Product v1 report snapshots support deterministic `json` and `pdf` artifacts from the immutable snapshot record. Artifact bytes are reconstructed from the stored snapshot content, verified against the stored SHA-256 checksum, and downloaded through an organization-scoped `/api/v1` route. Each artifact has a `FileObject` metadata record with retention class `report_snapshot`; downloads are audited. Snapshot creation now reserves or reuses the report operation by idempotency key before creating immutable records, so client retries do not create duplicate snapshots.

The deterministic PDF artifact is a local state-backed contract artifact, not the final browser-rendered production report. The `storage.provider` remains `product_v1_state` until object storage, renderer runtime, WORM/external signing, and production smoke proof are wired explicitly.

## Consequences

- Contract tests can verify JSON/PDF snapshot creation, checksum stability, organization-scoped download authorization, and retry-safe idempotency without a live renderer endpoint.
- Product v1 has a real artifact download and audit path for local/demo workflows.
- This does not claim browser-grade PDF layout, physical object-storage persistence or deletion proof, WORM retention, legal activation of national country packs, or production report runtime readiness.
