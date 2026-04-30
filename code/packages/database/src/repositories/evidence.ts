import type {
  EvidenceAccessLogEntry,
  EvidenceArtifactMetadata,
  EvidenceLink,
  EvidenceRepository
} from "@puresoc/evidence";

type DelegateArgs = Record<string, unknown>;

interface Delegate<TRow> {
  create(args: DelegateArgs): Promise<TRow>;
  findMany(args?: DelegateArgs): Promise<TRow[]>;
  findFirst(args: DelegateArgs): Promise<TRow | null>;
  findUnique?(args: DelegateArgs): Promise<TRow | null>;
}

type EvidenceArtifactRow = Omit<
  EvidenceArtifactMetadata,
  | "createdAt"
  | "validFrom"
  | "validUntil"
  | "retentionExpiresAt"
  | "sizeBytes"
  | "links"
  | "scanFindings"
  | "scannedAt"
> & {
  createdAt: Date | string;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  retentionExpiresAt?: Date | string | null;
  sizeBytes?: bigint | number | string | null;
  scanFindingsJson?: unknown;
  scannedAt?: Date | string | null;
};

type EvidenceLinkRow = Omit<EvidenceLink, "createdAt"> & {
  createdAt: Date | string;
};

type EvidenceAccessLogRow = Omit<EvidenceAccessLogEntry, "createdAt"> & {
  createdAt: Date | string;
};

export interface PrismaEvidenceClient {
  evidenceArtifact: Delegate<EvidenceArtifactRow>;
  evidenceLink: Delegate<EvidenceLinkRow>;
  evidenceAccessLog: Delegate<EvidenceAccessLogRow>;
}

export class PrismaEvidenceRepository implements EvidenceRepository {
  constructor(private readonly client: PrismaEvidenceClient) {}

  async saveArtifact(artifact: EvidenceArtifactMetadata): Promise<EvidenceArtifactMetadata> {
    await this.client.evidenceArtifact.create({
      data: toArtifactData(artifact)
    });

    for (const link of artifact.links) {
      await this.client.evidenceLink.create({
        data: toEvidenceLinkData(link)
      });
    }

    return cloneArtifact(artifact);
  }

  async findArtifactById(id: string): Promise<EvidenceArtifactMetadata | null> {
    const row = this.client.evidenceArtifact.findUnique
      ? await this.client.evidenceArtifact.findUnique({
          where: {
            id
          }
        })
      : await this.client.evidenceArtifact.findFirst({
          where: {
            id
          }
        });

    return row ? this.fromArtifactRowWithLinks(row) : null;
  }

  async listArtifacts(organizationId: string): Promise<EvidenceArtifactMetadata[]> {
    const rows = await this.client.evidenceArtifact.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return Promise.all(rows.map((row) => this.fromArtifactRowWithLinks(row)));
  }

  async saveAccessLog(entry: EvidenceAccessLogEntry): Promise<EvidenceAccessLogEntry> {
    const row = await this.client.evidenceAccessLog.create({
      data: toAccessLogData(entry)
    });

    return fromAccessLogRow(row);
  }

  async listAccessLogs(organizationId: string, evidenceArtifactId?: string): Promise<EvidenceAccessLogEntry[]> {
    const rows = await this.client.evidenceAccessLog.findMany({
      where: {
        organizationId,
        ...(evidenceArtifactId ? { evidenceArtifactId } : {})
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return rows.map(fromAccessLogRow);
  }

  private async fromArtifactRowWithLinks(row: EvidenceArtifactRow): Promise<EvidenceArtifactMetadata> {
    const links = await this.client.evidenceLink.findMany({
      where: {
        organizationId: row.organizationId,
        evidenceArtifactId: row.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return fromArtifactRow(row, links);
  }
}

const toArtifactData = (artifact: EvidenceArtifactMetadata): Record<string, unknown> => ({
  id: artifact.id,
  organizationId: artifact.organizationId,
  controlId: artifact.controlId,
  jurisdiction: artifact.jurisdiction,
  sourceType: artifact.sourceType,
  sourceProvider: artifact.sourceProvider,
  providerConnectionId: uuidOrNull(artifact.providerConnectionId),
  manualSourceLabel: artifact.manualSourceLabel,
  title: artifact.title,
  description: artifact.description,
  storageUri: artifact.storageUri,
  contentHashSha256: artifact.contentHashSha256,
  mimeType: artifact.mimeType,
  sizeBytes: artifact.sizeBytes,
  scanStatus: artifact.scanStatus,
  scanScannerName: artifact.scanScannerName,
  scanFindingsJson: artifact.scanFindings ?? [],
  scannedAt: nullableDate(artifact.scannedAt),
  createdBy: uuidOrNull(artifact.createdBy),
  createdAt: new Date(artifact.createdAt),
  validFrom: nullableDate(artifact.validFrom),
  validUntil: nullableDate(artifact.validUntil),
  linkedAssessmentId: uuidOrNull(artifact.linkedAssessmentId),
  linkedActionId: uuidOrNull(artifact.linkedActionId),
  linkedSourceRecordId: uuidOrNull(artifact.linkedSourceRecordId),
  exportGroupKey: artifact.exportGroupKey,
  retentionPolicy: artifact.retentionPolicy,
  retentionExpiresAt: nullableDate(artifact.retentionExpiresAt)
});

const toEvidenceLinkData = (link: EvidenceLink): Record<string, unknown> => ({
  id: link.id,
  organizationId: link.organizationId,
  evidenceArtifactId: link.evidenceArtifactId,
  targetType: link.targetType,
  targetId: link.targetId,
  relation: link.relation,
  createdAt: new Date(link.createdAt)
});

const toAccessLogData = (entry: EvidenceAccessLogEntry): Record<string, unknown> => ({
  id: entry.id,
  organizationId: entry.organizationId,
  evidenceArtifactId: entry.evidenceArtifactId,
  actorUserId: uuidOrNull(entry.actorUserId),
  action: entry.action,
  ipAddress: entry.ipAddress,
  userAgent: entry.userAgent,
  createdAt: new Date(entry.createdAt)
});

const fromArtifactRow = (
  row: EvidenceArtifactRow,
  linkRows: readonly EvidenceLinkRow[]
): EvidenceArtifactMetadata => {
  const links = linkRows.map(fromEvidenceLinkRow);
  const linkedSourceRecordId =
    row.linkedSourceRecordId ??
    links.find((link) => link.targetType === "regulatory_source")?.targetId;
  const linkedAssessmentId =
    row.linkedAssessmentId ?? links.find((link) => link.targetType === "assessment")?.targetId;

  return stripUndefined({
    ...row,
    sizeBytes: Number(row.sizeBytes ?? 0),
    scanFindings: Array.isArray(row.scanFindingsJson) ? row.scanFindingsJson.filter(isString) : [],
    scannedAt: row.scannedAt ? toIso(row.scannedAt) : undefined,
    createdAt: toIso(row.createdAt),
    validFrom: row.validFrom ? toIso(row.validFrom) : undefined,
    validUntil: row.validUntil ? toIso(row.validUntil) : undefined,
    linkedAssessmentId,
    linkedSourceRecordId,
    retentionExpiresAt: row.retentionExpiresAt ? toIso(row.retentionExpiresAt) : undefined,
    links
  }) as EvidenceArtifactMetadata;
};

const fromEvidenceLinkRow = (row: EvidenceLinkRow): EvidenceLink => ({
  ...row,
  createdAt: toIso(row.createdAt)
});

const fromAccessLogRow = (row: EvidenceAccessLogRow): EvidenceAccessLogEntry => ({
  ...row,
  createdAt: toIso(row.createdAt)
});

const nullableDate = (value: string | undefined): Date | null => (value ? new Date(value) : null);

const toIso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());

const uuidOrNull = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
};

const isString = (value: unknown): value is string => typeof value === "string";

const cloneArtifact = (artifact: EvidenceArtifactMetadata): EvidenceArtifactMetadata =>
  JSON.parse(JSON.stringify(artifact)) as EvidenceArtifactMetadata;

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
