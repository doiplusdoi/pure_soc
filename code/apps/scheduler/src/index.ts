export const schedulerAppRole = "puresoc-scheduler";

export {
  regulatorySourceMonitorJobName,
  runRegulatorySourceMonitorJob,
  type RunRegulatorySourceMonitorJobInput
} from "./regulatory-source-monitor";
export {
  notificationDigestDispatchJobName,
  notificationDeadlineScanJobName,
  notificationRetryDispatchJobName,
  runNotificationDigestDispatchJob,
  type NotificationDigestDispatchResult,
  runNotificationDeadlineScanJob,
  type NotificationDeadlineScanResult,
  runNotificationRetryDispatchJob,
  type NotificationRetryDispatchResult,
  type RunNotificationDigestDispatchJobInput,
  type RunNotificationDeadlineScanJobInput,
  type RunNotificationRetryDispatchJobInput
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
  type NotificationDigestDispatchScheduledJob,
  type NotificationDeadlineScanScheduledJob,
  type NotificationRetryDispatchScheduledJob,
  type RegulatorySourceMonitorScheduledJob,
  type SchedulerRuntime,
  type SchedulerRuntimeDependencies
} from "./runtime";
