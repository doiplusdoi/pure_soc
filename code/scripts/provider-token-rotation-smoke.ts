import {
  collectStartupConfigIssues,
  loadConfig,
  localDevProviderTokenKey
} from "@puresoc/config";

import { runMicrosoft365ProviderTokenRotationSmoke } from "../packages/providers/microsoft365/src/rotation-smoke";

const main = (): void => {
  rejectProductionTarget();

  const smoke = runMicrosoft365ProviderTokenRotationSmoke();
  const configChecks = runStartupConfigSmoke();
  const result = {
    ...smoke,
    checks: [...smoke.checks, ...configChecks.checks],
    startupValidationBlockerCodes: configChecks.blockerCodes
  };

  assertNoPlaintextSecrets(JSON.stringify(result), [
    "m34-smoke-current-provider-token-key-material",
    "m34-smoke-previous-provider-token-key-material",
    "m34-smoke-wrong-previous-provider-token-key-material",
    "m34-smoke-access-token-secret",
    "m34-smoke-refresh-token-secret",
    "m34-smoke-client-secret",
    localDevProviderTokenKey,
    "duplicate-provider-token-key",
    "same-provider-token-key"
  ]);

  console.log(`[M48 provider-token custody smoke] ${JSON.stringify(result)}`);
};

const rejectProductionTarget = (): void => {
  const isProduction = process.env.PURESOC_APP_ENV === "production" || process.env.NODE_ENV === "production";
  if (isProduction) {
    throw new Error("M38 provider-token custody smoke refuses production environments; run only locally or in disposable CI.");
  }
};

const runStartupConfigSmoke = (): {
  checks: string[];
  blockerCodes: Record<string, string[]>;
} => {
  const unsafeDefaultConfig = loadConfig({
    env: {
      PURESOC_APP_ENV: "production",
      PURESOC_AUTH_COOKIE_SECURE: "true",
      PURESOC_UPLOAD_SCANNER_MODE: "mock"
    }
  });
  const unsafeDefaultIssues = collectStartupConfigIssues(unsafeDefaultConfig).map((issue) => issue.code);
  assert(
    unsafeDefaultIssues.includes("provider_token_key_required"),
    "Production startup did not reject the local-dev provider-token active key."
  );

  const unsafePreviousConfig = loadConfig({
    env: {
      PURESOC_APP_ENV: "production",
      PURESOC_AUTH_COOKIE_SECURE: "true",
      PURESOC_UPLOAD_SCANNER_MODE: "mock",
      PURESOC_PROVIDER_TOKEN_KEY_ID: "m34-current",
      PURESOC_PROVIDER_TOKEN_KEY: "m34-production-like-provider-token-key",
      PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS: `m34-previous=${localDevProviderTokenKey}`
    }
  });
  const unsafePreviousIssues = collectStartupConfigIssues(unsafePreviousConfig).map((issue) => issue.code);
  assert(
    unsafePreviousIssues.includes("provider_token_previous_key_default"),
    "Production startup did not reject the local-dev provider-token previous key."
  );

  const fakeProviderConfig = loadConfig({
    env: {
      PURESOC_APP_ENV: "production",
      PURESOC_AUTH_COOKIE_SECURE: "true",
      PURESOC_UPLOAD_SCANNER_MODE: "mock",
      PURESOC_PROVIDER_TOKEN_KEY_PROVIDER: "fake-secret-manager-test",
      PURESOC_PROVIDER_TOKEN_KEY_ID: "m38-current",
      PURESOC_PROVIDER_TOKEN_KEY: "m38-production-like-provider-token-key"
    }
  });
  const fakeProviderIssues = collectStartupConfigIssues(fakeProviderConfig).map((issue) => issue.code);
  assert(
    fakeProviderIssues.includes("provider_token_fake_key_provider_not_production"),
    "Production startup did not reject the fake provider-token custody provider."
  );

  const unsupportedProviderConfig = loadConfig({
    env: {
      PURESOC_PROVIDER_TOKEN_KEY_PROVIDER: "aws-kms"
    }
  });
  const unsupportedProviderIssues = collectStartupConfigIssues(unsupportedProviderConfig).map((issue) => issue.code);
  assert(
    unsupportedProviderIssues.includes("provider_token_key_provider_unsupported"),
    "Startup validation did not reject the unsupported provider-token custody provider."
  );

  const missingKeyIdConfig = loadConfig({
    env: {
      PURESOC_PROVIDER_TOKEN_KEY_ID: ""
    }
  });
  const missingKeyIdIssues = collectStartupConfigIssues(missingKeyIdConfig).map((issue) => issue.code);
  assert(
    missingKeyIdIssues.includes("provider_token_key_id_required"),
    "Startup validation did not reject a missing provider-token key ID."
  );

  const invalidPreviousKeyConfig = loadConfig({
    env: {
      PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS: "previous-without-secret"
    }
  });
  const invalidPreviousKeyIssues = collectStartupConfigIssues(invalidPreviousKeyConfig).map((issue) => issue.code);
  assert(
    invalidPreviousKeyIssues.includes("provider_token_previous_key_invalid"),
    "Startup validation did not reject an invalid provider-token previous-key entry."
  );

  const duplicatePreviousKeyConfig = loadConfig({
    env: {
      PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS:
        "previous-a=duplicate-provider-token-key,previous-b=duplicate-provider-token-key"
    }
  });
  const duplicatePreviousKeyIssues = collectStartupConfigIssues(duplicatePreviousKeyConfig).map((issue) => issue.code);
  assert(
    duplicatePreviousKeyIssues.includes("provider_token_previous_key_duplicate"),
    "Startup validation did not reject duplicate provider-token previous-key material."
  );

  const reusedActivePreviousKeyConfig = loadConfig({
    env: {
      PURESOC_PROVIDER_TOKEN_KEY_ID: "current",
      PURESOC_PROVIDER_TOKEN_KEY: "same-provider-token-key",
      PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS: "previous=same-provider-token-key"
    }
  });
  const reusedActivePreviousKeyIssues = collectStartupConfigIssues(reusedActivePreviousKeyConfig).map(
    (issue) => issue.code
  );
  assert(
    reusedActivePreviousKeyIssues.includes("provider_token_previous_key_reuses_active"),
    "Startup validation did not reject previous provider-token key material that reuses the active key."
  );

  return {
    checks: [
      "production-default-active-key-rejection",
      "production-default-previous-key-rejection",
      "production-fake-provider-rejection",
      "unsupported-provider-rejection",
      "missing-key-id-rejection",
      "invalid-previous-key-rejection",
      "duplicate-previous-key-rejection",
      "previous-key-reuses-active-rejection"
    ],
    blockerCodes: {
      productionDefaultActiveKey: unsafeDefaultIssues,
      productionDefaultPreviousKey: unsafePreviousIssues,
      productionFakeProvider: fakeProviderIssues,
      unsupportedProvider: unsupportedProviderIssues,
      missingKeyId: missingKeyIdIssues,
      invalidPreviousKey: invalidPreviousKeyIssues,
      duplicatePreviousKey: duplicatePreviousKeyIssues,
      previousKeyReusesActive: reusedActivePreviousKeyIssues
    }
  };
};

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertNoPlaintextSecrets = (value: string, forbiddenPlaintext: string[]): void => {
  for (const secret of forbiddenPlaintext) {
    if (secret && value.includes(secret)) {
      throw new Error("Provider-token rotation smoke output included plaintext secret material.");
    }
  }
};

main();
