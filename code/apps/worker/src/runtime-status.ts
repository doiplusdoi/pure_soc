import { workerAppRole } from "./index";
import { workerRuntimeJobNames } from "./runtime";

console.log(
  JSON.stringify({
    service: workerAppRole,
    status: "runtime_loop_implemented",
    entrypoint: "apps/worker/src/main.ts",
    registeredJobs: [workerRuntimeJobNames.executeAction],
    providerWriteExecution: "disabled"
  })
);
