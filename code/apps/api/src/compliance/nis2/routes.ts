import { buildCountryPackStatuses } from "@puresoc/country-packs-core";
import { EU_MEMBER_STATE_COUNT, euMemberStates } from "@puresoc/database";
import type { JsonResult } from "../../http";

export const countryPackStatusRoute = async (): Promise<JsonResult> => {
  const countryPacks = buildCountryPackStatuses(euMemberStates);

  return {
    statusCode: 200,
    body: {
      frameworkKey: "nis2",
      memberStateCount: EU_MEMBER_STATE_COUNT,
      countryPacks
    }
  };
};
