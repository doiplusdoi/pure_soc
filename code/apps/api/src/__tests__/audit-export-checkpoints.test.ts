import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("audit export and checkpoint API", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-05-02T15:00:00.000Z")
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    if (!server.listening) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const postJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {})
      },
      body: JSON.stringify(body)
    });

  const registerAndLogin = async (email: string) => {
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: "Audit Export User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      loginBody: await readJson<{ user: { id: string } }>(loginResponse),
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  const createOrganization = async (cookie: string) => {
    const response = await postJson(
      "/organizations",
      {
        name: "Audit Export Org",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  const restartWithServices = async (nextServices: ReturnType<typeof createApiServices>) => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    services = nextServices;
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  };

  it("exports redacted organization audit segments and records database-only checkpoints", async () => {
    const owner = await registerAndLogin("audit-export-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);

    await services.auditWriter.write({
      organizationId: organization.id,
      actorUserId: owner.loginBody.user.id,
      targetType: "evidence",
      targetId: "artifact-1",
      action: "evidence_uploaded",
      afterJson: {
        status: "stored",
        accessToken: "must-not-leak",
        storageUri: "s3://internal/audit-export"
      }
    });

    const exportResponse = await fetch(`${baseUrl}/organizations/${organization.id}/audit/export`, {
      headers: { cookie: owner.cookie }
    });
    expect(exportResponse.status).toBe(200);
    const exportText = await exportResponse.text();
    const exportBody = JSON.parse(exportText) as {
      segment: {
        recordCount: number;
        terminalHash: string;
        verification: { valid: boolean; checkedRecords: number };
        guarantees: { databaseRowsAreWorm: boolean; externalCheckpoint: string; externalNotarization: boolean };
        retentionPolicy: { policyKey: string; auditLogRetentionDays: number };
        externalCheckpointProviderStatus: { providerKey: string; configured: boolean; liveExternalService: boolean };
        handoff: {
          status: string;
          artifact: {
            status: string;
            storagePointerReturnedToClient: boolean;
            publicUrlReturnedToClient: boolean;
          };
          externalAnchor: { providerKey: string; status: string; failureCode: string | null };
        };
      };
    };

    expect(exportBody.segment.recordCount).toBeGreaterThanOrEqual(2);
    expect(exportBody.segment.verification.valid).toBe(true);
    expect(exportBody.segment.guarantees).toMatchObject({
      databaseRowsAreWorm: false,
      externalCheckpoint: "not_configured",
      externalNotarization: false
    });
    expect(exportBody.segment.retentionPolicy).toMatchObject({
      policyKey: "puresoc-audit-database-only-7y",
      auditLogRetentionDays: 2555
    });
    expect(exportBody.segment.externalCheckpointProviderStatus).toMatchObject({
      providerKey: "none",
      configured: false,
      liveExternalService: false
    });
    expect(exportBody.segment.handoff).toMatchObject({
      status: "database_only",
      artifact: {
        status: "not_written",
        storagePointerReturnedToClient: false,
        publicUrlReturnedToClient: false
      },
      externalAnchor: {
        providerKey: "none",
        status: "not_configured",
        failureCode: null
      }
    });
    expect(exportText).not.toContain("must-not-leak");
    expect(exportText).not.toContain("s3://internal/audit-export");

    const checkpointResponse = await postJson(
      `/organizations/${organization.id}/audit/checkpoints`,
      {
        expectedTerminalHash: exportBody.segment.terminalHash
      },
      owner.cookie
    );
    expect(checkpointResponse.status).toBe(201);
    const checkpointBody = await readJson<{
      checkpoint: {
        organizationId: string;
        recordCount: number;
        terminalHash: string;
        verificationStatus: string;
        externalCheckpointStatus: string;
        externalCheckpointProvider: string;
        externalCheckpointRecordedAt: string | null;
        retentionPolicy: { policyKey: string };
        guarantees: { databaseRowsAreWorm: boolean; externalNotarization: boolean; legalCertification: boolean };
        handoff: {
          status: string;
          checkpointId: string;
          externalAnchor: { status: string; providerKey: string };
          artifact: { storagePointerReturnedToClient: boolean; publicUrlReturnedToClient: boolean };
        };
      };
      verification: { valid: boolean };
    }>(checkpointResponse);

    expect(checkpointBody.checkpoint).toMatchObject({
      organizationId: organization.id,
      terminalHash: exportBody.segment.terminalHash,
      verificationStatus: "valid",
      externalCheckpointStatus: "not_configured",
      externalCheckpointProvider: "none",
      externalCheckpointRecordedAt: null,
      retentionPolicy: {
        policyKey: "puresoc-audit-database-only-7y"
      },
      guarantees: {
        databaseRowsAreWorm: false,
        externalNotarization: false,
        legalCertification: false
      },
      handoff: {
        status: "database_only",
        externalAnchor: {
          status: "not_configured",
          providerKey: "none"
        },
        artifact: {
          storagePointerReturnedToClient: false,
          publicUrlReturnedToClient: false
        }
      }
    });
    expect(checkpointBody.verification.valid).toBe(true);
    expect(services.auditSink.findByAction("audit_checkpoint_recorded")).toHaveLength(1);

    const listResponse = await fetch(`${baseUrl}/organizations/${organization.id}/audit/checkpoints`, {
      headers: { cookie: owner.cookie }
    });
    expect(listResponse.status).toBe(200);
    await expect(readJson<{ checkpoints: unknown[] }>(listResponse)).resolves.toMatchObject({
      checkpoints: [expect.objectContaining({ terminalHash: exportBody.segment.terminalHash })]
    });
  });

  it("records fake external anchor and retention metadata through the API when explicitly configured", async () => {
    await restartWithServices(
      createApiServices({
        now: () => new Date("2026-05-02T16:00:00.000Z"),
        config: loadConfig({
          env: {
            PURESOC_AUDIT_RETENTION_POLICY_KEY: "audit-test-api-90d",
            PURESOC_AUDIT_LOG_RETENTION_DAYS: "90",
            PURESOC_AUDIT_CHECKPOINT_RETENTION_DAYS: "90",
            PURESOC_AUDIT_EXPORT_RETENTION_DAYS: "30",
            PURESOC_AUDIT_CHECKPOINT_CADENCE_DAYS: "7",
            PURESOC_AUDIT_EXTERNAL_CHECKPOINT_PROVIDER: "fake-local"
          }
        })
      })
    );
    const owner = await registerAndLogin("audit-export-fake-anchor@example.test");
    const { organization } = await createOrganization(owner.cookie);

    await services.auditWriter.write({
      organizationId: organization.id,
      actorUserId: owner.loginBody.user.id,
      targetType: "audit",
      targetId: "checkpoint",
      action: "fake_anchor_test",
      afterJson: {
        status: "ready",
        refreshToken: "must-not-leak"
      }
    });

    const exportResponse = await fetch(`${baseUrl}/organizations/${organization.id}/audit/export`, {
      headers: { cookie: owner.cookie }
    });
    expect(exportResponse.status).toBe(200);
    const exportBody = await readJson<{
      segment: {
        terminalHash: string;
        retentionPolicy: { policyKey: string; checkpointCadenceDays: number };
        externalCheckpointProviderStatus: { providerKey: string; configured: boolean; liveExternalService: boolean };
        handoff: { status: string; artifact: { status: string } };
      };
    }>(exportResponse);
    expect(exportBody.segment.retentionPolicy).toMatchObject({
      policyKey: "audit-test-api-90d",
      checkpointCadenceDays: 7
    });
    expect(exportBody.segment.externalCheckpointProviderStatus).toMatchObject({
      providerKey: "fake-local",
      configured: true,
      liveExternalService: false
    });
    expect(exportBody.segment.handoff).toMatchObject({
      status: "worm_export_pending",
      artifact: {
        status: "operator_handoff_required"
      }
    });

    const checkpointResponse = await postJson(
      `/organizations/${organization.id}/audit/checkpoints`,
      {
        expectedTerminalHash: exportBody.segment.terminalHash
      },
      owner.cookie
    );
    expect(checkpointResponse.status).toBe(201);
    const checkpointText = await checkpointResponse.text();
    const checkpointBody = JSON.parse(checkpointText) as {
      checkpoint: {
        externalCheckpointStatus: string;
        externalCheckpointProvider: string;
        externalCheckpointReference: string;
        externalCheckpointRecordedAt: string;
        externalCheckpointPayloadHash: string;
        externalCheckpointMetadata: { testOnly: boolean; liveExternalService: boolean };
        retentionPolicy: { policyKey: string; auditLogRetentionDays: number };
        guarantees: { externalCheckpoint: string; externalNotarization: boolean; legalCertification: boolean };
        handoff: {
          status: string;
          externalAnchor: { status: string; providerKey: string; reference: string; failureCode: string | null };
          artifact: { storagePointerReturnedToClient: boolean; publicUrlReturnedToClient: boolean };
        };
      };
    };

    expect(checkpointBody.checkpoint).toMatchObject({
      externalCheckpointStatus: "fake_anchor_recorded",
      externalCheckpointProvider: "fake-local",
      externalCheckpointReference: expect.stringMatching(/^fake-audit-anchor:[a-f0-9]{16}$/),
      externalCheckpointRecordedAt: "2026-05-02T16:00:00.000Z",
      externalCheckpointPayloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      retentionPolicy: {
        policyKey: "audit-test-api-90d",
        auditLogRetentionDays: 90
      },
      guarantees: {
        externalCheckpoint: "fake_test_anchor_only",
        externalNotarization: false,
        legalCertification: false
      },
      handoff: {
        status: "database_only",
        externalAnchor: {
          status: "fake_anchor_recorded",
          providerKey: "fake-local",
          reference: expect.stringMatching(/^fake-audit-anchor:[a-f0-9]{16}$/),
          failureCode: null
        },
        artifact: {
          storagePointerReturnedToClient: false,
          publicUrlReturnedToClient: false
        }
      }
    });
    expect(checkpointBody.checkpoint.externalCheckpointMetadata).toMatchObject({
      testOnly: true,
      liveExternalService: false
    });
    expect(checkpointText).not.toContain("must-not-leak");
  });

  it("rejects cross-organization audit export access", async () => {
    const owner = await registerAndLogin("audit-export-owner-2@example.test");
    const outsider = await registerAndLogin("audit-export-outsider@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await fetch(`${baseUrl}/organizations/${organization.id}/audit/export`, {
      headers: { cookie: outsider.cookie }
    });

    expect(response.status).toBe(403);
  });
});
