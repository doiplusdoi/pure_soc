import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultRoleDefinitions } from "@puresoc/auth-core";
import type { CloudProviderConnector } from "@puresoc/providers-core";
import { InMemoryProviderResourceStore } from "@puresoc/providers-core";
import { microsoft365ProviderKey, type Microsoft365TokenCipher } from "@puresoc/provider-microsoft365";
import type { NotificationTransport, NotificationTransportInput } from "@puresoc/notifications";

import { createApiServices } from "../auth/services";
import { Microsoft365ProviderConnectionService } from "../provider-connections/microsoft365/service";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

class CapturingNotificationTransport implements NotificationTransport {
  readonly sends: NotificationTransportInput[] = [];

  constructor(private readonly options: { fail?: boolean } = {}) {}

  async send(input: NotificationTransportInput): Promise<void> {
    this.sends.push(input);
    if (this.options.fail) {
      throw new Error("configured test transport failure");
    }
  }
}

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("notification API and triggers", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;
  let emailTransport: CapturingNotificationTransport;
  let slackTransport: CapturingNotificationTransport;

  beforeEach(() => {
    emailTransport = new CapturingNotificationTransport();
    slackTransport = new CapturingNotificationTransport();
    services = createApiServices({
      now: () => new Date("2026-06-14T09:00:00.000Z"),
      notificationTransports: {
        email: emailTransport,
        slack_webhook: slackTransport
      }
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
      displayName: "Notifications User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      body: await readJson<{ user: { id: string } }>(registerResponse),
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  const createOrganization = async (cookie: string, name = "Notifications Org") => {
    const response = await postJson(
      "/organizations",
      {
        name,
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  const addMemberWithRole = async (input: {
    organizationId: string;
    userId: string;
    roleKey: "auditor" | "security_operator";
  }) => {
    const now = new Date("2026-06-14T09:00:00.000Z");
    await services.identityRepository.addOrganizationMember({
      id: randomUUID(),
      organizationId: input.organizationId,
      userId: input.userId,
      status: "active",
      createdAt: now,
      updatedAt: now
    });
    const roleDefinition = defaultRoleDefinitions.find((role) => role.key === input.roleKey);
    if (!roleDefinition) {
      throw new Error(`Missing role definition: ${input.roleKey}`);
    }
    const role = await services.identityRepository.ensureRole(roleDefinition);
    await services.identityRepository.bindRole({
      id: randomUUID(),
      organizationId: input.organizationId,
      userId: input.userId,
      roleId: role.id,
      roleKey: input.roleKey,
      scopeJson: {},
      createdAt: now
    });
  };

  it("creates org-scoped channels, sends tests, logs attempts, and redacts webhook destinations", async () => {
    const owner = await registerAndLogin("notifications-owner@example.test");
    const other = await registerAndLogin("notifications-other@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const emailChannelResponse = await postJson(
      `/organizations/${organization.id}/notification-channels`,
      {
        type: "email",
        destination: "alerts@example.test"
      },
      owner.cookie
    );
    expect(emailChannelResponse.status).toBe(201);
    const emailChannel = await readJson<{ channel: { id: string; destination: string; destinationPreview: string } }>(
      emailChannelResponse
    );
    expect(emailChannel.channel.destination).toBe("alerts@example.test");
    expect(emailChannel.channel.destinationPreview).toBe("alerts@example.test");

    const slackDestination = "https://hooks.slack.test/services/T000/B000/sensitive-secret";
    const slackChannelResponse = await postJson(
      `/organizations/${organization.id}/notification-channels`,
      {
        type: "slack_webhook",
        destination: slackDestination
      },
      owner.cookie
    );
    expect(slackChannelResponse.status).toBe(201);
    const slackChannelBody = await readJson<{ channel: { id: string; destination?: string; destinationPreview: string } }>(
      slackChannelResponse
    );
    expect(JSON.stringify(slackChannelBody)).not.toContain("sensitive-secret");
    expect(slackChannelBody.channel.destination).toBeUndefined();
    expect(slackChannelBody.channel.destinationPreview).toContain("https://hooks.slack.test");

    const testResponse = await postJson(
      `/organizations/${organization.id}/notification-channels/${emailChannel.channel.id}/test`,
      {},
      owner.cookie
    );
    expect(testResponse.status).toBe(202);
    expect(emailTransport.sends).toHaveLength(1);
    expect(emailTransport.sends[0]?.eventType).toBe("TEST_NOTIFICATION");

    const logsResponse = await fetch(`${baseUrl}/organizations/${organization.id}/notification-logs`, {
      headers: { cookie: owner.cookie }
    });
    expect(logsResponse.status).toBe(200);
    const logs = await readJson<{ logs: Array<{ eventType: string; status: string; payloadHash: string }> }>(
      logsResponse
    );
    expect(logs.logs).toEqual([
      expect.objectContaining({
        eventType: "TEST_NOTIFICATION",
        status: "sent",
        payloadHash: expect.stringMatching(/^[0-9a-f]{64}$/)
      })
    ]);

    const rejectedCrossOrgRead = await fetch(`${baseUrl}/organizations/${organization.id}/notification-channels`, {
      headers: { cookie: other.cookie }
    });
    expect(rejectedCrossOrgRead.status).toBe(403);

    await addMemberWithRole({
      organizationId: organization.id,
      userId: other.body.user.id,
      roleKey: "auditor"
    });
    const rejectedAuditorCreate = await postJson(
      `/organizations/${organization.id}/notification-channels`,
      {
        type: "email",
        destination: "auditor@example.test"
      },
      other.cookie
    );
    expect(rejectedAuditorCreate.status).toBe(403);
  });

  it("fires CRITICAL_GAP_DETECTED when a critical compliance gap is persisted", async () => {
    const owner = await registerAndLogin("critical-gap-owner@example.test");
    const { organization } = await createOrganization(owner.cookie, "Critical Gap Org");
    await postJson(
      `/organizations/${organization.id}/notification-channels`,
      {
        type: "email",
        destination: "critical@example.test"
      },
      owner.cookie
    );

    const connection = await services.providerConnections.store.createConnection({
      organizationId: organization.id,
      providerKey: "mock",
      displayName: "Mock identity posture",
      externalTenantId: "mock",
      externalTenantName: "Mock",
      status: "connected",
      readEnabled: true,
      writeEnabled: false
    });
    await services.providerConnections.store.upsertFinding({
      organizationId: organization.id,
      providerConnectionId: connection.id,
      providerKey: "mock",
      moduleKey: "identity-posture",
      findingKey: "mock.identity.admin_mfa_missing.admin_1",
      title: "Admin MFA missing",
      summary: "A privileged account has no MFA.",
      severity: "critical",
      status: "open",
      evidence: {}
    });

    const evaluationResponse = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "11111111-1111-4111-8111-111111111111",
        providerConnectionId: connection.id,
        jurisdiction: "EU"
      },
      owner.cookie
    );
    expect(evaluationResponse.status).toBe(200);

    expect(emailTransport.sends.some((send) => send.eventType === "CRITICAL_GAP_DETECTED")).toBe(true);
    expect(emailTransport.sends.find((send) => send.eventType === "CRITICAL_GAP_DETECTED")?.message.text).toContain(
      "New critical NIS2 gap detected"
    );
    const logs = await services.notificationRepository.listLogs(organization.id);
    expect(logs.map((log) => log.eventType)).toContain("CRITICAL_GAP_DETECTED");
  });

  it("fires M365_DRIFT_DETECTED for newly seen open Microsoft 365 findings after sync", async () => {
    const organizationId = "22222222-2222-4222-8222-222222222222";
    await services.notificationRepository.createChannel({
      organizationId,
      type: "email",
      destination: "m365-alerts@example.test"
    });
    const store = new InMemoryProviderResourceStore({
      now: () => new Date("2026-06-14T09:00:00.000Z")
    });
    const connection = await store.createConnection({
      organizationId,
      providerKey: microsoft365ProviderKey,
      displayName: "Microsoft 365 tenant",
      externalTenantId: "tenant",
      externalTenantName: "Tenant",
      status: "connected",
      readEnabled: true,
      writeEnabled: false
    });
    const fakeCipher: Microsoft365TokenCipher = {
      encrypt: () => "encrypted",
      decrypt: <TPayload extends object>() => ({}) as TPayload
    };
    const connector: CloudProviderConnector = {
      providerKey: microsoft365ProviderKey,
      beginConnection: async () => ({ url: "https://login.example.test", state: "state" }),
      completeConnection: async () => {
        throw new Error("not used");
      },
      getTenantProfile: async () => {
        throw new Error("not used");
      },
      syncReadOnlyModules: async () => [
        {
          moduleKey: "defender-xdr",
          status: "succeeded",
          missingPermissions: [],
          missingLicenses: [],
          rawResources: [],
          normalizedResources: [],
          findings: [
            {
              organizationId,
              providerConnectionId: connection.id,
              providerKey: microsoft365ProviderKey,
              moduleKey: "defender-xdr",
              findingKey: "m365.defender.new_drift",
              title: "New Defender drift",
              summary: "A new open Microsoft 365 security drift finding was observed.",
              severity: "high",
              status: "open",
              evidence: {}
            }
          ],
          recommendations: [],
          pagesRead: 1,
          retryCount: 0
        }
      ],
      evaluateControls: async () => [],
      getRecommendedActions: async () => []
    };
    const microsoft365 = new Microsoft365ProviderConnectionService({
      store,
      auditWriter: services.auditWriter,
      notifications: services.notificationDelivery,
      tokenCipher: fakeCipher,
      createConnector: () => connector
    });

    await microsoft365.runSync({
      organizationId,
      actorUserId: "33333333-3333-4333-8333-333333333333",
      providerConnectionId: connection.id
    });

    expect(emailTransport.sends.some((send) => send.eventType === "M365_DRIFT_DETECTED")).toBe(true);
    expect(emailTransport.sends.find((send) => send.eventType === "M365_DRIFT_DETECTED")?.message.text).toContain(
      "Microsoft 365 configuration drift detected"
    );
    expect((await services.notificationRepository.listLogs(organizationId)).map((log) => log.eventType)).toContain(
      "M365_DRIFT_DETECTED"
    );
  });
});
