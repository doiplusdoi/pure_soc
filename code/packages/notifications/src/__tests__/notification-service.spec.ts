import { describe, expect, it } from "vitest";

import {
  NotificationService,
  type ChecklistOverdueCandidate,
  type EvidenceExpiryCandidate,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationChannelType,
  type NotificationDeadline,
  type NotificationDeliveryRetryItem,
  type NotificationDigestFrequency,
  type NotificationDigestItem,
  type NotificationEventType,
  type NotificationLog,
  type NotificationOperatorAlert,
  type NotificationOperatorAlertStatus,
  type NotificationRepository,
  type NotificationSendStatus,
  type NotificationTransport,
  type NotificationTransportInput
} from "../index";

class CapturingTransport implements NotificationTransport {
  readonly sends: NotificationTransportInput[] = [];

  async send(input: NotificationTransportInput): Promise<void> {
    this.sends.push(input);
  }
}

class FailingTransport implements NotificationTransport {
  constructor(private readonly errorMessage = "simulated transport failure") {}

  async send(): Promise<void> {
    throw new Error(this.errorMessage);
  }
}

class FlakyTransport implements NotificationTransport {
  readonly sends: NotificationTransportInput[] = [];

  constructor(private failuresBeforeSuccess: number) {}

  async send(input: NotificationTransportInput): Promise<void> {
    this.sends.push(input);
    if (this.failuresBeforeSuccess > 0) {
      this.failuresBeforeSuccess -= 1;
      throw new Error("temporary transport failure");
    }
  }
}

class MemoryNotificationRepository implements NotificationRepository {
  readonly channels = new Map<string, NotificationChannel>();
  readonly logs: NotificationLog[] = [];
  readonly digestItems = new Map<string, NotificationDigestItem>();
  readonly deliveryRetries = new Map<string, NotificationDeliveryRetryItem>();
  readonly operatorAlerts = new Map<string, NotificationOperatorAlert>();

  async createChannel(input: {
    id?: string;
    organizationId: string;
    type: NotificationChannelType;
    destination: string;
    enabled?: boolean;
  }): Promise<NotificationChannel> {
    const channel: NotificationChannel = {
      id: input.id ?? `channel_${this.channels.size + 1}`,
      organizationId: input.organizationId,
      type: input.type,
      destination: input.destination,
      enabled: input.enabled ?? true,
      createdAt: "2026-06-25T09:00:00.000Z"
    };
    this.channels.set(channel.id, channel);
    return { ...channel };
  }

  async updateChannel(input: {
    organizationId: string;
    channelId: string;
    destination?: string;
    enabled?: boolean;
  }): Promise<{ before: NotificationChannel; after: NotificationChannel } | null> {
    const channel = this.channels.get(input.channelId);
    if (!channel || channel.organizationId !== input.organizationId) {
      return null;
    }
    const before = { ...channel };
    const after = {
      ...channel,
      destination: input.destination ?? channel.destination,
      enabled: input.enabled ?? channel.enabled
    };
    this.channels.set(after.id, after);
    return { before, after: { ...after } };
  }

  async deleteChannel(organizationId: string, channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel || channel.organizationId !== organizationId) {
      return false;
    }
    return this.channels.delete(channelId);
  }

  async findChannel(organizationId: string, channelId: string): Promise<NotificationChannel | null> {
    const channel = this.channels.get(channelId);
    return channel && channel.organizationId === organizationId ? { ...channel } : null;
  }

  async listChannels(organizationId: string): Promise<NotificationChannel[]> {
    return [...this.channels.values()].filter((channel) => channel.organizationId === organizationId).map((channel) => ({ ...channel }));
  }

  async listEnabledChannels(organizationId: string): Promise<NotificationChannel[]> {
    return (await this.listChannels(organizationId)).filter((channel) => channel.enabled);
  }

  async recordLog(input: {
    id?: string;
    organizationId: string;
    channelId?: string;
    eventType: NotificationEventType;
    payloadHash: string;
    sentAt: string;
    status: NotificationSendStatus;
    errorMessage?: string;
  }): Promise<NotificationLog> {
    const log: NotificationLog = {
      id: input.id ?? `log_${this.logs.length + 1}`,
      organizationId: input.organizationId,
      channelId: input.channelId,
      eventType: input.eventType,
      payloadHash: input.payloadHash,
      sentAt: input.sentAt,
      status: input.status,
      errorMessage: input.errorMessage
    };
    this.logs.push(log);
    return { ...log };
  }

  async listLogs(organizationId: string): Promise<NotificationLog[]> {
    return this.logs.filter((log) => log.organizationId === organizationId).map((log) => ({ ...log }));
  }

  async createDeadline(): Promise<NotificationDeadline> {
    throw new Error("not implemented");
  }

  async listIncidentDeadlinesForNotification(): Promise<NotificationDeadline[]> {
    return [];
  }

  async markDeadlineNotified(): Promise<NotificationDeadline | null> {
    return null;
  }

  async listEvidenceExpiringForNotification(): Promise<EvidenceExpiryCandidate[]> {
    return [];
  }

  async listChecklistRunsOverdueForNotification(): Promise<ChecklistOverdueCandidate[]> {
    return [];
  }

  async recordDigestItem(input: {
    id?: string;
    organizationId: string;
    eventType: NotificationEventType;
    category: NotificationCategory;
    payloadHash: string;
    payload: Record<string, unknown>;
    digestFrequency: Exclude<NotificationDigestFrequency, "off">;
    createdAt: string;
  }): Promise<NotificationDigestItem> {
    const existing = [...this.digestItems.values()].find(
      (item) =>
        item.organizationId === input.organizationId &&
        item.eventType === input.eventType &&
        item.payloadHash === input.payloadHash &&
        item.digestFrequency === input.digestFrequency &&
        item.status === "pending"
    );
    if (existing) {
      return { ...existing };
    }

    const item: NotificationDigestItem = {
      id: input.id ?? `digest_${this.digestItems.size + 1}`,
      organizationId: input.organizationId,
      eventType: input.eventType,
      category: input.category,
      payloadHash: input.payloadHash,
      payload: { ...input.payload },
      digestFrequency: input.digestFrequency,
      status: "pending",
      createdAt: input.createdAt
    };
    this.digestItems.set(item.id, item);
    return { ...item };
  }

  async listPendingDigestItems(input: {
    digestFrequency: Exclude<NotificationDigestFrequency, "off">;
    createdBefore: string;
    limit?: number;
  }): Promise<NotificationDigestItem[]> {
    return [...this.digestItems.values()]
      .filter(
        (item) =>
          item.status === "pending" &&
          item.digestFrequency === input.digestFrequency &&
          item.createdAt <= input.createdBefore
      )
      .slice(0, input.limit ?? 100)
      .map((item) => ({ ...item, payload: { ...item.payload } }));
  }

  async markDigestItemsDelivered(input: {
    organizationId: string;
    digestItemIds: string[];
    deliveredAt: string;
  }): Promise<NotificationDigestItem[]> {
    const delivered: NotificationDigestItem[] = [];
    for (const digestItemId of input.digestItemIds) {
      const item = this.digestItems.get(digestItemId);
      if (!item || item.organizationId !== input.organizationId || item.status !== "pending") {
        continue;
      }
      const updated: NotificationDigestItem = {
        ...item,
        status: "delivered",
        deliveredAt: input.deliveredAt
      };
      this.digestItems.set(updated.id, updated);
      delivered.push({ ...updated });
    }
    return delivered;
  }

  async recordDeliveryRetryItem(input: {
    id?: string;
    organizationId: string;
    channelId: string;
    eventType: NotificationEventType;
    payloadHash: string;
    payload: Record<string, unknown>;
    attemptCount: number;
    maxAttempts: number;
    nextAttemptAt?: string;
    lastError?: string;
    createdAt: string;
  }): Promise<NotificationDeliveryRetryItem> {
    const existing = [...this.deliveryRetries.values()].find(
      (item) =>
        item.organizationId === input.organizationId &&
        item.channelId === input.channelId &&
        item.eventType === input.eventType &&
        item.payloadHash === input.payloadHash &&
        item.status === "pending"
    );
    if (existing) {
      return { ...existing, payload: { ...existing.payload } };
    }

    const retryItem: NotificationDeliveryRetryItem = {
      id: input.id ?? `retry_${this.deliveryRetries.size + 1}`,
      organizationId: input.organizationId,
      channelId: input.channelId,
      eventType: input.eventType,
      payloadHash: input.payloadHash,
      payload: { ...input.payload },
      attemptCount: input.attemptCount,
      maxAttempts: input.maxAttempts,
      nextAttemptAt: input.nextAttemptAt,
      status: input.nextAttemptAt ? "pending" : "failed",
      lastError: input.lastError,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      completedAt: input.nextAttemptAt ? undefined : input.createdAt
    };
    this.deliveryRetries.set(retryItem.id, retryItem);
    return { ...retryItem, payload: { ...retryItem.payload } };
  }

  async listDueDeliveryRetryItems(input: {
    dueAt: string;
    limit?: number;
  }): Promise<NotificationDeliveryRetryItem[]> {
    return [...this.deliveryRetries.values()]
      .filter((item) => item.status === "pending" && item.nextAttemptAt && item.nextAttemptAt <= input.dueAt)
      .slice(0, input.limit ?? 100)
      .map((item) => ({ ...item, payload: { ...item.payload } }));
  }

  async markDeliveryRetryItemSucceeded(input: {
    organizationId: string;
    retryItemId: string;
    completedAt: string;
  }): Promise<NotificationDeliveryRetryItem | null> {
    const item = this.deliveryRetries.get(input.retryItemId);
    if (!item || item.organizationId !== input.organizationId) {
      return null;
    }
    const updated: NotificationDeliveryRetryItem = {
      ...item,
      status: "succeeded",
      nextAttemptAt: undefined,
      updatedAt: input.completedAt,
      completedAt: input.completedAt
    };
    this.deliveryRetries.set(updated.id, updated);
    return { ...updated, payload: { ...updated.payload } };
  }

  async markDeliveryRetryItemFailed(input: {
    organizationId: string;
    retryItemId: string;
    attemptCount: number;
    lastError: string;
    nextAttemptAt?: string;
    failedAt: string;
  }): Promise<NotificationDeliveryRetryItem | null> {
    const item = this.deliveryRetries.get(input.retryItemId);
    if (!item || item.organizationId !== input.organizationId) {
      return null;
    }
    const updated: NotificationDeliveryRetryItem = {
      ...item,
      attemptCount: input.attemptCount,
      lastError: input.lastError,
      nextAttemptAt: input.nextAttemptAt,
      status: input.nextAttemptAt ? "pending" : "failed",
      updatedAt: input.failedAt,
      completedAt: input.nextAttemptAt ? undefined : input.failedAt
    };
    this.deliveryRetries.set(updated.id, updated);
    return { ...updated, payload: { ...updated.payload } };
  }

  async recordOperatorAlert(input: {
    id?: string;
    organizationId: string;
    alertType: "delivery_exhausted";
    severity: NotificationOperatorAlert["severity"];
    title: string;
    body: string;
    sourceRetryItemId?: string;
    channelId?: string;
    eventType?: NotificationEventType;
    createdAt: string;
  }): Promise<NotificationOperatorAlert> {
    const existing = [...this.operatorAlerts.values()].find(
      (alert) =>
        alert.organizationId === input.organizationId &&
        alert.sourceRetryItemId === input.sourceRetryItemId &&
        alert.alertType === input.alertType &&
        alert.status === "open"
    );
    if (existing) {
      return { ...existing };
    }
    const alert: NotificationOperatorAlert = {
      id: input.id ?? `alert_${this.operatorAlerts.size + 1}`,
      organizationId: input.organizationId,
      alertType: input.alertType,
      severity: input.severity,
      status: "open",
      title: input.title,
      body: input.body,
      sourceRetryItemId: input.sourceRetryItemId,
      channelId: input.channelId,
      eventType: input.eventType,
      createdAt: input.createdAt
    };
    this.operatorAlerts.set(alert.id, alert);
    return { ...alert };
  }

  async listOperatorAlerts(
    organizationId: string,
    options: { status?: NotificationOperatorAlertStatus; limit?: number } = {}
  ): Promise<NotificationOperatorAlert[]> {
    return [...this.operatorAlerts.values()]
      .filter((alert) => alert.organizationId === organizationId && (!options.status || alert.status === options.status))
      .slice(0, options.limit ?? 100)
      .map((alert) => ({ ...alert }));
  }
}

describe("NotificationService delivery policy", () => {
  it("suppresses configured categories before transports or logs are touched", async () => {
    const repository = new MemoryNotificationRepository();
    await repository.createChannel({
      organizationId: "org_notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    const transport = new CapturingTransport();
    const service = new NotificationService({
      repository,
      transports: { email: transport },
      preferenceProvider: {
        getPreferences: async () => ({
          digestFrequency: "off",
          suppressedCategories: ["connector"]
        })
      }
    });

    const result = await service.send("org_notifications", "M365_DRIFT_DETECTED", {
      findingTitle: "Conditional Access drift"
    });

    expect(result).toMatchObject({
      category: "connector",
      deliveryState: "suppressed",
      policyReason: "category_connector_suppressed",
      attempted: 0,
      sent: 0,
      failed: 0,
      logs: []
    });
    expect(transport.sends).toHaveLength(0);
    expect(await repository.listLogs("org_notifications")).toHaveLength(0);
    expect([...repository.digestItems.values()]).toHaveLength(0);
  });

  it("dispatches due digest items as one summary and marks them delivered", async () => {
    const repository = new MemoryNotificationRepository();
    await repository.createChannel({
      organizationId: "org_notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    const transport = new CapturingTransport();
    const service = new NotificationService({
      repository,
      transports: { email: transport },
      now: () => new Date("2026-06-26T09:00:00.000Z"),
      preferenceProvider: {
        getPreferences: async () => ({
          digestFrequency: "daily",
          suppressedCategories: []
        })
      }
    });
    await repository.recordDigestItem({
      id: "digest_1",
      organizationId: "org_notifications",
      eventType: "EVIDENCE_EXPIRING",
      category: "evidence",
      payloadHash: "hash_1",
      payload: { count: 2 },
      digestFrequency: "daily",
      createdAt: "2026-06-25T08:30:00.000Z"
    });
    await repository.recordDigestItem({
      id: "digest_2",
      organizationId: "org_notifications",
      eventType: "CHECKLIST_OVERDUE",
      category: "governance",
      payloadHash: "hash_2",
      payload: { name: "Access review" },
      digestFrequency: "daily",
      createdAt: "2026-06-25T08:45:00.000Z"
    });

    const result = await service.dispatchDueDigests();

    expect(result).toMatchObject({
      attemptedDigests: 1,
      sentDigests: 1,
      failedDigests: 0,
      deliveredItems: 2,
      pendingItems: 0,
      skipped: []
    });
    expect(transport.sends).toHaveLength(1);
    expect(transport.sends[0]).toMatchObject({
      eventType: "NOTIFICATION_DIGEST",
      payload: {
        digestFrequency: "daily",
        itemCount: 2
      }
    });
    expect(transport.sends[0]?.message.text).toContain("EVIDENCE_EXPIRING: 1");
    expect([...repository.digestItems.values()].map((item) => item.status)).toEqual(["delivered", "delivered"]);
    expect((await repository.listLogs("org_notifications")).map((log) => log.eventType)).toEqual(["NOTIFICATION_DIGEST"]);
  });

  it("records a bounded retry item when a transport delivery fails", async () => {
    const repository = new MemoryNotificationRepository();
    await repository.createChannel({
      id: "channel_email",
      organizationId: "org_notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    const service = new NotificationService({
      repository,
      transports: { email: new FailingTransport("smtp unavailable") },
      retry: {
        maxAttempts: 3,
        baseBackoffMs: 60_000,
        maxBackoffMs: 60_000
      },
      now: () => new Date("2026-06-25T09:00:00.000Z")
    });

    const result = await service.send("org_notifications", "CRITICAL_GAP_DETECTED", {
      controlName: "MFA"
    });

    expect(result).toMatchObject({
      attempted: 1,
      sent: 0,
      failed: 1
    });
    expect([...repository.deliveryRetries.values()]).toMatchObject([
      {
        organizationId: "org_notifications",
        channelId: "channel_email",
        eventType: "CRITICAL_GAP_DETECTED",
        attemptCount: 1,
        maxAttempts: 3,
        nextAttemptAt: "2026-06-25T09:01:00.000Z",
        status: "pending",
        lastError: "smtp unavailable"
      }
    ]);
  });

  it("reschedules failed retry attempts and completes a later successful attempt", async () => {
    const repository = new MemoryNotificationRepository();
    await repository.createChannel({
      id: "channel_email",
      organizationId: "org_notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    await repository.recordDeliveryRetryItem({
      id: "retry_1",
      organizationId: "org_notifications",
      channelId: "channel_email",
      eventType: "CRITICAL_GAP_DETECTED",
      payloadHash: "hash_1",
      payload: { controlName: "MFA" },
      attemptCount: 1,
      maxAttempts: 3,
      nextAttemptAt: "2026-06-25T09:00:00.000Z",
      lastError: "smtp unavailable",
      createdAt: "2026-06-25T08:59:00.000Z"
    });
    const transport = new FlakyTransport(1);
    const service = new NotificationService({
      repository,
      transports: { email: transport },
      retry: {
        maxAttempts: 3,
        baseBackoffMs: 60_000,
        maxBackoffMs: 60_000
      },
      now: () => new Date("2026-06-25T09:00:00.000Z")
    });

    const first = await service.dispatchDueRetries();

    expect(first).toMatchObject({
      attempted: 1,
      sent: 0,
      rescheduled: 1,
      exhausted: 0
    });
    expect(repository.deliveryRetries.get("retry_1")).toMatchObject({
      attemptCount: 2,
      status: "pending",
      nextAttemptAt: "2026-06-25T09:01:00.000Z"
    });

    const later = new NotificationService({
      repository,
      transports: { email: transport },
      retry: {
        maxAttempts: 3,
        baseBackoffMs: 60_000,
        maxBackoffMs: 60_000
      },
      now: () => new Date("2026-06-25T09:01:00.000Z")
    });
    const second = await later.dispatchDueRetries();

    expect(second).toMatchObject({
      attempted: 1,
      sent: 1,
      rescheduled: 0,
      exhausted: 0
    });
    expect(repository.deliveryRetries.get("retry_1")).toMatchObject({
      status: "succeeded",
      completedAt: "2026-06-25T09:01:00.000Z"
    });
    expect((await repository.listLogs("org_notifications")).map((log) => log.status)).toEqual(["failed", "sent"]);
  });

  it("records an operator alert when retry attempts are exhausted", async () => {
    const repository = new MemoryNotificationRepository();
    await repository.createChannel({
      id: "channel_email",
      organizationId: "org_notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    await repository.recordDeliveryRetryItem({
      id: "retry_1",
      organizationId: "org_notifications",
      channelId: "channel_email",
      eventType: "CRITICAL_GAP_DETECTED",
      payloadHash: "hash_1",
      payload: { controlName: "MFA" },
      attemptCount: 2,
      maxAttempts: 3,
      nextAttemptAt: "2026-06-25T09:00:00.000Z",
      lastError: "smtp unavailable",
      createdAt: "2026-06-25T08:59:00.000Z"
    });
    const service = new NotificationService({
      repository,
      transports: { email: new FailingTransport("smtp still unavailable") },
      retry: {
        maxAttempts: 3,
        baseBackoffMs: 60_000,
        maxBackoffMs: 60_000
      },
      now: () => new Date("2026-06-25T09:00:00.000Z"),
      idFactory: () => "alert_1"
    });

    const result = await service.dispatchDueRetries();

    expect(result).toMatchObject({
      attempted: 1,
      sent: 0,
      rescheduled: 0,
      exhausted: 1,
      operatorAlerts: 1
    });
    expect(repository.deliveryRetries.get("retry_1")).toMatchObject({
      attemptCount: 3,
      status: "failed",
      completedAt: "2026-06-25T09:00:00.000Z"
    });
    expect(await repository.listOperatorAlerts("org_notifications")).toMatchObject([
      {
        id: "alert_1",
        alertType: "delivery_exhausted",
        status: "open",
        title: "Notification delivery exhausted",
        sourceRetryItemId: "retry_1",
        eventType: "CRITICAL_GAP_DETECTED"
      }
    ]);
  });

  it("defers non-urgent events when daily digest mode is enabled", async () => {
    const repository = new MemoryNotificationRepository();
    await repository.createChannel({
      organizationId: "org_notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    const transport = new CapturingTransport();
    const service = new NotificationService({
      repository,
      transports: { email: transport },
      preferenceProvider: {
        getPreferences: async () => ({
          digestFrequency: "daily",
          suppressedCategories: []
        })
      }
    });

    const result = await service.send("org_notifications", "EVIDENCE_EXPIRING", {
      count: 3
    });

    expect(result).toMatchObject({
      category: "evidence",
      deliveryState: "deferred_for_digest",
      digestFrequency: "daily",
      policyReason: "notification_digest_daily",
      attempted: 0,
      sent: 0,
      failed: 0
    });
    expect(transport.sends).toHaveLength(0);
    expect(await repository.listLogs("org_notifications")).toHaveLength(0);
    expect([...repository.digestItems.values()]).toMatchObject([
      {
        organizationId: "org_notifications",
        eventType: "EVIDENCE_EXPIRING",
        digestFrequency: "daily",
        status: "pending"
      }
    ]);
  });

  it("keeps critical notifications out of digest and lets test notifications bypass mute", async () => {
    const repository = new MemoryNotificationRepository();
    const channel = await repository.createChannel({
      organizationId: "org_notifications",
      type: "email",
      destination: "alerts@example.test"
    });
    const transport = new CapturingTransport();
    const digestService = new NotificationService({
      repository,
      transports: { email: transport },
      now: () => new Date("2026-06-25T09:00:00.000Z"),
      preferenceProvider: {
        getPreferences: async () => ({
          digestFrequency: "weekly",
          suppressedCategories: []
        })
      }
    });
    const mutedService = new NotificationService({
      repository,
      transports: { email: transport },
      now: () => new Date("2026-06-25T09:00:00.000Z"),
      preferenceProvider: {
        getPreferences: async () => ({
          digestFrequency: "weekly",
          suppressedCategories: ["system"],
          mutedUntil: "2026-06-25T10:00:00.000Z"
        })
      }
    });

    const critical = await digestService.send("org_notifications", "CRITICAL_GAP_DETECTED", {
      controlName: "MFA"
    });
    const test = await mutedService.send(
      "org_notifications",
      "TEST_NOTIFICATION",
      {},
      {
        channelId: channel.id
      }
    );

    expect(critical.deliveryState).toBe("attempted");
    expect(critical.sent).toBe(1);
    expect(test.deliveryState).toBe("attempted");
    expect(test.sent).toBe(1);
    expect(transport.sends.map((send) => send.eventType)).toEqual(["CRITICAL_GAP_DETECTED", "TEST_NOTIFICATION"]);
  });
});
