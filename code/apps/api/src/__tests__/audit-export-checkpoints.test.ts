import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
        guarantees: { databaseRowsAreWorm: boolean; externalCheckpoint: string };
      };
    };

    expect(exportBody.segment.recordCount).toBeGreaterThanOrEqual(2);
    expect(exportBody.segment.verification.valid).toBe(true);
    expect(exportBody.segment.guarantees).toMatchObject({
      databaseRowsAreWorm: false,
      externalCheckpoint: "not_configured"
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
        guarantees: { databaseRowsAreWorm: boolean; legalCertification: boolean };
      };
      verification: { valid: boolean };
    }>(checkpointResponse);

    expect(checkpointBody.checkpoint).toMatchObject({
      organizationId: organization.id,
      terminalHash: exportBody.segment.terminalHash,
      verificationStatus: "valid",
      externalCheckpointStatus: "not_configured",
      guarantees: {
        databaseRowsAreWorm: false,
        legalCertification: false
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
