# ADR-010: Remediation Safety Model

Status: accepted
Date: 2026-04-28

## Context

PureSOC will recommend actions based on NIS2 controls and provider telemetry. Some future actions may be applied through provider APIs, but unsafe automation could lock out admins, delete critical applications, change mail flow, or create audit and legal risk.

## Decision

Use a safety-gated remediation lifecycle:

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

Provider write actions remain disabled until the model includes authorization, entitlement checks, write-enabled provider connection checks, permission and license checks, preflight, snapshots, explicit approval, execution logging, verification, evidence, and audit events.

V1 starts with manual and guided actions. High-risk actions such as disabling users, removing Global Admin roles, deleting applications, globally enforcing Conditional Access, tenant-wide session revocation, blind mail-flow changes, and broad DLP/retention changes are not automated by default.

## Consequences

- Recommendations can be useful before automation exists.
- Future automation has a durable data model and audit trail.
- Implementation must separate recommendation generation from action execution.
- Every executable action needs a manual fallback, expected change, blast radius, rollback strategy, required permissions, required license, and evidence requirement.
