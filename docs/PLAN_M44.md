# M44 Plan: Object-Storage, Scanner, And Evidence Runtime Disposable Smoke Harness

## Summary

Implement the next active prompt after M43: add a guarded object-storage/scanner/evidence runtime smoke harness that remains dry-run by default and only allows disposable local/test execution when M42 readiness guardrails report the selected runtime path is ready.

Status: completed.
Created: 2026-05-02.
Started: 2026-05-02.
Completed: 2026-05-02.

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

Started 2026-05-02.

Implementation results:

- Added `pnpm evidence:smoke:runtime`, implemented by `code/scripts/evidence-runtime-smoke.ts`.
- Added a dry-run-first evidence runtime smoke harness in `@puresoc/evidence`. The harness reuses M42 readiness preflights for `object_storage_scanner_runtime` and `evidence_report_runtime`, reports planned renderer/scanner/S3/evidence/export metadata operations, refuses live execution unless both readiness paths and all disposable/local/test opt-ins are satisfied, and keeps endpoint URLs, credentials, storage URIs, full object keys, uploaded bytes, and rendered report bodies out of output.
- Added live-candidate execution logic for explicitly confirmed local/test/disposable targets: render synthetic PDF data through the configured report-renderer URL, scan and store the generated report as evidence through the HTTP scanner and S3-compatible adapter, read it back through the evidence vault, record an access log, and report CSV/binary evidence-package metadata as smoke metadata.
- Added deterministic tests for dry-run no-call behavior, blocked live guardrails, fake-runtime live-candidate execution, scanner fail-closed behavior, and output redaction.
- Wired `PURESOC_REPORT_RENDERER` into config loading and extended readiness metadata with scanner/renderer endpoint classes without returning endpoint values.
- Updated README, learnings, milestone index, gap register, active prompts, and staged `docs/PLAN_M45.md`.

Changed files:

- `code/.env.example`
- `code/README.md`
- `code/package.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/external-smoke-readiness.ts`
- `code/packages/config/src/__tests__/external-smoke-readiness.test.ts`
- `code/packages/evidence/src/index.ts`
- `code/packages/evidence/src/__tests__/evidence-runtime-smoke.test.ts`
- `code/scripts/evidence-runtime-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M44.md`
- `docs/PLAN_M45.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable, so validation used host-node/npm equivalents through `flatpak-spawn --host`.
- `npm run test -- evidence-runtime-smoke external-smoke` passed: 2 files, 11 tests.
- `npm run evidence:smoke:runtime` passed in default dry-run mode. It planned report-renderer, evidence upload/download, and export metadata operations; reported readiness statuses and missing/configured variable names; and made no live network calls.
- `npm run lint` passed.
- `npm run test -- config evidence reports external-smoke api health` passed: 30 files, 102 tests.
- `npm run external-smoke:readiness` passed. Default summary remained dry-run/no-live-call with `not_configured=5`, `configured_dry_run_only=1`, `ready_for_disposable_smoke=0`, `blocked_missing_secret=1`, `unsafe_production_target=0`; the evidence/report check reports the renderer endpoint class without endpoint values.
- `npm run test:e2e -- --grep @ui-smoke` passed and wrote deterministic HTML snapshots under `/tmp/puresoc-ui-smoke-*`.
- `docker compose -f infra/compose/docker-compose.yml config` passed through the host Docker CLI.
- `git diff --check` passed.

Acceptance status:

- Accepted for M44. The command is deterministic and dry-run by default; live/disposable execution is blocked unless both M42 readiness paths are ready and all disposable/local/test guardrails are set; output is secret-free and omits endpoint URLs, storage pointers, full object keys, uploaded bytes, and report bodies.

Gaps updated:

- GAP-029 narrowed for a dry-run-first evidence runtime smoke command, M42 readiness preflight reuse, local/test/disposable endpoint guardrails, sanitized output, deterministic fake-runtime coverage of renderer/scanner/S3/evidence metadata/access logs, and scanner fail-closed behavior without approved live runtime service calls.
- GAP-007, GAP-028, GAP-030, GAP-032, GAP-035, GAP-039, GAP-040, and GAP-043 preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 43 / PLAN_M44 complete and stages Prompt 44 / PLAN_M45 for a Microsoft 365 read-only disposable tenant smoke harness.
- `docs/PLAN_M45.md` was created from the staged M45 prompt.

Residual risk:

- No approved live MinIO/S3, scanner, or report-renderer target was exercised; default validation remains dry-run plus deterministic fake-runtime tests.
- The M44 smoke writes/reads objects when explicitly enabled but does not provision buckets, validate object-storage IAM policies, or prove deployed bucket lifecycle/retention settings.
- Browser-grade PDF fidelity, persisted CSV export records, and real binary evidence-package assembly remain open under GAP-029.
