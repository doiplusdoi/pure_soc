import { randomUUID } from "node:crypto";

import {
  AuthError,
  defaultRoleDefinitions,
  isPureSocRoleKey,
  normalizeEmail,
  publicUserView,
  type AuthenticatedUser,
  type OrganizationMemberStatus,
  type PureSocRoleKey
} from "@puresoc/auth-core";
import { createExpiringSecretToken, hashSecretToken, isTokenExpired } from "@puresoc/auth-local";
import type { LocalAuthAuditWriter } from "@puresoc/auth-local";
import type { OrganizationMembershipRecord, RoleBindingRecord, RoleRecord } from "../rbac/index";

export interface OrganizationRecord {
  id: string;
  name: string;
  legalName?: string | null;
  billingStatus: string;
  defaultLocale: string;
  primaryCountryCode?: string | null;
  headquartersCountryCode?: string | null;
  logoDataUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInput {
  actorUserId: string;
  name: string;
  legalName?: string | null;
  defaultLocale?: string | null;
  primaryCountryCode?: string | null;
  headquartersCountryCode?: string | null;
  logoDataUrl?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type OrganizationInvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface OrganizationInvitationRecord {
  id: string;
  organizationId: string;
  invitedEmail: string;
  invitedRoleKey: PureSocRoleKey;
  tokenHash: string;
  invitedByUserId: string;
  status: OrganizationInvitationStatus;
  expiresAt: Date;
  acceptedByUserId?: string | null;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInvitationInput {
  actorUserId: string;
  organizationId: string;
  email: string;
  roleKey?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deliverInvitationToken?: (input: {
    organizationId: string;
    invitationId: string;
    email: string;
    roleKey: PureSocRoleKey;
    invitedByUserId: string;
    plaintextToken: string;
    expiresAt: Date;
  }) => void;
}

export interface AcceptOrganizationInvitationInput {
  actorUserId: string;
  organizationId: string;
  plaintextToken: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface OrganizationRepository {
  findUserById(userId: string): Promise<AuthenticatedUser | null>;
  createOrganization(input: OrganizationRecord): Promise<OrganizationRecord>;
  updateOrganization(input: {
    organizationId: string;
    name?: string;
    legalName?: string | null;
    primaryCountryCode?: string | null;
    headquartersCountryCode?: string | null;
    logoDataUrl?: string | null;
    updatedAt: Date;
  }): Promise<OrganizationRecord>;
  addOrganizationMember(input: OrganizationMembershipRecord): Promise<OrganizationMembershipRecord>;
  updateOrganizationMemberStatus(input: {
    memberId: string;
    status: OrganizationMemberStatus;
    updatedAt: Date;
  }): Promise<OrganizationMembershipRecord>;
  ensureRole(input: Omit<RoleRecord, "id" | "createdAt">): Promise<RoleRecord>;
  bindRole(input: RoleBindingRecord): Promise<RoleBindingRecord>;
  findMembership(organizationId: string, userId: string): Promise<OrganizationMembershipRecord | null>;
  createOrganizationInvitation(input: OrganizationInvitationRecord): Promise<OrganizationInvitationRecord>;
  findOrganizationInvitationByTokenHash(tokenHash: string): Promise<OrganizationInvitationRecord | null>;
  markOrganizationInvitationAccepted(input: {
    invitationId: string;
    acceptedByUserId: string;
    acceptedAt: Date;
  }): Promise<OrganizationInvitationRecord>;
  markOrganizationInvitationExpired(input: {
    invitationId: string;
    expiredAt: Date;
  }): Promise<OrganizationInvitationRecord>;
  listOrganizationMembers(organizationId: string): Promise<Array<OrganizationMembershipRecord & { user: AuthenticatedUser }>>;
  listOrganizationsForUser(userId: string): Promise<
    Array<{
      organization: OrganizationRecord;
      membership: OrganizationMembershipRecord;
      roleKeys: PureSocRoleKey[];
    }>
  >;
}

export class OrganizationService {
  private readonly repository: OrganizationRepository;
  private readonly auditWriter: LocalAuthAuditWriter;
  private readonly now: () => Date;

  constructor(options: { repository: OrganizationRepository; auditWriter: LocalAuthAuditWriter; now?: () => Date }) {
    this.repository = options.repository;
    this.auditWriter = options.auditWriter;
    this.now = options.now ?? (() => new Date());
  }

  async createOrganization(input: CreateOrganizationInput) {
    const actor = await this.repository.findUserById(input.actorUserId);
    if (!actor) {
      throw new Error("Cannot create organization for an unknown user.");
    }

    const now = this.now();
    const organization = await this.repository.createOrganization({
      id: randomUUID(),
      name: input.name,
      legalName: input.legalName ?? null,
      billingStatus: "none",
      defaultLocale: input.defaultLocale?.trim() || "en",
      primaryCountryCode: input.primaryCountryCode ?? null,
      headquartersCountryCode: input.headquartersCountryCode ?? null,
      logoDataUrl: normalizeOrganizationLogoDataUrl(input.logoDataUrl),
      createdAt: now,
      updatedAt: now
    });

    await this.repository.addOrganizationMember({
      id: randomUUID(),
      organizationId: organization.id,
      userId: input.actorUserId,
      status: "active",
      createdAt: now,
      updatedAt: now
    });

    const ownerRoleDefinition = defaultRoleDefinitions.find((role) => role.key === "owner");
    if (!ownerRoleDefinition) {
      throw new Error("Owner role definition is missing.");
    }

    const ownerRole = await this.repository.ensureRole(ownerRoleDefinition);
    await this.repository.bindRole({
      id: randomUUID(),
      organizationId: organization.id,
      userId: input.actorUserId,
      roleId: ownerRole.id,
      roleKey: "owner",
      scopeJson: {},
      createdAt: now
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: organization.id,
      targetType: "organization",
      targetId: organization.id,
      action: "organization_created",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        name: organization.name,
        legalName: organization.legalName,
        primaryCountryCode: organization.primaryCountryCode
      }
    });
    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: organization.id,
      targetType: "role_binding",
      targetId: input.actorUserId,
      action: "role_changed",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        roleKey: "owner"
      }
    });

    return {
      organization: this.safeOrganizationView(organization),
      member: {
        user: publicUserView(actor),
        status: "active",
        roleKeys: ["owner"]
      }
    };
  }

  async createPartnerCustomerOrganization(input: CreateOrganizationInput) {
    if (!(await this.repository.findUserById(input.actorUserId))) {
      throw new Error("Cannot create partner customer organization for an unknown user.");
    }

    const now = this.now();
    const organization = await this.repository.createOrganization({
      id: randomUUID(),
      name: input.name,
      legalName: input.legalName ?? null,
      billingStatus: "none",
      defaultLocale: input.defaultLocale?.trim() || "en",
      primaryCountryCode: input.primaryCountryCode ?? null,
      headquartersCountryCode: input.headquartersCountryCode ?? null,
      logoDataUrl: normalizeOrganizationLogoDataUrl(input.logoDataUrl),
      createdAt: now,
      updatedAt: now
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: organization.id,
      targetType: "organization",
      targetId: organization.id,
      action: "organization_created",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        createdThrough: "partner_portfolio",
        name: organization.name,
        legalName: organization.legalName,
        primaryCountryCode: organization.primaryCountryCode
      }
    });

    return {
      organization: this.safeOrganizationView(organization)
    };
  }

  async updateOrganization(input: {
    actorUserId: string;
    organizationId: string;
    name?: string;
    legalName?: string | null;
    primaryCountryCode?: string | null;
    headquartersCountryCode?: string | null;
    logoDataUrl?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const logoDataUrl = normalizeOrganizationLogoDataUrl(input.logoDataUrl);
    const updated = await this.repository.updateOrganization({
      organizationId: input.organizationId,
      name: input.name,
      legalName: input.legalName,
      primaryCountryCode: input.primaryCountryCode,
      headquartersCountryCode: input.headquartersCountryCode,
      logoDataUrl,
      updatedAt: this.now()
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "organization",
      targetId: input.organizationId,
      action: "organization_updated",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        name: updated.name,
        legalName: updated.legalName,
        primaryCountryCode: updated.primaryCountryCode,
        headquartersCountryCode: updated.headquartersCountryCode,
        logoConfigured: Boolean(updated.logoDataUrl),
        logoMimeType: logoMimeType(updated.logoDataUrl)
      }
    });

    return {
      organization: this.safeOrganizationView(updated)
    };
  }

  async createInvitation(input: CreateOrganizationInvitationInput) {
    const actor = await this.repository.findUserById(input.actorUserId);
    if (!actor) {
      throw new Error("Cannot create organization invitation for an unknown user.");
    }
    if (!actor.emailVerifiedAt) {
      throw new AuthError("email_not_verified", "Verify your account email before inviting organization members.", 403);
    }

    const invitedEmail = normalizeEmail(input.email);
    if (!invitedEmail.includes("@")) {
      throw new AuthError("invalid_request", "Invitation email must be valid.", 400);
    }

    const invitedRoleKey = this.parseInviteRole(input.roleKey ?? "auditor");
    const now = this.now();
    const token = createExpiringSecretToken({
      now,
      ttlMs: 1000 * 60 * 60 * 24 * 7
    });
    const invitation = await this.repository.createOrganizationInvitation({
      id: randomUUID(),
      organizationId: input.organizationId,
      invitedEmail,
      invitedRoleKey,
      tokenHash: token.tokenHash,
      invitedByUserId: input.actorUserId,
      status: "pending",
      expiresAt: token.expiresAt,
      acceptedByUserId: null,
      acceptedAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now
    });

    input.deliverInvitationToken?.({
      organizationId: input.organizationId,
      invitationId: invitation.id,
      email: invitedEmail,
      roleKey: invitedRoleKey,
      invitedByUserId: input.actorUserId,
      plaintextToken: token.plaintextToken,
      expiresAt: token.expiresAt
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "organization_invitation",
      targetId: invitation.id,
      action: "member_invited",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        invitedEmail,
        roleKey: invitedRoleKey,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString()
      }
    });

    return {
      invitation: this.safeInvitationView(invitation)
    };
  }

  async acceptInvitation(input: AcceptOrganizationInvitationInput) {
    const actor = await this.repository.findUserById(input.actorUserId);
    if (!actor) {
      throw new AuthError("session_invalid", "Authenticated user was not found.", 401);
    }
    if (!actor.emailVerifiedAt) {
      throw new AuthError("email_not_verified", "Verify the invited email address before accepting an invitation.", 403);
    }

    const now = this.now();
    const tokenHash = hashSecretToken(input.plaintextToken);
    const invitation = await this.repository.findOrganizationInvitationByTokenHash(tokenHash);
    if (!invitation || invitation.organizationId !== input.organizationId || invitation.status !== "pending") {
      throw new AuthError("invalid_request", "Invitation token is invalid or no longer usable.", 400);
    }
    if (isTokenExpired({ tokenHash: invitation.tokenHash, expiresAt: invitation.expiresAt, usedAt: null }, now)) {
      await this.repository.markOrganizationInvitationExpired({
        invitationId: invitation.id,
        expiredAt: now
      });
      throw new AuthError("invalid_request", "Invitation token is expired.", 400);
    }
    if (normalizeEmail(actor.email) !== invitation.invitedEmail) {
      throw new AuthError("forbidden", "Invitation token does not match the authenticated user email.", 403);
    }

    const existingMembership = await this.repository.findMembership(input.organizationId, actor.id);
    const membership =
      existingMembership === null
        ? await this.repository.addOrganizationMember({
            id: randomUUID(),
            organizationId: input.organizationId,
            userId: actor.id,
            status: "active",
            createdAt: now,
            updatedAt: now
          })
        : existingMembership.status === "active"
          ? existingMembership
          : await this.repository.updateOrganizationMemberStatus({
              memberId: existingMembership.id,
              status: "active",
              updatedAt: now
            });

    const roleDefinition = defaultRoleDefinitions.find((role) => role.key === invitation.invitedRoleKey);
    if (!roleDefinition) {
      throw new Error(`Invitation references unknown role: ${invitation.invitedRoleKey}`);
    }
    const role = await this.repository.ensureRole(roleDefinition);
    await this.repository.bindRole({
      id: randomUUID(),
      organizationId: input.organizationId,
      userId: actor.id,
      roleId: role.id,
      roleKey: role.key,
      scopeJson: {},
      createdAt: now
    });
    const acceptedInvitation = await this.repository.markOrganizationInvitationAccepted({
      invitationId: invitation.id,
      acceptedByUserId: actor.id,
      acceptedAt: now
    });

    await this.auditWriter.write({
      actorUserId: actor.id,
      organizationId: input.organizationId,
      targetType: "organization_invitation",
      targetId: invitation.id,
      action: "member_invitation_accepted",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        invitedEmail: invitation.invitedEmail,
        roleKey: invitation.invitedRoleKey,
        status: acceptedInvitation.status
      }
    });
    await this.auditWriter.write({
      actorUserId: actor.id,
      organizationId: input.organizationId,
      targetType: "role_binding",
      targetId: actor.id,
      action: "role_changed",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      afterJson: {
        roleKey: role.key
      }
    });

    return {
      invitation: this.safeInvitationView(acceptedInvitation),
      member: {
        id: membership.id,
        organizationId: membership.organizationId,
        user: publicUserView(actor),
        status: membership.status,
        roleKeys: [role.key]
      }
    };
  }

  async listMembers(organizationId: string) {
    const members = await this.repository.listOrganizationMembers(organizationId);

    return {
      members: members.map((member) => ({
        id: member.id,
        organizationId: member.organizationId,
        user: publicUserView(member.user),
        status: member.status
      }))
    };
  }

  async listOrganizationsForUser(userId: string) {
    const memberships = await this.repository.listOrganizationsForUser(userId);

    return {
      organizations: memberships.map(({ organization, membership, roleKeys }) => ({
        organization: this.safeOrganizationView(organization),
        membership: {
          id: membership.id,
          status: membership.status
        },
        roleKeys
      }))
    };
  }

  private safeOrganizationView(organization: OrganizationRecord) {
    return {
      id: organization.id,
      name: organization.name,
      legalName: organization.legalName ?? null,
      billingStatus: organization.billingStatus,
      defaultLocale: organization.defaultLocale,
      primaryCountryCode: organization.primaryCountryCode ?? null,
      headquartersCountryCode: organization.headquartersCountryCode ?? null,
      logoDataUrl: organization.logoDataUrl ?? null,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString()
    };
  }

  private parseInviteRole(roleKey: string): PureSocRoleKey {
    if (!isPureSocRoleKey(roleKey) || !inviteableOrganizationRoleKeys.includes(roleKey)) {
      throw new AuthError("invalid_request", "Invitation role is not supported for owner-managed invites.", 400);
    }

    return roleKey;
  }

  private safeInvitationView(invitation: OrganizationInvitationRecord) {
    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      invitedEmail: invitation.invitedEmail,
      roleKey: invitation.invitedRoleKey,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString()
    };
  }
}

const inviteableOrganizationRoleKeys: PureSocRoleKey[] = [
  "org_admin",
  "compliance_manager",
  "security_operator",
  "remediation_approver",
  "auditor",
  "billing_admin"
];

const maxOrganizationLogoDataUrlBytes = 48_000;
const organizationLogoPattern = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i;

export const normalizeOrganizationLogoDataUrl = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim();
  if (!organizationLogoPattern.test(normalized)) {
    throw new AuthError("invalid_request", "Company logo must be a PNG, JPEG, or WebP data URL.", 400);
  }
  if (Buffer.byteLength(normalized, "utf8") > maxOrganizationLogoDataUrlBytes) {
    throw new AuthError("invalid_request", "Company logo must be smaller than 48 KB after encoding.", 400);
  }

  return normalized;
};

const logoMimeType = (value: string | null | undefined): string | null => {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,/i.exec(value ?? "");
  return match?.[1].toLowerCase() ?? null;
};
