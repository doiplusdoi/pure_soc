import type { Nis2CountryPackOnboardingContract, Nis2OnboardingCountryCode } from "./onboarding-model";

export interface Nis2CountryPackOnboardingRegistry {
  get(countryCode: string): Nis2CountryPackOnboardingContract | undefined;
  list(): readonly Nis2CountryPackOnboardingContract[];
  require(countryCode: string): Nis2CountryPackOnboardingContract;
}

export const buildNis2CountryPackOnboardingRegistry = (
  packs: readonly Nis2CountryPackOnboardingContract[]
): Nis2CountryPackOnboardingRegistry => {
  const byCountryCode = new Map<Nis2OnboardingCountryCode, Nis2CountryPackOnboardingContract>();
  for (const pack of packs) {
    byCountryCode.set(pack.countryCode, pack);
  }

  return {
    get(countryCode) {
      return byCountryCode.get(normalizeCountryCode(countryCode));
    },
    list() {
      return [...byCountryCode.values()].sort((left, right) => left.countryCode.localeCompare(right.countryCode));
    },
    require(countryCode) {
      const pack = byCountryCode.get(normalizeCountryCode(countryCode));
      if (!pack) {
        throw new Error(`NIS2 onboarding country pack is not supported: ${countryCode}`);
      }

      return pack;
    }
  };
};

const normalizeCountryCode = (countryCode: string): Nis2OnboardingCountryCode => {
  const normalized = countryCode.trim().toUpperCase();
  if (normalized === "RO" || normalized === "PL" || normalized === "DE") {
    return normalized;
  }

  return normalized as Nis2OnboardingCountryCode;
};
