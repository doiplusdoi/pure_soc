import { randomUUID } from "node:crypto";

export type JsonObject = Record<string, unknown>;

export type RegulatorySourceActivationStatus =
  | "draft"
  | "validated"
  | "review_required"
  | "active"
  | "superseded"
  | "deprecated";

export type RegulatorySourceOperationalStatus = "stale" | "unreachable" | "needs_review";

export type RegulatorySourceRecordStatus = RegulatorySourceActivationStatus | RegulatorySourceOperationalStatus;

export type RegulatorySourceType =
  | "directive"
  | "regulation"
  | "official_national_law"
  | "official_authority_guidance"
  | "official_registration_portal"
  | "official_commission_country_page"
  | "enisa_reference"
  | "secondary_tracker"
  | "internal_excel_seed";

export type RegulatorySourceTrustLevel = "primary" | "secondary" | "internal_seed";

export type RegulatoryValidationStatus = "not_validated" | "validated" | "failed";

export type RegulatoryReviewTaskStatus = "open" | "reviewed" | "rejected" | "activated";

export type RegulatoryReviewDecisionType = "reviewed" | "rejected" | "activated";

export interface RegulatorySourceRecord {
  id: string;
  frameworkKey: "nis2" | "nis2-eu" | "nis2-implementing-regulation-2024-2690";
  jurisdiction: "EU" | string;
  sourceType: RegulatorySourceType;
  title: string;
  url?: string | null;
  localFilePath?: string | null;
  publicationDate?: string | null;
  lastCheckedAt: string;
  versionLabel?: string | null;
  authorityName?: string | null;
  trustLevel: RegulatorySourceTrustLevel;
  status: RegulatorySourceRecordStatus;
  activationStatus: RegulatorySourceActivationStatus;
  activeVersionId?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegulatorySourceVersionRecord {
  id: string;
  sourceId: string;
  versionLabel: string;
  contentHashSha256?: string | null;
  activationStatus: RegulatorySourceActivationStatus;
  validationStatus: RegulatoryValidationStatus;
  metadataJson: JsonObject;
  importValidationReportJson: JsonObject;
  activatedAt?: string | null;
  activatedBy?: string | null;
  supersededAt?: string | null;
  supersededByVersionId?: string | null;
  createdAt: string;
}

export interface RegulatorySourceMapEntryRecord {
  id: string;
  sourceId: string;
  sourceVersionId: string;
  targetCollection: string;
  targetKey: string;
  sourceLocation: string;
  mappingJson: JsonObject;
  createdAt: string;
}

export interface RegulatoryReviewTaskRecord {
  id: string;
  organizationId?: string | null;
  sourceId?: string | null;
  sourceVersionId?: string | null;
  countryPackVersionId?: string | null;
  assignedRoleKey: "regulatory_admin";
  status: RegulatoryReviewTaskStatus;
  reason: string;
  createdForStatus: RegulatorySourceRecordStatus;
  metadataJson: JsonObject;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface RegulatoryReviewDecisionRecord {
  id: string;
  taskId: string;
  sourceVersionId?: string | null;
  decision: RegulatoryReviewDecisionType;
  decidedBy: string;
  decidedAt: string;
  notes?: string | null;
  decisionJson: JsonObject;
}

export interface RegulatorySourceChangeEvaluation {
  validationPassed: boolean;
  containsLegalLogicChange: boolean;
  reviewerApproved?: boolean;
}

export interface RegulatoryReviewTaskSkeleton {
  assignedRoleKey: "regulatory_admin";
  reason: string;
  status: "open";
  sourceRecordId?: string;
  sourceVersionId?: string;
  createdForStatus: "review_required";
}

export interface RegulatorySourceRepository {
  upsertSource(record: RegulatorySourceRecord): Promise<RegulatorySourceRecord>;
  updateSource(sourceId: string, patch: Partial<RegulatorySourceRecord>): Promise<RegulatorySourceRecord>;
  findSourceById(sourceId: string): Promise<RegulatorySourceRecord | null>;
  saveSourceVersion(record: RegulatorySourceVersionRecord): Promise<RegulatorySourceVersionRecord>;
  updateSourceVersion(
    sourceVersionId: string,
    patch: Partial<RegulatorySourceVersionRecord>
  ): Promise<RegulatorySourceVersionRecord>;
  findSourceVersionById(sourceVersionId: string): Promise<RegulatorySourceVersionRecord | null>;
  listSourceVersionsBySource(sourceId: string): Promise<RegulatorySourceVersionRecord[]>;
  findActiveSourceVersion(sourceId: string): Promise<RegulatorySourceVersionRecord | null>;
  saveSourceMapEntries(entries: RegulatorySourceMapEntryRecord[]): Promise<RegulatorySourceMapEntryRecord[]>;
  listSourceMapEntries(sourceVersionId: string): Promise<RegulatorySourceMapEntryRecord[]>;
  saveReviewTask(record: RegulatoryReviewTaskRecord): Promise<RegulatoryReviewTaskRecord>;
  updateReviewTask(taskId: string, patch: Partial<RegulatoryReviewTaskRecord>): Promise<RegulatoryReviewTaskRecord>;
  findReviewTaskById(taskId: string): Promise<RegulatoryReviewTaskRecord | null>;
  listReviewTasks(input?: {
    organizationId?: string;
    status?: RegulatoryReviewTaskStatus;
  }): Promise<RegulatoryReviewTaskRecord[]>;
  saveReviewDecision(record: RegulatoryReviewDecisionRecord): Promise<RegulatoryReviewDecisionRecord>;
  listReviewDecisionsForTask(taskId: string): Promise<RegulatoryReviewDecisionRecord[]>;
}

export interface ImportRegulatorySourceVersionInput {
  organizationId?: string;
  source: Omit<RegulatorySourceRecord, "status" | "activationStatus" | "createdAt" | "updatedAt"> &
    Partial<Pick<RegulatorySourceRecord, "status" | "activationStatus" | "createdAt" | "updatedAt">>;
  sourceVersion: {
    id?: string;
    versionLabel: string;
    contentHashSha256?: string | null;
    metadataJson?: JsonObject;
  };
  sourceMapEntries?: Array<
    Omit<RegulatorySourceMapEntryRecord, "id" | "sourceId" | "sourceVersionId" | "createdAt"> & {
      id?: string;
    }
  >;
  importValidationReport?: JsonObject;
  evaluation: RegulatorySourceChangeEvaluation;
  reviewReason?: string;
}

export interface ImportRegulatorySourceVersionResult {
  source: RegulatorySourceRecord;
  sourceVersion: RegulatorySourceVersionRecord;
  reviewTask?: RegulatoryReviewTaskRecord;
}

export interface SourceMapTraceability {
  source: RegulatorySourceRecord;
  sourceVersion: RegulatorySourceVersionRecord;
  sourceMapEntries: RegulatorySourceMapEntryRecord[];
  importValidationReport: JsonObject;
  reviewTasks: RegulatoryReviewTaskRecord[];
  reviewDecisions: RegulatoryReviewDecisionRecord[];
}

export interface SourceMonitorReviewTaskInput {
  organizationId?: string;
  sourceId?: string;
  sourceVersionId?: string;
  monitorStatus: RegulatorySourceOperationalStatus;
  reason: string;
  metadataJson?: JsonObject;
}

export type RegulatorySourceReviewErrorCode =
  | "invalid_source"
  | "review_task_not_found"
  | "source_not_found"
  | "source_version_not_found"
  | "invalid_review_task_state";

export class RegulatorySourceReviewError extends Error {
  readonly code: RegulatorySourceReviewErrorCode;
  readonly statusCode: number;

  constructor(code: RegulatorySourceReviewErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "RegulatorySourceReviewError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const regulatorySourceActivationLifecycle: RegulatorySourceActivationStatus[] = [
  "draft",
  "validated",
  "review_required",
  "active",
  "superseded",
  "deprecated"
];

export const changedLegalLogicDefaultStatus: RegulatorySourceActivationStatus = "review_required";

export const defaultImportedSourceStatus: RegulatorySourceActivationStatus = "draft";

export const determineSourceActivationStatus = (
  evaluation: RegulatorySourceChangeEvaluation
): RegulatorySourceActivationStatus => {
  if (!evaluation.validationPassed) {
    return "draft";
  }

  if (evaluation.containsLegalLogicChange) {
    return changedLegalLogicDefaultStatus;
  }

  if (evaluation.reviewerApproved) {
    return "active";
  }

  return "validated";
};

export const canAutoActivateRegulatoryChange = (evaluation: RegulatorySourceChangeEvaluation): boolean =>
  evaluation.validationPassed && !evaluation.containsLegalLogicChange && evaluation.reviewerApproved === true;

export const createRegulatoryReviewTaskSkeleton = (
  sourceRecordId: string | undefined,
  reason = "Changed or newly imported legal logic requires regulatory review before activation.",
  sourceVersionId?: string
): RegulatoryReviewTaskSkeleton => ({
  assignedRoleKey: "regulatory_admin",
  reason,
  status: "open",
  sourceRecordId,
  sourceVersionId,
  createdForStatus: "review_required"
});

export interface RegulatorySourceReviewServiceOptions {
  repository: RegulatorySourceRepository;
  now?: () => Date;
  idFactory?: () => string;
}

export class RegulatorySourceReviewService {
  private readonly repository: RegulatorySourceRepository;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: RegulatorySourceReviewServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async importSourceVersion(input: ImportRegulatorySourceVersionInput): Promise<ImportRegulatorySourceVersionResult> {
    assertSourceTrust(input.source);

    const recordedAt = this.nowIso();
    const sourceVersionId = input.sourceVersion.id ?? this.idFactory();
    const activationStatus = determineSourceActivationStatus(input.evaluation);
    const validationStatus: RegulatoryValidationStatus = input.evaluation.validationPassed ? "validated" : "failed";
    const source: RegulatorySourceRecord = await this.repository.upsertSource({
      ...input.source,
      status: activationStatus,
      activationStatus,
      versionLabel: input.sourceVersion.versionLabel,
      activeVersionId: activationStatus === "active" ? sourceVersionId : input.source.activeVersionId ?? null,
      createdAt: input.source.createdAt ?? recordedAt,
      updatedAt: recordedAt
    });
    const sourceVersion: RegulatorySourceVersionRecord = await this.repository.saveSourceVersion({
      id: sourceVersionId,
      sourceId: source.id,
      versionLabel: input.sourceVersion.versionLabel,
      contentHashSha256: input.sourceVersion.contentHashSha256 ?? null,
      activationStatus,
      validationStatus,
      metadataJson: cloneJson(input.sourceVersion.metadataJson ?? {}),
      importValidationReportJson: cloneJson(input.importValidationReport ?? {}),
      activatedAt: activationStatus === "active" ? recordedAt : null,
      activatedBy: null,
      supersededAt: null,
      supersededByVersionId: null,
      createdAt: recordedAt
    });

    await this.repository.saveSourceMapEntries(
      (input.sourceMapEntries ?? []).map((entry) => ({
        id: entry.id ?? this.idFactory(),
        sourceId: source.id,
        sourceVersionId: sourceVersion.id,
        targetCollection: entry.targetCollection,
        targetKey: entry.targetKey,
        sourceLocation: entry.sourceLocation,
        mappingJson: cloneJson(entry.mappingJson),
        createdAt: recordedAt
      }))
    );

    if (activationStatus === "active") {
      await this.supersedePreviouslyActiveVersion(source.id, sourceVersion.id, recordedAt);
    }

    const reviewTask =
      activationStatus === "review_required"
        ? await this.repository.saveReviewTask({
            id: this.idFactory(),
            organizationId: input.organizationId ?? null,
            sourceId: source.id,
            sourceVersionId: sourceVersion.id,
            countryPackVersionId: null,
            assignedRoleKey: "regulatory_admin",
            status: "open",
            reason:
              input.reviewReason ??
              "Changed or newly imported legal logic requires regulatory review before activation.",
            createdForStatus: "review_required",
            metadataJson: {
              validationStatus,
              containsLegalLogicChange: input.evaluation.containsLegalLogicChange
            },
            createdAt: recordedAt,
            resolvedAt: null
          })
        : undefined;

    return {
      source: await this.repository.findSourceById(source.id) ?? source,
      sourceVersion: await this.repository.findSourceVersionById(sourceVersion.id) ?? sourceVersion,
      reviewTask
    };
  }

  async listReviewTasks(input?: {
    organizationId?: string;
    status?: RegulatoryReviewTaskStatus;
  }): Promise<RegulatoryReviewTaskRecord[]> {
    return this.repository.listReviewTasks(input);
  }

  async markReviewed(input: {
    taskId: string;
    actorUserId: string;
    notes?: string;
    decisionJson?: JsonObject;
  }): Promise<RegulatoryReviewTaskRecord> {
    const task = await this.requireReviewTask(input.taskId);
    this.requireTaskStatus(task, "open");

    const decidedAt = this.nowIso();
    const updatedTask = await this.repository.updateReviewTask(task.id, {
      status: "reviewed"
    });
    await this.repository.saveReviewDecision({
      id: this.idFactory(),
      taskId: task.id,
      sourceVersionId: task.sourceVersionId ?? null,
      decision: "reviewed",
      decidedBy: input.actorUserId,
      decidedAt,
      notes: input.notes ?? null,
      decisionJson: cloneJson(input.decisionJson ?? {})
    });

    return updatedTask;
  }

  async reject(input: {
    taskId: string;
    actorUserId: string;
    notes?: string;
    decisionJson?: JsonObject;
  }): Promise<RegulatoryReviewTaskRecord> {
    const task = await this.requireReviewTask(input.taskId);
    if (task.status !== "open" && task.status !== "reviewed") {
      throw new RegulatorySourceReviewError(
        "invalid_review_task_state",
        "Only open or reviewed regulatory review tasks can be rejected."
      );
    }

    const decidedAt = this.nowIso();
    if (task.sourceVersionId) {
      await this.repository.updateSourceVersion(task.sourceVersionId, {
        activationStatus: "deprecated"
      });
    }

    const updatedTask = await this.repository.updateReviewTask(task.id, {
      status: "rejected",
      resolvedAt: decidedAt
    });
    await this.repository.saveReviewDecision({
      id: this.idFactory(),
      taskId: task.id,
      sourceVersionId: task.sourceVersionId ?? null,
      decision: "rejected",
      decidedBy: input.actorUserId,
      decidedAt,
      notes: input.notes ?? null,
      decisionJson: cloneJson(input.decisionJson ?? {})
    });

    return updatedTask;
  }

  async activateReviewedSourceVersion(input: {
    taskId: string;
    actorUserId: string;
    notes?: string;
    decisionJson?: JsonObject;
  }): Promise<{
    source: RegulatorySourceRecord;
    sourceVersion: RegulatorySourceVersionRecord;
    task: RegulatoryReviewTaskRecord;
  }> {
    const task = await this.requireReviewTask(input.taskId);
    this.requireTaskStatus(task, "reviewed");

    if (!task.sourceVersionId) {
      throw new RegulatorySourceReviewError(
        "source_version_not_found",
        "Regulatory review task is not linked to a source version.",
        404
      );
    }

    const sourceVersion = await this.repository.findSourceVersionById(task.sourceVersionId);
    if (!sourceVersion) {
      throw new RegulatorySourceReviewError("source_version_not_found", "Source version was not found.", 404);
    }

    const source = await this.repository.findSourceById(sourceVersion.sourceId);
    if (!source) {
      throw new RegulatorySourceReviewError("source_not_found", "Regulatory source was not found.", 404);
    }

    const decidedAt = this.nowIso();
    await this.supersedePreviouslyActiveVersion(source.id, sourceVersion.id, decidedAt);
    const activatedVersion = await this.repository.updateSourceVersion(sourceVersion.id, {
      activationStatus: "active",
      activatedAt: decidedAt,
      activatedBy: input.actorUserId,
      supersededAt: null,
      supersededByVersionId: null
    });
    const activatedSource = await this.repository.updateSource(source.id, {
      status: "active",
      activationStatus: "active",
      activeVersionId: activatedVersion.id,
      versionLabel: activatedVersion.versionLabel,
      updatedAt: decidedAt
    });
    const activatedTask = await this.repository.updateReviewTask(task.id, {
      status: "activated",
      resolvedAt: decidedAt
    });
    await this.repository.saveReviewDecision({
      id: this.idFactory(),
      taskId: task.id,
      sourceVersionId: activatedVersion.id,
      decision: "activated",
      decidedBy: input.actorUserId,
      decidedAt,
      notes: input.notes ?? null,
      decisionJson: cloneJson(input.decisionJson ?? {})
    });

    return {
      source: activatedSource,
      sourceVersion: activatedVersion,
      task: activatedTask
    };
  }

  async getSourceMapTraceability(sourceVersionId: string): Promise<SourceMapTraceability> {
    const sourceVersion = await this.repository.findSourceVersionById(sourceVersionId);
    if (!sourceVersion) {
      throw new RegulatorySourceReviewError("source_version_not_found", "Source version was not found.", 404);
    }

    const source = await this.repository.findSourceById(sourceVersion.sourceId);
    if (!source) {
      throw new RegulatorySourceReviewError("source_not_found", "Regulatory source was not found.", 404);
    }

    const sourceMapEntries = await this.repository.listSourceMapEntries(sourceVersion.id);
    const reviewTasks = (await this.repository.listReviewTasks()).filter(
      (task) => task.sourceVersionId === sourceVersion.id
    );
    const reviewDecisions = (
      await Promise.all(reviewTasks.map((task) => this.repository.listReviewDecisionsForTask(task.id)))
    ).flat();

    return {
      source,
      sourceVersion,
      sourceMapEntries,
      importValidationReport: cloneJson(sourceVersion.importValidationReportJson),
      reviewTasks,
      reviewDecisions
    };
  }

  async createSourceMonitorReviewTask(input: SourceMonitorReviewTaskInput): Promise<RegulatoryReviewTaskRecord> {
    const recordedAt = this.nowIso();
    if (input.sourceId) {
      await this.repository.updateSource(input.sourceId, {
        status: input.monitorStatus,
        updatedAt: recordedAt
      });
    }

    return this.repository.saveReviewTask({
      id: this.idFactory(),
      organizationId: input.organizationId ?? null,
      sourceId: input.sourceId ?? null,
      sourceVersionId: input.sourceVersionId ?? null,
      countryPackVersionId: null,
      assignedRoleKey: "regulatory_admin",
      status: "open",
      reason: input.reason,
      createdForStatus: input.monitorStatus,
      metadataJson: cloneJson({
        ...(input.metadataJson ?? {}),
        monitorStatus: input.monitorStatus,
        monitorCreatedLegalLogic: false
      }),
      createdAt: recordedAt,
      resolvedAt: null
    });
  }

  private async supersedePreviouslyActiveVersion(sourceId: string, newActiveVersionId: string, supersededAt: string) {
    const activeVersion = await this.repository.findActiveSourceVersion(sourceId);
    if (activeVersion && activeVersion.id !== newActiveVersionId) {
      await this.repository.updateSourceVersion(activeVersion.id, {
        activationStatus: "superseded",
        supersededAt,
        supersededByVersionId: newActiveVersionId
      });
    }
  }

  private async requireReviewTask(taskId: string): Promise<RegulatoryReviewTaskRecord> {
    const task = await this.repository.findReviewTaskById(taskId);
    if (!task) {
      throw new RegulatorySourceReviewError("review_task_not_found", "Regulatory review task was not found.", 404);
    }

    return task;
  }

  private requireTaskStatus(task: RegulatoryReviewTaskRecord, expected: RegulatoryReviewTaskStatus): void {
    if (task.status !== expected) {
      throw new RegulatorySourceReviewError(
        "invalid_review_task_state",
        `Regulatory review task must be ${expected} before this action.`
      );
    }
  }

  private nowIso(): string {
    return this.now().toISOString();
  }
}

export class InMemoryRegulatorySourceRepository implements RegulatorySourceRepository {
  readonly sources = new Map<string, RegulatorySourceRecord>();
  readonly sourceVersions = new Map<string, RegulatorySourceVersionRecord>();
  readonly sourceMapEntries = new Map<string, RegulatorySourceMapEntryRecord>();
  readonly reviewTasks = new Map<string, RegulatoryReviewTaskRecord>();
  readonly reviewDecisions = new Map<string, RegulatoryReviewDecisionRecord>();

  async upsertSource(record: RegulatorySourceRecord): Promise<RegulatorySourceRecord> {
    const existing = this.sources.get(record.id);
    const stored = cloneRecord({
      ...existing,
      ...record,
      createdAt: existing?.createdAt ?? record.createdAt,
      updatedAt: record.updatedAt ?? existing?.updatedAt
    });
    this.sources.set(stored.id, stored);
    return cloneRecord(stored);
  }

  async updateSource(sourceId: string, patch: Partial<RegulatorySourceRecord>): Promise<RegulatorySourceRecord> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new RegulatorySourceReviewError("source_not_found", "Regulatory source was not found.", 404);
    }

    const updated = cloneRecord({
      ...source,
      ...patch
    });
    this.sources.set(sourceId, updated);
    return cloneRecord(updated);
  }

  async findSourceById(sourceId: string): Promise<RegulatorySourceRecord | null> {
    const source = this.sources.get(sourceId);
    return source ? cloneRecord(source) : null;
  }

  async saveSourceVersion(record: RegulatorySourceVersionRecord): Promise<RegulatorySourceVersionRecord> {
    const stored = cloneRecord(record);
    this.sourceVersions.set(stored.id, stored);
    return cloneRecord(stored);
  }

  async updateSourceVersion(
    sourceVersionId: string,
    patch: Partial<RegulatorySourceVersionRecord>
  ): Promise<RegulatorySourceVersionRecord> {
    const sourceVersion = this.sourceVersions.get(sourceVersionId);
    if (!sourceVersion) {
      throw new RegulatorySourceReviewError("source_version_not_found", "Source version was not found.", 404);
    }

    const updated = cloneRecord({
      ...sourceVersion,
      ...patch
    });
    this.sourceVersions.set(sourceVersionId, updated);
    return cloneRecord(updated);
  }

  async findSourceVersionById(sourceVersionId: string): Promise<RegulatorySourceVersionRecord | null> {
    const sourceVersion = this.sourceVersions.get(sourceVersionId);
    return sourceVersion ? cloneRecord(sourceVersion) : null;
  }

  async listSourceVersionsBySource(sourceId: string): Promise<RegulatorySourceVersionRecord[]> {
    return [...this.sourceVersions.values()]
      .filter((sourceVersion) => sourceVersion.sourceId === sourceId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(cloneRecord);
  }

  async findActiveSourceVersion(sourceId: string): Promise<RegulatorySourceVersionRecord | null> {
    const active = [...this.sourceVersions.values()].find(
      (sourceVersion) => sourceVersion.sourceId === sourceId && sourceVersion.activationStatus === "active"
    );
    return active ? cloneRecord(active) : null;
  }

  async saveSourceMapEntries(entries: RegulatorySourceMapEntryRecord[]): Promise<RegulatorySourceMapEntryRecord[]> {
    for (const entry of entries) {
      this.sourceMapEntries.set(entry.id, cloneRecord(entry));
    }

    return entries.map(cloneRecord);
  }

  async listSourceMapEntries(sourceVersionId: string): Promise<RegulatorySourceMapEntryRecord[]> {
    return [...this.sourceMapEntries.values()]
      .filter((entry) => entry.sourceVersionId === sourceVersionId)
      .sort((left, right) => left.targetCollection.localeCompare(right.targetCollection) || left.targetKey.localeCompare(right.targetKey))
      .map(cloneRecord);
  }

  async saveReviewTask(record: RegulatoryReviewTaskRecord): Promise<RegulatoryReviewTaskRecord> {
    const stored = cloneRecord(record);
    this.reviewTasks.set(stored.id, stored);
    return cloneRecord(stored);
  }

  async updateReviewTask(
    taskId: string,
    patch: Partial<RegulatoryReviewTaskRecord>
  ): Promise<RegulatoryReviewTaskRecord> {
    const task = this.reviewTasks.get(taskId);
    if (!task) {
      throw new RegulatorySourceReviewError("review_task_not_found", "Regulatory review task was not found.", 404);
    }

    const updated = cloneRecord({
      ...task,
      ...patch
    });
    this.reviewTasks.set(taskId, updated);
    return cloneRecord(updated);
  }

  async findReviewTaskById(taskId: string): Promise<RegulatoryReviewTaskRecord | null> {
    const task = this.reviewTasks.get(taskId);
    return task ? cloneRecord(task) : null;
  }

  async listReviewTasks(input: {
    organizationId?: string;
    status?: RegulatoryReviewTaskStatus;
  } = {}): Promise<RegulatoryReviewTaskRecord[]> {
    return [...this.reviewTasks.values()]
      .filter((task) => input.organizationId === undefined || task.organizationId === input.organizationId)
      .filter((task) => input.status === undefined || task.status === input.status)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(cloneRecord);
  }

  async saveReviewDecision(record: RegulatoryReviewDecisionRecord): Promise<RegulatoryReviewDecisionRecord> {
    const stored = cloneRecord(record);
    this.reviewDecisions.set(stored.id, stored);
    return cloneRecord(stored);
  }

  async listReviewDecisionsForTask(taskId: string): Promise<RegulatoryReviewDecisionRecord[]> {
    return [...this.reviewDecisions.values()]
      .filter((decision) => decision.taskId === taskId)
      .sort((left, right) => left.decidedAt.localeCompare(right.decidedAt))
      .map(cloneRecord);
  }
}

const assertSourceTrust = (source: Pick<RegulatorySourceRecord, "sourceType" | "trustLevel">): void => {
  if (source.sourceType === "secondary_tracker" && source.trustLevel === "primary") {
    throw new RegulatorySourceReviewError(
      "invalid_source",
      "Secondary regulatory trackers must not be stored as primary legal truth."
    );
  }
};

const cloneJson = (value: JsonObject): JsonObject => JSON.parse(JSON.stringify(value)) as JsonObject;

const cloneRecord = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
