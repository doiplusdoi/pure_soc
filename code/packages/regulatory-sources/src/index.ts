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
  listSources(input?: {
    hasUrl?: boolean;
    status?: RegulatorySourceRecordStatus;
  }): Promise<RegulatorySourceRecord[]>;
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

export interface RegulatorySourceMonitorConfig {
  enabled: boolean;
  requestTimeoutMs: number;
  staleAfterDays: number;
  reviewTaskOrganizationId?: string | null;
}

export interface RegulatorySourceMetadataCheckInput {
  source: RegulatorySourceRecord;
  timeoutMs: number;
}

export type RegulatorySourceMetadataCheckResult =
  | {
      outcome: "reachable";
      statusCode: number;
      etag?: string | null;
      lastModified?: string | null;
      contentHashSha256?: string | null;
      contentLength?: number | null;
    }
  | {
      outcome: "unreachable";
      statusCode?: number | null;
      errorCode: "http_status" | "timeout" | "request_failed" | "invalid_url" | "missing_url";
    };

export interface RegulatorySourceMetadataCheckClient {
  check(input: RegulatorySourceMetadataCheckInput): Promise<RegulatorySourceMetadataCheckResult>;
}

export interface RegulatorySourceMonitorSourceResult {
  sourceId: string;
  sourceVersionId?: string | null;
  url?: string | null;
  action:
    | "skipped_no_url"
    | "reachable_checked"
    | "review_task_created"
    | "review_task_existing";
  monitorStatus?: RegulatorySourceOperationalStatus;
  reviewTaskId?: string;
  metadataChanged: boolean;
  stale: boolean;
  reachable: boolean;
}

export interface RegulatorySourceMonitorRunResult {
  jobName: "regulatory.monitorCountrySources";
  enabled: boolean;
  checkedAt: string;
  checkedSourceCount: number;
  reviewTaskCount: number;
  results: RegulatorySourceMonitorSourceResult[];
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
    organizationId?: string;
    notes?: string;
    decisionJson?: JsonObject;
  }): Promise<RegulatoryReviewTaskRecord> {
    const task = await this.requireReviewTask(input.taskId);
    this.requireTaskOrganization(task, input.organizationId);
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
    organizationId?: string;
    notes?: string;
    decisionJson?: JsonObject;
  }): Promise<RegulatoryReviewTaskRecord> {
    const task = await this.requireReviewTask(input.taskId);
    this.requireTaskOrganization(task, input.organizationId);
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
    organizationId?: string;
    notes?: string;
    decisionJson?: JsonObject;
  }): Promise<{
    source: RegulatorySourceRecord;
    sourceVersion: RegulatorySourceVersionRecord;
    task: RegulatoryReviewTaskRecord;
  }> {
    const task = await this.requireReviewTask(input.taskId);
    this.requireTaskOrganization(task, input.organizationId);
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

  async getSourceMapTraceability(sourceVersionId: string, organizationId?: string): Promise<SourceMapTraceability> {
    const sourceVersion = await this.repository.findSourceVersionById(sourceVersionId);
    if (!sourceVersion) {
      throw new RegulatorySourceReviewError("source_version_not_found", "Source version was not found.", 404);
    }

    const source = await this.repository.findSourceById(sourceVersion.sourceId);
    if (!source) {
      throw new RegulatorySourceReviewError("source_not_found", "Regulatory source was not found.", 404);
    }

    const sourceMapEntries = await this.repository.listSourceMapEntries(sourceVersion.id);
    const allReviewTasks = (await this.repository.listReviewTasks()).filter(
      (task) => task.sourceVersionId === sourceVersion.id
    );
    const reviewTasks = this.scopeTraceabilityReviewTasks(allReviewTasks, organizationId);
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

    const existingTask = (await this.repository.listReviewTasks({ status: "open" })).find(
      (task) =>
        task.sourceId === (input.sourceId ?? null) &&
        task.createdForStatus === input.monitorStatus &&
        (task.organizationId ?? null) === (input.organizationId ?? null)
    );
    if (existingTask) {
      return existingTask;
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

  private requireTaskOrganization(task: RegulatoryReviewTaskRecord, organizationId?: string): void {
    if (organizationId === undefined) {
      return;
    }

    if (task.organizationId !== organizationId) {
      throw new RegulatorySourceReviewError(
        "review_task_not_found",
        "Regulatory review task was not found for this organization.",
        404
      );
    }
  }

  private scopeTraceabilityReviewTasks(
    tasks: RegulatoryReviewTaskRecord[],
    organizationId?: string
  ): RegulatoryReviewTaskRecord[] {
    if (organizationId === undefined) {
      return tasks;
    }

    const scopedTasks = tasks.filter(
      (task) => task.organizationId === null || task.organizationId === undefined || task.organizationId === organizationId
    );
    const hasTenantScopedTasks = tasks.some((task) => task.organizationId !== null && task.organizationId !== undefined);
    if (hasTenantScopedTasks && !tasks.some((task) => task.organizationId === organizationId)) {
      throw new RegulatorySourceReviewError(
        "source_version_not_found",
        "Source version was not found for this organization.",
        404
      );
    }

    return scopedTasks;
  }

  private nowIso(): string {
    return this.now().toISOString();
  }
}

export interface RegulatorySourceMonitorServiceOptions {
  repository: RegulatorySourceRepository;
  reviewService?: RegulatorySourceReviewService;
  metadataClient?: RegulatorySourceMetadataCheckClient;
  config: RegulatorySourceMonitorConfig;
  now?: () => Date;
  idFactory?: () => string;
}

export class RegulatorySourceMonitorService {
  private readonly repository: RegulatorySourceRepository;
  private readonly reviewService: RegulatorySourceReviewService;
  private readonly metadataClient: RegulatorySourceMetadataCheckClient;
  private readonly config: RegulatorySourceMonitorConfig;
  private readonly now: () => Date;

  constructor(options: RegulatorySourceMonitorServiceOptions) {
    this.repository = options.repository;
    this.reviewService =
      options.reviewService ??
      new RegulatorySourceReviewService({
        repository: options.repository,
        now: options.now,
        idFactory: options.idFactory
      });
    this.metadataClient = options.metadataClient ?? new FetchRegulatorySourceMetadataClient();
    this.config = options.config;
    this.now = options.now ?? (() => new Date());
  }

  async runOnce(configOverride: Partial<RegulatorySourceMonitorConfig> = {}): Promise<RegulatorySourceMonitorRunResult> {
    const config = {
      ...this.config,
      ...configOverride
    };
    const checkedAt = this.now().toISOString();

    if (!config.enabled) {
      return {
        jobName: "regulatory.monitorCountrySources",
        enabled: false,
        checkedAt,
        checkedSourceCount: 0,
        reviewTaskCount: 0,
        results: []
      };
    }

    const sources = await this.repository.listSources();
    const results: RegulatorySourceMonitorSourceResult[] = [];

    for (const source of sources) {
      if (!source.url) {
        results.push({
          sourceId: source.id,
          sourceVersionId: source.activeVersionId ?? null,
          url: source.url ?? null,
          action: "skipped_no_url",
          metadataChanged: false,
          stale: false,
          reachable: false
        });
        continue;
      }

      results.push(await this.checkSource(source, config, checkedAt));
    }

    return {
      jobName: "regulatory.monitorCountrySources",
      enabled: true,
      checkedAt,
      checkedSourceCount: results.filter((result) => result.action !== "skipped_no_url").length,
      reviewTaskCount: results.filter(
        (result) => result.action === "review_task_created" || result.action === "review_task_existing"
      ).length,
      results
    };
  }

  private async checkSource(
    source: RegulatorySourceRecord,
    config: RegulatorySourceMonitorConfig,
    checkedAt: string
  ): Promise<RegulatorySourceMonitorSourceResult> {
    const activeVersion = await this.findComparableVersion(source);
    const stale = isSourceStale(source.lastCheckedAt, checkedAt, config.staleAfterDays);
    const metadata = await this.checkMetadata(source, config.requestTimeoutMs);

    if (metadata.outcome === "unreachable") {
      return this.createMonitorTaskResult({
        source,
        activeVersion,
        monitorStatus: "unreachable",
        reason: `Regulatory source monitor could not reach ${source.title}.`,
        checkedAt,
        reviewTaskOrganizationId: config.reviewTaskOrganizationId,
        stale,
        reachable: false,
        metadataChanged: false,
        metadata
      });
    }

    const changedSignals = findChangedMetadataSignals(activeVersion, metadata);
    if (changedSignals.length > 0) {
      return this.createMonitorTaskResult({
        source,
        activeVersion,
        monitorStatus: "needs_review",
        reason: `Regulatory source monitor detected changed metadata for ${source.title}.`,
        checkedAt,
        reviewTaskOrganizationId: config.reviewTaskOrganizationId,
        stale,
        reachable: true,
        metadataChanged: true,
        metadata: {
          ...metadata,
          changedSignals
        }
      });
    }

    if (stale) {
      return this.createMonitorTaskResult({
        source,
        activeVersion,
        monitorStatus: "stale",
        reason: `Regulatory source ${source.title} has not been reviewed within the configured freshness window.`,
        checkedAt,
        reviewTaskOrganizationId: config.reviewTaskOrganizationId,
        stale,
        reachable: true,
        metadataChanged: false,
        metadata
      });
    }

    await this.repository.updateSource(source.id, {
      status: source.activationStatus,
      lastCheckedAt: checkedAt,
      updatedAt: checkedAt
    });

    return {
      sourceId: source.id,
      sourceVersionId: activeVersion?.id ?? source.activeVersionId ?? null,
      url: source.url ?? null,
      action: "reachable_checked",
      metadataChanged: false,
      stale: false,
      reachable: true
    };
  }

  private async createMonitorTaskResult(input: {
    source: RegulatorySourceRecord;
    activeVersion: RegulatorySourceVersionRecord | null;
    monitorStatus: RegulatorySourceOperationalStatus;
    reason: string;
    checkedAt: string;
    reviewTaskOrganizationId?: string | null;
    stale: boolean;
    reachable: boolean;
    metadataChanged: boolean;
    metadata: Record<string, unknown>;
  }): Promise<RegulatorySourceMonitorSourceResult> {
    const beforeTaskIds = new Set(
      (await this.repository.listReviewTasks({
        status: "open"
      })).map((task) => task.id)
    );
    const task = await this.reviewService.createSourceMonitorReviewTask({
      organizationId: input.reviewTaskOrganizationId ?? undefined,
      sourceId: input.source.id,
      sourceVersionId: input.activeVersion?.id ?? input.source.activeVersionId ?? undefined,
      monitorStatus: input.monitorStatus,
      reason: input.reason,
      metadataJson: {
        checkedAt: input.checkedAt,
        sourceTitle: input.source.title,
        sourceUrl: input.source.url ?? null,
        metadata: sanitizeMonitorMetadata(input.metadata)
      }
    });

    return {
      sourceId: input.source.id,
      sourceVersionId: input.activeVersion?.id ?? input.source.activeVersionId ?? null,
      url: input.source.url ?? null,
      action: beforeTaskIds.has(task.id) ? "review_task_existing" : "review_task_created",
      monitorStatus: input.monitorStatus,
      reviewTaskId: task.id,
      metadataChanged: input.metadataChanged,
      stale: input.stale,
      reachable: input.reachable
    };
  }

  private async findComparableVersion(source: RegulatorySourceRecord): Promise<RegulatorySourceVersionRecord | null> {
    if (source.activeVersionId) {
      const activeVersion = await this.repository.findSourceVersionById(source.activeVersionId);
      if (activeVersion) {
        return activeVersion;
      }
    }

    return this.repository.findActiveSourceVersion(source.id);
  }

  private async checkMetadata(
    source: RegulatorySourceRecord,
    timeoutMs: number
  ): Promise<RegulatorySourceMetadataCheckResult> {
    try {
      return await this.metadataClient.check({
        source,
        timeoutMs
      });
    } catch {
      return {
        outcome: "unreachable",
        errorCode: "request_failed"
      };
    }
  }
}

export class FetchRegulatorySourceMetadataClient implements RegulatorySourceMetadataCheckClient {
  async check(input: RegulatorySourceMetadataCheckInput): Promise<RegulatorySourceMetadataCheckResult> {
    if (!input.source.url) {
      return {
        outcome: "unreachable",
        errorCode: "missing_url"
      };
    }

    let url: URL;
    try {
      url = new URL(input.source.url);
    } catch {
      return {
        outcome: "unreachable",
        errorCode: "invalid_url"
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          outcome: "unreachable",
          statusCode: response.status,
          errorCode: "http_status"
        };
      }

      return {
        outcome: "reachable",
        statusCode: response.status,
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        contentHashSha256: response.headers.get("x-puresoc-content-sha256"),
        contentLength: parseNullableInteger(response.headers.get("content-length"))
      };
    } catch (error) {
      return {
        outcome: "unreachable",
        errorCode: isAbortError(error) ? "timeout" : "request_failed"
      };
    } finally {
      clearTimeout(timeout);
    }
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

  async listSources(input: {
    hasUrl?: boolean;
    status?: RegulatorySourceRecordStatus;
  } = {}): Promise<RegulatorySourceRecord[]> {
    return [...this.sources.values()]
      .filter((source) => input.hasUrl === undefined || Boolean(source.url) === input.hasUrl)
      .filter((source) => input.status === undefined || source.status === input.status)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(cloneRecord);
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

const isSourceStale = (lastCheckedAt: string | null | undefined, checkedAt: string, staleAfterDays: number): boolean => {
  if (!lastCheckedAt) {
    return true;
  }

  const lastChecked = Date.parse(lastCheckedAt);
  const checked = Date.parse(checkedAt);
  if (!Number.isFinite(lastChecked) || !Number.isFinite(checked)) {
    return true;
  }

  const staleAfterMs = staleAfterDays * 24 * 60 * 60 * 1000;
  return checked - lastChecked > staleAfterMs;
};

const findChangedMetadataSignals = (
  sourceVersion: RegulatorySourceVersionRecord | null,
  metadata: RegulatorySourceMetadataCheckResult
): string[] => {
  if (!sourceVersion || metadata.outcome !== "reachable") {
    return [];
  }

  const known = getKnownSourceMetadata(sourceVersion);
  const changedSignals: string[] = [];

  if (metadata.etag && known.etag && metadata.etag !== known.etag) {
    changedSignals.push("etag");
  }

  if (metadata.lastModified && known.lastModified && metadata.lastModified !== known.lastModified) {
    changedSignals.push("last_modified");
  }

  if (metadata.contentHashSha256 && known.contentHashSha256 && metadata.contentHashSha256 !== known.contentHashSha256) {
    changedSignals.push("content_hash_sha256");
  }

  return changedSignals;
};

const getKnownSourceMetadata = (
  sourceVersion: RegulatorySourceVersionRecord
): {
  etag?: string;
  lastModified?: string;
  contentHashSha256?: string;
} => {
  const monitorMetadata = getJsonObject(sourceVersion.metadataJson.sourceMonitor);
  const httpMetadata = getJsonObject(sourceVersion.metadataJson.httpMetadata);

  return {
    etag:
      getString(sourceVersion.metadataJson.etag) ??
      getString(sourceVersion.metadataJson.httpEtag) ??
      getString(monitorMetadata?.etag) ??
      getString(httpMetadata?.etag),
    lastModified:
      getString(sourceVersion.metadataJson.lastModified) ??
      getString(sourceVersion.metadataJson.lastModifiedAt) ??
      getString(monitorMetadata?.lastModified) ??
      getString(httpMetadata?.lastModified),
    contentHashSha256:
      sourceVersion.contentHashSha256 ??
      getString(sourceVersion.metadataJson.contentHashSha256) ??
      getString(monitorMetadata?.contentHashSha256) ??
      getString(httpMetadata?.contentHashSha256)
  };
};

const sanitizeMonitorMetadata = (metadata: Record<string, unknown>): JsonObject => {
  const allowedEntries = Object.entries(metadata).filter(([key]) =>
    [
      "outcome",
      "statusCode",
      "etag",
      "lastModified",
      "contentHashSha256",
      "contentLength",
      "errorCode",
      "changedSignals"
    ].includes(key)
  );

  return Object.fromEntries(allowedEntries.filter(([, value]) => value !== undefined)) as JsonObject;
};

const parseNullableInteger = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === "AbortError" || error.message.includes("aborted"));

const getJsonObject = (value: unknown): JsonObject | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : undefined;

const getString = (value: unknown): string | undefined => (typeof value === "string" && value.length > 0 ? value : undefined);

const cloneJson = (value: JsonObject): JsonObject => JSON.parse(JSON.stringify(value)) as JsonObject;

const cloneRecord = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
