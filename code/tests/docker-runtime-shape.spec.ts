import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const dockerfiles = [
  ["Dockerfile.api", "start:api"],
  ["Dockerfile.web", "start:web"],
  ["Dockerfile.worker", "start:worker"],
  ["Dockerfile.scheduler", "start:scheduler"],
  ["Dockerfile.connector-runner", "start:connector-runner"],
  ["Dockerfile.regulatory-importer", "start:regulatory-importer"],
  ["Dockerfile.report-renderer", "start:report-renderer"]
] as const;

const deployableComposeBuildExpectations = [
  [
    "compose.yml",
    [
      "Dockerfile.web",
      "Dockerfile.api",
      "Dockerfile.worker",
      "Dockerfile.scheduler",
      "Dockerfile.connector-runner",
      "Dockerfile.regulatory-importer",
      "Dockerfile.report-renderer"
    ]
  ],
  ["docker-compose.webservices.yml", ["Dockerfile.web", "Dockerfile.api"]],
  ["docker-compose.jobs.yml", ["Dockerfile.worker", "Dockerfile.scheduler"]],
  ["docker-compose.connectors.yml", ["Dockerfile.connector-runner"]],
  ["docker-compose.reports.yml", ["Dockerfile.report-renderer"]],
  ["docker-compose.config.yml", ["Dockerfile.regulatory-importer"]]
] as const;

describe("Docker runtime command shape", () => {
  it("rejects inline placeholder command patterns", () => {
    for (const [dockerfile] of dockerfiles) {
      const source = readWorkspaceFile("infra/docker", dockerfile);

      expect(source, dockerfile).not.toContain('"node", "-e"');
      expect(source, dockerfile).not.toContain("setInterval(() => {}, 1000)");
      expect(source, dockerfile).not.toContain("puresoc-regulatory-importer ready");
    }
  });

  it("runs named workspace entrypoints for each service role", () => {
    for (const [dockerfile, scriptName] of dockerfiles) {
      const source = readWorkspaceFile("infra/docker", dockerfile);

      expect(source, dockerfile).toContain(`CMD ["pnpm", "${scriptName}"]`);
    }
  });

  it("keeps deployable compose catalogs source-buildable", () => {
    for (const [composeFile, expectedDockerfiles] of deployableComposeBuildExpectations) {
      const compose =
        composeFile === "compose.yml"
          ? readWorkspaceFile(composeFile)
          : readWorkspaceFile("infra/compose", composeFile);

      expect(compose, composeFile).toContain("build:");
      expect(compose, composeFile).toContain("pull_policy: build");
      expect(compose, composeFile).toContain(composeFile === "compose.yml" ? "context: ." : "context: ../..");
      for (const dockerfile of expectedDockerfiles) {
        expect(compose, composeFile).toContain(`dockerfile: infra/docker/${dockerfile}`);
      }
    }
  });

  it("avoids Docker Hub defaults for app build bases and bundled data services", () => {
    for (const [dockerfile] of dockerfiles) {
      const source = readWorkspaceFile("infra/docker", dockerfile);

      if (dockerfile === "Dockerfile.report-renderer") {
        expect(source, dockerfile).toContain("FROM mcr.microsoft.com/playwright:");
      } else {
        expect(source, dockerfile).toContain("FROM public.ecr.aws/docker/library/node:22-alpine");
        expect(source, dockerfile).not.toContain("FROM node:22-alpine");
      }
    }

    const compose = readWorkspaceFile("compose.yml");
    expect(compose).toContain("image: public.ecr.aws/docker/library/postgres:16-alpine");
    expect(compose).toContain("image: public.ecr.aws/docker/library/redis:7-alpine");
    expect(compose).toContain("image: quay.io/minio/minio:RELEASE.2025-01-20T14-49-07Z");
    expect(compose).toContain("image: quay.io/minio/mc:RELEASE.2025-01-17T23-25-50Z");
    expect(compose).toContain("image: ${PURESOC_CLAMAV_IMAGE:-clamav/clamav:1.4_base}");
    expect(compose).not.toContain("image: postgres:16-alpine");
    expect(compose).not.toContain("image: redis:7-alpine");
    expect(compose).not.toContain("image: minio/minio:");
    expect(compose).not.toContain("image: minio/mc:");
  });

  it("keeps the optional build override wired to the service Dockerfiles", () => {
    const compose = readWorkspaceFile("compose.yml");
    const buildCompose = readWorkspaceFile("infra/compose", "docker-compose.build.yml");

    for (const [dockerfile] of dockerfiles) {
      expect(compose).toContain(`dockerfile: infra/docker/${dockerfile}`);
      expect(buildCompose).toContain(`dockerfile: infra/docker/${dockerfile}`);
    }
  });

  it("keeps deployment Compose self-contained while making live Microsoft optional", () => {
    const compose = readWorkspaceFile("compose.yml");
    const requiredInterpolation = compose.replaceAll("$${", "").match(/\$\{[^}:]+:\?/g) ?? [];
    const optionalInputs = [
      "PURESOC_APP_ENV",
      "PURESOC_AUTH_COOKIE_SECURE",
      "PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION",
      "PURESOC_WEB_DEFAULT_LOCALE",
      "PURESOC_CONNECTOR_MICROSOFT365_MODE",
      "PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID",
      "PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET",
      "PURESOC_PROVIDER_TOKEN_KEY_ID",
      "PURESOC_PROVIDER_TOKEN_KEY"
    ];
    const removedInputs = [
      "DATABASE_URL",
      "PURESOC_PUBLIC_BASE_URL",
      "PURESOC_WEB_PUBLIC_BASE_URL",
      "PURESOC_CONNECTOR_MICROSOFT365_REDIRECT_URI",
      "PURESOC_POSTGRES_PASSWORD",
      "PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID",
      "PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY",
      "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS",
      "PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND",
      "PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "PURESOC_NOTIFICATIONS_SMTP_PASSWORD",
      "PURESOC_REDIS_URL"
    ];

    expect(requiredInterpolation).toEqual([]);
    for (const inputName of optionalInputs) {
      expect(compose).toContain(`\${${inputName}:-`);
    }
    for (const inputName of removedInputs) {
      expect(compose).not.toContain(`\${${inputName}`);
    }
    expect(compose).toContain("DATABASE_URL: *puresoc-database-url");
    expect(compose).toContain("PURESOC_APP_ENV: ${PURESOC_APP_ENV:-development}");
    expect(compose).toContain("PURESOC_AUTH_COOKIE_SECURE: ${PURESOC_AUTH_COOKIE_SECURE:-false}");
    expect(compose).toContain(
      "PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: ${PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION:-false}"
    );
    expect(compose).toContain("PURESOC_WEB_DEFAULT_LOCALE: ${PURESOC_WEB_DEFAULT_LOCALE:-ro-RO}");
    expect(compose).toContain("POSTGRES_DB: puresoc");
    expect(compose).toContain("puresoc-postgres-bootstrap");
    expect(compose).toContain("CREATE DATABASE puresoc OWNER puresoc_admin");
    expect(compose).toContain("ALTER SCHEMA public OWNER TO puresoc_admin");
    expect(compose).toContain("ensure_canonical_database 'puresoc' puresoc");
    expect(compose.indexOf("ensure_canonical_database 'puresoc' puresoc")).toBeLessThan(
      compose.indexOf("ensure_canonical_database 'puresoc-local-postgres-password' puresoc_admin")
    );
    expect(compose).toContain("PURESOC_API_TRUSTED_ORIGINS: http://puresoc-web:3000");
    expect(compose).toContain("PURESOC_CONNECTOR_MICROSOFT365_MODE: ${PURESOC_CONNECTOR_MICROSOFT365_MODE:-auto}");
    expect(compose).toContain("PURESOC_CONNECTOR_MICROSOFT365_WRITE_SCOPES_ALLOWED: \"false\"");
    const webService = readComposeServiceBlock(compose, "puresoc-web");
    const apiService = readComposeServiceBlock(compose, "puresoc-api");

    expect(webService).toContain("puresoc-api:\n        condition: service_healthy");
    expect(apiService).toContain('command: ["pnpm", "start:api"]');
    expect(apiService).toContain('PURESOC_API_SKIP_STARTUP_MIGRATIONS: "true"');
    expect(apiService).toContain('PORT: "3001"');
    expect(apiService).not.toContain("pnpm prisma:migrate:deploy && exec pnpm start:api");
    expect(compose).toContain("expose:");
    expect(compose).not.toContain("3001:3001");
  });

  it("keeps backend secrets out of the web service and customer tenant secrets out of Compose", () => {
    const compose = readWorkspaceFile("compose.yml");
    const webService = readComposeServiceBlock(compose, "puresoc-web");

    expect(webService).toContain("PURESOC_AUTH_MICROSOFT_ENTRA_ENABLED");
    expect(webService).toContain("PURESOC_WEB_API_BASE_URL");
    expect(webService).toContain("PURESOC_WEB_API_REQUEST_ORIGIN");
    expect(webService).not.toContain("PURESOC_CONNECTOR_MICROSOFT365_REDIRECT_URI");
    expect(webService).not.toContain("CLIENT_SECRET");
    expect(webService).not.toContain("PURESOC_PROVIDER_TOKEN_KEY");
    expect(webService).not.toContain("STRIPE_SECRET_KEY");
    expect(webService).not.toContain("PURESOC_NOTIFICATIONS_SMTP_PASSWORD");
    expect(compose).not.toContain("MICROSOFT365_TENANT_ID");
    expect(compose).not.toContain("GLOBAL_ADMIN");
  });

  it("keeps deployment Compose runtime environment role-specific", () => {
    const compose = readWorkspaceFile("compose.yml");
    const environmentKeyCount = countComposeEnvironmentKeys(compose);
    const apiService = readComposeServiceBlock(compose, "puresoc-api");
    const workerService = readComposeServiceBlock(compose, "puresoc-worker");

    expect(environmentKeyCount).toBeLessThanOrEqual(120);
    expect(compose).toContain("x-puresoc-backend-base-environment");
    expect(compose).toContain("x-puresoc-microsoft365-connector-environment");
    expect(apiService).toContain("*puresoc-microsoft365-connector-environment");
    expect(apiService).toContain("*puresoc-object-storage-environment");
    expect(workerService).not.toContain("*puresoc-microsoft365-connector-environment");
    expect(workerService).not.toContain("*puresoc-object-storage-environment");
  });

  it("points job service scripts at runtime loops instead of contract-status reporters", () => {
    const manifest = JSON.parse(readWorkspaceFile("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts["start:worker"]).toBe("jiti apps/worker/src/main.ts");
    expect(manifest.scripts["start:scheduler"]).toBe("jiti apps/scheduler/src/main.ts");
    expect(manifest.scripts["start:connector-runner"]).toBe("jiti apps/connector-runner/src/main.ts");
    expect(Object.values(manifest.scripts).join("\n")).not.toContain("runtime-status.ts");
  });
});

const readWorkspaceFile = (...pathSegments: string[]): string =>
  readFileSync(join(process.cwd(), ...pathSegments), "utf8");

const readComposeServiceBlock = (compose: string, serviceName: string): string => {
  const lines = compose.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${serviceName}:`);
  if (start === -1) {
    throw new Error(`Service not found in Compose file: ${serviceName}`);
  }

  const end = lines.findIndex(
    (line, index) => index > start && (/^  [a-z0-9-]+:/.test(line) || /^[a-z][a-z0-9_-]*:/.test(line))
  );

  return lines.slice(start, end === -1 ? undefined : end).join("\n");
};

const countComposeEnvironmentKeys = (compose: string): number => {
  let count = 0;
  let environmentIndent: number | null = null;

  for (const line of compose.split(/\r?\n/)) {
    const environmentMatch = /^(\s*)environment:\s*$/.exec(line);
    if (environmentMatch) {
      environmentIndent = environmentMatch[1].length;
      continue;
    }

    if (environmentIndent === null || line.trim().length === 0 || line.trim().startsWith("#")) {
      continue;
    }

    const indent = line.length - line.trimStart().length;
    if (indent <= environmentIndent) {
      environmentIndent = null;
      continue;
    }

    const trimmed = line.trim();
    if (/^[A-Z0-9_]+:/.test(trimmed)) {
      count += 1;
    }
  }

  return count;
};
