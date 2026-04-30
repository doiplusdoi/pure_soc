import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { EvidenceAccessLogEntry, EvidenceArtifactMetadata } from "@puresoc/evidence";
import { PrismaEvidenceRepository, type PrismaEvidenceClient } from "../index";

describe("PrismaEvidenceRepository", () => {
  it("persists evidence metadata, links, scan details, and access logs with organization scoping", async () => {
    const client = createFakeEvidenceClient();
    const repository = new PrismaEvidenceRepository(client);
    const organizationId = randomUUID();
    const otherOrganizationId = randomUUID();
    const artifact: EvidenceArtifactMetadata = {
      id: randomUUID(),
      organizationId,
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      sourceType: "manual_upload",
      manualSourceLabel: "security policy upload",
      title: "MFA policy evidence",
      storageUri: `s3://puresoc-evidence/evidence/${organizationId}/mfa-policy.txt`,
      contentHashSha256: "a".repeat(64),
      mimeType: "text/plain",
      sizeBytes: 42,
      scanStatus: "clean",
      scanScannerName: "mock-upload-scanner",
      scanFindings: [],
      scannedAt: "2026-04-30T10:00:00.000Z",
      createdBy: randomUUID(),
      createdAt: "2026-04-30T10:00:00.000Z",
      linkedAssessmentId: "assessment_logical",
      linkedSourceRecordId: "eu-nis2-art-21",
      links: [
        {
          id: randomUUID(),
          organizationId,
          evidenceArtifactId: "",
          targetType: "control",
          targetId: "nis2.access-control.mfa",
          relation: "mfa-coverage-evidence",
          createdAt: "2026-04-30T10:00:00.000Z"
        },
        {
          id: randomUUID(),
          organizationId,
          evidenceArtifactId: "",
          targetType: "regulatory_source",
          targetId: "eu-nis2-art-21",
          relation: "source_reference",
          createdAt: "2026-04-30T10:00:00.000Z"
        }
      ]
    };
    artifact.links = artifact.links.map((link) => ({
      ...link,
      evidenceArtifactId: artifact.id
    }));

    await repository.saveArtifact(artifact);
    const found = await repository.findArtifactById(artifact.id);
    const scopedList = await repository.listArtifacts(organizationId);
    const otherList = await repository.listArtifacts(otherOrganizationId);
    const accessLog: EvidenceAccessLogEntry = {
      id: randomUUID(),
      organizationId,
      evidenceArtifactId: artifact.id,
      actorUserId: randomUUID(),
      action: "download",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      createdAt: "2026-04-30T10:01:00.000Z"
    };

    await repository.saveAccessLog(accessLog);
    const accessLogs = await repository.listAccessLogs(organizationId, artifact.id);
    const otherAccessLogs = await repository.listAccessLogs(otherOrganizationId, artifact.id);

    expect(found).toMatchObject({
      id: artifact.id,
      organizationId,
      controlId: "nis2.access-control.mfa",
      linkedSourceRecordId: "eu-nis2-art-21",
      scanScannerName: "mock-upload-scanner",
      scanFindings: []
    });
    expect(found?.links.map((link) => link.targetType)).toEqual(["control", "regulatory_source"]);
    expect(scopedList).toHaveLength(1);
    expect(otherList).toHaveLength(0);
    expect(accessLogs).toHaveLength(1);
    expect(accessLogs[0]).toMatchObject({
      organizationId,
      evidenceArtifactId: artifact.id,
      action: "download"
    });
    expect(otherAccessLogs).toHaveLength(0);
  });
});

const createFakeEvidenceClient = (): PrismaEvidenceClient => ({
  evidenceArtifact: createDelegate(),
  evidenceLink: createDelegate(),
  evidenceAccessLog: createDelegate()
});

const createDelegate = <TRow extends Record<string, unknown>>() => {
  const rows: TRow[] = [];

  return {
    async create(args: Record<string, unknown>) {
      const row = args.data as TRow;
      rows.push(row);
      return row;
    },
    async findMany(args?: Record<string, unknown>) {
      const where = args?.where as Record<string, unknown> | undefined;
      const orderBy = args?.orderBy as Record<string, "asc" | "desc"> | undefined;
      return rows.filter((row) => matchesWhere(row, where)).sort((left, right) => sortRows(left, right, orderBy));
    },
    async findFirst(args: Record<string, unknown>) {
      return rows.find((row) => matchesWhere(row, args.where as Record<string, unknown> | undefined)) ?? null;
    },
    async findUnique(args: Record<string, unknown>) {
      const where = args.where as { id: string };
      return rows.find((row) => row.id === where.id) ?? null;
    }
  };
};

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean =>
  Object.entries(where ?? {}).every(([key, value]) => row[key] === value);

const sortRows = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  orderBy: Record<string, "asc" | "desc"> | undefined
): number => {
  const [key, direction] = Object.entries(orderBy ?? {})[0] ?? [];
  if (!key || !direction) {
    return 0;
  }

  const leftValue = String(left[key] ?? "");
  const rightValue = String(right[key] ?? "");
  return direction === "asc" ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
};
