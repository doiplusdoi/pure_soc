export type CountryPackCompleteness = "baseline_only" | "planned_full_pack" | "draft" | "active";

export interface CountryPackStatus {
  countryCode: string;
  completeness: CountryPackCompleteness;
  sourceActivationDefault: "review_required";
}
