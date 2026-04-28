import type { CloudProviderConnector } from "../../core/src/index";

export const createMockConnector = (): CloudProviderConnector => ({
  providerKey: "mock",
  syncReadOnlyModules: async () => [{ moduleKey: "tenant-profile", status: "succeeded", missingPermissions: [], missingLicenses: [] }]
});
