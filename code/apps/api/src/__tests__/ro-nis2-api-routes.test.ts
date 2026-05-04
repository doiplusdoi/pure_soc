import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseCountryPackNotificationDraftEnvelope } from "@puresoc/country-packs-core";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;
const password = "CorrectHorseBatteryStaple42!";

describe("ro nis2 API routes", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-05-04T08:00:00.000Z")
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

  const putJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "PUT",
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
      displayName: "M78 Romania User"
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
        name: "M78 Romania Workspace",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  it("returns the Romania onboarding schema without embedding classifier logic in the route", async () => {
    const response = await fetch(`${baseUrl}/compliance/nis2/ro/onboarding/schema`);
    const body = await readJson<{
      frameworkKey: string;
      jurisdiction: string;
      schema: Array<{ key: string; sourceMapIds: string[] }>;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.jurisdiction).toBe("RO");
    expect(body.frameworkKey).toBe("nis2");
    expect(body.schema.find((step) => step.key === "services")?.sourceMapIds[0]).toBe(
      "ro-nis2-service_options-none_of_oug_155_2024_services"
    );
  });

  it("delegates Romania classification to the country-pack service", async () => {
    const response = await fetch(`${baseUrl}/compliance/nis2/ro/classification`, {
      body: JSON.stringify({
        relationship: {
          establishedInRomania: true
        },
        selectedServiceTypeCodes: ["101101"],
        sizeCategory: "medium"
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    const body = await readJson<{ classification: { result: string; sourceMapLinks: Array<{ sourceMapId: string }> } }>(
      response
    );

    expect(response.status).toBe(200);
    expect(body.classification.result).toBe("important_entity");
    expect(body.classification.sourceMapLinks.map((link) => link.sourceMapId)).toContain(
      "ro-nis2-classification_rules-classification_rule_9_energie_transport_bancar_financiar_sanatate_potabila_uzate_spatial_ixp"
    );
  });

  it("returns a generic notification draft envelope beside the Romania compatibility draft", async () => {
    const classificationResponse = await fetch(`${baseUrl}/compliance/nis2/ro/classification`, {
      body: JSON.stringify({
        relationship: {
          establishedInRomania: true
        },
        selectedServiceTypeCodes: ["101101"],
        sizeCategory: "medium"
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    const classificationBody = await readJson<{ classification: unknown }>(classificationResponse);
    const response = await fetch(`${baseUrl}/compliance/nis2/ro/notification-draft`, {
      body: JSON.stringify({
        answers: {
          entity: {
            legalName: "Example SA"
          }
        },
        classification: classificationBody.classification,
        locale: "ro-RO"
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    const body = await readJson<{
      draft: { notificationType: string; payloadSchemaKey: string };
      notificationDraftEnvelope: unknown;
    }>(response);
    const envelope = parseCountryPackNotificationDraftEnvelope(body.notificationDraftEnvelope);

    expect(response.status).toBe(200);
    expect(body.draft).toMatchObject({
      notificationType: "ro_nis2_registration_notification",
      payloadSchemaKey: "ro.nis2.registration_notification.v1"
    });
    expect(envelope).toMatchObject({
      jurisdiction: "RO",
      legalCaveatLocale: "en",
      locale: "ro",
      notificationType: "country_registration",
      payloadSchemaKey: "ro.nis2.registration_notification.v1"
    });
  });

  it("persists organization-scoped Romania onboarding, classifies saved answers, and creates a source-linked draft", async () => {
    const owner = await registerAndLogin("m78-ro-owner@example.test");
    const other = await registerAndLogin("m78-ro-other@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const answers = {
      activity: {
        mainNaceCode: "6201"
      },
      address: {
        city: "Cluj-Napoca",
        country: "Romania",
        county: "Cluj",
        street: "Strada Memorandumului"
      },
      contact: {
        email: "security@m78.example.test"
      },
      entity: {
        cui: "RO78451230",
        legalName: "M78 Real Data SRL",
        nationalRegistrationNumber: "J12/7845/2026"
      },
      network: {
        systemsDescription: "Local identity, collaboration, and customer support systems."
      },
      relationship: {
        criticalEntityInRomaniaLaw294: false,
        establishedInRomania: true,
        mainOfficeInRomania: true,
        providesServicesInAnotherEuMemberState: false,
        providesServicesInRomania: true,
        publicAdministrationEstablishedByRomania: false
      },
      selectedServiceTypeCodes: ["108004"],
      size: {
        employeeCount: 72,
        sizeCategory: "medium"
      }
    };

    const saveResponse = await putJson(
      `/organizations/${organization.id}/compliance/nis2/ro/onboarding`,
      {
        answers
      },
      owner.cookie
    );
    expect(saveResponse.status).toBe(200);
    const saveBody = await readJson<{ progress: { answers: { entity: { legalName: string } }; id: string } }>(
      saveResponse
    );
    expect(saveBody.progress.answers.entity.legalName).toBe("M78 Real Data SRL");

    const reopenResponse = await fetch(`${baseUrl}/organizations/${organization.id}/compliance/nis2/ro/onboarding`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(reopenResponse.status).toBe(200);
    const reopenBody = await readJson<{
      legalActivation: { productionActivated: boolean; status: string };
      progress: { id: string; missingRequiredFields: string[] };
    }>(reopenResponse);
    expect(reopenBody.progress.id).toBe(saveBody.progress.id);
    expect(reopenBody.progress.missingRequiredFields).toEqual([]);
    expect(reopenBody.legalActivation).toMatchObject({
      productionActivated: false,
      status: "review_required"
    });

    const rejectedReopen = await fetch(`${baseUrl}/organizations/${organization.id}/compliance/nis2/ro/onboarding`, {
      headers: {
        cookie: other.cookie
      }
    });
    expect(rejectedReopen.status).toBe(403);

    const classificationResponse = await postJson(
      `/organizations/${organization.id}/compliance/nis2/ro/classification`,
      {},
      owner.cookie
    );
    expect(classificationResponse.status).toBe(201);
    const classificationBody = await readJson<{
      classification: { result: string; sourceMapLinks: Array<{ sourceMapId: string }> };
      classificationRun: { onboardingProgressId: string; result: string };
    }>(classificationResponse);
    expect(classificationBody.classification.result).toBe("important_entity");
    expect(classificationBody.classificationRun.onboardingProgressId).toBe(saveBody.progress.id);
    expect(classificationBody.classification.sourceMapLinks.map((link) => link.sourceMapId)).toContain(
      "ro-nis2-classification_rules-classification_rule_8_furnizorii_de_servicii_de_cloud_computing_furnizorii_de_servicii_de_centre_de_date_furnizorii_de_retele_de_furnizare_de_continut_furnizorii_de_servicii_gestionate"
    );

    const draftResponse = await postJson(
      `/organizations/${organization.id}/compliance/nis2/ro/notification-draft/from-onboarding`,
      {
        locale: "ro-RO"
      },
      owner.cookie
    );
    expect(draftResponse.status).toBe(201);
    const draftBody = await readJson<{
      draft: { fields: Array<{ key: string; value: unknown }>; submission: { submittedToDnsc: boolean } };
      notificationDraft: { payload: unknown };
      roNis2CompanionDraft: { onboardingProgressId: string };
    }>(draftResponse);
    expect(draftBody.draft.fields.find((field) => field.key === "notification_c9")?.value).toBe(
      "M78 Real Data SRL"
    );
    expect(draftBody.draft.submission.submittedToDnsc).toBe(false);
    expect(draftBody.roNis2CompanionDraft.onboardingProgressId).toBe(saveBody.progress.id);
    expect(parseCountryPackNotificationDraftEnvelope(draftBody.notificationDraft.payload)).toMatchObject({
      jurisdiction: "RO",
      notificationType: "country_registration"
    });

    expect(services.auditSink.findByAction("ro_nis2.onboarding.saved")).toHaveLength(1);
    expect(services.auditSink.findByAction("ro_nis2.classification.created")).toHaveLength(1);
    expect(services.auditSink.findByAction("notification_draft.created")).toHaveLength(1);
  });
});
