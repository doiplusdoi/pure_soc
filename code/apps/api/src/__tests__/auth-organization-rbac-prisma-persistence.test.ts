import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const NOW = new Date("2026-05-02T10:00:00.000Z");
const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("auth organization RBAC Prisma runtime persistence", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;
  let prismaClient: FakePrismaClient;

  beforeEach(() => {
    prismaClient = new FakePrismaClient();
    services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_PERSISTENCE_MODE: "prisma"
        }
      }),
      prismaClient: prismaClient as never,
      now: () => NOW
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const postJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {})
      },
      body: JSON.stringify(body)
    });

  const registerAndLogin = async (email: string) => {
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: "Prisma Mode User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      loginBody: await readJson<{ user: { id: string; email: string }; session: { id: string } }>(loginResponse),
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  it("persists auth, organization, and RBAC data through the Prisma adapter in Prisma mode", async () => {
    expect(services.persistence.persistedContexts).toContain("identity_sessions_organizations_rbac");
    expect(services.persistence.persistedContexts).toContain("audit_logs");
    expect(services.persistence.memoryBackedContexts).not.toContain("identity_sessions_organizations_rbac");
    expect(services.persistence.memoryBackedContexts).not.toContain("audit_logs");
    expect(services.rbacRepository).not.toBe(services.memoryRepositories.identityRepository);

    const owner = await registerAndLogin("owner@example.test");
    const other = await registerAndLogin("other@example.test");

    const organizationResponse = await postJson(
      "/organizations",
      {
        name: "Persisted Org",
        legalName: "Persisted Org SRL",
        primaryCountryCode: "RO"
      },
      owner.cookie
    );
    expect(organizationResponse.status).toBe(201);
    const organizationBody = await readJson<{ organization: { id: string }; member: { roleKeys: string[] } }>(
      organizationResponse
    );
    expect(organizationBody.member.roleKeys).toEqual(["owner"]);

    const membersResponse = await fetch(`${baseUrl}/organizations/${organizationBody.organization.id}/members`, {
      headers: { cookie: owner.cookie }
    });
    expect(membersResponse.status).toBe(200);
    await expect(readJson<{ members: Array<{ user: { id: string; email: string } }> }>(membersResponse)).resolves.toMatchObject({
      members: [
        {
          user: {
            id: owner.loginBody.user.id,
            email: "owner@example.test"
          }
        }
      ]
    });

    const crossOrgResponse = await fetch(`${baseUrl}/organizations/${organizationBody.organization.id}/members`, {
      headers: { cookie: other.cookie }
    });
    expect(crossOrgResponse.status).toBe(403);
    expect(prismaClient.organizationMember.rows).toHaveLength(1);
    expect(prismaClient.roleBinding.rows).toHaveLength(1);
    expect(prismaClient.auditLog.rows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "local_account_created",
        "login",
        "session_created",
        "organization_created",
        "role_changed"
      ])
    );
    expect(prismaClient.auditLog.rows.every((row) => row.entryHash && row.hashAlgorithm === "sha256")).toBe(true);
    expect(JSON.stringify(prismaClient.auditLog.rows)).not.toContain(password);
    expect(services.memoryRepositories.identityRepository.organizationMembers.size).toBe(0);
    expect(services.memoryRepositories.identityRepository.roleBindings.size).toBe(0);
  });
});

class FakePrismaClient {
  readonly emailVerificationToken = new FakeDelegate();
  readonly identityAccount = new FakeDelegate();
  readonly localCredential = new FakeDelegate();
  readonly oidcAuthorizationState = new FakeDelegate();
  readonly organization = new FakeDelegate();
  readonly organizationMember = new FakeDelegate();
  readonly passwordResetToken = new FakeDelegate();
  readonly role = new FakeDelegate();
  readonly roleBinding = new FakeDelegate();
  readonly session = new FakeDelegate();
  readonly user = new FakeDelegate();
  readonly auditLog = new FakeDelegate();

  readonly complianceResultSnapshot = {};
  readonly complianceControlResult = {};
  readonly complianceGap = {};
  readonly providerRecommendation = {};
  readonly readinessPlan = {};
  readonly readinessPlanItem = {};
  readonly regulatorySource = {};
  readonly regulatorySourceVersion = {};
  readonly regulatorySourceMap = {};
  readonly regulatoryReviewTask = {};
  readonly regulatoryReviewDecision = {};
  readonly providerActionTemplate = {};
  readonly providerActionRun = {};
  readonly providerCapability = {};
  readonly providerConnection = {};
  readonly providerCredential = {};
  readonly providerFinding = {};
  readonly providerNormalizedResource = {};
  readonly providerPermissionBundle = {};
  readonly providerRawResource = {};
  readonly providerSyncModule = {};
  readonly providerSyncRun = {};
  readonly notificationDraft = {};
  readonly roNis2NotificationDraft = {};
  readonly generatedReport = {};
  readonly dashboardSnapshot = {};
  readonly evidenceArtifact = {};
  readonly evidenceLink = {};
  readonly evidenceAccessLog = {};
  readonly billingCustomer = {};
  readonly billingSubscription = {};
  readonly billingEntitlement = {};
  readonly billingEvent = {};

  async $transaction<T>(callback: (tx: FakePrismaClient) => Promise<T>): Promise<T> {
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
    orderBy?: Record<string, "asc" | "desc">;
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

    if (isRecord(expected) && "not" in expected) {
      if (row[field] === expected.not) {
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

const sortRows = (rows: Array<Record<string, unknown>>, orderBy?: Record<string, "asc" | "desc">): void => {
  const [field, direction] = Object.entries(orderBy ?? {})[0] ?? [];
  if (!field || !direction) {
    return;
  }

  rows.sort((left, right) => {
    const leftValue = left[field];
    const rightValue = right[field];
    const leftComparable = typeof leftValue === "number" ? leftValue : toDate(leftValue).getTime();
    const rightComparable = typeof rightValue === "number" ? rightValue : toDate(rightValue).getTime();
    return direction === "asc" ? leftComparable - rightComparable : rightComparable - leftComparable;
  });
};

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
