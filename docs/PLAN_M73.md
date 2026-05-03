# M73 Plan: Romania Legal Review SOP And Activation Checklist

## Summary

Define the repository-side operating procedure that must exist before source-derived Romania country-pack or control changes can be activated for production use.

Status: completed app-side handoff.
Created: 2026-05-04.
Completed: 2026-05-04.

## Source Inputs

- `docs/puresoc_vision.md`
- `docs/master-plan.md`
- `docs/implementation-gaps.md`
- `docs/LEARNINGS.md`
- `docs/PLAN_M6.md`
- `docs/PLAN_M58.md`
- `docs/PLAN_M59.md`
- `code/data/regulatory/countries/ro/ro-nis2-import-report.generated.json`
- `code/data/regulatory/countries/ro/ro-nis2-source-map.generated.json`

## Goal

Narrow GAP-006 by spelling out the reviewer assignment, evidence requirements, approval delegation, activation gate, and rollback expectations without pretending legal/product approval has happened.

## Operating Procedure

Required roles:

- Regulatory owner: confirms source inventory and source-map completeness.
- Technical importer owner: confirms workbook/importer version, validation output, parser limitations, and generated artifact drift status.
- Product owner: confirms customer-facing wording, unsupported states, and launch posture.
- Legal reviewer or delegated Romanian counsel: approves legal caveat, regulatory interpretation, and any customer-facing Romania legal/regulatory copy.

Required review evidence:

- Workbook filename/version and source workbook SHA-256.
- Generated import report status, validation checks, limitations, and source-map coverage.
- Generated source map and sample source-linked control/notification output.
- Current legal caveat and message-catalog fallback metadata.
- Known unsupported workflows: no direct DNSC submission, no legal certification claim, no provider writes.
- Diff from the previously activated source version, if any.

Approval delegation:

- Technical owners may mark importer output ready for review.
- Product/legal owners may approve or reject production activation.
- No single technical importer owner can self-approve production legal activation.
- Any source conflict, ambiguous statutory interpretation, or mandatory Romanian-language wording issue escalates to legal reviewer or Romanian counsel.

Activation acceptance:

- Review task is visible to a `regulatory_admin`.
- Source map and import report are inspectable.
- Approval decision is audited with reviewer identity, evidence references, and caveat/version metadata.
- Activation can be superseded or rolled back by a later reviewed source version.
- UI must show review-required or approved state clearly before customer-facing production use.

## Negative Constraints

- Do not activate Romania source-derived legal logic through this milestone.
- Do not add or approve Romanian legal/regulatory copy.
- Do not create direct DNSC submission.
- Do not claim legal compliance certification.
- Do not bypass regulatory review tasks or source activation audit events.

## Completion Log

Completed 2026-05-04 as an SOP and checklist milestone.

Changed files:

- `docs/PLAN_M73.md`
- `docs/codex_status.md`
- `docs/codex-prompts.md`
- `docs/implementation-gaps.md`

Acceptance status:

- GAP-006 now has a concrete review procedure to operationalize.
- GAP-006 remains open until product/legal assigns real reviewers, approves the procedure, and the activation UI/operations path is production-ready.
