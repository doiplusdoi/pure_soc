import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;
const password = "CorrectHorseBatteryStaple42!";

describe("country-aware NIS2 onboarding API routes", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-06-19T08:00:00.000Z")
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
      displayName: "NIS2 Onboarding User"
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
        name: "PL Country Pack Workspace",
        primaryCountryCode: "PL"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  it("persists PL onboarding, classifies saved answers, and generates report v1 from stored analysis", async () => {
    const owner = await registerAndLogin("nis2-pl-owner@example.test");
    const other = await registerAndLogin("nis2-pl-other@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const basePath = `/organizations/${organization.id}/compliance/nis2/onboarding/PL`;

    const incompleteSave = await putJson(
      basePath,
      {
        answers: {
          company: {
            legalName: "Pierogi Cloud Sp. z o.o."
          }
        },
        currentScreen: "company"
      },
      owner.cookie
    );
    expect(incompleteSave.status).toBe(200);
    const incompleteBody = await readJson<{ progress: { missingRequiredFields: string[] } }>(incompleteSave);
    expect(incompleteBody.progress.missingRequiredFields).toContain("contacts.primaryEmail");

    const blockedReport = await postJson(`${basePath}/report`, {}, owner.cookie);
    expect(blockedReport.status).toBe(400);

    const completeSave = await putJson(
      basePath,
      {
        answers: completePolandAnswers(),
        currentScreen: "review"
      },
      owner.cookie
    );
    const completeSaveText = await completeSave.text();
    expect(completeSave.status, completeSaveText).toBe(200);
    const saveBody = JSON.parse(completeSaveText) as {
      progress: {
        assessmentId: string;
        completedScreens: string[];
        countryCode: string;
        missingRequiredFields: string[];
      };
    };
    expect(saveBody.progress.countryCode).toBe("PL");
    expect(saveBody.progress.completedScreens).toHaveLength(11);
    expect(saveBody.progress.missingRequiredFields).toEqual([]);

    const rejectedReopen = await fetch(`${baseUrl}${basePath}`, {
      headers: {
        cookie: other.cookie
      }
    });
    expect(rejectedReopen.status).toBe(403);

    const classificationResponse = await postJson(`${basePath}/classification`, {}, owner.cookie);
    expect(classificationResponse.status).toBe(201);
    const classificationBody = await readJson<{
      classification: { result: string };
      classificationRun: { countryCode: string; result: string };
    }>(classificationResponse);
    expect(classificationBody.classification.result).toBe("possibly_in_scope");
    expect(classificationBody.classificationRun).toMatchObject({
      countryCode: "PL",
      result: "possibly_in_scope"
    });

    const reportResponse = await postJson(`${basePath}/report`, {}, owner.cookie);
    expect(reportResponse.status).toBe(201);
    const reportBody = await readJson<{
      assessmentId: string;
      report: {
        assessmentId: string;
        legalCaveat: string;
        reportData: {
          jurisdiction: string;
          reportType: string;
          version: {
            countryPackVersion: string;
            onboardingSchemaVersion: string;
            reportVersion: number;
            triggerType: string;
          };
        };
      };
    }>(reportResponse);
    expect(reportBody.assessmentId).toBe(saveBody.progress.assessmentId);
    expect(reportBody.report.assessmentId).toBe(saveBody.progress.assessmentId);
    expect(reportBody.report.legalCaveat).toMatch(/not a legal opinion/i);
    expect(reportBody.report.reportData).toMatchObject({
      jurisdiction: "PL",
      reportType: "internal_readiness",
      version: {
        countryPackVersion: "2026.06.demo",
        reportVersion: 1,
        triggerType: "onboarding_completed"
      }
    });
    expect(reportBody.report.reportData.version.onboardingSchemaVersion).toContain("puresoc.nis2.country_onboarding.v2");
    expect(services.auditSink.findByAction("nis2.onboarding.saved")).toHaveLength(2);
    expect(services.auditSink.findByAction("nis2.classification.created")).toHaveLength(1);
    expect(services.auditSink.findByAction("nis2.onboarding.report.generated")).toHaveLength(1);
  });

  it("audits the classification run when report generation auto-classifies saved onboarding", async () => {
    const owner = await registerAndLogin("nis2-auto-report@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const basePath = `/organizations/${organization.id}/compliance/nis2/onboarding/PL`;

    const saveResponse = await putJson(
      basePath,
      {
        answers: completePolandAnswers(),
        currentScreen: "review"
      },
      owner.cookie
    );
    expect(saveResponse.status).toBe(200);

    const reportResponse = await postJson(`${basePath}/report`, {}, owner.cookie);
    expect(reportResponse.status).toBe(201);
    const reportBody = await readJson<{
      classificationRun: { countryCode: string; result: string };
      report: { reportData: { version: { reportVersion: number } } };
    }>(reportResponse);
    expect(reportBody.classificationRun).toMatchObject({
      countryCode: "PL",
      result: "possibly_in_scope"
    });
    expect(reportBody.report.reportData.version.reportVersion).toBe(1);
    expect(services.auditSink.findByAction("nis2.classification.created")).toHaveLength(1);
    expect(services.auditSink.findByAction("nis2.onboarding.report.generated")).toHaveLength(1);
  });
});

const completePolandAnswers = () => ({
  company: {
    legalName: "Pierogi Cloud Sp. z o.o.",
    countryCode: "PL"
  },
  locations: {
    headquartersCountry: "PL",
    headquartersCity: "Warsaw"
  },
  contacts: {
    primaryName: "Ada Nowak",
    primaryEmail: "ada@pierogi-cloud.example",
    securityName: "Jan Security",
    securityEmail: "security@pierogi-cloud.example",
    managementOwnerName: "Marta Owner"
  },
  business: {
    sector: "food",
    mainProductsServices: "Food logistics platform for regional producers.",
    countriesServed: ["PL", "DE"],
    employeeCount: 72
  },
  size: {
    sizeCategory: "medium",
    legalStructure: "standalone"
  },
  scope: {
    activities: ["food"],
    publicAdministration: false,
    telecomProvider: false
  },
  systems: {
    systemsDescription: "Customer platform, identity tenant, collaboration, and logistics integrations.",
    publicIpRanges: ["203.0.113.0/28"]
  },
  providers: {
    microsoft365Usage: "identity_devices_security"
  },
  dependencies: {
    criticalSuppliers: ["Microsoft 365", "regional logistics SaaS"],
    backupArrangements: "implemented encrypted backups with quarterly restore tests",
    businessContinuity: "implemented continuity plan reviewed by management",
    incidentResponse: "implemented incident-response runbook and escalation rota"
  },
  governance: {
    riskManagement: "implemented annual cyber risk review",
    identityControls: "implemented least-privilege access reviews",
    mfa: "implemented MFA for all privileged users",
    supplyChainSecurity: "implemented supplier security questionnaire"
  },
  review: {
    assumptions: "Demo onboarding for internal readiness only.",
    legalCaveatAcknowledged: true
  }
});
