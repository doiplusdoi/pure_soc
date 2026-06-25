import type { AuditWriter } from "@puresoc/audit";
import { AuthError } from "@puresoc/auth-core";
import {
  NotificationValidationError,
  type NotificationChannel,
  type NotificationLog,
  type NotificationOperatorAlert,
  type NotificationRepository,
  type NotificationService,
  validateNotificationChannelInput
} from "@puresoc/notifications";

import type { RequestContext } from "../http";

export interface NotificationChannelView {
  id: string;
  organizationId: string;
  type: NotificationChannel["type"];
  destination?: string;
  destinationPreview: string;
  enabled: boolean;
  createdAt: string;
}

export interface NotificationLogView {
  id: string;
  organizationId: string;
  channelId?: string;
  eventType: string;
  payloadHash: string;
  sentAt: string;
  status: NotificationLog["status"];
  errorMessage?: string;
}

export interface NotificationOperatorAlertView {
  id: string;
  organizationId: string;
  alertType: NotificationOperatorAlert["alertType"];
  severity: NotificationOperatorAlert["severity"];
  status: NotificationOperatorAlert["status"];
  title: string;
  body: string;
  sourceRetryItemId?: string;
  channelId?: string;
  eventType?: string;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface NotificationApiServiceOptions {
  repository: NotificationRepository;
  service: NotificationService;
  auditWriter: AuditWriter;
}

export class NotificationApiService {
  private readonly repository: NotificationRepository;
  private readonly service: NotificationService;
  private readonly auditWriter: AuditWriter;

  constructor(options: NotificationApiServiceOptions) {
    this.repository = options.repository;
    this.service = options.service;
    this.auditWriter = options.auditWriter;
  }

  async createChannel(input: {
    organizationId: string;
    actorUserId: string;
    type: unknown;
    destination: unknown;
    context?: RequestContext;
  }): Promise<{ channel: NotificationChannelView }> {
    const validated = validateNotificationChannelInput({
      type: input.type,
      destination: input.destination
    });
    const channel = await this.repository.createChannel({
      organizationId: input.organizationId,
      type: validated.type,
      destination: validated.destination,
      enabled: true
    });
    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "notification_channel",
      targetId: channel.id,
      action: "notification_channel_created",
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
      afterJson: {
        type: channel.type,
        destinationPreview: destinationPreview(channel)
      }
    });
    return {
      channel: safeNotificationChannelView(channel)
    };
  }

  async updateChannel(input: {
    organizationId: string;
    actorUserId: string;
    channelId: string;
    destination?: unknown;
    enabled?: unknown;
    context?: RequestContext;
  }): Promise<{ channel: NotificationChannelView }> {
    if (input.destination === undefined && input.enabled === undefined) {
      throw new NotificationValidationError(
        "invalid_notification_channel_update",
        "Notification channel update requires a destination or enabled value."
      );
    }

    const existing = await this.repository.findChannel(input.organizationId, input.channelId);
    if (!existing) {
      throw new AuthError("invalid_request", "Notification channel was not found for this organization.", 404);
    }

    const destination =
      input.destination === undefined
        ? undefined
        : validateNotificationChannelInput({
            type: existing.type,
            destination: input.destination
          }).destination;
    const enabled = parseOptionalEnabled(input.enabled);
    const result = await this.repository.updateChannel({
      organizationId: input.organizationId,
      channelId: input.channelId,
      destination,
      enabled
    });

    if (!result) {
      throw new AuthError("invalid_request", "Notification channel was not found for this organization.", 404);
    }

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "notification_channel",
      targetId: input.channelId,
      action: "notification_channel_updated",
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
      beforeJson: safeNotificationChannelAuditJson(result.before),
      afterJson: safeNotificationChannelAuditJson(result.after)
    });

    return {
      channel: safeNotificationChannelView(result.after)
    };
  }

  async deleteChannel(input: {
    organizationId: string;
    actorUserId: string;
    channelId: string;
    context?: RequestContext;
  }): Promise<{ deleted: boolean }> {
    const existing = await this.repository.findChannel(input.organizationId, input.channelId);
    const deleted = await this.repository.deleteChannel(input.organizationId, input.channelId);
    if (deleted) {
      await this.auditWriter.write({
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        targetType: "notification_channel",
        targetId: input.channelId,
        action: "notification_channel_deleted",
        ipAddress: input.context?.ipAddress,
        userAgent: input.context?.userAgent,
        beforeJson: existing
          ? {
              type: existing.type,
              destinationPreview: destinationPreview(existing)
            }
          : undefined
      });
    }
    return { deleted };
  }

  async listChannels(organizationId: string): Promise<{ channels: NotificationChannelView[] }> {
    const channels = await this.repository.listChannels(organizationId);
    return {
      channels: channels.map(safeNotificationChannelView)
    };
  }

  async listLogs(organizationId: string): Promise<{ logs: NotificationLogView[] }> {
    const logs = await this.repository.listLogs(organizationId, { limit: 100 });
    return {
      logs: logs.map(safeNotificationLogView)
    };
  }

  async listOperatorAlerts(organizationId: string): Promise<{ operatorAlerts: NotificationOperatorAlertView[] }> {
    const alerts = (await this.repository.listOperatorAlerts?.(organizationId, { limit: 100 })) ?? [];
    return {
      operatorAlerts: alerts.map(safeNotificationOperatorAlertView)
    };
  }

  async acknowledgeOperatorAlert(input: {
    organizationId: string;
    actorUserId: string;
    alertId: string;
    context?: RequestContext;
  }): Promise<{ operatorAlert: NotificationOperatorAlertView }> {
    const before = (await this.repository.listOperatorAlerts?.(input.organizationId, { limit: 100 }))?.find(
      (alert) => alert.id === input.alertId
    );
    const alert = await this.repository.acknowledgeOperatorAlert?.({
      organizationId: input.organizationId,
      alertId: input.alertId,
      acknowledgedAt: new Date().toISOString()
    });
    if (!alert) {
      throw new AuthError("invalid_request", "Notification operator alert was not found for this organization.", 404);
    }

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "notification_operator_alert",
      targetId: input.alertId,
      action: "notification_operator_alert_acknowledged",
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
      beforeJson: before ? safeNotificationOperatorAlertView(before) : undefined,
      afterJson: safeNotificationOperatorAlertView(alert)
    });

    return {
      operatorAlert: safeNotificationOperatorAlertView(alert)
    };
  }

  async sendTest(input: {
    organizationId: string;
    actorUserId: string;
    channelId: string;
    context?: RequestContext;
  }): Promise<{
    attempted: number;
    sent: number;
    failed: number;
    logs: NotificationLogView[];
  }> {
    const result = await this.service.send(
      input.organizationId,
      "TEST_NOTIFICATION",
      {
        channelId: input.channelId
      },
      {
        channelId: input.channelId
      }
    );
    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "notification_channel",
      targetId: input.channelId,
      action: "notification_test_sent",
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
      afterJson: {
        attempted: result.attempted,
        sent: result.sent,
        failed: result.failed
      }
    });
    return {
      attempted: result.attempted,
      sent: result.sent,
      failed: result.failed,
      logs: result.logs.map(safeNotificationLogView)
    };
  }
}

const parseOptionalEnabled = (enabled: unknown): boolean | undefined => {
  if (enabled === undefined) {
    return undefined;
  }
  if (typeof enabled !== "boolean") {
    throw new NotificationValidationError(
      "invalid_notification_channel_enabled",
      "Notification channel enabled value must be boolean."
    );
  }
  return enabled;
};

const safeNotificationChannelAuditJson = (channel: NotificationChannel): Record<string, unknown> => ({
  type: channel.type,
  destinationPreview: destinationPreview(channel),
  enabled: channel.enabled
});

export const safeNotificationChannelView = (channel: NotificationChannel): NotificationChannelView => ({
  id: channel.id,
  organizationId: channel.organizationId,
  type: channel.type,
  destination: channel.type === "email" ? channel.destination : undefined,
  destinationPreview: destinationPreview(channel),
  enabled: channel.enabled,
  createdAt: channel.createdAt
});

export const safeNotificationLogView = (log: NotificationLog): NotificationLogView => ({
  id: log.id,
  organizationId: log.organizationId,
  channelId: log.channelId,
  eventType: log.eventType,
  payloadHash: log.payloadHash,
  sentAt: log.sentAt,
  status: log.status,
  errorMessage: log.errorMessage
});

export const safeNotificationOperatorAlertView = (
  alert: NotificationOperatorAlert
): NotificationOperatorAlertView => ({
  id: alert.id,
  organizationId: alert.organizationId,
  alertType: alert.alertType,
  severity: alert.severity,
  status: alert.status,
  title: alert.title,
  body: alert.body,
  sourceRetryItemId: alert.sourceRetryItemId,
  channelId: alert.channelId,
  eventType: alert.eventType,
  createdAt: alert.createdAt,
  acknowledgedAt: alert.acknowledgedAt
});

const destinationPreview = (channel: NotificationChannel): string => {
  if (channel.type === "email") {
    return channel.destination;
  }

  try {
    const url = new URL(channel.destination);
    return `${url.origin}${url.pathname.slice(0, 18)}...`;
  } catch {
    return "webhook destination";
  }
};
