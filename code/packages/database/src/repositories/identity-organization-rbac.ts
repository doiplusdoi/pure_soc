import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

type AuthProviderKey = "local" | "microsoft_entra" | "google" | "github" | "keycloak_broker";
type OidcSocialProviderKey = Extract<AuthProviderKey, "microsoft_entra" | "google" | "github">;
type OrganizationMemberStatus = "invited" | "active" | "suspended" | "removed";
type OrganizationInvitationStatus = "pending" | "accepted" | "revoked" | "expired";
type PureSocRoleKey =
  | "owner"
  | "org_admin"
  | "compliance_manager"
  | "security_operator"
  | "remediation_approver"
  | "auditor"
  | "billing_admin"
  | "regulatory_admin";

interface LocalAuthUserRecord {
  id: string;
  email: string;
  displayName?: string | null;
  emailVerifiedAt?: Date | null;
  disabledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LocalCredentialRecord {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  passwordHashAlgorithm: "argon2id";
  passwordUpdatedAt: Date;
  emailVerifiedAt?: Date | null;
  failedLoginCount: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IdentityAccountRecord {
  id: string;
  userId: string;
  providerKey: AuthProviderKey;
  providerSubject: string;
  providerEmail?: string | null;
  displayName?: string | null;
  createdAt: Date;
  lastLoginAt?: Date | null;
}

interface SessionRecord {
  id: string;
  userId: string;
  activeOrganizationId?: string | null;
  sessionHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}

interface EmailVerificationTokenRecord {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface OrganizationInvitationRecordContract {
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

interface CreateLocalAccountInput {
  user: LocalAuthUserRecord;
  identityAccount: IdentityAccountRecord;
  credential: LocalCredentialRecord;
  emailVerificationToken: EmailVerificationTokenRecord;
}

type IdentityOrganizationRbacTransaction = Pick<
  Prisma.TransactionClient,
  | "emailVerificationToken"
  | "identityAccount"
  | "localCredential"
  | "organization"
  | "organizationInvitation"
  | "organizationMember"
  | "passwordResetToken"
  | "role"
  | "roleBinding"
  | "session"
  | "user"
>;

export type PrismaIdentityOrganizationRbacClient = Pick<PrismaClient, keyof IdentityOrganizationRbacTransaction> & {
  $transaction<T>(callback: (tx: IdentityOrganizationRbacTransaction) => Promise<T>): Promise<T>;
};

export interface OrganizationRecordContract {
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

export interface OrganizationMembershipRecordContract {
  id: string;
  organizationId: string;
  userId: string;
  status: OrganizationMemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleRecordContract {
  id: string;
  key: PureSocRoleKey;
  name: string;
  description?: string | null;
  createdAt: Date;
}

export interface RoleBindingRecordContract {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  roleKey: PureSocRoleKey;
  scopeJson: Record<string, unknown>;
  createdAt: Date;
}

export class PrismaIdentityOrganizationRbacRepository {
  constructor(private readonly client: PrismaIdentityOrganizationRbacClient) {}

  async findUserById(userId: string): Promise<LocalAuthUserRecord | null> {
    const row = await this.client.user.findUnique({
      where: {
        id: userId
      }
    });

    return row ? this.fromUserRow(row) : null;
  }

  async findUsersByEmail(email: string): Promise<LocalAuthUserRecord[]> {
    const rows = await this.client.user.findMany({
      where: {
        email: normalizeEmail(email)
      }
    });

    return Promise.all(rows.map((row) => this.fromUserRow(row)));
  }

  async findLocalCredentialByEmail(email: string): Promise<LocalCredentialRecord | null> {
    const row = await this.client.localCredential.findUnique({
      where: {
        email: normalizeEmail(email)
      }
    });

    return row ? fromLocalCredentialRow(row) : null;
  }

  async findLocalCredentialByUserId(userId: string): Promise<LocalCredentialRecord | null> {
    const row = await this.client.localCredential.findUnique({
      where: {
        userId
      }
    });

    return row ? fromLocalCredentialRow(row) : null;
  }

  async createLocalAccount(input: CreateLocalAccountInput): Promise<LocalAuthUserRecord> {
    await this.client.$transaction(async (tx) => {
      await tx.user.create({
        data: toUserCreate(input.user)
      });
      await tx.identityAccount.create({
        data: toIdentityAccountCreate(input.identityAccount)
      });
      await tx.localCredential.create({
        data: toLocalCredentialCreate(input.credential)
      });
      await tx.emailVerificationToken.create({
        data: toEmailVerificationTokenCreate(input.emailVerificationToken)
      });
    });

    return cloneUser(input.user);
  }

  async findIdentityAccountByProviderSubject(
    providerKey: OidcSocialProviderKey,
    providerSubject: string
  ): Promise<(IdentityAccountRecord & { user: LocalAuthUserRecord }) | null> {
    const account = await this.client.identityAccount.findFirst({
      where: {
        providerKey,
        providerSubject
      }
    });

    if (!account) {
      return null;
    }

    const user = await this.findUserById(account.userId);
    return user ? { ...fromIdentityAccountRow(account), user } : null;
  }

  async createExternalIdentityAccount(input: {
    user: LocalAuthUserRecord;
    identityAccount: IdentityAccountRecord;
  }): Promise<LocalAuthUserRecord> {
    await this.client.$transaction(async (tx) => {
      await tx.user.create({
        data: toUserCreate(input.user)
      });
      await tx.identityAccount.create({
        data: toIdentityAccountCreate(input.identityAccount)
      });
    });

    return cloneUser(input.user);
  }

  async createIdentityAccount(input: IdentityAccountRecord): Promise<IdentityAccountRecord> {
    const existing = await this.client.identityAccount.findFirst({
      where: {
        providerKey: input.providerKey,
        providerSubject: input.providerSubject
      }
    });
    if (existing) {
      throw new Error(`Identity account already exists for provider subject: ${input.providerKey}`);
    }

    const row = await this.client.identityAccount.create({
      data: toIdentityAccountCreate(input)
    });
    return fromIdentityAccountRow(row);
  }

  async updateLocalCredential(
    credentialId: string,
    patch: Partial<
      Pick<
        LocalCredentialRecord,
        "failedLoginCount" | "lockedUntil" | "passwordHash" | "passwordUpdatedAt" | "emailVerifiedAt"
      >
    >
  ): Promise<LocalCredentialRecord> {
    const row = await this.client.localCredential.update({
      where: {
        id: credentialId
      },
      data: {
        ...stripUndefined({
          failedLoginCount: patch.failedLoginCount,
          lockedUntil: patch.lockedUntil,
          passwordHash: patch.passwordHash,
          passwordUpdatedAt: patch.passwordUpdatedAt,
          emailVerifiedAt: patch.emailVerifiedAt
        }),
        updatedAt: new Date()
      }
    });

    return fromLocalCredentialRow(row);
  }

  async updateIdentityLastLogin(providerKey: AuthProviderKey, providerSubject: string, lastLoginAt: Date): Promise<void> {
    await this.client.identityAccount.updateMany({
      where: {
        providerKey,
        providerSubject
      },
      data: {
        lastLoginAt
      }
    });
  }

  async createSession(input: SessionRecord): Promise<SessionRecord> {
    const row = await this.client.session.create({
      data: toSessionCreate(input)
    });

    return fromSessionRow(row);
  }

  async findSessionByHash(sessionHash: string): Promise<(SessionRecord & { user: LocalAuthUserRecord }) | null> {
    const session = await this.client.session.findFirst({
      where: {
        sessionHash
      }
    });

    if (!session) {
      return null;
    }

    const user = await this.findUserById(session.userId);
    return user ? { ...fromSessionRow(session), user } : null;
  }

  async updateSessionActiveOrganization(sessionId: string, activeOrganizationId: string | null): Promise<SessionRecord> {
    const row = await this.client.session.update({
      where: {
        id: sessionId
      },
      data: {
        activeOrganizationId
      }
    });

    return fromSessionRow(row);
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<SessionRecord | null> {
    const existing = await this.client.session.findUnique({
      where: {
        id: sessionId
      }
    });
    if (!existing) {
      return null;
    }

    const row = await this.client.session.update({
      where: {
        id: sessionId
      },
      data: {
        revokedAt
      }
    });

    return fromSessionRow(row);
  }

  async createPasswordResetToken(input: PasswordResetTokenRecord): Promise<PasswordResetTokenRecord> {
    const row = await this.client.passwordResetToken.create({
      data: toPasswordResetTokenCreate(input)
    });

    return fromPasswordResetTokenRow(row);
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const row = await this.client.passwordResetToken.findFirst({
      where: {
        tokenHash
      }
    });

    return row ? fromPasswordResetTokenRow(row) : null;
  }

  async markPasswordResetTokenUsed(tokenId: string, usedAt: Date): Promise<void> {
    await this.client.passwordResetToken.update({
      where: {
        id: tokenId
      },
      data: {
        usedAt
      }
    });
  }

  async findEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationTokenRecord | null> {
    const row = await this.client.emailVerificationToken.findFirst({
      where: {
        tokenHash
      }
    });

    return row ? fromEmailVerificationTokenRow(row) : null;
  }

  async markEmailVerificationTokenUsed(tokenId: string, usedAt: Date): Promise<void> {
    await this.client.emailVerificationToken.update({
      where: {
        id: tokenId
      },
      data: {
        usedAt
      }
    });
  }

  async createOrganization(input: OrganizationRecordContract): Promise<OrganizationRecordContract> {
    const row = await this.client.organization.create({
      data: toOrganizationCreate(input)
    });

    return fromOrganizationRow(row);
  }

  async updateOrganization(input: {
    organizationId: string;
    name?: string;
    legalName?: string | null;
    primaryCountryCode?: string | null;
    headquartersCountryCode?: string | null;
    updatedAt: Date;
  }): Promise<OrganizationRecordContract> {
    const row = await this.client.organization.update({
      where: {
        id: input.organizationId
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.primaryCountryCode !== undefined ? { primaryCountryCode: input.primaryCountryCode } : {}),
        ...(input.headquartersCountryCode !== undefined
          ? { headquartersCountryCode: input.headquartersCountryCode }
          : {}),
        updatedAt: input.updatedAt
      }
    });

    return fromOrganizationRow(row);
  }

  async addOrganizationMember(
    input: OrganizationMembershipRecordContract
  ): Promise<OrganizationMembershipRecordContract> {
    const row = await this.client.organizationMember.create({
      data: toOrganizationMemberCreate(input)
    });

    return fromOrganizationMemberRow(row);
  }

  async updateOrganizationMemberStatus(input: {
    memberId: string;
    status: OrganizationMemberStatus;
    updatedAt: Date;
  }): Promise<OrganizationMembershipRecordContract> {
    const row = await this.client.organizationMember.update({
      where: {
        id: input.memberId
      },
      data: {
        status: input.status,
        updatedAt: input.updatedAt
      }
    });

    return fromOrganizationMemberRow(row);
  }

  async createOrganizationInvitation(
    input: OrganizationInvitationRecordContract
  ): Promise<OrganizationInvitationRecordContract> {
    const row = await this.client.organizationInvitation.create({
      data: toOrganizationInvitationCreate(input)
    });

    return fromOrganizationInvitationRow(row);
  }

  async findOrganizationInvitationByTokenHash(tokenHash: string): Promise<OrganizationInvitationRecordContract | null> {
    const row = await this.client.organizationInvitation.findFirst({
      where: {
        tokenHash
      }
    });

    return row ? fromOrganizationInvitationRow(row) : null;
  }

  async markOrganizationInvitationAccepted(input: {
    invitationId: string;
    acceptedByUserId: string;
    acceptedAt: Date;
  }): Promise<OrganizationInvitationRecordContract> {
    const row = await this.client.organizationInvitation.update({
      where: {
        id: input.invitationId
      },
      data: {
        acceptedAt: input.acceptedAt,
        acceptedByUserId: input.acceptedByUserId,
        status: "accepted",
        updatedAt: input.acceptedAt
      }
    });

    return fromOrganizationInvitationRow(row);
  }

  async markOrganizationInvitationExpired(input: {
    invitationId: string;
    expiredAt: Date;
  }): Promise<OrganizationInvitationRecordContract> {
    const row = await this.client.organizationInvitation.update({
      where: {
        id: input.invitationId
      },
      data: {
        status: "expired",
        updatedAt: input.expiredAt
      }
    });

    return fromOrganizationInvitationRow(row);
  }

  async ensureRole(input: Omit<RoleRecordContract, "id" | "createdAt">): Promise<RoleRecordContract> {
    const row = await this.client.role.upsert({
      where: {
        key: input.key
      },
      update: {
        name: input.name,
        description: input.description ?? null
      },
      create: {
        id: randomUUID(),
        key: input.key,
        name: input.name,
        description: input.description ?? null
      }
    });

    return fromRoleRow(row);
  }

  async bindRole(input: RoleBindingRecordContract): Promise<RoleBindingRecordContract> {
    const existing = await this.client.roleBinding.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        roleId: input.roleId
      }
    });

    const row =
      existing ??
      (await this.client.roleBinding.create({
        data: toRoleBindingCreate(input)
      }));

    return fromRoleBindingRow(row, input.roleKey);
  }

  async listOrganizationMembers(
    organizationId: string
  ): Promise<Array<OrganizationMembershipRecordContract & { user: LocalAuthUserRecord }>> {
    const members = await this.client.organizationMember.findMany({
      where: {
        organizationId
      }
    });
    const users = await this.loadUsersByIds(members.map((member) => member.userId));

    return members.map((member) => {
      const user = users.get(member.userId);
      if (!user) {
        throw new Error(`Organization member references unknown user: ${member.userId}`);
      }
      return {
        ...fromOrganizationMemberRow(member),
        user
      };
    });
  }

  async listOrganizationsForUser(userId: string): Promise<
    Array<{
      organization: OrganizationRecordContract;
      membership: OrganizationMembershipRecordContract;
      roleKeys: PureSocRoleKey[];
    }>
  > {
    const members = await this.client.organizationMember.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const organizationIds = members.map((member) => member.organizationId);
    const organizations =
      organizationIds.length === 0
        ? []
        : await this.client.organization.findMany({
            where: {
              id: {
                in: [...new Set(organizationIds)]
              }
            }
          });
    const organizationById = new Map(organizations.map((organization) => [organization.id, fromOrganizationRow(organization)]));
    const bindings =
      organizationIds.length === 0
        ? []
        : await this.client.roleBinding.findMany({
            where: {
              userId,
              organizationId: {
                in: [...new Set(organizationIds)]
              }
            }
          });
    const roles = await this.loadRolesByIds(bindings.map((binding) => binding.roleId));

    return members.map((member) => {
      const organization = organizationById.get(member.organizationId);
      if (!organization) {
        throw new Error(`Organization membership references unknown organization: ${member.organizationId}`);
      }

      return {
        organization,
        membership: fromOrganizationMemberRow(member),
        roleKeys: bindings
          .filter((binding) => binding.organizationId === member.organizationId)
          .map((binding) => roles.get(binding.roleId)?.key)
          .filter((roleKey): roleKey is PureSocRoleKey => Boolean(roleKey))
      };
    });
  }

  async findMembership(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembershipRecordContract | null> {
    const row = await this.client.organizationMember.findFirst({
      where: {
        organizationId,
        userId
      }
    });

    return row ? fromOrganizationMemberRow(row) : null;
  }

  async findRoleBindings(organizationId: string, userId: string): Promise<RoleBindingRecordContract[]> {
    const rows = await this.client.roleBinding.findMany({
      where: {
        organizationId,
        userId
      }
    });
    const roles = await this.loadRolesByIds(rows.map((row) => row.roleId));

    return rows
      .map((row) => {
        const role = roles.get(row.roleId);
        return role ? fromRoleBindingRow(row, role.key) : null;
      })
      .filter((binding): binding is RoleBindingRecordContract => binding !== null);
  }

  async addRoleBindingForTest(input: {
    organizationId: string;
    userId: string;
    roleKey: PureSocRoleKey;
  }): Promise<RoleBindingRecordContract> {
    const role = await this.ensureRole({
      key: input.roleKey,
      name: input.roleKey,
      description: null
    });
    return this.bindRole({
      id: randomUUID(),
      organizationId: input.organizationId,
      userId: input.userId,
      roleId: role.id,
      roleKey: role.key,
      scopeJson: {},
      createdAt: new Date()
    });
  }

  private async fromUserRow(row: UserRow): Promise<LocalAuthUserRecord> {
    const localCredential = await this.client.localCredential.findUnique({
      where: {
        userId: row.id
      }
    });
    const externalIdentity = localCredential
      ? null
      : await this.client.identityAccount.findFirst({
          where: {
            userId: row.id
          },
          orderBy: {
            createdAt: "asc"
          }
        });

    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName ?? null,
      emailVerifiedAt: toNullableDate(
        localCredential?.emailVerifiedAt ?? externalIdentity?.lastLoginAt ?? externalIdentity?.createdAt ?? null
      ),
      disabledAt: toNullableDate(row.disabledAt),
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt)
    };
  }

  private async loadUsersByIds(userIds: string[]): Promise<Map<string, LocalAuthUserRecord>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = await this.client.user.findMany({
      where: {
        id: {
          in: [...new Set(userIds)]
        }
      }
    });
    const users = await Promise.all(rows.map((row) => this.fromUserRow(row)));
    return new Map(users.map((user) => [user.id, user]));
  }

  private async loadRolesByIds(roleIds: string[]): Promise<Map<string, RoleRecordContract>> {
    if (roleIds.length === 0) {
      return new Map();
    }

    const rows = await this.client.role.findMany({
      where: {
        id: {
          in: [...new Set(roleIds)]
        }
      }
    });

    const roles = rows
      .map((row) => fromRoleRowOrNull(row))
      .filter((role): role is RoleRecordContract => role !== null);
    return new Map(roles.map((role) => [role.id, role]));
  }
}

type UserRow = {
  id: string;
  email: string;
  displayName?: string | null;
  disabledAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type LocalCredentialRow = {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  passwordHashAlgorithm: string;
  passwordUpdatedAt: Date | string;
  emailVerifiedAt?: Date | string | null;
  failedLoginCount: number;
  lockedUntil?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type IdentityAccountRow = {
  id: string;
  userId: string;
  providerKey: AuthProviderKey;
  providerSubject: string;
  providerEmail?: string | null;
  displayName?: string | null;
  createdAt: Date | string;
  lastLoginAt?: Date | string | null;
};

type SessionRow = {
  id: string;
  userId: string;
  activeOrganizationId?: string | null;
  sessionHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date | string;
  revokedAt?: Date | string | null;
  createdAt: Date | string;
};

type EmailVerificationTokenRow = {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date | string;
  usedAt?: Date | string | null;
  createdAt: Date | string;
};

type PasswordResetTokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date | string;
  usedAt?: Date | string | null;
  createdAt: Date | string;
};

type OrganizationRow = {
  id: string;
  name: string;
  legalName?: string | null;
  billingStatus: string;
  defaultLocale: string;
  primaryCountryCode?: string | null;
  headquartersCountryCode?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OrganizationMemberRow = {
  id: string;
  organizationId: string;
  userId: string;
  status: OrganizationMemberStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OrganizationInvitationRow = {
  id: string;
  organizationId: string;
  invitedEmail: string;
  invitedRoleKey: string;
  tokenHash: string;
  invitedByUserId: string;
  status: OrganizationInvitationStatus;
  expiresAt: Date | string;
  acceptedByUserId?: string | null;
  acceptedAt?: Date | string | null;
  revokedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type RoleRow = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  createdAt: Date | string;
};

type RoleBindingRow = {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  scopeJson?: unknown;
  createdAt: Date | string;
};

const toUserCreate = (user: LocalAuthUserRecord) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName ?? null,
  disabledAt: user.disabledAt ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const toIdentityAccountCreate = (account: IdentityAccountRecord) => ({
  id: account.id,
  userId: account.userId,
  providerKey: account.providerKey,
  providerSubject: account.providerSubject,
  providerEmail: account.providerEmail ?? null,
  displayName: account.displayName ?? null,
  createdAt: account.createdAt,
  lastLoginAt: account.lastLoginAt ?? null
});

const toLocalCredentialCreate = (credential: LocalCredentialRecord) => ({
  id: credential.id,
  userId: credential.userId,
  email: credential.email,
  passwordHash: credential.passwordHash,
  passwordHashAlgorithm: credential.passwordHashAlgorithm,
  passwordUpdatedAt: credential.passwordUpdatedAt,
  emailVerifiedAt: credential.emailVerifiedAt ?? null,
  failedLoginCount: credential.failedLoginCount,
  lockedUntil: credential.lockedUntil ?? null,
  createdAt: credential.createdAt,
  updatedAt: credential.updatedAt
});

const toSessionCreate = (session: SessionRecord) => ({
  id: session.id,
  userId: session.userId,
  activeOrganizationId: session.activeOrganizationId ?? null,
  sessionHash: session.sessionHash,
  ipAddress: session.ipAddress ?? null,
  userAgent: session.userAgent ?? null,
  expiresAt: session.expiresAt,
  revokedAt: session.revokedAt ?? null,
  createdAt: session.createdAt
});

const toEmailVerificationTokenCreate = (token: EmailVerificationTokenRecord) => ({
  id: token.id,
  userId: token.userId,
  email: token.email,
  tokenHash: token.tokenHash,
  expiresAt: token.expiresAt,
  usedAt: token.usedAt ?? null,
  createdAt: token.createdAt
});

const toPasswordResetTokenCreate = (token: PasswordResetTokenRecord) => ({
  id: token.id,
  userId: token.userId,
  tokenHash: token.tokenHash,
  expiresAt: token.expiresAt,
  usedAt: token.usedAt ?? null,
  createdAt: token.createdAt
});

const toOrganizationCreate = (organization: OrganizationRecordContract) => ({
  id: organization.id,
  name: organization.name,
  legalName: organization.legalName ?? null,
  billingStatus: organization.billingStatus,
  defaultLocale: organization.defaultLocale,
  primaryCountryCode: organization.primaryCountryCode ?? null,
  headquartersCountryCode: organization.headquartersCountryCode ?? null,
  createdAt: organization.createdAt,
  updatedAt: organization.updatedAt
});

const toOrganizationMemberCreate = (member: OrganizationMembershipRecordContract) => ({
  id: member.id,
  organizationId: member.organizationId,
  userId: member.userId,
  status: member.status,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt
});

const toOrganizationInvitationCreate = (invitation: OrganizationInvitationRecordContract) => ({
  id: invitation.id,
  organizationId: invitation.organizationId,
  invitedEmail: invitation.invitedEmail,
  invitedRoleKey: invitation.invitedRoleKey,
  tokenHash: invitation.tokenHash,
  invitedByUserId: invitation.invitedByUserId,
  status: invitation.status,
  expiresAt: invitation.expiresAt,
  acceptedByUserId: invitation.acceptedByUserId ?? null,
  acceptedAt: invitation.acceptedAt ?? null,
  revokedAt: invitation.revokedAt ?? null,
  createdAt: invitation.createdAt,
  updatedAt: invitation.updatedAt
});

const toRoleBindingCreate = (binding: RoleBindingRecordContract) => ({
  id: binding.id,
  organizationId: binding.organizationId,
  userId: binding.userId,
  roleId: binding.roleId,
  scopeJson: binding.scopeJson as Prisma.InputJsonValue,
  createdAt: binding.createdAt
});

const fromLocalCredentialRow = (row: LocalCredentialRow): LocalCredentialRecord => ({
  id: row.id,
  userId: row.userId,
  email: row.email,
  passwordHash: row.passwordHash,
  passwordHashAlgorithm: "argon2id",
  passwordUpdatedAt: toDate(row.passwordUpdatedAt),
  emailVerifiedAt: toNullableDate(row.emailVerifiedAt),
  failedLoginCount: row.failedLoginCount,
  lockedUntil: toNullableDate(row.lockedUntil),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt)
});

const fromIdentityAccountRow = (row: IdentityAccountRow): IdentityAccountRecord => ({
  id: row.id,
  userId: row.userId,
  providerKey: row.providerKey,
  providerSubject: row.providerSubject,
  providerEmail: row.providerEmail ?? null,
  displayName: row.displayName ?? null,
  createdAt: toDate(row.createdAt),
  lastLoginAt: toNullableDate(row.lastLoginAt)
});

const fromSessionRow = (row: SessionRow): SessionRecord => ({
  id: row.id,
  userId: row.userId,
  activeOrganizationId: row.activeOrganizationId ?? null,
  sessionHash: row.sessionHash,
  ipAddress: row.ipAddress ?? null,
  userAgent: row.userAgent ?? null,
  expiresAt: toDate(row.expiresAt),
  revokedAt: toNullableDate(row.revokedAt),
  createdAt: toDate(row.createdAt)
});

const fromEmailVerificationTokenRow = (row: EmailVerificationTokenRow): EmailVerificationTokenRecord => ({
  id: row.id,
  userId: row.userId,
  email: row.email,
  tokenHash: row.tokenHash,
  expiresAt: toDate(row.expiresAt),
  usedAt: toNullableDate(row.usedAt),
  createdAt: toDate(row.createdAt)
});

const fromPasswordResetTokenRow = (row: PasswordResetTokenRow): PasswordResetTokenRecord => ({
  id: row.id,
  userId: row.userId,
  tokenHash: row.tokenHash,
  expiresAt: toDate(row.expiresAt),
  usedAt: toNullableDate(row.usedAt),
  createdAt: toDate(row.createdAt)
});

const fromOrganizationRow = (row: OrganizationRow): OrganizationRecordContract => ({
  id: row.id,
  name: row.name,
  legalName: row.legalName ?? null,
  billingStatus: row.billingStatus,
  defaultLocale: row.defaultLocale,
  primaryCountryCode: row.primaryCountryCode ?? null,
  headquartersCountryCode: row.headquartersCountryCode ?? null,
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt)
});

const fromOrganizationMemberRow = (row: OrganizationMemberRow): OrganizationMembershipRecordContract => ({
  id: row.id,
  organizationId: row.organizationId,
  userId: row.userId,
  status: row.status,
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt)
});

const fromOrganizationInvitationRow = (row: OrganizationInvitationRow): OrganizationInvitationRecordContract => {
  if (!isPureSocRoleKey(row.invitedRoleKey)) {
    throw new Error(`Unknown PureSOC invitation role key in database: ${row.invitedRoleKey}`);
  }

  return {
    id: row.id,
    organizationId: row.organizationId,
    invitedEmail: row.invitedEmail,
    invitedRoleKey: row.invitedRoleKey,
    tokenHash: row.tokenHash,
    invitedByUserId: row.invitedByUserId,
    status: row.status,
    expiresAt: toDate(row.expiresAt),
    acceptedByUserId: row.acceptedByUserId ?? null,
    acceptedAt: toNullableDate(row.acceptedAt),
    revokedAt: toNullableDate(row.revokedAt),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
};

const fromRoleRow = (row: RoleRow): RoleRecordContract => {
  const role = fromRoleRowOrNull(row);
  if (!role) {
    throw new Error(`Unknown PureSOC role key in database: ${row.key}`);
  }

  return role;
};

const fromRoleRowOrNull = (row: RoleRow): RoleRecordContract | null =>
  isPureSocRoleKey(row.key)
    ? {
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description ?? null,
        createdAt: toDate(row.createdAt)
      }
    : null;

const fromRoleBindingRow = (row: RoleBindingRow, roleKey: PureSocRoleKey): RoleBindingRecordContract => ({
  id: row.id,
  organizationId: row.organizationId,
  userId: row.userId,
  roleId: row.roleId,
  roleKey,
  scopeJson: isRecord(row.scopeJson) ? row.scopeJson : {},
  createdAt: toDate(row.createdAt)
});

const cloneUser = (user: LocalAuthUserRecord): LocalAuthUserRecord => ({
  ...user,
  displayName: user.displayName ?? null,
  emailVerifiedAt: user.emailVerifiedAt ?? null,
  disabledAt: user.disabledAt ?? null,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt)
});

const toDate = (value: Date | string): Date => (value instanceof Date ? new Date(value) : new Date(value));

const toNullableDate = (value: Date | string | null | undefined): Date | null =>
  value === null || value === undefined ? null : toDate(value);

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const roleKeys = [
  "owner",
  "org_admin",
  "compliance_manager",
  "security_operator",
  "remediation_approver",
  "auditor",
  "billing_admin",
  "regulatory_admin"
] as const satisfies readonly PureSocRoleKey[];

const isPureSocRoleKey = (roleKey: string): roleKey is PureSocRoleKey =>
  roleKeys.some((candidate) => candidate === roleKey);

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
