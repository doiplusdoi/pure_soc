import { loadConfig, validateConfigForStartup } from "@puresoc/config";
import { runJobRuntimeLoop } from "@puresoc/jobs";

import { createConnectorRunnerRuntime } from "./runtime";

const log = (event: Record<string, unknown>) => {
  console.log(JSON.stringify(event));
};

try {
  const config = validateConfigForStartup(loadConfig(), { serviceName: "connector-runner" });
  const connectorRunner = createConnectorRunnerRuntime({ config });

  log({
    service: "puresoc-connector-runner",
    status: config.jobs.connectorRunner.enabled ? "runtime_started" : "runtime_disabled",
    queueProvider: config.jobs.queueProvider,
    queueKind: connectorRunner.runtime.queueKind,
    registeredJobs: connectorRunner.runtime.registeredJobNames,
    providerWriteExecution: "disabled"
  });

  const requestShutdown = () => connectorRunner.runtime.requestShutdown();

  process.once("SIGINT", requestShutdown);
  process.once("SIGTERM", requestShutdown);

  if (!config.jobs.connectorRunner.enabled) {
    process.exit(0);
  }

  void runJobRuntimeLoop(connectorRunner.runtime, {
    pollIntervalMs: config.jobs.pollIntervalMs,
    logger: log
  }).then(() => {
    log({
      service: "puresoc-connector-runner",
      status: "runtime_stopped"
    });
    process.exit(0);
  }).catch((error) => {
    log({
      service: "puresoc-connector-runner",
      status: connectorRunner.runtime.shutdownRequested ? "runtime_stopped" : "runtime_failed",
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(connectorRunner.runtime.shutdownRequested ? 0 : 1);
  });
} catch (error) {
  log({
    service: "puresoc-connector-runner",
    status: "startup_failed",
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}
