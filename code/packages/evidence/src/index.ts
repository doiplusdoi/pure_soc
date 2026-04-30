import { createHash, randomUUID } from "node:crypto";

export type EvidenceSourceType =
  | "provider_snapshot"
  | "manual_upload"
  | "generated_report"
  | "signed_document"
  | "checklist_completion"
  | "action_pre_state"
  | "action_post_state"
  | "audit_log_export"
  | "policy_document"
  | "risk_acceptance"
  | "regulatory_source_snapshot"
  | "country_registration_draft"
  | "incident_reporting_draft";

export type EvidenceScanStatus = "pending" | "clean" | "infected" | "failed" | "skipped";

export type EvidenceAccessAction = "download" | "export";

export type EvidenceLinkTargetType =
  | "control"
  | "jurisdiction"
  | "regulatory_source"
  | "assessment"
  | "provider_sync_run"
  | "checklist_run"
  | "action_run"
  | "report"
  | "notification_draft";

export interface EvidenceLink {
  id: string;
  organizationId: string;
  evidenceArtifactId: string;
  targetType: EvidenceLinkTargetType;
  targetId: string;
  relation: string;
  createdAt: string;
}

export interface EvidenceArtifactMetadata {
  id: string;
  organizationId: string;
  controlId?: string;
  jurisdiction?: string;
  sourceType: EvidenceSourceType;
  sourceProvider?: string;
  providerConnectionId?: string;
  manualSourceLabel?: string;
  title: string;
  description?: string;
  storageUri: string;
  contentHashSha256: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: EvidenceScanStatus;
  createdBy?: string;
  createdAt: string;
  validFrom?: string;
  validUntil?: string;
  linkedAssessmentId?: string;
  linkedActionId?: string;
  linkedSourceRecordId?: string;
  exportGroupKey?: string;
  retentionPolicy?: string;
  retentionExpiresAt?: string;
  links: EvidenceLink[];
}

export interface EvidenceAccessLogEntry {
  id: string;
  organizationId: string;
  evidenceArtifactId: string;
  actorUserId?: string;
  action: EvidenceAccessAction;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface ObjectStoragePutInput {
  organizationId: string;
  objectKey: string;
  body: Uint8Array;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface ObjectStorageGetInput {
  organizationId: string;
  storageUri: string;
}

export interface ObjectStoragePutResult {
  storageUri: string;
  sizeBytes: number;
}

export interface ObjectStorageReadResult {
  storageUri: string;
  body: Uint8Array;
  mimeType?: string;
}

export interface ObjectStorageAdapter {
  putObject(input: ObjectStoragePutInput): Promise<ObjectStoragePutResult>;
  readObject(input: ObjectStorageGetInput): Promise<ObjectStorageReadResult>;
}

export interface UploadScanInput {
  organizationId: string;
  objectKey: string;
  body: Uint8Array;
  mimeType: string;
}

export interface UploadScanResult {
  status: EvidenceScanStatus;
  scannerName: string;
  scannedAt: string;
  findings: string[];
}

export interface UploadScanningHook {
  scan(input: UploadScanInput): Promise<UploadScanResult>;
}

export interface EvidenceRepository {
  saveArtifact(artifact: EvidenceArtifactMetadata): Promise<EvidenceArtifactMetadata>;
  findArtifactById(id: string): Promise<EvidenceArtifactMetadata | null>;
  listArtifacts(organizationId: string): Promise<EvidenceArtifactMetadata[]>;
  saveAccessLog(entry: EvidenceAccessLogEntry): Promise<EvidenceAccessLogEntry>;
  listAccessLogs(organizationId: string, evidenceArtifactId?: string): Promise<EvidenceAccessLogEntry[]>;
}

export interface EvidenceUploadInput {
  organizationId: string;
  actorUserId: string;
  title: string;
  description?: string;
  body: Uint8Array | string;
  mimeType: string;
  sourceType: EvidenceSourceType;
  sourceProvider?: string;
  providerConnectionId?: string;
  manualSourceLabel?: string;
  controlId?: string;
  jurisdiction?: string;
  requirementKey?: string;
  validFrom?: string;
  validUntil?: string;
  linkedAssessmentId?: string;
  linkedActionId?: string;
  linkedSourceRecordId?: string;
  exportGroupKey?: string;
  retentionPolicy?: string;
  retentionExpiresAt?: string;
  links?: Array<Omit<EvidenceLink, "id" | "organizationId" | "evidenceArtifactId" | "createdAt">>;
}

export interface EvidenceDownloadInput {
  organizationId: string;
  actorUserId: string;
  evidenceArtifactId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface EvidenceDownloadResult {
  artifact: EvidenceArtifactMetadata;
  body: Uint8Array;
  mimeType: string;
  contentHashSha256: string;
  accessLog: EvidenceAccessLogEntry;
}

export class EvidenceAccessError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "EvidenceAccessError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NoopUploadScanner implements UploadScanningHook {
  private readonly now: () => Date;

  constructor(options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async scan(): Promise<UploadScanResult> {
    return {
      status: "skipped",
      scannerName: "noop-deferred-scanner",
      scannedAt: this.now().toISOString(),
      findings: []
    };
  }
}

export class InMemoryObjectStorageAdapter implements ObjectStorageAdapter {
  private readonly objects = new Map<string, ObjectStorageReadResult>();

  async putObject(input: ObjectStoragePutInput): Promise<ObjectStoragePutResult> {
    const storageUri = `object://evidence/${input.organizationId}/${input.objectKey}`;
    const body = new Uint8Array(input.body);
    this.objects.set(storageUri, {
      storageUri,
      body,
      mimeType: input.mimeType
    });

    return {
      storageUri,
      sizeBytes: body.byteLength
    };
  }

  async readObject(input: ObjectStorageGetInput): Promise<ObjectStorageReadResult> {
    const object = this.objects.get(input.storageUri);
    if (!object || !input.storageUri.startsWith(`object://evidence/${input.organizationId}/`)) {
      throw new EvidenceAccessError("evidence_not_found", "Evidence object was not found for this organization.", 404);
    }

    return {
      ...object,
      body: new Uint8Array(object.body)
    };
  }
}

export class InMemoryEvidenceRepository implements EvidenceRepository {
  readonly artifacts = new Map<string, EvidenceArtifactMetadata>();
  readonly accessLogs: EvidenceAccessLogEntry[] = [];

  async saveArtifact(artifact: EvidenceArtifactMetadata): Promise<EvidenceArtifactMetadata> {
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  async findArtifactById(id: string): Promise<EvidenceArtifactMetadata | null> {
    return this.artifacts.get(id) ?? null;
  }

  async listArtifacts(organizationId: string): Promise<EvidenceArtifactMetadata[]> {
    return [...this.artifacts.values()].filter((artifact) => artifact.organizationId === organizationId);
  }

  async saveAccessLog(entry: EvidenceAccessLogEntry): Promise<EvidenceAccessLogEntry> {
    this.accessLogs.push(entry);
    return entry;
  }

  async listAccessLogs(organizationId: string, evidenceArtifactId?: string): Promise<EvidenceAccessLogEntry[]> {
    return this.accessLogs.filter(
      (entry) =>
        entry.organizationId === organizationId &&
        (evidenceArtifactId === undefined || entry.evidenceArtifactId === evidenceArtifactId)
    );
  }
}

export class EvidenceVault {
  private readonly repository: EvidenceRepository;
  private readonly storage: ObjectStorageAdapter;
  private readonly scanner: UploadScanningHook;
  private readonly now: () => Date;

  constructor(options: {
    repository: EvidenceRepository;
    storage: ObjectStorageAdapter;
    scanner: UploadScanningHook;
    now?: () => Date;
  }) {
    this.repository = options.repository;
    this.storage = options.storage;
    this.scanner = options.scanner;
    this.now = options.now ?? (() => new Date());
  }

  async uploadEvidence(input: EvidenceUploadInput): Promise<EvidenceArtifactMetadata> {
    const body = normalizeBody(input.body);
    const now = this.now().toISOString();
    const evidenceId = randomUUID();
    const objectKey = `${evidenceId}/${sanitizeObjectName(input.title)}`;
    const scan = await this.scanner.scan({
      organizationId: input.organizationId,
      objectKey,
      body,
      mimeType: input.mimeType
    });

    if (scan.status === "infected") {
      throw new EvidenceAccessError("upload_rejected_by_scanner", "Evidence upload was rejected by the scanner.", 422);
    }

    const stored = await this.storage.putObject({
      organizationId: input.organizationId,
      objectKey,
      body,
      mimeType: input.mimeType,
      metadata: {
        evidenceId,
        contentHashSha256: sha256Hex(body)
      }
    });
    const baseLinks = buildDefaultLinks(input);
    const links = [...baseLinks, ...(input.links ?? [])].map((link) => ({
      ...link,
      id: randomUUID(),
      organizationId: input.organizationId,
      evidenceArtifactId: evidenceId,
      createdAt: now
    }));
    const artifact: EvidenceArtifactMetadata = {
      id: evidenceId,
      organizationId: input.organizationId,
      controlId: input.controlId,
      jurisdiction: input.jurisdiction,
      sourceType: input.sourceType,
      sourceProvider: input.sourceProvider,
      providerConnectionId: input.providerConnectionId,
      manualSourceLabel: input.manualSourceLabel,
      title: input.title,
      description: input.description,
      storageUri: stored.storageUri,
      contentHashSha256: sha256Hex(body),
      mimeType: input.mimeType,
      sizeBytes: stored.sizeBytes,
      scanStatus: scan.status,
      createdBy: input.actorUserId,
      createdAt: now,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      linkedAssessmentId: input.linkedAssessmentId,
      linkedActionId: input.linkedActionId,
      linkedSourceRecordId: input.linkedSourceRecordId,
      exportGroupKey: input.exportGroupKey,
      retentionPolicy: input.retentionPolicy,
      retentionExpiresAt: input.retentionExpiresAt,
      links
    };

    return this.repository.saveArtifact(artifact);
  }

  async downloadEvidence(input: EvidenceDownloadInput): Promise<EvidenceDownloadResult> {
    const artifact = await this.repository.findArtifactById(input.evidenceArtifactId);
    if (!artifact || artifact.organizationId !== input.organizationId) {
      throw new EvidenceAccessError("evidence_not_found", "Evidence artifact was not found for this organization.", 404);
    }

    const object = await this.storage.readObject({
      organizationId: input.organizationId,
      storageUri: artifact.storageUri
    });
    const accessLog = await this.repository.saveAccessLog({
      id: randomUUID(),
      organizationId: input.organizationId,
      evidenceArtifactId: artifact.id,
      actorUserId: input.actorUserId,
      action: "download",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: this.now().toISOString()
    });

    return {
      artifact,
      body: object.body,
      mimeType: object.mimeType ?? artifact.mimeType,
      contentHashSha256: artifact.contentHashSha256,
      accessLog
    };
  }

  listEvidence(organizationId: string): Promise<EvidenceArtifactMetadata[]> {
    return this.repository.listArtifacts(organizationId);
  }

  listAccessLogs(organizationId: string, evidenceArtifactId?: string): Promise<EvidenceAccessLogEntry[]> {
    return this.repository.listAccessLogs(organizationId, evidenceArtifactId);
  }
}

export const evidenceArtifactToComplianceState = (artifact: EvidenceArtifactMetadata) => ({
  id: artifact.id,
  controlId: artifact.controlId,
  jurisdiction: artifact.jurisdiction,
  title: artifact.title,
  sourceReferences: artifact.linkedSourceRecordId
    ? [
        {
          sourceRecordId: artifact.linkedSourceRecordId,
          label: artifact.title
        }
      ]
    : []
});

export const sha256Hex = (body: Uint8Array): string => createHash("sha256").update(body).digest("hex");

const normalizeBody = (body: Uint8Array | string): Uint8Array =>
  typeof body === "string" ? Buffer.from(body, "utf8") : new Uint8Array(body);

const sanitizeObjectName = (title: string): string => {
  const normalized = title.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "evidence";
};

const buildDefaultLinks = (
  input: EvidenceUploadInput
): Array<Omit<EvidenceLink, "id" | "organizationId" | "evidenceArtifactId" | "createdAt">> => {
  const links: Array<Omit<EvidenceLink, "id" | "organizationId" | "evidenceArtifactId" | "createdAt">> = [];

  if (input.controlId) {
    links.push({
      targetType: "control",
      targetId: input.controlId,
      relation: input.requirementKey ?? "supports_control"
    });
  }

  if (input.jurisdiction) {
    links.push({
      targetType: "jurisdiction",
      targetId: input.jurisdiction,
      relation: "supports_jurisdiction"
    });
  }

  if (input.linkedSourceRecordId) {
    links.push({
      targetType: "regulatory_source",
      targetId: input.linkedSourceRecordId,
      relation: "source_reference"
    });
  }

  if (input.linkedAssessmentId) {
    links.push({
      targetType: "assessment",
      targetId: input.linkedAssessmentId,
      relation: "assessment_evidence"
    });
  }

  return links;
};
