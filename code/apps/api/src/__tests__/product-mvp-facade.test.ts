import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

const waitForListening = async (server: Server): Promise<void> => {
  if (server.address()) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
};

describe("product MVP facade routes", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;

  beforeEach(async () => {
    const services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "false"
        }
      }),
      now: () => new Date("2026-06-24T09:00:00.000Z"),
      reportPdfRenderer: {
        renderPdf: (input) => {
          const body = Buffer.from(`%PDF-1.4\n${input.filename}\n%%EOF`, "utf8");
          return {
            format: "pdf",
            mimeType: "application/pdf",
            body,
            contentHashSha256: "pdf-hash-for-product-facade-test",
            renderer: "test-pdf-renderer",
            renderedAt: input.renderedAt ?? "2026-06-24T09:00:00.000Z"
          };
        }
      }
    });
    server = startApiServer(0, services);
    await waitForListening(server);
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

  const patchJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {})
      },
      body: JSON.stringify(body)
    });

  const registerLoginAndSelectWorkspace = async () => {
    const register = await postJson("/auth/register", {
      email: "mvp-owner@example.test",
      password,
      displayName: "MVP Owner"
    });
    expect(register.status).toBe(201);

    const login = await postJson("/auth/login", {
      email: "mvp-owner@example.test",
      password
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie") ?? "";

    const workspace = await postJson(
      "/api/workspaces",
      {
        name: "Asterion Tools",
        legalName: "Asterion Tools SRL",
        countryCode: "RO"
      },
      cookie
    );
    expect(workspace.status).toBe(201);
    const workspaceBody = await readJson<{ organization: { id: string } }>(workspace);

    const selected = await postJson(
      "/auth/session/active-organization",
      {
        organizationId: workspaceBody.organization.id
      },
      cookie
    );
    expect(selected.status).toBe(200);

    return {
      cookie,
      organizationId: workspaceBody.organization.id
    };
  };

  const completeCommonAnswers = (countryCode: "PL" | "DE") => ({
    company: { legalName: `${countryCode} Example Ltd`, countryCode },
    locations: { headquartersCountry: countryCode, headquartersCity: countryCode === "PL" ? "Warsaw" : "Berlin" },
    contacts: {
      primaryName: "Primary Owner",
      primaryEmail: "owner@example.test",
      securityName: "Security Owner",
      securityEmail: "security@example.test"
    },
    business: {
      sector: countryCode === "PL" ? "food" : "public_administration",
      mainProductsServices: "Operational services for customers and public stakeholders.",
      countriesServed: [countryCode],
      employeeCount: countryCode === "PL" ? 72 : 180
    },
    size: { sizeCategory: "medium", legalStructure: "standalone" },
    scope: {
      activities: [countryCode === "PL" ? "food" : "public_administration"],
      publicAdministration: countryCode === "DE",
      telecomProvider: false
    },
    systems: { systemsDescription: "Identity, collaboration, line-of-business systems, and public web properties." },
    providers: { microsoft365Usage: "identity_devices_security" },
    dependencies: {
      backupArrangements: "implemented encrypted backups with restore tests",
      businessContinuity: "implemented continuity plan",
      criticalSuppliers: ["Microsoft 365"],
      incidentResponse: "implemented incident response runbook"
    },
    governance: {
      identityControls: "implemented least-privilege access reviews",
      mfa: "implemented",
      riskManagement: "implemented annual cyber risk review",
      supplyChainSecurity: "implemented supplier review"
    },
    review: { legalCaveatAcknowledged: true }
  });

  const completeRomaniaAnswers = () => ({
    ...completeCommonAnswers("PL"),
    company: { legalName: "Asterion Cloud Services SRL", countryCode: "RO" },
    locations: { headquartersCountry: "RO", headquartersCity: "Bucharest" },
    business: {
      sector: "digital_infrastructure",
      mainProductsServices: "Cloud operations and managed digital infrastructure services.",
      countriesServed: ["RO"],
      employeeCount: 120
    },
    size: { sizeCategory: "medium", legalStructure: "standalone" },
    selectedServiceTypeCodes: ["108004"],
    scope: { publicAdministration: false, telecomProvider: false },
    relationship: {
      criticalEntityInRomaniaLaw294: false,
      establishedInRomania: true,
      mainOfficeInRomania: true,
      providesServicesInAnotherEuMemberState: false,
      providesServicesInRomania: true,
      publicAdministrationEstablishedByRomania: false
    },
    article9: {
      nationalOrRegionalCriticality: false,
      publicSafetySecurityOrHealthImpact: "medium",
      soleProviderEssentialService: false,
      systemicRisk: "medium"
    },
    systems: {
      systemsDescription: "Cloud platform, identity tenant, collaboration, and customer support systems.",
      publicIpRanges: ["203.0.113.0/28"]
    }
  });

  it("serves a product dashboard for a fresh workspace and then updates persisted workspace, gap, and report state", async () => {
    const { cookie, organizationId } = await registerLoginAndSelectWorkspace();

    const workspacePatch = await patchJson(
      `/api/workspaces/${organizationId}`,
      {
        name: "Asterion Cloud Services",
        legalName: "Asterion Cloud Services SRL",
        countryCode: "DE",
        logoDataUrl: "data:image/png;base64,iVBORw0KGgo="
      },
      cookie
    );
    expect(workspacePatch.status).toBe(200);
    await expect(
      readJson<{ organization: { logoDataUrl: string; name: string; primaryCountryCode: string } }>(workspacePatch)
    ).resolves.toMatchObject({
      organization: {
        logoDataUrl: "data:image/png;base64,iVBORw0KGgo=",
        name: "Asterion Cloud Services",
        primaryCountryCode: "DE"
      }
    });

    const freshDashboard = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { cookie }
    });
    expect(freshDashboard.status).toBe(200);
    const freshBody = await readJson<{
      dashboard: {
        nextAction: { label: string; href: string };
        readiness: { baselineState: string; score: number };
        microsoft365: { status: string };
      };
    }>(freshDashboard);
    expect(freshBody.dashboard.nextAction).toEqual({
      label: "Start readiness onboarding",
      href: "/onboarding"
    });
    expect(freshBody.dashboard.readiness).toMatchObject({
      baselineState: "draft",
      score: 0
    });
    expect(freshBody.dashboard.microsoft365.status).toBe("not_connected");

    const runWithoutOnboarding = await postJson("/api/readiness/run", {}, cookie);
    expect(runWithoutOnboarding.status).toBe(404);

    const saved = await putJson(
      "/api/onboarding/answers",
      {
        countryCode: "DE",
        currentScreen: "company_profile",
        completedScreens: ["company_profile"],
        answers: {
          company: { legalName: "Asterion Cloud Services SRL", countryCode: "DE" },
          contacts: { primaryEmail: "security@example.test" },
          business: { sector: "digital_services", employeeCount: 42 },
          providers: { microsoft365Usage: "email_collaboration" }
        }
      },
      cookie
    );
    expect(saved.status).toBe(200);
    const savedBody = await readJson<{ progress: { assessmentId: string } }>(saved);
    expect(savedBody.progress.assessmentId).toMatch(uuidPattern);

    const reloaded = await fetch(`${baseUrl}/api/onboarding/answers`, {
      headers: { cookie }
    });
    expect(reloaded.status).toBe(200);
    const reloadedBody = await readJson<{
      answers: { providers?: { microsoft365Usage?: string } };
      countryCode: string;
      schema: { countryPack: { classificationAdapter: { key: string } } };
    }>(reloaded);
    expect(reloadedBody).toMatchObject({
      answers: {
        providers: {
          microsoft365Usage: "email_collaboration"
        }
      },
      countryCode: "DE"
    });
    expect(JSON.stringify(reloadedBody.schema)).not.toContain("workbook");

    const run = await postJson("/api/readiness/run", {}, cookie);
    expect(run.status).toBe(201);
    const runBody = await readJson<{ assessmentId: string; gaps: Array<{ id: string }>; recommendations: unknown[] }>(run);
    expect(runBody.assessmentId).toMatch(uuidPattern);
    expect(runBody.assessmentId).toBe(savedBody.progress.assessmentId);
    expect(runBody.gaps.length).toBeGreaterThan(0);
    expect(runBody.gaps.map((gap) => gap.id)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("missing-company-data"),
        expect.stringContaining("missing-country-scope"),
        expect.stringContaining("microsoft365-not-connected"),
        expect.stringContaining("national-personalization-incomplete")
      ])
    );
    expect(runBody.recommendations.length).toBeGreaterThan(0);

    const gapPatch = await patchJson(
      `/api/gaps/${runBody.gaps[0]?.id}`,
      {
        status: "accepted_risk",
        planStatus: "planned",
        ownerUserId: "mvp-owner",
        dueDate: "2026-07-15"
      },
      cookie
    );
    expect(gapPatch.status).toBe(200);
    await expect(
      readJson<{ gap: { status: string; engineStatus: string; owner: string; dueDate: string } }>(gapPatch)
    ).resolves.toMatchObject({
      gap: {
        status: "planned",
        engineStatus: "accepted_risk",
        owner: "mvp-owner",
        dueDate: "2026-07-15"
      }
    });

    const gaps = await fetch(`${baseUrl}/api/gaps`, {
      headers: { cookie }
    });
    expect(gaps.status).toBe(200);
    await expect(readJson<{ gaps: Array<{ title: string; businessImpact: string }> }>(gaps)).resolves.toMatchObject({
      gaps: expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          businessImpact: expect.any(String)
        })
      ])
    });

    const report = await postJson("/api/reports/nis2-summary", {}, cookie);
    expect(report.status).toBe(201);
    const reportBody = await readJson<{
      report: {
        id: string;
        reportType: string;
        reportData: {
          reportBranding?: {
            legalName?: string | null;
            logoDataUrl?: string | null;
            organizationName?: string;
          };
        };
      };
      pdf: { body?: unknown; mimeType: string };
    }>(report);
    expect(reportBody.report.reportType).toBe("executive_summary");
    expect(reportBody.report.reportData.reportBranding).toMatchObject({
      legalName: "Asterion Cloud Services SRL",
      logoDataUrl: "data:image/png;base64,iVBORw0KGgo=",
      organizationName: "Asterion Cloud Services"
    });
    expect(reportBody.pdf).toMatchObject({ mimeType: "application/pdf" });
    expect(reportBody.pdf.body).toBeUndefined();
    const reportDownload = await fetch(`${baseUrl}/api/reports/${reportBody.report.id}/download`, {
      headers: { cookie }
    });
    expect(reportDownload.status).toBe(200);
    expect(reportDownload.headers.get("content-type")).toBe("application/pdf");
    const reportDownloadBody = Buffer.from(await reportDownload.arrayBuffer());
    expect(reportDownload.headers.get("x-content-hash-sha256")).toBe(
      createHash("sha256").update(reportDownloadBody).digest("hex")
    );
  });

  it("lists only the MVP country packs and connector hub without internal provider route names", async () => {
    const { cookie } = await registerLoginAndSelectWorkspace();

    const countryPacks = await fetch(`${baseUrl}/api/country-packs`, {
      headers: { cookie }
    });
    expect(countryPacks.status).toBe(200);
    await expect(readJson<{ countryPacks: Array<{ countryCode: string }> }>(countryPacks)).resolves.toMatchObject({
      countryPacks: expect.arrayContaining([
        expect.objectContaining({ countryCode: "RO" }),
        expect.objectContaining({ countryCode: "PL" }),
        expect.objectContaining({ countryCode: "DE" })
      ])
    });

    const connectors = await fetch(`${baseUrl}/api/connectors`, {
      headers: { cookie }
    });
    expect(connectors.status).toBe(200);
    const connectorsBody = await readJson<{ connectors: Array<{ name: string; providerKey: string; status: string }> }>(
      connectors
    );
    expect(connectorsBody.connectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Microsoft 365",
          providerKey: "microsoft365",
          status: "not_connected"
        }),
        expect.objectContaining({
          name: "Google Workspace",
          status: "coming_later"
        })
      ])
    );
    expect(JSON.stringify(connectorsBody)).not.toContain("provider_connection_oauth");
  });

  it("serves customer-safe onboarding schemas for RO, PL, and DE", async () => {
    const bannedTerms = [
      "xlsx",
      "xls",
      "workbook",
      "sheet",
      "cell",
      "sourceMapId",
      "Date entitate",
      "Evaluare entitate",
      "Algoritm clasificare",
      "importer"
    ];

    for (const country of ["RO", "PL", "DE"]) {
      const response = await fetch(`${baseUrl}/api/onboarding/schema?country=${country}`);
      expect(response.status).toBe(200);
      const body = await readJson<{
        countryPack: { classificationAdapter: { key: string }; sourceReviewStatus: string };
        fields: Array<{ key: string }>;
        screens: Array<{ key: string; routePath: string }>;
        serviceCatalog: { options: Array<{ code: string }> };
      }>(response);
      expect(body.screens.map((screen) => screen.key)).toEqual([
        "company",
        "locations",
        "contacts",
        "size",
        "services",
        "country-scope",
        "systems",
        "providers",
        "security-baseline",
        "evidence",
        "review"
      ]);
      expect(body.fields.map((field) => field.key)).toEqual(expect.arrayContaining(["company.legalName", "providers.microsoft365Usage"]));
      expect(body.countryPack.sourceReviewStatus).toBe("review_required");
      expect(body.countryPack.classificationAdapter.key).toBe(country === "RO" ? "country_specific" : "common_structured");
      if (country === "RO") {
        expect(body.fields.map((field) => field.key)).toContain("selectedServiceTypeCodes");
        expect(body.serviceCatalog.options.length).toBeGreaterThan(0);
      }

      const serialized = JSON.stringify(body);
      for (const term of bannedTerms) {
        expect(serialized).not.toContain(term);
      }
    }
  });

  it("routes product onboarding completion through the RO classifier and common PL/DE classifiers", async () => {
    const { cookie, organizationId } = await registerLoginAndSelectWorkspace();

    const saveAndComplete = async (countryCode: "RO" | "PL" | "DE", answers: Record<string, unknown>) => {
      const workspacePatch = await patchJson(
        `/api/workspaces/${organizationId}`,
        {
          countryCode,
          legalName: `${countryCode} Example Ltd`
        },
        cookie
      );
      expect(workspacePatch.status).toBe(200);

      const saved = await putJson(
        "/api/onboarding/answers",
        {
          answers,
          countryCode,
          currentScreen: "review",
          completedScreens: [
            "company",
            "locations",
            "contacts",
            "size",
            "services",
            "country-scope",
            "systems",
            "providers",
            "security-baseline",
            "evidence",
            "review"
          ]
        },
        cookie
      );
      expect(saved.status).toBe(200);

      const completed = await postJson("/api/onboarding/complete", {}, cookie);
      expect(completed.status).toBe(201);
      return readJson<{
        classification: { result: string; sourceVersion?: string };
        classificationRun: { countryCode: string; input: Record<string, unknown>; result: string; sourceVersion: string };
      }>(completed);
    };

    const ro = await saveAndComplete("RO", completeRomaniaAnswers());
    expect(ro.classificationRun.countryCode).toBe("RO");
    expect(ro.classificationRun.input).toMatchObject({
      selectedServiceTypeCodes: ["108004"],
      sizeCategory: "medium",
      relationship: {
        establishedInRomania: true,
        providesServicesInRomania: true
      }
    });
    expect(ro.classification.sourceVersion).toContain("puresoc.nis2.country_onboarding.v2");
    expect(ro.classificationRun.sourceVersion).toContain("puresoc.nis2.country_onboarding.v2");

    const pl = await saveAndComplete("PL", completeCommonAnswers("PL"));
    expect(pl.classificationRun).toMatchObject({
      countryCode: "PL",
      result: "possibly_in_scope"
    });
    expect(pl.classificationRun.input).toMatchObject({
      employeeCount: 72,
      publicAdministration: false,
      sector: "food",
      services: ["food"]
    });

    const de = await saveAndComplete("DE", completeCommonAnswers("DE"));
    expect(de.classificationRun).toMatchObject({
      countryCode: "DE",
      result: "possibly_in_scope"
    });
    expect(de.classificationRun.input).toMatchObject({
      employeeCount: 180,
      publicAdministration: true,
      sector: "public_administration",
      services: ["public_administration"]
    });
  });

  it("turns open Microsoft 365 gaps into approved zero-blast reports, tasks, and evidence", async () => {
    const { cookie, organizationId } = await registerLoginAndSelectWorkspace();
    await patchJson(`/api/workspaces/${organizationId}`, { countryCode: "DE" }, cookie);
    const consent = await postJson(
      "/api/connectors/microsoft365/connect",
      { redirectUri: "http://127.0.0.1/connectors/microsoft365/callback" },
      cookie
    );
    expect(consent.status).toBe(201);
    const consentBody = await readJson<{ state: string; url: string }>(consent);
    const callbackUrl = new URL(consentBody.url);
    const callback = await postJson(
      "/api/connectors/microsoft365/callback",
      {
        state: consentBody.state,
        tenant: callbackUrl.searchParams.get("tenant"),
        admin_consent: callbackUrl.searchParams.get("admin_consent")
      },
      cookie
    );
    expect(callback.status).toBe(200);

    const saved = await putJson(
      "/api/onboarding/answers",
      {
        countryCode: "DE",
        currentScreen: "company",
        completedScreens: ["company"],
        answers: {
          company: { legalName: "Asterion Tools GmbH", countryCode: "DE" },
          contacts: { primaryEmail: "owner@example.test" },
          business: { sector: "digital_services", employeeCount: 42 },
          providers: { microsoft365Usage: "identity_devices_security" }
        }
      },
      cookie
    );
    expect(saved.status).toBe(200);

    const readiness = await postJson("/api/readiness/run", {}, cookie);
    expect(readiness.status).toBe(201);
    const readinessBody = await readJson<{
      recommendations: Array<{
        id: string;
        actionOffer?: { actionKey: string; providerMutation: boolean } | null;
      }>;
    }>(readiness);
    const actionRecommendations = readinessBody.recommendations.filter((recommendation) => recommendation.actionOffer);
    expect(actionRecommendations.map((recommendation) => recommendation.actionOffer?.actionKey)).toEqual(
      expect.arrayContaining([
        "AUDIT_LOG_EXPORT_SETUP",
        "MFA_COVERAGE_REPORT",
        "GUEST_USER_REVIEW_TASK",
        "APP_REGISTRATION_CREDENTIAL_EXPIRY_REPORT"
      ])
    );
    expect(actionRecommendations).toHaveLength(4);
    expect(actionRecommendations.every((recommendation) => recommendation.actionOffer?.providerMutation === false)).toBe(true);

    const expectedOutputTypes = new Map([
      ["AUDIT_LOG_EXPORT_SETUP", "setup_guide"],
      ["MFA_COVERAGE_REPORT", "coverage_report"],
      ["GUEST_USER_REVIEW_TASK", "review_task"],
      ["APP_REGISTRATION_CREDENTIAL_EXPIRY_REPORT", "expiry_report"]
    ]);
    for (const recommendation of actionRecommendations) {
      const actionKey = recommendation.actionOffer!.actionKey;
      const created = await postJson(
        "/api/remediation/actions",
        { recommendationId: recommendation.id, actionKey },
        cookie
      );
      expect(created.status).toBe(201);
      const createdBody = await readJson<{
        actionRun: {
          id: string;
          preflightStatus: string;
          preStateSnapshot?: { evidenceArtifactId: string };
        };
      }>(created);
      expect(createdBody.actionRun).toMatchObject({
        preflightStatus: "passed",
        preStateSnapshot: { evidenceArtifactId: expect.any(String) }
      });

      const approved = await postJson(`/api/remediation/actions/${createdBody.actionRun.id}/approve`, {}, cookie);
      expect(approved.status).toBe(200);
      const executed = await postJson(`/api/remediation/actions/${createdBody.actionRun.id}/execute`, {}, cookie);
      expect(executed.status).toBe(202);
      await expect(
        readJson<{
          actionRun: { status: string; verificationStatus: string; postStateSnapshot?: unknown };
          zeroBlast: { outputType: string; providerMutation: boolean; evidenceFileObjectId: string };
        }>(executed)
      ).resolves.toMatchObject({
        actionRun: {
          status: "closed",
          verificationStatus: "passed",
          postStateSnapshot: expect.any(Object)
        },
        zeroBlast: {
          outputType: expectedOutputTypes.get(actionKey),
          providerMutation: false,
          evidenceFileObjectId: expect.any(String)
        }
      });
    }

    const remediation = await fetch(`${baseUrl}/api/remediation/actions`, { headers: { cookie } });
    expect(remediation.status).toBe(200);
    await expect(
      readJson<{
        permissions: { canApprove: boolean; canOperate: boolean };
        actions: Array<{
          executionState: string;
          evidenceArtifactCount: number;
          outputDownloadHref: string;
          providerMutation: boolean;
        }>;
      }>(remediation)
    ).resolves.toMatchObject({
      permissions: { canApprove: true, canOperate: true },
      actions: expect.arrayContaining([
        expect.objectContaining({
          executionState: "closed",
          evidenceArtifactCount: 3,
          outputDownloadHref: expect.stringMatching(/^\/remediation\/reports\/.+\/download$/),
          providerMutation: false
        })
      ])
    });

    const overview = await fetch(`${baseUrl}/api/microsoft365/overview`, { headers: { cookie } });
    await expect(readJson<{ overview: { writeActionsEnabled: boolean } }>(overview)).resolves.toMatchObject({
      overview: { writeActionsEnabled: false }
    });
  });

  it("supports Microsoft local disconnect and product remediation lifecycle aliases without fake execution success", async () => {
    const { cookie, organizationId } = await registerLoginAndSelectWorkspace();

    const consent = await postJson(
      "/api/connectors/microsoft365/connect",
      {
        redirectUri: "http://127.0.0.1/connectors/microsoft365/callback"
      },
      cookie
    );
    expect(consent.status).toBe(201);
    const consentBody = await readJson<{ state: string; url: string }>(consent);
    const callbackUrl = new URL(consentBody.url);
    const callback = await postJson(
      "/api/connectors/microsoft365/callback",
      {
        state: consentBody.state,
        tenant: callbackUrl.searchParams.get("tenant"),
        admin_consent: callbackUrl.searchParams.get("admin_consent")
      },
      cookie
    );
    expect(callback.status).toBe(200);

    const disconnect = await postJson(
      "/api/connectors/microsoft365/disconnect",
      {
        reason: "customer_requested"
      },
      cookie
    );
    expect(disconnect.status).toBe(200);
    await expect(
      readJson<{
        connection: { status: string; readEnabled: boolean; writeEnabled: boolean };
        providerRevocation: string;
      }>(disconnect)
    ).resolves.toMatchObject({
      connection: {
        status: "revoked",
        readEnabled: false,
        writeEnabled: false
      },
      providerRevocation: "manual_admin_center_recommended"
    });

    const mockConnection = await postJson(
      `/organizations/${organizationId}/provider-connections`,
      {
        scenarioKey: "healthy_tenant",
        displayName: "Mock tenant"
      },
      cookie
    );
    expect(mockConnection.status).toBe(201);
    const mockConnectionBody = await readJson<{ connection: { id: string } }>(mockConnection);
    const actionRun = await postJson(
      `/organizations/${organizationId}/actions/runs`,
      {
        providerConnectionId: mockConnectionBody.connection.id,
        recommendation: {
          id: "rec-product-alias",
          controlId: "nis2.access-control.mfa",
          jurisdiction: "EU",
          title: "Review MFA coverage",
          summary: "Generate and review an MFA coverage report.",
          severity: "high",
          recommendationType: "guided",
          automationMode: "guided",
          requiredPermissions: [],
          requiredLicense: [],
          evidenceRequired: true
        },
        actionTemplate: {
          providerKey: "mock",
          moduleKey: "identity",
          actionKey: "mfa_coverage_report",
          actionType: "guided",
          automationMode: "guided",
          title: "MFA coverage report",
          riskLevel: "low",
          licenseRequired: [],
          permissionsRequired: [],
          preconditions: {},
          expectedChange: "Create a report for human review.",
          blastRadius: "No tenant configuration changes.",
          rollbackStrategy: "No rollback needed for a generated report.",
          manualFallback: "Export the user list and review manually.",
          evidenceRequired: true
        }
      },
      cookie
    );
    expect(actionRun.status).toBe(201);
    const actionRunBody = await readJson<{ actionRun: { id: string } }>(actionRun);

    const preview = await postJson(`/api/remediation/actions/${actionRunBody.actionRun.id}/preview`, {}, cookie);
    expect(preview.status).toBe(200);
    await expect(readJson<{ preview: { status: string; canRequestApproval: boolean } }>(preview)).resolves.toMatchObject({
      preview: {
        status: "passed",
        canRequestApproval: true
      }
    });

    const approve = await postJson(`/api/remediation/actions/${actionRunBody.actionRun.id}/approve`, {}, cookie);
    expect(approve.status).toBe(200);
    await expect(readJson<{ actionRun: { approval: { status: string } } }>(approve)).resolves.toMatchObject({
      actionRun: {
        approval: {
          status: "approved"
        }
      }
    });

    const execute = await postJson(`/api/remediation/actions/${actionRunBody.actionRun.id}/execute`, {}, cookie);
    expect(execute.status).toBe(400);
    await expect(readJson<{ error: { code: string; message: string } }>(execute)).resolves.toMatchObject({
      error: {
        code: "invalid_action_state",
        message: expect.stringContaining("pre-state snapshot")
      }
    });
  });
});
