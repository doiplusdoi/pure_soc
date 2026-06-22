import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  AuditWriter,
  InMemoryAuditSink,
  buildAuditCheckpointFromExportSegment,
  createAuditExportSegment,
  verifyAuditHashChain
} from "@puresoc/audit";
import {
  PrismaAuditCheckpointRepository,
  PrismaAuditSink,
  auditScopeAdvisoryLockKey,
  auditScopeKeyForOrganization,
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

  it("serializes concurrent same-scope appends into one persisted hash chain", async () => {
    let id = 0;
    const client = createFakeAuditClient();
    const organizationId = randomUUID();
    const firstWriter = new AuditWriter({
      sink: new PrismaAuditSink(client),
      idFactory: () => `11111111-1111-4111-8111-${(++id).toString().padStart(12, "0")}`,
      now: () => new Date("2026-05-03T09:00:00.000Z")
    });
    const secondWriter = new AuditWriter({
      sink: new PrismaAuditSink(client),
      idFactory: () => `22222222-2222-4222-8222-${(++id).toString().padStart(12, "0")}`,
      now: () => new Date("2026-05-03T09:00:00.000Z")
    });

    const [first, second] = await Promise.all([
      firstWriter.write({
        organizationId,
        targetType: "session",
        action: "login",
        afterJson: {
          status: "first"
        }
      }),
      secondWriter.write({
        organizationId,
        targetType: "session",
        action: "logout",
        afterJson: {
          status: "second"
        }
      })
    ]);
    const rows = client.auditLog.rows.filter((row) => row.organizationId === organizationId);
    const orderedRows = [...rows].sort((left, right) => left.chainSequence - right.chainSequence);

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.previousHash)).size).toBe(2);
    expect(orderedRows.map((row) => row.chainSequence)).toEqual([1, 2]);
    expect(orderedRows[0]?.previousHash).toBeNull();
    expect(orderedRows[1]?.previousHash).toBe(orderedRows[0]?.entryHash);
    expect([first.previousHash, second.previousHash].filter((previousHash) => previousHash === null)).toHaveLength(1);
    expect(verifyAuditHashChain(orderedRows as unknown as PrismaAuditLogRecord[], organizationId)).toMatchObject({
      valid: true,
      checkedRecords: 2,
      violations: []
    });
    expect(client.auditLockQueries).toEqual([
      "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
      "SELECT pg_advisory_xact_lock($1::integer, $2::integer)"
    ]);
    expect(client.auditLockKeys).toEqual([
      auditScopeLockKeyString(organizationId),
      auditScopeLockKeyString(organizationId)
    ]);
  });

  it("keeps different organization audit chains independently sequenced", async () => {
    let id = 0;
    const client = createFakeAuditClient();
    const orgA = randomUUID();
    const orgB = randomUUID();
    const writerA = new AuditWriter({
      sink: new PrismaAuditSink(client),
      idFactory: () => `33333333-3333-4333-8333-${(++id).toString().padStart(12, "0")}`,
      now: () => new Date("2026-05-03T09:05:00.000Z")
    });
    const writerB = new AuditWriter({
      sink: new PrismaAuditSink(client),
      idFactory: () => `44444444-4444-4444-8444-${(++id).toString().padStart(12, "0")}`,
      now: () => new Date("2026-05-03T09:05:00.000Z")
    });

    const [first, second] = await Promise.all([
      writerA.write({
        organizationId: orgA,
        targetType: "session",
        action: "login"
      }),
      writerB.write({
        organizationId: orgB,
        targetType: "session",
        action: "login"
      })
    ]);

    expect(first.previousHash).toBeNull();
    expect(second.previousHash).toBeNull();
    expect(client.auditLog.rows.map((row) => row.scopeKey).sort()).toEqual(
      [auditScopeKeyForOrganization(orgA), auditScopeKeyForOrganization(orgB)].sort()
    );
    expect(client.auditLog.rows.map((row) => row.chainSequence)).toEqual([1, 1]);
    expect(verifyAuditHashChain(client.auditLog.rows as unknown as PrismaAuditLogRecord[], orgA).valid).toBe(true);
    expect(verifyAuditHashChain(client.auditLog.rows as unknown as PrismaAuditLogRecord[], orgB).valid).toBe(true);
    expect(client.auditLockKeys.sort()).toEqual([auditScopeLockKeyString(orgA), auditScopeLockKeyString(orgB)].sort());
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
    contextJson: {},
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
      contextJson: record.contextJson,
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
  scopeKey: string;
  chainSequence: number;
  entryHash: string;
  hashAlgorithm: string;
  createdAt: Date;
}

type FakeAuditLogDelegate = {
  rows: FakeAuditLogRow[];
  create(input: { data: Record<string, unknown> }): Promise<FakeAuditLogRow>;
  findFirst(input: {
    orderBy?: Record<string, "asc" | "desc">;
    where?: Record<string, unknown>;
  }): Promise<FakeAuditLogRow | null>;
};

type FakeAuditClient = PrismaAuditClient & {
  auditLockKeys: string[];
  auditLockQueries: string[];
  auditLog: FakeAuditLogDelegate;
};

const createFakeAuditClient = (): FakeAuditClient => {
  const client: FakeAuditClient = {
    auditLog: createAuditLogDelegate(),
    auditLockKeys: [],
    auditLockQueries: [],
    async $transaction<T>(callback: (tx: PrismaAuditClient) => Promise<T>): Promise<T> {
      const releases: Array<() => void> = [];
      const tx = {
        auditLog: client.auditLog,
        $queryRawUnsafe: async <TQuery = unknown>(query: string, ...values: unknown[]): Promise<TQuery> => {
          const key = values.join(":");
          client.auditLockQueries.push(query);
          client.auditLockKeys.push(key);
          releases.push(await fakeAuditLockManager.acquire(key));
          return [] as TQuery;
        },
        $transaction: client.$transaction.bind(client)
      };

      try {
        return await callback(tx);
      } finally {
        for (const release of releases.reverse()) {
          release();
        }
      }
    }
  };
  return client;
};

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
      orderBy?: Record<string, "asc" | "desc">;
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
    orderBy?: Record<string, "asc" | "desc">;
    where?: Record<string, unknown>;
  }): Promise<Array<PrismaAuditLogRecord & Record<string, unknown>>>;
};

const createAuditLogExportDelegate = (inputRows: PrismaAuditLogRecord[]): FakeAuditLogExportDelegate => {
  const rows = inputRows as unknown as Array<PrismaAuditLogRecord & Record<string, unknown>>;

  return {
    rows,
    async findMany(input: {
      orderBy?: Record<string, "asc" | "desc">;
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

const sortRows = (rows: FakeAuditLogRow[], orderBy?: Record<string, "asc" | "desc">): void => {
  const [field, direction] = Object.entries(orderBy ?? {})[0] ?? [];
  if (!field || !direction) {
    return;
  }

  rows.sort((left, right) => {
    const leftValue = left[field];
    const rightValue = right[field];
    const leftComparable = typeof leftValue === "number" ? leftValue : toDate(leftValue).getTime();
    const rightComparable = typeof rightValue === "number" ? rightValue : toDate(rightValue).getTime();
    return direction === "asc" ? leftComparable - rightComparable : rightComparable - leftComparable;
  });
};

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const auditScopeLockKeyString = (organizationId: string | null): string => {
  const lockKey = auditScopeAdvisoryLockKey(auditScopeKeyForOrganization(organizationId));
  return `${lockKey.namespace}:${lockKey.scope}`;
};

class FakeAuditLockManager {
  private readonly locks = new Map<string, Promise<void>>();

  async acquire(key: string): Promise<() => void> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = previous.then(() => current);
    this.locks.set(key, chained);

    await previous;

    return () => {
      release();
      if (this.locks.get(key) === chained) {
        this.locks.delete(key);
      }
    };
  }
}

const fakeAuditLockManager = new FakeAuditLockManager();
