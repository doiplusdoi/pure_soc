# M36 Plan: Production Queue Orchestration And Multi-Process BullMQ Hardening Slice

## Summary

Implement the next active prompt after M35: narrow GAP-043 by hardening the production queue orchestration contract around the existing Redis-backed `bullmq` adapter and runtime loops, without enabling live provider writes or external provider calls.

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
- `docs/PLAN_M35.md`
- `docs/threat-model.md`
- `code/packages/jobs/src/**`
- `code/apps/worker/src/**`
- `code/apps/scheduler/src/**`
- `code/apps/connector-runner/src/**`
- `code/packages/providers/core/src/**`
- `code/packages/providers/mock/src/**`
- `code/packages/database/src/**`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/scripts/**`
- `code/config/defaults/**`
- `code/package.json`
- `code/README.md`
- `code/tests/**`

## Goal

Add production-shaped queue orchestration hardening for the existing job runtime: multi-worker claim safety, retry/failure metadata, retention/cleanup expectations, graceful shutdown/recovery behavior, and disposable Redis smoke coverage for separate worker/scheduler/connector-runner runtime instances.

## Scope

Expected implementation areas:

- Redis-backed queue claim semantics and contention coverage.
- Multi-runtime smoke or test harness for worker, scheduler, and connector-runner sharing the queue contract.
- Retention/cleanup, reconnect/backoff, and graceful shutdown behavior where feasible in this bounded slice.
- Queue metadata/log redaction and documentation for operator-owned Redis settings.
- Documentation in `code/README.md`, gap register, current milestone, and prompt handoff docs.

Locked assumptions:

- `PURESOC_JOB_QUEUE_PROVIDER=memory` remains the deterministic default.
- Redis/BullMQ hardening can narrow GAP-043 but does not close live provider write readiness.
- Remediation execution remains fake/mock only; live Microsoft Graph writes stay disabled.
- GAP-030 remains open for live provider write execution.
- GAP-039 and GAP-040 remain out of scope unless explicitly selected later.

Expected files:

- `code/package.json`
- `code/packages/jobs/src/**`
- `code/apps/worker/src/**`
- `code/apps/scheduler/src/**`
- `code/apps/connector-runner/src/**`
- `code/packages/providers/core/src/**`
- `code/packages/providers/mock/src/**`
- `code/packages/database/src/**`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/config/defaults/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M36.md`
- `docs/PLAN_M37.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not call live Microsoft Graph or any external provider write endpoint.
- Do not request or enable Microsoft write scopes by default.
- Do not make remediation actions executable for production/customer provider connections beyond the M35 fake/mock executor path.
- Do not weaken audit redaction, provider-token custody, organization scoping, auth/session safeguards, regulatory no-auto-activation rules, or provider-write startup disablement.
- Do not broaden into Stripe, OIDC, browser UI, MinIO/S3, scanners, public regulatory fetches, KMS, or audit WORM/signing work.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- jobs worker scheduler connector-runner provider actions queue redis api database audit
pnpm jobs:smoke:redis
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run equivalent host-node commands and record the substitution here. The Redis smoke must target a local/disposable Redis instance; if no disposable Redis is available, record the blocker here and in `docs/implementation-gaps.md`.

## Expected Gap Movement

- Narrow GAP-043 for production queue orchestration hardening.
- Preserve GAP-030 unless live provider write execution is explicitly implemented and accepted.
- Preserve GAP-039 unless external audit signing/WORM storage is intentionally added.
- Preserve GAP-040 unless live KMS/secret-manager custody is intentionally added.

## Acceptance Criteria

- Redis-backed queue behavior has deterministic contention coverage proving duplicate workers cannot normally process the same job.
- Retry/failure metadata and retention/cleanup expectations are explicit and tested.
- Worker, scheduler, and connector-runner runtime loops can share the queue contract in a disposable smoke without live external services.
- Queue logs and job metadata remain secret-free.
- Gap and prompt handoff docs honestly describe remaining queue, provider-write, and operator-owned Redis work.

## Completion Log

Started 2026-05-02.

Implementation results:

- Hardened `@puresoc/jobs` Redis queue behavior with per-job claim locks, bounded Redis command retry/backoff, explicit stale-running recovery, terminal cleanup hooks, and queue metadata/failure-detail redaction.
- Added Redis job settings to config defaults/env overrides for command attempts/backoff, claim lease, stale-running recovery threshold, and terminal retention windows.
- Extended worker/scheduler/connector-runner Redis queue construction to pass the configured Redis command and claim settings while preserving memory mode as the default.
- Added deterministic tests for Redis claim contention across two runtime instances, stale-running recovery, completed/failed retention cleanup, idempotency-index cleanup, Redis command retry/backoff, and secret-free queue metadata/failure details.
- Extended `pnpm jobs:smoke:redis` so the disposable Redis smoke now uses synthetic `puresoc-m36-smoke-*` queues and proves competing worker runtime instances process only one shared job, plus recovery, cleanup, graceful shutdown, scheduler fake metadata dispatch, and connector-runner read-only provider sync.
- Documented remaining operator-owned Redis settings and preserved fake/mock/read-only provider behavior only.

Changed files:

- `code/README.md`
- `code/apps/connector-runner/src/runtime.ts`
- `code/apps/scheduler/src/runtime.ts`
- `code/apps/worker/src/runtime.ts`
- `code/config/defaults/jobs.json`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/config/src/index.ts`
- `code/packages/jobs/src/__tests__/job-runtime.spec.ts`
- `code/packages/jobs/src/index.ts`
- `code/scripts/live-redis-bullmq-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M36.md`
- `docs/PLAN_M37.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run lint` passed, including layout checks, schema drift checks for 29 models / 432 fields, generated Romania regulatory drift checks, and TypeScript.
- `npm run test -- jobs worker scheduler connector-runner provider actions queue redis api database audit` passed: 49 test files, 165 tests.
- `REDIS_URL=redis://127.0.0.1:<ephemeral>/0 npm run jobs:smoke:redis` passed against a disposable `redis:7-alpine` container.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M36. The milestone narrows queue orchestration risk for the current Redis adapter with claim-lock contention safety, recovery/retention hooks, bounded command retry, redaction, deterministic tests, and disposable Redis smoke coverage without enabling live provider writes.

Gaps updated:

- GAP-043 narrowed for per-job claim locks, bounded Redis command retry/backoff, stale-running recovery, terminal cleanup hooks, queue metadata/failure-detail redaction, and disposable Redis smoke coverage.
- GAP-030 preserved; no live provider write execution was added.
- GAP-039 preserved; no external audit signing/WORM storage was added.
- GAP-040 preserved; no live KMS/secret-manager custody was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 35 / PLAN_M36 complete and stages Prompt 36 / PLAN_M37 for audit export retention and external checkpoint contracts.
- `docs/PLAN_M37.md` was created from the staged M37 prompt.

Residual risk:

- The Redis smoke uses bounded in-process runtime instances and a disposable Redis container; it is not a deployed multi-container soak with independently started long-running services.
- Redis durability mode, eviction policy, metrics/alerts, cleanup cadence, stale-running recovery thresholds, and shutdown/recovery runbooks remain operator-owned.
- Stale-running recovery is explicit rather than automatically scheduled; enabling it too aggressively could duplicate legitimate long-running work.
- The queue adapter remains a minimal Redis-backed contract under the `bullmq` boundary, not the third-party BullMQ library.
- Provider execution remains fake/mock or read-only only; production/customer provider writes remain blocked under GAP-030.
