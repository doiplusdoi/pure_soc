import { buildCountryPackStatus, type CountryPackStatus } from "../../core/src/index";

export const romaniaCountryPackStatus: CountryPackStatus = buildCountryPackStatus({
  countryCode: "RO",
  countryName: "Romania",
  countryPackStatus: "planned_full_pack",
  lastSourceReviewedAt: null,
  nextReviewDueAt: null
});
