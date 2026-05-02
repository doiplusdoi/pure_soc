import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  AuditWriter,
  InMemoryAuditSink,
  buildAuditCheckpointFromExportSegment,
  createAuditExportSegment
} from "@puresoc/audit";
import {
  PrismaAuditCheckpointRepository,
  PrismaAuditSink,
  type PrismaAuditCheckpointClient,
  type PrismaAuditClient,
  type PrismaAuditLogRecord
} from "../index";

describe("PrismaAuditSink", () => {
  it("persists redacted audit records and chains organization/global anchors across sink instances", async () => {
    const client = createFakeAuditClient();
    const organizationId = randomUUID();
    const actorUserId = randomUUID();
    const sink = new PrismaAuditSink(client);
    const first = makeAuditRecord({
      organizationId,
      actorUserId,
      targetType: "session",
      targetId: "session-1",
      action: "login",
      entryHash: "a".repeat(64),
      afterJson: {
        status: "ok",
        accessToken: "must-not-persist"
      },
      canonicalAfterJson: {
        status: "ok",
        redactedFieldCount: 1
      }
    });
    const globalFirst = makeAuditRecord({
      targetType: "system",
      action: "startup",
      entryHash: "b".repeat(64),
      afterJson: {
        status: "ok"
      }
    });

    await sink.append(first);
    await sink.append(globalFirst);

    const restartedSink = new PrismaAuditSink(client);
    const organizationAnchor = await restartedSink.getLatestIntegrityAnchor(organizationId);
    const globalAnchor = await restartedSink.getLatestIntegrityAnchor(null);

    const second = makeAuditRecord({
      organizationId,
      actorUserId,
      targetType: "session",
      targetId: "session-1",
      action: "logout",
      previousHash: organizationAnchor?.entryHash ?? null,
      entryHash: "c".repeat(64)
    });
    const globalSecond = makeAuditRecord({
      targetType: "system",
      action: "shutdown",
      previousHash: globalAnchor?.entryHash ?? null,
      entryHash: "d".repeat(64)
    });
    await restartedSink.append(second);
    await restartedSink.append(globalSecond);

    expect(second.previousHash).toBe(first.entryHash);
    expect(globalSecond.previousHash).toBe(globalFirst.entryHash);
    expect(client.auditLog.rows).toHaveLength(4);
    expect(client.auditLog.rows[0]).toMatchObject({
      organizationId,
      actorUserId,
      action: "login",
      previousHash: null,
      entryHash: first.entryHash,
      hashAlgorithm: "sha256"
    });
    expect(client.auditLog.rows[0]?.afterJson).toEqual({
      status: "ok",
      redactedFieldCount: 1
    });
    expect(JSON.stringify(client.auditLog.rows)).not.toContain("must-not-persist");
    expect(JSON.stringify(client.auditLog.rows)).toContain("canonicalPayload");
  });

  it("exports audit rows and stores database-only checkpoint metadata", async () => {
    let id = 0;
    const auditSink = new InMemoryAuditSink();
    const writer = new AuditWriter({
      sink: auditSink,
      idFactory: () => `aaaaaaaa-aaaa-4aaa-8aaa-${(++id).toString().padStart(12, "0")}`,
      now: () => new Date(`2026-05-02T14:00:0${id}.000Z`)
    });
    const organizationId = randomUUID();

    await writer.write({
      organizationId,
      targetType: "evidence",
      action: "evidence_uploaded",
      afterJson: {
        status: "stored",
        storageUri: "s3://internal/object",
        refreshToken: "must-not-export"
      }
    });
    await writer.write({
      organizationId,
      targetType: "report",
      action: "report_export_created",
      afterJson: {
        status: "ready"
      }
    });

    const client = createFakeAuditCheckpointClient(auditSink.records);
    const repository = new PrismaAuditCheckpointRepository(client);
    const rows = await repository.listAuditRecords({ organizationId });
    const segment = createAuditExportSegment(rows, {
      organizationId,
      exportedAt: new Date("2026-05-02T14:01:00.000Z"),
      exportId: randomUUID()
    });
    const checkpoint = buildAuditCheckpointFromExportSegment(segment, {
      id: randomUUID(),
      createdAt: new Date("2026-05-02T14:02:00.000Z"),
      createdByUserId: randomUUID(),
      externalCheckpointStatus: "fake_anchor_recorded",
      externalCheckpointReference: "fake-audit-anchor:abc123",
      externalCheckpointProvider: "fake-local",
      externalCheckpointProviderStatus: {
        providerKey: "fake-local",
        configured: true,
        mode: "deterministic_fake",
        liveExternalService: false,
        wormStorage: false,
        externalNotarization: false,
        legalCertification: false
      },
      externalCheckpointRecordedAt: "2026-05-02T14:02:30.000Z",
      externalCheckpointPayloadHash: "e".repeat(64),
      externalCheckpointMetadata: {
        testOnly: true,
        liveExternalService: false
      },
      externalCheckpointGuarantee: "fake_test_anchor_only"
    });

    await repository.saveAuditCheckpoint(checkpoint);
    const saved = await repository.listAuditCheckpoints({ organizationId });

    expect(rows).toHaveLength(2);
    expect(segment.verification.valid).toBe(true);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      organizationId,
      recordCount: 2,
      terminalHash: checkpoint.terminalHash,
      verificationStatus: "valid",
      externalCheckpointStatus: "fake_anchor_recorded",
      externalCheckpointProvider: "fake-local",
      externalCheckpointReference: "fake-audit-anchor:abc123",
      externalCheckpointRecordedAt: "2026-05-02T14:02:30.000Z",
      externalCheckpointPayloadHash: "e".repeat(64),
      guarantees: expect.objectContaining({
        externalCheckpoint: "fake_test_anchor_only",
        externalNotarization: false
      }),
      handoff: expect.objectContaining({
        status: "database_only",
        externalAnchor: expect.objectContaining({
          status: "fake_anchor_recorded",
          providerKey: "fake-local",
          reference: "fake-audit-anchor:abc123",
          failureCode: null
        }),
        artifact: expect.objectContaining({
          storagePointerReturnedToClient: false,
          publicUrlReturnedToClient: false
        })
      }),
      retentionPolicy: expect.objectContaining({
        policyKey: "puresoc-audit-database-only-7y"
      })
    });
    expect(saved[0]?.externalCheckpointProviderStatus).toMatchObject({
      providerKey: "fake-local",
      mode: "deterministic_fake",
      liveExternalService: false
    });
    expect(saved[0]?.externalCheckpointMetadata).toMatchObject({
      testOnly: true,
      liveExternalService: false
    });
    expect(JSON.stringify(client.auditCheckpoint.rows)).not.toContain("must-not-export");
    expect(JSON.stringify(client.auditCheckpoint.rows)).not.toContain("s3://internal/object");
  });
});

const makeAuditRecord = (
  input: {
    organizationId?: string | null;
    actorUserId?: string | null;
    targetType: string;
    targetId?: string | null;
    action: string;
    previousHash?: string | null;
    entryHash: string;
    afterJson?: unknown;
    canonicalAfterJson?: unknown;
  }
): PrismaAuditLogRecord => {
  const createdAt = new Date("2026-05-02T10:00:00.000Z");
  const record = {
    id: randomUUID(),
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId ?? null,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    action: input.action,
    ipAddress: null,
    userAgent: "vitest",
    beforeJson: null,
    afterJson: input.afterJson ?? null,
    previousHash: input.previousHash ?? null,
    entryHash: input.entryHash,
    hashAlgorithm: "sha256",
    createdAt
  } satisfies Omit<PrismaAuditLogRecord, "canonicalPayload">;

  return {
    ...record,
    canonicalPayload: {
      id: record.id,
      organizationId: record.organizationId,
      actorUserId: record.actorUserId,
      targetType: record.targetType,
      targetId: record.targetId,
      action: record.action,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      beforeJson: record.beforeJson,
      afterJson: input.canonicalAfterJson ?? record.afterJson,
      createdAt: record.createdAt.toISOString(),
      previousHash: record.previousHash,
      hashAlgorithm: record.hashAlgorithm
    }
  };
};

interface FakeAuditLogRow extends Record<string, unknown> {
  id: string;
  organizationId: string | null;
  entryHash: string;
  hashAlgorithm: string;
  createdAt: Date;
}

type FakeAuditLogDelegate = {
  rows: FakeAuditLogRow[];
  create(input: { data: Record<string, unknown> }): Promise<FakeAuditLogRow>;
  findFirst(input: {
    orderBy?: { createdAt?: "asc" | "desc" };
    where?: Record<string, unknown>;
  }): Promise<FakeAuditLogRow | null>;
};

const createFakeAuditClient = (): PrismaAuditClient & { auditLog: FakeAuditLogDelegate } => ({
  auditLog: createAuditLogDelegate()
});

const createFakeAuditCheckpointClient = (
  auditRows: PrismaAuditLogRecord[]
): PrismaAuditCheckpointClient & {
  auditLog: FakeAuditLogExportDelegate;
  auditCheckpoint: FakeAuditCheckpointDelegate;
} => ({
  auditLog: createAuditLogExportDelegate(auditRows),
  auditCheckpoint: createAuditCheckpointDelegate()
});

const createAuditLogDelegate = (): FakeAuditLogDelegate => {
  const rows: FakeAuditLogRow[] = [];

  return {
    rows,
    async create(input: { data: Record<string, unknown> }): Promise<FakeAuditLogRow> {
      const row = {
        ...input.data,
        createdAt: toDate(input.data.createdAt)
      } as FakeAuditLogRow;
      rows.push(row);
      return row;
    },
    async findFirst(input: {
      orderBy?: { createdAt?: "asc" | "desc" };
      where?: Record<string, unknown>;
    }): Promise<FakeAuditLogRow | null> {
      const found = rows.filter((row) => matchesWhere(row, input.where ?? {}));
      sortRows(found, input.orderBy);
      return found[0] ?? null;
    }
  };
};

type FakeAuditLogExportDelegate = {
  rows: Array<PrismaAuditLogRecord & Record<string, unknown>>;
  findMany(input: {
    orderBy?: { createdAt?: "asc" | "desc" };
    where?: Record<string, unknown>;
  }): Promise<Array<PrismaAuditLogRecord & Record<string, unknown>>>;
};

const createAuditLogExportDelegate = (inputRows: PrismaAuditLogRecord[]): FakeAuditLogExportDelegate => {
  const rows = inputRows as unknown as Array<PrismaAuditLogRecord & Record<string, unknown>>;

  return {
    rows,
  async findMany(input: {
    orderBy?: { createdAt?: "asc" | "desc" };
    where?: Record<string, unknown>;
  }): Promise<Array<PrismaAuditLogRecord & Record<string, unknown>>> {
    const found = rows.filter((row) => matchesWhere(row, input.where ?? {}));
    sortRows(found as unknown as FakeAuditLogRow[], input.orderBy);
    return found;
  }
  };
};

interface FakeAuditCheckpointRow extends Record<string, unknown> {
  id: string;
  organizationId: string | null;
  scopeType: string;
  exportId: string;
  exportedAt: Date;
  createdAt: Date;
  recordCount: number;
  exportHash: string;
  hashAlgorithm: string;
  verificationStatus: string;
  externalCheckpointStatus: string;
}

type FakeAuditCheckpointDelegate = {
  rows: FakeAuditCheckpointRow[];
  create(input: { data: Record<string, unknown> }): Promise<FakeAuditCheckpointRow>;
  findMany(input: {
    orderBy?: { createdAt?: "asc" | "desc" };
    where?: Record<string, unknown>;
  }): Promise<FakeAuditCheckpointRow[]>;
};

const createAuditCheckpointDelegate = (): FakeAuditCheckpointDelegate => {
  const rows: FakeAuditCheckpointRow[] = [];

  return {
    rows,
    async create(input: { data: Record<string, unknown> }): Promise<FakeAuditCheckpointRow> {
      const row = {
        ...input.data,
        createdAt: toDate(input.data.createdAt),
        exportedAt: toDate(input.data.exportedAt)
      } as FakeAuditCheckpointRow;
      rows.push(row);
      return row;
    },
    async findMany(input: {
      orderBy?: { createdAt?: "asc" | "desc" };
      where?: Record<string, unknown>;
    }): Promise<FakeAuditCheckpointRow[]> {
      const found = rows.filter((row) => matchesWhere(row, input.where ?? {}));
      found.sort((left, right) => {
        const leftTime = toDate(left.createdAt).getTime();
        const rightTime = toDate(right.createdAt).getTime();
        return input.orderBy?.createdAt === "asc" ? leftTime - rightTime : rightTime - leftTime;
      });
      return found;
    }
  };
};

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown>): boolean => {
  for (const [field, expected] of Object.entries(where)) {
    if (isRecord(expected) && "not" in expected) {
      if (row[field] === expected.not) {
        return false;
      }
      continue;
    }

    if (row[field] !== expected) {
      return false;
    }
  }

  return true;
};

const sortRows = (rows: FakeAuditLogRow[], orderBy?: { createdAt?: "asc" | "desc" }): void => {
  if (!orderBy?.createdAt) {
    return;
  }

  rows.sort((left, right) => {
    const leftTime = toDate(left.createdAt).getTime();
    const rightTime = toDate(right.createdAt).getTime();
    return orderBy.createdAt === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });
};

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
