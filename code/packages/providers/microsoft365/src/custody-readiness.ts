import type { Microsoft365TokenKeyCustodySummary } from "./crypto";

export const microsoft365ProviderTokenCustodyDeploymentReadinessSchemaVersion =
  "puresoc.microsoft365.provider-token.custody-deployment-readiness.v1" as const;

export const microsoft365ProviderTokenCustodyTargetKinds = ["local", "in_a_box", "saas"] as const;

export type Microsoft365ProviderTokenCustodyTargetKind =
  (typeof microsoft365ProviderTokenCustodyTargetKinds)[number];

export type Microsoft365ProviderTokenCustodyDeploymentReadinessStatus =
  | "ready_for_local_or_in_box_deployment"
  | "blocked_operator_action_required"
  | "deferred_external_custody_required";

export interface Microsoft365ProviderTokenCustodyDeploymentReadiness {
  schemaVersion: typeof microsoft365ProviderTokenCustodyDeploymentReadinessSchemaVersion;
  providerKey: "microsoft365";
  targetKind: Microsoft365ProviderTokenCustodyTargetKind;
  status: Microsoft365ProviderTokenCustodyDeploymentReadinessStatus;
  custodyProviderKind: string;
  implementedRealCustodyProviders: ["local-env-key-ring"];
  testOnlyCustodyProviders: ["fake-secret-manager-test"];
  deferredExternalCustodyProviders: string[];
  blockers: string[];
  warnings: string[];
  operatorActions: string[];
  environmentVariables: {
    targetKind: "PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND";
    activeKeyId: "PURESOC_PROVIDER_TOKEN_KEY_ID";
    activeKeyMaterial: "PURESOC_PROVIDER_TOKEN_KEY";
    previousKeys: "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS";
    previousKeyWindowConfirmed: "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED";
    backfillPlanConfirmed: "PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED";
    keyRetirementPlanConfirmed: "PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED";
  };
  metadata: {
    activeKeyId: string;
    previousKeyIds: string[];
    previousKeyCount: number;
    plaintextKeyMaterialAccessibleToProcess: true;
    externalKmsBacked: false;
    externalSecretManagerBacked: false;
    ciphertextBackfillExecuted: false;
    keyRetirementExecuted: false;
    providerWritesEnabled: false;
  };
  guarantees: {
    liveMicrosoftGraphCalls: false;
    liveSecretManagerCalls: false;
    liveKmsCalls: false;
    providerWrites: false;
    plaintextSecretOutput: false;
    ciphertextBackfillExecuted: false;
    productionKmsCustodyClaimed: false;
  };
}

export interface CreateMicrosoft365ProviderTokenCustodyDeploymentReadinessInput {
  custody: Microsoft365TokenKeyCustodySummary;
  targetKind?: Microsoft365ProviderTokenCustodyTargetKind;
  startupValidationIssueCodes?: string[];
  previousKeyWindowConfirmed?: boolean;
  backfillPlanConfirmed?: boolean;
  keyRetirementPlanConfirmed?: boolean;
}

const providerTokenStartupIssuePrefix = "provider_token_";

export const createMicrosoft365ProviderTokenCustodyDeploymentReadiness = (
  input: CreateMicrosoft365ProviderTokenCustodyDeploymentReadinessInput
): Microsoft365ProviderTokenCustodyDeploymentReadiness => {
  const targetKind = input.targetKind ?? "local";
  const providerTokenStartupIssues = [...new Set(input.startupValidationIssueCodes ?? [])]
    .filter((code) => code.startsWith(providerTokenStartupIssuePrefix))
    .sort();
  const previousKeyIds = [...input.custody.previousKeyIds].sort();
  const previousKeyWindowBlockers =
    previousKeyIds.length > 0
      ? [
          ...(input.previousKeyWindowConfirmed ? [] : ["provider_token_previous_key_window_unconfirmed"]),
          ...(input.backfillPlanConfirmed ? [] : ["provider_token_backfill_plan_unconfirmed"]),
          ...(input.keyRetirementPlanConfirmed ? [] : ["provider_token_key_retirement_plan_unconfirmed"])
        ]
      : [];
  const targetBlockers = [
    ...(targetKind === "saas" ? ["provider_token_saas_external_custody_deferred"] : []),
    ...(targetKind !== "local" && input.custody.testOnly ? ["provider_token_fake_custody_not_deployable"] : [])
  ];
  const blockers = [...providerTokenStartupIssues, ...targetBlockers, ...previousKeyWindowBlockers].sort();
  const status =
    targetKind === "saas" && targetBlockers.includes("provider_token_saas_external_custody_deferred")
      ? "deferred_external_custody_required"
      : blockers.length > 0
        ? "blocked_operator_action_required"
        : "ready_for_local_or_in_box_deployment";

  return {
    schemaVersion: microsoft365ProviderTokenCustodyDeploymentReadinessSchemaVersion,
    providerKey: "microsoft365",
    targetKind,
    status,
    custodyProviderKind: input.custody.providerKind,
    implementedRealCustodyProviders: ["local-env-key-ring"],
    testOnlyCustodyProviders: ["fake-secret-manager-test"],
    deferredExternalCustodyProviders: [
      "azure-key-vault",
      "aws-kms",
      "gcp-secret-manager",
      "hashicorp-vault",
      "hsm"
    ],
    blockers,
    warnings: [
      "local-env-key-ring exposes plaintext key material to the running API process",
      "ciphertext backfill and previous-key retirement are operator-owned until implemented",
      "SaaS KMS/HSM/secret-manager custody remains deferred"
    ],
    operatorActions: operatorActionsFor(targetKind, blockers),
    environmentVariables: {
      targetKind: "PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND",
      activeKeyId: "PURESOC_PROVIDER_TOKEN_KEY_ID",
      activeKeyMaterial: "PURESOC_PROVIDER_TOKEN_KEY",
      previousKeys: "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS",
      previousKeyWindowConfirmed: "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED",
      backfillPlanConfirmed: "PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED",
      keyRetirementPlanConfirmed: "PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED"
    },
    metadata: {
      activeKeyId: input.custody.activeKeyId,
      previousKeyIds,
      previousKeyCount: previousKeyIds.length,
      plaintextKeyMaterialAccessibleToProcess: true,
      externalKmsBacked: false,
      externalSecretManagerBacked: false,
      ciphertextBackfillExecuted: false,
      keyRetirementExecuted: false,
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
  };
};

const operatorActionsFor = (
  targetKind: Microsoft365ProviderTokenCustodyTargetKind,
  blockers: string[]
): string[] => {
  const actions = [
    "Run provider-token custody smoke locally with synthetic keys before changing deployment secrets.",
    "Keep previous keys configured until all encrypted credential envelopes are re-encrypted and verified.",
    "Do not remove a previous key until key-retirement evidence is reviewed."
  ];

  if (targetKind === "in_a_box") {
    actions.push("Inject local-env-key-ring material through an operator-controlled Docker secret or equivalent runtime secret channel.");
  }

  if (targetKind === "saas") {
    actions.push("Select and implement an approved KMS/HSM/secret-manager adapter before claiming external custody for SaaS.");
  }

  if (blockers.includes("provider_token_previous_key_window_unconfirmed")) {
    actions.push("Confirm the previous-key window and planned rollback duration before deployment.");
  }

  if (blockers.includes("provider_token_backfill_plan_unconfirmed")) {
    actions.push("Document the ciphertext backfill plan before deploying a rotated key ring.");
  }

  if (blockers.includes("provider_token_key_retirement_plan_unconfirmed")) {
    actions.push("Define key-retirement evidence and backout expectations before removing previous keys.");
  }

  return actions;
};
