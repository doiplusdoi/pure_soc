import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { RecommendationContract } from "@puresoc/recommendations";

import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("api remediation action safety foundation", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-04-30T12:30:00.000Z")
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const postJson = (path: string, body: unknown, cookie?: string, headers: Record<string, string> = {}) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...headers
      },
      body: JSON.stringify(body)
    });

  const registerAndLogin = async (email: string) => {
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: "Action User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  const createOrganization = async (cookie: string) => {
    const response = await postJson(
      "/organizations",
      {
        name: "Action Org",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  it("audits preflight, approval, queued, failed, verified, and closed states", async () => {
    const organizationId = "org_action_audit";
    const connection = await services.providerConnections.store.createConnection({
      id: "provider_connection_action",
      organizationId,
      providerKey: "mock",
      displayName: "Mock write-enabled connection",
      writeEnabled: true
    });
    const template = await services.actions.createTemplate(actionTemplateInput(organizationId));
    const run = await services.actions.createActionRun({
      organizationId,
      providerConnectionId: connection.id,
      actorUserId: "operator_1",
      recommendation: recommendation(organizationId),
      template
    });

    await services.actions.recordPreflight({
      organizationId,
      actionRunId: run.id,
      actorUserId: "operator_1",
      result: {
        status: "passed",
        checks: [
          {
            code: "approval_model_present",
            status: "passed",
            message: "Approval model is available."
          }
        ],
        requiredPermissions: ["Policy.ReadWrite.ConditionalAccess"],
        requiredLicense: ["entra_id_p1"],
        canRequestApproval: true
      },
      context: {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      }
    });
    await services.actions.requestApproval({
      organizationId,
      actionRunId: run.id,
      actorUserId: "operator_1"
    });
    await services.actions.approve({
      organizationId,
      actionRunId: run.id,
      actorUserId: "approver_1"
    });
    await services.actions.attachSnapshot({
      organizationId,
      actionRunId: run.id,
      snapshot: snapshot("action_pre_state", "evidence_pre")
    });
    const queued = await services.actions.queue({
      organizationId,
      actionRunId: run.id,
      actorUserId: "operator_1",
      providerConnectionWriteEnabled: true
    });
    await services.actions.attachSnapshot({
      organizationId,
      actionRunId: run.id,
      snapshot: snapshot("action_post_state", "evidence_post")
    });
    await services.actions.recordVerification({
      organizationId,
      actionRunId: run.id,
      actorUserId: "operator_1",
      result: {
        status: "passed",
        checks: [],
        evidenceArtifactIds: ["evidence_verify"]
      }
    });
    await services.actions.close({
      organizationId,
      actionRunId: run.id,
      actorUserId: "operator_1"
    });

    const failedRun = await services.actions.createActionRun({
      organizationId,
      providerConnectionId: connection.id,
      recommendation: {
        ...recommendation(organizationId),
        id: "recommendation_failed"
      },
      template
    });
    await services.actions.fail({
      organizationId,
      actionRunId: failedRun.id,
      actorUserId: "operator_1",
      reason: "Provider precondition changed before execution."
    });

    expect(queued.job).toMatchObject({
      jobName: "actions.execute",
      actionRunId: run.id,
      safetyGates: {
        preflightPassed: true,
        approvalGranted: true,
        preStateSnapshotSaved: true
      }
    });
    for (const action of [
      "action_preflight",
      "action_approval_requested",
      "action_approved",
      "action_queued",
      "action_verified",
      "action_closed",
      "action_failed"
    ]) {
      expect(services.auditSink.findByAction(action), `${action} audit record`).toHaveLength(1);
    }
    expect(services.auditSink.findByAction("action_failed")[0]?.afterJson).toMatchObject({
      failureReason: "Provider precondition changed before execution."
    });
  });

  it("rejects cross-organization action access before preflight mutation", async () => {
    const owner = await registerAndLogin("m9-owner@example.test");
    const other = await registerAndLogin("m9-other@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const template = await services.actions.createTemplate(actionTemplateInput(organization.id));
    const run = await services.actions.createActionRun({
      organizationId: organization.id,
      providerConnectionId: "provider_connection_action",
      recommendation: recommendation(organization.id),
      template
    });

    const response = await postJson(
      `/organizations/${organization.id}/actions/runs/${run.id}/preflight`,
      {
        status: "passed",
        checks: [],
        requiredPermissions: [],
        requiredLicense: [],
        canRequestApproval: true
      },
      other.cookie
    );

    expect(response.status).toBe(403);
    expect(services.auditSink.findByAction("action_preflight")).toHaveLength(0);
  });

  it("creates action runs idempotently per organization without returning the raw key", async () => {
    const owner = await registerAndLogin("m55-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const secondOrgResponse = await postJson(
      "/organizations",
      {
        name: "Second Action Org",
        primaryCountryCode: "RO"
      },
      owner.cookie
    );
    expect(secondOrgResponse.status).toBe(201);
    const { organization: secondOrganization } = await readJson<{ organization: { id: string } }>(secondOrgResponse);

    const connection = await services.providerConnections.store.createConnection({
      id: "provider_connection_action_idempotent",
      organizationId: organization.id,
      providerKey: "mock",
      displayName: "Mock action connection",
      writeEnabled: false
    });
    const secondConnection = await services.providerConnections.store.createConnection({
      id: "provider_connection_action_idempotent_other",
      organizationId: secondOrganization.id,
      providerKey: "mock",
      displayName: "Second mock action connection",
      writeEnabled: false
    });
    const keyHeader = {
      "Idempotency-Key": "action-retry:review-mfa"
    };

    const firstResponse = await postJson(
      `/organizations/${organization.id}/actions/runs`,
      actionRunRequestBody(organization.id, connection.id),
      owner.cookie,
      keyHeader
    );
    expect(firstResponse.status).toBe(201);
    const first = await readJson<{
      actionRun: {
        id: string;
        recommendationId: string;
        idempotencyKey?: string;
        idempotencyKeyPresent?: boolean;
      };
    }>(firstResponse);

    const retriedResponse = await postJson(
      `/organizations/${organization.id}/actions/runs`,
      {
        ...actionRunRequestBody(organization.id, connection.id),
        recommendation: {
          ...recommendation(organization.id),
          id: "recommendation_retry_payload"
        }
      },
      owner.cookie,
      keyHeader
    );
    expect(retriedResponse.status).toBe(201);
    const retried = await readJson<{
      actionRun: {
        id: string;
        recommendationId: string;
        idempotencyKey?: string;
        idempotencyKeyPresent?: boolean;
      };
    }>(retriedResponse);

    const secondOrgResponseWithSameKey = await postJson(
      `/organizations/${secondOrganization.id}/actions/runs`,
      actionRunRequestBody(secondOrganization.id, secondConnection.id),
      owner.cookie,
      keyHeader
    );
    expect(secondOrgResponseWithSameKey.status).toBe(201);
    const secondOrgRun = await readJson<{ actionRun: { id: string } }>(secondOrgResponseWithSameKey);

    const noKeyFirstResponse = await postJson(
      `/organizations/${organization.id}/actions/runs`,
      actionRunRequestBody(organization.id, connection.id, "recommendation_no_key_1"),
      owner.cookie
    );
    const noKeySecondResponse = await postJson(
      `/organizations/${organization.id}/actions/runs`,
      actionRunRequestBody(organization.id, connection.id, "recommendation_no_key_2"),
      owner.cookie
    );
    const noKeyFirst = await readJson<{ actionRun: { id: string } }>(noKeyFirstResponse);
    const noKeySecond = await readJson<{ actionRun: { id: string } }>(noKeySecondResponse);
    const listed = await services.actionsRepository.listActionRuns(organization.id);

    expect(retried.actionRun.id).toBe(first.actionRun.id);
    expect(retried.actionRun.recommendationId).toBe("recommendation_1");
    expect(first.actionRun.idempotencyKey).toBeUndefined();
    expect(first.actionRun.idempotencyKeyPresent).toBe(true);
    expect(secondOrgRun.actionRun.id).not.toBe(first.actionRun.id);
    expect(noKeySecond.actionRun.id).not.toBe(noKeyFirst.actionRun.id);
    expect(listed).toHaveLength(3);
    expect(services.auditSink.findByAction("action_queued")).toHaveLength(0);
  });

  it("exposes v1 provider action safety routes without enabling provider writes", async () => {
    const owner = await registerAndLogin("v1-action-owner@example.test");
    const other = await registerAndLogin("v1-action-other@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const connection = await services.providerConnections.store.createConnection({
      id: "provider_connection_v1_action",
      organizationId: organization.id,
      providerKey: "mock",
      displayName: "Mock v1 action connection",
      status: "connected",
      writeEnabled: false
    });
    const requestInput = actionRunRequestBody(organization.id, connection.id);
    const actionTemplate = {
      ...requestInput.actionTemplate,
      id: `template_v1_${organization.id}`,
      automationMode: "executable_later" as const
    };
    const recommendationInput = {
      ...requestInput.recommendation,
      id: "recommendation_v1_provider_action",
      automationMode: "executable_later" as const
    };

    const firstResponse = await postJson(
      `/api/v1/organizations/${organization.id}/provider-actions/${actionTemplate.id}/preflight`,
      {
        ...requestInput,
        actionTemplate,
        recommendation: recommendationInput
      },
      owner.cookie,
      {
        "Idempotency-Key": "v1-provider-action:legacy-auth-report",
        "x-request-id": "req_v1_provider_action_preflight",
        "x-correlation-id": "corr_v1_provider_action"
      }
    );
    expect(firstResponse.status).toBe(201);
    const first = await readJson<{
      actionRun: {
        id: string;
        recommendationId: string;
        idempotencyKey?: string;
        idempotencyKeyPresent?: true;
        status: string;
        preflightStatus: string;
        approval: { status: string };
      };
      preflight: {
        status: string;
        canRequestApproval: boolean;
        checks: Array<{ code: string; status: string; message: string }>;
      };
    }>(firstResponse);

    const retriedResponse = await postJson(
      `/api/v1/organizations/${organization.id}/provider-actions/${actionTemplate.id}/preflight`,
      {
        ...requestInput,
        actionTemplate,
        recommendation: {
          ...recommendationInput,
          id: "recommendation_v1_provider_action_retry_payload"
        }
      },
      owner.cookie,
      {
        "Idempotency-Key": "v1-provider-action:legacy-auth-report"
      }
    );
    expect(retriedResponse.status).toBe(201);
    const retried = await readJson<{
      actionRun: {
        id: string;
        recommendationId: string;
        idempotencyKey?: string;
        idempotencyKeyPresent?: true;
      };
    }>(retriedResponse);

    const deniedResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/provider-actions/${first.actionRun.id}`,
      {
        headers: {
          cookie: other.cookie,
          "x-request-id": "req_v1_provider_action_denied",
          "x-correlation-id": "corr_v1_provider_action"
        }
      }
    );
    expect(deniedResponse.status).toBe(403);
    const denied = await readJson<{
      error: { code: string; requestId: string; correlationId: string };
    }>(deniedResponse);

    const approveResponse = await postJson(
      `/api/v1/organizations/${organization.id}/provider-actions/${first.actionRun.id}/approve`,
      {},
      owner.cookie
    );
    expect(approveResponse.status).toBe(200);
    const approved = await readJson<{ actionRun: { approval: { status: string }; status: string } }>(approveResponse);

    const executeResponse = await postJson(
      `/api/v1/organizations/${organization.id}/provider-actions/${first.actionRun.id}/execute`,
      {},
      owner.cookie,
      {
        "x-request-id": "req_v1_provider_action_execute",
        "x-correlation-id": "corr_v1_provider_action"
      }
    );
    expect(executeResponse.status).toBe(409);
    const blocked = await readJson<{
      error: {
        code: string;
        requestId: string;
        correlationId: string;
        details: { actionRunId: string; requiredGates: string[] };
      };
    }>(executeResponse);

    expect(first.actionRun.idempotencyKey).toBeUndefined();
    expect(first.actionRun.idempotencyKeyPresent).toBe(true);
    expect(first.actionRun.status).toBe("preflight_passed");
    expect(first.actionRun.preflightStatus).toBe("passed");
    expect(first.preflight).toMatchObject({
      status: "passed",
      canRequestApproval: true
    });
    expect(first.preflight.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "provider_connection_available", status: "passed" }),
        expect.objectContaining({ code: "provider_action_write_policy", status: "warning" }),
        expect.objectContaining({ code: "high_risk_v1_policy", status: "passed" })
      ])
    );
    expect(retried.actionRun.id).toBe(first.actionRun.id);
    expect(retried.actionRun.recommendationId).toBe("recommendation_v1_provider_action");
    expect(retried.actionRun.idempotencyKey).toBeUndefined();
    expect(retried.actionRun.idempotencyKeyPresent).toBe(true);
    expect(denied.error).toMatchObject({
      code: "forbidden",
      requestId: "req_v1_provider_action_denied",
      correlationId: "corr_v1_provider_action"
    });
    expect(approved.actionRun).toMatchObject({
      status: "approved",
      approval: {
        status: "approved"
      }
    });
    expect(blocked.error).toMatchObject({
      code: "provider_action_execution_blocked",
      requestId: "req_v1_provider_action_execute",
      correlationId: "corr_v1_provider_action",
      details: {
        actionRunId: first.actionRun.id,
        requiredGates: expect.arrayContaining([
          "approval_policy",
          "recent_auth",
          "verification",
          "evidence",
          "audit",
          "disposable_tenant_proof"
        ])
      }
    });
    expect(services.auditSink.findByAction("action_preflight")).toHaveLength(1);
    expect(services.auditSink.findByAction("action_approved")).toHaveLength(1);
    expect(services.auditSink.findByAction("action_queued")).toHaveLength(0);
  });

  it("executes zero-blast v1 provider actions as local product artifacts only", async () => {
    const owner = await registerAndLogin("v1-zero-blast-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const connection = await services.providerConnections.store.createConnection({
      id: "provider_connection_v1_zero_blast",
      organizationId: organization.id,
      providerKey: "microsoft365",
      displayName: "Microsoft 365 zero-blast connection",
      status: "connected",
      writeEnabled: false
    });
    const requestInput = actionRunRequestBody(organization.id, connection.id);
    const actionTemplate = {
      ...requestInput.actionTemplate,
      id: `template_zero_blast_${organization.id}`,
      providerKey: "microsoft365",
      actionKey: "m365_zero_blast_review_packet",
      title: "Create Microsoft 365 remediation review packet"
    };
    const recommendationInput = {
      ...requestInput.recommendation,
      id: "recommendation_zero_blast_m365",
      title: "Create Microsoft 365 remediation review packet"
    };

    const preflightResponse = await postJson(
      `/api/v1/organizations/${organization.id}/provider-actions/${actionTemplate.id}/preflight`,
      {
        ...requestInput,
        actionTemplate,
        recommendation: recommendationInput
      },
      owner.cookie,
      {
        "Idempotency-Key": "v1-provider-action:zero-blast"
      }
    );
    expect(preflightResponse.status).toBe(201);
    const preflight = await readJson<{ actionRun: { id: string; preflightStatus: string } }>(preflightResponse);

    const approveResponse = await postJson(
      `/api/v1/organizations/${organization.id}/provider-actions/${preflight.actionRun.id}/approve`,
      {},
      owner.cookie
    );
    expect(approveResponse.status).toBe(200);

    const executeResponse = await postJson(
      `/api/v1/organizations/${organization.id}/provider-actions/${preflight.actionRun.id}/execute`,
      {},
      owner.cookie,
      {
        "Idempotency-Key": "v1-provider-action:zero-blast-execute"
      }
    );
    expect(executeResponse.status).toBe(202);
    const executed = await readJson<{
      operationId: string;
      status: string;
      zeroBlast: {
        providerMutation: boolean;
        actionRunId: string;
        taskId: string;
        evidenceFileObjectId: string;
        reportSnapshotId: string;
        reportFileObjectId: string;
        resources: {
          task: { id: string; status: string; title: string };
          evidenceFileObject: { id: string; sourceResourceType: string; sourceResourceId: string; scanStatus: string };
          reportSnapshot: { id: string; templateKey: string; immutable: boolean; legalCaveat: string };
          reportFileObject: { id: string; purpose: string };
        };
      };
    }>(executeResponse);

    const retriedResponse = await postJson(
      `/api/v1/organizations/${organization.id}/provider-actions/${preflight.actionRun.id}/execute`,
      {},
      owner.cookie,
      {
        "Idempotency-Key": "v1-provider-action:zero-blast-execute"
      }
    );
    expect(retriedResponse.status).toBe(202);
    const retried = await readJson<{
      operationId: string;
      zeroBlast: {
        taskId: string;
        evidenceFileObjectId: string;
        reportSnapshotId: string;
        resources: null;
      };
    }>(retriedResponse);
    const tasks = await services.productV1.listTasks(organization.id);
    const fileObjects = await services.productV1.listFileObjects(organization.id);
    const reportSnapshots = await services.productV1.listReportSnapshots(organization.id);
    const internalEvents = await services.productV1.listInternalEvents(organization.id);

    expect(preflight.actionRun.preflightStatus).toBe("passed");
    expect(executed).toMatchObject({
      status: "succeeded",
      zeroBlast: {
        providerMutation: false,
        actionRunId: preflight.actionRun.id,
        resources: {
          task: {
            status: "TODO",
            title: "Review zero-blast action: Create Microsoft 365 remediation review packet"
          },
          evidenceFileObject: {
            sourceResourceType: "action_run",
            sourceResourceId: preflight.actionRun.id,
            scanStatus: "skipped"
          },
          reportSnapshot: {
            templateKey: "remediation_progress",
            immutable: true
          },
          reportFileObject: {
            purpose: "generated_report"
          }
        }
      }
    });
    expect(executed.zeroBlast.resources.reportSnapshot.legalCaveat).toContain("not a legal opinion");
    expect(retried.operationId).toBe(executed.operationId);
    expect(retried.zeroBlast.taskId).toBe(executed.zeroBlast.taskId);
    expect(retried.zeroBlast.evidenceFileObjectId).toBe(executed.zeroBlast.evidenceFileObjectId);
    expect(retried.zeroBlast.reportSnapshotId).toBe(executed.zeroBlast.reportSnapshotId);
    expect(retried.zeroBlast.resources).toBeNull();
    expect(tasks).toHaveLength(1);
    expect(fileObjects.map((fileObject) => fileObject.id).sort()).toEqual(
      [executed.zeroBlast.evidenceFileObjectId, executed.zeroBlast.reportFileObjectId].sort()
    );
    expect(reportSnapshots.map((snapshot) => snapshot.id)).toEqual([executed.zeroBlast.reportSnapshotId]);
    expect(internalEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "product_v1.provider_action.zero_blast_executed",
          aggregateType: "action_run",
          aggregateId: preflight.actionRun.id
        })
      ])
    );
    expect(services.auditSink.findByAction("product_v1.provider_action.zero_blast_executed")).toHaveLength(1);
    expect(services.auditSink.findByAction("action_queued")).toHaveLength(0);
  });

  it("rejects malformed action-run idempotency key headers", async () => {
    const owner = await registerAndLogin("m55-invalid-key@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const connection = await services.providerConnections.store.createConnection({
      id: "provider_connection_action_bad_key",
      organizationId: organization.id,
      providerKey: "mock",
      displayName: "Mock action connection",
      writeEnabled: false
    });

    for (const idempotencyKey of ["bad key", "x".repeat(129)]) {
      const response = await postJson(
        `/organizations/${organization.id}/actions/runs`,
        actionRunRequestBody(organization.id, connection.id),
        owner.cookie,
        {
          "Idempotency-Key": idempotencyKey
        }
      );
      const body = await readJson<{ error: { code: string } }>(response);

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("invalid_idempotency_key");
    }
  });
});

const actionTemplateInput = (organizationId: string) => ({
  id: `template_${organizationId}`,
  organizationId,
  providerKey: "mock",
  moduleKey: "identity",
  actionKey: "ca_report_only_legacy_auth_block",
  actionType: "technical" as const,
  automationMode: "preflightable" as const,
  title: "Prepare report-only legacy authentication block",
  riskLevel: "medium" as const,
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
  highRiskForbiddenInV1: false
});

const recommendation = (organizationId: string): RecommendationContract => ({
  id: "recommendation_1",
  organizationId,
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

const actionRunRequestBody = (
  organizationId: string,
  providerConnectionId: string,
  recommendationId = "recommendation_1"
) => ({
  providerConnectionId,
  actionTemplate: actionTemplateInput(organizationId),
  recommendation: {
    ...recommendation(organizationId),
    id: recommendationId
  }
});

const snapshot = (sourceType: "action_pre_state" | "action_post_state", evidenceArtifactId: string) => ({
  evidenceArtifactId,
  sourceType,
  contentHashSha256: "a".repeat(64),
  capturedAt: "2026-04-30T12:30:00.000Z",
  capturedBy: "operator_1",
  providerConnectionId: "provider_connection_action",
  resourceRefs: ["conditional_access_policies"]
});
