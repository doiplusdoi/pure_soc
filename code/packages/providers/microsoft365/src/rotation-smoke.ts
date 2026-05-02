import {
  createLocalMicrosoft365TokenCipher,
  createLocalMicrosoft365TokenKeyProvider,
  describeMicrosoft365TokenKeyProvider,
  type Microsoft365TokenKeyCustodySummary
} from "./crypto";

export const microsoft365ProviderTokenRotationSmokeSchemaVersion =
  "puresoc.microsoft365.provider-token.rotation-smoke.v1" as const;

export interface Microsoft365ProviderTokenRotationSmokeResult {
  schemaVersion: typeof microsoft365ProviderTokenRotationSmokeSchemaVersion;
  providerKey: "microsoft365";
  custody: Microsoft365TokenKeyCustodySummary;
  checks: string[];
  guarantees: {
    liveMicrosoftGraphCalls: false;
    externalKmsCalls: false;
    providerWrites: false;
    plaintextSecretOutput: false;
    localDisposableOnly: true;
  };
}

interface SmokeCredentialPayload {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  clientSecret: string;
}

export const runMicrosoft365ProviderTokenRotationSmoke = (): Microsoft365ProviderTokenRotationSmokeResult => {
  const currentKeyMaterial = "m34-smoke-current-provider-token-key-material";
  const previousKeyMaterial = "m34-smoke-previous-provider-token-key-material";
  const wrongPreviousKeyMaterial = "m34-smoke-wrong-previous-provider-token-key-material";
  const credentialPayload: SmokeCredentialPayload = {
    tenantId: "m34-smoke-tenant",
    accessToken: "m34-smoke-access-token-secret",
    refreshToken: "m34-smoke-refresh-token-secret",
    clientSecret: "m34-smoke-client-secret"
  };
  const forbiddenPlaintext = [
    currentKeyMaterial,
    previousKeyMaterial,
    wrongPreviousKeyMaterial,
    credentialPayload.accessToken,
    credentialPayload.refreshToken,
    credentialPayload.clientSecret
  ];

  const previousKeyProvider = createLocalMicrosoft365TokenKeyProvider({
    activeKeyId: "m34-previous",
    keys: [
      {
        keyId: "m34-previous",
        masterKey: previousKeyMaterial
      }
    ]
  });
  const previousCipher = createLocalMicrosoft365TokenCipher({ keyProvider: previousKeyProvider });
  const previousEnvelope = previousCipher.encrypt(credentialPayload);
  assertNoSecretMaterial("previous-key envelope", previousEnvelope, forbiddenPlaintext);

  const currentKeyProvider = createLocalMicrosoft365TokenKeyProvider({
    activeKeyId: "m34-current",
    keys: [
      {
        keyId: "m34-current",
        masterKey: currentKeyMaterial
      },
      {
        keyId: "m34-previous",
        masterKey: previousKeyMaterial
      }
    ]
  });
  const currentCipher = createLocalMicrosoft365TokenCipher({ keyProvider: currentKeyProvider });
  const currentEnvelope = currentCipher.encrypt(credentialPayload);
  assertNoSecretMaterial("active-key envelope", currentEnvelope, forbiddenPlaintext);

  const activeEnvelope = JSON.parse(currentEnvelope) as { keyId?: string };
  assert(activeEnvelope.keyId === "m34-current", "Active-key encryption did not stamp the active key ID.");
  assert(
    currentCipher.decrypt<SmokeCredentialPayload>(currentEnvelope).accessToken === credentialPayload.accessToken,
    "Active-key encrypted credential did not decrypt with the active key."
  );
  assert(
    currentCipher.decrypt<SmokeCredentialPayload>(previousEnvelope).refreshToken === credentialPayload.refreshToken,
    "Previous-key encrypted credential did not decrypt through the configured previous key."
  );

  const badKeyProvider = createLocalMicrosoft365TokenKeyProvider({
    activeKeyId: "m34-current",
    keys: [
      {
        keyId: "m34-current",
        masterKey: currentKeyMaterial
      },
      {
        keyId: "m34-previous",
        masterKey: wrongPreviousKeyMaterial
      }
    ]
  });
  const badCipher = createLocalMicrosoft365TokenCipher({ keyProvider: badKeyProvider });
  let badKeyFailed = false;
  try {
    badCipher.decrypt<SmokeCredentialPayload>(previousEnvelope);
  } catch (error) {
    badKeyFailed = true;
    assertNoSecretMaterial("bad-key failure", error instanceof Error ? error.message : String(error), forbiddenPlaintext);
  }
  assert(badKeyFailed, "Bad-key decrypt unexpectedly succeeded.");

  const result: Microsoft365ProviderTokenRotationSmokeResult = {
    schemaVersion: microsoft365ProviderTokenRotationSmokeSchemaVersion,
    providerKey: "microsoft365",
    custody: describeMicrosoft365TokenKeyProvider(currentKeyProvider),
    checks: [
      "active-key-encrypt",
      "active-key-decrypt",
      "previous-key-decrypt",
      "bad-key-failure",
      "secret-output-redaction"
    ],
    guarantees: {
      liveMicrosoftGraphCalls: false,
      externalKmsCalls: false,
      providerWrites: false,
      plaintextSecretOutput: false,
      localDisposableOnly: true
    }
  };

  assertNoSecretMaterial("smoke result", result, forbiddenPlaintext);
  return result;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const assertNoSecretMaterial = (label: string, value: unknown, forbiddenPlaintext: string[]): void => {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  for (const secret of forbiddenPlaintext) {
    if (secret && serialized.includes(secret)) {
      throw new Error(`Provider-token rotation smoke leaked plaintext secret material in ${label}.`);
    }
  }
};
