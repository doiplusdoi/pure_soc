# PureSOC / SiSoN V1 implementation plan

Status: implementation planning document for Codex.  
Primary goal: build V1 as a Docker-first, multitenant, provider-neutral, EU-ready NIS2 compliance platform, with Microsoft 365 / Office 365 as the first managed provider and Romania as the first complete national country pack.

This file is intentionally specific and implementation-oriented. Codex should use it as the starting blueprint for repository structure, service boundaries, data model, connector design, regulatory seed import, and delivery phases.

---

## 1. Product definition

PureSOC / SiSoN V1 is a multitenant compliance and remediation platform for SMB customers operating in the EU. V1 starts with Microsoft 365 / Office 365 as the first managed cloud provider, but the compliance engine must not be Microsoft-specific. Microsoft is a provider implementation, not the product architecture. Humanity has already suffered enough from compliance tools where every law becomes a pile of vendor-specific `if` statements.

V1 must provide:

1. Multitenant SaaS architecture from day one.
2. Docker-first deployment for SaaS and customer “in-a-box” installs.
3. User sign-in through:
   - local PureSOC account using email/password,
   - Microsoft Entra ID,
   - Google,
   - GitHub.
4. Organization and tenant management.
5. Provider-neutral connector architecture.
6. Microsoft 365 / Office 365 provider connector.
7. Microsoft Entra admin-consent onboarding for customer tenants.
8. Read-only discovery of current Microsoft 365 / Office 365 / Entra configuration.
9. Microsoft Intune connector.
10. Microsoft Defender XDR connector.
11. EU-normalized NIS2 compliance console.
12. Country-pack architecture for all EU Member States from V1.
13. Romania country pack generated from the uploaded official Romanian workbook `nis2ro-tool-v-2-1.xlsx`.
14. Business onboarding forms that collect all data required for EU baseline NIS2 scoping and country-specific national registration/classification flows.
15. Gap analysis against an EU NIS2 control catalog and country-pack overlays.
16. Recommended remediation actions.
17. Admin-approved application of selected Microsoft 365 / Office 365 controls where APIs are safe and licensed.
18. Manual and automated checklist workflows to maintain compliance.
19. Evidence vault, reports, and audit trail.
20. Stripe billing integration through a billing provider abstraction.
21. Google Workspace future connector support through the provider interface, without hardcoding Microsoft in the compliance engine.

V1 must **not** claim legal certification. Use wording such as:

```txt
PureSOC internal readiness
NIS2 readiness assessment
Preliminary classification
Evidence support package
```

Do not use wording such as:

```txt
Certified compliant
Guaranteed NIS2 compliance
Legal compliance approved
```

That kind of marketing fog is how auditors get migraines and developers get subpoenas.

---

## 2. External regulatory source anchors and assumptions

The implementation must separate stable EU NIS2 baseline logic from national implementation differences. NIS2 is an EU directive, but Member States transpose and operationalize it nationally. That means the app must support both:

1. An EU-wide NIS2 baseline.
2. Country-specific overlays for registration, classification, competent authority, incident reporting channel, local forms, deadlines, standards, sanctions, and evidence requirements.

### 2.1 EU baseline sources

Use these as primary implementation anchors:

| Source | URL | Use in product |
|---|---|---|
| European Commission NIS2 policy page | https://digital-strategy.ec.europa.eu/en/policies/nis2-directive | EU-level scope, 18 critical sectors, strategic framing, transposition deadline, management accountability. |
| NIS2 Directive transposition country index | https://digital-strategy.ec.europa.eu/en/policies/nis-transposition | Official EU country pages and current state-of-play links. |
| Directive (EU) 2022/2555 on EUR-Lex | https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng | Legal baseline for NIS2 articles and annexes. |
| Commission Implementing Regulation (EU) 2024/2690 | https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/eng | Technical/methodological requirements for specified digital entities. |
| European Commission page for Implementing Regulation 2024/2690 | https://digital-strategy.ec.europa.eu/en/library/nis2-commission-implementing-regulation-critical-entities-and-networks | Practical source anchor for the implementing regulation and annex downloads. |
| ENISA NIS2 awareness page | https://www.enisa.europa.eu/topics/awareness-and-cyber-hygiene/raising-awareness-campaigns/network-and-information-systems-directive-2-nis2 | Awareness materials, sector/risk/incident framing. |
| ENISA national cybersecurity organisations map | https://www.enisa.europa.eu/topics/national-cyber-security-strategies/ncss-map/national-cyber-security-strategies-interactive-map/national-cybersecurity-organisations | National cybersecurity organisations, competent authorities, SPOCs, CSIRTs. |

### 2.2 Country implementation source anchors

Use European Commission country pages as the first official source for each Member State. These pages give the state of implementation and points of contact, but they may not contain all operational details needed by a SaaS workflow. Therefore, every country pack must support multiple source records.

The country pack source hierarchy is:

1. Official national law or official gazette.
2. National competent authority / CSIRT / NIS2 platform.
3. European Commission NIS2 country page.
4. ENISA national cybersecurity organisation data.
5. Secondary tracker or advisory source, marked as non-authoritative.

The ECSO NIS2 Transposition Tracker is useful for gap research because it highlights country-level differences in scope, registration, incident reporting, standards, competent authorities, and deadlines, but it explicitly says to consult primary sources and national legislation for official business. Store it as `source_type = secondary_tracker`, not as legal truth.

Source:

```txt
https://ecs-org.eu/activities/nis2-directive-transposition-tracker/
```

### 2.3 Regulatory facts to encode in V1

Encode the following as data, not as scattered logic:

1. NIS2 establishes a unified legal framework for 18 critical sectors across the EU.
2. Member States had until 17 October 2024 to transpose NIS2 into national law, with NIS1 repealed from 18 October 2024.
3. Member States define national authorities, reporting channels, registration processes, and supervisory procedures.
4. Commission Implementing Regulation (EU) 2024/2690 creates more detailed technical and methodological requirements for these relevant digital entities:
   - DNS service providers,
   - TLD name registries,
   - cloud computing service providers,
   - data centre service providers,
   - content delivery network providers,
   - managed service providers,
   - managed security service providers,
   - providers of online marketplaces,
   - providers of online search engines,
   - providers of social networking services platforms,
   - trust service providers.
5. Incident reporting has an EU baseline workflow, but national law and competent authority channels vary.
6. Registration/classification mechanics vary by Member State.
7. Standards and implementation frameworks vary by Member State.
8. Some country data will be incomplete or changing. The product must model that state instead of pretending a static hardcoded truth exists. Very innovative: admitting uncertainty in software.

### 2.4 Web-researched EU implementation gaps to design around

The V1 architecture must account for these gaps:

| Gap | Product decision |
|---|---|
| Official EU country pages are useful but not always complete for operational registration workflows. | Country packs must include source freshness, completeness level, and missing-data flags. |
| National laws differ in registration deadlines, incident reporting channels, competent authorities, and local portals. | Do not make one global registration wizard. Use `CountryPack.registrationRules` and `CountryPack.incidentReportingRules`. |
| Some Member States have stricter or different reporting details than the EU baseline. | Incident workflow must support country-specific overrides, not only 24h/72h/1-month defaults. |
| Classification may be binary, NIS2-like essential/important, or nationally expanded. | Classification engine must support generic EU baseline plus country-specific classifier plugins. |
| Some countries reference or mandate specific frameworks/standards, and Romania uses a national cybersecurity framework influenced by international frameworks. | Control catalog must support national overlays and evidence requirements. |
| Transposition status can change after deployment. | Regulatory source monitor and manual review workflow required. |

### 2.5 Legal caveat enforced by UI

Every report must include:

```txt
This assessment is generated by PureSOC/SiSoN based on configured regulatory sources, customer-provided answers, and connected provider telemetry. It is an internal readiness and evidence-support tool, not a legal opinion, certification, or substitute for advice from the relevant national competent authority, legal counsel, auditor, or cybersecurity assessor.
```

---

## 3. Architecture decisions

### 3.1 Core decisions

1. Use a monorepo.
2. Use TypeScript for web, API, worker, scheduler, provider adapters, compliance logic, billing, and shared contracts.
3. Use PostgreSQL as the system of record.
4. Use Redis for queues, locks, and short-lived coordination.
5. Use object storage for evidence, reports, uploaded documents, generated PDFs, country-pack sources, and provider snapshots.
6. Use a Docker-first runtime where every major component runs as a container.
7. Use an auth provider abstraction supporting local accounts plus Microsoft, Google, and GitHub sign-in.
8. Use Keycloak as the default Docker identity broker where appropriate, but do not hardcode the product to Keycloak only.
9. Use Microsoft Graph as the main Microsoft 365 connector.
10. Use provider interfaces so Google Workspace can be added in V2/V3.
11. Use country-pack interfaces so EU Member States can be supported from V1.
12. Use Romania as the first complete country pack, seeded from the uploaded Excel workbook.
13. Use Stripe as the first billing provider through a billing abstraction.
14. Use a two-phase remediation model: `recommend -> validate -> approve -> apply -> verify -> evidence`.
15. Use read-only provider scanning by default. Write actions must be explicitly enabled per provider connection and per action.
16. Regulatory data must be versioned, source-linked, and reviewable.

### 3.2 Recommended technology stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Fast portal implementation, SSR where useful, strong ecosystem. |
| API | NestJS + TypeScript | Modular architecture, dependency injection, clean provider/compliance boundaries. |
| Worker | Node.js + BullMQ | Async scans, imports, evidence, billing sync, remediation jobs. |
| Scheduler | Node.js scheduler service | Periodic provider sync, source monitor, recurring compliance tasks. |
| Auth | App auth abstraction + Keycloak broker option | Supports local accounts, Microsoft, Google, GitHub, and enterprise SSO without tying the whole product to one broker. |
| Database | PostgreSQL | Multitenancy, auditability, RLS option, mature. |
| Queue/cache | Redis | BullMQ queues, locks, short-lived cache. |
| Object storage | MinIO locally, S3/Azure Blob in SaaS | Evidence vault and generated files. |
| Reverse proxy | Traefik | Docker-friendly routing, TLS, service discovery. |
| Observability | OpenTelemetry + Prometheus + Grafana + Loki | Metrics, logs, traces, operational dashboards. |
| Billing | Stripe | Subscriptions, customer portal, webhooks. |
| Microsoft SDK | Microsoft Graph SDK for JS where useful; direct REST where SDK lags | Avoid waiting for wrappers to catch up with reality, a human sport of great historical failure. |
| Database ORM | Prisma | Type-safe schema and migrations. |
| Password hashing | Argon2id preferred, bcrypt acceptable only if Argon2id unavailable | Required for local accounts. |
| PDF generation | Playwright/Puppeteer service or HTML-to-PDF container | Country reports and evidence packages. |

---

## 4. Docker-first deployment model

Every major component must run as its own container.

### 4.1 Required containers

| Container | Purpose | Required in SaaS | Required in in-a-box |
|---|---|---:|---:|
| `puresoc-web` | Next.js web portal | Yes | Yes |
| `puresoc-api` | REST API / backend orchestration | Yes | Yes |
| `puresoc-worker` | Async jobs: scans, evidence, billing sync, remediation, regulatory imports | Yes | Yes |
| `puresoc-scheduler` | Periodic scheduled jobs | Yes | Yes |
| `puresoc-auth-broker` | Keycloak or compatible OIDC broker, optional if using app-native auth only | Optional | Recommended |
| `puresoc-postgres` | Database | Optional if managed Postgres is used | Yes |
| `puresoc-redis` | Queue/cache | Optional if managed Redis is used | Yes |
| `puresoc-minio` | Local object storage | Optional if S3/Azure Blob is used | Yes |
| `puresoc-traefik` | Reverse proxy/TLS | Optional if platform ingress exists | Yes |
| `puresoc-migrator` | One-shot DB migration container | Yes | Yes |
| `puresoc-regulatory-importer` | One-shot/import job for EU and country-pack regulatory seeds | Yes | Yes |
| `puresoc-report-renderer` | PDF/report rendering container | Yes | Yes |
| `puresoc-clamav` | File upload malware scanning | Recommended | Yes |
| `puresoc-prometheus` | Metrics | Recommended | Optional |
| `puresoc-grafana` | Dashboards | Recommended | Optional |
| `puresoc-loki` | Log aggregation | Recommended | Optional |
| `puresoc-ms-ps-bridge` | Optional Exchange/SharePoint/Teams PowerShell bridge for settings not exposed through Graph | Optional | Optional |
| `puresoc-collector-agent` | Future local network/log collector | No for V1 core | Optional preview |

### 4.2 Docker Compose profiles

Create these Compose profiles:

| Profile | Purpose |
|---|---|
| `core` | web, api, worker, scheduler, postgres, redis, minio, auth broker, traefik |
| `dev` | core + mailhog + seed data + mock providers |
| `observability` | prometheus, grafana, loki |
| `security` | clamav, optional vault |
| `microsoft-extra` | optional PowerShell bridge |
| `regulatory` | regulatory importer, seed validation jobs |
| `collector-preview` | local collector for future network/log telemetry |

---

## 5. Repository structure

```txt
puresoc/
  apps/
    web/
    api/
    worker/
    scheduler/
    regulatory-importer/
    report-renderer/
  packages/
    shared/
    config/
    auth/
      core/
      local/
      oidc/
      keycloak/
    providers/
      core/
      microsoft365/
      google-workspace/
        README.md
        stub.ts
    compliance/
      core/
      nis2/
        eu/
        implementing-regulation-2024-2690/
        country-packs/
          core/
          at/
          be/
          bg/
          hr/
          cy/
          cz/
          dk/
          ee/
          fi/
          fr/
          de/
          gr/
          hu/
          ie/
          it/
          lv/
          lt/
          lu/
          mt/
          nl/
          pl/
          pt/
          ro/
          sk/
          si/
          es/
          se/
    billing/
      core/
      stripe/
    evidence/
    audit/
    regulatory-sources/
    reports/
    ui/
  data/
    regulatory/
      eu/
        nis2-core.seed.json
        nis2-article21-controls.seed.json
        nis2-article23-incident-reporting.seed.json
        nis2-annex1-sectors.seed.json
        nis2-annex2-sectors.seed.json
        implementing-regulation-2024-2690.seed.json
      countries/
        member-states.seed.json
        ro/
          nis2ro-tool-v-2-1.xlsx
          ro-nis2.seed.generated.json
          ro-nis2-source-map.generated.json
          README.md
        at/README.md
        be/README.md
        bg/README.md
        hr/README.md
        cy/README.md
        cz/README.md
        dk/README.md
        ee/README.md
        fi/README.md
        fr/README.md
        de/README.md
        gr/README.md
        hu/README.md
        ie/README.md
        it/README.md
        lv/README.md
        lt/README.md
        lu/README.md
        mt/README.md
        nl/README.md
        pl/README.md
        pt/README.md
        sk/README.md
        si/README.md
        es/README.md
        se/README.md
  infra/
    docker/
      Dockerfile.web
      Dockerfile.api
      Dockerfile.worker
      Dockerfile.scheduler
      Dockerfile.regulatory-importer
      Dockerfile.report-renderer
      Dockerfile.keycloak
      Dockerfile.ms-ps-bridge
    compose/
      docker-compose.yml
      docker-compose.dev.yml
      docker-compose.observability.yml
    keycloak/
      realm-export.json
    migrations/
  scripts/
    seed.ts
    import-regulatory-sources.ts
    import-ro-nis2-workbook.ts
    validate-country-packs.ts
    rotate-secrets.ts
    backup.sh
    restore.sh
  docs/
    architecture.md
    auth.md
    provider-contract.md
    microsoft365-permissions.md
    eu-nis2-model.md
    country-pack-contract.md
    compliance-model.md
    billing.md
    runbook.md
  tests/
    unit/
    integration/
    e2e/
```

---

## 6. Auth model

### 6.1 Supported sign-in methods

V1 must allow PureSOC users to sign in with:

1. Local account: email + password.
2. Microsoft Entra ID.
3. Google.
4. GitHub.

Local account means the user can register and authenticate without having a Microsoft, Google, or GitHub identity. The UI label should be:

```txt
Continue with email
```

not:

```txt
Local auth provider 7B experimental chaos button
```

### 6.2 Auth implementation decision

Implement an app-level auth abstraction in `packages/auth/core`.

V1 may use Keycloak as the default Docker auth broker, including Keycloak local username/password accounts, but the product must treat this as an implementation detail. The application model must still store identity accounts and organization membership in PureSOC tables.

Auth provider keys:

```ts
type AuthProviderKey =
  | "local"
  | "microsoft_entra"
  | "google"
  | "github"
  | "keycloak_broker";
```

Implementation rule:

1. UI must support local email/password registration and login.
2. API must expose local account flows even if backed by Keycloak in Docker mode.
3. The application must be able to map all auth providers to one internal `User`.
4. One user may link multiple identity accounts.
5. Auth method must be separate from managed provider connection. A user can sign in with Google and still manage a Microsoft 365 tenant.

### 6.3 Local account security requirements

Local account support requires:

1. Email verification before privileged actions.
2. Password hashing with Argon2id preferred.
3. Configurable password policy.
4. Password reset by signed, hashed, expiring token.
5. Login rate limiting by IP, email, and organization.
6. Account lockout or step-up after repeated failures.
7. Optional TOTP MFA in V1.
8. Session revocation.
9. Audit log for login, failed login, password reset, password changed, MFA enabled, MFA disabled.
10. No plaintext password logging, ever. This includes “debug mode”, because debug mode is where sins go to become incidents.

### 6.4 User identity tables

Create:

```txt
users
organizations
organization_members
roles
role_bindings
identity_accounts
local_credentials
sessions
mfa_factors
password_reset_tokens
email_verification_tokens
```

`identity_accounts` stores external and local login identities:

```txt
id
user_id
provider_key              // local, microsoft_entra, google, github, keycloak_broker
provider_subject          // for local, canonical email or generated local subject
provider_email
display_name
created_at
last_login_at
```

`local_credentials` stores only local credential metadata:

```txt
id
user_id
email
password_hash
password_hash_algorithm
password_updated_at
email_verified_at
failed_login_count
locked_until
created_at
updated_at
```

### 6.5 RBAC roles

Implement these default roles:

| Role | Purpose |
|---|---|
| `owner` | Full organization control. |
| `org_admin` | Manage organization users and provider connections. |
| `compliance_manager` | Manage NIS2 assessments, evidence, plans. |
| `security_operator` | View findings, run scans, prepare remediation. |
| `remediation_approver` | Approve write actions. |
| `auditor` | Read-only access to compliance evidence and reports. |
| `billing_admin` | Manage billing and Stripe portal. |
| `regulatory_admin` | Manage country-pack source review and regulatory seed activation. |

All backend endpoints must enforce organization-scoped authorization. Frontend checks are decorative, like privacy policies nobody reads. Backend checks are the actual lock.

---

## 7. Multitenancy model

### 7.1 Tenant isolation

Each request must resolve:

```txt
authenticated_user_id
active_organization_id
role_bindings
provider_connection_scope
jurisdiction_scope
```

Use `organization_id` on every customer-owned table.

Strongly consider PostgreSQL Row Level Security later, but do not block V1 implementation on it. For V1, enforce org scoping in service-layer queries and add automated tests that fail if unscoped queries are introduced.

### 7.2 Core organization tables

```txt
organizations
  id
  name
  legal_name
  billing_status
  default_locale
  primary_country_code
  headquarters_country_code
  created_at
  updated_at

organization_members
  id
  organization_id
  user_id
  status
  created_at

provider_connections
  id
  organization_id
  provider_key              // microsoft365, google_workspace
  display_name
  external_tenant_id
  external_tenant_name
  status                    // pending, connected, degraded, revoked, failed
  read_enabled
  write_enabled
  last_successful_sync_at
  created_at
  updated_at

provider_credentials
  id
  provider_connection_id
  credential_type           // oauth_token, certificate, service_account, api_key
  encrypted_payload
  expires_at
  rotation_required
  created_at
  updated_at
```

Provider credentials must be encrypted before storage. Never store plaintext refresh tokens, client secrets, certificates, or passwords in application logs.

---

## 8. Provider abstraction

### 8.1 Goal

Microsoft 365 must be implemented as the first provider, but all compliance logic must call the generic provider layer.

Do not let `microsoft` become a word scattered across the compliance engine. It should live mostly under:

```txt
packages/providers/microsoft365/
```

### 8.2 Provider interface

Create a provider contract similar to:

```ts
export interface CloudProviderConnector {
  providerKey: string;

  beginConnection(input: BeginConnectionInput): Promise<ConnectionRedirect>;
  completeConnection(input: CompleteConnectionInput): Promise<ProviderConnectionResult>;

  getTenantProfile(connectionId: string): Promise<TenantProfile>;

  syncInventory(input: SyncInput): Promise<SyncResult>;
  syncSecuritySignals(input: SyncInput): Promise<SyncResult>;
  syncLicensing(input: SyncInput): Promise<SyncResult>;

  evaluateControls(input: ProviderEvaluationInput): Promise<ProviderFinding[]>;

  getRecommendedActions(input: RecommendationInput): Promise<ProviderRecommendation[]>;

  validateAction(input: ValidateActionInput): Promise<ActionValidationResult>;
  applyAction(input: ApplyActionInput): Promise<ActionExecutionResult>;
  verifyAction(input: VerifyActionInput): Promise<ActionVerificationResult>;

  collectEvidence(input: EvidenceCollectionInput): Promise<EvidenceArtifact[]>;
}
```

### 8.3 Provider-neutral domain objects

Use provider-neutral objects:

```txt
CloudTenant
CloudUser
CloudGroup
CloudAdminRole
CloudDevice
CloudApplication
CloudPolicy
CloudSecurityAlert
CloudIncident
CloudAuditEvent
CloudLicense
CloudSecureScore
CloudFinding
CloudRecommendation
CloudAction
```

Each object must include:

```txt
id
organization_id
provider_connection_id
provider_key
external_id
external_resource_type
raw_json
normalized_json
first_seen_at
last_seen_at
```

Keep `raw_json`. Future you will thank past you, which is rare and faintly suspicious.

---

## 9. Microsoft 365 provider V1

### 9.1 Microsoft onboarding model

Use a Microsoft Entra multitenant app registration for the PureSOC SaaS connector.

Microsoft onboarding flow:

1. PureSOC org admin clicks `Connect Microsoft 365`.
2. PureSOC redirects to Microsoft admin-consent flow.
3. Customer Global Administrator or eligible admin grants tenant-wide consent.
4. PureSOC stores:
   - Microsoft tenant ID,
   - tenant display name,
   - consent timestamp,
   - granted permission set,
   - token metadata.
5. PureSOC runs a tenant profile sync.
6. PureSOC detects licenses and enables only supported modules.
7. PureSOC shows a connection health screen.

Important: require Global Admin only for tenant consent where Microsoft requires it. Do not store or ask for Global Admin credentials. Do not rely on a permanent human admin session for background jobs.

### 9.2 Permission strategy

Use permission bundles instead of one giant consent screen.

| Bundle | Purpose | Default |
|---|---|---|
| `m365_read_baseline` | Read tenant profile, users, groups, roles, policies, licenses, audit where available | Required |
| `m365_security_read` | Secure Score, security alerts, Defender XDR read | Optional |
| `m365_intune_read` | Managed devices and Intune configuration read | Optional |
| `m365_remediation_write` | Apply admin-approved changes | Disabled by default |
| `m365_defender_write` | Update incident status/comments/classification | Disabled by default |

Do not request write permissions during first onboarding unless the user explicitly enables remediation.

### 9.3 Initial Microsoft data to read

Implement these read modules first.

#### Tenant and licensing

- Organization profile.
- Verified domains.
- Subscribed SKUs.
- License assignment by user.
- Service plans enabled/disabled.

#### Identity posture

- Users.
- Guest users.
- Groups.
- Directory roles.
- Role assignments.
- Admin users.
- Authentication methods where accessible.
- Conditional Access policies.
- Security defaults status if accessible.
- Enterprise applications.
- App registrations.
- Service principals.
- App credentials/secrets/certificates.
- Sign-in logs where licensed/available.
- Directory audit logs.

#### Microsoft Secure Score

- Current secure score.
- Control scores.
- Recommended actions.
- Historical score if available.

#### Microsoft 365 security and collaboration posture

Implement Graph-first. Where Graph cannot read a setting reliably, mark the signal as:

```txt
source_type = manual | graph | powershell | defender | intune | purview | unsupported
```

Target areas:

- Exchange Online mailbox forwarding and risky inbox rules.
- External forwarding configuration.
- SharePoint / OneDrive external sharing posture.
- Teams external access and guest access posture.
- Audit logging availability.
- Retention / DLP / sensitivity label posture where available.
- Admin roles and risky privileges.
- Stale users and stale guests.
- Legacy authentication indicators from sign-in logs.
- App consent and over-permissioned applications.

#### Intune connector

V1 Intune module:

- Detect whether Intune is licensed.
- Read managed devices.
- Read compliance states.
- Read device configuration profiles where available.
- Read compliance policies.
- Map device compliance to NIS2 asset/access-control controls.

Do not fail the whole Microsoft connector if Intune is not licensed. Mark module status as `unavailable_license`.

#### Defender XDR connector

V1 Defender XDR module:

- Detect connector availability.
- Read incidents.
- Read alerts where available.
- Store incidents as security signals.
- Map open high-severity incidents to compliance monitoring controls.
- Allow read-only incident dashboard in V1.
- Write-back to incidents only if `m365_defender_write` is explicitly enabled.

### 9.4 Microsoft write/remediation model

All write actions must use this lifecycle:

```txt
recommendation_created
user_reviews
preflight_validation
diff_generated
approval_requested
approval_granted
action_queued
pre_state_snapshot_saved
action_applied
post_state_snapshot_saved
verification_run
evidence_artifact_created
action_closed
```

Each action must include:

```txt
id
organization_id
provider_connection_id
control_id
recommendation_id
action_type
risk_level
license_required
permissions_required
preconditions
expected_change
blast_radius
rollback_strategy
manual_fallback
status
approved_by
approved_at
executed_by_service
executed_at
verification_status
```

### 9.5 V1 safe remediation examples

V1 may support these as automated or semi-automated actions only after validation:

| Area | Action mode | Notes |
|---|---|---|
| Conditional Access baseline templates | Guided + optional Graph apply | Prefer report-only first. Gate by license. |
| Block legacy authentication | Guided + optional Graph apply | Must check exclusions and service accounts. |
| MFA coverage report | Read-only + manual checklist | Do not blindly enforce. |
| Admin MFA recommendation | Guided | Strongly recommend phishing-resistant methods for admins. |
| Guest user review task | Manual checklist | Provide export and review workflow. |
| App registration credential expiry review | Manual + guided | Avoid deleting apps automatically. |
| Defender incident triage checklist | Manual | V1 can read, not act by default. |
| Intune compliance gap report | Read-only + guided | Write policies only in later controlled rollout. |
| External sharing review | Manual/guided | APIs vary, avoid risky blanket changes. |
| Audit log export setup | Guided | Depending on license and customer architecture. |

### 9.6 V1 actions that must not be automated by default

Do not automate these in V1:

- Disabling users.
- Removing Global Admin roles.
- Deleting app registrations.
- Deleting enterprise applications.
- Enforcing Conditional Access globally without report-only evaluation.
- Revoking sessions tenant-wide.
- Changing mail flow rules blindly.
- Applying DLP/retention policies without human review.
- Changing security defaults/Conditional Access in a way that can lock out admins.
- Editing Defender incidents unless explicitly enabled.

---

## 10. EU NIS2 regulatory architecture

### 10.1 EU-ready design

The NIS2 console must be normalized around:

1. `Framework`: EU NIS2.
2. `FrameworkVersion`: Directive (EU) 2022/2555.
3. `EURequirement`: EU-wide baseline requirements.
4. `RegulatoryOverlay`: Implementing Regulation (EU) 2024/2690 and future EU-level acts.
5. `Jurisdiction`: EU Member State.
6. `CountryPack`: local implementation package for a Member State.
7. `CountryRequirement`: national implementation requirement.
8. `SourceRecord`: legal or operational source.
9. `CompletenessStatus`: whether the country pack is usable, partial, or needs legal review.

### 10.2 EU Member State seed

Seed all 27 EU Member States in V1:

```txt
AT Austria
BE Belgium
BG Bulgaria
HR Croatia
CY Cyprus
CZ Czechia
DK Denmark
EE Estonia
FI Finland
FR France
DE Germany
GR Greece
HU Hungary
IE Ireland
IT Italy
LV Latvia
LT Lithuania
LU Luxembourg
MT Malta
NL Netherlands
PL Poland
PT Portugal
RO Romania
SK Slovakia
SI Slovenia
ES Spain
SE Sweden
```

Each Member State record must include:

```txt
country_code
country_name
official_languages
currency
commission_country_page_url
national_authority_status
country_pack_status
last_source_reviewed_at
next_review_due_at
```

### 10.3 Country pack completeness levels

```ts
type CountryPackCompleteness =
  | "baseline_only"
  | "official_sources_identified"
  | "registration_rules_partial"
  | "classification_rules_partial"
  | "incident_rules_partial"
  | "full_pack_ready"
  | "requires_legal_review"
  | "deprecated";
```

V1 requirements:

1. All EU countries must exist as country pack records.
2. All countries must support EU baseline NIS2 assessment.
3. Romania must be `full_pack_ready` based on the uploaded workbook and source mapping.
4. Other countries may start as `baseline_only` or `official_sources_identified` but the UI must still work.
5. The dashboard must show country-specific unsupported areas honestly.

### 10.4 Country pack interface

```ts
export interface Nis2CountryPack {
  countryCode: EuCountryCode;
  packVersion: string;
  completeness: CountryPackCompleteness;
  sourceRecords: RegulatorySourceRecord[];

  getApplicableSectors(): SectorCatalog;
  getRegistrationRules(input: BusinessProfile): RegistrationRule[];
  getClassification(input: ClassificationInput): Promise<ClassificationResult>;
  getIncidentReportingRules(input: IncidentContext): IncidentReportingRule[];
  getAuthorities(input: AuthorityLookupInput): NationalAuthority[];
  getEvidenceRequirements(input: EvidenceRequirementInput): EvidenceRequirement[];
  getLocalControlsOverlay(): ComplianceControlOverlay[];
  getUnsupportedFeatures(): UnsupportedCountryFeature[];
}
```

### 10.5 Regulatory source record

```ts
interface RegulatorySourceRecord {
  id: string;
  frameworkKey: "nis2";
  jurisdiction: "EU" | EuCountryCode;
  sourceType:
    | "directive"
    | "regulation"
    | "official_national_law"
    | "official_authority_guidance"
    | "official_registration_portal"
    | "official_commission_country_page"
    | "enisa_reference"
    | "secondary_tracker"
    | "internal_excel_seed";
  title: string;
  url?: string;
  localFilePath?: string;
  publicationDate?: string;
  lastCheckedAt: string;
  versionLabel?: string;
  authorityName?: string;
  trustLevel: "primary" | "secondary" | "internal_seed";
  status: "active" | "draft" | "stale" | "superseded" | "unreachable";
  notes?: string;
}
```

### 10.6 EU baseline NIS2 control groups

Create EU baseline control groups:

```txt
NIS2-EU-GOV       Governance, management accountability, training
NIS2-EU-RISK      Risk analysis and information system security policies
NIS2-EU-INC       Incident handling and reporting
NIS2-EU-BCP       Business continuity, backup, disaster recovery, crisis management
NIS2-EU-SUPPLY    Supply chain security
NIS2-EU-SDLC      Security in acquisition, development, maintenance, vulnerability handling/disclosure
NIS2-EU-ASSESS    Effectiveness assessment and control testing
NIS2-EU-HYGIENE   Basic cyber hygiene and cybersecurity training
NIS2-EU-CRYPTO    Cryptography and encryption
NIS2-EU-IAM       Human resources security, access control, asset management
NIS2-EU-MFA       MFA, continuous authentication, secured voice/video/text, secured emergency communications
NIS2-EU-LOG       Logging, monitoring, alerting
NIS2-EU-DATA      Data protection, retention, DLP, information handling
NIS2-EU-NET       Network and system security
NIS2-EU-DOC       Documentation, evidence, auditability
```

### 10.7 EU Article 21 baseline controls

Map Article 21 risk-management measures into controls. Store the exact source clause in each seeded control.

Minimum Article 21 categories:

1. Risk analysis and information system security policies.
2. Incident handling.
3. Business continuity, backup management, disaster recovery, and crisis management.
4. Supply chain security, including security-related aspects concerning relationships between each entity and its direct suppliers or service providers.
5. Security in network and information systems acquisition, development, and maintenance, including vulnerability handling and disclosure.
6. Policies and procedures to assess the effectiveness of cybersecurity risk-management measures.
7. Basic cyber hygiene practices and cybersecurity training.
8. Policies and procedures regarding cryptography and, where appropriate, encryption.
9. Human resources security, access control policies, and asset management.
10. MFA or continuous authentication solutions, secured voice/video/text communications, and secured emergency communication systems where appropriate.

### 10.8 EU Article 23 baseline incident reporting workflow

Create a generic EU incident workflow with country overrides:

```txt
incident_detected
significance_assessment
country_reporting_route_selected
early_warning_due
incident_notification_due
intermediate_report_if_requested
final_report_due
recipient/customer_notification_if_required
evidence_package_closed
```

EU baseline timing defaults:

```txt
early_warning: without undue delay and in any event within 24 hours of becoming aware
incident_notification: without undue delay and in any event within 72 hours of becoming aware
final_report: no later than one month after the incident notification
intermediate_report: upon request of CSIRT or competent authority
```

Do not hardcode these as universal immutable timers. Store them as defaults that a country pack can override or supplement.

### 10.9 Implementing Regulation 2024/2690 overlay

Create a separate overlay:

```txt
packages/compliance/nis2/implementing-regulation-2024-2690/
```

Apply it when the business profile indicates the entity provides one or more covered digital services:

```txt
dns_service_provider
tld_name_registry
cloud_computing_service_provider
data_centre_service_provider
content_delivery_network_provider
managed_service_provider
managed_security_service_provider
online_marketplace_provider
online_search_engine_provider
social_networking_services_platform_provider
trust_service_provider
```

The overlay must add:

1. More detailed technical and methodological control expectations.
2. Incident significance criteria for covered relevant entities.
3. Additional evidence requirements.
4. Provider mappings to Microsoft 365, Intune, Defender XDR, manual controls, and future Google Workspace where applicable.

### 10.10 Country-pack source monitor

Create a scheduled job:

```txt
regulatory.monitorCountrySources
```

It must:

1. Check configured source URLs for availability and last-modified metadata where possible.
2. Mark sources as `unreachable`, `stale`, or `needs_review`.
3. Never auto-activate new legal logic without human review.
4. Create a `RegulatoryReviewTask` for `regulatory_admin`.
5. Keep immutable history of source changes.

For in-a-box deployments, source monitoring can be disabled:

```txt
REGULATORY_SOURCE_MONITOR_ENABLED=false
```

---

## 11. Romanian NIS2 country pack from uploaded workbook

The uploaded workbook inspected for this plan is:

```txt
nis2ro-tool-v-2-1.xlsx
```

Detected sheets:

```txt
Introduction
User instructions
Entity data
Entity assessment
Notification form
Liste
Ajutor
Algoritm clasificare
```

The workbook implements the Romanian NIS2 applicability, preliminary classification, and notification-form flow for OUG 155/2024, approved/amended through Law 124/2025. Treat this workbook as the seed source for the V1 Romanian country pack.

Do not manually copy workbook logic into React components. Parse it into a versioned regulatory seed so future official workbook updates can be handled cleanly.

### 11.1 Romania country pack metadata

The importer must create a versioned seed:

```txt
framework_key: nis2
jurisdiction: RO
source: nis2ro-tool-v-2-1.xlsx
source_type: internal_excel_seed
source_version_detected_entity_data: V2.1 ENG_45915
source_version_detected_entity_assessment: V2.0_45898
country_pack_status: full_pack_ready_after_validation
```

### 11.2 Data imported from workbook

The importer must extract or encode:

1. Entity identification fields.
2. Entity contact fields.
3. Activity/NACE fields.
4. Cybersecurity responsible person fields.
5. Permanent monitoring contact fields.
6. Network and public IP address fields.
7. EU service presence fields.
8. Representative data for entities outside the EU.
9. Attached document requirements.
10. Entity size assessment fields.
11. Services by sector/subsector.
12. Relationship with Romania questions.
13. Law 294/2024 critical entity question.
14. Article 9 special-circumstance questions.
15. Preliminary assessment result states.
16. Notification form field mapping.
17. Classification algorithm rules.
18. County/district list and Romanian location helpers from `Liste`.
19. Sector/subsector IDs and service/entity type IDs from `Liste`.
20. Romanian advisory text for voluntary registration and cybersecurity framework suggestions, stored as local guidance text with source mapping.

### 11.3 Workbook-derived service sectors

The workbook contains the following NIS2 sector sections:

```txt
SECTORS OF HIGH CRITICALITY
ENERGY
TRANSPORT
BANKING
FINANCIAL MARKET INFRASTRUCTURES
HEALTH
DRINKING WATER
WASTE WATER
DIGITAL INFRASTRUCTURE
ICT SERVICE MANAGEMENT (business-to-business)
PUBLIC ADMINISTRATION
SPACE
OTHER CRITICAL SECTORS
POSTAL AND COURIER SERVICES
WASTE MANAGEMENT
MANUFACTURE, PRODUCTION AND DISTRIBUTION OF CHEMICALS
PRODUCTION, PROCESSING AND DISTRIBUTION OF FOOD
MANUFACTURING
DIGITAL PROVIDERS
RESEARCH
```

The workbook also contains service/entity-type toggles, including but not limited to:

```txt
Electricity undertakings
Distribution system operators
Transmission system operators
Electricity producers
Nominated electricity market operators
Electricity market participants
Operators of a recharging point
Economic operators, concessionaires and the developer of the offshore wind turbine
Operators of district heating or district cooling
Operators of oil transmission pipelines
Operators of oil production, refining and treatment facilities, storage and transmission
Central stockholding entities
Natural gas supply undertakings
Storage system operators
LNG system operators
Operators of hydrogen production, storage and transmission
Air carriers
Airport managing bodies
Traffic management control operators providing ATC services
Aircraft maintenance operators
Civil aviation agents
Infrastructure managers
Railway undertakings
Water transport companies
Port managing bodies
Operators of vessel traffic services
Road authorities
Operators of Intelligent Transport Systems
Public transport service operators
Credit institutions
Operators of trading venues
Central counterparties
Healthcare providers
EU reference laboratories
Medicinal product R&D entities
Basic pharmaceutical product manufacturers
Critical medical device manufacturers
Drinking water entities
Waste water undertakings
Internet Exchange Point providers
TLD name registries
Cloud computing service providers
Data centre service providers
Content delivery network providers
Trust service providers
Qualified trust service providers
Public electronic communications network providers
Publicly available electronic communications service providers
Managed service providers
Managed security service providers
Central government public administration entities
Space ground infrastructure operators
Postal and courier service providers
Waste management undertakings
Chemical manufacture/production/distribution entities
Food businesses
Manufacturers of medical devices and in vitro diagnostic medical devices
Manufacturers of computer/electronic/optical products
Manufacturers of electrical equipment
Manufacturers of machinery and equipment n.e.c.
Manufacturers of motor vehicles, trailers and semi-trailers
Manufacturers of other transport equipment
Online marketplace providers
Online search engine providers
Social networking services platform providers
Research organisations
None of the services listed in OUG No. 155/2024
```

Store these as normalized regulatory options, not as hardcoded frontend labels.

### 11.4 Relationship with Romania questions

Create onboarding questions for:

- `Is the entity established in Romania?`
- `Does the entity have its main office in Romania?`
- `Is your entity a public administration entity established by Romania?`
- `Is/was the entity identified as a critical entity in Romania in accordance with Law No. 294/2024?`
- `Do you provide services in Romania?`
- `Do you provide services in another EU Member State?`

### 11.5 Article 9 questions

Create onboarding questions for:

- `9a. The entity is the sole provider of a service that is essential to supporting critical societal and economic activities.`
- `9b. Disruption of the service provided by the entity could have a significant impact on public safety, public security, or public health.`
- `9c. Disruption to the service provided by the entity could generate significant systemic risk, particularly for sectors where such disruption could have a cross-border impact.`
- `9d. The entity is critical due to its specific importance at national or regional level for the sector or type of services concerned or for other interdependent sectors.`

### 11.6 Classification algorithm

The workbook includes an `Algoritm clasificare` sheet. Convert the logic into a testable classification service.

Initial rule summary from the workbook:

```txt
row 1: prioritate | Anexa 1 | Condiție specială | Mică și micro | Mijlociu | Mare | Important | Esențial
row 2: 0 | Administrație Publică Centrală RO | D160 | Esențial | Esențial | Esențial | 0 | 0
row 3: 1 | 0 | Prestatori calificati | Esențial | Esențial | Esențial | 0
row 4: 2 | 0 | DNS, TLD | Esențial | Esențial | Esențial | 0
row 5: 3 | 0 | Prestatorii necalificati | Important | Important | 0 | Esențial | 0
row 6: 4 | 0 | Telecomunicații | Important | 0 | Esențial | Esențial | 0
row 7: 6 | 0 | MSSP | 0
row 8: 3 | 0 | cloud, data centre, CDN, managed service providers | Art.9 | 0 | Important | 0 | Esențial | 0
row 9: 4 | 0 | energy, transport, banking, financial, health, drinking water, waste water, space, IXP | Art.9 | Important | 0 | Esențial | 0
row 10: Anexa 2
row 11: 7 | 0 | Toate din Anexa 2 | Important | Important | 0
row 12: 8 | 0 | online marketplaces, online search engines, social networking service platforms | 0
```

Implementation requirement:

```txt
packages/compliance/nis2/country-packs/ro/classification.service.ts
packages/compliance/nis2/country-packs/ro/classification.service.spec.ts
```

The classification service must return:

```ts
type Nis2ClassificationResult =
  | "insufficient_data"
  | "out_of_scope"
  | "voluntary_registration_possible"
  | "important_entity"
  | "essential_entity";
```

Also return:

```ts
interface Nis2Classification {
  jurisdiction: "RO";
  result: Nis2ClassificationResult;
  reasons: string[];
  matchedRules: string[];
  missingRequiredFields: string[];
  article9Required: boolean;
  notificationRecommended: boolean;
  sourceVersion: string;
}
```

### 11.7 Romanian onboarding forms

Build the Romanian NIS2 onboarding as a multi-step country-specific form:

1. Organization identity.
2. Entity address/contact.
3. Activity and NACE codes.
4. Entity size.
5. Services by sector/subsector.
6. Relationship with Romania and EU presence.
7. Cybersecurity responsible person.
8. Permanent monitoring contact.
9. Network/system data, including public IP ranges.
10. Article 9 questions if required.
11. Law 294/2024 critical entity question.
12. Attached documents.
13. Legal representative.
14. Preliminary classification.
15. Notification form export.

Save partial progress so the user can complete the onboarding flow across multiple sessions.

### 11.8 Romanian notification output

V1 must generate:

1. A PureSOC internal classification report.
2. A Romanian NIS2 notification-form draft based on workbook fields.
3. Evidence of all answers and timestamps.
4. Export as PDF and JSON.

V1 does not submit directly to DNSC. It prepares the customer’s package and records evidence.

---

## 12. EU business onboarding model

### 12.1 Global onboarding flow

The EU onboarding flow must run before country-specific modules.

Steps:

1. Organization legal identity.
2. Headquarters country.
3. Establishment countries.
4. Countries where services are provided.
5. Main office / principal establishment.
6. Company size: employees, turnover, balance sheet.
7. NACE codes.
8. NIS2 sector and service/entity type selection.
9. Whether the entity provides covered digital services under Implementing Regulation 2024/2690.
10. Public administration status.
11. Critical entity status, if known.
12. Essential service dependency questions.
13. Contact persons: legal, cybersecurity, incident reporting, permanent monitoring.
14. Managed cloud providers: Microsoft 365, future Google Workspace.
15. Evidence upload for size, registration, authority letters, policies, and prior audits.
16. Country-pack activation.

### 12.2 Cross-border handling

If a customer provides services in more than one EU Member State:

1. Create one primary EU assessment.
2. Create one `JurisdictionAssessment` per selected country.
3. Determine whether each country pack has registration/reporting obligations.
4. Allow one provider posture scan to feed multiple country assessments.
5. Show a consolidated gap report plus country-specific obligations.

### 12.3 Data model

```txt
BusinessProfile
  id
  organization_id
  legal_name
  headquarters_country_code
  main_office_country_code
  established_country_codes[]
  service_country_codes[]
  nace_codes[]
  employee_count
  annual_turnover_eur
  balance_sheet_total_eur
  size_category
  created_at
  updated_at

JurisdictionAssessment
  id
  organization_id
  framework_key
  country_code
  country_pack_version
  status
  classification_result
  completeness_score
  last_evaluated_at

BusinessServiceSelection
  id
  organization_id
  framework_key
  sector_code
  subsector_code
  service_type_code
  countries[]
  source
```

---

## 13. NIS2 compliance portal

### 13.1 Portal sections

Create these portal areas:

| Section | Purpose |
|---|---|
| Dashboard | Overall readiness, classification, urgent gaps, provider health, country-pack status. |
| EU NIS2 onboarding | EU baseline business profile and cross-border scoping. |
| Country packs | Country-specific modules, source status, registration/reporting workflow. |
| Romania NIS2 onboarding | Workbook-based applicability and notification flow for Romania. |
| Business profile | Company details, services, NACE codes, locations, contacts. |
| Provider connections | Microsoft 365 connection, module status, permissions, last sync. |
| Gap analysis | NIS2 control status, automated findings, manual answers. |
| Recommendations | Prioritized remediation backlog. |
| Action plan | Tasks, owners, deadlines, approval status. |
| Incident reporting workflow | EU baseline and country-specific reporting preparation. |
| Evidence vault | Documents, snapshots, scan evidence, generated reports. |
| Manual checklists | Recurring compliance processes. |
| Microsoft posture | Entra, M365, Intune, Defender XDR views. |
| Billing | Stripe subscription and billing portal. |
| Audit log | Immutable activity history. |

### 13.2 Compliance status model

Each control should have:

```txt
not_started
not_applicable
manual_required
automated_check_pending
failing
partially_compliant
compliant
accepted_risk
unsupported_country_pack
unsupported_provider
requires_legal_review
```

A control is `compliant` only if required evidence exists and the latest evaluation is passing.

### 13.3 Compliance score

Use separate scores:

| Score | Meaning |
|---|---|
| `eu_applicability_score` | Completeness of EU baseline onboarding. |
| `country_pack_completeness_score` | Completeness of local jurisdiction-specific data and source review. |
| `technical_posture_score` | M365/Intune/Defender findings mapped to technical controls. |
| `process_compliance_score` | Manual policies, checklists, evidence, governance. |
| `evidence_completeness_score` | Required evidence present and current. |
| `overall_internal_readiness_score` | Weighted internal PureSOC score. |

Do not label this as “legal compliance certified”. Use “PureSOC internal readiness”.

---

## 14. Control catalog

Create a versioned NIS2 control catalog.

### 14.1 Control object

```ts
interface ComplianceControl {
  id: string;
  frameworkKey: "nis2";
  jurisdictionScope: "EU" | "COUNTRY" | "EU_OVERLAY";
  jurisdiction?: "EU" | EuCountryCode;
  code: string;
  title: string;
  description: string;
  controlGroup: string;
  legalReference: LegalReference[];
  applicability: "all" | "essential" | "important" | "conditional" | "digital_relevant_entities";
  implementationType: "technical" | "process" | "hybrid";
  evidenceRequired: EvidenceRequirement[];
  providerMappings: ProviderControlMapping[];
  manualChecklistTemplateIds: string[];
  countryOverrides?: CountryControlOverride[];
  version: string;
}
```

### 14.2 Legal reference object

```ts
interface LegalReference {
  sourceRecordId: string;
  article?: string;
  paragraph?: string;
  annex?: string;
  nationalReference?: string;
  sourceUrl?: string;
  sourceVersion?: string;
}
```

### 14.3 Provider mapping object

```ts
interface ProviderControlMapping {
  providerKey: "microsoft365" | "google_workspace";
  moduleKey:
    | "entra"
    | "m365"
    | "intune"
    | "defender_xdr"
    | "purview"
    | "exchange"
    | "sharepoint"
    | "teams"
    | "google_admin";
  signalKeys: string[];
  recommendationKeys: string[];
  canAutoEvaluate: boolean;
  canAutoRemediate: boolean;
  licenseRequirements: string[];
  permissionRequirements: string[];
}
```

### 14.4 EU-to-provider mapping examples

| EU control area | Microsoft signals | Remediation mode |
|---|---|---|
| Access control and MFA | Entra users, admin roles, auth methods, Conditional Access | Guided + optional apply |
| Asset management | Entra devices, Intune devices, app registrations | Read + checklist |
| Logging and monitoring | Entra audit logs, sign-in logs, Secure Score, Defender XDR incidents | Read + export guidance |
| Incident handling | Defender XDR incidents, manual IR process checklist | Manual + read-only evidence |
| Business continuity | Manual evidence, backup policy upload | Manual |
| Supply chain | App consent, enterprise apps, external vendors checklist | Hybrid |
| Vulnerability handling | Intune compliance, Defender signals where available | Read + checklist |
| Data protection | Purview/DLP/retention where licensed, SharePoint sharing posture | Guided |
| Cryptography | Manual policy evidence, secure communication checklist | Manual |

---

## 15. Gap engine

### 15.1 Inputs

The gap engine uses:

1. EU baseline onboarding answers.
2. Country-pack onboarding answers.
3. Business profile.
4. Provider scan results.
5. Manual questionnaires.
6. Evidence vault.
7. Checklist status.
8. Accepted risk decisions.
9. Subscription entitlements.
10. Country-pack completeness state.

### 15.2 Output

For each control, produce:

```ts
interface ComplianceGap {
  organizationId: string;
  assessmentId: string;
  jurisdiction: "EU" | EuCountryCode;
  controlId: string;
  status: ComplianceStatus;
  severity: "low" | "medium" | "high" | "critical";
  confidence: "low" | "medium" | "high";
  summary: string;
  findings: string[];
  missingEvidence: string[];
  recommendedActions: string[];
  providerSignals: string[];
  manualTasks: string[];
  countryPackWarnings: string[];
}
```

### 15.3 “100% internal readiness plan”

After onboarding, generate an internal readiness plan that can reach `100%` in PureSOC.

The plan must include:

```txt
control_id
jurisdiction
gap_summary
recommended_action
action_type
owner
due_date
automation_available
evidence_required
dependencies
status
legal_review_required
```

The plan must separate:

1. Microsoft-automatable tasks.
2. Microsoft-guided tasks.
3. Manual policy/process tasks.
4. Evidence upload tasks.
5. Country-specific registration/notification tasks.
6. External/legal/auditor tasks.
7. Not-applicable controls.
8. Unsupported or incomplete country-pack tasks.

---

## 16. Checklist and process engine

### 16.1 Manual process templates

Create recurring process templates:

| Template | Frequency |
|---|---|
| Review admin users and privileged roles | Monthly |
| Review guest users | Monthly |
| Review app registrations and secrets | Monthly |
| Review Conditional Access exceptions | Monthly |
| Review Defender incidents | Weekly |
| Review backup status | Monthly |
| Incident response tabletop exercise | Quarterly |
| Supplier security review | Quarterly |
| Employee security awareness confirmation | Quarterly |
| Evidence package review | Quarterly |
| Risk register review | Monthly |
| Business continuity plan review | Semiannual |
| Country registration data review | Quarterly |
| Incident reporting contact validation | Quarterly |
| Country-pack source review | Monthly for regulatory admins |

### 16.2 Checklist states

```txt
template_created
task_generated
assigned
in_progress
blocked
completed
evidence_required
evidence_attached
approved
overdue
requires_legal_review
```

### 16.3 Checklist implementation

Tables:

```txt
checklist_templates
checklist_template_items
checklist_runs
checklist_run_items
checklist_assignments
checklist_evidence
```

---

## 17. Evidence vault

### 17.1 Evidence types

```txt
provider_snapshot
manual_upload
generated_report
signed_document
checklist_completion
action_pre_state
action_post_state
audit_log_export
policy_document
risk_acceptance
regulatory_source_snapshot
country_registration_draft
incident_reporting_draft
```

### 17.2 Evidence metadata

```txt
id
organization_id
control_id
jurisdiction
source_type
source_provider
title
description
storage_uri
content_hash_sha256
mime_type
created_by
created_at
valid_from
valid_until
linked_assessment_id
linked_action_id
linked_source_record_id
```

### 17.3 Evidence security

1. Store files in MinIO locally or cloud object storage in SaaS.
2. Encrypt at rest.
3. Store SHA-256 hashes.
4. Scan uploads with ClamAV.
5. Log every download.
6. Restrict auditor access to read-only evidence.
7. Support evidence expiry and renewal reminders.
8. Support evidence export per jurisdiction.

---

## 18. Billing provider abstraction and Stripe

### 18.1 Billing architecture

Create a generic billing provider interface:

```ts
export interface BillingProvider {
  providerKey: string;
  createCustomer(input: CreateCustomerInput): Promise<BillingCustomer>;
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession>;
  createPortalSession(input: PortalInput): Promise<PortalSession>;
  handleWebhook(input: WebhookInput): Promise<WebhookResult>;
  syncSubscription(input: SyncSubscriptionInput): Promise<SubscriptionState>;
}
```

Implement:

```txt
packages/billing/stripe/
```

### 18.2 Stripe objects to map

```txt
stripe_customer_id
stripe_subscription_id
stripe_price_id
stripe_product_id
subscription_status
current_period_start
current_period_end
cancel_at_period_end
trial_end
```

### 18.3 Entitlements

Create entitlement flags:

```txt
nis2_eu_portal
nis2_country_packs
nis2_ro_full_pack
m365_baseline_scan
m365_remediation
intune_connector
defender_xdr_connector
evidence_vault
manual_checklists
pdf_reports
api_access
soc_preview
regulatory_source_monitor
```

Billing must gate features through entitlements, not through scattered `if plan == "pro"` checks.

### 18.4 Stripe webhooks

Handle at minimum:

```txt
customer.created
customer.updated
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
checkout.session.completed
```

Verify webhook signatures.

For in-a-box deployments, support:

```txt
BILLING_PROVIDER=stripe
BILLING_PROVIDER=none
BILLING_PROVIDER=offline_license
```

---

## 19. API design

### 19.1 Public API groups

```txt
/auth/local
/auth/oidc
/auth/session
/organizations
/organizations/:orgId/members
/provider-connections
/provider-connections/:id/sync
/provider-connections/:id/modules
/compliance/nis2/eu
/compliance/nis2/country-packs
/compliance/nis2/country-packs/:countryCode
/compliance/nis2/ro/onboarding
/compliance/nis2/ro/classification
/compliance/nis2/incident-workflows
/compliance/assessments
/compliance/controls
/compliance/gaps
/recommendations
/actions
/checklists
/evidence
/billing
/regulatory-sources
/audit-log
```

### 19.2 Key endpoints

```txt
POST   /api/auth/local/register
POST   /api/auth/local/login
POST   /api/auth/local/logout
POST   /api/auth/local/verify-email
POST   /api/auth/local/request-password-reset
POST   /api/auth/local/reset-password
POST   /api/auth/local/mfa/totp/enable
POST   /api/auth/local/mfa/totp/verify

POST   /api/provider-connections/microsoft365/begin
GET    /api/provider-connections/microsoft365/callback
GET    /api/provider-connections/:id/status
POST   /api/provider-connections/:id/sync
GET    /api/provider-connections/:id/inventory
GET    /api/provider-connections/:id/findings

GET    /api/compliance/nis2/eu/member-states
POST   /api/compliance/nis2/eu/onboarding/save
GET    /api/compliance/nis2/eu/onboarding
POST   /api/compliance/nis2/eu/classify
GET    /api/compliance/nis2/country-packs
GET    /api/compliance/nis2/country-packs/:countryCode/status
POST   /api/compliance/nis2/country-packs/:countryCode/evaluate

POST   /api/compliance/nis2/ro/onboarding/save
GET    /api/compliance/nis2/ro/onboarding
POST   /api/compliance/nis2/ro/classify
GET    /api/compliance/nis2/ro/notification-draft
POST   /api/compliance/nis2/ro/export-pdf

POST   /api/compliance/nis2/incident-workflows/start
GET    /api/compliance/nis2/incident-workflows/:id
POST   /api/compliance/nis2/incident-workflows/:id/export-draft

GET    /api/compliance/assessments/current
POST   /api/compliance/assessments/recalculate
GET    /api/compliance/gaps
GET    /api/compliance/controls/:controlId

GET    /api/recommendations
POST   /api/recommendations/:id/accept
POST   /api/recommendations/:id/reject

POST   /api/actions/:id/preflight
POST   /api/actions/:id/approve
POST   /api/actions/:id/apply
POST   /api/actions/:id/verify

GET    /api/evidence
POST   /api/evidence/upload
GET    /api/evidence/:id/download

POST   /api/billing/stripe/checkout
POST   /api/billing/stripe/portal
POST   /api/billing/stripe/webhook

GET    /api/regulatory-sources
POST   /api/regulatory-sources/:id/mark-reviewed
POST   /api/regulatory-sources/import
```

---

## 20. Worker jobs

Implement BullMQ queues:

```txt
provider-sync
compliance-evaluation
evidence-generation
action-execution
billing-sync
notifications
regulatory-import
regulatory-source-monitor
```

### 20.1 Provider sync jobs

```txt
microsoft365.syncTenantProfile
microsoft365.syncLicenses
microsoft365.syncUsersGroupsRoles
microsoft365.syncConditionalAccess
microsoft365.syncApplications
microsoft365.syncAuditLogs
microsoft365.syncSecureScore
microsoft365.syncIntuneDevices
microsoft365.syncDefenderIncidents
```

### 20.2 Compliance jobs

```txt
nis2eu.recalculateBaselineClassification
nis2.evaluateControls
nis2.generateGapPlan
nis2.generateEvidencePackage
nis2ro.recalculateClassification
checklists.generateRecurringTasks
incidentWorkflow.updateDeadlines
```

### 20.3 Regulatory jobs

```txt
regulatory.importEuBaseline
regulatory.importCountryPack
regulatory.importRomaniaWorkbook
regulatory.validateCountryPacks
regulatory.monitorCountrySources
regulatory.createReviewTasks
```

### 20.4 Billing jobs

```txt
stripe.syncCustomer
stripe.syncSubscription
stripe.reconcileEntitlements
```

---

## 21. Database schema outline

Use Prisma. Initial schema groups:

### 21.1 Identity and org

```txt
User
IdentityAccount
LocalCredential
Session
MfaFactor
PasswordResetToken
EmailVerificationToken
Organization
OrganizationMember
Role
RoleBinding
AuditLog
```

### 21.2 Provider connections

```txt
ProviderConnection
ProviderCredential
ProviderModuleStatus
ProviderResource
ProviderFinding
ProviderRecommendation
ProviderAction
ProviderActionExecution
ProviderSyncRun
```

### 21.3 Regulatory and jurisdiction model

```txt
RegulatoryFramework
RegulatoryFrameworkVersion
RegulatorySource
RegulatorySourceSnapshot
Jurisdiction
CountryPack
CountryPackVersion
CountryPackCompleteness
NationalAuthority
RegistrationRule
IncidentReportingRule
RegulatoryQuestion
RegulatoryOption
RegulatoryAnswer
RegulatoryReviewTask
```

### 21.4 Compliance

```txt
BusinessProfile
BusinessServiceSelection
JurisdictionAssessment
ComplianceAssessment
ComplianceControl
ComplianceControlMapping
ComplianceControlOverlay
ComplianceGap
CompliancePlan
CompliancePlanItem
RiskAcceptance
```

### 21.5 Romanian NIS2 module

```txt
RoNis2EntityProfile
RoNis2ServiceSelection
RoNis2Article9Answer
RoNis2ClassificationRun
RoNis2NotificationDraft
RoNis2WorkbookSourceMap
```

### 21.6 Checklists

```txt
ChecklistTemplate
ChecklistTemplateItem
ChecklistRun
ChecklistRunItem
ChecklistAssignment
```

### 21.7 Evidence

```txt
EvidenceArtifact
EvidenceLink
EvidenceAccessLog
```

### 21.8 Billing

```txt
BillingCustomer
BillingSubscription
BillingEntitlement
BillingEvent
```

---

## 22. Security requirements

### 22.1 Secrets and token storage

1. Encrypt provider credentials before database storage.
2. Use envelope encryption.
3. SaaS default: Azure Key Vault or cloud KMS.
4. In-a-box default: local master key injected through environment or Docker secret.
5. Never log tokens, passwords, reset tokens, verification tokens, OAuth codes, or provider secrets.
6. Mask secrets in error objects.
7. Add automated tests to detect accidental token serialization.

### 22.2 Audit log

Audit all security-relevant events:

```txt
login
logout
failed_login
local_account_created
email_verified
password_reset_requested
password_changed
mfa_enabled
mfa_disabled
organization_created
member_invited
role_changed
provider_connected
provider_consent_completed
provider_permission_changed
scan_started
scan_completed
recommendation_created
action_preflight
action_approved
action_applied
action_failed
evidence_uploaded
evidence_downloaded
billing_changed
country_pack_imported
regulatory_source_reviewed
incident_workflow_started
incident_report_exported
```

Audit entries must include:

```txt
actor_user_id
organization_id
target_type
target_id
action
ip_address
user_agent
before_json
after_json
created_at
```

### 22.3 Remediation safety

Every write action requires:

1. User authorization.
2. Entitlement check.
3. Provider connection write-enabled check.
4. Permission check.
5. License check.
6. Preflight validation.
7. Pre-state snapshot.
8. Explicit approval.
9. Execution.
10. Post-state snapshot.
11. Verification.
12. Evidence generation.

---

## 23. Microsoft license and capability gating

Create a capability detector.

For each provider module, store:

```txt
module_key
available
license_required
license_detected
permissions_required
permissions_granted
status
status_reason
```

Examples:

```txt
entra_identity_read
entra_audit_logs
entra_conditional_access_read
entra_conditional_access_write
secure_score_read
intune_devices_read
defender_xdr_incidents_read
defender_xdr_incidents_write
exchange_posture_read
sharepoint_posture_read
teams_posture_read
purview_dlp_read
purview_audit_read
```

The UI must show why a feature is unavailable:

```txt
missing_license
missing_permission
unsupported_api
manual_only
not_configured
connector_error
```

Do not show recommendations that require unavailable licenses without labeling them.

---

## 24. Frontend pages

### 24.1 App shell

```txt
/login
/register
/forgot-password
/dashboard
/onboarding
/onboarding/eu-nis2
/onboarding/country-packs
/onboarding/romania
/providers
/providers/microsoft365
/compliance/nis2
/compliance/nis2/eu
/compliance/nis2/countries
/compliance/nis2/countries/:countryCode
/compliance/nis2/romania
/compliance/gaps
/recommendations
/action-plan
/incident-workflows
/checklists
/evidence
/billing
/settings/users
/settings/auth
/settings/audit-log
/settings/regulatory-sources
```

### 24.2 Dashboard cards

Show:

1. EU baseline NIS2 readiness.
2. Active country packs.
3. Current classification per country.
4. Country-pack completeness warnings.
5. Overall internal readiness score.
6. Critical gaps.
7. Microsoft 365 connection health.
8. Intune connector status.
9. Defender XDR connector status.
10. Upcoming checklist tasks.
11. Evidence expiring soon.
12. Subscription status.

### 24.3 Provider page

For Microsoft 365 page:

1. Connection status.
2. Tenant ID and display name.
3. Granted permission bundles.
4. License/module capability matrix.
5. Last sync.
6. Sync history.
7. Findings by module.
8. Safe remediation actions.
9. Raw evidence snapshots, restricted to admins/auditors.

### 24.4 Country pack page

For each country:

1. Country pack status.
2. Source list and last review date.
3. Registration rules if known.
4. Incident reporting rules if known.
5. Competent authority / CSIRT / SPOC if known.
6. Classification result.
7. Unsupported or unknown areas.
8. Required evidence.
9. Exportable local report/draft where implemented.

---

## 25. Reports and exports

V1 must generate:

1. EU NIS2 onboarding report.
2. Preliminary EU baseline classification report.
3. Country-specific classification report where supported.
4. Romanian NIS2 notification-form draft.
5. Microsoft 365 posture summary.
6. NIS2 gap report.
7. 100% internal readiness plan.
8. Evidence package export.
9. Incident reporting draft package.
10. Regulatory source traceability report.

Output formats:

```txt
PDF
JSON
CSV for selected tables
```

---

## 26. Implementation phases for Codex

### Phase 0: Bootstrap repository and Docker

Deliver:

1. Monorepo structure.
2. Dockerfiles.
3. Docker Compose files.
4. Health checks.
5. Environment variable templates.
6. Prisma setup.
7. Basic CI test command.
8. Regulatory importer container skeleton.
9. Report renderer container skeleton.

Acceptance criteria:

```txt
docker compose --profile core up --build
```

starts web, api, worker, scheduler, auth broker, postgres, redis, minio, traefik.

### Phase 1: Auth, local accounts, organizations, RBAC

Deliver:

1. Auth abstraction package.
2. Local email/password registration and login.
3. Email verification flow.
4. Password reset flow.
5. Microsoft, Google, GitHub identity provider placeholders.
6. Optional Keycloak broker config.
7. OIDC integration in frontend/API.
8. Organizations and memberships.
9. RBAC enforcement.
10. Audit log base.

Acceptance criteria:

1. User can register with email/password.
2. User can verify email.
3. User can log in and log out.
4. User can create organization.
5. User can invite/list members.
6. API rejects cross-organization access.
7. Failed login attempts are rate-limited and audited.

### Phase 2: Billing foundation

Deliver:

1. Billing provider interface.
2. Stripe implementation.
3. Checkout session endpoint.
4. Customer portal endpoint.
5. Webhook endpoint with signature verification.
6. Entitlement sync.

Acceptance criteria:

1. Stripe webhook updates subscription status.
2. Entitlements gate features.
3. In-a-box can run with `BILLING_PROVIDER=none`.

### Phase 3: EU regulatory foundation

Deliver:

1. EU Member State seed.
2. EU NIS2 baseline framework seed.
3. EU Article 21 control seed.
4. EU Article 23 incident workflow seed.
5. Implementing Regulation 2024/2690 overlay skeleton.
6. Country-pack core interface.
7. Regulatory source registry.
8. Country pack validation script.

Acceptance criteria:

1. All 27 EU Member States exist in the database.
2. EU baseline controls exist with legal source references.
3. Country packs can be loaded independently.
4. Country pack completeness status appears in UI.

### Phase 4: Provider abstraction

Deliver:

1. Provider core package.
2. Provider connection tables.
3. Provider module status.
4. Provider resources/findings/recommendations.
5. Microsoft provider skeleton.
6. Google Workspace provider stub.

Acceptance criteria:

1. Compliance engine calls provider-neutral interfaces.
2. No Microsoft-specific logic exists in generic NIS2 evaluator.

### Phase 5: Microsoft 365 onboarding

Deliver:

1. Microsoft multitenant app configuration docs.
2. Begin consent endpoint.
3. Complete consent endpoint.
4. Store tenant profile.
5. Permission bundle tracking.
6. Connection health page.

Acceptance criteria:

1. A Microsoft tenant can connect.
2. Tenant ID and organization profile are stored.
3. Granted permission bundle is visible.
4. Revoked/missing permissions are detected.

### Phase 6: Microsoft read-only scan

Deliver:

1. License sync.
2. Users/groups/admin roles sync.
3. Conditional Access read sync.
4. App registrations/service principals sync.
5. Audit/sign-in logs sync where available.
6. Secure Score sync.
7. Provider findings.

Acceptance criteria:

1. User sees Microsoft 365 posture findings.
2. Missing permissions/licenses are reported cleanly.
3. Scan failure in one module does not break all modules.

### Phase 7: Romania country pack importer

Deliver:

1. Importer for `nis2ro-tool-v-2-1.xlsx`.
2. Generated Romania regulatory seed JSON.
3. Source map from workbook sheets/cells to regulatory questions/options/rules.
4. Romania classification service.
5. Unit tests for classification scenarios.
6. Romanian onboarding form.
7. Notification draft data structure.
8. PDF export.

Acceptance criteria:

1. Workbook fields appear in onboarding.
2. User can save partial progress.
3. Classification result is generated.
4. Notification draft can be exported.
5. Source mapping shows which workbook sheet/cell produced each field.

### Phase 8: EU NIS2 onboarding and country-pack console

Deliver:

1. EU baseline onboarding flow.
2. Country selection and cross-border service mapping.
3. Country-pack dashboard.
4. Country-specific unsupported-state handling.
5. Jurisdiction assessments.
6. Consolidated EU + country gap view.

Acceptance criteria:

1. User can onboard an organization for any EU Member State.
2. Romania uses the full Romania country pack.
3. Other countries use baseline pack and show completeness warnings.
4. Cross-border countries generate separate jurisdiction assessments.

### Phase 9: Compliance control catalog and gap engine

Deliver:

1. NIS2 control catalog seed.
2. Provider mappings.
3. Manual checklist mappings.
4. Gap calculation.
5. Compliance dashboard.
6. 100% internal readiness plan.

Acceptance criteria:

1. Each control has status and evidence requirements.
2. Microsoft findings map to controls.
3. Manual tasks are generated for non-technical controls.
4. Plan items have owner/due date/status.
5. Country-pack warnings do not incorrectly reduce technical posture score unless they block a requirement.

### Phase 10: Recommendations and safe remediation

Deliver:

1. Recommendation engine.
2. Action preflight endpoint.
3. Approval flow.
4. Action execution queue.
5. Evidence generation.
6. Manual fallback.

Acceptance criteria:

1. No write action runs without approval.
2. Each action has pre/post snapshots.
3. Failed actions are auditable.
4. UI shows rollback/manual fallback.

### Phase 11: Intune connector

Deliver:

1. Intune license detection.
2. Managed device sync.
3. Device compliance status sync.
4. Intune findings mapped to controls.

Acceptance criteria:

1. If Intune is not licensed, module status says so.
2. If licensed, device posture appears in compliance dashboard.

### Phase 12: Defender XDR connector

Deliver:

1. Defender XDR availability detection.
2. Incident sync.
3. Alert sync where available.
4. Defender incidents mapped to monitoring/incident controls.
5. Optional write-back disabled by default.

Acceptance criteria:

1. Open Defender incidents appear.
2. High severity incidents influence compliance findings.
3. No incident update occurs without explicit write entitlement and approval.

### Phase 13: Evidence vault and reports

Deliver:

1. Evidence upload.
2. Provider snapshot evidence.
3. Report generation.
4. Evidence package export.
5. Auditor view.
6. Regulatory source traceability report.

Acceptance criteria:

1. Evidence is linked to controls and jurisdictions.
2. Reports include control status, findings, source references, and evidence.
3. Evidence downloads are audited.

### Phase 14: Hardening and release

Deliver:

1. Security review.
2. Threat model.
3. Backup/restore scripts.
4. Observability dashboards.
5. Rate limiting.
6. API tests.
7. E2E smoke tests.
8. In-a-box install docs.
9. Regulatory update runbook.

Acceptance criteria:

1. Clean install from Docker Compose works.
2. Backups restore successfully.
3. Basic vulnerability scan passes.
4. No secrets in logs.
5. Regulatory seeds can be imported and validated.

---

## 27. Environment variables

Create `.env.example` with:

```txt
APP_ENV=development
APP_BASE_URL=http://localhost
API_BASE_URL=http://localhost/api

DATABASE_URL=postgresql://puresoc:puresoc@postgres:5432/puresoc
REDIS_URL=redis://redis:6379
OBJECT_STORAGE_PROVIDER=minio
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=puresoc
MINIO_SECRET_KEY=change-me
EVIDENCE_BUCKET=evidence

AUTH_MODE=local_and_oidc
AUTH_LOCAL_ENABLED=true
AUTH_LOCAL_REQUIRE_EMAIL_VERIFICATION=true
AUTH_PASSWORD_HASH_ALGORITHM=argon2id
AUTH_SESSION_SECRET=change-me-32-byte-minimum
AUTH_COOKIE_SECURE=false
AUTH_RATE_LIMIT_LOGIN_PER_MINUTE=5

KEYCLOAK_ENABLED=true
KEYCLOAK_BASE_URL=http://keycloak:8080
KEYCLOAK_REALM=puresoc
KEYCLOAK_CLIENT_ID=puresoc-web
KEYCLOAK_CLIENT_SECRET=change-me

OIDC_MICROSOFT_LOGIN_ENABLED=true
OIDC_GOOGLE_LOGIN_ENABLED=true
OAUTH_GITHUB_LOGIN_ENABLED=true

TOKEN_ENCRYPTION_MASTER_KEY=change-me-32-byte-minimum
AUDIT_LOG_RETENTION_DAYS=2555

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_AUTHORITY=https://login.microsoftonline.com/common
MICROSOFT_REDIRECT_URI=http://localhost/api/provider-connections/microsoft365/callback

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_BASE=
STRIPE_PRICE_ID_PRO=
BILLING_PROVIDER=none

REGULATORY_SOURCE_MONITOR_ENABLED=false
REGULATORY_DEFAULT_FRAMEWORK=nis2
REGULATORY_DEFAULT_REGION=EU
REGULATORY_ENABLED_COUNTRY_PACKS=RO,AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,SK,SI,ES,SE

FEATURE_MICROSOFT_WRITE_ACTIONS=false
FEATURE_DEFENDER_WRITEBACK=false
FEATURE_GOOGLE_WORKSPACE=false
```

---

## 28. Test strategy

### 28.1 Unit tests

Test:

1. Local account password hashing and login checks.
2. Email verification and reset token expiry.
3. RBAC authorization.
4. EU baseline classification.
5. Romania classification rules.
6. Country-pack loading and completeness states.
7. Control mapping.
8. Gap calculation.
9. Entitlement logic.
10. Provider interface contracts.
11. Remediation preflight validation.
12. Token encryption/decryption.

### 28.2 Integration tests

Test:

1. Local account registration and login.
2. OIDC-authenticated API calls.
3. Organization scoping.
4. Stripe webhook handling.
5. Microsoft provider using mocked Graph responses.
6. Regulatory seed import.
7. Romania workbook import.
8. Evidence upload and download.
9. Worker job execution.

### 28.3 E2E tests

Test:

1. User registers with local account.
2. User verifies email.
3. User creates organization.
4. User completes EU NIS2 onboarding.
5. User selects Romania and completes Romanian NIS2 onboarding.
6. Microsoft provider mock connection.
7. Gap report generation.
8. Recommendation approval.
9. Evidence export.
10. Country-pack warning for a baseline-only country.

---

## 29. Mock providers and mock country packs

### 29.1 Mock Microsoft provider

Create a mock Microsoft provider for development and tests.

```txt
packages/providers/microsoft365/mock/
```

Mock scenarios:

1. Healthy tenant, good posture.
2. Tenant missing MFA.
3. Tenant without Intune license.
4. Tenant with risky admin roles.
5. Tenant with stale guests.
6. Tenant with Defender incidents.
7. Tenant with missing permissions.
8. Tenant with consent revoked.

### 29.2 Mock country packs

Create mock country-pack scenarios:

```txt
packages/compliance/nis2/country-packs/core/mock/
```

Mock scenarios:

1. Full country pack.
2. Baseline-only country pack.
3. Country pack with incident reporting override.
4. Country pack with missing registration source.
5. Country pack requiring legal review.
6. Country pack source stale.

---

## 30. V1 non-goals

Do not implement these in V1:

1. Full SOC with 24/7 operations.
2. Google Workspace connector beyond interface and stub.
3. Automatic DNSC or national authority submission.
4. Full network traffic visibility.
5. WireGuard or VPN-based customer network integration.
6. Fully automated enforcement of every Microsoft setting.
7. SIEM replacement.
8. Legal certification.
9. Custom low-level endpoint agent.
10. Multi-region active-active architecture.
11. Fully completed national legal workflows for all 27 countries.

Important nuance: V1 must be **EU-country-ready**, meaning all countries are supported structurally, with EU baseline assessment and country-pack capability. It does not mean every Member State has a fully researched national implementation pack on day one. That would be law firm cosplay, and the invoice would be disgusting.

---

## 31. Future roadmap hooks

### V1.1

1. More Microsoft remediation actions.
2. Exchange/SharePoint/Teams PowerShell bridge for unsupported Graph settings.
3. More report templates.
4. Partner/MSP mode.
5. Advanced evidence workflows.
6. More complete country packs for high-demand EU countries.
7. Regulatory source review dashboard.

### V2

1. Google Workspace connector.
2. Google Admin SDK inventory.
3. Google Workspace security posture checks.
4. Cross-provider NIS2 mappings.
5. Local collector preview for firewall/syslog ingestion.
6. Authority-specific submission package templates.

### V3

1. SOC-lite queue.
2. Defender XDR write-back.
3. Sentinel integration.
4. Alert enrichment.
5. Incident response workflows.
6. Customer local network telemetry through collector integrations.
7. Automated national authority API submission only where officially supported and explicitly authorized.

---

## 32. Official technical references

Use current official documentation while implementing. Links below are reference anchors and should be checked during implementation.

### Microsoft

- Microsoft Entra single and multitenant apps: https://learn.microsoft.com/en-us/entra/identity-platform/single-and-multi-tenant-apps
- Register an app in Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- Microsoft Graph app-only access: https://learn.microsoft.com/en-us/graph/auth-v2-service
- Microsoft Entra activity logs with Graph: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-with-microsoft-graph
- Microsoft Graph Secure Score: https://learn.microsoft.com/en-us/graph/api/resources/securescore
- Microsoft Graph Intune overview: https://learn.microsoft.com/en-us/graph/intune-concept-overview
- Intune managed devices API: https://learn.microsoft.com/en-us/graph/api/resources/intune-devices-manageddevice
- Microsoft Defender XDR APIs: https://learn.microsoft.com/en-us/defender-xdr/api-overview
- Fetch Defender XDR incidents: https://learn.microsoft.com/en-us/defender-xdr/fetch-incidents
- Microsoft Graph security API: https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview

### Google

- Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Google OAuth 2.0 for web server apps: https://developers.google.com/identity/protocols/oauth2/web-server
- Google service accounts and domain-wide delegation: https://developers.google.com/identity/protocols/oauth2/service-account

### GitHub

- GitHub OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps
- GitHub OAuth authorization: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps

### Stripe

- Stripe subscriptions: https://docs.stripe.com/subscriptions
- Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe customer portal: https://docs.stripe.com/customer-management

### EU NIS2 and country implementation

- European Commission NIS2 Directive page: https://digital-strategy.ec.europa.eu/en/policies/nis2-directive
- European Commission NIS2 country transposition index: https://digital-strategy.ec.europa.eu/en/policies/nis-transposition
- Directive (EU) 2022/2555: https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng
- Commission Implementing Regulation (EU) 2024/2690: https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/eng
- European Commission page for Implementing Regulation 2024/2690: https://digital-strategy.ec.europa.eu/en/library/nis2-commission-implementing-regulation-critical-entities-and-networks
- ENISA NIS2 awareness materials: https://www.enisa.europa.eu/topics/awareness-and-cyber-hygiene/raising-awareness-campaigns/network-and-information-systems-directive-2-nis2
- ENISA national cybersecurity organisations: https://www.enisa.europa.eu/topics/national-cyber-security-strategies/ncss-map/national-cyber-security-strategies-interactive-map/national-cybersecurity-organisations
- ECSO NIS2 Transposition Tracker, secondary/non-authoritative: https://ecs-org.eu/activities/nis2-directive-transposition-tracker/

### Romania NIS2

- European Commission Romania NIS2 country page: https://digital-strategy.ec.europa.eu/en/policies/nis2-directive-romania
- DNSC entity registration information: https://www.dnsc.ro/pagini/inregistrare-entitati
- DNSC NIS2/OUG 155/2024 materials: https://www.dnsc.ro/
- Local seed workbook for this repo: `data/regulatory/countries/ro/nis2ro-tool-v-2-1.xlsx`

---

## 33. First Codex task

Start with Phase 0 and Phase 1, but include EU regulatory scaffolding early so the project does not become RO/Microsoft-hardcoded before it can walk.

Create:

```txt
apps/web
apps/api
apps/worker
apps/scheduler
apps/regulatory-importer
apps/report-renderer
packages/shared
packages/config
packages/auth/core
packages/auth/local
packages/auth/oidc
packages/providers/core
packages/providers/microsoft365
packages/providers/google-workspace
packages/compliance/core
packages/compliance/nis2/eu
packages/compliance/nis2/implementing-regulation-2024-2690
packages/compliance/nis2/country-packs/core
packages/compliance/nis2/country-packs/ro
packages/billing/core
packages/billing/stripe
packages/evidence
packages/audit
packages/regulatory-sources
infra/compose
infra/docker
```

Then implement:

1. Docker Compose core stack.
2. Prisma schema initial migration.
3. Local auth registration/login/password reset tables and endpoints.
4. Optional Keycloak realm import.
5. Next.js app shell.
6. NestJS API with health endpoint.
7. Organization model.
8. RBAC middleware.
9. Audit log writer.
10. Provider interface types.
11. EU Member State seed.
12. Country-pack interface types.
13. Romania country-pack package skeleton.
14. Stripe billing interface stub.

Acceptance criteria for the first Codex task:

```txt
pnpm test
pnpm lint
docker compose --profile core up --build
```

must work with:

1. Local account registration.
2. Local login.
3. Organization creation.
4. Health endpoint.
5. EU Member State seed loaded.
6. Country pack status endpoint returning all 27 EU countries, with Romania marked as planned full pack and others as baseline-only until imported/reviewed.

Do not start Microsoft remediation until the provider abstraction, audit log, approval model, local auth, and EU/country-pack scaffolding exist.
