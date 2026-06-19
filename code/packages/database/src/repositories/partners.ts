type PartnerStatus = "active" | "suspended" | "archived";
type PartnerMemberRole = "owner" | "admin" | "analyst" | "viewer";
type PartnerMemberStatus = "active" | "suspended" | "removed";
type PartnerTenantAccessLevel = "admin" | "analyst" | "viewer";
type PartnerTenantGrantStatus = "active" | "revoked";
type TenantAccessSessionStatus = "active" | "ended" | "expired";

export interface PartnerRecordContract {
  id: string;
  name: string;
  slug: string;
  status: PartnerStatus;
  parentPartnerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerMemberRecordContract {
  id: string;
  partnerId: string;
  userId: string;
  role: PartnerMemberRole;
  status: PartnerMemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerTenantGrantRecordContract {
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

export interface PartnerCustomerOrganizationRecordContract {
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

export interface PartnerCustomerWithGrantInputContract {
  organization: PartnerCustomerOrganizationRecordContract;
  grant: PartnerTenantGrantRecordContract;
}

export interface TenantAccessSessionRecordContract {
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

type DelegateArgs = Record<string, unknown>;
type DelegateRow = Record<string, unknown>;

interface CrudDelegate {
  create(args: DelegateArgs): Promise<DelegateRow>;
  findFirst(args: DelegateArgs): Promise<DelegateRow | null>;
  findUnique?(args: DelegateArgs): Promise<DelegateRow | null>;
  findMany(args: DelegateArgs): Promise<DelegateRow[]>;
  update(args: DelegateArgs): Promise<DelegateRow>;
}

interface UserDelegate {
  findUnique(args: DelegateArgs): Promise<DelegateRow | null>;
}

interface PrismaPartnerTransactionClient {
  organization: CrudDelegate;
  partnerTenantGrant: CrudDelegate;
}

export interface PrismaPartnerClient extends PrismaPartnerTransactionClient {
  user: UserDelegate;
  partner: CrudDelegate;
  partnerMember: CrudDelegate;
  tenantAccessSession: CrudDelegate;
  $transaction?<T>(callback: (client: PrismaPartnerTransactionClient) => Promise<T>): Promise<T>;
}

export class PrismaPartnerRepository {
  constructor(private readonly client: PrismaPartnerClient) {}

  async findUserById(userId: string): Promise<AuthenticatedUserContract | null> {
    const row = await this.client.user.findUnique({
      where: {
        id: userId
      }
    });

    return row ? fromUserRow(row) : null;
  }

  async createPartner(input: PartnerRecordContract): Promise<PartnerRecordContract> {
    const row = await this.client.partner.create({
      data: {
        id: input.id,
        name: input.name,
        slug: input.slug,
        status: input.status,
        parentPartnerId: input.parentPartnerId ?? null,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt
      }
    });

    return fromPartnerRow(row);
  }

  async createPartnerMember(input: PartnerMemberRecordContract): Promise<PartnerMemberRecordContract> {
    const existing = await this.findPartnerMember(input.partnerId, input.userId);
    if (existing) {
      return existing;
    }

    const row = await this.client.partnerMember.create({
      data: {
        id: input.id,
        partnerId: input.partnerId,
        userId: input.userId,
        role: input.role,
        status: input.status,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt
      }
    });

    return fromPartnerMemberRow(row);
  }

  async findPartnerById(partnerId: string): Promise<PartnerRecordContract | null> {
    const row =
      (await this.client.partner.findUnique?.({
        where: {
          id: partnerId
        }
      })) ??
      (await this.client.partner.findFirst({
        where: {
          id: partnerId
        }
      }));

    return row ? fromPartnerRow(row) : null;
  }

  async findPartnerMember(partnerId: string, userId: string): Promise<PartnerMemberRecordContract | null> {
    const row = await this.client.partnerMember.findFirst({
      where: {
        partnerId,
        userId
      }
    });

    return row ? fromPartnerMemberRow(row) : null;
  }

  async listPartnersForUser(
    userId: string
  ): Promise<Array<{ partner: PartnerRecordContract; membership: PartnerMemberRecordContract }>> {
    const rows = await this.client.partnerMember.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const results: Array<{ partner: PartnerRecordContract; membership: PartnerMemberRecordContract }> = [];
    for (const row of rows) {
      const membership = fromPartnerMemberRow(row);
      const partner = await this.findPartnerById(membership.partnerId);
      if (!partner) {
        throw new Error(`Partner membership references unknown partner: ${membership.partnerId}`);
      }
      results.push({ partner, membership });
    }
    return results;
  }

  async createPartnerCustomerWithGrant(input: PartnerCustomerWithGrantInputContract): Promise<{
    organization: PartnerCustomerOrganizationRecordContract;
    grant: PartnerTenantGrantRecordContract;
  }> {
    if (!this.client.$transaction) {
      throw new Error("Prisma partner customer creation requires transaction support.");
    }

    return this.client.$transaction(async (tx) => {
      const organizationRow = await tx.organization.create({
        data: {
          id: input.organization.id,
          name: input.organization.name,
          legalName: input.organization.legalName ?? null,
          billingStatus: input.organization.billingStatus,
          defaultLocale: input.organization.defaultLocale,
          primaryCountryCode: input.organization.primaryCountryCode ?? null,
          headquartersCountryCode: input.organization.headquartersCountryCode ?? null,
          createdAt: input.organization.createdAt,
          updatedAt: input.organization.updatedAt
        }
      });
      const grantRow = await tx.partnerTenantGrant.create({
        data: {
          id: input.grant.id,
          partnerId: input.grant.partnerId,
          organizationId: input.grant.organizationId,
          accessLevel: input.grant.accessLevel,
          status: input.grant.status,
          grantedByUserId: input.grant.grantedByUserId,
          revokedAt: input.grant.revokedAt ?? null,
          createdAt: input.grant.createdAt,
          updatedAt: input.grant.updatedAt
        }
      });

      return {
        organization: fromOrganizationRow(organizationRow),
        grant: fromPartnerTenantGrantRow(grantRow)
      };
    });
  }

  async createPartnerTenantGrant(
    input: PartnerTenantGrantRecordContract
  ): Promise<PartnerTenantGrantRecordContract> {
    const existing = await this.findActivePartnerTenantGrant(input.partnerId, input.organizationId);
    if (existing) {
      return existing;
    }

    const row = await this.client.partnerTenantGrant.create({
      data: {
        id: input.id,
        partnerId: input.partnerId,
        organizationId: input.organizationId,
        accessLevel: input.accessLevel,
        status: input.status,
        grantedByUserId: input.grantedByUserId,
        revokedAt: input.revokedAt ?? null,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt
      }
    });

    return fromPartnerTenantGrantRow(row);
  }

  async findActivePartnerTenantGrant(
    partnerId: string,
    organizationId: string
  ): Promise<PartnerTenantGrantRecordContract | null> {
    const row = await this.client.partnerTenantGrant.findFirst({
      where: {
        partnerId,
        organizationId,
        status: "active"
      }
    });

    return row ? fromPartnerTenantGrantRow(row) : null;
  }

  async listPartnerTenantGrants(partnerId: string): Promise<PartnerTenantGrantRecordContract[]> {
    const rows = await this.client.partnerTenantGrant.findMany({
      where: {
        partnerId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return rows.map(fromPartnerTenantGrantRow);
  }

  async findOrganizationById(organizationId: string): Promise<PartnerCustomerOrganizationRecordContract | null> {
    const row =
      (await this.client.organization.findUnique?.({
        where: {
          id: organizationId
        }
      })) ??
      (await this.client.organization.findFirst({
        where: {
          id: organizationId
        }
      }));

    return row ? fromOrganizationRow(row) : null;
  }

  async revokePartnerTenantGrant(input: {
    grantId: string;
    revokedAt: Date;
  }): Promise<PartnerTenantGrantRecordContract> {
    const row = await this.client.partnerTenantGrant.update({
      where: {
        id: input.grantId
      },
      data: {
        status: "revoked",
        revokedAt: input.revokedAt,
        updatedAt: input.revokedAt
      }
    });

    return fromPartnerTenantGrantRow(row);
  }

  async createTenantAccessSession(
    input: TenantAccessSessionRecordContract
  ): Promise<TenantAccessSessionRecordContract> {
    const row = await this.client.tenantAccessSession.create({
      data: {
        id: input.id,
        realActorUserId: input.realActorUserId,
        partnerId: input.partnerId,
        effectiveOrganizationId: input.effectiveOrganizationId,
        reason: input.reason,
        status: input.status,
        startedAt: input.startedAt,
        expiresAt: input.expiresAt,
        endedAt: input.endedAt ?? null,
        endReason: input.endReason ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        requestId: input.requestId ?? null,
        traceId: input.traceId ?? null,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt
      }
    });

    return fromTenantAccessSessionRow(row);
  }

  async findTenantAccessSessionById(sessionId: string): Promise<TenantAccessSessionRecordContract | null> {
    const row =
      (await this.client.tenantAccessSession.findUnique?.({
        where: {
          id: sessionId
        }
      })) ??
      (await this.client.tenantAccessSession.findFirst({
        where: {
          id: sessionId
        }
      }));

    return row ? fromTenantAccessSessionRow(row) : null;
  }

  async findActiveTenantAccessSessionForActor(userId: string): Promise<TenantAccessSessionRecordContract | null> {
    const row = await this.client.tenantAccessSession.findFirst({
      where: {
        realActorUserId: userId,
        status: "active"
      },
      orderBy: {
        startedAt: "desc"
      }
    });

    return row ? fromTenantAccessSessionRow(row) : null;
  }

  async endTenantAccessSession(input: {
    sessionId: string;
    endedAt: Date;
    endReason: string;
    status: Extract<TenantAccessSessionStatus, "ended" | "expired">;
  }): Promise<TenantAccessSessionRecordContract> {
    const row = await this.client.tenantAccessSession.update({
      where: {
        id: input.sessionId
      },
      data: {
        status: input.status,
        endedAt: input.endedAt,
        endReason: input.endReason,
        updatedAt: input.endedAt
      }
    });

    return fromTenantAccessSessionRow(row);
  }
}

interface AuthenticatedUserContract {
  id: string;
  email: string;
  displayName?: string | null;
  emailVerifiedAt?: Date | null;
}

const fromUserRow = (row: DelegateRow): AuthenticatedUserContract => ({
  id: stringField(row, "id"),
  email: stringField(row, "email"),
  displayName: nullableStringField(row, "displayName"),
  emailVerifiedAt: nullableDateField(row, "emailVerifiedAt")
});

const fromPartnerRow = (row: DelegateRow): PartnerRecordContract => ({
  id: stringField(row, "id"),
  name: stringField(row, "name"),
  slug: stringField(row, "slug"),
  status: partnerStatus(row.status),
  parentPartnerId: nullableStringField(row, "parentPartnerId"),
  createdAt: dateField(row, "createdAt"),
  updatedAt: dateField(row, "updatedAt")
});

const fromPartnerMemberRow = (row: DelegateRow): PartnerMemberRecordContract => ({
  id: stringField(row, "id"),
  partnerId: stringField(row, "partnerId"),
  userId: stringField(row, "userId"),
  role: partnerMemberRole(row.role),
  status: partnerMemberStatus(row.status),
  createdAt: dateField(row, "createdAt"),
  updatedAt: dateField(row, "updatedAt")
});

const fromPartnerTenantGrantRow = (row: DelegateRow): PartnerTenantGrantRecordContract => ({
  id: stringField(row, "id"),
  partnerId: stringField(row, "partnerId"),
  organizationId: stringField(row, "organizationId"),
  accessLevel: partnerTenantAccessLevel(row.accessLevel),
  status: partnerTenantGrantStatus(row.status),
  grantedByUserId: stringField(row, "grantedByUserId"),
  revokedAt: nullableDateField(row, "revokedAt"),
  createdAt: dateField(row, "createdAt"),
  updatedAt: dateField(row, "updatedAt")
});

const fromOrganizationRow = (row: DelegateRow): PartnerCustomerOrganizationRecordContract => ({
  id: stringField(row, "id"),
  name: stringField(row, "name"),
  legalName: nullableStringField(row, "legalName"),
  billingStatus: stringField(row, "billingStatus"),
  defaultLocale: stringField(row, "defaultLocale"),
  primaryCountryCode: nullableStringField(row, "primaryCountryCode"),
  headquartersCountryCode: nullableStringField(row, "headquartersCountryCode"),
  createdAt: dateField(row, "createdAt"),
  updatedAt: dateField(row, "updatedAt")
});

const fromTenantAccessSessionRow = (row: DelegateRow): TenantAccessSessionRecordContract => ({
  id: stringField(row, "id"),
  realActorUserId: stringField(row, "realActorUserId"),
  partnerId: stringField(row, "partnerId"),
  effectiveOrganizationId: stringField(row, "effectiveOrganizationId"),
  reason: stringField(row, "reason"),
  status: tenantAccessSessionStatus(row.status),
  startedAt: dateField(row, "startedAt"),
  expiresAt: dateField(row, "expiresAt"),
  endedAt: nullableDateField(row, "endedAt"),
  endReason: nullableStringField(row, "endReason"),
  ipAddress: nullableStringField(row, "ipAddress"),
  userAgent: nullableStringField(row, "userAgent"),
  requestId: nullableStringField(row, "requestId"),
  traceId: nullableStringField(row, "traceId"),
  createdAt: dateField(row, "createdAt"),
  updatedAt: dateField(row, "updatedAt")
});

const stringField = (row: DelegateRow, key: string): string => {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string field: ${key}`);
  }
  return value;
};

const nullableStringField = (row: DelegateRow, key: string): string | null => {
  const value = row[key];
  return typeof value === "string" ? value : null;
};

const dateField = (row: DelegateRow, key: string): Date => {
  const value = row[key];
  return value instanceof Date ? value : new Date(String(value));
};

const nullableDateField = (row: DelegateRow, key: string): Date | null => {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  return value instanceof Date ? value : new Date(String(value));
};

const partnerStatus = (value: unknown): PartnerStatus =>
  value === "suspended" || value === "archived" ? value : "active";

const partnerMemberRole = (value: unknown): PartnerMemberRole =>
  value === "admin" || value === "analyst" || value === "viewer" ? value : "owner";

const partnerMemberStatus = (value: unknown): PartnerMemberStatus =>
  value === "suspended" || value === "removed" ? value : "active";

const partnerTenantAccessLevel = (value: unknown): PartnerTenantAccessLevel =>
  value === "analyst" || value === "viewer" ? value : "admin";

const partnerTenantGrantStatus = (value: unknown): PartnerTenantGrantStatus =>
  value === "revoked" ? "revoked" : "active";

const tenantAccessSessionStatus = (value: unknown): TenantAccessSessionStatus =>
  value === "ended" || value === "expired" ? value : "active";
