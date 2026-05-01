import { createHash, createHmac, randomUUID } from "node:crypto";

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
  scanScannerName?: string;
  scanFindings?: string[];
  scannedAt?: string;
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

export interface S3ObjectStorageAdapterOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => Date;
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

export interface HttpUploadScannerOptions {
  endpoint: string;
  scannerName?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
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
  private readonly reason: string;

  constructor(
    options: {
      now?: () => Date;
      environment?: string;
      allowInProduction?: boolean;
      reason?: string;
    } = {}
  ) {
    if (options.environment === "production" && options.allowInProduction !== true) {
      throw new EvidenceAccessError(
        "upload_scanner_required",
        "No-op upload scanning is not allowed in production without an explicit override.",
        500
      );
    }

    this.now = options.now ?? (() => new Date());
    this.reason = options.reason ?? "local_development_explicit_noop";
  }

  async scan(): Promise<UploadScanResult> {
    return {
      status: "skipped",
      scannerName: "noop-deferred-scanner",
      scannedAt: this.now().toISOString(),
      findings: [this.reason]
    };
  }
}

export class MockUploadScanner implements UploadScanningHook {
  private readonly status: EvidenceScanStatus;
  private readonly findings: string[];
  private readonly scannerName: string;
  private readonly now: () => Date;

  constructor(options: {
    status?: EvidenceScanStatus;
    findings?: string[];
    scannerName?: string;
    now?: () => Date;
  } = {}) {
    this.status = options.status ?? "clean";
    this.findings = options.findings ?? [];
    this.scannerName = options.scannerName ?? "mock-upload-scanner";
    this.now = options.now ?? (() => new Date());
  }

  async scan(): Promise<UploadScanResult> {
    return {
      status: this.status,
      scannerName: this.scannerName,
      scannedAt: this.now().toISOString(),
      findings: [...this.findings]
    };
  }
}

export class HttpUploadScanner implements UploadScanningHook {
  private readonly endpoint: string;
  private readonly scannerName: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(options: HttpUploadScannerOptions) {
    if (!options.endpoint) {
      throw new EvidenceAccessError("invalid_scanner_config", "Scanner endpoint is required.", 500);
    }

    this.endpoint = options.endpoint;
    this.scannerName = options.scannerName ?? "http-upload-scanner";
    this.timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new EvidenceAccessError("invalid_scanner_config", "Scanner timeout must be a positive integer.", 500);
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async scan(input: UploadScanInput): Promise<UploadScanResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          organizationId: input.organizationId,
          objectKey: input.objectKey,
          mimeType: input.mimeType,
          sizeBytes: input.body.byteLength,
          contentHashSha256: sha256Hex(input.body),
          bodyBase64: Buffer.from(input.body).toString("base64")
        })
      });

      if (!response.ok) {
        return {
          status: "failed",
          scannerName: this.scannerName,
          scannedAt: this.now().toISOString(),
          findings: [`scanner_http_${response.status}`]
        };
      }

      const payload = (await response.json()) as Partial<UploadScanResult>;
      return {
        status: isEvidenceScanStatus(payload.status) ? payload.status : "failed",
        scannerName: payload.scannerName ?? this.scannerName,
        scannedAt: payload.scannedAt ?? this.now().toISOString(),
        findings: Array.isArray(payload.findings) ? payload.findings.filter(isString) : []
      };
    } catch (error) {
      return {
        status: "failed",
        scannerName: this.scannerName,
        scannedAt: this.now().toISOString(),
        findings: [isAbortError(error) ? "scanner_timeout" : "scanner_unreachable"]
      };
    } finally {
      clearTimeout(timeout);
    }
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

export class S3ObjectStorageAdapter implements ObjectStorageAdapter {
  private readonly endpoint: string;
  private readonly region: string;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly forcePathStyle: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(options: S3ObjectStorageAdapterOptions) {
    for (const [name, value] of Object.entries({
      endpoint: options.endpoint,
      region: options.region,
      bucket: options.bucket,
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey
    })) {
      if (!value) {
        throw new EvidenceAccessError("invalid_object_storage_config", `Missing S3 object storage setting: ${name}`, 500);
      }
    }

    this.endpoint = options.endpoint.replace(/\/+$/g, "");
    this.region = options.region;
    this.bucket = options.bucket;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.forcePathStyle = options.forcePathStyle ?? true;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async putObject(input: ObjectStoragePutInput): Promise<ObjectStoragePutResult> {
    const body = new Uint8Array(input.body);
    const objectKey = this.scopedObjectKey(input.organizationId, input.objectKey);
    const url = this.objectUrl(objectKey);
    const headers = this.signedHeaders({
      method: "PUT",
      url,
      payloadHash: sha256Hex(body),
      contentType: input.mimeType,
      metadata: input.metadata
    });
    const response = await this.fetchImpl(url, {
      method: "PUT",
      headers,
      body
    });

    if (!response.ok) {
      throw new EvidenceAccessError(
        "object_storage_put_failed",
        `Object storage rejected evidence upload with status ${response.status}.`,
        502
      );
    }

    return {
      storageUri: `s3://${this.bucket}/${objectKey}`,
      sizeBytes: body.byteLength
    };
  }

  async readObject(input: ObjectStorageGetInput): Promise<ObjectStorageReadResult> {
    const objectKey = this.storageUriToObjectKey(input);
    const url = this.objectUrl(objectKey);
    const headers = this.signedHeaders({
      method: "GET",
      url,
      payloadHash: sha256Hex(new Uint8Array())
    });
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      throw new EvidenceAccessError(
        "evidence_not_found",
        `Evidence object was not found for this organization in object storage.`,
        404
      );
    }

    return {
      storageUri: input.storageUri,
      body: new Uint8Array(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type") ?? undefined
    };
  }

  private scopedObjectKey(organizationId: string, objectKey: string): string {
    return ["evidence", organizationId, objectKey].join("/").replace(/\/{2,}/g, "/");
  }

  private storageUriToObjectKey(input: ObjectStorageGetInput): string {
    const prefix = `s3://${this.bucket}/`;
    if (!input.storageUri.startsWith(prefix)) {
      throw new EvidenceAccessError("evidence_not_found", "Evidence object was not found for this organization.", 404);
    }

    const objectKey = input.storageUri.slice(prefix.length);
    if (!objectKey.startsWith(`evidence/${input.organizationId}/`)) {
      throw new EvidenceAccessError("evidence_not_found", "Evidence object was not found for this organization.", 404);
    }

    return objectKey;
  }

  private objectUrl(objectKey: string): URL {
    const endpointUrl = new URL(this.endpoint);
    const url = new URL(endpointUrl.toString());

    if (this.forcePathStyle) {
      url.pathname = joinUrlPath(url.pathname, this.bucket, objectKey);
    } else {
      url.hostname = `${this.bucket}.${url.hostname}`;
      url.pathname = joinUrlPath(url.pathname, objectKey);
    }

    return url;
  }

  private signedHeaders(input: {
    method: "GET" | "PUT";
    url: URL;
    payloadHash: string;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Record<string, string> {
    const { amzDate, dateStamp } = toAmzDates(this.now());
    const headers: Record<string, string> = {
      host: input.url.host,
      "x-amz-content-sha256": input.payloadHash,
      "x-amz-date": amzDate
    };

    if (input.contentType) {
      headers["content-type"] = input.contentType;
    }

    for (const [key, value] of Object.entries(input.metadata ?? {})) {
      headers[`x-amz-meta-${key.toLowerCase()}`] = value;
    }

    const signed = signS3Request({
      method: input.method,
      url: input.url,
      headers,
      payloadHash: input.payloadHash,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      region: this.region,
      dateStamp
    });

    return {
      ...headers,
      authorization: signed.authorization
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
  private readonly rejectUnscannedUploads: boolean;
  private readonly maxUploadBytes?: number;

  constructor(options: {
    repository: EvidenceRepository;
    storage: ObjectStorageAdapter;
    scanner: UploadScanningHook;
    now?: () => Date;
    rejectUnscannedUploads?: boolean;
    maxUploadBytes?: number;
  }) {
    this.repository = options.repository;
    this.storage = options.storage;
    this.scanner = options.scanner;
    this.now = options.now ?? (() => new Date());
    this.rejectUnscannedUploads = options.rejectUnscannedUploads ?? false;
    this.maxUploadBytes = options.maxUploadBytes;
    if (
      this.maxUploadBytes !== undefined &&
      (!Number.isSafeInteger(this.maxUploadBytes) || this.maxUploadBytes <= 0)
    ) {
      throw new EvidenceAccessError("invalid_evidence_config", "Evidence upload limit must be a positive integer.", 500);
    }
  }

  async uploadEvidence(input: EvidenceUploadInput): Promise<EvidenceArtifactMetadata> {
    const body = normalizeBody(input.body);
    if (this.maxUploadBytes !== undefined && body.byteLength > this.maxUploadBytes) {
      throw new EvidenceAccessError(
        "payload_too_large",
        "Evidence upload exceeds the configured size limit.",
        413
      );
    }
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

    if (this.rejectUnscannedUploads && scan.status !== "clean") {
      throw new EvidenceAccessError(
        "upload_rejected_by_scanner",
        "Evidence upload was rejected because scanning did not complete cleanly.",
        422
      );
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
      scanScannerName: scan.scannerName,
      scanFindings: scan.findings,
      scannedAt: scan.scannedAt,
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
  freshnessStatus: artifact.validUntil && Date.parse(artifact.validUntil) < Date.now() ? ("stale" as const) : ("current" as const),
  validUntil: artifact.validUntil,
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

const isEvidenceScanStatus = (value: unknown): value is EvidenceScanStatus =>
  value === "pending" || value === "clean" || value === "infected" || value === "failed" || value === "skipped";

const isString = (value: unknown): value is string => typeof value === "string";

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  (error as { name?: unknown }).name === "AbortError";

const joinUrlPath = (...parts: string[]): string => {
  const joined = parts
    .flatMap((part) => part.split("/"))
    .filter((part) => part.length > 0)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/${joined}`;
};

const toAmzDates = (date: Date) => {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8)
  };
};

const signS3Request = (input: {
  method: "GET" | "PUT";
  url: URL;
  headers: Record<string, string>;
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  dateStamp: string;
}): { authorization: string } => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(input.headers).map(([key, value]) => [key.toLowerCase(), value.trim().replace(/\s+/g, " ")])
  );
  const signedHeaderNames = Object.keys(normalizedHeaders).sort();
  const canonicalHeaders = signedHeaderNames.map((key) => `${key}:${normalizedHeaders[key]}`).join("\n");
  const canonicalQuery = [...input.url.searchParams.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  const canonicalRequest = [
    input.method,
    input.url.pathname,
    canonicalQuery,
    `${canonicalHeaders}\n`,
    signedHeaderNames.join(";"),
    input.payloadHash
  ].join("\n");
  const credentialScope = `${input.dateStamp}/${input.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    normalizedHeaders["x-amz-date"],
    credentialScope,
    sha256Hex(Buffer.from(canonicalRequest, "utf8"))
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(Buffer.from(`AWS4${input.secretAccessKey}`, "utf8"), input.dateStamp), input.region), "s3"),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return {
    authorization: [
      `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaderNames.join(";")}`,
      `Signature=${signature}`
    ].join(", ")
  };
};

const hmac = (key: Buffer | Uint8Array | string, value: string): Buffer =>
  createHmac("sha256", key).update(value).digest();

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

  if (input.linkedActionId) {
    links.push({
      targetType: "action_run",
      targetId: input.linkedActionId,
      relation: "action_evidence"
    });
  }

  return links;
};
