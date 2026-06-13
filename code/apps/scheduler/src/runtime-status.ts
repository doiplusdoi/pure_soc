import { notificationDeadlineScanJobName, regulatorySourceMonitorJobName, schedulerAppRole } from "./index";

console.log(
  JSON.stringify({
    service: schedulerAppRole,
    status: "runtime_loop_implemented",
    entrypoint: "apps/scheduler/src/main.ts",
    availableOneShotJobs: [regulatorySourceMonitorJobName, notificationDeadlineScanJobName]
  })
);
