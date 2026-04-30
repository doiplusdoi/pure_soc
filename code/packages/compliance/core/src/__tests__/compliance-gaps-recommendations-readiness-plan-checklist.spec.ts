import { describe, expect, it } from "vitest";

import { createMockConnector, type MockProviderScenarioKey } from "../../../../providers/mock/src/index";
import {
  InMemoryProviderResourceStore,
  runProviderConnectorPipeline,
  type ProviderPipelineResult
} from "../../../../providers/core/src/index";
import {
  generateStructuredRecommendations,
  recommendationToDashboardSignal,
  recommendationToReadinessPlanItemInput,
  recommendationToReportFinding
} from "../../../../recommendations/src/index";
import {
  calculateComplianceGaps,
  countryPackWarningsFromStatus,
  evaluateComplianceControls,
  generateManualChecklistItems,
  generateReadinessPlan,
  loadDefaultControlCatalog
} from "../index";

const fixedNow = () => new Date("2026-04-30T09:00:00.000Z");

const runMicrosoftMockScenario = async (
  scenarioKey: MockProviderScenarioKey
): Promise<ProviderPipelineResult> => {
  const store = new InMemoryProviderResourceStore({ now: fixedNow });
  const connector = createMockConnector({
    scenarioKey,
    providerKey: "microsoft365",
    now: fixedNow
  });
  const connection = await store.createConnection({
    organizationId: "org_phase_h",
    providerKey: connector.providerKey,
    displayName: `Microsoft mock ${scenarioKey}`,
    metadata: { scenarioKey }
  });

  return runProviderConnectorPipeline({
    connector,
    store,
    organizationId: "org_phase_h",
    providerConnectionId: connection.id
  });
};

describe("compliance gaps recommendations readiness-plan checklist", () => {
  it("maps Microsoft mock findings to controls through provider-neutral findings", async () => {
    const catalog = loadDefaultControlCatalog();
    const providerRun = await runMicrosoftMockScenario("missing_mfa");
    const checklistItems = generateManualChecklistItems({
      organizationId: "org_phase_h",
      assessmentId: "assessment_h",
      controls: catalog.controls,
      templates: catalog.manualChecklistTemplates,
      ownerUserId: "owner_1"
    });

    const results = evaluateComplianceControls({
      organizationId: "org_phase_h",
      assessmentId: "assessment_h",
      controls: catalog.controls,
      providerFindings: providerRun.findings,
      manualTasks: checklistItems,
      evaluatedAt: fixedNow().toISOString()
    });
    const mfaResult = results.find((result) => result.controlId === "nis2.access-control.mfa");

    expect(mfaResult?.status).toBe("failing");
    expect(mfaResult?.providerSignalIds).toContain(providerRun.findings[0]?.id);
    expect(mfaResult?.matchedFindings[0]?.findingKey).toBe("mock.identity.admin_mfa_missing.admin_1");
    expect(mfaResult?.summary.toLowerCase()).not.toContain("certification");
  });

  it("generates manual checklist items for manual controls", () => {
    const catalog = loadDefaultControlCatalog();
    const checklistItems = generateManualChecklistItems({
      organizationId: "org_phase_h",
      assessmentId: "assessment_h",
      controls: catalog.controls,
      templates: catalog.manualChecklistTemplates,
      ownerUserId: "owner_1"
    });

    expect(checklistItems.some((item) => item.controlId === "nis2.risk-policy")).toBe(true);
    expect(checklistItems.find((item) => item.controlId === "nis2.risk-policy")?.status).toBe("task_generated");
    expect(checklistItems.find((item) => item.controlId === "nis2.risk-policy")?.sourceReferences.length).toBeGreaterThan(0);
  });

  it("keeps country-pack missing data as a warning instead of a false technical failure", () => {
    const catalog = loadDefaultControlCatalog();
    const warnings = countryPackWarningsFromStatus({
      countryCode: "DE",
      completeness: "baseline_only",
      unsupportedFeatures: [
        {
          featureKey: "registration_rules",
          reason: "National registration workflow has not been researched for this country pack."
        }
      ]
    });

    const results = evaluateComplianceControls({
      organizationId: "org_phase_h",
      assessmentId: "assessment_h",
      controls: catalog.controls,
      countryPackWarnings: warnings,
      evaluatedAt: fixedNow().toISOString()
    });
    const gaps = calculateComplianceGaps({ results });

    expect(results.every((result) => result.status !== "failing")).toBe(true);
    expect(gaps.some((gap) => gap.countryPackWarnings.length > 0)).toBe(true);
  });

  it("lets evidence absence affect evidence completeness", async () => {
    const catalog = loadDefaultControlCatalog();
    const providerRun = await runMicrosoftMockScenario("missing_mfa");
    const results = evaluateComplianceControls({
      organizationId: "org_phase_h",
      assessmentId: "assessment_h",
      controls: catalog.controls,
      providerFindings: providerRun.findings,
      evaluatedAt: fixedNow().toISOString()
    });
    const mfaResult = results.find((result) => result.controlId === "nis2.access-control.mfa");

    expect(mfaResult?.missingEvidence.map((requirement) => requirement.requirementKey)).toContain("mfa-coverage-evidence");
    expect(mfaResult?.evidenceCompleteness).toMatchObject({
      required: 1,
      present: 0,
      missing: 1,
      ratio: 0
    });
  });

  it("generates a readiness plan with owner, due date, status, dependencies, and source references", async () => {
    const catalog = loadDefaultControlCatalog();
    const providerRun = await runMicrosoftMockScenario("missing_mfa");
    const results = evaluateComplianceControls({
      organizationId: "org_phase_h",
      assessmentId: "assessment_h",
      controls: catalog.controls,
      providerFindings: providerRun.findings,
      evaluatedAt: fixedNow().toISOString()
    });
    const gaps = calculateComplianceGaps({ results });
    const recommendations = generateStructuredRecommendations({
      organizationId: "org_phase_h",
      gaps,
      providerRecommendations: providerRun.recommendations
    });
    const readinessPlan = generateReadinessPlan({
      organizationId: "org_phase_h",
      assessmentId: "assessment_h",
      gaps,
      recommendations,
      defaultOwnerUserId: "owner_1",
      generatedAt: fixedNow().toISOString()
    });
    const mfaItem = readinessPlan.items.find((item) => item.controlId === "nis2.access-control.mfa");

    expect(mfaItem).toMatchObject({
      ownerUserId: "owner_1",
      dueDate: "2026-05-14",
      status: "proposed"
    });
    expect(mfaItem?.dependencies).toContain("Directory.Read.All");
    expect(mfaItem?.sourceReferences.length).toBeGreaterThan(0);
  });

  it("keeps recommendation records useful for reports, dashboards, and future action flows", async () => {
    const catalog = loadDefaultControlCatalog();
    const providerRun = await runMicrosoftMockScenario("missing_mfa");
    const results = evaluateComplianceControls({
      organizationId: "org_phase_h",
      assessmentId: "assessment_h",
      controls: catalog.controls,
      providerFindings: providerRun.findings,
      evaluatedAt: fixedNow().toISOString()
    });
    const gaps = calculateComplianceGaps({ results });
    const recommendations = generateStructuredRecommendations({
      organizationId: "org_phase_h",
      gaps,
      providerRecommendations: providerRun.recommendations
    });
    const recommendation = recommendations.find((entry) => entry.controlId === "nis2.access-control.mfa");

    expect(recommendation).toBeDefined();
    expect(recommendation?.sourceReferences?.length).toBeGreaterThan(0);
    expect(recommendation?.automationMode).toBe("guided");
    expect(recommendation?.manualFallback).toContain("manual");

    const planInput = recommendationToReadinessPlanItemInput(recommendation!);
    const reportFinding = recommendationToReportFinding(recommendation!);
    const dashboardSignal = recommendationToDashboardSignal(recommendation!);

    expect(planInput.sourceReferences?.length).toBeGreaterThan(0);
    expect(reportFinding.sourceReferences?.length).toBeGreaterThan(0);
    expect(dashboardSignal).toMatchObject({
      automationMode: "guided",
      evidenceRequired: true
    });
  });
});
