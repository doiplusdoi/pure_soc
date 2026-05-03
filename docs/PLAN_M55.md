# M55 Plan: Action-Run Idempotency

## Summary

Add idempotency at the remediation action-run creation boundary so retried API clients cannot create duplicate action runs before any future provider write execution is enabled.

Status: staged for implementation after M54.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M54.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/packages/recommendations/src/actions.ts`
- `code/packages/recommendations/src/__tests__/actions.spec.ts`
- `code/apps/api/src/actions/service.ts`
- `code/apps/api/src/actions/routes.ts`
- `code/apps/api/src/__tests__/actions-remediation-approval-preflight-evidence-audit.test.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/repositories/actions.ts`
- `code/packages/database/src/__tests__/prisma-actions.repository.spec.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `code/package.json`
- `code/README.md`

## Goal

Make action-run creation idempotent per organization and idempotency key while preserving all existing remediation safety gates and keeping provider writes disabled.

## Scope

Expected implementation areas:

- Add optional action-run idempotency key support to the recommendation/action domain model and repository contracts.
- Read and validate the `Idempotency-Key` request header in the action-run creation route.
- Return an existing action run when the same organization and idempotency key are submitted again.
- Keep idempotency scoped by organization, not global.
- Add Prisma schema/migration and repository coverage for the new field/index.
- Add regression coverage for duplicate `POST` behavior, no-key behavior, malformed-key rejection, and cross-organization isolation.
- Update GAP-030 and prompt handoff docs.

Locked assumptions:

- Idempotency prevents duplicate action-run creation only; it does not enable provider write execution.
- Existing action preflight, approval, snapshot, verification, evidence, and audit requirements remain intact.
- Multiple null or absent idempotency keys may keep existing non-idempotent create behavior.

## Negative Constraints

- Do not execute action runs against live provider executors, Microsoft Graph, or customer-impacting provider write paths.
- Do not enable Microsoft write/remediation scopes, provider write jobs, live queues, or provider write consent.
- Do not weaken preflight, approval, snapshot, evidence, verification, or audit requirements.
- Do not make idempotency keys globally scoped.
- Do not log raw authorization headers, cookies, provider tokens, secrets, provider payloads, or idempotency key values when redacted metadata is enough.
- Do not run external-smoke commands in this milestone.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- actions remediation api database audit
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-030 for duplicate action-run creation risk at the API/domain/repository boundary.
- Preserve live provider execution, provider-specific rollback/verification, live queue orchestration, and customer-facing remediation enablement as deferred under GAP-030/GAP-043.
- Preserve GAP-044; M55 must not run external smoke commands.

## Acceptance Criteria

- `Idempotency-Key` on action-run creation returns the same action run for retries within the same organization.
- The same key cannot expose or reuse another organization's action run.
- Malformed or oversized idempotency keys are rejected with a stable client error.
- Existing no-key action-run creation behavior remains intentionally non-idempotent unless an idempotency key is provided.
- Prisma and in-memory repositories agree on idempotency behavior.
- Provider writes remain disabled and no live external services are called.
- Prompt and gap handoff docs are updated and `docs/PLAN_M56.md` is created.

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

- Pending. M55 implementation must create `docs/PLAN_M56.md` before final response.

Residual risk:

- Pending.
