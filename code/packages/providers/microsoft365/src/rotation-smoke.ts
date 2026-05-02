import {
  createFakeMicrosoft365SecretManagerTokenKeyProvider,
  createLocalMicrosoft365TokenCipher,
  createLocalMicrosoft365TokenKeyProvider,
  describeMicrosoft365TokenKeyProvider,
  type Microsoft365TokenKeyCustodySummary
} from "./crypto";
import {
  createMicrosoft365ProviderTokenCustodyDeploymentReadiness,
  type Microsoft365ProviderTokenCustodyDeploymentReadiness
} from "./custody-readiness";
import {
  createMicrosoft365ProviderTokenRotationRunbook,
  type Microsoft365ProviderTokenRotationRunbook
} from "./rotation-runbook";

export const microsoft365ProviderTokenRotationSmokeSchemaVersion =
  "puresoc.microsoft365.provider-token.rotation-smoke.v3" as const;

export interface Microsoft365ProviderTokenRotationSmokeResult {
  schemaVersion: typeof microsoft365ProviderTokenRotationSmokeSchemaVersion;
  providerKey: "microsoft365";
  custody: Microsoft365TokenKeyCustodySummary;
  fakeSecretManagerCustody: Microsoft365TokenKeyCustodySummary;
  deploymentReadiness: {
    local: Microsoft365ProviderTokenCustodyDeploymentReadiness;
    inBox: Microsoft365ProviderTokenCustodyDeploymentReadiness;
    saas: Microsoft365ProviderTokenCustodyDeploymentReadiness;
  };
  rotationRunbook: Microsoft365ProviderTokenRotationRunbook;
  checks: string[];
  guarantees: {
    liveMicrosoftGraphCalls: false;
    externalKmsCalls: false;
    liveSecretManagerCalls: false;
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

  const fakeKeyProvider = createFakeMicrosoft365SecretManagerTokenKeyProvider({
    activeKeyId: "m38-fake-current",
    keys: [
      {
        keyId: "m38-fake-current",
        masterKey: currentKeyMaterial,
        versionId: "fake-secret-version:m38-current:v2"
      },
      {
        keyId: "m38-fake-previous",
        masterKey: previousKeyMaterial,
        versionId: "fake-secret-version:m38-previous:v1"
      }
    ]
  });
  const fakeCipher = createLocalMicrosoft365TokenCipher({ keyProvider: fakeKeyProvider });
  const fakeCurrentEnvelope = fakeCipher.encrypt(credentialPayload);
  const fakePreviousEnvelope = createLocalMicrosoft365TokenCipher({
    keyProvider: createFakeMicrosoft365SecretManagerTokenKeyProvider({
      activeKeyId: "m38-fake-previous",
      keys: [
        {
          keyId: "m38-fake-previous",
          masterKey: previousKeyMaterial,
          versionId: "fake-secret-version:m38-previous:v1"
        }
      ]
    })
  }).encrypt(credentialPayload);
  assertNoSecretMaterial("fake active-key envelope", fakeCurrentEnvelope, forbiddenPlaintext);
  assertNoSecretMaterial("fake previous-key envelope", fakePreviousEnvelope, forbiddenPlaintext);
  assert(
    fakeCipher.decrypt<SmokeCredentialPayload>(fakeCurrentEnvelope).accessToken === credentialPayload.accessToken,
    "Fake secret-manager active-key encrypted credential did not decrypt."
  );
  assert(
    fakeCipher.decrypt<SmokeCredentialPayload>(fakePreviousEnvelope).refreshToken === credentialPayload.refreshToken,
    "Fake secret-manager previous-key encrypted credential did not decrypt."
  );
  let fakeMissingKeyFailed = false;
  try {
    fakeCipher.decrypt<SmokeCredentialPayload>(
      JSON.stringify({
        ...JSON.parse(fakePreviousEnvelope),
        keyId: "m38-fake-missing"
      })
    );
  } catch (error) {
    fakeMissingKeyFailed = true;
    assertNoSecretMaterial(
      "fake missing-key failure",
      error instanceof Error ? error.message : String(error),
      forbiddenPlaintext
    );
  }
  assert(fakeMissingKeyFailed, "Fake secret-manager missing-key decrypt unexpectedly succeeded.");
  const fakeSecretManagerCustody = describeMicrosoft365TokenKeyProvider(fakeKeyProvider);
  assert(
    fakeSecretManagerCustody.keyVersions.some(
      (key) => key.keyId === "m38-fake-current" && key.versionId === "fake-secret-version:m38-current:v2"
    ),
    "Fake secret-manager custody summary did not include active key-version metadata."
  );
  assert(
    fakeSecretManagerCustody.rotationReadiness.ciphertextBackfillStatus === "metadata_only_deferred",
    "Fake secret-manager custody summary did not expose rotation readiness metadata."
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

  const localCustody = describeMicrosoft365TokenKeyProvider(currentKeyProvider);
  const result: Microsoft365ProviderTokenRotationSmokeResult = {
    schemaVersion: microsoft365ProviderTokenRotationSmokeSchemaVersion,
    providerKey: "microsoft365",
    custody: localCustody,
    fakeSecretManagerCustody,
    deploymentReadiness: {
      local: createMicrosoft365ProviderTokenCustodyDeploymentReadiness({
        custody: localCustody,
        targetKind: "local",
        previousKeyWindowConfirmed: true,
        backfillPlanConfirmed: true,
        keyRetirementPlanConfirmed: true
      }),
      inBox: createMicrosoft365ProviderTokenCustodyDeploymentReadiness({
        custody: localCustody,
        targetKind: "in_a_box",
        previousKeyWindowConfirmed: true,
        backfillPlanConfirmed: true,
        keyRetirementPlanConfirmed: true
      }),
      saas: createMicrosoft365ProviderTokenCustodyDeploymentReadiness({
        custody: localCustody,
        targetKind: "saas",
        previousKeyWindowConfirmed: true,
        backfillPlanConfirmed: true,
        keyRetirementPlanConfirmed: true
      })
    },
    rotationRunbook: createMicrosoft365ProviderTokenRotationRunbook(fakeKeyProvider, {
      generatedAt: "2026-05-02T00:00:00.000Z"
    }),
    checks: [
      "active-key-encrypt",
      "active-key-decrypt",
      "previous-key-decrypt",
      "fake-secret-manager-active-key-decrypt",
      "fake-secret-manager-previous-key-decrypt",
      "fake-secret-manager-missing-key-failure",
      "fake-secret-manager-version-metadata",
      "custody-deployment-readiness-metadata",
      "rotation-runbook-metadata",
      "bad-key-failure",
      "secret-output-redaction"
    ],
    guarantees: {
      liveMicrosoftGraphCalls: false,
      externalKmsCalls: false,
      liveSecretManagerCalls: false,
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
