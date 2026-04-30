import { describe, expect, it } from "vitest";

import {
  EvidenceVault,
  InMemoryEvidenceRepository,
  InMemoryObjectStorageAdapter,
  NoopUploadScanner
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
});
