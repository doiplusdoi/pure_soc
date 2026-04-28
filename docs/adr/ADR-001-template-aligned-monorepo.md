# ADR-001: Template-Aligned Monorepo And Package Manager

Status: accepted
Date: 2026-04-28

## Context

PureSOC began as a planning repository. The shared AI project template used by the team keeps the repository root small and puts application source code, packages, tests, runtime config, and Compose files under `code/`.

The PureSOC source vision and master plan describe app paths such as `apps/api`, `packages/config`, and `infra/compose`. Those paths need to remain useful while adopting the template layout.

The implementation also needs one package-manager contract so prompts, CI, Dockerfiles, and local validation use the same workspace behavior.

## Decision

Use the template-aligned monorepo layout:

- Root remains for `README.md`, `AGENTS.md`, durable docs, and agent skills.
- Application monorepo paths live under `code/`.
- Implementation prompts treat app paths as relative to `code/` unless a root-level path is explicit.
- The application workspace uses `pnpm`, currently pinned in `code/package.json` as `pnpm@10.33.2`.
- Package-manager, lint, typecheck, test, and Compose commands run from `code/`.

Examples:

- `apps/api` means `code/apps/api`.
- `packages/providers/microsoft365` means `code/packages/providers/microsoft365`.
- `docs/master-plan.md` remains root-level.

## Consequences

- The root stays clean for automation and agent discovery.
- Dev, test, Compose, and package-manager commands run from `code/`.
- Existing PureSOC docs remain readable without rewriting every target path, but future docs must mention the `code/` app root.
- Future package additions must be declared in `code/pnpm-workspace.yaml` and should expose testable package boundaries instead of hidden cross-package imports.
