# M83 Plan: Recursive Gap Implementation Runner

## Summary

M83 is staged as the next recursive one-slice implementation milestone after M82. Use `docs/recursive-gap-codex-prompt.md` to select exactly one unblocked local slice, validate it, update the gap/status docs, and stage the next milestone.

Status: completed.
Created: 2026-05-30.
Depends on: `docs/gap-implementation-path.md`, `docs/recursive-gap-codex-prompt.md`, and the current open gaps in `docs/implementation-gaps.md`.

## Selected Gap Slice

M83 selects a public signup/auth hardening slice for GAP-046: expose and test the existing local email-verification token lifecycle through the API and served web runtime.

Why this is unblocked:

- The domain and persistence foundations already exist: local registration creates hashed `EmailVerificationToken` records in memory and Prisma modes, and `LocalAuthService.verifyEmail` already consumes a plaintext token without returning stored secrets.
- A local API/web verification path can be implemented without choosing open registration versus invite-only registration.
- This slice does not require a real email delivery provider, product/legal approval, external targets, live OIDC providers, provider writes, or changes to Romania legal copy.

## Expected Files

- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/auth/services.ts`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/api/src/__tests__/auth-organization-rbac-audit-session.test.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M83.md`
- `docs/PLAN_M84.md`

## Negative Constraints

- Do not require or invent a production email provider.
- Do not expose verification tokens in API registration responses, web HTML snapshots, audit logs, or status docs.
- Do not choose open versus invite-only registration policy.
- Do not block existing local Romania smoke flows on email delivery in this slice.
- Do not mark broad public SaaS signup ready.
- Do not add DNSC submission, certification claims, provider writes, live OIDC, Microsoft Graph, Stripe, object storage/scanner, KMS/HSM/secret-manager, or external-smoke calls.

## Validation Plan

Run from `code/`:

```sh
npm run test -- auth organization rbac audit web
npm run test:e2e -- --grep @ui-smoke
npm run lint
git diff --check
```

Expected gap movement:

- GAP-046 narrows for local email-verification completion routes/UI and secret-free tests.
- GAP-046 remains open for real email delivery, enforcement policy, invite-only policy, owner-managed invites, platform-admin bootstrap, and abuse operations.
- GAP-032, GAP-035, GAP-038, and GAP-044 remain open because no live provider/deployed-auth/external proof is run.

## Actual Implementation

Status: completed 2026-05-30.

Changed files:

- `code/apps/api/src/auth/services.ts`
- `code/apps/api/src/auth/routes.ts`
- `code/apps/api/src/server.ts`
- `code/apps/api/src/__tests__/auth-organization-rbac-audit-session.test.ts`
- `code/apps/web/src/server.ts`
- `code/apps/web/src/operational-console.ts`
- `code/apps/web/src/index.ts`
- `code/apps/web/src/__tests__/web-dashboard-reports-ui.test.ts`
- `docs/implementation-gaps.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M83.md`
- `docs/PLAN_M84.md`

Implemented behavior:

- Added an injectable `EmailVerificationDelivery` port with default no-op runtime delivery and an in-memory test delivery sink.
- Wired registration to send the generated plaintext verification token only to the injected delivery sink, while API responses still omit the token.
- Added API `POST /auth/email/verify` backed by the existing hashed-token `LocalAuthService.verifyEmail` lifecycle.
- Added served web `GET /verify-email` and `POST /auth/email/verify`; web registration now redirects to `/verify-email` after automatic login.
- Added focused tests proving local delivery injection, one-time token use, `email_verified` audit output, `emailVerifiedAt` visibility after login, verification-screen rendering, and token redaction from responses/audit logs.

## Validation Results

Commands run from `code/`:

```txt
npm run test -- auth organization rbac audit web
initial sandbox run failed with listen EPERM before API server tests could bind localhost

npm run test -- auth organization rbac audit web
passed outside the sandbox, 17 files / 81 tests

npm run lint
passed; schema drift check covered 34 models / 492 fields, regulatory drift check covered 3 artifacts

npm run test:e2e -- --grep @ui-smoke
initial sandbox run failed with listen EPERM before checks ran

npm run test:e2e -- --grep @ui-smoke
passed outside the sandbox; served UI smoke preserved no-live-call guarantees

git diff --check
passed
```

## Acceptance Status

Accepted for this local auth-hardening slice.

No real email provider, verified-email enforcement gate, invite-only policy, owner-managed invitations, platform-admin bootstrap, external call, DNSC submission, provider write path, legal activation, or certification claim was added.

## Gap Movement

- GAP-046 narrowed for local email-verification API/web completion and token-redaction tests.
- GAP-046 remains open for real email delivery, enforcement policy, invite-only registration, invitations, platform-admin operations, and abuse controls.
- GAP-032, GAP-035, GAP-038, and GAP-044 remain open.

## Residual Risk

The verification lifecycle is now reachable and tested, but broad public signup is still not launch-ready because production email delivery, policy-gated enforcement, invitation flows, admin recovery, and abuse operations remain unresolved.

## Next Staged Milestone

`docs/PLAN_M84.md` is staged as the next recursive gap implementation runner.
