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
  "TEST_NOTIFICATION"
] as const;
export type NotificationEventType = (typeof notificationEventTypes)[number];

export type NotificationSendStatus = "sent" | "failed";

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
  payloadHash: string;
  attempted: number;
  sent: number;
  failed: number;
  logs: NotificationLog[];
}

export interface NotificationServiceOptions {
  repository: NotificationRepository;
  transports: Partial<Record<NotificationChannelType, NotificationTransport>>;
  now?: () => Date;
  idFactory?: () => string;
}

export class NotificationService {
  private readonly repository: NotificationRepository;
  private readonly transports: Partial<Record<NotificationChannelType, NotificationTransport>>;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: NotificationServiceOptions) {
    this.repository = options.repository;
    this.transports = options.transports;
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
        payloadHash,
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
        if (log) {
          logs.push(log);
        }
      }
    }

    return {
      eventType,
      organizationId,
      payloadHash,
      attempted: channels.length,
      sent: logs.filter((log) => log.status === "sent").length,
      failed: logs.filter((log) => log.status === "failed").length,
      logs
    };
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

  private timestamp(): string {
    return this.now().toISOString();
  }
}

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
