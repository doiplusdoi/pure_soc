# PureSOC Target Domain Model

This document maps the canonical product model to the current implementation and defines the migration order. The goal is a modular monolith with strict organization boundaries, provider-neutral core models, Microsoft-specific implementation under the Microsoft provider package, and country-specific regulatory behavior inside country packs.

## Modeling Rules

- Tenant-owned records must carry `organizationId` unless they are global catalog, legal source, or platform administration records.
- Partner access must be expressed through relationship and assignment records, not inferred from customer display names or loose organization membership.
- Human-entered product state and provider-observed source state must remain separate, with explicit merge or override records.
- Country-specific classification, authority, deadline, report, and wording logic belongs in country packs.
- Microsoft-specific resources, permission bundles, Graph shapes, and actions belong under the Microsoft provider implementation.
- JSON fields are allowed for source payloads and versioned snapshots, but product workflow state should use typed tables.
- Every state transition that affects customer posture, access, evidence, report output, or provider action must produce audit events.

## Aggregate Map

### Identity And Access

Current foundation:

- `User`, `IdentityAccount`, `LocalCredential`, `Session`, MFA, reset and verification tokens.
- `Organization`, `OrganizationMember`, `OrganizationInvitation`.
- `Role`, `RoleBinding`.
- Partner-specific `Partner`, `PartnerMember`, `PartnerTenantGrant`, `TenantAccessSession`.

Target additions:

- `PermissionGrant` or equivalent explicit grants for product permissions.
- `Team` and assignment groups for partner delivery teams.
- `OrganizationRelationship` with lifecycle states: `INVITED`, `PENDING_CUSTOMER_ACCEPTANCE`, `ACTIVE`, `SUSPENDED`, `TERMINATION_PENDING`, `TERMINATED`, `EXPIRED`.
- `PartnerAssignment` linking partner users or teams to customer organizations, scopes, and expiry.
- `SupportSession` separate from delegated partner access, with reason, expiry, approver or policy basis, customer visibility, and audit.
- `RecentAuthChallenge` or session security event for sensitive actions.

Migration priority:

1. Add relationship and assignment tables beside `PartnerTenantGrant`.
2. Backfill active grants into relationship records.
3. Move partner authorization checks to relationship plus assignment.
4. Add support-session workflow and customer-visible audit.
5. Deprecate direct grant assumptions only after route/API tests pass.

### Business Context

Current foundation:

- `Customer`, business profile, locations, contacts, services, NACE codes, size metrics, jurisdiction responses.
- Product onboarding facade routes and generic NIS2 profile services.

Target additions:

- First-class `BusinessService` ownership, criticality, dependencies, continuity attributes, and in-scope/out-of-scope state.
- `Person` or responsible party records independent of login accounts.
- `ResponsibilityAssignment` for compliance owner, security owner, DPO/legal, supplier owner, incident lead, and management approver.
- `Supplier`, `SupplierService`, `SupplierReview`, contract metadata, evidence links, risk links, and review cadence.
- Structured setup state for each onboarding step with autosave, completion, reviewer, and launch gate.

Migration priority:

1. Normalize onboarding answers into business context tables.
2. Add people/responsibility and supplier primitives.
3. Link services, suppliers, systems, evidence, risks, findings, and controls.
4. Replace form-only classification dependencies with typed profile reads.

### Compliance And Governance

Current foundation:

- Regulatory sources, country packs, source maps, questionnaires, NIS2 classifications.
- Control catalog, control results, gaps, readiness runs, recommendations, readiness plans and checklist items.
- Romania-specific workbook importer and notification package.

Target additions:

- `Requirement` and `RequirementVersion` generated from country-pack source data.
- `OrganizationControl` with status: `NOT_ASSESSED`, `NOT_IMPLEMENTED`, `PARTIALLY_IMPLEMENTED`, `IMPLEMENTED_UNVERIFIED`, `IMPLEMENTED_VERIFIED`, `INEFFECTIVE`, `NOT_APPLICABLE`, `EXCEPTION_APPROVED`.
- `ControlAssessment` with evidence requirements, assessor, date, method, and source.
- `Exception` or enhanced risk acceptance with expiry, owner, compensating controls, and approval.
- `PolicyDocument`, `PolicyReview`, `PolicyAcknowledgement`.
- `GovernanceActivity`, `GovernanceCalendarEvent`, `Attestation`, and `TrainingRecord`.
- Normalized classification outcome enum from the product constitution, including professional review and override outcomes.

Migration priority:

1. Upgrade country-pack contract and classification outcome model.
2. Add organization-control state beside current control results.
3. Convert readiness gaps to derived views from control, risk, evidence, and provider findings.
4. Add policy, attestation, and governance calendar workflows.

### Security Operations

Current foundation:

- `ProviderConnection`, consent state, credentials, permission bundles, capabilities, sync runs, modules, raw resources, normalized resources, provider findings.
- Recommendations, action templates, action runs, preflight, approval, snapshots, verification.
- Microsoft read modules and disabled Microsoft action executor.

Target additions:

- `ConnectorGrant` or normalized consent grant tied to bundle, version, tenant, and capability.
- `SyncCursor`, source object versioning, and stale/unavailable dependency state.
- Product `Asset` and `AssetRelationship` with source links, ownership, criticality, and service dependencies.
- Product `Finding` lifecycle: open, accepted risk, suppressed, in progress, remediated, verified, reopened.
- `RemediationPlan`, `Task`, `TaskAssignment`, SLA, comments, and evidence links.
- `Risk` aggregate with inherent/residual score, treatment, owner, review cadence, and linked controls/findings/suppliers/services.
- `Incident`, `IncidentSourceLink`, `IncidentEvent`, `IncidentTimelineEntry`, reportability assessment, reporting clock, and post-incident review.
- `ExternalActionPolicy` for safety class, approval, reauth, idempotency, and rollback metadata.

Migration priority:

1. Introduce product assets and product findings while preserving provider findings.
2. Add remediation task/planning layer above action runs.
3. Add risk register and supplier links.
4. Add incident aggregate and source links from Defender data.
5. Enable zero-blast Microsoft actions, then higher safety classes only after proof.

### Reporting, Evidence, Audit, And Files

Current foundation:

- Evidence records, metadata, access logs, generated reports, report exports, bundles, audit logs, chain/checkpoint concepts.
- Local PDF and evidence package generation.

Target additions:

- `FileObject` abstraction for generated and uploaded files with storage provider, checksum, retention class, encryption metadata, and scan result.
- `RetentionPolicy` and deletion/hold workflow.
- `ReportTemplate`, `ReportSnapshot`, `ReportSectionSnapshot`, and `ExportJob`.
- Immutable report input snapshots for compliance, incident, audit, partner portfolio, and customer service reports.
- Audit export, WORM or external signing, and retention proof.
- Transactional outbox and internal event log for report, notification, sync, audit, and action workflows.

Migration priority:

1. Wrap existing report exports and evidence objects with a file object abstraction.
2. Add retention classes and deletion gates.
3. Snapshot report inputs and templates.
4. Add transactional outbox before broad async workflow expansion.
5. Add WORM/signing/export support for audit evidence.

## Cross-Aggregate Invariants

- A partner user can access a customer only through an active relationship, active assignment, correct permission, and valid session context.
- A support user can access a customer only through a support session with reason, expiry, and customer-visible audit.
- A country-pack version used for classification or reports must be preserved even after a newer pack version is activated.
- A provider finding must not be mutated into human state. Product finding state references provider finding source links.
- A report must be reproducible from immutable snapshots, not current live records alone.
- A provider write action must not execute without capability check, preflight, approval policy, recent auth when required, idempotency key, async job, verification, evidence, and audit.

