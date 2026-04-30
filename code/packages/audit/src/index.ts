import { randomUUID } from "node:crypto";

export type AuditAction =
  | "login"
  | "logout"
  | "session_created"
  | "failed_login"
  | "local_account_created"
  | "email_verified"
  | "password_reset_requested"
  | "password_changed"
  | "organization_created"
  | "member_invited"
  | "role_changed"
  | "compliance.assessment.evaluated"
  | "compliance.recommendations.generated"
  | "action_preflight"
  | "action_approval_requested"
  | "action_approved"
  | "action_rejected"
  | "action_queued"
  | "action_failed"
  | "action_verified"
  | "action_closed";

export interface AuditLogInput {
  actorUserId?: string | null;
  organizationId?: string | null;
  targetType: string;
  targetId?: string | null;
  action: AuditAction | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
}

export interface AuditLogRecord {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  action: AuditAction | string;
  ipAddress: string | null;
  userAgent: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: Date;
}

export interface AuditSink {
  append(record: AuditLogRecord): Promise<void>;
}

export interface AuditWriterOptions {
  sink: AuditSink;
  now?: () => Date;
  idFactory?: () => string;
}

const sensitiveKeyFragments = [
  "password",
  "token",
  "oauthcode",
  "codeverifier",
  "access",
  "refresh",
  "cookie",
  "authorization",
  "secret"
] as const;

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

export const isSensitiveAuditKey = (key: string): boolean => {
  const normalized = normalizeKey(key);
  return sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
};

export const redactSensitiveAuditValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveAuditValue(entry));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  let removed = 0;

  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveAuditKey(key)) {
      removed += 1;
      continue;
    }

    redacted[key] = redactSensitiveAuditValue(entry);
  }

  if (removed > 0) {
    redacted.redactedFieldCount = removed;
  }

  return redacted;
};

export const assertNoSensitiveResponseFields = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      assertNoSensitiveResponseFields(entry);
    }
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveAuditKey(key)) {
      throw new Error(`Sensitive field cannot be serialized in API response: ${key}`);
    }

    assertNoSensitiveResponseFields(entry);
  }
};

export class AuditWriter {
  private readonly sink: AuditSink;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: AuditWriterOptions) {
    this.sink = options.sink;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async write(input: AuditLogInput): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      id: this.idFactory(),
      organizationId: input.organizationId ?? null,
      actorUserId: input.actorUserId ?? null,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      action: input.action,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      beforeJson: redactSensitiveAuditValue(input.beforeJson ?? null),
      afterJson: redactSensitiveAuditValue(input.afterJson ?? null),
      createdAt: this.now()
    };

    await this.sink.append(record);
    return record;
  }
}

export class InMemoryAuditSink implements AuditSink {
  readonly records: AuditLogRecord[] = [];

  async append(record: AuditLogRecord): Promise<void> {
    this.records.push(record);
  }

  findByAction(action: AuditAction | string): AuditLogRecord[] {
    return this.records.filter((record) => record.action === action);
  }
}
