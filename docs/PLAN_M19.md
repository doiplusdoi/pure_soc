# M19 Plan: Job Runtime Baseline

## Summary

Implement Prompt 18 from `docs/codex-prompts.md`: add a shared job runtime baseline so worker, scheduler, and connector-runner roles can execute typed jobs through a deterministic in-memory harness and a Redis/BullMQ-ready adapter boundary, without enabling provider write actions.

Status: completed.
Created: 2026-05-01.
Started: 2026-05-01.
Completed: 2026-05-01.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/threat-model.md`
- `docs/claude_rec2.md`
- `docs/PLAN_M18.md`
- `docs/adr/ADR-002-docker-image-and-compose-service-catalog.md`
- `docs/adr/ADR-003-multitenancy-and-rls-posture.md`
- `docs/adr/ADR-004-application-database-schema-and-tenant-scoped-data-model.md`
- `docs/adr/ADR-011-regulatory-source-activation-lifecycle.md`

## Goal

Move worker, scheduler, and connector-runner from explicit contract-status entrypoints to real job-runtime process loops while preserving all safety constraints.

## Scope

Expected implementation areas:

- Typed job definitions and dispatch results for scheduler jobs, connector sync jobs, and worker jobs.
- In-memory queue/runner adapter for deterministic tests.
- Redis/BullMQ-ready adapter boundary, with live Redis calls deferred unless the implementation can validate them safely.
- Scheduler runtime loop capable of invoking the existing `regulatory.monitorCountrySources` job under explicit config.
- Worker runtime loop that validates remediation job safety metadata without executing provider writes.
- Connector-runner runtime loop that executes read-only provider sync jobs and keeps `allowProviderWrites=false`.
- Docker entrypoints for worker, scheduler, and connector-runner updated from contract-status output to runtime process entrypoints if implemented.

Expected files:

- `code/.env.example`
- `code/config/defaults/jobs.json` or existing config defaults as appropriate
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/jobs/src/index.ts` or app-local job modules if a package is intentionally deferred
- `code/packages/jobs/src/__tests__/*.spec.ts` or equivalent app-local tests
- `code/apps/worker/src/index.ts`
- `code/apps/worker/src/runtime.ts`
- `code/apps/worker/src/__tests__/*.test.ts`
- `code/apps/scheduler/src/index.ts`
- `code/apps/scheduler/src/runtime.ts`
- `code/apps/scheduler/src/regulatory-source-monitor.ts`
- `code/apps/scheduler/src/__tests__/*.test.ts`
- `code/apps/connector-runner/src/index.ts`
- `code/apps/connector-runner/src/runtime.ts`
- `code/apps/connector-runner/src/__tests__/*.test.ts`
- `code/infra/docker/Dockerfile.worker`
- `code/infra/docker/Dockerfile.scheduler`
- `code/infra/docker/Dockerfile.connector-runner`
- `code/infra/compose/docker-compose.yml`
- `code/package.json`
- `README.md`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M19.md`
- `docs/PLAN_M20.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not execute remediation provider writes.
- Do not add Microsoft-specific logic to generic job runtime packages.
- Do not add Romania-specific logic outside Romania country-pack/importer surfaces.
- Do not hardcode regulatory facts in UI conditionals.
- Do not make legal certification claims.
- Do not weaken organization-scoped authorization, evidence response redaction, audit redaction, or regulatory no-auto-activation guardrails.
- Do not remove deterministic in-memory test harnesses.
- Do not claim full production readiness from queue-runtime tests alone.
- Do not introduce a broad API framework migration.
- Do not run live Stripe, Microsoft Graph, OIDC, MinIO/S3, public regulatory URL, or provider-write smoke tests in unit tests.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- jobs worker scheduler connector runtime docker
pnpm prisma:validate
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run the equivalent host-node commands and record the substitution here.

If Docker build/run is available, also run a bounded worker or scheduler image smoke that proves the container starts the runtime entrypoint and logs/serves implemented job-runtime status. If Docker is unavailable, add static tests and record live Docker smoke as residual risk.

## Expected Gap Movement

- Resolve or narrow GAP-037 if worker, scheduler, and connector-runner have real runtime loops.
- Preserve GAP-030 unless provider write execution remains disabled.
- Preserve GAP-028, GAP-029, GAP-031, GAP-032, GAP-033, GAP-035, and GAP-036 unless M19 directly validates those runtime areas.
- Create or update gaps for any queue adapter, idempotency, retry, graceful shutdown, or live Redis behavior intentionally deferred.

## Acceptance Criteria

- Job contracts are registered in one discoverable runtime surface.
- In-memory job adapter can enqueue, claim, complete, fail, and avoid duplicate processing deterministically.
- Worker runtime validates remediation safety gates and never executes provider writes.
- Scheduler runtime can invoke the regulatory source monitor job without auto-activating legal logic.
- Connector-runner runtime preserves read-only provider sync behavior.
- Docker worker/scheduler/connector-runner commands point at implemented runtime entrypoints or document any role still intentionally contract-only.
- Tests cover job dispatch, idempotency/duplicate handling, retry/failure metadata, graceful shutdown behavior, and no-provider-write enforcement.

## Completion Log

Completed 2026-05-01.

Implementation results:

- Scope confirmed against required docs, ADRs, M18 handoff, threat model, and GAP-037.
- Added `@puresoc/jobs` with typed job definitions, dispatch results, retry/failure metadata, idempotency hooks, deterministic in-memory queue/runner behavior, graceful shutdown handling, and a BullMQ-ready adapter boundary without live Redis calls.
- Added job runtime config defaults and environment overrides for queue provider, Redis URL, attempts, retry backoff, polling, shutdown grace, scheduler cadence, and connector-runner provider-write disablement.
- Worker runtime now validates `actions.execute` remediation safety metadata and returns provider-write execution as disabled.
- Scheduler runtime can enqueue `regulatory.monitorCountrySources` under explicit config without auto-activating legal logic.
- Connector-runner runtime executes `provider.sync` through the neutral provider pipeline with `allowProviderWrites=false` and rejects non-read-only payloads.
- Docker job service scripts now point at runtime loop entrypoints, and runtime-status files report implemented runtime entrypoints instead of contract-only deferrals.

Changed files:

- `README.md`
- `code/.env.example`
- `code/README.md`
- `code/apps/connector-runner/package.json`
- `code/apps/connector-runner/src/index.ts`
- `code/apps/connector-runner/src/main.ts`
- `code/apps/connector-runner/src/provider-sync.ts`
- `code/apps/connector-runner/src/runtime.ts`
- `code/apps/connector-runner/src/runtime-status.ts`
- `code/apps/connector-runner/src/__tests__/runtime.test.ts`
- `code/apps/scheduler/package.json`
- `code/apps/scheduler/src/index.ts`
- `code/apps/scheduler/src/main.ts`
- `code/apps/scheduler/src/runtime.ts`
- `code/apps/scheduler/src/runtime-status.ts`
- `code/apps/scheduler/src/__tests__/runtime.test.ts`
- `code/apps/worker/package.json`
- `code/apps/worker/src/index.ts`
- `code/apps/worker/src/main.ts`
- `code/apps/worker/src/runtime.ts`
- `code/apps/worker/src/runtime-status.ts`
- `code/apps/worker/src/__tests__/runtime.test.ts`
- `code/config/defaults/jobs.json`
- `code/package.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/jobs/package.json`
- `code/packages/jobs/src/index.ts`
- `code/packages/jobs/src/__tests__/job-runtime.spec.ts`
- `code/pnpm-lock.yaml`
- `code/scripts/check-layout.mjs`
- `code/tests/docker-runtime-shape.spec.ts`
- `docs/PLAN.md`
- `docs/PLAN_M19.md`
- `docs/PLAN_M20.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` was not available on this host, so host-node equivalents were used.
- `npm run lint` passed.
- `npm run test -- config jobs worker scheduler connector runtime docker` passed: 13 test files, 41 tests.
- `DATABASE_URL=postgresql://puresoc:puresoc@localhost:5432/puresoc npm run prisma:validate` passed.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `docker compose -f infra/compose/docker-compose.yml build puresoc-worker` passed.
- Bounded worker image smoke passed with `PURESOC_WORKER_ENABLED=false`; the container logged the implemented runtime entrypoint with `registeredJobs:["actions.execute"]` and `providerWriteExecution:"disabled"`.
- `git diff --check` passed after removing markdown trailing whitespace.

Acceptance status:

- Accepted for M19. Worker, scheduler, and connector-runner now have implemented job-runtime loops for the current deterministic harness, without enabling provider writes.

Gaps updated:

- GAP-013 updated to record worker/scheduler/connector-runner runtime entrypoints and defer live Redis/BullMQ durability.
- GAP-030 updated to record that the worker runtime validates remediation safety metadata only; live provider write execution remains open.
- GAP-037 narrowed for typed runtime loops, in-memory harness, idempotency/retry metadata, graceful shutdown tests, and BullMQ-ready boundary; live Redis/BullMQ durability remains open.

Prompt handoff:

- `docs/codex-prompts.md` now marks Prompt 18 / PLAN_M19 completed and stages Prompt 19 / PLAN_M20.
- `docs/PLAN_M20.md` created for API Middleware And Rate-Limit Baseline.

Residual risk:

- Live Redis/BullMQ queue calls are not implemented; the BullMQ adapter is a typed boundary only.
- Job state is in-memory in the implemented harness and is not durable across process restarts.
- Scheduler runtime has a loop and explicit config, but no production recurring scheduler/Redis durability smoke.
- Worker remediation jobs validate safety metadata only; GAP-030 still blocks live provider write execution.
- Full multi-service Compose startup for all roles was not run; M19 ran Compose config plus a bounded worker image build/run smoke.
