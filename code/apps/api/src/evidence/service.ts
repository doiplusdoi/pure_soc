import {
  EvidenceVault,
  InMemoryObjectStorageAdapter,
  NoopUploadScanner,
  type EvidenceAccessLogEntry,
  type EvidenceArtifactMetadata,
  type EvidenceDownloadResult,
  type EvidenceLink,
  type ObjectStorageAdapter,
  type EvidenceRepository,
  type EvidenceSourceType,
  type EvidenceUploadInput,
  type UploadScanningHook
} from "@puresoc/evidence";
import type { AuditWriter } from "@puresoc/audit";

export interface EvidenceApiServiceOptions {
  repository: EvidenceRepository;
  auditWriter: AuditWriter;
  storage?: ObjectStorageAdapter;
  scanner?: UploadScanningHook;
  rejectUnscannedUploads?: boolean;
  now?: () => Date;
}

export type EvidenceArtifactApiView = Omit<EvidenceArtifactMetadata, "storageUri">;

export const evidenceArtifactApiView = (artifact: EvidenceArtifactMetadata): EvidenceArtifactApiView => {
  const { storageUri, ...safeArtifact } = artifact;
  void storageUri;
  return safeArtifact;
};

export interface EvidenceUploadApiInput {
  organizationId: string;
  actorUserId: string;
  title: string;
  content: string;
  contentEncoding?: "utf8" | "base64";
  mimeType: string;
  sourceType: EvidenceSourceType;
  sourceProvider?: string;
  providerConnectionId?: string;
  manualSourceLabel?: string;
  controlId?: string;
  jurisdiction?: string;
  requirementKey?: string;
  linkedAssessmentId?: string;
  linkedSourceRecordId?: string;
  links?: Array<Omit<EvidenceLink, "id" | "organizationId" | "evidenceArtifactId" | "createdAt">>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class EvidenceApiService {
  private readonly vault: EvidenceVault;
  private readonly auditWriter: AuditWriter;

  constructor(options: EvidenceApiServiceOptions) {
    this.auditWriter = options.auditWriter;
    this.vault = new EvidenceVault({
      repository: options.repository,
      storage: options.storage ?? new InMemoryObjectStorageAdapter(),
      scanner: options.scanner ?? new NoopUploadScanner({ now: options.now }),
      now: options.now,
      rejectUnscannedUploads: options.rejectUnscannedUploads
    });
  }

  async upload(input: EvidenceUploadApiInput): Promise<{ artifact: EvidenceArtifactMetadata }> {
    const artifact = await this.vault.uploadEvidence({
      ...input,
      body: decodeContent(input.content, input.contentEncoding)
    } satisfies EvidenceUploadInput);

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "evidence_artifact",
      targetId: artifact.id,
      action: "evidence_uploaded",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        title: artifact.title,
        sourceType: artifact.sourceType,
        controlId: artifact.controlId,
        jurisdiction: artifact.jurisdiction,
        scanStatus: artifact.scanStatus,
        scannerName: artifact.scanScannerName
      }
    });

    return { artifact };
  }

  async download(input: {
    organizationId: string;
    actorUserId: string;
    evidenceArtifactId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<EvidenceDownloadResult> {
    const result = await this.vault.downloadEvidence(input);

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "evidence_artifact",
      targetId: result.artifact.id,
      action: "evidence_downloaded",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        title: result.artifact.title,
        contentHashSha256: result.contentHashSha256
      }
    });

    return result;
  }

  list(organizationId: string): Promise<EvidenceArtifactMetadata[]> {
    return this.vault.listEvidence(organizationId);
  }

  listAccessLogs(organizationId: string, evidenceArtifactId?: string): Promise<EvidenceAccessLogEntry[]> {
    return this.vault.listAccessLogs(organizationId, evidenceArtifactId);
  }
}

const decodeContent = (content: string, encoding: "utf8" | "base64" = "utf8"): Uint8Array =>
  Buffer.from(content, encoding);
