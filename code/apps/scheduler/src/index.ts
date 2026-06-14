export const schedulerAppRole = "puresoc-scheduler";

export {
  regulatorySourceMonitorJobName,
  runRegulatorySourceMonitorJob,
  type RunRegulatorySourceMonitorJobInput
} from "./regulatory-source-monitor";
export {
  notificationDeadlineScanJobName,
  runNotificationDeadlineScanJob,
  type NotificationDeadlineScanResult,
  type RunNotificationDeadlineScanJobInput
} from "./notifications";
export {
  dashboardSnapshotJobName,
  runDashboardSnapshotJob,
  type DashboardSnapshotJobResult,
  type DashboardSnapshotRepository,
  type DashboardSnapshotScheduledJob
} from "./dashboard-snapshots";
export {
  createSchedulerRuntime,
  runSchedulerTick,
  type NotificationDeadlineScanScheduledJob,
  type RegulatorySourceMonitorScheduledJob,
  type SchedulerRuntime,
  type SchedulerRuntimeDependencies
} from "./runtime";
