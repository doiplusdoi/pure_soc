import { describe, expect, it } from "vitest";

import { EU_MEMBER_STATE_COUNT, euMemberStates } from "../../../../../../database/src/index";
import { buildCountryPackStatuses } from "../index";

describe("nis2 country-pack status", () => {
  it("returns a status record for every EU Member State", () => {
    const statuses = buildCountryPackStatuses(euMemberStates);

    expect(statuses).toHaveLength(EU_MEMBER_STATE_COUNT);
    expect(new Set(statuses.map((status) => status.countryCode)).size).toBe(EU_MEMBER_STATE_COUNT);
    expect(statuses.every((status) => status.sourceActivationDefault === "review_required")).toBe(true);
  });

  it("keeps the planned full pack state data-driven and distinct from baseline-only countries", () => {
    const statuses = buildCountryPackStatuses(euMemberStates);
    const plannedFullPack = statuses.find((status) => status.countryCode === "RO");
    const baselineOnlyStatuses = statuses.filter((status) => status.countryCode !== "RO");

    expect(plannedFullPack?.countryPackStatus).toBe("planned_full_pack");
    expect(plannedFullPack?.completeness).toBe("official_sources_identified");
    expect(plannedFullPack?.unsupportedFeatures.map((feature) => feature.featureKey)).toEqual(["full_pack_pending"]);
    expect(baselineOnlyStatuses.every((status) => status.countryPackStatus === "baseline_only")).toBe(true);
    expect(baselineOnlyStatuses.every((status) => status.unsupportedFeatures.length > 0)).toBe(true);
  });
});
