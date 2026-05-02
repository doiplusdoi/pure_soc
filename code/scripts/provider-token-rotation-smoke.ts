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
    checks: [...smoke.checks, ...configChecks]
  };

  assertNoPlaintextSecrets(JSON.stringify(result), [
    "m34-smoke-current-provider-token-key-material",
    "m34-smoke-previous-provider-token-key-material",
    "m34-smoke-wrong-previous-provider-token-key-material",
    "m34-smoke-access-token-secret",
    "m34-smoke-refresh-token-secret",
    "m34-smoke-client-secret",
    localDevProviderTokenKey
  ]);

  console.log(`[M38 provider-token custody smoke] ${JSON.stringify(result)}`);
};

const rejectProductionTarget = (): void => {
  const isProduction = process.env.PURESOC_APP_ENV === "production" || process.env.NODE_ENV === "production";
  if (isProduction) {
    throw new Error("M38 provider-token custody smoke refuses production environments; run only locally or in disposable CI.");
  }
};

const runStartupConfigSmoke = (): string[] => {
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

  return [
    "production-default-active-key-rejection",
    "production-default-previous-key-rejection",
    "production-fake-provider-rejection",
    "unsupported-provider-rejection"
  ];
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
