import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  nis2Article21Controls,
  nis2Article23IncidentWorkflow,
  nis2EuControlGroups,
  nis2EuFramework,
  nis2EuFrameworkVersion,
  nis2EuSeed
} from "../index";

describe("nis2 EU regulatory seed shell", () => {
  it("defines the provider-neutral NIS2 framework and framework version records", () => {
    expect(nis2EuFramework).toMatchObject({
      key: "nis2",
      jurisdictionScope: "EU",
      providerNeutral: true,
      countrySpecificLogicAllowed: false
    });
    expect(nis2EuFrameworkVersion.versionLabel).toBe("Directive (EU) 2022/2555");
    expect(nis2EuSeed.sourceRecords.every((source) => source.trustLevel === "primary")).toBe(true);
  });

  it("seeds Article 21 control shells with source-linked legal references", () => {
    expect(nis2EuControlGroups).toHaveLength(15);
    expect(nis2Article21Controls).toHaveLength(10);
    expect(new Set(nis2Article21Controls.map((control) => control.code)).size).toBe(10);

    for (const control of nis2Article21Controls) {
      expect(control.legalReference).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sourceRecordId: "eu-nis2-directive-2022-2555",
            article: "21"
          })
        ])
      );
    }
  });

  it("seeds Article 23 incident workflow defaults as country-overridable steps", () => {
    const stepKeys = nis2Article23IncidentWorkflow.steps.map((step) => step.key);

    expect(stepKeys).toEqual([
      "incident_detected",
      "significance_assessment",
      "country_reporting_route_selected",
      "early_warning_due",
      "incident_notification_due",
      "intermediate_report_if_requested",
      "final_report_due",
      "recipient_customer_notification_if_required",
      "evidence_package_closed"
    ]);
    expect(nis2Article23IncidentWorkflow.steps.every((step) => step.countryOverrideAllowed)).toBe(true);
  });

  it("keeps generic EU code free of country-specific imports and conditionals", () => {
    const euSourcePath = fileURLToPath(new URL("../index.ts", import.meta.url));
    const euSource = readFileSync(euSourcePath, "utf8");

    expect(euSource).not.toMatch(/country-packs\/ro/i);
    expect(euSource).not.toMatch(/romania/i);
    expect(euSource).not.toMatch(/countryCode\s*(===|!==)\s*["']RO["']/);
    expect(euSource).not.toMatch(/case\s+["']RO["']/);
  });
});
