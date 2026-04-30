import { randomUUID } from "node:crypto";

import type { AuditLogInput } from "@puresoc/audit";
import {
  BillingError,
  createEntitlementRecordsForPlan,
  createNoneBillingProvider,
  createOfflineLicenseBillingProvider,
  firstStripePriceId,
  firstStripeProductId,
  mapStripeSubscriptionStatus,
  numberValue,
  planKeyForStripePriceId,
  requireBillingPlan,
  safeBillingEventPayload,
  safeMetadata,
  stringValue,
  stripePriceIdsForPlan,
  subscriptionStatusAllowsEntitlements,
  type BillingCustomerRecord,
  type BillingEntitlementRecord,
  type BillingProvider,
  type BillingProviderKey,
  type BillingRepository,
  type BillingRuntimeConfig,
  type BillingSubscriptionRecord,
  type BillingSubscriptionStatus,
  type BillingWebhookEvent
} from "@puresoc/billing-core";
import { createStripeBillingProvider } from "@puresoc/billing-stripe";

export interface BillingAuditWriter {
  write(input: AuditLogInput): Promise<unknown>;
}

export interface BillingApiServiceOptions {
  repository: BillingRepository;
  auditWriter: BillingAuditWriter;
  config: BillingRuntimeConfig;
  providers?: Partial<Record<BillingProviderKey, BillingProvider>>;
  now?: () => Date;
  idFactory?: () => string;
}

export interface BillingCheckoutApiInput {
  organizationId: string;
  actorUserId: string;
  planKey?: string;
  billingEmail?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface BillingPortalApiInput {
  organizationId: string;
  actorUserId: string;
  returnUrl?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface StripeWebhookApiInput {
  rawBody: Buffer;
  signatureHeader?: string | string[] | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class BillingApiService {
  private readonly repository: BillingRepository;
  private readonly auditWriter: BillingAuditWriter;
  private readonly config: BillingRuntimeConfig;
  private readonly providers: Record<BillingProviderKey, BillingProvider>;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: BillingApiServiceOptions) {
    this.repository = options.repository;
    this.auditWriter = options.auditWriter;
    this.config = options.config;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
    this.providers = {
      none: options.providers?.none ?? createNoneBillingProvider(),
      offline_license: options.providers?.offline_license ?? createOfflineLicenseBillingProvider(),
      stripe:
        options.providers?.stripe ??
        createStripeBillingProvider({
          secretKey: options.config.stripe.secretKey,
          webhookSecret: options.config.stripe.webhookSecret,
          apiBaseUrl: options.config.stripe.apiBaseUrl,
          now: this.now
        })
    };
  }

  async listEntitlements(organizationId: string): Promise<{ entitlements: BillingEntitlementRecord[] }> {
    let entitlements = await this.repository.listBillingEntitlements(organizationId);

    if (entitlements.length === 0 && this.config.provider === "none") {
      entitlements = await this.applyPlanEntitlements({
        organizationId,
        planKey: this.config.noneProviderPlanKey,
        source: "billing_provider_none"
      });
    }

    return {
      entitlements
    };
  }

  async createCheckoutSession(input: BillingCheckoutApiInput): Promise<Record<string, unknown>> {
    if (this.config.provider === "none") {
      const entitlements = await this.applyPlanEntitlements({
        organizationId: input.organizationId,
        planKey: this.config.noneProviderPlanKey,
        source: "billing_provider_none"
      });

      await this.writeBillingAudit({
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        targetType: "billing",
        targetId: input.organizationId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        afterJson: {
          providerKey: "none",
          billingBypassed: true,
          planKey: this.config.noneProviderPlanKey,
          enabledEntitlementCount: enabledEntitlementCount(entitlements)
        }
      });

      return {
        providerKey: "none",
        billingBypassed: true,
        entitlements
      };
    }

    if (this.config.provider === "offline_license") {
      throw new BillingError(
        "offline_license_unsupported",
        "Offline license billing is not implemented in this milestone.",
        501
      );
    }

    const provider = this.providers.stripe;
    const planKey = input.planKey ?? this.config.defaultPlanKey;
    const plan = requireBillingPlan(this.config, planKey);
    const priceId = stripePriceIdsForPlan(this.config, plan.key)[0];
    if (!priceId) {
      throw new BillingError("billing_price_not_configured", "Billing price mapping is not configured.", 503);
    }

    const customer = await this.ensureStripeCustomer(input.organizationId, input.billingEmail ?? null);
    if (!customer.externalCustomerId) {
      throw new BillingError("billing_customer_not_ready", "Billing customer is not ready for checkout.", 409);
    }

    const checkoutSession = await provider.createCheckoutSession({
      organizationId: input.organizationId,
      planKey: plan.key,
      priceId,
      externalCustomerId: customer.externalCustomerId,
      successUrl: input.successUrl ?? this.config.stripe.checkoutSuccessUrl,
      cancelUrl: input.cancelUrl ?? this.config.stripe.checkoutCancelUrl
    });

    await this.writeBillingAudit({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "billing_checkout_session",
      targetId: checkoutSession.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: "stripe",
        planKey: plan.key,
        priceId,
        sessionId: checkoutSession.id
      }
    });

    return {
      providerKey: "stripe",
      checkoutSession
    };
  }

  async createPortalSession(input: BillingPortalApiInput): Promise<Record<string, unknown>> {
    if (this.config.provider === "none") {
      return {
        providerKey: "none",
        billingBypassed: true
      };
    }

    if (this.config.provider === "offline_license") {
      throw new BillingError(
        "offline_license_unsupported",
        "Offline license billing is not implemented in this milestone.",
        501
      );
    }

    const customer = await this.repository.findBillingCustomerByOrganization(input.organizationId);
    if (!customer?.externalCustomerId || customer.providerKey !== "stripe") {
      throw new BillingError("billing_customer_missing", "No Stripe billing customer exists for this organization.", 409);
    }

    const portalSession = await this.providers.stripe.createPortalSession({
      organizationId: input.organizationId,
      externalCustomerId: customer.externalCustomerId,
      returnUrl: input.returnUrl ?? this.config.stripe.portalReturnUrl
    });

    await this.writeBillingAudit({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "billing_portal_session",
      targetId: portalSession.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: "stripe",
        sessionId: portalSession.id
      }
    });

    return {
      providerKey: "stripe",
      portalSession
    };
  }

  async handleStripeWebhook(input: StripeWebhookApiInput): Promise<Record<string, unknown>> {
    const event = await this.providers.stripe.verifyWebhookSignature({
      rawBody: input.rawBody,
      signatureHeader: input.signatureHeader
    });
    const organizationId = await this.resolveStripeEventOrganizationId(event);
    const createdAt = this.now().toISOString();
    const ledgerResult = await this.repository.recordBillingEventIfNew({
      id: this.idFactory(),
      organizationId,
      providerKey: "stripe",
      externalEventId: event.id,
      eventType: event.type,
      payloadJson: safeBillingEventPayload(event),
      processedAt: null,
      createdAt
    });

    if (ledgerResult.duplicate) {
      return {
        received: true,
        duplicate: true,
        eventType: event.type
      };
    }

    const outcome = await this.processStripeWebhookEvent(event, organizationId);
    await this.repository.markBillingEventProcessed({
      providerKey: "stripe",
      externalEventId: event.id,
      organizationId: outcome.organizationId ?? organizationId,
      processedAt: this.now().toISOString()
    });

    if (outcome.auditable) {
      await this.writeBillingAudit({
        actorUserId: null,
        organizationId: outcome.organizationId,
        targetType: outcome.targetType ?? "billing",
        targetId: outcome.targetId ?? null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        afterJson: {
          providerKey: "stripe",
          eventId: event.id,
          eventType: event.type,
          subscriptionStatus: outcome.subscriptionStatus,
          enabledEntitlementCount: outcome.enabledEntitlementCount
        }
      });
    }

    return {
      received: true,
      duplicate: false,
      eventType: event.type
    };
  }

  private async ensureStripeCustomer(
    organizationId: string,
    billingEmail: string | null
  ): Promise<BillingCustomerRecord> {
    const existing = await this.repository.findBillingCustomerByOrganization(organizationId);
    if (existing?.externalCustomerId && existing.providerKey === "stripe") {
      return existing;
    }

    const providerCustomer = await this.providers.stripe.createCustomer({
      organizationId,
      email: billingEmail,
      metadata: {
        organization_id: organizationId
      }
    });
    const now = this.now().toISOString();

    return this.repository.upsertBillingCustomer({
      id: existing?.id ?? this.idFactory(),
      organizationId,
      providerKey: "stripe",
      externalCustomerId: providerCustomer.externalCustomerId,
      billingEmail: providerCustomer.billingEmail,
      metadataJson: providerCustomer.metadata,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });
  }

  private async processStripeWebhookEvent(
    event: BillingWebhookEvent,
    resolvedOrganizationId: string | null
  ): Promise<StripeWebhookProcessingOutcome> {
    if (event.type === "customer.created" || event.type === "customer.updated") {
      const customer = await this.upsertStripeCustomerFromObject(event.data.object, resolvedOrganizationId);
      return customer
        ? {
            auditable: true,
            organizationId: customer.organizationId,
            targetType: "billing_customer",
            targetId: customer.id
          }
        : { auditable: false, organizationId: resolvedOrganizationId };
    }

    if (event.type === "checkout.session.completed") {
      const customer = await this.upsertStripeCustomerFromCheckoutSession(event.data.object, resolvedOrganizationId);
      return customer
        ? {
            auditable: true,
            organizationId: customer.organizationId,
            targetType: "billing_customer",
            targetId: customer.id
          }
        : { auditable: false, organizationId: resolvedOrganizationId };
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = await this.upsertStripeSubscriptionFromObject(
        event.data.object,
        event.type === "customer.subscription.deleted" ? "canceled" : undefined,
        resolvedOrganizationId
      );

      return subscription
        ? {
            auditable: true,
            organizationId: subscription.organizationId,
            targetType: "billing_subscription",
            targetId: subscription.id,
            subscriptionStatus: subscription.subscriptionStatus,
            enabledEntitlementCount: enabledEntitlementCount(
              await this.repository.listBillingEntitlements(subscription.organizationId)
            )
          }
        : { auditable: false, organizationId: resolvedOrganizationId };
    }

    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
      const subscription = await this.updateSubscriptionFromInvoiceEvent(
        event.data.object,
        event.type === "invoice.payment_succeeded" ? "active" : "past_due"
      );

      return subscription
        ? {
            auditable: true,
            organizationId: subscription.organizationId,
            targetType: "billing_subscription",
            targetId: subscription.id,
            subscriptionStatus: subscription.subscriptionStatus,
            enabledEntitlementCount: enabledEntitlementCount(
              await this.repository.listBillingEntitlements(subscription.organizationId)
            )
          }
        : { auditable: false, organizationId: resolvedOrganizationId };
    }

    return {
      auditable: false,
      organizationId: resolvedOrganizationId
    };
  }

  private async upsertStripeCustomerFromCheckoutSession(
    object: Record<string, unknown>,
    resolvedOrganizationId: string | null
  ): Promise<BillingCustomerRecord | null> {
    const organizationId = resolvedOrganizationId ?? organizationIdFromStripeObject(object);
    const externalCustomerId = stringValue(object.customer);
    if (!organizationId || !externalCustomerId) {
      return null;
    }

    return this.upsertStripeCustomer({
      organizationId,
      externalCustomerId,
      billingEmail: stringValue(object.customer_email),
      metadataJson: {
        source: "checkout.session.completed",
        checkoutSessionId: stringValue(object.id)
      }
    });
  }

  private async upsertStripeCustomerFromObject(
    object: Record<string, unknown>,
    resolvedOrganizationId: string | null
  ): Promise<BillingCustomerRecord | null> {
    const organizationId = resolvedOrganizationId ?? organizationIdFromStripeObject(object);
    const externalCustomerId = stringValue(object.id);
    if (!organizationId || !externalCustomerId) {
      return null;
    }

    return this.upsertStripeCustomer({
      organizationId,
      externalCustomerId,
      billingEmail: stringValue(object.email),
      metadataJson: {
        source: stringValue(object.object) ?? "customer"
      }
    });
  }

  private async upsertStripeCustomer(input: {
    organizationId: string;
    externalCustomerId: string;
    billingEmail: string | null;
    metadataJson: Record<string, unknown>;
  }): Promise<BillingCustomerRecord> {
    const existing = await this.repository.findBillingCustomerByOrganization(input.organizationId);
    const now = this.now().toISOString();

    return this.repository.upsertBillingCustomer({
      id: existing?.id ?? this.idFactory(),
      organizationId: input.organizationId,
      providerKey: "stripe",
      externalCustomerId: input.externalCustomerId,
      billingEmail: input.billingEmail ?? existing?.billingEmail ?? null,
      metadataJson: {
        ...(existing?.metadataJson ?? {}),
        ...input.metadataJson
      },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });
  }

  private async upsertStripeSubscriptionFromObject(
    object: Record<string, unknown>,
    forcedStatus?: BillingSubscriptionStatus,
    resolvedOrganizationId?: string | null
  ): Promise<BillingSubscriptionRecord | null> {
    const externalSubscriptionId = stringValue(object.id);
    const externalCustomerId = stringValue(object.customer);
    if (!externalSubscriptionId || !externalCustomerId) {
      return null;
    }

    let customer = await this.repository.findBillingCustomerByExternalId("stripe", externalCustomerId);
    const organizationId = resolvedOrganizationId ?? customer?.organizationId ?? organizationIdFromStripeObject(object);
    if (!organizationId) {
      return null;
    }

    if (!customer) {
      customer = await this.upsertStripeCustomer({
        organizationId,
        externalCustomerId,
        billingEmail: null,
        metadataJson: {
          source: "subscription"
        }
      });
    }

    const now = this.now().toISOString();
    const existing = await this.repository.findBillingSubscriptionByExternalId("stripe", externalSubscriptionId);
    const priceId = firstStripePriceId(object);
    const status = forcedStatus ?? mapStripeSubscriptionStatus(stringValue(object.status));
    const subscription = await this.repository.upsertBillingSubscription({
      id: existing?.id ?? this.idFactory(),
      organizationId,
      billingCustomerId: customer.id,
      providerKey: "stripe",
      externalSubscriptionId,
      externalPriceId: priceId,
      externalProductId: firstStripeProductId(object),
      subscriptionStatus: status,
      currentPeriodStart: unixTimestampToIso(numberValue(object.current_period_start)),
      currentPeriodEnd: unixTimestampToIso(numberValue(object.current_period_end)),
      cancelAtPeriodEnd: object.cancel_at_period_end === true,
      trialEnd: unixTimestampToIso(numberValue(object.trial_end)),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });

    await this.recalculateEntitlementsFromSubscription(subscription);
    return subscription;
  }

  private async updateSubscriptionFromInvoiceEvent(
    object: Record<string, unknown>,
    status: BillingSubscriptionStatus
  ): Promise<BillingSubscriptionRecord | null> {
    const subscriptionId = stringValue(object.subscription);
    if (!subscriptionId) {
      return null;
    }

    const existing = await this.repository.findBillingSubscriptionByExternalId("stripe", subscriptionId);
    if (!existing) {
      return null;
    }

    const subscription = await this.repository.upsertBillingSubscription({
      ...existing,
      subscriptionStatus: status,
      updatedAt: this.now().toISOString()
    });

    await this.recalculateEntitlementsFromSubscription(subscription);
    return subscription;
  }

  private async recalculateEntitlementsFromSubscription(subscription: BillingSubscriptionRecord): Promise<void> {
    const planKey = planKeyForStripePriceId(this.config, subscription.externalPriceId) ?? this.config.defaultPlanKey;
    requireBillingPlan(this.config, planKey);
    await this.applyPlanEntitlements({
      organizationId: subscription.organizationId,
      planKey,
      source: `stripe:${subscription.externalSubscriptionId ?? "subscription"}:${subscription.subscriptionStatus}`,
      enabled: subscriptionStatusAllowsEntitlements(subscription.subscriptionStatus),
      expiresAt: subscription.currentPeriodEnd
    });
  }

  private async applyPlanEntitlements(input: {
    organizationId: string;
    planKey: string;
    source: string;
    enabled?: boolean;
    expiresAt?: string | null;
  }): Promise<BillingEntitlementRecord[]> {
    const entitlements = createEntitlementRecordsForPlan({
      organizationId: input.organizationId,
      config: this.config,
      planKey: input.planKey,
      source: input.source,
      now: this.now(),
      expiresAt: input.expiresAt,
      idFactory: this.idFactory
    }).map((entitlement) => ({
      ...entitlement,
      enabled: input.enabled === false ? false : entitlement.enabled
    }));

    return this.repository.replaceBillingEntitlements(input.organizationId, entitlements);
  }

  private async resolveStripeEventOrganizationId(event: BillingWebhookEvent): Promise<string | null> {
    const object = event.data.object;
    const directOrganizationId = organizationIdFromStripeObject(object);
    if (directOrganizationId) {
      return directOrganizationId;
    }

    const externalCustomerId = stringValue(object.customer) ?? (stringValue(object.object) === "customer" ? stringValue(object.id) : null);
    if (externalCustomerId) {
      const customer = await this.repository.findBillingCustomerByExternalId("stripe", externalCustomerId);
      if (customer) {
        return customer.organizationId;
      }
    }

    const externalSubscriptionId =
      stringValue(object.subscription) ?? (stringValue(object.object) === "subscription" ? stringValue(object.id) : null);
    if (externalSubscriptionId) {
      const subscription = await this.repository.findBillingSubscriptionByExternalId("stripe", externalSubscriptionId);
      if (subscription) {
        return subscription.organizationId;
      }
    }

    return null;
  }

  private async writeBillingAudit(
    input: Omit<AuditLogInput, "action">
  ): Promise<void> {
    await this.auditWriter.write({
      ...input,
      action: "billing_changed"
    });
  }
}

interface StripeWebhookProcessingOutcome {
  auditable: boolean;
  organizationId: string | null;
  targetType?: string;
  targetId?: string | null;
  subscriptionStatus?: BillingSubscriptionStatus;
  enabledEntitlementCount?: number;
}

const organizationIdFromStripeObject = (object: Record<string, unknown>): string | null => {
  const metadata = safeMetadata(object.metadata);
  return metadata.organization_id ?? stringValue(object.client_reference_id);
};

const unixTimestampToIso = (value: number | null): string | null =>
  value === null ? null : new Date(value * 1000).toISOString();

const enabledEntitlementCount = (entitlements: BillingEntitlementRecord[]): number =>
  entitlements.filter((entitlement) => entitlement.enabled).length;
