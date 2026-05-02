import {
  microsoft365ProviderTokenCustodyDeploymentReadinessSchemaVersion,
  microsoft365ProviderTokenCustodyTargetKinds
} from "./custody-readiness";
import {
  microsoft365DeferredReadModules,
  microsoft365ModuleRequirements,
  microsoft365PermissionBundles,
  microsoft365ReadModules,
  microsoft365ReadPermissionBundles,
  microsoft365ProviderKey,
  microsoft365WritePermissionBundles
} from "./permissions";

export const microsoft365ExternalSmokeReadinessMetadataSchemaVersion =
  "puresoc.microsoft365.external_smoke_readiness_metadata.v1" as const;

export interface Microsoft365ExternalSmokeReadinessMetadata {
  schemaVersion: typeof microsoft365ExternalSmokeReadinessMetadataSchemaVersion;
  providerKey: typeof microsoft365ProviderKey;
  readPermissionBundles: Array<{
    bundleKey: string;
    purpose: string;
    permissions: string[];
    defaultEnabled: boolean;
    readOnly: true;
  }>;
  writePermissionBundlesDisabled: string[];
  readModules: Array<{
    moduleKey: string;
    permissionsRequired: string[];
    licenseRequired: string[];
    unsupportedNationalClouds?: string[];
  }>;
  deferredReadModules: string[];
  providerTokenCustody: {
    schemaVersion: typeof microsoft365ProviderTokenCustodyDeploymentReadinessSchemaVersion;
    targetKinds: Array<(typeof microsoft365ProviderTokenCustodyTargetKinds)[number]>;
    implementedRealCustodyProviders: ["local-env-key-ring"];
    testOnlyCustodyProviders: ["fake-secret-manager-test"];
    deferredExternalCustodyProviders: string[];
    requiredEnvironmentVariables: string[];
    previousKeyConfirmationVariables: string[];
    guarantees: {
      liveMicrosoftGraphCalls: false;
      liveSecretManagerCalls: false;
      liveKmsCalls: false;
      providerWrites: false;
      plaintextSecretOutput: false;
      ciphertextBackfillExecuted: false;
    };
  };
}

export const getMicrosoft365ExternalSmokeReadinessMetadata =
  (): Microsoft365ExternalSmokeReadinessMetadata => ({
    schemaVersion: microsoft365ExternalSmokeReadinessMetadataSchemaVersion,
    providerKey: microsoft365ProviderKey,
    readPermissionBundles: microsoft365ReadPermissionBundles.map((bundleKey) => {
      const bundle = microsoft365PermissionBundles[bundleKey];
      return {
        bundleKey: bundle.bundleKey,
        purpose: bundle.purpose,
        permissions: [...bundle.permissions],
        defaultEnabled: bundle.defaultEnabled,
        readOnly: true
      };
    }),
    writePermissionBundlesDisabled: [...microsoft365WritePermissionBundles],
    readModules: microsoft365ReadModules.map((moduleKey) => {
      const requirement = microsoft365ModuleRequirements[moduleKey];
      return {
        moduleKey,
        permissionsRequired: [...requirement.permissionsRequired],
        licenseRequired: [...requirement.licenseRequired],
        unsupportedNationalClouds: requirement.unsupportedNationalClouds
          ? [...requirement.unsupportedNationalClouds]
          : undefined
      };
    }),
    deferredReadModules: [...microsoft365DeferredReadModules],
    providerTokenCustody: {
      schemaVersion: microsoft365ProviderTokenCustodyDeploymentReadinessSchemaVersion,
      targetKinds: [...microsoft365ProviderTokenCustodyTargetKinds],
      implementedRealCustodyProviders: ["local-env-key-ring"],
      testOnlyCustodyProviders: ["fake-secret-manager-test"],
      deferredExternalCustodyProviders: [
        "azure-key-vault",
        "aws-kms",
        "gcp-secret-manager",
        "hashicorp-vault",
        "hsm"
      ],
      requiredEnvironmentVariables: [
        "PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND",
        "PURESOC_PROVIDER_TOKEN_KEY_PROVIDER",
        "PURESOC_PROVIDER_TOKEN_KEY_ID",
        "PURESOC_PROVIDER_TOKEN_KEY",
        "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS"
      ],
      previousKeyConfirmationVariables: [
        "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED",
        "PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED",
        "PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED"
      ],
      guarantees: {
        liveMicrosoftGraphCalls: false,
        liveSecretManagerCalls: false,
        liveKmsCalls: false,
        providerWrites: false,
        plaintextSecretOutput: false,
        ciphertextBackfillExecuted: false
      }
    }
  });
