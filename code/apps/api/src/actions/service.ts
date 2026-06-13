import type { AuditWriter } from "@puresoc/audit";
import type { NotificationService } from "@puresoc/notifications";
import {
  RemediationActionLifecycle,
  type ActionPreflightResult,
  type ActionRun,
  type ActionSnapshotMetadata,
  type ActionTemplate,
  type ActionVerificationResult,
  type QueueActionRunInput,
  type RecommendationContract,
  type RemediationActionRepository
} from "@puresoc/recommendations";

import type { RequestContext } from "../http";

export interface ActionAuditInput {
  actorUserId?: string;
  context?: RequestContext;
}

export class ActionApiService {
  private readonly lifecycle: RemediationActionLifecycle;
  private readonly auditWriter: AuditWriter;
  private readonly notifications?: Pick<NotificationService, "send">;

  constructor(options: {
    repository: RemediationActionRepository;
    auditWriter: AuditWriter;
    notifications?: Pick<NotificationService, "send">;
    now?: () => Date;
  }) {
    this.lifecycle = new RemediationActionLifecycle({
      repository: options.repository,
      now: options.now
    });
    this.auditWriter = options.auditWriter;
    this.notifications = options.notifications;
  }

  createTemplate(input: Parameters<RemediationActionLifecycle["createTemplate"]>[0]): Promise<ActionTemplate> {
    return this.lifecycle.createTemplate(input);
  }

  createManualGuidedTasks(input: { run: ActionRun; ownerUserId?: string }) {
    return this.lifecycle.createManualGuidedTasks(input);
  }

  createActionRun(input: {
    organizationId: string;
    idempotencyKey?: string;
    providerConnectionId: string;
    recommendation: RecommendationContract;
    template: ActionTemplate;
    actorUserId?: string;
  }): Promise<ActionRun> {
    return this.lifecycle.createActionRun(input);
  }

  async recordPreflight(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId: string;
    result: Omit<ActionPreflightResult, "checkedAt" | "checkedBy"> &
      Partial<Pick<ActionPreflightResult, "checkedAt" | "checkedBy">>;
    context?: RequestContext;
  }): Promise<ActionRun> {
    const run = await this.lifecycle.recordPreflight(input);
    await this.auditAction({
      run,
      actorUserId: input.actorUserId,
      context: input.context,
      action: "action_preflight",
      afterJson: {
        preflightStatus: run.preflightStatus,
        checks: run.preflightResult?.checks.map((check) => ({
          code: check.code,
          status: check.status
        })),
        canRequestApproval: run.preflightResult?.canRequestApproval
      }
    });
    return run;
  }

  async requestApproval(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId: string;
    context?: RequestContext;
  }): Promise<ActionRun> {
    const run = await this.lifecycle.requestApproval(input);
    await this.auditAction({
      run,
      actorUserId: input.actorUserId,
      context: input.context,
      action: "action_approval_requested",
      afterJson: {
        approvalStatus: run.approval.status,
        requestedBy: run.approval.requestedBy
      }
    });
    return run;
  }

  async approve(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId: string;
    context?: RequestContext;
  }): Promise<ActionRun> {
    const run = await this.lifecycle.approve(input);
    await this.auditAction({
      run,
      actorUserId: input.actorUserId,
      context: input.context,
      action: "action_approved",
      afterJson: {
        approvalStatus: run.approval.status,
        approvedBy: run.approval.approvedBy
      }
    });
    return run;
  }

  attachSnapshot(input: {
    organizationId: string;
    actionRunId: string;
    snapshot: ActionSnapshotMetadata;
  }): Promise<ActionRun> {
    return this.lifecycle.attachSnapshot(input);
  }

  async queue(input: QueueActionRunInput & { context?: RequestContext }): Promise<{
    run: ActionRun;
    job: ActionRun["workerJob"];
  }> {
    const result = await this.lifecycle.queue(input);
    await this.auditAction({
      run: result.run,
      actorUserId: input.actorUserId,
      context: input.context,
      action: "action_queued",
      afterJson: {
        jobName: result.job.jobName,
        providerKey: result.job.providerKey,
        actionKey: result.job.actionKey,
        safetyGates: result.job.safetyGates
      }
    });
    return result;
  }

  async fail(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId?: string;
    reason: string;
    context?: RequestContext;
  }): Promise<ActionRun> {
    const run = await this.lifecycle.fail(input);
    await this.auditAction({
      run,
      actorUserId: input.actorUserId,
      context: input.context,
      action: "action_failed",
      afterJson: {
        status: run.status,
        failureReason: run.failureReason
      }
    });
    return run;
  }

  async recordVerification(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId: string;
    result: Omit<ActionVerificationResult, "verifiedAt" | "verifiedBy"> &
      Partial<Pick<ActionVerificationResult, "verifiedAt" | "verifiedBy">>;
    context?: RequestContext;
  }): Promise<ActionRun> {
    const run = await this.lifecycle.recordVerification(input);
    await this.auditAction({
      run,
      actorUserId: input.actorUserId,
      context: input.context,
      action: "action_verified",
      afterJson: {
        verificationStatus: run.verificationStatus,
        evidenceArtifactIds: run.verificationResult?.evidenceArtifactIds
      }
    });
    if (run.status === "verified") {
      await this.notifications?.send(run.organizationId, "REMEDIATION_ACTION_COMPLETED", {
        actionRunId: run.id,
        title: run.title,
        controlId: run.controlId,
        verifiedAt: run.verificationResult?.verifiedAt,
        verifiedBy: run.verificationResult?.verifiedBy
      });
    }
    return run;
  }

  async close(input: {
    organizationId: string;
    actionRunId: string;
    actorUserId: string;
    context?: RequestContext;
  }): Promise<ActionRun> {
    const run = await this.lifecycle.close(input);
    await this.auditAction({
      run,
      actorUserId: input.actorUserId,
      context: input.context,
      action: "action_closed",
      afterJson: {
        status: run.status,
        closedBy: run.closedBy,
        closedAt: run.closedAt
      }
    });
    return run;
  }

  private async auditAction(input: {
    run: ActionRun;
    actorUserId?: string;
    context?: RequestContext;
    action: string;
    afterJson: Record<string, unknown>;
  }): Promise<void> {
    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.run.organizationId,
      targetType: "provider_action_run",
      targetId: input.run.id,
      action: input.action,
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
      afterJson: {
        status: input.run.status,
        recommendationId: input.run.recommendationId,
        controlId: input.run.controlId,
        providerConnectionId: input.run.providerConnectionId,
        actionKey: input.run.actionKey,
        ...input.afterJson
      }
    });
  }
}
