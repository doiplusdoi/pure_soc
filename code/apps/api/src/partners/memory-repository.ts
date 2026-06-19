import type { AuthenticatedUser } from "@puresoc/auth-core";
import type {
  PartnerCustomerOrganizationRecord,
  PartnerMemberRecord,
  PartnerRecord,
  PartnerRepository,
  PartnerTenantGrantRecord,
  TenantAccessSessionRecord
} from "./service";
import type { InMemoryIdentityOrganizationRbacRepository } from "../auth/memory-repository";

export class InMemoryPartnerRepository implements PartnerRepository {
  readonly partners = new Map<string, PartnerRecord>();
  readonly partnerMembers = new Map<string, PartnerMemberRecord>();
  readonly partnerTenantGrants = new Map<string, PartnerTenantGrantRecord>();
  readonly tenantAccessSessions = new Map<string, TenantAccessSessionRecord>();

  constructor(private readonly identityRepository: InMemoryIdentityOrganizationRbacRepository) {}

  async findUserById(userId: string): Promise<AuthenticatedUser | null> {
    return this.identityRepository.findUserById(userId);
  }

  async createPartner(input: PartnerRecord): Promise<PartnerRecord> {
    if ([...this.partners.values()].some((partner) => partner.slug === input.slug)) {
      throw new Error(`Partner slug already exists: ${input.slug}`);
    }
    this.partners.set(input.id, input);
    return input;
  }

  async createPartnerMember(input: PartnerMemberRecord): Promise<PartnerMemberRecord> {
    const existing = await this.findPartnerMember(input.partnerId, input.userId);
    if (existing) {
      return existing;
    }
    this.partnerMembers.set(input.id, input);
    return input;
  }

  async findPartnerById(partnerId: string): Promise<PartnerRecord | null> {
    return this.partners.get(partnerId) ?? null;
  }

  async findPartnerMember(partnerId: string, userId: string): Promise<PartnerMemberRecord | null> {
    return (
      [...this.partnerMembers.values()].find((member) => member.partnerId === partnerId && member.userId === userId) ??
      null
    );
  }

  async listPartnersForUser(userId: string): Promise<Array<{ partner: PartnerRecord; membership: PartnerMemberRecord }>> {
    return [...this.partnerMembers.values()]
      .filter((membership) => membership.userId === userId)
      .map((membership) => {
        const partner = this.partners.get(membership.partnerId);
        if (!partner) {
          throw new Error(`Partner membership references unknown partner: ${membership.partnerId}`);
        }
        return { partner, membership };
      });
  }

  async createPartnerTenantGrant(input: PartnerTenantGrantRecord): Promise<PartnerTenantGrantRecord> {
    const existing = await this.findActivePartnerTenantGrant(input.partnerId, input.organizationId);
    if (existing) {
      return existing;
    }
    this.partnerTenantGrants.set(input.id, input);
    return input;
  }

  async findActivePartnerTenantGrant(partnerId: string, organizationId: string): Promise<PartnerTenantGrantRecord | null> {
    return (
      [...this.partnerTenantGrants.values()].find(
        (grant) => grant.partnerId === partnerId && grant.organizationId === organizationId && grant.status === "active"
      ) ?? null
    );
  }

  async listPartnerTenantGrants(partnerId: string): Promise<PartnerTenantGrantRecord[]> {
    return [...this.partnerTenantGrants.values()].filter((grant) => grant.partnerId === partnerId);
  }

  async findOrganizationById(organizationId: string): Promise<PartnerCustomerOrganizationRecord | null> {
    return this.identityRepository.organizations.get(organizationId) ?? null;
  }

  async revokePartnerTenantGrant(input: { grantId: string; revokedAt: Date }): Promise<PartnerTenantGrantRecord> {
    const grant = this.partnerTenantGrants.get(input.grantId);
    if (!grant) {
      throw new Error(`Unknown partner tenant grant: ${input.grantId}`);
    }
    const updated = {
      ...grant,
      status: "revoked" as const,
      revokedAt: input.revokedAt,
      updatedAt: input.revokedAt
    };
    this.partnerTenantGrants.set(grant.id, updated);
    return updated;
  }

  async createTenantAccessSession(input: TenantAccessSessionRecord): Promise<TenantAccessSessionRecord> {
    this.tenantAccessSessions.set(input.id, input);
    return input;
  }

  async findTenantAccessSessionById(sessionId: string): Promise<TenantAccessSessionRecord | null> {
    return this.tenantAccessSessions.get(sessionId) ?? null;
  }

  async findActiveTenantAccessSessionForActor(userId: string): Promise<TenantAccessSessionRecord | null> {
    return (
      [...this.tenantAccessSessions.values()].find(
        (session) => session.realActorUserId === userId && session.status === "active"
      ) ?? null
    );
  }

  async endTenantAccessSession(input: {
    sessionId: string;
    endedAt: Date;
    endReason: string;
    status: "ended" | "expired";
  }): Promise<TenantAccessSessionRecord> {
    const session = this.tenantAccessSessions.get(input.sessionId);
    if (!session) {
      throw new Error(`Unknown tenant access session: ${input.sessionId}`);
    }
    const updated = {
      ...session,
      status: input.status,
      endedAt: input.endedAt,
      endReason: input.endReason,
      updatedAt: input.endedAt
    };
    this.tenantAccessSessions.set(session.id, updated);
    return updated;
  }
}
