import type { Prisma } from "@prisma/client";

import type {
  DashboardSnapshotRecordContract,
  GeneratedReportRecordContract,
  ReportExportRecordContract,
  StoredAnalysisRecordContract
} from "../contracts/outputs";

type DelegateArgs = Record<string, unknown>;

interface SnapshotDelegate<TRow> {
  findFirst(args: DelegateArgs): Promise<TRow | null>;
  findMany(args?: DelegateArgs): Promise<TRow[]>;
  findUnique(args: DelegateArgs): Promise<TRow | null>;
  upsert(args: DelegateArgs): Promise<TRow>;
}

interface OutputRecordDelegate<TRow> {
  findFirst(args: DelegateArgs): Promise<TRow | null>;
  findMany(args?: DelegateArgs): Promise<TRow[]>;
  upsert(args: DelegateArgs): Promise<TRow>;
}

type StoredAnalysisSnapshotRow = {
  assessmentId: string;
  catalogVersion?: string | null;
  jurisdiction: string;
  organizationId: string;
  recordedAt: Date | string;
  resultSetJson: unknown;
};

type GeneratedReportRow = Omit<
  GeneratedReportRecordContract,
  | "assessmentId"
  | "contentHashSha256"
  | "createdAt"
  | "createdBy"
  | "evidenceArtifactId"
  | "reportData"
  | "sourceReferences"
> & {
  assessmentId?: string | null;
  contentHashSha256?: string | null;
  createdAt: Date | string;
  createdBy?: string | null;
  evidenceArtifactId?: string | null;
  reportDataJson: unknown;
  sourceReferencesJson?: unknown;
};

type DashboardSnapshotRow = Omit<
  DashboardSnapshotRecordContract,
  "assessmentId" | "createdAt" | "snapshot"
> & {
  assessmentId?: string | null;
  createdAt: Date | string;
  snapshotJson: unknown;
};

type ReportExportRow = Omit<
  ReportExportRecordContract,
  "contentHashSha256" | "createdAt" | "expiresAt" | "storageUri"
> & {
  contentHashSha256?: string | null;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  storageUri?: string | null;
};

export interface OutputRecordRepository {
  findGeneratedReport(organizationId: string, reportId: string): Promise<GeneratedReportRecordContract | null>;
  findLatestDashboardSnapshot(
    organizationId: string,
    assessmentId?: string
  ): Promise<DashboardSnapshotRecordContract | null>;
  findReportExport(organizationId: string, exportId: string): Promise<ReportExportRecordContract | null>;
  findLatestStoredAnalysis(organizationId: string): Promise<StoredAnalysisRecordContract | null>;
  listLatestStoredAnalyses(): Promise<StoredAnalysisRecordContract[]>;
  findStoredAnalysis(organizationId: string, assessmentId: string): Promise<StoredAnalysisRecordContract | null>;
  listDashboardSnapshots(
    organizationId: string,
    options?: {
      assessmentId?: string;
      since?: string;
      until?: string;
    }
  ): Promise<DashboardSnapshotRecordContract[]>;
  listReportExportsForReport(
    organizationId: string,
    generatedReportId: string
  ): Promise<ReportExportRecordContract[]>;
  saveDashboardSnapshot(record: DashboardSnapshotRecordContract): Promise<DashboardSnapshotRecordContract>;
  saveGeneratedReport(record: GeneratedReportRecordContract): Promise<GeneratedReportRecordContract>;
  saveReportExport(record: ReportExportRecordContract): Promise<ReportExportRecordContract>;
  saveStoredAnalysis(record: StoredAnalysisRecordContract): Promise<StoredAnalysisRecordContract>;
}

export interface PrismaOutputRecordClient {
  complianceResultSnapshot: SnapshotDelegate<StoredAnalysisSnapshotRow>;
  dashboardSnapshot: OutputRecordDelegate<DashboardSnapshotRow>;
  generatedReport: OutputRecordDelegate<GeneratedReportRow>;
  reportExport: OutputRecordDelegate<ReportExportRow> & {
    findMany(args: DelegateArgs): Promise<ReportExportRow[]>;
  };
}

export class InMemoryOutputRecordRepository implements OutputRecordRepository {
  private readonly dashboardSnapshots = new Map<string, DashboardSnapshotRecordContract>();
  private readonly generatedReports = new Map<string, GeneratedReportRecordContract>();
  private readonly reportExports = new Map<string, ReportExportRecordContract>();
  private readonly storedAnalyses = new Map<string, StoredAnalysisRecordContract>();

  async saveStoredAnalysis(record: StoredAnalysisRecordContract): Promise<StoredAnalysisRecordContract> {
    const saved = clone(record);
    this.storedAnalyses.set(storedAnalysisKey(record.organizationId, record.assessmentId), saved);
    return clone(saved);
  }

  async findStoredAnalysis(organizationId: string, assessmentId: string): Promise<StoredAnalysisRecordContract | null> {
    const record = this.storedAnalyses.get(storedAnalysisKey(organizationId, assessmentId));
    return record ? clone(record) : null;
  }

  async findLatestStoredAnalysis(organizationId: string): Promise<StoredAnalysisRecordContract | null> {
    const record =
      [...this.storedAnalyses.values()]
        .filter((analysis) => analysis.organizationId === organizationId)
        .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))[0] ?? null;

    return record ? clone(record) : null;
  }

  async listLatestStoredAnalyses(): Promise<StoredAnalysisRecordContract[]> {
    const byOrganization = new Map<string, StoredAnalysisRecordContract>();
    for (const analysis of [...this.storedAnalyses.values()].sort((left, right) =>
      right.recordedAt.localeCompare(left.recordedAt)
    )) {
      if (!byOrganization.has(analysis.organizationId)) {
        byOrganization.set(analysis.organizationId, analysis);
      }
    }

    return [...byOrganization.values()]
      .sort((left, right) => left.organizationId.localeCompare(right.organizationId))
      .map((record) => clone(record));
  }

  async saveGeneratedReport(record: GeneratedReportRecordContract): Promise<GeneratedReportRecordContract> {
    const saved = clone(record);
    this.generatedReports.set(saved.id, saved);
    return clone(saved);
  }

  async findGeneratedReport(organizationId: string, reportId: string): Promise<GeneratedReportRecordContract | null> {
    const record = this.generatedReports.get(reportId);
    return record && record.organizationId === organizationId ? clone(record) : null;
  }

  async saveReportExport(record: ReportExportRecordContract): Promise<ReportExportRecordContract> {
    const saved = clone(record);
    this.reportExports.set(saved.id, saved);
    return clone(saved);
  }

  async findReportExport(organizationId: string, exportId: string): Promise<ReportExportRecordContract | null> {
    const record = this.reportExports.get(exportId);
    return record && record.organizationId === organizationId ? clone(record) : null;
  }

  async listReportExportsForReport(
    organizationId: string,
    generatedReportId: string
  ): Promise<ReportExportRecordContract[]> {
    return [...this.reportExports.values()]
      .filter((record) => record.organizationId === organizationId && record.generatedReportId === generatedReportId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((record) => clone(record));
  }

  async saveDashboardSnapshot(record: DashboardSnapshotRecordContract): Promise<DashboardSnapshotRecordContract> {
    const saved = clone(record);
    this.dashboardSnapshots.set(saved.id, saved);
    return clone(saved);
  }

  async findLatestDashboardSnapshot(
    organizationId: string,
    assessmentId?: string
  ): Promise<DashboardSnapshotRecordContract | null> {
    const record =
      [...this.dashboardSnapshots.values()]
        .filter(
          (snapshot) =>
            snapshot.organizationId === organizationId &&
            (assessmentId === undefined || snapshot.assessmentId === assessmentId)
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;

    return record ? clone(record) : null;
  }

  async listDashboardSnapshots(
    organizationId: string,
    options: {
      assessmentId?: string;
      since?: string;
      until?: string;
    } = {}
  ): Promise<DashboardSnapshotRecordContract[]> {
    return [...this.dashboardSnapshots.values()]
      .filter(
        (snapshot) =>
          snapshot.organizationId === organizationId &&
          (options.assessmentId === undefined || snapshot.assessmentId === options.assessmentId) &&
          (options.since === undefined || snapshot.createdAt >= options.since) &&
          (options.until === undefined || snapshot.createdAt <= options.until)
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => clone(record));
  }
}

export class PrismaOutputRecordRepository implements OutputRecordRepository {
  constructor(private readonly client: PrismaOutputRecordClient) {}

  async saveStoredAnalysis(record: StoredAnalysisRecordContract): Promise<StoredAnalysisRecordContract> {
    const existing = await this.client.complianceResultSnapshot.findUnique({
      where: {
        organizationId_assessmentId: {
          organizationId: record.organizationId,
          assessmentId: record.assessmentId
        }
      }
    });
    const existingPayload = isRecord(existing?.resultSetJson) ? existing.resultSetJson : {};
    const resultSetJson = toStoredAnalysisResultSetJson(record, existingPayload);
    const row = await this.client.complianceResultSnapshot.upsert({
      where: {
        organizationId_assessmentId: {
          organizationId: record.organizationId,
          assessmentId: record.assessmentId
        }
      },
      update: {
        jurisdiction: record.jurisdiction,
        catalogVersion: record.catalogVersion,
        recordedAt: toDateTime(record.recordedAt),
        resultSetJson: toJson(resultSetJson)
      },
      create: {
        organizationId: record.organizationId,
        assessmentId: record.assessmentId,
        jurisdiction: record.jurisdiction,
        catalogVersion: record.catalogVersion,
        recordedAt: toDateTime(record.recordedAt),
        resultSetJson: toJson(resultSetJson)
      }
    });

    return fromStoredAnalysisSnapshotRow(row);
  }

  async findStoredAnalysis(organizationId: string, assessmentId: string): Promise<StoredAnalysisRecordContract | null> {
    const row = await this.client.complianceResultSnapshot.findUnique({
      where: {
        organizationId_assessmentId: {
          organizationId,
          assessmentId
        }
      }
    });

    return row ? fromStoredAnalysisSnapshotRow(row) : null;
  }

  async findLatestStoredAnalysis(organizationId: string): Promise<StoredAnalysisRecordContract | null> {
    const row = await this.client.complianceResultSnapshot.findFirst({
      where: {
        organizationId
      },
      orderBy: {
        recordedAt: "desc"
      }
    });

    return row ? fromStoredAnalysisSnapshotRow(row) : null;
  }

  async listLatestStoredAnalyses(): Promise<StoredAnalysisRecordContract[]> {
    const rows = await this.client.complianceResultSnapshot.findMany({
      orderBy: {
        recordedAt: "desc"
      }
    });
    const byOrganization = new Map<string, StoredAnalysisRecordContract>();
    for (const row of rows) {
      if (!byOrganization.has(row.organizationId)) {
        byOrganization.set(row.organizationId, fromStoredAnalysisSnapshotRow(row));
      }
    }

    return [...byOrganization.values()].sort((left, right) => left.organizationId.localeCompare(right.organizationId));
  }

  async saveGeneratedReport(record: GeneratedReportRecordContract): Promise<GeneratedReportRecordContract> {
    const row = await this.client.generatedReport.upsert({
      where: {
        id: record.id
      },
      update: toGeneratedReportData(record),
      create: toGeneratedReportData(record)
    });

    return fromGeneratedReportRow(row);
  }

  async findGeneratedReport(organizationId: string, reportId: string): Promise<GeneratedReportRecordContract | null> {
    const row = await this.client.generatedReport.findFirst({
      where: {
        id: reportId,
        organizationId
      }
    });

    return row ? fromGeneratedReportRow(row) : null;
  }

  async saveReportExport(record: ReportExportRecordContract): Promise<ReportExportRecordContract> {
    const row = await this.client.reportExport.upsert({
      where: {
        id: record.id
      },
      update: toReportExportData(record),
      create: toReportExportData(record)
    });

    return fromReportExportRow(row);
  }

  async findReportExport(organizationId: string, exportId: string): Promise<ReportExportRecordContract | null> {
    const row = await this.client.reportExport.findFirst({
      where: {
        id: exportId,
        organizationId
      }
    });

    return row ? fromReportExportRow(row) : null;
  }

  async listReportExportsForReport(
    organizationId: string,
    generatedReportId: string
  ): Promise<ReportExportRecordContract[]> {
    const rows = await this.client.reportExport.findMany({
      where: {
        organizationId,
        generatedReportId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return rows.map(fromReportExportRow);
  }

  async saveDashboardSnapshot(record: DashboardSnapshotRecordContract): Promise<DashboardSnapshotRecordContract> {
    const row = await this.client.dashboardSnapshot.upsert({
      where: {
        id: record.id
      },
      update: toDashboardSnapshotData(record),
      create: toDashboardSnapshotData(record)
    });

    return fromDashboardSnapshotRow(row);
  }

  async findLatestDashboardSnapshot(
    organizationId: string,
    assessmentId?: string
  ): Promise<DashboardSnapshotRecordContract | null> {
    const row = await this.client.dashboardSnapshot.findFirst({
      where: stripUndefined({
        organizationId,
        assessmentId
      }),
      orderBy: {
        createdAt: "desc"
      }
    });

    return row ? fromDashboardSnapshotRow(row) : null;
  }

  async listDashboardSnapshots(
    organizationId: string,
    options: {
      assessmentId?: string;
      since?: string;
      until?: string;
    } = {}
  ): Promise<DashboardSnapshotRecordContract[]> {
    const createdAt = stripUndefined({
      gte: options.since ? toDateTime(options.since) : undefined,
      lte: options.until ? toDateTime(options.until) : undefined
    });
    const row = await this.client.dashboardSnapshot.findMany({
      where: stripUndefined({
        organizationId,
        assessmentId: options.assessmentId,
        createdAt: Object.keys(createdAt).length > 0 ? createdAt : undefined
      }),
      orderBy: {
        createdAt: "asc"
      }
    });

    return row.map(fromDashboardSnapshotRow);
  }
}

const toStoredAnalysisResultSetJson = (
  record: StoredAnalysisRecordContract,
  existingPayload: Record<string, unknown>
): Record<string, unknown> => ({
  ...existingPayload,
  organizationId: record.organizationId,
  assessmentId: record.assessmentId,
  jurisdiction: record.jurisdiction,
  catalogVersion: record.catalogVersion,
  recordedAt: record.recordedAt,
  results: record.results,
  gaps: record.gaps,
  recommendations: record.recommendations,
  readinessPlan: record.readinessPlan,
  checklistItems: Array.isArray(existingPayload.checklistItems) ? existingPayload.checklistItems : [],
  evidenceArtifacts: record.evidenceArtifacts
});

const toGeneratedReportData = (record: GeneratedReportRecordContract): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    assessmentId: uuidOrNull(record.assessmentId),
    reportType: record.reportType,
    jurisdiction: record.jurisdiction,
    status: record.status,
    legalCaveat: record.legalCaveat,
    sourceReferencesJson: record.sourceReferences,
    reportDataJson: toJson(record.reportData),
    evidenceArtifactId: uuidOrNull(record.evidenceArtifactId),
    contentHashSha256: record.contentHashSha256,
    createdBy: uuidOrNull(record.createdBy),
    createdAt: toDateTime(record.createdAt)
  });

const toReportExportData = (record: ReportExportRecordContract): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    generatedReportId: record.generatedReportId,
    exportFormat: record.exportFormat,
    status: record.status,
    storageUri: record.storageUri,
    contentHashSha256: record.contentHashSha256,
    createdAt: toDateTime(record.createdAt),
    expiresAt: record.expiresAt ? toDateTime(record.expiresAt) : undefined
  });

const toDashboardSnapshotData = (record: DashboardSnapshotRecordContract): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    assessmentId: uuidOrNull(record.assessmentId),
    snapshotType: record.snapshotType,
    source: record.source,
    snapshotJson: toJson(record.snapshot),
    createdAt: toDateTime(record.createdAt)
  });

const fromStoredAnalysisSnapshotRow = (row: StoredAnalysisSnapshotRow): StoredAnalysisRecordContract => {
  const payload = isRecord(row.resultSetJson) ? row.resultSetJson : {};

  return {
    organizationId: row.organizationId,
    assessmentId: row.assessmentId,
    jurisdiction: stringOr(payload.jurisdiction, row.jurisdiction),
    catalogVersion: stringOrUndefined(payload.catalogVersion) ?? row.catalogVersion ?? undefined,
    recordedAt: toIso(row.recordedAt),
    results: arrayOrEmpty(payload.results) as StoredAnalysisRecordContract["results"],
    gaps: arrayOrEmpty(payload.gaps) as StoredAnalysisRecordContract["gaps"],
    recommendations: arrayOrEmpty(payload.recommendations) as StoredAnalysisRecordContract["recommendations"],
    readinessPlan: (isRecord(payload.readinessPlan)
      ? payload.readinessPlan
      : emptyReadinessPlan(row)) as StoredAnalysisRecordContract["readinessPlan"],
    evidenceArtifacts: arrayOrEmpty(payload.evidenceArtifacts) as StoredAnalysisRecordContract["evidenceArtifacts"]
  };
};

const fromGeneratedReportRow = (row: GeneratedReportRow): GeneratedReportRecordContract =>
  stripUndefined({
    id: row.id,
    organizationId: row.organizationId,
    assessmentId: row.assessmentId ?? undefined,
    reportType: row.reportType,
    jurisdiction: row.jurisdiction ?? undefined,
    status: row.status,
    legalCaveat: row.legalCaveat,
    sourceReferences: stringArray(row.sourceReferencesJson),
    reportData: row.reportDataJson,
    evidenceArtifactId: row.evidenceArtifactId ?? undefined,
    contentHashSha256: row.contentHashSha256 ?? undefined,
    createdBy: row.createdBy ?? undefined,
    createdAt: toIso(row.createdAt)
  }) as GeneratedReportRecordContract;

const fromReportExportRow = (row: ReportExportRow): ReportExportRecordContract =>
  stripUndefined({
    id: row.id,
    organizationId: row.organizationId,
    generatedReportId: row.generatedReportId,
    exportFormat: row.exportFormat,
    status: row.status,
    storageUri: row.storageUri ?? undefined,
    contentHashSha256: row.contentHashSha256 ?? undefined,
    createdAt: toIso(row.createdAt),
    expiresAt: row.expiresAt ? toIso(row.expiresAt) : undefined
  }) as ReportExportRecordContract;

const fromDashboardSnapshotRow = (row: DashboardSnapshotRow): DashboardSnapshotRecordContract =>
  stripUndefined({
    id: row.id,
    organizationId: row.organizationId,
    assessmentId: row.assessmentId ?? undefined,
    snapshotType: row.snapshotType,
    source: row.source,
    snapshot: row.snapshotJson,
    createdAt: toIso(row.createdAt)
  }) as DashboardSnapshotRecordContract;

const emptyReadinessPlan = (row: StoredAnalysisSnapshotRow): StoredAnalysisRecordContract["readinessPlan"] => ({
  id: `${row.assessmentId}:readiness-plan`,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId,
  title: "PureSOC internal readiness plan",
  targetReadinessPercent: 100,
  status: "draft",
  generatedAt: toIso(row.recordedAt),
  items: []
});

const storedAnalysisKey = (organizationId: string, assessmentId: string): string => `${organizationId}:${assessmentId}`;

const toJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const clone = <T>(record: T): T => JSON.parse(JSON.stringify(record)) as T;

const toDateTime = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date-time value for output persistence: ${value}`);
  }

  return parsed;
};

const toIso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());

const uuidOrNull = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
};

const stringArray = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isString) : []);

const arrayOrEmpty = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const stringOr = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);

const stringOrUndefined = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const isString = (value: unknown): value is string => typeof value === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
