import type {
  BillingCustomerRecord,
  BillingEventRecord,
  BillingProviderKey,
  BillingRepository,
  BillingSubscriptionRecord,
  BillingEntitlementRecord
} from "@puresoc/billing-core";

type DelegateArgs = Record<string, unknown>;

interface Delegate<TRow> {
  create(args: DelegateArgs): Promise<TRow>;
  findMany(args?: DelegateArgs): Promise<TRow[]>;
  findFirst(args: DelegateArgs): Promise<TRow | null>;
  update(args: DelegateArgs): Promise<TRow>;
  deleteMany?(args: DelegateArgs): Promise<unknown>;
  findUnique?(args: DelegateArgs): Promise<TRow | null>;
  upsert?(args: DelegateArgs): Promise<TRow>;
}

type BillingCustomerRow = Omit<BillingCustomerRecord, "createdAt" | "updatedAt"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

type BillingSubscriptionRow = Omit<BillingSubscriptionRecord, "currentPeriodStart" | "currentPeriodEnd" | "trialEnd" | "createdAt" | "updatedAt"> & {
  currentPeriodStart?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  trialEnd?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type BillingEntitlementRow = Omit<BillingEntitlementRecord, "expiresAt" | "updatedAt"> & {
  expiresAt?: Date | string | null;
  updatedAt: Date | string;
};

type BillingEventRow = Omit<BillingEventRecord, "processedAt" | "createdAt"> & {
  processedAt?: Date | string | null;
  createdAt: Date | string;
};

export interface PrismaBillingClient {
  billingCustomer: Delegate<BillingCustomerRow>;
  billingSubscription: Delegate<BillingSubscriptionRow>;
  billingEntitlement: Delegate<BillingEntitlementRow>;
  billingEvent: Delegate<BillingEventRow>;
}

export class PrismaBillingRepository implements BillingRepository {
  constructor(private readonly client: PrismaBillingClient) {}

  async findBillingCustomerByOrganization(organizationId: string): Promise<BillingCustomerRecord | null> {
    const row = this.client.billingCustomer.findUnique
      ? await this.client.billingCustomer.findUnique({
          where: {
            organizationId
          }
        })
      : await this.client.billingCustomer.findFirst({
          where: {
            organizationId
          }
        });

    return row ? fromCustomerRow(row) : null;
  }

  async findBillingCustomerByExternalId(
    providerKey: BillingProviderKey,
    externalCustomerId: string
  ): Promise<BillingCustomerRecord | null> {
    const row = await this.client.billingCustomer.findFirst({
      where: {
        providerKey,
        externalCustomerId
      }
    });

    return row ? fromCustomerRow(row) : null;
  }

  async upsertBillingCustomer(record: BillingCustomerRecord): Promise<BillingCustomerRecord> {
    const data = toCustomerData(record);
    const row = this.client.billingCustomer.upsert
      ? await this.client.billingCustomer.upsert({
          where: {
            organizationId: record.organizationId
          },
          update: data,
          create: data
        })
      : await this.client.billingCustomer.create({
          data
        });

    return fromCustomerRow(row);
  }

  async findBillingSubscriptionByExternalId(
    providerKey: BillingProviderKey,
    externalSubscriptionId: string
  ): Promise<BillingSubscriptionRecord | null> {
    const row = await this.client.billingSubscription.findFirst({
      where: {
        providerKey,
        externalSubscriptionId
      }
    });

    return row ? fromSubscriptionRow(row) : null;
  }

  async listBillingSubscriptions(organizationId: string): Promise<BillingSubscriptionRecord[]> {
    const rows = await this.client.billingSubscription.findMany({
      where: {
        organizationId
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return rows.map(fromSubscriptionRow);
  }

  async upsertBillingSubscription(record: BillingSubscriptionRecord): Promise<BillingSubscriptionRecord> {
    const existing = record.externalSubscriptionId
      ? await this.findBillingSubscriptionByExternalId(record.providerKey, record.externalSubscriptionId)
      : null;
    const data = toSubscriptionData(record);
    const row = existing
      ? await this.client.billingSubscription.update({
          where: {
            id: existing.id
          },
          data
        })
      : await this.client.billingSubscription.create({
          data
        });

    return fromSubscriptionRow(row);
  }

  async listBillingEntitlements(organizationId: string): Promise<BillingEntitlementRecord[]> {
    const rows = await this.client.billingEntitlement.findMany({
      where: {
        organizationId
      },
      orderBy: {
        entitlementKey: "asc"
      }
    });

    return rows.map(fromEntitlementRow);
  }

  async replaceBillingEntitlements(
    organizationId: string,
    entitlements: BillingEntitlementRecord[]
  ): Promise<BillingEntitlementRecord[]> {
    await this.client.billingEntitlement.deleteMany?.({
      where: {
        organizationId
      }
    });

    const rows = await Promise.all(
      entitlements.map((entitlement) =>
        this.client.billingEntitlement.create({
          data: toEntitlementData(entitlement)
        })
      )
    );

    return rows.map(fromEntitlementRow);
  }

  async recordBillingEventIfNew(
    record: BillingEventRecord
  ): Promise<{ record: BillingEventRecord; duplicate: boolean }> {
    const existing = this.client.billingEvent.findUnique
      ? await this.client.billingEvent.findUnique({
          where: {
            providerKey_externalEventId: {
              providerKey: record.providerKey,
              externalEventId: record.externalEventId
            }
          }
        })
      : await this.client.billingEvent.findFirst({
          where: {
            providerKey: record.providerKey,
            externalEventId: record.externalEventId
          }
        });

    if (existing) {
      return {
        record: fromEventRow(existing),
        duplicate: true
      };
    }

    const row = await this.client.billingEvent.create({
      data: toEventData(record)
    });

    return {
      record: fromEventRow(row),
      duplicate: false
    };
  }

  async markBillingEventProcessed(input: {
    providerKey: BillingProviderKey;
    externalEventId: string;
    organizationId?: string | null;
    processedAt: string;
  }): Promise<BillingEventRecord | null> {
    const existing = await this.recordLookup(input.providerKey, input.externalEventId);
    if (!existing) {
      return null;
    }

    const row = await this.client.billingEvent.update({
      where: {
        id: existing.id
      },
      data: {
        organizationId: input.organizationId ?? existing.organizationId,
        processedAt: new Date(input.processedAt)
      }
    });

    return fromEventRow(row);
  }

  private async recordLookup(
    providerKey: BillingProviderKey,
    externalEventId: string
  ): Promise<BillingEventRecord | null> {
    const row = this.client.billingEvent.findUnique
      ? await this.client.billingEvent.findUnique({
          where: {
            providerKey_externalEventId: {
              providerKey,
              externalEventId
            }
          }
        })
      : await this.client.billingEvent.findFirst({
          where: {
            providerKey,
            externalEventId
          }
        });

    return row ? fromEventRow(row) : null;
  }
}

const toCustomerData = (record: BillingCustomerRecord): Record<string, unknown> => ({
  id: record.id,
  organizationId: record.organizationId,
  providerKey: record.providerKey,
  externalCustomerId: record.externalCustomerId,
  billingEmail: record.billingEmail,
  metadataJson: record.metadataJson,
  createdAt: new Date(record.createdAt),
  updatedAt: new Date(record.updatedAt)
});

const toSubscriptionData = (record: BillingSubscriptionRecord): Record<string, unknown> => ({
  id: record.id,
  organizationId: record.organizationId,
  billingCustomerId: record.billingCustomerId,
  providerKey: record.providerKey,
  externalSubscriptionId: record.externalSubscriptionId,
  externalPriceId: record.externalPriceId,
  externalProductId: record.externalProductId,
  subscriptionStatus: record.subscriptionStatus,
  currentPeriodStart: nullableDate(record.currentPeriodStart),
  currentPeriodEnd: nullableDate(record.currentPeriodEnd),
  cancelAtPeriodEnd: record.cancelAtPeriodEnd,
  trialEnd: nullableDate(record.trialEnd),
  createdAt: new Date(record.createdAt),
  updatedAt: new Date(record.updatedAt)
});

const toEntitlementData = (record: BillingEntitlementRecord): Record<string, unknown> => ({
  id: record.id,
  organizationId: record.organizationId,
  entitlementKey: record.entitlementKey,
  enabled: record.enabled,
  source: record.source,
  expiresAt: nullableDate(record.expiresAt),
  updatedAt: new Date(record.updatedAt)
});

const toEventData = (record: BillingEventRecord): Record<string, unknown> => ({
  id: record.id,
  organizationId: record.organizationId,
  providerKey: record.providerKey,
  externalEventId: record.externalEventId,
  eventType: record.eventType,
  payloadJson: record.payloadJson,
  processedAt: nullableDate(record.processedAt),
  createdAt: new Date(record.createdAt)
});

const fromCustomerRow = (row: BillingCustomerRow): BillingCustomerRecord => ({
  ...row,
  metadataJson: row.metadataJson ?? {},
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt)
});

const fromSubscriptionRow = (row: BillingSubscriptionRow): BillingSubscriptionRecord => ({
  ...row,
  currentPeriodStart: nullableIso(row.currentPeriodStart),
  currentPeriodEnd: nullableIso(row.currentPeriodEnd),
  trialEnd: nullableIso(row.trialEnd),
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt)
});

const fromEntitlementRow = (row: BillingEntitlementRow): BillingEntitlementRecord => ({
  ...row,
  expiresAt: nullableIso(row.expiresAt),
  updatedAt: toIso(row.updatedAt)
});

const fromEventRow = (row: BillingEventRow): BillingEventRecord => ({
  ...row,
  payloadJson: row.payloadJson ?? {},
  processedAt: nullableIso(row.processedAt),
  createdAt: toIso(row.createdAt)
});

const nullableDate = (value: string | null): Date | null => (value ? new Date(value) : null);

const nullableIso = (value: Date | string | null | undefined): string | null =>
  value === null || value === undefined ? null : toIso(value);

const toIso = (value: Date | string): string => (value instanceof Date ? value : new Date(value)).toISOString();
