import { randomUUID } from "node:crypto";

import { defaultRoleDefinitions, normalizeEmail, type PureSocRoleKey } from "@puresoc/auth-core";
import { InMemoryBillingRepository, type BillingRepository } from "@puresoc/billing-core";
import { InMemoryEvidenceRepository, type EvidenceRepository } from "@puresoc/evidence";
import type {
  CreateLocalAccountInput,
  EmailVerificationTokenRecord,
  IdentityAccountRecord,
  LocalAuthRepository,
  LocalAuthUserRecord,
  LocalCredentialRecord,
  PasswordResetTokenRecord,
  SessionRecord
} from "@puresoc/auth-local";
import type { OidcIdentityRepository, OidcSocialProviderKey } from "@puresoc/auth-oidc";
import type { OrganizationRecord, OrganizationRepository } from "../organizations/service";
import type { OrganizationMembershipRecord, RbacRepository, RoleBindingRecord, RoleRecord } from "../rbac/index";

export interface InMemoryApiRepositorySet {
  identityRepository: InMemoryIdentityOrganizationRbacRepository;
  evidenceRepository: InMemoryEvidenceRepository & EvidenceRepository;
  billingRepository: InMemoryBillingRepository & BillingRepository;
}

export const createInMemoryApiRepositorySet = (): InMemoryApiRepositorySet => ({
  identityRepository: new InMemoryIdentityOrganizationRbacRepository(),
  evidenceRepository: new InMemoryEvidenceRepository(),
  billingRepository: new InMemoryBillingRepository()
});

export class InMemoryIdentityOrganizationRbacRepository
  implements LocalAuthRepository, OidcIdentityRepository, OrganizationRepository, RbacRepository
{
  readonly users = new Map<string, LocalAuthUserRecord>();
  readonly identityAccounts = new Map<string, IdentityAccountRecord>();
  readonly localCredentials = new Map<string, LocalCredentialRecord>();
  readonly sessions = new Map<string, SessionRecord>();
  readonly emailVerificationTokens = new Map<string, EmailVerificationTokenRecord>();
  readonly passwordResetTokens = new Map<string, PasswordResetTokenRecord>();
  readonly organizations = new Map<string, OrganizationRecord>();
  readonly organizationMembers = new Map<string, OrganizationMembershipRecord>();
  readonly roles = new Map<string, RoleRecord>();
  readonly roleBindings = new Map<string, RoleBindingRecord>();

  constructor() {
    const now = new Date("2026-04-28T00:00:00.000Z");
    for (const role of defaultRoleDefinitions) {
      this.roles.set(role.key, {
        id: randomUUID(),
        key: role.key,
        name: role.name,
        description: role.description,
        createdAt: now
      });
    }
  }

  async findUserById(userId: string): Promise<LocalAuthUserRecord | null> {
    return this.users.get(userId) ?? null;
  }

  async findUsersByEmail(email: string): Promise<LocalAuthUserRecord[]> {
    const normalizedEmail = normalizeEmail(email);
    return [...this.users.values()].filter((user) => user.email === normalizedEmail);
  }

  async findLocalCredentialByEmail(email: string): Promise<LocalCredentialRecord | null> {
    const normalizedEmail = normalizeEmail(email);
    return [...this.localCredentials.values()].find((credential) => credential.email === normalizedEmail) ?? null;
  }

  async findLocalCredentialByUserId(userId: string): Promise<LocalCredentialRecord | null> {
    return [...this.localCredentials.values()].find((credential) => credential.userId === userId) ?? null;
  }

  async createLocalAccount(input: CreateLocalAccountInput): Promise<LocalAuthUserRecord> {
    this.users.set(input.user.id, input.user);
    this.identityAccounts.set(input.identityAccount.id, input.identityAccount);
    this.localCredentials.set(input.credential.id, input.credential);
    this.emailVerificationTokens.set(input.emailVerificationToken.id, input.emailVerificationToken);
    return input.user;
  }

  async findIdentityAccountByProviderSubject(
    providerKey: OidcSocialProviderKey,
    providerSubject: string
  ): Promise<(IdentityAccountRecord & { user: LocalAuthUserRecord }) | null> {
    const account =
      [...this.identityAccounts.values()].find(
        (candidate) => candidate.providerKey === providerKey && candidate.providerSubject === providerSubject
      ) ?? null;
    const user = account ? this.users.get(account.userId) : null;
    return account && user ? { ...account, user } : null;
  }

  async createExternalIdentityAccount(input: {
    user: LocalAuthUserRecord;
    identityAccount: IdentityAccountRecord;
  }): Promise<LocalAuthUserRecord> {
    this.users.set(input.user.id, input.user);
    this.identityAccounts.set(input.identityAccount.id, input.identityAccount);
    return input.user;
  }

  async createIdentityAccount(input: IdentityAccountRecord): Promise<IdentityAccountRecord> {
    const duplicate = [...this.identityAccounts.values()].find(
      (candidate) => candidate.providerKey === input.providerKey && candidate.providerSubject === input.providerSubject
    );
    if (duplicate) {
      throw new Error(`Identity account already exists for provider subject: ${input.providerKey}`);
    }

    this.identityAccounts.set(input.id, input);
    return input;
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
    const credential = this.localCredentials.get(credentialId);
    if (!credential) {
      throw new Error(`Unknown local credential: ${credentialId}`);
    }

    const updated = {
      ...credential,
      ...patch,
      updatedAt: new Date()
    };
    this.localCredentials.set(credentialId, updated);

    if (patch.emailVerifiedAt !== undefined) {
      const user = this.users.get(credential.userId);
      if (user) {
        this.users.set(user.id, {
          ...user,
          emailVerifiedAt: patch.emailVerifiedAt,
          updatedAt: updated.updatedAt
        });
      }
    }

    return updated;
  }

  async updateIdentityLastLogin(providerKey: IdentityAccountRecord["providerKey"], providerSubject: string, lastLoginAt: Date) {
    for (const [id, account] of this.identityAccounts.entries()) {
      if (account.providerKey === providerKey && account.providerSubject === providerSubject) {
        this.identityAccounts.set(id, {
          ...account,
          lastLoginAt
        });
      }
    }
  }

  async createSession(input: SessionRecord): Promise<SessionRecord> {
    this.sessions.set(input.id, input);
    return input;
  }

  async findSessionByHash(sessionHash: string): Promise<(SessionRecord & { user: LocalAuthUserRecord }) | null> {
    const session = [...this.sessions.values()].find((candidate) => candidate.sessionHash === sessionHash);
    const user = session ? this.users.get(session.userId) : null;

    return session && user ? { ...session, user } : null;
  }

  async updateSessionActiveOrganization(sessionId: string, activeOrganizationId: string | null): Promise<SessionRecord> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`);
    }

    const updated = {
      ...session,
      activeOrganizationId
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<SessionRecord | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const updated = {
      ...session,
      revokedAt
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async createPasswordResetToken(input: PasswordResetTokenRecord): Promise<PasswordResetTokenRecord> {
    this.passwordResetTokens.set(input.id, input);
    return input;
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    return [...this.passwordResetTokens.values()].find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async markPasswordResetTokenUsed(tokenId: string, usedAt: Date): Promise<void> {
    const token = this.passwordResetTokens.get(tokenId);
    if (token) {
      this.passwordResetTokens.set(tokenId, {
        ...token,
        usedAt
      });
    }
  }

  async findEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationTokenRecord | null> {
    return [...this.emailVerificationTokens.values()].find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async markEmailVerificationTokenUsed(tokenId: string, usedAt: Date): Promise<void> {
    const token = this.emailVerificationTokens.get(tokenId);
    if (token) {
      this.emailVerificationTokens.set(tokenId, {
        ...token,
        usedAt
      });
    }
  }

  async createOrganization(input: OrganizationRecord): Promise<OrganizationRecord> {
    this.organizations.set(input.id, input);
    return input;
  }

  async addOrganizationMember(input: OrganizationMembershipRecord): Promise<OrganizationMembershipRecord> {
    this.organizationMembers.set(input.id, input);
    return input;
  }

  async ensureRole(input: Omit<RoleRecord, "id" | "createdAt">): Promise<RoleRecord> {
    const existing = [...this.roles.values()].find((role) => role.key === input.key);
    if (existing) {
      return existing;
    }

    const role = {
      id: randomUUID(),
      key: input.key,
      name: input.name,
      description: input.description,
      createdAt: new Date()
    };
    this.roles.set(role.id, role);
    return role;
  }

  async bindRole(input: RoleBindingRecord): Promise<RoleBindingRecord> {
    this.roleBindings.set(input.id, input);
    return input;
  }

  async listOrganizationMembers(organizationId: string) {
    return [...this.organizationMembers.values()]
      .filter((member) => member.organizationId === organizationId)
      .map((member) => {
        const user = this.users.get(member.userId);
        if (!user) {
          throw new Error(`Organization member references unknown user: ${member.userId}`);
        }
        return { ...member, user };
      });
  }

  async listOrganizationsForUser(userId: string) {
    return [...this.organizationMembers.values()]
      .filter((member) => member.userId === userId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((member) => {
        const organization = this.organizations.get(member.organizationId);
        if (!organization) {
          throw new Error(`Organization membership references unknown organization: ${member.organizationId}`);
        }
        const roleKeys = [...this.roleBindings.values()]
          .filter((binding) => binding.organizationId === member.organizationId && binding.userId === userId)
          .map((binding) => binding.roleKey);
        return {
          organization,
          membership: member,
          roleKeys
        };
      });
  }

  async findMembership(organizationId: string, userId: string): Promise<OrganizationMembershipRecord | null> {
    return (
      [...this.organizationMembers.values()].find(
        (member) => member.organizationId === organizationId && member.userId === userId
      ) ?? null
    );
  }

  async findRoleBindings(organizationId: string, userId: string): Promise<RoleBindingRecord[]> {
    return [...this.roleBindings.values()].filter(
      (binding) => binding.organizationId === organizationId && binding.userId === userId
    );
  }

  async addRoleBindingForTest(input: {
    organizationId: string;
    userId: string;
    roleKey: PureSocRoleKey;
  }): Promise<RoleBindingRecord> {
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
      roleKey: input.roleKey,
      scopeJson: {},
      createdAt: new Date()
    });
  }
}
