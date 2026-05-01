# M19 Plan: Job Runtime Baseline

## Summary

Implement Prompt 18 from `docs/codex-prompts.md`: add a shared job runtime baseline so worker, scheduler, and connector-runner roles can execute typed jobs through a deterministic in-memory harness and a Redis/BullMQ-ready adapter boundary, without enabling provider write actions.

Status: staged for implementation after M18.  
Created: 2026-05-01.

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

- Pending. M19 implementation must create `docs/PLAN_M20.md` before final response.

Residual risk:

- Pending.
