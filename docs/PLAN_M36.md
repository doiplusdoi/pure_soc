# M36 Plan: Production Queue Orchestration And Multi-Process BullMQ Hardening Slice

## Summary

Implement the next active prompt after M35: narrow GAP-043 by hardening the production queue orchestration contract around the existing Redis-backed `bullmq` adapter and runtime loops, without enabling live provider writes or external provider calls.

Status: staged for implementation after M35.
Created: 2026-05-02.

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

- Pending. M36 implementation must create `docs/PLAN_M37.md` before final response.

Residual risk:

- Pending.
