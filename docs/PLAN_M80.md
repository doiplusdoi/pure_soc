# M80 Plan: Romania Legal/Product Decision Gate And External Proof Handoff

## Summary

M79 completed the local Romania readiness-flow hardening work. The next milestone should not add another workbook/debug UI layer. It should make one explicit product/operator decision and then implement only the bounded work that decision enables.

Status: staged.
Created: 2026-05-30.
Depends on: completed `docs/PLAN_M79.md`.

## Decision Gate

Before implementing, choose exactly one path:

1. Romanian legal/product activation preparation
2. One approved disposable external proof target
3. No implementation; document blockers and keep the local-only path as the current demo/product proof

If no path is selected by a human/operator, do not start live integration work.

## Single Codex Prompt

You are Codex working in `/mnt/solodata/SoloCode/pure_soc`. Continue only after the user/product owner selects one M80 path.

Read first, in order:

1. `docs/puresoc_vision.md`
2. `docs/master-plan.md`
3. `docs/implementation-gaps.md`
4. `docs/codex-prompts.md`
5. `docs/LEARNINGS.md`
6. `docs/codex_status.md`
7. `docs/PLAN_M79.md`
8. `docs/PLAN_M80.md`
9. `code/README.md`
10. relevant runbook for the selected path

## Path A: Romanian Legal/Product Activation Preparation

Prepare review operations without pretending approval exists.

Allowed work:

- Add reviewer-facing/admin-only summaries for Romania generated seed, notification mapping coverage, source provenance, caveat state, and unresolved Romanian copy.
- Improve review checklists and docs around GAP-006 and GAP-042.
- Add tests proving normal customer UI still hides workbook/source-map/cell/range/debug internals.

Negative constraints:

- Do not mark Romania legal logic active.
- Do not add approved Romanian legal/regulatory copy unless product/legal supplies the exact approved text.
- Do not add DNSC submission or certification claims.

## Path B: One Approved Disposable External Proof Target

Use the existing selector-first smoke discipline.

Allowed targets:

- Microsoft 365 read-only disposable/test tenant
- Stripe test-mode disposable account
- Evidence runtime local/test/disposable storage plus scanner plus renderer
- OIDC disposable app callback
- Auth deployment disposable target

Negative constraints:

- Select exactly one target.
- Do not run customer/production/live-key targets.
- Do not enable provider writes.
- Do not print secrets, tokens, endpoint URLs, full emails, payload bodies, storage URIs, or provider payloads.

## Path C: Blocker Documentation Only

If no legal/product reviewer or disposable target is available:

- Update `docs/implementation-gaps.md` with the concrete blocker.
- Update `docs/codex_status.md` and `docs/LEARNINGS.md` if the blocker is durable.
- Do not make product code changes just to look busy.

## Validation

For Path A, run from `code/`:

```sh
npm run lint
npm run test -- ro regulatory-import web notification dashboards reports
npm run test:e2e -- --grep @ui-smoke
docker compose -f infra/compose/docker-compose.yml config
git diff --check
```

For Path B, first run the relevant dry-run selector/readiness command and only then the selected guarded smoke command with explicit disposable/test confirmation.

## Expected Gap Movement

- GAP-006 and GAP-042 narrow only if review operations or approved copy/activation steps are actually implemented.
- GAP-044 narrows only if one approved disposable external target is selected or run.
- GAP-030 remains open unless a future prompt explicitly funds provider-write safety and live write proof.
