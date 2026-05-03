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
