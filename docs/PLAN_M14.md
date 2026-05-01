# M14 Plan: Security Threat Model And Release Hardening

## Summary

Implement Prompt 13 from `docs/codex-prompts.md`: threat model the implemented PureSOC product surfaces, convert high-confidence risks into targeted tests/fixes, and prepare the release-readiness security checklist.

Started: 2026-05-01.

## Required Skill

- `security-threat-model`

## Source Inputs

- `docs/puresoc_vision.md` sections 6, 8, 9, 17, 18, 22, 23, 28
- `docs/master-plan.md` sections 7, 9, 11, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/claude_rec.md`

## Scope

Review:

- local auth and sessions
- OIDC callbacks
- provider token storage
- organization scoping
- provider raw payload storage
- evidence uploads/downloads
- upload scanning hook
- report export access
- Stripe webhook validation
- audit log coverage and integrity
- remediation approval and execution model
- regulatory source activation workflow

Expected outputs:

- `docs/PLAN_M14.md`
- `docs/PLAN_M15.md`
- `docs/codex-prompts.md`
- `docs/threat-model.md` or equivalent concise threat model
- targeted code/test fixes for high-confidence issues
- `docs/implementation-gaps.md` updates

## Assumptions

- The current product surfaces are contract/in-memory or adapter-bound implementations, not a production deployment with live PostgreSQL, MinIO, Stripe, Microsoft Graph, or OIDC providers wired end to end.
- The release-readiness pass should prioritize product-code and data-contract issues over host, Kubernetes, CI, or cloud account hardening.
- Security fixes should stay narrowly scoped to high-confidence review findings that can be validated with fast tests.
- Provider write/remediation execution remains disabled; M14 may harden approval/audit metadata but must not add live writes.
- Existing open runtime gaps remain valid unless this milestone adds executable coverage that resolves them.

## Expected File Ownership

- `docs/threat-model.md`: new repo-grounded threat model.
- `docs/implementation-gaps.md`: add or update unresolved high/medium threats and resolved security findings.
- `docs/codex-prompts.md`: retire Prompt 13 after completion and keep the next prompt sequence accurate.
- `docs/PLAN_M14.md`: update this plan with actual implementation and validation results.
- `docs/PLAN_M15.md`: create/update the next prompt stub after codex prompt refresh.
- Code/tests under `code/`: only targeted security fixes discovered during review.

## Negative Constraints

- Do not make legal compliance claims.
- Do not focus on host/infrastructure hardening unless it affects product code or data contracts.
- Do not enable provider write actions as part of review.
- Do not suppress a finding just because it is deferred; track it.

## Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand auth audit encryption rbac evidence reports billing provider remediation regulatory
```

Additional focused tests may be run while iterating on specific fixes.

## Expected Gap Movement

- Add release-readiness gaps for unresolved high/medium threats discovered by the threat model.
- Mark a gap resolved only when this milestone adds executable code/test coverage or a concrete document deliverable that closes it.
- Keep deferred live runtime risks tracked rather than treating contract coverage as production proof.

## Acceptance Criteria

- Threat model documents assets, trust boundaries, attacker capabilities, abuse paths, and mitigations.
- Tests are added or updated for every fixed high/medium issue.
- Cross-organization isolation checks cover affected surfaces.
- Secret redaction checks cover tokens, passwords, OAuth codes, provider credentials, webhook secrets, and evidence URLs.
- Audit event checks cover sensitive actions.
- Gaps are updated for every unresolved high/medium threat.

## Completion Log

Completed: 2026-05-01.

Changed files:

- `docs/threat-model.md`
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/PLAN_M14.md`
- `docs/PLAN_M15.md`
- `code/.env.example`
- `code/config/defaults/auth.json`
- `code/packages/config/src/index.ts`
- `code/packages/config/src/__tests__/config.test.ts`
- `code/packages/audit/src/index.ts`
- `code/apps/api/src/http.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/evidence/service.ts`
- `code/apps/api/src/evidence/routes.ts`
- `code/apps/api/src/regulatory-sources/routes.ts`
- `code/packages/regulatory-sources/src/index.ts`
- `code/packages/recommendations/src/actions.ts`
- `code/apps/api/src/__tests__/auth-organization-rbac-audit-session.test.ts`
- `code/apps/api/src/__tests__/evidence-reports-dashboards-exports.test.ts`
- `code/apps/api/src/__tests__/regulatory-sources-review-task-source-map.test.ts`
- `code/packages/recommendations/src/__tests__/actions.spec.ts`

Implemented:

- Wrote a repo-grounded M14 threat model with assets, trust boundaries, entry points, abuse paths, threat priorities, and focus paths.
- Wired configurable Secure session cookies through `PURESOC_AUTH_COOKIE_SECURE` and legacy `AUTH_COOKIE_SECURE`.
- Removed internal evidence `storageUri` values from evidence API upload/list/download responses and treated `storageUri` as sensitive in audit/response checks.
- Scoped regulatory review task review/reject/activate actions and source-map traceability reads to the route organization.
- Rejected remediation snapshots whose provider connection does not match the action run provider connection.
- Updated M14/M15 prompt handoff docs and gap register.

Validation:

- `pnpm` / `npx` / sandbox `node` were unavailable in this environment, so validation used the host Node runtime through `flatpak-spawn`.
- `npm run lint` passed on the host.
- `npm run test -- auth audit encryption rbac evidence reports billing provider remediation regulatory` passed: 25 files, 96 tests.
- `node scripts/check-layout.mjs && ./node_modules/.bin/tsc -p tsconfig.base.json --noEmit` passed.
- `./node_modules/.bin/vitest run auth audit encryption rbac evidence reports billing provider remediation regulatory` passed: 25 files, 96 tests.
- `./node_modules/.bin/vitest run packages/recommendations/src/__tests__/actions.spec.ts apps/api/src/__tests__/actions-remediation-approval-preflight-evidence-audit.test.ts` passed: 2 files, 8 tests.
- `git diff --check` passed.

Acceptance status:

- Accepted for the M14 contract/release-hardening slice.
- The documented `pnpm lint` and `pnpm test -- --runInBand ...` commands could not be executed literally because `pnpm`, `npx`, and sandbox `node` were unavailable; equivalent lint/typecheck and Vitest commands passed on host Node. Vitest 3.2.4 also rejects `--runInBand` when invoked directly.

Gaps updated:

- Updated GAP-029 for evidence storage URI redaction.
- Updated GAP-030 for remediation snapshot provider-connection integrity.
- Added GAP-034 for missing central request body/evidence upload limits.
- Added GAP-035 for deployed cookie, CORS, SameSite, and browser auth smoke.

Residual risk:

- Live PostgreSQL, MinIO/S3, scanner, Stripe, OIDC, Microsoft Graph, and worker queue smokes remain deferred in existing gaps.
- Request body/upload limits are still open under GAP-034.
- Production browser cookie/CORS validation is still open under GAP-035.
- Product/legal review procedures and score calibration remain open under GAP-006 and GAP-021.
