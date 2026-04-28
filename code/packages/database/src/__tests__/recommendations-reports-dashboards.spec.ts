import { describe, expect, it } from "vitest";

import {
  recommendationToDashboardSignal,
  recommendationToReadinessPlanItemInput,
  recommendationToReportFinding,
  type RecommendationContract
} from "../../../recommendations/src/index";
import { createStoredAnalysisDashboardSnapshot } from "../../../dashboards/src/index";
import { createReportShell } from "../../../reports/src/index";

const recommendation: RecommendationContract = {
  id: "rec_1",
  organizationId: "org_1",
  sourceFindingId: "finding_1",
  controlId: "control_1",
  jurisdiction: "EU",
  title: "Enable phishing-resistant MFA for admins",
  summary: "Privileged users need stronger authentication evidence.",
  severity: "high",
  confidence: "high",
  recommendationType: "technical",
  automationMode: "guided",
  requiredPermissions: ["Policy.Read.All"],
  requiredLicense: ["entra_id_p1"],
  expectedChange: "Admin accounts use stronger MFA methods.",
  blastRadius: "Privileged identity access",
  manualFallback: "Document admin MFA policy and export method coverage.",
  evidenceRequired: true,
  status: "proposed"
};

describe("recommendations, reports, and dashboards contract", () => {
  it("converts one recommendation into plan, report, and dashboard shapes", () => {
    const planItem = recommendationToReadinessPlanItemInput(recommendation);
    const reportFinding = recommendationToReportFinding(recommendation);
    const dashboardSignal = recommendationToDashboardSignal(recommendation);

    expect(planItem).toMatchObject({
      organizationId: "org_1",
      providerRecommendationId: "rec_1",
      controlId: "control_1",
      jurisdiction: "EU",
      evidenceRequired: true
    });

    expect(reportFinding).toMatchObject({
      controlId: "control_1",
      severity: "high",
      requiredEvidence: true
    });

    expect(dashboardSignal).toMatchObject({
      key: "rec_1",
      automationMode: "guided",
      evidenceRequired: true
    });
  });

  it("keeps reports caveated and dashboards derived from stored analysis", () => {
    const report = createReportShell("org_1", "EU");
    const dashboard = createStoredAnalysisDashboardSnapshot("org_1", [
      {
        key: "open_high_recommendations",
        title: "Open high recommendations",
        value: 1,
        sourceQuery: "provider_recommendations:severity=high,status=proposed",
        severity: "high"
      }
    ]);

    expect(report.legalCaveat).toContain("not a legal opinion");
    expect(report.reportType).toBe("internal_readiness");
    expect(dashboard.source).toBe("stored_analysis");
    expect(dashboard.widgets[0]?.sourceQuery).toContain("provider_recommendations");
  });
});
