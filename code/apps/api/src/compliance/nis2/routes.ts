import { AuthError } from "@puresoc/auth-core";
import {
  buildCountryPackStatuses,
  classifyWithNis2CountryPack,
  demoCountryPackDefinitions,
  type Nis2CountryPackClassificationInput,
  type Nis2CountryPackDefinition
} from "@puresoc/country-packs-core";
import { romaniaNis2CountryPackDefinition } from "@puresoc/country-pack-ro";
import { EU_MEMBER_STATE_COUNT, euMemberStates } from "@puresoc/database";
import type { JsonResult } from "../../http";

const countryPackDefinitions = [
  ...demoCountryPackDefinitions,
  romaniaNis2CountryPackDefinition
] satisfies readonly Nis2CountryPackDefinition[];

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

export const listNis2CountryPacksRoute = async (): Promise<JsonResult> => ({
  statusCode: 200,
  body: {
    frameworkKey: "nis2",
    countryPacks: countryPackDefinitions.map(toCountryPackResponse)
  }
});

export const getNis2CountryPackRoute = async (countryCode: string): Promise<JsonResult> => ({
  statusCode: 200,
  body: {
    countryPack: toCountryPackResponse(findCountryPack(countryCode))
  }
});

export const classifyNis2CountryPackRoute = async (
  countryCode: string,
  body: Record<string, unknown>
): Promise<JsonResult> => {
  const countryPack = findCountryPack(countryCode);

  return {
    statusCode: 200,
    body: {
      classification: classifyWithNis2CountryPack(countryPack, parseCountryPackClassificationInput(body)),
      countryPack: toCountryPackResponse(countryPack)
    }
  };
};

const findCountryPack = (countryCode: string): Nis2CountryPackDefinition => {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  const countryPack = countryPackDefinitions.find((pack) => pack.countryCode === normalizedCountryCode);
  if (!countryPack) {
    throw new AuthError("invalid_request", "NIS2 country pack was not found.", 404);
  }

  return countryPack;
};

const toCountryPackResponse = (pack: Nis2CountryPackDefinition) => ({
  countryCode: pack.countryCode,
  displayName: pack.displayName,
  packVersion: pack.packVersion,
  effectiveDate: pack.effectiveDate,
  status: pack.status,
  extendsBasePackVersion: pack.extendsBasePackVersion,
  supportedUiLanguages: pack.supportedUiLanguages,
  authorityGuidance: pack.authorityGuidance,
  officialSources: pack.officialSources,
  nationalTerminology: pack.nationalTerminology,
  registrationGuidance: pack.registrationGuidance,
  operationalDifferences: pack.operationalDifferences,
  sectorRules: pack.sectorRules,
  sizeThresholds: pack.sizeThresholds,
  specialInclusionRules: pack.specialInclusionRules,
  dynamicQuestions: pack.dynamicQuestions,
  classificationRules: pack.classificationRules.map((rule) => ({
    id: rule.id,
    version: rule.version,
    outcome: rule.outcome,
    plainLanguage: rule.plainLanguage,
    confidence: rule.confidence,
    legalReviewRequired: rule.legalReviewRequired,
    sourceIds: rule.sourceIds
  })),
  reportLanguage: pack.reportLanguage,
  disclaimers: pack.disclaimers
});

const parseCountryPackClassificationInput = (body: Record<string, unknown>): Nis2CountryPackClassificationInput => ({
  employeeCount: typeof body.employeeCount === "number" ? body.employeeCount : undefined,
  publicAdministration: typeof body.publicAdministration === "boolean" ? body.publicAdministration : undefined,
  sector: typeof body.sector === "string" && body.sector.trim().length > 0 ? body.sector.trim() : undefined,
  services: Array.isArray(body.services) ? body.services.filter((service): service is string => typeof service === "string") : undefined,
  telecomProvider: typeof body.telecomProvider === "boolean" ? body.telecomProvider : undefined
});
