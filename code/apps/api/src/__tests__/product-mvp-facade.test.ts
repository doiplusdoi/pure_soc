import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

const waitForListening = async (server: Server): Promise<void> => {
  if (server.address()) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
};

describe("product MVP facade routes", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;

  beforeEach(async () => {
    const services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "false"
        }
      }),
      now: () => new Date("2026-06-24T09:00:00.000Z"),
      reportPdfRenderer: {
        renderPdf: (input) => {
          const body = Buffer.from(`%PDF-1.4\n${input.filename}\n%%EOF`, "utf8");
          return {
            format: "pdf",
            mimeType: "application/pdf",
            body,
            contentHashSha256: "pdf-hash-for-product-facade-test",
            renderer: "test-pdf-renderer",
            renderedAt: input.renderedAt ?? "2026-06-24T09:00:00.000Z"
          };
        }
      }
    });
    server = startApiServer(0, services);
    await waitForListening(server);
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

  const putJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {})
      },
      body: JSON.stringify(body)
    });

  const patchJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {})
      },
      body: JSON.stringify(body)
    });

  const registerLoginAndSelectWorkspace = async () => {
    const register = await postJson("/auth/register", {
      email: "mvp-owner@example.test",
      password,
      displayName: "MVP Owner"
    });
    expect(register.status).toBe(201);

    const login = await postJson("/auth/login", {
      email: "mvp-owner@example.test",
      password
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie") ?? "";

    const workspace = await postJson(
      "/api/workspaces",
      {
        name: "Asterion Tools",
        legalName: "Asterion Tools SRL",
        countryCode: "RO"
      },
      cookie
    );
    expect(workspace.status).toBe(201);
    const workspaceBody = await readJson<{ organization: { id: string } }>(workspace);

    const selected = await postJson(
      "/auth/session/active-organization",
      {
        organizationId: workspaceBody.organization.id
      },
      cookie
    );
    expect(selected.status).toBe(200);

    return {
      cookie,
      organizationId: workspaceBody.organization.id
    };
  };

  it("serves a product dashboard for a fresh workspace and then updates persisted workspace, gap, and report state", async () => {
    const { cookie, organizationId } = await registerLoginAndSelectWorkspace();

    const workspacePatch = await patchJson(
      `/api/workspaces/${organizationId}`,
      {
        name: "Asterion Cloud Services",
        legalName: "Asterion Cloud Services SRL",
        countryCode: "DE"
      },
      cookie
    );
    expect(workspacePatch.status).toBe(200);
    await expect(
      readJson<{ organization: { name: string; primaryCountryCode: string } }>(workspacePatch)
    ).resolves.toMatchObject({
      organization: {
        name: "Asterion Cloud Services",
        primaryCountryCode: "DE"
      }
    });

    const freshDashboard = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { cookie }
    });
    expect(freshDashboard.status).toBe(200);
    const freshBody = await readJson<{
      dashboard: {
        nextAction: { label: string; href: string };
        readiness: { baselineState: string; score: number };
        microsoft365: { status: string };
      };
    }>(freshDashboard);
    expect(freshBody.dashboard.nextAction).toEqual({
      label: "Start readiness onboarding",
      href: "/onboarding"
    });
    expect(freshBody.dashboard.readiness).toMatchObject({
      baselineState: "draft",
      score: 0
    });
    expect(freshBody.dashboard.microsoft365.status).toBe("not_connected");

    const runWithoutOnboarding = await postJson("/api/readiness/run", {}, cookie);
    expect(runWithoutOnboarding.status).toBe(404);

    const saved = await putJson(
      "/api/onboarding/answers",
      {
        countryCode: "DE",
        currentScreen: "company_profile",
        completedScreens: ["company_profile"],
        answers: {
          company: { legalName: "Asterion Cloud Services SRL", countryCode: "DE" },
          contacts: { primaryEmail: "security@example.test" },
          business: { sector: "digital_services", employeeCount: 42 },
          dependencies: { microsoft365Usage: "email_collaboration" }
        }
      },
      cookie
    );
    expect(saved.status).toBe(200);
    const savedBody = await readJson<{ progress: { assessmentId: string } }>(saved);
    expect(savedBody.progress.assessmentId).toMatch(uuidPattern);

    const run = await postJson("/api/readiness/run", {}, cookie);
    expect(run.status).toBe(201);
    const runBody = await readJson<{ assessmentId: string; gaps: Array<{ id: string }>; recommendations: unknown[] }>(run);
    expect(runBody.assessmentId).toMatch(uuidPattern);
    expect(runBody.assessmentId).toBe(savedBody.progress.assessmentId);
    expect(runBody.gaps.length).toBeGreaterThan(0);
    expect(runBody.recommendations.length).toBeGreaterThan(0);

    const gapPatch = await patchJson(
      `/api/gaps/${runBody.gaps[0]?.id}`,
      {
        status: "accepted_risk",
        planStatus: "planned",
        ownerUserId: "mvp-owner",
        dueDate: "2026-07-15"
      },
      cookie
    );
    expect(gapPatch.status).toBe(200);
    await expect(
      readJson<{ gap: { status: string; engineStatus: string; owner: string; dueDate: string } }>(gapPatch)
    ).resolves.toMatchObject({
      gap: {
        status: "planned",
        engineStatus: "accepted_risk",
        owner: "mvp-owner",
        dueDate: "2026-07-15"
      }
    });

    const gaps = await fetch(`${baseUrl}/api/gaps`, {
      headers: { cookie }
    });
    expect(gaps.status).toBe(200);
    await expect(readJson<{ gaps: Array<{ title: string; businessImpact: string }> }>(gaps)).resolves.toMatchObject({
      gaps: expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          businessImpact: expect.any(String)
        })
      ])
    });

    const report = await postJson("/api/reports/nis2-summary", {}, cookie);
    expect(report.status).toBe(201);
    const reportBody = await readJson<{ report: { id: string } }>(report);
    const reportDownload = await fetch(`${baseUrl}/api/reports/${reportBody.report.id}/download`, {
      headers: { cookie }
    });
    expect(reportDownload.status).toBe(200);
    expect(reportDownload.headers.get("content-type")).toBe("application/pdf");
    const reportDownloadBody = Buffer.from(await reportDownload.arrayBuffer());
    expect(reportDownload.headers.get("x-content-hash-sha256")).toBe(
      createHash("sha256").update(reportDownloadBody).digest("hex")
    );
  });

  it("lists only the MVP country packs and connector hub without internal provider route names", async () => {
    const { cookie } = await registerLoginAndSelectWorkspace();

    const countryPacks = await fetch(`${baseUrl}/api/country-packs`, {
      headers: { cookie }
    });
    expect(countryPacks.status).toBe(200);
    await expect(readJson<{ countryPacks: Array<{ countryCode: string }> }>(countryPacks)).resolves.toMatchObject({
      countryPacks: expect.arrayContaining([
        expect.objectContaining({ countryCode: "RO" }),
        expect.objectContaining({ countryCode: "PL" }),
        expect.objectContaining({ countryCode: "DE" })
      ])
    });

    const connectors = await fetch(`${baseUrl}/api/connectors`, {
      headers: { cookie }
    });
    expect(connectors.status).toBe(200);
    const connectorsBody = await readJson<{ connectors: Array<{ name: string; providerKey: string; status: string }> }>(
      connectors
    );
    expect(connectorsBody.connectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Microsoft 365",
          providerKey: "microsoft365",
          status: "not_connected"
        }),
        expect.objectContaining({
          name: "Google Workspace",
          status: "coming_later"
        })
      ])
    );
    expect(JSON.stringify(connectorsBody)).not.toContain("provider_connection_oauth");
  });

  it("supports Microsoft local disconnect and product remediation lifecycle aliases without fake execution success", async () => {
    const { cookie, organizationId } = await registerLoginAndSelectWorkspace();

    const consent = await postJson(
      "/api/connectors/microsoft365/connect",
      {
        redirectUri: "http://127.0.0.1/connectors/microsoft365/callback"
      },
      cookie
    );
    expect(consent.status).toBe(201);
    const consentBody = await readJson<{ state: string; url: string }>(consent);
    const callbackUrl = new URL(consentBody.url);
    const callback = await postJson(
      "/api/connectors/microsoft365/callback",
      {
        state: consentBody.state,
        tenant: callbackUrl.searchParams.get("tenant"),
        admin_consent: callbackUrl.searchParams.get("admin_consent")
      },
      cookie
    );
    expect(callback.status).toBe(200);

    const disconnect = await postJson(
      "/api/connectors/microsoft365/disconnect",
      {
        reason: "customer_requested"
      },
      cookie
    );
    expect(disconnect.status).toBe(200);
    await expect(
      readJson<{
        connection: { status: string; readEnabled: boolean; writeEnabled: boolean };
        providerRevocation: string;
      }>(disconnect)
    ).resolves.toMatchObject({
      connection: {
        status: "revoked",
        readEnabled: false,
        writeEnabled: false
      },
      providerRevocation: "manual_admin_center_recommended"
    });

    const mockConnection = await postJson(
      `/organizations/${organizationId}/provider-connections`,
      {
        scenarioKey: "healthy_tenant",
        displayName: "Mock tenant"
      },
      cookie
    );
    expect(mockConnection.status).toBe(201);
    const mockConnectionBody = await readJson<{ connection: { id: string } }>(mockConnection);
    const actionRun = await postJson(
      `/organizations/${organizationId}/actions/runs`,
      {
        providerConnectionId: mockConnectionBody.connection.id,
        recommendation: {
          id: "rec-product-alias",
          controlId: "nis2.access-control.mfa",
          jurisdiction: "EU",
          title: "Review MFA coverage",
          summary: "Generate and review an MFA coverage report.",
          severity: "high",
          recommendationType: "guided",
          automationMode: "guided",
          requiredPermissions: [],
          requiredLicense: [],
          evidenceRequired: true
        },
        actionTemplate: {
          providerKey: "mock",
          moduleKey: "identity",
          actionKey: "mfa_coverage_report",
          actionType: "guided",
          automationMode: "guided",
          title: "MFA coverage report",
          riskLevel: "low",
          licenseRequired: [],
          permissionsRequired: [],
          preconditions: {},
          expectedChange: "Create a report for human review.",
          blastRadius: "No tenant configuration changes.",
          rollbackStrategy: "No rollback needed for a generated report.",
          manualFallback: "Export the user list and review manually.",
          evidenceRequired: true
        }
      },
      cookie
    );
    expect(actionRun.status).toBe(201);
    const actionRunBody = await readJson<{ actionRun: { id: string } }>(actionRun);

    const preview = await postJson(`/api/remediation/actions/${actionRunBody.actionRun.id}/preview`, {}, cookie);
    expect(preview.status).toBe(200);
    await expect(readJson<{ preview: { status: string; canRequestApproval: boolean } }>(preview)).resolves.toMatchObject({
      preview: {
        status: "passed",
        canRequestApproval: true
      }
    });

    const approve = await postJson(`/api/remediation/actions/${actionRunBody.actionRun.id}/approve`, {}, cookie);
    expect(approve.status).toBe(200);
    await expect(readJson<{ actionRun: { approval: { status: string } } }>(approve)).resolves.toMatchObject({
      actionRun: {
        approval: {
          status: "approved"
        }
      }
    });

    const execute = await postJson(`/api/remediation/actions/${actionRunBody.actionRun.id}/execute`, {}, cookie);
    expect(execute.status).toBe(400);
    await expect(readJson<{ error: { code: string; message: string } }>(execute)).resolves.toMatchObject({
      error: {
        code: "invalid_action_state",
        message: expect.stringContaining("pre-state snapshot")
      }
    });
  });
});
