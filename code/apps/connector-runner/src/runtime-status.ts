import { connectorRunnerAppRole } from "./index";

console.log(
  JSON.stringify({
    service: connectorRunnerAppRole,
    status: "runtime_loop_implemented",
    entrypoint: "apps/connector-runner/src/main.ts",
    availableJobNames: ["provider.sync"],
    providerWriteExecution: "disabled"
  })
);
