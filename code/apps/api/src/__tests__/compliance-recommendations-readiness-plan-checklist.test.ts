import { describe, expect, it } from "vitest";

import { createApiServices } from "../auth/services";

describe("api compliance recommendations readiness-plan checklist", () => {
  it("evaluates stored provider-neutral findings into gaps, recommendations, a plan, and checklist items", async () => {
    const services = createApiServices({ now: () => new Date("2026-04-30T09:00:00.000Z") });
    const created = await services.providerConnections.createMockConnection({
      organizationId: "org_api_h",
      actorUserId: "user_1",
      scenarioKey: "missing_mfa"
    });
    await services.providerConnections.runSync({
      organizationId: "org_api_h",
      actorUserId: "user_1",
      providerConnectionId: created.connection.id
    });

    const evaluation = await services.compliance.evaluateAssessment({
      organizationId: "org_api_h",
      assessmentId: "assessment_api_h",
      providerConnectionId: created.connection.id,
      ownerUserId: "user_1",
      countryPack: {
        countryCode: "DE",
        completeness: "baseline_only",
        unsupportedFeatures: [
          {
            featureKey: "registration_rules",
            reason: "National registration workflow has not been researched for this country pack."
          }
        ]
      }
    });

    expect(evaluation.results.some((result) => result.controlId === "nis2.access-control.mfa")).toBe(true);
    expect(evaluation.gaps.some((gap) => gap.providerSignals.includes("mock.identity.admin_mfa_missing.admin_1"))).toBe(true);
    expect(evaluation.recommendations.some((recommendation) => recommendation.sourceReferences?.length)).toBe(true);
    expect(evaluation.readinessPlan.items.every((item) => item.ownerUserId === "user_1")).toBe(true);
    expect(evaluation.checklistItems.length).toBeGreaterThan(0);
    expect(evaluation.countryPackWarnings).toHaveLength(1);
  });
});
