export interface EuMemberStateSeed {
  code: string;
  countryCode: string;
  countryName: string;
  name: string;
  officialLanguages: string[];
  currency: "EUR" | "BGN" | "CZK" | "DKK" | "HUF" | "PLN" | "RON" | "SEK";
  commissionCountryPageUrl: string;
  nationalAuthorityStatus: "unknown" | "official_sources_identified" | "requires_review";
  countryPackStatus: "baseline_only" | "planned_full_pack" | "full_pack_ready";
  lastSourceReviewedAt: string | null;
  nextReviewDueAt: string | null;
}

export const EU_MEMBER_STATE_COUNT = 27;

export const euMemberStates: EuMemberStateSeed[] = [
  memberState("AT", "Austria", ["de"], "EUR"),
  memberState("BE", "Belgium", ["nl", "fr", "de"], "EUR"),
  memberState("BG", "Bulgaria", ["bg"], "BGN"),
  memberState("HR", "Croatia", ["hr"], "EUR"),
  memberState("CY", "Cyprus", ["el", "tr"], "EUR"),
  memberState("CZ", "Czechia", ["cs"], "CZK"),
  memberState("DK", "Denmark", ["da"], "DKK"),
  memberState("EE", "Estonia", ["et"], "EUR"),
  memberState("FI", "Finland", ["fi", "sv"], "EUR"),
  memberState("FR", "France", ["fr"], "EUR"),
  memberState("DE", "Germany", ["de"], "EUR"),
  memberState("GR", "Greece", ["el"], "EUR"),
  memberState("HU", "Hungary", ["hu"], "HUF"),
  memberState("IE", "Ireland", ["ga", "en"], "EUR"),
  memberState("IT", "Italy", ["it"], "EUR"),
  memberState("LV", "Latvia", ["lv"], "EUR"),
  memberState("LT", "Lithuania", ["lt"], "EUR"),
  memberState("LU", "Luxembourg", ["lb", "fr", "de"], "EUR"),
  memberState("MT", "Malta", ["mt", "en"], "EUR"),
  memberState("NL", "Netherlands", ["nl"], "EUR"),
  memberState("PL", "Poland", ["pl"], "PLN"),
  memberState("PT", "Portugal", ["pt"], "EUR"),
  memberState("RO", "Romania", ["ro"], "RON", "planned_full_pack"),
  memberState("SK", "Slovakia", ["sk"], "EUR"),
  memberState("SI", "Slovenia", ["sl"], "EUR"),
  memberState("ES", "Spain", ["es"], "EUR"),
  memberState("SE", "Sweden", ["sv"], "SEK")
];

function memberState(
  countryCode: string,
  name: string,
  officialLanguages: string[],
  currency: EuMemberStateSeed["currency"],
  countryPackStatus: EuMemberStateSeed["countryPackStatus"] = "baseline_only"
): EuMemberStateSeed {
  const code = countryCode.toLowerCase();

  return {
    code,
    countryCode,
    countryName: name,
    name,
    officialLanguages,
    currency,
    commissionCountryPageUrl: "https://digital-strategy.ec.europa.eu/en/policies/nis-transposition",
    nationalAuthorityStatus: countryPackStatus === "baseline_only" ? "requires_review" : "official_sources_identified",
    countryPackStatus,
    lastSourceReviewedAt: null,
    nextReviewDueAt: null
  };
}
