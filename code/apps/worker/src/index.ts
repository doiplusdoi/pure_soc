export const workerAppRole = "puresoc-worker";

export {
  assertRemediationJobHasSafetyGates,
  createRemediationActionExecutionJob,
  type RemediationActionExecutionJob
} from "./actions";
export {
  createWorkerRuntime,
  startWorkerRuntimeLoop,
  workerRuntimeJobNames,
  type WorkerRuntime,
  type WorkerRuntimeDependencies
} from "./runtime";
export {
  executeRemediationActionJob,
  validateRemediationActionJobOnly,
  type RemediationActionExecutionDependencies,
  type WorkerActionExecutionResult
} from "./action-execution";
