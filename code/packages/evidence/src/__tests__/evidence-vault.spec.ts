import { describe, expect, it } from "vitest";

import {
  EvidenceVault,
  EvidenceAccessError,
  InMemoryEvidenceRepository,
  InMemoryObjectStorageAdapter,
  MockUploadScanner,
  NoopUploadScanner,
  S3ObjectStorageAdapter
} from "../index";

describe("evidence vault metadata and access audit", () => {
  it("stores metadata, object storage pointers, source links, and audited downloads without public URLs", async () => {
    const repository = new InMemoryEvidenceRepository();
    const vault = new EvidenceVault({
      repository,
      storage: new InMemoryObjectStorageAdapter(),
      scanner: new NoopUploadScanner({ now: () => new Date("2026-04-30T10:00:00.000Z") }),
      now: () => new Date("2026-04-30T10:00:00.000Z")
    });

    const artifact = await vault.uploadEvidence({
      organizationId: "org_evidence",
      actorUserId: "user_1",
      sourceType: "manual_upload",
      manualSourceLabel: "security policy upload",
      title: "MFA policy evidence",
      body: "policy text",
      mimeType: "text/plain",
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      requirementKey: "mfa-coverage-evidence",
      linkedAssessmentId: "assessment_1",
      linkedSourceRecordId: "eu-nis2-art-21",
      retentionPolicy: "nis2-readiness-7y",
      retentionExpiresAt: "2033-04-30T00:00:00.000Z"
    });
    const download = await vault.downloadEvidence({
      organizationId: "org_evidence",
      actorUserId: "user_1",
      evidenceArtifactId: artifact.id
    });

    expect(artifact.storageUri).toMatch(/^object:\/\/evidence\/org_evidence\//);
    expect(artifact.storageUri).not.toContain("http");
    expect(artifact.links.map((link) => link.targetType)).toEqual([
      "control",
      "jurisdiction",
      "regulatory_source",
      "assessment"
    ]);
    expect(download.contentHashSha256).toBe(artifact.contentHashSha256);
    expect(repository.accessLogs).toHaveLength(1);
    expect(repository.accessLogs[0]).toMatchObject({
      organizationId: "org_evidence",
      evidenceArtifactId: artifact.id,
      action: "download"
    });
  });

  it("rejects infected uploads and fails closed when clean scan completion is required", async () => {
    const infectedVault = new EvidenceVault({
      repository: new InMemoryEvidenceRepository(),
      storage: new InMemoryObjectStorageAdapter(),
      scanner: new MockUploadScanner({
        status: "infected",
        findings: ["eicar-test-signature"],
        now: () => new Date("2026-04-30T10:00:00.000Z")
      }),
      now: () => new Date("2026-04-30T10:00:00.000Z")
    });

    await expect(
      infectedVault.uploadEvidence({
        organizationId: "org_scan",
        actorUserId: "user_scan",
        title: "Rejected evidence",
        body: "bad",
        mimeType: "text/plain",
        sourceType: "manual_upload"
      })
    ).rejects.toMatchObject({
      code: "upload_rejected_by_scanner"
    });

    const failClosedVault = new EvidenceVault({
      repository: new InMemoryEvidenceRepository(),
      storage: new InMemoryObjectStorageAdapter(),
      scanner: new MockUploadScanner({
        status: "failed",
        findings: ["scanner_unreachable"],
        now: () => new Date("2026-04-30T10:00:00.000Z")
      }),
      rejectUnscannedUploads: true,
      now: () => new Date("2026-04-30T10:00:00.000Z")
    });

    await expect(
      failClosedVault.uploadEvidence({
        organizationId: "org_scan",
        actorUserId: "user_scan",
        title: "Failed scanner evidence",
        body: "unknown",
        mimeType: "text/plain",
        sourceType: "manual_upload"
      })
    ).rejects.toMatchObject({
      code: "upload_rejected_by_scanner"
    });
  });

  it("links pre-state and post-state evidence to action runs", async () => {
    const vault = new EvidenceVault({
      repository: new InMemoryEvidenceRepository(),
      storage: new InMemoryObjectStorageAdapter(),
      scanner: new MockUploadScanner({
        status: "clean",
        now: () => new Date("2026-04-30T10:00:00.000Z")
      }),
      now: () => new Date("2026-04-30T10:00:00.000Z")
    });

    const artifact = await vault.uploadEvidence({
      organizationId: "org_action_evidence",
      actorUserId: "user_1",
      sourceType: "action_pre_state",
      title: "Pre-state Conditional Access snapshot",
      body: "{}",
      mimeType: "application/json",
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      linkedActionId: "action_run_1"
    });

    expect(artifact.linkedActionId).toBe("action_run_1");
    expect(artifact.links).toContainEqual(
      expect.objectContaining({
        targetType: "action_run",
        targetId: "action_run_1",
        relation: "action_evidence"
      })
    );
  });

  it("requires an explicit override before no-op scanning can run in production", () => {
    expect(
      () =>
        new NoopUploadScanner({
          environment: "production"
        })
    ).toThrow(EvidenceAccessError);

    expect(
      new NoopUploadScanner({
        environment: "production",
        allowInProduction: true,
        reason: "documented_break_glass"
      })
    ).toBeInstanceOf(NoopUploadScanner);
  });

  it("stores and reads evidence through a S3-compatible adapter without exposing public URLs", async () => {
    const requests: Array<{ url: string; method?: string; headers: Headers; bodyText?: string }> = [];
    const adapter = new S3ObjectStorageAdapter({
      endpoint: "http://minio.local:9000",
      region: "us-east-1",
      bucket: "puresoc-evidence",
      accessKeyId: "local-access",
      secretAccessKey: "local-secret",
      now: () => new Date("2026-04-30T10:00:00.000Z"),
      fetchImpl: async (url, init) => {
        const headers = new Headers(init?.headers);
        requests.push({
          url: url.toString(),
          method: init?.method,
          headers,
          bodyText: init?.body ? Buffer.from(init.body as Uint8Array).toString("utf8") : undefined
        });

        if (init?.method === "PUT") {
          return new Response("", { status: 200 });
        }

        return new Response("stored evidence", {
          status: 200,
          headers: {
            "content-type": "text/plain"
          }
        });
      }
    });

    const stored = await adapter.putObject({
      organizationId: "org_s3",
      objectKey: "artifact/report.json",
      body: Buffer.from("stored evidence", "utf8"),
      mimeType: "application/json",
      metadata: {
        evidenceId: "evidence_s3"
      }
    });
    const read = await adapter.readObject({
      organizationId: "org_s3",
      storageUri: stored.storageUri
    });

    expect(stored.storageUri).toBe("s3://puresoc-evidence/evidence/org_s3/artifact/report.json");
    expect(stored.storageUri).not.toContain("http");
    expect(Buffer.from(read.body).toString("utf8")).toBe("stored evidence");
    expect(requests[0]?.url).toBe("http://minio.local:9000/puresoc-evidence/evidence/org_s3/artifact/report.json");
    expect(requests[0]?.headers.get("authorization")).toContain("AWS4-HMAC-SHA256");
    expect(requests[0]?.headers.get("authorization")).not.toContain("local-secret");
    await expect(
      adapter.readObject({
        organizationId: "org_other",
        storageUri: stored.storageUri
      })
    ).rejects.toMatchObject({
      code: "evidence_not_found"
    });
  });
});
