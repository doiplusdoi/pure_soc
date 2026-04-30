import { AuthError, type OrganizationMemberStatus, type PureSocRoleKey } from "@puresoc/auth-core";

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
