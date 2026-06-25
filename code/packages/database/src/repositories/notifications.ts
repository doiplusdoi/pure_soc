import { randomUUID } from "node:crypto";

import type {
  ChecklistOverdueCandidate,
  EvidenceExpiryCandidate,
  NotificationCategory,
  NotificationChannel,
  NotificationChannelType,
  NotificationDeadline,
  NotificationDeliveryRetryItem,
  NotificationDigestFrequency,
  NotificationDigestItem,
  NotificationEventType,
  NotificationLog,
  NotificationOperatorAlert,
  NotificationOperatorAlertStatus,
  NotificationRepository,
  NotificationSendStatus
} from "@puresoc/notifications";

type DelegateArgs = Record<string, unknown>;

interface Delegate<TRow> {
  create(args: DelegateArgs): Promise<TRow>;
  delete?(args: DelegateArgs): Promise<TRow>;
  findFirst(args: DelegateArgs): Promise<TRow | null>;
  findMany(args?: DelegateArgs): Promise<TRow[]>;
  update?(args: DelegateArgs): Promise<TRow>;
}

type NotificationChannelRow = Omit<NotificationChannel, "createdAt"> & {
  createdAt: Date | string;
};

type NotificationLogRow = Omit<NotificationLog, "sentAt"> & {
  sentAt: Date | string;
};

type NotificationDeadlineRow = Omit<NotificationDeadline, "createdAt" | "deadlineAt" | "lastNotifiedAt"> & {
  createdAt: Date | string;
  deadlineAt: Date | string;
  lastNotifiedAt?: Date | string | null;
};

type NotificationDigestItemRow = Omit<NotificationDigestItem, "createdAt" | "deliveredAt" | "payload"> & {
  payloadJson: unknown;
  createdAt: Date | string;
  deliveredAt?: Date | string | null;
};

type NotificationDeliveryRetryItemRow = Omit<
  NotificationDeliveryRetryItem,
  "createdAt" | "updatedAt" | "completedAt" | "nextAttemptAt" | "payload"
> & {
  payloadJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string | null;
  nextAttemptAt?: Date | string | null;
};

type NotificationOperatorAlertRow = Omit<
  NotificationOperatorAlert,
  "createdAt" | "acknowledgedAt" | "sourceRetryItemId" | "channelId" | "eventType"
> & {
  sourceRetryItemId?: string | null;
  channelId?: string | null;
  eventType?: NotificationEventType | null;
  createdAt: Date | string;
  acknowledgedAt?: Date | string | null;
};

type EvidenceArtifactExpiryRow = {
  id: string;
  organizationId: string;
  title: string;
  validUntil?: Date | string | null;
};

type ChecklistRunOverdueRow = {
  id: string;
  organizationId: string;
  templateId: string;
  status: string;
  dueDate?: Date | string | null;
};

type ChecklistTemplateRow = {
  id: string;
  title: string;
};

export interface PrismaNotificationClient {
  notificationChannel: Delegate<NotificationChannelRow>;
  notificationLog: Delegate<NotificationLogRow>;
  notificationDeadline: Delegate<NotificationDeadlineRow>;
  notificationDigestItem: Delegate<NotificationDigestItemRow>;
  notificationDeliveryRetry: Delegate<NotificationDeliveryRetryItemRow>;
  notificationOperatorAlert: Delegate<NotificationOperatorAlertRow>;
  evidenceArtifact: Pick<Delegate<EvidenceArtifactExpiryRow>, "findMany">;
  checklistRun: Pick<Delegate<ChecklistRunOverdueRow>, "findMany">;
  checklistTemplate: Pick<Delegate<ChecklistTemplateRow>, "findFirst">;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  readonly channels = new Map<string, NotificationChannel>();
  readonly logs: NotificationLog[] = [];
  readonly deadlines = new Map<string, NotificationDeadline>();
  readonly digestItems = new Map<string, NotificationDigestItem>();
  readonly deliveryRetries = new Map<string, NotificationDeliveryRetryItem>();
  readonly operatorAlerts = new Map<string, NotificationOperatorAlert>();
  readonly evidenceExpiryCandidates: EvidenceExpiryCandidate[] = [];
  readonly checklistOverdueCandidates: ChecklistOverdueCandidate[] = [];

  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: {
    now?: () => Date;
    idFactory?: () => string;
    evidenceExpiryCandidates?: EvidenceExpiryCandidate[];
    checklistOverdueCandidates?: ChecklistOverdueCandidate[];
  } = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
    this.evidenceExpiryCandidates.push(...(options.evidenceExpiryCandidates ?? []).map(clone));
    this.checklistOverdueCandidates.push(...(options.checklistOverdueCandidates ?? []).map(clone));
  }

  async createChannel(input: {
    id?: string;
    organizationId: string;
    type: NotificationChannelType;
    destination: string;
    enabled?: boolean;
  }): Promise<NotificationChannel> {
    const channel: NotificationChannel = {
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      type: input.type,
      destination: input.destination,
      enabled: input.enabled ?? true,
      createdAt: this.now().toISOString()
    };
    this.channels.set(channel.id, clone(channel));
    return clone(channel);
  }

  async updateChannel(input: {
    organizationId: string;
    channelId: string;
    destination?: string;
    enabled?: boolean;
  }): Promise<{ before: NotificationChannel; after: NotificationChannel } | null> {
    const existing = this.channels.get(input.channelId);
    if (!existing || existing.organizationId !== input.organizationId) {
      return null;
    }
    const before = clone(existing);
    const after: NotificationChannel = {
      ...existing,
      destination: input.destination ?? existing.destination,
      enabled: input.enabled ?? existing.enabled
    };
    this.channels.set(after.id, clone(after));
    return { before, after: clone(after) };
  }

  async deleteChannel(organizationId: string, channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel || channel.organizationId !== organizationId) {
      return false;
    }
    this.channels.delete(channelId);
    return true;
  }

  async findChannel(organizationId: string, channelId: string): Promise<NotificationChannel | null> {
    const channel = this.channels.get(channelId);
    return channel && channel.organizationId === organizationId ? clone(channel) : null;
  }

  async listChannels(organizationId: string): Promise<NotificationChannel[]> {
    return [...this.channels.values()]
      .filter((channel) => channel.organizationId === organizationId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(clone);
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
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      channelId: input.channelId,
      eventType: input.eventType,
      payloadHash: input.payloadHash,
      sentAt: input.sentAt,
      status: input.status,
      errorMessage: input.errorMessage
    };
    this.logs.push(clone(log));
    return clone(log);
  }

  async listLogs(organizationId: string, options: { limit?: number } = {}): Promise<NotificationLog[]> {
    return this.logs
      .filter((log) => log.organizationId === organizationId)
      .sort((left, right) => right.sentAt.localeCompare(left.sentAt))
      .slice(0, options.limit ?? 100)
      .map(clone);
  }

  async createDeadline(input: {
    id?: string;
    organizationId: string;
    sourceType: "incident_reporting";
    sourceId?: string;
    deadlineType: string;
    deadlineAt: string;
    status?: "open" | "completed" | "canceled";
  }): Promise<NotificationDeadline> {
    const deadline: NotificationDeadline = {
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      deadlineType: input.deadlineType,
      deadlineAt: input.deadlineAt,
      status: input.status ?? "open",
      createdAt: this.now().toISOString()
    };
    this.deadlines.set(deadline.id, clone(deadline));
    return clone(deadline);
  }

  async listIncidentDeadlinesForNotification(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<NotificationDeadline[]> {
    return [...this.deadlines.values()]
      .filter(
        (deadline) =>
          deadline.status === "open" &&
          !deadline.lastNotifiedAt &&
          deadline.deadlineAt >= input.windowStart &&
          deadline.deadlineAt < input.windowEnd
      )
      .sort((left, right) => left.deadlineAt.localeCompare(right.deadlineAt))
      .map(clone);
  }

  async markDeadlineNotified(input: {
    organizationId: string;
    deadlineId: string;
    notifiedAt: string;
  }): Promise<NotificationDeadline | null> {
    const deadline = this.deadlines.get(input.deadlineId);
    if (!deadline || deadline.organizationId !== input.organizationId) {
      return null;
    }
    const updated = {
      ...deadline,
      lastNotifiedAt: input.notifiedAt
    };
    this.deadlines.set(updated.id, clone(updated));
    return clone(updated);
  }

  async listEvidenceExpiringForNotification(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<EvidenceExpiryCandidate[]> {
    return this.evidenceExpiryCandidates
      .filter((candidate) => candidate.validUntil >= input.windowStart && candidate.validUntil < input.windowEnd)
      .sort((left, right) => left.validUntil.localeCompare(right.validUntil))
      .map(clone);
  }

  async listChecklistRunsOverdueForNotification(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<ChecklistOverdueCandidate[]> {
    return this.checklistOverdueCandidates
      .filter((candidate) => candidate.dueDate >= input.windowStart && candidate.dueDate < input.windowEnd)
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      .map(clone);
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
      return clone(existing);
    }

    const item: NotificationDigestItem = {
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      eventType: input.eventType,
      category: input.category,
      payloadHash: input.payloadHash,
      payload: clone(input.payload),
      digestFrequency: input.digestFrequency,
      status: "pending",
      createdAt: input.createdAt
    };
    this.digestItems.set(item.id, clone(item));
    return clone(item);
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
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, input.limit ?? 100)
      .map(clone);
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
      this.digestItems.set(updated.id, clone(updated));
      delivered.push(clone(updated));
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
      return clone(existing);
    }

    const retryItem: NotificationDeliveryRetryItem = {
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      channelId: input.channelId,
      eventType: input.eventType,
      payloadHash: input.payloadHash,
      payload: clone(input.payload),
      attemptCount: input.attemptCount,
      maxAttempts: input.maxAttempts,
      nextAttemptAt: input.nextAttemptAt,
      status: input.nextAttemptAt ? "pending" : "failed",
      lastError: input.lastError,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      completedAt: input.nextAttemptAt ? undefined : input.createdAt
    };
    this.deliveryRetries.set(retryItem.id, clone(retryItem));
    return clone(retryItem);
  }

  async listDueDeliveryRetryItems(input: {
    dueAt: string;
    limit?: number;
  }): Promise<NotificationDeliveryRetryItem[]> {
    return [...this.deliveryRetries.values()]
      .filter((item) => item.status === "pending" && item.nextAttemptAt && item.nextAttemptAt <= input.dueAt)
      .sort((left, right) => (left.nextAttemptAt ?? "").localeCompare(right.nextAttemptAt ?? ""))
      .slice(0, input.limit ?? 100)
      .map(clone);
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
    this.deliveryRetries.set(updated.id, clone(updated));
    return clone(updated);
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
    this.deliveryRetries.set(updated.id, clone(updated));
    return clone(updated);
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
      return clone(existing);
    }

    const alert: NotificationOperatorAlert = {
      id: input.id ?? this.idFactory(),
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
    this.operatorAlerts.set(alert.id, clone(alert));
    return clone(alert);
  }

  async listOperatorAlerts(
    organizationId: string,
    options: { status?: NotificationOperatorAlertStatus; limit?: number } = {}
  ): Promise<NotificationOperatorAlert[]> {
    return [...this.operatorAlerts.values()]
      .filter((alert) => alert.organizationId === organizationId && (!options.status || alert.status === options.status))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, options.limit ?? 100)
      .map(clone);
  }

  async acknowledgeOperatorAlert(input: {
    organizationId: string;
    alertId: string;
    acknowledgedAt: string;
  }): Promise<NotificationOperatorAlert | null> {
    const alert = this.operatorAlerts.get(input.alertId);
    if (!alert || alert.organizationId !== input.organizationId) {
      return null;
    }
    const updated: NotificationOperatorAlert = {
      ...alert,
      status: "acknowledged",
      acknowledgedAt: input.acknowledgedAt
    };
    this.operatorAlerts.set(updated.id, clone(updated));
    return clone(updated);
  }
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly client: PrismaNotificationClient) {}

  async createChannel(input: {
    id?: string;
    organizationId: string;
    type: NotificationChannelType;
    destination: string;
    enabled?: boolean;
  }): Promise<NotificationChannel> {
    const row = await this.client.notificationChannel.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        type: input.type,
        destination: input.destination,
        enabled: input.enabled ?? true
      }
    });
    return fromChannelRow(row);
  }

  async updateChannel(input: {
    organizationId: string;
    channelId: string;
    destination?: string;
    enabled?: boolean;
  }): Promise<{ before: NotificationChannel; after: NotificationChannel } | null> {
    const existing = await this.client.notificationChannel.findFirst({
      where: {
        id: input.channelId,
        organizationId: input.organizationId
      }
    });

    if (!existing || !this.client.notificationChannel.update) {
      return null;
    }

    const row = await this.client.notificationChannel.update({
      where: {
        id: input.channelId
      },
      data: {
        ...(input.destination !== undefined ? { destination: input.destination } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {})
      }
    });

    return {
      before: fromChannelRow(existing),
      after: fromChannelRow(row)
    };
  }

  async deleteChannel(organizationId: string, channelId: string): Promise<boolean> {
    const existing = await this.client.notificationChannel.findFirst({
      where: {
        id: channelId,
        organizationId
      }
    });

    if (!existing || !this.client.notificationChannel.delete) {
      return false;
    }

    await this.client.notificationChannel.delete({
      where: {
        id: channelId
      }
    });
    return true;
  }

  async findChannel(organizationId: string, channelId: string): Promise<NotificationChannel | null> {
    const row = await this.client.notificationChannel.findFirst({
      where: {
        id: channelId,
        organizationId
      }
    });
    return row ? fromChannelRow(row) : null;
  }

  async listChannels(organizationId: string): Promise<NotificationChannel[]> {
    const rows = await this.client.notificationChannel.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return rows.map(fromChannelRow);
  }

  async listEnabledChannels(organizationId: string): Promise<NotificationChannel[]> {
    const rows = await this.client.notificationChannel.findMany({
      where: {
        organizationId,
        enabled: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return rows.map(fromChannelRow);
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
    const row = await this.client.notificationLog.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        channelId: input.channelId ?? null,
        eventType: input.eventType,
        payloadHash: input.payloadHash,
        sentAt: new Date(input.sentAt),
        status: input.status,
        errorMessage: input.errorMessage ?? null
      }
    });
    return fromLogRow(row);
  }

  async listLogs(organizationId: string, options: { limit?: number } = {}): Promise<NotificationLog[]> {
    const rows = await this.client.notificationLog.findMany({
      where: {
        organizationId
      },
      orderBy: {
        sentAt: "desc"
      },
      take: options.limit ?? 100
    });
    return rows.map(fromLogRow);
  }

  async createDeadline(input: {
    id?: string;
    organizationId: string;
    sourceType: "incident_reporting";
    sourceId?: string;
    deadlineType: string;
    deadlineAt: string;
    status?: "open" | "completed" | "canceled";
  }): Promise<NotificationDeadline> {
    const row = await this.client.notificationDeadline.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        deadlineType: input.deadlineType,
        deadlineAt: new Date(input.deadlineAt),
        status: input.status ?? "open"
      }
    });
    return fromDeadlineRow(row);
  }

  async listIncidentDeadlinesForNotification(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<NotificationDeadline[]> {
    const rows = await this.client.notificationDeadline.findMany({
      where: {
        status: "open",
        lastNotifiedAt: null,
        deadlineAt: {
          gte: new Date(input.windowStart),
          lt: new Date(input.windowEnd)
        }
      },
      orderBy: {
        deadlineAt: "asc"
      }
    });
    return rows.map(fromDeadlineRow);
  }

  async markDeadlineNotified(input: {
    organizationId: string;
    deadlineId: string;
    notifiedAt: string;
  }): Promise<NotificationDeadline | null> {
    const existing = await this.client.notificationDeadline.findFirst({
      where: {
        id: input.deadlineId,
        organizationId: input.organizationId
      }
    });
    if (!existing || !this.client.notificationDeadline.update) {
      return null;
    }
    const row = await this.client.notificationDeadline.update({
      where: {
        id: input.deadlineId
      },
      data: {
        lastNotifiedAt: new Date(input.notifiedAt)
      }
    });
    return fromDeadlineRow(row);
  }

  async listEvidenceExpiringForNotification(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<EvidenceExpiryCandidate[]> {
    const rows = await this.client.evidenceArtifact.findMany({
      where: {
        validUntil: {
          gte: new Date(input.windowStart),
          lt: new Date(input.windowEnd)
        }
      },
      orderBy: {
        validUntil: "asc"
      }
    });
    return rows
      .filter((row) => row.validUntil)
      .map((row) => ({
        organizationId: row.organizationId,
        artifactId: row.id,
        title: row.title,
        validUntil: toIso(row.validUntil as Date | string)
      }));
  }

  async listChecklistRunsOverdueForNotification(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<ChecklistOverdueCandidate[]> {
    const rows = await this.client.checklistRun.findMany({
      where: {
        dueDate: {
          gte: new Date(input.windowStart),
          lt: new Date(input.windowEnd)
        },
        completedAt: null,
        status: {
          not: "completed"
        }
      },
      orderBy: {
        dueDate: "asc"
      }
    });
    const candidates: ChecklistOverdueCandidate[] = [];
    for (const row of rows) {
      if (!row.dueDate) {
        continue;
      }
      const template = await this.client.checklistTemplate.findFirst({
        where: {
          id: row.templateId
        }
      });
      candidates.push({
        organizationId: row.organizationId,
        checklistRunId: row.id,
        name: template?.title ?? "Compliance checklist",
        dueDate: toIso(row.dueDate)
      });
    }
    return candidates;
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
    const existing = await this.client.notificationDigestItem.findFirst({
      where: {
        organizationId: input.organizationId,
        eventType: input.eventType,
        payloadHash: input.payloadHash,
        digestFrequency: input.digestFrequency,
        status: "pending"
      }
    });
    if (existing) {
      return fromDigestItemRow(existing);
    }

    const row = await this.client.notificationDigestItem.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        eventType: input.eventType,
        category: input.category,
        payloadHash: input.payloadHash,
        payloadJson: input.payload,
        digestFrequency: input.digestFrequency,
        status: "pending",
        createdAt: new Date(input.createdAt)
      }
    });
    return fromDigestItemRow(row);
  }

  async listPendingDigestItems(input: {
    digestFrequency: Exclude<NotificationDigestFrequency, "off">;
    createdBefore: string;
    limit?: number;
  }): Promise<NotificationDigestItem[]> {
    const rows = await this.client.notificationDigestItem.findMany({
      where: {
        digestFrequency: input.digestFrequency,
        status: "pending",
        createdAt: {
          lte: new Date(input.createdBefore)
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      take: input.limit ?? 100
    });
    return rows.map(fromDigestItemRow);
  }

  async markDigestItemsDelivered(input: {
    organizationId: string;
    digestItemIds: string[];
    deliveredAt: string;
  }): Promise<NotificationDigestItem[]> {
    if (!this.client.notificationDigestItem.update) {
      return [];
    }

    const delivered: NotificationDigestItem[] = [];
    for (const digestItemId of input.digestItemIds) {
      const existing = await this.client.notificationDigestItem.findFirst({
        where: {
          id: digestItemId,
          organizationId: input.organizationId,
          status: "pending"
        }
      });
      if (!existing) {
        continue;
      }
      const row = await this.client.notificationDigestItem.update({
        where: {
          id: digestItemId
        },
        data: {
          status: "delivered",
          deliveredAt: new Date(input.deliveredAt)
        }
      });
      delivered.push(fromDigestItemRow(row));
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
    const existing = await this.client.notificationDeliveryRetry.findFirst({
      where: {
        organizationId: input.organizationId,
        channelId: input.channelId,
        eventType: input.eventType,
        payloadHash: input.payloadHash,
        status: "pending"
      }
    });
    if (existing) {
      return fromDeliveryRetryRow(existing);
    }

    const row = await this.client.notificationDeliveryRetry.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        channelId: input.channelId,
        eventType: input.eventType,
        payloadHash: input.payloadHash,
        payloadJson: input.payload,
        attemptCount: input.attemptCount,
        maxAttempts: input.maxAttempts,
        nextAttemptAt: input.nextAttemptAt ? new Date(input.nextAttemptAt) : null,
        status: input.nextAttemptAt ? "pending" : "failed",
        lastError: input.lastError ?? null,
        createdAt: new Date(input.createdAt),
        completedAt: input.nextAttemptAt ? null : new Date(input.createdAt)
      }
    });
    return fromDeliveryRetryRow(row);
  }

  async listDueDeliveryRetryItems(input: {
    dueAt: string;
    limit?: number;
  }): Promise<NotificationDeliveryRetryItem[]> {
    const rows = await this.client.notificationDeliveryRetry.findMany({
      where: {
        status: "pending",
        nextAttemptAt: {
          lte: new Date(input.dueAt)
        }
      },
      orderBy: {
        nextAttemptAt: "asc"
      },
      take: input.limit ?? 100
    });
    return rows.map(fromDeliveryRetryRow);
  }

  async markDeliveryRetryItemSucceeded(input: {
    organizationId: string;
    retryItemId: string;
    completedAt: string;
  }): Promise<NotificationDeliveryRetryItem | null> {
    if (!this.client.notificationDeliveryRetry.update) {
      return null;
    }

    const existing = await this.client.notificationDeliveryRetry.findFirst({
      where: {
        id: input.retryItemId,
        organizationId: input.organizationId
      }
    });
    if (!existing) {
      return null;
    }

    const row = await this.client.notificationDeliveryRetry.update({
      where: {
        id: input.retryItemId
      },
      data: {
        status: "succeeded",
        nextAttemptAt: null,
        completedAt: new Date(input.completedAt)
      }
    });
    return fromDeliveryRetryRow(row);
  }

  async markDeliveryRetryItemFailed(input: {
    organizationId: string;
    retryItemId: string;
    attemptCount: number;
    lastError: string;
    nextAttemptAt?: string;
    failedAt: string;
  }): Promise<NotificationDeliveryRetryItem | null> {
    if (!this.client.notificationDeliveryRetry.update) {
      return null;
    }

    const existing = await this.client.notificationDeliveryRetry.findFirst({
      where: {
        id: input.retryItemId,
        organizationId: input.organizationId
      }
    });
    if (!existing) {
      return null;
    }

    const row = await this.client.notificationDeliveryRetry.update({
      where: {
        id: input.retryItemId
      },
      data: {
        attemptCount: input.attemptCount,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt ? new Date(input.nextAttemptAt) : null,
        status: input.nextAttemptAt ? "pending" : "failed",
        completedAt: input.nextAttemptAt ? null : new Date(input.failedAt)
      }
    });
    return fromDeliveryRetryRow(row);
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
    const existing = await this.client.notificationOperatorAlert.findFirst({
      where: {
        organizationId: input.organizationId,
        sourceRetryItemId: input.sourceRetryItemId ?? null,
        alertType: input.alertType,
        status: "open"
      }
    });
    if (existing) {
      return fromOperatorAlertRow(existing);
    }

    const row = await this.client.notificationOperatorAlert.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        alertType: input.alertType,
        severity: input.severity,
        status: "open",
        title: input.title,
        body: input.body,
        sourceRetryItemId: input.sourceRetryItemId ?? null,
        channelId: input.channelId ?? null,
        eventType: input.eventType ?? null,
        createdAt: new Date(input.createdAt)
      }
    });
    return fromOperatorAlertRow(row);
  }

  async listOperatorAlerts(
    organizationId: string,
    options: { status?: NotificationOperatorAlertStatus; limit?: number } = {}
  ): Promise<NotificationOperatorAlert[]> {
    const rows = await this.client.notificationOperatorAlert.findMany({
      where: {
        organizationId,
        ...(options.status ? { status: options.status } : {})
      },
      orderBy: {
        createdAt: "desc"
      },
      take: options.limit ?? 100
    });
    return rows.map(fromOperatorAlertRow);
  }

  async acknowledgeOperatorAlert(input: {
    organizationId: string;
    alertId: string;
    acknowledgedAt: string;
  }): Promise<NotificationOperatorAlert | null> {
    if (!this.client.notificationOperatorAlert.update) {
      return null;
    }

    const existing = await this.client.notificationOperatorAlert.findFirst({
      where: {
        id: input.alertId,
        organizationId: input.organizationId
      }
    });
    if (!existing) {
      return null;
    }

    const row = await this.client.notificationOperatorAlert.update({
      where: {
        id: input.alertId
      },
      data: {
        status: "acknowledged",
        acknowledgedAt: new Date(input.acknowledgedAt)
      }
    });
    return fromOperatorAlertRow(row);
  }
}

const fromChannelRow = (row: NotificationChannelRow): NotificationChannel => ({
  id: row.id,
  organizationId: row.organizationId,
  type: row.type,
  destination: row.destination,
  enabled: row.enabled,
  createdAt: toIso(row.createdAt)
});

const fromLogRow = (row: NotificationLogRow): NotificationLog => ({
  id: row.id,
  organizationId: row.organizationId,
  channelId: row.channelId,
  eventType: row.eventType,
  payloadHash: row.payloadHash,
  sentAt: toIso(row.sentAt),
  status: row.status,
  errorMessage: row.errorMessage
});

const fromDeadlineRow = (row: NotificationDeadlineRow): NotificationDeadline => ({
  id: row.id,
  organizationId: row.organizationId,
  sourceType: row.sourceType,
  sourceId: row.sourceId,
  deadlineType: row.deadlineType,
  deadlineAt: toIso(row.deadlineAt),
  status: row.status,
  lastNotifiedAt: row.lastNotifiedAt ? toIso(row.lastNotifiedAt) : undefined,
  createdAt: toIso(row.createdAt)
});

const fromDigestItemRow = (row: NotificationDigestItemRow): NotificationDigestItem => ({
  id: row.id,
  organizationId: row.organizationId,
  eventType: row.eventType,
  category: row.category,
  payloadHash: row.payloadHash,
  payload: clone(row.payloadJson) as Record<string, unknown>,
  digestFrequency: row.digestFrequency,
  status: row.status,
  createdAt: toIso(row.createdAt),
  deliveredAt: row.deliveredAt ? toIso(row.deliveredAt) : undefined
});

const fromDeliveryRetryRow = (row: NotificationDeliveryRetryItemRow): NotificationDeliveryRetryItem => ({
  id: row.id,
  organizationId: row.organizationId,
  channelId: row.channelId,
  eventType: row.eventType,
  payloadHash: row.payloadHash,
  payload: clone(row.payloadJson) as Record<string, unknown>,
  attemptCount: row.attemptCount,
  maxAttempts: row.maxAttempts,
  nextAttemptAt: row.nextAttemptAt ? toIso(row.nextAttemptAt) : undefined,
  status: row.status,
  lastError: row.lastError,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
  completedAt: row.completedAt ? toIso(row.completedAt) : undefined
});

const fromOperatorAlertRow = (row: NotificationOperatorAlertRow): NotificationOperatorAlert => ({
  id: row.id,
  organizationId: row.organizationId,
  alertType: row.alertType,
  severity: row.severity,
  status: row.status,
  title: row.title,
  body: row.body,
  sourceRetryItemId: row.sourceRetryItemId ?? undefined,
  channelId: row.channelId ?? undefined,
  eventType: row.eventType ?? undefined,
  createdAt: toIso(row.createdAt),
  acknowledgedAt: row.acknowledgedAt ? toIso(row.acknowledgedAt) : undefined
});

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
