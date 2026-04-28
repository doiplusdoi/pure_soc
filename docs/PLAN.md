# PureSOC Project Plan

This document adapts the shared AI project template plan to PureSOC. The detailed product and implementation roadmap remains in `docs/master-plan.md`; this file records repository-level planning conventions.

## Project Brief

- Project name: PureSOC / SiSoN.
- Problem being solved: recurring EU NIS2 readiness, evidence, provider telemetry, and safe remediation workflows for SMBs, MSPs, and regulated organizations.
- Primary users: Romanian and EU SMBs, MSPs, vCISOs, compliance managers, auditors, and security operators.
- Success criteria: a Docker-first, multitenant, provider-neutral compliance operating system with Microsoft 365 as the first provider and Romania as the first full country pack.
- Non-goals: legal certification claims, provider write automation before safety controls, Microsoft-specific compliance engine logic, Romania-specific EU baseline logic.
- Key constraints: source-linked regulatory data, organization-scoped authorization, read-only provider discovery by default, evidence and audit trails from early phases.
- Target environments: local Docker Compose, SaaS deployment, and customer in-a-box installs.
- Packaging requirement: the application must be runnable through Docker Compose.
- External services and integrations: Microsoft Graph, Stripe, OIDC/social login providers, object storage, PostgreSQL, Redis, optional Keycloak broker.

## Repository Structure

- `README.md`: short project overview and startup pointer.
- `AGENTS.md`: root instructions for agents.
- `docs/`: durable project docs, source vision, prompts, plans, gap register, ADRs.
- `code/`: application monorepo, packages, services, tests, build files, runtime configuration, Compose catalog, and regulatory seed data.

## Milestones

1. Phase A: template-aligned monorepo skeleton and service image catalog.
2. Phase B: database schema and core data contracts.
3. Phase C: auth, organizations, RBAC, sessions, and audit.
4. Phase D: EU NIS2 foundation and country-pack status.
5. Phase E: Romania workbook importer, classifier, onboarding schema, and notification draft.
6. Phase F: provider core, connector runner, and mock provider pipeline.
7. Phase G: Microsoft 365 consent and read-only sync.
8. Phase H: compliance engine, recommendations, readiness plan, and checklists.
9. Phase I: evidence, reports, dashboards, exports, and billing.
10. Phase J: safe remediation foundation.
11. Phase K: release readiness and threat model review.

## Execution Rule

Use the implementation prompts in `docs/codex-prompts.md`, but treat app paths as relative to `code/` unless a prompt explicitly names a root-level document.
