# ADR-016: i18n And Country-Pack Notification Drafts

Status: accepted
Date: 2026-05-01

## Context

PureSOC is Romania-first but EU-country-ready. Existing user and organization records already carry locale fields, while reports, country-pack warnings, and Romania notification drafts mostly emitted English product text. At the same time, the database contains both a generic `NotificationDraft` model and a Romania-specific `RoNis2NotificationDraft` model with overlapping payload, status, source-reference, and assessment fields.

M23 resolves two related decisions before more customer-facing notification exports or additional country packs are implemented:

- how localized product messages are represented without turning regulatory source text into UI conditionals,
- how country-pack notification drafts are persisted and versioned across Romania and future country packs.

## Decision

PureSOC will use a small, explicit locale/message model.

- Supported locale codes for V1 contracts are `en` and `ro`.
- Locale tags such as `ro-RO` normalize to their base supported locale.
- Unsupported or missing locales fall back to `en`.
- Product-owned messages use stable message keys, not raw ad hoc strings.
- The legal caveat is keyed as `puresoc.legal_caveat.internal_readiness.v1`.
- The English legal caveat from `docs/puresoc_vision.md` is the only active legal-caveat copy until product/legal approves a Romanian version.
- Report/export contracts must carry the rendered legal caveat plus the message key, requested/resolved locale metadata, and fallback state.
- Country-pack guidance, labels, notification field names, and workbook-derived text remain source-mapped country-pack data. UI code may render message keys and source-mapped values, but must not hardcode regulatory facts or translate official source text as if it were authoritative.

Country-pack notification drafts will converge on the generic `NotificationDraft` persistence model.

- Future country packs should use generic `NotificationDraft.payloadJson`.
- `payloadJson` must contain a versioned envelope with at least:
  - `payloadSchemaKey`,
  - `payloadSchemaVersion`,
  - `frameworkKey`,
  - `jurisdiction`,
  - `notificationType`,
  - `locale`,
  - legal-caveat key/locale/fallback metadata,
  - source-mapped fields,
  - source references,
  - country-pack-specific payload data.
- Payload schema keys use the pattern `{country}.{framework}.{notification_kind}.v{major}`, for example `ro.nis2.registration_notification.v1`.
- Country-specific tables may exist only as compatibility or workflow companion tables when they carry country-pack-specific relational links or migration state that the generic draft table should not own.
- New country packs should not create `BgNis2NotificationDraft`, `PlNis2NotificationDraft`, and similar tables by default.

## Romania Compatibility

`RoNis2NotificationDraft` remains supported as a Romania compatibility/workflow companion table because it already exists and carries `onboardingProgressId`, `classificationRunId`, and an optional `notificationDraftId` link.

Forward posture:

1. New persisted Romania notification drafts should create or reference a generic `NotificationDraft` row first.
2. The Romania companion row may keep links to onboarding progress and classification runs.
3. The Romania companion payload should use the same envelope shape and `ro.nis2.registration_notification.v1` schema key.
4. Existing Romania draft payloads remain readable. Migration to the envelope shape can be lazy or batch-driven in a later milestone.
5. Report builders and exports should prefer the generic envelope metadata when present and keep the legal caveat from the keyed message registry.

## Consequences

- Reports and notification exports can show honest fallback behavior instead of silently mixing languages.
- Product/legal can approve Romanian copy as a controlled message update without changing regulatory source mappings.
- Future country packs get one generic draft persistence path with versioned payload schemas.
- Romania-specific workflow links remain isolated in the Romania package/schema instead of becoming a pattern for every country.
- A follow-up implementation milestone is still required to wire generic draft persistence, migration helpers, API reads/writes, and expanded drift coverage beyond the M23 contract layer.

## Non-Decisions

- M23 does not implement a served frontend i18n runtime.
- M23 does not approve Romanian legal-caveat wording.
- M23 does not translate official Romanian workbook text.
- M23 does not migrate existing database rows.
- M23 does not enable provider write/remediation execution.
