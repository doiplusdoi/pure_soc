# PureSOC Agent Instructions

Before implementing, read these files in order:

1. `docs/puresoc_vision.md`
2. `docs/master-plan.md`
3. `docs/implementation-gaps.md`
4. `docs/codex-prompts.md`
5. `docs/LEARNINGS.md`

Rules for this repo:

- Treat `docs/puresoc_vision.md` as the source blueprint unless a newer architecture decision record overrides it.
- Keep the repository root small. Application source, packages, tests, runtime config, Compose files, and regulatory seed data live under `code/`.
- Keep the compliance engine provider-neutral. Microsoft-specific logic belongs under the Microsoft provider package.
- Keep country-specific regulatory logic inside country-pack modules. Romania-specific logic must not leak into the EU core.
- Every implementation prompt must include expected files, negative constraints, tests, and acceptance commands.
- Do not automate provider write/remediation actions until audit logging, approval, preflight, snapshots, and verification exist.
- Store regulatory source mappings and workbook-derived mappings as data, not hardcoded UI conditionals.
- Update `docs/implementation-gaps.md` whenever a blocker, assumption, or unresolved decision appears.
- Prefer small vertical slices that end with runnable tests over broad scaffolding with no behavior.
