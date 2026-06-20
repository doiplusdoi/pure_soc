import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

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
  "packages/jobs",
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
  "compose.yml",
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
  "config/defaults/notifications.json",
  "config/defaults/audit.json",
  "config/defaults/storage.json",
  "config/defaults/billing.json",
  "config/defaults/jobs.json",
  "data/regulatory/countries/member-states.seed.json"
]) {
  JSON.parse(readFileSync(join(process.cwd(), file), "utf8"));
}

const skippedDirectories = new Set(["node_modules", "dist", "build", ".git"]);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const isInside = (root, path) => {
  const pathRelativeToRoot = relative(root, path);
  return pathRelativeToRoot === "" || (!pathRelativeToRoot.startsWith("..") && !pathRelativeToRoot.split(sep).includes(".."));
};

const collectWorkspacePackages = (workspaceRoot) => {
  const rootPackage = {
    root: workspaceRoot,
    manifest: readJson(join(workspaceRoot, "package.json"))
  };
  const packages = [rootPackage];

  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (skippedDirectories.has(entry.name)) {
        continue;
      }

      const fullPath = join(directory, entry.name);
      if (!entry.isDirectory()) {
        continue;
      }

      const manifestPath = join(fullPath, "package.json");
      if (existsSync(manifestPath)) {
        packages.push({
          root: fullPath,
          manifest: readJson(manifestPath)
        });
      }

      walk(fullPath);
    }
  };

  for (const workspaceDirectory of ["apps", "packages"]) {
    walk(join(workspaceRoot, workspaceDirectory));
  }

  return packages.sort((left, right) => right.root.length - left.root.length);
};

const collectTypeScriptFiles = (workspaceRoot) => {
  const files = [];

  const walk = (directory) => {
    if (!existsSync(directory)) {
      return;
    }

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (skippedDirectories.has(entry.name)) {
        continue;
      }

      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        files.push({
          path: fullPath,
          source: readFileSync(fullPath, "utf8")
        });
      }
    }
  };

  for (const sourceRoot of ["apps", "packages", "tests"]) {
    walk(join(workspaceRoot, sourceRoot));
  }

  return files;
};

const importPattern =
  /(\b(?:import|export)\s+(?:type\s+)?(?:[^"'();]*?\s+from\s+)?["'])([^"']+)(["'])|(\bimport\s*\(\s*["'])([^"']+)(["']\s*\))/gs;

const importSpecifiers = (source) =>
  [...source.matchAll(importPattern)].map((match) => match[2] ?? match[5]).filter(Boolean);

const packageNameFromSpecifier = (specifier) => {
  if (!specifier.startsWith("@")) {
    return specifier.split("/")[0];
  }

  const [scope, name] = specifier.split("/");
  return name ? `${scope}/${name}` : specifier;
};

const hasDeclaredDependency = (manifest, packageName) =>
  Boolean(
    manifest.dependencies?.[packageName] ||
      manifest.devDependencies?.[packageName] ||
      manifest.peerDependencies?.[packageName] ||
      manifest.optionalDependencies?.[packageName]
  );

const findImportBoundaryViolations = ({ files, packageRoots }) => {
  const packageByName = new Map(packageRoots.map((entry) => [entry.manifest.name, entry]));
  const packageForPath = (path) => packageRoots.find((entry) => isInside(entry.root, path));
  const violations = [];

  for (const file of files) {
    const currentPackage = packageForPath(file.path);

    for (const specifier of importSpecifiers(file.source)) {
      if (specifier.startsWith(".")) {
        const resolvedSpecifier = resolve(dirname(file.path), specifier);
        const targetPackage = packageForPath(resolvedSpecifier);

        if (currentPackage && targetPackage && currentPackage.root !== targetPackage.root) {
          violations.push({
            kind: "cross-package-relative",
            file: file.path,
            specifier,
            message: `Use ${targetPackage.manifest.name} instead of a deep relative import.`
          });
        }

        continue;
      }

      if (!specifier.startsWith("@puresoc/")) {
        continue;
      }

      const packageName = packageNameFromSpecifier(specifier);
      const targetPackage = packageByName.get(packageName);

      if (!targetPackage) {
        violations.push({
          kind: "unknown-workspace-package",
          file: file.path,
          specifier,
          message: "Imported @puresoc package is not declared in this workspace."
        });
        continue;
      }

      if (specifier !== packageName) {
        violations.push({
          kind: "deep-package-import",
          file: file.path,
          specifier,
          message: `Use the ${packageName} package export root instead of a deep package path.`
        });
      }

      if (
        currentPackage &&
        currentPackage.manifest.name !== packageName &&
        !hasDeclaredDependency(currentPackage.manifest, packageName)
      ) {
        violations.push({
          kind: "missing-workspace-dependency",
          file: file.path,
          specifier,
          message: `${currentPackage.manifest.name} must declare ${packageName} in package.json.`
        });
      }
    }
  }

  return violations;
};

const runImportPolicySelfTest = () => {
  const packageRoots = [
    {
      root: "/workspace",
      manifest: {
        name: "@puresoc/workspace",
        devDependencies: {}
      }
    },
    {
      root: "/workspace/apps/api",
      manifest: {
        name: "@puresoc/api",
        dependencies: {}
      }
    },
    {
      root: "/workspace/packages/shared",
      manifest: {
        name: "@puresoc/shared"
      }
    }
  ];
  const files = [
    {
      path: "/workspace/apps/api/src/deep-relative.ts",
      source: 'import { requiredServiceNames } from "../../../packages/shared/src/index";'
    },
    {
      path: "/workspace/apps/api/src/deep-package.ts",
      source: 'import { requiredServiceNames } from "@puresoc/shared/src/index";'
    },
    {
      path: "/workspace/apps/api/src/missing-dependency.ts",
      source: 'import { requiredServiceNames } from "@puresoc/shared";'
    }
  ];
  const kinds = new Set(
    findImportBoundaryViolations({
      files,
      packageRoots: packageRoots.sort((left, right) => right.root.length - left.root.length)
    }).map((violation) => violation.kind)
  );

  for (const expectedKind of ["cross-package-relative", "deep-package-import", "missing-workspace-dependency"]) {
    if (!kinds.has(expectedKind)) {
      throw new Error(`Import boundary self-test did not detect ${expectedKind}.`);
    }
  }
};

runImportPolicySelfTest();

const importBoundaryViolations = findImportBoundaryViolations({
  files: collectTypeScriptFiles(process.cwd()),
  packageRoots: collectWorkspacePackages(process.cwd())
});

if (importBoundaryViolations.length > 0) {
  console.error(
    [
      "Workspace import boundary violations:",
      ...importBoundaryViolations.map(
        (violation) =>
          `- ${relative(process.cwd(), violation.file)} imports ${violation.specifier}: ${violation.message}`
      )
    ].join("\n")
  );
  process.exit(1);
}

console.log("PureSOC workspace layout looks coherent.");
