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
  | "action_failed"
  | "action_verified"
  | "action_closed";

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
