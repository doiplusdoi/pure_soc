import {
  buildAuditCanonicalPayload,
  type AuditCheckpointRecord,
  type AuditCheckpointRepository,
  type AuditLogDraft,
  type AuditLogIntegrityBuilder,
  createAuditExportHandoff,
  createAuditRetentionExportPolicy,
  type AuditExternalCheckpointStatus,
  noneExternalCheckpointProviderStatus,
  type AuditExternalCheckpointProviderStatus,
  type AuditExportGuarantees,
  type AuditExportRepositoryScope,
  type AuditExportViolation,
  type AuditHashAlgorithm,
  type AuditLogRecord
} from "@puresoc/audit";
import { createHash } from "node:crypto";

type DelegateArgs = Record<string, unknown>;

interface AuditLogDelegate {
  create(args: DelegateArgs): Promise<unknown>;
  findFirst(args: DelegateArgs): Promise<AuditLogRow | null>;
}

interface PrismaAuditTransactionClient {
  auditLog: AuditLogDelegate;
  $queryRawUnsafe?<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

interface AuditLogExportDelegate {
  findMany(args: DelegateArgs): Promise<AuditLogExportRow[]>;
}

interface AuditCheckpointDelegate {
  create(args: DelegateArgs): Promise<unknown>;
  findMany(args: DelegateArgs): Promise<AuditCheckpointRow[]>;
}

interface AuditLogRow {
  id: string;
  organizationId?: string | null;
  scopeKey?: string | null;
  chainSequence?: number | null;
  entryHash?: string | null;
  hashAlgorithm?: string | null;
  createdAt?: Date | string;
}

export interface PrismaAuditClient extends PrismaAuditTransactionClient {
  auditLog: AuditLogDelegate;
  $transaction<T>(callback: (tx: PrismaAuditTransactionClient) => Promise<T>): Promise<T>;
}

export interface PrismaAuditCheckpointClient {
  auditLog: AuditLogExportDelegate;
  auditCheckpoint: AuditCheckpointDelegate;
}

export type PrismaAuditHashAlgorithm = "sha256";

export interface PrismaAuditCanonicalPayload {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  contextJson: unknown;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
  previousHash: string | null;
  hashAlgorithm: PrismaAuditHashAlgorithm;
}

export interface PrismaAuditLogRecord {
  id: string;
  organizationId: string | null;
  scopeKey?: string;
  chainSequence?: number;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  contextJson: unknown;
  beforeJson: unknown;
  afterJson: unknown;
  previousHash: string | null;
  entryHash: string;
  hashAlgorithm: PrismaAuditHashAlgorithm;
  canonicalPayload: PrismaAuditCanonicalPayload;
  createdAt: Date;
}

export interface PrismaAuditLogIntegrityAnchor {
  organizationId: string | null;
  scopeKey: string;
  chainSequence: number;
  entryHash: string;
  hashAlgorithm: PrismaAuditHashAlgorithm;
}

interface AuditLogExportRow {
  id: string;
  organizationId?: string | null;
  actorUserId?: string | null;
  targetType: string;
  targetId?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  contextJson?: unknown;
  beforeJson?: unknown;
  afterJson?: unknown;
  previousHash?: string | null;
  entryHash?: string | null;
  hashAlgorithm?: string | null;
  canonicalPayload?: PrismaAuditCanonicalPayload | null;
  createdAt?: Date | string;
}

interface AuditCheckpointRow {
  id: string;
  organizationId?: string | null;
  scopeType: string;
  exportId: string;
  exportedAt: Date | string;
  createdAt: Date | string;
  createdByUserId?: string | null;
  recordCount: number;
  firstRecordId?: string | null;
  terminalRecordId?: string | null;
  initialPreviousHash?: string | null;
  terminalHash?: string | null;
  exportHash: string;
  hashAlgorithm: string;
  verificationStatus: string;
  verificationViolationsJson?: unknown;
  externalCheckpointStatus: string;
  externalCheckpointReference?: string | null;
  externalCheckpointProvider?: string | null;
  externalCheckpointProviderStatusJson?: unknown;
  externalCheckpointRecordedAt?: Date | string | null;
  externalCheckpointPayloadHash?: string | null;
  externalCheckpointMetadataJson?: unknown;
  retentionPolicyJson?: unknown;
  guaranteesJson?: unknown;
}

export class PrismaAuditSink {
  readonly records: PrismaAuditLogRecord[] = [];

  constructor(private readonly client: PrismaAuditClient) {}

  async append(record: PrismaAuditLogRecord): Promise<void> {
    await this.client.$transaction(async (tx) => {
      const scopeKey = auditScopeKeyForOrganization(record.organizationId);
      await acquireAuditScopeAdvisoryLock(tx, scopeKey);
      const latestAnchor = await this.getLatestPersistedIntegrityAnchor(tx, record.organizationId, scopeKey);
      const recordWithPersistenceMetadata = withAuditPersistenceMetadata(
        record,
        scopeKey,
        nextAuditChainSequence(latestAnchor)
      );
      await tx.auditLog.create({
        data: toAuditLogData(recordWithPersistenceMetadata)
      });
      this.records.push(recordWithPersistenceMetadata);
    });
  }

  async appendWithIntegrity(
    draft: AuditLogDraft,
    buildRecord: AuditLogIntegrityBuilder
  ): Promise<PrismaAuditLogRecord> {
    return this.client.$transaction(async (tx) => {
      const scopeKey = auditScopeKeyForOrganization(draft.organizationId);
      await acquireAuditScopeAdvisoryLock(tx, scopeKey);
      const latestAnchor = await this.getLatestPersistedIntegrityAnchor(tx, draft.organizationId, scopeKey);
      const record = withAuditPersistenceMetadata(
        buildRecord(latestAnchor?.entryHash ?? null),
        scopeKey,
        nextAuditChainSequence(latestAnchor)
      );
      await tx.auditLog.create({
        data: toAuditLogData(record)
      });
      this.records.push(record);
      return record;
    });
  }

  async getLatestIntegrityAnchor(organizationId: string | null): Promise<PrismaAuditLogIntegrityAnchor | null> {
    return this.getLatestPersistedIntegrityAnchor(
      this.client,
      organizationId,
      auditScopeKeyForOrganization(organizationId)
    );
  }

  private async getLatestPersistedIntegrityAnchor(
    client: PrismaAuditTransactionClient,
    organizationId: string | null,
    scopeKey: string
  ): Promise<PrismaAuditLogIntegrityAnchor | null> {
    const row = await client.auditLog.findFirst({
      where: {
        scopeKey,
        entryHash: {
          not: null
        }
      },
      orderBy: {
        chainSequence: "desc"
      }
    });

    if (!row?.entryHash || !isAuditHashAlgorithm(row.hashAlgorithm)) {
      return null;
    }

    return {
      organizationId,
      scopeKey,
      chainSequence: typeof row.chainSequence === "number" ? row.chainSequence : 0,
      entryHash: row.entryHash,
      hashAlgorithm: row.hashAlgorithm
    };
  }

  findByAction(action: string): PrismaAuditLogRecord[] {
    return this.records.filter((record) => record.action === action);
  }
}

export class PrismaAuditCheckpointRepository implements AuditCheckpointRepository {
  constructor(private readonly client: PrismaAuditCheckpointClient) {}

  async listAuditRecords(scope: AuditExportRepositoryScope): Promise<AuditLogRecord[]> {
    const rows = await this.client.auditLog.findMany({
      where: {
        organizationId: scope.organizationId,
        entryHash: {
          not: null
        }
      },
      orderBy: {
        chainSequence: "asc"
      }
    });

    return rows.map(toAuditLogRecord);
  }

  async saveAuditCheckpoint(record: AuditCheckpointRecord): Promise<void> {
    await this.client.auditCheckpoint.create({
      data: toAuditCheckpointData(record)
    });
  }

  async listAuditCheckpoints(scope: AuditExportRepositoryScope): Promise<AuditCheckpointRecord[]> {
    const rows = await this.client.auditCheckpoint.findMany({
      where: {
        organizationId: scope.organizationId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return rows.map(toAuditCheckpointRecord);
  }
}

const toAuditLogData = (record: PrismaAuditLogRecord): Record<string, unknown> => ({
  id: record.id,
  organizationId: record.organizationId,
  scopeKey: record.scopeKey ?? auditScopeKeyForOrganization(record.organizationId),
  chainSequence: record.chainSequence ?? 1,
  actorUserId: record.actorUserId,
  targetType: record.targetType,
  targetId: record.targetId,
  action: record.action,
  ipAddress: record.ipAddress,
  userAgent: record.userAgent,
  contextJson: jsonOrEmptyObject(record.canonicalPayload.contextJson),
  beforeJson: jsonOrNull(record.canonicalPayload.beforeJson),
  afterJson: jsonOrNull(record.canonicalPayload.afterJson),
  previousHash: record.previousHash,
  entryHash: record.entryHash,
  hashAlgorithm: record.hashAlgorithm,
  canonicalPayload: record.canonicalPayload,
  createdAt: new Date(record.createdAt)
});

const toAuditCheckpointData = (record: AuditCheckpointRecord): Record<string, unknown> => ({
  id: record.id,
  organizationId: record.organizationId,
  scopeType: record.scope.type,
  exportId: record.exportId,
  exportedAt: new Date(record.exportedAt),
  createdAt: new Date(record.createdAt),
  createdByUserId: record.createdByUserId,
  recordCount: record.recordCount,
  firstRecordId: record.firstRecordId,
  terminalRecordId: record.terminalRecordId,
  initialPreviousHash: record.initialPreviousHash,
  terminalHash: record.terminalHash,
  exportHash: record.exportHash,
  hashAlgorithm: record.hashAlgorithm,
  verificationStatus: record.verificationStatus,
  verificationViolationsJson: record.verificationViolations,
  externalCheckpointStatus: record.externalCheckpointStatus,
  externalCheckpointReference: record.externalCheckpointReference,
  externalCheckpointProvider: record.externalCheckpointProvider,
  externalCheckpointProviderStatusJson: record.externalCheckpointProviderStatus,
  externalCheckpointRecordedAt: record.externalCheckpointRecordedAt ? new Date(record.externalCheckpointRecordedAt) : null,
  externalCheckpointPayloadHash: record.externalCheckpointPayloadHash,
  externalCheckpointMetadataJson: record.externalCheckpointMetadata,
  retentionPolicyJson: record.retentionPolicy,
  guaranteesJson: record.guarantees
});

const toAuditLogRecord = (row: AuditLogExportRow): AuditLogRecord => {
  const createdAt = toDate(row.createdAt);
  const hashAlgorithm = isAuditHashAlgorithm(row.hashAlgorithm) ? row.hashAlgorithm : "sha256";
  const record = {
    id: row.id,
    organizationId: row.organizationId ?? null,
    actorUserId: row.actorUserId ?? null,
    targetType: row.targetType,
    targetId: row.targetId ?? null,
    action: row.action,
    ipAddress: row.ipAddress ?? null,
    userAgent: row.userAgent ?? null,
    contextJson: row.contextJson ?? {},
    beforeJson: row.beforeJson ?? null,
    afterJson: row.afterJson ?? null,
    previousHash: row.previousHash ?? null,
    entryHash: row.entryHash ?? "",
    hashAlgorithm,
    createdAt
  } satisfies Omit<AuditLogRecord, "canonicalPayload">;

  return {
    ...record,
    canonicalPayload: isAuditCanonicalPayload(row.canonicalPayload)
      ? row.canonicalPayload
      : buildAuditCanonicalPayload(record)
  };
};

const toAuditCheckpointRecord = (row: AuditCheckpointRow): AuditCheckpointRecord => {
  const organizationId = row.organizationId ?? null;
  const createdAt = toDate(row.createdAt).toISOString();
  const externalCheckpointStatus = toAuditExternalCheckpointStatus(row.externalCheckpointStatus);
  const externalCheckpointProviderStatus = toAuditExternalCheckpointProviderStatus(
    row.externalCheckpointProviderStatusJson
  );
  const externalCheckpointRecordedAt = row.externalCheckpointRecordedAt
    ? toDate(row.externalCheckpointRecordedAt).toISOString()
    : null;
  const retentionPolicy = toAuditRetentionExportPolicy(row.retentionPolicyJson);
  const guarantees = toAuditExportGuarantees(row.guaranteesJson);

  return {
    id: row.id,
    organizationId,
    scope: {
      type: row.scopeType === "global" ? "global" : "organization",
      organizationId
    },
    exportId: row.exportId,
    exportedAt: toDate(row.exportedAt).toISOString(),
    createdAt,
    createdByUserId: row.createdByUserId ?? null,
    recordCount: row.recordCount,
    firstRecordId: row.firstRecordId ?? null,
    terminalRecordId: row.terminalRecordId ?? null,
    initialPreviousHash: row.initialPreviousHash ?? null,
    terminalHash: row.terminalHash ?? null,
    exportHash: row.exportHash,
    hashAlgorithm: toAuditHashAlgorithm(row.hashAlgorithm),
    verificationStatus: row.verificationStatus === "valid" ? "valid" : "invalid",
    verificationViolations: toAuditExportViolations(row.verificationViolationsJson),
    externalCheckpointStatus,
    externalCheckpointReference: row.externalCheckpointReference ?? null,
    externalCheckpointProvider: row.externalCheckpointProvider ?? "none",
    externalCheckpointProviderStatus,
    externalCheckpointRecordedAt,
    externalCheckpointPayloadHash: row.externalCheckpointPayloadHash ?? null,
    externalCheckpointMetadata: toRecord(row.externalCheckpointMetadataJson),
    retentionPolicy,
    guarantees,
    handoff: createAuditExportHandoff({
      exportId: row.exportId,
      checkpointId: row.id,
      organizationId,
      recordCount: row.recordCount,
      terminalHash: row.terminalHash ?? null,
      exportHash: row.exportHash,
      createdAt,
      externalCheckpointStatus,
      externalCheckpointReference: row.externalCheckpointReference ?? null,
      externalCheckpointRecordedAt,
      externalCheckpointPayloadHash: row.externalCheckpointPayloadHash ?? null,
      externalCheckpointProviderStatus,
      externalCheckpointMetadata: toRecord(row.externalCheckpointMetadataJson),
      guarantees
    })
  };
};

const jsonOrNull = (value: unknown): unknown => (value === undefined ? null : value);
const jsonOrEmptyObject = (value: unknown): unknown => (value === undefined ? {} : value);

export const auditScopeKeyForOrganization = (organizationId: string | null): string =>
  organizationId === null ? "global" : `organization:${organizationId}`;

const auditAdvisoryLockNamespace = 0x50534341;

export const auditScopeAdvisoryLockKey = (scopeKey: string): {
  namespace: number;
  scope: number;
} => ({
  namespace: auditAdvisoryLockNamespace,
  scope: createHash("sha256").update(scopeKey).digest().readInt32BE(0)
});

const acquireAuditScopeAdvisoryLock = async (
  client: PrismaAuditTransactionClient,
  scopeKey: string
): Promise<void> => {
  if (!client.$queryRawUnsafe) {
    return;
  }

  const lockKey = auditScopeAdvisoryLockKey(scopeKey);
  await client.$queryRawUnsafe(
    "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
    lockKey.namespace,
    lockKey.scope
  );
};

const nextAuditChainSequence = (anchor: Pick<PrismaAuditLogIntegrityAnchor, "chainSequence"> | null): number =>
  (anchor?.chainSequence ?? 0) + 1;

const withAuditPersistenceMetadata = (
  record: PrismaAuditLogRecord,
  scopeKey: string,
  chainSequence: number
): PrismaAuditLogRecord => ({
  ...record,
  scopeKey,
  chainSequence
});

const isAuditHashAlgorithm = (value: unknown): value is PrismaAuditHashAlgorithm => value === "sha256";

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const toAuditHashAlgorithm = (value: unknown): AuditHashAlgorithm =>
  isAuditHashAlgorithm(value) ? value : "sha256";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAuditCanonicalPayload = (value: unknown): value is PrismaAuditCanonicalPayload =>
  isRecord(value) &&
  typeof value.id === "string" &&
  ("organizationId" in value || "organization_id" in value) &&
  typeof value.targetType === "string" &&
  typeof value.action === "string" &&
  typeof value.createdAt === "string" &&
  value.hashAlgorithm === "sha256";

const isAuditExportViolation = (value: unknown): value is AuditExportViolation =>
  isRecord(value) && typeof value.code === "string";

const toAuditExportViolations = (value: unknown): AuditExportViolation[] =>
  Array.isArray(value) ? value.filter(isAuditExportViolation) : [];

const toAuditExportGuarantees = (value: unknown): AuditExportGuarantees => {
  if (isRecord(value) && value.databaseHashChain === "tamper_evident_only") {
    return {
      databaseHashChain: "tamper_evident_only",
      databaseRowsAreWorm: false,
      externalCheckpoint:
        value.externalCheckpoint === "fake_test_anchor_only"
          ? "fake_test_anchor_only"
          : value.externalCheckpoint === "external_anchor_recorded"
            ? "external_anchor_recorded"
            : "not_configured",
      externalNotarization: false,
      legalCertification: false
    };
  }

  return {
    databaseHashChain: "tamper_evident_only",
    databaseRowsAreWorm: false,
    externalCheckpoint: "not_configured",
    externalNotarization: false,
    legalCertification: false
  };
};

const toAuditExternalCheckpointStatus = (value: unknown): AuditExternalCheckpointStatus =>
  value === "pending_external_anchor" ||
  value === "fake_anchor_recorded" ||
  value === "externally_recorded" ||
  value === "external_anchor_failed"
    ? value
    : "not_configured";

const toRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const toAuditExternalCheckpointProviderStatus = (value: unknown): AuditExternalCheckpointProviderStatus => {
  if (isRecord(value)) {
    const mode =
      value.mode === "deterministic_fake" || value.mode === "unsupported" || value.mode === "none"
        ? value.mode
        : "none";

    return {
      providerKey: typeof value.providerKey === "string" ? value.providerKey : "none",
      configured: value.configured === true,
      mode,
      liveExternalService: false,
      wormStorage: false,
      externalNotarization: false,
      legalCertification: false
    };
  }

  return noneExternalCheckpointProviderStatus();
};

const toAuditRetentionExportPolicy = (value: unknown) => {
  if (!isRecord(value)) {
    return createAuditRetentionExportPolicy();
  }

  return createAuditRetentionExportPolicy({
    policyKey: typeof value.policyKey === "string" ? value.policyKey : undefined,
    auditLogRetentionDays:
      typeof value.auditLogRetentionDays === "number" ? value.auditLogRetentionDays : undefined,
    checkpointRetentionDays:
      typeof value.checkpointRetentionDays === "number" ? value.checkpointRetentionDays : undefined,
    exportRetentionDays: typeof value.exportRetentionDays === "number" ? value.exportRetentionDays : undefined,
    checkpointCadenceDays:
      typeof value.checkpointCadenceDays === "number" ? value.checkpointCadenceDays : undefined
  });
};
