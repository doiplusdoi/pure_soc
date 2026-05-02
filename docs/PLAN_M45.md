# M45 Plan: Microsoft 365 Read-Only Disposable Tenant Smoke Harness

## Summary

Implement the next active prompt after M44: add a guarded Microsoft 365 read-only disposable tenant smoke harness that remains dry-run by default and only allows live Graph read execution when M42 readiness guardrails report the Microsoft 365 read-only path is ready.

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

Started 2026-05-02.
Completed 2026-05-02.

Implementation results:

- Added `pnpm microsoft365:smoke:read-only` via `code/scripts/microsoft365-read-only-smoke.ts` and a Microsoft 365 provider-package smoke runner.
- Reused the M42 readiness preflight for `microsoft365_read_only_tenant`; default execution is dry-run and makes no token or Graph calls.
- Dry-run output plans app-only token acquisition, encrypted credential envelope creation, provider-neutral in-memory connection/credential/permission-bundle storage, and read-only module sync.
- Live-candidate execution is blocked unless readiness is `ready_for_disposable_smoke`, `PURESOC_EXTERNAL_SMOKE_MODE=live_candidate`, a safe target kind is selected, `PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true`, `PURESOC_EXTERNAL_SMOKE_MICROSOFT365=true`, and Microsoft 365 client ID, client secret, and tenant ID are configured.
- Live-candidate execution is constrained to the official public-cloud Microsoft identity and Graph base URLs for this smoke; sovereign-cloud base URL selection remains deferred.
- Added disabled write-bundle checks and report redaction so write scopes, write bundles, tokens, client secrets, tenant IDs, raw tenant payloads, live user emails, endpoint URLs, and credential envelopes are not emitted.
- Added deterministic fake live-candidate token and Graph coverage without requiring an approved disposable tenant.

Changed files:

- `code/README.md`
- `code/package.json`
- `code/packages/providers/microsoft365/src/index.ts`
- `code/packages/providers/microsoft365/src/__tests__/microsoft365-read-only-smoke.spec.ts`
- `code/scripts/microsoft365-read-only-smoke.ts`
- `docs/LEARNINGS.md`
- `docs/PLAN.md`
- `docs/PLAN_M45.md`
- `docs/PLAN_M46.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/microsoft365-permissions.md`

Validation:

- `pnpm` was unavailable in the sandbox and local `npm` was unavailable because the sandbox cannot create namespaces; host-node/npm equivalents were used through `flatpak-spawn --host`.
- Passed: `npm run test -- microsoft365-read-only-smoke microsoft365-readiness external-smoke`
- Passed: `npm run microsoft365:smoke:read-only` in default dry-run mode; readiness reported `blocked_missing_secret`, status `dry_run_passed`, and no live calls.
- Passed: `npm run lint`
- Passed: `npm run test -- config provider microsoft365 external-smoke api health`
- Passed: `npm run external-smoke:readiness`
- Passed: `npm run test:e2e -- --grep @ui-smoke`
- Passed: `docker compose -f infra/compose/docker-compose.yml config`
- Passed: `git diff --check`

Acceptance status:

- Accepted for M45. The command is deterministic and secret-free in dry-run, live execution is impossible without M42 readiness plus disposable/test opt-ins, production-like targets and write bundles are rejected, provider-token redaction is preserved, and prompt/gap handoff docs are updated.

Gaps updated:

- GAP-007 narrowed for the guarded Microsoft 365 read-only smoke command, dry-run/live-candidate preflight, disabled write-bundle checks, sanitized output, and deterministic fake token/Graph tests.
- GAP-028, GAP-029, GAP-030, GAP-032, GAP-035, GAP-039, GAP-040, and GAP-043 remain preserved.

Prompt handoff:

- `docs/codex-prompts.md` marks M45 completed and stages M46.
- `docs/PLAN_M46.md` was created for the OIDC/Social Login Disposable Callback Smoke Harness.

Residual risk:

- No approved live Microsoft 365 disposable tenant was available, so real Graph execution remains unproven.
- No real service-plan or tenant-license validation was performed.
- Sovereign-cloud Microsoft identity/Graph base URL selection remains deferred.
- Live customer, staging, and production tenants remain blocked.
- Microsoft write scopes and remediation/provider writes remain disabled.
