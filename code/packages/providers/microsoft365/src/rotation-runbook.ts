import {
  describeMicrosoft365TokenKeyProvider,
  type Microsoft365TokenKeyCustodySummary,
  type Microsoft365TokenKeyProvider,
  type Microsoft365TokenKeyVersionMetadata
} from "./crypto";

export const microsoft365ProviderTokenRotationRunbookSchemaVersion =
  "puresoc.microsoft365.provider-token.rotation-runbook.v1" as const;

export interface Microsoft365ProviderTokenRotationRunbookStage {
  stage:
    | "prepare-new-active-key"
    | "deploy-staged-key-ring"
    | "verify-active-and-previous-decrypt"
    | "backfill-reencrypt-ciphertexts"
    | "retire-previous-key";
  owner: "operator" | "application";
  requiredEvidence: string[];
  backoutExpectation: string;
}

export interface Microsoft365ProviderTokenRotationRunbook {
  schemaVersion: typeof microsoft365ProviderTokenRotationRunbookSchemaVersion;
  providerKey: "microsoft365";
  generatedAt: string;
  custody: Microsoft365TokenKeyCustodySummary;
  activeKeyVersion: Microsoft365TokenKeyVersionMetadata | null;
  previousKeyVersions: Microsoft365TokenKeyVersionMetadata[];
  prechecks: string[];
  stages: Microsoft365ProviderTokenRotationRunbookStage[];
  rollback: {
    supported: true;
    expectation: "restore_previous_key_window_and_redeploy";
    operatorActions: string[];
  };
  backfill: {
    executionStatus: "not_executed_metadata_only";
    precheckInputs: string[];
    completionCriteria: string[];
    previousKeyRetirement: "operator_review_required_after_verified_reencrypt";
  };
  guarantees: {
    liveMicrosoftGraphCalls: false;
    liveSecretManagerCalls: false;
    externalKmsCalls: false;
    providerWrites: false;
    plaintextSecretOutput: false;
    ciphertextBackfillExecuted: false;
  };
}

export const createMicrosoft365ProviderTokenRotationRunbook = (
  keyProvider: Microsoft365TokenKeyProvider,
  options: { generatedAt?: string } = {}
): Microsoft365ProviderTokenRotationRunbook => {
  const custody = describeMicrosoft365TokenKeyProvider(keyProvider);
  const activeKeyVersion = custody.keyVersions.find((key) => key.role === "active") ?? null;
  const previousKeyVersions = custody.keyVersions.filter((key) => key.role === "previous");

  return {
    schemaVersion: microsoft365ProviderTokenRotationRunbookSchemaVersion,
    providerKey: "microsoft365",
    generatedAt: options.generatedAt ?? new Date(0).toISOString(),
    custody,
    activeKeyVersion,
    previousKeyVersions,
    prechecks: [
      "startup-config-validation-passed",
      "active-key-id-present-in-custody-provider",
      "previous-key-window-configured-before-rotation",
      "decrypt-smoke-covers-active-and-previous-envelopes",
      "operator-confirms-no-production-target-for-local-smoke"
    ],
    stages: [
      {
        stage: "prepare-new-active-key",
        owner: "operator",
        requiredEvidence: [
          "new-key-id-recorded",
          "secret-injected-through-selected-runtime-secret-channel",
          "rollback-key-window-documented"
        ],
        backoutExpectation: "Keep the existing active key and do not deploy the staged key-ring."
      },
      {
        stage: "deploy-staged-key-ring",
        owner: "operator",
        requiredEvidence: [
          "active-key-id-changed",
          "previous-key-list-includes-old-active-key",
          "startup-validation-output-captured"
        ],
        backoutExpectation: "Restore the prior active key as active and keep the attempted new key out of production."
      },
      {
        stage: "verify-active-and-previous-decrypt",
        owner: "application",
        requiredEvidence: [
          "active-key-encrypt-decrypt-check",
          "previous-key-decrypt-check",
          "secret-free-smoke-output"
        ],
        backoutExpectation: "Restore the previous key-ring if either active or previous decrypt checks fail."
      },
      {
        stage: "backfill-reencrypt-ciphertexts",
        owner: "operator",
        requiredEvidence: [
          "ciphertext-count-before-backfill",
          "reencrypt-job-dry-run",
          "verified-sample-read-after-reencrypt",
          "rollback-snapshot-available"
        ],
        backoutExpectation: "Pause backfill, keep previous keys configured, and restore from the verified rollback snapshot if needed."
      },
      {
        stage: "retire-previous-key",
        owner: "operator",
        requiredEvidence: [
          "no-ciphertexts-reference-retiring-key-id",
          "post-backfill-decrypt-smoke",
          "incident-backout-window-approved"
        ],
        backoutExpectation: "Re-add the retiring previous key and redeploy before any old envelope must be read."
      }
    ],
    rollback: {
      supported: true,
      expectation: "restore_previous_key_window_and_redeploy",
      operatorActions: [
        "Restore the last known-good active key ID and material through the deployment secret channel.",
        "Keep all previous keys needed by existing credential envelopes configured until backfill verification passes.",
        "Record the failed rotation attempt and any affected credential-envelope key IDs in the operator incident log."
      ]
    },
    backfill: {
      executionStatus: "not_executed_metadata_only",
      precheckInputs: [
        "provider credential envelope inventory",
        "active key ID and version metadata",
        "previous key IDs and version metadata",
        "rollback snapshot reference",
        "operator-approved maintenance window"
      ],
      completionCriteria: [
        "all credential envelopes decrypt with the new active key-ring",
        "stored envelopes reference the active key ID after re-encryption",
        "sample provider sync remains read-only and does not call provider writes",
        "previous key retirement has explicit operator approval"
      ],
      previousKeyRetirement: "operator_review_required_after_verified_reencrypt"
    },
    guarantees: {
      liveMicrosoftGraphCalls: false,
      liveSecretManagerCalls: false,
      externalKmsCalls: false,
      providerWrites: false,
      plaintextSecretOutput: false,
      ciphertextBackfillExecuted: false
    }
  };
};
