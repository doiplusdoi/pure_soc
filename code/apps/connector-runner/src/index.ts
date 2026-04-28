import {
  runProviderConnectorPipeline,
  type CloudProviderConnector,
  type ProviderPipelineResult,
  type ProviderResourceStore
} from "../../../packages/providers/core/src/index";

export const connectorRunnerAppRole = "puresoc-connector-runner";

export type ConnectorRunnerJobName = "provider.sync";

export interface ConnectorRunnerJob {
  name: ConnectorRunnerJobName;
  organizationId: string;
  providerConnectionId: string;
  providerKey: string;
  requestedModules?: string[];
  maxRetries?: number;
  readOnly: true;
}

export interface ConnectorRunnerJobDependencies {
  store: ProviderResourceStore;
  connectorRegistry: Record<string, CloudProviderConnector>;
}

export const createProviderSyncJob = (input: Omit<ConnectorRunnerJob, "name" | "readOnly">): ConnectorRunnerJob => ({
  name: "provider.sync",
  readOnly: true,
  ...input
});

export const runConnectorRunnerJob = async (
  job: ConnectorRunnerJob,
  dependencies: ConnectorRunnerJobDependencies
): Promise<ProviderPipelineResult> => {
  const connector = dependencies.connectorRegistry[job.providerKey];
  if (!connector) {
    throw new Error(`No connector registered for provider key: ${job.providerKey}`);
  }

  return runProviderConnectorPipeline({
    connector,
    store: dependencies.store,
    organizationId: job.organizationId,
    providerConnectionId: job.providerConnectionId,
    requestedModules: job.requestedModules,
    maxRetries: job.maxRetries,
    allowProviderWrites: false
  });
};
