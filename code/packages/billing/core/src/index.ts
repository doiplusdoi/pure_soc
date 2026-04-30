import { randomUUID } from "node:crypto";

export type BillingProviderKey = "none" | "stripe" | "offline_license";

export type BillingSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | "offline_active"
  | "none";

export const billingEntitlementKeys = [
  "nis2_eu_portal",
  "nis2_country_packs",
  "nis2_ro_full_pack",
  "m365_baseline_scan",
  "m365_remediation",
  "intune_connector",
  "defender_xdr_connector",
  "evidence_vault",
  "manual_checklists",
  "pdf_reports",
  "api_access",
  "soc_preview",
  "regulatory_source_monitor"
] as const;

export type BillingEntitlementKey = (typeof billingEntitlementKeys)[number];

export interface BillingPlanConfig {
  key: string;
  displayName: string;
  description?: string;
  entitlementKeys: BillingEntitlementKey[];
}

export interface BillingStripeConfig {
  secretKey?: string | null;
  webhookSecret?: string | null;
  apiBaseUrl: string;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
  portalReturnUrl: string;
  priceIdsByPlan: Record<string, string[]>;
}

export interface BillingRuntimeConfig {
  provider: BillingProviderKey;
  defaultPlanKey: string;
  noneProviderPlanKey: string;
  plans: BillingPlanConfig[];
  stripe: BillingStripeConfig;
}

export interface BillingCustomerRecord {
  id: string;
  organizationId: string;
  providerKey: BillingProviderKey;
  externalCustomerId: string | null;
  billingEmail: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSubscriptionRecord {
  id: string;
  organizationId: string;
  billingCustomerId: string;
  providerKey: BillingProviderKey;
  externalSubscriptionId: string | null;
  externalPriceId: string | null;
  externalProductId: string | null;
  subscriptionStatus: BillingSubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingEntitlementRecord {
  id: string;
  organizationId: string;
  entitlementKey: BillingEntitlementKey;
  enabled: boolean;
  source: string;
  expiresAt: string | null;
  updatedAt: string;
}

export interface BillingEventRecord {
  id: string;
  organizationId: string | null;
  providerKey: BillingProviderKey;
  externalEventId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  processedAt: string | null;
  createdAt: string;
}

export interface BillingRepository {
  findBillingCustomerByOrganization(organizationId: string): Promise<BillingCustomerRecord | null>;
  findBillingCustomerByExternalId(
    providerKey: BillingProviderKey,
    externalCustomerId: string
  ): Promise<BillingCustomerRecord | null>;
  upsertBillingCustomer(record: BillingCustomerRecord): Promise<BillingCustomerRecord>;
  findBillingSubscriptionByExternalId(
    providerKey: BillingProviderKey,
    externalSubscriptionId: string
  ): Promise<BillingSubscriptionRecord | null>;
  listBillingSubscriptions(organizationId: string): Promise<BillingSubscriptionRecord[]>;
  upsertBillingSubscription(record: BillingSubscriptionRecord): Promise<BillingSubscriptionRecord>;
  listBillingEntitlements(organizationId: string): Promise<BillingEntitlementRecord[]>;
  replaceBillingEntitlements(
    organizationId: string,
    entitlements: BillingEntitlementRecord[]
  ): Promise<BillingEntitlementRecord[]>;
  recordBillingEventIfNew(record: BillingEventRecord): Promise<{ record: BillingEventRecord; duplicate: boolean }>;
  markBillingEventProcessed(input: {
    providerKey: BillingProviderKey;
    externalEventId: string;
    organizationId?: string | null;
    processedAt: string;
  }): Promise<BillingEventRecord | null>;
}

export interface BillingProviderCustomerInput {
  organizationId: string;
  email?: string | null;
  name?: string | null;
  metadata?: Record<string, string>;
}

export interface BillingProviderCustomer {
  providerKey: BillingProviderKey;
  externalCustomerId: string;
  billingEmail: string | null;
  metadata: Record<string, unknown>;
}

export interface BillingCheckoutSessionInput {
  organizationId: string;
  planKey: string;
  priceId: string;
  externalCustomerId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingCheckoutSession {
  providerKey: BillingProviderKey;
  id: string;
  url: string | null;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
}

export interface BillingPortalSessionInput {
  organizationId: string;
  externalCustomerId: string;
  returnUrl: string;
}

export interface BillingPortalSession {
  providerKey: BillingProviderKey;
  id: string;
  url: string | null;
}

export interface BillingWebhookInput {
  rawBody: Buffer | string;
  signatureHeader?: string | string[] | null;
}

export interface BillingWebhookEvent {
  id: string;
  type: string;
  created: number | null;
  livemode: boolean | null;
  data: {
    object: Record<string, unknown>;
  };
}

export interface BillingProvider {
  providerKey: BillingProviderKey;
  entitlementsReplaceRbac: false;
  createCustomer(input: BillingProviderCustomerInput): Promise<BillingProviderCustomer>;
  createCheckoutSession(input: BillingCheckoutSessionInput): Promise<BillingCheckoutSession>;
  createPortalSession(input: BillingPortalSessionInput): Promise<BillingPortalSession>;
  verifyWebhookSignature(input: BillingWebhookInput): Promise<BillingWebhookEvent>;
}

export class BillingError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = "BillingError";
  }
}

export class InMemoryBillingRepository implements BillingRepository {
  readonly billingCustomers = new Map<string, BillingCustomerRecord>();
  readonly billingSubscriptions = new Map<string, BillingSubscriptionRecord>();
  readonly billingEntitlements = new Map<string, BillingEntitlementRecord>();
  readonly billingEvents = new Map<string, BillingEventRecord>();

  async findBillingCustomerByOrganization(organizationId: string): Promise<BillingCustomerRecord | null> {
    return [...this.billingCustomers.values()].find((customer) => customer.organizationId === organizationId) ?? null;
  }

  async findBillingCustomerByExternalId(
    providerKey: BillingProviderKey,
    externalCustomerId: string
  ): Promise<BillingCustomerRecord | null> {
    return (
      [...this.billingCustomers.values()].find(
        (customer) => customer.providerKey === providerKey && customer.externalCustomerId === externalCustomerId
      ) ?? null
    );
  }

  async upsertBillingCustomer(record: BillingCustomerRecord): Promise<BillingCustomerRecord> {
    const existing = await this.findBillingCustomerByOrganization(record.organizationId);
    const stored = existing
      ? {
          ...record,
          id: existing.id,
          createdAt: existing.createdAt
        }
      : record;

    this.billingCustomers.set(stored.id, clone(stored));
    return clone(stored);
  }

  async findBillingSubscriptionByExternalId(
    providerKey: BillingProviderKey,
    externalSubscriptionId: string
  ): Promise<BillingSubscriptionRecord | null> {
    return (
      [...this.billingSubscriptions.values()].find(
        (subscription) =>
          subscription.providerKey === providerKey &&
          subscription.externalSubscriptionId === externalSubscriptionId
      ) ?? null
    );
  }

  async listBillingSubscriptions(organizationId: string): Promise<BillingSubscriptionRecord[]> {
    return [...this.billingSubscriptions.values()]
      .filter((subscription) => subscription.organizationId === organizationId)
      .map(clone);
  }

  async upsertBillingSubscription(record: BillingSubscriptionRecord): Promise<BillingSubscriptionRecord> {
    const existing = record.externalSubscriptionId
      ? await this.findBillingSubscriptionByExternalId(record.providerKey, record.externalSubscriptionId)
      : null;
    const stored = existing
      ? {
          ...record,
          id: existing.id,
          createdAt: existing.createdAt
        }
      : record;

    this.billingSubscriptions.set(stored.id, clone(stored));
    return clone(stored);
  }

  async listBillingEntitlements(organizationId: string): Promise<BillingEntitlementRecord[]> {
    return [...this.billingEntitlements.values()]
      .filter((entitlement) => entitlement.organizationId === organizationId)
      .sort((left, right) => left.entitlementKey.localeCompare(right.entitlementKey))
      .map(clone);
  }

  async replaceBillingEntitlements(
    organizationId: string,
    entitlements: BillingEntitlementRecord[]
  ): Promise<BillingEntitlementRecord[]> {
    for (const [key, entitlement] of this.billingEntitlements.entries()) {
      if (entitlement.organizationId === organizationId) {
        this.billingEntitlements.delete(key);
      }
    }

    for (const entitlement of entitlements) {
      this.billingEntitlements.set(entitlement.id, clone(entitlement));
    }

    return this.listBillingEntitlements(organizationId);
  }

  async recordBillingEventIfNew(
    record: BillingEventRecord
  ): Promise<{ record: BillingEventRecord; duplicate: boolean }> {
    const key = billingEventKey(record.providerKey, record.externalEventId);
    const existing = this.billingEvents.get(key);

    if (existing) {
      return {
        record: clone(existing),
        duplicate: true
      };
    }

    this.billingEvents.set(key, clone(record));
    return {
      record: clone(record),
      duplicate: false
    };
  }

  async markBillingEventProcessed(input: {
    providerKey: BillingProviderKey;
    externalEventId: string;
    organizationId?: string | null;
    processedAt: string;
  }): Promise<BillingEventRecord | null> {
    const key = billingEventKey(input.providerKey, input.externalEventId);
    const existing = this.billingEvents.get(key);

    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      organizationId: input.organizationId ?? existing.organizationId,
      processedAt: input.processedAt
    };
    this.billingEvents.set(key, updated);
    return clone(updated);
  }
}

export const createEntitlementRecordsForPlan = (input: {
  organizationId: string;
  config: Pick<BillingRuntimeConfig, "plans">;
  planKey: string;
  source: string;
  now: Date;
  expiresAt?: string | null;
  idFactory?: () => string;
}): BillingEntitlementRecord[] => {
  const plan = findBillingPlan(input.config, input.planKey);
  const enabledKeys = new Set(plan?.entitlementKeys ?? []);
  const updatedAt = input.now.toISOString();
  const idFactory = input.idFactory ?? randomUUID;

  return billingEntitlementKeys.map((entitlementKey) => ({
    id: idFactory(),
    organizationId: input.organizationId,
    entitlementKey,
    enabled: enabledKeys.has(entitlementKey),
    source: input.source,
    expiresAt: input.expiresAt ?? null,
    updatedAt
  }));
};

export const findBillingPlan = (
  config: Pick<BillingRuntimeConfig, "plans">,
  planKey: string
): BillingPlanConfig | null => config.plans.find((plan) => plan.key === planKey) ?? null;

export const requireBillingPlan = (
  config: Pick<BillingRuntimeConfig, "plans">,
  planKey: string
): BillingPlanConfig => {
  const plan = findBillingPlan(config, planKey);
  if (!plan) {
    throw new BillingError("billing_plan_not_configured", "Requested billing plan is not configured.", 400);
  }

  return plan;
};

export const stripePriceIdsForPlan = (config: BillingRuntimeConfig, planKey: string): string[] =>
  config.stripe.priceIdsByPlan[planKey]?.filter(Boolean) ?? [];

export const planKeyForStripePriceId = (
  config: BillingRuntimeConfig,
  priceId: string | null | undefined
): string | null => {
  if (!priceId) {
    return null;
  }

  for (const [planKey, priceIds] of Object.entries(config.stripe.priceIdsByPlan)) {
    if (priceIds.includes(priceId)) {
      return planKey;
    }
  }

  return null;
};

export const activeEntitlementSubscriptionStatuses: readonly BillingSubscriptionStatus[] = [
  "active",
  "trialing",
  "offline_active",
  "none"
];

export const subscriptionStatusAllowsEntitlements = (status: BillingSubscriptionStatus): boolean =>
  activeEntitlementSubscriptionStatuses.includes(status);

export const mapStripeSubscriptionStatus = (status: string | null | undefined): BillingSubscriptionStatus => {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return status;
    default:
      return "incomplete";
  }
};

export const createNoneBillingProvider = (): BillingProvider => ({
  providerKey: "none",
  entitlementsReplaceRbac: false,
  async createCustomer(input) {
    return {
      providerKey: "none",
      externalCustomerId: `none:${input.organizationId}`,
      billingEmail: input.email ?? null,
      metadata: input.metadata ?? {}
    };
  },
  async createCheckoutSession(input) {
    return {
      providerKey: "none",
      id: `none-checkout:${input.organizationId}`,
      url: null,
      expiresAt: null,
      metadata: {
        planKey: input.planKey,
        billingBypassed: true
      }
    };
  },
  async createPortalSession(input) {
    return {
      providerKey: "none",
      id: `none-portal:${input.organizationId}`,
      url: null
    };
  },
  async verifyWebhookSignature() {
    throw new BillingError("billing_webhook_unsupported", "Billing webhooks are not supported for this provider.", 404);
  }
});

export const createOfflineLicenseBillingProvider = (): BillingProvider => ({
  providerKey: "offline_license",
  entitlementsReplaceRbac: false,
  async createCustomer() {
    throw offlineLicenseUnsupportedError();
  },
  async createCheckoutSession() {
    throw offlineLicenseUnsupportedError();
  },
  async createPortalSession() {
    throw offlineLicenseUnsupportedError();
  },
  async verifyWebhookSignature() {
    throw offlineLicenseUnsupportedError();
  }
});

export const safeBillingEventPayload = (event: BillingWebhookEvent): Record<string, unknown> => {
  const object = event.data.object;
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    object: {
      id: stringValue(object.id),
      object: stringValue(object.object),
      customer: stringValue(object.customer),
      subscription: stringValue(object.subscription),
      status: stringValue(object.status),
      clientReferenceId: stringValue(object.client_reference_id),
      priceId: firstStripePriceId(object),
      productId: firstStripeProductId(object),
      metadata: safeMetadata(object.metadata)
    }
  };
};

export const firstStripePriceId = (object: Record<string, unknown>): string | null => {
  const items = object.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) {
    return stringValue(object.price);
  }

  const data = (items as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return null;
  }

  for (const item of data) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const price = (item as { price?: unknown }).price;
    if (price && typeof price === "object" && !Array.isArray(price)) {
      const id = stringValue((price as { id?: unknown }).id);
      if (id) {
        return id;
      }
    }
  }

  return null;
};

export const firstStripeProductId = (object: Record<string, unknown>): string | null => {
  const items = object.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) {
    return stringValue(object.product);
  }

  const data = (items as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return null;
  }

  for (const item of data) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const price = (item as { price?: unknown }).price;
    if (price && typeof price === "object" && !Array.isArray(price)) {
      const productId = stringValue((price as { product?: unknown }).product);
      if (productId) {
        return productId;
      }
    }
  }

  return null;
};

export const stringValue = (value: unknown): string | null => (typeof value === "string" ? value : null);

export const numberValue = (value: unknown): number | null => (typeof value === "number" ? value : null);

export const safeMetadata = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
};

const offlineLicenseUnsupportedError = () =>
  new BillingError(
    "offline_license_unsupported",
    "Offline license billing is not implemented in this milestone.",
    501
  );

const billingEventKey = (providerKey: BillingProviderKey, externalEventId: string): string =>
  `${providerKey}:${externalEventId}`;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
