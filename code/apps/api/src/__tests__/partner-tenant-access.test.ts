import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import type { StoredAnalysisRecordContract } from "@puresoc/database";
import type { RecommendationContract } from "@puresoc/recommendations";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("partner tenant access integration", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;
  let now = new Date("2026-06-19T09:00:00.000Z");

  beforeEach(() => {
    now = new Date("2026-06-19T09:00:00.000Z");
    services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "false"
        }
      }),
      now: () => now
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
      displayName: email.split("@")[0]
    });
    expect(registerResponse.status).toBe(201);
    const registerBody = await readJson<{ user: { id: string; email: string } }>(registerResponse);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      user: registerBody.user,
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  const createPartnerAndCustomer = async () => {
    const owner = await registerAndLogin("partner-owner@example.test");
    const partnerResponse = await postJson(
      "/partners",
      {
        name: "Asterion Cloud Partners",
        slug: "asterion-cloud"
      },
      owner.cookie
    );
    expect(partnerResponse.status).toBe(201);
    const partnerBody = await readJson<{ partner: { id: string; name: string } }>(partnerResponse);

    const customerResponse = await postJson(
      `/partners/${partnerBody.partner.id}/customers`,
      {
        name: "NordFrucht GmbH",
        legalName: "NordFrucht GmbH",
        primaryCountryCode: "DE",
        accessLevel: "admin"
      },
      owner.cookie
    );
    expect(customerResponse.status).toBe(201);
    const customerBody = await readJson<{
      organization: { id: string; name: string; primaryCountryCode: string; defaultLocale: string };
      grant: { id: string; organizationId: string; status: string; grantLevel: string };
    }>(customerResponse);
    expect(customerBody.organization.defaultLocale).toBe("de-DE");

    return {
      owner,
      partnerId: partnerBody.partner.id,
      organizationId: customerBody.organization.id,
      grantId: customerBody.grant.id
    };
  };

  const createPartnerCustomer = async (
    partnerId: string,
    ownerCookie: string,
    input: { accessLevel: "admin" | "analyst" | "viewer"; name: string; primaryCountryCode?: string }
  ) => {
    const customerResponse = await postJson(
      `/partners/${partnerId}/customers`,
      {
        name: input.name,
        legalName: input.name,
        primaryCountryCode: input.primaryCountryCode ?? "RO",
        accessLevel: input.accessLevel
      },
      ownerCookie
    );
    expect(customerResponse.status).toBe(201);
    return readJson<{
      organization: { id: string; name: string; primaryCountryCode: string };
      grant: { id: string; organizationId: string; status: string; grantLevel: string };
    }>(customerResponse);
  };

  const addPartnerMember = async (
    partnerId: string,
    userId: string,
    role: "admin" | "analyst" | "viewer"
  ) => {
    await services.partnerRepository.createPartnerMember({
      id: `member-${role}-${userId}`,
      partnerId,
      userId,
      role,
      status: "active",
      createdAt: now,
      updatedAt: now
    });
  };

  const startCustomerSession = async (
    cookie: string,
    input: { organizationId: string; partnerId: string; reason: string }
  ) => {
    const startResponse = await postJson(
      `/partners/${input.partnerId}/tenant-access-sessions`,
      {
        organizationId: input.organizationId,
        reason: input.reason
      },
      cookie
    );
    expect(startResponse.status).toBe(201);
    const startBody = await readJson<{
      tenantSession: { id: string; effectiveOrganizationId: string; status: string };
    }>(startResponse);

    const selectResponse = await postJson(
      "/auth/session/active-organization",
      {
        organizationId: input.organizationId
      },
      cookie
    );
    expect(selectResponse.status).toBe(200);

    return startBody.tenantSession;
  };

  const uploadEvidence = (cookie: string, organizationId: string) =>
    postJson(
      `/organizations/${organizationId}/evidence/upload`,
      {
        title: "Partner session readiness note",
        content: "Evidence captured during partner review.",
        mimeType: "text/plain",
        sourceType: "manual_upload"
      },
      cookie
    );

  const generateRecommendations = (cookie: string, organizationId: string) =>
    postJson(
      `/organizations/${organizationId}/recommendations/generate`,
      {
        gaps: [],
        context: {
          countryCode: "RO",
          sector: "food distribution"
        }
      },
      cookie
    );

  it("creates a partner, creates a customer tenant with an explicit grant, and lists the portfolio", async () => {
    const { owner, partnerId, organizationId } = await createPartnerAndCustomer();
    await services.outputRepository.saveStoredAnalysis(storedAnalysisFixture(organizationId));
    await services.providerConnections.store.createConnection({
      organizationId,
      providerKey: "microsoft365",
      displayName: "Microsoft 365",
      externalTenantId: "tenant_nordfrucht",
      externalTenantName: "NordFrucht GmbH",
      status: "connected",
      readEnabled: true,
      writeEnabled: false,
      metadata: {
        mode: "fixture"
      }
    });

    const partnersResponse = await fetch(`${baseUrl}/partners`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(partnersResponse.status).toBe(200);
    await expect(readJson<{ partners: Array<{ partner: { id: string }; membership: { role: string } }> }>(partnersResponse))
      .resolves.toMatchObject({
        partners: [
          {
            partner: { id: partnerId },
            membership: { role: "owner" }
          }
        ]
      });

    const portfolioResponse = await fetch(`${baseUrl}/partners/${partnerId}/portfolio`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(portfolioResponse.status).toBe(200);
    await expect(
      readJson<{ grants: Array<{ organizationId: string; status: string; organization: { name: string } }> }>(
        portfolioResponse
      )
    ).resolves.toMatchObject({
      metrics: {
        totalCustomerTenants: 1,
        completedAssessments: 1,
        customersLikelyOrPossiblyInScope: 1,
        connectedMicrosoftTenants: 1,
        highPriorityGaps: 2,
        opportunities: 1
      },
      opportunities: [
        {
          customerName: "NordFrucht GmbH",
          opportunityType: "microsoft_security_capability_evaluation",
          priority: "high",
          relevantMicrosoftCapabilityOrPlan: "Microsoft 365 Business Premium",
          affectedUsers: 72,
          nextAction: "Add supplier continuity and endpoint coverage review to the readiness plan"
        }
      ],
      grants: [
        {
          organizationId,
          status: "active",
          organization: {
            name: "NordFrucht GmbH"
          },
          snapshot: {
            sector: "food distributor",
            likelyClassification: "likely in scope",
            microsoftConnectionState: "connected",
            readinessPercent: 50,
            evidenceConfidencePercent: 60,
            highPriorityGapCount: 2
          }
        }
      ]
    });

    const organizationListResponse = await fetch(`${baseUrl}/organizations`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(organizationListResponse.status).toBe(200);
    await expect(readJson<{ organizations: Array<{ organization: { id: string } }> }>(organizationListResponse)).resolves.toMatchObject({
      organizations: []
    });
  });

  it("requires an active explicit grant before entering a customer tenant", async () => {
    const { owner, partnerId, organizationId, grantId } = await createPartnerAndCustomer();
    await services.outputRepository.saveStoredAnalysis(storedAnalysisFixture(organizationId));
    await services.providerConnections.store.createConnection({
      organizationId,
      providerKey: "microsoft365",
      displayName: "Microsoft 365",
      externalTenantId: "tenant_nordfrucht",
      externalTenantName: "NordFrucht GmbH",
      status: "connected",
      readEnabled: true,
      writeEnabled: false,
      metadata: {
        mode: "fixture"
      }
    });
    await services.partnerRepository.revokePartnerTenantGrant({
      grantId,
      revokedAt: now
    });

    const portfolioResponse = await fetch(`${baseUrl}/partners/${partnerId}/portfolio`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(portfolioResponse.status).toBe(200);
    await expect(
      readJson<{
        metrics: { totalCustomerTenants: number; completedAssessments: number; connectedMicrosoftTenants: number };
        opportunities: unknown[];
        grants: unknown[];
      }>(portfolioResponse)
    ).resolves.toMatchObject({
      metrics: {
        totalCustomerTenants: 0,
        completedAssessments: 0,
        connectedMicrosoftTenants: 0
      },
      opportunities: [],
      grants: []
    });

    const response = await postJson(
      `/partners/${partnerId}/tenant-access-sessions`,
      {
        organizationId,
        reason: "Review customer readiness plan"
      },
      owner.cookie
    );

    expect(response.status).toBe(403);
  });

  it("starts and exits tenant access while preserving real actor and effective tenant in audit context", async () => {
    const { owner, partnerId, organizationId } = await createPartnerAndCustomer();

    const startResponse = await postJson(
      `/partners/${partnerId}/tenant-access-sessions`,
      {
        organizationId,
        reason: "Prepare customer NIS2 readiness review"
      },
      owner.cookie
    );
    expect(startResponse.status).toBe(201);
    const startBody = await readJson<{
      tenantSession: { id: string; realActorUserId: string; effectiveOrganizationId: string; status: string };
    }>(startResponse);
    expect(startBody.tenantSession).toMatchObject({
      realActorUserId: owner.user.id,
      effectiveOrganizationId: organizationId,
      status: "active"
    });

    const selectResponse = await postJson(
      "/auth/session/active-organization",
      {
        organizationId
      },
      owner.cookie
    );
    expect(selectResponse.status).toBe(200);

    const scopedMembersResponse = await fetch(`${baseUrl}/organizations/${organizationId}/members`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(scopedMembersResponse.status).toBe(200);

    const dashboardResponse = await fetch(`${baseUrl}/api/dashboard`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(dashboardResponse.status).toBe(200);
    await expect(
      readJson<{ dashboard: { workspace: { id: string; name: string; countryCode: string } } }>(dashboardResponse)
    ).resolves.toMatchObject({
      dashboard: {
        workspace: {
          id: organizationId,
          name: "NordFrucht GmbH",
          countryCode: "DE"
        }
      }
    });

    const currentResponse = await fetch(`${baseUrl}/partners/${partnerId}/tenant-access-sessions/current`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(currentResponse.status).toBe(200);
    await expect(
      readJson<{ tenantSession: { id: string; effectiveOrganizationId: string; status: string } | null }>(
        currentResponse
      )
    ).resolves.toMatchObject({
      tenantSession: {
        id: startBody.tenantSession.id,
        effectiveOrganizationId: organizationId,
        status: "active"
      }
    });

    const nestedResponse = await postJson(
      `/partners/${partnerId}/tenant-access-sessions`,
      {
        organizationId,
        reason: "Nested customer access should fail"
      },
      owner.cookie
    );
    expect(nestedResponse.status).toBe(403);

    const startAudit = services.auditSink.findByAction("partner.tenant_access.started")[0];
    expect(startAudit).toMatchObject({
      actorUserId: owner.user.id,
      organizationId
    });
    expect(startAudit?.contextJson).toMatchObject({
      partnerId,
      tenantSessionId: startBody.tenantSession.id,
      effectiveOrganizationId: organizationId,
      realActorUserId: owner.user.id,
      reason: "Prepare customer NIS2 readiness review"
    });

    const exitResponse = await postJson(
      `/partners/${partnerId}/tenant-access-sessions/${startBody.tenantSession.id}/exit`,
      {},
      owner.cookie
    );
    expect(exitResponse.status).toBe(200);
    await expect(readJson<{ tenantSession: { status: string; endReason: string } }>(exitResponse)).resolves.toMatchObject({
      tenantSession: {
        status: "ended",
        endReason: "exited_by_actor"
      }
    });

    const currentAfterExitResponse = await fetch(`${baseUrl}/partners/${partnerId}/tenant-access-sessions/current`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(currentAfterExitResponse.status).toBe(200);
    await expect(readJson<{ tenantSession: unknown | null }>(currentAfterExitResponse)).resolves.toEqual({
      tenantSession: null
    });
  });

  it("prevents partner viewers from creating customer tenants", async () => {
    const { owner, partnerId } = await createPartnerAndCustomer();
    const viewer = await registerAndLogin("partner-viewer@example.test");
    await services.partnerRepository.createPartnerMember({
      id: "11111111-1111-4111-8111-111111111111",
      partnerId,
      userId: viewer.user.id,
      role: "viewer",
      status: "active",
      createdAt: now,
      updatedAt: now
    });

    const response = await postJson(
      `/partners/${partnerId}/customers`,
      {
        name: "Viewer Created Customer",
        primaryCountryCode: "RO"
      },
      viewer.cookie
    );

    expect(response.status).toBe(403);
    expect(services.auditSink.findByAction("partner.tenant_grant.created")).toHaveLength(1);
    expect(services.auditSink.findByAction("partner.tenant_grant.created")[0]?.actorUserId).toBe(owner.user.id);
  });

  it("authorizes customer sessions by partner role, grant level, and route permission", async () => {
    const { owner, partnerId, organizationId } = await createPartnerAndCustomer();
    const viewer = await registerAndLogin("customer-session-viewer@example.test");
    const analyst = await registerAndLogin("customer-session-analyst@example.test");
    const admin = await registerAndLogin("customer-session-admin@example.test");
    const grantLimitedAdmin = await registerAndLogin("customer-session-limited-admin@example.test");
    await addPartnerMember(partnerId, viewer.user.id, "viewer");
    await addPartnerMember(partnerId, analyst.user.id, "analyst");
    await addPartnerMember(partnerId, admin.user.id, "admin");
    await addPartnerMember(partnerId, grantLimitedAdmin.user.id, "admin");

    await startCustomerSession(viewer.cookie, {
      partnerId,
      organizationId,
      reason: "Review customer evidence list"
    });
    const viewerReadResponse = await fetch(`${baseUrl}/organizations/${organizationId}/evidence`, {
      headers: {
        cookie: viewer.cookie
      }
    });
    expect(viewerReadResponse.status).toBe(200);
    expect((await generateRecommendations(viewer.cookie, organizationId)).status).toBe(403);
    expect((await uploadEvidence(viewer.cookie, organizationId)).status).toBe(403);

    const analystSession = await startCustomerSession(analyst.cookie, {
      partnerId,
      organizationId,
      reason: "Generate readiness recommendations"
    });
    expect((await generateRecommendations(analyst.cookie, organizationId)).status).toBe(200);
    expect((await uploadEvidence(analyst.cookie, organizationId)).status).toBe(403);

    const recommendationAudit = services.auditSink
      .findByAction("compliance.recommendations.generated")
      .find((entry) => entry.actorUserId === analyst.user.id);
    expect(recommendationAudit?.contextJson).toMatchObject({
      partnerTenantContext: {
        partnerId,
        tenantSessionId: analystSession.id,
        effectiveOrganizationId: organizationId,
        realActorUserId: analyst.user.id,
        partnerRole: "analyst",
        grantLevel: "admin"
      }
    });

    await startCustomerSession(admin.cookie, {
      partnerId,
      organizationId,
      reason: "Upload readiness evidence"
    });
    expect((await uploadEvidence(admin.cookie, organizationId)).status).toBe(201);

    const viewerGrantCustomer = await createPartnerCustomer(partnerId, owner.cookie, {
      accessLevel: "viewer",
      name: "Viewer Grant Customer SRL"
    });
    await startCustomerSession(grantLimitedAdmin.cookie, {
      partnerId,
      organizationId: viewerGrantCustomer.organization.id,
      reason: "Review viewer grant tenant"
    });
    const grantLimitedReadResponse = await fetch(`${baseUrl}/organizations/${viewerGrantCustomer.organization.id}/evidence`, {
      headers: {
        cookie: grantLimitedAdmin.cookie
      }
    });
    expect(grantLimitedReadResponse.status).toBe(200);
    expect((await generateRecommendations(grantLimitedAdmin.cookie, viewerGrantCustomer.organization.id)).status).toBe(403);
  });
});

const storedAnalysisFixture = (organizationId: string): StoredAnalysisRecordContract => {
  const recommendation = recommendationFixture(organizationId);

  return {
    organizationId,
    assessmentId: "44444444-4444-4444-8444-444444444444",
    jurisdiction: "DE",
    catalogVersion: "puresoc.demo.nis2.v1",
    recordedAt: "2026-06-19T09:30:00.000Z",
    results: [
      {
        id: "assessment_demo:nis2.identity-access:result",
        organizationId,
        assessmentId: "44444444-4444-4444-8444-444444444444",
        controlId: "nis2.identity-access",
        controlCode: "NIS2-EU-ACCESS-001",
        jurisdiction: "EU",
        status: "partial",
        confidence: "medium",
        providerSignalIds: ["m365:mfa-registration:coverage"],
        evidenceArtifactIds: [],
        checklistRunItemIds: [],
        summary: "Identity access coverage is partially evidenced.",
        matchedFindings: [],
        missingEvidence: [],
        manualTasks: [],
        countryPackWarnings: [],
        sourceReferences: [],
        evidenceCompleteness: {
          required: 2,
          present: 1,
          missing: 1,
          ratio: 0.5
        },
        evaluatedAt: "2026-06-19T09:30:00.000Z"
      }
    ],
    gaps: [
      {
        id: "assessment_demo:nis2.identity-access:gap",
        organizationId,
        assessmentId: "44444444-4444-4444-8444-444444444444",
        jurisdiction: "EU",
        controlId: "nis2.identity-access",
        controlCode: "NIS2-EU-ACCESS-001",
        status: "partial",
        severity: "high",
        confidence: "medium",
        summary: "Identity access and endpoint coverage need more evidence.",
        findingIds: ["m365:mfa-registration:coverage"],
        findings: ["MFA registration is partial."],
        missingEvidence: ["Conditional access and managed-device evidence"],
        recommendedActions: ["Improve identity protection"],
        providerSignals: ["m365:mfa-registration:coverage"],
        manualTaskIds: [],
        manualTasks: [],
        countryPackWarnings: [],
        sourceReferences: []
      }
    ],
    recommendations: [recommendation],
    readinessPlan: {
      id: "plan_demo",
      organizationId,
      assessmentId: "44444444-4444-4444-8444-444444444444",
      title: "Demo readiness plan",
      targetReadinessPercent: 100,
      status: "active",
      generatedAt: "2026-06-19T09:30:00.000Z",
      items: []
    },
    evidenceArtifacts: []
  };
};

const recommendationFixture = (organizationId: string): RecommendationContract => ({
  id: "rec_business_premium",
  organizationId,
  sourceFindingId: "m365:mfa-registration:coverage",
  sourceFindingIds: ["m365:mfa-registration:coverage"],
  manualTaskIds: [],
  controlId: "nis2.identity-access",
  jurisdiction: "EU",
  title: "Evaluate Microsoft 365 Business Premium for security capability coverage",
  summary: "Evaluate missing Microsoft 365 security capabilities for readiness work.",
  severity: "high",
  confidence: "medium",
  recommendationType: "guided",
  automationMode: "manual",
  requiredPermissions: [],
  requiredLicense: ["Microsoft 365 Business Premium"],
  evidenceRequired: true,
  status: "proposed",
  decision: {
    finding: "Lower business subscription with missing security capabilities.",
    whyItMatters: "Food distribution continuity depends on identity and endpoint coverage.",
    evidenceUsed: [
      { type: "business_context", label: "Sector", value: "food distributor" },
      { type: "business_context", label: "Likely classification", value: "likely in scope" }
    ],
    nis2ControlMappings: ["nis2.identity-access"],
    countryMappings: ["DE"],
    priority: "high",
    recommendedAction: "Compare Microsoft security options.",
    expectedReadinessEffect: "Estimated readiness effect after configuration and evidence capture.",
    requiredCapability: "identity policy, device management, endpoint protection",
    microsoftProductOrLicense: "Microsoft 365 Business Premium",
    partnerServiceOpportunity: "Security capability assessment",
    customerCta: "Improve identity protection",
    partnerCta: "Request partner proposal",
    disclaimer: "Readiness recommendation only; it is not legal advice or certification."
  },
  opportunity: {
    type: "microsoft_security_capability_evaluation",
    priority: "high",
    relevantMicrosoftCapabilityOrPlan: "Microsoft 365 Business Premium",
    affectedUsers: 72,
    nis2Areas: ["nis2.identity-access"],
    evidenceSource: "Microsoft 365 subscription context and NIS2 readiness gaps",
    nextAction: "Add supplier continuity and endpoint coverage review to the readiness plan"
  }
});
