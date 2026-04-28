import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const requiredPaths = [
  "apps/web",
  "apps/api",
  "apps/worker",
  "apps/scheduler",
  "apps/connector-runner",
  "apps/regulatory-importer",
  "apps/report-renderer",
  "packages/shared",
  "packages/config",
  "packages/auth/core",
  "packages/auth/local",
  "packages/auth/oidc",
  "packages/auth/keycloak",
  "packages/database",
  "packages/audit",
  "packages/providers/core",
  "packages/providers/microsoft365",
  "packages/providers/google-workspace",
  "packages/providers/mock",
  "packages/compliance/core",
  "packages/compliance/nis2/eu",
  "packages/compliance/nis2/implementing-regulation-2024-2690",
  "packages/compliance/nis2/country-packs/core",
  "packages/compliance/nis2/country-packs/ro",
  "packages/recommendations",
  "packages/evidence",
  "packages/regulatory-sources",
  "packages/reports",
  "packages/dashboards",
  "packages/ui",
  "packages/billing/core",
  "packages/billing/stripe",
  "infra/compose/docker-compose.yml",
  "data/regulatory/countries/member-states.seed.json",
  "data/regulatory/countries/ro/nis2ro-tool-v-2-1.xlsx"
];

const missing = requiredPaths.filter((path) => !existsSync(join(process.cwd(), path)));

if (missing.length > 0) {
  console.error(`Missing required workspace paths:\n${missing.map((path) => `- ${path}`).join("\n")}`);
  process.exit(1);
}

for (const file of [
  "config/defaults/app.json",
  "config/defaults/auth.json",
  "config/defaults/connectors.json",
  "config/defaults/compliance.json",
  "config/defaults/reports.json",
  "config/defaults/billing.json",
  "data/regulatory/countries/member-states.seed.json"
]) {
  JSON.parse(readFileSync(join(process.cwd(), file), "utf8"));
}

console.log("PureSOC workspace layout looks coherent.");
