import type { SourceReference } from "@puresoc/shared";

export const microsoft365CapabilityCatalogVersion = "puresoc.microsoft365.capability-catalog.2026-06-demo.v1";

export type Microsoft365SecurityCapability =
  | "identity_policy"
  | "conditional_access"
  | "device_management"
  | "endpoint_protection"
  | "advanced_email_protection"
  | "secure_score_availability";

export interface Microsoft365SubscriptionInput {
  skuPartNumber: string;
  consumedUnits?: number;
  servicePlans?: readonly (string | { servicePlanName?: string; provisioningStatus?: string })[];
}

export interface Microsoft365CapabilityEvaluationInput {
  subscriptions?: readonly Microsoft365SubscriptionInput[];
  verifiedCapabilities?: readonly Microsoft365SecurityCapability[];
  userCount?: number;
}

export interface Microsoft365CapabilityEvaluation {
  catalogVersion: string;
  knownSkuPartNumbers: string[];
  unknownSkuPartNumbers: string[];
  lowerBusinessPlanSkuPartNumbers: string[];
  activeCapabilities: Microsoft365SecurityCapability[];
  missingCapabilities: Microsoft365SecurityCapability[];
  capabilitySources: Record<Microsoft365SecurityCapability, string[]>;
  evaluatedUserCount?: number;
  sourceReferences: SourceReference[];
}

interface Microsoft365PlanMapping {
  productName: string;
  skuPartNumbers: readonly string[];
  tier: "business_lower" | "business_premium" | "enterprise";
  capabilities: readonly Microsoft365SecurityCapability[];
}

export const microsoft365CapabilityLabels: Record<Microsoft365SecurityCapability, string> = {
  identity_policy: "identity policy",
  conditional_access: "conditional access",
  device_management: "device management",
  endpoint_protection: "endpoint protection",
  advanced_email_protection: "advanced email protection",
  secure_score_availability: "Secure Score availability"
};

export const microsoft365BusinessPremiumSourceReferences: SourceReference[] = [
  {
    sourceRecordId: "microsoft-learn-m365bp-security-faq",
    sourceUrl:
      "https://learn.microsoft.com/en-us/microsoft-365/admin/security-and-compliance/m365bp-security-faq?view=o365-worldwide",
    sourceVersion: "Microsoft Learn, updated 2025-11-12",
    label: "Microsoft 365 Business Premium security FAQ"
  },
  {
    sourceRecordId: "microsoft-learn-m365bp-business-faq",
    sourceUrl:
      "https://learn.microsoft.com/en-us/microsoft-365/business-premium/microsoft-365-business-faqs?view=o365-worldwide",
    sourceVersion: "Microsoft Learn, updated 2026-05-15",
    label: "Microsoft 365 Business Premium FAQ"
  }
];

export const microsoft365PlanMappings: readonly Microsoft365PlanMapping[] = [
  {
    productName: "Microsoft 365 Business Basic",
    skuPartNumbers: ["O365_BUSINESS_ESSENTIALS", "SMB_BUSINESS_BASIC", "M365_BUSINESS_BASIC", "BUSINESS_BASIC"],
    tier: "business_lower",
    capabilities: ["secure_score_availability"]
  },
  {
    productName: "Microsoft 365 Business Standard",
    skuPartNumbers: ["O365_BUSINESS_PREMIUM", "SMB_BUSINESS_STANDARD", "M365_BUSINESS_STANDARD", "BUSINESS_STANDARD"],
    tier: "business_lower",
    capabilities: ["secure_score_availability"]
  },
  {
    productName: "Microsoft 365 Business Premium",
    skuPartNumbers: ["SPB", "M365_BUSINESS_PREMIUM", "MICROSOFT_365_BUSINESS_PREMIUM"],
    tier: "business_premium",
    capabilities: [
      "identity_policy",
      "conditional_access",
      "device_management",
      "endpoint_protection",
      "advanced_email_protection",
      "secure_score_availability"
    ]
  },
  {
    productName: "Microsoft 365 E3",
    skuPartNumbers: ["SPE_E3", "ENTERPRISEPACK", "M365_E3"],
    tier: "enterprise",
    capabilities: ["identity_policy", "conditional_access", "device_management", "secure_score_availability"]
  },
  {
    productName: "Microsoft 365 E5",
    skuPartNumbers: ["SPE_E5", "ENTERPRISEPREMIUM", "M365_E5"],
    tier: "enterprise",
    capabilities: [
      "identity_policy",
      "conditional_access",
      "device_management",
      "endpoint_protection",
      "advanced_email_protection",
      "secure_score_availability"
    ]
  }
];

const servicePlanCapabilityMappings: Readonly<Record<string, readonly Microsoft365SecurityCapability[]>> = {
  AAD_PREMIUM: ["identity_policy", "conditional_access"],
  AAD_PREMIUM_P1: ["identity_policy", "conditional_access"],
  INTUNE_A: ["device_management"],
  INTUNE: ["device_management"],
  DEFENDER_FOR_BUSINESS: ["endpoint_protection"],
  DEFENDER_XDR: ["endpoint_protection"],
  MDE_SMB: ["endpoint_protection"],
  ATP_ENTERPRISE: ["advanced_email_protection"],
  MDO_SMB: ["advanced_email_protection"],
  THREAT_INTELLIGENCE: ["advanced_email_protection"]
};

const requiredBusinessPremiumCapabilities: readonly Microsoft365SecurityCapability[] = [
  "identity_policy",
  "device_management",
  "endpoint_protection",
  "advanced_email_protection"
];

export const evaluateMicrosoft365Capabilities = (
  input: Microsoft365CapabilityEvaluationInput = {}
): Microsoft365CapabilityEvaluation => {
  const activeCapabilities = new Set<Microsoft365SecurityCapability>(input.verifiedCapabilities ?? []);
  const knownSkuPartNumbers = new Set<string>();
  const unknownSkuPartNumbers = new Set<string>();
  const lowerBusinessPlanSkuPartNumbers = new Set<string>();
  const capabilitySources: Record<Microsoft365SecurityCapability, string[]> = {
    identity_policy: [],
    conditional_access: [],
    device_management: [],
    endpoint_protection: [],
    advanced_email_protection: [],
    secure_score_availability: []
  };

  for (const capability of input.verifiedCapabilities ?? []) {
    addCapability(activeCapabilities, capabilitySources, capability, "verified capability input");
  }

  for (const subscription of input.subscriptions ?? []) {
    const skuPartNumber = normalizeSkuPartNumber(subscription.skuPartNumber);

    if (!skuPartNumber) {
      continue;
    }

    const planMapping = microsoft365PlanMappings.find((mapping) =>
      mapping.skuPartNumbers.some((knownSku) => normalizeSkuPartNumber(knownSku) === skuPartNumber)
    );

    if (!planMapping) {
      unknownSkuPartNumbers.add(skuPartNumber);
    } else {
      knownSkuPartNumbers.add(skuPartNumber);

      if (planMapping.tier === "business_lower") {
        lowerBusinessPlanSkuPartNumbers.add(skuPartNumber);
      }

      for (const capability of planMapping.capabilities) {
        addCapability(activeCapabilities, capabilitySources, capability, `${planMapping.productName} SKU ${skuPartNumber}`);
      }
    }

    for (const servicePlanName of servicePlanNames(subscription.servicePlans)) {
      const servicePlanCapabilities = servicePlanCapabilityMappings[servicePlanName] ?? [];

      for (const capability of servicePlanCapabilities) {
        addCapability(activeCapabilities, capabilitySources, capability, `service plan ${servicePlanName}`);
      }
    }
  }

  const missingCapabilities = requiredBusinessPremiumCapabilities.filter((capability) => !activeCapabilities.has(capability));
  const evaluatedUserCount = input.userCount ?? consumedUnitsFromSubscriptions(input.subscriptions);

  return {
    catalogVersion: microsoft365CapabilityCatalogVersion,
    knownSkuPartNumbers: [...knownSkuPartNumbers].sort(),
    unknownSkuPartNumbers: [...unknownSkuPartNumbers].sort(),
    lowerBusinessPlanSkuPartNumbers: [...lowerBusinessPlanSkuPartNumbers].sort(),
    activeCapabilities: [...activeCapabilities].sort(),
    missingCapabilities: [...missingCapabilities].sort(),
    capabilitySources: mapSortedValues(capabilitySources),
    evaluatedUserCount,
    sourceReferences: microsoft365BusinessPremiumSourceReferences
  };
};

export const formatCapabilities = (capabilities: readonly Microsoft365SecurityCapability[]): string =>
  capabilities.map((capability) => microsoft365CapabilityLabels[capability]).join(", ");

const addCapability = (
  activeCapabilities: Set<Microsoft365SecurityCapability>,
  capabilitySources: Record<Microsoft365SecurityCapability, string[]>,
  capability: Microsoft365SecurityCapability,
  source: string
) => {
  activeCapabilities.add(capability);
  capabilitySources[capability].push(source);
};

const normalizeSkuPartNumber = (value: string | undefined): string => (value ?? "").trim().toUpperCase();

const servicePlanNames = (
  servicePlans: Microsoft365SubscriptionInput["servicePlans"] = []
): string[] =>
  servicePlans
    .map((servicePlan) => {
      if (typeof servicePlan === "string") {
        return servicePlan;
      }

      return servicePlan.servicePlanName;
    })
    .map(normalizeSkuPartNumber)
    .filter(Boolean);

const consumedUnitsFromSubscriptions = (
  subscriptions: Microsoft365CapabilityEvaluationInput["subscriptions"] = []
): number | undefined => {
  const consumedUnits = subscriptions
    .map((subscription) => subscription.consumedUnits)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (consumedUnits.length === 0) {
    return undefined;
  }

  return consumedUnits.reduce((sum, value) => sum + value, 0);
};

const mapSortedValues = (
  values: Record<Microsoft365SecurityCapability, string[]>
): Record<Microsoft365SecurityCapability, string[]> => ({
  identity_policy: [...values.identity_policy].sort(),
  conditional_access: [...values.conditional_access].sort(),
  device_management: [...values.device_management].sort(),
  endpoint_protection: [...values.endpoint_protection].sort(),
  advanced_email_protection: [...values.advanced_email_protection].sort(),
  secure_score_availability: [...values.secure_score_availability].sort()
});
