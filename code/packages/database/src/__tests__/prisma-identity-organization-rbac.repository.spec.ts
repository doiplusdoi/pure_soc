import { describe, expect, it } from "vitest";

import {
  PrismaIdentityOrganizationRbacRepository,
  type PrismaIdentityOrganizationRbacClient
} from "../index";

const NOW = new Date("2026-05-02T09:00:00.000Z");
const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const EXTERNAL_USER_ID = "33333333-3333-4333-8333-333333333333";

describe("Prisma identity/session/organization/RBAC repository", () => {
  it("persists local auth records and stores only derived secret hashes", async () => {
    const client = new FakePrismaIdentityOrganizationRbacClient();
    const repository = new PrismaIdentityOrganizationRbacRepository(
      client as unknown as PrismaIdentityOrganizationRbacClient
    );

    await repository.createLocalAccount({
      user: {
        id: "88888888-8888-4888-8888-888888888888",
        email: "owner@example.test",
        displayName: "Owner",
        emailVerifiedAt: null,
        disabledAt: null,
        createdAt: NOW,
        updatedAt: NOW
      },
      identityAccount: {
        id: "99999999-9999-4999-8999-999999999999",
        userId: "88888888-8888-4888-8888-888888888888",
        providerKey: "local",
        providerSubject: "owner@example.test",
        providerEmail: "owner@example.test",
        displayName: "Owner",
        createdAt: NOW,
        lastLoginAt: null
      },
      credential: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        userId: "88888888-8888-4888-8888-888888888888",
        email: "owner@example.test",
        passwordHash: "argon2id:derived-password",
        passwordHashAlgorithm: "argon2id",
        passwordUpdatedAt: NOW,
        emailVerifiedAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: NOW,
        updatedAt: NOW
      },
      emailVerificationToken: {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        userId: "88888888-8888-4888-8888-888888888888",
        email: "owner@example.test",
        tokenHash: "sha256:verification-token-hash",
        expiresAt: new Date(NOW.getTime() + 60_000),
        usedAt: null,
        createdAt: NOW
      }
    });
    await repository.createSession({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      userId: "88888888-8888-4888-8888-888888888888",
      activeOrganizationId: ORG_A,
      sessionHash: "sha256:session-token-hash",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      expiresAt: new Date(NOW.getTime() + 60_000),
      revokedAt: null,
      createdAt: NOW
    });

    expect(client.localCredential.rows[0]?.passwordHash).toBe("argon2id:derived-password");
    expect(client.localCredential.rows[0]?.passwordHash).not.toBe("CorrectHorseBatteryStaple42!");
    expect(client.emailVerificationToken.rows[0]?.tokenHash).toBe("sha256:verification-token-hash");
    expect(client.emailVerificationToken.rows[0]?.tokenHash).not.toBe("plain-verification-token");
    expect(client.session.rows[0]?.sessionHash).toBe("sha256:session-token-hash");
    expect(client.session.rows[0]?.sessionHash).not.toBe("plain-session-token");

    await expect(repository.findLocalCredentialByEmail("Owner@Example.test")).resolves.toMatchObject({
      email: "owner@example.test"
    });
    await expect(repository.findEmailVerificationTokenByHash("sha256:verification-token-hash")).resolves.toMatchObject({
      email: "owner@example.test"
    });
    await expect(repository.findSessionByHash("sha256:session-token-hash")).resolves.toMatchObject({
      user: {
        id: "88888888-8888-4888-8888-888888888888",
        email: "owner@example.test"
      },
      activeOrganizationId: ORG_A
    });

    await repository.revokeSession("cccccccc-cccc-4ccc-8ccc-cccccccccccc", NOW);
    await expect(repository.findSessionByHash("sha256:session-token-hash")).resolves.toMatchObject({
      revokedAt: NOW
    });
  });

  it("preserves provider-subject identity lookup and explicit duplicate rejection", async () => {
    const client = new FakePrismaIdentityOrganizationRbacClient();
    const repository = new PrismaIdentityOrganizationRbacRepository(
      client as unknown as PrismaIdentityOrganizationRbacClient
    );

    await repository.createExternalIdentityAccount({
      user: {
        id: EXTERNAL_USER_ID,
        email: "social@example.test",
        displayName: "Social User",
        emailVerifiedAt: NOW,
        disabledAt: null,
        createdAt: NOW,
        updatedAt: NOW
      },
      identityAccount: {
        id: "44444444-4444-4444-8444-444444444444",
        userId: EXTERNAL_USER_ID,
        providerKey: "google",
        providerSubject: "google-subject-1",
        providerEmail: "social@example.test",
        displayName: "Social User",
        createdAt: NOW,
        lastLoginAt: NOW
      }
    });

    await expect(repository.findIdentityAccountByProviderSubject("google", "google-subject-1")).resolves.toMatchObject({
      providerKey: "google",
      providerSubject: "google-subject-1",
      user: {
        id: EXTERNAL_USER_ID,
        email: "social@example.test",
        emailVerifiedAt: NOW
      }
    });
    await expect(
      repository.createIdentityAccount({
        id: "55555555-5555-4555-8555-555555555555",
        userId: EXTERNAL_USER_ID,
        providerKey: "google",
        providerSubject: "google-subject-1",
        providerEmail: "social@example.test",
        displayName: "Duplicate",
        createdAt: NOW,
        lastLoginAt: NOW
      })
    ).rejects.toThrow("Identity account already exists");
  });

  it("keeps memberships and role bindings organization-scoped", async () => {
    const client = new FakePrismaIdentityOrganizationRbacClient();
    const repository = new PrismaIdentityOrganizationRbacRepository(
      client as unknown as PrismaIdentityOrganizationRbacClient
    );
    const userId = "66666666-6666-4666-8666-666666666666";

    await client.user.create({
      data: {
        id: userId,
        email: "member@example.test",
        displayName: "Member",
        disabledAt: null,
        createdAt: NOW,
        updatedAt: NOW
      }
    });
    await repository.createOrganization(organizationFixture(ORG_A, "Org A"));
    await repository.createOrganization(organizationFixture(ORG_B, "Org B"));
    await repository.addOrganizationMember(memberFixture(ORG_A, userId));
    await repository.addOrganizationMember(memberFixture(ORG_B, userId));
    const ownerRole = await repository.ensureRole({
      key: "owner",
      name: "Owner",
      description: "Full organization control."
    });
    await repository.bindRole({
      id: "77777777-7777-4777-8777-777777777777",
      organizationId: ORG_A,
      userId,
      roleId: ownerRole.id,
      roleKey: "owner",
      scopeJson: {},
      createdAt: NOW
    });

    await expect(repository.findMembership(ORG_A, userId)).resolves.toMatchObject({
      organizationId: ORG_A,
      userId,
      status: "active"
    });
    await expect(repository.findRoleBindings(ORG_A, userId)).resolves.toMatchObject([
      {
        organizationId: ORG_A,
        roleKey: "owner"
      }
    ]);
    await expect(repository.findRoleBindings(ORG_B, userId)).resolves.toEqual([]);
    await expect(repository.listOrganizationMembers(ORG_A)).resolves.toMatchObject([
      {
        organizationId: ORG_A,
        user: {
          email: "member@example.test"
        }
      }
    ]);
  });
});

class FakePrismaIdentityOrganizationRbacClient {
  readonly emailVerificationToken = new FakeDelegate();
  readonly identityAccount = new FakeDelegate();
  readonly localCredential = new FakeDelegate();
  readonly organization = new FakeDelegate();
  readonly organizationMember = new FakeDelegate();
  readonly passwordResetToken = new FakeDelegate();
  readonly role = new FakeDelegate();
  readonly roleBinding = new FakeDelegate();
  readonly session = new FakeDelegate();
  readonly user = new FakeDelegate();

  async $transaction<T>(callback: (tx: FakePrismaIdentityOrganizationRbacClient) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

class FakeDelegate {
  readonly rows: Array<Record<string, unknown>> = [];

  async create(input: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const row = materialize(input.data);
    this.rows.push(row);
    return row;
  }

  async findUnique(input: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null> {
    return this.rows.find((row) => matchesWhere(row, input.where)) ?? null;
  }

  async findFirst(input: {
    orderBy?: { createdAt?: "asc" | "desc" };
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown> | null> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where));
    sortRows(rows, input.orderBy);
    return rows[0] ?? null;
  }

  async findMany(input: {
    orderBy?: { createdAt?: "asc" | "desc" };
    where?: Record<string, unknown>;
  } = {}): Promise<Array<Record<string, unknown>>> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where ?? {}));
    sortRows(rows, input.orderBy);
    return rows;
  }

  async update(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const row = this.rows.find((candidate) => matchesWhere(candidate, input.where));
    if (!row) {
      throw new Error("Fake row not found");
    }

    Object.assign(row, materialize(input.data, false));
    return row;
  }

  async updateMany(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<{ count: number }> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where));
    for (const row of rows) {
      Object.assign(row, materialize(input.data, false));
    }
    return {
      count: rows.length
    };
  }

  async upsert(input: {
    create: Record<string, unknown>;
    update: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const existing = this.rows.find((row) => matchesWhere(row, input.where));
    if (existing) {
      Object.assign(existing, materialize(input.update, false));
      return existing;
    }

    return this.create({
      data: input.create
    });
  }
}

const organizationFixture = (id: string, name: string) => ({
  id,
  name,
  legalName: null,
  billingStatus: "none",
  defaultLocale: "en",
  primaryCountryCode: "RO",
  headquartersCountryCode: null,
  createdAt: NOW,
  updatedAt: NOW
});

const memberFixture = (organizationId: string, userId: string) => ({
  id: `${organizationId}:member:${userId}`,
  organizationId,
  userId,
  status: "active" as const,
  createdAt: NOW,
  updatedAt: NOW
});

const materialize = (data: Record<string, unknown>, includeDefaults = true): Record<string, unknown> => {
  const row = {
    ...data
  };
  if (includeDefaults) {
    row.createdAt ??= NOW;
    row.updatedAt ??= NOW;
  }
  return row;
};

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown>): boolean => {
  for (const [field, expected] of Object.entries(where)) {
    if (isRecord(expected) && "in" in expected && Array.isArray(expected.in)) {
      if (!expected.in.includes(row[field])) {
        return false;
      }
      continue;
    }

    if (row[field] !== expected) {
      return false;
    }
  }

  return true;
};

const sortRows = (rows: Array<Record<string, unknown>>, orderBy?: { createdAt?: "asc" | "desc" }): void => {
  if (!orderBy?.createdAt) {
    return;
  }

  rows.sort((left, right) => {
    const leftTime = toDate(left.createdAt).getTime();
    const rightTime = toDate(right.createdAt).getTime();
    return orderBy.createdAt === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });
};

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
