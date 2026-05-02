# M35 Plan: Remediation Worker Provider Execution Safety Contract Slice

## Summary

Implement the next active prompt after M34: narrow GAP-030 by adding a bounded remediation worker/provider execution safety contract around existing action-run metadata, using deterministic fake/mock provider action execution only, without enabling live Microsoft Graph writes or production provider remediation.

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
- `docs/PLAN_M34.md`
- `docs/threat-model.md`
- `code/packages/recommendations/src/**`
- `code/packages/jobs/src/**`
- `code/packages/providers/core/src/**`
- `code/packages/providers/mock/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/packages/database/src/**`
- `code/packages/database/prisma/**`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/apps/worker/src/**`
- `code/apps/connector-runner/src/**`
- `code/scripts/**`
- `code/config/defaults/**`
- `code/package.json`
- `code/README.md`
- `code/tests/**`

## Goal

Add a testable remediation execution safety boundary so worker-side action execution can prove preflight, approval, snapshot binding, provider write-enabled checks, idempotency, failure metadata, verification metadata, and audit redaction with fake/mock provider actions before any live Microsoft provider write path exists.

## Scope

Expected implementation areas:

- Provider action executor boundary separate from read-only provider sync.
- Worker action-execution path wiring for deterministic fake/mock provider action execution only.
- Tests for preflight, approval, snapshot, provider-connection write-enabled, idempotency, retry/failure, audit redaction, and verification metadata.
- Documentation in `code/README.md`, gap register, current milestone, and prompt handoff docs.

Locked assumptions:

- Live Microsoft Graph writes remain disabled.
- Microsoft write permission bundles remain separate and disabled by default.
- Fake/mock provider execution can narrow GAP-030 but does not close live provider write readiness.
- GAP-043 still owns production multi-process queue orchestration hardening unless explicitly addressed.
- GAP-040 still owns live KMS/secret-manager custody unless explicitly addressed.

Expected files:

- `code/package.json`
- `code/packages/recommendations/src/**`
- `code/packages/jobs/src/**`
- `code/packages/providers/core/src/**`
- `code/packages/providers/mock/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/packages/database/src/**`
- `code/packages/database/prisma/**`
- `code/packages/config/src/**`
- `code/apps/api/src/**`
- `code/apps/worker/src/**`
- `code/apps/connector-runner/src/**`
- `code/config/defaults/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M35.md`
- `docs/PLAN_M36.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not call live Microsoft Graph or any external provider write endpoint.
- Do not request or enable Microsoft write scopes by default.
- Do not make remediation actions executable for production/customer provider connections without explicit write-enabled connection state, preflight, approval, snapshots, idempotency, verification, evidence, and audit coverage.
- Do not weaken audit redaction, provider-token custody, organization scoping, auth/session safeguards, regulatory no-auto-activation rules, or provider-write startup disablement.
- Do not broaden into Stripe, OIDC, browser UI, MinIO/S3, scanners, public regulatory fetches, KMS, or audit WORM/signing work.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- actions worker jobs provider remediation api database audit
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run equivalent host-node commands and record the substitution here.

## Expected Gap Movement

- Narrow GAP-030 for remediation worker/provider execution safety contracts and fake/mock execution coverage.
- Preserve GAP-039 unless external audit signing/WORM storage is intentionally added.
- Preserve GAP-040 unless live KMS/secret-manager custody is intentionally added.
- Preserve GAP-043 unless production queue orchestration hardening is intentionally added.

## Acceptance Criteria

- Fake/mock provider action execution cannot run without preflight, approval, matching snapshots, and provider write-enabled checks.
- Worker execution is idempotent and records deterministic retry/failure/verification metadata.
- Provider write execution stays disabled for Microsoft/live providers by default.
- Logs, audit payloads, job payloads, and API responses do not expose provider tokens, OAuth codes, client secrets, authorization headers, key material, or decrypted credential payloads.
- Gap and prompt handoff docs honestly describe remaining live provider-write and production queue hardening work.

## Completion Log

Started 2026-05-02.

Implementation results:

- Added a provider-neutral `ProviderActionExecutor` boundary in `@puresoc/providers-core`, including a disabled executor and redacted provider-action execution errors.
- Added a deterministic fake action executor in `@puresoc/provider-mock` that validates, applies, emits post-state evidence metadata, verifies, and redacts configured fake failures without live provider calls.
- Added a Microsoft 365 disabled action executor in `@puresoc/provider-microsoft365`; Microsoft live write execution remains unavailable by default.
- Added `apps/worker/src/action-execution.ts`, which keeps the default worker runtime in safety-validation-only mode unless fake-provider execution dependencies are explicitly injected. The execution path checks persisted preflight, approval, pre-state snapshot, provider connection identity, write-enabled state, executor identity, idempotent already-completed runs, failure metadata, post-state snapshot metadata, verification metadata, and redacted audit payloads.
- Added focused worker, mock-provider, and Microsoft disabled-executor tests for safety gates, write-enabled checks, idempotency, fake apply failures, verification metadata, and secret redaction.
- Documented the fake/mock-only execution boundary and remaining live-provider/queue risks in README, gap register, prompts, learnings, and the next milestone stub.

Changed files:

- `code/README.md`
- `code/apps/worker/package.json`
- `code/apps/worker/src/action-execution.ts`
- `code/apps/worker/src/__tests__/action-execution.test.ts`
- `code/apps/worker/src/index.ts`
- `code/apps/worker/src/runtime.ts`
- `code/pnpm-lock.yaml`
- `code/packages/audit/src/index.ts`
- `code/packages/providers/core/src/actions.ts`
- `code/packages/providers/core/src/index.ts`
- `code/packages/providers/microsoft365/src/action-executor.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-action-executor-disabled.spec.ts`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/mock/src/__tests__/mock-action-executor.spec.ts`
- `code/packages/providers/mock/src/index.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M35.md`
- `docs/PLAN_M36.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm` and sandbox-local `npm` were unavailable. Validation used host-node equivalents through `flatpak-spawn --host` and `npm`.
- `npm run lint` passed, including layout checks, schema drift checks for 29 models / 432 fields, generated Romania regulatory drift checks, and TypeScript.
- `npm run test -- actions worker jobs provider remediation api database audit` passed: 46 test files, 156 tests.
- `docker compose -f infra/compose/docker-compose.yml config` passed.
- `git diff --check` passed.

Acceptance status:

- Accepted for M35. The milestone adds fake/mock provider action execution contracts and worker-side safety/idempotency/failure/verification/audit coverage without enabling live Microsoft Graph writes or customer-impacting provider remediation.

Gaps updated:

- GAP-030 narrowed for fake/mock provider action executor contracts, worker-side persisted safety checks, idempotency, failure/verification metadata, and redacted audit coverage.
- GAP-039 preserved; no external audit signing/WORM storage was added.
- GAP-040 preserved; no live KMS/secret-manager custody was added.
- GAP-043 preserved; no production multi-process queue orchestration hardening was added.

Prompt handoff:

- `docs/codex-prompts.md` marks Prompt 34 / PLAN_M35 complete and stages Prompt 35 / PLAN_M36 for production queue orchestration and multi-process BullMQ hardening.
- `docs/PLAN_M36.md` was created from the staged M36 prompt.

Residual risk:

- Provider execution is fake/mock only. Live Microsoft 365 or other customer-impacting write execution remains blocked and still requires provider-specific preflight/snapshot/apply/verify/evidence contracts, rollback runbooks, live tenant smoke, and separate write consent.
- M35 records action post-state evidence metadata but does not create binary evidence artifacts through object storage.
- Production multi-process queue orchestration, atomic Redis claiming under real contention, retention cleanup, metrics/alerts, reconnect/backoff, and deployed shutdown/recovery remain open under GAP-043.
