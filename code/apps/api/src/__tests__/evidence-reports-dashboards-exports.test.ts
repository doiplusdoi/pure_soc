import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("api evidence reports dashboards exports", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;

  beforeEach(() => {
    services = createApiServices({
      now: () => new Date("2026-04-30T10:00:00.000Z")
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
    expect(services.repository.evidenceAccessLogs).toHaveLength(1);
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
        assessmentId: "assessment_i"
      },
      owner.cookie
    );
    expect(reportResponse.status).toBe(201);
    const reportBody = await readJson<{
      report: {
        evidenceArtifactId?: string;
        reportData: { legalCaveat: string; sourceReferences: unknown[]; provenance: { source: string } };
      };
      exportJson: string;
    }>(reportResponse);
    expect(reportBody.report.reportData.legalCaveat).toBe(PURESOC_LEGAL_CAVEAT);
    expect(reportBody.report.reportData.sourceReferences.length).toBeGreaterThan(0);
    expect(reportBody.report.reportData.provenance.source).toBe("stored_analysis");
    expect(reportBody.exportJson).toContain('"schemaVersion": "puresoc.report.internal_readiness.v1"');
    expect(reportBody.exportJson).not.toContain("publicUrl");
    expect(reportBody.report.evidenceArtifactId).toBeDefined();
    const reportArtifact = services.repository.evidenceArtifacts.get(reportBody.report.evidenceArtifactId ?? "");
    expect(reportArtifact).toMatchObject({
      sourceType: "generated_report",
      sourceProvider: "puresoc-report-renderer",
      mimeType: "application/json"
    });
    expect(reportArtifact?.links.map((link) => link.targetType)).toContain("report");
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
    const dashboardBody = await readJson<{
      snapshot: { source: string; sourceRecordCounts: { controlResults: number; evidenceArtifacts: number } };
    }>(dashboardResponse);
    expect(dashboardBody.snapshot.source).toBe("stored_analysis");
    expect(dashboardBody.snapshot.sourceRecordCounts.controlResults).toBeGreaterThan(0);
    expect(dashboardBody.snapshot.sourceRecordCounts.evidenceArtifacts).toBe(1);

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
    expect(services.repository.evidenceArtifacts.get(body.report.evidenceArtifactId ?? "")?.sourceType).toBe(
      "generated_report"
    );
  });
});
