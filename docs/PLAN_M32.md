# M32 Plan: Live Redis/BullMQ Job Durability Smoke Slice

## Summary

Implement Prompt 31 from `docs/codex-prompts.md`: add a bounded live Redis/BullMQ durability smoke for the existing job-runtime boundary, without enabling provider writes.

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
- `docs/PLAN_M31.md`
- `docs/threat-model.md`
- `code/packages/jobs/src/**`
- `code/apps/worker/src/**`
- `code/apps/scheduler/src/**`
- `code/apps/connector-runner/src/**`
- `code/apps/api/src/auth/services.ts`
- `code/infra/compose/docker-compose.yml`
- `code/package.json`
- `code/scripts/**`
- `code/tests/**`

## Goal

Prove the job-runtime adapter boundary can use a live Redis/BullMQ-compatible runtime for enqueue, claim, complete, retry/failure metadata, idempotency, and graceful shutdown semantics across worker, scheduler, and connector-runner roles, while keeping provider write/remediation execution disabled.

## Scope

Expected implementation areas:

- A bounded Redis/BullMQ adapter implementation or smoke harness under the existing `@puresoc/jobs` boundary.
- A disposable Redis smoke command that can target a caller-provided `REDIS_URL` or local disposable Redis container.
- Representative live queue coverage for read-only provider sync job metadata, regulatory source monitor enqueue/dispatch metadata, and remediation action safety-metadata validation, without external provider calls.
- Documentation for local/CI execution and safety constraints.
- Gap and prompt updates based on implementation results.

Locked assumptions:

- `PURESOC_JOB_QUEUE_PROVIDER=memory` remains the default deterministic mode.
- BullMQ/Redis durability proof does not imply production-ready live provider writes.
- Provider write/remediation execution remains disabled until GAP-030 is intentionally addressed.
- The smoke must not require Microsoft Graph, Stripe, OIDC providers, PostgreSQL beyond existing contracts, object storage, scanner, public regulatory URL fetches, KMS, browser runtime, or provider write permissions.
- The live queue slice may implement a minimal Redis-backed adapter under the existing BullMQ queue-provider boundary without adding a third-party BullMQ dependency, because the repository does not currently carry BullMQ in `node_modules` or `package.json`.
- The Redis smoke writes only synthetic `m32-smoke-*` job keys under unique queue names and must target a local/disposable Redis instance unless an explicit disposable confirmation is provided.

Expected files:

- `code/package.json`
- `code/packages/jobs/src/**`
- `code/apps/worker/src/**`
- `code/apps/scheduler/src/**`
- `code/apps/connector-runner/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M32.md`
- `docs/PLAN_M33.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not enable provider write/remediation execution.
- Do not add live Microsoft Graph, Stripe, OIDC-provider, MinIO/S3, scanner, public regulatory URL, KMS, browser, or provider-write dependencies.
- Do not weaken remediation safety metadata checks, read-only connector-runner checks, regulatory no-auto-activation rules, audit redaction, or organization scoping.
- Do not make Redis/BullMQ the default unless the implementation and docs explicitly preserve deterministic memory mode.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- jobs worker scheduler connector-runner provider regulatory actions
pnpm <new-live-redis-bullmq-smoke-command>
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Close or narrow GAP-037 for live Redis/BullMQ queue durability.
- Preserve GAP-030; do not enable live provider write/remediation execution.
- Preserve GAP-039/GAP-040 unless audit WORM/external signing or KMS/key-rotation smoke is intentionally added.

## Acceptance Criteria

- The live smoke proves enqueue/claim/complete/retry/failure behavior against disposable Redis/BullMQ.
- Worker, scheduler, and connector-runner job-role semantics remain compatible with the existing memory harness.
- Read-only provider sync and regulatory monitor paths remain bounded and do not call live external services.
- Remediation jobs validate safety metadata only and do not execute provider writes.
- Gap and prompt handoff docs honestly distinguish live queue durability from future provider execution.

## Completion Log

Started 2026-05-02.

Implementation results:

- Replaced the placeholder BullMQ boundary in `@puresoc/jobs` with an opt-in Redis-backed queue adapter selected by `PURESOC_JOB_QUEUE_PROVIDER=bullmq`, while preserving deterministic `memory` mode as the default.
- Added `pnpm jobs:smoke:redis`, backed by `code/scripts/live-redis-bullmq-smoke.ts`, with local/disposable Redis safety checks and unique synthetic `m32-smoke-*` queue names.
- The live smoke proves Redis connectivity, enqueue, duplicate idempotency, claim, complete, retry/failure metadata, graceful shutdown, worker remediation safety-validation metadata, scheduler regulatory monitor dispatch with a fake metadata client, and connector-runner read-only provider sync plus non-read-only rejection.
- Documented local/CI Redis smoke usage and safety constraints in `code/README.md`.
- No live Microsoft Graph, Stripe, OIDC provider, object storage, scanner, public regulatory URL, KMS, browser, or provider write dependency was added.

Changed files:

- `code/README.md`
- `code/package.json`
- `code/packages/jobs/src/index.ts`
- `code/packages/jobs/src/__tests__/job-runtime.spec.ts`
- `code/scripts/live-redis-bullmq-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M32.md`
- `docs/PLAN_M33.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were not available. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run lint` passed.
- `npm run test -- jobs worker scheduler connector-runner provider regulatory actions` passed: 23 test files, 82 tests.
- `REDIS_URL=redis://127.0.0.1:<ephemeral>/0 npm run jobs:smoke:redis` passed against a disposable `redis:7-alpine` container.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M32. The live Redis smoke proves the bounded queue durability behaviors requested by the prompt without changing the memory default or enabling provider writes.

Gaps updated:

- GAP-037 resolved for bounded live Redis queue adapter and durability smoke.
- GAP-043 created for production multi-process queue orchestration, queue retention/observability, and full BullMQ hardening that remains outside M32.
- GAP-030 preserved; no provider write/remediation execution was added.
- GAP-039/GAP-040 preserved; no audit WORM/external signing or KMS/key-rotation smoke was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 31 / PLAN_M32 complete and stages Prompt 32 / PLAN_M33.
- `docs/PLAN_M33.md` was created for the audit WORM/export and external checkpoint planning slice.

Residual risk:

- The Redis adapter is a minimal implementation under the existing `bullmq` provider boundary and not a full third-party BullMQ worker deployment.
- The live smoke is bounded and in-process; production multi-process queue claiming, retry recovery, retention cleanup, metrics, and long-running deployed loop behavior remain tracked by GAP-043.
- Provider write execution remains disabled and open under GAP-030.
