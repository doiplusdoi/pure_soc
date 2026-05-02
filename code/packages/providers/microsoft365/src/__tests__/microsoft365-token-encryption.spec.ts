import { createCipheriv, createHash, randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createFakeMicrosoft365SecretManagerTokenKeyProvider,
  createLocalMicrosoft365TokenCipher,
  createLocalMicrosoft365TokenKeyProvider,
  createMicrosoft365TokenKeyProviderFromConfig,
  createMicrosoft365TokenCipherFromEnv,
  describeMicrosoft365TokenKeyProvider,
  localDevMicrosoft365TokenMasterKey,
  parseMicrosoft365TokenPreviousKeys
} from "../crypto";
import { createMicrosoft365ProviderTokenCustodyDeploymentReadiness } from "../custody-readiness";
import { createMicrosoft365ProviderTokenRotationRunbook } from "../rotation-runbook";
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

    expect(summary).toMatchObject({
      schemaVersion: "puresoc.microsoft365.provider-token.custody.v1",
      providerKind: "local-env-key-ring",
      status: "ready",
      custodyBoundary: "local-process-key-ring",
      activeKeyId: "current",
      previousKeyIds: ["previous"],
      keyCount: 2,
      plaintextKeyMaterialAccessibleToProcess: true,
      externalKmsBacked: false,
      externalSecretManagerBacked: false,
      testOnly: false,
      capabilities: {
        activeKeyLookup: true,
        previousKeyLookup: true,
        keyVersionMetadata: true,
        rotationReadinessMetadata: true,
        ciphertextBackfillPlanning: true,
        ciphertextBackfillExecution: false,
        liveSecretManagerCalls: false,
        liveKmsCalls: false,
        liveMicrosoftGraphCalls: false,
        providerWrites: false
      },
      rotationReadiness: {
        stagedPreviousKeyCount: 1,
        activeKeyLookupReady: true,
        previousKeyLookupReady: true,
        missingKeyIds: [],
        operatorSecretInjectionRequired: true,
        ciphertextBackfillStatus: "metadata_only_deferred",
        rollbackExpectation: "restore_previous_key_window_and_redeploy"
      },
      ciphertextBackfillSupported: false
    });
    expect(summary.keyVersions).toEqual([
      {
        keyId: "current",
        versionId: "environment:current:operator-supplied",
        role: "active",
        custodyProviderKind: "local-env-key-ring",
        source: "environment"
      },
      {
        keyId: "previous",
        versionId: "environment:previous:operator-supplied",
        role: "previous",
        custodyProviderKind: "local-env-key-ring",
        source: "environment"
      }
    ]);
    expect(serializedSummary).not.toContain("current-provider-token-key");
    expect(serializedSummary).not.toContain("previous-provider-token-key");
    expect(JSON.parse(cipher.encrypt({ accessToken: "token-value" })).keyId).toBe("current");
  });

  it("models deterministic fake secret-manager custody without live external calls", () => {
    const keyProvider = createFakeMicrosoft365SecretManagerTokenKeyProvider({
      activeKeyId: "current",
      keys: [
        {
          keyId: "current",
          masterKey: "current-provider-token-key",
          versionId: "fake-secret-version:current:v2"
        },
        {
          keyId: "previous",
          masterKey: "previous-provider-token-key",
          versionId: "fake-secret-version:previous:v1"
        }
      ]
    });
    const cipher = createLocalMicrosoft365TokenCipher({ keyProvider });
    const summary = describeMicrosoft365TokenKeyProvider(keyProvider);
    const runbook = createMicrosoft365ProviderTokenRotationRunbook(keyProvider, {
      generatedAt: "2026-05-02T00:00:00.000Z"
    });
    const encrypted = cipher.encrypt({
      tenantId: "tenant-id",
      accessToken: "token-value"
    });

    expect(cipher.decrypt(encrypted)).toEqual({
      tenantId: "tenant-id",
      accessToken: "token-value"
    });
    expect(summary).toMatchObject({
      providerKind: "fake-secret-manager-test",
      custodyBoundary: "deterministic-fake-secret-manager",
      testOnly: true,
      externalKmsBacked: false,
      externalSecretManagerBacked: false,
      capabilities: {
        liveSecretManagerCalls: false,
        liveKmsCalls: false,
        liveMicrosoftGraphCalls: false,
        providerWrites: false
      },
      rotationReadiness: {
        stagedPreviousKeyCount: 1,
        ciphertextBackfillStatus: "metadata_only_deferred"
      }
    });
    expect(summary.keyVersions).toEqual([
      {
        keyId: "current",
        versionId: "fake-secret-version:current:v2",
        role: "active",
        custodyProviderKind: "fake-secret-manager-test",
        source: "deterministic-fake-secret-manager"
      },
      {
        keyId: "previous",
        versionId: "fake-secret-version:previous:v1",
        role: "previous",
        custodyProviderKind: "fake-secret-manager-test",
        source: "deterministic-fake-secret-manager"
      }
    ]);
    expect(runbook).toMatchObject({
      providerKey: "microsoft365",
      generatedAt: "2026-05-02T00:00:00.000Z",
      backfill: {
        executionStatus: "not_executed_metadata_only",
        previousKeyRetirement: "operator_review_required_after_verified_reencrypt"
      },
      rollback: {
        supported: true,
        expectation: "restore_previous_key_window_and_redeploy"
      },
      guarantees: {
        liveMicrosoftGraphCalls: false,
        liveSecretManagerCalls: false,
        externalKmsCalls: false,
        providerWrites: false,
        plaintextSecretOutput: false,
        ciphertextBackfillExecuted: false
      }
    });
    expect(runbook.operatorPhases.map((phase) => phase.phase)).toEqual([
      "smoke-verification",
      "previous-key-staging",
      "ciphertext-backfill-planning",
      "rollback-expectations",
      "key-retirement-expectations",
      "deferred-live-kms-custody"
    ]);
    expect(runbook.deferredLiveCustody).toMatchObject({
      kmsHsmSecretManagerStatus: "deferred_no_adapter",
      implementedRealCustodyProviders: ["local-env-key-ring"],
      testOnlyCustodyProviders: ["fake-secret-manager-test"]
    });
    expect(JSON.stringify(summary)).not.toContain("current-provider-token-key");
    expect(JSON.stringify(runbook)).not.toContain("previous-provider-token-key");
  });

  it("reports provider-token custody deployment blockers without key material", () => {
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
    const summary = describeMicrosoft365TokenKeyProvider(keyProvider);

    const inBoxReadiness = createMicrosoft365ProviderTokenCustodyDeploymentReadiness({
      custody: summary,
      targetKind: "in_a_box"
    });
    const saasReadiness = createMicrosoft365ProviderTokenCustodyDeploymentReadiness({
      custody: summary,
      targetKind: "saas",
      previousKeyWindowConfirmed: true,
      backfillPlanConfirmed: true,
      keyRetirementPlanConfirmed: true
    });

    expect(inBoxReadiness).toMatchObject({
      status: "blocked_operator_action_required",
      blockers: [
        "provider_token_backfill_plan_unconfirmed",
        "provider_token_key_retirement_plan_unconfirmed",
        "provider_token_previous_key_window_unconfirmed"
      ],
      metadata: {
        previousKeyCount: 1,
        previousKeyIds: ["previous"],
        plaintextKeyMaterialAccessibleToProcess: true,
        providerWritesEnabled: false
      },
      guarantees: {
        liveMicrosoftGraphCalls: false,
        liveSecretManagerCalls: false,
        liveKmsCalls: false,
        providerWrites: false,
        plaintextSecretOutput: false,
        ciphertextBackfillExecuted: false,
        productionKmsCustodyClaimed: false
      }
    });
    expect(saasReadiness).toMatchObject({
      status: "deferred_external_custody_required",
      blockers: ["provider_token_saas_external_custody_deferred"]
    });
    expect(JSON.stringify(inBoxReadiness)).not.toContain("current-provider-token-key");
    expect(JSON.stringify(inBoxReadiness)).not.toContain("previous-provider-token-key");
  });

  it("fails fake secret-manager decrypt when the envelope key is missing", () => {
    const keyProvider = createFakeMicrosoft365SecretManagerTokenKeyProvider({
      activeKeyId: "current",
      keys: [
        {
          keyId: "current",
          masterKey: "current-provider-token-key"
        }
      ]
    });
    const cipher = createLocalMicrosoft365TokenCipher({ keyProvider });
    const encrypted = cipher.encrypt({
      tenantId: "tenant-id",
      accessToken: "token-value"
    });
    const envelope = JSON.parse(encrypted);

    expect(() =>
      cipher.decrypt(
        JSON.stringify({
          ...envelope,
          keyId: "missing-key"
        })
      )
    ).toThrow("Microsoft 365 credential key ID is not configured.");
  });

  it("rejects unsupported provider-token custody providers at construction", () => {
    expect(() =>
      createMicrosoft365TokenKeyProviderFromConfig({
        providerKind: "aws-kms",
        activeKeyId: "current",
        activeKeyMaterial: "current-provider-token-key"
      })
    ).toThrow("Unsupported Microsoft 365 provider token key custody provider");
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

  it("refuses fake secret-manager provider selection in production env defaults", () => {
    expect(() =>
      createMicrosoft365TokenCipherFromEnv({
        PURESOC_APP_ENV: "production",
        PURESOC_PROVIDER_TOKEN_KEY_PROVIDER: "fake-secret-manager-test",
        PURESOC_PROVIDER_TOKEN_KEY_ID: "current",
        PURESOC_PROVIDER_TOKEN_KEY: "production-provider-token-key"
      })
    ).toThrow("fake Microsoft 365 secret-manager token key provider cannot be used in production");
  });

  it("runs the bounded provider-token rotation smoke without plaintext secret output", () => {
    const result = runMicrosoft365ProviderTokenRotationSmoke();
    const serialized = JSON.stringify(result);

    expect(result.checks).toEqual([
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
    ]);
    expect(result.guarantees).toMatchObject({
      liveMicrosoftGraphCalls: false,
      externalKmsCalls: false,
      liveSecretManagerCalls: false,
      providerWrites: false,
      plaintextSecretOutput: false,
      localDisposableOnly: true
    });
    expect(result.fakeSecretManagerCustody.providerKind).toBe("fake-secret-manager-test");
    expect(result.deploymentReadiness.local.status).toBe("ready_for_local_or_in_box_deployment");
    expect(result.deploymentReadiness.inBox.status).toBe("ready_for_local_or_in_box_deployment");
    expect(result.deploymentReadiness.saas).toMatchObject({
      status: "deferred_external_custody_required",
      blockers: ["provider_token_saas_external_custody_deferred"]
    });
    expect(result.rotationRunbook.backfill.executionStatus).toBe("not_executed_metadata_only");
    expect(serialized).not.toContain("m34-smoke-access-token-secret");
    expect(serialized).not.toContain("m34-smoke-current-provider-token-key-material");
  });
});
