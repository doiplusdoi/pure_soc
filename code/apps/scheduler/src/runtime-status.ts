import { regulatorySourceMonitorJobName, schedulerAppRole } from "./index";

console.log(
  JSON.stringify({
    service: schedulerAppRole,
    status: "contract_only",
    runtime: "scheduler_loop_deferred_to_PLAN_M19",
    availableOneShotJobs: [regulatorySourceMonitorJobName]
  })
);
