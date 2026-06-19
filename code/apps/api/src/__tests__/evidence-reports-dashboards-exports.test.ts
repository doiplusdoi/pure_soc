import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultRoleDefinitions } from "@puresoc/auth-core";
import type { DashboardSnapshotContract } from "@puresoc/dashboards";
import { createLocalMicrosoft365TokenCipher } from "@puresoc/provider-microsoft365";
import { LEGAL_CAVEAT_MESSAGE_KEY, PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import { createApiServices } from "../auth/services";
import { Microsoft365ProviderConnectionService } from "../provider-connections/microsoft365/service";
import type { ReportPdfRendererClient } from "../reports/service";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("api evidence reports dashboards exports", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;
  let renderedPdfRequests: Array<{ html: string; filename: string }> = [];

  beforeEach(() => {
    renderedPdfRequests = [];
    const reportPdfRenderer: ReportPdfRendererClient = {
      renderPdf(input) {
        renderedPdfRequests.push({
          html: input.html,
          filename: input.filename
        });
        const body = Buffer.from(
          `%PDF-1.4\n% PureSOC test PDF\n${input.filename}\n${input.html.includes(PURESOC_LEGAL_CAVEAT)}\n%%EOF\n`,
          "utf8"
        );
        return {
          format: "pdf",
          mimeType: "application/pdf",
          body,
          contentHashSha256: createHash("sha256").update(body).digest("hex"),
          renderer: "puresoc-report-renderer-test",
          renderedAt: input.renderedAt ?? "2026-04-30T10:00:00.000Z"
        };
      }
    };
    services = createApiServices({
      now: () => new Date("2026-04-30T10:00:00.000Z"),
      reportPdfRenderer
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
      displayName: "Phase I User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      registerBody: await readJson<{ user: { id: string; email: string } }>(registerResponse),
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  const createOrganization = async (cookie: string) => {
    const response = await postJson(
      "/organizations",
      {
        name: "Phase I Org",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  const addMemberWithRole = async (input: { organizationId: string; userId: string; roleKey: "security_operator" }) => {
    const now = new Date("2026-04-30T10:00:00.000Z");
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

  it("authorizes evidence upload/download, audits access, and rejects cross-organization output access", async () => {
    const owner = await registerAndLogin("phase-i-owner@example.test");
    const other = await registerAndLogin("phase-i-other@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const rejectedUpload = await postJson(
      `/organizations/${organization.id}/evidence/upload`,
      {
        title: "Unauthorized evidence",
        content: "should not store",
        mimeType: "text/plain",
        sourceType: "manual_upload"
      },
      other.cookie
    );
    expect(rejectedUpload.status).toBe(403);

    const uploadResponse = await postJson(
      `/organizations/${organization.id}/evidence/upload`,
      {
        title: "MFA coverage evidence",
        content: "mfa coverage export",
        mimeType: "text/plain",
        sourceType: "manual_upload",
        controlId: "nis2.access-control.mfa",
        jurisdiction: "EU",
        requirementKey: "mfa-coverage-evidence",
        linkedAssessmentId: "assessment_i",
        linkedSourceRecordId: "eu-nis2-art-21"
      },
      owner.cookie
    );
    expect(uploadResponse.status).toBe(201);
    const uploadBody = await readJson<{ artifact: { id: string; links: Array<{ targetType: string }> } }>(
      uploadResponse
    );
    expect(JSON.stringify(uploadBody)).not.toContain("storageUri");
    expect(JSON.stringify(uploadBody)).not.toContain("object://");
    expect(uploadBody.artifact.links.map((link) => link.targetType)).toContain("regulatory_source");

    const rejectedDownload = await fetch(
      `${baseUrl}/organizations/${organization.id}/evidence/${uploadBody.artifact.id}/download`,
      {
        headers: { cookie: other.cookie }
      }
    );
    expect(rejectedDownload.status).toBe(403);

    const downloadResponse = await fetch(
      `${baseUrl}/organizations/${organization.id}/evidence/${uploadBody.artifact.id}/download`,
      {
        headers: { cookie: owner.cookie }
      }
    );
    expect(downloadResponse.status).toBe(200);
    const downloadBody = await readJson<{ bodyBase64: string; artifact: { id: string }; auditEntry: { action: string } }>(
      downloadResponse
    );
    expect(Buffer.from(downloadBody.bodyBase64, "base64").toString("utf8")).toBe("mfa coverage export");
    expect(JSON.stringify(downloadBody.artifact)).not.toContain("storageUri");
    expect(JSON.stringify(downloadBody.artifact)).not.toContain("object://");
    expect(downloadBody.auditEntry.action).toBe("download");
    expect(services.memoryRepositories.evidenceRepository.accessLogs).toHaveLength(1);
    expect(services.auditSink.findByAction("evidence_downloaded")).toHaveLength(1);

    const listResponse = await fetch(`${baseUrl}/organizations/${organization.id}/evidence`, {
      headers: { cookie: owner.cookie }
    });
    expect(listResponse.status).toBe(200);
    expect(JSON.stringify(await readJson<unknown>(listResponse))).not.toContain("storageUri");

    const evaluationResponse = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "assessment_i",
        jurisdiction: "EU",
        countryPack: {
          countryCode: "RO",
          completeness: "planned_full_pack"
        }
      },
      owner.cookie
    );
    expect(evaluationResponse.status).toBe(200);

    const reportResponse = await postJson(
      `/organizations/${organization.id}/reports/internal-readiness`,
      {
        assessmentId: "assessment_i",
        classificationResult: {
          confidence: "medium",
          countryCode: "RO",
          explanation: "Romania saved onboarding indicates likely important entity pending review.",
          legalReviewRequired: true,
          missingInformation: [],
          result: "likely_important_entity"
        },
        countryPackVersion: "2026.06.demo",
        onboardingSchemaVersion: "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898",
        reportVersion: 1,
        triggerType: "onboarding_completed"
      },
      owner.cookie
    );
    expect(reportResponse.status).toBe(201);
    const reportBody = await readJson<{
      report: {
        id: string;
        evidenceArtifactId?: string;
        reportData: {
          concepts: {
            applicability: { result: string; legalReviewRequired: boolean };
            evidenceConfidence: { value: number };
            priority: { result: string };
            readiness: { value: number };
          };
          legalCaveat: string;
          sourceReferences: unknown[];
          provenance: { source: string };
          version: {
            countryPackVersion: string;
            immutable: boolean;
            inputSnapshot: { classificationResult: { result: string }; controlResultCount: number };
            onboardingSchemaVersion: string;
            reportVersion: number;
            triggerType: string;
          };
        };
      };
      exportJson: string;
    }>(reportResponse);
    expect(reportBody.report.reportData.legalCaveat).toBe(PURESOC_LEGAL_CAVEAT);
    expect(reportBody.report.reportData.version).toMatchObject({
      countryPackVersion: "2026.06.demo",
      immutable: true,
      onboardingSchemaVersion: "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898",
      reportVersion: 1,
      triggerType: "onboarding_completed",
      inputSnapshot: {
        classificationResult: {
          result: "likely_important_entity"
        },
        controlResultCount: expect.any(Number)
      }
    });
    expect(reportBody.report.reportData.concepts.applicability).toMatchObject({
      result: "likely_important_entity",
      legalReviewRequired: true
    });
    expect(reportBody.report.reportData.concepts.readiness.value).toBeGreaterThanOrEqual(0);
    expect(reportBody.report.reportData.concepts.evidenceConfidence.value).toBeGreaterThanOrEqual(0);
    expect(reportBody.report.reportData.concepts.priority.result).toMatch(/^(none|low|medium|high|critical)$/);
    expect(reportBody.report.reportData.sourceReferences.length).toBeGreaterThan(0);
    expect(reportBody.report.reportData.provenance.source).toBe("stored_analysis");
    expect(reportBody.exportJson).toContain('"schemaVersion": "puresoc.report.internal_readiness.v1"');
    expect(reportBody.exportJson).not.toContain("publicUrl");
    expect(reportBody.report.evidenceArtifactId).toBeDefined();
    const reportArtifact = services.memoryRepositories.evidenceRepository.artifacts.get(
      reportBody.report.evidenceArtifactId ?? ""
    );
    expect(reportArtifact).toMatchObject({
      sourceType: "generated_report",
      sourceProvider: "puresoc-report-renderer",
      mimeType: "application/json"
    });
    expect(reportArtifact?.links.map((link) => link.targetType)).toContain("report");
    await expect(
      services.outputRepository.listReportExportsForReport(organization.id, reportBody.report.id)
    ).resolves.toEqual([
      expect.objectContaining({
        generatedReportId: reportBody.report.id,
        exportFormat: "json",
        status: "ready",
        contentHashSha256: expect.stringMatching(/^[0-9a-f]{64}$/)
      })
    ]);
    expect(services.auditSink.findByAction("report_generated")).toHaveLength(1);
    expect(services.auditSink.findByAction("report_export_created")).toHaveLength(1);

    const rejectedReport = await postJson(
      `/organizations/${organization.id}/reports/internal-readiness`,
      {
        assessmentId: "assessment_i"
      },
      other.cookie
    );
    expect(rejectedReport.status).toBe(403);

    const dashboardResponse = await postJson(
      `/organizations/${organization.id}/dashboards/snapshots`,
      {
        assessmentId: "assessment_i",
        countryPackCompleteness: 80
      },
      owner.cookie
    );
    expect(dashboardResponse.status).toBe(201);
    const dashboardBody = await readJson<{ snapshot: DashboardSnapshotContract }>(dashboardResponse);
    expect(dashboardBody.snapshot.source).toBe("stored_analysis");
    expect(dashboardBody.snapshot.sourceRecordCounts.controlResults).toBeGreaterThan(0);
    expect(dashboardBody.snapshot.sourceRecordCounts.evidenceArtifacts).toBe(1);
    await services.outputRepository.saveDashboardSnapshot({
      id: randomUUID(),
      organizationId: organization.id,
      assessmentId: "assessment_i",
      snapshotType: "readiness_overview",
      source: "stored_analysis",
      snapshot: {
        ...dashboardBody.snapshot,
        generatedAt: "2026-04-28T08:00:00.000Z",
        trendMetrics: {
          ...dashboardBody.snapshot.trendMetrics,
          overallScore: 42,
          gapCountBySeverity: {
            critical: 3,
            high: 4,
            medium: 0,
            low: 0
          }
        }
      },
      createdAt: "2026-04-28T08:00:00.000Z"
    });
    await services.outputRepository.saveDashboardSnapshot({
      id: randomUUID(),
      organizationId: organization.id,
      assessmentId: "assessment_i",
      snapshotType: "readiness_overview",
      source: "stored_analysis",
      snapshot: {
        ...dashboardBody.snapshot,
        generatedAt: "2026-04-29T08:00:00.000Z",
        trendMetrics: {
          ...dashboardBody.snapshot.trendMetrics,
          overallScore: 60,
          gapCountBySeverity: {
            critical: 2,
            high: 3,
            medium: 0,
            low: 0
          }
        }
      },
      createdAt: "2026-04-29T08:00:00.000Z"
    });
    await services.outputRepository.saveDashboardSnapshot({
      id: randomUUID(),
      organizationId: organization.id,
      assessmentId: "assessment_i",
      snapshotType: "readiness_overview",
      source: "stored_analysis",
      snapshot: {
        ...dashboardBody.snapshot,
        generatedAt: "2026-04-29T12:00:00.000Z",
        trendMetrics: {
          ...dashboardBody.snapshot.trendMetrics,
          overallScore: 61,
          gapCountBySeverity: {
            critical: 1,
            high: 2,
            medium: 0,
            low: 0
          }
        }
      },
      createdAt: "2026-04-29T12:00:00.000Z"
    });

    const historyResponse = await fetch(`${baseUrl}/organizations/${organization.id}/dashboards/snapshots?days=30`, {
      headers: {
        cookie: owner.cookie
      }
    });
    expect(historyResponse.status).toBe(200);
    const historyBody = await readJson<{
      snapshots: Array<{ date: string; overall_score: number; critical_gaps: number; high_gaps: number }>;
    }>(historyResponse);
    expect(historyBody.snapshots).toEqual([
      {
        date: "2026-04-28",
        overall_score: 42,
        critical_gaps: 3,
        high_gaps: 4
      },
      {
        date: "2026-04-29",
        overall_score: 61,
        critical_gaps: 1,
        high_gaps: 2
      },
      expect.objectContaining({
        date: "2026-04-30"
      })
    ]);

    const latestDashboardResponse = await fetch(
      `${baseUrl}/organizations/${organization.id}/dashboards/snapshots/latest`,
      {
        headers: {
          cookie: owner.cookie
        }
      }
    );
    expect(latestDashboardResponse.status).toBe(200);
    const latestDashboardBody = await readJson<{
      snapshot: { source: string; sourceRecordCounts: { controlResults: number } };
    }>(latestDashboardResponse);
    expect(latestDashboardBody.snapshot.source).toBe("stored_analysis");
    expect(latestDashboardBody.snapshot.sourceRecordCounts.controlResults).toBeGreaterThan(0);

    const rejectedLatestDashboardResponse = await fetch(
      `${baseUrl}/organizations/${organization.id}/dashboards/snapshots/latest`,
      {
        headers: {
          cookie: other.cookie
        }
      }
    );
    expect(rejectedLatestDashboardResponse.status).toBe(403);
  });

  it("generates a version 2 Microsoft-verified report without mutating the previous report", async () => {
    const owner = await registerAndLogin("verified-report-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);
    const assessmentId = "assessment_verified_route";
    const recordedAt = "2026-04-30T09:30:00.000Z";
    await services.outputRepository.saveStoredAnalysis({
      organizationId: organization.id,
      assessmentId,
      jurisdiction: "EU",
      catalogVersion: "phase-m6-route",
      recordedAt,
      results: [
        {
          id: `${assessmentId}:nis2.access-control.mfa:EU`,
          organizationId: organization.id,
          assessmentId,
          controlId: "nis2.access-control.mfa",
          controlCode: "NIS2-EU-MFA-001",
          jurisdiction: "EU",
          status: "passing",
          confidence: "medium",
          providerSignalIds: [],
          evidenceArtifactIds: [],
          checklistRunItemIds: [],
          summary: "Customer declared Microsoft MFA complete.",
          matchedFindings: [],
          missingEvidence: [],
          manualTasks: [],
          countryPackWarnings: [],
          sourceReferences: [{ sourceRecordId: "eu-nis2-art-21", article: "21" }],
          evidenceCompleteness: {
            required: 1,
            present: 0,
            missing: 1,
            ratio: 0
          },
          evaluatedAt: recordedAt
        }
      ],
      gaps: [],
      recommendations: [],
      readinessPlan: {
        id: `${assessmentId}:readiness-plan`,
        organizationId: organization.id,
        assessmentId,
        title: "PureSOC internal readiness plan",
        targetReadinessPercent: 100,
        status: "draft",
        generatedAt: recordedAt,
        items: []
      },
      evidenceArtifacts: []
    });

    const reportV1Response = await postJson(
      `/organizations/${organization.id}/reports/internal-readiness`,
      {
        assessmentId,
        reportVersion: 1
      },
      owner.cookie
    );
    expect(reportV1Response.status).toBe(201);
    const reportV1 = await readJson<{
      report: {
        id: string;
        reportData: {
          concepts: { readiness: { value: number }; evidenceConfidence: { value: number } };
          version: { reportVersion: number };
        };
      };
    }>(reportV1Response);
    expect(reportV1.report.reportData.version.reportVersion).toBe(1);
    expect(reportV1.report.reportData.concepts.readiness.value).toBe(100);

    const microsoft365 = new Microsoft365ProviderConnectionService({
      store: services.microsoft365ProviderConnections.store,
      auditWriter: services.auditWriter,
      now: () => new Date("2026-04-30T10:00:00.000Z"),
      stateFactory: () => "verified_report_m365_state",
      tokenCipher: createLocalMicrosoft365TokenCipher({ masterKey: "verified-report-test-master-key" }),
      connectorMode: "fixture",
      fixtureSet: "partner_demo"
    });
    const redirectUri = `${baseUrl}/providers/microsoft365/callback`;
    const begin = await microsoft365.beginConsent({
      organizationId: organization.id,
      actorUserId: owner.registerBody.user.id,
      redirectUri,
      requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"]
    });
    const callback = new URL(begin.url);
    const completed = await microsoft365.completeConsent({
      organizationId: organization.id,
      actorUserId: owner.registerBody.user.id,
      state: callback.searchParams.get("state") ?? "",
      tenantId: callback.searchParams.get("tenant") ?? "",
      adminConsent: callback.searchParams.get("admin_consent") === "True",
      redirectUri
    });
    await microsoft365.runSync({
      organizationId: organization.id,
      actorUserId: owner.registerBody.user.id,
      providerConnectionId: completed.connection.id
    });

    const reportV2Response = await postJson(
      `/organizations/${organization.id}/reports/internal-readiness/verified-microsoft365`,
      {
        assessmentId,
        previousReportId: reportV1.report.id,
        providerConnectionId: completed.connection.id
      },
      owner.cookie
    );
    expect(reportV2Response.status).toBe(201);
    const reportV2 = await readJson<{
      report: {
        reportData: {
          comparison: {
            readinessDelta: number;
            evidenceConfidenceDelta: number;
            contradictions: string[];
            newVerifiedFindings: string[];
          };
          controlResults: Array<{ controlId: string; status: string; provenance: string[]; providerSignalIds: string[] }>;
          verifiedEvidence: { contradictions: Array<{ declaredStatus: string; effectiveStatus: string }> };
          version: { previousReportId: string; reportVersion: number; triggerType: string };
        };
      };
    }>(reportV2Response);

    expect(reportV2.report.reportData.version).toMatchObject({
      previousReportId: reportV1.report.id,
      reportVersion: 2,
      triggerType: "microsoft_sync_completed"
    });
    expect(reportV2.report.reportData.controlResults[0]).toMatchObject({
      controlId: "nis2.access-control.mfa",
      status: "failing",
      provenance: ["declared_by_customer", "verified_through_microsoft"],
      providerSignalIds: ["m365:mfa-registration:coverage"]
    });
    expect(reportV2.report.reportData.verifiedEvidence.contradictions[0]).toMatchObject({
      declaredStatus: "passing",
      effectiveStatus: "failing"
    });
    expect(reportV2.report.reportData.comparison).toMatchObject({
      readinessDelta: -100,
      evidenceConfidenceDelta: 100,
      contradictions: ["contradiction:m365:mfa-registration:coverage"],
      newVerifiedFindings: ["m365:mfa-registration:coverage"]
    });

    const storedV1 = await services.outputRepository.findGeneratedReport(organization.id, reportV1.report.id);
    expect(storedV1?.reportData.reportType).toBe("internal_readiness");
    if (storedV1?.reportData.reportType !== "internal_readiness") {
      throw new Error("Expected stored v1 report to be an internal readiness report.");
    }
    expect(storedV1.reportData.version.reportVersion).toBe(1);
    expect("verifiedEvidence" in (storedV1?.reportData ?? {})).toBe(false);
    expect(services.auditSink.findByAction("report_generated").at(-1)?.afterJson).toMatchObject({
      reportVersion: 2,
      previousReportId: reportV1.report.id,
      contradictionCount: 1,
      readinessDelta: -100,
      evidenceConfidenceDelta: 100
    });
  });

  it("exports Romania notification drafts with source-mapped fields and the legal caveat", async () => {
    const owner = await registerAndLogin("phase-i-ro-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await postJson(
      `/organizations/${organization.id}/reports/romania-notification-draft`,
      {
        assessmentId: "assessment_ro_i",
        status: "draft",
        payload: {
          entityName: "Example SRL"
        },
        sourceMappedFields: [
          {
            fieldKey: "entityName",
            value: "Example SRL",
            sourceReferences: [
              {
                sourceRecordId: "ro-workbook-notification-form",
                jurisdiction: "RO",
                sourceLocation: "Notification form!B4",
                fieldKey: "entityName"
              }
            ]
          }
        ],
        classificationRunId: "classification_ro_i"
      },
      owner.cookie
    );

    expect(response.status).toBe(201);
    const body = await readJson<{
      report: {
        evidenceArtifactId?: string;
        reportData: {
          legalCaveat: string;
          sourceMappedFields: Array<{ fieldKey: string; sourceReferences: unknown[] }>;
          sourceReferences: Array<{ sourceRecordId: string; fieldKey?: string }>;
        };
      };
    }>(response);

    expect(body.report.reportData.legalCaveat).toContain("not a legal opinion");
    expect(body.report.reportData.sourceMappedFields[0]).toMatchObject({
      fieldKey: "entityName"
    });
    expect(body.report.reportData.sourceMappedFields[0]?.sourceReferences.length).toBeGreaterThan(0);
    expect(body.report.reportData.sourceReferences[0]).toMatchObject({
      sourceRecordId: "ro-workbook-notification-form",
      fieldKey: "entityName"
    });
    expect(body.report.evidenceArtifactId).toBeDefined();
    expect(
      services.memoryRepositories.evidenceRepository.artifacts.get(body.report.evidenceArtifactId ?? "")?.sourceType
    ).toBe("generated_report");
  });

  it("downloads gap reports as PDFs through the renderer and records the generated-report PDF hash", async () => {
    const owner = await registerAndLogin("phase-i-pdf-owner@example.test");
    const wrongRole = await registerAndLogin("phase-i-pdf-operator@example.test");
    const { organization } = await createOrganization(owner.cookie);
    await addMemberWithRole({
      organizationId: organization.id,
      userId: wrongRole.registerBody.user.id,
      roleKey: "security_operator"
    });

    const unauthenticated = await fetch(
      `${baseUrl}/organizations/${organization.id}/compliance/reports/gap-report?format=pdf`
    );
    expect(unauthenticated.status).toBe(401);

    const evaluationResponse = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "assessment_pdf_i",
        jurisdiction: "EU",
        countryPack: {
          countryCode: "RO",
          completeness: "planned_full_pack"
        }
      },
      owner.cookie
    );
    expect(evaluationResponse.status).toBe(200);

    const forbidden = await fetch(
      `${baseUrl}/organizations/${organization.id}/compliance/reports/gap-report?format=pdf`,
      {
        headers: {
          cookie: wrongRole.cookie
        }
      }
    );
    expect(forbidden.status).toBe(403);

    const response = await fetch(
      `${baseUrl}/organizations/${organization.id}/compliance/reports/gap-report?format=pdf`,
      {
        headers: {
          cookie: owner.cookie
        }
      }
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("puresoc-gap-report-assessment_pdf_i.pdf");
    expect(response.headers.get("x-puresoc-content-sha256")).toMatch(/^[0-9a-f]{64}$/);
    const pdfBytes = Buffer.from(await response.arrayBuffer());
    expect(pdfBytes.toString("utf8")).toContain("%PDF-1.4");
    expect(renderedPdfRequests).toHaveLength(1);
    expect(renderedPdfRequests[0]?.html).toContain('<meta name="puresoc-legal-caveat"');
    expect(renderedPdfRequests[0]?.html).toContain("NIS2 Gap Report");
    expect(renderedPdfRequests[0]?.html).toContain("Control list");
    expect(renderedPdfRequests[0]?.html).toContain(PURESOC_LEGAL_CAVEAT);

    const reportGenerated = services.auditSink.findByAction("report_generated").find((entry) => {
      const afterJson = entry.afterJson as { reportType?: string } | undefined;
      return afterJson?.reportType === "gap_report";
    });
    expect(reportGenerated).toBeDefined();
    const report = await services.outputRepository.findGeneratedReport(
      organization.id,
      reportGenerated?.targetId ?? ""
    );
    expect(report).toMatchObject({
      reportType: "gap_report",
      contentHashSha256: response.headers.get("x-puresoc-content-sha256"),
      evidenceArtifactId: expect.any(String)
    });
    await expect(services.outputRepository.listReportExportsForReport(organization.id, report?.id ?? "")).resolves.toEqual([
      expect.objectContaining({
        exportFormat: "pdf",
        contentHashSha256: response.headers.get("x-puresoc-content-sha256")
      })
    ]);
    expect(
      services.memoryRepositories.evidenceRepository.artifacts.get(report?.evidenceArtifactId ?? "")?.mimeType
    ).toBe("application/pdf");
    expect(services.memoryRepositories.evidenceRepository.accessLogs).toEqual([
      expect.objectContaining({
        evidenceArtifactId: report?.evidenceArtifactId,
        actorUserId: owner.registerBody.user.id,
        action: "download"
      })
    ]);
    expect(services.auditSink.findByAction("evidence_downloaded")).toEqual([
      expect.objectContaining({
        targetId: report?.evidenceArtifactId,
        targetType: "evidence_artifact"
      })
    ]);
  });

  it("downloads stored Romania notification drafts as PDFs", async () => {
    const owner = await registerAndLogin("phase-i-ro-pdf-owner@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const createDraftResponse = await postJson(
      `/organizations/${organization.id}/compliance/nis2/notification-drafts`,
      {
        assessmentId: "assessment_ro_pdf_i",
        status: "ready_for_review",
        payload: {
          frameworkKey: "nis2",
          jurisdiction: "RO",
          legalCaveat: PURESOC_LEGAL_CAVEAT,
          legalCaveatFallbackUsed: false,
          legalCaveatLocale: "en",
          legalCaveatMessageKey: LEGAL_CAVEAT_MESSAGE_KEY,
          locale: "en",
          notificationType: "country_registration",
          payload: {
            entityName: "Example SRL"
          },
          payloadSchemaKey: "ro.nis2.registration_notification.v1",
          payloadSchemaVersion: "1.0.0",
          sourceMappedFields: [
            {
              fieldKey: "entityName",
              sourceMapId: "ro-nis2-notification_draft_mapping-entityName",
              label: {
                locale: "en",
                messageKey: "ro.nis2.notification.entity_name",
                text: "Entity name"
              },
              value: "Example SRL",
              sourceReferences: [
                {
                  sourceRecordId: "ro-workbook-notification-form",
                  jurisdiction: "RO",
                  sourceLocation: "Notification form!B4"
                }
              ]
            }
          ],
          sourceReferences: [
            {
              sourceRecordId: "ro-workbook-notification-form",
              jurisdiction: "RO",
              sourceLocation: "Notification form!B4"
            }
          ]
        }
      },
      owner.cookie
    );
    expect(createDraftResponse.status).toBe(201);
    const createDraftBody = await readJson<{ notificationDraft: { id: string } }>(createDraftResponse);

    const response = await fetch(
      `${baseUrl}/organizations/${organization.id}/onboarding/romania/reports/notification-draft?format=pdf&notificationDraftId=${createDraftBody.notificationDraft.id}`,
      {
        headers: {
          cookie: owner.cookie
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    const pdfText = Buffer.from(await response.arrayBuffer()).toString("utf8");
    expect(pdfText).toContain("%PDF-1.4");
    expect(renderedPdfRequests.at(-1)?.html).toContain("Romanian NIS2 Notification Draft");
    expect(renderedPdfRequests.at(-1)?.html).toContain("Example SRL");
    expect(renderedPdfRequests.at(-1)?.html).toContain(PURESOC_LEGAL_CAVEAT);
  });

  it("exports stable internal readiness CSV tables as generated-report evidence", async () => {
    const owner = await registerAndLogin("phase-i-csv-owner@example.test");
    const other = await registerAndLogin("phase-i-csv-other@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const evaluationResponse = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "assessment_csv_i",
        jurisdiction: "EU",
        countryPack: {
          countryCode: "RO",
          completeness: "planned_full_pack"
        }
      },
      owner.cookie
    );
    expect(evaluationResponse.status).toBe(200);

    const csvResponse = await postJson(
      `/organizations/${organization.id}/reports/internal-readiness/csv`,
      {
        assessmentId: "assessment_csv_i"
      },
      owner.cookie
    );
    expect(csvResponse.status).toBe(201);
    const csvBody = await readJson<{
      csvArtifactId?: string;
      csvExport: {
        schemaVersion: string;
        exportFormat: string;
        rowCount: number;
        tableNames: string[];
        legalCaveat: string;
        csv: string;
      };
      exportCsv: string;
      report: {
        id: string;
        reportData: { sourceReferences: unknown[] };
      };
    }>(csvResponse);

    expect(csvBody.csvExport).toMatchObject({
      schemaVersion: "puresoc.export.internal_readiness_csv.v1",
      exportFormat: "csv",
      tableNames: expect.arrayContaining(["metadata", "control_results", "gaps", "source_references"])
    });
    expect(csvBody.csvExport.legalCaveat).toBe(PURESOC_LEGAL_CAVEAT);
    expect(csvBody.csvExport.rowCount).toBeGreaterThan(3);
    expect(csvBody.exportCsv).toBe(csvBody.csvExport.csv);
    expect(csvBody.exportCsv).toContain("metadata,legal_caveat");
    expect(csvBody.exportCsv).toContain("control_results,");
    expect(csvBody.exportCsv).toContain('"This assessment is generated by PureSOC/SiSoN');
    expect(JSON.stringify(csvBody)).not.toContain("storageUri");
    expect(JSON.stringify(csvBody)).not.toContain("publicUrl");
    expect(csvBody.csvArtifactId).toBeDefined();
    const reportExports = await services.outputRepository.listReportExportsForReport(
      organization.id,
      csvBody.report.id
    );
    expect(reportExports.map((reportExport) => reportExport.exportFormat).sort()).toEqual(["csv", "json"]);
    expect(reportExports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          generatedReportId: csvBody.report.id,
          exportFormat: "csv",
          status: "ready",
          contentHashSha256: expect.stringMatching(/^[0-9a-f]{64}$/)
        })
      ])
    );
    expect(JSON.stringify(reportExports)).not.toContain("storageUri");

    const csvArtifact = services.memoryRepositories.evidenceRepository.artifacts.get(csvBody.csvArtifactId ?? "");
    expect(csvArtifact).toMatchObject({
      sourceType: "generated_report",
      sourceProvider: "puresoc-report-csv-builder",
      mimeType: "text/csv",
      linkedAssessmentId: "assessment_csv_i"
    });
    expect(csvArtifact?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "report",
          targetId: csvBody.report.id,
          relation: "generated_report_csv_export"
        })
      ])
    );
    expect(services.auditSink.findByAction("report_export_created")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          afterJson: expect.objectContaining({
            format: "csv",
            mimeType: "text/csv",
            rowCount: csvBody.csvExport.rowCount
          })
        })
      ])
    );

    const rejectedCsvResponse = await postJson(
      `/organizations/${organization.id}/reports/internal-readiness/csv`,
      {
        assessmentId: "assessment_csv_i"
      },
      other.cookie
    );
    expect(rejectedCsvResponse.status).toBe(403);
  });

  it("assembles local internal readiness evidence packages with export metadata and no storage URI leakage", async () => {
    const owner = await registerAndLogin("phase-i-package-owner@example.test");
    const other = await registerAndLogin("phase-i-package-other@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const uploadResponse = await postJson(
      `/organizations/${organization.id}/evidence/upload`,
      {
        title: "MFA package evidence",
        content: "mfa package evidence body",
        mimeType: "text/plain",
        sourceType: "manual_upload",
        controlId: "nis2.access-control.mfa",
        jurisdiction: "EU",
        linkedAssessmentId: "assessment_package_i",
        linkedSourceRecordId: "eu-nis2-art-21"
      },
      owner.cookie
    );
    expect(uploadResponse.status).toBe(201);
    const uploadBody = await readJson<{ artifact: { id: string } }>(uploadResponse);

    const evaluationResponse = await postJson(
      `/organizations/${organization.id}/compliance/evaluate`,
      {
        assessmentId: "assessment_package_i",
        jurisdiction: "EU",
        countryPack: {
          countryCode: "RO",
          completeness: "planned_full_pack"
        }
      },
      owner.cookie
    );
    expect(evaluationResponse.status).toBe(200);

    const packageResponse = await postJson(
      `/organizations/${organization.id}/reports/internal-readiness/evidence-package`,
      {
        assessmentId: "assessment_package_i"
      },
      owner.cookie
    );
    expect(packageResponse.status).toBe(201);
    const packageBody = await readJson<{
      packageArtifactId?: string;
      packageExport: {
        schemaVersion: string;
        exportFormat: string;
        mimeType: string;
        fileName: string;
        contentHashSha256: string;
        manifestJson: string;
        manifest: {
          legalCaveat: string;
          exportLimits: {
            maxEvidenceFiles: number;
            maxEvidenceFileBytes: number;
            maxBundleBytes: number;
          };
          files: Array<{ path: string; role: string; evidenceArtifactId?: string }>;
          evidenceArtifacts: Array<{ id: string }>;
        };
      };
      bundleBase64: string;
      report: {
        id: string;
      };
    }>(packageResponse);

    expect(packageBody.packageExport).toMatchObject({
      schemaVersion: "puresoc.export.internal_readiness_evidence_package.v1",
      exportFormat: "binary_evidence_package",
      mimeType: "application/x-tar",
      fileName: "puresoc-internal-readiness-assessment_package_i.tar",
      contentHashSha256: expect.stringMatching(/^[0-9a-f]{64}$/)
    });
    expect(packageBody.packageExport.manifest.legalCaveat).toBe(PURESOC_LEGAL_CAVEAT);
    expect(packageBody.packageExport.manifest.exportLimits).toEqual({
      maxEvidenceFiles: 250,
      maxEvidenceFileBytes: 10_485_760,
      maxBundleBytes: 52_428_800
    });
    expect(packageBody.packageExport.manifest.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "reports/internal-readiness.json", role: "report_json" }),
        expect.objectContaining({ path: "reports/internal-readiness.csv", role: "report_csv" }),
        expect.objectContaining({ role: "evidence_artifact", evidenceArtifactId: uploadBody.artifact.id })
      ])
    );
    expect(packageBody.packageExport.manifest.evidenceArtifacts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: uploadBody.artifact.id })])
    );
    expect(JSON.stringify(packageBody.packageExport)).not.toContain("storageUri");
    expect(JSON.stringify(packageBody.packageExport)).not.toContain("publicUrl");
    expect(JSON.stringify(packageBody)).not.toContain('"bundle"');

    const entries = readTarEntries(Buffer.from(packageBody.bundleBase64, "base64"));
    expect(entries.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["manifest.json", "reports/internal-readiness.json", "reports/internal-readiness.csv"])
    );
    expect(entries.find((entry) => entry.path === "manifest.json")?.body.toString("utf8")).toBe(
      packageBody.packageExport.manifestJson
    );
    expect(entries.find((entry) => entry.path === "reports/internal-readiness.json")?.body.toString("utf8")).toContain(
      '"schemaVersion": "puresoc.report.internal_readiness.v1"'
    );
    expect(entries.find((entry) => entry.path === "reports/internal-readiness.csv")?.body.toString("utf8")).toContain(
      "metadata,legal_caveat"
    );
    const evidenceEntry = entries.find((entry) => entry.path.startsWith("evidence/"));
    expect(evidenceEntry?.body.toString("utf8")).toBe("mfa package evidence body");

    const reportExports = await services.outputRepository.listReportExportsForReport(
      organization.id,
      packageBody.report.id
    );
    expect(reportExports.map((reportExport) => reportExport.exportFormat).sort()).toEqual([
      "binary_evidence_package",
      "json"
    ]);
    expect(reportExports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          generatedReportId: packageBody.report.id,
          exportFormat: "binary_evidence_package",
          status: "ready",
          contentHashSha256: packageBody.packageExport.contentHashSha256
        })
      ])
    );
    expect(packageBody.packageArtifactId).toBeDefined();
    expect(services.memoryRepositories.evidenceRepository.artifacts.get(packageBody.packageArtifactId ?? "")).toMatchObject({
      sourceType: "generated_report",
      sourceProvider: "puresoc-evidence-package-builder",
      mimeType: "application/x-tar",
      linkedAssessmentId: "assessment_package_i"
    });
    expect(services.auditSink.findByAction("report_export_created")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          afterJson: expect.objectContaining({
            format: "binary_evidence_package",
            mimeType: "application/x-tar",
            contentHashSha256: packageBody.packageExport.contentHashSha256
          })
        })
      ])
    );
    expect(services.auditSink.findByAction("evidence_downloaded")).toHaveLength(1);

    const rejectedPackageResponse = await postJson(
      `/organizations/${organization.id}/reports/internal-readiness/evidence-package`,
      {
        assessmentId: "assessment_package_i"
      },
      other.cookie
    );
    expect(rejectedPackageResponse.status).toBe(403);
  });

  it("rejects evidence packages that exceed configured local bundle limits before package storage", async () => {
    const limitedServices = createApiServices({
      now: () => new Date("2026-04-30T10:00:00.000Z"),
      evidencePackageLimits: {
        maxEvidenceFiles: 10,
        maxEvidenceFileBytes: 10_485_760,
        maxBundleBytes: 512
      }
    });
    const limitedServer = startApiServer(0, limitedServices);
    const limitedAddress = limitedServer.address() as AddressInfo;
    const limitedBaseUrl = `http://127.0.0.1:${limitedAddress.port}`;
    const limitedPostJson = (path: string, body: unknown, cookie?: string) =>
      fetch(`${limitedBaseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(cookie ? { cookie } : {})
        },
        body: JSON.stringify(body)
      });

    try {
      const registerResponse = await limitedPostJson("/auth/register", {
        email: "phase-i-package-limit-owner@example.test",
        password,
        displayName: "Phase I User"
      });
      expect(registerResponse.status).toBe(201);
      const loginResponse = await limitedPostJson("/auth/login", {
        email: "phase-i-package-limit-owner@example.test",
        password
      });
      expect(loginResponse.status).toBe(200);
      const cookie = loginResponse.headers.get("set-cookie") ?? "";

      const organizationResponse = await limitedPostJson(
        "/organizations",
        {
          name: "Phase I Limited Org",
          primaryCountryCode: "RO"
        },
        cookie
      );
      expect(organizationResponse.status).toBe(201);
      const { organization } = await readJson<{ organization: { id: string } }>(organizationResponse);

      const uploadResponse = await limitedPostJson(
        `/organizations/${organization.id}/evidence/upload`,
        {
          title: "Large package evidence",
          content: "local evidence body that should keep the final tar over the tiny configured limit",
          mimeType: "text/plain",
          sourceType: "manual_upload",
          controlId: "nis2.access-control.mfa",
          jurisdiction: "EU",
          linkedAssessmentId: "assessment_package_limit_i",
          linkedSourceRecordId: "eu-nis2-art-21"
        },
        cookie
      );
      expect(uploadResponse.status).toBe(201);

      const evaluationResponse = await limitedPostJson(
        `/organizations/${organization.id}/compliance/evaluate`,
        {
          assessmentId: "assessment_package_limit_i",
          jurisdiction: "EU",
          countryPack: {
            countryCode: "RO",
            completeness: "planned_full_pack"
          }
        },
        cookie
      );
      expect(evaluationResponse.status).toBe(200);

      const packageResponse = await limitedPostJson(
        `/organizations/${organization.id}/reports/internal-readiness/evidence-package`,
        {
          assessmentId: "assessment_package_limit_i"
        },
        cookie
      );
      expect(packageResponse.status).toBe(413);
      const packageBody = await readJson<{ error: { code: string; message: string } }>(packageResponse);
      expect(packageBody.error.code).toBe("evidence_package_bundle_too_large");
      expect(packageBody.error.message).toContain("exceeding the configured maximum");
      expect(JSON.stringify(packageBody)).not.toContain("storageUri");
      expect(JSON.stringify(packageBody)).not.toContain("publicUrl");
      expect(
        [...limitedServices.memoryRepositories.evidenceRepository.artifacts.values()].filter(
          (artifact) => artifact.sourceType === "generated_report"
        )
      ).toHaveLength(0);
      expect(limitedServices.auditSink.findByAction("report_export_created")).toHaveLength(0);
    } finally {
      await new Promise<void>((resolve, reject) => {
        limitedServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});

const readTarEntries = (bundle: Uint8Array): Array<{ path: string; body: Buffer }> => {
  const entries: Array<{ path: string; body: Buffer }> = [];
  const body = Buffer.from(bundle);
  let offset = 0;

  while (offset < body.byteLength) {
    const header = body.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const path = header.subarray(0, 100).toString("utf8").replace(/\0+$/, "");
    const sizeText = header.subarray(124, 136).toString("ascii").replace(/\0+$/, "").trim();
    const size = Number.parseInt(sizeText || "0", 8);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    entries.push({
      path,
      body: body.subarray(contentStart, contentEnd)
    });
    offset = contentStart + Math.ceil(size / 512) * 512;
  }

  return entries;
};
