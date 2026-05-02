import { createCipheriv, createHash, randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createLocalMicrosoft365TokenCipher,
  createLocalMicrosoft365TokenKeyProvider,
  createMicrosoft365TokenCipherFromEnv,
  describeMicrosoft365TokenKeyProvider,
  localDevMicrosoft365TokenMasterKey,
  parseMicrosoft365TokenPreviousKeys
} from "../crypto";
import { runMicrosoft365ProviderTokenRotationSmoke } from "../rotation-smoke";

const createLegacyEnvelope = (masterKey: string, payload: object): string => {
  const iv = randomBytes(12);
  const key = createHash("sha256").update(masterKey).digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);

  return JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url")
  });
};

describe("Microsoft 365 token encryption", () => {
  it("writes key IDs into new credential envelopes", () => {
    const cipher = createLocalMicrosoft365TokenCipher({
      activeKeyId: "current",
      keys: [
        {
          keyId: "current",
          masterKey: "current-provider-token-key"
        }
      ]
    });

    const encrypted = cipher.encrypt({
      tenantId: "tenant-id",
      accessToken: "token-value"
    });
    const envelope = JSON.parse(encrypted) as { version: number; keyId: string };

    expect(envelope).toMatchObject({
      version: 2,
      keyId: "current"
    });
    expect(cipher.decrypt(encrypted)).toEqual({
      tenantId: "tenant-id",
      accessToken: "token-value"
    });
  });

  it("decrypts credentials encrypted with a previous key ID", () => {
    const previousCipher = createLocalMicrosoft365TokenCipher({
      activeKeyId: "previous",
      keys: [
        {
          keyId: "previous",
          masterKey: "previous-provider-token-key"
        }
      ]
    });
    const encryptedWithPrevious = previousCipher.encrypt({
      tenantId: "tenant-id",
      accessToken: "old-token-value"
    });
    const currentCipher = createLocalMicrosoft365TokenCipher({
      activeKeyId: "current",
      keys: [
        {
          keyId: "current",
          masterKey: "current-provider-token-key"
        },
        {
          keyId: "previous",
          masterKey: "previous-provider-token-key"
        }
      ]
    });

    expect(currentCipher.decrypt(encryptedWithPrevious)).toEqual({
      tenantId: "tenant-id",
      accessToken: "old-token-value"
    });
  });

  it("describes local key custody without exposing key material", () => {
    const keyProvider = createLocalMicrosoft365TokenKeyProvider({
      activeKeyId: "current",
      keys: [
        {
          keyId: "current",
          masterKey: "current-provider-token-key"
        },
        {
          keyId: "previous",
          masterKey: "previous-provider-token-key"
        }
      ]
    });
    const cipher = createLocalMicrosoft365TokenCipher({ keyProvider });
    const summary = describeMicrosoft365TokenKeyProvider(keyProvider);
    const serializedSummary = JSON.stringify(summary);

    expect(summary).toEqual({
      providerKind: "local-env-key-ring",
      custodyBoundary: "local-process-key-ring",
      activeKeyId: "current",
      previousKeyIds: ["previous"],
      keyCount: 2,
      plaintextKeyMaterialAccessibleToProcess: true,
      externalKmsBacked: false,
      ciphertextBackfillSupported: false
    });
    expect(serializedSummary).not.toContain("current-provider-token-key");
    expect(serializedSummary).not.toContain("previous-provider-token-key");
    expect(JSON.parse(cipher.encrypt({ accessToken: "token-value" })).keyId).toBe("current");
  });

  it("fails previous-key decrypt when the configured key material is wrong", () => {
    const previousCipher = createLocalMicrosoft365TokenCipher({
      activeKeyId: "previous",
      keys: [
        {
          keyId: "previous",
          masterKey: "previous-provider-token-key"
        }
      ]
    });
    const encryptedWithPrevious = previousCipher.encrypt({
      tenantId: "tenant-id",
      accessToken: "old-token-value"
    });
    const currentCipher = createLocalMicrosoft365TokenCipher({
      activeKeyId: "current",
      keys: [
        {
          keyId: "current",
          masterKey: "current-provider-token-key"
        },
        {
          keyId: "previous",
          masterKey: "wrong-previous-provider-token-key"
        }
      ]
    });

    expect(() => currentCipher.decrypt(encryptedWithPrevious)).toThrow(
      "Microsoft 365 credential could not be decrypted with configured keys."
    );
  });

  it("decrypts legacy envelopes without key IDs by trying active and previous keys", () => {
    const legacyEnvelope = createLegacyEnvelope("legacy-provider-token-key", {
      tenantId: "tenant-id",
      refreshToken: "legacy-token-value"
    });
    const cipher = createLocalMicrosoft365TokenCipher({
      activeKeyId: "current",
      keys: [
        {
          keyId: "current",
          masterKey: "current-provider-token-key"
        },
        {
          keyId: "legacy",
          masterKey: "legacy-provider-token-key"
        }
      ]
    });

    expect(cipher.decrypt(legacyEnvelope)).toEqual({
      tenantId: "tenant-id",
      refreshToken: "legacy-token-value"
    });
  });

  it("parses provider token previous-key environment pairs", () => {
    expect(parseMicrosoft365TokenPreviousKeys("old=old-key, older = older-key")).toEqual([
      {
        keyId: "old",
        masterKey: "old-key"
      },
      {
        keyId: "older",
        masterKey: "older-key"
      }
    ]);
  });

  it("refuses the local-dev provider token key in production env defaults", () => {
    expect(() =>
      createMicrosoft365TokenCipherFromEnv({
        PURESOC_APP_ENV: "production",
        PURESOC_PROVIDER_TOKEN_KEY: localDevMicrosoft365TokenMasterKey
      })
    ).toThrow("non-default provider token key");
  });

  it("refuses the local-dev provider token key as a production previous key", () => {
    expect(() =>
      createMicrosoft365TokenCipherFromEnv({
        PURESOC_APP_ENV: "production",
        PURESOC_PROVIDER_TOKEN_KEY_ID: "current",
        PURESOC_PROVIDER_TOKEN_KEY: "production-provider-token-key",
        PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS: `previous=${localDevMicrosoft365TokenMasterKey}`
      })
    ).toThrow("cannot include the local-dev key");
  });

  it("runs the bounded provider-token rotation smoke without plaintext secret output", () => {
    const result = runMicrosoft365ProviderTokenRotationSmoke();
    const serialized = JSON.stringify(result);

    expect(result.checks).toEqual([
      "active-key-encrypt",
      "active-key-decrypt",
      "previous-key-decrypt",
      "bad-key-failure",
      "secret-output-redaction"
    ]);
    expect(result.guarantees).toMatchObject({
      liveMicrosoftGraphCalls: false,
      externalKmsCalls: false,
      providerWrites: false,
      plaintextSecretOutput: false,
      localDisposableOnly: true
    });
    expect(serialized).not.toContain("m34-smoke-access-token-secret");
    expect(serialized).not.toContain("m34-smoke-current-provider-token-key-material");
  });
});
