import type { NotificationRepository, NotificationService } from "@puresoc/notifications";

export const notificationDeadlineScanJobName = "notifications.scanDeadlines";

const sixHoursMs = 6 * 60 * 60 * 1000;
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

export interface NotificationDeadlineScanResult {
  checklistOverdueNotifications: number;
  incidentDeadlineNotifications: number;
  evidenceExpiryNotifications: number;
  skipped: string[];
}

export interface RunNotificationDeadlineScanJobInput {
  repository: NotificationRepository;
  notifications: Pick<NotificationService, "send">;
  scanIntervalMs: number;
  now?: () => Date;
}

export const runNotificationDeadlineScanJob = async (
  input: RunNotificationDeadlineScanJobInput
): Promise<NotificationDeadlineScanResult> => {
  const now = input.now ?? (() => new Date());
  const scheduledAt = now();
  const incidentStart = new Date(scheduledAt.getTime() + sixHoursMs);
  const incidentEnd = new Date(incidentStart.getTime() + input.scanIntervalMs);
  const evidenceStart = new Date(scheduledAt.getTime() + sevenDaysMs);
  const evidenceEnd = new Date(evidenceStart.getTime() + input.scanIntervalMs);
  const overdueStart = new Date(scheduledAt.getTime() - input.scanIntervalMs);
  const overdueEnd = scheduledAt;
  const skipped: string[] = [];
  let checklistOverdueNotifications = 0;
  let incidentDeadlineNotifications = 0;
  let evidenceExpiryNotifications = 0;

  const incidentDeadlines =
    (await input.repository.listIncidentDeadlinesForNotification?.({
      windowStart: incidentStart.toISOString(),
      windowEnd: incidentEnd.toISOString()
    })) ?? [];

  for (const deadline of incidentDeadlines) {
    const result = await input.notifications.send(deadline.organizationId, "INCIDENT_DEADLINE_APPROACHING", {
      deadlineId: deadline.id,
      deadlineType: deadline.deadlineType,
      deadlineAt: deadline.deadlineAt,
      sourceId: deadline.sourceId
    });
    if (result.sent > 0) {
      incidentDeadlineNotifications += 1;
      await input.repository.markDeadlineNotified?.({
        organizationId: deadline.organizationId,
        deadlineId: deadline.id,
        notifiedAt: scheduledAt.toISOString()
      });
    }
  }

  const expiringEvidence =
    (await input.repository.listEvidenceExpiringForNotification?.({
      windowStart: evidenceStart.toISOString(),
      windowEnd: evidenceEnd.toISOString()
    })) ?? [];
  const evidenceByOrganization = new Map<string, typeof expiringEvidence>();
  for (const artifact of expiringEvidence) {
    const group = evidenceByOrganization.get(artifact.organizationId) ?? [];
    group.push(artifact);
    evidenceByOrganization.set(artifact.organizationId, group);
  }

  for (const [organizationId, artifacts] of evidenceByOrganization.entries()) {
    const result = await input.notifications.send(organizationId, "EVIDENCE_EXPIRING", {
      count: artifacts.length,
      artifactIds: artifacts.map((artifact) => artifact.artifactId),
      titles: artifacts.map((artifact) => artifact.title),
      windowStart: evidenceStart.toISOString(),
      windowEnd: evidenceEnd.toISOString()
    });
    if (result.sent > 0) {
      evidenceExpiryNotifications += 1;
    }
  }

  const overdueChecklists =
    (await input.repository.listChecklistRunsOverdueForNotification?.({
      windowStart: overdueStart.toISOString(),
      windowEnd: overdueEnd.toISOString()
    })) ?? [];

  for (const checklist of overdueChecklists) {
    const result = await input.notifications.send(checklist.organizationId, "CHECKLIST_OVERDUE", {
      checklistRunId: checklist.checklistRunId,
      name: checklist.name,
      assignee: checklist.assignee ?? "unassigned",
      dueDate: checklist.dueDate
    });
    if (result.sent > 0) {
      checklistOverdueNotifications += 1;
    }
  }

  if (!input.repository.listIncidentDeadlinesForNotification) {
    skipped.push("incident_deadline_repository_query_unavailable");
  }
  if (!input.repository.listEvidenceExpiringForNotification) {
    skipped.push("evidence_expiry_repository_query_unavailable");
  }
  if (!input.repository.listChecklistRunsOverdueForNotification) {
    skipped.push("checklist_overdue_repository_query_unavailable");
  }

  return {
    checklistOverdueNotifications,
    incidentDeadlineNotifications,
    evidenceExpiryNotifications,
    skipped
  };
};
