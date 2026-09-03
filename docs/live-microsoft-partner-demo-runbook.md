# Live Microsoft Partner Demo Runbook

This runbook prepares the existing PureSOC Compose deployment for a controlled Microsoft partner demo using a live Microsoft 365 tenant. It does not turn the product into a public launch posture or a legal certification workflow.

## Demo Goal

- Partner: Smartlytics.
- Customer/company tenant: Contoso.
- Demo URL: `<PURESOC_DEMO_URL>` supplied by the operator as an HTTPS URL.
- Microsoft redirect URI registered in the PureSOC-controlled multitenant Entra app:
  `<PURESOC_DEMO_URL>/providers/microsoft365/callback`

The Microsoft 365 connector consent is separate from Microsoft Entra user sign-in. Keep social login disabled unless it has its own approved live-provider setup and smoke evidence.

## Deployment Contract

Use the repository Docker Compose catalog under `code/`.

Required public shape:

- Expose `puresoc-web` through the hosting HTTPS proxy.
- Keep `puresoc-api`, Postgres, Redis, object storage, scanner, worker, scheduler, and connector-runner on the private Compose network.
- Configure the HTTPS proxy to forward either `Forwarded: proto=https;host=<public-host>` or both `Host` and `X-Forwarded-Proto: https`. `X-Forwarded-Host` is also accepted when the proxy rewrites `Host`.
- Confirm `curl -fsS <PURESOC_DEMO_URL>/health` returns the web health payload through HTTPS before starting the GUI demo.

Required live connector environment, managed outside git:

```sh
PURESOC_CONNECTOR_MICROSOFT365_MODE=live
PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID=<secret-managed>
PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET=<secret-managed>
PURESOC_PROVIDER_TOKEN_KEY_ID=live-current
PURESOC_PROVIDER_TOKEN_KEY=<secret-managed>
PURESOC_CONNECTOR_MICROSOFT365_WRITE_SCOPES_ALLOWED=false
PURESOC_CONNECTOR_RUNNER_ALLOW_PROVIDER_WRITES=false
```

Do not print, screenshot, commit, or paste client secrets, provider token keys, tenant IDs, raw Graph payloads, tokens, endpoint URLs containing tenant identifiers, or live user emails into git or public notes.

## Microsoft Entra App

Use a PureSOC-controlled multitenant Microsoft Entra app registration for the connector flow.

Configure only Microsoft Graph application permissions for the baseline first-connection bundle:

- `m365_read_baseline`

Add `m365_security_read` or `m365_intune_read` only through a separate reviewed expansion after baseline consent works. Microsoft displays every app-registration permission for `https://graph.microsoft.com/.default`, so optional bundles must not be left on the app registration during baseline onboarding.

Do not request `m365_remediation_write`, `m365_defender_write`, Microsoft Graph write permissions, delegated Graph scopes for the connector, or provider write actions. The consent flow uses Microsoft identity platform v2 admin consent and Graph `https://graph.microsoft.com/.default`.

Missing permissions, missing licenses, unsupported APIs, throttling, or revoked consent must show as module status/degraded state. They are not demo failures unless the entire connector cannot start or store the connection.

## Access Posture

If real email delivery is not configured, use one of these controlled postures:

- Pre-create a controlled partner-owner account with the operator command below and avoid broad public signup.
- Restrict the deployed URL at the hosting layer to the meeting participants.

Do not present open self-service registration as a launch-ready public signup posture until the email/invite/abuse controls in the gap register are closed.

Run inside the deployed API container:

```sh
pnpm operator:provision-partner -- \
  --email partner@example.com \
  --display-name "Partner Owner" \
  --partner-name "Partner Company"
```

The command prompts for a hidden password and returns no password. It creates a verified local account plus an active partner `owner` membership. See `docs/demo/POWER_USER_DEMO_GUIDE.md` for the full product-logic walkthrough.

## Preflight Commands

Run from `code/` unless noted.

```sh
npm run lint
npm test -- partner-tenant-access nis2-onboarding microsoft365 evidence-reports-dashboards-exports product
npm run compose:config
pnpm provider-token:smoke
docker compose config
docker compose up --build -d
docker compose ps
curl -fsS <PURESOC_DEMO_URL>/health
```

Run selector-first Microsoft live smoke with a private env file shaped like `docs/microsoft365-read-only-smoke.env.example`:

```sh
pnpm external-smoke:readiness
pnpm external-smoke:select-target
```

Run this only when the selector returns `ready_path_selected`, `selectedPathId` is `microsoft365_read_only_tenant`, and the target is disposable/test or explicitly authorized:

```sh
pnpm microsoft365:smoke:read-only
```

Save sanitized smoke output in a private evidence location outside git.

## Manual Demo Flow

1. Open `<PURESOC_DEMO_URL>`.
2. Sign in with the controlled partner account. A partner-only account should land on `/partners`.
3. Confirm the Smartlytics partner record and owner role in the partner console.
4. Create or select Contoso as the customer company.
5. Enter Contoso with a clear reason in the tenant access session prompt.
6. Complete NIS2 onboarding for Contoso.
7. Generate the initial report v1 from declared onboarding data.
8. Open `/connectors/microsoft365`.
9. Start Microsoft 365 connection and complete real Microsoft admin consent.
10. Run the read-only Microsoft sync.
11. Confirm module statuses are visible, including any degraded modules.
12. Generate report v2 from stored Microsoft resources.
13. Confirm Microsoft/NIS2 recommendations show opportunity logic without saying "certified compliant", "guaranteed compliant", or legal certification.
14. Open the partner portfolio and confirm Contoso readiness, Microsoft connection state, and opportunity state.
15. Exit the Contoso tenant access session.
16. Confirm audit evidence exists for partner tenant access, connector consent/sync, and report generation. The current product facade exposes `/api/audit` for audit checkpoint summary; detailed operational audit records may still require the existing operational console or database-backed admin review.

## Meeting Language

Use "internal readiness", "evidence-backed posture", "read-only Microsoft 365 signal", "opportunity", and "degraded module" language. Avoid legal/security overclaims, national authority submission claims, Partner Center ordering/pricing/margin claims, and any statement that PureSOC has certified the customer compliant.

## Known Blockers Before Calling This Ready

- A concrete `<PURESOC_DEMO_URL>` must be deployed and health-checked through HTTPS.
- The hosting proxy must be verified to forward public host/proto headers so the Microsoft callback URL derives as HTTPS.
- A controlled demo account or hosting-layer restriction must be in place if email delivery is not configured.
- A real Microsoft connector client ID/secret, provider token key, and authorized tenant must be supplied privately.
- A stable `PURESOC_PROVIDER_TOKEN_KEY_ID` must be supplied with the provider-token key; startup intentionally rejects key material without explicit version metadata.
- The Microsoft live smoke must be selector-ready before running live Graph calls.
- Product/legal review remains required before using legal copy or country-pack outputs as external compliance guidance.
