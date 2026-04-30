import type {
  ActionApprovalStatus,
  ActionPreflightStatus,
  ActionRun,
  ActionRunStatus,
  ActionTemplate,
  ActionVerificationStatus,
  RemediationActionRepository
} from "@puresoc/recommendations";

type DelegateArgs = Record<string, unknown>;

interface UpsertDelegate<TRow> {
  upsert(args: DelegateArgs): Promise<TRow>;
  findMany(args?: DelegateArgs): Promise<TRow[]>;
  findFirst(args: DelegateArgs): Promise<TRow | null>;
}

type ActionTemplateRow = Omit<ActionTemplate, "createdAt" | "updatedAt" | "preconditions" | "sourceReferences"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
  preconditionsJson?: unknown;
  sourceReferencesJson?: unknown;
};

type ActionRunRow = Omit<
  ActionRun,
  | "createdAt"
  | "updatedAt"
  | "approval"
  | "preflightResult"
  | "preStateSnapshot"
  | "postStateSnapshot"
  | "verificationResult"
  | "workerJob"
  | "sourceReferences"
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
  approvalStatus: ActionApprovalStatus;
  approvalRequestedBy?: string | null;
  approvalRequestedAt?: Date | string | null;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  approvalRejectedBy?: string | null;
  approvalRejectedAt?: Date | string | null;
  approvalRejectionReason?: string | null;
  preflightStatus: ActionPreflightStatus;
  preflightJson?: unknown;
  preStateSnapshotJson?: unknown;
  postStateSnapshotJson?: unknown;
  verificationStatus: ActionVerificationStatus;
  verificationJson?: unknown;
  workerJobJson?: unknown;
  sourceReferencesJson?: unknown;
  closedAt?: Date | string | null;
};

export interface PrismaActionClient {
  providerActionTemplate: UpsertDelegate<ActionTemplateRow>;
  providerActionRun: UpsertDelegate<ActionRunRow>;
}

export class PrismaActionRepository implements RemediationActionRepository {
  constructor(private readonly client: PrismaActionClient) {}

  async saveTemplate(template: ActionTemplate): Promise<ActionTemplate> {
    const row = await this.client.providerActionTemplate.upsert({
      where: {
        id: template.id
      },
      update: toTemplateData(template),
      create: toTemplateData(template)
    });

    return fromTemplateRow(row);
  }

  async findTemplateForOrganization(input: {
    organizationId: string;
    actionTemplateId: string;
  }): Promise<ActionTemplate | null> {
    const row = await this.client.providerActionTemplate.findFirst({
      where: {
        id: input.actionTemplateId
      }
    });

    if (!row || (row.organizationId && row.organizationId !== input.organizationId)) {
      return null;
    }

    return fromTemplateRow(row);
  }

  async saveActionRun(run: ActionRun): Promise<ActionRun> {
    const row = await this.client.providerActionRun.upsert({
      where: {
        id: run.id
      },
      update: toRunData(run),
      create: toRunData(run)
    });

    return fromRunRow(row);
  }

  async findActionRunForOrganization(input: {
    organizationId: string;
    actionRunId: string;
  }): Promise<ActionRun | null> {
    const row = await this.client.providerActionRun.findFirst({
      where: {
        id: input.actionRunId,
        organizationId: input.organizationId
      }
    });

    return row ? fromRunRow(row) : null;
  }

  async listActionRuns(organizationId: string): Promise<ActionRun[]> {
    const rows = await this.client.providerActionRun.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return rows.map(fromRunRow);
  }
}

const toTemplateData = (template: ActionTemplate): Record<string, unknown> =>
  stripUndefined({
    id: template.id,
    organizationId: uuidOrNull(template.organizationId),
    providerKey: template.providerKey,
    moduleKey: template.moduleKey,
    actionKey: template.actionKey,
    actionType: template.actionType,
    automationMode: template.automationMode,
    title: template.title,
    description: template.description,
    riskLevel: template.riskLevel,
    licenseRequired: template.licenseRequired,
    permissionsRequired: template.permissionsRequired,
    preconditionsJson: template.preconditions,
    expectedChange: template.expectedChange,
    blastRadius: template.blastRadius,
    rollbackStrategy: template.rollbackStrategy,
    manualFallback: template.manualFallback,
    evidenceRequired: template.evidenceRequired,
    enabledByDefault: template.enabledByDefault,
    highRiskForbiddenInV1: template.highRiskForbiddenInV1,
    sourceReferencesJson: template.sourceReferences,
    createdAt: new Date(template.createdAt),
    updatedAt: new Date(template.updatedAt)
  });

const toRunData = (run: ActionRun): Record<string, unknown> =>
  stripUndefined({
    id: run.id,
    organizationId: run.organizationId,
    providerConnectionId: run.providerConnectionId,
    recommendationId: uuidOrNull(run.recommendationId),
    actionTemplateId: uuidOrNull(run.actionTemplateId),
    controlId: run.controlId,
    jurisdiction: run.jurisdiction,
    providerKey: run.providerKey,
    moduleKey: run.moduleKey,
    actionKey: run.actionKey,
    actionType: run.actionType,
    automationMode: run.automationMode,
    title: run.title,
    riskLevel: run.riskLevel,
    licenseRequired: run.licenseRequired,
    permissionsRequired: run.permissionsRequired,
    preconditionsJson: run.preconditions,
    expectedChange: run.expectedChange,
    blastRadius: run.blastRadius,
    rollbackStrategy: run.rollbackStrategy,
    manualFallback: run.manualFallback,
    evidenceRequired: run.evidenceRequired,
    highRiskForbiddenInV1: run.highRiskForbiddenInV1,
    status: run.status,
    approvalStatus: run.approval.status,
    approvalRequestedBy: uuidOrNull(run.approval.requestedBy),
    approvalRequestedAt: nullableDate(run.approval.requestedAt),
    approvedBy: uuidOrNull(run.approval.approvedBy),
    approvedAt: nullableDate(run.approval.approvedAt),
    approvalRejectedBy: uuidOrNull(run.approval.rejectedBy),
    approvalRejectedAt: nullableDate(run.approval.rejectedAt),
    approvalRejectionReason: run.approval.rejectionReason,
    preflightStatus: run.preflightStatus,
    preflightJson: run.preflightResult ?? {},
    preStateSnapshotJson: run.preStateSnapshot ?? {},
    postStateSnapshotJson: run.postStateSnapshot ?? {},
    verificationStatus: run.verificationStatus,
    verificationJson: run.verificationResult ?? {},
    evidenceArtifactIds: run.evidenceArtifactIds,
    checklistTaskIds: run.checklistTaskIds,
    workerJobJson: run.workerJob ?? {},
    failureReason: run.failureReason,
    closedBy: uuidOrNull(run.closedBy),
    closedAt: nullableDate(run.closedAt),
    sourceReferencesJson: run.sourceReferences,
    createdAt: new Date(run.createdAt),
    updatedAt: new Date(run.updatedAt)
  });

const fromTemplateRow = (row: ActionTemplateRow): ActionTemplate => ({
  ...row,
  preconditions: asRecord(row.preconditionsJson),
  sourceReferences: Array.isArray(row.sourceReferencesJson) ? row.sourceReferencesJson : [],
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt)
}) as ActionTemplate;

const fromRunRow = (row: ActionRunRow): ActionRun =>
  stripUndefined({
    ...row,
    approval: {
      status: row.approvalStatus,
      requestedBy: row.approvalRequestedBy ?? undefined,
      requestedAt: row.approvalRequestedAt ? toIso(row.approvalRequestedAt) : undefined,
      approvedBy: row.approvedBy ?? undefined,
      approvedAt: row.approvedAt ? toIso(row.approvedAt) : undefined,
      rejectedBy: row.approvalRejectedBy ?? undefined,
      rejectedAt: row.approvalRejectedAt ? toIso(row.approvalRejectedAt) : undefined,
      rejectionReason: row.approvalRejectionReason ?? undefined
    },
    preflightResult: emptyObjectToUndefined(row.preflightJson),
    preStateSnapshot: emptyObjectToUndefined(row.preStateSnapshotJson),
    postStateSnapshot: emptyObjectToUndefined(row.postStateSnapshotJson),
    verificationResult: emptyObjectToUndefined(row.verificationJson),
    workerJob: emptyObjectToUndefined(row.workerJobJson),
    sourceReferences: Array.isArray(row.sourceReferencesJson) ? row.sourceReferencesJson : [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    closedAt: row.closedAt ? toIso(row.closedAt) : undefined
  }) as ActionRun;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const emptyObjectToUndefined = <T>(value: unknown): T | undefined =>
  value && typeof value === "object" && Object.keys(value).length > 0 ? (value as T) : undefined;

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

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
