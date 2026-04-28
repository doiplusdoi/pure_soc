# ADR-006: Provider Interface And Resource Lifecycle Versioning

Status: accepted
Date: 2026-04-28

## Context

Microsoft 365 is the first managed provider, but PureSOC is a provider-neutral NIS2 readiness platform. Compliance code must not depend on Microsoft Graph payloads or Microsoft-specific conditionals. Future Google Workspace support must be possible through the same contract.

## Decision

Create provider contracts in `code/packages/providers/core` and keep provider implementations isolated.

- Microsoft 365 implementation lives under `code/packages/providers/microsoft365`.
- Google Workspace remains a V1 stub under `code/packages/providers/google-workspace`.
- Connector code writes raw provider resources first, then normalized resources, provider-neutral findings, and structured recommendations.
- Provider resources include organization, provider connection, provider key, external ID, resource type, source module, sync run, raw JSON, normalized JSON, content hash, first seen, last seen, and deleted timestamp.
- The idempotency key is organization, provider connection, provider key, external resource type, and external ID.
- Sync modules record partial failure, missing permission, missing license, unsupported API, throttling, revoked consent, and connector error states as data.

## Consequences

- Compliance evaluation consumes provider-neutral findings and resource types instead of raw Microsoft payloads.
- One failed Microsoft module does not break a full provider sync.
- Raw payload retention supports debugging, evidence, and future normalization changes.
- Connector tests must cover idempotency, pagination, retry/throttling, redaction, partial failure, and no accidental live writes.
