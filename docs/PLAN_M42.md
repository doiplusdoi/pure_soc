# M42 Plan: External Integration Smoke Readiness Matrix And Guardrail Slice

## Summary

Implement the next active prompt after M41: prepare live external smoke work with a deterministic, secret-free readiness matrix and guardrail command before any real provider calls are attempted.

Status: staged for implementation after M41.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M41.md`
- `docs/threat-model.md`
- `docs/microsoft365-permissions.md`
- `code/packages/config/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/apps/api/src/provider-connections/**`
- `code/packages/billing/**`
- `code/apps/api/src/billing/**`
- `code/packages/auth/oidc/src/**`
- `code/apps/api/src/auth/**`
- `code/packages/evidence/src/**`
- `code/apps/api/src/evidence/**`
- `code/scripts/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Build a dry-run readiness matrix for Microsoft 365, Stripe, OIDC/social login, object-storage/scanner, and evidence/report runtime smokes. The default command must not call live services; it should report readiness, blockers, unsafe targets, and explicit opt-in requirements.

## Scope

Expected implementation areas:

- Secret-free external smoke readiness contracts and report output.
- A deterministic readiness command, likely `pnpm external-smoke:readiness`.
- Guardrails for disposable/test target confirmation and per-provider live opt-in flags.
- Tests for redaction, missing-secret blockers, unsafe production targets, and no-live-call default behavior.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- Default readiness mode is dry-run only.
- Provider writes, Microsoft write scopes, live remediation, and production custody claims remain disabled.
- Absence of live credentials is a blocker to report, not a success to fake.
- Any future live mode must require explicit confirmation and disposable/test target checks.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/packages/billing/**`
- `code/packages/auth/oidc/src/**`
- `code/packages/evidence/src/**`
- `code/apps/api/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M42.md`
- `docs/PLAN_M43.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/microsoft365-permissions.md`

## Negative Constraints

- Do not call live Microsoft Graph, Stripe, OIDC providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, or public regulatory URLs in the default readiness command.
- Do not enable live provider write/remediation actions, Microsoft write scopes, or provider-token production custody claims.
- Do not weaken audit redaction, organization scoping, auth/session safeguards, origin/rate-limit middleware, regulatory no-auto-activation rules, evidence storage-pointer redaction, or legal caveat enforcement.
- Do not print, snapshot, log, or persist secrets in readiness outputs, tests, docs, or failure metadata.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config provider microsoft365 billing oidc evidence api health
pnpm external-smoke:readiness
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-007, GAP-028, GAP-029, and GAP-032 only for readiness metadata, opt-in guardrails, and blocker reporting unless actual live disposable smoke is intentionally implemented and accepted.
- Preserve GAP-030, GAP-035, GAP-039, GAP-040, and GAP-043 unless those production hardening areas are intentionally implemented and accepted.

## Acceptance Criteria

- Readiness output is deterministic and secret-free.
- Default readiness command makes no live external calls.
- Missing credentials, unsupported providers, unsafe production targets, and disabled integrations are reported as blockers or skipped states.
- Documentation explains how to move from readiness to an approved disposable live smoke without enabling provider writes.
- Prompt and gap handoff docs are updated and `docs/PLAN_M43.md` is created.

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

- Pending. M42 implementation must create `docs/PLAN_M43.md` before final response.

Residual risk:

- Pending.
