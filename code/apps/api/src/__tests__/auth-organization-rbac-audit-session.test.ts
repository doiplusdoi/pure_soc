import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import {
  createDefaultEmailVerificationDelivery,
  createApiServices,
  InMemoryEmailVerificationDelivery,
  InMemoryOrganizationInvitationDelivery
} from "../auth/services";
import type { PasswordHasher } from "@puresoc/auth-local";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("auth organization rbac audit session integration", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;
  let emailDelivery: InMemoryEmailVerificationDelivery;
  let invitationDelivery: InMemoryOrganizationInvitationDelivery;

  const startWithServices = (nextServices: ReturnType<typeof createApiServices>) => {
    services = nextServices;
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  };

  const closeServer = async () => {
    if (!server.listening) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };

  beforeEach(() => {
    emailDelivery = new InMemoryEmailVerificationDelivery();
    invitationDelivery = new InMemoryOrganizationInvitationDelivery();
    startWithServices(
      createApiServices({
        config: loadConfig({
          env: {
            PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "true"
          }
        }),
        emailVerificationDelivery: emailDelivery,
        organizationInvitationDelivery: invitationDelivery,
        now: () => new Date("2026-04-28T12:00:00.000Z")
      })
    );
  });

  afterEach(closeServer);

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

  it("only attaches a selected workspace during login when the user is an active member", async () => {
    const owner = await registerAndLogin("workspace-owner@example.test");
    const outsider = await registerAndLogin("workspace-outsider@example.test");

    const organizationResponse = await postJson(
      "/organizations",
      {
        name: "Selected Workspace",
        primaryCountryCode: "RO"
      },
      owner.cookie
    );
    expect(organizationResponse.status).toBe(201);
    const organizationBody = await readJson<{ organization: { id: string } }>(organizationResponse);

    const selectedLoginResponse = await postJson("/auth/login", {
      email: "workspace-owner@example.test",
      password,
      activeOrganizationId: organizationBody.organization.id
    });
    expect(selectedLoginResponse.status).toBe(200);
    await expect(readJson<{ session: { activeOrganizationId: string } }>(selectedLoginResponse)).resolves.toMatchObject({
      session: {
        activeOrganizationId: organizationBody.organization.id
      }
    });

    const rejectedLoginResponse = await postJson("/auth/login", {
      email: "workspace-outsider@example.test",
      password,
      activeOrganizationId: organizationBody.organization.id
    });
    expect(rejectedLoginResponse.status).toBe(403);
    await expect(readJson<{ error: { code: string } }>(rejectedLoginResponse)).resolves.toEqual({
      error: {
        code: "forbidden",
        message: "The selected workspace is not available for this account."
      }
    });
    expect(rejectedLoginResponse.headers.get("set-cookie")).toBeNull();

    const outsiderSessionResponse = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie: outsider.cookie }
    });
    expect(outsiderSessionResponse.status).toBe(200);
    await expect(
      readJson<{ session: { activeOrganizationId: string | null } }>(outsiderSessionResponse)
    ).resolves.toMatchObject({
      session: {
        activeOrganizationId: null
      }
    });
  });

  it("normalizes public workspace creation fields and rejects invalid organization input", async () => {
    const owner = await registerAndLogin("public-workspace@example.test");

    const normalizedResponse = await postJson(
      "/organizations",
      {
        name: "  Public Workspace  ",
        legalName: "  Public Workspace SRL  ",
        primaryCountryCode: " ro ",
        headquartersCountryCode: "de",
        logoDataUrl: " data:image/png;base64,iVBORw0KGgo= "
      },
      owner.cookie
    );
    expect(normalizedResponse.status).toBe(201);
    await expect(
      readJson<{
        organization: {
          headquartersCountryCode: string;
          legalName: string;
          logoDataUrl: string;
          name: string;
          primaryCountryCode: string;
        };
      }>(normalizedResponse)
    ).resolves.toMatchObject({
      organization: {
        headquartersCountryCode: "DE",
        legalName: "Public Workspace SRL",
        logoDataUrl: "data:image/png;base64,iVBORw0KGgo=",
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

    const invalidLogoResponse = await postJson(
      "/organizations",
      {
        name: "Invalid Logo",
        primaryCountryCode: "RO",
        logoDataUrl: "data:text/html;base64,PHNjcmlwdD4="
      },
      owner.cookie
    );
    expect(invalidLogoResponse.status).toBe(400);

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

  it("creates owner-managed invitations and accepts them only for verified matching emails", async () => {
    const owner = await registerAndLogin("invite-owner@example.test");
    const organizationResponse = await postJson(
      "/organizations",
      {
        name: "Invite Org"
      },
      owner.cookie
    );
    expect(organizationResponse.status).toBe(201);
    const organizationBody = await readJson<{ organization: { id: string } }>(organizationResponse);

    const unverifiedOwnerInviteResponse = await postJson(
      `/organizations/${organizationBody.organization.id}/invitations`,
      {
        email: "blocked@example.test",
        roleKey: "auditor"
      },
      owner.cookie
    );
    expect(unverifiedOwnerInviteResponse.status).toBe(403);
    expect(invitationDelivery.deliveries).toHaveLength(0);

    const ownerVerification = emailDelivery.deliveries.find((delivery) => delivery.email === "invite-owner@example.test");
    if (!ownerVerification) {
      throw new Error("Expected owner email verification delivery.");
    }
    const ownerVerificationResponse = await postJson("/auth/email/verify", {
      token: ownerVerification.plaintextToken
    });
    expect(ownerVerificationResponse.status).toBe(200);

    const unsupportedRoleResponse = await postJson(
      `/organizations/${organizationBody.organization.id}/invitations`,
      {
        email: "role-owner@example.test",
        roleKey: "owner"
      },
      owner.cookie
    );
    expect(unsupportedRoleResponse.status).toBe(400);

    const invitationResponse = await postJson(
      `/organizations/${organizationBody.organization.id}/invitations`,
      {
        email: "Invitee@Example.test",
        roleKey: "auditor"
      },
      owner.cookie
    );
    expect(invitationResponse.status).toBe(201);
    const invitationText = await invitationResponse.text();
    const invitationBody = JSON.parse(invitationText) as {
      invitation: { invitedEmail: string; roleKey: string; status: string };
    };
    expect(invitationBody.invitation).toMatchObject({
      invitedEmail: "invitee@example.test",
      roleKey: "auditor",
      status: "pending"
    });
    expect(invitationDelivery.deliveries).toHaveLength(1);
    const invitationDeliveryRecord = invitationDelivery.deliveries[0];
    if (!invitationDeliveryRecord) {
      throw new Error("Expected local invitation delivery.");
    }
    expect(invitationText).not.toContain(invitationDeliveryRecord.plaintextToken);
    expect(invitationText).not.toContain("tokenHash");

    const wrongUser = await registerAndLogin("wrong-invitee@example.test");
    const wrongUserVerification = emailDelivery.deliveries.find((delivery) => delivery.email === "wrong-invitee@example.test");
    if (!wrongUserVerification) {
      throw new Error("Expected wrong-user email verification delivery.");
    }
    const wrongUserVerificationResponse = await postJson("/auth/email/verify", {
      token: wrongUserVerification.plaintextToken
    });
    expect(wrongUserVerificationResponse.status).toBe(200);
    const mismatchedAcceptResponse = await postJson(
      `/organizations/${organizationBody.organization.id}/invitations/accept`,
      {
        token: invitationDeliveryRecord.plaintextToken
      },
      wrongUser.cookie
    );
    expect(mismatchedAcceptResponse.status).toBe(403);

    const invitee = await registerAndLogin("invitee@example.test");
    const unverifiedAcceptResponse = await postJson(
      `/organizations/${organizationBody.organization.id}/invitations/accept`,
      {
        token: invitationDeliveryRecord.plaintextToken
      },
      invitee.cookie
    );
    expect(unverifiedAcceptResponse.status).toBe(403);

    const inviteeVerification = emailDelivery.deliveries.find((delivery) => delivery.email === "invitee@example.test");
    if (!inviteeVerification) {
      throw new Error("Expected invitee email verification delivery.");
    }
    const verificationResponse = await postJson("/auth/email/verify", {
      token: inviteeVerification.plaintextToken
    });
    expect(verificationResponse.status).toBe(200);

    const acceptResponse = await postJson(
      `/organizations/${organizationBody.organization.id}/invitations/accept`,
      {
        token: invitationDeliveryRecord.plaintextToken
      },
      invitee.cookie
    );
    expect(acceptResponse.status).toBe(200);
    await expect(
      readJson<{
        invitation: { status: string; acceptedAt: string };
        member: { organizationId: string; roleKeys: string[]; status: string; user: { email: string } };
      }>(acceptResponse)
    ).resolves.toMatchObject({
      invitation: {
        status: "accepted",
        acceptedAt: "2026-04-28T12:00:00.000Z"
      },
      member: {
        organizationId: organizationBody.organization.id,
        roleKeys: ["auditor"],
        status: "active",
        user: {
          email: "invitee@example.test"
        }
      }
    });

    const inviteeOrganizations = await fetch(`${baseUrl}/organizations`, {
      headers: { cookie: invitee.cookie }
    });
    expect(inviteeOrganizations.status).toBe(200);
    await expect(
      readJson<{ organizations: Array<{ organization: { id: string }; roleKeys: string[] }> }>(inviteeOrganizations)
    ).resolves.toMatchObject({
      organizations: [
        {
          organization: {
            id: organizationBody.organization.id
          },
          roleKeys: ["auditor"]
        }
      ]
    });

    const reusedResponse = await postJson(
      `/organizations/${organizationBody.organization.id}/invitations/accept`,
      {
        token: invitationDeliveryRecord.plaintextToken
      },
      invitee.cookie
    );
    expect(reusedResponse.status).toBe(400);

    const serializedAudit = JSON.stringify(services.auditSink.records);
    expect(services.auditSink.findByAction("member_invited")).toHaveLength(1);
    expect(services.auditSink.findByAction("member_invitation_accepted")).toHaveLength(1);
    expect(serializedAudit).not.toContain(invitationDeliveryRecord.plaintextToken);
    expect(serializedAudit).not.toContain(ownerVerification.plaintextToken);
    expect(serializedAudit).not.toContain(wrongUserVerification.plaintextToken);
    expect(serializedAudit).not.toContain(inviteeVerification.plaintextToken);
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

  it("treats malformed stored password hashes as invalid credentials instead of API errors", async () => {
    const registrationResponse = await postJson("/auth/register", {
      email: "corrupt-hash@example.test",
      password,
      displayName: "Corrupt Hash"
    });
    expect(registrationResponse.status).toBe(201);

    const credential = [...services.memoryRepositories.identityRepository.localCredentials.values()].find(
      (candidate) => candidate.email === "corrupt-hash@example.test"
    );
    if (!credential) {
      throw new Error("Expected local credential to exist.");
    }
    services.memoryRepositories.identityRepository.localCredentials.set(credential.id, {
      ...credential,
      passwordHash: "argon2id:legacy-placeholder"
    });

    const loginResponse = await postJson("/auth/login", {
      email: "corrupt-hash@example.test",
      password
    });
    expect(loginResponse.status).toBe(401);
    await expect(readJson<{ error: { code: string; message: string } }>(loginResponse)).resolves.toEqual({
      error: {
        code: "invalid_credentials",
        message: "Invalid email or password."
      }
    });
    expect(loginResponse.headers.get("set-cookie")).toBeNull();
    expect(services.auditSink.findByAction("failed_login")).toHaveLength(1);
  });

  it("returns a controlled auth error when password hashing is unavailable during registration", async () => {
    await closeServer();
    const failingHasher: PasswordHasher = {
      async hashPassword() {
        throw new Error("argon2 backend unavailable");
      },
      async verifyPassword() {
        return false;
      }
    };
    startWithServices(
      createApiServices({
        config: loadConfig({
          env: {
            PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "true"
          }
        }),
        emailVerificationDelivery: emailDelivery,
        organizationInvitationDelivery: invitationDelivery,
        passwordHasher: failingHasher,
        now: () => new Date("2026-04-28T12:00:00.000Z")
      })
    );

    const registrationResponse = await postJson("/auth/register", {
      email: "hash-unavailable@example.test",
      password,
      displayName: "Hash Unavailable"
    });

    expect(registrationResponse.status).toBe(503);
    await expect(readJson<{ error: { code: string; message: string } }>(registrationResponse)).resolves.toEqual({
      error: {
        code: "auth_service_unavailable",
        message: "Authentication service is temporarily unavailable."
      }
    });
    expect(services.memoryRepositories.identityRepository.localCredentials.size).toBe(0);
  });

  it("does not update credentials when password hashing is unavailable during reset", async () => {
    let hashUnavailable = false;
    const passwordHasher: PasswordHasher = {
      async hashPassword(nextPassword) {
        if (hashUnavailable) {
          throw new Error("argon2 backend unavailable");
        }

        return `test-hash:${nextPassword}`;
      },
      async verifyPassword(passwordHash, nextPassword) {
        return passwordHash === `test-hash:${nextPassword}`;
      }
    };
    await closeServer();
    startWithServices(
      createApiServices({
        config: loadConfig({
          env: {
            PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "true"
          }
        }),
        emailVerificationDelivery: emailDelivery,
        organizationInvitationDelivery: invitationDelivery,
        passwordHasher,
        now: () => new Date("2026-04-28T12:00:00.000Z")
      })
    );

    await services.localAuth.register({
      email: "reset-hash-unavailable@example.test",
      password,
      displayName: "Reset Hash Unavailable"
    });
    const credential = [...services.memoryRepositories.identityRepository.localCredentials.values()].find(
      (candidate) => candidate.email === "reset-hash-unavailable@example.test"
    );
    if (!credential) {
      throw new Error("Expected local credential to exist.");
    }
    let resetToken = "";
    await services.localAuth.requestPasswordReset({
      email: "reset-hash-unavailable@example.test",
      deliverPasswordResetToken: (delivery) => {
        resetToken = delivery.plaintextToken;
      }
    });
    hashUnavailable = true;

    await expect(
      services.localAuth.resetPassword({
        plaintextToken: resetToken,
        newPassword: "AnotherCorrectHorse42!"
      })
    ).rejects.toMatchObject({
      code: "auth_service_unavailable",
      statusCode: 503
    });
    expect(services.memoryRepositories.identityRepository.localCredentials.get(credential.id)?.passwordHash).toBe(
      credential.passwordHash
    );
  });

  it("verifies local account email through a secret-free API route", async () => {
    const registrationResponse = await postJson("/auth/register", {
      email: "verify-me@example.test",
      password,
      displayName: "Verify Me"
    });
    expect(registrationResponse.status).toBe(201);
    const registrationText = await registrationResponse.text();
    expect(registrationText).not.toContain("plaintextToken");
    expect(registrationText).not.toContain("verificationToken");

    expect(emailDelivery.deliveries).toHaveLength(1);
    const delivery = emailDelivery.deliveries[0];
    if (!delivery) {
      throw new Error("Expected local email verification delivery.");
    }
    expect(delivery.email).toBe("verify-me@example.test");

    const verificationResponse = await postJson("/auth/email/verify", {
      token: delivery.plaintextToken
    });
    expect(verificationResponse.status).toBe(200);
    await expect(readJson<{ verified: boolean }>(verificationResponse)).resolves.toEqual({ verified: true });

    const loginResponse = await postJson("/auth/login", {
      email: "verify-me@example.test",
      password
    });
    expect(loginResponse.status).toBe(200);
    const loginBody = await readJson<{ user: { emailVerifiedAt: string | null } }>(loginResponse);
    expect(loginBody.user.emailVerifiedAt).toBe("2026-04-28T12:00:00.000Z");

    const reusedResponse = await postJson("/auth/email/verify", {
      token: delivery.plaintextToken
    });
    expect(reusedResponse.status).toBe(400);

    const serializedAudit = JSON.stringify(services.auditSink.records);
    expect(services.auditSink.findByAction("email_verified")).toHaveLength(1);
    expect(serializedAudit).not.toContain(delivery.plaintextToken);
  });

  it("can suspend local account email verification outside production", async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    emailDelivery = new InMemoryEmailVerificationDelivery();
    services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "false"
        }
      }),
      emailVerificationDelivery: emailDelivery,
      organizationInvitationDelivery: invitationDelivery,
      now: () => new Date("2026-04-28T12:00:00.000Z")
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    const registrationResponse = await postJson("/auth/register", {
      email: "suspended-verification@example.test",
      password,
      displayName: "Suspended Verification"
    });
    expect(registrationResponse.status).toBe(201);
    const registrationBody = await readJson<{
      emailVerificationRequired: boolean;
      user: { emailVerifiedAt: string | null };
    }>(registrationResponse);
    expect(registrationBody.emailVerificationRequired).toBe(false);
    expect(registrationBody.user.emailVerifiedAt).toBe("2026-04-28T12:00:00.000Z");
    expect(emailDelivery.deliveries).toHaveLength(0);

    const loginResponse = await postJson("/auth/login", {
      email: "suspended-verification@example.test",
      password
    });
    expect(loginResponse.status).toBe(200);
    const loginBody = await readJson<{ user: { emailVerifiedAt: string | null } }>(loginResponse);
    expect(loginBody.user.emailVerifiedAt).toBe("2026-04-28T12:00:00.000Z");

    const serializedAudit = JSON.stringify(services.auditSink.records);
    expect(serializedAudit).toContain('"emailVerificationRequired":false');
    expect(serializedAudit).not.toContain("plaintextToken");
    expect(serializedAudit).not.toContain("verificationToken");
  });

  it("can deliver verification tokens to an explicit local development file sink", async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    const deliveryDirectory = mkdtempSync(join(tmpdir(), "puresoc-email-delivery-"));
    const deliveryFile = join(deliveryDirectory, "verification.jsonl");
    const config = loadConfig({
      env: {
        PURESOC_APP_ENV: "development",
        PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "true"
      }
    });

    try {
      services = createApiServices({
        config,
        emailVerificationDelivery: createDefaultEmailVerificationDelivery(config, {
          PURESOC_AUTH_DEV_EMAIL_DELIVERY_FILE: deliveryFile
        }),
        now: () => new Date("2026-04-28T12:00:00.000Z")
      });
      server = startApiServer(0, services);
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;

      const registrationResponse = await postJson("/auth/register", {
        email: "dev-file-token@example.test",
        password,
        displayName: "Dev File Token"
      });
      expect(registrationResponse.status).toBe(201);
      const registrationText = await registrationResponse.text();

      const deliveryLines = readFileSync(deliveryFile, "utf8").trim().split("\n");
      expect(deliveryLines).toHaveLength(1);
      const delivery = JSON.parse(deliveryLines[0] ?? "{}") as {
        kind: string;
        email: string;
        plaintextToken: string;
        expiresAt: string;
      };
      expect(delivery).toMatchObject({
        kind: "email_verification",
        email: "dev-file-token@example.test",
        expiresAt: "2026-04-29T12:00:00.000Z"
      });
      expect(delivery.plaintextToken).toEqual(expect.any(String));
      expect(registrationText).not.toContain(delivery.plaintextToken);

      const verificationResponse = await postJson("/auth/email/verify", {
        token: delivery.plaintextToken
      });
      expect(verificationResponse.status).toBe(200);

      const serializedAudit = JSON.stringify(services.auditSink.records);
      expect(serializedAudit).not.toContain(delivery.plaintextToken);
    } finally {
      rmSync(deliveryDirectory, { recursive: true, force: true });
    }
  });

  it("rejects local development file delivery outside development config", () => {
    expect(() =>
      createDefaultEmailVerificationDelivery(
        loadConfig({
          env: {
            PURESOC_APP_ENV: "production"
          }
        }),
        {
          PURESOC_AUTH_DEV_EMAIL_DELIVERY_FILE: "/tmp/puresoc-email-delivery.jsonl"
        }
      )
    ).toThrow(/only supported/);
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
