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

describe("database schema groups", () => {
  it("contains every required Phase B schema group table", () => {
    const requiredTables = Object.values(schemaGroups).flat();

    expect(requiredTables).toHaveLength(72);
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

  it("seeds all 27 EU Member States with Romania marked for full-pack implementation", () => {
    expect(euMemberStates).toHaveLength(27);
    expect(new Set(euMemberStates.map((state) => state.countryCode)).size).toBe(27);
    expect(euMemberStates.every((state) => state.officialLanguages.length > 0)).toBe(true);
    expect(euMemberStates.find((state) => state.countryCode === "RO")?.countryPackStatus).toBe("planned_full_pack");
  });
});
