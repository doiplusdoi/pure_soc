import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { LEGAL_CAVEAT_MESSAGE_KEY, PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import {
  buildInternalReadinessEvidencePackageExport,
  buildInternalReadinessCsvExport,
  buildPdfReportHtml,
  buildInternalReadinessReport,
  buildRomaniaNotificationDraftExport,
  loadNis2ReadinessCalibration,
  ReportExportError,
  stableCsvExport,
  stableJsonExport,
  validateNis2ReadinessCalibration
} from "../index";

const sourceReference = {
  sourceRecordId: "eu-nis2-art-21",
  title: "NIS2 Article 21",
  jurisdiction: "EU",
  article: "21",
  sourceVersion: "2022/2555"
};

describe("reports exports stable JSON contracts", () => {
  it("builds caveated internal readiness reports from stored analysis records with source references", () => {
    const report = buildInternalReadinessReport({
      organizationId: "org_reports",
      assessmentId: "assessment_reports",
      jurisdiction: "EU",
      generatedAt: "2026-04-30T10:00:00.000Z",
      catalogVersion: "phase-h-seed",
      classificationResult: {
        confidence: "low",
        countryCode: "PL",
        explanation: "Food activity is possibly in scope and needs review.",
        legalReviewRequired: true,
        missingInformation: ["annual_turnover"],
        result: "possibly_in_scope"
      },
      countryPackVersion: "2026.06.demo",
      onboardingSchemaVersion: "puresoc.nis2.onboarding.v1",
      analysisRecordedAt: "2026-04-30T09:00:00.000Z",
      reportBranding: {
        organizationName: "Asterion Tools",
        legalName: "Asterion Tools SRL",
        logoDataUrl: "data:image/png;base64,iVBORw0KGgo="
      },
      controlResults: [
        {
          organizationId: "org_reports",
          assessmentId: "assessment_reports",
          controlId: "nis2.access-control.mfa",
          controlCode: "A21-MFA",
          jurisdiction: "EU",
          status: "needs_evidence",
          confidence: "medium",
          summary: "MFA evidence is missing.",
          evidenceArtifactIds: [],
          providerSignalIds: ["finding_1"],
          sourceReferences: [sourceReference]
        }
      ],
      gaps: [
        {
          organizationId: "org_reports",
          assessmentId: "assessment_reports",
          controlId: "nis2.access-control.mfa",
          jurisdiction: "EU",
          severity: "medium",
          summary: "Upload MFA evidence.",
          missingEvidence: ["MFA coverage export"],
          recommendedActions: ["Upload or link evidence: MFA coverage export"],
          sourceReferences: [sourceReference]
        }
      ],
      recommendations: [
        {
          id: "rec_1",
          organizationId: "org_reports",
          controlId: "nis2.access-control.mfa",
          jurisdiction: "EU",
          title: "Upload MFA coverage evidence",
          severity: "medium",
          summary: "Evidence is required for internal readiness.",
          evidenceRequired: true,
          sourceReferences: [sourceReference]
        }
      ],
      evidence: []
    });

    expect(report.legalCaveat).toBe(PURESOC_LEGAL_CAVEAT);
    expect(report.legalCaveat).toContain("not a legal opinion");
    expect(report.legalCaveatMessageKey).toBe(LEGAL_CAVEAT_MESSAGE_KEY);
    expect(report.legalCaveatLocale).toBe("en");
    expect(report.legalCaveatFallbackUsed).toBe(false);
    expect(report.legalCaveatFallbackReason).toBeUndefined();
    expect(report.legalCaveatRequestedLocale).toBeUndefined();
    expect(report.legalCaveatReviewStatus).toBe("source_approved");
    expect(report.locale).toBe("en");
    expect(report.reportBranding).toEqual({
      organizationName: "Asterion Tools",
      legalName: "Asterion Tools SRL",
      logoDataUrl: "data:image/png;base64,iVBORw0KGgo="
    });
    expect(report.version).toMatchObject({
      countryPackVersion: "2026.06.demo",
      calibrationReviewStatus: "requires_product_legal_review",
      calibrationVersion: "nis2-readiness-calibration.v1",
      immutable: true,
      methodologyVersion: "puresoc.readiness.declared.v1",
      onboardingSchemaVersion: "puresoc.nis2.onboarding.v1",
      reportVersion: 1,
      triggerType: "onboarding_completed",
      inputSnapshot: {
        assessmentId: "assessment_reports",
        controlResultCount: 1,
        evidenceArtifactCount: 0,
        gapCount: 1,
        recommendationCount: 1,
        classificationResult: {
          legalReviewRequired: true,
          result: "possibly_in_scope"
        }
      }
    });
    expect(report.calibration).toMatchObject({
      calibrationVersion: "nis2-readiness-calibration.v1",
      reviewStatus: "requires_product_legal_review",
      scoreSeparationPolicy: {
        readinessScore: expect.stringContaining("internal control status"),
        evidenceConfidence: expect.stringContaining("uploaded or provider-verified evidence"),
        legalApplicability: expect.stringContaining("country-pack classification")
      }
    });
    expect(report.calibration.factors.map((factor) => factor.dimension)).toEqual(
      expect.arrayContaining([
        "proportionality",
        "entityCriticality",
        "sizeStructure",
        "likelihood",
        "severity",
        "societalEconomicImpact"
      ])
    );
    expect(report.concepts).toMatchObject({
      applicability: {
        result: "possibly_in_scope",
        legalReviewRequired: true
      },
      readiness: {
        value: 0,
        result: "low",
        applicableControlCount: 1
      },
      evidenceConfidence: {
        value: 0,
        result: "low",
        missingEvidenceCount: 1
      },
      priority: {
        result: "medium",
        criticalGapCount: 0,
        highGapCount: 0
      }
    });
    expect(report.provenance.source).toBe("stored_analysis");
    expect(report.sourceReferences.map((reference) => reference.sourceRecordId)).toEqual(
      expect.arrayContaining([
        "eu-nis2-art-21",
        "eu-nis2-directive-2022-2555",
        "eu-implementing-regulation-2024-2690"
      ])
    );
    expect(report.gaps[0]?.sourceReferences[0]?.sourceRecordId).toBe("eu-nis2-art-21");

    const csvExport = buildInternalReadinessCsvExport(report);
    expect(csvExport).toMatchObject({
      schemaVersion: "puresoc.export.internal_readiness_csv.v1",
      exportFormat: "csv",
      rowCount: 8,
      tableNames: ["metadata", "control_results", "gaps", "recommendations", "source_references"]
    });
    expect(csvExport.csv).toContain("table,record_key,control_id,control_code,jurisdiction");
    expect(csvExport.csv).toContain("metadata,legal_caveat");
    expect(csvExport.csv).toContain("eu-implementing-regulation-2024-2690");
    expect(csvExport.csv).toContain("control_results,nis2.access-control.mfa");
    expect(csvExport.csv).toContain("gaps,nis2.access-control.mfa:1");
    expect(csvExport.csv).toContain("recommendations,nis2.access-control.mfa:1");
    expect(csvExport.csv).toContain('"This assessment is generated by PureSOC/SiSoN');
    expect(csvExport.csv).not.toContain("publicUrl");
  });

  it("loads source-backed NIS2 calibration and rejects unsourced numeric weights", () => {
    const calibration = loadNis2ReadinessCalibration();
    expect(calibration.reviewStatus).toBe("requires_product_legal_review");
    expect(calibration.factors.every((factor) => factor.sourceReferences.length > 0 && factor.rationale.length > 0)).toBe(
      true
    );
    expect(calibration.factors.every((factor) => factor.weight === null)).toBe(true);

    const invalid = JSON.parse(JSON.stringify(calibration)) as Record<string, unknown>;
    const factors = invalid.factors as Array<Record<string, unknown>>;
    factors[0] = {
      ...factors[0],
      weight: 0.5,
      sourceReferences: [],
      sourceReferenceIds: []
    };
    expect(() => validateNis2ReadinessCalibration(invalid)).toThrow(/sourceReferenceIds|source references/i);
  });

  it("builds immutable version 2 verified-evidence reports with contradictions and comparison deltas", () => {
    const reportV1 = buildInternalReadinessReport({
      organizationId: "org_reports",
      assessmentId: "assessment_verified",
      jurisdiction: "EU",
      generatedAt: "2026-06-19T08:00:00.000Z",
      controlResults: [
        {
          organizationId: "org_reports",
          assessmentId: "assessment_verified",
          controlId: "nis2.access-control.mfa",
          controlCode: "A21-MFA",
          jurisdiction: "EU",
          status: "compliant",
          confidence: "medium",
          summary: "Customer declared MFA complete.",
          evidenceArtifactIds: [],
          providerSignalIds: [],
          sourceReferences: [sourceReference]
        }
      ],
      gaps: [],
      recommendations: []
    });
    const immutableV1Json = stableJsonExport(reportV1);

    const reportV2 = buildInternalReadinessReport({
      organizationId: "org_reports",
      assessmentId: "assessment_verified",
      jurisdiction: "EU",
      generatedAt: "2026-06-19T09:00:00.000Z",
      previousReportId: "report_v1",
      previousReport: reportV1,
      reportVersion: 2,
      triggerType: "microsoft_sync_completed",
      methodologyVersion: "puresoc.readiness.verified-microsoft.v1",
      controlResults: [
        {
          organizationId: "org_reports",
          assessmentId: "assessment_verified",
          controlId: "nis2.access-control.mfa",
          controlCode: "A21-MFA",
          jurisdiction: "EU",
          status: "compliant",
          confidence: "medium",
          summary: "Customer declared MFA complete.",
          evidenceArtifactIds: [],
          providerSignalIds: [],
          sourceReferences: [sourceReference]
        }
      ],
      gaps: [],
      recommendations: [],
      verifiedEvidence: {
        providerKey: "microsoft365",
        providerConnectionId: "m365_connection_1",
        syncRunId: "sync_1",
        generatedAt: "2026-06-19T09:00:00.000Z",
        observations: [
          {
            id: "m365:mfa-registration:coverage",
            controlId: "nis2.access-control.mfa",
            title: "Microsoft MFA registration coverage",
            summary: "32 of 100 Microsoft 365 users are registered for MFA (32%).",
            provenance: "verified_through_microsoft",
            providerKey: "microsoft365",
            providerConnectionId: "m365_connection_1",
            syncRunId: "sync_1",
            moduleKey: "mfa-registration",
            observedAt: "2026-06-19T09:00:00.000Z",
            status: "verified_gap",
            readinessImpact: "reduces",
            evidenceConfidenceImpact: "improves"
          }
        ]
      }
    });

    expect(stableJsonExport(reportV1)).toBe(immutableV1Json);
    expect(reportV2.version).toMatchObject({
      immutable: true,
      previousReportId: "report_v1",
      reportVersion: 2,
      triggerType: "microsoft_sync_completed"
    });
    expect(reportV2.controlResults[0]).toMatchObject({
      status: "failing",
      confidence: "high",
      providerSignalIds: ["m365:mfa-registration:coverage"],
      provenance: ["declared_by_customer", "verified_through_microsoft"]
    });
    expect(reportV2.verifiedEvidence?.contradictions).toEqual([
      expect.objectContaining({
        controlId: "nis2.access-control.mfa",
        declaredStatus: "compliant",
        verifiedStatus: "verified_gap",
        effectiveStatus: "failing",
        readinessDelta: -100,
        evidenceConfidenceDelta: 100
      })
    ]);
    expect(reportV2.concepts.readiness.value).toBe(0);
    expect(reportV2.concepts.evidenceConfidence.value).toBe(100);
    expect(reportV2.comparison).toMatchObject({
      previousReportId: "report_v1",
      readinessDelta: -100,
      evidenceConfidenceDelta: 100,
      contradictions: ["contradiction:m365:mfa-registration:coverage"],
      newVerifiedFindings: ["m365:mfa-registration:coverage"],
      newRecommendations: ["Resolve verified Microsoft MFA registration coverage"]
    });
    expect(reportV2.recommendations[0]).toMatchObject({
      title: "Resolve verified Microsoft MFA registration coverage",
      provenance: ["verified_through_microsoft"]
    });

    const html = buildPdfReportHtml({
      template: "gap_report",
      reportData: reportV2,
      title: "Verified Internal Readiness"
    });
    expect(html).toContain("Declared vs verified comparison");
    expect(html).toContain("Readiness delta");
    expect(html).toContain("-100%");
    expect(html).toContain("Customer declared MFA complete.");
    expect(html).toContain("32 of 100 Microsoft 365 users");
  });

  it("builds deterministic binary evidence packages with manifest, report, csv, and local evidence files", () => {
    const evidenceBody = Buffer.from("quarterly MFA attestation", "utf8");
    const evidenceHash = createHash("sha256").update(evidenceBody).digest("hex");
    const report = buildInternalReadinessReport({
      organizationId: "org_reports",
      assessmentId: "assessment_reports",
      jurisdiction: "EU",
      generatedAt: "2026-04-30T10:00:00.000Z",
      catalogVersion: "phase-h-seed",
      analysisRecordedAt: "2026-04-30T09:00:00.000Z",
      controlResults: [
        {
          organizationId: "org_reports",
          assessmentId: "assessment_reports",
          controlId: "nis2.access-control.mfa",
          controlCode: "A21-MFA",
          jurisdiction: "EU",
          status: "compliant",
          confidence: "medium",
          summary: "MFA evidence is present.",
          evidenceArtifactIds: ["evidence_mfa"],
          providerSignalIds: [],
          sourceReferences: [sourceReference]
        }
      ],
      gaps: [],
      recommendations: [],
      evidence: [
        {
          id: "evidence_mfa",
          organizationId: "org_reports",
          title: "Quarterly MFA Attestation",
          sourceType: "manual_upload",
          controlId: "nis2.access-control.mfa",
          jurisdiction: "EU",
          contentHashSha256: evidenceHash,
          mimeType: "text/plain",
          scanStatus: "clean",
          createdAt: "2026-04-30T09:30:00.000Z",
          linkedSourceRecordId: "eu-nis2-art-21"
        }
      ]
    });

    const packageExport = buildInternalReadinessEvidencePackageExport({
      report,
      evidenceFiles: [
        {
          artifactId: "evidence_mfa",
          title: "Quarterly MFA Attestation",
          mimeType: "text/plain",
          body: evidenceBody,
          contentHashSha256: evidenceHash
        }
      ]
    });

    expect(packageExport).toMatchObject({
      schemaVersion: "puresoc.export.internal_readiness_evidence_package.v1",
      exportFormat: "binary_evidence_package",
      mimeType: "application/x-tar",
      fileName: "puresoc-internal-readiness-assessment_reports.tar",
      contentHashSha256: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
    expect(packageExport.manifest).toMatchObject({
      schemaVersion: "puresoc.export.internal_readiness_evidence_package_manifest.v1",
      legalCaveat: PURESOC_LEGAL_CAVEAT,
      exportLimits: {
        maxEvidenceFiles: 250,
        maxEvidenceFileBytes: 10_485_760,
        maxBundleBytes: 52_428_800
      },
      files: expect.arrayContaining([
        expect.objectContaining({ path: "reports/internal-readiness.json", role: "report_json" }),
        expect.objectContaining({ path: "reports/internal-readiness.csv", role: "report_csv" }),
        expect.objectContaining({
          path: "evidence/evidence_mfa-quarterly-mfa-attestation.txt",
          role: "evidence_artifact",
          evidenceArtifactId: "evidence_mfa"
        })
      ])
    });
    expect(packageExport.manifestJson).toContain("not a legal opinion");
    expect(packageExport.manifestJson).not.toContain("storageUri");
    expect(packageExport.manifestJson).not.toContain("publicUrl");

    const entries = readTarEntries(packageExport.bundle);
    expect(entries.map((entry) => entry.path)).toEqual([
      "manifest.json",
      "evidence/evidence_mfa-quarterly-mfa-attestation.txt",
      "reports/internal-readiness.csv",
      "reports/internal-readiness.json"
    ]);
    expect(entries.find((entry) => entry.path === "manifest.json")?.body.toString("utf8")).toBe(
      packageExport.manifestJson
    );
    expect(entries.find((entry) => entry.path === "reports/internal-readiness.json")?.body.toString("utf8")).toContain(
      '"schemaVersion": "puresoc.report.internal_readiness.v1"'
    );
    expect(entries.find((entry) => entry.path === "reports/internal-readiness.csv")?.body.toString("utf8")).toContain(
      "metadata,legal_caveat"
    );
    expect(
      entries.find((entry) => entry.path === "evidence/evidence_mfa-quarterly-mfa-attestation.txt")?.body.toString(
        "utf8"
      )
    ).toBe("quarterly MFA attestation");
  });

  it("rejects oversized local evidence packages before returning bundle bytes", () => {
    const firstEvidenceBody = Buffer.from("first evidence", "utf8");
    const secondEvidenceBody = Buffer.from("second evidence", "utf8");
    const firstEvidenceHash = createHash("sha256").update(firstEvidenceBody).digest("hex");
    const secondEvidenceHash = createHash("sha256").update(secondEvidenceBody).digest("hex");
    const report = buildInternalReadinessReport({
      organizationId: "org_reports",
      assessmentId: "assessment_reports",
      jurisdiction: "EU",
      generatedAt: "2026-04-30T10:00:00.000Z",
      catalogVersion: "phase-h-seed",
      analysisRecordedAt: "2026-04-30T09:00:00.000Z",
      controlResults: [],
      gaps: [],
      recommendations: [],
      evidence: [
        {
          id: "evidence_first",
          organizationId: "org_reports",
          title: "First Evidence",
          sourceType: "manual_upload",
          contentHashSha256: firstEvidenceHash,
          mimeType: "text/plain",
          scanStatus: "clean",
          createdAt: "2026-04-30T09:30:00.000Z"
        },
        {
          id: "evidence_second",
          organizationId: "org_reports",
          title: "Second Evidence",
          sourceType: "manual_upload",
          contentHashSha256: secondEvidenceHash,
          mimeType: "text/plain",
          scanStatus: "clean",
          createdAt: "2026-04-30T09:31:00.000Z"
        }
      ]
    });

    expectReportExportError(
      () =>
        buildInternalReadinessEvidencePackageExport({
          report,
          evidenceFiles: [],
          limits: {
            maxEvidenceFiles: 1
          }
        }),
      "evidence_package_too_many_evidence_files"
    );

    expectReportExportError(
      () =>
        buildInternalReadinessEvidencePackageExport({
          report,
          evidenceFiles: [
            {
              artifactId: "evidence_first",
              title: "First Evidence",
              mimeType: "text/plain",
              body: firstEvidenceBody,
              contentHashSha256: firstEvidenceHash
            }
          ],
          limits: {
            maxEvidenceFiles: 2,
            maxEvidenceFileBytes: 4
          }
        }),
      "evidence_package_evidence_file_too_large"
    );

    expectReportExportError(
      () =>
        buildInternalReadinessEvidencePackageExport({
          report,
          evidenceFiles: [
            {
              artifactId: "evidence_first",
              title: "First Evidence",
              mimeType: "text/plain",
              body: firstEvidenceBody,
              contentHashSha256: firstEvidenceHash
            },
            {
              artifactId: "evidence_second",
              title: "Second Evidence",
              mimeType: "text/plain",
              body: secondEvidenceBody,
              contentHashSha256: secondEvidenceHash
            }
          ],
          limits: {
            maxEvidenceFiles: 2,
            maxEvidenceFileBytes: 1024,
            maxBundleBytes: 512
          }
        }),
      "evidence_package_bundle_too_large"
    );
  });

  it("builds Romania notification draft exports with source-mapped fields", () => {
    const exportData = buildRomaniaNotificationDraftExport({
      organizationId: "org_ro",
      assessmentId: "assessment_ro",
      status: "draft",
      generatedAt: "2026-04-30T10:00:00.000Z",
      locale: "ro-RO",
      payload: {
        entityName: "Example SRL",
        contactEmail: "security@example.test"
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
      classificationRunId: "classification_1"
    });

    expect(exportData.legalCaveat).toContain("not a legal opinion");
    expect(exportData.locale).toBe("ro");
    expect(exportData.legalCaveatFallbackReason).toBe("missing_translation");
    expect(exportData.legalCaveatLocale).toBe("en");
    expect(exportData.legalCaveatRequestedLocale).toBe("ro-RO");
    expect(exportData.legalCaveatReviewStatus).toBe("source_approved");
    expect(exportData.legalCaveatFallbackUsed).toBe(true);
    expect(exportData.sourceMappedFields[0]).toMatchObject({
      fieldKey: "entityName",
      value: "Example SRL"
    });
    expect(exportData.sourceReferences[0]).toMatchObject({
      sourceRecordId: "ro-workbook-notification-form",
      fieldKey: "entityName"
    });
  });

  it("keeps JSON export shape stable", () => {
    const json = stableJsonExport({
      z: 1,
      a: {
        b: true,
        a: "first"
      }
    });

    expect(json).toMatchInlineSnapshot(`
      "{
        "a": {
          "a": "first",
          "b": true
        },
        "z": 1
      }
      "
    `);
  });

  it("escapes CSV cells deterministically", () => {
    const csv = stableCsvExport(["name", "summary"], [
      {
        name: "quoted",
        summary: 'Needs "quoted", multiline\nvalue'
      }
    ]);

    expect(csv).toBe('name,summary\nquoted,"Needs ""quoted"", multiline\nvalue"\n');
  });
});

const expectReportExportError = (run: () => unknown, code: ReportExportError["code"]): void => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ReportExportError);
    expect((error as ReportExportError).code).toBe(code);
    expect((error as ReportExportError).statusCode).toBe(413);
    return;
  }

  throw new Error(`Expected report export error ${code}.`);
};

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
