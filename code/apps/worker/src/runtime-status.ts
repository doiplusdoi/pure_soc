import { workerAppRole } from "./index";

console.log(
  JSON.stringify({
    service: workerAppRole,
    status: "contract_only",
    runtime: "job_worker_deferred_to_PLAN_M19",
    message: "No queue-backed worker loop is implemented yet."
  })
);
