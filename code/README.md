# PureSOC Application Workspace

This directory contains the PureSOC application monorepo.

Run application tooling from this directory:

```sh
pnpm install
pnpm lint
pnpm test
docker compose -f infra/compose/docker-compose.yml config
```

Repository-level docs remain in `../docs/`. App code, packages, tests, runtime config, Compose files, Dockerfiles, scripts, and regulatory seed data belong here.

## Layout

- `apps/`: service entrypoints and application roles.
- `packages/`: shared contracts and domain packages.
- `config/defaults/`: checked-in default config.
- `data/regulatory/`: EU and country-pack regulatory source data.
- `infra/compose/`: project-owned service catalog.
- `infra/docker/`: service Dockerfiles.
- `scripts/`: workspace maintenance scripts.
- `tests/`: cross-package smoke tests.
