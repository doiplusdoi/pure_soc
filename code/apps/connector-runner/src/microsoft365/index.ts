import {
  createMicrosoft365Connector,
  type CreateMicrosoft365ConnectorOptions
} from "../../../../packages/providers/microsoft365/src/index";

export const createMicrosoft365ConnectorRunnerRegistry = (options: CreateMicrosoft365ConnectorOptions) => ({
  microsoft365: createMicrosoft365Connector(options)
});
