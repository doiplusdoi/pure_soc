# M16 Plan: API Request Body And Evidence Upload Limits

## Summary

Implement Prompt 15 from `docs/codex-prompts.md`: close GAP-034 by adding central request body limits, evidence upload byte limits, clear `413 payload_too_large` responses, and scanner timeout handling.

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

Pending implementation.
