# ADR-013: Auth, OIDC Social Login, And Managed-Provider Consent Boundaries

Status: accepted
Date: 2026-04-28

## Context

PureSOC supports local email/password login, Microsoft Entra ID, Google, GitHub, and optional Keycloak broker behavior. It also connects customer Microsoft 365 tenants through admin consent. These are different security domains and must not be conflated.

## Decision

Use an app-level auth abstraction with separate identity-provider and managed-provider boundaries.

- Internal users are represented by PureSOC `users`.
- Login identities are represented by `identity_accounts` with provider keys such as `local`, `microsoft_entra`, `google`, `github`, and `keycloak_broker`.
- Local credentials are stored separately with Argon2id hashes, verification state, reset-token metadata, failure counters, and lockout metadata.
- A user may link multiple login identities, but account linking cannot trust email alone.
- Keycloak may be used as a Docker auth broker, but PureSOC must not be architecturally hardcoded to Keycloak.
- Microsoft Entra sign-in is an authentication provider. Microsoft 365 admin consent is a managed provider connection flow under provider-connections and must store tenant consent, provider credentials, permission bundles, and module capabilities separately.
- OIDC/social-login callbacks must not log OAuth codes, tokens, cookies, or provider secrets.

## Consequences

- A user can sign in with Google or GitHub and still manage a Microsoft 365 tenant.
- The app can support local auth and external identities without binding all auth behavior to Keycloak.
- Provider tokens and customer tenant consent are protected by connector credential rules, not identity-account shortcuts.
- Future OIDC implementation work must update tests for state validation, token redaction, session creation, account linking, and managed-provider separation.
