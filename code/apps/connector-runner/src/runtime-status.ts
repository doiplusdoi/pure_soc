import { connectorRunnerAppRole } from "./index";

console.log(
  JSON.stringify({
    service: connectorRunnerAppRole,
    status: "contract_only",
    runtime: "queue_ingestion_deferred_to_PLAN_M19",
    availableJobNames: ["provider.sync"]
  })
);
