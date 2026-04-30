import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("regulatory source review task API", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-04-30T12:00:00.000Z")
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

  const registerLoginAndCreateOrganization = async () => {
    const registerResponse = await postJson("/auth/register", {
      email: "regulatory-admin@example.test",
      password,
      displayName: "Regulatory Admin"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email: "regulatory-admin@example.test",
      password
    });
    expect(loginResponse.status).toBe(200);
    const loginBody = await readJson<{ user: { id: string } }>(loginResponse);
    const cookie = loginResponse.headers.get("set-cookie") ?? "";

    const organizationResponse = await postJson(
      "/organizations",
      {
        name: "Regulatory Review Org",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(organizationResponse.status).toBe(201);
    const organizationBody = await readJson<{ organization: { id: string } }>(organizationResponse);

    return {
      cookie,
      organizationId: organizationBody.organization.id,
      userId: loginBody.user.id
    };
  };

  it("requires regulatory_admin to activate reviewed source versions and keeps source-map traceability", async () => {
    const { cookie, organizationId, userId } = await registerLoginAndCreateOrganization();
    const imported = await services.regulatorySources.importSourceVersion({
      organizationId,
      source: roWorkbookSource("source_ro"),
      sourceVersion: {
        id: "source_version_ro_v2_1",
        versionLabel: "V2.1 ENG_45915"
      },
      importValidationReport: {
        status: "validated",
        sourceMapCoverage: {
          passed: true,
          ratio: 1
        }
      },
      sourceMapEntries: [
        {
          targetCollection: "classification_rules",
          targetKey: "rule_dns_tld",
          sourceLocation: "Algoritm clasificare!A4:H4",
          mappingJson: {
            sourceMapId: "ro-nis2-classification_rules-rule_dns_tld"
          }
        }
      ],
      evaluation: {
        validationPassed: true,
        containsLegalLogicChange: true
      }
    });

    const taskId = imported.reviewTask?.id ?? "";
    const forbiddenActivation = await postJson(
      `/organizations/${organizationId}/regulatory-sources/review-tasks/${taskId}/activate`,
      {},
      cookie
    );
    expect(forbiddenActivation.status).toBe(403);

    await services.repository.addRoleBindingForTest({
      organizationId,
      userId,
      roleKey: "regulatory_admin"
    });

    const reviewTasksResponse = await fetch(
      `${baseUrl}/organizations/${organizationId}/regulatory-sources/review-tasks?status=open`,
      {
        headers: {
          cookie
        }
      }
    );
    expect(reviewTasksResponse.status).toBe(200);
    await expect(readJson<{ reviewTasks: Array<{ id: string; status: string }> }>(reviewTasksResponse)).resolves.toMatchObject({
      reviewTasks: [
        {
          id: taskId,
          status: "open"
        }
      ]
    });

    const reviewResponse = await postJson(
      `/organizations/${organizationId}/regulatory-sources/review-tasks/${taskId}/review`,
      {
        notes: "Source map and validation report checked."
      },
      cookie
    );
    expect(reviewResponse.status).toBe(200);

    const activationResponse = await postJson(
      `/organizations/${organizationId}/regulatory-sources/review-tasks/${taskId}/activate`,
      {},
      cookie
    );
    expect(activationResponse.status).toBe(200);
    await expect(
      readJson<{ sourceVersion: { activationStatus: string }; reviewTask: { status: string } }>(activationResponse)
    ).resolves.toMatchObject({
      sourceVersion: {
        activationStatus: "active"
      },
      reviewTask: {
        status: "activated"
      }
    });

    const traceabilityResponse = await fetch(
      `${baseUrl}/organizations/${organizationId}/regulatory-sources/source-versions/source_version_ro_v2_1/source-map`,
      {
        headers: {
          cookie
        }
      }
    );
    expect(traceabilityResponse.status).toBe(200);
    await expect(
      readJson<{
        sourceMapEntries: Array<{ targetCollection: string; sourceLocation: string }>;
        reviewDecisions: Array<{ decision: string }>;
      }>(traceabilityResponse)
    ).resolves.toMatchObject({
      sourceMapEntries: [
        {
          targetCollection: "classification_rules",
          sourceLocation: "Algoritm clasificare!A4:H4"
        }
      ],
      reviewDecisions: [
        {
          decision: "reviewed"
        },
        {
          decision: "activated"
        }
      ]
    });

    expect(services.auditSink.findByAction("regulatory.review_task.reviewed")).toHaveLength(1);
    expect(services.auditSink.findByAction("regulatory.source_version.activated")).toHaveLength(1);
  });
});

const roWorkbookSource = (id: string) => ({
  id,
  frameworkKey: "nis2" as const,
  jurisdiction: "RO",
  sourceType: "internal_excel_seed" as const,
  title: "nis2ro-tool-v-2-1.xlsx",
  localFilePath: "data/regulatory/countries/ro/nis2ro-tool-v-2-1.xlsx",
  publicationDate: null,
  lastCheckedAt: "2026-04-30T00:00:00.000Z",
  versionLabel: "V2.1 ENG_45915",
  authorityName: "DNSC",
  trustLevel: "internal_seed" as const,
  activeVersionId: null,
  notes: "Generated workbook seed; legal activation requires review."
});
