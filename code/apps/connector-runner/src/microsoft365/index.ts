import {
  createMicrosoft365Connector,
  type CreateMicrosoft365ConnectorOptions
} from "@puresoc/provider-microsoft365";

export const createMicrosoft365ConnectorRunnerRegistry = (options: CreateMicrosoft365ConnectorOptions) => ({
  microsoft365: createMicrosoft365Connector(options)
});
