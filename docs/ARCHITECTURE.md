# PureSOC Architecture

Status: initial architecture baseline for the template-aligned repository.

## Repository Boundary

PureSOC follows the shared AI project template:

- Root: discovery files, agent instructions, durable documentation, project skills.
- `docs/`: source vision, architecture notes, plans, prompts, gap register, ADRs.
- `code/`: application monorepo, packages, apps, tests, Compose catalog, runtime config, regulatory seed data.

This means future implementation prompts may list paths such as `apps/api` or `packages/config`; those paths are relative to `code/` unless they explicitly mention a root-level document such as `docs/master-plan.md`.

## System Shape

The target application is a Docker-first TypeScript monorepo:

- `code/apps/web`: operational compliance console.
- `code/apps/api`: API surface for auth, organizations, provider connections, compliance, evidence, reports, and billing.
- `code/apps/worker`: async jobs for scans, imports, evidence, billing, and exports.
- `code/apps/scheduler`: recurring compliance and source-monitor jobs.
- `code/apps/connector-runner`: isolated connector job runtime and mock-provider scenarios.
- `code/apps/regulatory-importer`: one-shot EU and country-pack regulatory import jobs.
- `code/apps/report-renderer`: report/PDF rendering service.
- `code/packages/*`: shared contracts and domain packages.
- `code/data/regulatory`: source-linked regulatory seed data and workbook-derived artifacts.
- `code/infra/compose`: project-owned service/image catalog.
- `code/infra/docker`: Dockerfiles for application service roles.

## Core Invariants

- Compliance packages consume provider-neutral resources and findings, never Microsoft raw API payloads.
- Microsoft-specific code lives under `code/packages/providers/microsoft365` and Microsoft-specific API handlers.
- Country-specific rules live under country-pack packages. Romania logic must not leak into EU baseline packages.
- Regulatory facts, source maps, and workbook-derived mappings are stored as data, not React conditionals.
- Reports must preserve the legal caveat from `docs/puresoc_vision.md`.
- Provider scans are read-only by default. Write/remediation paths require audit, approval, preflight, snapshots, verification, and evidence links before implementation.

## Data Flow

The intended analytical flow is:

```txt
customer profile answers
+ regulatory source data
+ provider raw telemetry
-> provider normalized resources
-> provider findings
-> compliance control results
-> gaps
-> recommendations
-> readiness plan items
-> evidence requirements
-> reports, dashboards, checklists, and triggerable actions
```

## Runtime Catalog

The repository owns a Compose service catalog for application roles and local defaults. Dev, staging, production, host hardening, and secret custody are handled outside this repository unless a future ADR says otherwise.
