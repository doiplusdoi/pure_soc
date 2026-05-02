# M35 Plan: Remediation Worker Provider Execution Safety Contract Slice

## Summary

Implement the next active prompt after M34: narrow GAP-030 by adding a bounded remediation worker/provider execution safety contract around existing action-run metadata, using deterministic fake/mock provider action execution only, without enabling live Microsoft Graph writes or production provider remediation.

Status: staged for implementation after M34.
Created: 2026-05-02.

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

- Pending. M35 implementation must create `docs/PLAN_M36.md` before final response.

Residual risk:

- Pending.
