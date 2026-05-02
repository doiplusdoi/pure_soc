# M32 Plan: Live Redis/BullMQ Job Durability Smoke Slice

## Summary

Implement Prompt 31 from `docs/codex-prompts.md`: add a bounded live Redis/BullMQ durability smoke for the existing job-runtime boundary, without enabling provider writes.

Status: staged for implementation after M31.
Created: 2026-05-02.

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

- Pending. M32 implementation must create `docs/PLAN_M33.md` before final response.

Residual risk:

- Pending.
