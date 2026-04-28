# M1 Plan: Template-Aligned PureSOC Skeleton

## Summary

Create the repository structure needed for PureSOC Phase A while adopting the shared AI project template. Keep root files focused on discovery and durable docs, place the application monorepo under `code/`, copy real PureSOC regulatory source data into the app data tree, and add a minimal TypeScript workspace with tests and a Compose service catalog.

## Locked User Decisions

- Use `/mnt/solodata/SoloCode/ai-template` only as a read-only template reference.
- Do not modify the template repository.
- Reorganize PureSOC using the template's root-docs plus `code/` application structure.

## Current State

PureSOC started as a planning repository with docs, the Romania workbook, and project-local agent skills. There was no application monorepo, package manager config, service catalog, or runtime config.

## Scope

In scope:

- Root documentation alignment with the AI project template.
- `code/` workspace skeleton for apps, packages, config, data, Compose, Dockerfiles, scripts, and tests.
- Minimal health endpoint and config loader tests.
- Romania workbook copied into `code/data/regulatory/countries/ro/`.
- Gap register updates for Phase A.

Out of scope:

- Real Microsoft Graph calls.
- Romania workbook parsing.
- Database schema implementation beyond seed/data-contract placeholders.
- Provider write/remediation actions.
- Production infrastructure hardening.

## AI Validation Plan

- Run workspace layout lint.
- Run TypeScript checks.
- Run unit/import smoke tests.
- Run Compose config validation if Docker Compose is available.

## AI Validation Results

- `flatpak-spawn --host npx pnpm@10.33.2 install`: passed; generated `code/pnpm-lock.yaml`.
- `flatpak-spawn --host npx pnpm@10.33.2 lint`: passed; workspace layout check and TypeScript typecheck succeeded.
- `flatpak-spawn --host npx pnpm@10.33.2 test`: passed; 3 test files, 5 tests.
- `flatpak-spawn --host docker compose -f infra/compose/docker-compose.yml config`: passed.

Note: the sandbox container does not expose `node`, `npm`, or `pnpm`; validation used the host toolchain through `flatpak-spawn`.

## User Validation Suggestions

Review `code/README.md`, `docs/ARCHITECTURE.md`, and `code/infra/compose/docker-compose.yml` to confirm the new repository shape matches the intended dev, staging-testing, and production automation flow.
