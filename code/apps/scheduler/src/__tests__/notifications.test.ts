import { describe, expect, it } from "vitest";

import { InMemoryNotificationRepository } from "@puresoc/database";
import { NotificationService, type NotificationTransport, type NotificationTransportInput } from "@puresoc/notifications";

import { runNotificationDeadlineScanJob } from "../notifications";

class CapturingNotificationTransport implements NotificationTransport {
  readonly sends: NotificationTransportInput[] = [];

  async send(input: NotificationTransportInput): Promise<void> {
    this.sends.push(input);
  }
}

describe("scheduler notification deadline scan", () => {
  it("sends incident deadline, evidence expiry, and checklist overdue notifications inside the 30 minute windows", async () => {
    const now = () => new Date("2026-06-14T09:00:00.000Z");
    const repository = new InMemoryNotificationRepository({
      now,
      evidenceExpiryCandidates: [
        {
          organizationId: "org-notifications",
          artifactId: "evidence-1",
          title: "Policy evidence",
          validUntil: "2026-06-21T09:05:00.000Z"
        },
        {
          organizationId: "org-notifications",
          artifactId: "evidence-outside",
          title: "Later evidence",
          validUntil: "2026-06-21T10:00:00.000Z"
        }
      ],
      checklistOverdueCandidates: [
        {
          organizationId: "org-notifications",
          checklistRunId: "checklist-1",
          name: "Incident contact validation",
          assignee: "security lead",
          dueDate: "2026-06-14T08:45:00.000Z"
        }
      ]
    });
    await repository.createChannel({
      id: "channel-email",
      organizationId: "org-notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    await repository.createDeadline({
      id: "deadline-1",
      organizationId: "org-notifications",
      sourceType: "incident_reporting",
      deadlineType: "early warning",
      deadlineAt: "2026-06-14T15:10:00.000Z"
    });
    await repository.createDeadline({
      id: "deadline-outside",
      organizationId: "org-notifications",
      sourceType: "incident_reporting",
      deadlineType: "final report",
      deadlineAt: "2026-06-14T16:00:00.000Z"
    });

    const emailTransport = new CapturingNotificationTransport();
    const notifications = new NotificationService({
      repository,
      transports: {
        email: emailTransport
      },
      now
    });

    const result = await runNotificationDeadlineScanJob({
      repository,
      notifications,
      scanIntervalMs: 30 * 60 * 1000,
      now
    });

    expect(result).toMatchObject({
      incidentDeadlineNotifications: 1,
      evidenceExpiryNotifications: 1,
      checklistOverdueNotifications: 1,
      skipped: []
    });
    expect(emailTransport.sends.map((send) => send.eventType).sort()).toEqual([
      "CHECKLIST_OVERDUE",
      "EVIDENCE_EXPIRING",
      "INCIDENT_DEADLINE_APPROACHING"
    ]);
    expect(emailTransport.sends.find((send) => send.eventType === "EVIDENCE_EXPIRING")?.payload).toMatchObject({
      count: 1,
      artifactIds: ["evidence-1"]
    });
    expect(repository.deadlines.get("deadline-1")?.lastNotifiedAt).toBe("2026-06-14T09:00:00.000Z");
    expect(repository.deadlines.get("deadline-outside")?.lastNotifiedAt).toBeUndefined();
    expect(await repository.listLogs("org-notifications")).toHaveLength(3);
  });

  it("applies digest preferences to non-urgent scheduled notifications", async () => {
    const now = () => new Date("2026-06-14T09:00:00.000Z");
    const repository = new InMemoryNotificationRepository({
      now,
      evidenceExpiryCandidates: [
        {
          organizationId: "org-notifications",
          artifactId: "evidence-1",
          title: "Policy evidence",
          validUntil: "2026-06-21T09:05:00.000Z"
        }
      ],
      checklistOverdueCandidates: [
        {
          organizationId: "org-notifications",
          checklistRunId: "checklist-1",
          name: "Incident contact validation",
          assignee: "security lead",
          dueDate: "2026-06-14T08:45:00.000Z"
        }
      ]
    });
    await repository.createChannel({
      id: "channel-email",
      organizationId: "org-notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    await repository.createDeadline({
      id: "deadline-1",
      organizationId: "org-notifications",
      sourceType: "incident_reporting",
      deadlineType: "early warning",
      deadlineAt: "2026-06-14T15:10:00.000Z"
    });

    const emailTransport = new CapturingNotificationTransport();
    const notifications = new NotificationService({
      repository,
      transports: {
        email: emailTransport
      },
      preferenceProvider: {
        getPreferences: async () => ({
          digestFrequency: "daily",
          suppressedCategories: [],
          mutedUntil: null
        })
      },
      now
    });

    const result = await runNotificationDeadlineScanJob({
      repository,
      notifications,
      scanIntervalMs: 30 * 60 * 1000,
      now
    });

    expect(result).toMatchObject({
      incidentDeadlineNotifications: 1,
      evidenceExpiryNotifications: 0,
      checklistOverdueNotifications: 0,
      skipped: []
    });
    expect(emailTransport.sends.map((send) => send.eventType)).toEqual(["INCIDENT_DEADLINE_APPROACHING"]);
    expect(repository.deadlines.get("deadline-1")?.lastNotifiedAt).toBe("2026-06-14T09:00:00.000Z");
    expect(await repository.listLogs("org-notifications")).toHaveLength(1);
  });
});
