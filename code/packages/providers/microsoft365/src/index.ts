import { emptyProviderModuleSyncResult, ProviderConnectorError, type CloudProviderConnector } from "../../core/src/index";

export const microsoft365ProviderKey = "microsoft365";

export const microsoft365ReadModules = [
  "tenant-profile",
  "licensing",
  "users-groups-roles",
  "conditional-access",
  "applications",
  "audit-logs",
  "secure-score",
  "intune-devices",
  "defender-xdr"
] as const;

export const microsoft365ReadPermissionBundles = [
  "m365_read_baseline",
  "m365_security_read",
  "m365_intune_read"
] as const;

const deferred = () =>
  new ProviderConnectorError(
    "microsoft365_live_connector_deferred",
    "Microsoft 365 live Graph calls are deferred to the read-only onboarding phase."
  );

export const createMicrosoft365ConnectorStub = (): CloudProviderConnector => ({
  providerKey: "microsoft365",
  beginConnection: async () => {
    throw deferred();
  },
  completeConnection: async () => {
    throw deferred();
  },
  getTenantProfile: async () => {
    throw deferred();
  },
  syncReadOnlyModules: async () =>
    microsoft365ReadModules.map((moduleKey) =>
      emptyProviderModuleSyncResult(moduleKey, "skipped", "Microsoft 365 live sync is implemented in Phase G.")
    ),
  evaluateControls: async () => [],
  getRecommendedActions: async () => []
});
