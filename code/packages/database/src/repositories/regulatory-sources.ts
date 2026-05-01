import type {
  JsonObject,
  RegulatoryReviewDecisionRecord,
  RegulatoryReviewTaskRecord,
  RegulatoryReviewTaskStatus,
  RegulatorySourceMapEntryRecord,
  RegulatorySourceRecord,
  RegulatorySourceRecordStatus,
  RegulatorySourceRepository,
  RegulatorySourceVersionRecord
} from "@puresoc/regulatory-sources";

type DelegateArgs = Record<string, unknown>;

type RegulatorySourceRow = Omit<RegulatorySourceRecord, "publicationDate" | "lastCheckedAt" | "createdAt" | "updatedAt"> & {
  publicationDate?: Date | string | null;
  lastCheckedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type RegulatorySourceVersionRow = Omit<
  RegulatorySourceVersionRecord,
  "activatedAt" | "supersededAt" | "createdAt"
> & {
  activatedAt?: Date | string | null;
  supersededAt?: Date | string | null;
  createdAt: Date | string;
};

type RegulatorySourceMapRow = Omit<RegulatorySourceMapEntryRecord, "createdAt"> & {
  createdAt: Date | string;
};

type RegulatoryReviewTaskRow = Omit<RegulatoryReviewTaskRecord, "createdAt" | "resolvedAt"> & {
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
};

type RegulatoryReviewDecisionRow = Omit<RegulatoryReviewDecisionRecord, "decidedAt"> & {
  decidedAt: Date | string;
};

interface Delegate<TRow> {
  create(args: DelegateArgs): Promise<TRow>;
  findMany(args?: DelegateArgs): Promise<TRow[]>;
  findUnique(args: DelegateArgs): Promise<TRow | null>;
  update(args: DelegateArgs): Promise<TRow>;
  upsert?(args: DelegateArgs): Promise<TRow>;
  findFirst?(args: DelegateArgs): Promise<TRow | null>;
}

export interface PrismaRegulatorySourceClient {
  regulatorySource: Delegate<RegulatorySourceRow>;
  regulatorySourceVersion: Delegate<RegulatorySourceVersionRow>;
  regulatorySourceMap: Delegate<RegulatorySourceMapRow>;
  regulatoryReviewTask: Delegate<RegulatoryReviewTaskRow>;
  regulatoryReviewDecision: Delegate<RegulatoryReviewDecisionRow>;
}

export class PrismaRegulatorySourceRepository implements RegulatorySourceRepository {
  constructor(private readonly client: PrismaRegulatorySourceClient) {}

  async upsertSource(record: RegulatorySourceRecord): Promise<RegulatorySourceRecord> {
    const data = toSourceData(record);
    const row = this.client.regulatorySource.upsert
      ? await this.client.regulatorySource.upsert({
          where: {
            id: record.id
          },
          update: data,
          create: data
        })
      : await this.client.regulatorySource.create({
          data
        });

    return fromSourceRow(row);
  }

  async updateSource(sourceId: string, patch: Partial<RegulatorySourceRecord>): Promise<RegulatorySourceRecord> {
    const row = await this.client.regulatorySource.update({
      where: {
        id: sourceId
      },
      data: toSourceData(patch)
    });

    return fromSourceRow(row);
  }

  async findSourceById(sourceId: string): Promise<RegulatorySourceRecord | null> {
    const row = await this.client.regulatorySource.findUnique({
      where: {
        id: sourceId
      }
    });

    return row ? fromSourceRow(row) : null;
  }

  async listSources(input: {
    hasUrl?: boolean;
    status?: RegulatorySourceRecordStatus;
  } = {}): Promise<RegulatorySourceRecord[]> {
    const rows = await this.client.regulatorySource.findMany({
      where: {
        ...(input.hasUrl === true ? { url: { not: null } } : {}),
        ...(input.hasUrl === false ? { url: null } : {}),
        ...(input.status ? { status: input.status } : {})
      },
      orderBy: {
        id: "asc"
      }
    });

    return rows.map(fromSourceRow);
  }

  async saveSourceVersion(record: RegulatorySourceVersionRecord): Promise<RegulatorySourceVersionRecord> {
    const row = await this.client.regulatorySourceVersion.create({
      data: toSourceVersionData(record)
    });

    return fromSourceVersionRow(row);
  }

  async updateSourceVersion(
    sourceVersionId: string,
    patch: Partial<RegulatorySourceVersionRecord>
  ): Promise<RegulatorySourceVersionRecord> {
    const row = await this.client.regulatorySourceVersion.update({
      where: {
        id: sourceVersionId
      },
      data: toSourceVersionData(patch)
    });

    return fromSourceVersionRow(row);
  }

  async findSourceVersionById(sourceVersionId: string): Promise<RegulatorySourceVersionRecord | null> {
    const row = await this.client.regulatorySourceVersion.findUnique({
      where: {
        id: sourceVersionId
      }
    });

    return row ? fromSourceVersionRow(row) : null;
  }

  async listSourceVersionsBySource(sourceId: string): Promise<RegulatorySourceVersionRecord[]> {
    const rows = await this.client.regulatorySourceVersion.findMany({
      where: {
        sourceId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return rows.map(fromSourceVersionRow);
  }

  async findActiveSourceVersion(sourceId: string): Promise<RegulatorySourceVersionRecord | null> {
    const row = this.client.regulatorySourceVersion.findFirst
      ? await this.client.regulatorySourceVersion.findFirst({
          where: {
            sourceId,
            activationStatus: "active"
          },
          orderBy: {
            activatedAt: "desc"
          }
        })
      : (await this.client.regulatorySourceVersion.findMany({
          where: {
            sourceId,
            activationStatus: "active"
          }
        }))[0] ?? null;

    return row ? fromSourceVersionRow(row) : null;
  }

  async saveSourceMapEntries(entries: RegulatorySourceMapEntryRecord[]): Promise<RegulatorySourceMapEntryRecord[]> {
    const rows = await Promise.all(
      entries.map((entry) =>
        this.client.regulatorySourceMap.create({
          data: toSourceMapData(entry)
        })
      )
    );

    return rows.map(fromSourceMapRow);
  }

  async listSourceMapEntries(sourceVersionId: string): Promise<RegulatorySourceMapEntryRecord[]> {
    const rows = await this.client.regulatorySourceMap.findMany({
      where: {
        sourceVersionId
      },
      orderBy: {
        targetKey: "asc"
      }
    });

    return rows.map(fromSourceMapRow);
  }

  async saveReviewTask(record: RegulatoryReviewTaskRecord): Promise<RegulatoryReviewTaskRecord> {
    const row = await this.client.regulatoryReviewTask.create({
      data: toReviewTaskData(record)
    });

    return fromReviewTaskRow(row);
  }

  async updateReviewTask(
    taskId: string,
    patch: Partial<RegulatoryReviewTaskRecord>
  ): Promise<RegulatoryReviewTaskRecord> {
    const row = await this.client.regulatoryReviewTask.update({
      where: {
        id: taskId
      },
      data: toReviewTaskData(patch)
    });

    return fromReviewTaskRow(row);
  }

  async findReviewTaskById(taskId: string): Promise<RegulatoryReviewTaskRecord | null> {
    const row = await this.client.regulatoryReviewTask.findUnique({
      where: {
        id: taskId
      }
    });

    return row ? fromReviewTaskRow(row) : null;
  }

  async listReviewTasks(input: {
    organizationId?: string;
    status?: RegulatoryReviewTaskStatus;
  } = {}): Promise<RegulatoryReviewTaskRecord[]> {
    const rows = await this.client.regulatoryReviewTask.findMany({
      where: {
        ...(input.organizationId ? { organizationId: input.organizationId } : {}),
        ...(input.status ? { status: input.status } : {})
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return rows.map(fromReviewTaskRow);
  }

  async saveReviewDecision(record: RegulatoryReviewDecisionRecord): Promise<RegulatoryReviewDecisionRecord> {
    const row = await this.client.regulatoryReviewDecision.create({
      data: toReviewDecisionData(record)
    });

    return fromReviewDecisionRow(row);
  }

  async listReviewDecisionsForTask(taskId: string): Promise<RegulatoryReviewDecisionRecord[]> {
    const rows = await this.client.regulatoryReviewDecision.findMany({
      where: {
        taskId
      },
      orderBy: {
        decidedAt: "asc"
      }
    });

    return rows.map(fromReviewDecisionRow);
  }
}

const toSourceData = (record: Partial<RegulatorySourceRecord>): DelegateArgs => ({
  ...omitUndefined({
    id: record.id,
    frameworkKey: record.frameworkKey,
    jurisdiction: record.jurisdiction,
    sourceType: record.sourceType,
    title: record.title,
    url: record.url,
    localFilePath: record.localFilePath,
    publicationDate: toDateOrNull(record.publicationDate),
    lastCheckedAt: toDateOrNull(record.lastCheckedAt),
    versionLabel: record.versionLabel,
    authorityName: record.authorityName,
    trustLevel: record.trustLevel,
    status: record.status,
    activationStatus: record.activationStatus,
    activeVersionId: record.activeVersionId,
    notes: record.notes,
    createdAt: toDateOrNull(record.createdAt),
    updatedAt: toDateOrNull(record.updatedAt)
  })
});

const toSourceVersionData = (record: Partial<RegulatorySourceVersionRecord>): DelegateArgs =>
  omitUndefined({
    id: record.id,
    sourceId: record.sourceId,
    versionLabel: record.versionLabel,
    contentHashSha256: record.contentHashSha256,
    activationStatus: record.activationStatus,
    validationStatus: record.validationStatus,
    metadataJson: record.metadataJson,
    importValidationReportJson: record.importValidationReportJson,
    activatedAt: toDateOrNull(record.activatedAt),
    activatedBy: record.activatedBy,
    supersededAt: toDateOrNull(record.supersededAt),
    supersededByVersionId: record.supersededByVersionId,
    createdAt: toDateOrNull(record.createdAt)
  });

const toSourceMapData = (record: RegulatorySourceMapEntryRecord): DelegateArgs => ({
  id: record.id,
  sourceId: record.sourceId,
  sourceVersionId: record.sourceVersionId,
  targetCollection: record.targetCollection,
  targetKey: record.targetKey,
  sourceLocation: record.sourceLocation,
  mappingJson: record.mappingJson,
  createdAt: toDateOrNull(record.createdAt)
});

const toReviewTaskData = (record: Partial<RegulatoryReviewTaskRecord>): DelegateArgs =>
  omitUndefined({
    id: record.id,
    organizationId: record.organizationId,
    sourceId: record.sourceId,
    sourceVersionId: record.sourceVersionId,
    countryPackVersionId: record.countryPackVersionId,
    assignedRoleKey: record.assignedRoleKey,
    status: record.status,
    reason: record.reason,
    createdForStatus: record.createdForStatus,
    metadataJson: record.metadataJson,
    createdAt: toDateOrNull(record.createdAt),
    resolvedAt: toDateOrNull(record.resolvedAt)
  });

const toReviewDecisionData = (record: RegulatoryReviewDecisionRecord): DelegateArgs => ({
  id: record.id,
  taskId: record.taskId,
  sourceVersionId: record.sourceVersionId,
  decision: record.decision,
  decidedBy: record.decidedBy,
  decidedAt: toDateOrNull(record.decidedAt),
  notes: record.notes,
  decisionJson: record.decisionJson
});

const fromSourceRow = (row: RegulatorySourceRow): RegulatorySourceRecord => ({
  id: row.id,
  frameworkKey: row.frameworkKey,
  jurisdiction: row.jurisdiction,
  sourceType: row.sourceType,
  title: row.title,
  url: row.url ?? null,
  localFilePath: row.localFilePath ?? null,
  publicationDate: dateToIsoOrNull(row.publicationDate),
  lastCheckedAt: dateToIsoOrNull(row.lastCheckedAt) ?? "",
  versionLabel: row.versionLabel ?? null,
  authorityName: row.authorityName ?? null,
  trustLevel: row.trustLevel,
  status: row.status,
  activationStatus: row.activationStatus,
  activeVersionId: row.activeVersionId ?? null,
  notes: row.notes ?? null,
  createdAt: dateToIsoOrNull(row.createdAt) ?? undefined,
  updatedAt: dateToIsoOrNull(row.updatedAt) ?? undefined
});

const fromSourceVersionRow = (row: RegulatorySourceVersionRow): RegulatorySourceVersionRecord => ({
  id: row.id,
  sourceId: row.sourceId,
  versionLabel: row.versionLabel,
  contentHashSha256: row.contentHashSha256 ?? null,
  activationStatus: row.activationStatus,
  validationStatus: row.validationStatus,
  metadataJson: cloneJson(row.metadataJson),
  importValidationReportJson: cloneJson(row.importValidationReportJson),
  activatedAt: dateToIsoOrNull(row.activatedAt),
  activatedBy: row.activatedBy ?? null,
  supersededAt: dateToIsoOrNull(row.supersededAt),
  supersededByVersionId: row.supersededByVersionId ?? null,
  createdAt: dateToIsoOrNull(row.createdAt) ?? ""
});

const fromSourceMapRow = (row: RegulatorySourceMapRow): RegulatorySourceMapEntryRecord => ({
  id: row.id,
  sourceId: row.sourceId,
  sourceVersionId: row.sourceVersionId,
  targetCollection: row.targetCollection,
  targetKey: row.targetKey,
  sourceLocation: row.sourceLocation,
  mappingJson: cloneJson(row.mappingJson),
  createdAt: dateToIsoOrNull(row.createdAt) ?? ""
});

const fromReviewTaskRow = (row: RegulatoryReviewTaskRow): RegulatoryReviewTaskRecord => ({
  id: row.id,
  organizationId: row.organizationId ?? null,
  sourceId: row.sourceId ?? null,
  sourceVersionId: row.sourceVersionId ?? null,
  countryPackVersionId: row.countryPackVersionId ?? null,
  assignedRoleKey: row.assignedRoleKey,
  status: row.status,
  reason: row.reason,
  createdForStatus: row.createdForStatus,
  metadataJson: cloneJson(row.metadataJson),
  createdAt: dateToIsoOrNull(row.createdAt) ?? "",
  resolvedAt: dateToIsoOrNull(row.resolvedAt)
});

const fromReviewDecisionRow = (row: RegulatoryReviewDecisionRow): RegulatoryReviewDecisionRecord => ({
  id: row.id,
  taskId: row.taskId,
  sourceVersionId: row.sourceVersionId ?? null,
  decision: row.decision,
  decidedBy: row.decidedBy,
  decidedAt: dateToIsoOrNull(row.decidedAt) ?? "",
  notes: row.notes ?? null,
  decisionJson: cloneJson(row.decisionJson)
});

const toDateOrNull = (value: string | Date | null | undefined): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const dateToIsoOrNull = (value: string | Date | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
};

const omitUndefined = (value: DelegateArgs): DelegateArgs =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

const cloneJson = (value: JsonObject): JsonObject => JSON.parse(JSON.stringify(value)) as JsonObject;
