# M71 Plan: Romania Import Report Drift Posture

## Summary

Decide and encode whether the generated Romania workbook import report is lint-gated drift output or an explicitly diagnostic artifact.

Status: staged.
Created: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/prompt-tests.md`
- `docs/PLAN_M70.md`
- `docs/threat-model.md`
- `code/scripts/check-generated-regulatory-drift.ts`
- `code/apps/regulatory-importer/src/ro`
- `code/data/regulatory/countries/ro/ro-nis2-import-report.generated.json`
- `code/data/regulatory/countries/ro/ro-nis2.seed.generated.json`
- `code/data/regulatory/countries/ro/ro-nis2-source-map.generated.json`
- `code/tests/drift-checks.spec.ts`
- `code/package.json`
- `code/README.md`

## Goal

Narrow GAP-041 by making the drift posture for `ro-nis2-import-report.generated.json` explicit and deterministic.

## Scope

Expected implementation areas:

- Inspect whether the import report artifact is deterministic enough to compare under `pnpm drift:regulatory`.
- If deterministic, extend generated-data drift checks and tests to include the import report artifact.
- If intentionally diagnostic, document that exclusion and add a focused regression test so docs and code do not claim lint coverage.
- Update GAP-041 and milestone handoff docs with the chosen posture.
- Create `docs/PLAN_M72.md` from the next selected active prompt.

Expected files:

- `code/scripts/check-generated-regulatory-drift.ts`
- `code/tests/drift-checks.spec.ts`
- `code/README.md`
- `docs/PLAN.md`
- `docs/PLAN_M71.md`
- `docs/PLAN_M72.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`

Locked assumptions:

- M71 is a deterministic generated-data drift/documentation slice only.
- Romania generated legal logic remains review-required and is not activated by this work.
- No public URL fetches, live services, migrations, UI changes, or provider writes are expected.

## Negative Constraints

- Do not change workbook-derived legal logic, Romania classifier behavior, country-pack activation status, or source-map semantics.
- Do not fetch public regulatory URLs or treat generated Romania legal logic as active.
- Do not add new migrations, live database access, generated Prisma client changes, runtime repository rewrites, UI changes, or external smoke calls.
- Do not broaden generated-data drift coverage beyond the Romania import report posture decision.
- Do not call live PostgreSQL, Redis, Microsoft Graph, Stripe, OIDC/OAuth providers, object storage, scanners, KMS/HSM/secret-manager/cloud APIs, public regulatory URLs, production/staging/customer deployments, external smoke commands, or provider write executors.
- Do not weaken existing Romania seed/source-map drift checks, generated source maps, legal caveats, review-required activation posture, or no-live-call assertions.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- regulatory drift ro import report
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

If `pnpm` is not available, run host-node/npm equivalents and record the substitution here.

## Expected Gap Movement

- Narrow GAP-041 for the generated Romania import report artifact posture.
- Preserve GAP-006, GAP-031, GAP-042, and GAP-044.

## Acceptance Criteria

- The import report artifact's drift posture is explicit in code and docs.
- `pnpm lint` either checks the artifact or the docs/tests accurately say it is diagnostic-only.
- No legal activation, live services, migrations, external integrations, provider writes, UI rewrites, or legal-copy changes are introduced.
- Prompt and gap handoff docs are updated and `docs/PLAN_M72.md` is created.

## Completion Log

Not started.
