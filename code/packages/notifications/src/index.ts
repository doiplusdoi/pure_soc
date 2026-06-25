import { createHash, randomUUID } from "node:crypto";
import { connect as connectTls, type TLSSocket } from "node:tls";
import { createConnection, type Socket } from "node:net";

export const notificationChannelTypes = ["email", "slack_webhook", "teams_webhook"] as const;
export type NotificationChannelType = (typeof notificationChannelTypes)[number];

export const notificationEventTypes = [
  "CRITICAL_GAP_DETECTED",
  "M365_DRIFT_DETECTED",
  "INCIDENT_DEADLINE_APPROACHING",
  "EVIDENCE_EXPIRING",
  "CHECKLIST_OVERDUE",
  "REMEDIATION_ACTION_COMPLETED",
  "NOTIFICATION_DIGEST",
  "TEST_NOTIFICATION"
] as const;
export type NotificationEventType = (typeof notificationEventTypes)[number];

export type NotificationSendStatus = "sent" | "failed";

export const notificationCategories = [
  "system",
  "compliance",
  "incident",
  "evidence",
  "remediation",
  "connector",
  "governance"
] as const;
export type NotificationCategory = (typeof notificationCategories)[number];

export type NotificationDigestFrequency = "off" | "daily" | "weekly";

export interface NotificationDeliveryPreferences {
  digestFrequency?: NotificationDigestFrequency | null;
  suppressedCategories?: NotificationCategory[];
  mutedUntil?: string | null;
}

export interface NotificationPreferenceProvider {
  getPreferences(organizationId: string): Promise<NotificationDeliveryPreferences | null>;
}

export type NotificationDigestItemStatus = "pending" | "delivered";
export type NotificationDeliveryRetryStatus = "pending" | "succeeded" | "failed";
export type NotificationOperatorAlertStatus = "open" | "acknowledged";
export type NotificationOperatorAlertSeverity = "warning" | "critical";

export interface NotificationDigestItem {
  id: string;
  organizationId: string;
  eventType: NotificationEventType;
  category: NotificationCategory;
  payloadHash: string;
  payload: Record<string, unknown>;
  digestFrequency: Exclude<NotificationDigestFrequency, "off">;
  status: NotificationDigestItemStatus;
  createdAt: string;
  deliveredAt?: string;
}

export interface NotificationDeliveryRetryItem {
  id: string;
  organizationId: string;
  channelId: string;
  eventType: NotificationEventType;
  payloadHash: string;
  payload: Record<string, unknown>;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  status: NotificationDeliveryRetryStatus;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface NotificationOperatorAlert {
  id: string;
  organizationId: string;
  alertType: "delivery_exhausted";
  severity: NotificationOperatorAlertSeverity;
  status: NotificationOperatorAlertStatus;
  title: string;
  body: string;
  sourceRetryItemId?: string;
  channelId?: string;
  eventType?: NotificationEventType;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface NotificationChannel {
  id: string;
  organizationId: string;
  type: NotificationChannelType;
  destination: string;
  enabled: boolean;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  organizationId: string;
  channelId?: string;
  eventType: NotificationEventType;
  payloadHash: string;
  sentAt: string;
  status: NotificationSendStatus;
  errorMessage?: string;
}

export interface NotificationDeadline {
  id: string;
  organizationId: string;
  sourceType: "incident_reporting";
  sourceId?: string;
  deadlineType: string;
  deadlineAt: string;
  status: "open" | "completed" | "canceled";
  lastNotifiedAt?: string;
  createdAt: string;
}

export interface EvidenceExpiryCandidate {
  organizationId: string;
  artifactId: string;
  title: string;
  validUntil: string;
}

export interface ChecklistOverdueCandidate {
  organizationId: string;
  checklistRunId: string;
  name: string;
  assignee?: string;
  dueDate: string;
}

export interface NotificationRepository {
  createChannel(input: {
    id?: string;
    organizationId: string;
    type: NotificationChannelType;
    destination: string;
    enabled?: boolean;
  }): Promise<NotificationChannel>;
  updateChannel(input: {
    organizationId: string;
    channelId: string;
    destination?: string;
    enabled?: boolean;
  }): Promise<{ before: NotificationChannel; after: NotificationChannel } | null>;
  deleteChannel(organizationId: string, channelId: string): Promise<boolean>;
  findChannel(organizationId: string, channelId: string): Promise<NotificationChannel | null>;
  listChannels(organizationId: string): Promise<NotificationChannel[]>;
  listEnabledChannels(organizationId: string): Promise<NotificationChannel[]>;
  recordLog(input: {
    id?: string;
    organizationId: string;
    channelId?: string;
    eventType: NotificationEventType;
    payloadHash: string;
    sentAt: string;
    status: NotificationSendStatus;
    errorMessage?: string;
  }): Promise<NotificationLog>;
  listLogs(organizationId: string, options?: { limit?: number }): Promise<NotificationLog[]>;
  createDeadline?(input: {
    id?: string;
    organizationId: string;
    sourceType: "incident_reporting";
    sourceId?: string;
    deadlineType: string;
    deadlineAt: string;
    status?: "open" | "completed" | "canceled";
  }): Promise<NotificationDeadline>;
  listIncidentDeadlinesForNotification?(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<NotificationDeadline[]>;
  markDeadlineNotified?(input: {
    organizationId: string;
    deadlineId: string;
    notifiedAt: string;
  }): Promise<NotificationDeadline | null>;
  listEvidenceExpiringForNotification?(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<EvidenceExpiryCandidate[]>;
  listChecklistRunsOverdueForNotification?(input: {
    windowStart: string;
    windowEnd: string;
  }): Promise<ChecklistOverdueCandidate[]>;
  recordDigestItem?(input: {
    id?: string;
    organizationId: string;
    eventType: NotificationEventType;
    category: NotificationCategory;
    payloadHash: string;
    payload: Record<string, unknown>;
    digestFrequency: Exclude<NotificationDigestFrequency, "off">;
    createdAt: string;
  }): Promise<NotificationDigestItem>;
  listPendingDigestItems?(input: {
    digestFrequency: Exclude<NotificationDigestFrequency, "off">;
    createdBefore: string;
    limit?: number;
  }): Promise<NotificationDigestItem[]>;
  markDigestItemsDelivered?(input: {
    organizationId: string;
    digestItemIds: string[];
    deliveredAt: string;
  }): Promise<NotificationDigestItem[]>;
  recordDeliveryRetryItem?(input: {
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
  }): Promise<NotificationDeliveryRetryItem>;
  listDueDeliveryRetryItems?(input: {
    dueAt: string;
    limit?: number;
  }): Promise<NotificationDeliveryRetryItem[]>;
  markDeliveryRetryItemSucceeded?(input: {
    organizationId: string;
    retryItemId: string;
    completedAt: string;
  }): Promise<NotificationDeliveryRetryItem | null>;
  markDeliveryRetryItemFailed?(input: {
    organizationId: string;
    retryItemId: string;
    attemptCount: number;
    lastError: string;
    nextAttemptAt?: string;
    failedAt: string;
  }): Promise<NotificationDeliveryRetryItem | null>;
  recordOperatorAlert?(input: {
    id?: string;
    organizationId: string;
    alertType: "delivery_exhausted";
    severity: NotificationOperatorAlertSeverity;
    title: string;
    body: string;
    sourceRetryItemId?: string;
    channelId?: string;
    eventType?: NotificationEventType;
    createdAt: string;
  }): Promise<NotificationOperatorAlert>;
  listOperatorAlerts?(organizationId: string, options?: {
    status?: NotificationOperatorAlertStatus;
    limit?: number;
  }): Promise<NotificationOperatorAlert[]>;
  acknowledgeOperatorAlert?(input: {
    organizationId: string;
    alertId: string;
    acknowledgedAt: string;
  }): Promise<NotificationOperatorAlert | null>;
}

export interface NotificationTransport {
  send(input: NotificationTransportInput): Promise<void>;
}

export interface NotificationTransportInput {
  channel: NotificationChannel;
  eventType: NotificationEventType;
  payload: Record<string, unknown>;
  message: NotificationMessage;
}

export interface NotificationMessage {
  subject: string;
  text: string;
  html: string;
}

export interface NotificationServiceSendResult {
  eventType: NotificationEventType;
  organizationId: string;
  category: NotificationCategory;
  payloadHash: string;
  deliveryState: "attempted" | "suppressed" | "deferred_for_digest" | "delivery_lookup_failed";
  policyReason?: string;
  digestFrequency?: NotificationDigestFrequency;
  digestItemId?: string;
  attempted: number;
  sent: number;
  failed: number;
  logs: NotificationLog[];
}

export interface NotificationDigestDispatchResult {
  dispatchedAt: string;
  attemptedDigests: number;
  sentDigests: number;
  failedDigests: number;
  deliveredItems: number;
  pendingItems: number;
  skipped: string[];
}

export interface NotificationRetryDispatchResult {
  dispatchedAt: string;
  attempted: number;
  sent: number;
  rescheduled: number;
  exhausted: number;
  operatorAlerts: number;
  skipped: string[];
}

export interface NotificationServiceOptions {
  repository: NotificationRepository;
  transports: Partial<Record<NotificationChannelType, NotificationTransport>>;
  preferenceProvider?: NotificationPreferenceProvider;
  retry?: {
    maxAttempts?: number;
    baseBackoffMs?: number;
    maxBackoffMs?: number;
  };
  now?: () => Date;
  idFactory?: () => string;
}

export class NotificationService {
  private readonly repository: NotificationRepository;
  private readonly transports: Partial<Record<NotificationChannelType, NotificationTransport>>;
  private readonly preferenceProvider?: NotificationPreferenceProvider;
  private readonly retryOptions: Required<NonNullable<NotificationServiceOptions["retry"]>>;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: NotificationServiceOptions) {
    this.repository = options.repository;
    this.transports = options.transports;
    this.preferenceProvider = options.preferenceProvider;
    this.retryOptions = {
      maxAttempts: Math.max(1, options.retry?.maxAttempts ?? 3),
      baseBackoffMs: Math.max(1000, options.retry?.baseBackoffMs ?? 5 * 60 * 1000),
      maxBackoffMs: Math.max(1000, options.retry?.maxBackoffMs ?? 60 * 60 * 1000)
    };
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async send(
    organizationId: string,
    eventType: NotificationEventType,
    payload: Record<string, unknown>,
    options: { channelId?: string } = {}
  ): Promise<NotificationServiceSendResult> {
    const payloadHash = notificationPayloadHash({ eventType, payload });
    const category = notificationEventCategory(eventType);
    const policy = await this.resolveDeliveryPolicy(organizationId, eventType, category);
    if (policy.deliveryState !== "attempted") {
      const digestItem =
        policy.deliveryState === "deferred_for_digest" && policy.digestFrequency
          ? await this.safeRecordDigestItem({
              organizationId,
              eventType,
              category,
              payloadHash,
              payload,
              digestFrequency: policy.digestFrequency,
              createdAt: this.timestamp()
            })
          : null;
      return {
        eventType,
        organizationId,
        category,
        payloadHash,
        deliveryState: policy.deliveryState,
        policyReason: policy.policyReason,
        digestFrequency: policy.digestFrequency,
        digestItemId: digestItem?.id,
        attempted: 0,
        sent: 0,
        failed: 0,
        logs: []
      };
    }

    const logs: NotificationLog[] = [];
    let channels: NotificationChannel[] = [];

    try {
      if (options.channelId) {
        const channel = await this.repository.findChannel(organizationId, options.channelId);
        channels = channel?.enabled ? [channel] : [];
      } else {
        channels = await this.repository.listEnabledChannels(organizationId);
      }
    } catch (error) {
      const log = await this.safeRecordLog({
        organizationId,
        eventType,
        payloadHash,
        sentAt: this.timestamp(),
        status: "failed",
        errorMessage: shortErrorMessage(error)
      });
      return {
        eventType,
        organizationId,
        category,
        payloadHash,
        deliveryState: "delivery_lookup_failed",
        attempted: 0,
        sent: 0,
        failed: log ? 1 : 0,
        logs: log ? [log] : []
      };
    }

    const message = buildNotificationMessage(eventType, payload);

    for (const channel of channels) {
      const transport = this.transports[channel.type];
      if (!transport) {
        const log = await this.safeRecordLog({
          organizationId,
          channelId: channel.id,
          eventType,
          payloadHash,
          sentAt: this.timestamp(),
          status: "failed",
          errorMessage: `Notification transport is not configured for ${channel.type}.`
        });
        await this.safeRecordRetryItem({
          channel,
          eventType,
          payloadHash,
          payload,
          errorMessage: `Notification transport is not configured for ${channel.type}.`
        });
        if (log) {
          logs.push(log);
        }
        continue;
      }

      try {
        await transport.send({ channel, eventType, payload, message });
        const log = await this.safeRecordLog({
          organizationId,
          channelId: channel.id,
          eventType,
          payloadHash,
          sentAt: this.timestamp(),
          status: "sent"
        });
        if (log) {
          logs.push(log);
        }
      } catch (error) {
        const log = await this.safeRecordLog({
          organizationId,
          channelId: channel.id,
          eventType,
          payloadHash,
          sentAt: this.timestamp(),
          status: "failed",
          errorMessage: shortErrorMessage(error)
        });
        await this.safeRecordRetryItem({
          channel,
          eventType,
          payloadHash,
          payload,
          errorMessage: shortErrorMessage(error)
        });
        if (log) {
          logs.push(log);
        }
      }
    }

    return {
      eventType,
      organizationId,
      category,
      payloadHash,
      deliveryState: "attempted",
      attempted: channels.length,
      sent: logs.filter((log) => log.status === "sent").length,
      failed: logs.filter((log) => log.status === "failed").length,
      logs
    };
  }

  async dispatchDueRetries(options: { limit?: number } = {}): Promise<NotificationRetryDispatchResult> {
    if (
      !this.repository.listDueDeliveryRetryItems ||
      !this.repository.markDeliveryRetryItemSucceeded ||
      !this.repository.markDeliveryRetryItemFailed
    ) {
      return {
        dispatchedAt: this.timestamp(),
        attempted: 0,
        sent: 0,
        rescheduled: 0,
        exhausted: 0,
        operatorAlerts: 0,
        skipped: ["notification_retry_repository_unavailable"]
      };
    }

    const dispatchedAt = this.timestamp();
    const retryItems = await this.repository.listDueDeliveryRetryItems({
      dueAt: dispatchedAt,
      limit: options.limit
    });
    let sent = 0;
    let rescheduled = 0;
    let exhausted = 0;
    let operatorAlerts = 0;

    for (const retryItem of retryItems) {
      const result = await this.dispatchRetryItem(retryItem);
      if (result.outcome === "sent") {
        sent += 1;
      } else if (result.outcome === "rescheduled") {
        rescheduled += 1;
      } else {
        exhausted += 1;
      }
      if (result.operatorAlertCreated) {
        operatorAlerts += 1;
      }
    }

    return {
      dispatchedAt,
      attempted: retryItems.length,
      sent,
      rescheduled,
      exhausted,
      operatorAlerts,
      skipped: []
    };
  }

  async dispatchDueDigests(options: {
    limitPerFrequency?: number;
  } = {}): Promise<NotificationDigestDispatchResult> {
    if (!this.repository.listPendingDigestItems || !this.repository.markDigestItemsDelivered) {
      return {
        dispatchedAt: this.timestamp(),
        attemptedDigests: 0,
        sentDigests: 0,
        failedDigests: 0,
        deliveredItems: 0,
        pendingItems: 0,
        skipped: ["notification_digest_repository_unavailable"]
      };
    }

    const dispatchedAt = this.timestamp();
    const daily = await this.dispatchDigestFrequency({
      digestFrequency: "daily",
      createdBefore: new Date(this.now().getTime() - oneDayMs).toISOString(),
      limit: options.limitPerFrequency
    });
    const weekly = await this.dispatchDigestFrequency({
      digestFrequency: "weekly",
      createdBefore: new Date(this.now().getTime() - sevenDaysMs).toISOString(),
      limit: options.limitPerFrequency
    });

    return {
      dispatchedAt,
      attemptedDigests: daily.attemptedDigests + weekly.attemptedDigests,
      sentDigests: daily.sentDigests + weekly.sentDigests,
      failedDigests: daily.failedDigests + weekly.failedDigests,
      deliveredItems: daily.deliveredItems + weekly.deliveredItems,
      pendingItems: daily.pendingItems + weekly.pendingItems,
      skipped: [...daily.skipped, ...weekly.skipped]
    };
  }

  private async dispatchDigestFrequency(input: {
    digestFrequency: Exclude<NotificationDigestFrequency, "off">;
    createdBefore: string;
    limit?: number;
  }): Promise<Omit<NotificationDigestDispatchResult, "dispatchedAt">> {
    if (!this.repository.listPendingDigestItems || !this.repository.markDigestItemsDelivered) {
      return {
        attemptedDigests: 0,
        sentDigests: 0,
        failedDigests: 0,
        deliveredItems: 0,
        pendingItems: 0,
        skipped: ["notification_digest_repository_unavailable"]
      };
    }

    const items = await this.repository.listPendingDigestItems({
      digestFrequency: input.digestFrequency,
      createdBefore: input.createdBefore,
      limit: input.limit
    });
    const byOrganization = new Map<string, NotificationDigestItem[]>();
    for (const item of items) {
      const group = byOrganization.get(item.organizationId) ?? [];
      group.push(item);
      byOrganization.set(item.organizationId, group);
    }

    let sentDigests = 0;
    let failedDigests = 0;
    let deliveredItems = 0;
    for (const [organizationId, organizationItems] of byOrganization.entries()) {
      const result = await this.send(
        organizationId,
        "NOTIFICATION_DIGEST",
        buildDigestPayload(input.digestFrequency, organizationItems, this.timestamp())
      );
      if (result.sent > 0) {
        sentDigests += 1;
        const delivered = await this.repository.markDigestItemsDelivered({
          organizationId,
          digestItemIds: organizationItems.map((item) => item.id),
          deliveredAt: this.timestamp()
        });
        deliveredItems += delivered.length;
      } else {
        failedDigests += 1;
      }
    }

    return {
      attemptedDigests: byOrganization.size,
      sentDigests,
      failedDigests,
      deliveredItems,
      pendingItems: items.length - deliveredItems,
      skipped: []
    };
  }

  private async dispatchRetryItem(retryItem: NotificationDeliveryRetryItem): Promise<{
    outcome: "sent" | "rescheduled" | "exhausted";
    operatorAlertCreated: boolean;
  }> {
    if (!this.repository.markDeliveryRetryItemSucceeded || !this.repository.markDeliveryRetryItemFailed) {
      return { outcome: "exhausted", operatorAlertCreated: false };
    }

    const channel = await this.safeFindRetryChannel(retryItem);
    if (!channel?.enabled) {
      const operatorAlert = await this.recordRetryFailure({
        retryItem,
        errorMessage: "Notification retry channel is unavailable.",
        final: true
      });
      return { outcome: "exhausted", operatorAlertCreated: Boolean(operatorAlert) };
    }

    const transport = this.transports[channel.type];
    if (!transport) {
      const operatorAlert = await this.recordRetryFailure({
        retryItem,
        channel,
        errorMessage: `Notification transport is not configured for ${channel.type}.`
      });
      const outcome = retryItem.attemptCount + 1 >= retryItem.maxAttempts ? "exhausted" : "rescheduled";
      return { outcome, operatorAlertCreated: Boolean(operatorAlert) };
    }

    const message = buildNotificationMessage(retryItem.eventType, retryItem.payload);
    try {
      await transport.send({
        channel,
        eventType: retryItem.eventType,
        payload: retryItem.payload,
        message
      });
      await this.safeRecordLog({
        organizationId: retryItem.organizationId,
        channelId: retryItem.channelId,
        eventType: retryItem.eventType,
        payloadHash: retryItem.payloadHash,
        sentAt: this.timestamp(),
        status: "sent"
      });
      await this.repository.markDeliveryRetryItemSucceeded({
        organizationId: retryItem.organizationId,
        retryItemId: retryItem.id,
        completedAt: this.timestamp()
      });
      return { outcome: "sent", operatorAlertCreated: false };
    } catch (error) {
      const operatorAlert = await this.recordRetryFailure({
        retryItem,
        channel,
        errorMessage: shortErrorMessage(error)
      });
      const outcome = retryItem.attemptCount + 1 >= retryItem.maxAttempts ? "exhausted" : "rescheduled";
      return { outcome, operatorAlertCreated: Boolean(operatorAlert) };
    }
  }

  private async recordRetryFailure(input: {
    retryItem: NotificationDeliveryRetryItem;
    channel?: NotificationChannel;
    errorMessage: string;
    final?: boolean;
  }): Promise<NotificationOperatorAlert | null> {
    if (!this.repository.markDeliveryRetryItemFailed) {
      return null;
    }

    await this.safeRecordLog({
      organizationId: input.retryItem.organizationId,
      channelId: input.retryItem.channelId,
      eventType: input.retryItem.eventType,
      payloadHash: input.retryItem.payloadHash,
      sentAt: this.timestamp(),
      status: "failed",
      errorMessage: input.errorMessage
    });
    const attemptCount = input.final ? input.retryItem.maxAttempts : input.retryItem.attemptCount + 1;
    const updated = await this.repository.markDeliveryRetryItemFailed({
      organizationId: input.retryItem.organizationId,
      retryItemId: input.retryItem.id,
      attemptCount,
      lastError: input.errorMessage,
      nextAttemptAt: attemptCount < input.retryItem.maxAttempts ? this.nextRetryAttemptAt(attemptCount) : undefined,
      failedAt: this.timestamp()
    });
    if (updated?.status !== "failed") {
      return null;
    }
    return this.safeRecordOperatorAlert({
      retryItem: updated,
      errorMessage: input.errorMessage
    });
  }

  private async resolveDeliveryPolicy(
    organizationId: string,
    eventType: NotificationEventType,
    category: NotificationCategory
  ): Promise<
    | { deliveryState: "attempted" }
    | {
        deliveryState: "suppressed" | "deferred_for_digest";
        policyReason: string;
        digestFrequency?: Exclude<NotificationDigestFrequency, "off">;
      }
  > {
    if (!this.preferenceProvider || eventType === "TEST_NOTIFICATION") {
      return { deliveryState: "attempted" };
    }

    const preferences = await this.preferenceProvider.getPreferences(organizationId);
    const mutedUntil = parseOptionalTimestamp(preferences?.mutedUntil);
    if (mutedUntil && mutedUntil.getTime() > this.now().getTime()) {
      return {
        deliveryState: "suppressed",
        policyReason: "organization_notifications_muted"
      };
    }

    if (preferences?.suppressedCategories?.includes(category)) {
      return {
        deliveryState: "suppressed",
        policyReason: `category_${category}_suppressed`
      };
    }

    const digestFrequency = preferences?.digestFrequency;
    if ((digestFrequency === "daily" || digestFrequency === "weekly") && !requiresImmediateDelivery(eventType)) {
      return {
        deliveryState: "deferred_for_digest",
        policyReason: `notification_digest_${digestFrequency}`,
        digestFrequency
      };
    }

    return { deliveryState: "attempted" };
  }

  private async safeRecordLog(input: Omit<NotificationLog, "id">): Promise<NotificationLog | null> {
    try {
      return await this.repository.recordLog({
        id: this.idFactory(),
        ...input
      });
    } catch {
      return null;
    }
  }

  private async safeRecordDigestItem(
    input: Omit<NotificationDigestItem, "id" | "status" | "deliveredAt">
  ): Promise<NotificationDigestItem | null> {
    if (!this.repository.recordDigestItem) {
      return null;
    }

    try {
      return await this.repository.recordDigestItem({
        id: this.idFactory(),
        ...input
      });
    } catch {
      return null;
    }
  }

  private async safeRecordRetryItem(input: {
    channel: NotificationChannel;
    eventType: NotificationEventType;
    payloadHash: string;
    payload: Record<string, unknown>;
    errorMessage: string;
  }): Promise<NotificationDeliveryRetryItem | null> {
    if (!this.repository.recordDeliveryRetryItem || !shouldScheduleRetry(input.eventType)) {
      return null;
    }

    try {
      return await this.repository.recordDeliveryRetryItem({
        id: this.idFactory(),
        organizationId: input.channel.organizationId,
        channelId: input.channel.id,
        eventType: input.eventType,
        payloadHash: input.payloadHash,
        payload: input.payload,
        attemptCount: 1,
        maxAttempts: this.retryOptions.maxAttempts,
        nextAttemptAt: this.retryOptions.maxAttempts > 1 ? this.nextRetryAttemptAt(1) : undefined,
        lastError: input.errorMessage,
        createdAt: this.timestamp()
      });
    } catch {
      return null;
    }
  }

  private async safeFindRetryChannel(retryItem: NotificationDeliveryRetryItem): Promise<NotificationChannel | null> {
    try {
      return await this.repository.findChannel(retryItem.organizationId, retryItem.channelId);
    } catch {
      return null;
    }
  }

  private async safeRecordOperatorAlert(input: {
    retryItem: NotificationDeliveryRetryItem;
    errorMessage: string;
  }): Promise<NotificationOperatorAlert | null> {
    if (!this.repository.recordOperatorAlert) {
      return null;
    }

    try {
      return await this.repository.recordOperatorAlert({
        id: this.idFactory(),
        organizationId: input.retryItem.organizationId,
        alertType: "delivery_exhausted",
        severity: "warning",
        title: "Notification delivery exhausted",
        body: `Delivery retries for ${input.retryItem.eventType} exhausted on channel ${input.retryItem.channelId}. Last error: ${input.errorMessage}`,
        sourceRetryItemId: input.retryItem.id,
        channelId: input.retryItem.channelId,
        eventType: input.retryItem.eventType,
        createdAt: this.timestamp()
      });
    } catch {
      return null;
    }
  }

  private nextRetryAttemptAt(attemptCount: number): string {
    const backoffMs = Math.min(
      this.retryOptions.maxBackoffMs,
      this.retryOptions.baseBackoffMs * 2 ** Math.max(0, attemptCount - 1)
    );
    return new Date(this.now().getTime() + backoffMs).toISOString();
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

export const notificationEventCategory = (eventType: NotificationEventType): NotificationCategory => {
  switch (eventType) {
    case "CRITICAL_GAP_DETECTED":
      return "compliance";
    case "M365_DRIFT_DETECTED":
      return "connector";
    case "INCIDENT_DEADLINE_APPROACHING":
      return "incident";
    case "EVIDENCE_EXPIRING":
      return "evidence";
    case "CHECKLIST_OVERDUE":
      return "governance";
    case "REMEDIATION_ACTION_COMPLETED":
      return "remediation";
    case "NOTIFICATION_DIGEST":
      return "system";
    case "TEST_NOTIFICATION":
      return "system";
  }
};

export interface SmtpNotificationTransportOptions {
  host: string;
  port: number;
  secure?: boolean;
  startTls?: boolean;
  username?: string;
  password?: string;
  from: string;
  timeoutMs?: number;
}

export class SmtpNotificationTransport implements NotificationTransport {
  private readonly options: SmtpNotificationTransportOptions;

  constructor(options: SmtpNotificationTransportOptions) {
    this.options = options;
  }

  async send(input: NotificationTransportInput): Promise<void> {
    if (input.channel.type !== "email") {
      throw new Error("SMTP transport can only send email notification channels.");
    }

    const message = buildMimeMessage({
      from: this.options.from,
      to: input.channel.destination,
      subject: input.message.subject,
      text: input.message.text,
      html: input.message.html
    });

    const client = await SmtpClient.connect(this.options);
    try {
      await client.ehlo();
      if (this.options.startTls && !this.options.secure) {
        await client.startTls(this.options.host);
        await client.ehlo();
      }
      if (this.options.username || this.options.password) {
        await client.authPlain(this.options.username ?? "", this.options.password ?? "");
      }
      await client.mailFrom(this.options.from);
      await client.rcptTo(input.channel.destination);
      await client.data(message);
      await client.quit();
    } finally {
      client.close();
    }
  }
}

export interface WebhookNotificationTransportOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class SlackWebhookNotificationTransport implements NotificationTransport {
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WebhookNotificationTransportOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(input: NotificationTransportInput): Promise<void> {
    await postWebhookJson({
      fetchImpl: this.fetchImpl,
      timeoutMs: this.timeoutMs,
      url: input.channel.destination,
      body: {
        text: `${input.message.subject}\n${input.message.text}`
      }
    });
  }
}

export class TeamsWebhookNotificationTransport implements NotificationTransport {
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WebhookNotificationTransportOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(input: NotificationTransportInput): Promise<void> {
    await postWebhookJson({
      fetchImpl: this.fetchImpl,
      timeoutMs: this.timeoutMs,
      url: input.channel.destination,
      body: {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        summary: input.message.subject,
        themeColor: "2b6f6d",
        title: input.message.subject,
        text: input.message.text
      }
    });
  }
}

export class DisabledNotificationTransport implements NotificationTransport {
  constructor(private readonly reason: string) {}

  send(): Promise<void> {
    return Promise.reject(new Error(this.reason));
  }
}

export const buildNotificationMessage = (
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): NotificationMessage => {
  const text = notificationText(eventType, payload);
  const subject = `[PureSOC] ${notificationSubject(eventType, payload)}`;
  return {
    subject,
    text,
    html: `<p>${escapeHtml(text)}</p>`
  };
};

export const notificationPayloadHash = (input: {
  eventType: NotificationEventType;
  payload: Record<string, unknown>;
}): string => createHash("sha256").update(stableStringify(input)).digest("hex");

export const validateNotificationChannelInput = (input: {
  type: unknown;
  destination: unknown;
}): { type: NotificationChannelType; destination: string } => {
  if (!notificationChannelTypes.includes(input.type as NotificationChannelType)) {
    throw new NotificationValidationError("invalid_notification_channel_type", "Unsupported notification channel type.");
  }

  if (typeof input.destination !== "string" || input.destination.trim().length === 0) {
    throw new NotificationValidationError("invalid_notification_destination", "Notification destination is required.");
  }

  const type = input.type as NotificationChannelType;
  const destination = input.destination.trim();

  if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
    throw new NotificationValidationError("invalid_notification_destination", "Email notification destination is invalid.");
  }

  if ((type === "slack_webhook" || type === "teams_webhook") && !isHttpUrl(destination)) {
    throw new NotificationValidationError("invalid_notification_destination", "Webhook notification destination must be an http or https URL.");
  }

  return { type, destination };
};

export class NotificationValidationError extends Error {
  readonly code: string;
  readonly statusCode = 400;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NotificationValidationError";
    this.code = code;
  }
}

const notificationSubject = (eventType: NotificationEventType, payload: Record<string, unknown>): string => {
  switch (eventType) {
    case "CRITICAL_GAP_DETECTED":
      return "Critical NIS2 gap detected";
    case "M365_DRIFT_DETECTED":
      return "Microsoft 365 drift detected";
    case "INCIDENT_DEADLINE_APPROACHING":
      return "Incident deadline approaching";
    case "EVIDENCE_EXPIRING":
      return "Evidence expiring";
    case "CHECKLIST_OVERDUE":
      return "Checklist overdue";
    case "REMEDIATION_ACTION_COMPLETED":
      return "Remediation action verified";
    case "NOTIFICATION_DIGEST":
      return `${stringPayload(payload, "digestFrequency", "Notification")} digest`;
    case "TEST_NOTIFICATION":
      return "Test notification";
    default:
      return String(payload.title ?? "PureSOC notification");
  }
};

const notificationText = (eventType: NotificationEventType, payload: Record<string, unknown>): string => {
  switch (eventType) {
    case "CRITICAL_GAP_DETECTED":
      return `New critical NIS2 gap detected in ${stringPayload(payload, "controlName", "the affected control")}. Login to review.`;
    case "M365_DRIFT_DETECTED":
      return `Microsoft 365 configuration drift detected: ${stringPayload(payload, "findingTitle", "new open finding")}. Login to review.`;
    case "INCIDENT_DEADLINE_APPROACHING":
      return `Action required: ${stringPayload(payload, "deadlineType", "incident reporting")} deadline in 6 hours.`;
    case "EVIDENCE_EXPIRING":
      return `${numberPayload(payload, "count", 1)} evidence artifact(s) expire in 7 days.`;
    case "CHECKLIST_OVERDUE":
      return `Checklist '${stringPayload(payload, "name", "Unnamed checklist")}' is overdue. Assigned to ${stringPayload(payload, "assignee", "unassigned")}.`;
    case "REMEDIATION_ACTION_COMPLETED":
      return `Remediation action '${stringPayload(payload, "title", "Untitled action")}' reached verified state.`;
    case "NOTIFICATION_DIGEST":
      return `${numberPayload(payload, "itemCount", 0)} notification(s) in this ${stringPayload(
        payload,
        "digestFrequency",
        "scheduled"
      )} digest: ${stringPayload(payload, "summary", "No categorized items.")}`;
    case "TEST_NOTIFICATION":
      return "PureSOC test notification delivered from the organization notification settings.";
  }
};

const stringPayload = (payload: Record<string, unknown>, key: string, fallback: string): string => {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
};

const numberPayload = (payload: Record<string, unknown>, key: string, fallback: number): number => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const postWebhookJson = async (input: {
  fetchImpl: typeof fetch;
  timeoutMs: number;
  url: string;
  body: Record<string, unknown>;
}): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await input.fetchImpl(input.url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(input.body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed with HTTP ${response.status}.`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

const shortErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
};

const parseOptionalTimestamp = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
};

const requiresImmediateDelivery = (eventType: NotificationEventType): boolean =>
  eventType === "CRITICAL_GAP_DETECTED" ||
  eventType === "INCIDENT_DEADLINE_APPROACHING" ||
  eventType === "NOTIFICATION_DIGEST" ||
  eventType === "TEST_NOTIFICATION";

const shouldScheduleRetry = (eventType: NotificationEventType): boolean => eventType !== "TEST_NOTIFICATION";

const oneDayMs = 24 * 60 * 60 * 1000;
const sevenDaysMs = 7 * oneDayMs;

const buildDigestPayload = (
  digestFrequency: Exclude<NotificationDigestFrequency, "off">,
  items: NotificationDigestItem[],
  dispatchedAt: string
): Record<string, unknown> => {
  const createdAtValues = items.map((item) => item.createdAt).sort();
  const eventCounts = countBy(items.map((item) => item.eventType));
  const categoryCounts = countBy(items.map((item) => item.category));
  return {
    digestFrequency,
    itemCount: items.length,
    windowStart: createdAtValues[0],
    windowEnd: createdAtValues[createdAtValues.length - 1],
    dispatchedAt,
    eventCounts,
    categoryCounts,
    summary: Object.entries(eventCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([eventType, count]) => `${eventType}: ${count}`)
      .join(", "),
    itemIds: items.map((item) => item.id)
  };
};

const countBy = (values: string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildMimeMessage = (input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): string => {
  const boundary = `puresoc-${randomUUID()}`;
  return [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${mimeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    "",
    `--${boundary}--`,
    ""
  ].join("\r\n");
};

const mimeHeader = (value: string): string => {
  if (/^[\x20-\x7e]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
};

class SmtpClient {
  private socket: Socket | TLSSocket;
  private readonly timeoutMs: number;
  private buffer = "";

  private constructor(socket: Socket | TLSSocket, timeoutMs: number) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
    });
  }

  static async connect(options: SmtpNotificationTransportOptions): Promise<SmtpClient> {
    const timeoutMs = options.timeoutMs ?? 10_000;
    const socket = options.secure
      ? connectTls({
          host: options.host,
          port: options.port,
          servername: options.host,
          timeout: timeoutMs
        })
      : createConnection({
          host: options.host,
          port: options.port,
          timeout: timeoutMs
        });

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      socket.once("error", onError);
      socket.once(options.secure ? "secureConnect" : "connect", () => {
        socket.off("error", onError);
        resolve();
      });
    });

    const client = new SmtpClient(socket, timeoutMs);
    await client.expect([220]);
    return client;
  }

  async ehlo(): Promise<void> {
    await this.command(`EHLO puresoc.local`, [250]);
  }

  async startTls(host: string): Promise<void> {
    await this.command("STARTTLS", [220]);
    this.socket = connectTls({
      socket: this.socket,
      servername: host
    });
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
    });
  }

  async authPlain(username: string, password: string): Promise<void> {
    const token = Buffer.from(`\u0000${username}\u0000${password}`, "utf8").toString("base64");
    await this.command(`AUTH PLAIN ${token}`, [235]);
  }

  async mailFrom(from: string): Promise<void> {
    await this.command(`MAIL FROM:<${from}>`, [250]);
  }

  async rcptTo(to: string): Promise<void> {
    await this.command(`RCPT TO:<${to}>`, [250, 251]);
  }

  async data(message: string): Promise<void> {
    await this.command("DATA", [354]);
    await this.write(`${escapeSmtpData(message)}\r\n.`);
    await this.expect([250]);
  }

  async quit(): Promise<void> {
    await this.command("QUIT", [221]);
  }

  close(): void {
    this.socket.destroy();
  }

  private async command(command: string, expectedCodes: number[]): Promise<void> {
    await this.write(command);
    await this.expect(expectedCodes);
  }

  private async write(line: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket.write(`${line}\r\n`, (error) => (error ? reject(error) : resolve()));
    });
  }

  private async expect(expectedCodes: number[]): Promise<void> {
    const response = await this.readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(`SMTP command failed with ${response.code}: ${response.message}`);
    }
  }

  private async readResponse(): Promise<{ code: number; message: string }> {
    const deadline = Date.now() + this.timeoutMs;
    while (Date.now() < deadline) {
      const response = parseSmtpResponse(this.buffer);
      if (response) {
        this.buffer = this.buffer.slice(response.consumed);
        return response;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    throw new Error("SMTP response timed out.");
  }
}

const parseSmtpResponse = (buffer: string): { code: number; message: string; consumed: number } | null => {
  const lineEnd = buffer.indexOf("\r\n");
  if (lineEnd < 0) {
    return null;
  }

  const lines = buffer.slice(0, lineEnd + 2).split("\r\n").filter(Boolean);
  let consumed = lineEnd + 2;
  let cursor = lineEnd + 2;
  let lastLine = lines[lines.length - 1] ?? "";

  while (/^\d{3}-/.test(lastLine)) {
    const nextEnd = buffer.indexOf("\r\n", cursor);
    if (nextEnd < 0) {
      return null;
    }
    const line = buffer.slice(cursor, nextEnd);
    cursor = nextEnd + 2;
    consumed = cursor;
    lastLine = line;
  }

  const code = Number(lastLine.slice(0, 3));
  return {
    code,
    message: buffer.slice(0, consumed).trim(),
    consumed
  };
};

const escapeSmtpData = (message: string): string =>
  message
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
