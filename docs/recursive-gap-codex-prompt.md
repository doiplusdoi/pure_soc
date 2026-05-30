# Recursive Gap Implementation Codex Prompt

Use this prompt when you want Codex to implement the next PureSOC gap slice one by one, then restage the next slice the way the project template does.

```txt
You are Codex working in /Users/solo/SoloCode/pure_soc.

Goal:
Implement exactly one unblocked, high-value PureSOC gap slice from the current gap register, validate it, update the project docs, and stage the next recursive implementation prompt. Repeat this pattern one milestone at a time; do not try to finish all gaps in one run.

Read first, in this order:

1. docs/puresoc_vision.md
2. docs/master-plan.md
3. docs/implementation-gaps.md
4. docs/codex-prompts.md
5. docs/LEARNINGS.md
6. docs/gap-implementation-path.md
7. docs/codex_status.md
8. The latest docs/PLAN_M*.md file
9. code/README.md
10. code/package.json

Selection rules:

1. Build a short candidate list from docs/gap-implementation-path.md and docs/implementation-gaps.md.
2. Pick exactly one slice that can be completed with local code/docs/tests in this run.
3. Prefer slices that narrow an open gap without requiring product/legal approval, customer data, production targets, live provider credentials, or more than one external target.
4. If the highest-priority item is blocked by a missing product/legal/operator decision, record the blocker and move to the next unblocked local implementation slice.
5. If no local implementation slice is safe, perform blocker-only documentation updates and stop.

Default priority order:

1. Preserve or improve the known-good local Romania readiness workflow without legal activation.
2. Narrow public signup/auth hardening work that does not require an unresolved product policy decision.
3. Narrow selected drift/data-quality coverage for customer-facing or production-backed surfaces.
4. Improve evidence/report/export runtime behavior using local or fake adapters only.
5. Improve queue/runtime operations using local/disposable adapters only.
6. Expand Microsoft read-only fixture-backed modules only after checking official Microsoft docs; do not add write scopes.
7. Improve frontend workflow coverage without weakening the existing UI/browser smoke artifacts.
8. Only run an external smoke if exactly one approved disposable/test target is selected by the existing readiness selector and the user/operator explicitly supplied the required safe target configuration.

Recursive milestone workflow:

1. Determine the next milestone number from the latest docs/PLAN_M*.md.
2. Create or update the current docs/PLAN_Mx.md before implementation with:
   - selected gap slice,
   - why it is unblocked,
   - expected files,
   - negative constraints,
   - validation plan,
   - expected gap movement.
3. Implement the smallest vertical slice that makes the selected gap meaningfully better.
4. Add or update focused tests before broad tests where practical.
5. Run the targeted acceptance commands for the slice plus git diff --check.
6. Update the same docs/PLAN_Mx.md with:
   - actual changed files,
   - commands run and results,
   - acceptance status,
   - gaps updated,
   - residual risk,
   - deferred work.
7. Update docs/implementation-gaps.md. Do not delete gaps; narrow or resolve them with dates and evidence.
8. Update docs/codex_status.md if the product/runtime status changed.
9. Update docs/LEARNINGS.md only for durable lessons future agents need.
10. Update docs/codex-prompts.md by retiring the completed prompt and staging the next recursive prompt.
11. Create the next docs/PLAN_M{x+1}.md stub containing the next recommended recursive slice or the generic recursive runner if the next slice is still unknown.

Hard negative constraints:

- Do not mark Romania legal logic active unless product/legal supplies exact approval and text.
- Do not add approved Romanian legal/regulatory copy unless product/legal supplies the exact approved wording.
- Do not add direct DNSC or national-authority submission.
- Do not claim certified, guaranteed, or legally approved compliance.
- Do not add Microsoft/provider write scopes or write remediation execution.
- Do not run live Microsoft Graph, Stripe, OIDC provider, object-storage/scanner, KMS/HSM/secret-manager, deployed-auth, or provider-token smoke unless the selected slice is explicitly an approved disposable/test external proof target and the existing guardrails pass.
- Do not select more than one external proof target.
- Do not expose workbook sheet/cell/range/source-map/debug internals in the normal customer UI.
- Do not move app code, tests, Compose files, runtime config, or regulatory data out of code/.

Useful local acceptance commands from code/:

General:

  npm run lint
  npm run test
  docker compose -f infra/compose/docker-compose.yml config
  git diff --check

Romania/product-safe UI:

  npm run drift:regulatory
  npm run test -- ro regulatory-import web notification dashboards reports
  npm run test:e2e -- --grep @ui-smoke

Auth/org/RBAC:

  npm run test -- auth organization rbac audit web
  npm run test:e2e -- --grep @ui-smoke

Evidence/reports:

  npm run test -- evidence reports dashboards

Provider/Microsoft read-only:

  npm run test -- provider microsoft365 compliance

Jobs/runtime:

  npm run test -- jobs worker scheduler connector-runner

External proof selector, only when explicitly approved:

  npm run external-smoke:readiness
  npm run external-smoke:select-target

Final response must include:

- Selected gap slice and why it was safe to implement now.
- Files changed.
- Commands run and results.
- Whether any external call was made.
- Gaps narrowed or resolved.
- The next staged prompt/PLAN file.
- Residual blockers.
```
