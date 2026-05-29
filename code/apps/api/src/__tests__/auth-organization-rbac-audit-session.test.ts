import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("auth organization rbac audit session integration", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-04-28T12:00:00.000Z")
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
      displayName: "Phase C User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      registerBody: await readJson<{ user: { id: string; email: string } }>(registerResponse),
      loginBody: await readJson<{ user: { id: string; email: string }; session: { id: string } }>(loginResponse),
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  it("registers, logs in, creates a session, creates an organization, and logs out", async () => {
    const { registerBody, loginBody, cookie } = await registerAndLogin("Owner@Example.test");

    expect(registerBody.user.email).toBe("owner@example.test");
    expect(loginBody.user.id).toBe(registerBody.user.id);
    expect(cookie).toContain("puresoc_session=");

    const sessionResponse = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie }
    });
    expect(sessionResponse.status).toBe(200);
    await expect(readJson<{ session: { id: string } }>(sessionResponse)).resolves.toMatchObject({
      session: {
        id: loginBody.session.id
      }
    });

    const organizationResponse = await postJson(
      "/organizations",
      {
        name: "PureSOC Test Org",
        legalName: "PureSOC Test Org SRL",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(organizationResponse.status).toBe(201);
    const organizationBody = await readJson<{ organization: { id: string; name: string }; member: { roleKeys: string[] } }>(
      organizationResponse
    );
    expect(organizationBody.organization.name).toBe("PureSOC Test Org");
    expect(organizationBody.member.roleKeys).toEqual(["owner"]);

    const membersResponse = await fetch(`${baseUrl}/organizations/${organizationBody.organization.id}/members`, {
      headers: { cookie }
    });
    expect(membersResponse.status).toBe(200);

    const organizationsResponse = await fetch(`${baseUrl}/organizations`, {
      headers: { cookie }
    });
    expect(organizationsResponse.status).toBe(200);
    await expect(
      readJson<{ organizations: Array<{ organization: { id: string; name: string }; roleKeys: string[] }> }>(
        organizationsResponse
      )
    ).resolves.toMatchObject({
      organizations: [
        {
          organization: {
            id: organizationBody.organization.id,
            name: "PureSOC Test Org"
          },
          roleKeys: ["owner"]
        }
      ]
    });

    const selectActiveResponse = await postJson(
      "/auth/session/active-organization",
      {
        organizationId: organizationBody.organization.id
      },
      cookie
    );
    expect(selectActiveResponse.status).toBe(200);
    await expect(readJson<{ session: { activeOrganizationId: string } }>(selectActiveResponse)).resolves.toMatchObject({
      session: {
        activeOrganizationId: organizationBody.organization.id
      }
    });

    const logoutResponse = await postJson("/auth/logout", {}, cookie);
    expect(logoutResponse.status).toBe(200);

    const invalidSessionResponse = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie }
    });
    expect(invalidSessionResponse.status).toBe(401);

    expect(services.auditSink.findByAction("local_account_created")).toHaveLength(1);
    expect(services.auditSink.findByAction("login")).toHaveLength(1);
    expect(services.auditSink.findByAction("session_created")).toHaveLength(1);
    expect(services.auditSink.findByAction("session_active_organization_changed")).toHaveLength(1);
    expect(services.auditSink.findByAction("organization_created")).toHaveLength(1);
    expect(services.auditSink.findByAction("logout")).toHaveLength(1);
  });

  it("normalizes public workspace creation fields and rejects invalid organization input", async () => {
    const owner = await registerAndLogin("public-workspace@example.test");

    const normalizedResponse = await postJson(
      "/organizations",
      {
        name: "  Public Workspace  ",
        legalName: "  Public Workspace SRL  ",
        primaryCountryCode: " ro ",
        headquartersCountryCode: "de"
      },
      owner.cookie
    );
    expect(normalizedResponse.status).toBe(201);
    await expect(
      readJson<{
        organization: {
          headquartersCountryCode: string;
          legalName: string;
          name: string;
          primaryCountryCode: string;
        };
      }>(normalizedResponse)
    ).resolves.toMatchObject({
      organization: {
        headquartersCountryCode: "DE",
        legalName: "Public Workspace SRL",
        name: "Public Workspace",
        primaryCountryCode: "RO"
      }
    });

    const invalidCountryResponse = await postJson(
      "/organizations",
      {
        name: "Invalid Country",
        primaryCountryCode: "Romania"
      },
      owner.cookie
    );
    expect(invalidCountryResponse.status).toBe(400);

    const blankNameResponse = await postJson(
      "/organizations",
      {
        name: "   ",
        primaryCountryCode: "RO"
      },
      owner.cookie
    );
    expect(blankNameResponse.status).toBe(400);
  });

  it("rejects cross-organization access through the RBAC guard", async () => {
    const owner = await registerAndLogin("owner@example.test");
    const otherUser = await registerAndLogin("other@example.test");

    const organizationResponse = await postJson(
      "/organizations",
      {
        name: "Owner Org"
      },
      owner.cookie
    );
    const organizationBody = await readJson<{ organization: { id: string } }>(organizationResponse);

    const crossOrgResponse = await fetch(`${baseUrl}/organizations/${organizationBody.organization.id}/members`, {
      headers: { cookie: otherUser.cookie }
    });

    expect(crossOrgResponse.status).toBe(403);

    const selectCrossOrgResponse = await postJson(
      "/auth/session/active-organization",
      {
        organizationId: organizationBody.organization.id
      },
      otherUser.cookie
    );
    expect(selectCrossOrgResponse.status).toBe(403);
  });

  it("audits failed logins, rate-limits repeated failures, and keeps secrets out of responses and audit logs", async () => {
    const registrationResponse = await postJson("/auth/register", {
      email: "secret-check@example.test",
      password,
      displayName: "Secret Check"
    });
    const registrationText = await registrationResponse.text();

    expect(registrationText).not.toContain(password);
    expect(registrationText).not.toContain("verificationToken");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failedResponse = await postJson("/auth/login", {
        email: "secret-check@example.test",
        password: "WrongPassword123!"
      });
      expect(failedResponse.status).toBe(401);
      expect(await failedResponse.text()).not.toContain("WrongPassword123!");
    }

    const rateLimitedResponse = await postJson("/auth/login", {
      email: "secret-check@example.test",
      password: "WrongPassword123!"
    });
    expect(rateLimitedResponse.status).toBe(429);

    const serializedAudit = JSON.stringify(services.auditSink.records);
    expect(services.auditSink.findByAction("failed_login")).toHaveLength(6);
    expect(serializedAudit).not.toContain(password);
    expect(serializedAudit).not.toContain("WrongPassword123!");
    expect(serializedAudit).not.toContain("verificationToken");
    expect(serializedAudit).not.toContain("resetToken");
    expect(serializedAudit).not.toContain("puresoc_session=");
  });

  it("sets Secure on session cookies when configured", async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_AUTH_COOKIE_SECURE: "true"
        }
      }),
      now: () => new Date("2026-04-28T12:00:00.000Z")
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    const login = await registerAndLogin("secure-cookie@example.test");

    expect(login.cookie).toContain("HttpOnly");
    expect(login.cookie).toContain("SameSite=Lax");
    expect(login.cookie).toContain("Secure");

    const logoutResponse = await postJson("/auth/logout", {}, login.cookie);

    expect(logoutResponse.headers.get("set-cookie")).toContain("Secure");
  });
});
