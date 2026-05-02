# M45 Plan: Microsoft 365 Read-Only Disposable Tenant Smoke Harness

## Summary

Implement the next active prompt after M44: add a guarded Microsoft 365 read-only disposable tenant smoke harness that remains dry-run by default and only allows live Graph read execution when M42 readiness guardrails report the Microsoft 365 read-only path is ready.

Status: staged for implementation after M44.
Created: 2026-05-02.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M44.md`
- `docs/threat-model.md`
- `code/packages/config/src/**`
- `code/packages/providers/core/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/apps/api/src/provider-connections/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/apps/connector-runner/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/package.json`
- `code/README.md`

## Goal

Add a deterministic Microsoft 365 smoke command, likely `pnpm microsoft365:smoke:read-only`, that proves planned disposable read-only Graph module operations are safe to run only after the M42 readiness matrix reports `microsoft365_read_only_tenant` as ready.

## Scope

Expected implementation areas:

- Microsoft 365 read-only smoke command with dry-run default.
- Readiness-matrix preflight reuse for `microsoft365_read_only_tenant`.
- Live/disposable guardrails for approved local/test/ci/disposable Microsoft 365 tenants only.
- Secret-free output and tests for redaction, unsafe target rejection, missing blockers, dry-run behavior, and no write-scope enablement.
- Documentation and gap/prompt handoff updates.

Locked assumptions:

- Default command mode is dry-run and must not call Microsoft Graph or any external provider.
- Live/disposable execution, if implemented, targets only an approved disposable/test tenant and read-only Graph modules.
- Absence of a disposable Microsoft 365 tenant is a blocker to report, not a success to fake.
- Provider credentials remain encrypted/redacted, generic provider storage remains provider-neutral, module-level permission/license degradation remains intact, and Microsoft write scopes remain disabled.
- Provider writes and remediation execution remain disabled.

Expected files:

- `code/package.json`
- `code/packages/config/src/**`
- `code/packages/providers/core/src/**`
- `code/packages/providers/microsoft365/src/**`
- `code/apps/api/src/provider-connections/**`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/http.ts`
- `code/apps/connector-runner/src/**`
- `code/scripts/**`
- `code/tests/**`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M45.md`
- `docs/PLAN_M46.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

## Negative Constraints

- Do not call Microsoft Graph, OIDC providers, Stripe, object storage, scanners, browser/PDF services, KMS/HSM/secret-manager/cloud APIs, external timestamp/signing services, public regulatory URLs, or provider write executors in default dry-run mode.
- Do not call production/staging/customer Microsoft 365 tenants; live/disposable execution must be explicitly approved for local/test/ci/disposable tenant targets only.
- Do not request, persist, or enable Microsoft write scopes; do not enable live provider write/remediation actions or provider-token production custody claims.
- Do not weaken encrypted provider credential handling, provider-token redaction, organization scoping, auth/session safeguards, origin/rate-limit middleware, regulatory no-auto-activation rules, audit redaction, or module-level partial-failure behavior.
- Do not print, snapshot, log, or persist provider tokens, refresh tokens, access tokens, OAuth codes, client secrets, tenant raw payloads, user emails from live tenants, session cookies, Stripe secrets, object-storage credentials, KMS/secret-manager values, or endpoint URLs.
- Do not treat live smoke absence as success; report blockers honestly.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- config provider microsoft365 external-smoke api health
pnpm external-smoke:readiness
pnpm microsoft365:smoke:read-only
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here. If an approved disposable Microsoft 365 tenant is unavailable, preserve dry-run behavior and document blockers instead of faking live Graph coverage.

## Expected Gap Movement

- Narrow GAP-007 only for the implemented Microsoft 365 read-only disposable tenant smoke harness, dry-run/live-test guardrails, permission metadata checks, and any actual approved disposable tenant execution result.
- Preserve GAP-028, GAP-029, GAP-030, GAP-032, GAP-035, GAP-039, GAP-040, and GAP-043 unless those areas are intentionally implemented and accepted.

## Acceptance Criteria

- Dry-run command is deterministic and secret-free.
- Live/disposable execution is impossible unless the M42 readiness preflight is ready for Microsoft 365 and all disposable/test opt-ins are set.
- Production-like targets, write scopes, endpoint/token leakage, and live provider writes are rejected.
- Provider-token redaction, module-level permission/license degradation, organization scoping, and provider-neutral storage are preserved by tests.
- Prompt and gap handoff docs are updated and `docs/PLAN_M46.md` is created.

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

- Pending. M45 implementation must create `docs/PLAN_M46.md` before final response.

Residual risk:

- Pending.
