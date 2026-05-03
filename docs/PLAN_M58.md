# M58 Plan: Romanian Message Catalog Runtime

## Summary

Wire the next Romanian message-catalog runtime slice so report, notification, and selected UI copy resolve through shared locale/message contracts with explicit fallback metadata.

Status: staged for implementation after M57.
Created: 2026-05-03.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M57.md`
- `docs/threat-model.md`
- `docs/claude_rec4.md`
- `code/packages/shared/src/index.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/notification-draft.types.ts`
- `code/packages/compliance/nis2/country-packs/ro/src/__tests__/ro-i18n-notification-model.spec.ts`
- `code/packages/reports/src/builders.ts`
- `code/packages/reports/src/__tests__/report-builders.spec.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/__tests__/operational-console.test.ts`
- `code/package.json`
- `code/README.md`

## Goal

Make Romanian locale behavior deterministic and runtime-consumed without pretending Romanian legal caveat text is approved when the repository only has English legal text.

## Scope

Expected implementation areas:

- Add or refine shared message-catalog resolution for supported locales `en` and `ro`.
- Preserve English legal-caveat fallback for Romanian unless approved Romanian legal copy already exists in repo.
- Wire report builders and Romania notification draft envelopes through the shared resolver.
- Add demo-safe Romanian message entries only for non-legal product copy that does not make regulatory or certification claims.
- Optionally wire the served operational console to consume catalog copy where this does not broaden the frontend runtime.
- Update GAP-042 and prompt handoff docs.

Locked assumptions:

- Product/legal-approved Romanian legal caveat text is not assumed.
- This milestone is runtime catalog wiring and fallback metadata, not a legal translation approval milestone.
- No live external services or external-smoke commands should run.

## Negative Constraints

- Do not add unapproved Romanian legal-caveat text or imply legal/certification approval.
- Do not put Romania-specific copy into EU baseline modules except through country-pack/message-key data.
- Do not hardcode regulatory facts in UI conditionals.
- Do not introduce a broad i18n framework or frontend rewrite.
- Do not change report/notification payload schema keys unless tests and migration posture are updated.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- i18n ro notification reports web
pnpm test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-042 for runtime message-catalog wiring and explicit fallback metadata.
- Preserve product/legal approval as the blocker for Romanian legal-caveat text if no approved wording exists.
- Preserve GAP-044; M58 must not run external smoke commands.

## Acceptance Criteria

- Locale/message resolution has deterministic tests for English, Romanian, and fallback behavior.
- Reports and Romania notification envelopes expose message keys, requested locale, resolved locale, and fallback status consistently.
- Any Romanian copy added is non-legal/demo-safe and does not claim certification or legal approval.
- `@ui-smoke` still passes if the served UI is touched.
- Prompt and gap handoff docs are updated and `docs/PLAN_M59.md` is created.

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

- Pending. M58 implementation must create `docs/PLAN_M59.md` before final response.

Residual risk:

- Pending.
