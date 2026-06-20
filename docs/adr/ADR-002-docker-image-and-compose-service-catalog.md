# ADR-002: Docker Image And Compose Service Catalog

Status: accepted
Date: 2026-04-28

## Context

PureSOC must run as Docker-first software for SaaS-like deployments and customer in-a-box installs. The repository needs to describe product-owned application images, service roles, default configuration, and dependencies without becoming a full production infrastructure repository.

## Decision

Keep Dockerfiles under `code/infra/docker` and the canonical Compose catalog at `code/compose.yml`.

- `code/infra/docker` owns Dockerfiles for application service roles.
- `code/compose.yml` is the shared service catalog and includes application `build:` entries plus `pull_policy: build` for local PureSOC image tags.
- `code/infra/compose/docker-compose.build.yml` is retained as a compatibility override for workflows that still compose build metadata separately, but the main service catalog is build-capable on its own.
- Split Compose files group service roles by data, storage, web/API, jobs, connectors, reports, and config/import tasks.
- Required service roles are `puresoc-web`, `puresoc-api`, `puresoc-worker`, `puresoc-scheduler`, `puresoc-connector-runner`, `puresoc-regulatory-importer`, `puresoc-report-renderer`, `puresoc-postgres`, `puresoc-redis`, and `puresoc-object-storage`.
- Optional local support services can include an auth broker, mailer, upload scanner, and mock provider services.

Compose is an application image and dependency manifest. Dev/staging/prod host hardening, secret custody, managed infrastructure, deployment pipelines, and backup operations are outside this repo unless a future ADR narrows that boundary.

## Consequences

- Every runtime component gets a clear image boundary and can be validated with `docker compose config` from `code/`.
- Default Compose starts can build PureSOC application images from public base images and local source code without requiring prepublished PureSOC registry images.
- Deployments that consume only one Compose file must support Compose `build:` and `pull_policy: build`, then provide the repository build context to the builder.
- The service catalog stays useful for local and in-a-box installs without overclaiming production operations.
- Future service additions must include Dockerfile ownership, default config, health behavior, and Compose wiring.
