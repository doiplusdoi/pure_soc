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

export interface Microsoft365ProviderTokenRotationRunbookOperatorPhase {
  phase:
    | "smoke-verification"
    | "previous-key-staging"
    | "ciphertext-backfill-planning"
    | "rollback-expectations"
    | "key-retirement-expectations"
    | "deferred-live-kms-custody";
  status:
    | "available_metadata_only"
    | "operator_confirmation_required"
    | "not_executed_metadata_only"
    | "deferred_no_adapter";
  owner: "operator" | "application";
  summary: string;
  evidenceRequired: string[];
}

export interface Microsoft365ProviderTokenRotationRunbook {
  schemaVersion: typeof microsoft365ProviderTokenRotationRunbookSchemaVersion;
  providerKey: "microsoft365";
  generatedAt: string;
  custody: Microsoft365TokenKeyCustodySummary;
  activeKeyVersion: Microsoft365TokenKeyVersionMetadata | null;
  previousKeyVersions: Microsoft365TokenKeyVersionMetadata[];
  prechecks: string[];
  operatorPhases: Microsoft365ProviderTokenRotationRunbookOperatorPhase[];
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
  deferredLiveCustody: {
    kmsHsmSecretManagerStatus: "deferred_no_adapter";
    implementedRealCustodyProviders: ["local-env-key-ring"];
    testOnlyCustodyProviders: ["fake-secret-manager-test"];
    requiredBeforeClaimingExternalCustody: string[];
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
    operatorPhases: [
      {
        phase: "smoke-verification",
        status: "available_metadata_only",
        owner: "application",
        summary: "Local smoke verifies synthetic active-key encryption and previous-key decryption without live providers.",
        evidenceRequired: [
          "provider-token-smoke-result",
          "startup-validation-blocker-codes",
          "secret-free-output-review"
        ]
      },
      {
        phase: "previous-key-staging",
        status: previousKeyVersions.length > 0 ? "operator_confirmation_required" : "available_metadata_only",
        owner: "operator",
        summary: "Previous keys are a temporary compatibility window, not a completed rotation.",
        evidenceRequired: [
          "previous-key-ids-recorded",
          "rollback-window-approved",
          "backfill-plan-linked"
        ]
      },
      {
        phase: "ciphertext-backfill-planning",
        status: "not_executed_metadata_only",
        owner: "operator",
        summary: "The repository models backfill prechecks and completion criteria but does not re-encrypt stored ciphertexts.",
        evidenceRequired: [
          "credential-envelope-inventory",
          "dry-run-backfill-plan",
          "rollback-snapshot-reference"
        ]
      },
      {
        phase: "rollback-expectations",
        status: "operator_confirmation_required",
        owner: "operator",
        summary: "Rollback means restoring the last known-good key ring and keeping required previous keys available.",
        evidenceRequired: [
          "last-known-good-key-id",
          "previous-key-window-duration",
          "operator-incident-log-reference"
        ]
      },
      {
        phase: "key-retirement-expectations",
        status: "operator_confirmation_required",
        owner: "operator",
        summary: "Previous keys must not be retired until no stored envelope references them and post-backfill decrypt checks pass.",
        evidenceRequired: [
          "no-envelope-references-retiring-key",
          "post-backfill-decrypt-smoke",
          "retirement-approval-record"
        ]
      },
      {
        phase: "deferred-live-kms-custody",
        status: "deferred_no_adapter",
        owner: "operator",
        summary: "Live KMS/HSM/secret-manager custody is not implemented by this repository.",
        evidenceRequired: [
          "selected-custody-provider-decision",
          "adapter-implementation-tests",
          "approved-disposable-live-custody-smoke"
        ]
      }
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
    deferredLiveCustody: {
      kmsHsmSecretManagerStatus: "deferred_no_adapter",
      implementedRealCustodyProviders: ["local-env-key-ring"],
      testOnlyCustodyProviders: ["fake-secret-manager-test"],
      requiredBeforeClaimingExternalCustody: [
        "approved custody provider selected for SaaS or in-a-box target",
        "real KMS/HSM/secret-manager adapter implemented",
        "secret-free deployed rotation smoke passes against an approved disposable target",
        "custody access logging and incident response runbook are approved"
      ]
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
