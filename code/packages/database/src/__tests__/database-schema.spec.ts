import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { euMemberStates, schemaGroups, tenantOwnedTables } from "../index";

const schemaPath = fileURLToPath(new URL("../../prisma/schema.prisma", import.meta.url));
const schema = readFileSync(schemaPath, "utf8");

const modelBlocks = new Map(
  [...schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g)].map(([, modelName, body]) => {
    const tableName = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? modelName;
    return [tableName, body] as const;
  })
);

const enumBlocks = new Map(
  [...schema.matchAll(/enum\s+(\w+)\s+\{([\s\S]*?)\n\}/g)].map(([, enumName, body]) => [enumName, body] as const)
);

const fieldLine = (tableName: string, fieldName: string): string => {
  const body = modelBlocks.get(tableName);
  const line = body?.split("\n").find((candidate) => candidate.trim().startsWith(`${fieldName} `));

  expect(body, `missing table ${tableName}`).toBeDefined();
  expect(line, `missing field ${tableName}.${fieldName}`).toBeDefined();
  return line ?? "";
};

describe("database schema groups", () => {
  it("contains every required Phase B schema group table", () => {
    const requiredTables = Object.values(schemaGroups).flat();

    expect(requiredTables).toHaveLength(76);
    for (const table of requiredTables) {
      expect(modelBlocks.has(table), `missing Prisma model mapped to ${table}`).toBe(true);
    }
  });

  it("keeps tenant-owned tables organization scoped", () => {
    for (const table of tenantOwnedTables) {
      const modelBody = modelBlocks.get(table);

      expect(modelBody, `missing tenant-owned table ${table}`).toBeDefined();
      expect(modelBody, `${table} must include organization_id`).toContain('@map("organization_id")');
    }
  });

  it("keeps global regulatory seed tables organization independent", () => {
    for (const table of ["jurisdictions", "country_packs", "regulatory_sources", "control_catalog"]) {
      expect(modelBlocks.get(table), `${table} should be global seed/source data`).not.toContain(
        '@map("organization_id")'
      );
    }
  });

  it("adds tenant-scoped Romania NIS2 module tables", () => {
    for (const table of [
      "ro_nis2_onboarding_progress",
      "ro_nis2_classification_runs",
      "ro_nis2_notification_drafts"
    ]) {
      expect(modelBlocks.get(table), `${table} should exist for the Romania module`).toContain('@map("organization_id")');
    }
  });

  it("seeds all 27 EU Member States with Romania marked for full-pack implementation", () => {
    expect(euMemberStates).toHaveLength(27);
    expect(new Set(euMemberStates.map((state) => state.countryCode)).size).toBe(27);
    expect(euMemberStates.every((state) => state.officialLanguages.length > 0)).toBe(true);
    expect(euMemberStates.find((state) => state.countryCode === "RO")?.countryPackStatus).toBe("planned_full_pack");
  });

  it("stores logical control identifiers as strings instead of UUID-only fields", () => {
    for (const [tableName, fieldName] of [
      ["provider_recommendations", "controlId"],
      ["control_versions", "controlId"],
      ["control_legal_references", "controlId"],
      ["control_provider_mappings", "controlId"],
      ["control_evidence_requirements", "controlId"],
      ["compliance_control_results", "controlId"],
      ["compliance_gaps", "controlId"],
      ["readiness_plan_items", "controlId"],
      ["risk_acceptances", "controlId"],
      ["checklist_templates", "sourceControlId"],
      ["evidence_artifacts", "controlId"]
    ] as const) {
      expect(fieldLine(tableName, fieldName), `${tableName}.${fieldName} must accept logical control IDs`).not.toContain(
        "@db.Uuid"
      );
    }
  });

  it("splits provider finding severity from actionable gap and recommendation severity", () => {
    expect(enumBlocks.get("FindingSeverity")).toContain("informational");
    expect(enumBlocks.get("ActionableSeverity")).not.toContain("informational");
    expect(fieldLine("provider_findings", "severity")).toContain("FindingSeverity");
    expect(fieldLine("provider_recommendations", "severity")).toContain("ActionableSeverity");
    expect(fieldLine("compliance_gaps", "severity")).toContain("ActionableSeverity");
  });

  it("stores readiness plan due dates as date-only values", () => {
    expect(fieldLine("readiness_plan_items", "dueDate")).toContain("@db.Date");
  });

  it("stores exact compliance result-set snapshots for repository reloads", () => {
    expect(modelBlocks.get("compliance_result_snapshots")).toContain('@map("organization_id")');
    expect(fieldLine("compliance_result_snapshots", "resultSetJson")).toContain("Json");
    expect(modelBlocks.get("compliance_result_snapshots")).toContain(
      "@@unique([organizationId, assessmentId]"
    );
  });
});
