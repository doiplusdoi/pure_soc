import { describe, expect, it } from "vitest";

import {
  calculateComplianceGaps,
  evaluateComplianceControls,
  generateManualChecklistItems,
  generateReadinessPlan,
  loadControlCatalogFromSeed,
  loadDefaultControlCatalog
} from "@puresoc/compliance-core";
import { aggregateDashboardFromStoredAnalysis } from "@puresoc/dashboards";

const fixedEvaluationTime = "2026-05-01T09:00:00.000Z";
const article21Paragraphs = ["2(a)", "2(b)", "2(c)", "2(d)", "2(e)", "2(f)", "2(g)", "2(h)", "2(i)", "2(j)"];

const controlByCode = (code: string) => {
  const catalog = loadDefaultControlCatalog();
  const control = catalog.controls.find((candidate) => candidate.code === code);
  expect(control, `Expected control ${code} to exist`).toBeDefined();
  return control!;
};

describe("M13 control catalog and scoring calibration", () => {
  it("loads source-linked Article 21 controls with unique IDs, codes, and evidence requirements", () => {
    const catalog = loadDefaultControlCatalog();
    const ids = new Set(catalog.controls.map((control) => control.id));
    const codes = new Set(catalog.controls.map((control) => control.code));
    const paragraphs = new Set(
      catalog.controls.flatMap((control) =>
        control.legalReferences
          .filter((reference) => reference.sourceRecordId === "eu-nis2-directive-2022-2555")
          .map((reference) => reference.paragraph)
      )
    );

    expect(catalog.catalogVersion).toContain("internal-readiness");
    expect(catalog.controls).toHaveLength(10);
    expect(ids.size).toBe(catalog.controls.length);
    expect(codes.size).toBe(catalog.controls.length);

    for (const paragraph of article21Paragraphs) {
      expect(paragraphs.has(paragraph)).toBe(true);
    }

    for (const control of catalog.controls) {
      expect(control.sourceReferences.length).toBeGreaterThan(0);
      expect(control.legalReferences.every((reference) => reference.sourceUrl?.includes("eur-lex.europa.eu"))).toBe(true);
      expect(control.evidenceRequired.length).toBeGreaterThan(0);
      expect(control.evidenceRequired.every((requirement) => requirement.sourceReferences.length > 0)).toBe(true);
    }
  });

  it("rejects invalid catalog seeds before they can become control versions", () => {
    const sourceReference = {
      sourceRecordId: "eu-nis2-directive-2022-2555",
      article: "21",
      paragraph: "2(a)"
    };
    const validControl = {
      id: "control.one",
      code: "CONTROL-001",
      title: "Control one",
      controlGroup: "NIS2-EU-RISK",
      implementationType: "process" as const,
      legalReference: [sourceReference],
      evidenceRequired: [{ requirementKey: "evidence-one", title: "Evidence one" }],
      manualChecklistTemplateIds: ["template-one"]
    };
    const baseSeed = {
      schemaVersion: "test",
      frameworkKey: "nis2" as const,
      catalogVersion: "test",
      jurisdiction: "EU",
      jurisdictionScope: "EU" as const,
      manualChecklistTemplates: [
        {
          id: "template-one",
          title: "Template one",
          frequency: "monthly",
          items: [{ key: "item-one", title: "Item one" }]
        }
      ],
      controls: [validControl]
    };

    expect(() =>
      loadControlCatalogFromSeed({
        ...baseSeed,
        controls: [{ ...validControl, id: "control.one" }, { ...validControl, id: "control.two" }]
      })
    ).toThrow(/Duplicate control codes/);
    expect(() =>
      loadControlCatalogFromSeed({
        ...baseSeed,
        controls: [{ ...validControl, legalReference: [] }]
      })
    ).toThrow(/legal source references/);
    expect(() =>
      loadControlCatalogFromSeed({
        ...baseSeed,
        controls: [{ ...validControl, manualChecklistTemplateIds: ["missing-template"] }]
      })
    ).toThrow(/missing manual checklist templates/);
  });

  it("maps available provider-neutral findings without direct provider payload coupling", () => {
    const accessAssetControl = controlByCode("NIS2-EU-IAM-001");
    const [result] = evaluateComplianceControls({
      organizationId: "org_m13",
      assessmentId: "assessment_m13",
      controls: [accessAssetControl],
      providerFindings: [
        {
          id: "finding_roles",
          providerKey: "microsoft365",
          moduleKey: "identity-posture",
          findingKey: "mock.identity.too_many_global_admins",
          title: "Too many global administrators",
          summary: "Privileged role assignments should be reviewed.",
          severity: "medium",
          status: "open",
          evidence: { assignedPrincipalCount: 4 }
        }
      ],
      evaluatedAt: fixedEvaluationTime
    });

    expect(result?.status).toBe("failing");
    expect(result?.matchedFindings[0]?.findingKey).toBe("mock.identity.too_many_global_admins");
    expect(result?.confidence).toBe("high");
  });

  it("creates manual checklist items for every Article 21 control group", () => {
    const catalog = loadDefaultControlCatalog();
    const checklistItems = generateManualChecklistItems({
      organizationId: "org_m13",
      assessmentId: "assessment_m13",
      controls: catalog.controls,
      templates: catalog.manualChecklistTemplates,
      ownerUserId: "owner_1"
    });
    const itemControlIds = new Set(checklistItems.map((item) => item.controlId));

    for (const control of catalog.controls) {
      expect(itemControlIds.has(control.id)).toBe(true);
    }
  });

  it("treats stale evidence as missing evidence for internal readiness", () => {
    const riskControl = controlByCode("NIS2-EU-RISK-001");
    const [result] = evaluateComplianceControls({
      organizationId: "org_m13",
      assessmentId: "assessment_m13",
      controls: [riskControl],
      evidenceArtifacts: [
        {
          id: "evidence_stale",
          controlId: riskControl.id,
          requirementKey: "risk-policy-evidence",
          title: "Approved risk analysis or information security policy",
          freshnessStatus: "stale",
          validUntil: "2026-04-01T00:00:00.000Z"
        }
      ],
      evaluatedAt: fixedEvaluationTime
    });

    expect(result?.status).toBe("needs_evidence");
    expect(result?.missingEvidence.map((requirement) => requirement.requirementKey)).toContain("risk-policy-evidence");
    expect(result?.confidence).toBe("high");
  });

  it("keeps accepted risk out of gaps while scoring it below a clean pass", () => {
    const riskControl = controlByCode("NIS2-EU-RISK-001");
    const [result] = evaluateComplianceControls({
      organizationId: "org_m13",
      assessmentId: "assessment_m13",
      controls: [riskControl],
      acceptedRiskControlIds: [riskControl.id],
      evaluatedAt: fixedEvaluationTime
    });
    const gaps = calculateComplianceGaps({ results: result ? [result] : [] });
    const snapshot = aggregateDashboardFromStoredAnalysis({
      organizationId: "org_m13",
      assessmentId: "assessment_m13",
      countryPackCompleteness: 100,
      controlResults: [
        {
          organizationId: "org_m13",
          assessmentId: "assessment_m13",
          status: "passing",
          evidenceCompleteness: { required: 1, present: 1, missing: 0, ratio: 1 }
        },
        {
          organizationId: "org_m13",
          assessmentId: "assessment_m13",
          status: "accepted_risk",
          evidenceCompleteness: { required: 1, present: 1, missing: 0, ratio: 1 }
        }
      ]
    });

    expect(result?.status).toBe("accepted_risk");
    expect(gaps).toHaveLength(0);
    expect(snapshot.readinessScoreLabel).toBe("PureSOC internal readiness");
    expect(snapshot.readinessScoreLabel.toLowerCase()).not.toContain("certified");
    expect(snapshot.readinessScores.overallInternalReadiness).toBeLessThan(100);
  });

  it("allows readiness targets to be calibrated without changing the plan contract", () => {
    const plan = generateReadinessPlan({
      organizationId: "org_m13",
      assessmentId: "assessment_m13",
      gaps: [],
      targetReadinessPercent: 85,
      generatedAt: fixedEvaluationTime
    });

    expect(plan.title).toBe("Internal readiness improvement plan");
    expect(plan.targetReadinessPercent).toBe(85);
  });
});
