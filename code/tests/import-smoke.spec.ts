import { describe, expect, it } from "vitest";

import { getApiHealth } from "../apps/api/src/index";
import { loadConfig } from "../packages/config/src/index";
import { euMemberStates, providerResourceIdempotencyKey } from "../packages/database/src/index";
import { createReportShell } from "../packages/reports/src/index";
import { requiredServiceNames } from "../packages/shared/src/index";

describe("workspace import smoke tests", () => {
  it("exposes initial app and package contracts", () => {
    expect(getApiHealth(new Date("2026-04-28T00:00:00.000Z")).service).toBe("puresoc-api");
    expect(loadConfig({ env: {} }).connectors.readOnlyByDefault).toBe(true);
    expect(euMemberStates).toHaveLength(27);
    expect(euMemberStates.find((state) => state.code === "ro")?.countryPackStatus).toBe("planned_full_pack");
    expect(requiredServiceNames).toContain("puresoc-connector-runner");
    expect(createReportShell("org_1").legalCaveat).toContain("not a legal opinion");
  });

  it("represents the provider resource idempotency key", () => {
    expect(
      providerResourceIdempotencyKey({
        organizationId: "org_1",
        providerConnectionId: "conn_1",
        providerKey: "microsoft365",
        externalResourceType: "user",
        externalId: "user_1"
      })
    ).toBe("org_1:conn_1:microsoft365:user:user_1");
  });
});
