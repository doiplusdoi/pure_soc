import { AuthError, type OrganizationMemberStatus, type PureSocRoleKey } from "@puresoc/auth-core";
import type { PartnerMemberRole, PartnerRepository, PartnerTenantAccessLevel } from "../partners/service";

export interface OrganizationMembershipRecord {
  id: string;
  organizationId: string;
  userId: string;
  status: OrganizationMemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleRecord {
  id: string;
  key: PureSocRoleKey;
  name: string;
  description?: string | null;
  createdAt: Date;
}

export interface RoleBindingRecord {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  roleKey: PureSocRoleKey;
  scopeJson: Record<string, unknown>;
  createdAt: Date;
}

export interface RbacRepository {
  findMembership(organizationId: string, userId: string): Promise<OrganizationMembershipRecord | null>;
  findRoleBindings(organizationId: string, userId: string): Promise<RoleBindingRecord[]>;
}

export interface RequireOrganizationRoleInput {
  repository: RbacRepository;
  userId: string;
  organizationId: string;
  allowedRoles: readonly PureSocRoleKey[];
}

export const requireOrganizationRole = async (input: RequireOrganizationRoleInput): Promise<RoleBindingRecord[]> => {
  const membership = await input.repository.findMembership(input.organizationId, input.userId);

  if (!membership || membership.status !== "active") {
    throw new AuthError("forbidden", "User is not an active member of this organization.", 403);
  }

  const bindings = await input.repository.findRoleBindings(input.organizationId, input.userId);
  const allowed = new Set(input.allowedRoles);
  const matchingBindings = bindings.filter((binding) => allowed.has(binding.roleKey));

  if (matchingBindings.length === 0) {
    throw new AuthError("forbidden", "User does not have a required organization role.", 403);
  }

  return matchingBindings;
};

export const createPartnerAwareRbacRepository = (input: {
  baseRepository: RbacRepository;
  partnerRepository: PartnerRepository;
  now?: () => Date;
}): RbacRepository => ({
  async findMembership(organizationId, userId) {
    const directMembership = await input.baseRepository.findMembership(organizationId, userId);
    if (directMembership) {
      return directMembership;
    }

    const session = await findValidPartnerTenantSession({
      partnerRepository: input.partnerRepository,
      organizationId,
      userId,
      now: input.now
    });
    if (!session) {
      return null;
    }

    return {
      id: `tenant_session:${session.id}`,
      organizationId,
      userId,
      status: "active",
      createdAt: session.startedAt,
      updatedAt: session.updatedAt
    };
  },

  async findRoleBindings(organizationId, userId) {
    const directBindings = await input.baseRepository.findRoleBindings(organizationId, userId);
    if (directBindings.length > 0) {
      return directBindings;
    }

    const session = await findValidPartnerTenantSession({
      partnerRepository: input.partnerRepository,
      organizationId,
      userId,
      now: input.now
    });
    if (!session) {
      return [];
    }

    const member = await input.partnerRepository.findPartnerMember(session.partnerId, userId);
    const grant = await input.partnerRepository.findActivePartnerTenantGrant(session.partnerId, organizationId);
    if (!member || !grant) {
      return [];
    }

    return partnerSessionRoleKeys(member.role, grant.accessLevel).map((roleKey) => ({
      id: `tenant_session:${session.id}:${roleKey}`,
      organizationId,
      userId,
      roleId: `partner_session:${roleKey}`,
      roleKey,
      scopeJson: {
        schemaVersion: "puresoc.rbac.partner_tenant_session.v1",
        partnerId: session.partnerId,
        tenantSessionId: session.id,
        grantLevel: grant.accessLevel,
        partnerRole: member.role
      },
      createdAt: session.startedAt
    }));
  }
});

const findValidPartnerTenantSession = async (input: {
  partnerRepository: PartnerRepository;
  organizationId: string;
  userId: string;
  now?: () => Date;
}) => {
  const session = await input.partnerRepository.findActiveTenantAccessSessionForActor(input.userId);
  const now = input.now?.() ?? new Date();
  if (!session || session.effectiveOrganizationId !== input.organizationId) {
    return null;
  }

  if (session.expiresAt <= now) {
    await input.partnerRepository.endTenantAccessSession({
      sessionId: session.id,
      endedAt: now,
      endReason: "expired",
      status: "expired"
    });
    return null;
  }

  const [partner, member, grant] = await Promise.all([
    input.partnerRepository.findPartnerById(session.partnerId),
    input.partnerRepository.findPartnerMember(session.partnerId, input.userId),
    input.partnerRepository.findActivePartnerTenantGrant(session.partnerId, input.organizationId)
  ]);
  if (!partner || partner.status !== "active" || !member || member.status !== "active" || !grant) {
    return null;
  }

  return session;
};

const partnerSessionRoleKeys = (
  partnerRole: PartnerMemberRole,
  grantLevel: PartnerTenantAccessLevel
): PureSocRoleKey[] => {
  if (partnerRole === "viewer" || grantLevel === "viewer") {
    return ["auditor"];
  }

  if (partnerRole === "analyst" || grantLevel === "analyst") {
    return ["auditor", "compliance_manager", "security_operator"];
  }

  return ["org_admin", "compliance_manager", "security_operator", "auditor"];
};
