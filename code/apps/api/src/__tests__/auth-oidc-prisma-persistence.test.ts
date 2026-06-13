import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import type {
  OidcProviderConfig,
  OidcTokenClient,
  OidcTokenResponse,
  OidcTokenVerifier,
  VerifiedOidcIdentity
} from "@puresoc/auth-oidc";
import { loadConfig, type PureSocConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const NOW = new Date("2026-05-02T12:00:00.000Z");
const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

class FakeOidcTokenClient implements OidcTokenClient {
  readonly exchanges: Array<{ providerKey: string; code: string; codeVerifier: string }> = [];
  readonly responses = new Map<string, OidcTokenResponse>();

  async exchangeAuthorizationCode(input: {
    provider: OidcProviderConfig;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<OidcTokenResponse> {
    this.exchanges.push({
      providerKey: input.provider.providerKey,
      code: input.code,
      codeVerifier: input.codeVerifier
    });
    return this.responses.get(input.code) ?? { idToken: input.code };
  }
}

class FakeOidcTokenVerifier implements OidcTokenVerifier {
  readonly identities = new Map<string, VerifiedOidcIdentity>();

  async verifyIdToken(input: { provider: OidcProviderConfig; idToken: string }): Promise<VerifiedOidcIdentity> {
    const identity = this.identities.get(input.idToken);
    if (!identity) {
      throw new Error(`Missing fake identity for ${input.idToken}`);
    }

    return identity;
  }
}

describe("OIDC Prisma runtime persistence", () => {
  let server: ReturnType<typeof startApiServer> | null = null;

  afterEach(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = null;
  });

  const start = (
    prismaClient: FakePrismaClient,
    tokenClient: FakeOidcTokenClient,
    tokenVerifier: FakeOidcTokenVerifier,
    now: Date
  ) => {
    const services = createApiServices({
      config: makePrismaOidcConfig(),
      prismaClient: prismaClient as never,
      oidcTokenClient: tokenClient,
      oidcTokenVerifier: tokenVerifier,
      now: () => now
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;

    return {
      baseUrl: `http://127.0.0.1:${address.port}`,
      services
    };
  };

  const closeServer = async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = null;
  };

  it("survives service recreation, decrypts PKCE for callback exchange, and prevents replay", async () => {
    const prismaClient = new FakePrismaClient();
    const tokenClient = new FakeOidcTokenClient();
    const tokenVerifier = new FakeOidcTokenVerifier();
    const first = start(prismaClient, tokenClient, tokenVerifier, NOW);
    const authorization = await begin(first.baseUrl);

    expect(first.services.persistence.persistedContexts).toContain("oidc_transient_state");
    expect(first.services.persistence.memoryBackedContexts).not.toContain("oidc_transient_state");
    expect(prismaClient.oidcAuthorizationState.rows).toHaveLength(1);

    await closeServer();

    tokenClient.responses.set("oauth-code", { idToken: "id-token" });
    tokenVerifier.identities.set(
      "id-token",
      identityFor({
        nonce: authorization.nonce,
        email: "persisted-oidc@example.test"
      })
    );

    const restarted = start(prismaClient, tokenClient, tokenVerifier, new Date("2026-05-02T12:01:00.000Z"));
    const callbackResponse = await postJson(restarted.baseUrl, "/auth/oidc/google/callback", {
      state: authorization.state,
      code: "oauth-code"
    });

    expect(callbackResponse.status).toBe(200);
    const cookie = callbackResponse.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("puresoc_session=");
    expect(tokenClient.exchanges).toHaveLength(1);
    const exchangedVerifier = tokenClient.exchanges[0]?.codeVerifier ?? "";
    expect(exchangedVerifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(JSON.stringify(prismaClient.oidcAuthorizationState.rows)).not.toContain(exchangedVerifier);

    const replayResponse = await postJson(restarted.baseUrl, "/auth/oidc/google/callback", {
      state: authorization.state,
      code: "replay-code"
    });
    expect(replayResponse.status).toBe(400);
    expect(tokenClient.exchanges).toHaveLength(1);
  });

  it("rejects expired persisted state before exchanging the authorization code", async () => {
    const prismaClient = new FakePrismaClient();
    const tokenClient = new FakeOidcTokenClient();
    const tokenVerifier = new FakeOidcTokenVerifier();
    const first = start(prismaClient, tokenClient, tokenVerifier, NOW);
    const authorization = await begin(first.baseUrl);

    await closeServer();

    const restarted = start(prismaClient, tokenClient, tokenVerifier, new Date("2026-05-02T12:11:00.000Z"));
    const callbackResponse = await postJson(restarted.baseUrl, "/auth/oidc/google/callback", {
      state: authorization.state,
      code: "expired-code"
    });

    expect(callbackResponse.status).toBe(400);
    expect(tokenClient.exchanges).toHaveLength(0);
    expect(prismaClient.oidcAuthorizationState.rows[0]?.consumedAt).toBeNull();
  });

  it("keeps email-collision account linking explicit in Prisma mode", async () => {
    const prismaClient = new FakePrismaClient();
    const tokenClient = new FakeOidcTokenClient();
    const tokenVerifier = new FakeOidcTokenVerifier();
    const { baseUrl, services } = start(prismaClient, tokenClient, tokenVerifier, NOW);

    const registerResponse = await postJson(baseUrl, "/auth/register", {
      email: "collision@example.test",
      password,
      displayName: "Existing User"
    });
    expect(registerResponse.status).toBe(201);

    const authorization = await begin(baseUrl);
    tokenClient.responses.set("collision-code", { idToken: "collision-token" });
    tokenVerifier.identities.set(
      "collision-token",
      identityFor({
        nonce: authorization.nonce,
        subject: "new-google-subject",
        email: "collision@example.test"
      })
    );

    const collisionResponse = await postJson(baseUrl, "/auth/oidc/google/callback", {
      state: authorization.state,
      code: "collision-code"
    });

    expect(collisionResponse.status).toBe(409);
    expect(services.auditSink.findByAction("account_link_rejected")).toHaveLength(1);
    expect(prismaClient.identityAccount.rows).toHaveLength(1);
  });
});

const makePrismaOidcConfig = (): PureSocConfig => {
  const config = loadConfig({
    env: {
      PURESOC_PERSISTENCE_MODE: "prisma",
      PURESOC_AUTH_OIDC_TRANSIENT_STATE_KEY: "test-oidc-transient-state-key-with-enough-entropy"
    }
  });

  return {
    ...config,
    auth: {
      ...config.auth,
      socialLogin: {
        ...config.auth.socialLogin,
        stateTtlMs: 600_000,
        providers: {
          ...config.auth.socialLogin.providers,
          google: {
            ...config.auth.socialLogin.providers.google,
            enabled: true,
            clientId: "google-client-id",
            clientSecret: "google-client-secret",
            redirectUri: "http://127.0.0.1/auth/oidc/google/callback"
          }
        }
      }
    }
  };
};

const begin = async (baseUrl: string) => {
  const response = await postJson(baseUrl, "/auth/oidc/google/begin", {});
  expect(response.status).toBe(200);
  const body = await readJson<{ redirectUrl: string }>(response);
  const authorizationUrl = new URL(body.redirectUrl);

  return {
    state: authorizationUrl.searchParams.get("state") ?? "",
    nonce: authorizationUrl.searchParams.get("nonce") ?? ""
  };
};

const postJson = (baseUrl: string, path: string, body: unknown, cookie?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify(body)
  });

const identityFor = (input: {
  issuer?: string;
  audience?: string | string[];
  subject?: string;
  nonce?: string | null;
  email?: string;
  emailVerified?: boolean | null;
  signatureVerified?: boolean;
  expiresAt?: Date;
}): VerifiedOidcIdentity => ({
  providerKey: "google",
  issuer: input.issuer ?? "https://accounts.google.com",
  audience: input.audience ?? "google-client-id",
  subject: input.subject ?? "google-subject-1",
  expiresAt: input.expiresAt ?? new Date(NOW.getTime() + 1000 * 60 * 30),
  signatureVerified: input.signatureVerified ?? true,
  nonce: input.nonce ?? null,
  email: input.email ?? "oidc-user@example.test",
  emailVerified: input.emailVerified ?? true,
  displayName: "OIDC User"
});

class FakePrismaClient {
  readonly auditLog = new FakeDelegate();
  readonly billingCustomer = new FakeDelegate();
  readonly billingEntitlement = new FakeDelegate();
  readonly billingEvent = new FakeDelegate();
  readonly billingSubscription = new FakeDelegate();
  readonly complianceControlResult = new FakeDelegate();
  readonly complianceGap = new FakeDelegate();
  readonly complianceResultSnapshot = new FakeDelegate();
  readonly dashboardSnapshot = new FakeDelegate();
  readonly emailVerificationToken = new FakeDelegate();
  readonly evidenceAccessLog = new FakeDelegate();
  readonly evidenceArtifact = new FakeDelegate();
  readonly evidenceLink = new FakeDelegate();
  readonly generatedReport = new FakeDelegate();
  readonly identityAccount = new FakeDelegate();
  readonly notificationChannel = new FakeDelegate();
  readonly notificationDeadline = new FakeDelegate();
  readonly localCredential = new FakeDelegate();
  readonly notificationDraft = new FakeDelegate();
  readonly notificationLog = new FakeDelegate();
  readonly oidcAuthorizationState = new FakeDelegate();
  readonly organization = new FakeDelegate();
  readonly organizationMember = new FakeDelegate();
  readonly passwordResetToken = new FakeDelegate();
  readonly providerActionRun = new FakeDelegate();
  readonly providerActionTemplate = new FakeDelegate();
  readonly providerCapability = new FakeDelegate();
  readonly providerConnection = new FakeDelegate();
  readonly providerCredential = new FakeDelegate();
  readonly providerFinding = new FakeDelegate();
  readonly providerNormalizedResource = new FakeDelegate();
  readonly providerPermissionBundle = new FakeDelegate();
  readonly providerRawResource = new FakeDelegate();
  readonly providerRecommendation = new FakeDelegate();
  readonly providerSyncModule = new FakeDelegate();
  readonly providerSyncRun = new FakeDelegate();
  readonly readinessPlan = new FakeDelegate();
  readonly readinessPlanItem = new FakeDelegate();
  readonly regulatoryReviewDecision = new FakeDelegate();
  readonly regulatoryReviewTask = new FakeDelegate();
  readonly regulatorySource = new FakeDelegate();
  readonly regulatorySourceMap = new FakeDelegate();
  readonly regulatorySourceVersion = new FakeDelegate();
  readonly roNis2NotificationDraft = new FakeDelegate();
  readonly role = new FakeDelegate();
  readonly roleBinding = new FakeDelegate();
  readonly session = new FakeDelegate();
  readonly user = new FakeDelegate();

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
    orderBy?: Record<string, "asc" | "desc">;
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
  const entry = Object.entries(orderBy ?? {})[0];
  if (!entry) {
    return;
  }

  const [field, direction] = entry;
  rows.sort((left, right) => {
    const leftTime = toDate(left[field]).getTime();
    const rightTime = toDate(right[field]).getTime();
    return direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });
};

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
