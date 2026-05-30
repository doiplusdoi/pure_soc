import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { buildInternalReadinessCsvExport, stableJsonExport } from "./builders";
import type {
  EvidencePackageBundleFileSummary,
  EvidencePackageLimitSummary,
  InternalReadinessCsvExport,
  InternalReadinessEvidencePackageExport,
  InternalReadinessEvidencePackageManifest,
  InternalReadinessReport,
  ReportEvidenceSummary
} from "./report.types";

export const INTERNAL_READINESS_EVIDENCE_PACKAGE_MIME_TYPE = "application/x-tar";

export const DEFAULT_INTERNAL_READINESS_EVIDENCE_PACKAGE_LIMITS: EvidencePackageLimitSummary = {
  maxEvidenceFiles: 250,
  maxEvidenceFileBytes: 10 * 1024 * 1024,
  maxBundleBytes: 50 * 1024 * 1024
};

export type ReportExportErrorCode =
  | "evidence_package_too_many_evidence_files"
  | "evidence_package_evidence_file_too_large"
  | "evidence_package_bundle_too_large";

export class ReportExportError extends Error {
  readonly code: ReportExportErrorCode;
  readonly statusCode: number;

  constructor(code: ReportExportErrorCode, message: string, statusCode = 413) {
    super(message);
    this.name = "ReportExportError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface EvidencePackageEvidenceFileInput {
  artifactId: string;
  title: string;
  mimeType: string;
  body: Uint8Array | string;
  contentHashSha256?: string;
}

export interface BuildInternalReadinessEvidencePackageInput {
  report: InternalReadinessReport;
  reportJson?: string;
  csvExport?: InternalReadinessCsvExport;
  evidenceFiles?: readonly EvidencePackageEvidenceFileInput[];
  limits?: EvidencePackageLimitConfig;
}

export interface EvidencePackageLimitConfig {
  maxEvidenceFiles?: number;
  maxEvidenceFileBytes?: number;
  maxBundleBytes?: number;
}

interface TarFileInput {
  path: string;
  role: EvidencePackageBundleFileSummary["role"];
  mimeType: string;
  body: Uint8Array | string;
  evidenceArtifactId?: string;
}

const TAR_BLOCK_SIZE = 512;

export const buildInternalReadinessEvidencePackageExport = (
  input: BuildInternalReadinessEvidencePackageInput
): InternalReadinessEvidencePackageExport => {
  const limits = normalizeEvidencePackageLimits(input.limits);
  assertEvidenceFileCount(input.report.evidence.length, limits);
  const reportJson = input.reportJson ?? stableJsonExport(input.report);
  const csvExport = input.csvExport ?? buildInternalReadinessCsvExport(input.report);
  const evidenceFiles = normalizeEvidenceFiles(input.report.evidence, input.evidenceFiles ?? [], limits);
  const packageFiles: TarFileInput[] = [
    {
      path: "reports/internal-readiness.json",
      role: "report_json" as const,
      mimeType: "application/json",
      body: reportJson
    },
    {
      path: "reports/internal-readiness.csv",
      role: "report_csv" as const,
      mimeType: "text/csv",
      body: csvExport.csv
    },
    ...evidenceFiles
  ].sort((left, right) => left.path.localeCompare(right.path));
  const fileSummaries = packageFiles.map(summarizeBundleFile);
  const manifest = stripUndefined({
    schemaVersion: "puresoc.export.internal_readiness_evidence_package_manifest.v1",
    organizationId: input.report.organizationId,
    assessmentId: input.report.assessmentId,
    jurisdiction: input.report.jurisdiction,
    reportType: "evidence_package",
    exportFormat: "binary_evidence_package",
    generatedAt: input.report.generatedAt,
    legalCaveat: input.report.legalCaveat,
    legalCaveatFallbackReason: input.report.legalCaveatFallbackReason,
    legalCaveatFallbackUsed: input.report.legalCaveatFallbackUsed,
    legalCaveatLocale: input.report.legalCaveatLocale,
    legalCaveatMessageKey: input.report.legalCaveatMessageKey,
    legalCaveatRequestedLocale: input.report.legalCaveatRequestedLocale,
    legalCaveatReviewStatus: input.report.legalCaveatReviewStatus,
    locale: input.report.locale,
    sourceReferences: input.report.sourceReferences,
    exportLimits: limits,
    files: fileSummaries,
    evidenceArtifacts: input.report.evidence,
    provenance: {
      source: "stored_analysis",
      internalReadinessReportSchemaVersion: input.report.schemaVersion
    }
  }) as InternalReadinessEvidencePackageManifest;
  const manifestJson = stableJsonExport(manifest);
  const bundleFiles: TarFileInput[] = [
    {
      path: "manifest.json",
      role: "manifest" as const,
      mimeType: "application/json",
      body: manifestJson
    },
    ...packageFiles
  ];
  const bundle = createStableTar(bundleFiles);
  assertBundleSize(bundle.byteLength, limits);

  return {
    schemaVersion: "puresoc.export.internal_readiness_evidence_package.v1",
    organizationId: input.report.organizationId,
    assessmentId: input.report.assessmentId,
    jurisdiction: input.report.jurisdiction,
    reportType: "evidence_package",
    exportFormat: "binary_evidence_package",
    generatedAt: input.report.generatedAt,
    mimeType: INTERNAL_READINESS_EVIDENCE_PACKAGE_MIME_TYPE,
    fileName: `puresoc-internal-readiness-${safePathSegment(input.report.assessmentId)}.tar`,
    sizeBytes: bundle.byteLength,
    contentHashSha256: sha256(bundle),
    manifest,
    manifestJson,
    bundle
  };
};

export const normalizeEvidencePackageLimits = (
  limits: EvidencePackageLimitConfig | undefined
): EvidencePackageLimitSummary => ({
  maxEvidenceFiles: positiveIntegerOrDefault(
    limits?.maxEvidenceFiles,
    DEFAULT_INTERNAL_READINESS_EVIDENCE_PACKAGE_LIMITS.maxEvidenceFiles
  ),
  maxEvidenceFileBytes: positiveIntegerOrDefault(
    limits?.maxEvidenceFileBytes,
    DEFAULT_INTERNAL_READINESS_EVIDENCE_PACKAGE_LIMITS.maxEvidenceFileBytes
  ),
  maxBundleBytes: positiveIntegerOrDefault(
    limits?.maxBundleBytes,
    DEFAULT_INTERNAL_READINESS_EVIDENCE_PACKAGE_LIMITS.maxBundleBytes
  )
});

const createStableTar = (files: readonly TarFileInput[]): Uint8Array => {
  const chunks: Buffer[] = [];

  for (const file of files) {
    const body = toBuffer(file.body);
    chunks.push(createTarHeader(file.path, body.byteLength));
    chunks.push(body);

    const padding = body.byteLength % TAR_BLOCK_SIZE;
    if (padding > 0) {
      chunks.push(Buffer.alloc(TAR_BLOCK_SIZE - padding));
    }
  }

  chunks.push(Buffer.alloc(TAR_BLOCK_SIZE));
  chunks.push(Buffer.alloc(TAR_BLOCK_SIZE));

  return Buffer.concat(chunks);
};

const normalizeEvidenceFiles = (
  evidenceArtifacts: readonly ReportEvidenceSummary[],
  evidenceFiles: readonly EvidencePackageEvidenceFileInput[],
  limits: EvidencePackageLimitSummary
): TarFileInput[] => {
  const artifactsById = new Map(evidenceArtifacts.map((artifact) => [artifact.id, artifact]));

  return evidenceFiles
    .map((file): TarFileInput => {
      const artifact = artifactsById.get(file.artifactId);
      if (!artifact) {
        throw new Error(`Evidence package file ${file.artifactId} is not part of the internal readiness report.`);
      }

      const body = toBuffer(file.body);
      assertEvidenceFileSize(file.artifactId, body.byteLength, limits);
      const contentHashSha256 = sha256(body);
      const expectedHash = file.contentHashSha256 ?? artifact.contentHashSha256;
      if (expectedHash && expectedHash !== contentHashSha256) {
        throw new Error(`Evidence package file ${file.artifactId} content hash does not match its metadata.`);
      }

      return {
        path: evidenceFilePath(artifact),
        role: "evidence_artifact",
        mimeType: file.mimeType || artifact.mimeType,
        body,
        evidenceArtifactId: artifact.id
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
};

const positiveIntegerOrDefault = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;

const assertEvidenceFileCount = (evidenceFileCount: number, limits: EvidencePackageLimitSummary): void => {
  if (evidenceFileCount > limits.maxEvidenceFiles) {
    throw new ReportExportError(
      "evidence_package_too_many_evidence_files",
      `Evidence package includes ${evidenceFileCount} evidence files, exceeding the configured maximum of ${limits.maxEvidenceFiles}.`
    );
  }
};

const assertEvidenceFileSize = (
  artifactId: string,
  sizeBytes: number,
  limits: EvidencePackageLimitSummary
): void => {
  if (sizeBytes > limits.maxEvidenceFileBytes) {
    throw new ReportExportError(
      "evidence_package_evidence_file_too_large",
      `Evidence package file ${artifactId} is ${sizeBytes} bytes, exceeding the configured maximum of ${limits.maxEvidenceFileBytes} bytes.`
    );
  }
};

const assertBundleSize = (sizeBytes: number, limits: EvidencePackageLimitSummary): void => {
  if (sizeBytes > limits.maxBundleBytes) {
    throw new ReportExportError(
      "evidence_package_bundle_too_large",
      `Evidence package bundle is ${sizeBytes} bytes, exceeding the configured maximum of ${limits.maxBundleBytes} bytes.`
    );
  }
};

const evidenceFilePath = (artifact: ReportEvidenceSummary): string => {
  const title = safePathSegment(artifact.title || "evidence");
  const extension = extensionForMimeType(artifact.mimeType);
  const prefix = `evidence/${safePathSegment(artifact.id)}`;
  const maxTitleLength = Math.max(12, 95 - prefix.length - extension.length);

  return `${prefix}-${title.slice(0, maxTitleLength)}${extension}`;
};

const summarizeBundleFile = (file: TarFileInput): EvidencePackageBundleFileSummary => {
  const body = toBuffer(file.body);

  return stripUndefined({
    path: file.path,
    role: file.role,
    mimeType: file.mimeType,
    sizeBytes: body.byteLength,
    contentHashSha256: sha256(body),
    evidenceArtifactId: file.evidenceArtifactId
  }) as EvidencePackageBundleFileSummary;
};

const createTarHeader = (path: string, sizeBytes: number): Buffer => {
  if (Buffer.byteLength(path, "utf8") > 100) {
    throw new Error(`Evidence package tar path is too long: ${path}`);
  }

  const header = Buffer.alloc(TAR_BLOCK_SIZE);
  header.write(path, 0, 100, "utf8");
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, sizeBytes);
  writeOctal(header, 136, 12, 0);
  header.fill(" ", 148, 156);
  header.write("0", 156, 1, "ascii");
  header.write("ustar", 257, 5, "ascii");
  header[262] = 0;
  header.write("00", 263, 2, "ascii");
  header.write("puresoc", 265, 32, "ascii");
  header.write("puresoc", 297, 32, "ascii");

  const checksum = [...header].reduce((sum, byte) => sum + byte, 0);
  const checksumText = checksum.toString(8).padStart(6, "0");
  header.write(`${checksumText}\0 `, 148, 8, "ascii");

  return header;
};

const writeOctal = (header: Buffer, offset: number, length: number, value: number): void => {
  const text = value.toString(8).padStart(length - 1, "0");
  header.write(`${text}\0`, offset, length, "ascii");
};

const toBuffer = (body: Uint8Array | string): Buffer => (typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(body));

const sha256 = (body: Uint8Array): string => createHash("sha256").update(body).digest("hex");

const safePathSegment = (value: string): string => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return cleaned || "item";
};

const extensionForMimeType = (mimeType: string): string => {
  if (mimeType === "application/pdf") {
    return ".pdf";
  }
  if (mimeType === "application/json") {
    return ".json";
  }
  if (mimeType === "text/csv") {
    return ".csv";
  }
  if (mimeType.startsWith("text/")) {
    return ".txt";
  }

  return ".bin";
};

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
