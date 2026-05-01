# M14 Plan: Security Threat Model And Release Hardening

## Summary

Implement Prompt 13 from `docs/codex-prompts.md`: threat model the implemented PureSOC product surfaces, convert high-confidence risks into targeted tests/fixes, and prepare the release-readiness security checklist.

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

## Acceptance Criteria

- Threat model documents assets, trust boundaries, attacker capabilities, abuse paths, and mitigations.
- Tests are added or updated for every fixed high/medium issue.
- Cross-organization isolation checks cover affected surfaces.
- Secret redaction checks cover tokens, passwords, OAuth codes, provider credentials, webhook secrets, and evidence URLs.
- Audit event checks cover sensitive actions.
- Gaps are updated for every unresolved high/medium threat.

## Completion Log

Pending implementation.
