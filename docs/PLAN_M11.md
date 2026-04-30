# M11 Plan: OIDC/Social Login Callback Implementation

## Summary

Implement Prompt 10 from `docs/codex-prompts.md`: add Microsoft Entra, Google, and GitHub user sign-in callback flows through the auth abstraction while preserving the boundary from Microsoft 365 managed-provider admin consent.

## Source Inputs

- `docs/puresoc_vision.md` sections 6, 7, 22, 27, 28, 32
- `docs/master-plan.md` sections 7, 11, 14, 15
- `docs/implementation-gaps.md`
- `docs/codex-prompts.md`
- `docs/LEARNINGS.md`
- `docs/adr/ADR-013-auth-oidc-social-login-and-managed-provider-consent-boundaries.md`
- Skill: `puresoc-oidc-social-login`

## Locked Decisions

- User sign-in OIDC/social login must remain separate from Microsoft 365 tenant admin consent.
- Email alone is not proof of account ownership for account linking.
- Authorization codes, ID tokens, access tokens, refresh tokens, cookies, state, nonce, and PKCE verifier values must not be logged.
- Microsoft user sign-in must not require a Microsoft 365 provider connection.

## Current State

Local auth, sessions, organizations, RBAC, audit, and social-login placeholders exist. GAP-003 records that OIDC callback and account-linking behavior remains deferred by design after the local-auth milestone.

## Scope

In scope:

- State, nonce, and PKCE handling where supported.
- Issuer, audience, expiry, and signature validation.
- Provider-subject identity lookup.
- Explicit account-linking flow for verified email collisions.
- Session creation through the existing session model.
- Audit events for login, failed login, account linked, and account-link rejected.
- Provider-specific config validation.
- Update `docs/codex-prompts.md`, `docs/implementation-gaps.md`, and create `docs/PLAN_M12.md` after completion.

Out of scope:

- Microsoft 365 managed-provider admin consent.
- Trusting email alone for account linking.
- Logging tokens, codes, cookies, state, nonce, or PKCE verifier.
- Requiring a provider connection for user sign-in.

## Expected Files And Ownership

- `docs/PLAN_M11.md`
- `docs/PLAN_M12.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`
- `code/packages/auth/oidc/**`
- `code/packages/auth/core/**`
- `code/apps/api/src/auth/**`
- `code/apps/web/**` auth screens if needed
- `code/packages/database/prisma/schema.prisma` and auth repository files if Prisma is needed
- `code/config/defaults/auth.json`

## AI Validation Plan

Run from `code/`:

```sh
pnpm lint
pnpm test -- --runInBand auth oidc social-login session audit redaction
```

## Acceptance Criteria

- State, nonce, and PKCE validation is covered.
- Invalid issuer, audience, expiry, or signature is rejected.
- Existing provider-subject accounts can sign in.
- Email collision requires explicit account-link approval.
- Session creation and logout behavior still work.
- Login and account-linking audit events are written.
- Secret redaction tests cover tokens and authorization codes.
- GAP-003 is updated with callback/account-linking status.

## Completion Log

Pending implementation.
