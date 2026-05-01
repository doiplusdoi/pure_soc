import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildRoNis2NotificationDraftEnvelope, classifyRoNis2Entity } from "@puresoc/country-pack-ro";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("notification draft runtime persistence API", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-05-01T12:00:00.000Z")
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

  const getJson = (path: string, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      headers: cookie ? { cookie } : undefined
    });

  const registerAndLogin = async (email: string) => {
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: "Notification Draft User"
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
        name: "Notification Draft Org",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  it("creates and reads organization-scoped generic drafts with Romania companion links", async () => {
    const owner = await registerAndLogin("notification-owner@example.test");
    const other = await registerAndLogin("notification-other@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const classification = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });
    const envelope = buildRoNis2NotificationDraftEnvelope({
      answers: {
        entity: {
          legalName: "Example SA"
        }
      },
      classification,
      generatedAt: "2026-05-01T11:00:00.000Z",
      locale: "ro-RO",
      status: "ready_for_review"
    });
    const onboardingProgressId = randomUUID();
    const classificationRunId = randomUUID();

    const createResponse = await postJson(
      `/organizations/${organization.id}/compliance/nis2/notification-drafts`,
      {
        assessmentId: randomUUID(),
        payload: envelope,
        status: "ready_for_review",
        metadata: {
          roNis2: {
            onboardingProgressId,
            classificationRunId
          }
        }
      },
      owner.cookie
    );

    expect(createResponse.status).toBe(201);
    const createBody = await readJson<{
      notificationDraft: { id: string; jurisdiction: string; payload: { legalCaveatLocale: string } };
      roNis2CompanionDraft: {
        classificationRunId: string;
        notificationDraftId: string;
        onboardingProgressId: string;
      };
    }>(createResponse);
    expect(createBody.notificationDraft).toMatchObject({
      jurisdiction: "RO",
      payload: {
        legalCaveatLocale: "en"
      }
    });
    expect(createBody.roNis2CompanionDraft).toMatchObject({
      classificationRunId,
      notificationDraftId: createBody.notificationDraft.id,
      onboardingProgressId
    });
    expect(services.auditSink.findByAction("notification_draft.created")).toHaveLength(1);

    const readResponse = await getJson(
      `/organizations/${organization.id}/compliance/nis2/notification-drafts/${createBody.notificationDraft.id}`,
      owner.cookie
    );
    expect(readResponse.status).toBe(200);
    await expect(readJson<unknown>(readResponse)).resolves.toMatchObject({
      notificationDraft: {
        id: createBody.notificationDraft.id
      },
      roNis2CompanionDraft: {
        notificationDraftId: createBody.notificationDraft.id
      }
    });

    const listResponse = await getJson(
      `/organizations/${organization.id}/compliance/nis2/notification-drafts?jurisdiction=RO&status=ready_for_review`,
      owner.cookie
    );
    expect(listResponse.status).toBe(200);
    const listBody = await readJson<{ notificationDrafts: Array<{ id: string }> }>(listResponse);
    expect(listBody.notificationDrafts.map((draft) => draft.id)).toEqual([createBody.notificationDraft.id]);

    const crossOrgRead = await getJson(
      `/organizations/${organization.id}/compliance/nis2/notification-drafts/${createBody.notificationDraft.id}`,
      other.cookie
    );
    expect(crossOrgRead.status).toBe(403);
  });

  it("rejects invalid generic envelopes before persistence", async () => {
    const owner = await registerAndLogin("notification-invalid@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const response = await postJson(
      `/organizations/${organization.id}/compliance/nis2/notification-drafts`,
      {
        payload: {
          frameworkKey: "nis2",
          jurisdiction: "RO",
          legalCaveat: "Certified compliant.",
          notificationType: "country_registration"
        }
      },
      owner.cookie
    );

    expect(response.status).toBe(400);
    const body = await readJson<{ error: { code: string; message: string } }>(response);
    expect(body.error).toMatchObject({
      code: "invalid_request"
    });
    expect(body.error.message).toContain("Invalid notification draft payload");
    await expect(services.notificationDrafts.listNotificationDrafts({ organizationId: organization.id })).resolves.toEqual(
      []
    );
  });
});
