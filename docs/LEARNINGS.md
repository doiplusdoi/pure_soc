# Learnings

This file stores durable engineering lessons for future agents working on PureSOC.
Keep entries short, specific, and actionable.

## Current Learnings

- The repository uses the shared AI project template layout: root files are for discovery and durable docs, while application code lives under `code/`.
- PureSOC path references in implementation prompts are app-relative unless they explicitly start with `docs/` or another root-level path. For example, `apps/api` means `code/apps/api`.
- The compliance engine must remain provider-neutral. Microsoft 365 details belong under `code/packages/providers/microsoft365`.
- EU NIS2 baseline logic and Romania country-pack logic must stay separate. Romania-specific code belongs under `code/packages/compliance/nis2/country-packs/ro`.
- Regulatory workbook/source mappings are application data under `code/data/regulatory`; do not hardcode workbook-derived rules in UI code.
- Provider write/remediation actions stay disabled until audit logging, approval, preflight, snapshots, verification, and evidence metadata exist.

## How To Add Learnings

- Add lessons that should survive across milestones and future agent sessions.
- Prefer architecture docs for system invariants and data-flow decisions.
- Prefer milestone plans for decisions that only apply to one milestone.
