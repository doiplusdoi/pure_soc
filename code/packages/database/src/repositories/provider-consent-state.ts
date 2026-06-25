import { randomUUID } from "node:crypto";

export interface ProviderConsentStateRecord {
  id: string;
  organizationId: string;
  providerKey: string;
  stateHash: string;
  actorUserId: string;
  redirectUri: string;
  requestedPermissionBundles: string[];
  createdAt: string;
  expiresAt: string;
  consumedAt?: string | null;
}

export interface SaveProviderConsentStateInput {
  id?: string;
  organizationId: string;
  providerKey: string;
  stateHash: string;
  actorUserId: string;
  redirectUri: string;
  requestedPermissionBundles: string[];
  expiresAt: string;
  createdAt?: string;
}

export interface ConsumeProviderConsentStateInput {
  organizationId?: string;
  providerKey: string;
  stateHash: string;
  actorUserId?: string;
  consumedAt: string;
}

export interface ProviderConsentStateStore {
  saveConsentState(input: SaveProviderConsentStateInput): Promise<ProviderConsentStateRecord>;
  consumeConsentState(input: ConsumeProviderConsentStateInput): Promise<ProviderConsentStateRecord | null>;
}

interface ProviderConsentStateDelegate {
  create(args: { data: Record<string, unknown> }): Promise<ProviderConsentStateRow>;
  findFirst(args: {
    orderBy?: Record<string, "asc" | "desc">;
    where: Record<string, unknown>;
  }): Promise<ProviderConsentStateRow | null>;
  updateMany(args: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
}

export interface PrismaProviderConsentStateClient {
  providerConsentState: ProviderConsentStateDelegate;
}

interface ProviderConsentStateRow {
  id: string;
  organizationId: string;
  providerKey: string;
  stateHash: string;
  actorUserId: string;
  redirectUri: string;
  requestedPermissionBundles?: string[] | null;
  createdAt: Date | string;
  expiresAt: Date | string;
  consumedAt?: Date | string | null;
}

export class InMemoryProviderConsentStateStore implements ProviderConsentStateStore {
  readonly states = new Map<string, ProviderConsentStateRecord>();
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: { now?: () => Date; idFactory?: () => string } = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async saveConsentState(input: SaveProviderConsentStateInput): Promise<ProviderConsentStateRecord> {
    const record: ProviderConsentStateRecord = {
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      providerKey: input.providerKey,
      stateHash: input.stateHash,
      actorUserId: input.actorUserId,
      redirectUri: input.redirectUri,
      requestedPermissionBundles: [...input.requestedPermissionBundles],
      createdAt: input.createdAt ?? this.now().toISOString(),
      expiresAt: input.expiresAt,
      consumedAt: null
    };

    this.states.set(stateKey(record.providerKey, record.stateHash), record);
    return { ...record, requestedPermissionBundles: [...record.requestedPermissionBundles] };
  }

  async consumeConsentState(input: ConsumeProviderConsentStateInput): Promise<ProviderConsentStateRecord | null> {
    const key = stateKey(input.providerKey, input.stateHash);
    const existing = this.states.get(key);
    const consumedAtMs = new Date(input.consumedAt).getTime();

    if (
      !existing ||
      existing.consumedAt ||
      new Date(existing.expiresAt).getTime() <= consumedAtMs ||
      (input.organizationId && existing.organizationId !== input.organizationId) ||
      (input.actorUserId && existing.actorUserId !== input.actorUserId)
    ) {
      return null;
    }

    const consumed: ProviderConsentStateRecord = {
      ...existing,
      consumedAt: input.consumedAt
    };
    this.states.set(key, consumed);
    return { ...consumed, requestedPermissionBundles: [...consumed.requestedPermissionBundles] };
  }
}

export class PrismaProviderConsentStateStore implements ProviderConsentStateStore {
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(
    private readonly client: PrismaProviderConsentStateClient,
    options: { now?: () => Date; idFactory?: () => string } = {}
  ) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async saveConsentState(input: SaveProviderConsentStateInput): Promise<ProviderConsentStateRecord> {
    const row = await this.client.providerConsentState.create({
      data: {
        id: input.id ?? this.idFactory(),
        organizationId: input.organizationId,
        providerKey: input.providerKey,
        stateHash: input.stateHash,
        actorUserId: input.actorUserId,
        redirectUri: input.redirectUri,
        requestedPermissionBundles: input.requestedPermissionBundles,
        createdAt: toDate(input.createdAt ?? this.now().toISOString()),
        expiresAt: toDate(input.expiresAt),
        consumedAt: null
      }
    });

    return fromRow(row);
  }

  async consumeConsentState(input: ConsumeProviderConsentStateInput): Promise<ProviderConsentStateRecord | null> {
    const consumedAt = toDate(input.consumedAt);
    const existing = await this.client.providerConsentState.findFirst({
      where: {
        ...(input.organizationId ? { organizationId: input.organizationId } : {}),
        providerKey: input.providerKey,
        stateHash: input.stateHash,
        ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
        consumedAt: null
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!existing || toDate(existing.expiresAt).getTime() <= consumedAt.getTime()) {
      return null;
    }

    const updated = await this.client.providerConsentState.updateMany({
      where: {
        id: existing.id,
        ...(input.organizationId ? { organizationId: input.organizationId } : {}),
        ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
        consumedAt: null
      },
      data: {
        consumedAt
      }
    });

    if (updated.count !== 1) {
      return null;
    }

    const consumed = await this.client.providerConsentState.findFirst({
      where: {
        id: existing.id
      }
    });

    return consumed ? fromRow(consumed) : null;
  }
}

const stateKey = (providerKey: string, stateHash: string): string => `${providerKey}:${stateHash}`;

const fromRow = (row: ProviderConsentStateRow): ProviderConsentStateRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  providerKey: row.providerKey,
  stateHash: row.stateHash,
  actorUserId: row.actorUserId,
  redirectUri: row.redirectUri,
  requestedPermissionBundles: [...(row.requestedPermissionBundles ?? [])],
  createdAt: toDate(row.createdAt).toISOString(),
  expiresAt: toDate(row.expiresAt).toISOString(),
  consumedAt: row.consumedAt ? toDate(row.consumedAt).toISOString() : null
});

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));
