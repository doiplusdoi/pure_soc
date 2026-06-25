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

    const rotatedSlackResponse = await fetch(
      `${baseUrl}/organizations/${organization.id}/notification-channels/${slackChannelBody.channel.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: owner.cookie
        },
        body: JSON.stringify({
          destination: "https://hooks.slack.test/services/T111/B111/rotated-secret",
          enabled: false
        })
      }
    );
    expect(rotatedSlackResponse.status).toBe(200);
    const rotatedSlack = await readJson<{ channel: { destination?: string; destinationPreview: string; enabled: boolean } }>(
      rotatedSlackResponse
    );
    expect(rotatedSlack.channel.destination).toBeUndefined();
    expect(rotatedSlack.channel.destinationPreview).toContain("https://hooks.slack.test");
    expect(rotatedSlack.channel.enabled).toBe(false);
    expect(JSON.stringify(rotatedSlack)).not.toContain("rotated-secret");

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

    const rejectedAuditorUpdate = await fetch(
      `${baseUrl}/organizations/${organization.id}/notification-channels/${emailChannel.channel.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: other.cookie
        },
        body: JSON.stringify({ enabled: false })
      }
    );
    expect(rejectedAuditorUpdate.status).toBe(403);
  });

  it("exposes v1 notification channel and log aliases with tenant isolation", async () => {
    const owner = await registerAndLogin("notifications-v1-owner@example.test");
    const other = await registerAndLogin("notifications-v1-other@example.test");
    const { organization } = await createOrganization(owner.cookie, "Notifications V1 Org");

    const createResponse = await postJson(
      `/api/v1/organizations/${organization.id}/notification-channels`,
      {
        type: "email",
        destination: "v1-alerts@example.test"
      },
      owner.cookie
    );
    expect(createResponse.status).toBe(201);
    const created = await readJson<{ channel: { id: string; destination: string; destinationPreview: string } }>(
      createResponse
    );
    expect(created.channel.destination).toBe("v1-alerts@example.test");
    expect(created.channel.destinationPreview).toBe("v1-alerts@example.test");

    const updateResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/notification-channels/${created.channel.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: owner.cookie
        },
        body: JSON.stringify({
          destination: "rotated-v1-alerts@example.test",
          enabled: false
        })
      }
    );
    expect(updateResponse.status).toBe(200);
    await expect(
      readJson<{ channel: { destination: string; destinationPreview: string; enabled: boolean } }>(updateResponse)
    ).resolves.toMatchObject({
      channel: {
        destination: "rotated-v1-alerts@example.test",
        destinationPreview: "rotated-v1-alerts@example.test",
        enabled: false
      }
    });

    const listResponse = await fetch(`${baseUrl}/api/v1/organizations/${organization.id}/notification-channels`, {
      headers: { cookie: owner.cookie }
    });
    expect(listResponse.status).toBe(200);
    await expect(readJson<{ channels: Array<{ id: string; enabled: boolean }> }>(listResponse)).resolves.toMatchObject({
      channels: [expect.objectContaining({ id: created.channel.id, enabled: false })]
    });

    const reenableResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/notification-channels/${created.channel.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: owner.cookie
        },
        body: JSON.stringify({ enabled: true })
      }
    );
    expect(reenableResponse.status).toBe(200);

    const testResponse = await postJson(
      `/api/v1/organizations/${organization.id}/notification-channels/${created.channel.id}/test`,
      {},
      owner.cookie
    );
    expect(testResponse.status).toBe(202);
    expect(emailTransport.sends.some((send) => send.eventType === "TEST_NOTIFICATION")).toBe(true);

    const logsResponse = await fetch(`${baseUrl}/api/v1/organizations/${organization.id}/notification-logs`, {
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

    const operatorAlert = await services.notificationRepository.recordOperatorAlert?.({
      id: "alert_v1_delivery_exhausted",
      organizationId: organization.id,
      alertType: "delivery_exhausted",
      severity: "warning",
      title: "Notification delivery exhausted",
      body: "Retries for CRITICAL_GAP_DETECTED exhausted.",
      sourceRetryItemId: "retry_v1_delivery",
      channelId: created.channel.id,
      eventType: "CRITICAL_GAP_DETECTED",
      createdAt: "2026-06-14T09:00:00.000Z"
    });
    expect(operatorAlert).toBeDefined();

    const alertsResponse = await fetch(`${baseUrl}/api/v1/organizations/${organization.id}/notification-operator-alerts`, {
      headers: { cookie: owner.cookie }
    });
    expect(alertsResponse.status).toBe(200);
    await expect(
      readJson<{ operatorAlerts: Array<{ id: string; status: string; eventType: string }> }>(alertsResponse)
    ).resolves.toMatchObject({
      operatorAlerts: [
        expect.objectContaining({
          id: "alert_v1_delivery_exhausted",
          status: "open",
          eventType: "CRITICAL_GAP_DETECTED"
        })
      ]
    });

    const rejectedCrossOrgAcknowledge = await postJson(
      `/api/v1/organizations/${organization.id}/notification-operator-alerts/alert_v1_delivery_exhausted/acknowledge`,
      {},
      other.cookie
    );
    expect(rejectedCrossOrgAcknowledge.status).toBe(403);

    const acknowledgeResponse = await postJson(
      `/api/v1/organizations/${organization.id}/notification-operator-alerts/alert_v1_delivery_exhausted/acknowledge`,
      {},
      owner.cookie
    );
    expect(acknowledgeResponse.status).toBe(200);
    await expect(
      readJson<{ operatorAlert: { id: string; status: string; acknowledgedAt: string } }>(acknowledgeResponse)
    ).resolves.toMatchObject({
      operatorAlert: {
        id: "alert_v1_delivery_exhausted",
        status: "acknowledged",
        acknowledgedAt: expect.any(String)
      }
    });

    const rejectedCrossOrgRead = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/notification-channels`,
      {
        headers: {
          cookie: other.cookie,
          "x-request-id": "req_v1_notification_cross_org",
          "x-correlation-id": "corr_v1_notification_cross_org"
        }
      }
    );
    expect(rejectedCrossOrgRead.status).toBe(403);
    await expect(readJson<{ error: Record<string, unknown> }>(rejectedCrossOrgRead)).resolves.toMatchObject({
      error: {
        code: "forbidden",
        requestId: "req_v1_notification_cross_org",
        correlationId: "corr_v1_notification_cross_org",
        fieldErrors: []
      }
    });

    const deleteResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/notification-channels/${created.channel.id}`,
      {
        method: "DELETE",
        headers: { cookie: owner.cookie }
      }
    );
    expect(deleteResponse.status).toBe(200);
    await expect(readJson<{ deleted: boolean }>(deleteResponse)).resolves.toEqual({ deleted: true });
  });

  it("manages v1 in-app notification center items and preferences with tenant isolation", async () => {
    const owner = await registerAndLogin("notification-center-owner@example.test");
    const other = await registerAndLogin("notification-center-other@example.test");
    const { organization } = await createOrganization(owner.cookie, "Notification Center Org");

    const preferencesResponse = await fetch(`${baseUrl}/api/v1/organizations/${organization.id}/notification-preferences`, {
      headers: { cookie: owner.cookie }
    });
    expect(preferencesResponse.status).toBe(200);
    await expect(
      readJson<{ notificationPreferences: { digestFrequency: string; suppressedCategories: string[] } }>(
        preferencesResponse
      )
    ).resolves.toMatchObject({
      notificationPreferences: {
        digestFrequency: "off",
        suppressedCategories: []
      }
    });

    const updatedPreferencesResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/notification-preferences`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: owner.cookie
        },
        body: JSON.stringify({
          digestFrequency: "weekly",
          suppressedCategories: ["connector", "incident"],
          mutedUntil: "2026-06-21T09:00:00.000Z"
        })
      }
    );
    expect(updatedPreferencesResponse.status).toBe(200);
    await expect(
      readJson<{ notificationPreferences: { digestFrequency: string; suppressedCategories: string[] } }>(
        updatedPreferencesResponse
      )
    ).resolves.toMatchObject({
      notificationPreferences: {
        digestFrequency: "weekly",
        suppressedCategories: ["connector", "incident"]
      }
    });

    const createdResponse = await postJson(
      `/api/v1/organizations/${organization.id}/notifications`,
      {
        title: "Review Microsoft 365 drift",
        body: "A high severity connector finding needs triage.",
        category: "connector",
        severity: "high",
        sourceResourceType: "finding",
        sourceResourceId: "finding_m365_drift",
        actionHref: `/app/o/${organization.id}/security/findings`
      },
      owner.cookie
    );
    expect(createdResponse.status).toBe(201);
    const created = await readJson<{
      notification: {
        id: string;
        category: string;
        severity: string;
        status: string;
        readAt?: string | null;
      };
    }>(createdResponse);
    expect(created.notification).toMatchObject({
      category: "connector",
      severity: "high",
      status: "unread",
      readAt: null
    });

    const listResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/notifications?filter[status]=unread&limit=10`,
      {
        headers: { cookie: owner.cookie }
      }
    );
    expect(listResponse.status).toBe(200);
    await expect(readJson<{ data: Array<{ id: string; status: string }> }>(listResponse)).resolves.toMatchObject({
      data: [expect.objectContaining({ id: created.notification.id, status: "unread" })]
    });

    const readResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/notifications/${created.notification.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: owner.cookie
        },
        body: JSON.stringify({ status: "read" })
      }
    );
    expect(readResponse.status).toBe(200);
    await expect(readJson<{ notification: { status: string; readAt: string } }>(readResponse)).resolves.toMatchObject({
      notification: {
        status: "read",
        readAt: "2026-06-14T09:00:00.000Z"
      }
    });

    const rejectedCrossOrgRead = await fetch(`${baseUrl}/api/v1/organizations/${organization.id}/notifications`, {
      headers: {
        cookie: other.cookie,
        "x-request-id": "req_v1_notification_center_cross_org",
        "x-correlation-id": "corr_v1_notification_center_cross_org"
      }
    });
    expect(rejectedCrossOrgRead.status).toBe(403);
    await expect(readJson<{ error: Record<string, unknown> }>(rejectedCrossOrgRead)).resolves.toMatchObject({
      error: {
        code: "forbidden",
        requestId: "req_v1_notification_center_cross_org",
        correlationId: "corr_v1_notification_center_cross_org",
        fieldErrors: []
      }
    });

    const events = await services.productV1.listInternalEvents(organization.id);
    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["product_v1.notification.created", "product_v1.notification_preferences.updated"])
    );
  });

  it("applies v1 notification preferences to API-triggered transport sends", async () => {
    const owner = await registerAndLogin("notification-preferences-owner@example.test");
    const { organization } = await createOrganization(owner.cookie, "Notification Preferences Org");
    await postJson(
      `/organizations/${organization.id}/notification-channels`,
      {
        type: "email",
        destination: "preferences@example.test"
      },
      owner.cookie
    );

    const preferencesResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/notification-preferences`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: owner.cookie
        },
        body: JSON.stringify({
          digestFrequency: "off",
          suppressedCategories: ["compliance"]
        })
      }
    );
    expect(preferencesResponse.status).toBe(200);

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
      findingKey: "mock.identity.admin_mfa_missing.suppressed_admin_1",
      title: "Suppressed admin MFA missing",
      summary: "A privileged account has no MFA.",
      severity: "critical",
      status: "open",
      evidence: {}
    });

    const evaluationResponse = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "55555555-5555-4555-8555-555555555555",
        providerConnectionId: connection.id,
        jurisdiction: "EU"
      },
      owner.cookie
    );
    expect(evaluationResponse.status).toBe(200);

    expect(emailTransport.sends.some((send) => send.eventType === "CRITICAL_GAP_DETECTED")).toBe(false);
    expect(await services.notificationRepository.listLogs(organization.id)).toEqual([]);
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
