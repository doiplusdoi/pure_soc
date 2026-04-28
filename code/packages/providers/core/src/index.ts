import type { ProviderKey as CoreProviderKey } from "./resources";

export type {
  ProviderFinding,
  ProviderKey,
  ProviderNormalizedResource,
  ProviderRawResource,
  ProviderRecommendation,
  ProviderResourceIdentity,
  ProviderResourceType
} from "./resources";
export { providerResourceIdempotencyParts } from "./resources";

export interface ProviderSyncModuleResult {
  moduleKey: string;
  status:
    | "succeeded"
    | "partial"
    | "failed"
    | "skipped"
    | "unavailable_license"
    | "missing_permission"
    | "unsupported_api"
    | "rate_limited"
    | "revoked_consent";
  missingPermissions: string[];
  missingLicenses: string[];
  statusReason?: string;
}

export interface CloudProviderConnector {
  providerKey: CoreProviderKey;
  syncReadOnlyModules(): Promise<ProviderSyncModuleResult[]>;
}
