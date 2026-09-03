# PureSOC Power-User Demo Guide

This is the shortest safe path for giving a potential partner a real PureSOC account on the deployed application. It deliberately avoids public signup work and does not require a platform-admin UI.

## The Demo Mental Model

```text
Partner account
  -> partner portfolio
  -> customer grant
  -> reason-gated customer session
  -> declared onboarding data
  -> immutable report v1
  -> read-only Microsoft 365 evidence
  -> gap analysis and deterministic recommendations
  -> immutable report v2
  -> evidence, audit, portfolio opportunity
  -> exit customer session
```

The important product distinction is between the partner and the customer tenant. A partner membership does not make the user an ordinary member of every customer workspace. Customer access requires an explicit grant and a short-lived tenant session, and the UI must show the active customer banner while that session is open.

## 1. Prepare the Populated Romanian Portfolio

Set the deployed web default to Romanian and restart the web service:

```sh
PURESOC_WEB_DEFAULT_LOCALE=ro-RO
```

Seed the synthetic Asterion portfolio once, before creating the prospect login:

```sh
docker compose exec puresoc-api pnpm demo:seed
```

This creates three visibly different customer situations: a Romanian pharmaceutical manufacturer, a German food distributor, and a Polish managed-service provider. The portfolio includes stored onboarding, reports, Microsoft fixture state, gaps, and partner opportunities. It does not contact a live provider or perform provider writes.

Do not run `demo:seed` again after attaching the prospect account. Resetting the deterministic Asterion portfolio also removes its current memberships; seed first, then provision.

## 2. Provision One Controlled Prospect Account

Run the command inside the deployed `puresoc-api` container. For a Compose host, run from `code/`:

```sh
docker compose exec puresoc-api pnpm operator:provision-partner -- \
  --email partner@example.com \
  --display-name "Partner Owner" \
  --existing-partner-slug asterion-cloud-partners \
  --disable-seeded-logins
```

The command prompts twice for a hidden password. It creates:

- one verified local user;
- one active `owner` membership on the populated Asterion partner portfolio;
- an audit record for controlled operator provisioning;
- disabled known shared Asterion seed logins, so only the prospect's unique credential is handed off.

The password is never accepted as a command-line argument and is not printed in the result. For a non-interactive deployment runner, mount a secret file inside the API container and add:

```sh
--password-file /run/secrets/puresoc_demo_partner_password
```

For a future empty portfolio instead, use `--partner-name "Partner Company"` and omit `--existing-partner-slug` and `--disable-seeded-logins`. Do not use the deterministic `demo:seed` credentials for a real partner. Do not add the partner as an ordinary member of customer organizations.

## 3. Verify the Handoff Before Sharing It

Use the current deployed HTTPS URL:

```sh
curl -fsS <PURESOC_DEMO_URL>/health
curl -fsS -o /dev/null -w '%{http_code}\n' <PURESOC_DEMO_URL>/login
```

Expected results:

- `/health` succeeds through the public HTTPS proxy;
- `/login` returns `200`;
- the account signs in and lands on `/partners`;
- the Romanian portfolio command center shows MedicaNova, NordFrucht, and SecureOps Polska;
- opening a customer requires a reason and shows the sticky active-customer banner;
- provider writes remain disabled.

If the demo uses live Microsoft 365 rather than fixtures, verify that the deployment supplies both a stable `PURESOC_PROVIDER_TOKEN_KEY_ID` and the secret-managed `PURESOC_PROVIDER_TOKEN_KEY`. Do not paste either the key or live tenant identifiers into the validation document.

Share the login URL, email address, and password through private channels. Prefer different channels for the password and the login details.

## 4. The 20-Minute Romanian Power-User Walkthrough

### A. Portfolio and tenant boundaries

1. Sign in. The unique partner account lands on the Romanian `/partners` command center.
2. Use the priority list to explain incomplete assessments, Microsoft coverage, and high-priority gaps across the portfolio.
3. Open **MedicaNova SRL** with the reason `Analiză de pregătire NIS2 cu aprobarea clientului`.
4. Confirm the sticky banner names the customer and partner, shows the reason and expiry, and explains that access is audited rather than impersonated.
5. Use the banner shortcuts to move between the dashboard, onboarding, Microsoft 365, and reports. Use the `RO / EN` switch only if the audience asks for English.

What this proves: multitenancy is grant-based, partner activity keeps the real actor identity, and customer context is explicit.

### B. Declared readiness and report v1

1. Open **Pregătire**.
2. Complete the company, contacts, business profile, NIS2 scope, dependencies, and governance answers.
3. Run the preliminary classification.
4. Run the gap analyzer.
5. Generate the first PDF report.

What this proves: report v1 is an immutable snapshot of customer-declared information. It is internal readiness support, not a legal opinion or certification.

### C. Microsoft 365 evidence and report v2

1. Open **Conectori**, then **Microsoft 365**.
2. Confirm the screen says read-only and identifies the effective connector mode.
3. If using a real authorized test tenant, complete admin consent and run a sync. If using fixture mode, say so explicitly during the demo.
4. Review each module separately. A degraded module means a missing permission, license, or supported signal; it does not invalidate the whole sync.
5. Re-run analysis and generate the improved report.

What this proves: report v2 does not overwrite report v1. It adds stored provider observations, declared-versus-observed contradictions, readiness changes, evidence-confidence changes, and deterministic recommendations.

### D. Evidence, actions, and opportunity state

1. Open **Dovezi** and attach a small text artifact to a gap.
2. Open **Remediere** and review the safe local workflow. Do not claim that PureSOC changed Microsoft settings.
3. Open **Rapoarte** and compare the first and improved artifacts.
4. Return to the partner portfolio and show the customer readiness, Microsoft state, high-priority gaps, and opportunity signal.
5. Exit the customer session and confirm the active customer context is cleared.

What this proves: the product turns declared and observed evidence into repeatable work while keeping provider writes and customer boundaries controlled.

## 5. How to Read the Product Like a Power User

| Surface | Question it answers | Source of truth |
|---|---|---|
| Partner portfolio | Which customers need attention? | Tenant-owned analysis, provider state, explicit grants |
| Readiness onboarding | What did the customer declare? | Saved organization-scoped answers and country-pack data |
| Gap analyzer | What is missing or unsupported? | Compliance controls, manual answers, evidence, provider findings |
| Microsoft 365 | What was observed in the connected tenant? | Stored read-only connection, modules, and normalized resources |
| Evidence | What supports a claim? | Organization-scoped artifacts and access logs |
| Reports | What was true at a point in time? | Immutable report snapshots and hashes |
| Remediation | What work is proposed or approved? | Local action lifecycle; provider execution remains gated |
| Audit | Who did what, in which customer context? | Real actor, partner session context, tamper-evident database chain |

When a number looks surprising, trace it in this order: onboarding answer, provider module status, gap/control result, evidence link, report snapshot. Do not treat the dashboard score as a legal compliance score.

## 6. Demo Language

Use:

- internal readiness;
- evidence-backed posture;
- preliminary classification;
- read-only Microsoft 365 signal;
- degraded module;
- recommended next action;
- partner opportunity.

Avoid:

- certified compliant;
- guaranteed compliant;
- legal approval;
- DNSC submission completed;
- Microsoft setting automatically fixed;
- Microsoft license ordered or priced.

## 7. Known Boundaries

- Public signup is not launch-ready. Keep the demo URL access-controlled or block `/register` at the hosting layer.
- There is no production platform-admin account console yet. The operator command is the controlled demo path.
- There is no forced password change on first login. Use a unique high-entropy password and a private delivery process.
- Real Microsoft consent requires an approved PureSOC multitenant Entra app and an authorized test or customer tenant.
- Live Microsoft credential storage requires an explicit, stable provider-token key ID; key material without version metadata is rejected at startup.
- Romania, Poland, and Germany country outputs remain legal-review gated.
- Provider write execution, regulator submission, and legal certification remain unavailable.
