import { randomUUID } from "node:crypto";

import { AuthError, publicUserView, type AuthenticatedUser } from "@puresoc/auth-core";
import type { AuditWriter } from "@puresoc/audit";
import type { RequestContext } from "../http";
import type { OrganizationService } from "../organizations/service";

export type PartnerStatus = "active" | "suspended" | "archived";
export type PartnerMemberRole = "owner" | "admin" | "analyst" | "viewer";
export type PartnerMemberStatus = "active" | "suspended" | "removed";
export type PartnerTenantAccessLevel = "admin" | "analyst" | "viewer";
export type PartnerTenantGrantStatus = "active" | "revoked";
export type TenantAccessSessionStatus = "active" | "ended" | "expired";

export interface PartnerRecord {
  id: string;
  name: string;
  slug: string;
  status: PartnerStatus;
  parentPartnerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerMemberRecord {
  id: string;
  partnerId: string;
  userId: string;
  role: PartnerMemberRole;
  status: PartnerMemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerTenantGrantRecord {
  id: string;
  partnerId: string;
  organizationId: string;
  accessLevel: PartnerTenantAccessLevel;
  status: PartnerTenantGrantStatus;
  grantedByUserId: string;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerCustomerOrganizationRecord {
  id: string;
  name: string;
  legalName?: string | null;
  billingStatus: string;
  defaultLocale: string;
  primaryCountryCode?: string | null;
  headquartersCountryCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantAccessSessionRecord {
  id: string;
  realActorUserId: string;
  partnerId: string;
  effectiveOrganizationId: string;
  reason: string;
  status: TenantAccessSessionStatus;
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date | null;
  endReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerPortfolioOpportunityRecord {
  opportunityType: string;
  priority: "low" | "medium" | "high" | "critical";
  relevantMicrosoftCapabilityOrPlan?: string;
  affectedUsers?: number;
  nis2Areas: string[];
  evidenceSource: string;
  nextAction: string;
}

export interface PartnerPortfolioTenantSnapshot {
  assessmentId?: string;
  assessmentCompleted: boolean;
  sector?: string;
  likelyClassification?: string;
  readinessPercent?: number;
  evidenceConfidencePercent?: number;
  microsoftConnectionState: "connected" | "disconnected" | "partial" | "error";
  highPriorityGapCount: number;
  topRecommendationOrOpportunity?: string;
  lastAssessmentOrSyncAt?: string;
  opportunities: PartnerPortfolioOpportunityRecord[];
}

export interface PartnerPortfolioMetricsRecord {
  totalCustomerTenants: number;
  completedAssessments: number;
  customersLikelyOrPossiblyInScope: number;
  connectedMicrosoftTenants: number;
  highPriorityGaps: number;
  opportunities: number;
}

export interface PartnerPortfolioReader {
  readTenantSnapshot(organizationId: string): Promise<PartnerPortfolioTenantSnapshot>;
}

export interface PartnerRepository {
  findUserById(userId: string): Promise<AuthenticatedUser | null>;
  createPartner(input: PartnerRecord): Promise<PartnerRecord>;
  createPartnerMember(input: PartnerMemberRecord): Promise<PartnerMemberRecord>;
  findPartnerById(partnerId: string): Promise<PartnerRecord | null>;
  findPartnerMember(partnerId: string, userId: string): Promise<PartnerMemberRecord | null>;
  listPartnersForUser(userId: string): Promise<Array<{ partner: PartnerRecord; membership: PartnerMemberRecord }>>;
  createPartnerCustomerWithGrant?(input: {
    organization: PartnerCustomerOrganizationRecord;
    grant: PartnerTenantGrantRecord;
  }): Promise<{ organization: PartnerCustomerOrganizationRecord; grant: PartnerTenantGrantRecord }>;
  createPartnerTenantGrant(input: PartnerTenantGrantRecord): Promise<PartnerTenantGrantRecord>;
  findActivePartnerTenantGrant(partnerId: string, organizationId: string): Promise<PartnerTenantGrantRecord | null>;
  listPartnerTenantGrants(partnerId: string): Promise<PartnerTenantGrantRecord[]>;
  findOrganizationById(organizationId: string): Promise<PartnerCustomerOrganizationRecord | null>;
  revokePartnerTenantGrant(input: { grantId: string; revokedAt: Date }): Promise<PartnerTenantGrantRecord>;
  createTenantAccessSession(input: TenantAccessSessionRecord): Promise<TenantAccessSessionRecord>;
  findTenantAccessSessionById(sessionId: string): Promise<TenantAccessSessionRecord | null>;
  findActiveTenantAccessSessionForActor(userId: string): Promise<TenantAccessSessionRecord | null>;
  endTenantAccessSession(input: {
    sessionId: string;
    endedAt: Date;
    endReason: string;
    status: Extract<TenantAccessSessionStatus, "ended" | "expired">;
  }): Promise<TenantAccessSessionRecord>;
}

export interface PartnerServiceOptions {
  repository: PartnerRepository;
  organizations: OrganizationService;
  auditWriter: AuditWriter;
  portfolioReader?: PartnerPortfolioReader;
  now?: () => Date;
  tenantAccessTtlMs?: number;
}

export class PartnerService {
  private readonly repository: PartnerRepository;
  private readonly organizations: OrganizationService;
  private readonly auditWriter: AuditWriter;
  private readonly portfolioReader?: PartnerPortfolioReader;
  private readonly now: () => Date;
  private readonly tenantAccessTtlMs: number;

  constructor(options: PartnerServiceOptions) {
    this.repository = options.repository;
    this.organizations = options.organizations;
    this.auditWriter = options.auditWriter;
    this.portfolioReader = options.portfolioReader;
    this.now = options.now ?? (() => new Date());
    this.tenantAccessTtlMs = options.tenantAccessTtlMs ?? 60 * 60 * 1000;
  }

  async createPartner(input: {
    actorUserId: string;
    name: string;
    slug?: string | null;
    parentPartnerId?: string | null;
    context: RequestContext & { requestId?: string | null; traceId?: string | null };
  }) {
    const actor = await this.requireUser(input.actorUserId);
    const now = this.now();
    const partner: PartnerRecord = {
      id: randomUUID(),
      name: input.name,
      slug: this.normalizeSlug(input.slug ?? input.name),
      status: "active",
      parentPartnerId: input.parentPartnerId ?? null,
      createdAt: now,
      updatedAt: now
    };
    const created = await this.repository.createPartner(partner);
    const membership = await this.repository.createPartnerMember({
      id: randomUUID(),
      partnerId: created.id,
      userId: actor.id,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now
    });

    await this.auditWriter.write({
      actorUserId: actor.id,
      organizationId: null,
      targetType: "partner",
      targetId: created.id,
      action: "partner.created",
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      contextJson: this.auditContext({
        partnerId: created.id,
        requestId: input.context.requestId,
        traceId: input.context.traceId
      }),
      afterJson: {
        name: created.name,
        slug: created.slug,
        status: created.status,
        memberRole: membership.role
      }
    });

    return {
      partner: this.safePartnerView(created),
      membership: this.safePartnerMemberView(membership),
      user: publicUserView(actor)
    };
  }

  async listPartnersForUser(userId: string) {
    await this.requireUser(userId);
    const memberships = await this.repository.listPartnersForUser(userId);
    return {
      partners: memberships.map(({ partner, membership }) => ({
        partner: this.safePartnerView(partner),
        membership: this.safePartnerMemberView(membership)
      }))
    };
  }

  async createCustomerForPartner(input: {
    actorUserId: string;
    partnerId: string;
    name: string;
    legalName?: string | null;
    primaryCountryCode?: string | null;
    headquartersCountryCode?: string | null;
    accessLevel?: PartnerTenantAccessLevel | null;
    context: RequestContext & { requestId?: string | null; traceId?: string | null };
  }) {
    const member = await this.requirePartnerRole(input.partnerId, input.actorUserId, ["owner", "admin"]);
    const now = this.now();

    if (this.repository.createPartnerCustomerWithGrant) {
      const organization: PartnerCustomerOrganizationRecord = {
        id: randomUUID(),
        name: input.name,
        legalName: input.legalName ?? null,
        billingStatus: "none",
        defaultLocale: "en",
        primaryCountryCode: input.primaryCountryCode ?? null,
        headquartersCountryCode: input.headquartersCountryCode ?? null,
        createdAt: now,
        updatedAt: now
      };
      const grant: PartnerTenantGrantRecord = {
        id: randomUUID(),
        partnerId: input.partnerId,
        organizationId: organization.id,
        accessLevel: input.accessLevel ?? "admin",
        status: "active",
        grantedByUserId: input.actorUserId,
        revokedAt: null,
        createdAt: now,
        updatedAt: now
      };
      const created = await this.repository.createPartnerCustomerWithGrant({ organization, grant });

      await this.auditPartnerCustomerOrganizationCreated({
        actorUserId: input.actorUserId,
        organization: created.organization,
        context: input.context
      });
      await this.auditPartnerTenantGrantCreated({
        actorUserId: input.actorUserId,
        partnerId: input.partnerId,
        grant: created.grant,
        partnerRole: member.role,
        context: input.context
      });

      return {
        organization: this.safeOrganizationView(created.organization),
        grant: this.safeGrantView(created.grant)
      };
    }

    const organizationResult = await this.organizations.createPartnerCustomerOrganization({
      actorUserId: input.actorUserId,
      name: input.name,
      legalName: input.legalName ?? null,
      primaryCountryCode: input.primaryCountryCode ?? null,
      headquartersCountryCode: input.headquartersCountryCode ?? null,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent
    });
    const grant = await this.repository.createPartnerTenantGrant({
      id: randomUUID(),
      partnerId: input.partnerId,
      organizationId: organizationResult.organization.id,
      accessLevel: input.accessLevel ?? "admin",
      status: "active",
      grantedByUserId: input.actorUserId,
      revokedAt: null,
      createdAt: now,
      updatedAt: now
    });

    await this.auditPartnerTenantGrantCreated({
      actorUserId: input.actorUserId,
      partnerId: input.partnerId,
      grant,
      partnerRole: member.role,
      context: input.context
    });

    return {
      organization: organizationResult.organization,
      grant: this.safeGrantView(grant)
    };
  }

  async listPartnerPortfolio(input: { actorUserId: string; partnerId: string }) {
    await this.requirePartnerRole(input.partnerId, input.actorUserId, ["owner", "admin", "analyst", "viewer"]);
    const grantRecords = (await this.repository.listPartnerTenantGrants(input.partnerId)).filter(
      (grant) => grant.status === "active"
    );
    const rows = await Promise.all(
      grantRecords.map(async (grant) => ({
        grant,
        organization: await this.repository.findOrganizationById(grant.organizationId)
      }))
    );
    const grants = await Promise.all(
      rows.map(async ({ grant, organization }) => ({
        ...this.safeGrantView(grant),
        organization: organization ? this.safeOrganizationView(organization) : null,
        snapshot: await this.readPortfolioSnapshot(grant.organizationId)
      }))
    );

    return {
      metrics: this.aggregatePortfolioMetrics(grants.map((grant) => grant.snapshot)),
      opportunities: grants.flatMap((grant) =>
        grant.snapshot.opportunities.map((opportunity) => ({
          ...opportunity,
          customerId: grant.organizationId,
          customerName: grant.organization?.name ?? grant.organizationId
        }))
      ),
      grants
    };
  }

  async getCurrentTenantAccess(input: { actorUserId: string; partnerId: string }) {
    await this.requirePartnerRole(input.partnerId, input.actorUserId, ["owner", "admin", "analyst", "viewer"]);
    const session = await this.repository.findActiveTenantAccessSessionForActor(input.actorUserId);
    const now = this.now();
    if (!session || session.partnerId !== input.partnerId) {
      return {
        tenantSession: null
      };
    }

    if (session.expiresAt <= now) {
      const expired = await this.repository.endTenantAccessSession({
        sessionId: session.id,
        endedAt: now,
        endReason: "expired",
        status: "expired"
      });
      return {
        tenantSession: this.safeTenantAccessSessionView(expired)
      };
    }

    const grant = await this.repository.findActivePartnerTenantGrant(
      session.partnerId,
      session.effectiveOrganizationId
    );
    if (!grant) {
      const ended = await this.repository.endTenantAccessSession({
        sessionId: session.id,
        endedAt: now,
        endReason: "grant_revoked",
        status: "ended"
      });
      return {
        tenantSession: this.safeTenantAccessSessionView(ended)
      };
    }

    return {
      tenantSession: this.safeTenantAccessSessionView(session)
    };
  }

  async startTenantAccess(input: {
    actorUserId: string;
    partnerId: string;
    organizationId: string;
    reason: string;
    context: RequestContext & { requestId?: string | null; traceId?: string | null };
  }) {
    const reason = input.reason.trim();
    if (reason.length < 8) {
      throw new AuthError("invalid_request", "Tenant access requires a clear reason.", 400);
    }

    const member = await this.requirePartnerRole(input.partnerId, input.actorUserId, [
      "owner",
      "admin",
      "analyst",
      "viewer"
    ]);
    const grant = await this.repository.findActivePartnerTenantGrant(input.partnerId, input.organizationId);
    if (!grant) {
      throw new AuthError("forbidden", "Partner does not have an active grant for this tenant.", 403);
    }

    const existingSession = await this.repository.findActiveTenantAccessSessionForActor(input.actorUserId);
    const now = this.now();
    if (existingSession) {
      if (existingSession.expiresAt <= now) {
        await this.repository.endTenantAccessSession({
          sessionId: existingSession.id,
          endedAt: now,
          endReason: "expired",
          status: "expired"
        });
      } else {
        throw new AuthError("forbidden", "Exit the current customer before entering another tenant.", 403);
      }
    }

    const session = await this.repository.createTenantAccessSession({
      id: randomUUID(),
      realActorUserId: input.actorUserId,
      partnerId: input.partnerId,
      effectiveOrganizationId: input.organizationId,
      reason,
      status: "active",
      startedAt: now,
      expiresAt: new Date(now.getTime() + this.tenantAccessTtlMs),
      endedAt: null,
      endReason: null,
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      requestId: input.context.requestId ?? null,
      traceId: input.context.traceId ?? null,
      createdAt: now,
      updatedAt: now
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "tenant_access_session",
      targetId: session.id,
      action: "partner.tenant_access.started",
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      contextJson: this.auditContext({
        partnerId: input.partnerId,
        tenantSessionId: session.id,
        effectiveOrganizationId: input.organizationId,
        realActorUserId: input.actorUserId,
        reason,
        requestId: input.context.requestId,
        traceId: input.context.traceId
      }),
      afterJson: {
        partnerRole: member.role,
        accessLevel: grant.accessLevel,
        expiresAt: session.expiresAt.toISOString()
      }
    });

    return {
      tenantSession: this.safeTenantAccessSessionView(session)
    };
  }

  async exitTenantAccess(input: {
    actorUserId: string;
    partnerId: string;
    sessionId: string;
    context: RequestContext & { requestId?: string | null; traceId?: string | null };
  }) {
    const session = await this.repository.findTenantAccessSessionById(input.sessionId);
    if (
      !session ||
      session.realActorUserId !== input.actorUserId ||
      session.partnerId !== input.partnerId ||
      session.status !== "active"
    ) {
      throw new AuthError("forbidden", "Tenant access session is not active for this actor and partner.", 403);
    }

    const now = this.now();
    const ended = await this.repository.endTenantAccessSession({
      sessionId: session.id,
      endedAt: now,
      endReason: session.expiresAt <= now ? "expired" : "exited_by_actor",
      status: session.expiresAt <= now ? "expired" : "ended"
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: ended.effectiveOrganizationId,
      targetType: "tenant_access_session",
      targetId: ended.id,
      action: "partner.tenant_access.ended",
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      contextJson: this.auditContext({
        partnerId: input.partnerId,
        tenantSessionId: ended.id,
        effectiveOrganizationId: ended.effectiveOrganizationId,
        realActorUserId: input.actorUserId,
        reason: ended.reason,
        requestId: input.context.requestId,
        traceId: input.context.traceId
      }),
      afterJson: {
        status: ended.status,
        endReason: ended.endReason,
        endedAt: ended.endedAt?.toISOString() ?? null
      }
    });

    return {
      tenantSession: this.safeTenantAccessSessionView(ended)
    };
  }

  private async requireUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new AuthError("session_invalid", "Authenticated user was not found.", 401);
    }

    return user;
  }

  private async requirePartnerRole(
    partnerId: string,
    userId: string,
    allowedRoles: readonly PartnerMemberRole[]
  ): Promise<PartnerMemberRecord> {
    const partner = await this.repository.findPartnerById(partnerId);
    if (!partner || partner.status !== "active") {
      throw new AuthError("forbidden", "Partner is not active.", 403);
    }

    const membership = await this.repository.findPartnerMember(partnerId, userId);
    if (!membership || membership.status !== "active" || !allowedRoles.includes(membership.role)) {
      throw new AuthError("forbidden", "User does not have the required partner role.", 403);
    }

    return membership;
  }

  private normalizeSlug(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (slug.length < 3) {
      throw new AuthError("invalid_request", "Partner slug must contain at least three URL-safe characters.", 400);
    }

    return slug;
  }

  private auditContext(input: {
    partnerId: string;
    tenantSessionId?: string | null;
    effectiveOrganizationId?: string | null;
    realActorUserId?: string | null;
    reason?: string | null;
    requestId?: string | null;
    traceId?: string | null;
  }) {
    return {
      schemaVersion: "puresoc.audit.partner_context.v1",
      partnerId: input.partnerId,
      tenantSessionId: input.tenantSessionId ?? null,
      effectiveOrganizationId: input.effectiveOrganizationId ?? null,
      realActorUserId: input.realActorUserId ?? null,
      reason: input.reason ?? null,
      requestId: input.requestId ?? null,
      traceId: input.traceId ?? null
    };
  }

  private async auditPartnerCustomerOrganizationCreated(input: {
    actorUserId: string;
    organization: PartnerCustomerOrganizationRecord;
    context: RequestContext & { requestId?: string | null; traceId?: string | null };
  }) {
    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organization.id,
      targetType: "organization",
      targetId: input.organization.id,
      action: "organization_created",
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      afterJson: {
        createdThrough: "partner_portfolio",
        name: input.organization.name,
        legalName: input.organization.legalName,
        primaryCountryCode: input.organization.primaryCountryCode
      }
    });
  }

  private async auditPartnerTenantGrantCreated(input: {
    actorUserId: string;
    partnerId: string;
    grant: PartnerTenantGrantRecord;
    partnerRole: PartnerMemberRole;
    context: RequestContext & { requestId?: string | null; traceId?: string | null };
  }) {
    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.grant.organizationId,
      targetType: "partner_tenant_grant",
      targetId: input.grant.id,
      action: "partner.tenant_grant.created",
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      contextJson: this.auditContext({
        partnerId: input.partnerId,
        effectiveOrganizationId: input.grant.organizationId,
        requestId: input.context.requestId,
        traceId: input.context.traceId
      }),
      afterJson: {
        partnerRole: input.partnerRole,
        accessLevel: input.grant.accessLevel,
        status: input.grant.status
      }
    });
  }

  private safePartnerView(partner: PartnerRecord) {
    return {
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      status: partner.status,
      parentPartnerId: partner.parentPartnerId ?? null,
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString()
    };
  }

  private safePartnerMemberView(member: PartnerMemberRecord) {
    return {
      id: member.id,
      partnerId: member.partnerId,
      userId: member.userId,
      role: member.role,
      status: member.status,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString()
    };
  }

  private safeGrantView(grant: PartnerTenantGrantRecord) {
    return {
      id: grant.id,
      partnerId: grant.partnerId,
      organizationId: grant.organizationId,
      grantLevel: grant.accessLevel,
      status: grant.status,
      grantedByUserId: grant.grantedByUserId,
      revokedAt: grant.revokedAt?.toISOString() ?? null,
      createdAt: grant.createdAt.toISOString(),
      updatedAt: grant.updatedAt.toISOString()
    };
  }

  private safeOrganizationView(organization: PartnerCustomerOrganizationRecord) {
    return {
      id: organization.id,
      name: organization.name,
      legalName: organization.legalName ?? null,
      billingStatus: organization.billingStatus,
      defaultLocale: organization.defaultLocale,
      primaryCountryCode: organization.primaryCountryCode ?? null,
      headquartersCountryCode: organization.headquartersCountryCode ?? null,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString()
    };
  }

  private safeTenantAccessSessionView(session: TenantAccessSessionRecord) {
    return {
      id: session.id,
      realActorUserId: session.realActorUserId,
      partnerId: session.partnerId,
      effectiveOrganizationId: session.effectiveOrganizationId,
      reason: session.reason,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      endReason: session.endReason ?? null
    };
  }

  private async readPortfolioSnapshot(organizationId: string): Promise<PartnerPortfolioTenantSnapshot> {
    return (
      (await this.portfolioReader?.readTenantSnapshot(organizationId)) ?? {
        assessmentCompleted: false,
        microsoftConnectionState: "disconnected",
        highPriorityGapCount: 0,
        opportunities: []
      }
    );
  }

  private aggregatePortfolioMetrics(snapshots: readonly PartnerPortfolioTenantSnapshot[]): PartnerPortfolioMetricsRecord {
    return {
      totalCustomerTenants: snapshots.length,
      completedAssessments: snapshots.filter((snapshot) => snapshot.assessmentCompleted).length,
      customersLikelyOrPossiblyInScope: snapshots.filter((snapshot) =>
        /likely|possibly|probably/i.test(snapshot.likelyClassification ?? "")
      ).length,
      connectedMicrosoftTenants: snapshots.filter((snapshot) => snapshot.microsoftConnectionState === "connected").length,
      highPriorityGaps: snapshots.reduce((sum, snapshot) => sum + snapshot.highPriorityGapCount, 0),
      opportunities: snapshots.reduce((sum, snapshot) => sum + snapshot.opportunities.length, 0)
    };
  }
}

export const isPartnerTenantAccessLevel = (value: string): value is PartnerTenantAccessLevel =>
  value === "admin" || value === "analyst" || value === "viewer";
