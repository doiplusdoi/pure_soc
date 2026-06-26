import { describe, expect, it } from "vitest";

import { buildPdfReportHtml, loadNis2ReadinessCalibrationMetadata } from "@puresoc/reports";
import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import { createFooterTemplate, extractLegalCaveat, renderReport } from "../index";

describe("report renderer", () => {
  it("renders deterministic JSON and stable placeholder PDF artifacts from stored report data", () => {
    const reportData = {
      schemaVersion: "puresoc.report.internal_readiness.v1",
      reportType: "internal_readiness",
      organizationId: "org_renderer",
      legalCaveat: PURESOC_LEGAL_CAVEAT,
      sourceReferences: [
        {
          sourceRecordId: "eu-nis2-art-21",
          jurisdiction: "EU"
        }
      ]
    };

    const json = renderReport({
      format: "json",
      renderedAt: "2026-04-30T10:00:00.000Z",
      reportData
    });
    const pdf = renderReport({
      format: "pdf",
      renderedAt: "2026-04-30T10:00:00.000Z",
      reportData
    });

    expect(json.mimeType).toBe("application/json");
    expect(Buffer.from(json.body).toString("utf8")).toContain('"legalCaveat"');
    expect(pdf.mimeType).toBe("application/pdf");
    expect(Buffer.from(pdf.body).toString("utf8")).toContain("%PDF-1.4");
    expect(Buffer.from(pdf.body).toString("utf8")).toContain("puresoc.report_renderer.pdf_placeholder.v1");
    expect(pdf.contentHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("builds HTML templates with legal caveat metadata for Playwright PDF footers", () => {
    const html = buildPdfReportHtml({
      template: "gap_report",
      title: "Gap Report",
      reportData: {
        schemaVersion: "puresoc.report.internal_readiness.v1",
        reportType: "internal_readiness",
        organizationId: "org_renderer",
        assessmentId: "assessment_renderer",
        jurisdiction: "EU",
        generatedAt: "2026-04-30T10:00:00.000Z",
        legalCaveat: PURESOC_LEGAL_CAVEAT,
        legalCaveatFallbackUsed: false,
        legalCaveatLocale: "en",
        legalCaveatMessageKey: "puresoc.legal_caveat.internal_readiness.v1",
        legalCaveatReviewStatus: "source_approved",
        locale: "en",
        reportBranding: {
          organizationName: "Asterion Tools",
          legalName: "Asterion Tools SRL",
          logoDataUrl: "data:image/png;base64,iVBORw0KGgo="
        },
        version: {
          immutable: true,
          inputSnapshot: {
            assessmentId: "assessment_renderer",
            controlResultCount: 1,
            evidenceArtifactCount: 0,
            gapCount: 1,
            recommendationCount: 0
          },
          methodologyVersion: "puresoc.readiness.declared.v1",
          rendererVersion: "puresoc-report-renderer-json.v1",
          reportVersion: 1,
          triggerType: "onboarding_completed"
        },
        concepts: {
          applicability: {
            confidence: "low",
            legalReviewRequired: true,
            result: "not_assessed",
            summary: "Applicability is pending country-pack review."
          },
          readiness: {
            applicableControlCount: 1,
            methodologyVersion: "puresoc.readiness.declared.v1",
            missingInformationCount: 1,
            result: "low",
            summary: "Declared readiness is low.",
            value: 0
          },
          evidenceConfidence: {
            methodologyVersion: "puresoc.readiness.declared.v1",
            missingEvidenceCount: 1,
            result: "low",
            summary: "Evidence confidence is low.",
            value: 0
          },
          priority: {
            criticalGapCount: 0,
            highGapCount: 1,
            result: "high",
            summary: "Highest current priority is high."
          }
        },
        calibration: loadNis2ReadinessCalibrationMetadata(),
        sourceReferences: [{ sourceRecordId: "eu-nis2-art-21", jurisdiction: "EU", article: "21" }],
        controlResults: [
          {
            controlId: "nis2.iam.mfa",
            controlCode: "NIS2-EU-MFA",
            jurisdiction: "EU",
            status: "failing",
            confidence: "high",
            summary: "Admin MFA is incomplete.",
            evidenceArtifactIds: [],
            providerSignalIds: [],
            evidenceCompleteness: {
              required: 1,
              present: 0,
              missing: 1,
              ratio: 0
            },
            sourceReferences: [{ sourceRecordId: "eu-nis2-art-21", jurisdiction: "EU", article: "21" }]
          }
        ],
        gaps: [
          {
            controlId: "nis2.iam.mfa",
            controlCode: "NIS2-EU-MFA",
            jurisdiction: "EU",
            severity: "critical",
            summary: "Admin MFA is incomplete.",
            missingEvidence: ["MFA coverage report"],
            recommendedActions: ["Review administrator MFA coverage"],
            sourceReferences: [{ sourceRecordId: "eu-nis2-art-21", jurisdiction: "EU", article: "21" }]
          }
        ],
        recommendations: [],
        evidence: [],
        provenance: {
          source: "stored_analysis"
        }
      }
    });

    expect(html).toContain('<meta name="puresoc-legal-caveat"');
    expect(html).toContain('class="report-logo"');
    expect(html).toContain("Asterion Tools SRL");
    expect(html).toContain("Control list");
    expect(html).toContain("NIS2-EU-MFA");
    expect(extractLegalCaveat(html)).toBe(PURESOC_LEGAL_CAVEAT);
    expect(createFooterTemplate(extractLegalCaveat(html))).toContain("pageNumber");
    expect(createFooterTemplate(extractLegalCaveat(html))).toContain("not a legal opinion");
  });
});
