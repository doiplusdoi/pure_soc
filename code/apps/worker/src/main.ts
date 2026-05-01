import { loadConfig, validateConfigForStartup } from "@puresoc/config";
import { runJobRuntimeLoop } from "@puresoc/jobs";

import { createWorkerRuntime } from "./runtime";

const log = (event: Record<string, unknown>) => {
  console.log(JSON.stringify(event));
};

try {
  const config = validateConfigForStartup(loadConfig(), { serviceName: "worker" });
  const worker = createWorkerRuntime({ config });

  log({
    service: "puresoc-worker",
    status: config.jobs.worker.enabled ? "runtime_started" : "runtime_disabled",
    queueProvider: config.jobs.queueProvider,
    queueKind: worker.runtime.queueKind,
    registeredJobs: worker.runtime.registeredJobNames,
    providerWriteExecution: "disabled"
  });

  const requestShutdown = () => worker.runtime.requestShutdown();

  process.once("SIGINT", requestShutdown);
  process.once("SIGTERM", requestShutdown);

  if (!config.jobs.worker.enabled) {
    process.exit(0);
  }

  void runJobRuntimeLoop(worker.runtime, {
    pollIntervalMs: config.jobs.pollIntervalMs,
    logger: log
  }).then(() => {
    log({
      service: "puresoc-worker",
      status: "runtime_stopped"
    });
    process.exit(0);
  }).catch((error) => {
    log({
      service: "puresoc-worker",
      status: worker.runtime.shutdownRequested ? "runtime_stopped" : "runtime_failed",
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(worker.runtime.shutdownRequested ? 0 : 1);
  });
} catch (error) {
  log({
    service: "puresoc-worker",
    status: "startup_failed",
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}
