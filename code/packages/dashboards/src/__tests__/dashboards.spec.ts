import { describe, expect, it } from "vitest";

import { aggregateDashboardFromStoredAnalysis } from "../index";

describe("dashboards aggregate from stored analysis", () => {
  it("derives readiness widgets and scores from stored control/gap/recommendation/evidence records", () => {
    const snapshot = aggregateDashboardFromStoredAnalysis({
      organizationId: "org_dashboards",
      assessmentId: "assessment_dashboards",
      generatedAt: "2026-04-30T10:00:00.000Z",
      countryPackCompleteness: 75,
      controlResults: [
        {
          organizationId: "org_dashboards",
          assessmentId: "assessment_dashboards",
          status: "passing",
          evidenceCompleteness: {
            required: 1,
            present: 1,
            missing: 0,
            ratio: 1
          }
        },
        {
          organizationId: "org_dashboards",
          assessmentId: "assessment_dashboards",
          status: "accepted_risk",
          evidenceCompleteness: {
            required: 1,
            present: 0,
            missing: 1,
            ratio: 0
          }
        }
      ],
      gaps: [
        {
          organizationId: "org_dashboards",
          assessmentId: "assessment_dashboards",
          severity: "critical"
        },
        {
          organizationId: "org_dashboards",
          assessmentId: "assessment_dashboards",
          severity: "medium"
        }
      ],
      recommendations: [
        {
          organizationId: "org_dashboards",
          status: "proposed",
          severity: "high",
          evidenceRequired: true
        }
      ],
      providerConnectionHealth: 1,
      evidenceArtifacts: [
        {
          organizationId: "org_dashboards",
          scanStatus: "clean"
        }
      ]
    });

    expect(snapshot.source).toBe("stored_analysis");
    expect(snapshot.readinessScoreLabel).toBe("PureSOC internal readiness");
    expect(snapshot.sourceRecordCounts).toMatchObject({
      controlResults: 2,
      gaps: 2,
      recommendations: 1,
      evidenceArtifacts: 1
    });
    expect(snapshot.readinessScores.evidenceCompleteness).toBe(50);
    expect(snapshot.trendMetrics).toMatchObject({
      overallScore: 100,
      controlsCompliant: 2,
      controlsTotal: 2,
      providerConnectionHealth: 1,
      gapCountBySeverity: {
        critical: 1,
        medium: 1
      }
    });
    expect(snapshot.widgets.find((widget) => widget.key === "open_gaps")?.sourceQuery).toContain("compliance_gaps");
  });
});
