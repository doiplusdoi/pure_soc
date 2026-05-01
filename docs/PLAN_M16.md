# M16 Plan: API Request Body And Evidence Upload Limits

## Summary

Implement Prompt 15 from `docs/codex-prompts.md`: close GAP-034 by adding central request body limits, evidence upload byte limits, clear `413 payload_too_large` responses, and scanner timeout handling.

Started: 2026-05-01.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/threat-model.md`
- Latest changed files
- Latest test output

## Scope

Expected implementation areas:

- API request parsing in `code/apps/api/src/http.ts` and `code/apps/api/src/server.ts`.
- Evidence upload route validation in `code/apps/api/src/evidence/routes.ts`.
- Evidence scanner timeout behavior in `code/packages/evidence/src/index.ts`.
- Runtime config defaults and environment overrides in `code/packages/config`, `code/config/defaults`, and `code/.env.example`.
- Focused API/config/evidence tests for oversized JSON bodies, Stripe raw webhook bodies, decoded evidence content, and scanner timeout failure behavior.

## Assumptions

- The M15 working tree is clean; latest changed files are the M15 handoff docs from commit `87c2e27`.
- Latest test output is the M15 docs-only `git diff --check` pass recorded in `docs/PLAN_M15.md`.
- Limits should default to conservative self-host-friendly values and remain environment configurable.
- Oversized evidence rejection should happen after request JSON parsing succeeds but before decoded content is scanned, hashed, stored, linked, or audited.

## Negative Constraints

- Do not add provider write/remediation execution.
- Do not weaken Stripe webhook signature verification.
- Do not log or return rejected payload content, base64 evidence bodies, tokens, secrets, webhook signatures, object URLs, or internal `storageUri` values.
- Do not rely on `Content-Length` alone; enforce limits while reading streamed chunks.
- Do not put Microsoft-specific, Romania-specific, or regulatory fact logic into generic parser/evidence code.
- Do not make legal certification claims.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand api http evidence storage scanner config billing webhook
git diff --check
```

## Expected Gap Movement

- Resolve GAP-034 only if limits are configurable, streaming-enforced, and covered by tests for JSON, Stripe raw bodies, evidence uploads, and scanner timeout behavior.
- Keep runtime deployment smokes for PostgreSQL, object storage, scanner service, Stripe, OIDC, and browser cookies in their existing gaps.

## Acceptance Criteria

- Oversized JSON requests return `413` with `payload_too_large`.
- Oversized Stripe webhook raw bodies return `413` before signature handling and without logging raw content.
- Oversized evidence upload content is rejected before scanner/storage side effects.
- HTTP scanner timeout returns a failed scan result and preserves production fail-closed upload behavior.
- Existing evidence response redaction and Stripe signature verification tests still pass.

## Completion Log

Completed: 2026-05-01.

Implementation results:

- Added `code/config/defaults/api.json` and `.env.example` entries for JSON request, Stripe webhook raw body, and decoded evidence upload byte limits.
- Added upload scanner timeout defaults and environment override in storage config.
- Updated `@puresoc/config` to load typed request/upload/timeout limits with safe fallback for invalid numeric overrides.
- Updated API body parsing so JSON and raw bodies enforce limits with early `Content-Length` checks and chunk-level streaming checks.
- Updated the Stripe webhook route to use the configured raw-body limit while preserving exact accepted bytes for signature verification.
- Updated evidence upload construction so decoded content above the configured limit is rejected before scanner, storage, artifact, access-log, or audit side effects.
- Updated `HttpUploadScanner` to abort slow scanner requests and return a failed scan result with `scanner_timeout`.
- Added focused API/config/evidence tests for parser limits, oversized Stripe raw bodies, oversized base64 evidence uploads, scanner timeout behavior, and config overrides.

Changed files:

- `code/.env.example`
- `code/config/defaults/api.json`
- `code/config/defaults/storage.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/evidence/service.ts`
- `code/apps/api/src/__tests__/api-body-limit.test.ts`
- `code/packages/evidence/src/index.ts`
- `code/packages/evidence/src/__tests__/evidence-vault.spec.ts`
- `docs/PLAN_M16.md`
- `docs/PLAN_M17.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Validation:

- `pnpm lint` could not run because `pnpm` is not installed on this host.
- `pnpm test -- --runInBand api http evidence storage scanner config billing webhook` could not run because `pnpm` is not installed on this host.
- `npm run test -- --runInBand api http evidence storage scanner config billing webhook` could not run because Vitest 3.2.4 rejects the `--runInBand` option.
- `npm run lint` passed through host Node/npm.
- `npm run test -- api http evidence storage scanner config billing webhook` passed through host Node/npm: 19 test files, 61 tests.
- `git diff --check` passed.

Acceptance status:

- Accepted for M16 using host-node equivalents. The prompt's exact `pnpm` commands remain unavailable in this environment because `pnpm` is not installed, and the prompt's `--runInBand` flag is not supported by the installed Vitest version.

Gaps updated:

- GAP-034 is resolved for configurable parser limits, decoded evidence byte limits, stable 413 errors, and scanner timeout contract tests.
- Future streaming/multipart large-file upload design remains deferred under runtime/upload planning, currently referenced from GAP-029.

Prompt handoff:

- `docs/codex-prompts.md` now marks Prompt 15 / `PLAN_M16` completed.
- Prompt 16 / `PLAN_M17` now targets GAP-027 regulatory source monitor runtime scheduling.
- `docs/PLAN_M17.md` was created from the next active prompt.

Residual risk:

- Runtime smoke against live object storage, live scanner service, browser-grade PDF rendering, CSV exports, and binary evidence bundles remains under GAP-029.
- The current upload API still carries evidence content inside JSON; larger production uploads should use a streaming/multipart design before substantially raising limits.
