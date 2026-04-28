import { buildCountryPackStatus, type CountryPackStatus } from "../../core/src/index";

export const romaniaCountryPackStatus: CountryPackStatus = buildCountryPackStatus({
  countryCode: "RO",
  countryName: "Romania",
  countryPackStatus: "planned_full_pack",
  lastSourceReviewedAt: null,
  nextReviewDueAt: null
});

export {
  classifyRoNis2Entity,
  type Nis2Classification,
  type Nis2ClassificationResult,
  type RoNis2Article9Input,
  type RoNis2ClassificationInput,
  type RoNis2EntitySize,
  type RoNis2RelationshipInput
} from "./classification.service";
