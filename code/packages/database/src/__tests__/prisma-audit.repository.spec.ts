import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { PrismaAuditSink, type PrismaAuditClient, type PrismaAuditLogRecord } from "../index";

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
