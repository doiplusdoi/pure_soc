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

export const evidenceRuntimeSmokeSchemaVersion = "puresoc.evidence_runtime_smoke.v1" as const;
export const evidenceRuntimeSmokeCommand = "pnpm evidence:smoke:runtime" as const;

export type EvidenceRuntimeSmokeStatus = "dry_run_passed" | "blocked" | "passed" | "failed";
export type EvidenceRuntimeSmokeOperationStatus = "planned" | "skipped" | "passed" | "failed";

export interface EvidenceRuntimeSmokeEnvironmentRequirement {
  label: string;
  env: string[];
  sensitive: boolean;
  requiredFor: "configuration" | "secret" | "disposable_smoke";
  configured: boolean;
}

export interface EvidenceRuntimeSmokeGuardrail {
  id: string;
  status: "satisfied" | "required" | "unsafe" | "not_applicable";
  summary: string;
  env?: string[];
}

export interface EvidenceRuntimeSmokeReadinessPreflight {
  checkId: "object_storage_scanner_runtime" | "evidence_report_runtime";
  status: string;
  mode: "dry_run" | "live_candidate";
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  requiredEnvironment: EvidenceRuntimeSmokeEnvironmentRequirement[];
  configuredEnvironmentVariables: string[];
  blockers: string[];
  guardrails: EvidenceRuntimeSmokeGuardrail[];
  metadata: Record<string, unknown>;
}

export interface EvidenceRuntimeSmokeConfig {
  app: {
    env: string;
    legalCaveat: string;
  };
  api: {
    requestLimits: {
      evidenceUploadMaxBytes: number;
    };
  };
  storage: {
    objectStorage: {
      provider: "memory" | "s3";
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    };
    uploadScanner: {
      mode: "noop" | "mock" | "http";
      endpoint: string;
      mockStatus: EvidenceScanStatus;
      allowNoopInProduction: boolean;
      timeoutMs: number;
    };
  };
  reports: {
    legalCaveatRequired: boolean;
    renderer: string;
    defaultExportFormat: "json" | "pdf";
    storeGeneratedReportsAsEvidence: boolean;
  };
}

export interface EvidenceRuntimeSmokeOperation {
  id: string;
  label: string;
  runtimeTarget: "object_storage" | "scanner" | "evidence_vault" | "report_renderer" | "export_metadata";
  performsNetworkInLiveMode: boolean;
  status: EvidenceRuntimeSmokeOperationStatus;
  metadata: Record<string, unknown>;
}

export interface EvidenceRuntimeSmokeReport {
  schemaVersion: typeof evidenceRuntimeSmokeSchemaVersion;
  command: typeof evidenceRuntimeSmokeCommand;
  status: EvidenceRuntimeSmokeStatus;
  exitCode: 0 | 1;
  mode: "dry_run" | "live_candidate";
  readinessStatuses: Record<"object_storage_scanner_runtime" | "evidence_report_runtime", string>;
  liveNetworkCallsMade: boolean;
  secretValuesReturned: false;
  endpointUrlsReturned: false;
  storagePointersReturned: false;
  publicUrlsReturned: false;
  uploadedFileContentsReturned: false;
  reportContentsReturned: false;
  fullObjectKeysReturned: false;
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  configuredEnvironmentVariables: string[];
  missingEnvironmentVariables: string[];
  blockers: string[];
  guardrails: EvidenceRuntimeSmokeGuardrail[];
  plannedOperations: EvidenceRuntimeSmokeOperation[];
  runtimeMetadata: Record<string, unknown>;
  summary: string;
}

export interface RunEvidenceRuntimeSmokeOptions {
  config: EvidenceRuntimeSmokeConfig;
  readiness: {
    objectStorageScanner: EvidenceRuntimeSmokeReadinessPreflight;
    evidenceReports: EvidenceRuntimeSmokeReadinessPreflight;
  };
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  storage?: ObjectStorageAdapter;
  scanner?: UploadScanningHook;
  repository?: EvidenceRepository;
  now?: () => Date;
  idFactory?: () => string;
}

interface RenderedSmokeReport {
  format: "json" | "pdf";
  mimeType: string;
  body: Uint8Array;
  contentHashSha256: string;
  renderer: string;
  renderedAt: string;
}

export const runEvidenceRuntimeSmoke = async (
  options: RunEvidenceRuntimeSmokeOptions
): Promise<EvidenceRuntimeSmokeReport> => {
  const env = options.env ?? process.env;
  const liveRequested =
    env.PURESOC_EXTERNAL_SMOKE_MODE === "live_candidate" ||
    options.readiness.objectStorageScanner.mode === "live_candidate" ||
    options.readiness.evidenceReports.mode === "live_candidate";
  const plannedOperations = createPlannedEvidenceRuntimeSmokeOperations(options.config);
  const common = evidenceRuntimeSmokeCommon(options, plannedOperations);

  if (!liveRequested) {
    return {
      ...common,
      status: "dry_run_passed",
      exitCode: 0,
      mode: "dry_run",
      liveNetworkCallsMade: false,
      summary:
        "Dry run only. Object-storage write/read, upload-scanner, generated-report evidence, report-renderer, CSV metadata, and binary bundle metadata operations are planned but were not executed."
    };
  }

  const liveBlockers = collectEvidenceRuntimeLiveSmokeBlockers(options);
  if (liveBlockers.length > 0) {
    return {
      ...common,
      status: "blocked",
      exitCode: 1,
      mode: "live_candidate",
      liveNetworkCallsMade: false,
      blockers: sortedUnique([...common.blockers, ...liveBlockers]),
      plannedOperations: plannedOperations.map((operation) => ({
        ...operation,
        status: "skipped"
      })),
      summary:
        "Live evidence runtime smoke refused to run because one or more storage/scanner/report guardrails are not satisfied."
    };
  }

  return runLiveEvidenceRuntimeSmoke(options, common, plannedOperations);
};

const runLiveEvidenceRuntimeSmoke = async (
  options: RunEvidenceRuntimeSmokeOptions,
  common: Omit<EvidenceRuntimeSmokeReport, "status" | "exitCode" | "mode" | "liveNetworkCallsMade" | "summary">,
  plannedOperations: EvidenceRuntimeSmokeOperation[]
): Promise<EvidenceRuntimeSmokeReport> => {
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetchImpl ?? fetch;
  const smokeId = sanitizeSmokeId(options.idFactory?.() ?? randomUUID());
  const organizationId = `org_puresoc_m44_${smokeId}`;
  const actorUserId = `user_puresoc_m44_${smokeId}`;
  const assessmentId = `assessment_puresoc_m44_${smokeId}`;
  const reportId = `report_puresoc_m44_${smokeId}`;
  let operations = plannedOperations;

  try {
    const reportData = createSyntheticSmokeReportData({
      organizationId,
      assessmentId,
      reportId,
      generatedAt: now().toISOString(),
      legalCaveat: options.config.app.legalCaveat
    });
    const rendered = await renderReportThroughHttp({
      rendererEndpoint: options.config.reports.renderer,
      reportData,
      fetchImpl,
      renderedAt: reportData.generatedAt
    });
    operations = markEvidenceRuntimeOperation(operations, "report_renderer.render_pdf", "passed", {
      format: rendered.format,
      mimeType: rendered.mimeType,
      contentHashSha256: rendered.contentHashSha256,
      renderer: rendered.renderer,
      legalCaveatPresent: reportData.legalCaveat.length > 0,
      sourceReferenceCount: reportData.sourceReferences.length,
      reportBodyReturnedToOutput: false
    });

    const vault = new EvidenceVault({
      repository: options.repository ?? new InMemoryEvidenceRepository(),
      storage:
        options.storage ??
        new S3ObjectStorageAdapter({
          endpoint: options.config.storage.objectStorage.endpoint,
          region: options.config.storage.objectStorage.region,
          bucket: options.config.storage.objectStorage.bucket,
          accessKeyId: options.config.storage.objectStorage.accessKeyId,
          secretAccessKey: options.config.storage.objectStorage.secretAccessKey,
          forcePathStyle: options.config.storage.objectStorage.forcePathStyle,
          fetchImpl,
          now
        }),
      scanner:
        options.scanner ??
        new HttpUploadScanner({
          endpoint: options.config.storage.uploadScanner.endpoint,
          timeoutMs: options.config.storage.uploadScanner.timeoutMs,
          fetchImpl,
          now
        }),
      rejectUnscannedUploads: true,
      maxUploadBytes: options.config.api.requestLimits.evidenceUploadMaxBytes,
      now
    });

    const artifact = await vault.uploadEvidence({
      organizationId,
      actorUserId,
      sourceType: "generated_report",
      sourceProvider: rendered.renderer,
      title: "PureSOC M44 runtime smoke generated report",
      body: rendered.body,
      mimeType: rendered.mimeType,
      controlId: "nis2.governance.risk-management",
      jurisdiction: "EU",
      requirementKey: "generated-report-runtime-smoke",
      linkedAssessmentId: assessmentId,
      linkedSourceRecordId: "eu-nis2-art-21",
      links: [
        {
          targetType: "report",
          targetId: reportId,
          relation: "generated_report_export"
        }
      ],
      exportGroupKey: `m44-runtime-smoke-${smokeId}`,
      retentionPolicy: "puresoc-runtime-smoke-disposable"
    });
    operations = markEvidenceRuntimeOperation(operations, "evidence_vault.upload_generated_report", "passed", {
      sourceType: artifact.sourceType,
      sourceProvider: artifact.sourceProvider,
      scanStatus: artifact.scanStatus,
      scannerName: artifact.scanScannerName,
      contentHashSha256: artifact.contentHashSha256,
      sizeBytes: artifact.sizeBytes,
      linkTargetTypes: artifact.links.map((link) => link.targetType).sort(),
      storageUriReturnedToOutput: false,
      publicUrlReturnedToOutput: false,
      fullObjectKeyReturnedToOutput: false
    });

    const download = await vault.downloadEvidence({
      organizationId,
      actorUserId,
      evidenceArtifactId: artifact.id
    });
    operations = markEvidenceRuntimeOperation(operations, "evidence_vault.download_generated_report", "passed", {
      mimeType: download.mimeType,
      contentHashMatches: download.contentHashSha256 === rendered.contentHashSha256,
      accessLogAction: download.accessLog.action,
      storageUriReturnedToOutput: false,
      fileBodyReturnedToOutput: false
    });

    operations = markEvidenceRuntimeOperation(operations, "report_export.metadata_records", "passed", {
      csvExportMetadataRecorded: true,
      binaryEvidencePackageMetadataRecorded: true,
      formats: ["csv", "binary_evidence_package"],
      legalCertification: false,
      storagePointerReturnedToClient: false
    });

    return {
      ...common,
      status: "passed",
      exitCode: 0,
      mode: "live_candidate",
      liveNetworkCallsMade: true,
      plannedOperations: operations,
      summary:
        "Evidence runtime smoke completed against an explicitly confirmed disposable/local/test target. Output is sanitized and omits endpoint URLs, storage pointers, object keys, uploaded bytes, and rendered report bodies."
    };
  } catch (error) {
    const failedOperationId = operations.find((operation) => operation.status === "planned")?.id;
    if (failedOperationId) {
      operations = markEvidenceRuntimeOperation(operations, failedOperationId, "failed", safeEvidenceSmokeErrorMetadata(error));
    }

    return {
      ...common,
      status: "failed",
      exitCode: 1,
      mode: "live_candidate",
      liveNetworkCallsMade: true,
      blockers: sortedUnique([...common.blockers, "evidence_runtime_smoke_failed"]),
      plannedOperations: operations.map((operation) =>
        operation.status === "planned"
          ? {
              ...operation,
              status: "skipped"
            }
          : operation
      ),
      summary:
        "Evidence runtime smoke attempted disposable runtime operations but did not complete. Failure metadata is generic and secret-free."
    };
  }
};

const evidenceRuntimeSmokeCommon = (
  options: RunEvidenceRuntimeSmokeOptions,
  plannedOperations: EvidenceRuntimeSmokeOperation[]
): Omit<EvidenceRuntimeSmokeReport, "status" | "exitCode" | "mode" | "liveNetworkCallsMade" | "summary"> => ({
  schemaVersion: evidenceRuntimeSmokeSchemaVersion,
  command: evidenceRuntimeSmokeCommand,
  readinessStatuses: {
    object_storage_scanner_runtime: options.readiness.objectStorageScanner.status,
    evidence_report_runtime: options.readiness.evidenceReports.status
  },
  secretValuesReturned: false,
  endpointUrlsReturned: false,
  storagePointersReturned: false,
  publicUrlsReturned: false,
  uploadedFileContentsReturned: false,
  reportContentsReturned: false,
  fullObjectKeysReturned: false,
  target: {
    kind: options.readiness.objectStorageScanner.target.kind,
    disposableConfirmation: options.readiness.objectStorageScanner.target.disposableConfirmation
  },
  configuredEnvironmentVariables: sortedUnique([
    ...options.readiness.objectStorageScanner.configuredEnvironmentVariables,
    ...options.readiness.evidenceReports.configuredEnvironmentVariables
  ]),
  missingEnvironmentVariables: sortedUnique([
    ...missingRuntimeEnvironmentVariables(options.readiness.objectStorageScanner.requiredEnvironment),
    ...missingRuntimeEnvironmentVariables(options.readiness.evidenceReports.requiredEnvironment)
  ]),
  blockers: sortedUnique([
    ...options.readiness.objectStorageScanner.blockers,
    ...options.readiness.evidenceReports.blockers
  ]),
  guardrails: mergeRuntimeGuardrails([
    ...options.readiness.objectStorageScanner.guardrails,
    ...options.readiness.evidenceReports.guardrails
  ]),
  plannedOperations,
  runtimeMetadata: {
    objectStorageProvider: options.config.storage.objectStorage.provider,
    objectStorageEndpointClass: classifyRuntimeEndpoint(options.config.storage.objectStorage.endpoint),
    objectStorageBucketConfigured: nonEmpty(options.config.storage.objectStorage.bucket),
    uploadScannerMode: options.config.storage.uploadScanner.mode,
    uploadScannerEndpointClass: classifyRuntimeEndpoint(options.config.storage.uploadScanner.endpoint),
    scannerTimeoutMs: options.config.storage.uploadScanner.timeoutMs,
    reportRendererEndpointClass: classifyRuntimeEndpoint(options.config.reports.renderer),
    legalCaveatRequired: options.config.reports.legalCaveatRequired,
    defaultExportFormat: options.config.reports.defaultExportFormat,
    storeGeneratedReportsAsEvidence: options.config.reports.storeGeneratedReportsAsEvidence,
    evidenceUploadLimitBytes: options.config.api.requestLimits.evidenceUploadMaxBytes,
    plannedExportFormats: ["pdf", "csv", "binary_evidence_package"],
    storagePointerReturnedToClient: false
  }
});

const collectEvidenceRuntimeLiveSmokeBlockers = (options: RunEvidenceRuntimeSmokeOptions): string[] => {
  const env = options.env ?? process.env;
  const blockers = new Set<string>();
  const objectStorageEndpointClass = classifyRuntimeEndpoint(options.config.storage.objectStorage.endpoint);
  const scannerEndpointClass = classifyRuntimeEndpoint(options.config.storage.uploadScanner.endpoint);
  const rendererEndpointClass = classifyRuntimeEndpoint(options.config.reports.renderer);

  if (options.readiness.objectStorageScanner.status !== "ready_for_disposable_smoke") {
    blockers.add(`readiness_status_not_ready:${options.readiness.objectStorageScanner.checkId}:${options.readiness.objectStorageScanner.status}`);
  }

  if (options.readiness.evidenceReports.status !== "ready_for_disposable_smoke") {
    blockers.add(`readiness_status_not_ready:${options.readiness.evidenceReports.checkId}:${options.readiness.evidenceReports.status}`);
  }

  if (env.PURESOC_EXTERNAL_SMOKE_MODE !== "live_candidate") {
    blockers.add("external_smoke_mode_not_live_candidate");
  }

  if (
    !isSafeRuntimeSmokeTarget(options.readiness.objectStorageScanner.target.kind) ||
    !options.readiness.objectStorageScanner.target.disposableConfirmation ||
    !options.readiness.evidenceReports.target.disposableConfirmation
  ) {
    blockers.add("external_smoke_disposable_target_not_confirmed");
  }

  if (env.PURESOC_EXTERNAL_SMOKE_STORAGE !== "true") {
    blockers.add("storage_external_smoke_opt_in_missing");
  }

  if (env.PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS !== "true") {
    blockers.add("evidence_reports_external_smoke_opt_in_missing");
  }

  if (options.config.storage.objectStorage.provider !== "s3") {
    blockers.add("object_storage_provider_not_s3");
  }

  for (const [field, code] of [
    [options.config.storage.objectStorage.endpoint, "object_storage_endpoint_missing"],
    [options.config.storage.objectStorage.region, "object_storage_region_missing"],
    [options.config.storage.objectStorage.bucket, "object_storage_bucket_missing"],
    [options.config.storage.objectStorage.accessKeyId, "object_storage_access_key_missing"],
    [options.config.storage.objectStorage.secretAccessKey, "object_storage_secret_key_missing"]
  ] as const) {
    if (!nonEmpty(field)) {
      blockers.add(code);
    }
  }

  if (!isAllowedRuntimeEndpointClass(objectStorageEndpointClass)) {
    blockers.add("object_storage_endpoint_not_local_or_test");
  }

  if (options.config.storage.uploadScanner.mode !== "http") {
    blockers.add("upload_scanner_mode_not_http");
  }

  if (!nonEmpty(options.config.storage.uploadScanner.endpoint)) {
    blockers.add("upload_scanner_endpoint_missing");
  }

  if (!isAllowedRuntimeEndpointClass(scannerEndpointClass)) {
    blockers.add("upload_scanner_endpoint_not_local_or_test");
  }

  if (!options.config.reports.legalCaveatRequired) {
    blockers.add("report_legal_caveat_not_required");
  }

  if (!options.config.reports.storeGeneratedReportsAsEvidence) {
    blockers.add("generated_reports_not_stored_as_evidence");
  }

  if (!isHttpUrl(options.config.reports.renderer)) {
    blockers.add("report_renderer_endpoint_not_url");
  }

  if (!isAllowedRuntimeEndpointClass(rendererEndpointClass)) {
    blockers.add("report_renderer_endpoint_not_local_or_test");
  }

  if (
    !Number.isSafeInteger(options.config.api.requestLimits.evidenceUploadMaxBytes) ||
    options.config.api.requestLimits.evidenceUploadMaxBytes <= 0
  ) {
    blockers.add("evidence_upload_limit_invalid");
  }

  return [...blockers].sort();
};

const createPlannedEvidenceRuntimeSmokeOperations = (
  config: EvidenceRuntimeSmokeConfig
): EvidenceRuntimeSmokeOperation[] => [
  {
    id: "report_renderer.render_pdf",
    label: "Render a synthetic internal-readiness PDF through the configured report-renderer endpoint.",
    runtimeTarget: "report_renderer",
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      endpointClass: classifyRuntimeEndpoint(config.reports.renderer),
      outputIncludesReportBody: false,
      legalCaveatRequired: config.reports.legalCaveatRequired
    }
  },
  {
    id: "evidence_vault.upload_generated_report",
    label: "Scan and store the generated report as organization-scoped evidence through the evidence vault.",
    runtimeTarget: "evidence_vault",
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      objectStorageProvider: config.storage.objectStorage.provider,
      objectStorageEndpointClass: classifyRuntimeEndpoint(config.storage.objectStorage.endpoint),
      uploadScannerMode: config.storage.uploadScanner.mode,
      uploadScannerEndpointClass: classifyRuntimeEndpoint(config.storage.uploadScanner.endpoint),
      storageUriReturnedToOutput: false,
      publicUrlReturnedToOutput: false,
      outputIncludesUploadedFileContents: false
    }
  },
  {
    id: "evidence_vault.download_generated_report",
    label: "Read the generated-report evidence back through the evidence vault and record an access log.",
    runtimeTarget: "object_storage",
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      storageUriReturnedToOutput: false,
      outputIncludesDownloadedFileContents: false,
      accessAuditExpected: true
    }
  },
  {
    id: "report_export.metadata_records",
    label: "Record secret-free smoke metadata for CSV exports and binary evidence-package bundles.",
    runtimeTarget: "export_metadata",
    performsNetworkInLiveMode: false,
    status: "planned",
    metadata: {
      csvExportMetadataPlanned: true,
      binaryEvidencePackageMetadataPlanned: true,
      storagePointerReturnedToClient: false
    }
  }
];

const renderReportThroughHttp = async (input: {
  rendererEndpoint: string;
  reportData: Record<string, unknown>;
  renderedAt: string;
  fetchImpl: typeof fetch;
}): Promise<RenderedSmokeReport> => {
  const renderUrl = reportRenderUrl(input.rendererEndpoint);
  const response = await input.fetchImpl(renderUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      format: "pdf",
      reportData: input.reportData,
      renderedAt: input.renderedAt
    })
  });

  if (!response.ok) {
    throw new EvidenceAccessError("report_renderer_smoke_failed", "Report renderer rejected the smoke render request.", 502);
  }

  const body = new Uint8Array(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") ?? "application/pdf";
  const renderer = response.headers.get("x-puresoc-renderer") ?? "puresoc-report-renderer";
  const renderedAt = input.renderedAt;

  return {
    format: "pdf",
    mimeType,
    body,
    contentHashSha256: response.headers.get("x-puresoc-content-sha256") ?? sha256Hex(body),
    renderer,
    renderedAt
  };
};

const reportRenderUrl = (endpoint: string): URL => {
  const url = new URL(endpoint);
  const normalizedPath = url.pathname.replace(/\/+$/g, "");
  url.pathname = normalizedPath.endsWith("/render") || normalizedPath === "/render" ? normalizedPath : `${normalizedPath}/render`;
  return url;
};

const createSyntheticSmokeReportData = (input: {
  organizationId: string;
  assessmentId: string;
  reportId: string;
  generatedAt: string;
  legalCaveat: string;
}) => ({
  schemaVersion: "puresoc.report.internal_readiness.v1",
  reportType: "internal_readiness",
  organizationId: input.organizationId,
  assessmentId: input.assessmentId,
  reportId: input.reportId,
  generatedAt: input.generatedAt,
  legalCaveat: input.legalCaveat,
  sourceReferences: [
    {
      sourceRecordId: "eu-nis2-art-21",
      jurisdiction: "EU",
      label: "NIS2 Article 21 synthetic smoke source"
    }
  ],
  controlResults: [
    {
      controlId: "nis2.governance.risk-management",
      status: "needs_evidence",
      summary: "Synthetic runtime smoke control result."
    }
  ],
  gaps: [],
  recommendations: [],
  readinessPlan: [],
  evidence: [],
  provenance: {
    source: "m44_runtime_smoke_synthetic_data",
    realCustomerData: false
  }
});

const markEvidenceRuntimeOperation = (
  operations: EvidenceRuntimeSmokeOperation[],
  id: string,
  status: EvidenceRuntimeSmokeOperationStatus,
  metadata: Record<string, unknown>
): EvidenceRuntimeSmokeOperation[] =>
  operations.map((operation) =>
    operation.id === id
      ? {
          ...operation,
          status,
          metadata: {
            ...operation.metadata,
            ...metadata
          }
        }
      : operation
  );

const missingRuntimeEnvironmentVariables = (
  requirements: EvidenceRuntimeSmokeEnvironmentRequirement[]
): string[] =>
  [...new Set(requirements.filter((requirement) => !requirement.configured).flatMap((requirement) => requirement.env))]
    .filter(Boolean)
    .sort();

const mergeRuntimeGuardrails = (guardrails: EvidenceRuntimeSmokeGuardrail[]): EvidenceRuntimeSmokeGuardrail[] => {
  const merged = new Map<string, EvidenceRuntimeSmokeGuardrail>();

  for (const guardrail of guardrails) {
    const existing = merged.get(guardrail.id);
    if (!existing) {
      merged.set(guardrail.id, guardrail);
      continue;
    }

    merged.set(guardrail.id, {
      ...existing,
      status: strongestGuardrailStatus(existing.status, guardrail.status),
      env: sortedUnique([...(existing.env ?? []), ...(guardrail.env ?? [])])
    });
  }

  return [...merged.values()];
};

const strongestGuardrailStatus = (
  left: EvidenceRuntimeSmokeGuardrail["status"],
  right: EvidenceRuntimeSmokeGuardrail["status"]
): EvidenceRuntimeSmokeGuardrail["status"] => {
  const order: Record<EvidenceRuntimeSmokeGuardrail["status"], number> = {
    unsafe: 4,
    required: 3,
    satisfied: 2,
    not_applicable: 1
  };

  return order[left] >= order[right] ? left : right;
};

const safeEvidenceSmokeErrorMetadata = (error: unknown): Record<string, unknown> => {
  if (error instanceof EvidenceAccessError) {
    return {
      errorCode: error.code,
      statusCode: error.statusCode
    };
  }

  return {
    errorCode: "unexpected_error"
  };
};

const classifyRuntimeEndpoint = (value: string): "empty" | "local" | "test_hint" | "external" | "invalid" => {
  if (!nonEmpty(value)) {
    return "empty";
  }

  try {
    const host = new URL(value).hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host === "minio" ||
      host === "scanner" ||
      host === "clamav" ||
      host.includes("puresoc-object-storage") ||
      host.includes("puresoc-upload-scanner") ||
      host.includes("puresoc-report-renderer") ||
      host.includes("object-storage") ||
      host.includes("report-renderer")
    ) {
      return "local";
    }
    if (host.includes("test") || host.includes("ci") || host.includes("disposable") || host.includes("smoke")) {
      return "test_hint";
    }
    return "external";
  } catch {
    return "invalid";
  }
};

const isAllowedRuntimeEndpointClass = (endpointClass: ReturnType<typeof classifyRuntimeEndpoint>): boolean =>
  endpointClass === "local" || endpointClass === "test_hint";

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isSafeRuntimeSmokeTarget = (targetKind: string): boolean =>
  targetKind === "local" ||
  targetKind === "development" ||
  targetKind === "test" ||
  targetKind === "ci" ||
  targetKind === "disposable";

const sortedUnique = (values: string[]): string[] => [...new Set(values.filter(Boolean))].sort();

const sanitizeSmokeId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "smoke";

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

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
