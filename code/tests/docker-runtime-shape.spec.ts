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

const runtimeComposeFiles = [
  "docker-compose.yml",
  "docker-compose.webservices.yml",
  "docker-compose.jobs.yml",
  "docker-compose.connectors.yml",
  "docker-compose.reports.yml",
  "docker-compose.config.yml"
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

  it("keeps runtime compose catalogs image-only", () => {
    for (const composeFile of runtimeComposeFiles) {
      const compose = readWorkspaceFile("infra/compose", composeFile);

      expect(compose, composeFile).not.toContain("build:");
    }
  });

  it("keeps the optional build override wired to the service Dockerfiles", () => {
    const compose = readWorkspaceFile("infra/compose", "docker-compose.yml");
    const buildCompose = readWorkspaceFile("infra/compose", "docker-compose.build.yml");

    for (const [dockerfile] of dockerfiles) {
      expect(compose).not.toContain(`dockerfile: infra/docker/${dockerfile}`);
      expect(buildCompose).toContain(`dockerfile: infra/docker/${dockerfile}`);
    }
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
