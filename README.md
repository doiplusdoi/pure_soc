# PureSOC

PureSOC / SiSoN is planned as a Docker-first, multitenant, provider-neutral EU NIS2 readiness platform. The first managed provider is Microsoft 365 and the first complete national country pack is Romania, seeded from the DNSC NIS2@RO workbook.

The repository follows the shared AI project template:

- Root files are for discovery, durable docs, and agent instructions.
- The application monorepo lives under [`code/`](code/README.md).
- Regulatory source data used by the app lives under `code/data/regulatory/`.

Start here:

- [Source vision](docs/puresoc_vision.md)
- [Master plan](docs/master-plan.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Milestone plan](docs/PLAN_M1.md)
- [Learnings](docs/LEARNINGS.md)
- [Codex prompts](docs/codex-prompts.md)
- [Prompt test protocol](docs/prompt-tests.md)
- [Implementation gaps](docs/implementation-gaps.md)
- [Skill install proposal](docs/skill-install-proposal.md)

Current repository state:

- Git repository initialized on `main`.
- Planning artifacts created for Codex-first implementation.
- M1-M19 implementation slices are present under `code/`, including schema/contracts, auth/org/RBAC, EU/Romania regulatory foundations, provider connector contracts, Microsoft read-only modules, compliance/recommendation/report/evidence/billing/action foundations, runtime config validation, Docker entrypoints, and the shared job runtime baseline.
- Runtime persistence is environment-selectable with `PURESOC_PERSISTENCE_MODE=memory|prisma`; Prisma mode currently persists only the bounded contexts that already have adapters.
- Worker, scheduler, and connector-runner now start typed job-runtime loops backed by an in-memory harness and a BullMQ-ready adapter boundary. Live Redis/BullMQ operation and provider-write execution remain deferred.
- Romania workbook is available to the application at `code/data/regulatory/countries/ro/nis2ro-tool-v-2-1.xlsx`.
