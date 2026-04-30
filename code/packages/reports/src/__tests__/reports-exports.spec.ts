import { describe, expect, it } from "vitest";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import {
  buildInternalReadinessReport,
  buildRomaniaNotificationDraftExport,
  stableJsonExport
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
      analysisRecordedAt: "2026-04-30T09:00:00.000Z",
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
    expect(report.provenance.source).toBe("stored_analysis");
    expect(report.sourceReferences).toHaveLength(1);
    expect(report.gaps[0]?.sourceReferences[0]?.sourceRecordId).toBe("eu-nis2-art-21");
  });

  it("builds Romania notification draft exports with source-mapped fields", () => {
    const exportData = buildRomaniaNotificationDraftExport({
      organizationId: "org_ro",
      assessmentId: "assessment_ro",
      status: "draft",
      generatedAt: "2026-04-30T10:00:00.000Z",
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
});
