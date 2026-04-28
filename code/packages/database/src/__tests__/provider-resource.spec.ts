import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { providerResourceIdempotencyKey, providerResourceIdentityFields } from "../index";
import { providerResourceIdempotencyParts } from "../../../providers/core/src/index";

const schemaPath = fileURLToPath(new URL("../../prisma/schema.prisma", import.meta.url));
const schema = readFileSync(schemaPath, "utf8");

const tableBody = (table: string) => {
  const match = [...schema.matchAll(/model\s+\w+\s+\{([\s\S]*?)\n\}/g)].find(([, body]) =>
    body.includes(`@@map("${table}")`)
  );

  return match?.[1] ?? "";
};

describe("provider resource contract", () => {
  it("represents the provider resource idempotency key in schema and contracts", () => {
    expect(providerResourceIdentityFields).toEqual(providerResourceIdempotencyParts);
    expect(
      providerResourceIdempotencyKey({
        organizationId: "org_1",
        providerConnectionId: "conn_1",
        providerKey: "microsoft365",
        externalResourceType: "cloud_user",
        externalId: "user_1"
      })
    ).toBe("org_1:conn_1:microsoft365:cloud_user:user_1");

    expect(tableBody("provider_raw_resources")).toContain("provider_resource_idempotency_key");
  });

  it("stores raw and normalized provider resources as distinct models", () => {
    const raw = tableBody("provider_raw_resources");
    const normalized = tableBody("provider_normalized_resources");

    expect(raw).toContain('@map("raw_json")');
    expect(raw).not.toContain('@map("normalized_json")');
    expect(normalized).toContain('@map("normalized_json")');
    expect(normalized).toContain('@map("raw_resource_id")');
    expect(normalized).not.toContain('@map("raw_json")');
  });

  it("persists module-level pagination and retry telemetry", () => {
    const syncModule = tableBody("provider_sync_modules");

    expect(syncModule).toContain('@map("pages_read")');
    expect(syncModule).toContain('@map("retry_count")');
    expect(syncModule).toContain('@map("missing_permissions")');
    expect(syncModule).toContain('@map("missing_licenses")');
  });
});
