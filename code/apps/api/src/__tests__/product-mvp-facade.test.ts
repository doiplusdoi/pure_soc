import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

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
      now: () => new Date("2026-06-24T09:00:00.000Z")
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

  it("serves a product dashboard for a fresh workspace and then runs a stored readiness baseline", async () => {
    const { cookie } = await registerLoginAndSelectWorkspace();

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

    const saved = await putJson(
      "/api/onboarding/answers",
      {
        countryCode: "RO",
        currentScreen: "company_profile",
        completedScreens: ["company_profile"],
        answers: {
          company: { legalName: "Asterion Tools SRL", countryCode: "RO" },
          contacts: { primaryEmail: "security@example.test" },
          business: { sector: "digital_services", employeeCount: 42 },
          dependencies: { microsoft365Usage: "email_collaboration" }
        }
      },
      cookie
    );
    expect(saved.status).toBe(200);

    const run = await postJson("/api/readiness/run", {}, cookie);
    expect(run.status).toBe(201);
    const runBody = await readJson<{ gaps: unknown[]; recommendations: unknown[] }>(run);
    expect(runBody.gaps.length).toBeGreaterThan(0);
    expect(runBody.recommendations.length).toBeGreaterThan(0);

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
});
