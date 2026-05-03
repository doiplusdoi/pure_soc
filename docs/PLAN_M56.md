# M56 Plan: Multi-Process Audit-Chain Append Concurrency

## Summary

Harden persisted audit append ordering so concurrent API processes cannot fork the per-organization or global audit hash chain by appending against the same latest anchor.

Status: staged for implementation after M55.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M55.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/packages/audit/src/index.ts`
- `code/packages/audit/src/__tests__/audit-integrity.spec.ts`
- `code/packages/database/prisma/schema.prisma`
- `code/packages/database/src/repositories/audit.ts`
- `code/packages/database/src/__tests__/prisma-audit.repository.spec.ts`
- `code/apps/api/src/audit/routes.ts`
- `code/apps/api/src/__tests__/audit-export-checkpoints.test.ts`
- `code/apps/api/src/auth/services.ts`
- `code/scripts/check-schema-contract-drift.ts`
- `code/package.json`
- `code/README.md`

## Goal

Ensure persisted audit writes for the same organization/global scope append as one linear hash chain even when two API processes attempt to write concurrently.

## Scope

Expected implementation areas:

- Add a Prisma-mode audit append concurrency strategy, preferably a transaction-scoped PostgreSQL advisory lock or equivalent repository boundary.
- Preserve in-memory deterministic audit behavior and clearly keep it scoped to tests/local memory mode.
- Add same-scope contention tests and different-organization independence tests.
- Preserve audit redaction, organization scoping, checkpoint/export caveats, and non-WORM/non-notarized guarantees.
- Update GAP-039 and prompt handoff docs.

Locked assumptions:

- This milestone narrows hash-chain fork risk only; it does not create WORM storage or external notarization.
- No live database, external service, provider write, or external-smoke command should run by default.

## Negative Constraints

- Do not claim WORM storage, external notarization, legal certification, or database-admin-proof auditability.
- Do not call live PostgreSQL, Redis, external signing/notary services, object storage, KMS/HSM/secret-manager/cloud APIs, Microsoft Graph, Stripe, OIDC/OAuth providers, public regulatory URLs, production/staging/customer deployments, or provider write executors.
- Do not weaken existing audit redaction, organization scoping, checkpoint/export guarantees, or non-WORM/non-notarized caveats.
- Do not introduce a broad API framework or route migration in this prompt.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- audit database api
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-039 for multi-process same-scope audit-chain append ordering.
- Preserve WORM/object-storage export writers, real external signing/notarized checkpoints, checkpoint retention operations, legal-hold/deletion procedures, and operational verification/alerting as deferred under GAP-039.
- Preserve GAP-044; M56 must not run external smoke commands.

## Acceptance Criteria

- Same-scope concurrent persisted audit appends produce one linear chain with no duplicate-anchor fork.
- Different organizations can append independently without cross-organization contamination.
- Audit redaction, hash metadata, export/checkpoint caveats, and route authorization remain intact.
- No live external services, provider writes, or external-smoke commands are called.
- Prompt and gap handoff docs are updated and `docs/PLAN_M57.md` is created.

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

- Pending. M56 implementation must create `docs/PLAN_M57.md` before final response.

Residual risk:

- Pending.
