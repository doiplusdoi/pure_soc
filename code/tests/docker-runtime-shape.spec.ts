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

  it("keeps the optional build override wired to the service Dockerfiles", () => {
    const compose = readWorkspaceFile("compose.yml");
    const buildCompose = readWorkspaceFile("infra/compose", "docker-compose.build.yml");

    for (const [dockerfile] of dockerfiles) {
      expect(compose).toContain(`dockerfile: infra/docker/${dockerfile}`);
      expect(buildCompose).toContain(`dockerfile: infra/docker/${dockerfile}`);
    }
  });

  it("exposes deployment secrets through Compose source interpolation", () => {
    const compose = readWorkspaceFile("compose.yml");
    const composeInterpolation = compose.replaceAll("$${", "").match(/\$\{/g) ?? [];
    const expectedInputs = [
      "DATABASE_URL",
      "PURESOC_POSTGRES_PASSWORD",
      "PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID",
      "PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY",
      "PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID",
      "PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET",
      "PURESOC_PROVIDER_TOKEN_KEY_ID",
      "PURESOC_PROVIDER_TOKEN_KEY",
      "PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "PURESOC_NOTIFICATIONS_SMTP_PASSWORD",
      "PURESOC_REDIS_URL"
    ];

    expect(composeInterpolation.length).toBeGreaterThanOrEqual(expectedInputs.length);
    for (const inputName of expectedInputs) {
      expect(compose).toContain(`\${${inputName}`);
    }
    expect(compose).toContain("DATABASE_URL: *puresoc-database-url");
    expect(compose).toContain("POSTGRES_PASSWORD: ${PURESOC_POSTGRES_PASSWORD:-");
    expect(compose).toContain("PURESOC_CONNECTOR_MICROSOFT365_WRITE_SCOPES_ALLOWED: ${PURESOC_CONNECTOR_MICROSOFT365_WRITE_SCOPES_ALLOWED:-false}");
  });

  it("keeps backend secrets out of the web service and customer tenant secrets out of Compose", () => {
    const compose = readWorkspaceFile("compose.yml");
    const webService = readComposeServiceBlock(compose, "puresoc-web");

    expect(webService).toContain("PURESOC_AUTH_MICROSOFT_ENTRA_ENABLED");
    expect(webService).toContain("PURESOC_CONNECTOR_MICROSOFT365_REDIRECT_URI");
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
