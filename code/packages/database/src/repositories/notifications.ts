import { randomUUID } from "node:crypto";

import type {
  ChecklistOverdueCandidate,
  EvidenceExpiryCandidate,
  NotificationChannel,
  NotificationChannelType,
  NotificationDeadline,
  NotificationEventType,
  NotificationLog,
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
  evidenceArtifact: Pick<Delegate<EvidenceArtifactExpiryRow>, "findMany">;
  checklistRun: Pick<Delegate<ChecklistRunOverdueRow>, "findMany">;
  checklistTemplate: Pick<Delegate<ChecklistTemplateRow>, "findFirst">;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  readonly channels = new Map<string, NotificationChannel>();
  readonly logs: NotificationLog[] = [];
  readonly deadlines = new Map<string, NotificationDeadline>();
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

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
