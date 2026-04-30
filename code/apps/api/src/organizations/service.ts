import { randomUUID } from "node:crypto";

import { defaultRoleDefinitions, publicUserView, type AuthenticatedUser } from "@puresoc/auth-core";
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInput {
  actorUserId: string;
  name: string;
  legalName?: string | null;
  primaryCountryCode?: string | null;
  headquartersCountryCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface OrganizationRepository {
  findUserById(userId: string): Promise<AuthenticatedUser | null>;
  createOrganization(input: OrganizationRecord): Promise<OrganizationRecord>;
  addOrganizationMember(input: OrganizationMembershipRecord): Promise<OrganizationMembershipRecord>;
  ensureRole(input: Omit<RoleRecord, "id" | "createdAt">): Promise<RoleRecord>;
  bindRole(input: RoleBindingRecord): Promise<RoleBindingRecord>;
  listOrganizationMembers(organizationId: string): Promise<Array<OrganizationMembershipRecord & { user: AuthenticatedUser }>>;
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
      defaultLocale: "en",
      primaryCountryCode: input.primaryCountryCode ?? null,
      headquartersCountryCode: input.headquartersCountryCode ?? null,
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

  private safeOrganizationView(organization: OrganizationRecord) {
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
}
