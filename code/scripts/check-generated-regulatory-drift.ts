import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { importRoNis2Workbook, stableStringify } from "../apps/regulatory-importer/src/index";

export interface GeneratedDataDriftIssue {
  actualHash?: string;
  artifactPath: string;
  expectedHash: string;
  kind: "missing_artifact" | "content_mismatch";
  message: string;
}

export interface GeneratedDataDriftResult {
  checkedArtifacts: number;
  issues: GeneratedDataDriftIssue[];
  valid: boolean;
}

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

export const compareGeneratedArtifactText = (input: {
  actualText?: string;
  artifactPath: string;
  expectedText: string;
}): GeneratedDataDriftIssue | null => {
  if (input.actualText === undefined) {
    return {
      artifactPath: input.artifactPath,
      expectedHash: sha256(input.expectedText),
      kind: "missing_artifact",
      message: `${input.artifactPath} is missing; regenerate Romania NIS2 artifacts from the workbook.`
    };
  }

  if (input.actualText !== input.expectedText) {
    return {
      actualHash: sha256(input.actualText),
      artifactPath: input.artifactPath,
      expectedHash: sha256(input.expectedText),
      kind: "content_mismatch",
      message: `${input.artifactPath} does not match deterministic importer output.`
    };
  }

  return null;
};

export const checkRoNis2GeneratedDataDrift = (input: {
  workspaceRoot?: string;
  workbookPath?: string;
} = {}): GeneratedDataDriftResult => {
  const workspaceRoot = input.workspaceRoot ?? process.cwd();
  const outputDirectory = join(workspaceRoot, "data/regulatory/countries/ro");
  const workbookPath = input.workbookPath ?? join(outputDirectory, "nis2ro-tool-v-2-1.xlsx");
  const artifacts = importRoNis2Workbook({ workbookPath });
  const expectedArtifacts = [
    {
      artifactPath: join(outputDirectory, "ro-nis2.seed.generated.json"),
      expectedText: stableStringify(artifacts.seed)
    },
    {
      artifactPath: join(outputDirectory, "ro-nis2-source-map.generated.json"),
      expectedText: stableStringify(artifacts.sourceMap)
    }
  ];

  const issues = expectedArtifacts
    .map((artifact) =>
      compareGeneratedArtifactText({
        ...artifact,
        actualText: existsSync(artifact.artifactPath) ? readFileSync(artifact.artifactPath, "utf8") : undefined
      })
    )
    .filter((issue): issue is GeneratedDataDriftIssue => issue !== null);

  return {
    checkedArtifacts: expectedArtifacts.length,
    issues,
    valid: issues.length === 0
  };
};

export const formatGeneratedDataDriftResult = (result: GeneratedDataDriftResult): string => {
  if (result.valid) {
    return `Romania generated regulatory drift check passed (${result.checkedArtifacts} artifacts).`;
  }

  return [
    `Romania generated regulatory drift check failed (${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}):`,
    ...result.issues.map((issue) => {
      const hashDetail = issue.actualHash
        ? ` expected sha256 ${issue.expectedHash}, found ${issue.actualHash}`
        : ` expected sha256 ${issue.expectedHash}`;
      return `- ${issue.message}${hashDetail}.`;
    })
  ].join("\n");
};

const isDirectRun = (): boolean => {
  const executedPath = process.argv[1];
  return executedPath ? pathToFileURL(executedPath).href === import.meta.url : false;
};

if (isDirectRun()) {
  const result = checkRoNis2GeneratedDataDrift();
  const formatted = formatGeneratedDataDriftResult(result);
  if (result.valid) {
    console.log(formatted);
  } else {
    console.error(formatted);
    process.exit(1);
  }
}
