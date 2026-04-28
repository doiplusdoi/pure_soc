import { buildCountryPackStatuses } from "../../../../../packages/compliance/nis2/country-packs/core/src/index";
import { EU_MEMBER_STATE_COUNT, euMemberStates } from "../../../../../packages/database/src/index";
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
