# M49 Plan: External Live-Smoke Target Selection And Readiness Audit Slice

## Summary

Implement the next active prompt after M48: add a metadata-only external live-smoke target selection/readiness audit that helps operators choose exactly one approved disposable/test smoke path without making live calls by default.

Status: staged for implementation after M48.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M48.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/scripts/external-smoke-readiness.ts`
- `code/scripts/*smoke*.ts`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a deterministic external live-smoke target-selection/readiness audit slice that ranks currently configured paths and explains why each is ready, blocked, unsafe, or not configured. Default behavior must remain dry-run and metadata-only.

## Scope

Expected implementation areas:

- Metadata-only selector over `pnpm external-smoke:readiness`.
- Ranking/explanation for Microsoft 365 read-only tenant, Stripe test-mode, OIDC/social callback, object-storage/scanner, evidence/report runtime, auth deployment, and provider-token custody paths.
- Tests for redaction, no live calls by default, unsafe target rejection, and deterministic blocker output.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- No live target is approved merely because it is configured.
- Live execution may happen only if the user provides an approved local/test/ci/disposable target and the existing command guardrails are satisfied.
- Provider writes, Microsoft Graph writes, customer-impacting actions, and production/staging/customer targets remain disabled/rejected.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M49.md`
- `docs/PLAN_M50.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

## Negative Constraints

- Do not call Microsoft Graph, OIDC/OAuth providers, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, public regulatory URLs, production/staging/customer deployments, or provider write executors by default.
- Do not enable live provider writes, Microsoft Graph write/remediation actions, or customer-impacting token/evidence/billing/provider operations.
- Do not print, snapshot, log, or persist provider tokens, OAuth codes, client secrets, key material, decrypted credential payloads, authorization headers, session cookies, endpoint URLs for live services, KMS/secret-manager values, customer tenant identifiers, Stripe object IDs, storage object keys, report bodies, or user emails.
- Do not claim a live smoke ran unless an approved local/test/ci/disposable target was actually exercised and the command output proves it without secrets.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- external-smoke readiness smoke target selection config
pnpm external-smoke:readiness
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If no approved live target exists, preserve metadata-only behavior and document blockers instead of faking live execution.

## Expected Gap Movement

- Narrow whichever live-smoke gap receives selector/readiness-audit improvements only for metadata and guardrail work actually implemented.
- Preserve GAP-030, GAP-039, GAP-040, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- Selector output is deterministic, secret-free, and makes no live calls by default.
- Ready, blocked, unsafe, and not-configured states are explained with stable codes.
- Exactly one next live-smoke path can be selected only when explicit local/test/ci/disposable approval exists.
- Prompt and gap handoff docs are updated and `docs/PLAN_M50.md` is created.

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

- Pending. M49 implementation must create `docs/PLAN_M50.md` before final response.

Residual risk:

- Pending.
