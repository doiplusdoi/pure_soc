import type { RegulatorySourceRecord } from "@puresoc/regulatory-sources";

export type ImplementingRegulationDigitalService =
  | "dns_service_provider"
  | "tld_name_registry"
  | "cloud_computing_service_provider"
  | "data_centre_service_provider"
  | "content_delivery_network_provider"
  | "managed_service_provider"
  | "managed_security_service_provider"
  | "online_marketplace_provider"
  | "online_search_engine_provider"
  | "social_networking_services_platform_provider"
  | "trust_service_provider";

export interface ImplementingRegulationApplicabilityInput {
  providedDigitalServices: readonly string[];
}

export const implementingRegulation20242690SourceRecord: RegulatorySourceRecord = {
  id: "eu-implementing-regulation-2024-2690",
  frameworkKey: "nis2-implementing-regulation-2024-2690",
  jurisdiction: "EU",
  sourceType: "regulation",
  title: "Commission Implementing Regulation (EU) 2024/2690",
  url: "https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/eng",
  lastCheckedAt: "2026-04-28T00:00:00.000Z",
  versionLabel: "2024/2690",
  trustLevel: "primary",
  status: "active",
  activationStatus: "active",
  notes: "EU overlay source for relevant digital entities. Detailed control mappings are intentionally seeded as a shell in Phase D."
};

export const coveredDigitalServices: ImplementingRegulationDigitalService[] = [
  "dns_service_provider",
  "tld_name_registry",
  "cloud_computing_service_provider",
  "data_centre_service_provider",
  "content_delivery_network_provider",
  "managed_service_provider",
  "managed_security_service_provider",
  "online_marketplace_provider",
  "online_search_engine_provider",
  "social_networking_services_platform_provider",
  "trust_service_provider"
];

export const implementingRegulation20242690 = {
  key: "nis2-implementing-regulation-2024-2690",
  title: "Commission Implementing Regulation (EU) 2024/2690",
  sourceRecordIds: [implementingRegulation20242690SourceRecord.id],
  coveredDigitalServices,
  controls: [],
  incidentSignificanceCriteria: [],
  evidenceRequirements: [],
  providerMappingTargets: ["microsoft365", "google_workspace", "manual"] as const,
  status: "draft"
} as const;

export const isImplementingRegulation20242690Applicable = (
  input: ImplementingRegulationApplicabilityInput
): boolean =>
  input.providedDigitalServices.some((service) =>
    coveredDigitalServices.includes(service as ImplementingRegulationDigitalService)
  );
