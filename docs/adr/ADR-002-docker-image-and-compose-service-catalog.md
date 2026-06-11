# ADR-002: Docker Image And Compose Service Catalog

Status: accepted
Date: 2026-04-28

## Context

PureSOC must run as Docker-first software for SaaS-like deployments and customer in-a-box installs. The repository needs to describe product-owned application images, service roles, default configuration, and dependencies without becoming a full production infrastructure repository.

## Decision

Keep the Docker and Compose catalog under `code/infra/`.

- `code/infra/docker` owns Dockerfiles for application service roles.
- `code/infra/compose/docker-compose.yml` is the shared runtime service catalog, uses public GHCR image references for application services, and does not include application `build:` entries.
- `code/infra/compose/docker-compose.build.yml` is the opt-in local build override for mapping application services to their Dockerfiles.
- Split Compose files group service roles by data, storage, web/API, jobs, connectors, reports, and config/import tasks.
- Required service roles are `puresoc-web`, `puresoc-api`, `puresoc-worker`, `puresoc-scheduler`, `puresoc-connector-runner`, `puresoc-regulatory-importer`, `puresoc-report-renderer`, `puresoc-postgres`, `puresoc-redis`, and `puresoc-object-storage`.
- Optional local support services can include an auth broker, mailer, upload scanner, and mock provider services.

Compose is an application image and dependency manifest. Dev/staging/prod host hardening, secret custody, managed infrastructure, deployment pipelines, and backup operations are outside this repo unless a future ADR narrows that boundary.

## Consequences

- Every runtime component gets a clear image boundary and can be validated with `docker compose -f infra/compose/docker-compose.yml config` from `code/`.
- Default Compose starts pull registry image tags and avoid the Docker build path; local image builds require explicitly adding the build override.
- Deployments that consume only one Compose file must publish the referenced `ghcr.io/doiplusdoi/pure_soc/*:latest` images, or retag the Compose images to another public registry before deployment.
- The service catalog stays useful for local and in-a-box installs without overclaiming production operations.
- Future service additions must include Dockerfile ownership, default config, health behavior, and Compose wiring.
