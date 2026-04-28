import { emptyProviderModuleSyncResult, ProviderConnectorError, type CloudProviderConnector } from "../../core/src/index";

export const googleWorkspaceProviderKey = "google_workspace";

const deferred = () =>
  new ProviderConnectorError(
    "google_workspace_connector_deferred",
    "Google Workspace is a provider-neutral stub for a later phase."
  );

export const googleWorkspaceProviderStub: CloudProviderConnector = {
  providerKey: googleWorkspaceProviderKey,
  beginConnection: async () => {
    throw deferred();
  },
  completeConnection: async () => {
    throw deferred();
  },
  getTenantProfile: async () => {
    throw deferred();
  },
  syncReadOnlyModules: async () => [
    emptyProviderModuleSyncResult("google-admin", "skipped", "Google Workspace is not implemented in V1.")
  ],
  evaluateControls: async () => [],
  getRecommendedActions: async () => []
};
