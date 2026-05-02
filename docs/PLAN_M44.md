# M44 Plan: Object-Storage, Scanner, And Evidence Runtime Disposable Smoke Harness

## Summary

Implement the next active prompt after M43: add a guarded object-storage/scanner/evidence runtime smoke harness that remains dry-run by default and only allows disposable local/test execution when M42 readiness guardrails report the selected runtime path is ready.

Status: staged for implementation after M43.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M43.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/packages/evidence/src/**`
- `code/apps/api/src/evidence/**`
- `code/apps/api/src/reports/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/apps/report-renderer/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a deterministic runtime smoke command, likely `pnpm evidence:smoke:runtime`, that proves planned disposable object-storage, scanner, generated-report evidence, and report-renderer operations are safe to run only after the M42 readiness matrix reports the storage/evidence paths as ready.

## Scope

Expected implementation areas:

- Evidence/runtime smoke command with dry-run default.
- Readiness-matrix preflight reuse for `object_storage_scanner_runtime` and `evidence_report_runtime`.
- Live/disposable guardrails for local/test/ci/disposable storage, scanner, and renderer targets only.
- Secret-free output and tests for redaction, unsafe target rejection, missing blockers, and dry-run behavior.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- Default command mode is dry-run and must not call object storage, scanners, report-renderer/browser services, or any external provider.
- Live/disposable execution, if implemented, targets only local/test/ci/disposable runtime services.
- Absence of disposable runtime services is a blocker to report, not a success to fake.
- Evidence storage-pointer redaction, scanner fail-closed semantics, legal caveat enforcement, generated-report evidence metadata, audit events, and organization scoping must remain unchanged.
- Provider writes and Microsoft write scopes remain disabled.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/packages/evidence/src/**`
- `code/apps/api/src/evidence/**`
- `code/apps/api/src/reports/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/apps/report-renderer/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M44.md`
- `docs/PLAN_M45.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not call object storage, scanners, browser/PDF services, Microsoft Graph, Stripe, OIDC providers, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, public regulatory URLs, or provider write executors in default dry-run mode.
- Do not call production/staging/customer buckets, scanners, or report-renderer endpoints; live/disposable execution must be local/test/ci/disposable only and explicitly confirmed.
- Do not enable live provider write/remediation actions, Microsoft write scopes, or provider-token production custody claims.
- Do not weaken evidence authorization, audit redaction, organization scoping, auth/session safeguards, origin/rate-limit middleware, regulatory no-auto-activation rules, generated-report evidence storage, storage-pointer redaction, upload scanner fail-closed behavior, or legal caveat enforcement.
- Do not print, snapshot, log, or persist object-storage credentials, scanner endpoint URLs, internal storage URIs, public object URLs, session cookies, provider tokens, OAuth codes, Stripe secrets, KMS/secret-manager values, uploaded file contents, generated report contents from real customer data, or full object keys.
- Do not treat live smoke absence as success; report blockers honestly.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config evidence reports external-smoke api health
pnpm external-smoke:readiness
pnpm evidence:smoke:runtime
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If disposable object-storage/scanner/report targets are unavailable, preserve dry-run behavior and document blockers instead of faking live smoke coverage.

## Expected Gap Movement

- Narrow GAP-029 only for the implemented object-storage/scanner/evidence/report smoke harness, dry-run/live-test guardrails, and any actual approved disposable runtime execution result.
- Preserve GAP-007, GAP-028, GAP-030, GAP-032, GAP-035, GAP-039, GAP-040, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- Dry-run command is deterministic and secret-free.
- Live/disposable execution is impossible unless the M42 readiness preflight is ready for the selected path and all disposable/test opt-ins are set.
- Production-like targets and endpoint/credential leakage are rejected.
- Evidence storage-pointer redaction, scanner fail-closed behavior, legal caveat enforcement, and generated-report evidence metadata are preserved by tests.
- Prompt and gap handoff docs are updated and `docs/PLAN_M45.md` is created.

## Completion Log

Not started.

Implementation results:

- Pending.

Changed files:

- Pending.

Validation:

- Pending.

Acceptance status:

- Pending.

Gaps updated:

- Pending.

Prompt handoff:

- Pending. M44 implementation must create `docs/PLAN_M45.md` before final response.

Residual risk:

- Pending.
