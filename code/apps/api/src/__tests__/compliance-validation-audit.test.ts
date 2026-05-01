import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("api compliance validation audit hardening", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-04-30T11:00:00.000Z")
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
      displayName: "Compliance Validation User"
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
        name: "Compliance Validation Org",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  it("returns 200 for synchronous compliance evaluation and audits the result summary", async () => {
    const owner = await registerAndLogin("m2-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "assessment_m2",
        jurisdiction: "EU",
        countryPack: {
          countryCode: "RO",
          completeness: "requires_legal_review"
        }
      },
      owner.cookie
    );

    expect(response.status).toBe(200);
    const body = await readJson<{
      results: Array<{ status: string }>;
      gaps: unknown[];
      countryPackWarnings: Array<{ featureKey: string }>;
    }>(response);

    expect(body.results.some((result) => result.status === "passing")).toBe(false);
    expect(body.countryPackWarnings).toContainEqual(
      expect.objectContaining({
        featureKey: "requires_legal_review"
      })
    );

    const auditRecords = services.auditSink.findByAction("compliance.assessment.evaluated");
    expect(auditRecords).toHaveLength(1);
    expect(auditRecords[0]).toMatchObject({
      organizationId: organization.id,
      targetId: "assessment_m2"
    });
    expect(auditRecords[0]?.afterJson).toMatchObject({
      assessmentId: "assessment_m2",
      controlsEvaluated: 10,
      recommendationsCount: body.gaps.length
    });
  });

  it("rejects malformed compliance evaluation bodies before evaluation", async () => {
    const owner = await registerAndLogin("m2-malformed@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "assessment_malformed",
        evidenceArtifacts: [
          {
            id: 123,
            controlId: "nis2.access-control.mfa"
          }
        ]
      },
      owner.cookie
    );

    expect(response.status).toBe(400);
    expect(services.auditSink.findByAction("compliance.assessment.evaluated")).toHaveLength(0);
  });

  it("rejects cross-organization compliance and recommendation access through RBAC", async () => {
    const owner = await registerAndLogin("m2-rbac-owner@example.test");
    const other = await registerAndLogin("m2-rbac-other@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const complianceResponse = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "assessment_cross_org"
      },
      other.cookie
    );
    expect(complianceResponse.status).toBe(403);

    const recommendationResponse = await postJson(
      `/organizations/${organization.id}/recommendations/generate`,
      {
        gaps: [validGap(organization.id)]
      },
      other.cookie
    );
    expect(recommendationResponse.status).toBe(403);
  });

  it("rejects wrong-organization recommendation gaps", async () => {
    const owner = await registerAndLogin("m2-rec-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await postJson(
      `/organizations/${organization.id}/recommendations/generate`,
      {
        gaps: [validGap("org_from_body")]
      },
      owner.cookie
    );

    expect(response.status).toBe(400);
    expect(services.auditSink.findByAction("compliance.recommendations.generated")).toHaveLength(0);
  });

  it("validates recommendation gaps and audits generated recommendations", async () => {
    const owner = await registerAndLogin("m2-rec-audit@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await postJson(
      `/organizations/${organization.id}/recommendations/generate`,
      {
        gaps: [validGap(organization.id)]
      },
      owner.cookie
    );

    expect(response.status).toBe(200);
    const body = await readJson<{ recommendations: Array<{ organizationId: string; controlId: string }> }>(response);
    expect(body.recommendations).toHaveLength(1);
    expect(body.recommendations[0]).toMatchObject({
      organizationId: organization.id,
      controlId: "nis2.risk-policy"
    });

    const auditRecords = services.auditSink.findByAction("compliance.recommendations.generated");
    expect(auditRecords).toHaveLength(1);
    expect(auditRecords[0]).toMatchObject({
      organizationId: organization.id,
      targetId: "assessment_m2"
    });
    expect(auditRecords[0]?.afterJson).toMatchObject({
      assessmentIds: ["assessment_m2"],
      gapsCount: 1,
      recommendationsCount: 1,
      controlIds: ["nis2.risk-policy"]
    });
  });
});

const validGap = (organizationId: string) => ({
  id: "assessment_m2:nis2.risk-policy:gap",
  organizationId,
  assessmentId: "assessment_m2",
  jurisdiction: "EU",
  controlId: "nis2.risk-policy",
  controlCode: "NIS2-EU-RISK-001",
  status: "needs_evidence",
  severity: "medium",
  confidence: "medium",
  summary: "Risk policy evidence is missing.",
  findings: [],
  missingEvidence: ["Approved risk analysis or information security policy"],
  recommendedActions: ["Upload or link evidence: Approved risk analysis or information security policy"],
  providerSignals: [],
  manualTasks: [],
  countryPackWarnings: [],
  sourceReferences: [
    {
      sourceRecordId: "eu-nis2-directive-2022-2555",
      article: "21",
      paragraph: "2(a)"
    }
  ]
});
