import { createHash, randomUUID } from "node:crypto";

export type AuditAction =
  | "login"
  | "logout"
  | "session_created"
  | "failed_login"
  | "local_account_created"
  | "email_verified"
  | "password_reset_requested"
  | "password_changed"
  | "identity_account_created"
  | "account_linked"
  | "account_link_rejected"
  | "organization_created"
  | "member_invited"
  | "role_changed"
  | "compliance.assessment.evaluated"
  | "compliance.recommendations.generated"
  | "action_preflight"
  | "action_approval_requested"
  | "action_approved"
  | "action_rejected"
  | "action_queued"
  | "action_applied"
  | "action_failed"
  | "action_verified"
  | "action_closed"
  | "audit_checkpoint_recorded";

export interface AuditLogInput {
  actorUserId?: string | null;
  organizationId?: string | null;
  targetType: string;
  targetId?: string | null;
  action: AuditAction | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
}

export interface AuditLogRecord {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  action: AuditAction | string;
  ipAddress: string | null;
  userAgent: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  previousHash: string | null;
  entryHash: string;
  hashAlgorithm: AuditHashAlgorithm;
  canonicalPayload: AuditCanonicalPayload;
  createdAt: Date;
}

export type AuditHashAlgorithm = "sha256";

export interface AuditCanonicalPayload {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  action: AuditAction | string;
  ipAddress: string | null;
  userAgent: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
  previousHash: string | null;
  hashAlgorithm: AuditHashAlgorithm;
}

export interface AuditLogIntegrityAnchor {
  organizationId: string | null;
  entryHash: string;
  hashAlgorithm: AuditHashAlgorithm;
}

export type AuditIntegrityViolationCode =
  | "canonical_payload_mismatch"
  | "entry_hash_mismatch"
  | "previous_hash_mismatch"
  | "unsupported_hash_algorithm";

export interface AuditIntegrityViolation {
  code: AuditIntegrityViolationCode;
  recordId: string;
  index: number;
  expected?: string | null;
  actual?: string | null;
}

export interface AuditIntegrityVerification {
  valid: boolean;
  checkedRecords: number;
  violations: AuditIntegrityViolation[];
}

export interface AuditSink {
  append(record: AuditLogRecord): Promise<void>;
  getLatestIntegrityAnchor?(organizationId: string | null): Promise<AuditLogIntegrityAnchor | null>;
}

export const auditExportSchemaVersion = "puresoc.audit.export.v1" as const;
export const auditRetentionExportPolicySchemaVersion = "puresoc.audit.retention-export-policy.v1" as const;

export type AuditExportScopeType = "organization" | "global";

export interface AuditExportScope {
  type: AuditExportScopeType;
  organizationId: string | null;
}

export interface AuditExportedRecord {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  action: AuditAction | string;
  ipAddress: string | null;
  userAgent: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  previousHash: string | null;
  entryHash: string;
  hashAlgorithm: AuditHashAlgorithm;
  canonicalPayload: AuditCanonicalPayload;
  createdAt: string;
}

export type AuditExportViolationCode =
  | AuditIntegrityViolationCode
  | "unsupported_export_schema"
  | "scope_mismatch"
  | "record_count_mismatch"
  | "terminal_hash_mismatch"
  | "terminal_record_mismatch"
  | "expected_terminal_checkpoint_mismatch"
  | "expected_initial_checkpoint_mismatch";

export interface AuditExportViolation {
  code: AuditExportViolationCode;
  recordId?: string;
  index?: number;
  expected?: string | number | null;
  actual?: string | number | null;
}

export interface AuditExportVerification {
  status: "valid" | "invalid";
  valid: boolean;
  checkedRecords: number;
  scope: AuditExportScope;
  initialPreviousHash: string | null;
  terminalHash: string | null;
  terminalRecordId: string | null;
  violations: AuditExportViolation[];
}

export interface AuditRetentionExportPolicy {
  schemaVersion: typeof auditRetentionExportPolicySchemaVersion;
  policyKey: string;
  auditLogRetentionDays: number;
  checkpointRetentionDays: number;
  exportRetentionDays: number;
  checkpointCadenceDays: number;
  retentionMode: "operator_enforced";
  exportStorage: "database_checkpoint_metadata_only";
  databaseRowsAreWorm: false;
  externalNotarization: false;
  legalCertification: false;
}

export interface AuditExportGuarantees {
  databaseHashChain: "tamper_evident_only";
  databaseRowsAreWorm: false;
  externalCheckpoint: "not_configured" | "fake_test_anchor_only";
  externalNotarization: false;
  legalCertification: false;
}

export type AuditExternalCheckpointProviderKey = "none" | "fake-local" | string;

export interface AuditExternalCheckpointProviderStatus {
  providerKey: AuditExternalCheckpointProviderKey;
  configured: boolean;
  mode: "none" | "deterministic_fake" | "unsupported";
  liveExternalService: false;
  wormStorage: false;
  externalNotarization: false;
  legalCertification: false;
}

export interface AuditExportSegment {
  schemaVersion: typeof auditExportSchemaVersion;
  exportId: string;
  scope: AuditExportScope;
  exportedAt: string;
  recordCount: number;
  firstRecordId: string | null;
  firstRecordCreatedAt: string | null;
  initialPreviousHash: string | null;
  terminalRecordId: string | null;
  terminalRecordCreatedAt: string | null;
  terminalHash: string | null;
  hashAlgorithm: AuditHashAlgorithm;
  retentionPolicy: AuditRetentionExportPolicy;
  externalCheckpointProviderStatus: AuditExternalCheckpointProviderStatus;
  records: AuditExportedRecord[];
  verification: AuditExportVerification;
  guarantees: AuditExportGuarantees;
}

export interface AuditExportVerificationOptions {
  expectedInitialPreviousHash?: string | null;
  expectedTerminalHash?: string | null;
}

export type AuditExternalCheckpointStatus =
  | "not_configured"
  | "pending_external_anchor"
  | "fake_anchor_recorded"
  | "externally_recorded";

export interface AuditCheckpointRecord {
  id: string;
  organizationId: string | null;
  scope: AuditExportScope;
  exportId: string;
  exportedAt: string;
  createdAt: string;
  createdByUserId: string | null;
  recordCount: number;
  firstRecordId: string | null;
  terminalRecordId: string | null;
  initialPreviousHash: string | null;
  terminalHash: string | null;
  exportHash: string;
  hashAlgorithm: AuditHashAlgorithm;
  verificationStatus: AuditExportVerification["status"];
  verificationViolations: AuditExportViolation[];
  externalCheckpointStatus: AuditExternalCheckpointStatus;
  externalCheckpointReference: string | null;
  externalCheckpointProvider: string;
  externalCheckpointProviderStatus: AuditExternalCheckpointProviderStatus;
  externalCheckpointRecordedAt: string | null;
  externalCheckpointPayloadHash: string | null;
  externalCheckpointMetadata: Record<string, unknown>;
  retentionPolicy: AuditRetentionExportPolicy;
  guarantees: AuditExportGuarantees;
}

export interface AuditExternalCheckpointAnchorInput {
  segment: AuditExportSegment;
  checkpoint: AuditCheckpointRecord;
  retentionPolicy: AuditRetentionExportPolicy;
}

export interface AuditExternalCheckpointAnchorResult {
  status: AuditExternalCheckpointStatus;
  providerKey: string;
  reference: string | null;
  recordedAt: string | null;
  payloadHash: string | null;
  metadata: Record<string, unknown>;
  guarantee: AuditExportGuarantees["externalCheckpoint"];
}

export interface AuditExternalCheckpointProvider {
  describeStatus(): AuditExternalCheckpointProviderStatus;
  recordCheckpoint(input: AuditExternalCheckpointAnchorInput): Promise<AuditExternalCheckpointAnchorResult>;
}

export interface AuditExportRepositoryScope {
  organizationId: string | null;
}

export interface AuditCheckpointRepository {
  listAuditRecords(scope: AuditExportRepositoryScope): Promise<AuditLogRecord[]>;
  saveAuditCheckpoint(record: AuditCheckpointRecord): Promise<void>;
  listAuditCheckpoints(scope: AuditExportRepositoryScope): Promise<AuditCheckpointRecord[]>;
}

export interface AuditCheckpointServiceOptions {
  repository: AuditCheckpointRepository;
  retentionPolicy?: AuditRetentionExportPolicy;
  externalCheckpointProvider?: AuditExternalCheckpointProvider;
  now?: () => Date;
  idFactory?: () => string;
}

export interface RecordAuditCheckpointInput {
  organizationId: string | null;
  createdByUserId?: string | null;
  expectedTerminalHash?: string | null;
}

export class AuditExportError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 409) {
    super(message);
    this.name = "AuditExportError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface AuditWriterOptions {
  sink: AuditSink;
  now?: () => Date;
  idFactory?: () => string;
}

const sensitiveKeyFragments = [
  "password",
  "token",
  "oauthcode",
  "codeverifier",
  "access",
  "refresh",
  "cookie",
  "authorization",
  "secret",
  "storageuri"
] as const;

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
const auditHashAlgorithm: AuditHashAlgorithm = "sha256";

export const isSensitiveAuditKey = (key: string): boolean => {
  const normalized = normalizeKey(key);
  return sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
};

export const redactSensitiveAuditValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveAuditValue(entry));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  let removed = 0;

  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveAuditKey(key)) {
      removed += 1;
      continue;
    }

    redacted[key] = redactSensitiveAuditValue(entry);
  }

  if (removed > 0) {
    redacted.redactedFieldCount = removed;
  }

  return redacted;
};

const stableJsonValue = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => stableJsonValue(entry));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const entry = (value as Record<string, unknown>)[key];
    if (entry !== undefined) {
      sorted[key] = stableJsonValue(entry);
    }
  }

  return sorted;
};

export const stringifyAuditCanonicalPayload = (payload: AuditCanonicalPayload): string =>
  JSON.stringify(stableJsonValue(payload));

const stringifyStableJson = (value: unknown): string => JSON.stringify(stableJsonValue(value));

export const createAuditRetentionExportPolicy = (
  input: Partial<
    Omit<
      AuditRetentionExportPolicy,
      | "schemaVersion"
      | "retentionMode"
      | "exportStorage"
      | "databaseRowsAreWorm"
      | "externalNotarization"
      | "legalCertification"
    >
  > = {}
): AuditRetentionExportPolicy => ({
  schemaVersion: auditRetentionExportPolicySchemaVersion,
  policyKey: input.policyKey ?? "puresoc-audit-database-only-7y",
  auditLogRetentionDays: input.auditLogRetentionDays ?? 2555,
  checkpointRetentionDays: input.checkpointRetentionDays ?? 2555,
  exportRetentionDays: input.exportRetentionDays ?? 2555,
  checkpointCadenceDays: input.checkpointCadenceDays ?? 30,
  retentionMode: "operator_enforced",
  exportStorage: "database_checkpoint_metadata_only",
  databaseRowsAreWorm: false,
  externalNotarization: false,
  legalCertification: false
});

export const noneExternalCheckpointProviderStatus = (): AuditExternalCheckpointProviderStatus => ({
  providerKey: "none",
  configured: false,
  mode: "none",
  liveExternalService: false,
  wormStorage: false,
  externalNotarization: false,
  legalCertification: false
});

export const fakeExternalCheckpointProviderStatus = (): AuditExternalCheckpointProviderStatus => ({
  providerKey: "fake-local",
  configured: true,
  mode: "deterministic_fake",
  liveExternalService: false,
  wormStorage: false,
  externalNotarization: false,
  legalCertification: false
});

export class NoneExternalAuditCheckpointProvider implements AuditExternalCheckpointProvider {
  describeStatus(): AuditExternalCheckpointProviderStatus {
    return noneExternalCheckpointProviderStatus();
  }

  async recordCheckpoint(): Promise<AuditExternalCheckpointAnchorResult> {
    return {
      status: "not_configured",
      providerKey: "none",
      reference: null,
      recordedAt: null,
      payloadHash: null,
      metadata: {
        providerKey: "none",
        configured: false,
        liveExternalService: false
      },
      guarantee: "not_configured"
    };
  }
}

export class FakeExternalAuditCheckpointProvider implements AuditExternalCheckpointProvider {
  private readonly now: () => Date;
  private readonly referencePrefix: string;

  constructor(options: { now?: () => Date; referencePrefix?: string } = {}) {
    this.now = options.now ?? (() => new Date());
    this.referencePrefix = options.referencePrefix ?? "fake-audit-anchor";
  }

  describeStatus(): AuditExternalCheckpointProviderStatus {
    return fakeExternalCheckpointProviderStatus();
  }

  async recordCheckpoint(input: AuditExternalCheckpointAnchorInput): Promise<AuditExternalCheckpointAnchorResult> {
    const payload = {
      schemaVersion: "puresoc.audit.fake-external-checkpoint.v1",
      providerKey: "fake-local",
      checkpointId: input.checkpoint.id,
      organizationId: input.checkpoint.organizationId,
      exportId: input.checkpoint.exportId,
      recordCount: input.checkpoint.recordCount,
      terminalHash: input.checkpoint.terminalHash,
      exportHash: input.checkpoint.exportHash,
      retentionPolicyKey: input.retentionPolicy.policyKey
    };
    const payloadHash = createHash(auditHashAlgorithm).update(stringifyStableJson(payload)).digest("hex");

    return {
      status: "fake_anchor_recorded",
      providerKey: "fake-local",
      reference: `${this.referencePrefix}:${payloadHash.slice(0, 16)}`,
      recordedAt: this.now().toISOString(),
      payloadHash,
      metadata: {
        testOnly: true,
        liveExternalService: false,
        wormStorage: false,
        externalNotarization: false,
        legalCertification: false,
        payload
      },
      guarantee: "fake_test_anchor_only"
    };
  }
}

export const buildAuditCanonicalPayload = (
  record: Pick<
    AuditLogRecord,
    | "id"
    | "organizationId"
    | "actorUserId"
    | "targetType"
    | "targetId"
    | "action"
    | "ipAddress"
    | "userAgent"
    | "beforeJson"
    | "afterJson"
    | "createdAt"
    | "previousHash"
    | "hashAlgorithm"
  >
): AuditCanonicalPayload => ({
  id: record.id,
  organizationId: record.organizationId,
  actorUserId: record.actorUserId,
  targetType: record.targetType,
  targetId: record.targetId,
  action: record.action,
  ipAddress: record.ipAddress,
  userAgent: record.userAgent,
  beforeJson: stableJsonValue(record.beforeJson),
  afterJson: stableJsonValue(record.afterJson),
  createdAt: record.createdAt.toISOString(),
  previousHash: record.previousHash,
  hashAlgorithm: record.hashAlgorithm
});

export const hashAuditCanonicalPayload = (payload: AuditCanonicalPayload): string =>
  createHash(auditHashAlgorithm).update(stringifyAuditCanonicalPayload(payload)).digest("hex");

export const auditExportGuarantees = (
  externalCheckpoint: AuditExportGuarantees["externalCheckpoint"] = "not_configured"
): AuditExportGuarantees => ({
  databaseHashChain: "tamper_evident_only",
  databaseRowsAreWorm: false,
  externalCheckpoint,
  externalNotarization: false,
  legalCertification: false
});

export const auditExportScopeForOrganization = (organizationId: string | null): AuditExportScope => ({
  type: organizationId === null ? "global" : "organization",
  organizationId
});

const toIsoString = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());

export const toAuditExportedRecord = (record: AuditLogRecord): AuditExportedRecord => {
  const canonicalPayload = record.canonicalPayload ?? buildAuditCanonicalPayload(record);

  return {
    id: record.id,
    organizationId: record.organizationId,
    actorUserId: record.actorUserId,
    targetType: record.targetType,
    targetId: record.targetId,
    action: record.action,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    beforeJson: redactSensitiveAuditValue(record.beforeJson),
    afterJson: redactSensitiveAuditValue(record.afterJson),
    previousHash: record.previousHash,
    entryHash: record.entryHash,
    hashAlgorithm: record.hashAlgorithm,
    canonicalPayload,
    createdAt: toIsoString(record.createdAt)
  };
};

const toAuditRecordFromExportedRecord = (record: AuditExportedRecord): AuditLogRecord => ({
  ...record,
  createdAt: new Date(record.createdAt)
});

export const verifyAuditExportSegment = (
  segment: AuditExportSegment,
  options: AuditExportVerificationOptions = {}
): AuditExportVerification => {
  const violations: AuditExportViolation[] = [];

  if (segment.schemaVersion !== auditExportSchemaVersion) {
    violations.push({
      code: "unsupported_export_schema",
      expected: auditExportSchemaVersion,
      actual: segment.schemaVersion
    });
  }

  if (segment.recordCount !== segment.records.length) {
    violations.push({
      code: "record_count_mismatch",
      expected: segment.recordCount,
      actual: segment.records.length
    });
  }

  if (options.expectedInitialPreviousHash !== undefined && options.expectedInitialPreviousHash !== segment.initialPreviousHash) {
    violations.push({
      code: "expected_initial_checkpoint_mismatch",
      expected: options.expectedInitialPreviousHash ?? null,
      actual: segment.initialPreviousHash
    });
  }

  let expectedPreviousHash = segment.initialPreviousHash;
  let terminalHash: string | null = null;
  let terminalRecordId: string | null = null;

  segment.records.forEach((exportedRecord, index) => {
    if (exportedRecord.organizationId !== segment.scope.organizationId) {
      violations.push({
        code: "scope_mismatch",
        recordId: exportedRecord.id,
        index,
        expected: segment.scope.organizationId,
        actual: exportedRecord.organizationId
      });
    }

    if (exportedRecord.hashAlgorithm !== auditHashAlgorithm) {
      violations.push({
        code: "unsupported_hash_algorithm",
        recordId: exportedRecord.id,
        index,
        expected: auditHashAlgorithm,
        actual: exportedRecord.hashAlgorithm
      });
    }

    if (exportedRecord.previousHash !== expectedPreviousHash) {
      violations.push({
        code: "previous_hash_mismatch",
        recordId: exportedRecord.id,
        index,
        expected: expectedPreviousHash,
        actual: exportedRecord.previousHash
      });
    }

    const auditRecord = toAuditRecordFromExportedRecord(exportedRecord);
    const expectedCanonicalPayload = buildAuditCanonicalPayload(auditRecord);
    const expectedCanonical = stringifyAuditCanonicalPayload(expectedCanonicalPayload);
    const actualCanonical = stringifyAuditCanonicalPayload(exportedRecord.canonicalPayload);
    if (actualCanonical !== expectedCanonical) {
      violations.push({
        code: "canonical_payload_mismatch",
        recordId: exportedRecord.id,
        index,
        expected: expectedCanonical,
        actual: actualCanonical
      });
    }

    const expectedEntryHash = hashAuditCanonicalPayload(expectedCanonicalPayload);
    if (exportedRecord.entryHash !== expectedEntryHash) {
      violations.push({
        code: "entry_hash_mismatch",
        recordId: exportedRecord.id,
        index,
        expected: expectedEntryHash,
        actual: exportedRecord.entryHash
      });
    }

    expectedPreviousHash = exportedRecord.entryHash;
    terminalHash = exportedRecord.entryHash;
    terminalRecordId = exportedRecord.id;
  });

  if (segment.terminalHash !== terminalHash) {
    violations.push({
      code: "terminal_hash_mismatch",
      expected: segment.terminalHash,
      actual: terminalHash
    });
  }

  if (segment.terminalRecordId !== terminalRecordId) {
    violations.push({
      code: "terminal_record_mismatch",
      expected: segment.terminalRecordId,
      actual: terminalRecordId
    });
  }

  if (options.expectedTerminalHash !== undefined && options.expectedTerminalHash !== terminalHash) {
    violations.push({
      code: "expected_terminal_checkpoint_mismatch",
      expected: options.expectedTerminalHash ?? null,
      actual: terminalHash
    });
  }

  return {
    status: violations.length === 0 ? "valid" : "invalid",
    valid: violations.length === 0,
    checkedRecords: segment.records.length,
    scope: segment.scope,
    initialPreviousHash: segment.initialPreviousHash,
    terminalHash,
    terminalRecordId,
    violations
  };
};

export const createAuditExportSegment = (
  records: AuditLogRecord[],
  options: {
    organizationId: string | null;
    exportedAt?: Date;
    exportId?: string;
    expectedTerminalHash?: string | null;
    retentionPolicy?: AuditRetentionExportPolicy;
    externalCheckpointProviderStatus?: AuditExternalCheckpointProviderStatus;
    externalCheckpointGuarantee?: AuditExportGuarantees["externalCheckpoint"];
  }
): AuditExportSegment => {
  const exportedRecords = records.map(toAuditExportedRecord);
  const firstRecord = exportedRecords[0] ?? null;
  const terminalRecord = exportedRecords[exportedRecords.length - 1] ?? null;
  const baseSegment: Omit<AuditExportSegment, "verification"> = {
    schemaVersion: auditExportSchemaVersion,
    exportId: options.exportId ?? randomUUID(),
    scope: auditExportScopeForOrganization(options.organizationId),
    exportedAt: (options.exportedAt ?? new Date()).toISOString(),
    recordCount: exportedRecords.length,
    firstRecordId: firstRecord?.id ?? null,
    firstRecordCreatedAt: firstRecord?.createdAt ?? null,
    initialPreviousHash: firstRecord?.previousHash ?? null,
    terminalRecordId: terminalRecord?.id ?? null,
    terminalRecordCreatedAt: terminalRecord?.createdAt ?? null,
    terminalHash: terminalRecord?.entryHash ?? null,
    hashAlgorithm: auditHashAlgorithm,
    retentionPolicy: options.retentionPolicy ?? createAuditRetentionExportPolicy(),
    externalCheckpointProviderStatus: options.externalCheckpointProviderStatus ?? noneExternalCheckpointProviderStatus(),
    records: exportedRecords,
    guarantees: auditExportGuarantees(options.externalCheckpointGuarantee)
  };
  const segment = {
    ...baseSegment,
    verification: {
      status: "valid",
      valid: true,
      checkedRecords: 0,
      scope: baseSegment.scope,
      initialPreviousHash: baseSegment.initialPreviousHash,
      terminalHash: baseSegment.terminalHash,
      terminalRecordId: baseSegment.terminalRecordId,
      violations: []
    }
  } satisfies AuditExportSegment;

  return {
    ...segment,
    verification: verifyAuditExportSegment(segment, {
      expectedTerminalHash: options.expectedTerminalHash
    })
  };
};

export const hashAuditExportSegment = (segment: AuditExportSegment): string => {
  const { verification: _verification, ...hashPayload } = segment;
  return createHash(auditHashAlgorithm).update(stringifyStableJson(hashPayload)).digest("hex");
};

export const buildAuditCheckpointFromExportSegment = (
  segment: AuditExportSegment,
  options: {
    id?: string;
    createdAt?: Date;
    createdByUserId?: string | null;
    externalCheckpointStatus?: AuditExternalCheckpointStatus;
    externalCheckpointReference?: string | null;
    externalCheckpointProvider?: string;
    externalCheckpointProviderStatus?: AuditExternalCheckpointProviderStatus;
    externalCheckpointRecordedAt?: string | null;
    externalCheckpointPayloadHash?: string | null;
    externalCheckpointMetadata?: Record<string, unknown>;
    externalCheckpointGuarantee?: AuditExportGuarantees["externalCheckpoint"];
    retentionPolicy?: AuditRetentionExportPolicy;
  } = {}
): AuditCheckpointRecord => ({
  id: options.id ?? randomUUID(),
  organizationId: segment.scope.organizationId,
  scope: segment.scope,
  exportId: segment.exportId,
  exportedAt: segment.exportedAt,
  createdAt: (options.createdAt ?? new Date()).toISOString(),
  createdByUserId: options.createdByUserId ?? null,
  recordCount: segment.recordCount,
  firstRecordId: segment.firstRecordId,
  terminalRecordId: segment.terminalRecordId,
  initialPreviousHash: segment.initialPreviousHash,
  terminalHash: segment.terminalHash,
  exportHash: hashAuditExportSegment(segment),
  hashAlgorithm: segment.hashAlgorithm,
  verificationStatus: segment.verification.status,
  verificationViolations: segment.verification.violations,
  externalCheckpointStatus: options.externalCheckpointStatus ?? "not_configured",
  externalCheckpointReference: options.externalCheckpointReference ?? null,
  externalCheckpointProvider: options.externalCheckpointProvider ?? segment.externalCheckpointProviderStatus.providerKey,
  externalCheckpointProviderStatus: options.externalCheckpointProviderStatus ?? segment.externalCheckpointProviderStatus,
  externalCheckpointRecordedAt: options.externalCheckpointRecordedAt ?? null,
  externalCheckpointPayloadHash: options.externalCheckpointPayloadHash ?? null,
  externalCheckpointMetadata: options.externalCheckpointMetadata ?? {},
  retentionPolicy: options.retentionPolicy ?? segment.retentionPolicy,
  guarantees: auditExportGuarantees(options.externalCheckpointGuarantee)
});

const attachAuditIntegrity = (
  record: Omit<AuditLogRecord, "canonicalPayload" | "entryHash" | "hashAlgorithm" | "previousHash">,
  previousHash: string | null
): AuditLogRecord => {
  const recordWithChain = {
    ...record,
    previousHash,
    hashAlgorithm: auditHashAlgorithm
  };
  const canonicalPayload = buildAuditCanonicalPayload(recordWithChain);

  return {
    ...recordWithChain,
    canonicalPayload,
    entryHash: hashAuditCanonicalPayload(canonicalPayload)
  };
};

export const verifyAuditHashChain = (
  records: AuditLogRecord[],
  organizationId?: string | null
): AuditIntegrityVerification => {
  if (organizationId === undefined) {
    const verifications = [...new Set(records.map((record) => record.organizationId))].map((scope) =>
      verifyAuditHashChain(records, scope)
    );
    const violations = verifications.flatMap((verification) => verification.violations);
    return {
      valid: violations.length === 0,
      checkedRecords: verifications.reduce((sum, verification) => sum + verification.checkedRecords, 0),
      violations
    };
  }

  const scopedRecords = records.filter((record) => record.organizationId === organizationId);
  const violations: AuditIntegrityViolation[] = [];
  let expectedPreviousHash: string | null = null;

  scopedRecords.forEach((record, index) => {
    if (record.hashAlgorithm !== auditHashAlgorithm) {
      violations.push({
        code: "unsupported_hash_algorithm",
        recordId: record.id,
        index,
        expected: auditHashAlgorithm,
        actual: record.hashAlgorithm
      });
    }

    if (record.previousHash !== expectedPreviousHash) {
      violations.push({
        code: "previous_hash_mismatch",
        recordId: record.id,
        index,
        expected: expectedPreviousHash,
        actual: record.previousHash
      });
    }

    const expectedCanonicalPayload = buildAuditCanonicalPayload(record);
    const expectedCanonical = stringifyAuditCanonicalPayload(expectedCanonicalPayload);
    const actualCanonical = stringifyAuditCanonicalPayload(record.canonicalPayload);
    if (actualCanonical !== expectedCanonical) {
      violations.push({
        code: "canonical_payload_mismatch",
        recordId: record.id,
        index,
        expected: expectedCanonical,
        actual: actualCanonical
      });
    }

    const expectedEntryHash = hashAuditCanonicalPayload(expectedCanonicalPayload);
    if (record.entryHash !== expectedEntryHash) {
      violations.push({
        code: "entry_hash_mismatch",
        recordId: record.id,
        index,
        expected: expectedEntryHash,
        actual: record.entryHash
      });
    }

    expectedPreviousHash = record.entryHash;
  });

  return {
    valid: violations.length === 0,
    checkedRecords: scopedRecords.length,
    violations
  };
};

export const assertNoSensitiveResponseFields = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      assertNoSensitiveResponseFields(entry);
    }
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveAuditKey(key)) {
      throw new Error(`Sensitive field cannot be serialized in API response: ${key}`);
    }

    assertNoSensitiveResponseFields(entry);
  }
};

export class AuditWriter {
  private readonly sink: AuditSink;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: AuditWriterOptions) {
    this.sink = options.sink;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async write(input: AuditLogInput): Promise<AuditLogRecord> {
    const record = attachAuditIntegrity(
      {
        id: this.idFactory(),
        organizationId: input.organizationId ?? null,
        actorUserId: input.actorUserId ?? null,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        action: input.action,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        beforeJson: redactSensitiveAuditValue(input.beforeJson ?? null),
        afterJson: redactSensitiveAuditValue(input.afterJson ?? null),
        createdAt: this.now()
      },
      (await this.sink.getLatestIntegrityAnchor?.(input.organizationId ?? null))?.entryHash ?? null
    );

    await this.sink.append(record);
    return record;
  }
}

export class InMemoryAuditSink implements AuditSink {
  readonly records: AuditLogRecord[] = [];

  async append(record: AuditLogRecord): Promise<void> {
    this.records.push(record);
  }

  async getLatestIntegrityAnchor(organizationId: string | null): Promise<AuditLogIntegrityAnchor | null> {
    const record = [...this.records].reverse().find((entry) => entry.organizationId === organizationId);
    return record
      ? {
          organizationId,
          entryHash: record.entryHash,
          hashAlgorithm: record.hashAlgorithm
        }
      : null;
  }

  findByAction(action: AuditAction | string): AuditLogRecord[] {
    return this.records.filter((record) => record.action === action);
  }

  verifyIntegrity(organizationId?: string | null): AuditIntegrityVerification {
    return verifyAuditHashChain(this.records, organizationId);
  }
}

export class InMemoryAuditCheckpointRepository implements AuditCheckpointRepository {
  readonly checkpoints: AuditCheckpointRecord[] = [];

  constructor(private readonly sink: Pick<InMemoryAuditSink, "records">) {}

  async listAuditRecords(scope: AuditExportRepositoryScope): Promise<AuditLogRecord[]> {
    return this.sink.records.filter((record) => record.organizationId === scope.organizationId);
  }

  async saveAuditCheckpoint(record: AuditCheckpointRecord): Promise<void> {
    this.checkpoints.push(record);
  }

  async listAuditCheckpoints(scope: AuditExportRepositoryScope): Promise<AuditCheckpointRecord[]> {
    return this.checkpoints.filter((record) => record.organizationId === scope.organizationId);
  }
}

export class AuditCheckpointService {
  private readonly repository: AuditCheckpointRepository;
  private readonly retentionPolicy: AuditRetentionExportPolicy;
  private readonly externalCheckpointProvider: AuditExternalCheckpointProvider;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: AuditCheckpointServiceOptions) {
    this.repository = options.repository;
    this.retentionPolicy = options.retentionPolicy ?? createAuditRetentionExportPolicy();
    this.externalCheckpointProvider = options.externalCheckpointProvider ?? new NoneExternalAuditCheckpointProvider();
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async exportSegment(input: AuditExportRepositoryScope & { expectedTerminalHash?: string | null }): Promise<AuditExportSegment> {
    const records = await this.repository.listAuditRecords({
      organizationId: input.organizationId
    });

    return createAuditExportSegment(records, {
      organizationId: input.organizationId,
      exportedAt: this.now(),
      exportId: this.idFactory(),
      expectedTerminalHash: input.expectedTerminalHash,
      retentionPolicy: this.retentionPolicy,
      externalCheckpointProviderStatus: this.externalCheckpointProvider.describeStatus()
    });
  }

  async recordCheckpoint(input: RecordAuditCheckpointInput): Promise<{
    checkpoint: AuditCheckpointRecord;
    segment: AuditExportSegment;
  }> {
    const segment = await this.exportSegment({
      organizationId: input.organizationId,
      expectedTerminalHash: input.expectedTerminalHash
    });

    if (!segment.verification.valid) {
      throw new AuditExportError(
        "invalid_audit_export_segment",
        "Audit export segment verification failed; checkpoint was not recorded."
      );
    }

    const checkpointWithoutExternalAnchor = buildAuditCheckpointFromExportSegment(segment, {
      id: this.idFactory(),
      createdAt: this.now(),
      createdByUserId: input.createdByUserId ?? null,
      retentionPolicy: this.retentionPolicy,
      externalCheckpointProviderStatus: this.externalCheckpointProvider.describeStatus()
    });
    const externalAnchor = await this.externalCheckpointProvider.recordCheckpoint({
      checkpoint: checkpointWithoutExternalAnchor,
      segment,
      retentionPolicy: this.retentionPolicy
    });
    const checkpoint: AuditCheckpointRecord = {
      ...checkpointWithoutExternalAnchor,
      externalCheckpointStatus: externalAnchor.status,
      externalCheckpointReference: externalAnchor.reference,
      externalCheckpointProvider: externalAnchor.providerKey,
      externalCheckpointRecordedAt: externalAnchor.recordedAt,
      externalCheckpointPayloadHash: externalAnchor.payloadHash,
      externalCheckpointMetadata: externalAnchor.metadata,
      guarantees: auditExportGuarantees(externalAnchor.guarantee)
    };
    await this.repository.saveAuditCheckpoint(checkpoint);

    return {
      checkpoint,
      segment
    };
  }

  async listCheckpoints(input: AuditExportRepositoryScope): Promise<AuditCheckpointRecord[]> {
    return this.repository.listAuditCheckpoints(input);
  }
}
