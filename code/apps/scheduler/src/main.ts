import { loadConfig, validateConfigForStartup } from "@puresoc/config";

import { createSchedulerRuntime } from "./runtime";

const log = (event: Record<string, unknown>) => {
  console.log(JSON.stringify(event));
};

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

try {
  const config = validateConfigForStartup(loadConfig(), { serviceName: "scheduler" });
  const scheduler = createSchedulerRuntime({ config });

  log({
    service: "puresoc-scheduler",
    status: config.jobs.scheduler.enabled ? "runtime_started" : "runtime_disabled",
    queueProvider: config.jobs.queueProvider,
    queueKind: scheduler.runtime.queueKind,
    registeredJobs: scheduler.runtime.registeredJobNames,
    sourceMonitorEnabled: config.compliance.sourceMonitor.enabled,
    runOnStartup: config.jobs.scheduler.runOnStartup
  });

  const requestShutdown = () => scheduler.runtime.requestShutdown();
  process.once("SIGINT", requestShutdown);
  process.once("SIGTERM", requestShutdown);

  if (!config.jobs.scheduler.enabled) {
    process.exit(0);
  }

  void (async () => {
    if (config.jobs.scheduler.runOnStartup) {
      await scheduler.enqueueRegulatorySourceMonitorJob({ reason: "startup" });
    }

    let nextIntervalAt = Date.now() + config.jobs.scheduler.intervalMs;

    while (!scheduler.runtime.shutdownRequested) {
      await scheduler.runtime.runUntilIdle();

      if (Date.now() >= nextIntervalAt) {
        await scheduler.enqueueRegulatorySourceMonitorJob({ reason: "interval" });
        nextIntervalAt = Date.now() + config.jobs.scheduler.intervalMs;
      }

      await sleep(config.jobs.pollIntervalMs);
    }

    log({
      service: "puresoc-scheduler",
      status: "runtime_stopped"
    });
    process.exit(0);
  })().catch((error) => {
    log({
      service: "puresoc-scheduler",
      status: "runtime_failed",
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  });
} catch (error) {
  log({
    service: "puresoc-scheduler",
    status: "startup_failed",
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}
