# M76 Plan: Evidence Runtime Disposable Smoke Handoff

## Summary

Prepare the outside-app disposable evidence runtime smoke for MinIO/S3-compatible storage, upload scanning, report rendering, generated-report evidence, access logging, CSV status, and binary bundle status.

Status: completed app-side handoff.
Created: 2026-05-04.
Completed: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/PLAN_M8.md`
- `docs/PLAN_M44.md`
- `code/scripts/evidence-runtime-smoke.ts`
- `code/packages/evidence`
- `code/packages/reports`
- `code/apps/report-renderer`

## Goal

Narrow GAP-029 by converting evidence runtime hardening into an operator-ready disposable smoke checklist, without calling object storage, scanners, or renderers during this repo-side batch.

## Handoff Checklist

External setup needed:

- Disposable MinIO/S3 bucket or bucket namespace.
- Restricted access key and secret for that bucket only.
- Bucket cleanup policy.
- HTTP scanner endpoint or explicit local disposable scanner.
- Report-renderer endpoint that is local/test/disposable.
- Synthetic evidence bytes only.
- Confirmation that no production/customer evidence is present.

Required guardrails:

- `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`
- `PURESOC_EXTERNAL_SMOKE_TARGET_KIND=disposable`
- `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`
- `PURESOC_EXTERNAL_SMOKE_STORAGE=true`
- `PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS=true`
- S3-compatible storage variables configured.
- HTTP scanner variables configured.
- Report-renderer endpoint configured.

Execution sequence for the operator:

```sh
cd code
npm run external-smoke:readiness
npm run external-smoke:select-target
npm run evidence:smoke:runtime
```

Only run the final command if the selector chooses the evidence/storage path as the single ready candidate.

Acceptance evidence to record:

- Object write/read/delete or cleanup path passed.
- Scanner fail-closed behavior passed.
- Generated report stored as evidence metadata.
- Download/access audit log written.
- Storage URI and object keys stayed server-side.
- CSV export and binary evidence-package status explicitly reported as implemented or deferred.

## Negative Constraints

- Do not use production/customer buckets or evidence.
- Do not print storage credentials, endpoint URLs, storage URIs, full object keys, uploaded bytes, or report bodies.
- Do not call external object storage/scanner/report-renderer from default validation.
- Do not represent deterministic fake-runtime coverage as live evidence runtime proof.

## Completion Log

Completed 2026-05-04 as the evidence runtime handoff.

Changed files:

- `docs/PLAN_M76.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Acceptance status:

- GAP-029 has a concrete disposable-smoke checklist.
- GAP-029 remains open until the smoke runs against approved disposable runtime services and the PDF/CSV/binary-bundle gaps are implemented or explicitly launch-deferred.
