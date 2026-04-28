import type { CloudProviderConnector } from "../../core/src/index";

export const microsoft365ProviderKey = "microsoft365";

export const createMicrosoft365ConnectorStub = (): CloudProviderConnector => ({
  providerKey: "microsoft365",
  syncReadOnlyModules: async () => []
});
