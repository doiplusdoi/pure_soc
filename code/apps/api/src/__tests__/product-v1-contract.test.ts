import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { PURESOC_LEGAL_CAVEAT, supportedLocales } from "@puresoc/shared";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

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

describe("product v1 API contract", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;
  let sequence = 0;

  beforeEach(async () => {
    services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "false",
          PURESOC_CONNECTOR_MICROSOFT365_MODE: "fixture",
          PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID: "fixture-client-id",
          PURESOC_CONNECTOR_MICROSOFT365_FIXTURE_SET: "partner_demo"
        }
      }),
      now: () => new Date("2026-06-24T09:00:00.000Z")
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

  const requestJson = (
    method: string,
    path: string,
    body: unknown,
    cookie?: string,
    headers: Record<string, string> = {}
  ) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...headers
      },
      body: JSON.stringify(body)
    });

  const postJson = (path: string, body: unknown, cookie?: string, headers: Record<string, string> = {}) =>
    requestJson("POST", path, body, cookie, headers);

  const putJson = (path: string, body: unknown, cookie?: string, headers: Record<string, string> = {}) =>
    requestJson("PUT", path, body, cookie, headers);

  const patchJson = (path: string, body: unknown, cookie?: string, headers: Record<string, string> = {}) =>
    requestJson("PATCH", path, body, cookie, headers);

  const getJson = (path: string, cookie?: string, headers: Record<string, string> = {}) =>
    fetch(`${baseUrl}${path}`, {
      headers: {
        ...(cookie ? { cookie } : {}),
        ...headers
      }
    });

  const registerAndLogin = async (label: string) => {
    sequence += 1;
    const email = `${label}-${sequence}@example.test`;
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: label
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

  const createOrganization = async (cookie: string, name: string, countryCode = "RO") => {
    const response = await postJson(
      "/api/v1/organizations",
      {
        name,
        legalName: `${name} SRL`,
        primaryCountryCode: countryCode
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string; name: string; primaryCountryCode: string } }>(response);
  };

  const createPartner = async (cookie: string, slug: string) => {
    const response = await postJson(
      "/partners",
      {
        name: `Partner ${slug}`,
        slug
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ partner: { id: string } }>(response);
  };

  it("returns v1 error metadata, OpenAPI, pagination, filters, and stable operation links", async () => {
    const owner = await registerAndLogin("v1-owner");

    const badCreate = await postJson(
      "/api/v1/organizations",
      {},
      owner.cookie,
      {
        "x-request-id": "req_v1_contract",
        "x-correlation-id": "corr_v1_contract"
      }
    );
    expect(badCreate.status).toBe(400);
    expect(badCreate.headers.get("x-request-id")).toBe("req_v1_contract");
    expect(badCreate.headers.get("x-correlation-id")).toBe("corr_v1_contract");
    await expect(readJson<{ error: Record<string, unknown> }>(badCreate)).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Organization name is required.",
        details: {},
        requestId: "req_v1_contract",
        correlationId: "corr_v1_contract",
        fieldErrors: []
      }
    });

    const openapi = await getJson("/api/v1/openapi.json");
    expect(openapi.status).toBe(200);
    const openapiBody = await readJson<{ paths: Record<string, unknown> }>(openapi);
    expect(openapiBody.paths).toHaveProperty("/operations/{operationId}");

    await createOrganization(owner.cookie, "Asterion RO", "RO");
    await createOrganization(owner.cookie, "Asterion DE", "DE");
    const page = await getJson("/api/v1/organizations?filter[primaryCountryCode]=RO&limit=1", owner.cookie);
    expect(page.status).toBe(200);
    await expect(
      readJson<{ data: Array<{ primaryCountryCode: string }>; page: { limit: number; nextCursor: string | null } }>(page)
    ).resolves.toMatchObject({
      data: [{ primaryCountryCode: "RO" }],
      page: { limit: 1, nextCursor: null }
    });
  });

  it("persists setup state, business services, responsibilities, suppliers, and launch readiness", async () => {
    const owner = await registerAndLogin("setup-owner");
    const { organization } = await createOrganization(owner.cookie, "Setup Tenant", "RO");

    const blockedLaunch = await postJson(`/api/v1/organizations/${organization.id}/setup/launch`, {}, owner.cookie);
    expect(blockedLaunch.status).toBe(409);
    const blockedBody = await readJson<{ error: { details: { missingSteps: string[] } } }>(blockedLaunch);
    expect(blockedBody.error.details.missingSteps).toEqual(["organization", "jurisdiction", "services", "people", "review"]);

    for (const step of ["organization", "jurisdiction", "services", "people", "systems", "suppliers", "review"]) {
      const response = await putJson(
        `/api/v1/organizations/${organization.id}/setup/${step}`,
        {
          data: {
            step,
            confirmedAt: "2026-06-24T09:00:00.000Z"
          }
        },
        owner.cookie
      );
      expect(response.status).toBe(200);
    }

    const service = await postJson(
      `/api/v1/organizations/${organization.id}/business-services`,
      { name: "B2B orders", criticality: "critical" },
      owner.cookie
    );
    expect(service.status).toBe(201);

    const responsibility = await postJson(
      `/api/v1/organizations/${organization.id}/responsibilities`,
      { displayName: "Security Lead", email: "security@example.test", responsibilities: ["security_lead"] },
      owner.cookie
    );
    expect(responsibility.status).toBe(201);

    const supplier = await postJson(
      `/api/v1/organizations/${organization.id}/suppliers`,
      { name: "Cloud Host", criticality: "high", services: ["hosting"], reviewCadenceMonths: 6 },
      owner.cookie
    );
    expect(supplier.status).toBe(201);

    const setup = await getJson(`/api/v1/organizations/${organization.id}/setup`, owner.cookie);
    expect(setup.status).toBe(200);
    const setupBody = await readJson<{ setup: { completedSteps: string[]; stepData: Record<string, unknown> } }>(setup);
    expect(setupBody.setup.completedSteps).toContain("review");
    expect(setupBody.setup.stepData).toHaveProperty("jurisdiction");

    const launch = await postJson(`/api/v1/organizations/${organization.id}/setup/launch`, {}, owner.cookie);
    expect(launch.status).toBe(202);
    await expect(readJson<{ operationId: string; links: { self: string } }>(launch)).resolves.toMatchObject({
      status: "succeeded"
    });
  });

  it("enforces relationship lifecycle, partner assignment scope, and separate support sessions", async () => {
    const partnerOwner = await registerAndLogin("partner-owner");
    const customerOwner = await registerAndLogin("customer-owner");
    const { partner } = await createPartner(partnerOwner.cookie, "v1-partner");
    const { organization } = await createOrganization(customerOwner.cookie, "Customer Tenant", "DE");

    const invitation = await postJson(
      `/api/v1/partners/${partner.id}/customer-invitations`,
      { organizationId: organization.id, scopes: ["security.read"] },
      partnerOwner.cookie
    );
    expect(invitation.status).toBe(201);
    const invitationBody = await readJson<{ relationship: { id: string; state: string } }>(invitation);
    expect(invitationBody.relationship.state).toBe("PENDING_CUSTOMER_ACCEPTANCE");

    const accepted = await postJson(
      `/api/v1/organization-relationships/${invitationBody.relationship.id}/accept`,
      {},
      customerOwner.cookie
    );
    expect(accepted.status).toBe(200);

    const noAssignment = await getJson(
      `/api/v1/partners/${partner.id}/customers/${organization.id}/context`,
      partnerOwner.cookie
    );
    expect(noAssignment.status).toBe(403);

    const assignment = await postJson(
      `/api/v1/partners/${partner.id}/assignments`,
      {
        relationshipId: invitationBody.relationship.id,
        organizationId: organization.id,
        assigneeId: partnerOwner.user.id,
        scopes: ["security.read"]
      },
      partnerOwner.cookie
    );
    expect(assignment.status).toBe(201);

    const delegatedContext = await getJson(
      `/api/v1/partners/${partner.id}/customers/${organization.id}/context`,
      partnerOwner.cookie
    );
    expect(delegatedContext.status).toBe(200);

    const supportSession = await postJson(
      "/api/v1/support-sessions",
      {
        organizationId: organization.id,
        reason: "Troubleshoot onboarding",
        ticketReference: "SUP-123",
        ttlMinutes: 30
      },
      customerOwner.cookie
    );
    expect(supportSession.status).toBe(201);
    const supportBody = await readJson<{ supportSession: { id: string; status: string } }>(supportSession);
    expect(supportBody.supportSession.status).toBe("active");
    await expect(services.productV1.listAssignments(partner.id)).resolves.toHaveLength(1);

    const endedSupport = await postJson(
      `/api/v1/support-sessions/${supportBody.supportSession.id}/end`,
      { reason: "resolved" },
      customerOwner.cookie
    );
    expect(endedSupport.status).toBe(200);

    expect(
      (await postJson(`/api/v1/organization-relationships/${invitationBody.relationship.id}/suspend`, {}, customerOwner.cookie)).status
    ).toBe(200);
    expect(
      (
        await postJson(
          `/api/v1/organization-relationships/${invitationBody.relationship.id}/request-termination`,
          {},
          customerOwner.cookie
        )
      ).status
    ).toBe(200);
    expect(
      (await postJson(`/api/v1/organization-relationships/${invitationBody.relationship.id}/terminate`, {}, customerOwner.cookie)).status
    ).toBe(200);

    const afterTermination = await getJson(
      `/api/v1/partners/${partner.id}/customers/${organization.id}/context`,
      partnerOwner.cookie
    );
    expect(afterTermination.status).toBe(403);

    const invalidTransition = await postJson(
      `/api/v1/organization-relationships/${invitationBody.relationship.id}/accept`,
      {},
      customerOwner.cookie
    );
    expect(invalidTransition.status).toBe(409);
  });

  it("normalizes country-pack outcomes and records product security, incident, risk, and policy aggregates", async () => {
    const owner = await registerAndLogin("aggregate-owner");
    const { organization } = await createOrganization(owner.cookie, "Aggregate Tenant", "RO");

    const countryPack = await getJson("/api/v1/country-packs/RO?locale=ro");
    expect(countryPack.status).toBe(200);
    const countryPackBody = await readJson<{
      countryPack: {
        supportedLocales: string[];
        legalActivationBlocked: boolean;
        localizedTerms: { legalCaveat: Record<string, { text: string; fallbackUsed: boolean }> };
      };
    }>(countryPack);
    expect(countryPackBody.countryPack.supportedLocales).toEqual(supportedLocales);
    expect(countryPackBody.countryPack.legalActivationBlocked).toBe(true);
    expect(countryPackBody.countryPack.localizedTerms.legalCaveat.ro.text).toBe(PURESOC_LEGAL_CAVEAT);

    const classification = await postJson(
      `/api/v1/organizations/${organization.id}/compliance/classification/run`,
      {
        countryCode: "RO",
        answers: {
          employeeCount: 75,
          annualTurnoverEur: 12_000_000,
          sectors: ["digital"]
        }
      },
      owner.cookie
    );
    expect(classification.status).toBe(202);
    const classificationOperation = await readJson<{ operationId: string }>(classification);
    const classificationResult = await getJson(`/api/v1/operations/${classificationOperation.operationId}`, owner.cookie);
    const classificationBody = await readJson<{
      operation: { result: { normalizedOutcome: string; legalReviewRequired: boolean } };
    }>(classificationResult);
    expect([
      "LIKELY_ESSENTIAL_OR_EQUIVALENT",
      "LIKELY_IMPORTANT_OR_EQUIVALENT",
      "LIKELY_OUT_OF_SCOPE",
      "SPECIAL_DESIGNATION_POSSIBLE",
      "INSUFFICIENT_INFORMATION",
      "REQUIRES_PROFESSIONAL_REVIEW",
      "OVERRIDDEN_BY_REVIEW"
    ]).toContain(classificationBody.operation.result.normalizedOutcome);
    expect(classificationBody.operation.result.legalReviewRequired).toBe(true);

    expect((await postJson(`/api/v1/organizations/${organization.id}/assets`, { displayName: "Mail tenant" }, owner.cookie)).status).toBe(201);
    expect((await postJson(`/api/v1/organizations/${organization.id}/findings`, { title: "MFA gap", severity: "high" }, owner.cookie)).status).toBe(201);
    expect(
      (await postJson(`/api/v1/organizations/${organization.id}/remediation-plans`, { objective: "Close MFA gaps" }, owner.cookie)).status
    ).toBe(201);
    expect((await postJson(`/api/v1/organizations/${organization.id}/tasks`, { title: "Enable CA policy" }, owner.cookie)).status).toBe(201);
    expect((await postJson(`/api/v1/organizations/${organization.id}/risks`, { statement: "Credential misuse" }, owner.cookie)).status).toBe(201);
    expect((await postJson(`/api/v1/organizations/${organization.id}/policies`, { title: "Access Control" }, owner.cookie)).status).toBe(201);

    const incident = await postJson(
      `/api/v1/organizations/${organization.id}/incidents`,
      { title: "Suspicious inbox rule", awarenessTime: "2026-06-24T10:00:00.000Z" },
      owner.cookie
    );
    expect(incident.status).toBe(201);
    await expect(
      readJson<{ incident: { reportingClock: { earlyWarningDueAt: string; incidentNotificationDueAt: string } } }>(incident)
    ).resolves.toMatchObject({
      incident: {
        reportingClock: {
          earlyWarningDueAt: "2026-06-25T10:00:00.000Z",
          incidentNotificationDueAt: "2026-06-27T10:00:00.000Z"
        }
      }
    });

    const findings = await getJson(`/api/v1/organizations/${organization.id}/findings?limit=10`, owner.cookie);
    await expect(readJson<{ data: Array<{ status: string }> }>(findings)).resolves.toMatchObject({
      data: [{ status: "open" }]
    });
  });

  it("gates file-object deletion and creates immutable report snapshots with legal caveats", async () => {
    const owner = await registerAndLogin("file-owner");
    const outsider = await registerAndLogin("file-outsider");
    const { organization } = await createOrganization(owner.cookie, "Evidence Tenant", "RO");
    await createOrganization(outsider.cookie, "Other Evidence Tenant", "DE");

    const expiredPolicy = await postJson(
      `/api/v1/organizations/${organization.id}/retention-policies`,
      {
        name: "Immediate disposal test policy",
        retentionClass: "temporary",
        retainForDays: 0,
        allowDeleteAfterRetention: true
      },
      owner.cookie
    );
    expect(expiredPolicy.status).toBe(201);
    const expiredPolicyBody = await readJson<{ retentionPolicy: { id: string } }>(expiredPolicy);

    const defaultRetained = await postJson(
      `/api/v1/organizations/${organization.id}/file-objects`,
      {
        purpose: "uploaded_evidence",
        filename: "baseline.json",
        mimeType: "application/json",
        sizeBytes: 42,
        checksumSha256: "a".repeat(64),
        storage: { provider: "minio", bucket: "evidence", key: "org/baseline.json" },
        scanStatus: "clean",
        retentionClass: "evidence",
        sourceReferences: ["nis2-eu-article-21"]
      },
      owner.cookie
    );
    expect(defaultRetained.status).toBe(201);
    const defaultRetainedBody = await readJson<{ fileObject: { id: string; retainUntil: string } }>(defaultRetained);
    expect(defaultRetainedBody.fileObject.retainUntil).toBe("2033-06-22T09:00:00.000Z");

    const crossOrgRead = await getJson(`/api/v1/organizations/${organization.id}/file-objects`, outsider.cookie);
    expect(crossOrgRead.status).toBe(403);

    const retainedDelete = await requestJson(
      "DELETE",
      `/api/v1/organizations/${organization.id}/file-objects/${defaultRetainedBody.fileObject.id}`,
      { reason: "cleanup" },
      owner.cookie
    );
    expect(retainedDelete.status).toBe(409);
    await expect(readJson<{ error: { code: string } }>(retainedDelete)).resolves.toMatchObject({
      error: { code: "retention_delete_blocked" }
    });

    const held = await postJson(
      `/api/v1/organizations/${organization.id}/file-objects/${defaultRetainedBody.fileObject.id}/legal-hold`,
      { legalHold: true, reason: "audit hold" },
      owner.cookie
    );
    expect(held.status).toBe(200);

    const heldDelete = await requestJson(
      "DELETE",
      `/api/v1/organizations/${organization.id}/file-objects/${defaultRetainedBody.fileObject.id}`,
      { reason: "cleanup" },
      owner.cookie
    );
    expect(heldDelete.status).toBe(409);

    const disposable = await postJson(
      `/api/v1/organizations/${organization.id}/file-objects`,
      {
        purpose: "uploaded_evidence",
        filename: "scratch.txt",
        mimeType: "text/plain",
        sizeBytes: 5,
        checksumSha256: "b".repeat(64),
        storage: { provider: "minio", bucket: "evidence", key: "org/scratch.txt" },
        scanStatus: "clean",
        retentionClass: "temporary",
        retentionPolicyId: expiredPolicyBody.retentionPolicy.id
      },
      owner.cookie
    );
    expect(disposable.status).toBe(201);
    const disposableBody = await readJson<{ fileObject: { id: string } }>(disposable);

    const deleted = await requestJson(
      "DELETE",
      `/api/v1/organizations/${organization.id}/file-objects/${disposableBody.fileObject.id}`,
      { reason: "retention elapsed" },
      owner.cookie
    );
    expect(deleted.status).toBe(200);
    await expect(readJson<{ fileObject: { deletedAt: string; deleteReason: string } }>(deleted)).resolves.toMatchObject({
      fileObject: {
        deletedAt: "2026-06-24T09:00:00.000Z",
        deleteReason: "deleted_by_authorized_user"
      }
    });

    const templates = await getJson("/api/v1/report-templates", owner.cookie);
    expect(templates.status).toBe(200);
    const templateBody = await readJson<{ data: Array<{ templateKey: string; supportedFormats: string[] }> }>(templates);
    expect(templateBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          templateKey: "security_baseline",
          supportedFormats: ["json", "pdf"]
        })
      ])
    );

    const snapshotRequest = {
      templateKey: "security_baseline",
      locale: "ro",
      sourceReferences: ["nis2-eu-article-21", "country-pack-ro.review-required"],
      content: {
        summary: "Internal readiness snapshot"
      }
    };
    const snapshot = await postJson(
      `/api/v1/organizations/${organization.id}/report-snapshots`,
      snapshotRequest,
      owner.cookie,
      { "idempotency-key": "report-snapshot-once" }
    );
    expect(snapshot.status).toBe(202);
    const snapshotOperation = await readJson<{ operationId: string }>(snapshot);
    const snapshotResult = await getJson(`/api/v1/operations/${snapshotOperation.operationId}`, owner.cookie);
    const snapshotBody = await readJson<{
      operation: {
        kind: string;
        result: {
          reportSnapshot: {
            id: string;
            format: string;
            immutable: boolean;
            checksumSha256: string;
            legalCaveat: string;
            legalCaveatFallbackUsed: boolean;
            sourceReferences: string[];
          };
          fileObject: { purpose: string; filename: string; mimeType: string; checksumSha256: string; scanStatus: string; retentionClass: string };
        };
      };
    }>(snapshotResult);
    expect(snapshotBody.operation.kind).toBe("report");
    expect(snapshotBody.operation.result.reportSnapshot).toMatchObject({
      immutable: true,
      format: "json",
      legalCaveat: PURESOC_LEGAL_CAVEAT,
      legalCaveatFallbackUsed: true,
      sourceReferences: ["nis2-eu-article-21", "country-pack-ro.review-required"]
    });
    expect(snapshotBody.operation.result.fileObject).toMatchObject({
      purpose: "generated_report",
      filename: "security_baseline.ro.json",
      mimeType: "application/json",
      scanStatus: "skipped",
      retentionClass: "report_snapshot"
    });
    expect(snapshotBody.operation.result.fileObject.checksumSha256).toBe(
      snapshotBody.operation.result.reportSnapshot.checksumSha256
    );

    const retriedSnapshot = await postJson(
      `/api/v1/organizations/${organization.id}/report-snapshots`,
      snapshotRequest,
      owner.cookie,
      { "idempotency-key": "report-snapshot-once" }
    );
    expect(retriedSnapshot.status).toBe(202);
    await expect(readJson<{ operationId: string }>(retriedSnapshot)).resolves.toMatchObject({
      operationId: snapshotOperation.operationId
    });

    const snapshotList = await getJson(`/api/v1/organizations/${organization.id}/report-snapshots`, owner.cookie);
    await expect(readJson<{ data: Array<{ id: string }> }>(snapshotList)).resolves.toMatchObject({
      data: [{ id: snapshotBody.operation.result.reportSnapshot.id }]
    });

    const jsonDownload = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/report-snapshots/${snapshotBody.operation.result.reportSnapshot.id}/download`,
      { headers: { cookie: owner.cookie } }
    );
    expect(jsonDownload.status).toBe(200);
    expect(jsonDownload.headers.get("content-type")).toBe("application/json");
    expect(jsonDownload.headers.get("x-puresoc-content-sha256")).toBe(
      snapshotBody.operation.result.reportSnapshot.checksumSha256
    );
    const jsonDownloadText = await jsonDownload.text();
    expect(jsonDownloadText).toContain("Internal readiness snapshot");
    expect(jsonDownloadText).toContain(PURESOC_LEGAL_CAVEAT);

    const crossOrgDownload = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/report-snapshots/${snapshotBody.operation.result.reportSnapshot.id}/download`,
      { headers: { cookie: outsider.cookie } }
    );
    expect(crossOrgDownload.status).toBe(403);

    const pdfSnapshot = await postJson(
      `/api/v1/organizations/${organization.id}/report-snapshots`,
      {
        templateKey: "security_baseline",
        locale: "en",
        format: "pdf",
        sourceReferences: ["nis2-eu-article-21"],
        content: { summary: "PDF readiness snapshot" }
      },
      owner.cookie
    );
    expect(pdfSnapshot.status).toBe(202);
    const pdfSnapshotOperation = await readJson<{ operationId: string }>(pdfSnapshot);
    const pdfSnapshotResult = await getJson(`/api/v1/operations/${pdfSnapshotOperation.operationId}`, owner.cookie);
    const pdfSnapshotBody = await readJson<{
      operation: {
        result: {
          reportSnapshot: { id: string; format: string; checksumSha256: string };
          fileObject: { filename: string; mimeType: string; checksumSha256: string };
        };
      };
    }>(pdfSnapshotResult);
    expect(pdfSnapshotBody.operation.result.reportSnapshot.format).toBe("pdf");
    expect(pdfSnapshotBody.operation.result.fileObject).toMatchObject({
      filename: "security_baseline.en.pdf",
      mimeType: "application/pdf",
      checksumSha256: pdfSnapshotBody.operation.result.reportSnapshot.checksumSha256
    });

    const pdfDownload = await fetch(
      `${baseUrl}/api/v1/organizations/${organization.id}/report-snapshots/${pdfSnapshotBody.operation.result.reportSnapshot.id}/download`,
      { headers: { cookie: owner.cookie } }
    );
    expect(pdfDownload.status).toBe(200);
    expect(pdfDownload.headers.get("content-type")).toBe("application/pdf");
    expect(pdfDownload.headers.get("content-disposition")).toContain("security_baseline.en.pdf");
    expect(pdfDownload.headers.get("x-puresoc-content-sha256")).toBe(
      pdfSnapshotBody.operation.result.reportSnapshot.checksumSha256
    );
    const pdfText = Buffer.from(await pdfDownload.arrayBuffer()).toString("utf8");
    expect(pdfText).toContain("%PDF-1.4");
    expect(pdfText).toContain("puresoc.product_v1.report_snapshot.pdf_artifact.v1");
    expect(pdfText).toContain(PURESOC_LEGAL_CAVEAT);

    const auditRecords = "records" in services.auditSink
      ? (services.auditSink.records as Array<{ action: string }>)
      : [];
    expect(auditRecords.map((record) => record.action)).toEqual(
      expect.arrayContaining([
        "product_v1.file_object.delete_blocked",
        "product_v1.file_object.tombstoned",
        "product_v1.report_snapshot.downloaded"
      ])
    );
  });

  it("records supplier review, policy review, governance calendar, attestation, and training workflows", async () => {
    const owner = await registerAndLogin("governance-owner");
    const outsider = await registerAndLogin("governance-outsider");
    const { organization } = await createOrganization(owner.cookie, "Governance Tenant", "RO");
    await createOrganization(outsider.cookie, "Other Governance Tenant", "DE");

    const supplierResponse = await postJson(
      `/api/v1/organizations/${organization.id}/suppliers`,
      { name: "Payroll Processor", criticality: "high", services: ["payroll"], reviewCadenceMonths: 12 },
      owner.cookie
    );
    expect(supplierResponse.status).toBe(201);
    const supplierBody = await readJson<{ supplier: { id: string } }>(supplierResponse);

    const riskResponse = await postJson(
      `/api/v1/organizations/${organization.id}/risks`,
      { statement: "Supplier outage affects payroll", residualScore: 9 },
      owner.cookie
    );
    expect(riskResponse.status).toBe(201);
    const riskBody = await readJson<{ risk: { id: string } }>(riskResponse);

    const policyResponse = await postJson(
      `/api/v1/organizations/${organization.id}/policies`,
      { title: "Supplier Security Policy", reviewDueAt: "2026-09-30T00:00:00.000Z" },
      owner.cookie
    );
    expect(policyResponse.status).toBe(201);
    const policyBody = await readJson<{ policy: { id: string } }>(policyResponse);

    const evidenceResponse = await postJson(
      `/api/v1/organizations/${organization.id}/file-objects`,
      {
        purpose: "uploaded_evidence",
        filename: "supplier-review.json",
        mimeType: "application/json",
        sizeBytes: 128,
        checksumSha256: "c".repeat(64),
        storage: { provider: "minio", bucket: "evidence", key: "org/supplier-review.json" },
        scanStatus: "clean",
        retentionClass: "evidence"
      },
      owner.cookie
    );
    expect(evidenceResponse.status).toBe(201);
    const evidenceBody = await readJson<{ fileObject: { id: string } }>(evidenceResponse);

    const supplierReview = await postJson(
      `/api/v1/organizations/${organization.id}/supplier-reviews`,
      {
        supplierId: supplierBody.supplier.id,
        ownerUserId: owner.user.id,
        reviewDueAt: "2026-10-01T00:00:00.000Z",
        evidenceFileObjectIds: [evidenceBody.fileObject.id],
        riskIds: [riskBody.risk.id],
        notes: "Annual critical supplier review"
      },
      owner.cookie
    );
    expect(supplierReview.status).toBe(201);
    await expect(readJson<Record<string, { status: string; riskIds: string[]; evidenceFileObjectIds: string[] }>>(supplierReview))
      .resolves.toMatchObject({
        "supplier-review": {
          status: "scheduled",
          riskIds: [riskBody.risk.id],
          evidenceFileObjectIds: [evidenceBody.fileObject.id]
        }
      });

    const policyReview = await postJson(
      `/api/v1/organizations/${organization.id}/policy-reviews`,
      {
        policyDocumentId: policyBody.policy.id,
        reviewerUserId: owner.user.id,
        reviewDueAt: "2026-09-15T00:00:00.000Z"
      },
      owner.cookie
    );
    expect(policyReview.status).toBe(201);

    const acknowledgement = await postJson(
      `/api/v1/organizations/${organization.id}/policy-acknowledgements`,
      {
        policyDocumentId: policyBody.policy.id,
        acknowledgedByUserId: owner.user.id,
        dueAt: "2026-09-20T00:00:00.000Z"
      },
      owner.cookie
    );
    expect(acknowledgement.status).toBe(201);

    const activity = await postJson(
      `/api/v1/organizations/${organization.id}/governance-activities`,
      {
        title: "Quarterly supplier risk review",
        activityType: "supplier_review",
        linkedRiskIds: [riskBody.risk.id],
        linkedPolicyIds: [policyBody.policy.id],
        linkedSupplierIds: [supplierBody.supplier.id],
        dueAt: "2026-10-05T00:00:00.000Z"
      },
      owner.cookie
    );
    expect(activity.status).toBe(201);
    const activityBody = await readJson<Record<string, { id: string }>>(activity);

    const event = await postJson(
      `/api/v1/organizations/${organization.id}/governance-calendar-events`,
      {
        title: "Supplier review deadline",
        eventType: "deadline",
        startsAt: "2026-10-05T09:00:00.000Z",
        dueAt: "2026-10-05T17:00:00.000Z",
        sourceResourceType: "governance_activity",
        sourceResourceId: activityBody["governance-activity"].id,
        recurrence: "quarterly"
      },
      owner.cookie
    );
    expect(event.status).toBe(201);

    const attestation = await postJson(
      `/api/v1/organizations/${organization.id}/attestations`,
      {
        title: "Management security attestation",
        scope: "nis2-governance",
        evidenceFileObjectIds: [evidenceBody.fileObject.id],
        sourceReferences: ["nis2-eu-article-20"]
      },
      owner.cookie
    );
    expect(attestation.status).toBe(201);

    const training = await postJson(
      `/api/v1/organizations/${organization.id}/training-records`,
      {
        subject: "Incident reporting awareness",
        assigneeUserId: owner.user.id,
        dueAt: "2026-11-01T00:00:00.000Z",
        evidenceFileObjectIds: [evidenceBody.fileObject.id]
      },
      owner.cookie
    );
    expect(training.status).toBe(201);

    const outsiderRead = await getJson(`/api/v1/organizations/${organization.id}/governance-activities`, outsider.cookie);
    expect(outsiderRead.status).toBe(403);

    const reviews = await getJson(
      `/api/v1/organizations/${organization.id}/supplier-reviews?filter[status]=scheduled`,
      owner.cookie
    );
    await expect(readJson<{ data: Array<{ supplierId: string; status: string }> }>(reviews)).resolves.toMatchObject({
      data: [{ supplierId: supplierBody.supplier.id, status: "scheduled" }]
    });

    const calendar = await getJson(`/api/v1/organizations/${organization.id}/governance-calendar-events`, owner.cookie);
    await expect(readJson<{ data: Array<{ eventType: string; recurrence: string }> }>(calendar)).resolves.toMatchObject({
      data: [{ eventType: "deadline", recurrence: "quarterly" }]
    });
  });

  it("updates product workflow lifecycles with tenant scoping and audit before/after state", async () => {
    const owner = await registerAndLogin("lifecycle-owner");
    const { organization } = await createOrganization(owner.cookie, "Lifecycle Tenant", "RO");
    const { organization: otherOrganization } = await createOrganization(owner.cookie, "Lifecycle Other Tenant", "DE");

    const finding = await postJson(
      `/api/v1/organizations/${organization.id}/findings`,
      { title: "Privileged account drift", severity: "high" },
      owner.cookie
    );
    const findingBody = await readJson<{ finding: { id: string } }>(finding);
    const patchedFinding = await patchJson(
      `/api/v1/organizations/${organization.id}/findings/${findingBody.finding.id}`,
      { status: "in_progress", ownerUserId: owner.user.id },
      owner.cookie
    );
    expect(patchedFinding.status).toBe(200);
    await expect(readJson<{ finding: { status: string; ownerUserId: string } }>(patchedFinding)).resolves.toMatchObject({
      finding: { status: "in_progress", ownerUserId: owner.user.id }
    });

    const invalidFinding = await patchJson(
      `/api/v1/organizations/${organization.id}/findings/${findingBody.finding.id}`,
      { status: "done" },
      owner.cookie
    );
    expect(invalidFinding.status).toBe(400);

    const swappedOrganization = await patchJson(
      `/api/v1/organizations/${otherOrganization.id}/findings/${findingBody.finding.id}`,
      { status: "verified" },
      owner.cookie
    );
    expect(swappedOrganization.status).toBe(404);

    const task = await postJson(
      `/api/v1/organizations/${organization.id}/tasks`,
      { title: "Collect approval evidence", priority: "medium" },
      owner.cookie
    );
    const taskBody = await readJson<{ task: { id: string } }>(task);
    const patchedTask = await patchJson(
      `/api/v1/organizations/${organization.id}/tasks/${taskBody.task.id}`,
      { status: "DONE", priority: "high", dueDate: "2026-10-01T00:00:00.000Z" },
      owner.cookie
    );
    await expect(readJson<{ task: { status: string; priority: string; dueDate: string } }>(patchedTask)).resolves.toMatchObject({
      task: { status: "DONE", priority: "high", dueDate: "2026-10-01T00:00:00.000Z" }
    });

    const remediation = await postJson(
      `/api/v1/organizations/${organization.id}/remediation-plans`,
      { objective: "Close privileged account gaps" },
      owner.cookie
    );
    const remediationBody = await readJson<{ "remediation-plan": { id: string } }>(remediation);
    const patchedRemediation = await patchJson(
      `/api/v1/organizations/${organization.id}/remediation-plans/${remediationBody["remediation-plan"].id}`,
      { status: "active", ownerUserId: owner.user.id },
      owner.cookie
    );
    expect(patchedRemediation.status).toBe(200);

    const incident = await postJson(
      `/api/v1/organizations/${organization.id}/incidents`,
      { title: "Suspicious admin login", awarenessTime: "2026-06-24T10:00:00.000Z" },
      owner.cookie
    );
    const incidentBody = await readJson<{ incident: { id: string } }>(incident);
    const patchedIncident = await patchJson(
      `/api/v1/organizations/${organization.id}/incidents/${incidentBody.incident.id}`,
      { status: "RESOLVED" },
      owner.cookie
    );
    await expect(readJson<{ incident: { status: string } }>(patchedIncident)).resolves.toMatchObject({
      incident: { status: "RESOLVED" }
    });

    const risk = await postJson(
      `/api/v1/organizations/${organization.id}/risks`,
      { statement: "Privileged access misuse", residualScore: 12 },
      owner.cookie
    );
    const riskBody = await readJson<{ risk: { id: string } }>(risk);
    const patchedRisk = await patchJson(
      `/api/v1/organizations/${organization.id}/risks/${riskBody.risk.id}`,
      { state: "ASSESSED", treatment: "mitigate", residualScore: 8 },
      owner.cookie
    );
    await expect(readJson<{ risk: { state: string; treatment: string; residualScore: number } }>(patchedRisk)).resolves.toMatchObject({
      risk: { state: "ASSESSED", treatment: "mitigate", residualScore: 8 }
    });

    const policy = await postJson(
      `/api/v1/organizations/${organization.id}/policies`,
      { title: "Privileged Access Policy" },
      owner.cookie
    );
    const policyBody = await readJson<{ policy: { id: string } }>(policy);
    const patchedPolicy = await patchJson(
      `/api/v1/organizations/${organization.id}/policies/${policyBody.policy.id}`,
      { status: "published", reviewDueAt: "2027-01-01T00:00:00.000Z" },
      owner.cookie
    );
    await expect(readJson<{ policy: { status: string; reviewDueAt: string } }>(patchedPolicy)).resolves.toMatchObject({
      policy: { status: "published", reviewDueAt: "2027-01-01T00:00:00.000Z" }
    });

    const supplierReview = await postJson(
      `/api/v1/organizations/${organization.id}/supplier-reviews`,
      { supplierId: "supplier_123", riskIds: [riskBody.risk.id] },
      owner.cookie
    );
    const supplierReviewBody = await readJson<{ "supplier-review": { id: string } }>(supplierReview);
    const patchedSupplierReview = await patchJson(
      `/api/v1/organizations/${organization.id}/supplier-reviews/${supplierReviewBody["supplier-review"].id}`,
      { status: "completed", outcome: "acceptable", completedAt: "2026-10-01T12:00:00.000Z" },
      owner.cookie
    );
    await expect(readJson<{ "supplier-review": { status: string; outcome: string; completedAt: string } }>(patchedSupplierReview))
      .resolves.toMatchObject({
        "supplier-review": {
          status: "completed",
          outcome: "acceptable",
          completedAt: "2026-10-01T12:00:00.000Z"
        }
      });

    const policyReview = await postJson(
      `/api/v1/organizations/${organization.id}/policy-reviews`,
      { policyDocumentId: policyBody.policy.id },
      owner.cookie
    );
    const policyReviewBody = await readJson<{ "policy-review": { id: string } }>(policyReview);
    expect(
      (
        await patchJson(
          `/api/v1/organizations/${organization.id}/policy-reviews/${policyReviewBody["policy-review"].id}`,
          { status: "approved", completedAt: "2026-10-02T12:00:00.000Z" },
          owner.cookie
        )
      ).status
    ).toBe(200);

    const acknowledgement = await postJson(
      `/api/v1/organizations/${organization.id}/policy-acknowledgements`,
      { policyDocumentId: policyBody.policy.id, acknowledgedByUserId: owner.user.id },
      owner.cookie
    );
    const acknowledgementBody = await readJson<{ "policy-acknowledgement": { id: string } }>(acknowledgement);
    expect(
      (
        await patchJson(
          `/api/v1/organizations/${organization.id}/policy-acknowledgements/${acknowledgementBody["policy-acknowledgement"].id}`,
          { status: "acknowledged", acknowledgedAt: "2026-10-03T12:00:00.000Z" },
          owner.cookie
        )
      ).status
    ).toBe(200);

    const activity = await postJson(
      `/api/v1/organizations/${organization.id}/governance-activities`,
      { title: "Quarterly review", linkedRiskIds: [riskBody.risk.id] },
      owner.cookie
    );
    const activityBody = await readJson<{ "governance-activity": { id: string } }>(activity);
    expect(
      (
        await patchJson(
          `/api/v1/organizations/${organization.id}/governance-activities/${activityBody["governance-activity"].id}`,
          { status: "completed", completedAt: "2026-10-04T12:00:00.000Z" },
          owner.cookie
        )
      ).status
    ).toBe(200);

    const event = await postJson(
      `/api/v1/organizations/${organization.id}/governance-calendar-events`,
      { title: "Quarterly review due", startsAt: "2026-10-04T09:00:00.000Z" },
      owner.cookie
    );
    const eventBody = await readJson<{ "governance-calendar-event": { id: string } }>(event);
    expect(
      (
        await patchJson(
          `/api/v1/organizations/${organization.id}/governance-calendar-events/${eventBody["governance-calendar-event"].id}`,
          { status: "completed" },
          owner.cookie
        )
      ).status
    ).toBe(200);

    const attestation = await postJson(
      `/api/v1/organizations/${organization.id}/attestations`,
      { title: "Quarterly management attestation", sourceReferences: ["nis2-eu-article-20"] },
      owner.cookie
    );
    const attestationBody = await readJson<{ attestation: { id: string } }>(attestation);
    expect(
      (
        await patchJson(
          `/api/v1/organizations/${organization.id}/attestations/${attestationBody.attestation.id}`,
          { status: "submitted", attestedByUserId: owner.user.id, submittedAt: "2026-10-05T12:00:00.000Z" },
          owner.cookie
        )
      ).status
    ).toBe(200);

    const training = await postJson(
      `/api/v1/organizations/${organization.id}/training-records`,
      { subject: "Privileged access awareness", assigneeUserId: owner.user.id },
      owner.cookie
    );
    const trainingBody = await readJson<{ "training-record": { id: string } }>(training);
    expect(
      (
        await patchJson(
          `/api/v1/organizations/${organization.id}/training-records/${trainingBody["training-record"].id}`,
          { status: "completed", completedAt: "2026-10-06T12:00:00.000Z" },
          owner.cookie
        )
      ).status
    ).toBe(200);

    const auditRecords = "records" in services.auditSink
      ? (services.auditSink.records as Array<{ action: string; beforeJson?: unknown; afterJson?: unknown }>)
      : [];
    expect(auditRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "product_v1.findings.updated",
          beforeJson: expect.objectContaining({ status: "open" }),
          afterJson: expect.objectContaining({ status: "in_progress" })
        }),
        expect.objectContaining({
          action: "product_v1.training-records.updated",
          afterJson: expect.objectContaining({ status: "completed" })
        })
      ])
    );
  });

  it("records internal events and outbox publisher status for v1 workflows", async () => {
    const owner = await registerAndLogin("events-owner");
    const outsider = await registerAndLogin("events-outsider");
    const { organization } = await createOrganization(owner.cookie, "Events Tenant", "RO");
    await createOrganization(outsider.cookie, "Other Events Tenant", "DE");

    const finding = await postJson(
      `/api/v1/organizations/${organization.id}/findings`,
      { title: "Event-backed finding", severity: "medium" },
      owner.cookie,
      { "x-request-id": "req_event_create", "x-correlation-id": "corr_event" }
    );
    expect(finding.status).toBe(201);
    const findingBody = await readJson<{ finding: { id: string } }>(finding);

    const update = await patchJson(
      `/api/v1/organizations/${organization.id}/findings/${findingBody.finding.id}`,
      { status: "in_progress" },
      owner.cookie,
      { "x-request-id": "req_event_update", "x-correlation-id": "corr_event" }
    );
    expect(update.status).toBe(200);

    const outsiderEvents = await getJson(`/api/v1/organizations/${organization.id}/internal-events`, outsider.cookie);
    expect(outsiderEvents.status).toBe(403);

    const events = await getJson(
      `/api/v1/organizations/${organization.id}/internal-events?filter[outboxStatus]=pending`,
      owner.cookie
    );
    expect(events.status).toBe(200);
    const eventsBody = await readJson<{
      data: Array<{ id: string; eventType: string; aggregateId: string; outboxStatus: string; payload: Record<string, unknown> }>;
    }>(events);
    expect(eventsBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "product_v1.findings.created",
          aggregateId: findingBody.finding.id,
          outboxStatus: "pending",
          payload: expect.objectContaining({ requestId: "req_event_create", correlationId: "corr_event" })
        }),
        expect.objectContaining({
          eventType: "product_v1.findings.updated",
          aggregateId: findingBody.finding.id,
          outboxStatus: "pending",
          payload: expect.objectContaining({ requestId: "req_event_update", correlationId: "corr_event" })
        })
      ])
    );

    const updateEvent = eventsBody.data.find((event) => event.eventType === "product_v1.findings.updated");
    expect(updateEvent).toBeDefined();
    const publishResult = await postJson(
      `/api/v1/organizations/${organization.id}/internal-events/${updateEvent?.id}/publish-result`,
      { outboxStatus: "published" },
      owner.cookie
    );
    expect(publishResult.status).toBe(200);
    await expect(readJson<{ internalEvent: { outboxStatus: string; attempts: number; publishedAt: string } }>(publishResult))
      .resolves.toMatchObject({
        internalEvent: {
          outboxStatus: "published",
          attempts: 1,
          publishedAt: "2026-06-24T09:00:00.000Z"
        }
      });

    const invalidPublishResult = await postJson(
      `/api/v1/organizations/${organization.id}/internal-events/${updateEvent?.id}/publish-result`,
      { outboxStatus: "delivered" },
      owner.cookie
    );
    expect(invalidPublishResult.status).toBe(400);

    const auditRecords = "records" in services.auditSink
      ? (services.auditSink.records as Array<{ action: string; afterJson?: unknown }>)
      : [];
    expect(auditRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "product_v1.internal_event.publish_result_recorded",
          afterJson: expect.objectContaining({ outboxStatus: "published", attempts: 1 })
        })
      ])
    );
  });

  it("maps Microsoft capability states, idempotent sync operations, and safe disconnect semantics", async () => {
    const owner = await registerAndLogin("m365-owner");
    const { organization } = await createOrganization(owner.cookie, "Microsoft Tenant", "RO");
    const begin = await services.microsoft365ProviderConnections.beginConsent({
      organizationId: organization.id,
      actorUserId: owner.user.id,
      redirectUri: "https://app.example.test/providers/microsoft365/callback"
    });
    const completed = await services.microsoft365ProviderConnections.completeConsent({
      organizationId: organization.id,
      actorUserId: owner.user.id,
      state: begin.state,
      tenantId: "11111111-1111-1111-1111-111111111111",
      adminConsent: true,
      authorizationCode: "fixture-code"
    });
    const providerConnectionId = completed.connection.id;

    await services.providerConnections.store.upsertCapability({
      organizationId: organization.id,
      providerConnectionId,
      providerKey: "microsoft365",
      moduleKey: "secure-score",
      capabilityKey: "secure-score.permission-required",
      available: false,
      licenseRequired: [],
      licenseDetected: [],
      permissionsRequired: ["SecurityEvents.Read.All"],
      permissionsGranted: [],
      status: "missing_permission",
      statusReason: "Permission missing."
    });
    await services.providerConnections.store.upsertCapability({
      organizationId: organization.id,
      providerConnectionId,
      providerKey: "microsoft365",
      moduleKey: "defender",
      capabilityKey: "defender.unsupported-cloud",
      available: false,
      licenseRequired: [],
      licenseDetected: [],
      permissionsRequired: [],
      permissionsGranted: [],
      status: "unsupported_api",
      statusReason: "Unsupported national cloud."
    });
    await services.providerConnections.store.upsertCapability({
      organizationId: organization.id,
      providerConnectionId,
      providerKey: "microsoft365",
      moduleKey: "entra-users",
      capabilityKey: "entra-users.temporary",
      available: false,
      licenseRequired: [],
      licenseDetected: [],
      permissionsRequired: [],
      permissionsGranted: [],
      status: "rate_limited",
      statusReason: "Graph retry budget exceeded."
    });

    const capabilities = await getJson(`/api/v1/organizations/${organization.id}/provider-capabilities?limit=50`, owner.cookie);
    expect(capabilities.status).toBe(200);
    const capabilityBody = await readJson<{ data: Array<{ state: string }> }>(capabilities);
    expect(capabilityBody.data.map((capability) => capability.state)).toEqual(
      expect.arrayContaining(["AVAILABLE", "PERMISSION_REQUIRED", "UNSUPPORTED_CLOUD", "TEMPORARILY_UNAVAILABLE"])
    );

    const syncHeaders = { "idempotency-key": "m365-sync-once" };
    const firstSync = await postJson(
      `/api/v1/organizations/${organization.id}/connectors/microsoft365/sync-runs`,
      { providerConnectionId, requestedModules: ["tenant-profile"] },
      owner.cookie,
      syncHeaders
    );
    expect(firstSync.status).toBe(202);
    const firstSyncBody = await readJson<{ operationId: string }>(firstSync);

    const secondSync = await postJson(
      `/api/v1/organizations/${organization.id}/connectors/microsoft365/sync-runs`,
      { providerConnectionId, requestedModules: ["tenant-profile"] },
      owner.cookie,
      syncHeaders
    );
    expect(secondSync.status).toBe(202);
    await expect(readJson<{ operationId: string }>(secondSync)).resolves.toEqual(firstSyncBody);

    await expect(services.providerConnections.store.listCredentials(organization.id, providerConnectionId)).resolves.not.toEqual([]);
    const disconnect = await postJson(
      `/api/v1/organizations/${organization.id}/connectors/microsoft365/disconnect`,
      { providerConnectionId, reason: "rotating tenant consent" },
      owner.cookie,
      { "idempotency-key": "m365-disconnect-once" }
    );
    expect(disconnect.status).toBe(202);
    await expect(services.providerConnections.store.listCredentials(organization.id, providerConnectionId)).resolves.toEqual([]);
    await expect(services.providerConnections.store.getConnectionForOrganization(organization.id, providerConnectionId))
      .resolves.toMatchObject({
        status: "revoked",
        readEnabled: false,
        writeEnabled: false
      });
    const disconnectedCapabilities = await services.providerConnections.store.listCapabilities(
      organization.id,
      providerConnectionId
    );
    expect(disconnectedCapabilities.every((capability) => capability.available === false)).toBe(true);
    expect(disconnectedCapabilities.every((capability) => capability.status === "revoked_consent")).toBe(true);
  });
});
