import { describe, expect, it } from "vitest";

import {
  InMemoryRemediationActionRepository,
  RemediationActionLifecycle,
  type ActionTemplate,
  type RecommendationContract
} from "../index";

describe("remediation action lifecycle", () => {
  it("requires preflight, explicit approval, and a pre-state snapshot before queueing", async () => {
    const lifecycle = createLifecycle();
    const template = await lifecycle.createTemplate(safeTemplate());
    const run = await lifecycle.createActionRun({
      organizationId: "org_actions",
      providerConnectionId: "provider_connection_1",
      actorUserId: "operator_1",
      recommendation: recommendation(),
      template
    });

    await expect(
      lifecycle.queue({
        organizationId: "org_actions",
        actionRunId: run.id,
        actorUserId: "operator_1",
        providerConnectionWriteEnabled: true
      })
    ).rejects.toMatchObject({
      code: "invalid_action_state"
    });

    await lifecycle.recordPreflight({
      organizationId: "org_actions",
      actionRunId: run.id,
      actorUserId: "operator_1",
      result: passedPreflight()
    });

    await expect(
      lifecycle.queue({
        organizationId: "org_actions",
        actionRunId: run.id,
        actorUserId: "operator_1",
        providerConnectionWriteEnabled: true
      })
    ).rejects.toMatchObject({
      code: "invalid_action_state"
    });

    await lifecycle.requestApproval({
      organizationId: "org_actions",
      actionRunId: run.id,
      actorUserId: "operator_1"
    });
    await lifecycle.approve({
      organizationId: "org_actions",
      actionRunId: run.id,
      actorUserId: "approver_1"
    });

    await expect(
      lifecycle.queue({
        organizationId: "org_actions",
        actionRunId: run.id,
        actorUserId: "operator_1",
        providerConnectionWriteEnabled: true
      })
    ).rejects.toMatchObject({
      code: "invalid_action_state"
    });

    await lifecycle.attachSnapshot({
      organizationId: "org_actions",
      actionRunId: run.id,
      snapshot: preSnapshot()
    });
    const queued = await lifecycle.queue({
      organizationId: "org_actions",
      actionRunId: run.id,
      actorUserId: "operator_1",
      providerConnectionWriteEnabled: true
    });

    expect(queued.run.status).toBe("queued");
    expect(queued.job.safetyGates).toEqual({
      preflightPassed: true,
      approvalGranted: true,
      preStateSnapshotSaved: true,
      providerWriteEnabledChecked: false
    });
  });

  it("creates manual or guided checklist and evidence tasks without queueing provider writes", async () => {
    const lifecycle = createLifecycle();
    const template = await lifecycle.createTemplate({
      ...safeTemplate(),
      actionKey: "manual_guest_review",
      automationMode: "guided",
      actionType: "guided",
      title: "Review guest user access"
    });
    const run = await lifecycle.createActionRun({
      organizationId: "org_actions",
      providerConnectionId: "provider_connection_1",
      recommendation: {
        ...recommendation(),
        id: "recommendation_guided",
        recommendationType: "guided",
        automationMode: "guided"
      },
      template
    });
    const tasks = lifecycle.createManualGuidedTasks({
      run,
      ownerUserId: "operator_1"
    });

    expect(tasks.checklistTasks).toEqual([
      expect.objectContaining({
        actionRunId: run.id,
        status: "task_generated",
        evidenceRequired: true
      })
    ]);
    expect(tasks.evidenceTasks).toEqual([
      expect.objectContaining({
        actionRunId: run.id,
        sourceType: "checklist_completion",
        required: true
      })
    ]);
  });

  it("creates action runs idempotently per organization when a key is provided", async () => {
    const repository = new InMemoryRemediationActionRepository();
    const lifecycle = createLifecycle(repository);
    const template = await lifecycle.createTemplate(safeTemplate());
    const input = {
      organizationId: "org_actions",
      idempotencyKey: "retry-key:action-1",
      providerConnectionId: "provider_connection_1",
      recommendation: recommendation(),
      template
    };

    const first = await lifecycle.createActionRun(input);
    const retried = await lifecycle.createActionRun({
      ...input,
      recommendation: {
        ...input.recommendation,
        id: "recommendation_retry_payload"
      }
    });
    const otherOrganization = await lifecycle.createActionRun({
      ...input,
      organizationId: "org_other",
      recommendation: {
        ...recommendation(),
        organizationId: "org_other",
        id: "recommendation_other_org"
      },
      template: {
        ...template,
        organizationId: "org_other"
      }
    });
    const noKeyFirst = await lifecycle.createActionRun({
      organizationId: "org_actions",
      providerConnectionId: "provider_connection_1",
      recommendation: {
        ...recommendation(),
        id: "recommendation_no_key_1"
      },
      template
    });
    const noKeySecond = await lifecycle.createActionRun({
      organizationId: "org_actions",
      providerConnectionId: "provider_connection_1",
      recommendation: {
        ...recommendation(),
        id: "recommendation_no_key_2"
      },
      template
    });

    expect(retried.id).toBe(first.id);
    expect(retried.recommendationId).toBe("recommendation_1");
    expect(otherOrganization.id).not.toBe(first.id);
    expect(noKeySecond.id).not.toBe(noKeyFirst.id);
    expect(repository.runs.size).toBe(4);
  });

  it("rejects malformed action-run idempotency keys", async () => {
    const lifecycle = createLifecycle();
    const template = await lifecycle.createTemplate(safeTemplate());

    for (const idempotencyKey of [" ", "bad key with spaces", "x".repeat(129)]) {
      await expect(
        lifecycle.createActionRun({
          organizationId: "org_actions",
          idempotencyKey,
          providerConnectionId: "provider_connection_1",
          recommendation: recommendation(),
          template
        })
      ).rejects.toMatchObject({
        code: "invalid_idempotency_key"
      });
    }
  });

  it("links recommendation, control, provider connection, snapshots, verification, and evidence before close", async () => {
    const lifecycle = createLifecycle();
    const template = await lifecycle.createTemplate(safeTemplate());
    const run = await lifecycle.createActionRun({
      organizationId: "org_actions",
      providerConnectionId: "provider_connection_1",
      recommendation: recommendation(),
      template
    });

    await lifecycle.recordPreflight({
      organizationId: "org_actions",
      actionRunId: run.id,
      result: passedPreflight()
    });
    await lifecycle.requestApproval({
      organizationId: "org_actions",
      actionRunId: run.id,
      actorUserId: "operator_1"
    });
    await lifecycle.approve({
      organizationId: "org_actions",
      actionRunId: run.id,
      actorUserId: "approver_1"
    });
    await lifecycle.attachSnapshot({
      organizationId: "org_actions",
      actionRunId: run.id,
      snapshot: preSnapshot()
    });
    await lifecycle.attachSnapshot({
      organizationId: "org_actions",
      actionRunId: run.id,
      snapshot: {
        ...preSnapshot(),
        sourceType: "action_post_state",
        evidenceArtifactId: "evidence_post_state"
      }
    });
    const verified = await lifecycle.recordVerification({
      organizationId: "org_actions",
      actionRunId: run.id,
      actorUserId: "operator_1",
      result: {
        status: "passed",
        checks: [
          {
            code: "expected_change_seen",
            status: "passed",
            message: "Expected state is present.",
            evidenceArtifactIds: ["evidence_post_state"]
          }
        ],
        evidenceArtifactIds: ["evidence_verification"]
      }
    });
    const closed = await lifecycle.close({
      organizationId: "org_actions",
      actionRunId: run.id,
      actorUserId: "operator_1"
    });

    expect(verified).toMatchObject({
      recommendationId: "recommendation_1",
      controlId: "nis2.access-control.mfa",
      providerConnectionId: "provider_connection_1",
      verificationStatus: "passed"
    });
    expect(verified.evidenceArtifactIds).toEqual([
      "evidence_pre_state",
      "evidence_post_state",
      "evidence_verification"
    ]);
    expect(closed.status).toBe("closed");
  });

  it("rejects snapshots from a different provider connection", async () => {
    const lifecycle = createLifecycle();
    const template = await lifecycle.createTemplate(safeTemplate());
    const run = await lifecycle.createActionRun({
      organizationId: "org_actions",
      providerConnectionId: "provider_connection_1",
      recommendation: recommendation(),
      template
    });

    await expect(
      lifecycle.attachSnapshot({
        organizationId: "org_actions",
        actionRunId: run.id,
        snapshot: {
          ...preSnapshot(),
          providerConnectionId: "provider_connection_other"
        }
      })
    ).rejects.toMatchObject({
      code: "snapshot_provider_connection_mismatch"
    });
  });

  it("rejects high-risk V1-forbidden executable defaults", async () => {
    await expect(
      createLifecycle().createTemplate({
        ...safeTemplate(),
        actionKey: "disable_user",
        automationMode: "executable_later",
        enabledByDefault: true,
        highRiskForbiddenInV1: true
      })
    ).rejects.toMatchObject({
      code: "invalid_action_template"
    });
  });

  it("rejects cross-organization action access", async () => {
    const repository = new InMemoryRemediationActionRepository();
    const lifecycle = createLifecycle(repository);
    const template = await lifecycle.createTemplate(safeTemplate());
    const run = await lifecycle.createActionRun({
      organizationId: "org_actions",
      providerConnectionId: "provider_connection_1",
      recommendation: recommendation(),
      template
    });

    await expect(
      lifecycle.recordPreflight({
        organizationId: "org_other",
        actionRunId: run.id,
        result: passedPreflight()
      })
    ).rejects.toMatchObject({
      code: "action_not_found"
    });
  });
});

const createLifecycle = (repository = new InMemoryRemediationActionRepository()) =>
  new RemediationActionLifecycle({
    repository,
    now: () => new Date("2026-04-30T12:00:00.000Z"),
    idFactory: randomIdFactory()
  });

const randomIdFactory = () => {
  let index = 0;
  return () => {
    index += 1;
    return `action_id_${index}`;
  };
};

const safeTemplate = (): Omit<ActionTemplate, "id" | "createdAt" | "updatedAt"> => ({
  organizationId: "org_actions",
  providerKey: "mock",
  moduleKey: "identity",
  actionKey: "ca_report_only_legacy_auth_block",
  actionType: "technical",
  automationMode: "preflightable",
  title: "Prepare report-only legacy authentication block",
  riskLevel: "medium",
  licenseRequired: ["entra_id_p1"],
  permissionsRequired: ["Policy.ReadWrite.ConditionalAccess"],
  preconditions: {
    reportOnly: true
  },
  expectedChange: "A report-only policy draft is prepared for review.",
  blastRadius: "No tenant enforcement occurs in M9.",
  rollbackStrategy: "Discard the draft policy.",
  manualFallback: "Document the manual Conditional Access review and attach approval evidence.",
  evidenceRequired: true,
  enabledByDefault: false,
  highRiskForbiddenInV1: false,
  sourceReferences: []
});

const recommendation = (): RecommendationContract => ({
  id: "recommendation_1",
  organizationId: "org_actions",
  sourceFindingId: "finding_1",
  sourceFindingIds: ["finding_1"],
  manualTaskIds: [],
  controlId: "nis2.access-control.mfa",
  jurisdiction: "EU",
  title: "Review admin MFA coverage",
  summary: "Admin MFA coverage is incomplete.",
  severity: "high",
  confidence: "high",
  recommendationType: "technical",
  automationMode: "preflightable",
  requiredPermissions: ["Policy.Read.All"],
  requiredLicense: ["entra_id_p1"],
  expectedChange: "Admin MFA gap is reviewed.",
  blastRadius: "No tenant enforcement occurs in M9.",
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
  capturedAt: "2026-04-30T12:00:00.000Z",
  capturedBy: "operator_1",
  providerConnectionId: "provider_connection_1",
  resourceRefs: ["conditional_access_policies"]
});
