import { describe, expect, it } from "vitest";

import { Argon2idPasswordHasher, passwordHashAlgorithm } from "../index";

describe("Argon2idPasswordHasher", () => {
  it("hashes and verifies local account passwords with Argon2id", async () => {
    const hasher = new Argon2idPasswordHasher({
      memoryCost: 4096,
      timeCost: 1
    });

    const passwordHash = await hasher.hashPassword("CorrectHorseBatteryStaple42!");

    expect(passwordHash).not.toBe("CorrectHorseBatteryStaple42!");
    expect(passwordHash).toContain("$argon2id$");
    expect(passwordHashAlgorithm).toBe("argon2id");
    await expect(hasher.verifyPassword(passwordHash, "CorrectHorseBatteryStaple42!")).resolves.toBe(true);
    await expect(hasher.verifyPassword(passwordHash, "wrong-password")).resolves.toBe(false);
  });
});
