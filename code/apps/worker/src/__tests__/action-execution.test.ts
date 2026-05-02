import { loadConfig } from "@puresoc/config";
import { InMemoryProviderResourceStore, type ProviderActionExecutor } from "@puresoc/providers-core";
import { createMockProviderActionExecutor } from "@puresoc/provider-mock";
import {
  InMemoryRemediationActionRepository,
  RemediationActionLifecycle,
  type ActionRun,
  type ActionTemplate,
  type RecommendationContract
} from "@puresoc/recommendations";
import { describe, expect, it } from "vitest";

import { createRemediationActionExecutionJob } from "../actions";
import { executeRemediationActionJob } from "../action-execution";
import { createWorkerRuntime } from "../runtime";

const now = () => new Date("2026-05-02T10:00:00.000Z");

describe("worker remediation action execution", () => {
  it("executes deterministic mock provider actions only after persisted safety gates and write enablement", async () => {
    const setup = await prepareQueuedActionRun({ automationMode: "executable_later", writeEnabled: true });
    let applyCalls = 0;
    const executor = countingExecutor(createMockProviderActionExecutor({ now }), () => {
      applyCalls += 1;
    });
    const worker = createWorkerRuntime({
      config: loadConfig({ env: {} }),
      idFactory: deterministicIds("worker_job"),
      actionExecution: {
        repository: setup.repository,
        providerStore: setup.providerStore,
        actionExecutors: {
          mock: executor
        },
        auditWriter: setup.auditWriter,
        now
      }
    });

    const firstDispatch = await worker.dispatchRemediationActionJob(setup.job);
    const duplicateDispatch = await worker.dispatchRemediationActionJob(setup.job);
    const result = await worker.runtime.runNext();
    const finalRun = await setup.repository.findActionRunForOrganization({
      organizationId: setup.run.organizationId,
      actionRunId: setup.run.id
    });

    expect(firstDispatch.status).toBe("enqueued");
    expect(duplicateDispatch.status).toBe("duplicate");
    expect(result).toMatchObject({
      status: "succeeded",
      job: {
        status: "succeeded",
        result: {
          actionRunId: setup.run.id,
          providerWriteExecution: "mock_executed",
          executionMode: "fake",
          verificationStatus: "passed",
          postStateEvidenceArtifactId: expect.stringContaining(`${setup.run.id}:post_state:`)
        }
      }
    });
    expect(applyCalls).toBe(1);
    expect(finalRun).toMatchObject({
      status: "verified",
      verificationStatus: "passed",
      postStateSnapshot: {
        sourceType: "action_post_state",
        providerConnectionId: setup.run.providerConnectionId
      }
    });
    expect(setup.auditSink.findByAction("action_applied")).toHaveLength(1);
    expect(setup.auditSink.findByAction("action_verified")).toHaveLength(1);
    expect(JSON.stringify(setup.auditSink.records)).not.toContain("worker-secret-token");

    const idempotent = await executeRemediationActionJob(setup.job, {
      repository: setup.repository,
      providerStore: setup.providerStore,
      actionExecutors: {
        mock: executor
      },
      auditWriter: setup.auditWriter,
      now
    });
    expect(idempotent.providerWriteExecution).toBe("already_completed");
    expect(applyCalls).toBe(1);
  });

  it("fails mock provider apply failures with redacted audit and non-retryable job metadata", async () => {
    const setup = await prepareQueuedActionRun({
      automationMode: "executable_later",
      writeEnabled: true,
      preconditions: {
        mockExecution: {
          applyStatus: "failed",
          authorization: "Bearer worker-secret-token",
          accessToken: "worker-access-token",
          clientSecret: "worker-client-secret"
        }
      }
    });
    const worker = createWorkerRuntime({
      config: loadConfig({ env: {} }),
      idFactory: deterministicIds("worker_job"),
      actionExecution: {
        repository: setup.repository,
        providerStore: setup.providerStore,
        actionExecutors: {
          mock: createMockProviderActionExecutor({ now })
        },
        auditWriter: setup.auditWriter,
        now
      }
    });

    await worker.dispatchRemediationActionJob(setup.job);
    const result = await worker.runtime.runNext();
    const failedRun = await setup.repository.findActionRunForOrganization({
      organizationId: setup.run.organizationId,
      actionRunId: setup.run.id
    });
    const serializedAudit = JSON.stringify(setup.auditSink.records);
    const serializedFailure = JSON.stringify(result);

    expect(result).toMatchObject({
      status: "failed",
      failure: {
        code: "provider_action_apply_failed",
        retryable: false
      },
      job: {
        status: "failed",
        retry: {
          retryable: false
        }
      }
    });
    expect(failedRun).toMatchObject({
      status: "failed",
      failureReason: "Provider action apply failed."
    });
    expect(setup.auditSink.findByAction("action_failed")).toHaveLength(1);
    for (const secret of ["worker-secret-token", "worker-access-token", "worker-client-secret"]) {
      expect(serializedAudit).not.toContain(secret);
      expect(serializedFailure).not.toContain(secret);
    }
    expect(serializedAudit).toContain("[REDACTED]");
  });

  it("refuses persisted runs that lost preflight, approval, or snapshot safety metadata", async () => {
    const setup = await prepareQueuedActionRun({ automationMode: "executable_later", writeEnabled: true });
    await setup.repository.saveActionRun({
      ...setup.run,
      preflightStatus: "not_run",
      preflightResult: undefined
    });
    const worker = createWorkerRuntime({
      config: loadConfig({ env: {} }),
      idFactory: deterministicIds("worker_job"),
      actionExecution: {
        repository: setup.repository,
        providerStore: setup.providerStore,
        actionExecutors: {
          mock: createMockProviderActionExecutor({ now })
        },
        auditWriter: setup.auditWriter,
        now
      }
    });

    await worker.dispatchRemediationActionJob(setup.job);
    const result = await worker.runtime.runNext();

    expect(result).toMatchObject({
      status: "failed",
      failure: {
        code: "action_run_safety_state_invalid",
        retryable: false
      }
    });
    expect(setup.auditSink.findByAction("action_failed")).toHaveLength(1);
  });

  it("keeps provider execution blocked when the connection was not write-enabled and checked", async () => {
    const setup = await prepareQueuedActionRun({ automationMode: "preflightable", writeEnabled: false });
    const worker = createWorkerRuntime({
      config: loadConfig({ env: {} }),
      idFactory: deterministicIds("worker_job"),
      actionExecution: {
        repository: setup.repository,
        providerStore: setup.providerStore,
        actionExecutors: {
          mock: createMockProviderActionExecutor({ now })
        },
        auditWriter: setup.auditWriter,
        now
      }
    });

    await worker.dispatchRemediationActionJob(setup.job);
    const result = await worker.runtime.runNext();

    expect(result).toMatchObject({
      status: "failed",
      failure: {
        code: "provider_action_write_not_enabled",
        retryable: false
      }
    });
    expect(setup.auditSink.findByAction("action_failed")[0]?.afterJson).toMatchObject({
      failureCode: "provider_action_write_not_enabled"
    });
  });
});

const prepareQueuedActionRun = async (input: {
  automationMode: ActionTemplate["automationMode"];
  writeEnabled: boolean;
  preconditions?: Record<string, unknown>;
}) => {
  const repository = new InMemoryRemediationActionRepository();
  const providerStore = new InMemoryProviderResourceStore({ now });
  const auditSink = createFakeAuditSink();
  const auditWriter = {
    write: async (record: FakeAuditRecord) => {
      auditSink.records.push(record);
      return record;
    }
  };
  const lifecycle = new RemediationActionLifecycle({
    repository,
    now,
    idFactory: deterministicIds("action")
  });
  await providerStore.createConnection({
    id: "provider_connection_worker_exec",
    organizationId: "org_worker_exec",
    providerKey: "mock",
    displayName: "Mock write execution fixture",
    writeEnabled: input.writeEnabled
  });
  const template = await lifecycle.createTemplate({
    ...actionTemplate(input.automationMode),
    preconditions: input.preconditions ?? {}
  });
  const run = await lifecycle.createActionRun({
    id: "action_run_worker_exec",
    organizationId: "org_worker_exec",
    providerConnectionId: "provider_connection_worker_exec",
    actorUserId: "operator_1",
    recommendation: recommendation(input.automationMode),
    template
  });
  await lifecycle.recordPreflight({
    organizationId: run.organizationId,
    actionRunId: run.id,
    actorUserId: "operator_1",
    result: passedPreflight()
  });
  await lifecycle.requestApproval({
    organizationId: run.organizationId,
    actionRunId: run.id,
    actorUserId: "operator_1"
  });
  await lifecycle.approve({
    organizationId: run.organizationId,
    actionRunId: run.id,
    actorUserId: "approver_1"
  });
  await lifecycle.attachSnapshot({
    organizationId: run.organizationId,
    actionRunId: run.id,
    snapshot: preSnapshot()
  });
  const queued = await lifecycle.queue({
    organizationId: run.organizationId,
    actionRunId: run.id,
    actorUserId: "operator_1",
    providerConnectionWriteEnabled: input.writeEnabled
  });
  const job = createRemediationActionExecutionJob(queued.run, {
    queuedByUserId: "operator_1",
    queuedAt: queued.job.queuedAt,
    providerConnectionWriteEnabledChecked: queued.job.safetyGates.providerWriteEnabledChecked
  });

  return {
    repository,
    providerStore,
    auditSink,
    auditWriter,
    run: queued.run,
    job
  };
};

const actionTemplate = (automationMode: ActionTemplate["automationMode"]): Omit<ActionTemplate, "createdAt" | "updatedAt"> => ({
  id: "template_worker_exec",
  organizationId: "org_worker_exec",
  providerKey: "mock",
  moduleKey: "identity",
  actionKey: "ca_report_only_legacy_auth_block",
  actionType: "technical",
  automationMode,
  title: "Prepare report-only legacy authentication block",
  riskLevel: "medium",
  licenseRequired: ["entra_id_p1"],
  permissionsRequired: ["Policy.ReadWrite.ConditionalAccess"],
  preconditions: {},
  expectedChange: "A report-only policy draft is prepared for review.",
  blastRadius: "No tenant enforcement occurs outside the mock executor.",
  rollbackStrategy: "Discard the fake provider fixture.",
  manualFallback: "Document the manual Conditional Access review and attach approval evidence.",
  evidenceRequired: true,
  enabledByDefault: false,
  highRiskForbiddenInV1: false,
  sourceReferences: []
});

const recommendation = (automationMode: ActionTemplate["automationMode"]): RecommendationContract => ({
  id: "recommendation_worker_exec",
  organizationId: "org_worker_exec",
  sourceFindingId: "finding_worker_exec",
  sourceFindingIds: ["finding_worker_exec"],
  manualTaskIds: [],
  controlId: "nis2.access-control.mfa",
  jurisdiction: "EU",
  title: "Review admin MFA coverage",
  summary: "Admin MFA coverage is incomplete.",
  severity: "high",
  confidence: "high",
  recommendationType: "technical",
  automationMode,
  requiredPermissions: ["Policy.Read.All"],
  requiredLicense: ["entra_id_p1"],
  expectedChange: "Admin MFA gap is reviewed.",
  blastRadius: "No tenant enforcement occurs outside the mock executor.",
  manualFallback: "Create a manual checklist item and attach evidence.",
  evidenceRequired: true,
  status: "proposed",
  sourceReferences: []
});

const passedPreflight = () => ({
  status: "passed" as const,
  checks: [
    {
      code: "approval_model_present",
      status: "passed" as const,
      message: "Approval model is available."
    }
  ],
  diff: {
    summary: "Report-only policy draft would be created.",
    changes: [
      {
        field: "conditionalAccessPolicy.state",
        before: "absent",
        after: "enabledForReportingButNotEnforced"
      }
    ]
  },
  requiredPermissions: ["Policy.ReadWrite.ConditionalAccess"],
  requiredLicense: ["entra_id_p1"],
  canRequestApproval: true
});

const preSnapshot = () => ({
  evidenceArtifactId: "evidence_pre_state",
  sourceType: "action_pre_state" as const,
  contentHashSha256: "a".repeat(64),
  capturedAt: "2026-05-02T09:59:00.000Z",
  capturedBy: "operator_1",
  providerConnectionId: "provider_connection_worker_exec",
  resourceRefs: ["conditional_access_policies"]
});

const countingExecutor = (executor: ProviderActionExecutor, onApply: () => void): ProviderActionExecutor => ({
  ...executor,
  applyAction: async (input) => {
    onApply();
    return executor.applyAction(input);
  }
});

const deterministicIds = (prefix: string) => {
  let next = 0;
  return () => `${prefix}_${(next += 1).toString().padStart(3, "0")}`;
};

interface FakeAuditRecord {
  actorUserId?: string | null;
  organizationId?: string | null;
  targetType: string;
  targetId?: string | null;
  action: string;
  afterJson?: unknown;
}

const createFakeAuditSink = () => {
  const records: FakeAuditRecord[] = [];
  return {
    records,
    findByAction: (action: string) => records.filter((record) => record.action === action)
  };
};
