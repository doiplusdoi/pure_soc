export { createMicrosoft365ConnectorRunnerRegistry } from "./microsoft365/index";
export {
  createProviderSyncJob,
  runConnectorRunnerJob,
  type ConnectorRunnerJob,
  type ConnectorRunnerJobDependencies,
  type ConnectorRunnerJobName
} from "./provider-sync";
export {
  createConnectorRunnerRuntime,
  startConnectorRunnerRuntimeLoop,
  type ConnectorRunnerRuntime,
  type ConnectorRunnerRuntimeDependencies
} from "./runtime";

export const connectorRunnerAppRole = "puresoc-connector-runner";
