import { describe, expect, it } from "vitest";

import {
  PrismaProviderConsentStateStore,
  type PrismaProviderConsentStateClient
} from "../repositories/provider-consent-state";

const NOW = new Date("2026-06-13T08:00:00.000Z");
const EXPIRES = new Date("2026-06-13T08:10:00.000Z");

describe("PrismaProviderConsentStateStore", () => {
  it("persists hashed provider consent state and consumes it once", async () => {
    const client = new FakePrismaProviderConsentStateClient();
    const store = new PrismaProviderConsentStateStore(client as unknown as PrismaProviderConsentStateClient, {
      now: () => NOW,
      idFactory: () => "state_row_1"
    });

    const saved = await store.saveConsentState({
      organizationId: "11111111-1111-1111-1111-111111111111",
      providerKey: "microsoft365",
      stateHash: "sha256-state-hash",
      actorUserId: "22222222-2222-2222-2222-222222222222",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"],
      expiresAt: EXPIRES.toISOString()
    });

    expect(saved.stateHash).toBe("sha256-state-hash");
    expect(JSON.stringify(client.providerConsentState.rows)).not.toContain("raw-oauth-state");

    const consumed = await store.consumeConsentState({
      providerKey: "microsoft365",
      stateHash: "sha256-state-hash",
      consumedAt: NOW.toISOString()
    });
    const replay = await store.consumeConsentState({
      providerKey: "microsoft365",
      stateHash: "sha256-state-hash",
      consumedAt: NOW.toISOString()
    });

    expect(consumed?.requestedPermissionBundles).toEqual(["m365_read_baseline", "m365_security_read"]);
    expect(consumed?.consumedAt).toBe(NOW.toISOString());
    expect(replay).toBeNull();
  });

  it("rejects expired consent state before exposing callback metadata", async () => {
    const client = new FakePrismaProviderConsentStateClient();
    const store = new PrismaProviderConsentStateStore(client as unknown as PrismaProviderConsentStateClient, {
      now: () => NOW,
      idFactory: () => "state_row_2"
    });

    await store.saveConsentState({
      organizationId: "11111111-1111-1111-1111-111111111111",
      providerKey: "microsoft365",
      stateHash: "expired-state-hash",
      actorUserId: "22222222-2222-2222-2222-222222222222",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      requestedPermissionBundles: ["m365_read_baseline"],
      expiresAt: "2026-06-13T07:59:59.000Z"
    });

    await expect(
      store.consumeConsentState({
        providerKey: "microsoft365",
        stateHash: "expired-state-hash",
        consumedAt: NOW.toISOString()
      })
    ).resolves.toBeNull();
  });

  it("does not consume consent state for a different organization or actor", async () => {
    const client = new FakePrismaProviderConsentStateClient();
    const store = new PrismaProviderConsentStateStore(client as unknown as PrismaProviderConsentStateClient, {
      now: () => NOW,
      idFactory: () => "state_row_3"
    });

    await store.saveConsentState({
      organizationId: "11111111-1111-1111-1111-111111111111",
      providerKey: "microsoft365",
      stateHash: "scoped-state-hash",
      actorUserId: "22222222-2222-2222-2222-222222222222",
      redirectUri: "https://app.example.test/providers/microsoft365/callback",
      requestedPermissionBundles: ["m365_read_baseline"],
      expiresAt: EXPIRES.toISOString()
    });

    await expect(
      store.consumeConsentState({
        organizationId: "33333333-3333-3333-3333-333333333333",
        providerKey: "microsoft365",
        stateHash: "scoped-state-hash",
        actorUserId: "22222222-2222-2222-2222-222222222222",
        consumedAt: NOW.toISOString()
      })
    ).resolves.toBeNull();

    const consumed = await store.consumeConsentState({
      organizationId: "11111111-1111-1111-1111-111111111111",
      providerKey: "microsoft365",
      stateHash: "scoped-state-hash",
      actorUserId: "22222222-2222-2222-2222-222222222222",
      consumedAt: NOW.toISOString()
    });

    expect(consumed?.id).toBe("state_row_3");
  });
});

class FakePrismaProviderConsentStateClient {
  readonly providerConsentState = new FakeProviderConsentStateDelegate();
}

class FakeProviderConsentStateDelegate {
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
    if (input.orderBy?.createdAt === "desc") {
      rows.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    }
    return rows[0] ?? null;
  }

  async updateMany(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<{ count: number }> {
    const rows = this.rows.filter((row) => matchesWhere(row, input.where));
    for (const row of rows) {
      Object.assign(row, materialize(input.data));
    }
    return { count: rows.length };
  }
}

const materialize = (data: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]));

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown>): boolean =>
  Object.entries(where).every(([key, expected]) => row[key] === expected);
