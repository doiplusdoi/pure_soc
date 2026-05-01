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
  type WorkerActionJobResult,
  type WorkerRuntime,
  type WorkerRuntimeDependencies
} from "./runtime";
