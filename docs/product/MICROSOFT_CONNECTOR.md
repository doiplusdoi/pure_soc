# Microsoft 365 Connector Plan

The Microsoft 365 connector is the first deep provider integration. The current implementation has a real read-only foundation and a deliberately disabled write executor. The product target is read/write with strict capability discovery, safety classes, and customer-visible audit.

## Current Implementation

Implemented foundations:

- Microsoft provider package under `code/packages/providers/microsoft365`.
- Admin-consent URL generation.
- Persisted consent state and callback handling.
- Token exchange and encrypted credential storage.
- Live, fixture, and auto connector modes.
- Provider-neutral raw resources, normalized resources, findings, recommendations, capabilities, and sync runs.
- Read modules for tenant profile, licensing, users/groups/roles, MFA registration, applications, conditional access, Entra audit logs, sign-in logs, Secure Score, Intune devices, and Defender XDR.
- Graph client pagination, retries, and handling for common throttling and permission failures.
- Product facade and web routes for Microsoft 365 connection and overview.
- Dry-run/external smoke scaffolding.

Important current constraint:

- Microsoft provider write execution is disabled. Action execution supports fake/mock behavior only until safety and live-proof gates are complete.

## Target Permission Bundles

### Bundle A: Baseline Posture

Purpose: initial customer value with least privilege.

Read areas:

- Tenant profile and domains.
- Subscriptions and license assignment.
- Users, guests, groups, privileged roles.
- MFA registration and authentication methods posture where available.
- Applications and service principals.
- Conditional access policy read.
- Secure Score.
- Basic audit and sign-in posture summaries.

### Bundle B: Security Operations

Purpose: deeper detection and incident operations.

Read areas:

- Defender incidents.
- Defender alerts using current supported APIs, including `alerts_v2` where applicable.
- Risky users and risk detections.
- Intune device inventory and compliance posture.
- Service health and message center where approved.
- Audit and sign-in logs with source cursors.

### Bundle C: Response Actions

Purpose: approved low to medium impact response.

Potential actions:

- Add Defender incident comments.
- Change Defender incident status or assignment where supported.
- Revoke user sessions.
- Confirm or dismiss risky user state where supported and approved.
- Disable or rotate selected app credentials only after stronger controls exist.

### Bundle D: Configuration Remediation

Purpose: high assurance configuration changes.

Potential actions:

- Create report-only conditional access recommendations.
- Stage conditional access policy changes.
- Apply narrowly scoped configuration changes with rollback metadata.

This bundle must remain disabled until class 3 safety gates, rollback plans, and disposable-tenant live proof exist.

## Capability States

Every module and action should resolve to one of:

- `AVAILABLE`
- `PERMISSION_REQUIRED`
- `ROLE_REQUIRED`
- `LICENSE_REQUIRED`
- `CONSENT_EXPIRED`
- `UNSUPPORTED_CLOUD`
- `TEMPORARILY_UNAVAILABLE`
- `ERROR`

Capability output must be customer-readable and should explain the next safe step without asking for broad permissions by default.

## Read-Side Gaps

The current read connector should be expanded in this order:

1. Prove live read-only sync against an approved disposable tenant.
2. Verify Defender incidents and current alerts endpoint usage. Do not rely on legacy `/security/alerts`.
3. Add risky users and risk detections where permission and license allow.
4. Add service health and message center if approved for the selected bundle.
5. Add durable sync cursors, stale-state handling, and per-module last-success metadata.
6. Add scheduled sync orchestration, dead-letter visibility, and rate-limit telemetry.
7. Map source records into product assets, product findings, incidents, controls, and evidence links.

## Write-Side Plan

### Wave 1: Zero-Blast Actions

Actions produce Microsoft-backed outputs but do not modify the tenant.

Examples:

- Export MFA coverage report.
- Generate guest access review task.
- Generate application credential expiry report.
- Generate conditional access change plan in report-only form.

Required gates:

- Capability check.
- Preflight.
- Audit.
- Evidence artifact.
- Idempotency key.
- Async operation status.
- No provider mutation.

### Wave 2: Safety Class 1

Low-impact provider changes.

Examples:

- Add Defender incident comment.
- Set Defender incident assignment or status where supported.

Required gates:

- Bundle C consent.
- Capability and role checks.
- Customer approval policy.
- Preflight and before snapshot.
- Async execution.
- Verification readback.
- Audit and evidence.

### Wave 3: Safety Class 2

Moderate-impact response actions.

Examples:

- Revoke sessions for a user.
- Risky user disposition where supported.

Required gates:

- Recent auth.
- Stronger approval policy.
- Explicit blast-radius display.
- Idempotency.
- Verification.
- Customer-visible audit.
- Manual rollback guidance where provider rollback is not available.

### Wave 4: Safety Class 3

Configuration changes.

Examples:

- Report-only conditional access policy creation.
- Staged conditional access activation.

Required gates:

- Two-step approval.
- Preflight diff.
- Rollback metadata.
- Dry-run and disposable-tenant live proof.
- Post-change verification.
- Automatic stale capability invalidation.

### Prohibited

Class 4 broad destructive actions are out of scope until the product explicitly changes the constitution. Do not automate destructive Microsoft remediation actions without separate approval and safety design.

## Disconnect And Revocation

Disconnect must:

- Delete stored provider secrets.
- Preserve historical observations and reports.
- Mark provider capabilities unavailable.
- Mark provider-derived control results stale or unavailable.
- Keep audit and evidence intact.
- Provide manual revocation guidance when Microsoft-side consent revocation cannot be automated.

## External Proof Requirements

Before production use, run approved live smokes against disposable targets for:

- Admin consent URL and callback.
- Token storage and rotation.
- Read-only sync.
- Permission-required and license-required capability states.
- Expired or revoked consent handling.
- Zero-blast action execution.
- Class 1 action execution only after safety review.

No live customer tenant should be used for broad permission discovery or write testing.

