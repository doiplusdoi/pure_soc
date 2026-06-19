import { describe, expect, it } from "vitest";

import {
  generateRecommendationSnapshot,
  microsoft365CapabilityCatalogVersion,
  type RecommendationContextInput
} from "../index";

describe("dynamic recommendation rule engine", () => {
  it("recommends evaluating Business Premium only when lower-plan users lack mapped capabilities", () => {
    const result = generateRecommendationSnapshot({
      organizationId: "org_demo",
      gaps: [identityGap("org_demo")],
      context: {
        countryCode: "RO",
        sector: "food distributor",
        employeeCount: 72,
        operationalDependencies: ["supplier delivery", "cold-chain continuity"],
        microsoft365: {
          userCount: 72,
          subscriptions: [
            {
              skuPartNumber: "O365_BUSINESS_PREMIUM",
              consumedUnits: 72,
              servicePlans: ["EXCHANGE_S_STANDARD"]
            }
          ]
        }
      },
      generatedAt: "2026-06-19T08:00:00.000Z"
    });
    const recommendation = result.recommendations.find(
      (candidate) => candidate.rule?.id === "microsoft365.business-premium-evaluation"
    );

    expect(recommendation).toBeDefined();
    expect(recommendation?.rule).toEqual({
      id: "microsoft365.business-premium-evaluation",
      version: "2026-06-demo.v1",
      catalogVersion: microsoft365CapabilityCatalogVersion
    });
    expect(recommendation?.decision).toMatchObject({
      priority: "high",
      microsoftProductOrLicense: "Microsoft 365 Business Premium",
      partnerServiceOpportunity: "Security capability assessment and Microsoft 365 Business Premium implementation planning",
      customerCta: "Improve identity protection",
      partnerCta: "Request partner proposal",
      countryMappings: ["RO"],
      nis2ControlMappings: ["nis2.identity-access"]
    });
    expect(recommendation?.decision?.evidenceUsed.map((evidence) => evidence.type)).toEqual(
      expect.arrayContaining(["microsoft_license", "capability_catalog", "business_context", "compliance_gap"])
    );
    expect(recommendation?.decision?.requiredCapability).toContain("device management");
    expect(recommendation?.opportunity).toMatchObject({
      type: "microsoft_security_capability_evaluation",
      affectedUsers: 72,
      relevantMicrosoftCapabilityOrPlan: "Microsoft 365 Business Premium"
    });
    expect(recommendation?.sourceReferences?.map((reference) => reference.sourceUrl)).toEqual(
      expect.arrayContaining([
        "https://learn.microsoft.com/en-us/microsoft-365/admin/security-and-compliance/m365bp-security-faq?view=o365-worldwide",
        "https://learn.microsoft.com/en-us/microsoft-365/business-premium/microsoft-365-business-faqs?view=o365-worldwide"
      ])
    );
    expect(result.snapshot.ruleVersions).toEqual([recommendation?.rule]);
    expect(result.snapshot.diagnostics).toMatchObject({
      knownMicrosoftSkuPartNumbers: ["O365_BUSINESS_PREMIUM"],
      unknownMicrosoftSkuPartNumbers: [],
      lowerBusinessPlanDetected: true
    });
    const serialized = JSON.stringify(result).toLowerCase();

    expect(serialized).not.toContain(["become nis2", "compliant"].join(" "));
    expect(serialized).not.toContain(["certified", "compliant"].join(" "));
    expect(serialized).not.toContain(["guaranteed nis2", "compliance"].join(" "));
  });

  it("does not recommend Business Premium when required capabilities are already present", () => {
    const result = generateRecommendationSnapshot({
      organizationId: "org_premium",
      gaps: [identityGap("org_premium")],
      context: {
        sector: "food distributor",
        employeeCount: 48,
        microsoft365: {
          userCount: 48,
          subscriptions: [
            {
              skuPartNumber: "SPB",
              consumedUnits: 48,
              servicePlans: ["AAD_PREMIUM", "INTUNE_A", "DEFENDER_FOR_BUSINESS", "ATP_ENTERPRISE"]
            }
          ]
        }
      },
      generatedAt: "2026-06-19T08:00:00.000Z"
    });

    expect(
      result.recommendations.some((candidate) => candidate.rule?.id === "microsoft365.business-premium-evaluation")
    ).toBe(false);
    expect(result.snapshot.diagnostics.missingCapabilities).toEqual([]);
  });

  it("keeps unknown Microsoft SKUs visible without guessing products from identifiers", () => {
    const result = generateRecommendationSnapshot({
      organizationId: "org_unknown",
      gaps: [identityGap("org_unknown")],
      context: {
        sector: "food distributor",
        employeeCount: 35,
        microsoft365: {
          userCount: 35,
          subscriptions: [
            {
              skuPartNumber: "CONTOSO_UNKNOWN_SKU",
              consumedUnits: 35,
              servicePlans: ["EXCHANGE_S_STANDARD"]
            }
          ]
        }
      },
      generatedAt: "2026-06-19T08:00:00.000Z"
    });

    expect(
      result.recommendations.some((candidate) => candidate.rule?.id === "microsoft365.business-premium-evaluation")
    ).toBe(false);
    expect(result.snapshot.diagnostics.unknownMicrosoftSkuPartNumbers).toEqual(["CONTOSO_UNKNOWN_SKU"]);
    expect(result.snapshot.diagnostics.knownMicrosoftSkuPartNumbers).toEqual([]);
    expect(result.snapshot.diagnostics.lowerBusinessPlanDetected).toBe(false);
  });

  it("changes priority and action text when sector context changes with the same Microsoft data", () => {
    const sameMicrosoftData: RecommendationContextInput["microsoft365"] = {
      userCount: 90,
      subscriptions: [
        {
          skuPartNumber: "O365_BUSINESS_PREMIUM",
          consumedUnits: 90,
          servicePlans: ["EXCHANGE_S_STANDARD"]
        }
      ]
    };
    const food = ruleRecommendationForContext({
      sector: "food distributor",
      employeeCount: 90,
      operationalDependencies: ["supplier delivery", "cold-chain continuity"],
      microsoft365: sameMicrosoftData
    });
    const msp = ruleRecommendationForContext({
      sector: "managed service provider",
      employeeCount: 90,
      operationalDependencies: ["privileged access", "customer-impacting services", "incident response"],
      microsoft365: sameMicrosoftData
    });
    const pharma = ruleRecommendationForContext({
      sector: "pharmaceutical manufacturer",
      employeeCount: 90,
      operationalDependencies: ["regulated process", "supplier quality", "operational technology"],
      microsoft365: sameMicrosoftData
    });

    expect(food?.decision?.priority).toBe("high");
    expect(food?.opportunity?.nextAction).toContain("supplier continuity");
    expect(msp?.decision?.priority).toBe("critical");
    expect(msp?.decision?.recommendedAction).toContain("privileged access");
    expect(pharma?.decision?.priority).toBe("high");
    expect(pharma?.decision?.recommendedAction).toContain("regulated process access");
    expect(new Set([food?.opportunity?.nextAction, msp?.opportunity?.nextAction, pharma?.opportunity?.nextAction]).size).toBe(3);
  });
});

const ruleRecommendationForContext = (context: RecommendationContextInput) =>
  generateRecommendationSnapshot({
    organizationId: "org_sector",
    gaps: [identityGap("org_sector")],
    context,
    generatedAt: "2026-06-19T08:00:00.000Z"
  }).recommendations.find((candidate) => candidate.rule?.id === "microsoft365.business-premium-evaluation");

const identityGap = (organizationId: string) => ({
  id: "assessment_demo:nis2.identity-access:gap",
  organizationId,
  assessmentId: "assessment_demo",
  jurisdiction: "EU",
  controlId: "nis2.identity-access",
  controlCode: "NIS2-EU-ACCESS-001",
  status: "failing" as const,
  severity: "high" as const,
  confidence: "medium" as const,
  summary: "Identity access controls, MFA evidence, and endpoint protection evidence are incomplete.",
  findingIds: ["m365:mfa-registration:coverage"],
  findings: ["Microsoft 365 MFA coverage is below the readiness target."],
  missingEvidence: ["Conditional access policy", "Managed device coverage", "Endpoint protection coverage"],
  recommendedActions: ["Improve identity protection", "Review this readiness gap"],
  providerSignals: ["m365:mfa-registration:coverage"],
  manualTaskIds: [],
  manualTasks: [],
  countryPackWarnings: [],
  sourceReferences: [
    {
      sourceRecordId: "eu-nis2-directive-2022-2555",
      article: "21",
      paragraph: "2(i)"
    }
  ]
});
