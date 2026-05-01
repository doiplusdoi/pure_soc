type DelegateArgs = Record<string, unknown>;

interface AuditLogDelegate {
  create(args: DelegateArgs): Promise<unknown>;
  findFirst(args: DelegateArgs): Promise<AuditLogRow | null>;
}

interface AuditLogRow {
  id: string;
  organizationId?: string | null;
  entryHash?: string | null;
  hashAlgorithm?: string | null;
  createdAt?: Date | string;
}

export interface PrismaAuditClient {
  auditLog: AuditLogDelegate;
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
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
  previousHash: string | null;
  hashAlgorithm: PrismaAuditHashAlgorithm;
}

export interface PrismaAuditLogRecord {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
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
  entryHash: string;
  hashAlgorithm: PrismaAuditHashAlgorithm;
}

export class PrismaAuditSink {
  readonly records: PrismaAuditLogRecord[] = [];

  constructor(private readonly client: PrismaAuditClient) {}

  async append(record: PrismaAuditLogRecord): Promise<void> {
    await this.client.auditLog.create({
      data: toAuditLogData(record)
    });
    this.records.push(record);
  }

  async getLatestIntegrityAnchor(organizationId: string | null): Promise<PrismaAuditLogIntegrityAnchor | null> {
    const inProcessRecord = [...this.records].reverse().find((record) => record.organizationId === organizationId);
    if (inProcessRecord) {
      return {
        organizationId,
        entryHash: inProcessRecord.entryHash,
        hashAlgorithm: inProcessRecord.hashAlgorithm
      };
    }

    const row = await this.client.auditLog.findFirst({
      where: {
        organizationId,
        entryHash: {
          not: null
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!row?.entryHash || !isAuditHashAlgorithm(row.hashAlgorithm)) {
      return null;
    }

    return {
      organizationId,
      entryHash: row.entryHash,
      hashAlgorithm: row.hashAlgorithm
    };
  }

  findByAction(action: string): PrismaAuditLogRecord[] {
    return this.records.filter((record) => record.action === action);
  }
}

const toAuditLogData = (record: PrismaAuditLogRecord): Record<string, unknown> => ({
  id: record.id,
  organizationId: record.organizationId,
  actorUserId: record.actorUserId,
  targetType: record.targetType,
  targetId: record.targetId,
  action: record.action,
  ipAddress: record.ipAddress,
  userAgent: record.userAgent,
  beforeJson: jsonOrNull(record.canonicalPayload.beforeJson),
  afterJson: jsonOrNull(record.canonicalPayload.afterJson),
  previousHash: record.previousHash,
  entryHash: record.entryHash,
  hashAlgorithm: record.hashAlgorithm,
  canonicalPayload: record.canonicalPayload,
  createdAt: new Date(record.createdAt)
});

const jsonOrNull = (value: unknown): unknown => (value === undefined ? null : value);

const isAuditHashAlgorithm = (value: unknown): value is PrismaAuditHashAlgorithm => value === "sha256";
