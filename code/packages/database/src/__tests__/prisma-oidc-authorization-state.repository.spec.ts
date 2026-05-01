import { describe, expect, it } from "vitest";

import {
  PrismaOidcAuthorizationStateStore,
  type PrismaOidcAuthorizationStateClient
} from "../index";

const NOW = new Date("2026-05-02T12:00:00.000Z");
const LATER = new Date("2026-05-02T12:01:00.000Z");

describe("PrismaOidcAuthorizationStateStore", () => {
  it("persists hashed state metadata and protects the PKCE verifier at rest", async () => {
    const client = new FakePrismaOidcAuthorizationStateClient();
    const store = new PrismaOidcAuthorizationStateStore(client as unknown as PrismaOidcAuthorizationStateClient, {
      codeVerifierEncryptionKey: "test-oidc-state-key",
      randomBytes: fixedRandomBytes(7)
    });

    await store.saveAuthorizationState({
      id: "11111111-1111-4111-8111-111111111111",
      providerKey: "google",
      stateHash: "state-hash",
      nonceHash: "nonce-hash",
      codeVerifier: "raw-pkce-code-verifier",
      redirectUri: "http://localhost/auth/oidc/google/callback",
      createdAt: NOW,
      expiresAt: new Date("2026-05-02T12:10:00.000Z"),
      consumedAt: null
    });

    expect(client.oidcAuthorizationState.rows).toHaveLength(1);
    expect(client.oidcAuthorizationState.rows[0]).toMatchObject({
      providerKey: "google",
      stateHash: "state-hash",
      nonceHash: "nonce-hash"
    });
    expect(JSON.stringify(client.oidcAuthorizationState.rows)).not.toContain("raw-pkce-code-verifier");

    const consumed = await store.consumeAuthorizationState({
      providerKey: "google",
      stateHash: "state-hash",
      consumedAt: LATER
    });

    expect(consumed).toMatchObject({
      providerKey: "google",
      stateHash: "state-hash",
      nonceHash: "nonce-hash",
      codeVerifier: "raw-pkce-code-verifier",
      consumedAt: LATER
    });
  });

  it("makes authorization state single-use", async () => {
    const client = new FakePrismaOidcAuthorizationStateClient();
    const store = new PrismaOidcAuthorizationStateStore(client as unknown as PrismaOidcAuthorizationStateClient, {
      codeVerifierEncryptionKey: "test-oidc-state-key"
    });

    await store.saveAuthorizationState({
      id: "22222222-2222-4222-8222-222222222222",
      providerKey: "microsoft_entra",
      stateHash: "single-use-state",
      nonceHash: "single-use-nonce",
      codeVerifier: "single-use-verifier",
      redirectUri: "http://localhost/auth/oidc/microsoft_entra/callback",
      createdAt: NOW,
      expiresAt: new Date("2026-05-02T12:10:00.000Z"),
      consumedAt: null
    });

    await expect(
      store.consumeAuthorizationState({
        providerKey: "microsoft_entra",
        stateHash: "single-use-state",
        consumedAt: LATER
      })
    ).resolves.toMatchObject({ codeVerifier: "single-use-verifier" });
    await expect(
      store.consumeAuthorizationState({
        providerKey: "microsoft_entra",
        stateHash: "single-use-state",
        consumedAt: new Date("2026-05-02T12:02:00.000Z")
      })
    ).resolves.toBeNull();
  });

  it("rejects expired authorization state before verifier disclosure", async () => {
    const client = new FakePrismaOidcAuthorizationStateClient();
    const store = new PrismaOidcAuthorizationStateStore(client as unknown as PrismaOidcAuthorizationStateClient, {
      codeVerifierEncryptionKey: "test-oidc-state-key"
    });

    await store.saveAuthorizationState({
      id: "33333333-3333-4333-8333-333333333333",
      providerKey: "github",
      stateHash: "expired-state",
      nonceHash: null,
      codeVerifier: "expired-verifier",
      redirectUri: "http://localhost/auth/oidc/github/callback",
      createdAt: NOW,
      expiresAt: new Date("2026-05-02T12:00:30.000Z"),
      consumedAt: null
    });

    await expect(
      store.consumeAuthorizationState({
        providerKey: "github",
        stateHash: "expired-state",
        consumedAt: LATER
      })
    ).resolves.toBeNull();
    expect(client.oidcAuthorizationState.rows[0]?.consumedAt).toBeNull();
  });
});

class FakePrismaOidcAuthorizationStateClient {
  readonly oidcAuthorizationState = new FakeDelegate();
}

class FakeDelegate {
  readonly rows: Array<Record<string, unknown>> = [];

  async create(input: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const row = materialize(input.data);
    this.rows.push(row);
    return row;
  }

  async findFirst(input: {
    orderBy?: Record<string, "asc" | "desc">;
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown> | null> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where));
    sortRows(rows, input.orderBy);
    return rows[0] ?? null;
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
}

const materialize = (data: Record<string, unknown>, includeDefaults = true): Record<string, unknown> => {
  const row = {
    ...data
  };
  if (includeDefaults) {
    row.createdAt ??= NOW;
  }
  return row;
};

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown>): boolean => {
  for (const [field, expected] of Object.entries(where)) {
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

const fixedRandomBytes =
  (value: number) =>
  (size: number): Buffer =>
    Buffer.alloc(size, value);
