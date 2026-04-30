import { randomUUID } from "node:crypto";

import type {
  ActionableSeverity,
  RecommendationActionType,
  RecommendationAutomationMode,
  SourceReference
} from "@puresoc/shared";

import type { RecommendationContract } from "./recommendation.types";

export type ActionPreflightStatus = "not_run" | "passed" | "failed";

export type ActionApprovalStatus = "not_requested" | "requested" | "approved" | "rejected";

export type ActionVerificationStatus = "not_run" | "passed" | "failed" | "manual_required";

export type ActionRunStatus =
  | "draft"
  | "preflight_pending"
  | "preflight_failed"
  | "preflight_passed"
  | "approval_requested"
  | "approval_rejected"
  | "approved"
  | "queued"
  | "running"
  | "failed"
  | "verification_pending"
  | "verification_failed"
  | "verified"
  | "closed"
  | "canceled";

export interface ActionDiff {
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes: Array<{
    field: string;
    before?: unknown;
    after?: unknown;
  }>;
}

export interface ActionPreflightCheck {
  code: string;
  status: "passed" | "failed" | "warning";
  message: string;
  details?: Record<string, unknown>;
}

export interface ActionPreflightResult {
  status: Exclude<ActionPreflightStatus, "not_run">;
  checkedAt: string;
  checkedBy?: string;
  checks: ActionPreflightCheck[];
  diff?: ActionDiff;
  requiredPermissions: string[];
  requiredLicense: string[];
  canRequestApproval: boolean;
}

export interface ActionApprovalState {
  status: ActionApprovalStatus;
  requestedBy?: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface ActionSnapshotMetadata {
  evidenceArtifactId: string;
  sourceType: "action_pre_state" | "action_post_state";
  contentHashSha256?: string;
  capturedAt: string;
  capturedBy?: string;
  providerConnectionId: string;
  resourceRefs: string[];
  description?: string;
}

export interface ActionVerificationCheck {
  code: string;
  status: "passed" | "failed" | "warning";
  message: string;
  evidenceArtifactIds: string[];
}

export interface ActionVerificationResult {
  status: Exclude<ActionVerificationStatus, "not_run">;
  verifiedAt: string;
  verifiedBy?: string;
  checks: ActionVerificationCheck[];
  evidenceArtifactIds: string[];
}

export interface ActionTemplate {
  id: string;
  organizationId?: string;
  providerKey: string;
  moduleKey?: string;
  actionKey: string;
  actionType: RecommendationActionType;
  automationMode: RecommendationAutomationMode;
  title: string;
  description?: string;
  riskLevel: ActionableSeverity;
  licenseRequired: string[];
  permissionsRequired: string[];
  preconditions: Record<string, unknown>;
  expectedChange: string;
  blastRadius: string;
  rollbackStrategy: string;
  manualFallback: string;
  evidenceRequired: boolean;
  enabledByDefault: boolean;
  highRiskForbiddenInV1: boolean;
  sourceReferences: SourceReference[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionRun {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  recommendationId?: string;
  actionTemplateId?: string;
  controlId: string;
  jurisdiction: string;
  providerKey: string;
  moduleKey?: string;
  actionKey: string;
  actionType: RecommendationActionType;
  automationMode: RecommendationAutomationMode;
  title: string;
  riskLevel: ActionableSeverity;
  licenseRequired: string[];
  permissionsRequired: string[];
  preconditions: Record<string, unknown>;
  expectedChange: string;
  blastRadius: string;
  rollbackStrategy: string;
  manualFallback: string;
  evidenceRequired: boolean;
  highRiskForbiddenInV1: boolean;
  status: ActionRunStatus;
  approval: ActionApprovalState;
  preflightStatus: ActionPreflightStatus;
  preflightResult?: ActionPreflightResult;
  preStateSnapshot?: ActionSnapshotMetadata;
  postStateSnapshot?: ActionSnapshotMetadata;
  verificationStatus: ActionVerificationStatus;
  verificationResult?: ActionVerificationResult;
  evidenceArtifactIds: string[];
  checklistTaskIds: string[];
  workerJob?: ActionWorkerJobMetadata;
  failureReason?: string;
  closedBy?: string;
  closedAt?: string;
  sourceReferences: SourceReference[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionWorkerJobMetadata {
  jobName: "actions.execute";
  actionRunId: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: string;
  actionKey: string;
  queuedByUserId: string;
  queuedAt: string;
  safetyGates: {
    preflightPassed: true;
    approvalGranted: true;
    preStateSnapshotSaved: true;
    providerWriteEnabledChecked: boolean;
  };
}

export interface ActionChecklistTask {
  id: string;
  organizationId: string;
  actionRunId: string;
  controlId: string;
  title: string;
  description: string;
  status: "task_generated";
  ownerUserId?: string;
  evidenceRequired: boolean;
}

export interface ActionEvidenceTask {
  id: string;
  organizationId: string;
  actionRunId: string;
  controlId: string;
  jurisdiction: string;
  title: string;
  sourceType: "manual_upload" | "checklist_completion" | "action_pre_state" | "action_post_state";
  required: boolean;
}

export interface ActionFollowupTasks {
  checklistTasks: ActionChecklistTask[];
  evidenceTasks: ActionEvidenceTask[];
}

export interface CreateActionTemplateInput {
  id?: string;
  organizationId?: string;
  providerKey: string;
  moduleKey?: string;
  actionKey: string;
  actionType: RecommendationActionType;
  automationMode: RecommendationAutomationMode;
  title: string;
  description?: string;
  riskLevel: ActionableSeverity;
  licenseRequired?: string[];
  permissionsRequired?: string[];
  preconditions?: Record<string, unknown>;
  expectedChange: string;
  blastRadius: string;
  rollbackStrategy: string;
  manualFallback: string;
  evidenceRequired?: boolean;
  enabledByDefault?: boolean;
  highRiskForbiddenInV1?: boolean;
  sourceReferences?: SourceReference[];
}

export interface CreateActionRunInput {
  id?: string;
  organizationId: string;
  providerConnectionId: string;
  actorUserId?: string;
  recommendation: RecommendationContract;
  template: ActionTemplate;
}

export interface QueueActionRunInput {
  organizationId: string;
  actionRunId: string;
  actorUserId: string;
  providerConnectionWriteEnabled: boolean;
}

export interface RemediationActionRepository {
  saveTemplate(template: ActionTemplate): Promise<ActionTemplate>;
  findTemplateForOrganization(input: {
    organizationId: string;
    actionTemplateId: string;
  }): Promise<ActionTemplate | null>;
  saveActionRun(run: ActionRun): Promise<ActionRun>;
  findActionRunForOrganization(input: {
    organizationId: string;
    actionRunId: string;
  }): Promise<ActionRun | null>;
  listActionRuns(organizationId: string): Promise<ActionRun[]>;
}

export type RemediationActionErrorCode =
  | "action_not_found"
  | "invalid_action_state"
  | "invalid_action_template"
  | "cross_organization_action"
  | "provider_connection_write_disabled";

export class RemediationActionError extends Error {
  readonly code: RemediationActionErrorCode;
  readonly statusCode: number;

  constructor(code: RemediationActionErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "RemediationActionError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const v1ForbiddenExecutableActionKeys = [
  "disable_user",
  "remove_global_admin_role",
  "delete_app_registration",
  "delete_enterprise_application",
  "enforce_conditional_access_global",
  "revoke_tenant_sessions",
  "blind_mail_flow_change",
  "apply_dlp_policy",
  "apply_retention_policy",
  "change_security_defaults",
  "defender_incident_writeback"
] as const;

const forbiddenExecutableActionKeySet = new Set<string>(v1ForbiddenExecutableActionKeys);

export const isV1ForbiddenExecutableActionKey = (actionKey: string): boolean =>
  forbiddenExecutableActionKeySet.has(actionKey);

export class InMemoryRemediationActionRepository implements RemediationActionRepository {
  readonly templates = new Map<string, ActionTemplate>();
  readonly runs = new Map<string, ActionRun>();

  async saveTemplate(template: ActionTemplate): Promise<ActionTemplate> {
    const stored = clone(template);
    this.templates.set(stored.id, stored);
    return clone(stored);
  }

  async findTemplateForOrganization(input: {
    organizationId: string;
    actionTemplateId: string;
  }): Promise<ActionTemplate | null> {
    const template = this.templates.get(input.actionTemplateId);
    if (!template || (template.organizationId && template.organizationId !== input.organizationId)) {
      return null;
    }

    return clone(template);
  }

  async saveActionRun(run: ActionRun): Promise<ActionRun> {
    const stored = clone(run);
    this.runs.set(stored.id, stored);
    return clone(stored);
  }

  async findActionRunForOrganization(input: {
    organizationId: string;
    actionRunId: string;
  }): Promise<ActionRun | null> {
    const run = this.runs.get(input.actionRunId);
    if (!run || run.organizationId !== input.organizationId) {
      return null;
    }

    return clone(run);
  }

  async listActionRuns(organizationId: string): Promise<ActionRun[]> {
    return [...this.runs.values()]
      .filter((run) => run.organizationId === organizationId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(clone);
  }
}

export class RemediationActionLifecycle {
  private readonly repository: RemediationActionRepository;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: {
    repository: RemediationActionRepository;
    now?: () => Date;
    idFactory?: () => string;
  }) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async createTemplate(input: CreateActionTemplateInput): Promise<ActionTemplate> {
    const timestamp = this.timestamp();
    const template: ActionTemplate = {
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      providerKey: input.providerKey,
      moduleKey: input.moduleKey,
      actionKey: input.actionKey,
      actionType: input.actionType,
      automationMode: input.automationMode,
      title: input.title,
      description: input.description,
      riskLevel: input.riskLevel,
      licenseRequired: input.licenseRequired ?? [],
      permissionsRequired: input.permissionsRequired ?? [],
      preconditions: input.preconditions ?? {},
      expectedChange: input.expectedChange,
      blastRadius: input.blastRadius,
      rollbackStrategy: input.rollbackStrategy,
      manualFallback: input.manualFallback,
      evidenceRequired: input.evidenceRequired ?? true,
      enabledByDefault: input.enabledByDefault ?? false,
      highRiskForbiddenInV1:
        input.highRiskForbiddenInV1 === true || isV1ForbiddenExecutableActionKey(input.actionKey),
      sourceReferences: input.sourceReferences ?? [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    validateTemplateSafety(template);
    return this.repository.saveTemplate(template);
  }

  async createActionRun(input: CreateActionRunInput): Promise<ActionRun> {
    if (input.template.organizationId && input.template.organizationId !== input.organizationId) {
      throw new RemediationActionError(
        "cross_organization_action",
        "Action template does not belong to the requested organization.",
        403
      );
    }

    validateTemplateSafety(input.template);

    const timestamp = this.timestamp();
    const run: ActionRun = {
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      recommendationId: input.recommendation.id,
      actionTemplateId: input.template.id,
      controlId: input.recommendation.controlId,
      jurisdiction: input.recommendation.jurisdiction,
      providerKey: input.template.providerKey,
      moduleKey: input.template.moduleKey,
      actionKey: input.template.actionKey,
      actionType: input.template.actionType,
      automationMode: input.template.automationMode,
      title: input.template.title,
      riskLevel: input.template.riskLevel,
      licenseRequired: input.template.licenseRequired,
      permissionsRequired: input.template.permissionsRequired,
      preconditions: input.template.preconditions,
      expectedChange: input.template.expectedChange,
      blastRadius: input.template.blastRadius,
      rollbackStrategy: input.template.rollbackStrategy,
      manualFallback: input.template.manualFallback,
      evidenceRequired: input.template.evidenceRequired || input.recommendation.evidenceRequired,
      highRiskForbiddenInV1: input.template.highRiskForbiddenInV1,
      status: "draft",
      approval: {
        status: "not_requested"
      },
      preflightStatus: "not_run",
      verificationStatus: "not_run",
      evidenceArtifactIds: [],
      checklistTaskIds: [],
      sourceReferences: input.recommendation.sourceReferences ?? input.template.sourceReferences,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    return this.repository.saveActionRun(run);
  }

  async recordPreflight(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId?: string;
    result: Omit<ActionPreflightResult, "checkedAt" | "checkedBy"> &
      Partial<Pick<ActionPreflightResult, "checkedAt" | "checkedBy">>;
  }): Promise<ActionRun> {
    const run = await this.requireRun(input.organizationId, input.actionRunId);
    const result: ActionPreflightResult = {
      ...input.result,
      checkedAt: input.result.checkedAt ?? this.timestamp(),
      checkedBy: input.result.checkedBy ?? input.actorUserId
    };
    const updated: ActionRun = {
      ...run,
      preflightStatus: result.status,
      preflightResult: result,
      status: result.status === "passed" ? "preflight_passed" : "preflight_failed",
      updatedAt: this.timestamp()
    };

    return this.repository.saveActionRun(updated);
  }

  async requestApproval(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId: string;
  }): Promise<ActionRun> {
    const run = await this.requireRun(input.organizationId, input.actionRunId);
    requirePreflightPassed(run);

    const timestamp = this.timestamp();
    return this.repository.saveActionRun({
      ...run,
      status: "approval_requested",
      approval: {
        status: "requested",
        requestedBy: input.actorUserId,
        requestedAt: timestamp
      },
      updatedAt: timestamp
    });
  }

  async approve(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId: string;
  }): Promise<ActionRun> {
    const run = await this.requireRun(input.organizationId, input.actionRunId);
    requirePreflightPassed(run);

    if (run.approval.status !== "requested") {
      throw new RemediationActionError(
        "invalid_action_state",
        "Action approval must be requested before it can be granted."
      );
    }

    const timestamp = this.timestamp();
    return this.repository.saveActionRun({
      ...run,
      status: "approved",
      approval: {
        ...run.approval,
        status: "approved",
        approvedBy: input.actorUserId,
        approvedAt: timestamp
      },
      updatedAt: timestamp
    });
  }

  async attachSnapshot(input: {
    organizationId: string;
    actionRunId: string;
    snapshot: ActionSnapshotMetadata;
  }): Promise<ActionRun> {
    const run = await this.requireRun(input.organizationId, input.actionRunId);
    const evidenceArtifactIds = uniqueStrings([...run.evidenceArtifactIds, input.snapshot.evidenceArtifactId]);
    const patch =
      input.snapshot.sourceType === "action_pre_state"
        ? { preStateSnapshot: input.snapshot }
        : {
            postStateSnapshot: input.snapshot,
            status: "verification_pending" as ActionRunStatus
          };

    return this.repository.saveActionRun({
      ...run,
      ...patch,
      evidenceArtifactIds,
      updatedAt: this.timestamp()
    });
  }

  async queue(input: QueueActionRunInput): Promise<{ run: ActionRun; job: ActionWorkerJobMetadata }> {
    const run = await this.requireRun(input.organizationId, input.actionRunId);
    requirePreflightPassed(run);

    if (run.approval.status !== "approved") {
      throw new RemediationActionError(
        "invalid_action_state",
        "Action cannot be queued until explicit approval is granted."
      );
    }

    if (!run.preStateSnapshot) {
      throw new RemediationActionError(
        "invalid_action_state",
        "Action cannot be queued until a pre-state snapshot is saved."
      );
    }

    if (run.highRiskForbiddenInV1 && run.automationMode === "executable_later") {
      throw new RemediationActionError(
        "invalid_action_template",
        "This high-risk action is forbidden as an executable V1 default."
      );
    }

    if (run.automationMode === "executable_later" && !input.providerConnectionWriteEnabled) {
      throw new RemediationActionError(
        "provider_connection_write_disabled",
        "Provider connection write access must be explicitly enabled before executable actions can be queued."
      );
    }

    const timestamp = this.timestamp();
    const job: ActionWorkerJobMetadata = {
      jobName: "actions.execute",
      actionRunId: run.id,
      organizationId: run.organizationId,
      providerConnectionId: run.providerConnectionId,
      providerKey: run.providerKey,
      actionKey: run.actionKey,
      queuedByUserId: input.actorUserId,
      queuedAt: timestamp,
      safetyGates: {
        preflightPassed: true,
        approvalGranted: true,
        preStateSnapshotSaved: true,
        providerWriteEnabledChecked: run.automationMode === "executable_later"
      }
    };
    const updated = await this.repository.saveActionRun({
      ...run,
      status: "queued",
      workerJob: job,
      updatedAt: timestamp
    });

    return {
      run: updated,
      job
    };
  }

  async fail(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId?: string;
    reason: string;
  }): Promise<ActionRun> {
    const run = await this.requireRun(input.organizationId, input.actionRunId);
    const timestamp = this.timestamp();
    return this.repository.saveActionRun({
      ...run,
      status: "failed",
      failureReason: input.reason,
      updatedAt: timestamp
    });
  }

  async recordVerification(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId?: string;
    result: Omit<ActionVerificationResult, "verifiedAt" | "verifiedBy"> &
      Partial<Pick<ActionVerificationResult, "verifiedAt" | "verifiedBy">>;
  }): Promise<ActionRun> {
    const run = await this.requireRun(input.organizationId, input.actionRunId);
    const result: ActionVerificationResult = {
      ...input.result,
      verifiedAt: input.result.verifiedAt ?? this.timestamp(),
      verifiedBy: input.result.verifiedBy ?? input.actorUserId
    };
    const status =
      result.status === "passed"
        ? "verified"
        : result.status === "failed"
          ? "verification_failed"
          : "verification_pending";

    return this.repository.saveActionRun({
      ...run,
      status,
      verificationStatus: result.status,
      verificationResult: result,
      evidenceArtifactIds: uniqueStrings([...run.evidenceArtifactIds, ...result.evidenceArtifactIds]),
      updatedAt: this.timestamp()
    });
  }

  async close(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId: string;
  }): Promise<ActionRun> {
    const run = await this.requireRun(input.organizationId, input.actionRunId);

    if (!run.verificationResult) {
      throw new RemediationActionError("invalid_action_state", "Action cannot close before verification is recorded.");
    }

    if (run.evidenceArtifactIds.length === 0) {
      throw new RemediationActionError(
        "invalid_action_state",
        "Action cannot close before linked evidence metadata exists."
      );
    }

    const timestamp = this.timestamp();
    return this.repository.saveActionRun({
      ...run,
      status: "closed",
      closedBy: input.actorUserId,
      closedAt: timestamp,
      updatedAt: timestamp
    });
  }

  createManualGuidedTasks(input: {
    run: ActionRun;
    ownerUserId?: string;
  }): ActionFollowupTasks {
    if (input.run.automationMode !== "manual" && input.run.automationMode !== "guided") {
      return {
        checklistTasks: [],
        evidenceTasks: []
      };
    }

    return {
      checklistTasks: [
        {
          id: `${input.run.id}:checklist`,
          organizationId: input.run.organizationId,
          actionRunId: input.run.id,
          controlId: input.run.controlId,
          title: input.run.title,
          description: input.run.manualFallback,
          status: "task_generated",
          ownerUserId: input.ownerUserId,
          evidenceRequired: input.run.evidenceRequired
        }
      ],
      evidenceTasks: input.run.evidenceRequired
        ? [
            {
              id: `${input.run.id}:evidence`,
              organizationId: input.run.organizationId,
              actionRunId: input.run.id,
              controlId: input.run.controlId,
              jurisdiction: input.run.jurisdiction,
              title: `Attach evidence for ${input.run.title}`,
              sourceType: "checklist_completion",
              required: true
            }
          ]
        : []
    };
  }

  private async requireRun(organizationId: string, actionRunId: string): Promise<ActionRun> {
    const run = await this.repository.findActionRunForOrganization({
      organizationId,
      actionRunId
    });

    if (!run) {
      throw new RemediationActionError("action_not_found", "Action run was not found for this organization.", 404);
    }

    return run;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

const validateTemplateSafety = (template: ActionTemplate): void => {
  if (
    template.highRiskForbiddenInV1 &&
    template.enabledByDefault &&
    template.automationMode === "executable_later"
  ) {
    throw new RemediationActionError(
      "invalid_action_template",
      "High-risk V1-forbidden actions cannot be executable by default."
    );
  }
};

const requirePreflightPassed = (run: ActionRun): void => {
  if (run.preflightStatus !== "passed" || run.preflightResult?.status !== "passed") {
    throw new RemediationActionError("invalid_action_state", "Action requires a passed preflight result.");
  }
};

const uniqueStrings = (values: readonly string[]): string[] => [...new Set(values.filter(Boolean))];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
