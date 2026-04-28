---
name: puresoc-oidc-social-login
description: Use when implementing or reviewing PureSOC local auth, Microsoft/Google/GitHub sign-in, OIDC/OAuth callbacks, account linking, session creation, identity provider abstraction, auth audit events, or social login tests.
---

# PureSOC OIDC And Social Login

Use this skill for sign-in integrations. Do not confuse sign-in providers with cloud provider connectors.

## Required Reading

Read:

- `docs/puresoc_vision.md` sections 6, 21, 22, 27, 28
- `docs/master-plan.md` sections 11, 14, 15
- `docs/implementation-gaps.md`

## Boundaries

- Local account auth is product identity.
- Microsoft/Google/GitHub sign-in is user authentication.
- Microsoft 365 admin consent is provider connection onboarding.
- Keep those three flows separate in code, tables, logs, and UI copy.

## Implementation Rules

- Validate `state` on every callback.
- Use nonce for OIDC ID token flows.
- Use PKCE where appropriate.
- Verify issuer, audience, expiry, signature, and email verification claims where available.
- Do not trust email alone for account linking without explicit policy.
- Store provider subject identifiers.
- Create audit events for login, failed login, account link, unlink, session creation, and logout.
- Redact OAuth codes, access tokens, ID tokens, refresh tokens, and cookies.

## Required Tests

- Callback state mismatch rejection.
- Invalid issuer/audience rejection.
- Expired token rejection.
- Account linking conflict.
- Session creation.
- Logout invalidation.
- Audit event creation.
- Cross-organization access remains unchanged by identity provider choice.

## Completion Checklist

- Auth provider abstraction does not leak into provider connector abstraction.
- Local login still works when OIDC providers are disabled.
- `AUTH_MODE` and provider enablement flags are respected.
- Deferred provider-specific setup is captured in `docs/implementation-gaps.md`.
