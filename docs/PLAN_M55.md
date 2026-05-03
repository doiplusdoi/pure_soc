# M55 Plan: Action-Run Idempotency

## Summary

Add idempotency at the remediation action-run creation boundary so retried API clients cannot create duplicate action runs before any future provider write execution is enabled.

Status: completed.
Created: 2026-05-03.
Started: 2026-05-03.
Completed: 2026-05-03.

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

Started 2026-05-03.

Implementation results:

- Added optional `ActionRun.idempotencyKey` support to the recommendation domain, in-memory remediation repository, API service input, Prisma action repository, and Prisma schema.
- `POST /organizations/:orgId/actions/runs` now reads `Idempotency-Key`, trims it, rejects empty/oversized/malformed values with `invalid_idempotency_key`, and returns an existing same-organization action run for retries.
- Action-run API responses omit the raw idempotency key and expose only `idempotencyKeyPresent: true`.
- Added a Prisma migration and drift coverage for `ProviderActionRun.idempotencyKey` plus unique `(organizationId, idempotencyKey)` model attribute.
- Added domain, API, and Prisma repository tests for retry deduplication, no-key create-new behavior, malformed key rejection, and cross-organization scoping.
- No provider executors, live queues, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, Redis targets, external smoke commands, or provider write paths were called or enabled.

Changed files:

- `code/README.md`
- `code/apps/api/src/__tests__/actions-remediation-approval-preflight-evidence-audit.test.ts`
- `code/apps/api/src/actions/routes.ts`
- `code/apps/api/src/actions/service.ts`
- `code/apps/api/src/server.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/prisma/migrations/20260503010000_action_run_idempotency/migration.sql`
- `code/packages/database/src/__tests__/prisma-actions.repository.spec.ts`
- `code/packages/database/src/repositories/actions.ts`
- `code/packages/recommendations/src/__tests__/actions.spec.ts`
- `code/packages/recommendations/src/actions.ts`
- `code/packages/recommendations/src/index.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M55.md`
- `docs/PLAN_M56.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- Failed as expected in this environment: `pnpm test -- actions remediation api database audit` (`pnpm: command not found`).
- Passed: `flatpak-spawn --host npm run test -- actions remediation api database audit` (37 files, 131 tests).
- Passed: `flatpak-spawn --host npm run lint` (layout, schema drift, generated regulatory drift, TypeScript).
- Passed: `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`.
- Passed: `git diff --check`.

Acceptance status:

- Accepted. Action-run creation is idempotent per organization/key, malformed keys are rejected, no-key requests remain intentionally create-new, raw idempotency keys are not returned by the API, Prisma and in-memory behavior are covered, and provider writes remain disabled.

Gaps updated:

- GAP-030 narrowed for API/domain/repository action-run creation idempotency, organization-scoped key lookup, response redaction, Prisma field/index coverage, and deterministic tests without live provider writes.
- GAP-043 and GAP-044 are preserved; no live queue/external-smoke path was run.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 54 / PLAN_M55 complete and stages Prompt 55 / PLAN_M56 for multi-process audit-chain append concurrency.
- `docs/PLAN_M56.md` created.

Residual risk:

- Idempotency narrows duplicate action-run creation only when clients provide a key. Live provider execution, provider-specific rollback/verification, production queue orchestration, live database/queue action-execution smoke, evidence artifact creation beyond metadata, and customer-facing remediation enablement remain deferred under GAP-030/GAP-043.
