import type { AuditWriter } from "@puresoc/audit";
import {
  type NotificationChannel,
  type NotificationLog,
  type NotificationRepository,
  type NotificationService
} from "@puresoc/notifications";
import { validateNotificationChannelInput } from "@puresoc/notifications";

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
